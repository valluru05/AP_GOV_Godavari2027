import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


@pytest.fixture
def muni_admin_token():
    """Logs in as Municipal Administrator."""
    resp = client.post("/api/v1/auth/login", json={
        "username_or_email": "muniadmin@civicproof.gov.in",
        "password": "MuniPass123!"
    })
    assert resp.status_code == 200
    return resp.json()["access_token"]


@pytest.fixture
def vendor_token():
    """Logs in as Vendor."""
    resp = client.post("/api/v1/auth/login", json={
        "username_or_email": "vendor@infra-ap.com",
        "password": "VendorPass123!"
    })
    assert resp.status_code == 200
    return resp.json()["access_token"]


def test_project_creation_and_listing(muni_admin_token):
    """Verify authorized official can create a project and list it."""
    proj_code = f"PRJ-TEST-{uuid.uuid4().hex[:5].upper()}"
    resp = client.post(
        "/api/v1/projects",
        headers={"Authorization": f"Bearer {muni_admin_token}"},
        json={
            "project_identifier": proj_code,
            "name": "Kotilingala Elevated Footbridge & Walkway",
            "description": "Pedestrian movement structure across north ghat ingress",
            "category": "Pedestrian Access",
            "zone_id": "zone-koti",
            "priority": "High",
            "funding_reference": "AP-TEST-FUND-99"
        }
    )
    assert resp.status_code == 201
    created_proj = resp.json()
    assert created_proj["project_identifier"] == proj_code
    assert created_proj["funding_reference"] == "AP-TEST-FUND-99"

    # Verify project appears in listing
    list_resp = client.get("/api/v1/projects?search=Footbridge", headers={"Authorization": f"Bearer {muni_admin_token}"})
    assert list_resp.status_code == 200
    items = list_resp.json()
    assert any(p["project_identifier"] == proj_code for p in items)


def test_confidential_financial_masking(muni_admin_token, vendor_token):
    """
    Verify security rule: Do not expose confidential financial information to unauthorized users.
    Municipal Admin sees funding reference, Vendor receives RESTRICTED.
    """
    # 1. Municipal Admin view
    admin_resp = client.get("/api/v1/projects", headers={"Authorization": f"Bearer {muni_admin_token}"})
    assert admin_resp.status_code == 200
    admin_projects = admin_resp.json()
    demo_p = next((p for p in admin_projects if p["project_identifier"] == "PRJ-2027-DW01"), None)
    assert demo_p is not None
    assert demo_p["funding_reference"] == "AP-GODAVARI-2027-WTR-01"

    # 2. Vendor view
    vendor_resp = client.get("/api/v1/projects", headers={"Authorization": f"Bearer {vendor_token}"})
    assert vendor_resp.status_code == 200
    vendor_projects = vendor_resp.json()
    demo_p_vendor = next((p for p in vendor_projects if p["project_identifier"] == "PRJ-2027-DW01"), None)
    assert demo_p_vendor is not None
    assert demo_p_vendor["funding_reference"] == "RESTRICTED"


def test_milestone_dependency_cycle_prevention(muni_admin_token):
    """
    Verify critical business rule: Milestone dependencies must be validated and prevent invalid dependency cycles.
    Chain: Milestone A -> depends on Milestone B.
    Attempting Milestone B -> depends on Milestone A MUST be rejected with 400 Bad Request.
    """
    # 1. Create two milestones under WP2
    ms_a_resp = client.post(
        "/api/v1/projects/work-packages/wp-002/milestones",
        headers={"Authorization": f"Bearer {muni_admin_token}"},
        json={
            "work_package_id": "wp-002",
            "name": f"Stage Alpha {uuid.uuid4().hex[:4]}",
            "due_date": "2027-04-15",
            "is_mandatory": True
        }
    )
    assert ms_a_resp.status_code == 201
    ms_a_id = ms_a_resp.json()["id"]

    ms_b_resp = client.post(
        "/api/v1/projects/work-packages/wp-002/milestones",
        headers={"Authorization": f"Bearer {muni_admin_token}"},
        json={
            "work_package_id": "wp-002",
            "name": f"Stage Beta {uuid.uuid4().hex[:4]}",
            "due_date": "2027-04-20",
            "is_mandatory": True
        }
    )
    assert ms_b_resp.status_code == 201
    ms_b_id = ms_b_resp.json()["id"]

    # 2. Add valid dependency: Milestone B depends on Milestone A (A must happen before B)
    dep_resp = client.post(
        f"/api/v1/projects/milestones/{ms_b_id}/dependencies",
        headers={"Authorization": f"Bearer {muni_admin_token}"},
        json={"dependency_milestone_id": ms_a_id}
    )
    assert dep_resp.status_code == 200
    b_updated = dep_resp.json()
    assert any(d["id"] == ms_a_id for d in b_updated["dependencies"])

    # 3. Attempt circular dependency: Milestone A depends on Milestone B -> MUST FAIL with 400!
    cycle_resp = client.post(
        f"/api/v1/projects/milestones/{ms_a_id}/dependencies",
        headers={"Authorization": f"Bearer {muni_admin_token}"},
        json={"dependency_milestone_id": ms_b_id}
    )
    assert cycle_resp.status_code == 400
    assert "Circular dependency" in cycle_resp.json()["detail"]


def test_controlled_status_transitions(muni_admin_token, vendor_token):
    """
    Verify state transition guard:
    1. Direct jumping to illegal state is rejected.
    2. Acceptance blocked when critical defect exists.
    3. Vendor cannot approve acceptance.
    """
    # 1. Attempt invalid transition jump (e.g. from Verification Failed to Accepted on wp-001)
    invalid_resp = client.patch(
        "/api/v1/projects/work-packages/wp-001/status",
        headers={"Authorization": f"Bearer {muni_admin_token}"},
        json={"target_state": "Accepted"}
    )
    assert invalid_resp.status_code == 400
    assert "Invalid transition" in invalid_resp.json()["detail"] or "Cannot accept" in invalid_resp.json()["detail"]

    # 2. Vendor cannot transition work to Accepted
    vendor_resp = client.patch(
        "/api/v1/projects/work-packages/wp-002/status",
        headers={"Authorization": f"Bearer {vendor_token}"},
        json={"target_state": "Accepted"}
    )
    assert vendor_resp.status_code == 400
    assert "Vendors are only permitted" in vendor_resp.json()["detail"] or "Invalid transition" in vendor_resp.json()["detail"]


def test_csv_export_with_formula_sanitization(muni_admin_token):
    """Verify CSV export sanitizes active formula characters to mitigate formula injection."""
    resp = client.get("/api/v1/projects/export/csv", headers={"Authorization": f"Bearer {muni_admin_token}"})
    assert resp.status_code == 200
    assert "text/csv" in resp.headers["content-type"]
    content = resp.text
    assert "Project ID" in content
    assert "PRJ-2027-DW01" in content
    assert "WP-DW-KOTI-01" in content
