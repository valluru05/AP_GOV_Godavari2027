# CivicProof Production Deployment Guide

## Overview
CivicProof is structured as a cloud-native or on-premise modular monolith designed for high availability, security hardening, and resilient performance during major public-sector events.

---

## 1. Containerized Deployment via Docker Compose

### Prerequisites
- Docker Engine 24+
- Docker Compose v2+

### One-Command Startup
```bash
# Clone repository
git clone https://github.com/valluru05/AP_GOV_Godavari2027.git
cd AP_GOV_Godavari2027

# Copy environment variables
cp .env.example .env

# Build and launch all services in background
docker compose up -d --build
```

### Container Endpoints:
- **Frontend SPA (Nginx):** `http://localhost:80`
- **FastAPI Backend:** `http://localhost:8008`
- **Swagger Documentation:** `http://localhost:8008/docs`
- **Health Check:** `http://localhost:8008/health`

---

## 2. Production Security Hardening Checklist

1. **Secret Keys:** Replace default `SECRET_KEY` in `.env` with a 256-bit high-entropy secret:
   ```bash
   openssl rand -hex 32
   ```
2. **TLS / HTTPS Enforcement:** Ensure Nginx or external reverse proxy (Cloudflare, AWS ALB) terminates SSL with TLS 1.3 and HSTS headers.
3. **Database Migration to PostgreSQL:**
   Update `DATABASE_URL` in `.env`:
   ```bash
   DATABASE_URL="postgresql+psycopg://civic_user:civic_password@postgres-db:5432/civicproof_db"
   ```
4. **Volume Persistence:** Mount `/app/data` to a persistent, snapshot-enabled volume with regular automated backups.
5. **CORS Whitelist:** Set explicit allowed origins in `backend/app/core/config.py` rather than wildcard `*`.
6. **Audit Ledger Protection:** Section 19 invariant guarantees that statutory audit entries cannot be purged via API.

---

## 3. Maintenance & Sandbox Reseed Operations

### Seeding Clean Synthetic Pilot Data:
```bash
docker compose exec backend python scripts/seed_demo_data.py
```

### Running Automated Test Suite:
```bash
docker compose exec backend pytest backend/tests -v
```
