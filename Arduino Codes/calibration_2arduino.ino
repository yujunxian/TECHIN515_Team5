#include <WiFi.h>
#include <Wire.h>
#include <Firebase_ESP_Client.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <time.h>
#include <esp_timer.h>
#include <math.h>

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

unsigned long lastBuzzTime = 0;
const int buzzInterval = 500;
const int buzzDuration = 50;
unsigned long lastCheckTime = 0;
const int checkInterval = 500;
volatile bool isBuzzing = false;
esp_timer_handle_t buzzTimer;

// Butterworth low-pass filter coefficients
const float b[3] = { 0.0133592, 0.0267184, 0.0133592 };
const float a[3] = { 1.0, -1.64745998, 0.70089678 };
float x_fsr[3] = { 0 };
float y_fsr[3] = { 0 };

float filterFSR(float input) {
  x_fsr[0] = input;
  y_fsr[0] = b[0] * x_fsr[0] + b[1] * x_fsr[1] + b[2] * x_fsr[2]
             - a[1] * y_fsr[1] - a[2] * y_fsr[2];
  x_fsr[2] = x_fsr[1]; x_fsr[1] = x_fsr[0];
  y_fsr[2] = y_fsr[1]; y_fsr[1] = y_fsr[0];
  return y_fsr[0];
}

void IRAM_ATTR stopBuzz(void* arg) {
  noTone(BUZZER_PIN);
  isBuzzing = false;
}

void startBuzz(int duration_ms) {
  tone(BUZZER_PIN, 800);
  isBuzzing = true;
  esp_timer_start_once(buzzTimer, duration_ms * 1000);
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
  Serial.print("raw data: "); Serial.println(fsrReading);
  float weight = 0.0;
  if (fsrReading > 0) {
    weight = -21.372 * log(fsrReading) + 161.42; // <- log 拟合
  }
  weight = filterFSR(weight);
  Serial.print("weight: "); Serial.println(weight);
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
  Wire.begin(5, 6);

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

  if (!mpu.begin()) {
    Serial.println("Failed to find MPU6050 chip");
    while (1);
  }
  Serial.println("MPU6050 Found!");
  mpu.setAccelerometerRange(MPU6050_RANGE_4_G);
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
  delay(100);
  calibrateMPU();
  sessionId = time(nullptr);
  setupBuzzTimer();
}

void loop() {
  unsigned long currentMillis = millis();
  if (currentMillis - lastBuzzTime >= buzzInterval) {
    lastBuzzTime = currentMillis;
    startBuzz(buzzDuration);
  }

  if (currentMillis - lastCheckTime >= checkInterval) {
    lastCheckTime = currentMillis;

    float weight = readWeight();
    sensors_event_t a, g, temp;
    mpu.getEvent(&a, &g, &temp);

    float accelX = a.acceleration.x - a_offset.acceleration.x;
    float accelY = a.acceleration.y - a_offset.acceleration.y;
    float accelZ = a.acceleration.z - a_offset.acceleration.z - 9.81;

    if (weight >= 40 && weight <= 60) {
      digitalWrite(GREEN_LED_PIN, HIGH);
      digitalWrite(RED_LED_PIN, LOW);
    } else {
      digitalWrite(GREEN_LED_PIN, LOW);
      digitalWrite(RED_LED_PIN, HIGH);
    }

    if (Firebase.ready()) {
      time_t timestamp = time(nullptr);
      FirebaseJson json;
      json.set("weight", weight);
      json.set("accelX", accelX);
      json.set("accelY", accelY);
      json.set("accelZ", accelZ);
      json.set("timestamp", timestamp);
      json.set("sessionId", sessionId);

      Serial.print("WEIGHT:"); Serial.print(weight);
      Serial.print(",ACCX:"); Serial.print(accelX);
      Serial.print(",ACCY:"); Serial.print(accelY);
      Serial.print(",ACCZ:"); Serial.println(accelZ);

      String latestPath = "/sensors/latest";
      String historyPath = "/sensors/history/batch_" + sessionId;

      if (Firebase.RTDB.setJSON(&fbdo, latestPath, &json)) {
        Firebase.RTDB.pushJSON(&fbdo, historyPath.c_str(), &json);
        Serial.println(json.raw());
      } else {
        Serial.print("\u274C Firebase upload failed: ");
        Serial.println(fbdo.errorReason());
      }
    }
  }
}
