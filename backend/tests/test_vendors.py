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
    """Logs in as Vendor (Godavari Infra - vnd-001)."""
    resp = client.post("/api/v1/auth/login", json={
        "username_or_email": "vendor@infra-ap.com",
        "password": "VendorPass123!"
    })
    assert resp.status_code == 200
    return resp.json()["access_token"]


@pytest.fixture
def pm_token():
    """Logs in as Project Manager."""
    resp = client.post("/api/v1/auth/login", json={
        "username_or_email": "pm@civicproof.gov.in",
        "password": "PMPass123!"
    })
    assert resp.status_code == 200
    return resp.json()["access_token"]


def test_core_anticorruption_rule_100_percent_reported_progress_does_not_verify(vendor_token, muni_admin_token):
    """
    CRITICAL ANTI-CORRUPTION RULE:
    When a vendor submits 100% reported progress, reported_progress_percentage becomes 100.0,
    but verified_progress_percentage remains completely untouched, and the work package
    must NOT automatically transition to 'Verified Complete'.
    """
    # Check baseline status of wp-001
    baseline_resp = client.get("/api/v1/projects/prj-001", headers={"Authorization": f"Bearer {muni_admin_token}"})
    assert baseline_resp.status_code == 200
    wp_baseline = next(w for w in baseline_resp.json()["work_packages"] if w["id"] == "wp-001")
    baseline_verified = wp_baseline["verified_progress_percentage"]

    # Vendor submits 100% progress
    sub_resp = client.post(
        "/api/v1/vendors/progress-submissions",
        headers={"Authorization": f"Bearer {vendor_token}"},
        json={
            "work_package_id": "wp-001",
            "progress_percentage": 100.0,
            "activities_description": "All underground water piping laid, hydro-tested, and storage cistern completely commissioned.",
            "delay_or_blocker": "None. Full installation completed ahead of schedule.",
            "evidence_attachments": [
                {"name": "Pressure_Test_Certificate.pdf", "type": "pdf", "size_kb": 1250}
            ]
        }
    )
    assert sub_resp.status_code == 201
    sub_data = sub_resp.json()
    assert sub_data["progress_percentage"] == 100.0
    assert sub_data["submission_code"].startswith("SUB-2027-")
    assert sub_data["review_status"] == "Under Review"

    # Re-fetch work package to verify that verified progress did NOT change!
    after_resp = client.get("/api/v1/projects/prj-001", headers={"Authorization": f"Bearer {muni_admin_token}"})
    assert after_resp.status_code == 200
    wp_after = next(w for w in after_resp.json()["work_packages"] if w["id"] == "wp-001")
    
    # 1. Reported progress is updated
    assert wp_after["reported_progress_percentage"] == 100.0
    # 2. Verified progress is unchanged
    assert wp_after["verified_progress_percentage"] == baseline_verified
    # 3. Workflow state must NOT be 'Verified Complete'
    assert wp_after["workflow_state"] != "Verified Complete"


def test_vendor_cannot_review_or_approve_own_submissions(vendor_token, pm_token):
    """
    Conflict of Interest enforcement:
    A contractor cannot review, approve, or reject their own or any submissions.
    """
    # Vendor creates a submission on assigned work package wp-005
    sub_resp = client.post(
        "/api/v1/vendors/progress-submissions",
        headers={"Authorization": f"Bearer {vendor_token}"},
        json={
            "work_package_id": "wp-005",
            "progress_percentage": 55.0,
            "activities_description": "Secondary anchor cables reinforced with galvanized shackles.",
        }
    )
    assert sub_resp.status_code == 201
    sub_id = sub_resp.json()["id"]

    # Vendor attempts to review/approve their own submission -> HTTP 403 Forbidden
    vendor_review_resp = client.patch(
        f"/api/v1/vendors/progress-submissions/{sub_id}/review",
        headers={"Authorization": f"Bearer {vendor_token}"},
        json={
            "review_status": "Reviewed",
            "reviewer_notes": "Self-approving my company's progress."
        }
    )
    assert vendor_review_resp.status_code == 403

    # Authorized Project Manager reviews the submission -> HTTP 200 OK
    pm_review_resp = client.patch(
        f"/api/v1/vendors/progress-submissions/{sub_id}/review",
        headers={"Authorization": f"Bearer {pm_token}"},
        json={
            "review_status": "Reviewed",
            "reviewer_notes": "Site inspection confirmed cable tension and shackles."
        }
    )
    assert pm_review_resp.status_code == 200
    assert pm_review_resp.json()["review_status"] == "Reviewed"
    assert pm_review_resp.json()["reviewer_notes"] == "Site inspection confirmed cable tension and shackles."


def test_vendor_cannot_submit_to_other_vendors_work_package(vendor_token):
    """
    Multi-tenancy boundary check:
    Vendor 'vnd-001' cannot submit progress for work package 'wp-003' assigned to 'vnd-002'.
    """
    resp = client.post(
        "/api/v1/vendors/progress-submissions",
        headers={"Authorization": f"Bearer {vendor_token}"},
        json={
            "work_package_id": "wp-003",  # Assigned to Delta Water Solutions (vnd-002)
            "progress_percentage": 50.0,
            "activities_description": "Attempting cross-vendor unauthorized submission.",
        }
    )
    assert resp.status_code == 403
    assert "not authorized" in resp.json()["detail"].lower()


def test_vendor_portal_tenancy_boundary(vendor_token, muni_admin_token):
    """
    A vendor accessing `/api/v1/vendors/me/dashboard` gets their own workspace.
    Attempting to access another vendor's dashboard directly returns 403.
    """
    # Vendor accesses own dashboard via /me/dashboard
    me_resp = client.get("/api/v1/vendors/me/dashboard", headers={"Authorization": f"Bearer {vendor_token}"})
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["vendor"]["id"] == "vnd-001"
    assert "assigned_work_packages" in me_data
    assert "metrics" in me_data

    # Vendor attempts to access vnd-002 dashboard directly -> 403 Forbidden
    other_resp = client.get("/api/v1/vendors/vnd-002/dashboard", headers={"Authorization": f"Bearer {vendor_token}"})
    assert other_resp.status_code == 403

    # Municipal Admin CAN access any vendor's dashboard
    admin_view_resp = client.get("/api/v1/vendors/vnd-002/dashboard", headers={"Authorization": f"Bearer {muni_admin_token}"})
    assert admin_view_resp.status_code == 200
    assert admin_view_resp.json()["vendor"]["id"] == "vnd-002"


def test_immutable_audit_logged_on_vendor_progress_and_review(vendor_token, pm_token, muni_admin_token):
    """
    Submitting progress and reviewing progress must both write immutable audit records (EVT-...).
    """
    # 1. Submit progress on assigned package wp-005
    sub_resp = client.post(
        "/api/v1/vendors/progress-submissions",
        headers={"Authorization": f"Bearer {vendor_token}"},
        json={
            "work_package_id": "wp-005",
            "progress_percentage": 60.0,
            "activities_description": "Cast intermediate concrete ring beam for barrier anchoring.",
        }
    )
    assert sub_resp.status_code == 201
    sub_id = sub_resp.json()["id"]


    # 2. Review progress
    rev_resp = client.patch(
        f"/api/v1/vendors/progress-submissions/{sub_id}/review",
        headers={"Authorization": f"Bearer {pm_token}"},
        json={
            "review_status": "Reviewed",
            "reviewer_notes": "Verified ring beam dimensions."
        }
    )
    assert rev_resp.status_code == 200

    # 3. Check audit explorer
    audit_resp = client.get("/api/v1/audit", headers={"Authorization": f"Bearer {muni_admin_token}"})
    assert audit_resp.status_code == 200
    events = audit_resp.json()

    submission_events = [e for e in events if e["action"] == "VENDOR_PROGRESS_SUBMITTED"]
    review_events = [e for e in events if e["action"] == "VENDOR_PROGRESS_REVIEWED"]

    assert len(submission_events) > 0
    assert len(review_events) > 0

