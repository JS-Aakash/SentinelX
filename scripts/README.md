# 📡 SentinelX ESP32 Connection Guide

This guide explains how to connect one or multiple ESP32 devices to SentinelX — both for local development (USB) and for production users (WiFi + MQTT).

---

## 🔌 Two Connection Modes

| Mode | How It Works | When to Use |
|---|---|---|
| **USB / Serial** | ESP32 plugged into laptop via USB cable, `esp32_bridge.js` reads Serial output | Local development only |
| **WiFi + MQTT** (recommended) | ESP32 connects to WiFi and publishes data to MQTT cloud broker — no USB needed | Production / Real users |

---

## MODE 1 — USB Serial (Local Development)

Useful when testing on your own machine with ESP32 physically connected.

### Step 1: Flash `sensors.ino`
Open `sensors.ino` (project root) in Arduino IDE and upload to your ESP32.

### Step 2: Run the Bridge

```bash
# From the project root directory:
node scripts/esp32_bridge.js
```

The bridge auto-detects the COM port. To specify one manually:
```bash
node scripts/esp32_bridge.js --port COM5 --device MY_MACHINE_ID --url http://localhost:5000/api/v1/telemetry/ingest
```

### Connecting Multiple ESP32s via USB (dev only)

Open a **separate terminal window** for each ESP32:

```bash
# Terminal 1 — ESP32 on COM5, Machine ID: PUMP-01
node scripts/esp32_bridge.js --port COM5 --device PUMP-01

# Terminal 2 — ESP32 on COM8, Machine ID: MOTOR-02
node scripts/esp32_bridge.js --port COM8 --device MOTOR-02

# Terminal 3 — ESP32 on COM11, Machine ID: CONVEYOR-03
node scripts/esp32_bridge.js --port COM11 --device CONVEYOR-03
```

Each bridge instance streams to the backend independently. The `--device` flag maps to the `deviceId` field in the SentinelX dashboard.

---

## MODE 2 — WiFi + MQTT (Production / Real Users) ✅ Recommended

In production, users don't connect via USB. Each ESP32 connects to your WiFi and publishes telemetry directly to a cloud MQTT broker. **No laptop or USB bridge required.**

```
ESP32 (WiFi) ──→ HiveMQ Cloud (MQTT Broker) ──→ SentinelX Backend (Railway) ──→ Dashboard
```

### Step 1: Set Up a Free MQTT Broker (HiveMQ Cloud)

1. Go to **[https://www.hivemq.com/mqtt-cloud-broker/](https://www.hivemq.com/mqtt-cloud-broker/)**
2. Sign up for free (100 simultaneous connections free)
3. Create a new cluster → copy your:
   - **Cluster URL** (e.g. `abc123.s1.eu.hivemq.cloud`)
   - **Port**: `8883` (TLS) 
4. Go to **Access Management** → create a username and password
5. Add these to your backend `.env`:
   ```env
   MQTT_URL=mqtts://abc123.s1.eu.hivemq.cloud:8883
   MQTT_USERNAME=your_hivemq_username
   MQTT_PASSWORD=your_hivemq_password
   ```

### Step 2: Configure `sensors.ino` for WiFi + MQTT

Open `sensors.ino` in Arduino IDE and fill in these values at the top of the file:

```cpp
// ── WiFi Credentials ──────────────────────────────────────
const char* ssid     = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// ── MQTT Broker (HiveMQ Cloud) ────────────────────────────
const char* mqtt_server   = "abc123.s1.eu.hivemq.cloud";
const int   mqtt_port     = 8883;
const char* mqtt_user     = "your_hivemq_username";
const char* mqtt_pass     = "your_hivemq_password";

// ── Device Identity ───────────────────────────────────────
// This must match the deviceId registered in the SentinelX dashboard
const char* company_id = "YOUR_COMPANY_ID_FROM_DASHBOARD";
const char* device_id  = "ESP32-MACHINE-01";
// MQTT Topic will be: company/{company_id}/device/{device_id}
```

Upload the sketch to each ESP32. Each device automatically connects to WiFi and starts publishing to the MQTT broker at its topic.

### Step 3: Register Devices in SentinelX Dashboard

1. Log in to your SentinelX dashboard
2. Navigate to **Machines** → **Add Machine**
3. Set the **Device ID** to match exactly what you put in `sensors.ino` (e.g. `ESP32-MACHINE-01`)
4. SentinelX will automatically start receiving telemetry once the ESP32 is online

### How Multiple ESP32s Work in Production

Each user's ESP32 gets its own unique `device_id`. They all publish to their own topic:

```
company/company-abc/device/ESP32-PUMP-01     → Machine 1
company/company-abc/device/ESP32-MOTOR-02    → Machine 2
company/company-abc/device/ESP32-FAN-03      → Machine 3
```

The SentinelX backend subscribes to `company/+/device/+` (wildcard), which automatically receives data from ALL devices across ALL companies.

---

## 📋 MQTT Topic Format

```
company/{companyId}/device/{deviceId}
```

| Field | Description | Example |
|---|---|---|
| `companyId` | Your company's MongoDB ObjectId (from dashboard settings) | `6684a2f3e4b0c1234567abcd` |
| `deviceId` | Unique device identifier you choose | `ESP32-PUMP-01` |

---

## 🧪 Test MQTT Connection (Without ESP32)

You can simulate an ESP32 telemetry message from the backend:

```bash
cd backend
npx tsx src/utils/mqttTestPublisher.ts
```

This publishes a test telemetry payload to the MQTT broker and you should see it appear in the SentinelX dashboard live feed.

---

## 🔧 Required Arduino Libraries

Install these in Arduino IDE (Sketch → Include Library → Manage Libraries):

| Library | Install Name | Purpose |
|---|---|---|
| DHT Sensor Library | `DHT sensor library` by Adafruit | Temperature & Humidity |
| Adafruit ADXL345 | `Adafruit ADXL345` | Accelerometer / Vibration |
| PubSubClient | `PubSubClient` by Nick O'Leary | MQTT over WiFi |
| WiFiClientSecure | Built into ESP32 Arduino core | TLS/SSL for MQTT |
| ArduinoJson | `ArduinoJson` | JSON payload formatting |

---

## 🛑 Troubleshooting

| Problem | Fix |
|---|---|
| `COM5 is in use / Access denied` | Close Arduino IDE Serial Monitor, unplug and re-plug USB |
| ESP32 not connecting to WiFi | Check SSID/password, ensure 2.4GHz band |
| MQTT broker rejecting connection | Verify username/password in HiveMQ dashboard |
| No data in SentinelX dashboard | Check device_id matches Machine's Device ID in dashboard |
| Telemetry shows 0 current | Re-calibrate: unplug motor load and press ESP32 reset button |
