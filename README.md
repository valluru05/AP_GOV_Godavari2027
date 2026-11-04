# CivicProof: Field-Verified Infrastructure Readiness & Asset Accountability Platform
### Government of Andhra Pradesh — Godavari Pushkaralu 2027

> **Target Scenario:** Godavari Pushkaralu 2027, Rajamahendravaram, Andhra Pradesh, India  
> **Tagline:** *Every Work. Every Verification. Every Asset. Accounted For.*  
> **Status:** Complete 14-Module Production-Grade Prototype (All 14 Modules Implemented, Integrated, and Passing 87 Automated Tests)  
> **Disclaimer:** *This application is a functional demonstration prototype developed according to official technical specifications. It is labelled with synthetic demo data and does not represent an officially deployed government production instance.*

---

## Architecture Overview & Core Paradigm

Traditional municipal tracking software relies on contractor claims: when a vendor marks a task "100% complete", the system prematurely reports it as done. CivicProof enforces the **Verified Readiness Chain**: a four-state operational barrier that eliminates progress corruption and guarantees true readiness:

```
[1. Reported Progress] ──(Requires Independent Audit)──> [2. Inspection-Verified Progress]
         │                                                            │
         ▼                                                            ▼
[Vendor Progress Claim]                                   [Authoritative Civil Progress]
                                                                      │
                                                                      ▼
[4. Operational Readiness] <──(All Criteria Met)── [3. Authorized Acceptance]
```

### Traceable 12-Stage Lifecycle Chain
Every work package is traceable across exactly 12 audited stages:
```
[1. Project] 
    └── [2. Work Package] 
            └── [3. Milestones] 
                    └── [4. Vendor Submission] 
                            └── [5. Evidence Vault] 
                                    └── [6. Field Inspection] 
                                            └── [7. Inspection Decision] 
                                                    └── [8. Defects & Rework] 
                                                            └── [9. Re-inspection] 
                                                                    └── [10. Acceptance Gate] 
                                                                            └── [11. Linked Asset] 
                                                                                    └── [12. Operational Readiness]
```

---

## 14 Implemented Platform Modules

1. **Module 1 — Authentication, Users, Roles & Permissions (Section 6):** Argon2id cryptographic hashing, signed JWT tokens, 7 government personas, and immutable security audit logs.
2. **Module 2 — Executive Overview Dashboard (Section 7):** Command KPIs, reported vs verified progress disparity tracking, GIS zone status, upcoming statutory deadlines, and risk queues.
3. **Module 3 — Project & Work Register (Section 8):** DPR budgets, civil work packages, cycle-protected milestone dependencies, and 9-tab inspection detail.
4. **Module 4 — Vendor & Service-Provider Management (Section 9):** Contractor performance registry, compliance expiry monitoring, and verified progress audits.
5. **Module 5 — Field Verification & Mobile Inspections (Section 10):** GPS geofencing, structured digital checklist execution, evidence photo vault, and anti-corruption progress accreditation.
6. **Module 6 — Defects, Corrective Action, & Rework (Section 11):** Non-conformance tracking, contractor rework submissions, independent re-inspection, and SLA breach countdowns.
7. **Module 7 — Municipal Asset Registry & QR Traceability (Section 12):** Capital asset register, high-contrast thermal printable QR matrix, and Section 12 readiness gating.
8. **Module 8 — Verified Readiness Chain & Risk Engine (Section 13 & 14):** 12-stage audited lifecycle traceability, explainable 0–100 risk scoring (Rules A through G), and controlled administrative acceptance gates.
9. **Module 9 — Readiness Dependency Graph & Risk Engine (Section 16):** Interactive SVG DAG network, topological sorting, cycle detection, critical path calculation, and Monte Carlo delay simulation.
10. **Module 10 — Geographic Map & Zone Monitoring (Section 17):** Leaflet GIS map with riverfront ghat boundary polygon overlays, risk-coded marker clusters, and GPS coordinate lookups.
11. **Module 11 — Offline-First Field Workflows (Section 22):** IndexedDB local storage, background sync queue, idempotent submission deduplication, and clock-drift conflict resolution.
12. **Module 12 — Reports, Exports, & Audit History (Section 23 & 24):** Streaming CSV file exports, statutory PDF generation, multi-criteria report filters, and immutable audit logs.
13. **Module 13 — Notifications & Task Management / Action Queue (Section 18):** In-app notification center, unread counters, role-personalized Action Queues with deep-link resolution.
14. **Module 14 — Administration & System Configuration (Section 19):** Dynamic RBAC matrix, department directories, ghat location registers, checklist templates, defect SLA rules, and sandbox demo-data reset.

---

## Section 28: Required Demonstration Scenario Walkthrough

The platform includes a pre-seeded, end-to-end demonstration scenario illustrating the corruption-resistance of the platform:

| Step | Persona | Action in CivicProof | System Behavior & Anti-Corruption Invariant |
| :--- | :--- | :--- | :--- |
| **1** | **Project Manager** | Creates work package `WP-DW-KOTI-01` (*Drinking Water Pipeline & RO Hub*) at Kotilingala Ghat. | Sets baseline DPR budget and attaches milestone `MS-002` (*Hydrostatic Pressure Test*). |
| **2** | **Contractor** | Logs in (`vendor@infra-ap.com`) and claims **100% Progress** with photos. | System records vendor claim, but **Verified Progress remains 0.0%**. |
| **3** | **Field Inspector** | Conducts on-site verification (`inspector@civicproof.gov.in`) with GPS geofence validation. | Mandatory pressure test fails at 4.2 bar (requires 6.0 bar). Active flange leak recorded. |
| **4** | **Risk Engine** | Automatically evaluates state on inspection failure. | **Rules C & D trigger**: Risk jumps to High (60.0). Defect `DEF-2026-001` automatically created. |
| **5** | **Municipal Admin** | Attempts premature acceptance of `WP-DW-KOTI-01`. | **Pre-flight Gate BLOCKS acceptance**: Displays blocking defect and 0% verified progress. |
| **6** | **Contractor** | Submits rework evidence (new gasket installed and torqued). | Defect transitions to `Ready for Re-inspection`. |
| **7** | **Field Inspector** | Conducts re-inspection; sustains 6.0 bar for 30 minutes; passes test. | Defect marked verified. **Authoritative verified progress awarded to work package**. |
| **8** | **Municipal Admin** | Pre-flight check now passes; approves formal acceptance. | Work package accepted; linked asset `AST-DW-KOTI-001` achieves **Operational Readiness**. |

---

## Pre-Configured Demo Accounts (1-Click Login Ready)

| Role | Name | Email | Password | Primary Jurisdiction |
| :--- | :--- | :--- | :--- | :--- |
| **Super Administrator** | Sri K. Ramesh Babu, IAS | `superadmin@civicproof.gov.in` | `AdminPass123!` | Municipal Headquarters |
| **Municipal Administrator** | P. Venkat Rao | `muniadmin@civicproof.gov.in` | `MuniPass123!` | Municipal Command Cell |
| **Project Manager** | V. Krishna Mohan | `pm@civicproof.gov.in` | `PMPass123!` | Public Works & Water |
| **Field Inspector** | M. Suresh Kumar | `inspector@civicproof.gov.in` | `InspectorPass123!` | Quality Assurance Cell |
| **Vendor / Contractor** | Rajesh Varma | `vendor@infra-ap.com` | `VendorPass123!` | Godavari Infra Engg |
| **Asset Manager** | T. Lakshmi Narayana | `assets@civicproof.gov.in` | `AssetPass123!` | Municipal Asset Div |
| **Read-Only Reviewer** | Dr. S. Padmavathi | `reviewer@audit.gov.in` | `ReviewerPass123!` | State Vigilance Directorate |

---

## Running the Application Locally

### Prerequisites
- Python 3.12+
- Node.js 18+ and npm

### 1. Backend Setup (FastAPI)
```bash
# Activate virtual environment
source .venv/bin/activate

# Install dependencies (if needed)
pip install -r backend/requirements.txt

# Run automated tests (All 87 tests passing)
PYTHONPATH=backend pytest backend/tests -v

# Start FastAPI backend server (Port 8008)
PYTHONPATH=backend uvicorn app.main:app --host 127.0.0.1 --port 8008 --reload
```
- **OpenAPI Swagger Docs:** [http://127.0.0.1:8008/docs](http://127.0.0.1:8008/docs)
- **Health Check:** [http://127.0.0.1:8008/health](http://127.0.0.1:8008/health)

### 2. Frontend Setup (React + Vite)
```bash
cd frontend
npm install
npm run dev -- --port 5173
```
- **Web Application:** [http://127.0.0.1:5173](http://127.0.0.1:5173)

---

## Containerized Production Deployment (Docker Compose)

Spin up the complete production-grade stack (PostgreSQL 16, multi-worker FastAPI backend, and hardened Nginx frontend SPA) with one command:
```bash
# 1. Copy environment configuration
cp .env.example .env

# 2. Build and launch all containers in background
docker compose up -d --build
```
- **Frontend SPA & PWA (Nginx):** [http://localhost:80](http://localhost:80)
- **FastAPI Multi-Worker Backend:** [http://localhost:8008](http://localhost:8008)
- **PostgreSQL 16 Relational DB:** `localhost:5432`
- **OpenAPI Interactive Documentation:** [http://localhost:8008/docs](http://localhost:8008/docs)
- **Deep Health & Readiness Check:** [http://localhost:8008/health](http://localhost:8008/health)

---

## Production Security & Architecture Hardening

CivicProof includes enterprise-grade hardening for real-world municipal infrastructure deployments:
- **Argon2id & JWT Authentication:** Resistant to GPU/ASIC attacks with configurable 24-hour expiration.
- **Sliding-Window Rate Limiting:** Built-in protection on `/auth/login` and `/auth/reset-password` against brute-force credential stuffing.
- **HTTP Security Headers:** Injected by both FastAPI and Nginx (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection`, `Referrer-Policy: strict-origin-when-cross-origin`, HSTS).
- **High-Concurrency Database Layer:** PostgreSQL connection pooling (`pool_size=20`, `max_overflow=10`, `pool_pre_ping=True`) and SQLite WAL (Write-Ahead Logging) mode with `busy_timeout=15000`.
- **Field PWA Offline Resilience:** Service Worker (`sw.js`) app shell caching, Web App Manifest, IndexedDB queue, and clock-drift conflict resolution for riverfront ghat verification.
- **Hardware Sensor Integration:** Real GPS device coordinate acquisition (`navigator.geolocation`) with accuracy radius, plus native mobile camera photo evidence capture (`<input capture="environment" />`).
- **Resilient UI Error Boundary:** Client-side error boundary preventing blank screens and offering one-click session recovery.
- **Route-Level Code Splitting:** Asynchronous module loading with `React.lazy()` reducing initial entry bundle to ~330 KB.

---

## Section 19 Invariant: Statutory Audit Immutability

CivicProof implements write-only, append-only cryptographic event logging. Deletion or tampering with audit entries is architecturally blocked:
- `DELETE /api/v1/admin/audit-history` returns **HTTP 403 Forbidden**:
  > *"Section 19 Invariant: Statutory tamper-evident audit history cannot be deleted or purged."*

---

## Documentation Directory

Detailed technical specifications are located in the [`docs/`](file:///Users/revanth/Desktop/CivicProof/docs) folder:
- [Architecture & Design System](file:///Users/revanth/Desktop/CivicProof/docs/architecture.md)
- [Database Schema & Entity Specifications](file:///Users/revanth/Desktop/CivicProof/docs/database-schema.md)
- [API Reference & Endpoint Guide](file:///Users/revanth/Desktop/CivicProof/docs/api-guide.md)
- [Offline Field Sync & PWA Architecture](file:///Users/revanth/Desktop/CivicProof/docs/offline-sync.md)
- [Production Deployment & Security Hardening](file:///Users/revanth/Desktop/CivicProof/docs/deployment.md)
