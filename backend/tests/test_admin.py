import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.models.user import AuditEvent

client = TestClient(app)


def get_token(username_or_email: str, password: str) -> str:
    r = client.post("/api/v1/auth/login", json={"username_or_email": username_or_email, "password": password})
    assert r.status_code == 200, f"Login failed for {username_or_email}: {r.text}"
    return r.json()["access_token"]


@pytest.fixture
def admin_headers():
    token = get_token("superadmin@civicproof.gov.in", "AdminPass123!")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def vendor_headers():
    token = get_token("vendor@infra-ap.com", "VendorPass123!")
    return {"Authorization": f"Bearer {token}"}


def test_get_roles_matrix(admin_headers):
    """Verify role-permission matrix returns all system roles and categorized permissions."""
    res = client.get("/api/v1/admin/roles-matrix", headers=admin_headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert "roles" in data
    assert "categories" in data
    assert len(data["roles"]) >= 4
    assert len(data["categories"]) >= 3


def test_update_role_permissions(admin_headers):
    """Verify modifying role permissions updates database and records audit trail."""
    matrix_res = client.get("/api/v1/admin/roles-matrix", headers=admin_headers)
    roles = matrix_res.json()["roles"]
    target_role = next(r for r in roles if r["id"] == "field_inspector")

    new_perm_set = list(set(target_role["permission_ids"] + ["reports:read"]))

    update_res = client.post(
        f"/api/v1/admin/roles/{target_role['id']}/permissions",
        json={"permission_ids": new_perm_set},
        headers=admin_headers
    )
    assert update_res.status_code == 200
    updated = update_res.json()
    assert "reports:read" in updated["permission_ids"]

    # Verify audit event
    db = SessionLocal()
    try:
        ev = db.query(AuditEvent).filter(
            AuditEvent.action == "ROLE_PERMISSIONS_UPDATED",
            AuditEvent.entity_id == target_role["id"]
        ).order_by(AuditEvent.created_at.desc()).first()
        assert ev is not None
        assert "reports:read" in str(ev.details)
    finally:
        db.close()


def test_departments_crud(admin_headers):
    """Verify creating and updating departments with project/user counts."""
    code = f"DIS{int(pytest.importorskip('time').time()) % 10000}"
    create_res = client.post(
        "/api/v1/admin/departments",
        json={
            "code": code,
            "name": "Disaster Management & Fire Response",
            "description": "Emergency command and response center for Godavari 2027"
        },
        headers=admin_headers
    )
    assert create_res.status_code == 201
    created = create_res.json()
    dept_id = created["id"]
    assert created["code"] == code

    # Update
    update_res = client.put(
        f"/api/v1/admin/departments/{dept_id}",
        json={"name": "State Disaster Response & Emergency Force"},
        headers=admin_headers
    )
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "State Disaster Response & Emergency Force"


def test_zones_crud(admin_headers):
    """Verify creating and modifying Pushkaralu festival zones and ghat perimeters."""
    code = f"GHAT-{int(pytest.importorskip('time').time()) % 10000}"
    create_res = client.post(
        "/api/v1/admin/zones",
        json={
            "code": code,
            "name": "Markandeya Ghat",
            "description": "Pilgrim transit bathing zone",
            "latitude": 16.9912,
            "longitude": 81.7654
        },
        headers=admin_headers
    )
    assert create_res.status_code == 201
    created = create_res.json()
    zone_id = created["id"]

    # Update
    update_res = client.put(
        f"/api/v1/admin/zones/{zone_id}",
        json={"name": "Sri Markandeya Swamy Temple Ghat", "is_active": True},
        headers=admin_headers
    )
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Sri Markandeya Swamy Temple Ghat"


def test_checklist_templates_crud(admin_headers):
    """Verify checklist templates listing, auto-seeding, and creation."""
    # List templates (auto-seeded)
    list_res = client.get("/api/v1/admin/checklist-templates", headers=admin_headers)
    assert list_res.status_code == 200
    templates = list_res.json()
    assert len(templates) >= 3

    # Create new template
    tpl_code = f"TPL-CRW-{int(pytest.importorskip('time').time()) % 10000}"
    create_res = client.post(
        "/api/v1/admin/checklist-templates",
        json={
            "template_code": tpl_code,
            "name": "Crowd Control Barricade Safety Protocol",
            "category": "Crowd Management",
            "version": "v1.0",
            "description": "Verification of crush barriers and emergency exit chutes",
            "items": [
                {
                    "id": "chk-crw-1",
                    "title": "Barricade Anchor Depth and Sway Resistance",
                    "check_type": "measurement",
                    "mandatory": True,
                    "requires_photo": True,
                    "acceptance_criteria": "Minimum 450mm ground embedment, zero lateral displacement under 1.5kN load."
                }
            ]
        },
        headers=admin_headers
    )
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["template_code"] == tpl_code
    assert len(created["items"]) == 1


def test_system_config_crud(admin_headers):
    """Verify retrieval and modification of system parameters, risk weights, and defect SLAs."""
    get_res = client.get("/api/v1/admin/config", headers=admin_headers)
    assert get_res.status_code == 200
    cfg = get_res.json()
    assert "project_categories" in cfg
    assert "risk_weights" in cfg
    assert "defect_sla_rules" in cfg
    assert cfg["data_retention_days"] >= 365

    # Update retention and categories
    update_res = client.put(
        "/api/v1/admin/config",
        json={
            "data_retention_days": 2555,
            "project_categories": cfg["project_categories"] + ["Pilgrim Amenities"]
        },
        headers=admin_headers
    )
    assert update_res.status_code == 200
    updated = update_res.json()
    assert "Pilgrim Amenities" in updated["project_categories"]
    assert updated["data_retention_days"] == 2555


def test_demo_data_reset_validation(admin_headers, vendor_headers):
    """Verify demo-data reset validates confirmation token and rejects unauthorized access."""
    # 1. Reject without permission
    denied = client.post(
        "/api/v1/admin/demo-data/reset",
        json={"confirmation_code": "RESET-PUSHKARALU-2027", "reason": "Standard pilot reset test"},
        headers=vendor_headers
    )
    assert denied.status_code == 403

    # 2. Reject wrong confirmation code
    invalid = client.post(
        "/api/v1/admin/demo-data/reset",
        json={"confirmation_code": "WRONG-CODE", "reason": "Testing invalid code rejection"},
        headers=admin_headers
    )
    assert invalid.status_code == 400
    assert "Invalid confirmation code" in invalid.json()["detail"]

    # 3. Success with valid confirmation code
    valid = client.post(
        "/api/v1/admin/demo-data/reset",
        json={"confirmation_code": "RESET-PUSHKARALU-2027", "reason": "Statutory audit verification test of demo reset mechanism"},
        headers=admin_headers
    )
    assert valid.status_code == 200
    data = valid.json()
    assert data["status"] == "success"
    assert data["reseeded_counts"]["projects"] >= 1


def test_audit_history_protection_invariant(admin_headers):
    """
    Enforces Section 19 invariant:
    'Never allow an administrator to delete audit history through the normal application interface.'
    """
    res = client.delete("/api/v1/admin/audit-history", headers=admin_headers)
    assert res.status_code == 403
    assert "STATUTORY AUDIT INVARIANT VIOLATION" in res.json()["detail"]
