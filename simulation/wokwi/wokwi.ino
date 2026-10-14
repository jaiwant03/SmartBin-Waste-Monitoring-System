#include <HTTPClient.h>
#include <WiFi.h>

namespace {
constexpr uint8_t PIN_TRIG = 14;
constexpr uint8_t PIN_ECHO = 27;
constexpr uint8_t PIN_LED = 2;
constexpr float EMPTY_DISTANCE_CM = 40.0f;
constexpr float FULL_DISTANCE_CM = 5.0f;
constexpr float SOUND_SPEED_CM_PER_US = 0.0343f;
constexpr uint32_t PULSE_TIMEOUT_US = 30000;
constexpr uint32_t TELEMETRY_INTERVAL_MS = 5000;
constexpr uint8_t FILTER_SAMPLE_COUNT = 5;
const char* const WIFI_SSID = "Wokwi-GUEST";
const char* const WIFI_PASSWORD = "";
const char* const DEVICE_BIN_ID = "BIN-001";
const char* const BACKEND_API_URL = "http://host.wokwi.internal:5000/api/bins/data";

uint32_t lastTransmissionTime = 0;
uint32_t transmissionCounter = 0;

float measureDistance() {
  float samples[FILTER_SAMPLE_COUNT];
  uint8_t validSamples = 0;

  for (uint8_t i = 0; i < FILTER_SAMPLE_COUNT; ++i) {
    digitalWrite(PIN_TRIG, LOW);
    delayMicroseconds(2);
    digitalWrite(PIN_TRIG, HIGH);
    delayMicroseconds(10);
    digitalWrite(PIN_TRIG, LOW);

    const unsigned long duration = pulseIn(PIN_ECHO, HIGH, PULSE_TIMEOUT_US);
    if (duration > 0) {
      samples[validSamples++] = (duration * SOUND_SPEED_CM_PER_US) / 2.0f;
    }
    delay(20);
  }

  if (validSamples == 0) {
    return -1.0f;
  }

  for (uint8_t i = 0; i + 1 < validSamples; ++i) {
    for (uint8_t j = 0; j + 1 < validSamples - i; ++j) {
      if (samples[j] > samples[j + 1]) {
        const float temp = samples[j];
        samples[j] = samples[j + 1];
        samples[j + 1] = temp;
      }
    }
  }
  return samples[validSamples / 2];
}

void sendTelemetry(float distance) {
  const bool sensorValid = distance > 0.0f && distance <= 50.0f;
  float fillPercentage = 0.0f;
  const char* status = "SENSOR ERROR";

  if (sensorValid) {
    fillPercentage = ((EMPTY_DISTANCE_CM - distance) /
                      (EMPTY_DISTANCE_CM - FULL_DISTANCE_CM)) * 100.0f;
    fillPercentage = constrain(fillPercentage, 0.0f, 100.0f);
    status = fillPercentage >= 95.0f ? "FULL" :
             fillPercentage >= 80.0f ? "HIGH" :
             fillPercentage >= 50.0f ? "MEDIUM" : "LOW";
  }

  Serial.printf("[Reading %lu] distance=%.1f cm, fill=%.1f%%, status=%s\n",
                static_cast<unsigned long>(++transmissionCounter),
                distance, fillPercentage, status);

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Offline; telemetry was not sent.");
    return;
  }

  WiFiClient client;
  HTTPClient http;
  if (!http.begin(client, BACKEND_API_URL)) {
    Serial.println("[HTTP] Could not initialize backend request.");
    return;
  }

  http.addHeader("Content-Type", "application/json");
  String payload = "{\"bin_id\":\"";
  payload += DEVICE_BIN_ID;
  payload += "\",\"distance_cm\":";
  payload += String(distance, 1);
  payload += ",\"fill_percentage\":";
  payload += sensorValid ? String(fillPercentage, 1) : "null";
  payload += ",\"status\":\"";
  payload += status;
  payload += "\",\"sensor_valid\":";
  payload += sensorValid ? "true" : "false";
  payload += ",\"source\":\"hardware\"}";

  const int responseCode = http.POST(payload);
  Serial.printf("[HTTP] POST result: %d\n", responseCode);
  http.end();
}
}  // namespace

void setup() {
  Serial.begin(115200);
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  pinMode(PIN_LED, OUTPUT);
  digitalWrite(PIN_TRIG, LOW);
  digitalWrite(PIN_LED, HIGH);

  Serial.println("\nSmartBin Wokwi ESP32 simulation");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("[WiFi] Connecting to Wokwi-GUEST");

  uint8_t attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts++ < 30) {
    delay(500);
    Serial.print('.');
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WiFi] Connected: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n[WiFi] Not connected; will retry in loop.");
  }
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.reconnect();
  }

  if (millis() - lastTransmissionTime >= TELEMETRY_INTERVAL_MS) {
    lastTransmissionTime = millis();
    sendTelemetry(measureDistance());
  }
}
