import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def get_token(username_or_email: str, password: str = "AdminPass123!") -> str:
    r = client.post("/api/v1/auth/login", json={"username_or_email": username_or_email, "password": password})
    assert r.status_code == 200, f"Login failed for {username_or_email}: {r.text}"
    return r.json()["access_token"]


@pytest.fixture
def muni_admin_headers():
    token = get_token("muniadmin@civicproof.gov.in", "MuniPass123!")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def pm_headers():
    token = get_token("pm@civicproof.gov.in", "PMPass123!")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def vendor_headers():
    token = get_token("vendor@infra-ap.com", "VendorPass123!")
    return {"Authorization": f"Bearer {token}"}


def test_get_dependency_graph_and_critical_path(muni_admin_headers):
    """
    Verifies Section 14 DAG dependency graph construction,
    Critical Path Method calculations, and festival buffer days.
    """
    res = client.get("/api/v1/dependencies/graph", headers=muni_admin_headers)
    assert res.status_code == 200
    data = res.json()

    assert data["total_milestones"] >= 8
    assert len(data["nodes"]) >= 8
    assert len(data["edges"]) >= 5
    assert len(data["critical_path_milestone_ids"]) >= 1
    assert data["festival_target_date"] == "2027-07-14"
    assert data["days_to_pushkaralu"] > 0
    assert data["festival_buffer_days"] > 0

    # Verify node properties
    node_ids = [n["id"] for n in data["nodes"]]
    assert "ms-01" in node_ids
    assert "ms-02" in node_ids
    assert "ms-03" in node_ids

    # Verify edges
    edge_pairs = [(e["source"], e["target"]) for e in data["edges"]]
    assert ("ms-01", "ms-02") in edge_pairs
    assert ("ms-02", "ms-03") in edge_pairs


def test_simulate_delay_ripple_effect(pm_headers):
    """
    Verifies Section 14 delay impact simulation:
    Simulates a 14-day delay on ms-01 and confirms downstream milestones
    (ms-02, ms-03) are shifted and festival buffer is calculated.
    """
    payload = {
        "milestone_id": "ms-01",
        "delay_days": 14
    }
    res = client.post("/api/v1/dependencies/simulate-impact", json=payload, headers=pm_headers)
    assert res.status_code == 200
    sim = res.json()

    assert sim["target_milestone_id"] == "ms-01"
    assert sim["simulated_delay_days"] == 14
    assert len(sim["impacted_milestones"]) >= 2

    impacted_ids = [m["id"] for m in sim["impacted_milestones"]]
    assert "ms-01" in impacted_ids
    assert "ms-02" in impacted_ids

    assert sim["pushkaralu_deadline_breached"] is False
    assert sim["remaining_festival_buffer_days"] > 0
    assert len(sim["recommendations"]) >= 1


def test_cycle_detection_prevents_circular_dependency(muni_admin_headers):
    """
    Verifies Section 14 graph invariant:
    Adding a circular dependency (e.g. ms-01 depends on ms-03 when ms-03 already depends on ms-01)
    MUST be rejected with 400 Bad Request to prevent workflow deadlock.
    """
    # 1. Self-loop rejection
    self_res = client.post(
        "/api/v1/dependencies",
        json={"milestone_id": "ms-01", "depends_on_id": "ms-01"},
        headers=muni_admin_headers
    )
    assert self_res.status_code == 400
    assert "cannot depend on itself" in self_res.json()["detail"]

    # 2. Cycle detection: ms-03 depends on ms-02 which depends on ms-01.
    # Attempting to make ms-01 depend on ms-03 MUST fail.
    cycle_res = client.post(
        "/api/v1/dependencies",
        json={"milestone_id": "ms-01", "depends_on_id": "ms-03"},
        headers=muni_admin_headers
    )
    assert cycle_res.status_code == 400
    assert "Circular dependency detected" in cycle_res.json()["detail"]


def test_vendor_cannot_modify_dependencies(vendor_headers):
    """
    Verifies RBAC: Vendors are not permitted to alter contractual dependency networks.
    """
    res = client.post(
        "/api/v1/dependencies",
        json={"milestone_id": "ms-06", "depends_on_id": "ms-04"},
        headers=vendor_headers
    )
    assert res.status_code == 403
