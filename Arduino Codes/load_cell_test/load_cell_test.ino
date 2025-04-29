#include <Arduino.h>
#include <Wire.h>
#include <SparkFun_Qwiic_Scale_NAU7802_Arduino_Library.h>

NAU7802 loadCell; // Create instance of the NAU7802 class

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("NAU7802 Load Cell Connection Test");
  
  Wire.begin(5,6);
  Wire.setClock(400000); // Set I2C to 400kHz
  
  // Check if the NAU7802 is connected and communicating
  if (loadCell.begin() == false) {
    Serial.println("NAU7802 not detected. Check wiring.");
    while (1); // Halt program
  }
  
  Serial.println("NAU7802 connected successfully!");
  
  // Configure the NAU7802
  loadCell.setGain(NAU7802_GAIN_128); // Set gain - higher gain for smaller loads
  loadCell.setSampleRate(NAU7802_SPS_80); // 80 samples per second
  
  // Calibrate the analog front end of the NAU7802
  if (loadCell.calibrateAFE() == false) {
    Serial.println("Calibration failed. Check connections.");
    while (1);
  }
  
  Serial.println("Calibration complete!");
  
  // Wait for reading to stabilize
  delay(2000);
}

void loop() {
  // Check if data is available
  if (loadCell.available() == true) {
    // Get raw reading
    long rawReading = loadCell.getReading();
    
    // Print the raw reading
    Serial.print("Raw reading: ");
    Serial.println(rawReading);
    
    // Calculate a simple moving average to check for stability
    static long readings[10];
    static int readIndex = 0;
    static long total = 0;
    static int readCount = 0;
    
    total = total - readings[readIndex];
    readings[readIndex] = rawReading;
    total = total + readings[readIndex];
    readIndex = (readIndex + 1) % 10;
    
    if (readCount < 10) readCount++;
    
    long average = total / readCount;
    
    // Print average
    Serial.print("Average: ");
    Serial.println(average);
    
    // Print some diagnostic info about the signal
    Serial.print("Signal stability (variance): ");
    long variance = 0;
    for (int i = 0; i < readCount; i++) {
      variance += (readings[i] - average) * (readings[i] - average);
    }
    variance /= readCount;
    Serial.println(variance);
    
    // Check if we have a stable connection based on variance
    if (variance < 10000) {
      Serial.println("Signal is stable - connection seems good!");
    } else {
      Serial.println("Signal has high variance - check connections");
    }
    
    Serial.println("----------------------------");
  }
  
  delay(100); // Short delay between readings
}