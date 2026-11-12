# CivicProof™ Platform — Production Deployment & Operations Guide
## Government of Andhra Pradesh — Sri Godavari Maha Pushkaralu 2027

---

### Executive Overview
CivicProof is an enterprise infrastructure readiness verification and municipal asset monitoring system developed for the Government of Andhra Pradesh to monitor and govern works for Sri Godavari Maha Pushkaralu 2027 in Rajamahendravaram.

This document details the production deployment, container orchestration, PostgreSQL database administration, and security hardening procedures for government servers and NIC/APTS cloud environments.

---

### 1. Production Architecture

```
                  [ HTTPS:443 / HTTP:80 ]
                             │
                             ▼
                 ┌───────────────────────┐
                 │  Nginx Reverse Proxy  │
                 │  - SSL Termination    │
                 │  - Security Headers   │
                 │  - Gzip Compression   │
                 │  - Static Asset Cache │
                 └───────────┬───────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
    /api/v1/* │                             │ /* (SPA)
              ▼                             ▼
┌───────────────────────────┐ ┌───────────────────────────┐
│ FastAPI Application Cluster│ │ React 18 / Vite SPA Assets│
│ - Port 8008 (4 Uvicorn    │ │ - Localized (EN, TE, HI)  │
│   workers with uvloop)    │ │ - Leaflet GIS & QR Engine │
│ - Argon2id Cryptography   │ │ - Role-Based Router       │
│ - Anti-Corruption Chains  │ └───────────────────────────┘
└─────────────┬─────────────┘
              │
              │ Connection Pool (SQLAlchemy 2.0 + Psycopg 3)
              ▼
┌───────────────────────────┐
│   PostgreSQL 16/18 RDBMS  │
│ - 21 Relational Tables    │
│ - Append-Only Audit Trail │
│ - WAL Replication Ready   │
└───────────────────────────┘
```

---

### 2. Quick-Start Production Deployment (Docker Compose)

The fastest, recommended method to deploy the complete stack is with Docker Compose:

#### Step 1: Clone Repository & Configure Environment
```bash
git clone https://github.com/valluru05/AP_GOV_Godavari2027.git CivicProof
cd CivicProof
cp .env.example .env
```

#### Step 2: Set Strong Production Secrets
Edit `.env` and set production secrets:
```env
ENVIRONMENT="production"
SECRET_KEY="<GENERATE_A_64_CHAR_HEX_SECRET>"
POSTGRES_DB="civicproof_db"
POSTGRES_USER="civic_admin"
POSTGRES_PASSWORD="<STRONG_RANDOM_PASSWORD>"
DATABASE_URL="postgresql+psycopg://civic_admin:<STRONG_RANDOM_PASSWORD>@db:5432/civicproof_db"
```

#### Step 3: Launch Containers
```bash
docker compose up -d --build
```

#### Step 4: Verify Service Health
```bash
# Check container status
docker compose ps

# Check backend health
curl -f http://localhost:8008/health
# Expected: {"status":"healthy","service":"CivicProof","version":"1.0.0","environment":"production","database":"connected","storage":"writable"}

# Check frontend portal
curl -I http://localhost:80/
```

---

### 3. Bare-Metal / Virtual Machine Deployment (systemd + Nginx)

For standard state government cloud or datacenter virtual machines (Ubuntu 22.04 / 24.04 LTS / RHEL 9):

#### Step 1: System Prerequisites
```bash
sudo apt update && sudo apt install -y python3.12 python3.12-venv python3-pip postgresql nginx nodejs npm
```

#### Step 2: PostgreSQL Database Setup
```bash
sudo -u postgres psql -c "CREATE USER civic_admin WITH PASSWORD 'StrongPassword2027!';"
sudo -u postgres psql -c "CREATE DATABASE civicproof_db OWNER civic_admin;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE civicproof_db TO civic_admin;"
```

#### Step 3: Backend Python Environment
```bash
cd /opt/CivicProof
python3.12 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt
```

#### Step 4: Configure systemd Service (`/etc/systemd/system/civicproof.service`)
```ini
[Unit]
Description=CivicProof FastAPI Production Service
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/CivicProof
EnvironmentFile=/opt/CivicProof/.env
ExecStart=/opt/CivicProof/.venv/bin/uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8008 --workers 4 --proxy-headers --forwarded-allow-ips *
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now civicproof
sudo systemctl status civicproof
```

#### Step 5: Frontend Build & Nginx Hosting
```bash
cd /opt/CivicProof/frontend
npm ci
npm run build

sudo cp -r dist/* /var/www/civicproof/
```

Configure Nginx site (`/etc/nginx/sites-available/civicproof`):
```nginx
server {
    listen 80;
    server_name pushkaralu.ap.gov.in civicproof.local;

    root /var/www/civicproof;
    index index.html;

    client_max_body_size 35M;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml image/svg+xml;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # SPA Routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8008/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
        proxy_pass http://127.0.0.1:8008/health;
    }
}
```

Enable and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/civicproof /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

### 4. Database Schema & Tables Verification

CivicProof uses **21 PostgreSQL tables** enforcing strict domain models and audit invariants:

| # | Table Name | Purpose | Audit Tracing |
|---|---|---|---|
| 1 | `users` | Official administrative and field users | Yes (login, profile, status) |
| 2 | `roles` | 7 System roles with granular permission mappings | Yes |
| 3 | `permissions` | 30 Granular capability rules | Yes |
| 4 | `user_roles` | Many-to-many user-role assignments | Yes |
| 5 | `role_permissions` | Many-to-many role-permission maps | Yes |
| 6 | `departments` | Government departments (PWD, Irrigation, Health) | Yes |
| 7 | `zones` | Bathing ghats & operational sectors | Yes |
| 8 | `projects` | High-level municipal Pushkaralu capital schemes | Yes (Full lifecycle) |
| 9 | `work_packages` | Physical works with independent verification state | Yes (Section 13 chain) |
| 10 | `milestones` | Critical path timeline milestones | Yes |
| 11 | `milestone_dependencies`| Precedence constraints with circular cycle check | Yes |
| 12 | `vendors` | Empaneled engineering contractors | Yes (Compliance tracking) |
| 13 | `progress_submissions` | Contractor progress reports with photo evidence | Yes (Unverified until audit) |
| 14 | `inspections` | Independent field engineering audits & geofence | Yes (Section 28 invariant) |
| 15 | `defects` | Snag items, non-conformances, and re-work items | Yes (Zero-trust closure) |
| 16 | `assets` | Physical QR-tagged assets & field equipment | Yes (10-state machine) |
| 17 | `notifications` | Critical event alerts & statutory reminders | Yes |
| 18 | `audit_events` | Append-only cryptographically indexed log | Immutable |
| 19 | `checklist_templates` | Standardized statutory audit criteria | Yes |
| 20 | `system_settings` | Dynamic operational parameters | Yes |
| 21 | `offline_sync_records`| Idempotent field sync logs | Yes |

---

### 5. Standard Government Persona Accounts (Seeded Demo/Pilot)

| Persona / Officer | Email / Username | Default Password | Role Authority |
|---|---|---|---|
| **Sri K. Ramesh Babu, IAS** | `superadmin@civicproof.gov.in` | `AdminPass123!` | Super Administrator — Full oversight, audit, configuration |
| **Sri P. Venkat Rao** | `muniadmin@civicproof.gov.in` | `MuniPass123!` | Municipal Administrator — Project assignment, acceptance |
| **Sri V. Krishna Mohan** | `pm@civicproof.gov.in` | `PMPass123!` | Project Manager — Milestone tracking, vendor review |
| **Sri M. Suresh Kumar** | `inspector@civicproof.gov.in` | `InspectorPass123!` | Field Inspector — Geofenced audits, checklists, defects |
| **Sri Rajesh Varma** | `vendor@infra-ap.com` | `VendorPass123!` | Empaneled Contractor — Progress submission, defect rework |
| **Sri T. Lakshmi Narayana**| `assets@civicproof.gov.in` | `AssetPass123!` | Municipal Asset Manager — QR codes, lifecycle status |
| **Smt. B. Swathi** | `reviewer@audit.gov.in` | `ReviewerPass123!` | Statutory Reviewer — Acceptance approval, audit inspection |

> **IMPORTANT**: On production deployments, reset all default passwords immediately via `POST /api/v1/auth/change-password` or SQL update using Argon2id hashes.

---

### 6. Automated Backup & Maintenance Procedures

#### Daily PostgreSQL Backup Script (`/etc/cron.daily/civicproof-backup`)
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/civicproof"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

# Dump database with gzip compression
pg_dump -U civic_admin -d civicproof_db | gzip > "$BACKUP_DIR/civicproof_db_$TIMESTAMP.sql.gz"

# Retain last 30 days of daily backups
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +30 -delete
```

#### Database Restore Procedure
```bash
gunzip < /var/backups/civicproof/civicproof_db_YYYYMMDD_HHMMSS.sql.gz | psql -U civic_admin -d civicproof_db
```

---

### 7. Production Verification & Smoke Test Script

Run the automated verification script to validate system readiness:
```bash
PYTHONPATH=backend .venv/bin/python3 backend/scripts/run_all_tests.py
```
This tests:
- 10 Functional modules (Auth, Projects, Vendors, Inspections, Defects, Assets, Readiness, GIS, Audit, Admin)
- 4 Security penetration invariants (RBAC isolation, SQL injection resilience, financial masking, unauthorized reviews)
- 100-request concurrent load test (verifying sub-second P95 response times)
