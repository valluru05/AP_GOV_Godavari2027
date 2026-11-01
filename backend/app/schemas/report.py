from datetime import datetime, date
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field

ReportType = Literal[
    "project_progress",
    "work_package_status",
    "vendor_performance",
    "milestone_performance",
    "inspection_outcomes",
    "defect_rework",
    "asset_readiness",
    "overdue_works",
    "risk_register",
    "missing_evidence",
    "chain_completeness",
    "audit_history",
]


class ReportTypeOption(BaseModel):
    id: ReportType
    title: str
    description: str
    category: str


class ReportFilterParams(BaseModel):
    report_type: ReportType = "project_progress"
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    project_id: Optional[str] = None
    work_package_id: Optional[str] = None
    vendor_id: Optional[str] = None
    zone_id: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    risk_level: Optional[str] = None
    search: Optional[str] = None


class ReportColumn(BaseModel):
    key: str
    label: str
    data_type: Literal["string", "number", "date", "badge", "currency", "percentage"] = "string"


class ReportSummaryStat(BaseModel):
    label: str
    value: str
    subtext: Optional[str] = None


class ReportMetadata(BaseModel):
    report_type: str
    title: str
    description: str
    generated_at: datetime
    generated_by: str
    total_records: int
    applied_filters: Dict[str, Any] = Field(default_factory=dict)
    demo_pilot_label: str = "PROTOTYPE / DEMO ENVIRONMENT — NOT AN OFFICIAL GOVERNMENT AUDIT REPORT"


class ReportDataResponse(BaseModel):
    metadata: ReportMetadata
    summary_stats: List[ReportSummaryStat]
    columns: List[ReportColumn]
    rows: List[Dict[str, Any]]
