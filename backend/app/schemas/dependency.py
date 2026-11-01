from datetime import date, datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class DependencyGraphNode(BaseModel):
    id: str
    name: str
    work_package_id: str
    work_package_title: str
    work_id: str
    project_id: str
    project_name: str
    due_date: date
    is_mandatory: bool
    reported_status: str
    verification_status: str
    status: str  # Completed | In Progress | Blocked | Pending | Overdue
    is_on_critical_path: bool = False
    slack_days: int = 0
    duration_days: int = 14
    risk_score: int = 0
    predecessor_ids: List[str] = []
    successor_ids: List[str] = []


class DependencyGraphEdge(BaseModel):
    source: str  # Predecessor milestone ID
    target: str  # Dependent milestone ID
    source_name: str
    target_name: str
    is_blocked: bool = False
    is_critical: bool = False


class DependencyGraphResponse(BaseModel):
    nodes: List[DependencyGraphNode]
    edges: List[DependencyGraphEdge]
    critical_path_milestone_ids: List[str]
    total_milestones: int
    completed_milestones: int
    blocked_milestones: int
    overdue_milestones: int
    festival_target_date: str = "2027-07-14"
    days_to_pushkaralu: int
    critical_path_duration_days: int
    festival_buffer_days: int


class DelayImpactSimulationRequest(BaseModel):
    milestone_id: str = Field(..., description="ID of milestone to simulate delay on")
    delay_days: int = Field(..., ge=1, le=120, description="Number of delay days to simulate")


class ImpactedMilestone(BaseModel):
    id: str
    name: str
    work_package_title: str
    original_due_date: date
    projected_due_date: date
    delay_days: int
    is_critical_path: bool


class DelayImpactSimulationResponse(BaseModel):
    target_milestone_id: str
    target_milestone_name: str
    simulated_delay_days: int
    impacted_milestones: List[ImpactedMilestone]
    impacted_work_package_count: int
    original_completion_date: date
    new_projected_completion_date: date
    pushkaralu_deadline_breached: bool
    remaining_festival_buffer_days: int
    recommendations: List[str]


class AddDependencyRequest(BaseModel):
    milestone_id: str = Field(..., description="Dependent milestone ID")
    depends_on_id: str = Field(..., description="Prerequisite predecessor milestone ID")
