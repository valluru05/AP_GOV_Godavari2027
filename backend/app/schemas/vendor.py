from datetime import date, datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ---------------------------------------------------------
# Progress Submission Schemas
# ---------------------------------------------------------
class ProgressSubmissionCreate(BaseModel):
    work_package_id: str
    progress_percentage: float = Field(..., ge=0.0, le=100.0, description="Reported progress percentage between 0 and 100")
    activities_description: str = Field(..., min_length=10, description="Detailed explanation of activities carried out")
    delay_or_blocker: Optional[str] = Field(None, description="Declaration of any delay, impediment, or blocker")
    estimated_completion_date: Optional[date] = None
    evidence_attachments: Optional[List[Dict[str, Any]]] = Field(default_factory=list, description="List of evidence files, photos, test certificates")


class SubmissionReviewRequest(BaseModel):
    review_status: str = Field(..., description="Review decision: 'Reviewed' or 'Rejected'")
    reviewer_notes: str = Field(..., min_length=5, description="Comments or findings from the reviewer")


class ProgressSubmissionResponse(BaseModel):
    id: str
    submission_code: str
    work_package_id: str
    vendor_id: str
    submitted_by_id: Optional[str] = None
    progress_percentage: float
    activities_description: str
    delay_or_blocker: Optional[str] = None
    estimated_completion_date: Optional[date] = None
    evidence_attachments: Optional[List[Dict[str, Any]]] = None
    review_status: str
    reviewer_id: Optional[str] = None
    reviewer_notes: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    
    # Nested context for UI convenience
    work_package_title: Optional[str] = None
    work_package_code: Optional[str] = None
    vendor_name: Optional[str] = None
    project_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# Vendor Schemas
# ---------------------------------------------------------
class VendorBase(BaseModel):
    company_name: str = Field(..., min_length=3, max_length=200)
    category: str = Field(..., min_length=2, max_length=100)
    contact_name: str = Field(..., min_length=2, max_length=150)
    email: EmailStr
    phone: Optional[str] = None
    contract_reference: Optional[str] = None
    status: str = Field("Active", description="Active | Suspended | Under Review")
    contract_start_date: Optional[date] = None
    contract_end_date: Optional[date] = None
    compliance_status: str = Field("Compliant", description="Compliant | Renewal Due | Suspended")
    compliance_document_ref: Optional[str] = None
    compliance_document_expiry: Optional[date] = None


class VendorCreate(VendorBase):
    vendor_code: str = Field(..., min_length=3, max_length=50)


class VendorUpdate(BaseModel):
    company_name: Optional[str] = None
    category: Optional[str] = None
    contact_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    contract_reference: Optional[str] = None
    status: Optional[str] = None
    contract_start_date: Optional[date] = None
    contract_end_date: Optional[date] = None
    compliance_status: Optional[str] = None
    compliance_document_ref: Optional[str] = None
    compliance_document_expiry: Optional[date] = None


class AssignedWorkPackageSummary(BaseModel):
    id: str
    work_id: str
    package_code: Optional[str] = None
    title: str
    project_id: str
    project_name: str
    category: str
    reported_progress_percentage: float
    verified_progress_percentage: float
    workflow_state: str
    planned_completion_date: Optional[date] = None
    target_completion_date: Optional[date] = None
    milestones_total: int
    milestones_completed: int
    open_defects_count: int

    model_config = ConfigDict(from_attributes=True)



class VendorResponse(VendorBase):
    id: str
    vendor_code: str
    created_at: datetime
    updated_at: datetime
    assigned_packages_count: int = 0
    active_packages_count: int = 0
    total_contract_value: Optional[float] = None
    is_financial_masked: bool = False

    model_config = ConfigDict(from_attributes=True)


class VendorDashboardResponse(BaseModel):
    vendor: VendorResponse
    assigned_work_packages: List[AssignedWorkPackageSummary]
    recent_submissions: List[ProgressSubmissionResponse]
    metrics: Dict[str, Any]
    
    model_config = ConfigDict(from_attributes=True)
