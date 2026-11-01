from datetime import datetime, date
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ReadinessChainStep(BaseModel):
    step_number: int = Field(..., ge=1, le=12, description="Sequence link in the 12-stage readiness chain")
    stage_id: str = Field(..., description="Unique identifier of stage: project, work_package, milestone, vendor_submission, etc.")
    title: str = Field(..., description="Human-readable stage title")
    entity_type: str = Field(..., description="Entity type: Project, WorkPackage, Milestone, Inspection, Defect, Asset")
    entity_id: Optional[str] = None
    status: str = Field(..., description="Completed | Pending | Blocked | Failed | Awaiting Authorisation | Not Applicable")
    status_label: str = Field(..., description="Display label for badge")
    timestamp: Optional[datetime] = None
    actor_name: Optional[str] = None
    actor_role: Optional[str] = None
    notes: Optional[str] = None
    evidence_refs: Optional[List[Dict[str, Any]]] = None
    missing_requirements: Optional[List[str]] = None


class ReadinessChainResponse(BaseModel):
    work_package_id: str
    work_id: str
    work_package_title: str
    project_id: str
    project_name: str
    vendor_id: Optional[str] = None
    vendor_name: Optional[str] = None
    
    # Critical distinction: Reported vs Verified
    reported_progress_percentage: float
    verified_progress_percentage: float
    workflow_state: str
    operational_readiness_state: Optional[str] = None
    
    is_blocked: bool
    blocking_reasons: List[str]
    chain_steps: List[ReadinessChainStep]


class AcceptanceCriteriaCheck(BaseModel):
    code: str
    criterion: str
    status: str  # PASSED | FAILED | WARNING
    details: str
    is_blocking: bool = True


class AcceptanceValidationResult(BaseModel):
    work_package_id: str
    work_package_title: str
    work_id: str
    can_accept: bool
    checks: List[AcceptanceCriteriaCheck]
    unresolved_blocking_defects_count: int
    unverified_mandatory_milestones_count: int
    missing_evidence_count: int
    failed_inspections_count: int
    summary_message: str


class AcceptanceTransitionRequest(BaseModel):
    decision_notes: str = Field(..., min_length=5, description="Justification and sign-off remarks")
    allow_exception: bool = Field(False, description="Whether this is an exceptional override of non-blocking warnings")
    exception_reason: Optional[str] = Field(None, description="Detailed official justification for authorized exception")


class RiskFactor(BaseModel):
    rule_id: str  # RULE_A, RULE_B, etc.
    rule_name: str
    severity: str  # Critical | High | Moderate | Low
    score_impact: int
    explanation: str
    suggested_action: str
    trigger_data: Optional[Dict[str, Any]] = None


class WorkPackageRiskEvaluation(BaseModel):
    work_package_id: str
    work_id: str
    work_package_title: str
    project_id: str
    project_name: str
    category: str
    vendor_name: Optional[str] = None
    reported_progress_percentage: float
    verified_progress_percentage: float
    workflow_state: str
    
    risk_score: int = Field(..., ge=0, le=100)
    risk_category: str  # Critical | High | Moderate | Low | Insufficient Data
    risk_explanation: str
    factors: List[RiskFactor]
    suggested_actions: List[str]
    evaluated_at: datetime


class ReadinessDashboardSummary(BaseModel):
    total_work_packages: int
    accepted_work_packages: int
    in_progress_work_packages: int
    blocked_work_packages: int
    average_risk_score: float
    risk_distribution: Dict[str, int]
    overdue_milestones_count: int
    open_blocking_defects_count: int
    pending_acceptance_count: int
    highest_risk_work_packages: List[WorkPackageRiskEvaluation]
