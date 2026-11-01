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
def super_admin_headers():
    token = get_token("admin@civicproof.gov.in", "AdminPass123!")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def vendor_headers():
    token = get_token("vendor@infra-ap.com", "VendorPass123!")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def inspector_headers():
    token = get_token("inspector@civicproof.gov.in", "InspectorPass123!")
    return {"Authorization": f"Bearer {token}"}


def test_readiness_dashboard_summary(muni_admin_headers):
    """Verifies readiness dashboard summary metrics and explainable risk scores."""
    res = client.get("/api/v1/readiness/dashboard", headers=muni_admin_headers)
    assert res.status_code == 200
    data = res.json()

    assert data["total_work_packages"] >= 4
    assert "Critical" in data["risk_distribution"]
    assert "High" in data["risk_distribution"]
    assert "Moderate" in data["risk_distribution"]
    assert "Low" in data["risk_distribution"]
    assert data["average_risk_score"] > 0
    assert len(data["highest_risk_work_packages"]) >= 4

    # Highest risk work package has risk score and explainable factors
    top_wp = data["highest_risk_work_packages"][0]
    assert top_wp["risk_score"] >= 50
    assert top_wp["risk_category"] in ["Critical", "High"]
    assert len(top_wp["factors"]) >= 1
    assert len(top_wp["suggested_actions"]) >= 1
    assert len(top_wp["risk_explanation"]) > 10


def test_readiness_chain_12_stages_and_blocking_invariants(muni_admin_headers):
    """
    Verifies Section 13 readiness chain construction:
    - Exactly 12 traceable links
    - Separate reported vs verified progress
    - Detects blocking defects and failed inspections on wp-001
    """
    res = client.get("/api/v1/readiness/work-packages/wp-001/chain", headers=muni_admin_headers)
    assert res.status_code == 200
    chain = res.json()

    assert chain["work_package_id"] == "wp-001"
    assert chain["work_id"] == "WP-DW-KOTI-01"
    assert chain["reported_progress_percentage"] == 100.0
    assert chain["verified_progress_percentage"] == 0.0  # Invariant: reported != verified
    assert chain["is_blocked"] is True
    assert len(chain["blocking_reasons"]) >= 1

    # Verify 12 steps
    steps = chain["chain_steps"]
    assert len(steps) == 12
    step_stage_ids = [s["stage_id"] for s in steps]
    assert step_stage_ids == [
        "project",
        "work_package",
        "milestone",
        "vendor_submission",
        "supporting_evidence",
        "inspection",
        "inspection_decision",
        "defects",
        "reinspection",
        "acceptance",
        "linked_asset",
        "operational_readiness"
    ]

    # Inspection step (step 6) should show Failed
    insp_step = steps[5]
    assert insp_step["status"] == "Failed"

    # Defect step (step 8) should show Blocked due to DEF-DW-001
    defect_step = steps[7]
    assert defect_step["status"] == "Blocked"


def test_explainable_risk_rules_evaluation(inspector_headers):
    """
    Verifies Section 14 rule triggers:
    - Rule C (Failed Verification) on wp-001
    - Rule D (Blocking Defect) on wp-001
    - Rule A (Overdue Milestone) on wp-005
    """
    # Test wp-001
    res1 = client.get("/api/v1/readiness/work-packages/wp-001/risk", headers=inspector_headers)
    assert res1.status_code == 200
    wp1_risk = res1.json()
    rule_ids_1 = [f["rule_id"] for f in wp1_risk["factors"]]
    assert "RULE_C" in rule_ids_1  # Failed verification
    assert "RULE_D" in rule_ids_1  # Blocking defect
    assert wp1_risk["risk_score"] >= 60

    # Test wp-005 (Barricades - has overdue milestone MS-09)
    res5 = client.get("/api/v1/readiness/work-packages/wp-005/risk", headers=inspector_headers)
    assert res5.status_code == 200
    wp5_risk = res5.json()
    rule_ids_5 = [f["rule_id"] for f in wp5_risk["factors"]]
    assert "RULE_A" in rule_ids_5  # Overdue milestone
    assert any("overdue" in a.lower() for a in wp5_risk["suggested_actions"])


def test_acceptance_criteria_validation_blocks_premature_signoff(muni_admin_headers):
    """
    Verifies preflight acceptance criteria validation:
    - wp-001 fails because progress < 90%, blocking defect exists, and inspection failed.
    """
    res = client.post("/api/v1/readiness/work-packages/wp-001/validate-acceptance", headers=muni_admin_headers)
    assert res.status_code == 200
    validation = res.json()
    assert validation["can_accept"] is False
    assert validation["unresolved_blocking_defects_count"] >= 1
    assert validation["failed_inspections_count"] >= 1
    assert "BLOCKED" in validation["summary_message"]

    failed_codes = [c["code"] for c in validation["checks"] if c["status"] == "FAILED"]
    assert "CRIT_DEFECTS" in failed_codes
    assert "CRIT_INSPECTIONS" in failed_codes
    assert "CRIT_PROGRESS" in failed_codes


def test_acceptance_transition_enforces_controls_and_audit(muni_admin_headers, vendor_headers):
    """
    Verifies:
    1. Attempt to accept wp-001 without exception is rejected with 400
    2. Vendors cannot accept work packages (403 Forbidden)
    3. Authorized acceptance with documented exception succeeds and records audit trail
    """
    # 1. Attempt ordinary acceptance of wp-001 (should fail with 400)
    res_ordinary = client.post(
        "/api/v1/readiness/work-packages/wp-001/accept",
        json={"decision_notes": "Attempting routine sign-off without clearing defects", "allow_exception": False},
        headers=muni_admin_headers
    )
    assert res_ordinary.status_code == 400
    assert "Acceptance criteria unsatisfied" in res_ordinary.json()["detail"]

    # 2. Vendor cannot execute acceptance
    res_vendor = client.post(
        "/api/v1/readiness/work-packages/wp-001/accept",
        json={"decision_notes": "Vendor claiming completion", "allow_exception": True, "exception_reason": "Vendor override"},
        headers=vendor_headers
    )
    assert res_vendor.status_code == 403

    # 3. Authorized acceptance with documented exception by Municipal Admin
    exception_payload = {
        "decision_notes": "Conditional administrative acceptance granted for civil pipeline testing phase.",
        "allow_exception": True,
        "exception_reason": "High-priority milestone exception authorized by Municipal Commissioner per Govt Memo 2026/AP/GKP."
    }
    res_acc = client.post(
        "/api/v1/readiness/work-packages/wp-001/accept",
        json=exception_payload,
        headers=muni_admin_headers
    )
    assert res_acc.status_code == 200
    updated_wp = res_acc.json()
    assert updated_wp["workflow_state"] == "Accepted with Exception"

    # 4. Verify audit event was created
    audit_res = client.get("/api/v1/audit?entity_type=WorkPackage&action=WORK_PACKAGE_ACCEPTANCE", headers=muni_admin_headers)
    assert audit_res.status_code == 200
    events = audit_res.json()
    assert len(events) >= 1
    latest_event = events[0]
    assert latest_event["action"] == "WORK_PACKAGE_ACCEPTANCE"
    assert latest_event["entity_id"] == "wp-001"
    assert latest_event["details"]["new_state"]["allow_exception"] is True
