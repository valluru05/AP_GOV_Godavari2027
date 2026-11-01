# CivicProof: Field-Verified Infrastructure Readiness & Asset Accountability Platform
### Government of Andhra Pradesh — Godavari Pushkaralu 2027

> **Target Scenario:** Godavari Pushkaralu 2027, Rajamahendravaram, Andhra Pradesh  
> **Status:** Full-Stack Prototype (Modules 1 through 8 Complete)

---

## Architecture Overview
CivicProof enforces the **Verified Readiness Chain**: a strict four-state workflow separating contractor progress claims from independent engineering inspection, administrative acceptance, and asset operational readiness.

### Key Implemented Modules:
1. **Module 1 — Authentication, Users, Roles, and Permissions:** Argon2id hashing, JWT, 7 public-sector personas, user activation/deactivation, audit trail.
2. **Module 2 — Executive Overview Dashboard:** High-level executive command metrics, GIS zone breakdown, and prioritized action queues.
3. **Module 3 — Project and Work Register:** DPR budgets, civil work packages, cycle-protected milestone dependencies, and 9-tab inspection detail.
4. **Module 4 — Vendor and Service-Provider Management:** Contractor performance registry, delayed milestone accountability, and verified progress audits.
5. **Module 5 — Field Verification and Mobile Inspections:** GPS geofencing, checklist execution, evidence vault, and anti-corruption progress accreditation.
6. **Module 6 — Defects, Corrective Action, & Rework:** Quality & safety non-conformance tracking, contractor rework submissions, and independent re-inspection.
7. **Module 7 — Municipal Asset Registry & QR Traceability:** Capital asset register, high-contrast thermal printable QR matrix, and Section 12 readiness gating.
8. **Module 8 — Verified Readiness Chain & Risk Engine:** 12-stage audited lifecycle traceability, explainable 0–100 risk scoring (Rules A through G), and controlled administrative acceptance gates.

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

### 1. Prerequisites
- Python 3.12+
- Node.js 18+ and npm

### 2. Backend Setup
```bash
# Activate virtual environment
source .venv/bin/activate

# Run automated tests (50 tests passing)
PYTHONPATH=backend pytest backend/tests -v

# Start FastAPI backend server (Port 8008)
PYTHONPATH=backend uvicorn app.main:app --host 127.0.0.1 --port 8008 --reload
```
Interactive OpenAPI Documentation: [http://127.0.0.1:8008/docs](http://127.0.0.1:8008/docs)  
Health Check: [http://127.0.0.1:8008/health](http://127.0.0.1:8008/health)

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev -- --port 5173
```
Access the application: [http://127.0.0.1:5173/login](http://127.0.0.1:5173/login)
