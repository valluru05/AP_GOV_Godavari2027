import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


@pytest.fixture
def inspector_token():
    """Logs in as Field Inspector (user-inspector)."""
    resp = client.post("/api/v1/auth/login", json={
        "username_or_email": "inspector@civicproof.gov.in",
        "password": "InspectorPass123!"
    })
    assert resp.status_code == 200
    return resp.json()["access_token"]


@pytest.fixture
def admin_token():
    """Logs in as Super Administrator."""
    resp = client.post("/api/v1/auth/login", json={
        "username_or_email": "superadmin@civicproof.gov.in",
        "password": "AdminPass123!"
    })
    assert resp.status_code == 200
    return resp.json()["access_token"]


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
    """Logs in as Vendor 1 (Godavari Infra - vnd-001)."""
    resp = client.post("/api/v1/auth/login", json={
        "username_or_email": "vendor@infra-ap.com",
        "password": "VendorPass123!"
    })
    assert resp.status_code == 200
    return resp.json()["access_token"]


def test_list_defects_and_stats(inspector_token):
    """Verifies defect registry listing and statistics aggregation."""
    resp = client.get("/api/v1/defects", headers={"Authorization": f"Bearer {inspector_token}"})
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) >= 4

    codes = [d["defect_id"] for d in items]
    assert any("DEF-DW-001" in c for c in codes)
    assert any("DEF-SF-002" in c for c in codes)
    assert any("DEF-SN-003" in c for c in codes)

    stats_resp = client.get("/api/v1/defects/stats", headers={"Authorization": f"Bearer {inspector_token}"})
    assert stats_resp.status_code == 200
    stats = stats_resp.json()
    assert stats["total_defects"] >= 4
    assert stats["critical_defects"] >= 1
    assert stats["open_defects"] >= 1
    assert stats["awaiting_verification"] >= 1


def test_create_defect(inspector_token):
    """Verifies logging a new engineering defect ticket."""
    resp = client.post(
        "/api/v1/defects",
        headers={"Authorization": f"Bearer {inspector_token}"},
        json={
            "work_package_id": "wp-002",
            "title": "Sub-surface Trench Backfill Compaction Subsidence",
            "description": "Compaction density at chainage 0+240 failed proctor test. Subsidence of 45mm measured under pre-cast road bedding.",
            "category": "Structural Safety",
            "severity": "High",
            "target_resolution_date": "2026-11-08",
            "evidence_attachments": [
                {"name": "Subsidence_Measurement.jpg", "caption": "45mm subsidence dip along trench line"}
            ]
        }
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["defect_id"].startswith("DEF-")
    assert data["status"] == "Open"
    assert data["severity"] == "High"
    assert len(data["history"]) >= 1


def test_core_anticorruption_rule_vendor_rework_does_not_resolve(vendor_token, inspector_token):
    """
    CRITICAL ANTI-CORRUPTION & REWORK RULE:
    When a vendor submits rectification details and evidence, the defect transitions
    to 'Correction Submitted' / 'Verification Pending'.
    It must NOT automatically resolve or close without independent inspector re-inspection!
    """
    # Vendor submits rework for def-001
    resp = client.post(
        "/api/v1/defects/def-001/rework",
        headers={"Authorization": f"Bearer {vendor_token}"},
        json={
            "resolution_notes": "Replaced manifold inlet gasket with high-pressure EPDM vulcanized seal. Torqued flange bolts to 140 Nm with calibrated torque wrench.",
            "rework_evidence": [
                {"name": "New_Gasket_Installed.jpg", "caption": "EPDM seal seated on flange manifold"}
            ]
        }
    )
    assert resp.status_code == 200
    data = resp.json()
    # Status MUST be Correction Submitted, NOT Resolved or Closed!
    assert data["status"] == "Correction Submitted"
    assert data["status"] != "Resolved — Verification Passed"
    assert data["status"] != "Closed by Authorised User"
    assert data["rework_count"] >= 1
    assert len(data["rework_evidence"]) >= 1


def test_reinspect_defect_fail_mandates_further_rework(inspector_token):
    """
    When an inspector re-inspects a submitted correction and fails it,
    status returns to 'Rejected — Rework Required'.
    """
    resp = client.post(
        "/api/v1/defects/def-001/reinspect",
        headers={"Authorization": f"Bearer {inspector_token}"},
        json={
            "verdict": "Fail",
            "verification_notes": "Hydrostatic re-test repeated. Secondary leak observed at bleeder valve. Further rework required.",
            "reinspection_measurements": "Pressure dropped to 4.8 bar in 20 minutes"
        }
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "Rejected — Rework Required"
    assert data["verification_result"] == "Fail"


def test_reinspect_defect_pass_resolves_defect(vendor_token, inspector_token):
    """
    When inspector re-inspects after successful rework and issues a Pass verdict,
    defect transitions to 'Resolved — Verification Passed'.
    """
    # Vendor submits second rework
    client.post(
        "/api/v1/defects/def-001/rework",
        headers={"Authorization": f"Bearer {vendor_token}"},
        json={
            "resolution_notes": "Bleeder valve replaced with forged stainless steel valve. Pressure held steady at 6.0 bar for 45 minutes.",
            "rework_evidence": [
                {"name": "Pressure_Gauge_Hold_6bar.jpg", "caption": "Pressure sustained at 6.0 bar"}
            ]
        }
    )

    # Inspector verifies and PASSES
    resp = client.post(
        "/api/v1/defects/def-001/reinspect",
        headers={"Authorization": f"Bearer {inspector_token}"},
        json={
            "verdict": "Pass",
            "verification_notes": "Independent hydrostatic verification witnessed. 6.0 bar sustained for 30 minutes with zero pressure drop. Certified resolved.",
            "reinspection_measurements": "6.0 bar sustained (zero drop)"
        }
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "Resolved — Verification Passed"
    assert data["verification_result"] == "Pass"
    assert data["verified_at"] is not None


def test_authorized_defect_closure(muni_admin_token):
    """
    Authorised administrative closure by Municipal Administrator.
    """
    resp = client.post(
        "/api/v1/defects/def-001/close",
        headers={"Authorization": f"Bearer {muni_admin_token}"},
        json={
            "closure_notes": "Defect DEF-DW-001 formally closed following independent QAC inspector certification."
        }
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "Closed by Authorised User"
    assert data["closed_at"] is not None


def test_vendor_tenancy_boundary_cannot_rework_other_vendor_defect(vendor_token):
    """
    MULTI-TENANCY ISOLATION:
    Vendor 1 (vnd-001) cannot submit rework to a defect assigned to Vendor 3 (vnd-003, Sri Lakshmi Sanitation).
    POST /defects/def-003/rework must return 403 Forbidden.
    """
    resp = client.post(
        "/api/v1/defects/def-003/rework",
        headers={"Authorization": f"Bearer {vendor_token}"},
        json={
            "resolution_notes": "Unauthorized attempt to modify another contractor's defect ticket."
        }
    )
    assert resp.status_code == 403
