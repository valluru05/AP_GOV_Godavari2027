from datetime import date, datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class MilestoneSimple(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    due_date: date
    is_mandatory: bool
    reported_status: str
    verification_status: str


class MilestoneResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    work_package_id: str
    name: str
    description: Optional[str] = None
    due_date: date
    is_mandatory: bool
    acceptance_criteria: Optional[str] = None
    required_evidence_type: Optional[str] = None
    responsible_party: Optional[str] = None
    reported_status: str
    verification_status: str
    completed_at: Optional[datetime] = None
    verification_timestamp: Optional[datetime] = None
    created_at: datetime
    dependencies: List[MilestoneSimple] = []


class MilestoneCreate(BaseModel):
    work_package_id: str
    name: str = Field(..., min_length=3, max_length=200)
    description: Optional[str] = None
    due_date: date
    is_mandatory: bool = True
    acceptance_criteria: Optional[str] = None
    required_evidence_type: Optional[str] = "Photographic Inspection"
    responsible_party: Optional[str] = None
    dependency_ids: List[str] = []


class MilestoneDependencyAdd(BaseModel):
    dependency_milestone_id: str


class WorkPackageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    work_id: str
    project_id: str
    title: str
    description: Optional[str] = None
    category: str
    vendor_id: Optional[str] = None
    vendor_name: Optional[str] = None
    responsible_manager_id: Optional[str] = None
    priority: str
    planned_start_date: Optional[date] = None
    planned_completion_date: Optional[date] = None
    actual_completion_date: Optional[date] = None
    reported_progress_percentage: float
    verified_progress_percentage: float
    workflow_state: str
    risk_score: int
    risk_category: str
    risk_explanation: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    milestones: List[MilestoneResponse] = []
    defects_count: int = 0
    inspections_count: int = 0
    assets_count: int = 0


class WorkPackageCreate(BaseModel):
    project_id: str
    work_id: str = Field(..., min_length=3, max_length=50)
    title: str = Field(..., min_length=3, max_length=200)
    description: Optional[str] = None
    category: str
    vendor_id: Optional[str] = None
    priority: str = "High"
    planned_start_date: Optional[date] = None
    planned_completion_date: Optional[date] = None


class WorkPackageStatusUpdate(BaseModel):
    target_state: str
    reason: Optional[str] = None


class ProjectSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    project_identifier: str
    name: str
    description: Optional[str] = None
    category: str
    zone_id: Optional[str] = None
    zone_name: Optional[str] = None
    current_status: str
    priority: str
    start_date: Optional[date] = None
    planned_completion_date: Optional[date] = None
    funding_reference: Optional[str] = None  # Masked if unauthorized
    created_at: datetime
    work_packages_count: int = 0
    reported_progress_avg: float = 0.0
    verified_progress_avg: float = 0.0


class ProjectDetail(ProjectSummary):
    model_config = ConfigDict(from_attributes=True)
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    project_manager_id: Optional[str] = None
    created_by_id: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    work_packages: List[WorkPackageResponse] = []


class ProjectCreate(BaseModel):
    project_identifier: str = Field(..., min_length=3, max_length=50)
    name: str = Field(..., min_length=3, max_length=200)
    description: Optional[str] = None
    category: str
    zone_id: Optional[str] = None
    department_id: Optional[str] = None
    project_manager_id: Optional[str] = None
    start_date: Optional[date] = None
    planned_completion_date: Optional[date] = None
    priority: str = "High"
    funding_reference: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    zone_id: Optional[str] = None
    department_id: Optional[str] = None
    project_manager_id: Optional[str] = None
    start_date: Optional[date] = None
    planned_completion_date: Optional[date] = None
    current_status: Optional[str] = None
    priority: Optional[str] = None
    funding_reference: Optional[str] = None
