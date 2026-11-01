from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.offline import (
    SyncBatchRequest,
    SyncBatchResponse,
    OfflineInspectionDownload
)
from app.services.offline_service import (
    download_assigned_inspections,
    process_sync_batch
)

router = APIRouter(prefix="/offline", tags=["Offline-First Field Workflows"])


@router.get("/assigned-inspections", response_model=List[OfflineInspectionDownload])
def get_assigned_inspections(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Downloads scheduled and assigned inspection dossiers for local IndexedDB caching
    so field inspectors can execute inspections in offline riverbed sectors.
    """
    return download_assigned_inspections(db=db, current_user=current_user)


@router.post("/sync", response_model=SyncBatchResponse)
def sync_offline_submissions(
    batch: SyncBatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Synchronises queued offline submissions (inspections, drafts, defects) idempotently
    with server-side validation and conflict detection per Section 16 (Module 11).
    """
    return process_sync_batch(db=db, current_user=current_user, batch=batch)
