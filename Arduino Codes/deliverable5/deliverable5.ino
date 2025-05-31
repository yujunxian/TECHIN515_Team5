
// #include <WiFi.h>
// #include <Wire.h>
// #include <Firebase_ESP_Client.h>
// #include <Adafruit_VL53L0X.h>
// #include <Adafruit_MPU6050.h>
// #include <Adafruit_Sensor.h>
// #include <time.h>

// //WiFi Setup
// #define WIFI_SSID "UW MPSK"
// #define WIFI_PASSWORD "4$=b<#]U{r"
// // #define WIFI_SSID "UW MPSK"
// // #define WIFI_PASSWORD "jG^UdHc37d"
// //Firebase Setup
// #define FIREBASE_AUTH "AIzaSyCGQYLLo5I0IszTogZ-zJN8NPd5TIlVAyQ"
// #define FIREBASE_HOST "https://techin515-5e18e-default-rtdb.firebaseio.com"
// FirebaseData fbdo;
// FirebaseAuth auth;
// FirebaseConfig config;
// String sessionId;

// // pin configuration
// #define FSR_PIN 1
// #define RED_LED_PIN 2
// #define GREEN_LED_PIN 3
// #define BUZZER_PIN 4

// Adafruit_MPU6050 mpu;
// sensors_event_t a_offset;

// unsigned long lastBuzzTime = 0;
// const int buzzInterval = 500; // milliseconds
// bool isBuzzing = false;
// unsigned long buzzStartTime = 0;
// const int buzzDuration = 50;  // milliseconds
// unsigned long lastCheckTime = 0;
// const int checkInterval = 500;



// float readWeight() {
//   int fsrReading = analogRead(FSR_PIN);
//   float weight = 0.032 * fsrReading - 16.721;
//   return max(weight, 0.0f);  // weight can't be negative
// }



// void calibrateMPU() {
//   Serial.println("Calibrating MPU6050...");
//   float sumX = 0, sumY = 0, sumZ = 0;
//   int samples = 100;

//   for (int i = 0; i < samples; i++) {
//     sensors_event_t a, g, temp;
//     mpu.getEvent(&a, &g, &temp);
//     sumX += a.acceleration.x;
//     sumY += a.acceleration.y;
//     sumZ += a.acceleration.z;
//     delay(10);
//   }

//   a_offset.acceleration.x = sumX / samples;
//   a_offset.acceleration.y = sumY / samples;
//   a_offset.acceleration.z = sumZ / samples - 9.81;  // 地球重力加速度
//   Serial.println("Calibration complete.");
// }


// void setup() {
//   Serial.begin(115200);
//   pinMode(RED_LED_PIN, OUTPUT);
//   pinMode(GREEN_LED_PIN, OUTPUT);
//   pinMode(BUZZER_PIN, OUTPUT);
//   pinMode(FSR_PIN, INPUT);
//   Wire.begin(5,6);
//   // Firebase Authentication
//   auth.user.email = "";
//   auth.user.password = "";
//   // Connect to WiFi
//   WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
//   Serial.print("Connecting to WiFi");
//   while (WiFi.status() != WL_CONNECTED) {
//     Serial.print(".");
//     delay(500);
//   }
//   Serial.println("\nConnected to WiFi!");
//   configTime(0, 0, "pool.ntp.org", "time.nist.gov");

//   Serial.print("Syncing time");
//   while (time(nullptr) < 100000) {
//     Serial.print(".");
//     delay(500);
//   }
//   Serial.println("\n✅ Time synced!");

//   // config firebase
//   config.host = FIREBASE_HOST;
//   config.signer.tokens.legacy_token = FIREBASE_AUTH;
//   Firebase.begin(&config, &auth);


//   // initializa MPU6050
//   if (!mpu.begin()) {
//     Serial.println("Failed to find MPU6050 chip");
//     while (1);
//   }
//   Serial.println("MPU6050 Found!");
//   mpu.setAccelerometerRange(MPU6050_RANGE_4_G);
//   mpu.setGyroRange(MPU6050_RANGE_500_DEG);
//   mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
//   delay(100);

//   calibrateMPU();
// }






// void loop() {
//   unsigned long currentMillis = millis();

//   // 1️⃣ 每隔 500ms 响一次蜂鸣器
//   if (currentMillis - lastBuzzTime >= buzzInterval) {
//     lastBuzzTime = currentMillis;
//     tone(BUZZER_PIN, 800); // 开始响
//     buzzStartTime = currentMillis;
//     isBuzzing = true;
//   }

//   // ⏱️ 响 buzzDuration 毫秒后停止
//   if (isBuzzing && currentMillis - buzzStartTime >= buzzDuration) {
//     noTone(BUZZER_PIN);
//     isBuzzing = false;
//   }

//   // 2️⃣ 每 500ms 检查一次 weight 并反馈/上传
//   if (currentMillis - lastCheckTime >= checkInterval) {
//     lastCheckTime = currentMillis;

//     float weight = readWeight();

//     sensors_event_t a, g, temp;
//     mpu.getEvent(&a, &g, &temp);

//     float accelX = a.acceleration.x - a_offset.acceleration.x;
//     float accelY = a.acceleration.y - a_offset.acceleration.y;
//     float accelZ = a.acceleration.z - a_offset.acceleration.z;

//     // LED 控制
//     if (weight >= 45 && weight <= 55) {
//       digitalWrite(GREEN_LED_PIN, HIGH);
//       digitalWrite(RED_LED_PIN, LOW);
//     } else {
//       digitalWrite(GREEN_LED_PIN, LOW);
//       digitalWrite(RED_LED_PIN, HIGH);
//     }

//     // Firebase 上传
//     if (Firebase.ready()) {
//       time_t timestamp = time(nullptr);
//       FirebaseJson json;
//       json.set("weight", weight);
//       json.set("accelX", accelX);
//       json.set("accelY", accelY);
//       json.set("accelZ", accelZ);
//       json.set("timestamp", timestamp);
//       json.set("sessionId", sessionId);

//       if (Firebase.RTDB.setJSON(&fbdo, "/sensors/latest", &json)) {
//         Firebase.RTDB.pushJSON(&fbdo, "/sensors/history", &json);
//         Serial.println("✅ Data uploaded successfully:");
//         Serial.println(json.raw());
//       } else {
//         Serial.print("❌ Firebase upload failed: ");
//         Serial.println(fbdo.errorReason());
//       }
//     }
//   }
// }

#include <WiFi.h>
#include <Wire.h>
#include <Firebase_ESP_Client.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <time.h>
#include <esp_timer.h>

// WiFi Setup
#define WIFI_SSID "UW MPSK"
#define WIFI_PASSWORD "4$=b<#]U{r"

// Firebase Setup
#define FIREBASE_AUTH "AIzaSyCGQYLLo5I0IszTogZ-zJN8NPd5TIlVAyQ"
#define FIREBASE_HOST "https://techin515-5e18e-default-rtdb.firebaseio.com"
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;
String sessionId;

// Pin configuration
#define FSR_PIN 1
#define RED_LED_PIN 9
#define GREEN_LED_PIN 8
#define BUZZER_PIN 7

Adafruit_MPU6050 mpu;
sensors_event_t a_offset;

// Timing variables
unsigned long lastBuzzTime = 0;
const int buzzInterval = 500;
const int buzzDuration = 50;

unsigned long lastCheckTime = 0;
const int checkInterval = 500;

volatile bool isBuzzing = false;

// ESP32 timer for buzzer
esp_timer_handle_t buzzTimer;


// 巴特沃斯二阶低通滤波器系数
const float b[3] = { 0.0133592, 0.0267184, 0.0133592};  // 分子系数
const float a[3] = { 1.0,-1.64745998,  0.70089678 };          // 分母系数（a[0]为1，不参与计算）


// [0.0133592 0.0267184 0.0133592] [ 1.         -1.64745998  0.70089678]
// FSR滤波历史变量
float x_fsr[3] = { 0 };  // 输入值历史：x[n], x[n-1], x[n-2]
float y_fsr[3] = { 0 };  // 输出值历史：y[n], y[n-1], y[n-2]

float filterFSR(float input) {
  x_fsr[0] = input;

  y_fsr[0] = b[0] * x_fsr[0] + b[1] * x_fsr[1] + b[2] * x_fsr[2]
             - a[1] * y_fsr[1] - a[2] * y_fsr[2];

  // 更新历史值
  x_fsr[2] = x_fsr[1];
  x_fsr[1] = x_fsr[0];
  y_fsr[2] = y_fsr[1];
  y_fsr[1] = y_fsr[0];

  return y_fsr[0];
}

void IRAM_ATTR stopBuzz(void* arg) {
  noTone(BUZZER_PIN);
  isBuzzing = false;
}

void startBuzz(int duration_ms) {
  tone(BUZZER_PIN, 800);
  isBuzzing = true;
  esp_timer_start_once(buzzTimer, duration_ms * 1000);  // µs
}

void setupBuzzTimer() {
  const esp_timer_create_args_t buzzTimerArgs = {
    .callback = &stopBuzz,
    .arg = NULL,
    .dispatch_method = ESP_TIMER_TASK,
    .name = "buzz-timer"
  };
  esp_timer_create(&buzzTimerArgs, &buzzTimer);
}

float readWeight() {
  int fsrReading = analogRead(FSR_PIN);

  float weight = 0.032 * fsrReading - 16.721;
  Serial.print("raw data: ");
  Serial.println(fsrReading);
  Serial.print("weight: ");
  Serial.println(weight);

  weight = filterFSR(weight);
  return max(weight, 0.0f);
}

void calibrateMPU() {
  Serial.println("Calibrating MPU6050...");
  float sumX = 0, sumY = 0, sumZ = 0;
  int samples = 100;
  for (int i = 0; i < samples; i++) {
    sensors_event_t a, g, temp;
    mpu.getEvent(&a, &g, &temp);
    sumX += a.acceleration.x;
    sumY += a.acceleration.y;
    sumZ += a.acceleration.z;
    delay(10);
  }
  a_offset.acceleration.x = sumX / samples;
  a_offset.acceleration.y = sumY / samples;
  a_offset.acceleration.z = sumZ / samples - 9.81;
  Serial.println("Calibration complete.");
}

void setup() {
  Serial.begin(115200);
  pinMode(RED_LED_PIN, OUTPUT);
  pinMode(GREEN_LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(FSR_PIN, INPUT);
  Wire.begin(5, 6);  // SDA, SCL

  // Init WiFi
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

  // Firebase
  config.host = FIREBASE_HOST;
  config.signer.tokens.legacy_token = FIREBASE_AUTH;
  Firebase.begin(&config, &auth);

  // MPU6050
  if (!mpu.begin()) {
    Serial.println("Failed to find MPU6050 chip");
    while (1)
      ;
  }
  Serial.println("MPU6050 Found!");
  mpu.setAccelerometerRange(MPU6050_RANGE_4_G);
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
  delay(100);
  calibrateMPU();
  sessionId = time(nullptr);

  // Timer
  setupBuzzTimer();
}

void loop() {
  unsigned long currentMillis = millis();

  // 1️ 每隔 500ms 响一次蜂鸣器，持续 50ms，由 esp_timer 精确关闭
  if (currentMillis - lastBuzzTime >= buzzInterval) {
    lastBuzzTime = currentMillis;
    startBuzz(buzzDuration);
  }

  // 2️ 每 500ms 检查一次 weight 并反馈/上传
  if (currentMillis - lastCheckTime >= checkInterval) {
    lastCheckTime = currentMillis;

    float weight = readWeight();
    sensors_event_t a, g, temp;
    mpu.getEvent(&a, &g, &temp);

    float accelX = a.acceleration.x - a_offset.acceleration.x;
    float accelY = a.acceleration.y - a_offset.acceleration.y;
    float accelZ = a.acceleration.z - a_offset.acceleration.z - 9.81;

    // LED 控制
    if (weight >= 40 && weight <= 60) {
      digitalWrite(GREEN_LED_PIN, HIGH);
      digitalWrite(RED_LED_PIN, LOW);
    } else {
      digitalWrite(GREEN_LED_PIN, LOW);
      digitalWrite(RED_LED_PIN, HIGH);
    }

    // Firebase 上传
    if (Firebase.ready()) {
      time_t timestamp = time(nullptr);

      FirebaseJson json;
      json.set("weight", weight);
      json.set("accelX", accelX);
      json.set("accelY", accelY);
      json.set("accelZ", accelZ);
      json.set("timestamp", timestamp);
      json.set("sessionId", sessionId);
      Serial.print("WEIGHT:");
      Serial.print(weight);
      Serial.print(",ACCX:");
      Serial.print(accelX);
      Serial.print(",ACCY:");
      Serial.print(accelY);
      Serial.print(",ACCZ:");
      Serial.println(accelZ);
      String latestPath = "/sensors/latest";
      String historyPath = "/sensors/history/batch_" + sessionId;


      if (Firebase.RTDB.setJSON(&fbdo, latestPath, &json)) {
        Firebase.RTDB.pushJSON(&fbdo, historyPath.c_str(), &json);
        // Serial.println("✅ Data uploaded successfully:");
        Serial.println(json.raw());
      } else {
        Serial.print("❌ Firebase upload failed: ");
        Serial.println(fbdo.errorReason());
      }
    }
  }
}
