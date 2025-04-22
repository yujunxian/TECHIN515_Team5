#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
Adafruit_MPU6050 mpu;

// Acceleration baselines and history
float baselineX = 0;
float baselineY = 0;
float baselineZ = 0;

// Motion detection thresholds - reduced to be more sensitive
const float accThreshold = 0.8;  // Changed for better sensitivity

// Compression tracking
unsigned long lastPressTime = 0;
int pressCount = 0;
float pressRate = 0; // Compression rate (per minute)
unsigned long compressionTimes[5]; // Store timestamps of last 5 compressions
int timeIndex = 0;

// Movement history for speed calculation
const int historySize = 10;
float accelHistoryZ[historySize];
unsigned long timeHistory[historySize];
int historyIndex = 0;

// Added: Filter variables for smoother acceleration display
const int filterSize = 5;
float filteredX[filterSize] = {0};
float filteredY[filterSize] = {0};
float filteredZ[filterSize] = {0};
int filterIndex = 0;
float smoothX = 0;
float smoothY = 0;
float smoothZ = 0;

// Buzzer
const int buzzerPin = D2;

// For raw acceleration values
float currentAccelX = 0;
float currentAccelY = 0;
float currentAccelZ = 0;
float currentSpeed = 0;

// CPR standard rate
const float CPR_MIN_RATE = 100.0; // Minimum compressions per minute
const float CPR_MAX_RATE = 120.0; // Maximum compressions per minute

// Metronome variables
unsigned long lastBeepTime = 0;
const unsigned long beepInterval = 500; // 500ms interval = 120 compressions per minute

// Debounce variables
unsigned long lastMotionTime = 0;
const unsigned long debounceDelay = 300; // 300ms debounce to avoid multiple counts
bool motionDetected = false;

// Debug setting
const bool DEBUG = true;  // Set to true to enable serial debug output

void setup() {
  Serial.begin(115200);
  Wire.begin(5, 6); // SDA = GPIO5, SCL = GPIO6
  pinMode(buzzerPin, OUTPUT);

  // OLED init
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("OLED not found");
    while (1);
  }
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("Initializing...");
  display.display();

  // MPU6050 init
  if (!mpu.begin()) {
    Serial.println("MPU6050 not found");
    display.println("MPU6050 error");
    display.display();
    while (1);
  }
  
  // Configure MPU6050 for better sensitivity
  mpu.setAccelerometerRange(MPU6050_RANGE_2_G);
  mpu.setGyroRange(MPU6050_RANGE_250_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);

  // Initialize acceleration history
  for (int i = 0; i < historySize; i++) {
    accelHistoryZ[i] = 0;
    timeHistory[i] = 0;
  }
  
  // Initialize compression times
  for (int i = 0; i < 5; i++) {
    compressionTimes[i] = 0;
  }

  // Calibrate baseline acceleration
  calibrateBaseline();

  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("CPR Monitor Ready!");
  display.println("Rate: 100-120 BPM");
  display.display();
  delay(2000);
  
  // Play ready tones
  tone(buzzerPin, 2000, 200);
  delay(250);
  tone(buzzerPin, 3000, 200);
  
  if (DEBUG) {
    Serial.println("Setup complete, monitoring starting...");
    Serial.println("Threshold setting:");
    Serial.print("Motion threshold: "); 
    Serial.println(accThreshold);
  }
}

void calibrateBaseline() {
  float sumX = 0, sumY = 0, sumZ = 0;
  const int samples = 20;
  
  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("Calibrating...");
  display.println("Keep device still");
  display.display();
  
  // Take multiple samples for better baseline
  for (int i = 0; i < samples; i++) {
    sensors_event_t a, g, temp;
    mpu.getEvent(&a, &g, &temp);
    sumX += a.acceleration.x;
    sumY += a.acceleration.y;
    sumZ += a.acceleration.z;
    delay(50);
  }
  
  baselineX = sumX / samples;
  baselineY = sumY / samples;
  baselineZ = sumZ / samples;
  
  Serial.print("Baseline X: "); Serial.println(baselineX);
  Serial.print("Baseline Y: "); Serial.println(baselineY);
  Serial.print("Baseline Z: "); Serial.println(baselineZ);
}

// Update filter for smoother display
void updateFilter(float x, float y, float z) {
  // Add new values to the filter array
  filteredX[filterIndex] = x;
  filteredY[filterIndex] = y;
  filteredZ[filterIndex] = z;
  
  // Update filter index
  filterIndex = (filterIndex + 1) % filterSize;
  
  // Calculate averages
  float sumX = 0, sumY = 0, sumZ = 0;
  for (int i = 0; i < filterSize; i++) {
    sumX += filteredX[i];
    sumY += filteredY[i];
    sumZ += filteredZ[i];
  }
  
  smoothX = sumX / filterSize;
  smoothY = sumY / filterSize;
  smoothZ = sumZ / filterSize;
}

void loop() {
  unsigned long currentTime = millis();
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);
  
  // Calculate acceleration relative to baseline
  float ax = a.acceleration.x - baselineX;
  float ay = a.acceleration.y - baselineY;
  float az = a.acceleration.z - baselineZ;
  
  // Update the filter with new values
  updateFilter(ax, ay, az);
  
  // Store current acceleration values (now using filtered values for display)
  currentAccelX = smoothX;
  currentAccelY = smoothY;
  currentAccelZ = smoothZ;
  
  // Calculate total acceleration magnitude for motion detection
  float accelMagnitude = sqrt(ax*ax + ay*ay + az*az);
  
  // Debug output - raw acceleration
  if (DEBUG) {
    Serial.print("Raw Accel: X=");
    Serial.print(ax);
    Serial.print(" Y=");
    Serial.print(ay);
    Serial.print(" Z=");
    Serial.print(az);
    Serial.print(" Mag=");
    Serial.println(accelMagnitude);
  }
  
  // Record acceleration history for speed calculation
  accelHistoryZ[historyIndex] = az;
  timeHistory[historyIndex] = currentTime;
  historyIndex = (historyIndex + 1) % historySize;
  
  // Calculate current speed
  calculateSpeed();
  
  // Simple motion detection with debounce
  detectSimpleMotion(accelMagnitude, currentTime);
  
  // Generate CPR guidance beat
  unsigned long elapsed = currentTime - lastBeepTime;
  if (elapsed >= beepInterval) {
    // Short beep to guide CPR rhythm
    tone(buzzerPin, 2000, 20);
    lastBeepTime = currentTime;
  }
  
  // Update display
  updateDisplay(accelMagnitude);
  
  delay(30); // Faster sampling for better detection
}

// Simple motion detection function
void detectSimpleMotion(float magnitude, unsigned long currentTime) {
  // If magnitude exceeds threshold
  if (magnitude > accThreshold) {
    // Check if we're outside debounce window
    if (!motionDetected && (currentTime - lastMotionTime > debounceDelay)) {
      // Increment count and store timestamp
      pressCount++;
      
      // Store compression time for rate calculation
      compressionTimes[timeIndex] = currentTime;
      timeIndex = (timeIndex + 1) % 5;
      
      // Calculate rate
      calculateCompressionRate(currentTime);
      
      lastMotionTime = currentTime;
      motionDetected = true;
      
      // Feedback every 10 compressions
      if (pressCount % 10 == 0) {
        tone(buzzerPin, 4000, 100);
      }
      
      if (DEBUG) {
        Serial.print("Motion detected! Count: ");
        Serial.print(pressCount);
        Serial.print(", Rate: ");
        Serial.print(pressRate);
        Serial.print(", Magnitude: ");
        Serial.println(magnitude);
      }
    }
  } else if (magnitude < accThreshold/2) {
    // Reset motion detected flag when acceleration drops below half threshold
    motionDetected = false;
  }
}

void calculateCompressionRate(unsigned long currentTime) {
  // Calculate rate based on multiple compression intervals
  if (pressCount < 5) {
    // Not enough data points yet, calculate based on what we have
    if (pressCount > 1) {
      unsigned long firstTime = compressionTimes[0];
      unsigned long latestTime = currentTime;
      
      if (firstTime > 0) {
        unsigned long totalInterval = latestTime - firstTime;
        pressRate = (60000.0 * (pressCount - 1)) / totalInterval;
      }
    }
  } else {
    // Use rolling average of last 5 compressions
    int validIntervals = 0;
    unsigned long totalInterval = 0;
    
    for (int i = 0; i < 4; i++) {
      int nextIdx = (timeIndex + i + 1) % 5;
      int currentIdx = (timeIndex + i) % 5;
      
      if (compressionTimes[nextIdx] > 0 && compressionTimes[currentIdx] > 0) {
        unsigned long interval = compressionTimes[nextIdx] - compressionTimes[currentIdx];
        if (interval > 0 && interval < 2000) { // Valid interval
          totalInterval += interval;
          validIntervals++;
        }
      }
    }
    
    if (validIntervals > 0) {
      float avgInterval = totalInterval / (float)validIntervals;
      pressRate = 60000.0 / avgInterval;
      
      if (DEBUG) {
        Serial.print("Rate calculation: ");
        Serial.print(validIntervals);
        Serial.print(" valid intervals, avg interval: ");
        Serial.print(avgInterval);
        Serial.print("ms, rate: ");
        Serial.println(pressRate);
      }
    }
  }
}

void calculateSpeed() {
  // Simple velocity calculation using time differences
  float velocitySum = 0;
  int validSamples = 0;
  unsigned long currentTime = timeHistory[historyIndex];
  
  for (int i = 0; i < historySize-1; i++) {
    int currentIdx = (historyIndex + i) % historySize;
    int nextIdx = (historyIndex + i + 1) % historySize;
    
    if (timeHistory[currentIdx] > 0 && timeHistory[nextIdx] > 0) {
      unsigned long dt = timeHistory[nextIdx] - timeHistory[currentIdx];
      if (dt > 0 && dt < 200) {  // Valid time delta
        float dv = accelHistoryZ[currentIdx] * (dt / 1000.0);  // v = a * t
        velocitySum += dv;
        validSamples++;
      }
    }
  }
  
  if (validSamples > 0) {
    currentSpeed = abs(velocitySum / validSamples);
  } else {
    currentSpeed *= 0.9;  // Decay if no valid samples
  }
}

void updateDisplay(float magnitude) {
  display.clearDisplay();
  
  // Display press count and rate
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.print("Count: ");
  display.println(pressCount);
  
  // Display current press rate and standard range comparison
  display.setCursor(0, 10);
  display.print("Rate: ");
  display.print(pressRate, 1);
  display.print("/min ");
  
  // Display rate assessment
  if (pressRate > 0) {
    if (pressRate < CPR_MIN_RATE) {
      display.println("Too slow!");
    } else if (pressRate > CPR_MAX_RATE) {
      display.println("Too fast!");
    } else {
      display.println("Good");
    }
  } else {
    display.println("-");
  }
  
  // Display filtered acceleration values
  display.setCursor(0, 25);
  display.print("X: ");
  display.println(smoothX, 1);
  
  display.setCursor(0, 35);
  display.print("Y: ");
  display.println(smoothY, 1);
  
  display.setCursor(0, 45);
  display.print("Z: ");
  display.println(smoothZ, 1);
  
  // Simple motion indicator based on current magnitude
  int barHeight = min(10, (int)(magnitude * 2));
  display.fillRect(100, 40 - barHeight, 10, barHeight, SSD1306_WHITE);
  display.drawRect(100, 30, 10, 10, SSD1306_WHITE);
  
  // Display target rate
  display.setCursor(70, 55);
  display.println("100-120/min");
  
  display.display();
}