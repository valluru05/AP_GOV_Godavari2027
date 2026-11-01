# CivicProof Offline-First Field Verification Architecture

## Context & Requirements
During major municipal events such as **Godavari Pushkaralu 2027**, high crowd densities along riverfront ghats frequently cause cellular network congestion or complete connectivity dropouts.

CivicProof enforces an **offline-first field architecture** (Section 16 of the specification) allowing field engineering inspectors to download their scheduled daily audits, conduct checklist verifications, attach photos with cached GPS coordinates, log defects, and queue them for guaranteed synchronization when connectivity resumes.

---

## Local Client-Side Architecture

```
[Inspector Tablet / Mobile]
   │
   ├── 1. Service Worker & Application Cache (PWA)
   │      └── Static assets cached for complete offline usability
   │
   ├── 2. IndexedDB Draft Store (`civicproof_offline_db`)
   │      ├── `assigned_inspections`: Cached checklist definitions & project specs
   │      ├── `evidence_vault`: Local blob store for high-resolution site photos
   │      └── `sync_queue`: Ordered queue of client execution records
   │
   └── 3. Background Sync Engine
          ├── Listens for browser `online` events
          ├── Generates client submission UUIDs (`cli-...`)
          └── Transmits atomic batch POST payloads to `/api/v1/offline/sync`
```

---

## Server-Side Synchronization & Conflict Resolution

### 1. Idempotent Deduplication (No Duplicate Submissions)
- Every client mutation generates a deterministic `client_submission_id` (e.g. `cli-f47ac10b-...`).
- The backend checks `offline_sync_log` before applying any database write.
- If the same submission ID is uploaded multiple times due to network retries, the server recognizes the idempotent record and returns `{ "status": "duplicate_ignored" }` with 200 OK.

### 2. Conflict Handling & Version Control
When an inspection or defect was modified concurrently on the server while the inspector was offline:
- **Last-Authoritative-Inspection Rule:** If an inspection was already marked `Passed` or `Reviewed` by a supervisory authority, the offline execution is flagged as a conflict.
- **Audited Divergence Record:** Conflicting offline submissions are quarantined in the audit ledger with reason `CONCURRENT_SERVER_MUTATION` for administrative review rather than silently overwriting server state.

### 3. Geofencing Validation in Offline Mode
- The mobile tablet captures device hardware GPS coordinates (`latitude`, `longitude`, `gps_accuracy_meters`) at the instant of inspection execution.
- Upon upload, the backend verifies the coordinates against the registered Ghat perimeter geofence (`16.9800 - 17.0200 N, 81.7500 - 81.8000 E`).
- Submissions executed within tolerance receive `is_geofence_verified: true`.
