# CivicProof API Reference & Integration Guide

## Base URL & Versioning
All REST endpoints are versioned under `/api/v1`.

Interactive OpenAPI Swagger UI is available locally at:
`http://127.0.0.1:8008/docs`

---

## Authentication & Authorization
- **Token Format:** Bearer JWT in `Authorization` header (`Authorization: Bearer <token>`).
- **Permissions:** Checked per-route with 403 Forbidden enforcement if required permission is absent.

---

## Core Endpoint Groups

### 1. Authentication & Users (`/api/v1/auth`, `/api/v1/users`)
- `POST /api/v1/auth/login`: Authenticate with username/password, returns signed JWT and user profile.
- `GET /api/v1/auth/me`: Current user profile, active roles, and granted permission list.
- `GET /api/v1/users`: List users with search, role, and department filters (`users:read`).
- `POST /api/v1/users`: Register new administrative or field officer account (`users:manage`).
- `PATCH /api/v1/users/{id}/toggle-status`: Activate or deactivate account (`users:manage`).

### 2. Executive Dashboard (`/api/v1/dashboard`)
- `GET /api/v1/dashboard/summary`: High-level command KPIs (reported vs verified progress, defect breakdown, zone readiness, upcoming deadlines).
- `GET /api/v1/dashboard/timeline`: Multi-week progress velocity curves.

### 3. Projects & Work Packages (`/api/v1/projects`)
- `GET /api/v1/projects`: List capital works schemes with budget and status filters.
- `GET /api/v1/projects/{id}`: Detailed project view with nested work packages and milestones.
- `POST /api/v1/projects`: Register new project scheme (`projects:manage`).
- `GET /api/v1/projects/work-packages/{id}`: Full work package detail with 9 tabs (milestones, vendors, inspections, defects, assets, evidence, audit).

### 4. Contractors & Vendors (`/api/v1/vendors`)
- `GET /api/v1/vendors`: Contractor performance registry with compliance status.
- `GET /api/v1/vendors/{id}/dashboard`: Vendor portal dashboard showing assigned works and milestone obligations.
- `POST /api/v1/vendors/submissions`: Contractor submits progress update with evidence (`submissions:create`).

### 5. Field Verification & Inspections (`/api/v1/inspections`)
- `GET /api/v1/inspections`: List inspections with status and date filters.
- `POST /api/v1/inspections`: Schedule new on-site inspection (`inspections:schedule`).
- `POST /api/v1/inspections/{id}/execute`: Field inspector submits checklist results, GPS coordinates, and photos (`inspections:execute`).
- `POST /api/v1/inspections/{id}/review`: Supervisory review with approve/reject verdict (`inspections:review`).

### 6. Defects, Corrective Actions & Rework (`/api/v1/defects`)
- `GET /api/v1/defects`: List non-conformance defects with severity pills and SLA countdowns.
- `POST /api/v1/defects`: Log defect against inspection or work package (`defects:create`).
- `POST /api/v1/defects/{id}/rework`: Contractor submits rework details and correction photos (`defects:rework`).
- `POST /api/v1/defects/{id}/reinspect`: Field inspector re-verifies correction (`defects:verify`).
- `POST /api/v1/defects/{id}/close`: Authoritative supervisory close (`defects:close`).

### 7. Municipal Asset Registry & QR Traceability (`/api/v1/assets`)
- `GET /api/v1/assets`: Query capital asset registry with zone and category filters.
- `GET /api/v1/assets/{id}`: Asset lifecycle record.
- `GET /api/v1/assets/{id}/qr-label`: High-contrast printable thermal QR label with checksum.
- `GET /api/v1/assets/lookup/qr/{hash}`: Public/field QR scan resolution.
- `POST /api/v1/assets/{id}/transition`: Lifecycle state transition (`assets:manage`).

### 8. Verified Readiness Chain & Risk Engine (`/api/v1/readiness`)
- `GET /api/v1/readiness/dashboard`: Overall readiness summary and risk queues.
- `GET /api/v1/readiness/work-packages/{id}/chain`: 12-stage audited traceability chain.
- `GET /api/v1/readiness/work-packages/{id}/risk`: Explainable risk score with Rules A-G factor triggers.
- `POST /api/v1/readiness/work-packages/{id}/validate-acceptance`: Pre-flight acceptance check.
- `POST /api/v1/readiness/work-packages/{id}/accept`: Authoritative administrative acceptance (`readiness:accept`).

### 9. Dependency Graph & CPM Engine (`/api/v1/dependencies`)
- `GET /api/v1/dependencies/graph`: Topological DAG representation with critical path identification.
- `POST /api/v1/dependencies/simulate-delay`: Monte Carlo delay simulation across milestone dependencies.

### 10. Geographic GIS Map (`/api/v1/map`)
- `GET /api/v1/map/features`: GeoJSON feature collection of ghats, works, and assets.
- `GET /api/v1/map/zones/{id}/boundary`: Boundary polygon and safety perimeter coordinates.

### 11. Offline Field Sync (`/api/v1/offline`)
- `GET /api/v1/offline/assigned-inspections`: Download offline work pack for assigned inspector.
- `POST /api/v1/offline/sync`: Batch upload offline drafts with idempotent UUID deduplication.

### 12. Reports & Analytics (`/api/v1/reports`)
- `GET /api/v1/reports/data`: Multi-parameter query across all platform dimensions.
- `GET /api/v1/reports/export/csv`: Streaming CSV file export.
- `GET /api/v1/reports/export/pdf`: Official statutory PDF dossier.

### 13. Notifications & Action Queue (`/api/v1/notifications`)
- `GET /api/v1/notifications`: Paginated in-app notifications stream.
- `GET /api/v1/notifications/my-tasks`: Role-personalized urgent action queue.
- `POST /api/v1/notifications/{id}/read`: Mark notification as read.

### 14. Administration Hub (`/api/v1/admin`)
- `GET /api/v1/admin/roles-matrix`: Interactive RBAC matrix.
- `PUT /api/v1/admin/roles/{id}/permissions`: Update role permission profile.
- `GET /api/v1/admin/departments`: Department directory with live counts.
- `GET /api/v1/admin/zones`: Ghat location registry.
- `GET /api/v1/admin/checklist-templates`: Standardized inspection checklists.
- `GET /api/v1/admin/system-config`: Governance thresholds, Rule A-G weights, and Defect SLAs.
- `POST /api/v1/admin/demo-data-reset`: Protected sandbox reseed (passphrase `RESET-PUSHKARALU-2027`).
- `DELETE /api/v1/admin/audit-history`: Returns 403 Forbidden (Section 19 Invariant).
