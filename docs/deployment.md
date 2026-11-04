# CivicProof: Real-World Production Deployment & Hardening Guide
### Government of Andhra Pradesh — Godavari Pushkaralu 2027

This operational guide details the real-world deployment topologies, security hardening standards, database clustering, high-resolution evidence pipeline, and monitoring infrastructure required to deploy CivicProof at enterprise scale for public-sector civil infrastructure projects.

---

## 1. Deployment Topologies

CivicProof supports two primary production deployment architectures:

### Topology A: Containerized Cloud / On-Premise (Docker Compose + PostgreSQL)
Ideal for municipal command centers, state datacenter VMs, AWS EC2, or GCP Compute Engine instances.

```
                      [ HTTPS Client Traffic ]
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │ Nginx Reverse Proxy   │ (Port 80 / 443)
                     │ - TLS 1.3 & HSTS      │
                     │ - 35MB Evidence Limit │
                     │ - Gzip Compression    │
                     │ - SPA Routing & PWA   │
                     └───────────┬───────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 │                               │
                 ▼                               ▼
       ┌──────────────────┐            ┌──────────────────┐
       │ CivicProof SPA   │            │ FastAPI Backend  │ (Port 8008)
       │ Pre-built HTML/  │            │ - 4 Uvicorn      │
       │ JS Chunks (PWA)  │            │   Workers        │
       └──────────────────┘            │ - Sliding Rate   │
                                       │   Limiter        │
                                       │ - Security Audit │
                                       └─────────┬────────┘
                                                 │
                               ┌─────────────────┴─────────────────┐
                               │                                   │
                               ▼                                   ▼
                     ┌──────────────────┐                ┌──────────────────┐
                     │ PostgreSQL 16 DB │                │ Encrypted Volume │
                     │ Connection Pool  │                │ Evidence Vault   │
                     │ (Port 5432)      │                │ (/app/data)      │
                     └──────────────────┘                └──────────────────┘
```

#### Launching Topology A:
```bash
# 1. Clone repository
git clone https://github.com/valluru05/AP_GOV_Godavari2027.git
cd AP_GOV_Godavari2027

# 2. Configure production secrets in .env
cp .env.example .env

# Generate a cryptographically strong 256-bit secret key:
openssl rand -hex 32
# Update SECRET_KEY in .env with the generated output

# 3. Start all services (PostgreSQL 16, FastAPI Multi-Worker, Nginx)
docker compose up -d --build

# 4. Verify system health and database readiness
curl -f http://localhost/health
```

### Topology B: High-Availability Kubernetes (State Datacenter / Cloud)
- **Ingress Controller:** Nginx Ingress or AWS ALB with TLS 1.3 termination, automatic Let's Encrypt certificates, and 35MB client max body size.
- **Backend Deployment:** Scaled across 3+ replicas with `minReadySeconds: 5`, configured with `/health/liveness` and `/health/readiness` probes.
- **Managed Database:** AWS RDS PostgreSQL Multi-AZ or State Cloud PostgreSQL with automated daily WAL snapshots.
- **Persistent Volume Claim:** High-performance SSD volume for the tamper-evident evidence vault (`/app/data/storage`).

---

## 2. Production Security & Hardening Matrix

| Security Layer | Implementation & Mechanism | Production Configuration |
| :--- | :--- | :--- |
| **Password Hashing** | Argon2id (`time_cost=2`, `memory_cost=64MB`, `parallelism=2`) | Resistant to GPU/ASIC brute-force attacks. |
| **Token Authentication** | HS256-signed JWT with 24-hour expiration | Secret key loaded strictly from environment variable; default key disallowed in production. |
| **Cookie Security** | `HttpOnly`, `SameSite=Lax`, `Secure=True` | Mitigates XSS token extraction; cookies transmitted only over encrypted HTTPS. |
| **Rate Limiting** | Sliding-window memory limiter on `/auth/login` and `/auth/reset-password` | Prevents automated credential-stuffing (default: max 20 attempts per minute per IP). |
| **Security Headers** | `X-Content-Type-Options: nosniff`<br>`X-Frame-Options: DENY`<br>`X-XSS-Protection: 1; mode=block`<br>`Strict-Transport-Security: max-age=31536000`<br>`Referrer-Policy: strict-origin-when-cross-origin` | Injected automatically by both FastAPI middleware and Nginx edge server. |
| **Audit Ledger Protection** | Section 19 Invariant: Statutory event ledger is append-only | `DELETE /api/v1/admin/audit-history` blocked with HTTP 403. |
| **CSV Injection Shield** | Formula sanitization (`=`, `+`, `-`, `@`, `\t`, `\r`) | Neutralizes malicious formula execution in exported Excel/CSV spreadsheets. |

---

## 3. High-Concurrency Database Architecture

### PostgreSQL 16 (Enterprise Production Standard)
In production environments, CivicProof utilizes a pre-pinged connection pool:
- **Pool Size:** `DATABASE_POOL_SIZE=20` (baseline persistent connections per worker).
- **Max Overflow:** `DATABASE_MAX_OVERFLOW=10` (burst handling under heavy morning inspection loads).
- **Recycle Interval:** `DATABASE_POOL_RECYCLE=1800` (refreshes connections every 30 minutes to prevent firewall drops).
- **Pre-Ping:** `pool_pre_ping=True` (validates connection health before query execution, avoiding stale socket errors).

### SQLite with Write-Ahead Logging (Lightweight & Offline Edge Mode)
When deployed in resource-constrained environments or evaluation rigs, CivicProof automatically configures:
- `PRAGMA foreign_keys=ON;` — Enforces relational integrity across tables.
- `PRAGMA journal_mode=WAL;` — Write-Ahead Logging allows simultaneous concurrent reads while writes are committed.
- `PRAGMA busy_timeout=15000;` — Queries wait up to 15 seconds rather than failing with lock contention.

---

## 4. Mobile Field PWA & Riverfront Offline Resilience

During Godavari Pushkaralu, riverfront ghats experience massive cellular congestion. CivicProof provides full offline resilience:
1. **Service Worker (`/sw.js`):** Pre-caches the core application shell (HTML, CSS, JS, SVG assets) on first visit.
2. **IndexedDB Local Evidence Queue:** Field inspectors can execute checklists, record GPS coordinates, and stage photos with zero internet connection.
3. **Idempotent Batch Sync:** When connectivity is restored, submissions are synchronized with duplicate deduplication (`client_submission_id`) and clock-drift conflict resolution.
4. **Camera & GPS Hardware Integration:** Inspectors can capture real-time camera photos and high-accuracy device GPS (`enableHighAccuracy: true`).

---

## 5. Health Monitoring & Observability Runbook

### Health Probe Endpoints:
- **Comprehensive Health (`GET /health`):**
  Validates both database query execution (`SELECT 1`) and evidence storage write access. Returns `200 OK` or `503 Service Unavailable`.
  ```json
  {
    "status": "healthy",
    "service": "CivicProof",
    "version": "1.0.0",
    "environment": "production",
    "database": "connected",
    "storage": "writable"
  }
  ```
- **Liveness Probe (`GET /health/liveness`):**
  Fast response for Kubernetes container health check.
- **Readiness Probe (`GET /health/readiness`):**
  Ensures the backend instance is fully connected to the database before receiving ingress traffic.

### Automated Database Backup Script:
Run daily via cron on the host:
```bash
#!/usr/bin/env bash
BACKUP_DIR="/var/backups/civicproof"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

# Backup PostgreSQL database
docker compose exec -T db pg_dump -U civic_user civicproof_db | gzip > "$BACKUP_DIR/civicproof_db_$TIMESTAMP.sql.gz"

# Backup Evidence Vault
tar -czf "$BACKUP_DIR/evidence_vault_$TIMESTAMP.tar.gz" -C /app/data storage

# Retain backups for 30 days
find "$BACKUP_DIR" -type f -mtime +30 -delete
echo "CivicProof statutory backup completed: $TIMESTAMP"
```

---

## 6. Real-World Pilot Verification & Reseed Operations

### Seeding Baseline Pushkaralu 2027 Entities:
```bash
# Inside running container
docker compose exec backend python scripts/seed_demo_data.py
```

### Running Automated Test Verification:
```bash
docker compose exec backend pytest backend/tests -v
```
All 87 automated tests cover authentication, role isolation, GPS geofencing, risk engine rules, offline sync idempotency, and audit log immutability.
