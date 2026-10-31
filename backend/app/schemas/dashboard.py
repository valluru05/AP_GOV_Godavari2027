from typing import List, Optional, Dict, Any
from datetime import date
from pydantic import BaseModel, ConfigDict


class SummaryMetrics(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    total_projects: int
    active_works: int
    reported_complete_works: int
    verified_complete_works: int
    accepted_works: int
    works_at_risk: int
    overdue_milestones: int
    open_defects: int
    assets_registered: int
    assets_awaiting_inspection: int
    assets_accepted: int
    inspections_awaiting_action: int


class StatusDistributionItem(BaseModel):
    status: str
    count: int
    color: str


class ReportedVsVerifiedItem(BaseModel):
    work_id: str
    title: str
    reported_progress: float
    verified_progress: float
    gap: float
    workflow_state: str


class DefectSeverityItem(BaseModel):
    severity: str
    count: int
    color: str


class ZoneReadinessItem(BaseModel):
    zone_code: str
    zone_name: str
    total_works: int
    verified_works: int
    readiness_percentage: float


class VendorPerformanceItem(BaseModel):
    vendor_id: str
    vendor_name: str
    category: str
    assigned_works: int
    open_defects: int
    completion_rate: float


class DeadlineItem(BaseModel):
    id: str
    work_id: str
    title: str
    due_date: date
    days_remaining: int
    is_overdue: bool
    category: str


class RecentInspectionItem(BaseModel):
    id: str
    inspection_id: str
    work_title: str
    inspection_type: str
    outcome: str
    date: str
    notes: Optional[str] = None


class PriorityRiskItem(BaseModel):
    work_id: str
    title: str
    risk_score: int
    risk_category: str
    risk_explanation: str
    suggested_action: str


class DashboardVisualizations(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    project_status_distribution: List[StatusDistributionItem]
    reported_vs_verified_progress: List[ReportedVsVerifiedItem]
    open_defects_by_severity: List[DefectSeverityItem]
    work_readiness_by_zone: List[ZoneReadinessItem]
    vendor_workload_performance: List[VendorPerformanceItem]
    upcoming_deadlines: List[DeadlineItem]
    recent_inspections: List[RecentInspectionItem]
    highest_priority_risks: List[PriorityRiskItem]
    recent_audit_events: List[Dict[str, Any]]


class ActionQueueItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    item_type: str  # OVERDUE_MILESTONE | FAILED_INSPECTION | CRITICAL_DEFECT | DEADLINE_RISK | ASSET_AWAITING_ACCEPTANCE
    title: str
    description: str
    severity: str  # Critical | High | Moderate | Low
    priority_order: int
    entity_type: str
    entity_id: str
    link_url: str
    suggested_action: str


class DashboardFilterOptions(BaseModel):
    projects: List[Dict[str, str]]
    zones: List[Dict[str, str]]
    categories: List[str]
    vendors: List[Dict[str, str]]
    statuses: List[str]
    risk_levels: List[str]
