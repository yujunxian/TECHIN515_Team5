#include <WiFi.h>
#include <Firebase_ESP_Client.h>

// Wi-Fi 配置信息（请修改为你自己的）
#define WIFI_SSID "your_wifi_name"
#define WIFI_PASSWORD "your_wifi_password"

// Firebase 配置信息（请替换为你自己项目的）
#define API_KEY "your_firebase_web_api_key"
#define DATABASE_URL "https://your-project-id.firebaseio.com"  // 注意不加斜杠结尾

// Firebase 实例对象
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

void setup() {
  Serial.begin(115200);

  // 连接 WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
  }
  Serial.println("\nConnected to WiFi!");

  // Firebase 配置
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  // 上传一条测试数据：123 到 /test/value
  if (Firebase.RTDB.setInt(&fbdo, "/test/value", 123)) {
    Serial.println("Firebase upload success!");
  } else {
    Serial.print("Firebase upload failed: ");
    Serial.println(fbdo.errorReason());
  }
}

void loop() {
  // 这里可以上传实时数据，比如每 5 秒上传一次
}