# TECHIN515_Team5: TwoInchPulse

**TwoInchPulse** is a compact CPR training feedback system designed for first responders, such as firefighters and police officers who are often first to perform life-saving chest compressions before professional medical help arrives. The system provides real-time feedback on the quality of CPR compressions, helping users improve depth, rhythm, and consistency in training scenarios.

---

## Problem Statement

Performing high-quality CPR requires chest compressions at the correct **depth** (5–6 cm) and **rate** (100–120 compressions per minute), along with full recoil between compressions. However, current CPR training tools often:
- Lack real-time, personalized feedback.
- Are costly and institution-based.
- Do not reinforce proper technique during solo training sessions.

**First responders** need an accessible, portable device to practice CPR with immediate feedback and without relying on expensive manikins.

---

## Our Solution

TwoInchPulse addresses this need by integrating a **load cell**, **high-resolution ADC**, and **IMU** with an **ESP32-C3 microcontroller** to track compression force, motion, and rhythm. Feedback is provided through an **OLED display** and **buzzer**, allowing trainees to self-correct in real time.

---

## Key Features

- **Compression Depth Measurement**  
  Load cell + … ADC captures applied pressure to estimate compression depth.

- **Smart Feedback Algorithm**  
  The system categorizes each compression as:  
  - Below threshold  
  - Within target range  
  - Exceeds safe limit

- **Multimodal Output**  
  Visual feedback via OLED; audio cues via buzzer for rhythm guidance and warning alerts.

- **Command-Line Interface (CLI)**  
  Real-time data from the sensors is streamed via Serial Monitor for validation and debugging.

- **Low-Fidelity Prototype**  
  Components are enclosed in a lightweight, cardboard shell, simulating final product placement.

- **Low-Power, Portable System**  
  Powered by a coin cell or LiPo battery for field use or mobile training.

---

## Hardware Components

| Component         | Model / Type         | Purpose                                |
|------------------|----------------------|----------------------------------------|
| MCU              | ESP32-C3             | Controls logic, collects data, BLE     |
| Force Sensor     | Load Cell (5kg)      | Measures compression force             |
| ADC              | NAU7802              | Converts analog signal to digital      |
| Display          | OLED SSD1306 (I2C)   | Visual output for compression feedback |
| Audio Output     | Passive Buzzer       | Provides auditory rhythm/alert cues    |
| Power Supply     | CR2032 or LiPo       | Portable battery power                 |

---

## Datasheets

All hardware component datasheets are located in the [Datasheets](./Datasheets) folder:
- [NAU7802.pdf](./Datasheets/NAU7802.pdf)
- [SSD1306.pdf](./Datasheets/SSD1306.pdf)
- [buzzer.pdf](./Datasheets/buzzer.pdf)





