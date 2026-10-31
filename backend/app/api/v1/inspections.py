from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.api.deps import get_current_user, require_permission
from app.schemas.inspection import (
    InspectionCreate,
    InspectionExecuteRequest,
    InspectionReviewRequest,
    InspectionResponse,
    InspectionStats,
)
from app.services import inspection_service

router = APIRouter(prefix="/inspections", tags=["Field Verification & Mobile Inspections"])


@router.get("", response_model=List[InspectionResponse])
def get_inspections(
    work_package_id: Optional[str] = Query(None, description="Filter by work package ID"),
    project_id: Optional[str] = Query(None, description="Filter by project ID"),
    inspector_id: Optional[str] = Query(None, description="Filter by inspector user ID"),
    outcome: Optional[str] = Query(None, description="Filter by outcome: Scheduled, Passed, Failed, Conditional Pass"),
    inspection_type: Optional[str] = Query(None, description="Filter by inspection category type"),
    zone_id: Optional[str] = Query(None, description="Filter by zone ID"),
    search: Optional[str] = Query(None, description="Search by inspection code, package title, or notes"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("inspections:read")),
):
    """
    List field inspections with comprehensive relational hydration and query filters.
    """
    return inspection_service.list_inspections(
        db=db,
        current_user=current_user,
        work_package_id=work_package_id,
        project_id=project_id,
        inspector_id=inspector_id,
        outcome=outcome,
        inspection_type=inspection_type,
        zone_id=zone_id,
        search=search,
    )


@router.get("/stats", response_model=InspectionStats)
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("inspections:read")),
):
    """
    Calculate high-level inspection statistics including overall pass rate and status distributions.
    """
    return inspection_service.get_inspection_stats(db=db)


@router.get("/{inspection_id}", response_model=InspectionResponse)
def get_inspection(
    inspection_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("inspections:read")),
):
    """
    Retrieve full details for an inspection by its UUID or inspection_id code.
    """
    return inspection_service.get_inspection_by_id(db=db, inspection_id=inspection_id)


@router.post("", response_model=InspectionResponse, status_code=status.HTTP_201_CREATED)
def schedule_inspection(
    data: InspectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("inspections:assign")),
):
    """
    Schedule a new physical field verification inspection for a work package.
    Automatically assigns appropriate engineering checklist templates.
    """
    return inspection_service.create_inspection(db=db, data=data, current_user=current_user)


@router.post("/{inspection_id}/execute", response_model=InspectionResponse)
def execute_inspection(
    inspection_id: str,
    exec_data: InspectionExecuteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("inspections:conduct")),
):
    """
    Field Inspector executes physical verification checklists, captures mobile sensor GPS,
    attaches photo evidence, and records an authoritative engineering verdict.
    CRITICAL: Updates verified progress on Passed, or halts progress and marks milestone rejected on Failed.
    """
    return inspection_service.execute_inspection(
        db=db,
        inspection_id=inspection_id,
        exec_in=exec_data,
        current_user=current_user,
    )


@router.patch("/{inspection_id}/review", response_model=InspectionResponse)
def review_inspection(
    inspection_id: str,
    review_data: InspectionReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("inspections:review")),
):
    """
    Supervisory review and administrative sign-off by Executive Engineer or District Collector.
    """
    return inspection_service.review_inspection(
        db=db,
        inspection_id=inspection_id,
        review_in=review_data,
        current_user=current_user,
    )
