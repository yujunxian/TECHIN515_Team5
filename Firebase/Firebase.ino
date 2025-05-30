
#include <WiFi.h>
#include <Wire.h>
#include <Firebase_ESP_Client.h>
#include <Adafruit_VL53L0X.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <time.h>

// WiFi 配置信息
#define WIFI_SSID "UW MPSK"
#define WIFI_PASSWORD "jG^UdHc37d"

// #define WIFI_SSID "910"
// #define WIFI_PASSWORD "Helloyiyi2000@gmail.com"

// Firebase 配置信息
#define FIREBASE_AUTH "AIzaSyCGQYLLo5I0IszTogZ-zJN8NPd5TIlVAyQ"
#define FIREBASE_HOST "https://techin515-5e18e-default-rtdb.firebaseio.com"

// Firebase 对象
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;
bool signupOK = false;

String sessionId;
// DSP buffer for moving average
#define MA_WINDOW 5
float distanceBuffer[MA_WINDOW] = {0};
int bufferIndex = 0;

// Compression detection
float lastValidDistance = 0;
bool compressionDetected = false;
const float COMPRESSION_THRESHOLD_CM = 4.5;  // Compression depth threshold

// 传感器对象
Adafruit_MPU6050 mpu;
Adafruit_VL53L0X vl53 = Adafruit_VL53L0X();

void setup() {
  Serial.begin(115200);
  Wire.begin();
  auth.user.email = "";
  auth.user.password = "";
  // 连接 WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
  }
  Serial.println("\nConnected to WiFi!");
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");

  Serial.print("Syncing time");
  while (time(nullptr) < 100000) {
    Serial.print(".");
    delay(500);
  }
  Serial.println("\n✅ Time synced!");

  config.host = FIREBASE_HOST;
  config.signer.tokens.legacy_token = FIREBASE_AUTH;
  Firebase.begin(&config, &auth);


  // 初始化 MPU6050
  if (!mpu.begin()) {
    Serial.println("Failed to find MPU6050 chip");
    while (1);
  }
  Serial.println("MPU6050 Found!");
  mpu.setAccelerometerRange(MPU6050_RANGE_4_G);
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
  delay(100);


}

float movingAverage(float newValue) {
  distanceBuffer[bufferIndex] = newValue;
  bufferIndex = (bufferIndex + 1) % MA_WINDOW;

  float sum = 0;
  for (int i = 0; i < MA_WINDOW; i++) {
    sum += distanceBuffer[i];
  }
  return sum / MA_WINDOW;
}

void loop() {
  VL53L0X_RangingMeasurementData_t measure;
  vl53.rangingTest(&measure, false);

  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

  // unsigned long timestamp = millis();
  time_t timestamp = time(nullptr);
  // Serial.println("inside loop");
  float rawDistance = measure.RangeMilliMeter;
  float filteredDistance = movingAverage(rawDistance);

  lastValidDistance = filteredDistance;
  if (measure.RangeStatus != 4) {
    FirebaseJson json;
    json.set("distance", filteredDistance / 10.0);  // cm
    json.set("accelX", a.acceleration.x);
    json.set("accelY", a.acceleration.y);
    json.set("accelZ", a.acceleration.z);
    json.set("gyroX", g.gyro.x);
    json.set("gyroY", g.gyro.y);
    json.set("gyroZ", g.gyro.z);
    json.set("timestamp", timestamp);
    json.set("sessionId", sessionId) ;

    if (Firebase.ready() && Firebase.RTDB.setJSON(&fbdo, "/sensors/latest", &json)) {
      Firebase.RTDB.pushJSON(&fbdo, "/sensors/history", &json);
      Serial.println("✅ Data uploaded successfully:");
      Serial.println(json.raw());
    } else {
      Serial.print("❌ Firebase upload failed: ");
      Serial.println(fbdo.errorReason());
    }
  } else {
    Serial.println("VL53L0X read error");
  }

  delay(200);  // upload interval
}
