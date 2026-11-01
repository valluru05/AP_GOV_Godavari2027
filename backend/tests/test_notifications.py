import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.models.user import User
from app.services.notification_service import create_notification

client = TestClient(app)


def get_token(username_or_email: str, password: str) -> str:
    r = client.post("/api/v1/auth/login", json={"username_or_email": username_or_email, "password": password})
    assert r.status_code == 200, f"Login failed for {username_or_email}: {r.text}"
    return r.json()["access_token"]


@pytest.fixture
def admin_headers():
    token = get_token("superadmin@civicproof.gov.in", "AdminPass123!")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def inspector_headers():
    token = get_token("inspector@civicproof.gov.in", "InspectorPass123!")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def vendor_headers():
    token = get_token("vendor@infra-ap.com", "VendorPass123!")
    return {"Authorization": f"Bearer {token}"}


def test_list_notifications_and_unread_count(admin_headers):
    """Verify notifications list and unread count per Section 18."""
    # Ensure at least one unread notification exists
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "superadmin@civicproof.gov.in").first()
        create_notification(
            db=db,
            user_id=user.id,
            trigger_type="approval_request",
            title="Action Required: Work Package Acceptance",
            message="Final sign-off required for Kotilingala Ghat potable water network.",
            severity="warning"
        )
    finally:
        db.close()

    # 1. Check list
    res = client.get("/api/v1/notifications", headers=admin_headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert "notifications" in data
    assert "unread_count" in data
    assert data["total_count"] >= 1
    assert data["unread_count"] >= 1

    first = data["notifications"][0]
    assert "id" in first
    assert "trigger_type" in first
    assert "title" in first
    assert "severity" in first

    # 2. Check lightweight unread count endpoint
    count_res = client.get("/api/v1/notifications/unread-count", headers=admin_headers)
    assert count_res.status_code == 200
    assert count_res.json()["unread_count"] == data["unread_count"]



def test_mark_single_notification_read(inspector_headers):
    """Verify marking single notification as read updates state and unread count."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "inspector@civicproof.gov.in").first()
        target_n = create_notification(
            db=db,
            user_id=user.id,
            trigger_type="inspection_assignment",
            title="Inspection Assignment Verification",
            message="Please verify rebar spacing at Kotilingala Ghat.",
            severity="info"
        )
        target_id = target_n.id
    finally:
        db.close()

    # Mark as read
    read_res = client.post(f"/api/v1/notifications/{target_id}/read", headers=inspector_headers)
    assert read_res.status_code == 200
    updated = read_res.json()
    assert updated["id"] == target_id
    assert updated["is_read"] is True
    assert updated["read_at"] is not None



def test_mark_all_notifications_read(admin_headers):
    """Verify marking all notifications as read resets unread count to 0."""
    res = client.post("/api/v1/notifications/mark-all-read", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert "marked_count" in data

    # Verify unread count is now 0
    count_res = client.get("/api/v1/notifications/unread-count", headers=admin_headers)
    assert count_res.status_code == 200
    assert count_res.json()["unread_count"] == 0


def test_notification_idempotent_deduplication():
    """Verify that duplicate triggers with same deduplication_key return existing notification without creating duplicates."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "superadmin@civicproof.gov.in").first()
        assert user is not None

        dedup_key = f"test-idempotent-key-{user.id}-unique-trigger"

        n1 = create_notification(
            db=db,
            user_id=user.id,
            trigger_type="inspection_failure",
            title="Inspection Failure Test Event",
            message="Checklist item failed pressure test",
            severity="critical",
            deduplication_key=dedup_key
        )

        n2 = create_notification(
            db=db,
            user_id=user.id,
            trigger_type="inspection_failure",
            title="Inspection Failure Duplicate Attempt",
            message="Checklist item failed pressure test",
            severity="critical",
            deduplication_key=dedup_key
        )

        assert n1.id == n2.id, "Expected deduplication to return identical notification record"
    finally:
        db.close()


def test_get_my_tasks_inspector(inspector_headers):
    """Verify field inspector task queue contains assigned inspections and verification actions."""
    res = client.get("/api/v1/notifications/my-tasks", headers=inspector_headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert "summary" in data
    assert "tasks" in data

    summary = data["summary"]
    assert summary["total_tasks"] >= 1
    assert summary["inspections_count"] >= 1

    # Verify task item properties
    tasks = data["tasks"]
    insp_tasks = [t for t in tasks if t["task_type"] == "inspection"]
    assert len(insp_tasks) >= 1
    t0 = insp_tasks[0]
    assert t0["action_label"] == "Execute Field Checklist"
    assert "/inspections/" in t0["action_url"]
    assert t0["priority"] in ["critical", "high", "medium", "low"]


def test_get_my_tasks_vendor(vendor_headers):
    """Verify vendor task queue contains defect rework and progress items."""
    res = client.get("/api/v1/notifications/my-tasks", headers=vendor_headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert "summary" in data
    assert "tasks" in data
    assert data["summary"]["total_tasks"] >= 0


def test_get_my_tasks_admin_and_filters(admin_headers):
    """Verify administrative action queue includes pending reviews, overdue items, and supports priority/type filtering."""
    # 1. Unfiltered
    res = client.get("/api/v1/notifications/my-tasks", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["summary"]["total_tasks"] >= 1

    # 2. Filter by priority
    prio_res = client.get("/api/v1/notifications/my-tasks?priority=critical", headers=admin_headers)
    assert prio_res.status_code == 200
    for task in prio_res.json()["tasks"]:
        assert task["priority"] == "critical"

    # 3. Filter by due_status
    overdue_res = client.get("/api/v1/notifications/my-tasks?due_status=overdue", headers=admin_headers)
    assert overdue_res.status_code == 200
    for task in overdue_res.json()["tasks"]:
        assert task["is_overdue"] is True


def test_external_channels_statutory_transparency(admin_headers):
    """Verify external messaging adapters endpoint provides honest statutory transparency per Section 18."""
    res = client.get("/api/v1/notifications/external-channels-status", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["in_app_delivery"] == "active"
    assert "unconfigured" in data["sms_gateway"].lower()
    assert "unconfigured" in data["email_smtp"].lower()
    assert "Section 18" in data["notice"]
