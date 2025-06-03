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

TwoInchPulse addresses this need by integrating a FSR,  and MPU6050 with an ESP32-S3 microcontroller to track compression force, motion, and rhythm. Feedback is provided through a buzzer, 2 LEDs, and a front-end, allowing trainees to self-correct in real time and review historical records for improvement.

---

## Key Features

- **Compression Depth Measurement**  
  Force Sensitive Resistor applied pressure to estimate compression depth.
- **Smart Feedback Algorithm**  
  The system includes a web app to showcase the current real-time data and enabled a review of historical records. LED on the device also gives user an intuitive feedback of the performance. A buzzer with indicated rythm also reminds user to perform the action in a timely speed.
- **Flexible Enclosure**  
  Enclosure designed with special material with flexible features allows the CPR process being safer and smoother.
- **Low-Power, Portable System**  
  Powered by a rechargeable  LiPo battery for field use or mobile training.

---

## Hardware Components

| Component         | Model / Type         | Purpose                                |
|------------------|----------------------|----------------------------------------|
| MCU              | ESP32-S3            | Controls logic, collects data, BLE     |
| Force Sensor     | FSR (50kg) | Measures compression force             |
| Audio Output | Passive Buzzer | Provides auditory rhythm/alert cues |
| Power Supply | LiPo           | Portable battery power              |

---

## Datasheets

All hardware component datasheets are located in the [Datasheets](./Datasheets) folder.



## Code Instructions

```
TECHIN515_TEAM5/
├── Arduino Codes/ # arduino codes in the iteration process
│   ├── load_cell_test.ino
│   ├── Firebase.ino
│   ├── deliverable3.ino
│   ├── deliverable5.ino
│   ├── milestone3.ino
├── cpr-dashboard/
│   ├── # frontend files using Next.js framework
├── Python Scripts/
│   ├── # python files handling 


```

1. Upload milestone3.ino to ESP32

2. Go to cpr-dashboard 

   1. run with command `npm install` to install dependencies
   2. run with `npm run dev` to start the service locally

   
