# CivicProof: Field-Verified Infrastructure Readiness & Asset Accountability Platform

> **Target Scenario:** Godavari Pushkaralu 2027, Rajamahendravaram, Andhra Pradesh  
> **Status:** Module 1 (Authentication, Users, Roles & Permissions) & Foundation Complete

---

## Architecture Overview
CivicProof enforces the **Verified Readiness Chain**: a strict four-state workflow separating contractor progress claims from independent engineering inspection, administrative acceptance, and asset operational readiness.

### Key Features Implemented in Module 1:
- **Argon2id Cryptographic Password Hashing & JWT Authorization**
- **Strict Server-Side Role-Based Access Control (RBAC)** across 7 distinct personas
- **7 Seeded Public-Sector Personas** with 1-Click Interactive Persona Switcher for evaluators
- **User Management & Activation/Deactivation** with immediate session revocation
- **Append-Only Tamper-Evident Audit Explorer** recording all authentication and administrative actions
- **Futuristic Government Light-Themed Design System** (Deep Government Blue `#174EA6`, Background `#F5F7FA`, Surface `#FFFFFF`, Inter typography)
- **100% Automated Backend Pytest Suite** passing all critical security and business rules

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

# Run automated tests
PYTHONPATH=backend pytest backend/tests/test_auth.py -v

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
