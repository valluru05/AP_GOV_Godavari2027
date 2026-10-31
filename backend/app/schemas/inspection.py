from datetime import date, datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class ChecklistItemResult(BaseModel):
    item: str = Field(..., min_length=3, description="Verification checklist item description")
    verdict: str = Field(..., description="Verdict: 'Pass', 'Fail', 'Pending', or 'N/A'")
    measurement: Optional[str] = Field(None, description="Quantified engineering measurement (e.g., '6.0 bar', '1:12 slope')")
    notes: Optional[str] = Field(None, description="Observations or specific defect notes")


class EvidencePhoto(BaseModel):
    name: str
    caption: Optional[str] = None
    timestamp: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    url: Optional[str] = None


class InspectionBase(BaseModel):
    work_package_id: str
    milestone_id: Optional[str] = None
    asset_id: Optional[str] = None
    inspector_id: Optional[str] = None
    scheduled_date: Optional[date] = None
    inspection_type: str = Field("Routine Verification", description="Pre-Commissioning Verification | Mandatory Pressure/Safety Test | Sanitation & Acceptance Audit | Defect Re-inspection")
    checklist_version: str = Field("v1.0", description="Version of the checklist template applied")
    notes: Optional[str] = None


class InspectionCreate(InspectionBase):
    pass


class InspectionExecuteRequest(BaseModel):
    outcome: str = Field(..., description="Verdict: 'Passed', 'Failed', or 'Conditional Pass'")
    checklist_results: List[ChecklistItemResult] = Field(..., min_length=1, description="Executed checklist items")
    evidence_photos: Optional[List[EvidencePhoto]] = Field(default_factory=list, description="Geotagged photographic records")
    latitude: Optional[float] = Field(None, description="GPS latitude from mobile sensor")
    longitude: Optional[float] = Field(None, description="GPS longitude from mobile sensor")
    gps_accuracy_meters: Optional[float] = Field(None, description="Reported GPS accuracy radius in meters")
    notes: Optional[str] = Field(None, description="Inspector field notes or observations")
    verified_percentage_awarded: Optional[float] = Field(None, ge=0.0, le=100.0, description="Verified physical progress awarded on passing")
    inspector_signature: Optional[str] = Field(None, description="Digital certification signature statement")


class InspectionReviewRequest(BaseModel):
    reviewer_decision: str = Field(..., description="Review outcome: 'Approved', 'Rejected', or 'Re-inspection Ordered'")
    notes: Optional[str] = Field(None, description="Executive Engineer or PM review comments")


class InspectionResponse(BaseModel):
    id: str
    inspection_id: str
    work_package_id: str
    work_package_title: Optional[str] = None
    work_id: Optional[str] = None
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    zone_name: Optional[str] = None
    inspector_id: Optional[str] = None
    inspector_name: Optional[str] = None
    milestone_id: Optional[str] = None
    milestone_name: Optional[str] = None
    asset_id: Optional[str] = None
    asset_code: Optional[str] = None
    scheduled_date: Optional[date] = None
    actual_inspection_date: Optional[datetime] = None
    inspection_type: str
    checklist_version: str
    checklist_results: Optional[List[Dict[str, Any]]] = None
    evidence_photos: Optional[List[Dict[str, Any]]] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    gps_accuracy_meters: Optional[float] = None
    is_geofence_verified: bool = True
    outcome: str
    notes: Optional[str] = None
    verified_percentage_awarded: Optional[float] = None
    reviewer_decision: Optional[str] = None
    inspector_signature: Optional[str] = None
    open_defects_count: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InspectionStats(BaseModel):
    total_inspections: int
    scheduled_count: int
    passed_count: int
    failed_count: int
    conditional_count: int
    pass_rate_percentage: float
