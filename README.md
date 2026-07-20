# SentinelX – AI-Powered Industrial Asset Intelligence Platform
> *Predict. Prevent. Prolong.*

SentinelX is an end-to-end, production-grade AI-powered Industrial Asset Intelligence and Predictive Maintenance Platform. It combines real-time IoT sensor data streaming, machine learning anomaly detection, recursive multi-step forecasting, and Remaining Safe Operating Time (RSOT) estimation to prevent industrial equipment failures before they happen.

---

## 🏗️ System Architecture

```
SentinelX/
├── backend/           Node.js + Express 5 + TypeScript + MongoDB + Socket.io
├── frontend/          Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui
└── python-service/    Python 3.12 + FastAPI + XGBoost + Isolation Forest + scikit-learn
```

```
[ ESP32 / IoT Sensors ] ──> [ Socket.io / REST API ] ──> [ Express Backend ] ──> [ MongoDB Atlas ]
                                                                 │
                                                                 ▼
[ Next.js 15 Frontend ] <── [ Real-Time Telemetry & AI ] <── [ Python AI Microservice ]
```

---

## ✨ Key Features

- **🔐 Multi-Tenant Auth & RBAC**: JWT Access/Refresh tokens with rotation, role-based authorization (`super_admin`, `company_admin`, `maintenance_engineer`, `machine_operator`), SMTP password reset flow.
- **🏭 Machine Registry & Asset Management**: Comprehensive machine specs (30+ fields covering electrical, mechanical, plant/location metadata) with Cloudinary image uploads.
- **📡 IoT Device & Sensor Management**: ESP32 device registration, strict 1-device-per-machine assignment enforcement, and 6 standard auto-provisioned sensors per microcontroller:
  1. **Temperature** (DS18B20 - °C)
  2. **Vibration** (MPU6050 - m/s²)
  3. **Current** (ACS712 - A)
  4. **Voltage** (V)
  5. **RPM** (RPM)
  6. **Sound** (MAX4466 - dB)
- **⚡ Real-Time Telemetry Streaming**: WebSockets via Socket.io for live sensor data visualization, gauge metrics, and alert triggers.
- **🤖 Python AI & Machine Learning Engine**:
  - **Per-Machine XGBoost Models**: Independent multi-output regressors trained on machine historical telemetry.
  - **Isolation Forest**: Multi-dimensional anomaly scoring and outlier detection.
  - **100-Step Recursive Forecasting**: Predicts future sensor trajectories up to 100 time steps ahead.
  - **RSOT (Remaining Safe Operating Time) Estimator**: Calculates exact time-to-threshold breach for operating boundaries.

---

## ⚡ Quick Start

### Prerequisites
- **Node.js** ≥ 18
- **Python** ≥ 3.10
- **MongoDB** (Local `mongodb://localhost:27017` or MongoDB Atlas URI)

---

### 1. Python AI Service Setup

```bash
cd python-service
python -m pip install -r requirements.txt
python main.py        
```

---

### 2. Backend Setup

```bash
cd backend
cp .env.example .env      
npm install
npm run dev               
```

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev              
```

---

### 4. Access the Application
Navigate to **http://localhost:3000** in your browser, register a company, add your industrial machines and ESP32 devices, and access real-time AI telemetry insights!

---

## 🛡️ Role-Based Access Control (RBAC)

| Role | Permissions |
|---|---|
| `super_admin` | Full platform control & cross-company management |
| `company_admin` | Full company asset, user, device, & machine management |
| `maintenance_engineer` | Create, update, configure machines, devices, & sensor thresholds |
| `machine_operator` | Read-only access to dashboard, live telemetry, and machine status |

---

## 📡 API Reference Summary

### Authentication (`/api/v1/auth`)
- `POST /register` — Register company & admin user
- `POST /login` — Authenticate & receive access token
- `POST /refresh` — Rotate refresh token
- `POST /logout` — Invalidate session
- `POST /forgot-password` — Request SMTP password reset email
- `POST /reset-password` — Reset password via token

### Machines (`/api/v1/machines`)
- `GET /` — List machines (with search, status filter, plant/department filters, pagination)
- `POST /` — Register new machine
- `GET /:id` — Get machine details & assigned IoT device
- `PUT /:id` — Update machine specifications
- `DELETE /:id` — Delete machine
- `POST /:id/image` — Upload machine image to Cloudinary
- `POST /:id/device` — Assign ESP32 device to machine
- `DELETE /:id/device` — Remove ESP32 device from machine

### IoT Devices & Sensors (`/api/v1/devices`, `/api/v1/sensors`)
- `GET /devices` — List registered devices & status
- `POST /devices` — Register device (auto-provisions 6 sensors)
- `GET /devices/:id` — Get device details & 6 connected sensors
- `PUT /sensors/:id` — Update sensor sampling interval & alert thresholds

---

## 🧰 Tech Stack

**Frontend**
- Next.js 15 (App Router) + TypeScript
- Tailwind CSS v4
- shadcn/ui components
- Zustand (State Management)
- React Hook Form + Zod validation
- Socket.io Client (Real-time WebSockets)
- Axios (HTTP client with auto-refresh interceptors)

**Backend**
- Node.js + Express 5 + TypeScript
- MongoDB Atlas / Mongoose 8
- Socket.io (Real-time telemetry gateway)
- JWT Authentication (Access + Refresh token rotation)
- Cloudinary Storage (Image management)
- Nodemailer SMTP (Email service)

**Python AI Service**
- FastAPI + Uvicorn
- XGBoost Regressors
- scikit-learn (Isolation Forest Anomaly Detection)
- pandas + numpy
- pydantic v2

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
