# SmartBin — Simulation Guide

This folder contains simulation tools for the **SmartBin Intelligent Waste Monitoring System**.

The production firmware targets ESP8266 NodeMCU hardware. The Wokwi project uses a supported ESP32 board with separate simulation firmware. For a no-hardware telemetry test, use the **Software Sensor Simulator**, a standalone Node.js CLI script that sends test telemetry to the backend.

---

## Software Sensor Simulator (Recommended)

The software simulator runs directly using Node.js without requiring third-party browser plugins or external hardware.

### Quick Start:

1. Ensure the backend server is running:
   ```powershell
   npm run backend
   ```

2. In a separate terminal, launch the simulator:
   ```powershell
   npm run simulate
   ```

### Running Specific Test Scenarios:

- **Scenario A (Empty Bin - 40 cm, 0%, LOW)**:
  ```powershell
  node simulation/sensorSimulator.js --scenario A --bin BIN-001 --once
  ```

- **Scenario B (Half-Filled Bin - 22.5 cm, 50%, MEDIUM)**:
  ```powershell
  node simulation/sensorSimulator.js --scenario B --bin BIN-001 --once
  ```

- **Scenario C (Nearly Full Bin - 8.5 cm, 90%, HIGH / Collection Needed)**:
  ```powershell
  node simulation/sensorSimulator.js --scenario C --bin BIN-001 --once
  ```

- **Scenario D (Completely Full Bin - 5.0 cm, 100%, FULL / Urgent Collection)**:
  ```powershell
  node simulation/sensorSimulator.js --scenario D --bin BIN-001 --once
  ```

- **Scenario E (Sensor Error - Invalid Measurement)**:
  ```powershell
  node simulation/sensorSimulator.js --scenario E --bin BIN-001 --once
  ```

- **Scenario F (Wi-Fi Disconnection / Packet Loss)**:
  ```powershell
  node simulation/sensorSimulator.js --scenario F --bin BIN-001
  ```

- **Scenario H (Multi-Bin Autonomous City Simulation)**:
  ```powershell
  node simulation/sensorSimulator.js --scenario H --interval 3
  ```

---

## Wokwi Simulation

Wokwi does not currently support the production ESP8266/NodeMCU firmware, so `diagram.json` uses a supported ESP32 DevKit V1. The separate `wokwi` sketch simulates the same HC-SR04 measurement and telemetry flow; the production firmware and physical circuit remain ESP8266-targeted.

1. Install the ESP32 Arduino core for Arduino CLI if needed: `arduino-cli core install esp32:esp32`.
2. From the project root, run `npm run wokwi:build`. This creates `simulation/build/wokwi.ino.bin` and `.elf`, which the root and simulation Wokwi configurations reference.
3. Start the Wokwi simulation from the project root. If Wokwi reports that `build/wokwi.ino.bin` or `simulation/build/wokwi.ino.bin` is missing, build the firmware before starting or restart the simulation after the build completes. The generated build files are not included in source control, so this step is required on a fresh checkout and after deleting the build folder.
4. The HC-SR04 echo is level-shifted through the two resistors to ESP32 GPIO 27.

For a no-hardware backend test, use the software sensor simulator above. To run the production firmware, follow the root README's [physical ESP8266 setup](../README.md#9-connecting-physical-esp8266-hardware).

---

## Sensor Formulas & Reference Values

$$\text{Fill Percentage} = \frac{\text{Empty Distance} - \text{Measured Distance}}{\text{Empty Distance} - \text{Full Distance}} \times 100$$

- **Default Empty Distance**: $40.0\text{ cm}$
- **Default Full Distance**: $5.0\text{ cm}$
- **Usable Bin Height**: $40.0 - 5.0 = 35.0\text{ cm}$

| Distance (cm) | Fill % | Status Classification | Municipal Action |
|:---:|:---:|:---:|:---|
| $\ge 40.0$ | $0.0\%$ | LOW / SAFE | Normal Monitoring |
| $22.5$ | $50.0\%$ | MEDIUM | Normal Monitoring |
| $8.5$ | $90.0\%$ | HIGH | Scheduled Dispatch |
| $\le 5.0$ | $100.0\%$ | FULL / URGENT | Immediate Truck Dispatch |
| $\le 0$ or $>50$ | `null` | SENSOR ERROR | Check Ultrasonic Sensor |
