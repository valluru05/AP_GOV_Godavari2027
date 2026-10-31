from typing import List, Optional, Callable
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import decode_access_token
from app.models.user import User
from app.schemas.user import UserResponse

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def get_token_from_request(request: Request, bearer_token: Optional[str] = Depends(oauth2_scheme)) -> Optional[str]:
    """Retrieves access token from Authorization header or HttpOnly cookie."""
    if bearer_token:
        return bearer_token
    cookie_token = request.cookies.get("civicproof_token")
    if cookie_token:
        return cookie_token
    return None


def serialize_user(user: User) -> UserResponse:
    """Helper to convert User model into UserResponse with collected permissions list."""
    collected_permissions = set()
    for role in user.roles:
        for perm in role.permissions:
            collected_permissions.add(perm.id)

    user_dict = {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "full_name": user.full_name,
        "phone": user.phone,
        "department_id": user.department_id,
        "vendor_id": user.vendor_id,
        "is_active": user.is_active,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
        "department": user.department,
        "roles": user.roles,
        "permissions": sorted(list(collected_permissions))
    }
    return UserResponse.model_validate(user_dict)


def get_current_user(
    request: Request,
    token: Optional[str] = Depends(get_token_from_request),
    db: Session = Depends(get_db)
) -> User:
    """Validates token and returns current active User database record."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing or expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(token)
    if not payload or not payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with token no longer exists",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated. Please contact your municipal administrator.",
        )
    return user


def require_permission(required_permission: str) -> Callable:
    """Dependency factory that checks if current user holds the required permission."""
    def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        user_perms = {p.id for role in current_user.roles for p in role.permissions}
        # super_admin role has all permissions automatically
        user_roles_set = {role.id for role in current_user.roles}
        if "super_admin" in user_roles_set:
            return current_user

        if required_permission not in user_perms:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Missing required permission '{required_permission}'"
            )
        return current_user
    return permission_checker


def require_roles(allowed_roles: List[str]) -> Callable:
    """Dependency factory checking if current user holds any of the allowed roles."""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_roles_set = {role.id for role in current_user.roles}
        if "super_admin" in user_roles_set:
            return current_user
            
        if not any(role in user_roles_set for role in allowed_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Requires one of roles {allowed_roles}"
            )
        return current_user
    return role_checker
