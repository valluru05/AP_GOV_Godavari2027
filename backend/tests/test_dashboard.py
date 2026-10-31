import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


@pytest.fixture
def auth_header():
    """Logs in as Municipal Administrator and returns Authorization header."""
    login_resp = client.post("/api/v1/auth/login", json={
        "username_or_email": "muniadmin@civicproof.gov.in",
        "password": "MuniPass123!"
    })
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_dashboard_metrics_calculation(auth_header):
    """
    Verify the 12 required summary metrics are calculated from live database records.
    Crucially verify: Reported complete != Verified complete (Core Innovation).
    """
    resp = client.get("/api/v1/dashboard/metrics", headers=auth_header)
    assert resp.status_code == 200
    metrics = resp.json()

    # Verify all 12 metrics are present
    expected_fields = [
        "total_projects", "active_works", "reported_complete_works", "verified_complete_works",
        "accepted_works", "works_at_risk", "overdue_milestones", "open_defects",
        "assets_registered", "assets_awaiting_inspection", "assets_accepted", "inspections_awaiting_action"
    ]
    for field in expected_fields:
        assert field in metrics, f"Missing metric: {field}"
        assert isinstance(metrics[field], int)

    assert metrics["total_projects"] >= 4
    assert metrics["active_works"] >= 4
    assert metrics["open_defects"] >= 2
    assert metrics["assets_registered"] >= 4

    # Core Product Principle Test: Reported complete must not automatically mean verified complete!
    assert metrics["reported_complete_works"] >= metrics["verified_complete_works"]
    assert metrics["verified_complete_works"] >= 1


def test_dashboard_filters_endpoint(auth_header):
    """Verify filter options list provides populated dropdown data for UI."""
    resp = client.get("/api/v1/dashboard/filters", headers=auth_header)
    assert resp.status_code == 200
    data = resp.json()

    assert len(data["projects"]) >= 4
    assert len(data["zones"]) >= 4
    assert len(data["vendors"]) >= 4
    assert "Drinking Water" in data["categories"]
    assert "Critical" in data["risk_levels"]


def test_dashboard_filtering_by_zone(auth_header):
    """Verify applying a zone filter dynamically updates the live aggregated metrics."""
    # Global metrics
    all_resp = client.get("/api/v1/dashboard/metrics", headers=auth_header)
    all_metrics = all_resp.json()

    # Filtered by Kotilingala Ghat
    zone_resp = client.get("/api/v1/dashboard/metrics?zone_id=zone-koti", headers=auth_header)
    assert zone_resp.status_code == 200
    zone_metrics = zone_resp.json()

    assert zone_metrics["total_projects"] <= all_metrics["total_projects"]
    assert zone_metrics["active_works"] <= all_metrics["active_works"]


def test_dashboard_visualizations(auth_header):
    """Verify visualizations endpoint delivers valid structured data for all charts."""
    resp = client.get("/api/v1/dashboard/visualizations", headers=auth_header)
    assert resp.status_code == 200
    data = resp.json()

    # 1. Project Status Distribution
    assert len(data["project_status_distribution"]) > 0
    assert any(s["status"] == "In Progress" for s in data["project_status_distribution"])

    # 2. Reported vs Verified Progress
    assert len(data["reported_vs_verified_progress"]) > 0
    # Find WP1 where reported is 100% and verified is 0%
    wp1_item = next((item for item in data["reported_vs_verified_progress"] if item["work_id"] == "WP-DW-KOTI-01"), None)
    assert wp1_item is not None
    assert wp1_item["reported_progress"] >= 90.0
    assert wp1_item["verified_progress"] == 0.0
    assert wp1_item["gap"] >= 90.0

    # 3. Defect Severity Breakdown
    assert len(data["open_defects_by_severity"]) == 4
    critical_defects = next((d for d in data["open_defects_by_severity"] if d["severity"] == "Critical"), None)
    assert critical_defects is not None
    assert critical_defects["count"] >= 1

    # 4. Work Readiness by Zone
    assert len(data["work_readiness_by_zone"]) >= 3

    # 5. Vendor Performance
    assert len(data["vendor_workload_performance"]) >= 3

    # 6. Upcoming Deadlines
    assert len(data["upcoming_deadlines"]) > 0

    # 7. Recent Inspections
    assert len(data["recent_inspections"]) > 0
    assert any(insp["outcome"] == "Failed" for insp in data["recent_inspections"])

    # 8. Highest Priority Risks
    assert len(data["highest_priority_risks"]) > 0
    assert data["highest_priority_risks"][0]["risk_score"] >= 80


def test_dashboard_action_queue(auth_header):
    """Verify action queue returns prioritized items sorted with Critical first."""
    resp = client.get("/api/v1/dashboard/action-queue", headers=auth_header)
    assert resp.status_code == 200
    items = resp.json()

    assert len(items) >= 4
    # The first item must be high urgency (Critical)
    assert items[0]["severity"] in ["Critical", "High"]
    # Verify link URLs are formatted correctly
    for item in items:
        assert item["link_url"].startswith("/")
        assert item["suggested_action"] != ""
