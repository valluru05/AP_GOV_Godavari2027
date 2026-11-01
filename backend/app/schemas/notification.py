from datetime import datetime, date
from typing import List, Optional, Literal
from pydantic import BaseModel, ConfigDict


NotificationSeverity = Literal["critical", "warning", "info", "success"]

NotificationTriggerType = Literal[
    "work_assignment",
    "progress_submission",
    "inspection_assignment",
    "inspection_failure",
    "missing_evidence",
    "new_defect",
    "correction_submitted",
    "reinspection_required",
    "upcoming_deadline",
    "overdue_milestone",
    "blocking_risk",
    "asset_acceptance",
    "approval_request"
]


class NotificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    trigger_type: str
    title: str
    message: str
    severity: NotificationSeverity
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    action_url: Optional[str] = None
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime


class NotificationListResponse(BaseModel):
    notifications: List[NotificationRead]
    unread_count: int
    total_count: int


class NotificationUnreadCountResponse(BaseModel):
    unread_count: int


class ExternalChannelsStatusResponse(BaseModel):
    in_app_delivery: str
    sms_gateway: str
    email_smtp: str
    whatsapp_api: str
    notice: str


TaskType = Literal[
    "inspection",
    "defect_rework",
    "submission_review",
    "asset_acceptance",
    "milestone_approval",
    "risk_mitigation"
]

TaskPriority = Literal["critical", "high", "medium", "low"]


class MyTaskItem(BaseModel):
    task_id: str
    task_type: TaskType
    title: str
    description: str
    priority: TaskPriority
    status: str
    due_date: Optional[date] = None
    is_overdue: bool = False
    days_remaining_or_overdue: int = 0
    entity_id: str
    entity_type: str
    action_label: str
    action_url: str
    zone_name: Optional[str] = None
    work_package_code: Optional[str] = None


class MyTasksSummary(BaseModel):
    total_tasks: int
    critical_tasks: int
    overdue_tasks: int
    due_today_tasks: int
    inspections_count: int
    defects_count: int
    reviews_count: int
    approvals_count: int


class MyTasksResponse(BaseModel):
    summary: MyTasksSummary
    tasks: List[MyTaskItem]
