# CivicProof Database Schema Documentation

## Entity Relationship Overview
The database uses normalized relational structures with foreign-key constraints, indexes on lookup fields, timezone-aware UTC timestamps, and UUID primary keys.

```mermaid
erDiagram
    DEPARTMENT ||--o{ USER : "employs"
    USER }o--o{ ROLE : "assigned via user_roles"
    ROLE }o--o{ PERMISSION : "grants via role_permissions"
    USER ||--o{ AUDIT_EVENT : "actors"
    
    USER {
        string id PK "UUID"
        string email UK "Unique, Indexed"
        string username UK "Unique, Indexed"
        string full_name "Display Name"
        string phone "Contact Number"
        string hashed_password "Argon2id Hash"
        string department_id FK
        string vendor_id "Nullable FK"
        boolean is_active "Default True"
        timestamp created_at "UTC"
        timestamp updated_at "UTC"
    }

    ROLE {
        string id PK "System Slug e.g. field_inspector"
        string name "Display Name"
        string description "Role Description"
        boolean is_system_role "Default True"
        timestamp created_at "UTC"
    }

    PERMISSION {
        string id PK "Key e.g. projects:create"
        string name "Display Name"
        string category "Domain Category"
        string description "Details"
    }

    AUDIT_EVENT {
        string id PK "UUID"
        string event_id UK "Unique e.g. EVT-YYYYMMDD-HEX"
        string actor_id FK "User UUID"
        string actor_email "Actor Email"
        string action "Event Name"
        string entity_type "Entity Category"
        string entity_id "Entity Key"
        text reason "Decision Reason"
        json details "Context & Payload Diff"
        string ip_address "Client IP"
        timestamp created_at "UTC Index"
    }
```

## Security & Immutability Rules
1. `audit_events` is strictly append-only. No application API or UI route exposes `UPDATE` or `DELETE` capabilities.
2. User deactivation updates `is_active = False` rather than hard deletion to preserve historical foreign-key integrity in inspections and approvals.
