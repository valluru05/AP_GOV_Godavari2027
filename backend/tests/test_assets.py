import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def get_token(username_or_email: str, password: str = "AssetPass123!") -> str:
    r = client.post("/api/v1/auth/login", json={"username_or_email": username_or_email, "password": password})
    assert r.status_code == 200, f"Login failed for {username_or_email}: {r.text}"
    return r.json()["access_token"]


@pytest.fixture
def asset_mgr_headers():
    token = get_token("assets@civicproof.gov.in", "AssetPass123!")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def muni_admin_headers():
    token = get_token("muniadmin@civicproof.gov.in", "MuniPass123!")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def vendor_headers():
    token = get_token("vendor@infra-ap.com", "VendorPass123!")
    return {"Authorization": f"Bearer {token}"}


def test_list_assets_and_stats(asset_mgr_headers):
    # 1. List assets
    res = client.get("/api/v1/assets", headers=asset_mgr_headers)
    assert res.status_code == 200
    assets = res.json()
    assert len(assets) >= 4
    codes = [a["asset_code"] for a in assets]
    assert "AST-RO-KOTI-01" in codes
    assert "AST-BIO-PUSH-01" in codes

    # 2. Get stats
    s_res = client.get("/api/v1/assets/stats", headers=asset_mgr_headers)
    assert s_res.status_code == 200
    stats = s_res.json()
    assert stats["total_assets"] >= 4
    assert stats["operationally_ready_count"] >= 1
    assert "Drinking-water units" in stats["assets_by_category"]


def test_get_asset_detail_and_readiness_rule(asset_mgr_headers):
    # ast-001 has Verification Failed and active defect DEF-DW-001
    res = client.get("/api/v1/assets/ast-001", headers=asset_mgr_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["asset_code"] == "AST-RO-KOTI-01"
    assert data["qr_data_url"].startswith("data:image/png;base64,")
    assert data["is_operationally_ready"] is False
    assert data["readiness_badge_variant"] == "error"
    assert data["open_defect_count"] >= 1


def test_lookup_asset_by_opaque_qr(asset_mgr_headers):
    # Lookup ast-002 by QR token
    res = client.get("/api/v1/assets/lookup/qr/QR-AST-SN-PUSH-040", headers=asset_mgr_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == "ast-002"
    assert data["name"] == "40-Bay Bio-Sanitation Complex (Pushkar)"
    assert data["is_operationally_ready"] is True
    assert data["readiness_badge_variant"] == "success"


def test_get_printable_qr_label(asset_mgr_headers):
    res = client.get("/api/v1/assets/ast-002/qr-label", headers=asset_mgr_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["pushkaralu_event"] == "Godavari Pushkaralu 2027"
    assert data["asset_code"] == "AST-BIO-PUSH-01"
    assert data["qr_data_url"].startswith("data:image/png;base64,")
    assert "https://civicproof.ap.gov.in" in data["verification_url"]


def test_create_new_asset(asset_mgr_headers):
    payload = {
        "name": "Kotilingala Pilgrim Information Kiosk & Telemetry",
        "category": "Signage",
        "description": "High-brightness dual-sided dynamic LED passenger guidance display",
        "department": "Municipal Information & Tourism Wing",
        "location_name": "Kotilingala Ghat — Main Gate Entrance",
        "zone_id": "zone-koti",
        "project_id": "prj-003",
        "serial_number": "SN-INFO-2027-001",
        "model_number": "LED-Sign-Omni-P4",
        "lifecycle_status": "Planned"
    }
    res = client.post("/api/v1/assets", json=payload, headers=asset_mgr_headers)
    assert res.status_code == 201
    created = res.json()
    assert created["asset_code"].startswith("AST-SG-KOTI-")
    assert created["qr_identifier"].startswith("QR-AST-SG-KOTI-")
    assert created["is_operationally_ready"] is False


def test_transition_blocked_if_critical_defect_exists(asset_mgr_headers):
    # ast-001 has critical gasket leak DEF-DW-001. Section 12 mandates it CANNOT be declared Operationally Ready!
    payload = {
        "new_status": "Operationally Ready",
        "reason": "Contractor verbally stated work is finished",
        "notes": "Attempting premature sign-off"
    }
    res = client.post("/api/v1/assets/ast-001/transition", json=payload, headers=asset_mgr_headers)
    assert res.status_code == 400
    assert "Cannot mark asset" in res.json()["detail"]
    assert "Critical/High defect" in res.json()["detail"]


def test_add_maintenance_log_and_recovery(asset_mgr_headers):
    # ast-004 is currently Maintenance Required. Add maintenance completion.
    payload = {
        "maintenance_type": "Anchor Retensioning & Anode Replacement",
        "technician_name": "Diver K. Somasekhar (Marine Team)",
        "summary": "Replaced corroded zinc anodes and retensioned anchor chain to 35 kN. Re-inspected underwater.",
        "status": "Completed"
    }
    res = client.post("/api/v1/assets/ast-004/maintenance", json=payload, headers=asset_mgr_headers)
    assert res.status_code == 200
    updated = res.json()
    assert len(updated["maintenance_history"]) >= 2
    assert updated["maintenance_history"][0]["technician_name"] == "Diver K. Somasekhar (Marine Team)"
    assert updated["lifecycle_status"] == "Accepted"


def test_vendor_rbac_boundary(vendor_headers):
    # Vendors cannot register municipal assets or transition asset lifecycle
    payload = {
        "name": "Vendor Unauthorized Asset",
        "category": "Signage",
        "lifecycle_status": "Operationally Ready"
    }
    res = client.post("/api/v1/assets", json=payload, headers=vendor_headers)
    assert res.status_code == 403
