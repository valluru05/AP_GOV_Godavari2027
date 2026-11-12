# CivicProof
### Field-Verified Infrastructure Readiness and Asset Accountability Platform

> *"Every Work. Every Verification. Every Asset. Accounted For."*

[![Vercel Deployment](https://img.shields.io/badge/Frontend-Vercel%20Live-black?style=flat-square&logo=vercel&logoColor=white)](https://civicproofap-gov-godavari2027.vercel.app)
[![Render Backend](https://img.shields.io/badge/Backend-Render%20Live-46E3B7?style=flat-square&logo=render&logoColor=white)](https://civicproof-backend-ap-gov-godavari2027.onrender.com/health)
[![Test Suite](https://img.shields.io/badge/Pytest-87%2F87%20Passed%20(100%25)-brightgreen?style=flat-square&logo=pytest&logoColor=white)](https://civicproof-backend-ap-gov-godavari2027.onrender.com/docs)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%2018%20(21%20Tables)-blue?style=flat-square&logo=postgresql&logoColor=white)](https://civicproof-backend-ap-gov-godavari2027.onrender.com)
[![Languages](https://img.shields.io/badge/i18n-English%20%7C%20%E0%B0%A4%E0%B1%86%E0%B0%B2%E0%B1%81%E0%B0%97%E0%B1%81%20%7C%20%E0%A4%B9%E0%A4%BF%E0%A4%A8%E0%A5%8D%E0%A4%A6%E0%A5%80-orange?style=flat-square)](https://civicproofap-gov-godavari2027.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

CivicProof is a full-stack municipal governance and infrastructure readiness verification platform designed for **Sri Godavari Maha Pushkaralu 2027** in Rajamahendravaram, Andhra Pradesh. The platform bridges the gap between contractor progress claims and physical site reality by enforcing an audited **Verified Readiness Chain**, physical GPS geofenced inspections, camera QR-based municipal asset traceability, and explainable readiness risk modeling.

---

## 🌐 Live Deployment

The platform is deployed and fully accessible in production:

| Service | Provider | URL | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend Portal** | **Vercel** | [https://civicproofap-gov-godavari2027.vercel.app](https://civicproofap-gov-godavari2027.vercel.app) | Single-Page React Web Application |
| **Backend REST API** | **Render** | [https://civicproof-backend-ap-gov-godavari2027.onrender.com](https://civicproof-backend-ap-gov-godavari2027.onrender.com) | FastAPI High-Performance ASGI Engine |
| **API Base URL** | **Render** | `https://civicproof-backend-ap-gov-godavari2027.onrender.com/api/v1` | Production API Endpoint Root |
| **Interactive Docs** | **Render** | [https://civicproof-backend-ap-gov-godavari2027.onrender.com/docs](https://civicproof-backend-ap-gov-godavari2027.onrender.com/docs) | OpenAPI 3.0 Interactive Swagger UI |
| **System Health** | **Render** | [https://civicproof-backend-ap-gov-godavari2027.onrender.com/health](https://civicproof-backend-ap-gov-godavari2027.onrender.com/health) | Deep Health & Database Connectivity Check |

> **🚀 [Open CivicProof — Live Application](https://civicproofap-gov-godavari2027.vercel.app)**
>
> The live web application automatically communicates with the deployed Render backend over HTTPS. The sign-in screen includes an **Evaluator 1-Click Role Switcher** with pre-seeded demonstration credentials across all 7 statutory government personas, enabling instant testing without manual registration.

---

## 📋 Table of Contents

- [Project Overview](#-project-overview)
- [Key Features](#-key-features)
- [Core Innovation: Verified Readiness Chain](#-core-innovation-verified-readiness-chain)
- [User Roles & Permissions](#-user-roles--permissions)
- [Technology Stack](#-technology-stack)
- [System Architecture](#-system-architecture)
- [Project Structure](#-project-structure)
- [Application Screenshots](#-application-screenshots)
- [Installation and Setup](#-installation-and-setup)
- [Environment Variables](#-environment-variables)
- [Running the Application](#-running-the-application)
- [Demonstration Accounts](#-demonstration-accounts)
- [Application Workflow](#-application-workflow)
- [Multilingual Support](#-multilingual-support)
- [QR Scanner & Hardware Integration](#-qr-scanner--hardware-integration)
- [API Documentation](#-api-documentation)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [Security Considerations](#-security-considerations)
- [Deployment Architecture](#-deployment-architecture)
- [Future Enhancements](#-future-enhancements)
- [Prototype Scope & Limitations](#-prototype-scope--limitations)
- [Contribution Guidelines](#-contribution-guidelines)
- [License](#-license)
- [Acknowledgements](#-acknowledgements)

---

## 🔍 Project Overview

### The Problem
During massive religious congregations such as Sri Godavari Maha Pushkaralu (which occurs once every 12 years and draws over 50 million pilgrims to Rajamahendravaram), hundreds of municipal civil works must be executed simultaneously under compressed statutory deadlines:
- Drinking water RO hubs and pipeline chlorination networks
- High-mast floodlight towers along bathing ghats
- Deep-water submersible safety barricades
- Multi-bay prefabricated bio-sanitation complexes
- Evacuation corridors, signage, and medical emergency centers

Traditional project management software relies entirely on **unverified contractor claims**. When an empaneled vendor marks a package "100% complete" in an administrative spreadsheet, municipal authorities have historically had no mechanism to prove that the work was physically executed, pressure-tested, geofenced, and free of critical defects.

### Why Progress Requires Independent Verification
Prematurely declaring works ready based on contractor declarations introduces catastrophic public safety risks. If a riverfront barricade or a high-pressure water main fails during peak festival bathing hours, the human and municipal consequences are severe. 

CivicProof introduces an architectural invariant: **Vendor-reported progress and statutory verified progress are strictly separated.** A vendor can claim 100% completion, but until an authorized independent quality engineer executes a physical site inspection, conducts technical lab checks, and logs zero blocking defects, the verified civil progress remains strictly **0.0%**.

### How CivicProof Ensures Accountability
1. **Four-Gate Operational Barrier**: Progress moves strictly from *Reported Claim* $\rightarrow$ *Independent Field Audit* $\rightarrow$ *Executive Acceptance* $\rightarrow$ *Operational Readiness*.
2. **Immutable Audit Trail**: Every status transition, inspection note, and defect resolution is written to an append-only event ledger in PostgreSQL.
3. **Physical Traceability**: Every municipal asset is tied to a unique, cryptographically generated QR matrix tag deployed on site.

---

## ⚡ Key Features

| Category | Implemented Capabilities |
| :--- | :--- |
| **Authentication & RBAC** | Argon2id password hashing, signed JWT Bearer authentication, 7 distinct government personas, and dynamic permission matrices. |
| **Executive Overview** | Real-time command dashboard, Reported vs. Verified disparity gauge, ghat status summaries, critical path timeline countdowns. |
| **Project & Work Packages** | Capital scheme register, DPR budgets with confidential financial masking, milestone dependencies, and 9-tab project workspaces. |
| **Vendor Management** | Empaneled contractor registry, compliance certificate tracking, vendor portal tenancy boundaries, and progress claim submission. |
| **Field Verification** | GPS geofenced inspections, standardized statutory checklists, site photographic evidence vault, and progress accreditation. |
| **Defect & Rework Management** | Non-conformance logging, severity grading (Critical, High, Medium, Low), vendor rework evidence uploads, and re-inspection workflows. |
| **Municipal Asset Registry** | Physical asset ledger, 10-state lifecycle machine (Planned to Operationally Ready), and high-contrast printable thermal QR labels. |
| **Camera QR Scanner** | Live rear-facing hardware camera integration (`html5-qrcode`), targeting reticle, audio beep, vibration haptics, and manual lookup. |
| **Readiness Chain & Risk** | 12-stage end-to-end lifecycle traceability, explainable 0–100 risk scoring (Rules A through G), and pre-flight acceptance gates. |
| **GIS Map & Bathing Ghats** | Leaflet interactive map, custom bathing ghat boundary polygon overlays, risk-coded asset markers, and GPS location acquisition. |
| **Reports & Audit Explorer** | Streaming CSV data exports with OWASP formula sanitization, filterable audit history explorer, and statutory compliance summaries. |
| **Notifications & Action Queue** | In-app notification center, unread counters, and role-personalized task action queues with direct deep links. |
| **Multilingual Support (i18n)** | Full application-wide translation across English, Telugu (తెలుగు), and Hindi (हिन्दी) for all navigation, tables, and modals. |
| **Responsive Mobile Interface** | Mobile-first architecture supporting 320px smartphones to 4K displays with touch targets $\ge 44\text{px}$ and sticky header. |

---

## 🔗 Core Innovation: Verified Readiness Chain

The defining architectural contribution of CivicProof is the **Verified Readiness Chain**, an audited sequence of exactly 12 verifiable lifecycle milestones:

```
[1. Project Inception] 
      │
      ▼
[2. Work Package Charter] 
      │
      ▼
[3. Milestone Precedence] 
      │
      ▼
[4. Vendor Progress Claim] ────> (Reported Progress = 100%, Verified Progress = 0%)
      │
      ▼
[5. Supporting Evidence Vault] 
      │
      ▼
[6. Geofenced Field Inspection] 
      │
      ▼
[7. Inspection Verdict & Award] ────> (Verified Progress Awarded Only Upon Passing Audit)
      │
      ▼
[8. Defect & Snag Tracking] ────> (Active Critical Defects Freeze the Chain)
      │
      ▼
[9. Re-inspection Verification] 
      │
      ▼
[10. Acceptance Sign-Off Gate] ────> (Blocks Premature Sign-Off if Defects are Open)
      │
      ▼
[11. Linked Municipal Asset] 
      │
      ▼
[12. Operational Readiness] ────> (Asset Formally Commissioned for Public Use)
```

### Why Reported $\neq$ Verified $\neq$ Operationally Ready
1. **Reported Progress**: A subjective declaration submitted by the contractor with accompanying progress photos. It holds no statutory weight.
2. **Verified Progress**: An authoritative percentage accredited exclusively by an independent quality assurance inspector after physical checklist verification.
3. **Operational Readiness**: The final commissioning state. An asset is never marked "Operationally Ready" solely because installation finished; it requires zero open critical defects, all statutory safety clearances, and an authorized acceptance sign-off.

---

## 👥 User Roles & Permissions

CivicProof enforces fine-grained Role-Based Access Control (RBAC) across 7 specialized government roles:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SUPER ADMINISTRATOR                             │
│       Full system oversight, RBAC matrix control, immutable audit      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
       ┌────────────────────────────┼────────────────────────────┐
       ▼                            ▼                            ▼
┌───────────────────┐      ┌───────────────────┐      ┌───────────────────┐
│ MUNICIPAL ADMIN   │      │  PROJECT MANAGER  │      │  FIELD INSPECTOR  │
│ Final acceptance  │      │ Milestone bounds, │      │ Geofenced audits, │
│ gate, assignments │      │ vendor review     │      │ checklist grading │
└───────────────────┘      └───────────────────┘      └───────────────────┘
       │                            │                            │
       └────────────────────────────┼────────────────────────────┘
                                    │
       ┌────────────────────────────┴────────────────────────────┐
       ▼                            ▼                            ▼
┌───────────────────┐      ┌───────────────────┐      ┌───────────────────┐
│ VENDOR/CONTRACTOR │      │   ASSET MANAGER   │      │ READ-ONLY AUDITOR │
│ Progress claims,  │      │ QR tag management,│      │ State vigilance,  │
│ rework evidence   │      │ lifecycle states  │      │ read-only reports │
└───────────────────┘      └───────────────────┘      └───────────────────┘
```

| Role | Role ID | Scope of Authority | Key Permissions |
| :--- | :--- | :--- | :--- |
| **Super Administrator** | `super_admin` | Platform-wide administrative authority | `users:manage`, `settings:manage`, `audit:read`, `projects:*` |
| **Municipal Administrator** | `muni_admin` | Municipal Corporation executive command | `acceptance:approve`, `projects:create`, `projects:assign` |
| **Project Manager** | `project_manager` | Capital works division oversight | `milestones:*`, `progress:review`, `inspections:assign` |
| **Field Inspector** | `field_inspector` | Independent quality assurance unit | `inspections:conduct`, `inspections:submit`, `defects:create` |
| **Vendor / Contractor** | `vendor` | Empaneled engineering contractor | `progress:submit`, `defects:respond` *(strictly isolated)* |
| **Asset Manager** | `asset_manager` | Municipal assets and inventory division | `assets:manage`, `assets:transition`, `assets:read` |
| **Read-Only Reviewer** | `read_only_reviewer` | State vigilance and statutory audit | `reports:read`, `reports:export`, `audit:read` |

---

## 💻 Technology Stack

```
                                TECHNOLOGY STACK
  
    FRONTEND                          BACKEND                       DATABASE
  ┌───────────────────────┐         ┌───────────────────────┐     ┌───────────────────────┐
  │ • React 19            │         │ • FastAPI (Python 3.12│     │ • PostgreSQL 18       │
  │ • TypeScript          │  HTTPS  │ • Uvicorn (ASGI)      │ SQL │ • SQLAlchemy 2.0 ORM  │
  │ • Vite 8              │ ──────> │ • Pydantic v2         │───> │ • Psycopg 3 Driver    │
  │ • Tailwind CSS        │  REST   │ • Argon2id Crypto     │     │ • Connection Pool (20)│
  │ • TanStack Query v5   │         │ • PyJWT (HS256)       │     │ • 21 Relational Tables│
  │ • Leaflet & Recharts  │         │ • Sliding Rate Limiter│     │ • Immutable Audit Log │
  └───────────────────────┘         └───────────────────────┘     └───────────────────────┘
```

### Frontend Architecture
- **Core Framework:** React 19.3.1 with TypeScript 7.0.2
- **Build Tooling:** Vite 8.3.5 with `@vitejs/plugin-react`
- **Styling & Theme:** Tailwind CSS 3.4.19 with custom Pushkaralu palette (`#9E2A2B` Temple Red, `#D97706` Saffron, `#2D6A4F` AP Green)
- **State & Data Fetching:** TanStack React Query v5.105.0 with optimistic mutations
- **Form Handling & Validation:** React Hook Form 7.91.0 with Zod 4.6.7 schemas
- **Icons & Visualization:** Lucide React 1.66.0, Recharts 3.10.1, Leaflet 1.9.4
- **Hardware Integrations:** `html5-qrcode` 2.3.8, Web Geolocation API, Web Audio API
- **Internationalization:** `i18next` 27.0.1 and `react-i18next` 18.0.1 (EN, TE, HI)
- **Local Caching:** `idb` 8.0.4 for client-side storage

### Backend Architecture
- **Framework:** FastAPI 0.162.0 (Python 3.12.13)
- **ASGI Server:** Uvicorn 0.54.0 with `uvloop`
- **Data Validation & Settings:** Pydantic 2.14.2 & `pydantic-settings` 2.16.2
- **Authentication & Security:** Argon2id (`argon2-cffi` 25.1.0), PyJWT 2.15.1
- **Rate Limiting:** In-memory sliding-window request throttling

### Database & Persistence Layer
- **Engine:** PostgreSQL 18 (production on Render/local), SQLite with WAL mode (test fallback)
- **ORM:** SQLAlchemy 2.1.6 (declarative 2.0 style with mapped typing)
- **Driver:** `psycopg` 3.2.5 with binary C extensions and integrated connection pool
- **Pool Sizing:** `pool_size=20`, `max_overflow=10`, `pool_recycle=1800`

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph Client ["Client Presentation Tier (Vercel)"]
        UI["React 19 SPA (Vite)"]
        I18N["i18n Engine (EN / TE / HI)"]
        CAM["Camera QR Scanner (html5-qrcode)"]
        GIS["Leaflet Map Engine"]
        AUTH_UI["Role-Based Route Guard"]
        UI --> I18N
        UI --> CAM
        UI --> GIS
        UI --> AUTH_UI
    end

    subgraph API ["Application & API Tier (Render)"]
        GW["FastAPI REST Router (/api/v1)"]
        RL["Sliding-Window Rate Limiter"]
        SEC["Argon2id & JWT Auth Engine"]
        
        subgraph Services ["Domain Business Logic Services"]
            S_PROJ["Project & Work Package Service"]
            S_VEND["Vendor Tenancy & Progress Service"]
            S_INSP["Geofenced Inspection Service"]
            S_DEF["Defect & Corrective Action Service"]
            S_ASST["Asset Registry & QR Service"]
            S_READ["Readiness Chain & Risk Engine"]
            S_REP["Report Generator & Sanitizer"]
            S_AUD["Immutable Audit Event Service"]
        end

        GW --> RL
        RL --> SEC
        SEC --> Services
    end

    subgraph Data ["Data & Storage Tier"]
        PG[("PostgreSQL 18 Database\n21 Relational Tables")]
        AUDIT[("Append-Only Audit Ledger\naudit_events Table")]
        VAULT[("Photo & Certificate Vault\nLocal / S3 Storage")]
    end

    UI -- "HTTPS / JSON REST" --> GW
    Services --> PG
    Services --> AUDIT
    Services --> VAULT
```

---

## 📂 Project Structure

```
CivicProof/
├── DEPLOYMENT.md                    # Production deployment and operations guide
├── LICENSE                          # MIT Open-Source License
├── README.md                        # Primary platform documentation
├── docker-compose.yml               # Multi-container orchestration (DB, API, SPA)
├── package.json                     # Monorepo task runner configuration
├── scripts/
│   └── dev.mjs                      # Unified dual-server launcher (port 8008 & 5173)
├── docs/                            # Deep technical design documentation
│   ├── api-guide.md                 # REST API reference and request examples
│   ├── architecture.md              # Architectural invariants & security boundaries
│   ├── database-schema.md           # 21-table schema and relational mappings
│   ├── deployment.md                # Cloud deployment instructions
│   └── screenshots/                 # Application visual walkthrough assets
│       └── README.md                # Screenshot capture guide
├── backend/                         # FastAPI Application Root
│   ├── Dockerfile                   # Multi-stage production container definition
│   ├── requirements.txt             # Python dependencies
│   ├── app/
│   │   ├── main.py                  # FastAPI application entrypoint & middleware
│   │   ├── api/v1/                  # REST API route handlers
│   │   │   ├── admin.py             # RBAC matrix, departments, zones
│   │   │   ├── assets.py            # Asset registry, QR labels, lifecycle
│   │   │   ├── auth.py              # Login, token generation, user info
│   │   │   ├── defects.py           # Defect creation, rework, re-inspection
│   │   │   ├── dependencies.py      # Milestone CPM graph & delay simulation
│   │   │   ├── inspections.py       # Geofenced inspections, checklists
│   │   │   ├── map.py               # Bathing ghat polygons and GeoJSON pins
│   │   │   ├── notifications.py     # Notification center & Action Queue
│   │   │   ├── projects.py          # Projects & work packages API
│   │   │   ├── readiness.py         # 12-stage chain & explainable risk engine
│   │   │   ├── reports.py           # Streaming CSV reports & exports
│   │   │   └── vendors.py           # Vendor management & progress claims
│   │   ├── core/                    # App configuration, security, rate limiting
│   │   ├── db/                      # SQLAlchemy session & connection pooling
│   │   ├── models/                  # Declarative SQLAlchemy domain entities
│   │   ├── schemas/                 # Pydantic v2 validation models
│   │   └── services/                # Business logic implementation
│   ├── scripts/
│   │   ├── run_all_tests.py         # Comprehensive QA and load test script
│   │   └── seed_demo_data.py        # Pushkaralu 2027 synthetic data seeder
│   └── tests/                       # 87 Automated Pytest suites
└── frontend/                        # React 19 SPA Root
    ├── Dockerfile                   # Container definition with Nginx serving
    ├── index.html                   # HTML5 entrypoint with Google Fonts
    ├── nginx.conf                   # Production Nginx reverse-proxy & Gzip config
    ├── package.json                 # Node dependencies and scripts
    ├── vercel.json                  # Vercel SPA routing rewrite rules
    ├── vite.config.ts               # Vite configuration and proxy setup
    └── src/
        ├── App.tsx                  # Application routing & protected routes
        ├── i18n.ts                  # i18next configuration
        ├── locales/                 # Translation dictionaries (en, te, hi)
        ├── components/              # Shared UI design system & layout components
        ├── features/                # Feature modules (Dashboard, Projects, etc.)
        ├── services/                # API client with Axios/Fetch wrappers
        └── types/                   # TypeScript interfaces and domain types
```

---

## 📸 Application Screenshots

Visual demonstration captures of the platform interface are organized in [`docs/screenshots/`](docs/screenshots/):

| Module View | File Path | Highlights |
| :--- | :--- | :--- |
| **Executive Dashboard** | `docs/screenshots/dashboard.png` | Command KPIs, Reported vs. Verified Gauge, Ghat Status |
| **Project & Work Register** | `docs/screenshots/projects.png` | Capital schemes, DPR budgets, milestone schedules |
| **Field Inspection** | `docs/screenshots/inspection.png` | GPS geofencing, checklist execution, photo evidence |
| **Municipal Asset Registry** | `docs/screenshots/assets.png` | Asset inventory, lifecycle status, filter pills |
| **Hardware QR Scanner** | `docs/screenshots/qr-scanner.png` | Rear-camera viewfinder, reticle, audio/vibration feedback |

> *To capture or update local screenshots, navigate to the live deployment at [https://civicproofap-gov-godavari2027.vercel.app](https://civicproofap-gov-godavari2027.vercel.app), capture the respective views, and place them into the `docs/screenshots/` directory.*

---

## ⚙️ Installation and Setup

### Prerequisites
- **Node.js**: v20.x or higher
- **Python**: v3.12.x or higher
- **PostgreSQL**: v16 or higher (optional for local dev; SQLite fallback is available)
- **Git**: v2.30+

### Step 1: Clone the Repository
```bash
git clone https://github.com/valluru05/AP_GOV_Godavari2027.git CivicProof
cd CivicProof
```

### Step 2: Backend Setup (FastAPI)
```bash
# 1. Create and activate Python virtual environment
python3.12 -m venv .venv
source .venv/bin/activate       # On Windows: .venv\Scripts\activate

# 2. Install backend dependencies
pip install --upgrade pip
pip install -r backend/requirements.txt

# 3. Configure environment variables
cp .env.example .env
cp .env.example backend/.env
```

### Step 3: Frontend Setup (React 19)
```bash
cd frontend
npm install
cd ..
```

---

## 🔐 Environment Variables

CivicProof uses a single `.env` file at the root (or in `backend/`). A documented template is provided in [`.env.example`](.env.example):

| Variable | Description | Default / Example | Required |
| :--- | :--- | :--- | :---: |
| `PROJECT_NAME` | Name of the platform instance | `CivicProof` | No |
| `ENVIRONMENT` | Environment mode (`development` \| `production`) | `production` | Yes |
| `SECRET_KEY` | Cryptographic key for signing JWT tokens | `<SECURE_64_CHAR_HEX_KEY>` | **Yes** |
| `ALGORITHM` | JWT signing algorithm | `HS256` | No |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime | `1440` (24 hours) | No |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+psycopg://user:pass@host:5432/civicproof_db` | Yes |
| `DATABASE_POOL_SIZE` | SQLAlchemy connection pool size | `20` | No |
| `BACKEND_CORS_ORIGINS` | Allowed frontend origins (JSON or comma-separated) | `["https://civicproofap-gov-godavari2027.vercel.app", "http://localhost:5173"]` | **Yes** |
| `RATE_LIMIT_ENABLED` | Enable sliding-window rate limiting | `true` | No |
| `STORAGE_DIR` | Local directory for evidence storage | `./data/storage` | No |
| `VITE_API_BASE_URL` | *(Frontend only)* Backend API base URL | `https://civicproof-backend-ap-gov-godavari2027.onrender.com/api/v1` | **Yes** |

> ⚠️ **CRITICAL SECURITY NOTICE**: Never commit `.env` or production secrets to Git. The `.gitignore` file is explicitly configured to prevent secrets from being tracked.

---

## 🚀 Running the Application

### Method 1: Single-Command Unified Runner (Recommended)
Start both the FastAPI backend (port `8008`) and the Vite React frontend (port `5173`) concurrently:
```bash
npm run dev
```

* **Web Portal:** [http://localhost:5173](http://localhost:5173)
* **Interactive API Docs (Swagger):** [http://127.0.0.1:8008/docs](http://127.0.0.1:8008/docs)
* **Backend Health Check:** [http://127.0.0.1:8008/health](http://127.0.0.1:8008/health)

Press `Ctrl+C` to terminate both servers simultaneously without leaving orphaned processes.

### Method 2: Individual Component Commands

```bash
# Run backend only (FastAPI on port 8008 with auto-reload)
npm run dev:backend

# Run frontend only (Vite on port 5173)
npm run dev:frontend

# Execute backend automated test suite
npm run test:backend

# Build frontend production bundle
npm run build

# Run frontend linter
npm run lint
```

### Method 3: Containerized Deployment (Docker Compose)
Run the complete stack (PostgreSQL, FastAPI with 4 workers, Nginx SPA) in isolated containers:
```bash
docker compose up -d --build
```
* **Nginx Web Portal:** [http://localhost:80](http://localhost:80)
* **Backend API:** [http://localhost:8008](http://localhost:8008)

---

## 🔑 Demonstration Accounts

The database includes 7 pre-seeded demonstration accounts covering each statutory role. In the live web application, click any card on the **1-Click Role Switcher** to authenticate immediately:

| Persona / Officer | Email / Username | Password | Assigned Role |
| :--- | :--- | :--- | :--- |
| **Sri K. Ramesh Babu, IAS** | `superadmin@civicproof.gov.in` | `AdminPass123!` | Super Administrator |
| **Sri P. Venkat Rao** | `muniadmin@civicproof.gov.in` | `MuniPass123!` | Municipal Administrator |
| **Sri V. Krishna Mohan** | `pm@civicproof.gov.in` | `PMPass123!` | Project Manager |
| **Sri M. Suresh Kumar** | `inspector@civicproof.gov.in` | `InspectorPass123!` | Field Inspector |
| **Sri Rajesh Varma** | `vendor@infra-ap.com` | `VendorPass123!` | Vendor / Contractor |
| **Sri T. Lakshmi Narayana** | `assets@civicproof.gov.in` | `AssetPass123!` | Asset Manager |
| **Dr. S. Padmavathi** | `reviewer@audit.gov.in` | `ReviewerPass123!` | Read-Only Reviewer |

> ⚠️ **Notice**: These credentials are synthetic demonstration accounts designed strictly for evaluation and QA. In actual municipal deployments, passwords must be changed immediately upon initialization.

---

## 🔄 Application Workflow

A standard civil work package traverses the following statutory workflow in CivicProof:

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Municipal Admin
    actor PM as Project Manager
    actor Vendor as Contractor
    actor Insp as Quality Inspector
    actor System as CivicProof Engine

    Admin->>PM: Create Capital Scheme & Work Package
    PM->>Vendor: Assign Work Package & Statutory Milestones
    Vendor->>System: Submit Progress Claim (100%) + Photo Evidence
    Note over System: Invariant: Verified Progress remains 0.0%
    PM->>Insp: Dispatch Geofenced Field Inspection
    Insp->>System: Execute Checklist on Mobile + Record Test Results
    alt Inspection Test Fails (e.g. Pressure < 6 bar)
        System->>System: Freeze Progress, Log Critical Defect, Trigger High Risk
        Vendor->>System: Submit Rework Evidence (Gasket Replaced)
        Insp->>System: Conduct Re-inspection (Pressure Test Passes)
        System->>System: Award Verified Progress to Work Package
    else Inspection Passes Directly
        System->>System: Award Verified Progress (e.g. 100%)
    end
    Admin->>System: Attempt Acceptance Sign-Off
    System->>Admin: Pre-Flight Gate Validates (Zero Open Defects)
    Admin->>System: Approve Acceptance Transition
    System->>System: Transition Linked Asset to "Operationally Ready"
    System->>System: Append Permanent Entry to Immutable Audit Log
```

---

## 🌐 Multilingual Support

CivicProof features comprehensive native internationalization (i18n):

- **Supported Languages:**
  - **English (EN):** Default administrative interface
  - **తెలుగు (TE):** Native official language of Andhra Pradesh
  - **हिन्दी (HI):** National language
- **Switching Mechanism:** A compact language dropdown in the top header allows instant switching on desktop and mobile.
- **Persistence:** Selected language is stored in `localStorage` (`i18nextLng`) and persists across browser sessions.
- **Coverage:** 100% of the UI is translated, including navigation, stat counters, table headers, form placeholders, validation alerts, category pills, and modal dialogs. Translation files are located in [`frontend/src/locales/`](frontend/src/locales/).

---

## 📷 QR Scanner & Hardware Integration

CivicProof integrates directly with field device hardware:

- **Camera-Based QR Scanner:** Powered by `html5-qrcode`, targeting the device's rear-facing camera (`facingMode: "environment"`).
- **Audio & Haptic Feedback:** Emits a high-frequency audio chirp via the Web Audio API upon QR decode, accompanied by a 150ms device vibration pulse (`navigator.vibrate`).
- **Torch Toggle:** Allows field inspectors to turn on the physical camera flash for nighttime inspections along unlit riverfront ghats.
- **Manual Fallback:** If camera access is disabled, an inspector can paste or type the opaque QR identifier (e.g. `QR-AST-DW-KOTI-001`) to look up the asset.
- **Browser Security Requirement:** Modern browsers mandate **HTTPS** (or `localhost`) to access `navigator.mediaDevices.getUserMedia()`. The production Vercel deployment satisfies this requirement with valid SSL/TLS.

---

## 📖 API Documentation

The backend exposes an interactive OpenAPI specification:

- **Swagger UI:** [https://civicproof-backend-ap-gov-godavari2027.onrender.com/docs](https://civicproof-backend-ap-gov-godavari2027.onrender.com/docs)
- **ReDoc UI:** [https://civicproof-backend-ap-gov-godavari2027.onrender.com/redoc](https://civicproof-backend-ap-gov-godavari2027.onrender.com/redoc)
- **OpenAPI JSON:** `https://civicproof-backend-ap-gov-godavari2027.onrender.com/openapi.json`

### Example Endpoints

```http
# Authentication
POST /api/v1/auth/login
Content-Type: application/json
{"username_or_email": "inspector@civicproof.gov.in", "password": "InspectorPass123!"}

# Section 13 Readiness Chain
GET /api/v1/readiness/work-packages/{id}/chain
Authorization: Bearer <JWT_TOKEN>

# Schedule Field Inspection
POST /api/v1/inspections
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
{"work_package_id": "wp-002", "inspection_type": "Pre-Commissioning Verification", "scheduled_date": "2026-11-20"}

# Lookup Asset by QR Code Token
GET /api/v1/assets/qr/{qr_code}
Authorization: Bearer <JWT_TOKEN>
```

---

## 🧪 Testing & Quality Assurance

CivicProof includes a robust automated test suite built with **Pytest** and FastAPI's `TestClient`:

```bash
# Run complete test suite (87 tests)
PYTHONPATH=backend pytest backend/tests -v
```

### Test Results Summary: **87 / 87 PASSED (100%)**
- `test_auth.py` (8 tests): Argon2id password verification, JWT expiration, RBAC enforcement, account deactivation.
- `test_admin.py` (8 tests): Permission matrix mutations, departments, zones, immutable audit protection invariant.
- `test_projects.py` (5 tests): Project creation, DPR budget financial reference masking, milestone dependency cycles.
- `test_vendors.py` (5 tests): Anti-corruption invariant (100% reported progress does not award verified progress), vendor tenancy isolation.
- `test_inspections.py` (7 tests): Geofence validation, checklist scoring, progress accreditation on pass, progress freeze on fail.
- `test_defects.py` (7 tests): Defect logging, vendor rework submissions, re-inspection gating, authorized closure.
- `test_assets.py` (8 tests): Asset state machine, QR token lookup, blocking asset transition if critical defect exists.
- `test_readiness.py` (5 tests): 12-stage readiness chain construction, explainable risk rules (A–G), acceptance pre-flight gates.
- `test_dependencies.py` (4 tests): Critical path calculation (CPM), circular dependency prevention.
- `test_map.py` (5 tests): Bathing ghat GeoJSON features, zone boundary queries, entity filtering.
- `test_reports.py` (8 tests): Streaming CSV exports, OWASP formula sanitization (`=`, `+`, `-`, `@`).
- `test_notifications.py` (8 tests): In-app notification deduplication, personalized Action Queue resolution.

### Comprehensive QA & Concurrent Load Testing
```bash
# Execute end-to-end functional QA + 100-request concurrent load test
PYTHONPATH=backend python3 backend/scripts/run_all_tests.py
```
- **Concurrency Result:** 100/100 successful requests (0% error rate).
- **Latency Benchmark:** P50 = 1,155ms, P95 = 1,782ms across complex readiness chain computations.

---

## 🛡️ Security Considerations

1. **Cryptographic Password Hashing:** Uses `argon2id` via `argon2-cffi`, resistant to GPU, FPGA, and ASIC side-channel attacks.
2. **Statutory Audit Immutability:** Audit events in `audit_events` cannot be modified or deleted. Calling `DELETE /api/v1/admin/audit-history` returns HTTP 403 Forbidden by design.
3. **Confidential Financial Masking:** Non-privileged roles (Inspectors, Vendors) cannot view sensitive funding references (`funding_reference` is returned as `"RESTRICTED"`).
4. **OWASP CSV Formula Injection Defense:** Any exported cell starting with dangerous spreadsheet formula characters (`=`, `+`, `-`, `@`) is automatically prefixed with a single quote (`'`) to neutralize remote code execution when opened in Excel.
5. **Sliding-Window Rate Limiting:** Throttles brute-force login attempts to 20 attempts per 60 seconds per IP address.
6. **Isolated Vendor Tenancy:** Contractors can only query, view, and submit rework for work packages explicitly assigned to their company ID.

---

## 🚀 Deployment Architecture

The platform uses a decoupled cloud architecture:

```
[ User Browser ]
       │
       ▼ HTTPS
┌──────────────────────────────────────────────┐
│  Vercel Global Edge Network                  │
│  - Hosts React 19 SPA (HTML, JS, CSS, Media) │
│  - SPA rewrite rules via frontend/vercel.json│
│  - SSL/TLS Termination & Brotli Compression  │
└──────────────────────┬───────────────────────┘
                       │
                       ▼ HTTPS /api/v1/*
┌──────────────────────────────────────────────┐
│  Render Cloud Application Engine             │
│  - FastAPI ASGI Multi-Worker Process         │
│  - Argon2id & JWT Stateless Authentication   │
│  - Dynamic CORS Allow-List                   │
└──────────────────────┬───────────────────────┘
                       │
                       ▼ TCP / SSL (Port 5432)
┌──────────────────────────────────────────────┐
│  Managed PostgreSQL 18 Instance              │
│  - 21 Relational Tables                      │
│  - SQLAlchemy 2.0 Connection Pooling         │
│  - Append-Only Event Ledger                  │
└──────────────────────────────────────────────┘
```

For complete instructions on self-hosting on Ubuntu/RHEL virtual machines with systemd and Nginx, refer to [`DEPLOYMENT.md`](DEPLOYMENT.md).

---

## 🔮 Future Enhancements

The following extensions are architecturally planned for subsequent phases:
- **Drone Photogrammetry Integration:** Periodic automated aerial orthomosaic map overlays to compare earthwork excavation progress against CAD models.
- **IoT Water Quality Telemetry:** Direct Modbus/MQTT telemetry ingestion from Kotilingala and Pushkar Ghat RO water purification plants (TDS, pH, turbidity).
- **Blockchain Notarization:** Periodic cryptographic Merkle tree root anchoring of the `audit_events` table to a public ledger for statutory transparency.
- **Automated CCTV Crowd Density Monitoring:** Computer vision integration to trigger emergency corridor protocols based on real-time pilgrim density.

---

## ⚠️ Prototype Scope & Limitations

- **Demonstration Context:** This repository represents a fully functional production-grade prototype developed according to municipal engineering specifications.
- **Synthetic Data:** All included projects, work packages, vendor names, officer identities, and coordinates represent synthetic demonstration records for Rajamahendravaram ghats.
- **Hardware Permissions:** Camera QR scanning requires the user to grant camera permissions in their mobile or desktop browser.

---

## 🤝 Contribution Guidelines

Contributions from developers and municipal engineering contributors are welcome:

1. **Fork the Repository:** Click the `Fork` button on GitHub.
2. **Create a Feature Branch:**
   ```bash
   git checkout -b feature/enhanced-ghat-telemetry
   ```
3. **Commit Your Changes:** Follow conventional commit standards:
   ```bash
   git commit -m "feat(gis): add bath-water quality sensor layer"
   ```
4. **Execute Tests:** Ensure all 87 tests pass cleanly:
   ```bash
   PYTHONPATH=backend pytest backend/tests -v
   npm --prefix frontend run lint
   npm --prefix frontend run build
   ```
5. **Open a Pull Request:** Submit your PR against the `main` branch with a description of the changes.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for complete details.

Copyright (c) 2026 Valluru Revanth Nag.

---

## 🙏 Acknowledgements

- **Government of Andhra Pradesh** — Inspiration for the Godavari Maha Pushkaralu 2027 infrastructure readiness framework.
- **FastAPI & Starlette** — For the high-performance Python ASGI backend.
- **React & Vite Teams** — For the modern frontend developer experience and build pipeline.
- **Leaflet & OpenStreetMap** — For open-source geographic mapping capabilities.
- **html5-qrcode** — For reliable multi-platform hardware camera QR code scanning.
