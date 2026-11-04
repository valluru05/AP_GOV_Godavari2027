from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.config import settings
from app.core.security import verify_password, create_access_token, get_password_hash
from app.core.rate_limit import enforce_rate_limit
from app.models.user import User
from app.schemas.auth import LoginRequest, Token, PasswordResetRequest, PasswordChangeRequest
from app.schemas.user import UserResponse
from app.services.audit_service import record_audit_event
from app.api.deps import get_current_user, serialize_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=Token)
def login(
    login_data: LoginRequest,
    response: Response,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Authenticate user with username or email and password.
    Returns access token and user info with assigned roles and permissions.
    """
    enforce_rate_limit(
        request, 
        max_requests=settings.RATE_LIMIT_LOGIN_MAX_ATTEMPTS, 
        window_seconds=settings.RATE_LIMIT_LOGIN_WINDOW_SECONDS,
        key_prefix="auth_login"
    )
    ip_addr = request.client.host if request.client else "unknown"
    
    # Query by username or email
    user = db.query(User).filter(
        (User.email == login_data.username_or_email.lower()) |
        (User.username == login_data.username_or_email.lower())
    ).first()

    if not user or not verify_password(login_data.password, user.hashed_password):
        record_audit_event(
            db=db,
            action="AUTH_LOGIN_FAILED",
            entity_type="auth_session",
            entity_id=login_data.username_or_email,
            actor_id=user.id if user else None,
            actor_email=user.email if user else login_data.username_or_email,
            reason="Invalid credentials supplied",
            details={"ip": ip_addr},
            ip_address=ip_addr
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        record_audit_event(
            db=db,
            action="AUTH_LOGIN_BLOCKED_DEACTIVATED",
            entity_type="user",
            entity_id=user.id,
            actor_id=user.id,
            actor_email=user.email,
            reason="Attempted login to deactivated account",
            details={"ip": ip_addr},
            ip_address=ip_addr
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is currently deactivated. Contact your municipal administrator.",
        )

    # Issue access token
    role_ids = [r.id for r in user.roles]
    token_payload = {
        "sub": user.id,
        "email": user.email,
        "username": user.username,
        "roles": role_ids
    }
    access_token = create_access_token(
        data=token_payload,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    # Record login audit
    record_audit_event(
        db=db,
        action="AUTH_LOGIN_SUCCESS",
        entity_type="auth_session",
        entity_id=user.id,
        actor_id=user.id,
        actor_email=user.email,
        reason="User authenticated successfully",
        details={"roles": role_ids, "ip": ip_addr},
        ip_address=ip_addr
    )

    # Set secure HttpOnly cookie for session security
    response.set_cookie(
        key="civicproof_token",
        value=access_token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=settings.COOKIE_SECURE
    )

    serialized_user = serialize_user(user)
    return Token(access_token=access_token, token_type="bearer", user=serialized_user)


@router.post("/logout")
def logout(
    response: Response,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Logs out current user, clears session cookie, and records audit entry."""
    ip_addr = request.client.host if request.client else "unknown"
    record_audit_event(
        db=db,
        action="AUTH_LOGOUT",
        entity_type="auth_session",
        entity_id=current_user.id,
        actor_id=current_user.id,
        actor_email=current_user.email,
        reason="User logged out",
        ip_address=ip_addr
    )
    response.delete_cookie(key="civicproof_token")
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    """Fetches full profile, roles, and allowed permissions of authenticated user."""
    return serialize_user(current_user)


@router.post("/reset-password")
def reset_password(
    data: PasswordResetRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Development/Demo password reset workflow.
    Validates account and sets new password with audit logging.
    """
    enforce_rate_limit(request, max_requests=10, window_seconds=60, key_prefix="auth_reset")
    user = db.query(User).filter(User.email == data.email.lower()).first()
    if not user:
        # Don't leak existence in production, but in demo return clear feedback
        raise HTTPException(status_code=404, detail="Account with this email does not exist")

    user.hashed_password = get_password_hash(data.new_password)
    db.commit()

    ip_addr = request.client.host if request.client else "unknown"
    record_audit_event(
        db=db,
        action="AUTH_PASSWORD_RESET",
        entity_type="user",
        entity_id=user.id,
        actor_id=user.id,
        actor_email=user.email,
        reason="Password reset executed via demo recovery workflow",
        ip_address=ip_addr
    )
    return {"message": f"Password reset successful for {user.email}. You can now log in with the new password."}


@router.post("/change-password")
def change_password(
    data: PasswordChangeRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Allows authenticated user to change password after verifying current password."""
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password incorrect")

    current_user.hashed_password = get_password_hash(data.new_password)
    db.commit()

    ip_addr = request.client.host if request.client else "unknown"
    record_audit_event(
        db=db,
        action="AUTH_PASSWORD_CHANGED",
        entity_type="user",
        entity_id=current_user.id,
        actor_id=current_user.id,
        actor_email=current_user.email,
        reason="User updated password via profile settings",
        ip_address=ip_addr
    )
    return {"message": "Password changed successfully"}
