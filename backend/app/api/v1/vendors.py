from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.api.deps import get_current_user, require_permission
from app.schemas.vendor import (
    VendorResponse,
    VendorCreate,
    VendorUpdate,
    VendorDashboardResponse,
    ProgressSubmissionCreate,
    ProgressSubmissionResponse,
    SubmissionReviewRequest,
)
from app.services import vendor_service

router = APIRouter(prefix="/vendors", tags=["Vendor & Service-Provider Management"])


@router.get("", response_model=List[VendorResponse])
def get_vendors(
    search: Optional[str] = Query(None, description="Search by name, code, contact, or category"),
    status: Optional[str] = Query(None, description="Filter by status: Active, Suspended, Under Review"),
    category: Optional[str] = Query(None, description="Filter by category"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List contractor and service-provider records.
    Masks financial contract sums for unauthorized personas.
    """
    return vendor_service.list_vendors(
        db=db,
        current_user=current_user,
        search=search,
        status_filter=status,
        category_filter=category,
    )


@router.post("", response_model=VendorResponse, status_code=status.HTTP_201_CREATED)
def register_vendor(
    vendor_in: VendorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("projects:edit")),
):
    """
    Register a new contractor or vendor entity.
    Requires administrative role with project modification rights.
    """
    return vendor_service.create_vendor(db=db, data=vendor_in, current_user=current_user)


@router.get("/me/dashboard", response_model=VendorDashboardResponse)
def get_my_vendor_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves the dedicated contractor portal for the logged-in vendor persona.
    """
    if not current_user.vendor_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The current user account is not linked to any registered vendor/contractor entity.",
        )
    return vendor_service.get_vendor_dashboard(db=db, vendor_id=current_user.vendor_id, current_user=current_user)


@router.get("/progress-submissions", response_model=List[ProgressSubmissionResponse])
def list_submissions(
    work_package_id: Optional[str] = Query(None),
    vendor_id: Optional[str] = Query(None),
    review_status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List historical contractor progress submissions.
    Automatically scopes to own vendor if requesting user has Vendor role.
    """
    return vendor_service.list_progress_submissions(
        db=db,
        current_user=current_user,
        work_package_id=work_package_id,
        vendor_id=vendor_id,
        review_status=review_status,
    )


@router.post("/progress-submissions", response_model=ProgressSubmissionResponse, status_code=status.HTTP_201_CREATED)
def submit_progress(
    submission_in: ProgressSubmissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("progress:submit")),
):
    """
    Submits contractor progress update with description, delay declarations, and evidence.
    CRITICAL RULE: Updating reported progress to 100% NEVER alters verified_progress_percentage
    nor transitions the work package to 'Verified Complete'.
    """
    return vendor_service.submit_vendor_progress(
        db=db,
        submission_in=submission_in,
        current_user=current_user,
    )


@router.patch("/progress-submissions/{submission_id}/review", response_model=ProgressSubmissionResponse)
def review_submission(
    submission_id: str,
    review_in: SubmissionReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("progress:review")),
):
    """
    Independent government review of a vendor's progress submission.
    Cannot be approved/reviewed by the contractor themselves.
    """
    return vendor_service.review_progress_submission(
        db=db,
        submission_id=submission_id,
        review_in=review_in,
        current_user=current_user,
    )


@router.get("/{vendor_id}", response_model=VendorResponse)
def get_vendor(
    vendor_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get vendor profile by ID."""
    return vendor_service.get_vendor_by_id(db=db, vendor_id=vendor_id, current_user=current_user)


@router.patch("/{vendor_id}", response_model=VendorResponse)
def update_vendor(
    vendor_id: str,
    vendor_in: VendorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("projects:edit")),
):
    """Update vendor profile or compliance details."""
    return vendor_service.update_vendor(db=db, vendor_id=vendor_id, data=vendor_in, current_user=current_user)


@router.get("/{vendor_id}/dashboard", response_model=VendorDashboardResponse)
def get_vendor_dashboard(
    vendor_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Contractor performance scorecard and active assigned works.
    Enforces tenancy boundary: contractor users cannot access other vendors' dashboards.
    """
    return vendor_service.get_vendor_dashboard(db=db, vendor_id=vendor_id, current_user=current_user)
