from typing import Optional, List, Dict, Any
from datetime import date, datetime
from pydantic import BaseModel, Field, ConfigDict


class AssetBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    category: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    department: Optional[str] = Field(None, max_length=100)
    location_name: Optional[str] = Field(None, max_length=200)
    zone_id: Optional[str] = None
    project_id: Optional[str] = None
    work_package_id: Optional[str] = None
    serial_number: Optional[str] = Field(None, max_length=100)
    model_number: Optional[str] = Field(None, max_length=100)
    installation_date: Optional[date] = None
    commissioning_date: Optional[date] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    responsible_manager_id: Optional[str] = None


class AssetCreate(AssetBase):
    lifecycle_status: Optional[str] = Field("Planned", max_length=60)
    readiness_notes: Optional[str] = None
    supporting_evidence: Optional[List[Dict[str, Any]]] = Field(default_factory=list)


class AssetUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    department: Optional[str] = None
    location_name: Optional[str] = None
    zone_id: Optional[str] = None
    project_id: Optional[str] = None
    work_package_id: Optional[str] = None
    serial_number: Optional[str] = None
    model_number: Optional[str] = None
    installation_date: Optional[date] = None
    commissioning_date: Optional[date] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    responsible_manager_id: Optional[str] = None
    readiness_notes: Optional[str] = None


class AssetTransitionRequest(BaseModel):
    new_status: str = Field(
        ...,
        description="Allowed states: Planned, Procurement Pending, Installation Pending, Installed, Inspection Pending, Verification Failed, Accepted, Operationally Ready, Maintenance Required, Out of Service, Retired"
    )
    reason: str = Field(..., min_length=3, description="Justification for state transition")
    notes: Optional[str] = None


class AssetMaintenanceCreate(BaseModel):
    maintenance_type: str = Field(..., min_length=2, description="Routine, Preventive, Emergency, Calibration, Repair")
    technician_name: str = Field(..., min_length=2)
    summary: str = Field(..., min_length=5)
    service_date: Optional[date] = None
    next_service_due: Optional[date] = None
    status: Optional[str] = "Completed"
    parts_replaced: Optional[str] = None


class AssetEvidenceCreate(BaseModel):
    name: str = Field(..., min_length=1)
    caption: str = Field(..., min_length=1)
    file_type: Optional[str] = "photo"


class AssetResponse(AssetBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    asset_code: str
    qr_identifier: str
    lifecycle_status: str
    readiness_notes: Optional[str] = None
    maintenance_history: List[Dict[str, Any]] = Field(default_factory=list)
    supporting_evidence: List[Dict[str, Any]] = Field(default_factory=list)
    created_at: datetime
    updated_at: Optional[datetime] = None

    # Contextual fields
    is_operationally_ready: bool = False
    readiness_badge_text: str = "Pending Verification"
    readiness_badge_variant: str = "warning"
    open_defect_count: int = 0
    latest_inspection_result: Optional[str] = None
    zone_name: Optional[str] = None
    project_name: Optional[str] = None
    work_package_name: Optional[str] = None
    manager_name: Optional[str] = None
    qr_data_url: Optional[str] = None


class AssetQRLabelResponse(BaseModel):
    asset_id: str
    asset_code: str
    asset_name: str
    department: Optional[str] = None
    location_name: Optional[str] = None
    zone_name: Optional[str] = None
    qr_identifier: str
    qr_data_url: str
    verification_url: str
    lifecycle_status: str
    is_operationally_ready: bool
    pushkaralu_event: str = "Godavari Pushkaralu 2027"


class AssetStats(BaseModel):
    total_assets: int
    operationally_ready_count: int
    pending_verification_count: int
    verification_failed_count: int
    maintenance_required_count: int
    installed_count: int
    assets_by_category: Dict[str, int]
    assets_by_status: Dict[str, int]
    assets_by_zone: List[Dict[str, Any]]
