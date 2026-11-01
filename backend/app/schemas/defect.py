from datetime import date, datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class DefectEvidenceItem(BaseModel):
    name: str
    caption: Optional[str] = None
    url: Optional[str] = None
    timestamp: Optional[str] = None


class DefectHistoryItem(BaseModel):
    timestamp: str
    action: str
    actor_id: Optional[str] = None
    actor_name: Optional[str] = None
    from_status: Optional[str] = None
    to_status: Optional[str] = None
    notes: Optional[str] = None


class DefectCreate(BaseModel):
    work_package_id: str = Field(..., description="Target work package identifier")
    title: str = Field(..., min_length=5, max_length=200, description="Concise defect title")
    description: str = Field(..., min_length=10, description="Engineering defect description and observations")
    category: str = Field("Quality & Safety", description="Quality & Safety, Structural Safety, Hydraulic Quality & Safety, Electrical Safety, Accessibility")
    severity: str = Field("High", description="Critical, High, Medium, Low")
    target_resolution_date: Optional[date] = Field(None, description="Resolution target deadline")
    inspection_id: Optional[str] = Field(None, description="Linked failed inspection ID if defect originated from inspection")
    checklist_item_ref: Optional[str] = Field(None, description="Specific checklist criterion description")
    asset_id: Optional[str] = Field(None, description="Linked asset ID if applicable")
    assigned_vendor_id: Optional[str] = Field(None, description="Responsible contractor ID; auto-assigned from work package if omitted")
    evidence_attachments: Optional[List[DefectEvidenceItem]] = Field(default_factory=list, description="Photographic defect evidence")


class DefectVendorReworkRequest(BaseModel):
    resolution_notes: str = Field(..., min_length=10, description="Explanation of corrective action, structural repairs, or component replacement")
    rework_evidence: Optional[List[DefectEvidenceItem]] = Field(default_factory=list, description="Photographic proof of completed rework")


class DefectReinspectRequest(BaseModel):
    verdict: str = Field(..., description="'Pass' to certify rework, or 'Fail' to mandate further rework cycles")
    verification_notes: str = Field(..., min_length=5, description="Field inspector on-site re-inspection findings")
    reinspection_measurements: Optional[str] = Field(None, description="Quantified engineering re-measurement (e.g. '6.0 bar sustained', '1.2 ohms')")
    reinspection_evidence: Optional[List[DefectEvidenceItem]] = Field(default_factory=list, description="Re-inspection geotagged photographs")


class DefectCloseRequest(BaseModel):
    closure_notes: str = Field(..., min_length=5, description="Supervisory justification for final defect closure")


class DefectResponse(BaseModel):
    id: str
    defect_id: str
    work_package_id: str
    work_package_title: Optional[str] = None
    work_id: Optional[str] = None
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    zone_name: Optional[str] = None

    inspection_id: Optional[str] = None
    inspection_code: Optional[str] = None
    checklist_item_ref: Optional[str] = None

    asset_id: Optional[str] = None
    asset_code: Optional[str] = None

    assigned_vendor_id: Optional[str] = None
    assigned_vendor_name: Optional[str] = None

    title: str
    description: str
    category: str
    severity: str
    status: str

    target_resolution_date: Optional[date] = None
    is_overdue: bool = False

    reported_by_id: Optional[str] = None
    reported_by_name: Optional[str] = None

    evidence_attachments: Optional[List[Dict[str, Any]]] = None
    resolution_notes: Optional[str] = None
    rework_evidence: Optional[List[Dict[str, Any]]] = None
    rework_count: int = 0

    verification_result: Optional[str] = None
    verification_notes: Optional[str] = None
    verified_at: Optional[datetime] = None
    verified_by_name: Optional[str] = None

    closed_at: Optional[datetime] = None
    closed_by_name: Optional[str] = None

    history: Optional[List[Dict[str, Any]]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DefectStats(BaseModel):
    total_defects: int
    open_defects: int
    critical_defects: int
    overdue_defects: int
    awaiting_verification: int
    resolved_count: int
    closed_count: int
    defects_by_severity: Dict[str, int]
    defects_by_status: Dict[str, int]
    defects_by_project: List[Dict[str, Any]]
