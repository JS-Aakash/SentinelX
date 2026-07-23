# 🛡️ SentinelX – AI-Powered Industrial Asset Intelligence Platform

> **Real-Time IoT Telemetry Processing · XGBoost RUL Forecasting · Isolation Forest Anomaly Shield · Multi-Tenant Industrial Governance**

---

SentinelX is an end-to-end, production-grade **AI-Powered Industrial Asset Intelligence and Predictive Maintenance Platform**. Designed for modern smart factories and heavy manufacturing fleets, SentinelX integrates real-time IoT hardware acquisition (ESP32 microcontrollers, ADXL345 vibration, DHT22 temperature, ACS712 current), machine learning health indexing, multi-output XGBoost Remaining Useful Life (RUL) forecasting, and WebSockets live waveform stream analytics to prevent machine failures before they happen.

---

## 🏗️ System Architecture

```
SentinelX/
├── backend/           Node.js + Express 5 + TypeScript + MongoDB + Socket.io
├── frontend/          Next.js 14/15 (App Router) + TypeScript + Tailwind CSS + Lucide
├── python-service/    FastAPI + Uvicorn + XGBoost + Isolation Forest + scikit-learn
└── scripts/           ESP32 Serial/MQTT Telemetry Ingestion Bridge (`esp32_bridge.js`)
```

```
[ ESP32 Hardware / Sensors ] ──> [ Serial / MQTT Bridge ] ──> [ Express Backend ] ──> [ MongoDB ]
  (DHT22, ADXL345, ACS712)            (esp32_bridge.js)                │
                                                                       ▼
[ Next.js 14 Frontend ] <───── [ Real-Time Socket.IO ] ───── < [ Python AI FastAPI ]
```

---

## ✨ Key Features

- **📡 Real-Time Microcontroller Hardware Telemetry**:
  - ESP32 Serial & MQTT ingestion bridge supporting physical sensor buses:
    - **Temperature**: DHT22 / DS18B20 (°C)
    - **Dynamic Vibration**: ADXL345 3-Axis Accelerometer ($X, Y, Z$ gravity vector magnitude & dynamic vibration isolation)
    - **Current**: ACS712 Hall-Effect Transducer (Amperes)
    - **Speed & Acoustics**: Tachometer & Sound Transducer (RPM / dB)
- **🤖 XGBoost & Isolation Forest AI Engine**:
  - **Machine Health Score Index (0–100%)**: Multi-sensor rated-relative stress calculation algorithm.
  - **Remaining Useful Life (RUL) Estimator**: XGBoost regressor forecasting operating degradation curves.
  - **Isolation Forest Anomaly Shield**: Multi-dimensional outlier detection and automated risk alarm generation.
  - **10,000 Sample Training Threshold Safeguard**: Prevents premature model training until sufficient telemetry is collected.
- **📊 Cybernetic Fleet Dashboard & Signal Matrix**:
  - **Fleet Health Radar**: Interactive circular SVG health meter and 1,000ms hardware polling frequency indicator.
  - **Fleet Aggregate Telemetry & Health Spectrum**: Multi-asset baseline telemetry stream with interactive machine target dropdown selector.
  - **Compact Fleet Status Ratio**: Dynamic distribution pie chart mapping Operational, Idle, Maintenance, Offline, and Fault assets.
  - **Predict · Protect · Prolong Cybernetic Feature Cards**: Stacked visual matrix highlighting RUL forecasting, anomaly defense, and PdM optimization.
- **🔐 Multi-Tenant Governance & RBAC**:
  - Role-based authorization (`super_admin`, `company_admin`, `maintenance_engineer`, `machine_operator`).
  - Strict JWT Access & Refresh token rotation.

---

## ⚡ Quick Start & Installation Guide

### Prerequisites
- **Node.js**: `v18.x` or higher
- **Python**: `v3.10` or higher
- **MongoDB**: Local MongoDB (`mongodb://localhost:27017/sentinelx`) or MongoDB Atlas

---

### 1. Python AI Service Setup

```bash
cd python-service
python -m pip install -r requirements.txt
python main.py
```
*AI Microservice will start listening on `http://localhost:8000`.*

---

### 2. Backend API & WebSockets Gateway Setup

```bash
cd backend
cp .env.example .env
```

Ensure your `.env` configuration contains your local MongoDB URI:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/sentinelx
JWT_SECRET=your_jwt_secret_key
PYTHON_AI_SERVICE_URL=http://localhost:8000
```

Install dependencies and launch the backend dev server:
```bash
npm install
npm run dev
```
*Backend API server will run on `http://localhost:5000`.*

---

### 3. Frontend Web Application Setup

```bash
cd frontend
npm install
npm run dev
```
*Frontend Next.js application will launch on `http://localhost:3000`.*

---

### 4. ESP32 Microcontroller Telemetry Bridge (Optional Hardware Ingestion)

Connect your ESP32 microcontroller running `sensors.ino` via USB COM port or WiFi, then launch the telemetry bridge:

```bash
# In project root:
node scripts/esp32_bridge.js
```
*Streams physical sensor packets to `http://localhost:5000/api/v1/telemetry/ingest`.*

---

## 📡 ESP32 Circuit & Pinout Architecture (`sensors.ino`)

| Sensor | Hardware Module | ESP32 Pin | Parameter Measured |
|---|---|---|---|
| Temperature | DHT22 / DS18B20 | GPIO 4 | Machine Surface Temp (°C) |
| 3-Axis Acceleration | ADXL345 (I2C) | SDA (21), SCL (22) | Dynamic Vibration ($g$) |
| Current Transducer | ACS712 (Analog) | VP (GPIO 36) | Motor Electrical Current (A) |
| Speed / RPM | Optical Sensor / Tachometer | GPIO 18 | Shaft Rotational Speed (RPM) |

---

## 🛡️ Security & Environment Best Practices

> **[IMPORTANT] Security Notice**:
> - Never commit `.env` files or hardcoded MongoDB Atlas credentials (`mongodb+srv://`) to public repositories.
> - Ensure all database URIs and JWT secrets are injected strictly via environment variables.
> - Reference `.env.example` for variable schemas.

---

## 🧰 Technology Stack

- **Frontend**: Next.js 14/15 (App Router), TypeScript, Tailwind CSS, Lucide Icons, Recharts, Socket.io Client.
- **Backend**: Node.js, Express 5, TypeScript, Mongoose 8, Socket.io, JWT Authentication, Winston Logger.
- **AI Microservice**: Python 3.12, FastAPI, Uvicorn, XGBoost, scikit-learn, pandas, numpy.
- **Hardware & IoT**: ESP32 Microcontroller, Arduino C++ (`sensors.ino`), Node.js SerialPort, MQTT.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.
