#include <Wire.h>

void setup() {
  Wire.begin(5, 6);  // SDA = GPIO6, SCL = GPIO7
  Serial.begin(115200);
  delay(1000);
  Serial.println("I2C Scanner...");
}

void loop() {
  byte error, address;
  int count = 0;

  for(address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    error = Wire.endTransmission();

    if (error == 0) {
      Serial.print("I2C device found at address 0x");
      Serial.println(address, HEX);
      count++;
    }
  }

  if (count == 0) Serial.println("No I2C devices found");
  delay(2000);
}

