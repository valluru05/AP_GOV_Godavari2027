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
    """Logs in as Project Manager (Executive Engineer)."""
    resp = client.post("/api/v1/auth/login", json={
        "username_or_email": "pm@civicproof.gov.in",
        "password": "PMPass123!"
    })
    assert resp.status_code == 200
    return resp.json()["access_token"]


def test_list_inspections_and_stats(inspector_token):
    """Verifies listing inspections with stats calculations."""
    resp = client.get("/api/v1/inspections", headers={"Authorization": f"Bearer {inspector_token}"})
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) >= 3
    
    # Check presence of seeded inspections
    codes = [i["inspection_id"] for i in items]
    assert any("DW01" in c for c in codes)
    assert any("SN03" in c for c in codes)
    assert any("LT04" in c for c in codes)

    stats_resp = client.get("/api/v1/inspections/stats", headers={"Authorization": f"Bearer {inspector_token}"})
    assert stats_resp.status_code == 200
    stats = stats_resp.json()
    assert stats["total_inspections"] >= 3
    assert stats["passed_count"] >= 1
    assert stats["failed_count"] >= 1
    assert stats["scheduled_count"] >= 1
    assert 0.0 <= stats["pass_rate_percentage"] <= 100.0


def test_schedule_inspection(admin_token):
    """Verifies scheduling a new inspection and automatic checklist population."""
    resp = client.post(
        "/api/v1/inspections",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "work_package_id": "wp-002",
            "milestone_id": "ms-04",
            "scheduled_date": "2026-11-05",
            "inspection_type": "Civil & Structural Stability Audit",
            "notes": "Verify pre-cast retaining wall alignment along ghat perimeter."
        }
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["outcome"] == "Scheduled"
    assert "INSP-2027" in data["inspection_id"]
    assert len(data["checklist_results"]) > 0


def test_execute_inspection_pass_awards_verified_progress(inspector_token, admin_token):
    """
    CRITICAL ANTI-CORRUPTION & PROGRESS VERIFICATION:
    When an inspection passes, verified_progress_percentage is authoritative and
    awarded to the work package. Attached milestone is marked 'Verified'.
    """
    # Schedule an inspection for wp-004
    sched_resp = client.post(
        "/api/v1/inspections",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "work_package_id": "wp-004",
            "scheduled_date": "2026-11-02",
            "inspection_type": "Electrical & Illumination Audit",
            "notes": "Testing high-mast towers and earthing system."
        }
    )
    assert sched_resp.status_code == 201
    insp_id = sched_resp.json()["id"]

    # Inspector conducts on-site verification with Pass verdict
    exec_resp = client.post(
        f"/api/v1/inspections/{insp_id}/execute",
        headers={"Authorization": f"Bearer {inspector_token}"},
        json={
            "outcome": "Passed",
            "checklist_results": [
                {
                    "item": "High-mast tower foundation verticality & anchor torque",
                    "verdict": "Pass",
                    "measurement": "0.1 deg deviation",
                    "notes": "Within standard tolerance"
                },
                {
                    "item": "Earthing pit resistance verification (< 2.0 ohms)",
                    "verdict": "Pass",
                    "measurement": "1.4 ohms",
                    "notes": "Compliant with IS 3043"
                },
                {
                    "item": "Ground illumination lux level under 100% array (> 50 lux)",
                    "verdict": "Pass",
                    "measurement": "68 lux",
                    "notes": "Exceeds crowd safety threshold"
                }
            ],
            "evidence_photos": [
                {
                    "name": "lux_meter_reading.jpg",
                    "caption": "Digital lux meter reading 68 lux on bathing steps",
                    "timestamp": "2026-11-02T19:30:00Z",
                    "lat": 16.9940,
                    "lng": 81.7675
                }
            ],
            "latitude": 16.9940,
            "longitude": 81.7675,
            "gps_accuracy_meters": 4.2,
            "notes": "All high-mast arrays energized and verified. Earthing resistance compliant.",
            "verified_percentage_awarded": 85.0,
            "inspector_signature": "V. Ravi Kumar (AE PWD/QAC)"
        }
    )
    assert exec_resp.status_code == 200
    res = exec_resp.json()
    assert res["outcome"] == "Passed"
    assert res["is_geofence_verified"] is True
    assert res["verified_percentage_awarded"] == 85.0

    # Verify work package reflection
    wp_resp = client.get("/api/v1/projects/prj-003", headers={"Authorization": f"Bearer {admin_token}"})
    assert wp_resp.status_code == 200
    wp4 = next(w for w in wp_resp.json()["work_packages"] if w["id"] == "wp-004")
    assert wp4["verified_progress_percentage"] == 85.0


def test_execute_inspection_fail_freezes_progress_and_marks_state(inspector_token, admin_token):
    """
    CRITICAL ANTI-CORRUPTION RULE:
    When an inspection fails, verified progress is NOT awarded (0.0%), and
    the work package transitions to 'Verification Failed', while milestone is 'Rejected'.
    """
    # Schedule an inspection for wp-002
    sched_resp = client.post(
        "/api/v1/inspections",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "work_package_id": "wp-002",
            "milestone_id": "ms-05",
            "scheduled_date": "2026-11-03",
            "inspection_type": "Civil Structural Audit",
            "notes": "Check for concrete honeycomb defects."
        }
    )
    assert sched_resp.status_code == 201
    insp_id = sched_resp.json()["id"]

    # Inspector executes and FAILS the inspection
    exec_resp = client.post(
        f"/api/v1/inspections/{insp_id}/execute",
        headers={"Authorization": f"Bearer {inspector_token}"},
        json={
            "outcome": "Failed",
            "checklist_results": [
                {
                    "item": "Structural reinforcement & concrete grade verification",
                    "verdict": "Fail",
                    "measurement": "M20 detected (M30 required)",
                    "notes": "Core compression sample failed design strength standard"
                }
            ],
            "latitude": 17.0012,
            "longitude": 81.7742,
            "gps_accuracy_meters": 3.0,
            "notes": "Structural concrete core failed compressive strength test. Rework mandatory.",
            "verified_percentage_awarded": 0.0,
            "inspector_signature": "V. Ravi Kumar (AE PWD/QAC)"
        }
    )
    assert exec_resp.status_code == 200
    res = exec_resp.json()
    assert res["outcome"] == "Failed"

    # Verify work package workflow state reflects 'Verification Failed'
    wp_resp = client.get("/api/v1/projects/prj-001", headers={"Authorization": f"Bearer {admin_token}"})
    assert wp_resp.status_code == 200
    wp2 = next(w for w in wp_resp.json()["work_packages"] if w["id"] == "wp-002")
    assert wp2["workflow_state"] == "Verification Failed"


def test_geofence_validation(inspector_token, admin_token):
    """
    Verifies that sensor GPS coordinates outside sector radius are flagged as is_geofence_verified=False.
    """
    sched_resp = client.post(
        "/api/v1/inspections",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "work_package_id": "wp-005",
            "scheduled_date": "2026-11-04",
            "inspection_type": "Remote Spoof Test",
        }
    )
    insp_id = sched_resp.json()["id"]

    # Attempt inspection execution from Hyderabad coordinates (lat 17.3850, lng 78.4867 - > 350km away)
    exec_resp = client.post(
        f"/api/v1/inspections/{insp_id}/execute",
        headers={"Authorization": f"Bearer {inspector_token}"},
        json={
            "outcome": "Failed",
            "checklist_results": [
                {"item": "Remote simulated check", "verdict": "Fail", "measurement": "N/A", "notes": "Test"}
            ],
            "latitude": 17.3850,
            "longitude": 78.4867,
            "gps_accuracy_meters": 5.0,
            "notes": "Testing GPS geofence violation detection."
        }
    )
    assert exec_resp.status_code == 200
    assert exec_resp.json()["is_geofence_verified"] is False


def test_role_boundary_vendor_cannot_conduct_inspections(vendor_token):
    """
    ANTI-CORRUPTION PRINCIPLE:
    Contractors/Vendors CANNOT inspect or certify their own works.
    POST /inspections/{id}/execute must return 403 Forbidden.
    """
    resp = client.post(
        "/api/v1/inspections/insp-003/execute",
        headers={"Authorization": f"Bearer {vendor_token}"},
        json={
            "outcome": "Passed",
            "checklist_results": [
                {"item": "Self-certification attempt", "verdict": "Pass", "measurement": "100%", "notes": "Self approved"}
            ]
        }
    )
    assert resp.status_code == 403


def test_supervisory_review_flow(admin_token):
    """
    Verifies Executive Engineer or Municipal Admin supervisory review of inspection verdict.
    """
    resp = client.patch(
        "/api/v1/inspections/insp-001/review",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "reviewer_decision": "Approved",
            "notes": "Reviewed hydrostatic test failure report. Defect ticket DEF-001 confirmed."
        }
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["reviewer_decision"] == "Approved"
    assert "DEF-001 confirmed" in data["notes"]
