from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.api.deps import get_current_user, require_permission
from app.schemas.defect import (
    DefectCreate,
    DefectVendorReworkRequest,
    DefectReinspectRequest,
    DefectCloseRequest,
    DefectResponse,
    DefectStats,
)
from app.services import defect_service

router = APIRouter(prefix="/defects", tags=["Defects, Corrective Action & Rework"])


@router.get("", response_model=List[DefectResponse])
def get_defects(
    work_package_id: Optional[str] = Query(None, description="Filter by work package ID"),
    project_id: Optional[str] = Query(None, description="Filter by project ID"),
    vendor_id: Optional[str] = Query(None, description="Filter by vendor ID"),
    severity: Optional[str] = Query(None, description="Filter by severity: Critical, High, Medium, Low"),
    status: Optional[str] = Query(None, description="Filter by lifecycle status"),
    zone_id: Optional[str] = Query(None, description="Filter by sector zone ID"),
    search: Optional[str] = Query(None, description="Search by defect ID, title, work package, or description"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("defects:read")),
):
    """
    List infrastructure defects and punch-list tickets with multi-tenancy vendor boundaries.
    """
    return defect_service.list_defects(
        db=db,
        current_user=current_user,
        work_package_id=work_package_id,
        project_id=project_id,
        vendor_id=vendor_id,
        severity=severity,
        status_filter=status,
        zone_id=zone_id,
        search=search,
    )


@router.get("/stats", response_model=DefectStats)
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("defects:read")),
):
    """
    Retrieve live aggregated statistics on open, critical, and overdue defects.
    """
    return defect_service.get_defect_stats(db=db, current_user=current_user)


@router.get("/{defect_id}", response_model=DefectResponse)
def get_defect(
    defect_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("defects:read")),
):
    """
    Retrieve comprehensive details and chronological audit history for a single defect.
    """
    return defect_service.get_defect_by_id(db=db, defect_id=defect_id, current_user=current_user)


@router.post("", response_model=DefectResponse, status_code=status.HTTP_201_CREATED)
def log_defect(
    data: DefectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("defects:create")),
):
    """
    Log a new defect or non-conformance ticket originating from inspection failures or observations.
    """
    return defect_service.create_defect(db=db, data=data, current_user=current_user)


@router.post("/{defect_id}/rework", response_model=DefectResponse)
def submit_vendor_rework(
    defect_id: str,
    rework_data: DefectVendorReworkRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("defects:respond")),
):
    """
    Contractor submits rectification details and photographic proof of corrective action.
    CRITICAL: Does NOT resolve the defect; transitions to 'Correction Submitted' awaiting re-inspection.
    """
    return defect_service.vendor_submit_rework(
        db=db,
        defect_id=defect_id,
        data=rework_data,
        current_user=current_user,
    )


@router.post("/{defect_id}/reinspect", response_model=DefectResponse)
def reinspect_defect(
    defect_id: str,
    reinspect_data: DefectReinspectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("defects:reinspect")),
):
    """
    Quality Field Inspector conducts physical on-site re-inspection.
    Passed verdict moves defect to 'Resolved — Verification Passed'; Failed verdict mandates further rework.
    """
    return defect_service.reinspect_defect(
        db=db,
        defect_id=defect_id,
        data=reinspect_data,
        current_user=current_user,
    )


@router.post("/{defect_id}/close", response_model=DefectResponse)
def close_defect(
    defect_id: str,
    close_data: DefectCloseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("defects:close")),
):
    """
    Authorised administrative closure by Municipal Administrator or Project Manager.
    """
    return defect_service.close_defect(
        db=db,
        defect_id=defect_id,
        data=close_data,
        current_user=current_user,
    )
