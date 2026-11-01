from datetime import datetime
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field


OfflineActionType = Literal["execute_inspection", "create_defect", "save_inspection_draft"]
SyncItemStatus = Literal["synced", "conflict", "failed"]


class SyncItemPayload(BaseModel):
    client_submission_id: str = Field(..., description="Unique client-generated UUID for deduplication")
    action_type: OfflineActionType = Field(..., description="Type of offline field action")
    entity_id: Optional[str] = Field(None, description="Target entity ID (e.g. inspection or work package ID)")
    payload: Dict[str, Any] = Field(default_factory=dict, description="Action-specific payload")
    client_timestamp: datetime = Field(default_factory=datetime.utcnow, description="Time recorded on field device")


class SyncBatchRequest(BaseModel):
    device_id: Optional[str] = Field("field-device", description="Identifier of the field tablet or phone")
    items: List[SyncItemPayload] = Field(..., description="Batch of queued offline submissions")


class SyncItemResult(BaseModel):
    client_submission_id: str
    action_type: str
    status: SyncItemStatus
    server_id: Optional[str] = None
    error_message: Optional[str] = None
    conflict_details: Optional[Dict[str, Any]] = None
    synced_at: Optional[datetime] = None


class SyncBatchResponse(BaseModel):
    processed_count: int
    synced_count: int
    conflict_count: int
    failed_count: int
    results: List[SyncItemResult]


class OfflineInspectionDownload(BaseModel):
    id: str
    inspection_id: str
    work_package_id: str
    work_package_title: str
    project_id: str
    project_name: str
    scheduled_date: Optional[str] = None
    inspection_type: str
    checklist_version: str
    checklist_template: List[Dict[str, Any]]
    milestone_id: Optional[str] = None
    asset_id: Optional[str] = None
    asset_name: Optional[str] = None
    zone_id: Optional[str] = None
    zone_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    outcome: str
