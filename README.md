# 🛡️ SentinelX — AI-Powered Industrial Asset Intelligence Platform

> **Real-Time IoT Telemetry · XGBoost RUL Forecasting · Isolation Forest Anomaly Detection · Ethereum Blockchain Anchoring · Multi-Tenant Industrial Governance**

[![Deploy Frontend to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/SentinelX&root=frontend)

---

## 🏗️ Architecture

```
[ ESP32 Hardware ]  ──WiFi/MQTT──▶  [ HiveMQ Cloud ]  ──▶  [ Backend — Railway ]
  DHT22, ADXL345,                    (Free MQTT Broker)         Node.js + Express
  ACS712, RPM sensor                                            MongoDB Atlas
                                                                Socket.IO
                                                                       │
                                                                       ▼
                                                         [ Frontend — Vercel ]
                                                           Next.js 15 + TypeScript

[ Python AI Service ] ──HTTP──▶ [ Backend ]     [ Ethereum Sepolia Testnet ]
  XGBoost RUL + Isolation Forest                  Smart Contract: 0x547007CE...
  FastAPI (Railway)                               Pinata IPFS
```

---

## ✨ Features

- **📡 Real-Time IoT Hardware Telemetry** — ESP32 + DHT22, ADXL345, ACS712, Tachometer
- **🤖 AI Predictive Maintenance** — XGBoost RUL forecasting + Isolation Forest anomaly detection
- **🔗 Blockchain Verification** — Ethereum Sepolia smart contract anchoring for maintenance records & warranties
- **📊 Live Dashboard** — Socket.IO streaming, fleet health radar, waveform analytics
- **🔐 Multi-Tenant RBAC** — `super_admin`, `company_admin`, `maintenance_engineer`, `machine_operator`
- **🌐 Full Production Stack** — Vercel (frontend) + Railway (backend + AI) + MongoDB Atlas + HiveMQ

---

## 🚀 Deploying to Production

### Step 1 — Prerequisites (Free Tier Services)

Sign up for these free services before deploying:

| Service | Purpose | Free Tier |
|---|---|---|
| [MongoDB Atlas](https://cloud.mongodb.com) | Database | 512MB M0 cluster |
| [Cloudinary](https://cloudinary.com) | File/image storage | 25GB |
| [HiveMQ Cloud](https://www.hivemq.com/mqtt-cloud-broker/) | MQTT broker for ESP32 | 100 connections |
| [Pinata](https://pinata.cloud) | IPFS decentralized storage | 1GB |
| [Mailtrap](https://mailtrap.io) or [Resend](https://resend.com) | Email | Free |
| [Railway](https://railway.app) | Backend hosting | $5/mo Hobby |
| [Vercel](https://vercel.com) | Frontend hosting | Free |

---

### Step 2 — Deploy Backend on Railway

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select your forked `SentinelX` repository → set **Root Directory** to `backend`
3. Railway auto-detects the `railway.json` config and builds with `npm run build && npm start`
4. Go to **Variables** tab and add all variables from `backend/.env.example`:

   ```env
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/sentinelx
   JWT_ACCESS_SECRET=<generate: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">
   JWT_REFRESH_SECRET=<generate same way>
   PASSWORD_RESET_SECRET=<generate same way>
   CLIENT_URL=https://your-app.vercel.app
   CLOUDINARY_CLOUD_NAME=...
   CLOUDINARY_API_KEY=...
   CLOUDINARY_API_SECRET=...
   SMTP_HOST=...
   SMTP_PORT=...
   SMTP_USER=...
   SMTP_PASS=...
   MQTT_URL=mqtts://your-cluster.s1.eu.hivemq.cloud:8883
   MQTT_USERNAME=your_hivemq_username
   MQTT_PASSWORD=your_hivemq_password
   PYTHON_AI_SERVICE_URL=https://your-python-service.up.railway.app
   SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
   SEPOLIA_PRIVATE_KEY=0x...your_wallet_private_key...
   SEPOLIA_CONTRACT_ADDRESS=0x547007CE756b60A1547dC3D4f827BF9BB9fdeA76
   PINATA_API_KEY=...
   PINATA_SECRET_KEY=...
   PINATA_JWT=...
   ```

5. Go to **Settings** → **Networking** → **Generate Domain** → copy your Railway backend URL (e.g. `https://sentinelx-backend.up.railway.app`)

---

### Step 3 — Deploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project** → Import your GitHub repo
2. Set **Root Directory** to `frontend`
3. Add these **Environment Variables** in Vercel project settings:

   ```env
   NEXT_PUBLIC_API_URL=https://sentinelx-backend.up.railway.app/api/v1
   NEXT_PUBLIC_SOCKET_URL=https://sentinelx-backend.up.railway.app
   ```

4. Click **Deploy** — Vercel auto-builds and deploys on every `git push`

5. Copy your Vercel URL (e.g. `https://sentinelx.vercel.app`) and update `CLIENT_URL` in Railway backend variables

---

### Step 4 — Deploy Python AI Service on Railway (Optional)

1. In Railway → **New Service** (within same project) → **GitHub** → set **Root Directory** to `python-service`
2. Add environment variable: `PORT=8000`
3. Start command: `uvicorn main:app --host 0.0.0.0 --port 8000`
4. Copy its Railway URL and set `PYTHON_AI_SERVICE_URL` in the backend service

---

## 📡 ESP32 Hardware Setup

### Option A — USB Serial (Development Only)

Connect ESP32 via USB, then:

```bash
# Single device
node scripts/esp32_bridge.js

# Multiple devices — open separate terminal for each
node scripts/esp32_bridge.js --port COM5 --device PUMP-01 --url http://localhost:5000/api/v1/telemetry/ingest
node scripts/esp32_bridge.js --port COM8 --device MOTOR-02 --url http://localhost:5000/api/v1/telemetry/ingest
```

### Option B — WiFi + MQTT (Production / Real Users) ✅

Real users connect ESP32 over WiFi — **no laptop or USB cable required**.

**1. Set up HiveMQ Cloud broker** (free, 100 devices):
   - Sign up at [hivemq.com/mqtt-cloud-broker](https://www.hivemq.com/mqtt-cloud-broker/)
   - Create cluster → note your cluster URL, username, password
   - Add these to your backend Railway environment variables

**2. Configure `sensors.ino`** before uploading to each ESP32:

```cpp
// At top of sensors.ino:
#define ENABLE_WIFI_MQTT true       // Enable WiFi+MQTT mode

const char* WIFI_SSID     = "MyFactory_WiFi";
const char* WIFI_PASSWORD = "wifi_password_here";
const char* MQTT_BROKER   = "abc123.s1.eu.hivemq.cloud";
const char* MQTT_USER     = "hivemq_username";
const char* MQTT_PASS     = "hivemq_password";
const char* COMPANY_ID    = "your_company_id_from_dashboard";
const char* DEVICE_ID     = "ESP32-PUMP-01";   // Unique per machine
```

**3. Flash and Register:**
   - Upload `sensors.ino` to each ESP32 (Arduino IDE)
   - In SentinelX dashboard → **Machines** → **Add Machine** → set Device ID to match
   - ESP32 connects automatically and telemetry appears in real time

**Multiple ESP32 devices** each get a unique `DEVICE_ID`. They all publish to:
```
company/{COMPANY_ID}/device/{DEVICE_ID}
```
The backend subscribes to `company/+/device/+` and routes each device automatically.

See [`scripts/README.md`](scripts/README.md) for full details and troubleshooting.

---

## 💻 Local Development

### Prerequisites
- Node.js v18+
- Python 3.10+
- MongoDB Atlas URI (or local MongoDB)

### 1. Backend

```bash
cd backend
cp .env.example .env
# Fill in your .env values
npm install
npm run dev
# Runs on http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
# Set NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
npm install
npm run dev
# Runs on http://localhost:3000
```

### 3. Python AI Service (Optional)

```bash
cd python-service
pip install -r requirements.txt
python main.py
# Runs on http://localhost:8000
```

### 4. ESP32 Telemetry (Local Dev via USB)

```bash
node scripts/esp32_bridge.js
```

Or simulate without hardware:
```bash
cd backend && npx tsx src/utils/mqttTestPublisher.ts
```

---

## 🔗 Blockchain Setup

The smart contract is **already deployed** on Ethereum Sepolia testnet:
```
Contract Address: 0x547007CE756b60A1547dC3D4f827BF9BB9fdeA76
Network: Sepolia Testnet
Explorer: https://sepolia.etherscan.io/address/0x547007CE756b60A1547dC3D4f827BF9BB9fdeA76
```

You only need to redeploy if you want your own contract:
```bash
cd backend
npx tsx src/scripts/deploySepoliaContract.ts
# Then update SEPOLIA_CONTRACT_ADDRESS in your .env / Railway vars
```

Get free Sepolia ETH from [sepoliafaucet.com](https://sepoliafaucet.com).

---

## 🛡️ ESP32 Circuit Pinout

| Sensor | Module | ESP32 Pin | Measures |
|---|---|---|---|
| Temperature / Humidity | DHT22 | GPIO 4 | °C, %RH |
| 3-Axis Vibration | ADXL345 (I2C) | SDA=GPIO21, SCL=GPIO22 | Dynamic g-force |
| Motor Current | ACS712 30A | GPIO 35 (ADC) | Amperes (RMS) |
| Shaft Speed | Optical / Tachometer | GPIO 27 | RPM |
| Supply Voltage | Resistor Divider | GPIO 32 | Volts |
| Acoustic | Sound sensor (analog) | GPIO 34 | ADC raw |

---

## 🧰 Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15, TypeScript, Tailwind CSS, Recharts, Three.js, Socket.IO Client |
| **Backend** | Node.js, Express 5, TypeScript, Mongoose 8, Socket.IO, Winston, JWT |
| **AI Service** | Python 3.12, FastAPI, XGBoost, scikit-learn, Isolation Forest |
| **Hardware** | ESP32, Arduino C++, ADXL345, DHT22, ACS712, PubSubClient (MQTT) |
| **Database** | MongoDB Atlas |
| **MQTT** | HiveMQ Cloud (TLS 8883) |
| **Blockchain** | Ethereum Sepolia, ethers.js v6, Solidity, Pinata IPFS |
| **Hosting** | Vercel (frontend), Railway (backend + AI) |

---

## 🔐 Security Notes

- Never commit `.env` or `.env.local` files to Git
- Generate strong JWT secrets: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- Never expose your `SEPOLIA_PRIVATE_KEY` — it controls your Ethereum wallet
- Use environment variables only — never hardcode credentials

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.
