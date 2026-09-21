# RAKSHA

RAKSHA is an AI-powered disaster response and resource coordination network. It is designed to take field reports, verify them, prioritize by severity and need, match available resources, assign responders, track progress in real time, escalate when a case stalls or worsens, and close the loop when the response is resolved.

## Core workflow

**REPORT → VERIFY → PRIORITIZE → MATCH → ASSIGN → TRACK → ESCALATE → RESOLVE**

## Current technology stack

| Layer | Technology |
| --- | --- |
| Frontend | React + Vite + TypeScript (PWA) |
| UI | Tailwind CSS + shadcn/ui |
| Client data | TanStack Query |
| API | Node.js + Express + TypeScript |
| ORM / database | Prisma + PostgreSQL |
| Cache | Redis |
| Real-time | Socket.IO |
| AI service | Python + FastAPI |
| Maps (later) | Leaflet + OpenStreetMap |
| Containers | Docker |
| Version control | Git + GitHub |

## Planned service architecture

```
React PWA
  → Node/Express API
    → PostgreSQL / Prisma
    → Redis
    → Python/FastAPI AI service
  → Leaflet / OpenStreetMap
```

Local infrastructure in this repo currently includes PostgreSQL 16 and Redis 7 via Docker Compose. The API, AI service, and application Dockerfiles are not part of this change set.

## Phase 1 scope

Phase 1 is **project foundation and architecture only**.

In scope:

- Repository layout and documentation
- Git at the monorepo root
- Environment placeholders
- Local PostgreSQL and Redis via Docker Compose

Out of scope for Phase 1 (not implemented yet):

- Authentication
- AI agents / LLM workflows
- Disaster report, verification, matching, or assignment features
- Maps
- Advanced UI

## Local development prerequisites

- Git
- Node.js (LTS) and npm
- Python 3.11+ (for the future AI service)
- Docker Desktop (or equivalent) with Docker Compose
- A copied `.env` file based on `.env.example` (set `POSTGRES_PASSWORD` before starting the database)

### Start local infrastructure

```bash
cp .env.example .env
# Edit .env and set POSTGRES_PASSWORD

docker compose up -d
docker compose ps
```

PostgreSQL is exposed on `localhost:5432` (database `raksha`, user `raksha`). Redis is exposed on `localhost:6379`.

The existing Vite client lives in `client/` and remains unchanged. The Express API currently includes authentication, emergency requests, resource management, responder profiles, skills, vehicles, availability, verification, rule-based candidate discovery, and responder assignment lifecycle APIs.

## Phase 5 responder management

Responder operations are exposed under `/api/responders`, `/api/responder-skills`, `/api/emergency-requests/:emergencyRequestId/responders`, `/api/emergency-requests/:emergencyRequestId/responder-candidates`, and `/api/responder-assignments`.

Assignments follow `ASSIGNED -> ACCEPTED -> IN_PROGRESS -> COMPLETED`, with cancellation preserving assignment history. Coordinators and admins assign, verify, and manage operational data; volunteers and responders manage their own profile data and assigned work; citizens cannot perform responder operations.
