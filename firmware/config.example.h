#ifndef CONFIG_H
#define CONFIG_H

// =========================================================================
// SmartBin IoT Device Configuration
// Copy this file to 'config.h' and fill in your actual network parameters.
// DO NOT commit real Wi-Fi credentials to version control.
// =========================================================================

// Wi-Fi Access Point Credentials
// For real hardware: enter your home/office 2.4 GHz Wi-Fi SSID and password
// For Wokwi Simulator: use SSID "Wokwi-GUEST" and password ""
#define WIFI_SSID       "YOUR_WIFI_SSID"
#define WIFI_PASSWORD   "YOUR_WIFI_PASSWORD"

// SmartBin Unique Identifier
#define DEVICE_BIN_ID   "BIN-001"

// Municipal Backend Server URL
// IMPORTANT: 'localhost' or '127.0.0.1' DOES NOT work on physical microcontrollers!
// Use your computer's local LAN IPv4 address (e.g., http://192.168.1.100:5000/api/bins/data)
// Find your IP on Windows PowerShell by running: ipconfig
// For Wokwi Simulator with Wokwi IoT Gateway: http://host.wokwi.internal:5000/api/bins/data
#define BACKEND_API_URL "http://192.168.1.100:5000/api/bins/data"

// Reference Dimensions (Centimeters)
#define EMPTY_DISTANCE_CM   40.0f  // Distance from sensor to bottom of empty bin
#define FULL_DISTANCE_CM    5.0f   // Distance from sensor when bin is completely full
#define MAX_VALID_TOLERANCE 10.0f  // Distance beyond empty before flagging error

// Thresholds for alerts (%)
#define THRESHOLD_COLLECTION  80.0f
#define THRESHOLD_URGENT      95.0f

// Telemetry Timing (Milliseconds)
#define TELEMETRY_INTERVAL_MS 5000  // Reading sent every 5 seconds

// Noise Filter Settings
#define FILTER_SAMPLE_COUNT   5     // Number of ultrasonic samples for median filter

#endif // CONFIG_H
