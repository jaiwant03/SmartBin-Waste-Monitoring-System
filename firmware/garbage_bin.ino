/**
 * ============================================================================
 * SmartBin — IoT-Enabled Garbage Bin Monitoring System
 * Target Board: ESP8266 NodeMCU (ESP-12E Module)
 * Ultrasonic Sensor: HC-SR04
 * Protocol: HTTP POST / JSON Telemetry
 * ============================================================================
 *
 * Pin Mapping:
 *   HC-SR04 VCC  -> NodeMCU VIN (5V Supply)
 *   HC-SR04 GND  -> NodeMCU GND
 *   HC-SR04 TRIG -> NodeMCU D5 (GPIO 14)
 *   HC-SR04 ECHO -> Voltage Divider (1k / 2k) -> NodeMCU D6 (GPIO 12)
 *
 * CAUTION: ESP8266 GPIO inputs are 3.3V logic. Always use a voltage divider
 * (1k ohm in series, 2k ohm to GND) between HC-SR04 ECHO (5V) and NodeMCU GPIO12.
 * ============================================================================
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>

// Attempt to load user configuration file if present
#if __has_include("config.h")
  #include "config.h"
#elif __has_include("config.example.h")
  #include "config.example.h"
#endif

// Default fallback configuration parameters if not defined in config.h
#ifndef WIFI_SSID
  #define WIFI_SSID "Wokwi-GUEST"
#endif
#ifndef WIFI_PASSWORD
  #define WIFI_PASSWORD ""
#endif
#ifndef DEVICE_BIN_ID
  #define DEVICE_BIN_ID "BIN-001"
#endif
#ifndef BACKEND_API_URL
  #define BACKEND_API_URL "http://host.wokwi.internal:5000/api/bins/data"
#endif
#ifndef EMPTY_DISTANCE_CM
  #define EMPTY_DISTANCE_CM 40.0f
#endif
#ifndef FULL_DISTANCE_CM
  #define FULL_DISTANCE_CM 5.0f
#endif
#ifndef MAX_VALID_TOLERANCE
  #define MAX_VALID_TOLERANCE 10.0f
#endif
#ifndef THRESHOLD_COLLECTION
  #define THRESHOLD_COLLECTION 80.0f
#endif
#ifndef THRESHOLD_URGENT
  #define THRESHOLD_URGENT 95.0f
#endif
#ifndef TELEMETRY_INTERVAL_MS
  #define TELEMETRY_INTERVAL_MS 5000
#endif
#ifndef FILTER_SAMPLE_COUNT
  #define FILTER_SAMPLE_COUNT 5
#endif

// Hardware Pin Definitions
#define PIN_TRIG 14  // NodeMCU D5 / GPIO 14
#define PIN_ECHO 12  // NodeMCU D6 / GPIO 12
#define PIN_LED   2  // Built-in LED on ESP-12 (Active LOW)

// Ultrasonic parameters
#define SOUND_SPEED_CM_PER_US 0.0343f
#define PULSE_TIMEOUT_US      30000UL // 30ms timeout (~5.1 meters max)

// Runtime variables
unsigned long lastTransmissionTime = 0;
unsigned int transmissionCounter = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println(F("======================================================"));
  Serial.println(F(" SmartBin IoT Firmware v1.0.0 — ESP8266 NodeMCU"));
  Serial.print(F(" Device ID: "));
  Serial.println(DEVICE_BIN_ID);
  Serial.println(F("======================================================"));

  // Initialize GPIO
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  pinMode(PIN_LED, OUTPUT);
  digitalWrite(PIN_TRIG, LOW);
  digitalWrite(PIN_LED, HIGH); // Turn off LED initially (Active LOW)

  // Initialize Wi-Fi connection
  connectToWiFi();
}

void loop() {
  // Ensure Wi-Fi is still connected
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("[WiFi] Connection dropped. Reconnecting..."));
    connectToWiFi();
  }

  // Periodic sensor reading and telemetry transmission
  unsigned long currentMillis = millis();
  if (currentMillis - lastTransmissionTime >= TELEMETRY_INTERVAL_MS) {
    lastTransmissionTime = currentMillis;
    transmissionCounter++;

    // 1. Measure raw distance with noise filter
    float rawDistance = measureFilteredDistance(FILTER_SAMPLE_COUNT);

    // 2. Validate sensor reading
    bool isValid = validateDistance(rawDistance);

    // 3. Compute fill percentage and status
    float fillPercentage = 0.0f;
    String statusLabel = "SENSOR ERROR";

    if (isValid) {
      fillPercentage = calculateFillPercentage(rawDistance);
      statusLabel = classifyStatus(fillPercentage);
    }

    // 4. Print debug telemetry to Serial
    printTelemetry(transmissionCounter, rawDistance, fillPercentage, statusLabel, isValid);

    // 5. Transmit telemetry via HTTP POST
    transmitTelemetry(rawDistance, fillPercentage, statusLabel, isValid);
  }
}

/**
 * Connects to local 2.4 GHz Wi-Fi access point
 */
void connectToWiFi() {
  Serial.println();
  Serial.print(F("[WiFi] Connecting to SSID: "));
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 25) {
    delay(500);
    Serial.print(F("."));
    digitalWrite(PIN_LED, !digitalRead(PIN_LED)); // Flash LED during connect
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    digitalWrite(PIN_LED, HIGH); // Off
    Serial.println();
    Serial.println(F("[WiFi] Connected successfully!"));
    Serial.print(F("[WiFi] Device IP Address: "));
    Serial.println(WiFi.localIP());
    Serial.print(F("[WiFi] RSSI Signal: "));
    Serial.print(WiFi.RSSI());
    Serial.println(F(" dBm"));
  } else {
    Serial.println();
    Serial.println(F("[WiFi] Failed to connect. Will retry in loop."));
  }
}

/**
 * Measures single ultrasonic pulse roundtrip time in microseconds
 */
unsigned long measureSinglePulse() {
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);

  return pulseIn(PIN_ECHO, HIGH, PULSE_TIMEOUT_US);
}

/**
 * Takes N ultrasonic samples and returns the median distance in cm
 * This rejects erroneous reflections and acoustic noise.
 */
float measureFilteredDistance(int samples) {
  if (samples < 1) samples = 1;
  float distances[samples];
  int validSamples = 0;

  for (int i = 0; i < samples; i++) {
    unsigned long duration = measureSinglePulse();
    if (duration > 0) {
      // Distance = (Duration * Speed of Sound) / 2
      float dist = (duration * SOUND_SPEED_CM_PER_US) / 2.0f;
      distances[validSamples++] = dist;
    }
    delay(20); // Brief acoustic damping delay between pings
  }

  if (validSamples == 0) {
    return -1.0f; // Timeout / sensor failure
  }

  // Simple bubble sort to find median
  for (int i = 0; i < validSamples - 1; i++) {
    for (int j = 0; j < validSamples - i - 1; j++) {
      if (distances[j] > distances[j + 1]) {
        float tmp = distances[j];
        distances[j] = distances[j + 1];
        distances[j + 1] = tmp;
      }
    }
  }

  // Return median value
  return distances[validSamples / 2];
}

/**
 * Validates distance against physical parameters
 */
bool validateDistance(float dist) {
  if (dist <= 0.0f) return false; // Zero or negative indicates timeout or blind zone
  if (dist > (EMPTY_DISTANCE_CM + MAX_VALID_TOLERANCE)) return false; // Beyond bin boundary
  return true;
}

/**
 * Calculates fill percentage using the calibrated empty and full distances
 * Formula: Fill % = ((Empty - Measured) / (Empty - Full)) * 100
 */
float calculateFillPercentage(float measuredDistance) {
  float usableHeight = EMPTY_DISTANCE_CM - FULL_DISTANCE_CM;
  if (usableHeight <= 0.0f) return 0.0f;

  float garbageHeight = EMPTY_DISTANCE_CM - measuredDistance;
  float percentage = (garbageHeight / usableHeight) * 100.0f;

  // Clamp within 0% - 100%
  if (percentage < 0.0f) percentage = 0.0f;
  if (percentage > 100.0f) percentage = 100.0f;

  return percentage;
}

/**
 * Classifies bin status based on fill percentage
 */
String classifyStatus(float fillPercentage) {
  if (fillPercentage >= THRESHOLD_URGENT) {
    return "FULL";
  } else if (fillPercentage >= THRESHOLD_COLLECTION) {
    return "HIGH";
  } else if (fillPercentage >= 50.0f) {
    return "MEDIUM";
  }
  return "LOW";
}

/**
 * Transmits JSON reading to the municipal backend server
 */
void transmitTelemetry(float distance, float fill, String status, bool sensorValid) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("[HTTP] Skipped transmission: Wi-Fi offline."));
    return;
  }

  WiFiClient client;
  HTTPClient http;

  // Flash activity LED
  digitalWrite(PIN_LED, LOW);

  if (http.begin(client, BACKEND_API_URL)) {
    http.addHeader(F("Content-Type"), F("application/json"));

    // Build JSON payload
    String payload = "{";
    payload += "\"bin_id\":\"" + String(DEVICE_BIN_ID) + "\",";
    payload += "\"distance_cm\":" + String(distance, 1) + ",";
    if (sensorValid) {
      payload += "\"fill_percentage\":" + String(fill, 1) + ",";
    } else {
      payload += "\"fill_percentage\":null,";
    }
    payload += "\"status\":\"" + status + "\",";
    payload += "\"sensor_valid\":" + String(sensorValid ? "true" : "false") + ",";
    payload += "\"source\":\"hardware\"";
    payload += "}";

    int httpResponseCode = http.POST(payload);

    if (httpResponseCode > 0) {
      Serial.print(F("[HTTP] POST Result Code: "));
      Serial.print(httpResponseCode);
      if (httpResponseCode == 200 || httpResponseCode == 201) {
        Serial.println(F(" (Success)"));
      } else {
        Serial.println(F(" (Warning/Error)"));
      }
    } else {
      Serial.print(F("[HTTP] POST Failed. Error: "));
      Serial.println(http.errorToString(httpResponseCode).c_str());
    }

    http.end();
  } else {
    Serial.println(F("[HTTP] Unable to connect to host endpoint."));
  }

  // Turn LED back off
  digitalWrite(PIN_LED, HIGH);
}

/**
 * Pretty-print telemetry for Serial Monitor monitoring
 */
void printTelemetry(unsigned int count, float dist, float fill, String status, bool valid) {
  Serial.println(F("------------------------------------------------------"));
  Serial.print(F(" Telemetry #"));
  Serial.print(count);
  Serial.print(F(" | Node: "));
  Serial.print(DEVICE_BIN_ID);
  Serial.print(F(" | Sensor Valid: "));
  Serial.println(valid ? "YES" : "NO");

  if (valid) {
    Serial.print(F(" Distance: "));
    Serial.print(dist, 1);
    Serial.print(F(" cm | Fill Level: "));
    Serial.print(fill, 1);
    Serial.print(F("% | Status: ["));
    Serial.print(status);
    Serial.println(F("]"));
  } else {
    Serial.println(F(" SENSOR FAULT DETECTED: Ultrasonic distance invalid."));
  }
  Serial.println(F("------------------------------------------------------"));
}
