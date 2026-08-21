# 🚀 Complete System Runbook: Running Emprod with Face Entrance Device

This guide provides exact step-by-step instructions to run the entire Emprod system including the face entrance device with real-time visualizations.

---

## 📋 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    EMPROD SYSTEM FLOW                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Face Entrance Device              Backend Services         │
│  ───────────────────              ────────────────          │
│  face_ver.py ─(shared memory)──→  attendance_service        │
│     ↓         (Anyomi store)       (Port 8002)              │
│  [VISUALIZATION]                                            │
│     ↑                              auth_service             │
│  face_bridge.py ──(HTTP POST)──→  (Port 8001)              │
│     ↑                              device_service           │
│     └─────────────────────────────  (Port 8004)            │
│                                    analytics_service        │
│                          Frontend   (Port 8003)            │
│                          ────────────────────              │
│                          React + Vite                      │
│                          (Port 5173)                       │
│                          [VIEW DASHBOARDS]                 │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Prerequisites

- **Python**: 3.11 or higher
- **Node.js**: 18 or higher
- **Supabase Project**: Already configured with database schema
- **Camera/IP Camera**: Configured (local webcam or IP camera like `http://10.107.132.142:8080/video`)
- **Docker** (Optional): For running backend services in containers

---

## 🔧 Step 1: Backend Setup

### 1.1 Configure Environment Variables

**File**: `attendance-backend/.env`

```bash
# Supabase Configuration (Already configured)
SUPABASE_URL=https://nhqwrfrkfgwbmpvwrsup.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ocXdyZnJrZmd3Ym1wdndyc3VwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODUwMzMxMSwiZXhwIjoyMDk0MDc5MzExfQ.aEB4QnjgudX86zG-_h4ISit7vW3YADmAnnoooowyINQ

# JWT Configuration
JWT_SECRET=257f31507abe2bd9abc7400b3dc023bafc8649eb2ef21a76fa763eda96614ec2
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60

# Application
ENVIRONMENT=development
LOG_LEVEL=info

# Service Ports
AUTH_SERVICE_PORT=8001
ATTENDANCE_SERVICE_PORT=8002
ANALYTICS_SERVICE_PORT=8003
DEVICE_SERVICE_PORT=8004
AUDIT_SERVICE_PORT=8005
```

### 1.2 Install Python Dependencies (Backend)

```bash
cd attendance-backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # On Windows
# source venv/bin/activate  # On macOS/Linux

# Install dependencies
pip install -r requirements.txt
```

### 1.3 Run All Backend Services (Choose One Method)

#### **Method A: Docker Compose (Recommended)**

```bash
cd attendance-backend

# Build and start all 5 services in containers
docker-compose up --build

# Expected output:
# auth_service       ✓ http://localhost:8001/docs
# attendance_service ✓ http://localhost:8002/docs
# analytics_service  ✓ http://localhost:8003/docs
# device_service     ✓ http://localhost:8004/docs
# audit_service      ✓ http://localhost:8005/docs
```

#### **Method B: Run Services Individually (Without Docker)**

Open **5 terminal windows** and run (one command per terminal):

**Terminal 1 - Auth Service**:
```bash
cd attendance-backend
PYTHONPATH=. uvicorn auth_service.main:app --reload --port 8001
```

**Terminal 2 - Attendance Service**:
```bash
cd attendance-backend
PYTHONPATH=. uvicorn attendance_service.main:app --reload --port 8002
```

**Terminal 3 - Analytics Service**:
```bash
cd attendance-backend
PYTHONPATH=. uvicorn analytics_service.main:app --reload --port 8003
```

**Terminal 4 - Device Service**:
```bash
cd attendance-backend
PYTHONPATH=. uvicorn device_service.main:app --reload --port 8004
```

**Terminal 5 - Audit Service**:
```bash
cd attendance-backend
PYTHONPATH=. uvicorn audit_service.main:app --reload --port 8005
```

✅ **Verify all services are running:**
- Visit http://localhost:8001/health (should return `{"service":"auth_service","status":"ok"}`)
- Repeat for ports 8002-8005

---

## 🎥 Step 2: Face Entrance Device Setup

### 2.1 Configure Face Bridge

**File**: `models/face-entance/bridge_config.json`

```json
{
  "device_id": "829dc9ac-a330-4ae6-a219-7e9d939bf26d",
  "attendance_url": "http://localhost:8002"
}
```

- **device_id**: UUID for this camera device (register in device_service first)
- **attendance_url**: Must point to attendance_service (default: `http://localhost:8002`)

### 2.2 Configure Face Recognition Model

**File**: `models/face-entance/face_ver.py`

Update the camera source (around line 66):

```python
# IP camera URL (edit here)
ip_url = "http://10.107.132.142:8080/video"  # Change to your camera URL or device index
```

**Options:**
- **Local Webcam**: `0` (default)
- **IP Camera (Android)**: `http://192.168.x.x:8080/video`
- **IP Camera (Other)**: Your camera's RTSP/HTTP URL

### 2.3 Install Face Device Dependencies

```bash
cd models/face-entance

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # On Windows
# source venv/bin/activate  # On macOS/Linux

# Install dependencies
pip install -r requirements.txt
```

### 2.4 Register Device in Backend

The device must be registered in the `device_service` database before running the face bridge.

**Using the API** (via Postman or curl):

```bash
curl -X POST http://localhost:8004/api/v1/devices/ \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "829dc9ac-a330-4ae6-a219-7e9d939bf26d",
    "device_name": "Face Entrance - Main Door",
    "device_type": "face_camera",
    "location": "Entrance",
    "status": "active"
  }'
```

**Or via the Dashboard** (once frontend is running):
- Navigate to `/devices` on the frontend
- Click "Register Device"
- Enter device details matching `bridge_config.json`

---

## 🖥️ Step 3: Frontend Setup

### 3.1 Configure Frontend Environment Variables

**File**: `emprod-frontend/.env`

```bash
# Backend Service URLs
VITE_AUTH_SERVICE_URL=http://localhost:8001
VITE_ATTENDANCE_SERVICE_URL=http://localhost:8002
VITE_ANALYTICS_SERVICE_URL=http://localhost:8003
VITE_DEVICE_SERVICE_URL=http://localhost:8004
VITE_AUDIT_SERVICE_URL=http://localhost:8005
```

### 3.2 Install Frontend Dependencies

```bash
cd emprod-frontend

npm install
```

### 3.3 Start Frontend Development Server

```bash
npm run dev
```

Expected output:
```
  VITE v6.4.2  ready in 234 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

---

## ▶️ Step 4: Start Face Entrance Device (Final Step!)

### 4.1 Run Face Detection & Visualization

**Terminal 6 - Face Recognition Engine** (in `models/face-entance/`):

```bash
cd models/face-entance
python face_ver.py
```

Expected output:
```
Loading MediaPipe Pose Landmarker from task file
Loading YOLO model...
Starting camera feed from: http://10.107.132.142:8080/video
```

**A window will pop up showing LIVE video with face detections and pose estimations.**

### 4.2 Run Face Bridge (In parallel)

**Terminal 7 - Face Bridge** (in `models/face-entance/`):

```bash
cd models/face-entance
python face_bridge.py
```

Expected output:
```
[FACE-BRIDGE] Face Bridge (entrance) starting…
[FACE-BRIDGE] Loaded name_employee_map.json: 5 entries
[FACE-BRIDGE] Polling every 3s | attendance_service=http://localhost:8002 | device_id=829dc9ac-a330...
[FACE-BRIDGE] New verification window: Sena (score 0.9524)
[FACE-BRIDGE] ✓ Attendance check_in → [employee_uuid]
```

---

## 📊 Step 5: View System in Action

### 5.1 Access Frontend Dashboard

Open your browser and navigate to:

```
http://localhost:5173
```

**Login Credentials:**
- Employee ID: `[Employee UUID from database]`
- (Your employee record must have role "HR" or "Admin")

### 5.2 Navigate to Key Pages

| Page | Route | What You'll See |
|------|-------|-----------------|
| **Overview Dashboard** | `/` | Live device status, attendance counts, top employees |
| **Live Attendance Feed** | `/attendance` | Real-time check-in/check-out events from face device |
| **Productivity Analytics** | `/productivity` | Engagement metrics, pose analysis from face device |
| **Device Management** | `/devices` | Face camera status, heartbeat, last seen |
| **Employees** | `/employees` | Employee list with face recognition status |
| **Audit Trail** | `/audit` | Complete attendance event history |

### 5.3 Watch Real-Time Updates

When someone enters the face detection zone:
1. **face_ver.py window**: Shows real-time face + pose visualization
2. **Console output**: `[FACE-BRIDGE] New verification window: [Name] (score X.XXXX)`
3. **Frontend Dashboard**: Attendance feed updates in real-time
4. **Device Service**: Shows heartbeat and last activity timestamp

---

## 📝 Complete Terminal Layout (Recommended Setup)

For optimal workflow, arrange terminals like this:

```
┌──────────────────────────────────────────────────────────────┐
│ Terminal 1: Auth Service (8001)  │ Terminal 2: Attendance (8002) │
├──────────────────────────────────────────────────────────────┤
│ Terminal 3: Analytics (8003)     │ Terminal 4: Device (8004)     │
├──────────────────────────────────────────────────────────────┤
│ Terminal 5: Audit (8005)         │ Terminal 6: Face Verify       │
├──────────────────────────────────────────────────────────────┤
│ Terminal 7: Face Bridge          │ Browser: Frontend Dashboard   │
└──────────────────────────────────────────────────────────────┘
```

Or **use Docker Compose for backend** + individual terminals for face device:

```
┌──────────────────────────────────────────────────────────────┐
│ Terminal 1: Docker Compose (All services)                     │
├──────────────────────────────────────────────────────────────┤
│ Terminal 2: Face Verification (face_ver.py)                   │
├──────────────────────────────────────────────────────────────┤
│ Terminal 3: Face Bridge (face_bridge.py)                      │
├──────────────────────────────────────────────────────────────┤
│ Browser: Frontend Dashboard (npm run dev from different dir)  │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔍 Troubleshooting

### Backend Services Won't Start

**Problem**: Port already in use
```bash
# Find and kill process using port 8001 (repeat for other ports)
netstat -ano | findstr :8001
taskkill /PID [PID] /F
```

**Problem**: SUPABASE_URL not configured
```bash
# Verify .env file exists and has correct values
type attendance-backend\.env
```

### Face Verification Window Not Opening

**Problem**: Camera not found
```python
# In models/face-entance/face_ver.py, line 66:
ip_url = 0  # Try local webcam first
```

**Problem**: Model files missing
```bash
# Check required files exist:
cd models/face-entance
ls face_detection_model.keras
ls pose_landmarker_full.task
ls yolov8m.pt
```

### Face Bridge Not Sending Data

**Problem**: name_employee_map.json missing
```bash
# Run bootstrap script to generate mapping
cd models/face-entance
python bootstrap_face_bridge.py
```

**Problem**: attendance_service not reachable
```bash
# Verify service is running
curl http://localhost:8002/health
```

### Frontend Not Updating

**Problem**: Backend URLs incorrect in .env
```bash
# Update emprod-frontend/.env
VITE_ATTENDANCE_SERVICE_URL=http://localhost:8002
```

**Problem**: CORS issues
- Ensure backend services have CORS enabled (already configured in code)
- Hard refresh frontend: Ctrl+Shift+R

---

## ✨ Key Endpoints to Verify

Once everything is running, test these endpoints:

```bash
# Services Health Check
curl http://localhost:8001/health
curl http://localhost:8002/health
curl http://localhost:8003/health
curl http://localhost:8004/health
curl http://localhost:8005/health

# Create Test Attendance Event (simulate face detection)
curl -X POST http://localhost:8002/api/v1/attendance/ \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "[UUID]",
    "entry_type": "check_in",
    "device_id": "829dc9ac-a330-4ae6-a219-7e9d939bf26d"
  }'

# List Devices
curl http://localhost:8004/api/v1/devices/

# Get Attendance Records
curl http://localhost:8002/api/v1/attendance/
```

---

## 🎯 Quick Start Command Cheat Sheet

```bash
# Terminal 1: Start Backend (Docker)
cd attendance-backend && docker-compose up --build

# Terminal 2: Start Face Verification
cd models/face-entance && python face_ver.py

# Terminal 3: Start Face Bridge
cd models/face-entance && python face_bridge.py

# Terminal 4: Start Frontend (new PowerShell window)
cd emprod-frontend && npm run dev
```

Then open: **http://localhost:5173**

---

## 📚 Additional Resources

- Backend Swagger Docs: http://localhost:8001/docs (each service)
- Frontend Source: `emprod-frontend/src/`
- Face Detection Logic: `models/face-entance/face_ver.py`
- Database Schema: `attendance-backend/migrations/`

---

## ✅ Success Indicators

When everything is running correctly, you should see:

- ✅ All 5 backend services green in Docker or individual terminals
- ✅ Face verification window showing live video feed with landmarks
- ✅ Face bridge logging "New verification window" messages
- ✅ Frontend dashboard loading without errors
- ✅ Attendance feed updating in real-time when faces are detected
- ✅ Device status showing "online" in `/devices` page
- ✅ Analytics dashboard showing engagement metrics

---

**🎉 Congratulations! Your Emprod system is now running with live face entrance detection and real-time visualizations!**
