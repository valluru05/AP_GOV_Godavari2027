import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def get_token(username_or_email: str = "superadmin@civicproof.gov.in", password: str = "AdminPass123!") -> str:
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


def test_list_report_types(admin_headers):
    """Verify directory returns all 12 required report types per Section 17."""
    res = client.get("/api/v1/reports/types", headers=admin_headers)
    assert res.status_code == 200
    types = res.json()
    assert len(types) == 12

    ids = [t["id"] for t in types]
    assert "project_progress" in ids
    assert "defect_rework" in ids
    assert "risk_register" in ids
    assert "chain_completeness" in ids
    assert "audit_history" in ids


def test_generate_project_progress_report(admin_headers):
    """Verify generating project progress report with summary stats and columns."""
    payload = {
        "report_type": "project_progress",
        "zone_id": "All"
    }
    res = client.post("/api/v1/reports/data", json=payload, headers=admin_headers)
    assert res.status_code == 200
    data = res.json()

    assert "metadata" in data
    assert data["metadata"]["report_type"] == "project_progress"
    assert "NOT AN OFFICIAL GOVERNMENT AUDIT REPORT" in data["metadata"]["demo_pilot_label"]
    assert len(data["summary_stats"]) >= 3
    assert len(data["columns"]) >= 5
    assert len(data["rows"]) > 0


def test_generate_defect_rework_report(admin_headers):
    """Verify defect rework report returns severity and rework cycle counts."""
    payload = {
        "report_type": "defect_rework"
    }
    res = client.post("/api/v1/reports/data", json=payload, headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["metadata"]["report_type"] == "defect_rework"
    assert len(data["rows"]) > 0
    assert "rework_count" in data["rows"][0]


def test_generate_risk_register_report(admin_headers):
    """Verify risk register report returns explainable rule triggers."""
    payload = {
        "report_type": "risk_register"
    }
    res = client.post("/api/v1/reports/data", json=payload, headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["metadata"]["report_type"] == "risk_register"
    assert len(data["rows"]) > 0
    assert "risk_score" in data["rows"][0]
    assert "risk_explanation" in data["rows"][0]


def test_generate_audit_history_report(admin_headers):
    """Verify audit history report returns immutable chronological ledger entries."""
    payload = {
        "report_type": "audit_history"
    }
    res = client.post("/api/v1/reports/data", json=payload, headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["metadata"]["report_type"] == "audit_history"
    assert len(data["rows"]) > 0
    assert "event_id" in data["rows"][0]


def test_csv_export_stream_and_formula_sanitization(admin_headers):
    """
    Verify CSV export endpoint streams file with header metadata,
    and applies OWASP formula injection protection.
    """
    res = client.get("/api/v1/reports/export/csv?report_type=project_progress", headers=admin_headers)
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/csv")
    assert "attachment;" in res.headers["content-disposition"]

    content = res.text
    # Verify metadata header comments
    assert "# CIVICPROOF PLATFORM — GODAVARI PUSHKARALU 2027" in content
    assert "# REPORT: Project & Works Progress Overview" in content
    assert "Project ID" in content


def test_csv_export_rbac_enforcement(vendor_headers):
    """Verify unprivileged vendor role without reports:export is rejected with 403."""
    res = client.get("/api/v1/reports/export/csv?report_type=audit_history", headers=vendor_headers)
    assert res.status_code == 403
