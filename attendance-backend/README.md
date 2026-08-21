# Attendance System — Backend

Real-Time, AI-Driven Face Detection and Recognition-Based Employee Authentication and Attendance Logging System (with productivity estimation).

## Architecture

Five independent FastAPI microservices sharing a single Supabase (PostgreSQL) database, one schema per service.

| Service | Port | Schema | Responsibility |
|---|---|---|---|
| auth_service | 8001 | auth_service | Employee registration, identity, JWT issuance |
| attendance_service | 8002 | attendance_service | Check-in / check-out logging |
| analytics_service | 8003 | analytics_service | Productivity & engagement estimation |
| device_service | 8004 | device_service | Camera/sensor registration & heartbeat |
| audit_service | 8005 | audit_service | Append-only audit trail |

## Project Structure

```
attendance-backend/
├── shared/                   # Shared utilities imported by all services
│   ├── config/               # Pydantic settings (reads .env)
│   ├── db/                   # Supabase client singleton
│   ├── middleware/           # JWT auth guard, request logger
│   └── utils/                # JWT helpers, response formatters
│
├── auth_service/
│   ├── models/               # Pydantic request/response schemas
│   ├── services/             # Database logic (talks to Supabase)
│   ├── controllers/          # Orchestration & response formatting
│   ├── routes/               # FastAPI route definitions
│   └── main.py               # Service entrypoint
│
├── attendance_service/       # Same MVC structure
├── analytics_service/        # Same MVC structure
├── device_service/           # Same MVC structure
├── audit_service/            # Same MVC structure
│
├── requirements.txt
├── Dockerfile                # Single image; command overridden per service
├── docker-compose.yml        # Run all 5 services locally
├── render.yaml               # Render Blueprint for deployment
└── .env.example              # Copy to .env and fill in values
```

## MVC Pattern

- **Model** — Pydantic schemas in `models/`. Define what the API accepts and returns.
- **Service** — Database logic in `services/`. All Supabase queries live here.
- **Controller** — Orchestration in `controllers/`. Calls services, formats responses.
- **Route** — FastAPI endpoints in `routes/`. Validates input, calls controllers.

## Quick Start (local)

### Prerequisites
- Python 3.11+
- A Supabase project with the database schema already created (see database setup guide)

### 1. Clone and set up environment

```bash
git clone <your-repo-url>
cd attendance-backend

cp .env.example .env
# Edit .env and fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET
# Also set SUPABASE_DB_URL to the Supabase PostgreSQL connection string so
# Docker can apply idempotent migrations before the analytics service starts.
```

### 2. Install dependencies

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Run a single service

```bash
# From the project root — PYTHONPATH must include the root
PYTHONPATH=. uvicorn auth_service.main:app --reload --port 8001
```

### 4. Run all services with Docker Compose

```bash
docker-compose up --build
```

All five services start on ports 8001–8005.

## API Documentation

Once running, visit the auto-generated docs for each service:

| Service | Swagger UI | ReDoc |
|---|---|---|
| auth_service | http://localhost:8001/docs | http://localhost:8001/redoc |
| attendance_service | http://localhost:8002/docs | http://localhost:8002/redoc |
| analytics_service | http://localhost:8003/docs | http://localhost:8003/redoc |
| device_service | http://localhost:8004/docs | http://localhost:8004/redoc |
| audit_service | http://localhost:8005/docs | http://localhost:8005/redoc |

## Authentication

Protected endpoints require a `Bearer` token in the `Authorization` header.

**Get a token:**
```
POST /api/v1/employees/{employee_id}/token
```

**Use the token:**
```
Authorization: Bearer <token>
```

Tokens are JWTs signed with `JWT_SECRET`. They embed the employee's ID, role, and department.

## Key Endpoints

### auth_service
| Method | Path | Description |
|---|---|---|
| POST | /api/v1/employees/ | Register employee |
| POST | /api/v1/employees/{id}/token | Issue JWT |
| GET | /api/v1/employees/ | List all employees |
| PATCH | /api/v1/employees/{id}/consent | Update biometric consent |
| PATCH | /api/v1/employees/{id}/face-embedding | Store embedding path |

### attendance_service
| Method | Path | Description |
|---|---|---|
| POST | /api/v1/attendance/ | Log check-in or check-out |
| GET | /api/v1/attendance/ | List logs (filter by employee) |
| GET | /api/v1/attendance/summary/{employee_id} | Attendance summary |
| GET | /api/v1/attendance/device/{device_id} | Logs by device |

### analytics_service
| Method | Path | Description |
|---|---|---|
| POST | /api/v1/analytics/ | Record productivity observation |
| GET | /api/v1/analytics/ | List records |
| GET | /api/v1/analytics/aggregation/{employee_id} | Aggregated stats |

### device_service
| Method | Path | Description |
|---|---|---|
| POST | /api/v1/devices/ | Register device |
| POST | /api/v1/devices/heartbeat/{device_id} | Record device heartbeat |
| GET | /api/v1/devices/ | List devices |
| PATCH | /api/v1/devices/{id} | Update device status |

### audit_service
| Method | Path | Description |
|---|---|---|
| POST | /api/v1/audit/ | Write audit log |
| GET | /api/v1/audit/ | List audit logs |
| GET | /api/v1/audit/{audit_id} | Get single log |

## Health Checks

Every service exposes `GET /health` — used by Render for uptime monitoring.

## Environment Variables

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (backend only — never expose publicly) |
| `SUPABASE_DB_URL` | Supabase PostgreSQL connection string used by the automatic migration runner |
| `JWT_SECRET` | Long random string for signing JWTs |
| `JWT_ALGORITHM` | Default: `HS256` |
| `JWT_EXPIRE_MINUTES` | Token lifetime in minutes. Default: `60` |
| `ENVIRONMENT` | `development` or `production` |
| `LOG_LEVEL` | `info`, `debug`, `warning` |
