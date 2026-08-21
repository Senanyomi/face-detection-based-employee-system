# Emprod Frontend

**Employee Productivity Analysis System** — HR Admin Dashboard.

Built with React + Vite + Tailwind CSS. Connects to 5 FastAPI microservices.

## Pages

| Route | Page | Backend Service |
|---|---|---|
| `/login` | HR Admin login | auth_service |
| `/` | Overview dashboard | auth + attendance + device |
| `/attendance` | Live attendance feed | attendance_service |
| `/employees` | Employee management | auth_service |
| `/productivity` | Productivity analytics | analytics_service |
| `/reports` | Attendance reports + CSV export | attendance_service |
| `/devices` | Device management | device_service |
| `/audit` | Audit log trail | audit_service |

## Local Setup

```bash
# 1. Install dependencies
npm install

# 2. Create .env (copy from example and fill in your backend URLs)
cp .env.example .env

# 3. Run dev server
npm run dev
```

Open http://localhost:5173

## Environment Variables

All must be prefixed with `VITE_` to be accessible in the browser:

| Variable | Description |
|---|---|
| `VITE_AUTH_SERVICE_URL` | URL of auth_service (e.g. http://localhost:8001) |
| `VITE_ATTENDANCE_SERVICE_URL` | URL of attendance_service |
| `VITE_ANALYTICS_SERVICE_URL` | URL of analytics_service |
| `VITE_DEVICE_SERVICE_URL` | URL of device_service |
| `VITE_AUDIT_SERVICE_URL` | URL of audit_service |

In development these default to localhost:8001-8005 if not set.
In production (Vercel), set them in the Vercel dashboard under Environment Variables.

## Login

Enter your **Employee ID** (the UUID from the database). Your employee record must have a `role` that includes "HR" or "Admin". The system issues a JWT and stores it in localStorage.

## Build for Production

```bash
npm run build
```

The `dist/` folder is ready to deploy to Vercel.
