from datetime import datetime
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field


# --- Roles & Permissions Matrix ---
class PermissionItem(BaseModel):
    id: str
    name: str
    category: str
    description: Optional[str] = None


class PermissionCategoryGroup(BaseModel):
    category: str
    permissions: List[PermissionItem]


class RoleMatrixItem(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    is_system_role: bool
    permission_ids: List[str]


class RoleMatrixResponse(BaseModel):
    roles: List[RoleMatrixItem]
    categories: List[PermissionCategoryGroup]


class RolePermissionsUpdateRequest(BaseModel):
    permission_ids: List[str]


class RoleCreateRequest(BaseModel):
    name: str
    description: str
    permission_ids: List[str]


# --- Departments ---
class DepartmentCreateRequest(BaseModel):
    code: str
    name: str
    description: Optional[str] = None


class DepartmentUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class DepartmentDetailResponse(BaseModel):
    id: str
    code: str
    name: str
    description: Optional[str] = None
    user_count: int = 0
    project_count: int = 0


# --- Zones / Ghats ---
class ZoneCreateRequest(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    latitude: float
    longitude: float
    perimeter_polygon: Optional[List[List[float]]] = None


class ZoneUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_active: Optional[bool] = None


class ZoneAdminResponse(BaseModel):
    id: str
    code: str
    name: str
    description: Optional[str] = None
    latitude: float
    longitude: float
    is_active: bool
    project_count: int = 0
    asset_count: int = 0


# --- Checklist Templates ---
class ChecklistItemDef(BaseModel):
    id: str
    title: str
    check_type: Literal["pass_fail", "measurement", "visual_rating"] = "pass_fail"
    mandatory: bool = True
    requires_photo: bool = True
    acceptance_criteria: str


class ChecklistTemplateCreateRequest(BaseModel):
    template_code: str
    name: str
    category: str
    version: str = "v1.0"
    description: Optional[str] = None
    items: List[ChecklistItemDef] = Field(default_factory=list)


class ChecklistTemplateUpdateRequest(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    version: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    items: Optional[List[ChecklistItemDef]] = None


class ChecklistTemplateResponse(BaseModel):
    id: str
    template_code: str
    name: str
    category: str
    version: str
    description: Optional[str] = None
    is_active: bool
    items: List[ChecklistItemDef]
    created_at: datetime
    updated_at: datetime


# --- System Parameters & Thresholds Configuration ---
class SystemConfigResponse(BaseModel):
    project_categories: List[str]
    work_categories: List[str]
    vendor_categories: List[str]
    asset_categories: List[str]
    defect_sla_rules: Dict[str, Dict[str, Any]]
    risk_weights: Dict[str, Dict[str, Any]]
    readiness_gate_thresholds: Dict[str, float]
    data_retention_days: int
    notification_channels: Dict[str, str]
    last_updated_at: Optional[datetime] = None
    last_updated_by: Optional[str] = None


class SystemConfigUpdateRequest(BaseModel):
    project_categories: Optional[List[str]] = None
    work_categories: Optional[List[str]] = None
    vendor_categories: Optional[List[str]] = None
    asset_categories: Optional[List[str]] = None
    defect_sla_rules: Optional[Dict[str, Dict[str, Any]]] = None
    risk_weights: Optional[Dict[str, Dict[str, Any]]] = None
    readiness_gate_thresholds: Optional[Dict[str, float]] = None
    data_retention_days: Optional[int] = None


# --- Demo Data Reset ---
class DemoDataResetRequest(BaseModel):
    confirmation_code: str
    reason: str


class DemoDataResetResponse(BaseModel):
    status: str
    message: str
    reseeded_counts: Dict[str, int]
