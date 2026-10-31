from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.db.session import get_db
from app.core.security import get_password_hash
from app.models.user import User, Role, Department, Permission
from app.schemas.user import (
    UserCreate, UserUpdate, UserResponse, RoleBase, DepartmentBase
)
from app.services.audit_service import record_audit_event
from app.api.deps import get_current_user, require_permission, serialize_user

router = APIRouter(prefix="/users", tags=["Users & Roles"])


@router.get("/meta/departments", response_model=List[DepartmentBase])
def list_departments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists all municipal departments."""
    return db.query(Department).all()


@router.get("/meta/roles", response_model=List[RoleBase])
def list_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists all configured system roles with assigned permissions."""
    return db.query(Role).all()


@router.get("", response_model=List[UserResponse])
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None),
    role_id: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users:read"))
):
    """Lists users with filtering, search, and pagination. Requires users:read permission."""
    query = db.query(User)

    if search:
        search_filter = f"%{search.lower()}%"
        query = query.filter(
            or_(
                User.full_name.ilike(search_filter),
                User.email.ilike(search_filter),
                User.username.ilike(search_filter)
            )
        )
    if department_id:
        query = query.filter(User.department_id == department_id)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    if role_id:
        query = query.filter(User.roles.any(Role.id == role_id))

    users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    return [serialize_user(u) for u in users]


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: UserCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users:manage"))
):
    """Creates a new user account with assigned roles. Requires users:manage permission."""
    # Check duplicate email
    if db.query(User).filter(User.email == user_in.email.lower()).first():
        raise HTTPException(status_code=400, detail="User with this email already exists")

    # Check duplicate username
    if db.query(User).filter(User.username == user_in.username.lower()).first():
        raise HTTPException(status_code=400, detail="User with this username already exists")

    new_user = User(
        email=user_in.email.lower(),
        username=user_in.username.lower(),
        full_name=user_in.full_name,
        phone=user_in.phone,
        hashed_password=get_password_hash(user_in.password),
        department_id=user_in.department_id,
        vendor_id=user_in.vendor_id,
        is_active=user_in.is_active
    )

    if user_in.role_ids:
        roles = db.query(Role).filter(Role.id.in_(user_in.role_ids)).all()
        new_user.roles = roles

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    ip_addr = request.client.host if request.client else "unknown"
    record_audit_event(
        db=db,
        action="USER_CREATED",
        entity_type="user",
        entity_id=new_user.id,
        actor_id=current_user.id,
        actor_email=current_user.email,
        reason=f"User {new_user.email} created by administrator",
        details={"roles": user_in.role_ids, "department_id": user_in.department_id},
        ip_address=ip_addr
    )

    return serialize_user(new_user)


@router.get("/{user_id}", response_model=UserResponse)
def get_user_detail(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users:read"))
):
    """Fetches details for a specific user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return serialize_user(user)


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    user_in: UserUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users:manage"))
):
    """Updates user information, department, or assigned roles."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    changes = {}
    if user_in.full_name is not None and user_in.full_name != user.full_name:
        changes["full_name"] = {"old": user.full_name, "new": user_in.full_name}
        user.full_name = user_in.full_name
    if user_in.phone is not None and user_in.phone != user.phone:
        changes["phone"] = {"old": user.phone, "new": user_in.phone}
        user.phone = user_in.phone
    if user_in.department_id is not None and user_in.department_id != user.department_id:
        changes["department_id"] = {"old": user.department_id, "new": user_in.department_id}
        user.department_id = user_in.department_id
    if user_in.is_active is not None and user_in.is_active != user.is_active:
        changes["is_active"] = {"old": user.is_active, "new": user_in.is_active}
        user.is_active = user_in.is_active
    if user_in.role_ids is not None:
        roles = db.query(Role).filter(Role.id.in_(user_in.role_ids)).all()
        changes["roles"] = {"old": [r.id for r in user.roles], "new": user_in.role_ids}
        user.roles = roles

    db.commit()
    db.refresh(user)

    ip_addr = request.client.host if request.client else "unknown"
    record_audit_event(
        db=db,
        action="USER_UPDATED",
        entity_type="user",
        entity_id=user.id,
        actor_id=current_user.id,
        actor_email=current_user.email,
        reason="User details updated by administrator",
        details=changes,
        ip_address=ip_addr
    )

    return serialize_user(user)


@router.post("/{user_id}/toggle-status", response_model=UserResponse)
def toggle_user_status(
    user_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users:manage"))
):
    """Activates or deactivates a user account."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent self-deactivation of super_admin
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")

    user.is_active = not user.is_active
    action_name = "USER_ACTIVATED" if user.is_active else "USER_DEACTIVATED"
    db.commit()
    db.refresh(user)

    ip_addr = request.client.host if request.client else "unknown"
    record_audit_event(
        db=db,
        action=action_name,
        entity_type="user",
        entity_id=user.id,
        actor_id=current_user.id,
        actor_email=current_user.email,
        reason=f"Account status changed to {'active' if user.is_active else 'deactivated'}",
        ip_address=ip_addr
    )

    return serialize_user(user)
