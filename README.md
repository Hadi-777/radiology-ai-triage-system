# Radiology Triage Platform

A university-level full-stack AI-assisted radiology triage web application.

> **Important:** This is a **decision-support tool**, not a diagnostic system.
> All final decisions are made by the radiologist.

---

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | Next.js 14 (App Router)           |
| Backend    | NestJS + TypeORM                  |
| AI Service | FastAPI + PyTorch ResNet50        |
| Heatmap    | Grad-CAM                          |
| Database   | PostgreSQL 16                     |
| DevOps     | Docker + docker-compose           |

---

## Project Structure

```
radiology-triage/
├── apps/
│   ├── frontend/       # Next.js (Phase 4)
│   ├── backend/        # NestJS (Phase 2–3)
│   └── ai-service/     # FastAPI (Phase 2)
├── database/
│   └── init.sql        # Schema — runs on first DB boot
├── docker-compose.yml
├── .env.example        # Copy to .env and fill in values
└── .gitignore
```

---

## Phase 1 Setup — PostgreSQL Only

### 1. Copy environment files

```bash
# Root env (used by docker-compose)
cp .env.example .env

# Backend env (used by NestJS)
cp apps/backend/.env.example apps/backend/.env
```

Edit both `.env` files and set a strong `POSTGRES_PASSWORD`.

### 2. Start the database

```bash
docker-compose up -d db
```

### 3. Verify it's running

```bash
# Check container status
docker-compose ps

# Check logs
docker-compose logs db

# Connect with psql (if installed locally)
psql -h localhost -p 5432 -U radiology_user -d radiology_db
```

### 4. Verify the schema

```bash
# Inside psql:
\dt                    # list all tables
SELECT * FROM studies; # should show 1 test row
```

### 5. Stop the database

```bash
docker-compose down          # stop containers, keep data
docker-compose down -v       # stop containers AND delete all data
```

---

## Development Phases

| Phase | What gets built                              | Status  |
|-------|----------------------------------------------|---------|
| 1     | Monorepo structure + PostgreSQL schema        | ✅ Done  |
| 2     | FastAPI AI service (ResNet50 + Grad-CAM)      | Pending |
| 3     | NestJS backend + API + DB integration         | Pending |
| 4     | Next.js frontend (upload, results, heatmap)   | Pending |
| 5     | Reports & feedback workflow                   | Pending |
| 6     | Auth + disclaimer banners + polish            | Pending |

---

## Priority Rules (implemented in Phase 2)

| Priority     | Condition                                      |
|--------------|------------------------------------------------|
| High         | abnormal AND confidence ≥ 0.85                 |
| Medium       | abnormal AND confidence ≥ 0.65 AND < 0.85      |
| Low          | normal AND confidence ≥ 0.85                   |
| Needs Review | confidence < 0.65                              |

---

## Disclaimer

AI findings use hedged language only: *"possible"*, *"may suggest"*,
*"suspicious finding"*, *"requires radiologist confirmation"*.
The system never produces definitive diagnoses.
