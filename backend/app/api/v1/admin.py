from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, require_permission
from app.models.user import User
from app.schemas.admin import (
    RoleMatrixResponse,
    RoleMatrixItem,
    RolePermissionsUpdateRequest,
    RoleCreateRequest,
    DepartmentDetailResponse,
    DepartmentCreateRequest,
    DepartmentUpdateRequest,
    ZoneAdminResponse,
    ZoneCreateRequest,
    ZoneUpdateRequest,
    ChecklistTemplateResponse,
    ChecklistTemplateCreateRequest,
    ChecklistTemplateUpdateRequest,
    SystemConfigResponse,
    SystemConfigUpdateRequest,
    DemoDataResetRequest,
    DemoDataResetResponse
)
from app.services.admin_service import (
    get_roles_matrix,
    update_role_permissions,
    create_custom_role,
    get_departments_detail,
    create_department,
    update_department,
    get_zones_admin,
    create_zone,
    update_zone,
    get_checklist_templates,
    create_checklist_template,
    update_checklist_template,
    get_system_config,
    update_system_config,
    reset_demo_data
)

router = APIRouter(prefix="/admin", tags=["Administration & Configuration"])


# --- Roles & Permissions Matrix ---
@router.get("/roles-matrix", response_model=RoleMatrixResponse)
def get_roles_and_permissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users:read"))
):
    """Returns matrix of all roles and grouped system permissions."""
    return get_roles_matrix(db)


@router.post("/roles/{role_id}/permissions", response_model=RoleMatrixItem)
def modify_role_permissions(
    role_id: str,
    payload: RolePermissionsUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users:manage"))
):
    """Updates the assigned permissions for a given system or custom role."""
    try:
        return update_role_permissions(db, role_id, payload.permission_ids, current_user)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/roles", response_model=RoleMatrixItem, status_code=status.HTTP_201_CREATED)
def create_role(
    payload: RoleCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users:manage"))
):
    """Creates a new custom role with assigned permissions."""
    try:
        return create_custom_role(db, payload, current_user)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# --- Departments ---
@router.get("/departments", response_model=List[DepartmentDetailResponse])
def list_departments_admin(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists departments with user and project assignment counts."""
    return get_departments_detail(db)


@router.post("/departments", response_model=DepartmentDetailResponse, status_code=status.HTTP_201_CREATED)
def create_new_department(
    payload: DepartmentCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users:manage"))
):
    """Creates a new municipal department or nodal agency."""
    try:
        return create_department(db, payload, current_user)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/departments/{dept_id}", response_model=DepartmentDetailResponse)
def update_existing_department(
    dept_id: str,
    payload: DepartmentUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users:manage"))
):
    """Modifies department details."""
    try:
        return update_department(db, dept_id, payload, current_user)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# --- Zones / Ghats ---
@router.get("/zones", response_model=List[ZoneAdminResponse])
def list_zones_admin(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists all monitored Pushkaralu ghats and zones with linked assets count."""
    return get_zones_admin(db)


@router.post("/zones", response_model=ZoneAdminResponse, status_code=status.HTTP_201_CREATED)
def create_new_zone(
    payload: ZoneCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("projects:edit"))
):
    """Creates a new festival zone or ghat sector."""
    try:
        return create_zone(db, payload, current_user)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/zones/{zone_id}", response_model=ZoneAdminResponse)
def update_existing_zone(
    zone_id: str,
    payload: ZoneUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("projects:edit"))
):
    """Modifies zone coordinates, boundaries, or active state."""
    try:
        return update_zone(db, zone_id, payload, current_user)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# --- Checklist Templates ---
@router.get("/checklist-templates", response_model=List[ChecklistTemplateResponse])
def list_templates(
    category: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists inspection checklist templates with versioning and evidence requirements."""
    return get_checklist_templates(db, category, is_active)


@router.post("/checklist-templates", response_model=ChecklistTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_template(
    payload: ChecklistTemplateCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("inspections:assign"))
):
    """Creates a new inspection checklist template."""
    try:
        return create_checklist_template(db, payload, current_user)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/checklist-templates/{template_id}", response_model=ChecklistTemplateResponse)
def update_template(
    template_id: str,
    payload: ChecklistTemplateUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("inspections:assign"))
):
    """Updates checklist template items, evidence rules, or version."""
    try:
        return update_checklist_template(db, template_id, payload, current_user)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# --- System Configuration & Thresholds ---
@router.get("/config", response_model=SystemConfigResponse)
def get_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns statutory categories, risk weights (Rules A-G), defect SLA hours, and retention."""
    return get_system_config(db)


@router.put("/config", response_model=SystemConfigResponse)
def update_config(
    payload: SystemConfigUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users:manage"))
):
    """Updates system parameters with mandatory audit recording."""
    return update_system_config(db, payload, current_user)


# --- Demo Data Reset ---
@router.post("/demo-data/reset", response_model=DemoDataResetResponse)
def trigger_demo_data_reset(
    payload: DemoDataResetRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users:manage"))
):
    """
    Safely resets and reseeds Pushkaralu 2027 demo records with confirmation token check.
    """
    try:
        return reset_demo_data(
            db=db,
            current_user=current_user,
            confirmation_code=payload.confirmation_code,
            reason=payload.reason
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# --- Statutory Audit Protection Invariant ---
@router.delete("/audit-history")
def attempt_delete_audit_history(
    current_user: User = Depends(get_current_user)
):
    """
    Enforces Section 19 Page 40 invariant:
    'Never allow an administrator to delete audit history through the normal application interface.'
    """
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="STATUTORY AUDIT INVARIANT VIOLATION: Section 19 strictly forbids any deletion or purging of CivicProof cryptographic audit trail by any user or administrator."
    )
