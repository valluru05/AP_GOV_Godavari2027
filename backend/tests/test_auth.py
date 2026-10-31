import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import verify_password
from app.db.session import SessionLocal
from app.models.user import User, AuditEvent

client = TestClient(app)


def test_health_endpoint():
    """Verify system health endpoint returns 200 OK."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "CivicProof"


def test_login_success_superadmin():
    """Verify super admin login succeeds with JWT token and permissions."""
    response = client.post("/api/v1/auth/login", json={
        "username_or_email": "superadmin@civicproof.gov.in",
        "password": "AdminPass123!"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "superadmin@civicproof.gov.in"
    assert any(r["id"] == "super_admin" for r in data["user"]["roles"])
    assert len(data["user"]["permissions"]) > 0


def test_login_failed_invalid_password():
    """Verify login failure with incorrect password returns 401 and logs audit event."""
    response = client.post("/api/v1/auth/login", json={
        "username_or_email": "superadmin@civicproof.gov.in",
        "password": "WrongPassword999!"
    })
    assert response.status_code == 401
    assert "Incorrect username/email or password" in response.json()["detail"]

    # Verify audit event logged
    db = SessionLocal()
    try:
        audit = db.query(AuditEvent).filter(
            AuditEvent.action == "AUTH_LOGIN_FAILED",
            AuditEvent.actor_email == "superadmin@civicproof.gov.in"
        ).order_by(AuditEvent.created_at.desc()).first()
        assert audit is not None
        assert audit.entity_type == "auth_session"
    finally:
        db.close()


def test_role_based_access_control():
    """Verify permission enforcement: Read-Only Reviewer cannot create new users."""
    # 1. Login as Read-Only Reviewer
    reviewer_login = client.post("/api/v1/auth/login", json={
        "username_or_email": "reviewer@audit.gov.in",
        "password": "ReviewerPass123!"
    })
    assert reviewer_login.status_code == 200
    reviewer_token = reviewer_login.json()["access_token"]

    # 2. Attempt to create a user using Reviewer token -> must be rejected with 403 Forbidden
    resp = client.post(
        "/api/v1/users",
        headers={"Authorization": f"Bearer {reviewer_token}"},
        json={
            "email": f"unauthorized_{uuid.uuid4().hex[:6]}@civicproof.gov.in",
            "username": f"unauth_{uuid.uuid4().hex[:6]}",
            "full_name": "Unauthorized User",
            "password": "Password123!",
            "role_ids": ["field_inspector"]
        }
    )
    assert resp.status_code == 403
    assert "Missing required permission" in resp.json()["detail"]


def test_user_creation_and_audit():
    """Verify administrator can create a user and it records an audit event."""
    # 1. Login as Super Admin
    admin_login = client.post("/api/v1/auth/login", json={
        "username_or_email": "superadmin@civicproof.gov.in",
        "password": "AdminPass123!"
    })
    admin_token = admin_login.json()["access_token"]

    suffix = uuid.uuid4().hex[:6]
    test_email = f"inspector_{suffix}@civicproof.gov.in"
    test_username = f"insp_{suffix}"

    # 2. Create new inspector user
    resp = client.post(
        "/api/v1/users",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "email": test_email,
            "username": test_username,
            "full_name": f"Test Inspector {suffix}",
            "password": "SecurePassword123!",
            "department_id": "dept-qa",
            "role_ids": ["field_inspector"]
        }
    )
    assert resp.status_code == 201
    new_user = resp.json()
    assert new_user["email"] == test_email
    assert any(r["id"] == "field_inspector" for r in new_user["roles"])

    # 3. Verify audit log captured USER_CREATED
    db = SessionLocal()
    try:
        audit = db.query(AuditEvent).filter(
            AuditEvent.action == "USER_CREATED",
            AuditEvent.entity_id == new_user["id"]
        ).first()
        assert audit is not None
        assert audit.actor_email == "superadmin@civicproof.gov.in"
    finally:
        db.close()


def test_user_deactivation_blocks_login():
    """Verify deactivated user is blocked from logging in (403 Forbidden)."""
    admin_login = client.post("/api/v1/auth/login", json={
        "username_or_email": "superadmin@civicproof.gov.in",
        "password": "AdminPass123!"
    })
    admin_token = admin_login.json()["access_token"]

    suffix = uuid.uuid4().hex[:6]
    test_email = f"deact_{suffix}@civicproof.gov.in"
    test_username = f"deact_{suffix}"

    # Create active user
    create_resp = client.post(
        "/api/v1/users",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "email": test_email,
            "username": test_username,
            "full_name": f"Deactivation Test User {suffix}",
            "password": "SecurePassword123!",
            "department_id": "dept-qa",
            "role_ids": ["field_inspector"]
        }
    )
    assert create_resp.status_code == 201
    user_id = create_resp.json()["id"]

    # Toggle to inactive
    toggle_resp = client.post(
        f"/api/v1/users/{user_id}/toggle-status",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert toggle_resp.status_code == 200
    assert toggle_resp.json()["is_active"] is False

    # Attempt login with deactivated user
    login_resp = client.post("/api/v1/auth/login", json={
        "username_or_email": test_email,
        "password": "SecurePassword123!"
    })
    assert login_resp.status_code == 403
    assert "deactivated" in login_resp.json()["detail"].lower()


def test_password_hash_security():
    """Verify passwords are stored as Argon2id hashes, not plain text."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == "superadmin").first()
        assert user.hashed_password.startswith("$argon2id$")
        assert verify_password("AdminPass123!", user.hashed_password) is True
        assert verify_password("Incorrect", user.hashed_password) is False
    finally:
        db.close()


def test_all_seven_demo_accounts_functional():
    """Verify all 7 roles specified in requirements can authenticate."""
    credentials = [
        ("superadmin@civicproof.gov.in", "AdminPass123!", "super_admin"),
        ("muniadmin@civicproof.gov.in", "MuniPass123!", "municipal_admin"),
        ("pm@civicproof.gov.in", "PMPass123!", "project_manager"),
        ("inspector@civicproof.gov.in", "InspectorPass123!", "field_inspector"),
        ("vendor@infra-ap.com", "VendorPass123!", "vendor"),
        ("assets@civicproof.gov.in", "AssetPass123!", "asset_manager"),
        ("reviewer@audit.gov.in", "ReviewerPass123!", "read_only_reviewer"),
    ]
    for email, pwd, expected_role in credentials:
        resp = client.post("/api/v1/auth/login", json={
            "username_or_email": email,
            "password": pwd
        })
        assert resp.status_code == 200, f"Failed for {email}: {resp.text}"
        data = resp.json()
        assert any(r["id"] == expected_role for r in data["user"]["roles"])
