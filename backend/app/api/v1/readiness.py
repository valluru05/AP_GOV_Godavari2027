from typing import Optional, List
from fastapi import APIRouter, Depends, Query, Path, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, require_permission
from app.models.user import User
from app.schemas.readiness import (
    ReadinessChainResponse,
    AcceptanceValidationResult,
    AcceptanceTransitionRequest,
    WorkPackageRiskEvaluation,
    ReadinessDashboardSummary
)
from app.schemas.project import WorkPackageResponse
from app.services.readiness_service import (
    build_readiness_chain,
    validate_acceptance_criteria,
    transition_work_package_acceptance,
    evaluate_work_package_risk,
    get_readiness_dashboard_summary
)
from app.models.domain import WorkPackage

router = APIRouter(prefix="/readiness", tags=["Readiness Chain & Risk Engine"])


@router.get("/dashboard", response_model=ReadinessDashboardSummary)
def get_readiness_dashboard(
    project_id: Optional[str] = Query(None, description="Filter by Project ID"),
    zone_id: Optional[str] = Query(None, description="Filter by Zone ID"),
    category: Optional[str] = Query(None, description="Filter by Work Category"),
    risk_category: Optional[str] = Query(None, description="Filter by Risk Category (Critical | High | Moderate | Low)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns system-wide readiness statistics and prioritized list of evaluated work packages
    with explainable 0-100 risk scores per Section 14.
    """
    return get_readiness_dashboard_summary(
        db=db,
        project_id=project_id,
        zone_id=zone_id,
        category=category,
        risk_category=risk_category
    )


@router.get("/work-packages/{work_package_id}/chain", response_model=ReadinessChainResponse)
def get_work_package_readiness_chain(
    work_package_id: str = Path(..., description="Work Package UUID or work_id"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns the complete 12-link verified readiness chain for a work package
    from Project inception to Godavari Pushkaralu operational readiness.
    """
    # Support lookup by work_id (e.g. WP-DW-KOTI-01) or UUID
    wp = db.query(WorkPackage).filter(
        (WorkPackage.id == work_package_id) | (WorkPackage.work_id == work_package_id)
    ).first()
    target_id = wp.id if wp else work_package_id

    return build_readiness_chain(db=db, work_package_id=target_id)


@router.get("/work-packages/{work_package_id}/risk", response_model=WorkPackageRiskEvaluation)
def get_work_package_risk_breakdown(
    work_package_id: str = Path(..., description="Work Package UUID or work_id"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns the explainable rule-based risk evaluation for a work package
    including individual rule triggers, point impacts, and suggested actions.
    """
    wp = db.query(WorkPackage).filter(
        (WorkPackage.id == work_package_id) | (WorkPackage.work_id == work_package_id)
    ).first()
    if not wp:
        target_id = work_package_id
        from fastapi import HTTPException
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Work package '{work_package_id}' not found")
    
    return evaluate_work_package_risk(db=db, wp=wp)


@router.post("/work-packages/{work_package_id}/validate-acceptance", response_model=AcceptanceValidationResult)
def run_acceptance_preflight_validation(
    work_package_id: str = Path(..., description="Work Package UUID or work_id"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Executes pre-flight checklist validation against acceptance criteria
    before formal sign-off per Section 13.
    """
    wp = db.query(WorkPackage).filter(
        (WorkPackage.id == work_package_id) | (WorkPackage.work_id == work_package_id)
    ).first()
    target_id = wp.id if wp else work_package_id

    return validate_acceptance_criteria(db=db, work_package_id=target_id)


@router.post("/work-packages/{work_package_id}/accept", response_model=WorkPackageResponse)
def accept_work_package(
    payload: AcceptanceTransitionRequest,
    work_package_id: str = Path(..., description="Work Package UUID or work_id"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("acceptance:approve"))
):
    """
    Executes controlled administrative acceptance of a completed work package.
    Enforces that blocking criteria are met unless authorized exception is signed off.
    Records immutable append-only audit event.
    """
    wp = db.query(WorkPackage).filter(
        (WorkPackage.id == work_package_id) | (WorkPackage.work_id == work_package_id)
    ).first()
    target_id = wp.id if wp else work_package_id

    updated_wp = transition_work_package_acceptance(
        db=db,
        work_package_id=target_id,
        payload=payload,
        current_user=current_user
    )
    return updated_wp
