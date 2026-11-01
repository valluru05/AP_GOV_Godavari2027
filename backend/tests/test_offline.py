import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def get_token(username_or_email: str = "inspector@civicproof.gov.in", password: str = "InspectorPass123!") -> str:
    r = client.post("/api/v1/auth/login", json={"username_or_email": username_or_email, "password": password})
    assert r.status_code == 200, f"Login failed: {r.text}"
    return r.json()["access_token"]


@pytest.fixture
def inspector_headers():
    token = get_token("inspector@civicproof.gov.in", "InspectorPass123!")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers():
    token = get_token("superadmin@civicproof.gov.in", "AdminPass123!")
    return {"Authorization": f"Bearer {token}"}


def test_download_assigned_inspections(inspector_headers):
    """Verify field inspectors can cache assigned inspections with full checklist templates."""
    res = client.get("/api/v1/offline/assigned-inspections", headers=inspector_headers)
    assert res.status_code == 200
    inspections = res.json()
    assert isinstance(inspections, list)
    if len(inspections) > 0:
        first = inspections[0]
        assert "id" in first
        assert "inspection_id" in first
        assert "checklist_template" in first
        assert len(first["checklist_template"]) >= 1


def test_sync_offline_inspection_execution(inspector_headers):
    """Verify executing an offline inspection updates the server record with verified progress."""
    # First get an assigned scheduled inspection
    assigned = client.get("/api/v1/offline/assigned-inspections", headers=inspector_headers).json()
    assert len(assigned) > 0
    target_insp = assigned[0]

    client_sub_id = f"cli-{uuid.uuid4()}"

    batch = {
        "device_id": "field-tablet-saraswati-01",
        "items": [
            {
                "client_submission_id": client_sub_id,
                "action_type": "execute_inspection",
                "entity_id": target_insp["id"],
                "payload": {
                    "outcome": "Passed",
                    "notes": "Verified offline at Saraswati Ghat sector C. Foundation intact.",
                    "verified_percentage_awarded": 15.0,
                    "latitude": 16.9882,
                    "longitude": 81.7612,
                    "checklist_results": [
                        {"id": "chk-01", "verdict": "pass", "notes": "Solid mooring"}
                    ]
                }
            }
        ]
    }

    res = client.post("/api/v1/offline/sync", json=batch, headers=inspector_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["synced_count"] == 1
    assert data["results"][0]["client_submission_id"] == client_sub_id
    assert data["results"][0]["status"] == "synced"


def test_idempotent_sync_deduplication(inspector_headers):
    """Verify duplicate submission of the same client_submission_id is idempotent."""
    assigned = client.get("/api/v1/offline/assigned-inspections", headers=inspector_headers).json()
    target_insp = assigned[0]
    client_sub_id = f"cli-idem-{uuid.uuid4()}"

    batch = {
        "device_id": "field-tablet-02",
        "items": [
            {
                "client_submission_id": client_sub_id,
                "action_type": "execute_inspection",
                "entity_id": target_insp["id"],
                "payload": {
                    "outcome": "Passed",
                    "notes": "First attempt offline sync."
                }
            }
        ]
    }

    # First attempt
    res1 = client.post("/api/v1/offline/sync", json=batch, headers=inspector_headers)
    assert res1.status_code == 200
    assert res1.json()["synced_count"] == 1

    # Second identical attempt with same client_submission_id
    res2 = client.post("/api/v1/offline/sync", json=batch, headers=inspector_headers)
    assert res2.status_code == 200
    assert res2.json()["synced_count"] == 1
    assert res2.json()["results"][0]["status"] == "synced"


def test_sync_offline_defect_creation(inspector_headers):
    """Verify logging a defect offline registers it in the defect register upon sync."""
    client_sub_id = f"cli-def-{uuid.uuid4()}"
    batch = {
        "device_id": "field-tablet-03",
        "items": [
            {
                "client_submission_id": client_sub_id,
                "action_type": "create_defect",
                "entity_id": "wp-001",
                "payload": {
                    "title": "Loose anchor flange spotted offline",
                    "description": "Corrosion observed on tidal mooring bracket.",
                    "severity": "High",
                    "category": "Quality & Safety"
                }
            }
        ]
    }

    res = client.post("/api/v1/offline/sync", json=batch, headers=inspector_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["synced_count"] == 1
    assert data["results"][0]["status"] == "synced"
    assert data["results"][0]["server_id"] is not None


def test_offline_conflict_detection(admin_headers, inspector_headers):
    """
    Verify conflict detection: If server record was already reviewed and concluded,
    offline sync detects conflict, preserves server state, and does not perform blind last-write-wins.
    """
    # insp-001 is already Failed with reviewer decision in demo seeds
    client_sub_id = f"cli-conflict-{uuid.uuid4()}"
    batch = {
        "device_id": "field-phone-09",
        "items": [
            {
                "client_submission_id": client_sub_id,
                "action_type": "execute_inspection",
                "entity_id": "insp-001",
                "payload": {
                    "outcome": "Passed",
                    "notes": "Attempting to overwrite concluded failed inspection while offline"
                }
            }
        ]
    }

    res = client.post("/api/v1/offline/sync", json=batch, headers=inspector_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["conflict_count"] == 1
    assert data["results"][0]["status"] == "conflict"
    assert "conflict_details" in data["results"][0]
    assert "server_outcome" in data["results"][0]["conflict_details"]
