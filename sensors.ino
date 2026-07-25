/**
 * SentinelX ESP32 Firmware — sensors.ino
 *
 * Supports two operating modes:
 *   1. SERIAL MODE  (development): Output to USB Serial -> read by esp32_bridge.js
 *   2. MQTT MODE    (production):  WiFi + MQTT over TLS -> HiveMQ Cloud -> SentinelX backend
 *
 * For production (real users), set ENABLE_WIFI_MQTT to true and fill in your credentials below.
 */

// ==============================================================
// USER CONFIGURATION -- Edit these values before uploading
// ==============================================================

// Set to true to enable WiFi + MQTT (production mode)
// Set to false to use USB Serial only (development mode)
#define ENABLE_WIFI_MQTT false

// WiFi credentials (only used if ENABLE_WIFI_MQTT is true)
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// HiveMQ Cloud broker (sign up free at hivemq.com/mqtt-cloud-broker)
const char* MQTT_BROKER   = "your-cluster.s1.eu.hivemq.cloud";
const int   MQTT_PORT     = 8883;
const char* MQTT_USER     = "your_hivemq_username";
const char* MQTT_PASS     = "your_hivemq_password";

// Device identity -- must match the Device ID registered in SentinelX dashboard
const char* COMPANY_ID   = "your_company_id_from_dashboard";
const char* DEVICE_ID    = "ESP32-MACHINE-01";

// ==============================================================

#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_ADXL345_U.h>
#include <DHT.h>

#if ENABLE_WIFI_MQTT
  #include <WiFi.h>
  #include <WiFiClientSecure.h>
  #include <PubSubClient.h>
  #include <ArduinoJson.h>
  WiFiClientSecure wifiClient;
  PubSubClient mqttClient(wifiClient);
#endif

// Sensor Pins
#define DHTPIN      4    // DHT22 data pin
#define DHTTYPE     DHT22
#define SOUND_PIN   34
#define CURRENT_PIN 35   // ACS712 analog out
#define VOLTAGE_PIN 32
#define RPM_PIN     27

DHT dht(DHTPIN, DHTTYPE);
Adafruit_ADXL345_Unified accel = Adafruit_ADXL345_Unified(12345);

// RPM
volatile unsigned long pulses = 0;
unsigned long lastRPMTime = 0;
float rpm = 0;
#define PULSES_PER_REV 1

// Sensor Values
float voltage = 0, current = 0;
int soundValue = 0;
float temperature = 0, humidity = 0;
float ax = 0, ay = 0, az = 0;

// Current Calibration (ACS712)
#define ACS712_SENS_MV_PER_A 66.0f   // 66 mV/A for 30A model (100.0 for 20A, 185.0 for 5A)
float zeroADC = 2048.0f;
float zeroMilliVolts = 1650.0f;
float currentFiltered = 0.0f;

void IRAM_ATTR countPulse() { pulses++; }

float readRawADC() {
  uint32_t acc = 0;
  for (int i = 0; i < 64; i++) acc += analogRead(CURRENT_PIN);
  return (float)acc / 64.0f;
}

void calibrateZeroAndNoise() {
  Serial.println();
  Serial.println("==========================================");
  Serial.println(" Calibrating Current Sensor (ACS712)...");
  Serial.println(" Ensure load/motor is OFF during boot   ");
  Serial.println("==========================================");
  double accADC = 0;
  const int SAMPLES = 1000;
  for (int i = 0; i < SAMPLES; i++) {
    accADC += readRawADC();
    if (i % 250 == 0) Serial.printf(" Calibrating... %d%%\n", (i * 100) / SAMPLES);
    delay(2);
  }
  zeroADC = (float)(accADC / SAMPLES);
  zeroMilliVolts = (zeroADC / 4095.0f) * 3300.0f;
  currentFiltered = 0.0f;
  Serial.printf(" Done. Zero=%.2f ADC, %.2f mV\n\n", zeroADC, zeroMilliVolts);
}

float updateCurrentReading() {
  unsigned long start = millis();
  double sumSqDiffMv = 0;
  int samples = 0;
  while (millis() - start < 80) {
    float mv = (readRawADC() / 4095.0f) * 3300.0f;
    float diff = mv - zeroMilliVolts;
    sumSqDiffMv += (diff * diff);
    samples++;
    delayMicroseconds(300);
  }
  if (samples == 0) return currentFiltered;
  float rawA = sqrt(sumSqDiffMv / samples) / ACS712_SENS_MV_PER_A;
  if (rawA < 0.015f) rawA = 0.0f;
  currentFiltered = (0.75f * currentFiltered) + (0.25f * rawA);
  if (currentFiltered < 0.01f) currentFiltered = 0.0f;
  return currentFiltered;
}

float readVoltage() {
  long sum = 0;
  for (int i = 0; i < 20; i++) { sum += analogRead(VOLTAGE_PIN); delay(2); }
  return (sum / 20.0) * (3.3 / 4095.0) * 5.0;
}

// WiFi + MQTT Helpers (production only)
#if ENABLE_WIFI_MQTT
void connectWiFi() {
  Serial.printf("Connecting to WiFi: %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500); Serial.print("."); attempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\nWiFi connected! IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\nWiFi FAILED. Running Serial-only.");
  }
}

void connectMQTT() {
  wifiClient.setInsecure();
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setBufferSize(1024);
  char clientId[64];
  snprintf(clientId, sizeof(clientId), "sentinelx_%s", DEVICE_ID);
  Serial.printf("Connecting MQTT: %s...\n", MQTT_BROKER);
  if (mqttClient.connect(clientId, MQTT_USER, MQTT_PASS)) {
    Serial.println("MQTT connected!");
  } else {
    Serial.printf("MQTT failed: state=%d\n", mqttClient.state());
  }
}

void publishMQTT(float temp, float hum, float cur, float volt, float r, int sound, float x, float y, float z) {
  if (!mqttClient.connected()) connectMQTT();
  if (!mqttClient.connected()) return;

  StaticJsonDocument<512> doc;
  doc["deviceId"]    = DEVICE_ID;
  doc["timestamp"]   = millis();
  doc["temperature"] = temp;
  doc["humidity"]    = hum;
  doc["current"]     = cur;
  doc["voltage"]     = volt;
  doc["rpm"]         = r;
  doc["sound"]       = sound;

  JsonObject accelObj = doc.createNestedObject("acceleration");
  accelObj["x"] = x; accelObj["y"] = y; accelObj["z"] = z;

  float mag = sqrt(x*x + y*y + z*z);
  doc["vibration"] = max(0.0f, abs(mag - 1.0f));

  char topic[128];
  snprintf(topic, sizeof(topic), "company/%s/device/%s", COMPANY_ID, DEVICE_ID);

  char payload[512];
  serializeJson(doc, payload, sizeof(payload));

  if (mqttClient.publish(topic, payload)) {
    Serial.printf("[MQTT] Published to %s\n", topic);
  } else {
    Serial.println("[MQTT] Publish failed");
  }
  mqttClient.loop();
}
#endif

// Setup
void setup() {
  Serial.begin(115200);
  dht.begin();
  Wire.begin(21, 22); // SDA=GPIO21, SCL=GPIO22

  if (!accel.begin()) {
    Serial.println("ADXL345 NOT FOUND! Check wiring.");
    while (1);
  }
  accel.setRange(ADXL345_RANGE_16_G);

  pinMode(SOUND_PIN, INPUT);
  pinMode(CURRENT_PIN, INPUT);
  pinMode(VOLTAGE_PIN, INPUT);
  analogReadResolution(12);
  analogSetPinAttenuation(CURRENT_PIN, ADC_11db);

  pinMode(RPM_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(RPM_PIN), countPulse, FALLING);
  lastRPMTime = millis();

  delay(1000);
  calibrateZeroAndNoise();

#if ENABLE_WIFI_MQTT
  connectWiFi();
  connectMQTT();
#endif

  Serial.println("==============================");
  Serial.println(" SentinelX Started");
#if ENABLE_WIFI_MQTT
  Serial.println(" Mode: WiFi + MQTT (Production)");
#else
  Serial.println(" Mode: USB Serial (Development)");
#endif
  Serial.println("==============================");
}

// Main Loop
void loop() {
  temperature = dht.readTemperature();
  humidity    = dht.readHumidity();
  soundValue  = analogRead(SOUND_PIN);
  current     = updateCurrentReading();
  voltage     = readVoltage();

  sensors_event_t event;
  accel.getEvent(&event);
  ax = event.acceleration.x / 9.81;
  ay = event.acceleration.y / 9.81;
  az = event.acceleration.z / 9.81;
  if (fabsf(ay) > 16.0f) ay /= 32.0f;
  if (fabsf(ax) > 16.0f) ax /= 32.0f;
  if (fabsf(az) > 16.0f) az /= 32.0f;

  // RPM (every 5 seconds)
  if (millis() - lastRPMTime >= 5000) {
    noInterrupts();
    unsigned long count = pulses;
    pulses = 0;
    interrupts();
    rpm = (count / (float)PULSES_PER_REV) * (60.0 / 5.0);
    lastRPMTime += 5000;
  }

  // Serial output (always active -- used by esp32_bridge.js in dev mode)
  Serial.println();
  Serial.println("=========== SentinelX ===========");
  Serial.printf("Temperature : %.2f C\n",  temperature);
  Serial.printf("Humidity    : %.2f %%\n", humidity);
  Serial.println();
  Serial.println("Acceleration (g)");
  Serial.printf("X : %.2f\n", ax);
  Serial.printf("Y : %.2f\n", ay);
  Serial.printf("Z : %.2f\n", az);
  Serial.println();
  Serial.printf("RPM         : %.0f\n",   rpm);
  Serial.printf("Voltage     : %.2f V\n", voltage);
  Serial.printf("Current     : %.3f A\n", current);
  Serial.printf("Zero MV     : %.1f mV\n", zeroMilliVolts);
  Serial.printf("Sound ADC   : %d\n",     soundValue);
  Serial.println("===============================");

  // MQTT publish (production mode only)
#if ENABLE_WIFI_MQTT
  publishMQTT(temperature, humidity, current, voltage, rpm, soundValue, ax, ay, az);
#endif

  delay(1000);
}
