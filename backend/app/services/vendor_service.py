from datetime import date, datetime, timezone
import uuid
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from fastapi import HTTPException, status

from app.models.domain import Vendor, WorkPackage, Milestone, Defect, Project, ProgressSubmission
from app.models.user import User
from app.services.audit_service import record_audit_event
from app.schemas.vendor import (
    VendorCreate,
    VendorUpdate,
    VendorResponse,
    VendorDashboardResponse,
    AssignedWorkPackageSummary,
    ProgressSubmissionCreate,
    ProgressSubmissionResponse,
    SubmissionReviewRequest,
)


def _has_financial_permission(user: User) -> bool:
    """Financial fields are restricted to super_admin, municipal_admin, and project_manager."""
    user_role_ids = {r.id for r in user.roles}
    return bool(user_role_ids.intersection({"super_admin", "municipal_admin", "project_manager"}))


def _generate_submission_code(db: Session) -> str:
    """Generate sequential unique submission code: SUB-2027-XXXX."""
    count = db.query(func.count(ProgressSubmission.id)).scalar() or 0
    return f"SUB-2027-{(count + 1):04d}"


def list_vendors(
    db: Session,
    current_user: User,
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    category_filter: Optional[str] = None,
) -> List[VendorResponse]:
    """List vendors with active package counts and masked contract figures."""
    query = db.query(Vendor)

    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Vendor.company_name.ilike(search_fmt),
                Vendor.vendor_code.ilike(search_fmt),
                Vendor.contact_name.ilike(search_fmt),
                Vendor.category.ilike(search_fmt),
                Vendor.contract_reference.ilike(search_fmt),
            )
        )

    if status_filter:
        query = query.filter(Vendor.status == status_filter)

    if category_filter:
        query = query.filter(Vendor.category == category_filter)

    vendors = query.order_by(Vendor.company_name.asc()).all()

    can_view_finances = _has_financial_permission(current_user)

    results: List[VendorResponse] = []
    for v in vendors:
        packages = v.work_packages or []
        assigned_count = len(packages)
        active_count = sum(1 for p in packages if p.workflow_state not in ("Verified Complete", "Ready for Handover", "Cancelled"))
        total_val = None

        results.append(
            VendorResponse(
                id=v.id,
                vendor_code=v.vendor_code,
                company_name=v.company_name,
                category=v.category,
                contact_name=v.contact_name,
                email=v.email,
                phone=v.phone,
                contract_reference=v.contract_reference,
                status=v.status,
                contract_start_date=v.contract_start_date,
                contract_end_date=v.contract_end_date,
                compliance_status=v.compliance_status,
                compliance_document_ref=v.compliance_document_ref,
                compliance_document_expiry=v.compliance_document_expiry,
                created_at=v.created_at,
                updated_at=v.updated_at,
                assigned_packages_count=assigned_count,
                active_packages_count=active_count,
                total_contract_value=total_val,
                is_financial_masked=not can_view_finances,
            )
        )

    return results


def get_vendor_by_id(db: Session, vendor_id: str, current_user: User) -> VendorResponse:
    """Get single vendor by ID with permissions-aware figures."""
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Vendor '{vendor_id}' not found.")

    can_view_finances = _has_financial_permission(current_user)
    packages = vendor.work_packages or []
    assigned_count = len(packages)
    active_count = sum(1 for p in packages if p.workflow_state not in ("Verified Complete", "Ready for Handover", "Cancelled"))
    total_val = None

    return VendorResponse(
        id=vendor.id,
        vendor_code=vendor.vendor_code,
        company_name=vendor.company_name,
        category=vendor.category,
        contact_name=vendor.contact_name,
        email=vendor.email,
        phone=vendor.phone,
        contract_reference=vendor.contract_reference,
        status=vendor.status,
        contract_start_date=vendor.contract_start_date,
        contract_end_date=vendor.contract_end_date,
        compliance_status=vendor.compliance_status,
        compliance_document_ref=vendor.compliance_document_ref,
        compliance_document_expiry=vendor.compliance_document_expiry,
        created_at=vendor.created_at,
        updated_at=vendor.updated_at,
        assigned_packages_count=assigned_count,
        active_packages_count=active_count,
        total_contract_value=total_val,
        is_financial_masked=not can_view_finances,
    )


def create_vendor(db: Session, data: VendorCreate, current_user: User) -> VendorResponse:
    """Register a new vendor in the contractor registry."""
    existing = db.query(Vendor).filter(
        or_(Vendor.vendor_code == data.vendor_code, Vendor.email == data.email)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Vendor with code '{data.vendor_code}' or email '{data.email}' already exists.",
        )

    new_vendor = Vendor(
        id=f"vnd-{uuid.uuid4().hex[:8]}",
        vendor_code=data.vendor_code,
        company_name=data.company_name,
        category=data.category,
        contact_name=data.contact_name,
        email=data.email,
        phone=data.phone,
        contract_reference=data.contract_reference,
        status=data.status,
        contract_start_date=data.contract_start_date,
        contract_end_date=data.contract_end_date,
        compliance_status=data.compliance_status,
        compliance_document_ref=data.compliance_document_ref,
        compliance_document_expiry=data.compliance_document_expiry,
    )
    db.add(new_vendor)
    db.flush()

    record_audit_event(
        db=db,
        action="VENDOR_REGISTERED",
        entity_type="vendor",
        entity_id=new_vendor.id,
        actor_id=current_user.id,
        actor_email=current_user.email,
        details={
            "vendor_code": new_vendor.vendor_code,
            "company_name": new_vendor.company_name,
            "category": new_vendor.category,
        },
    )
    db.refresh(new_vendor)

    return get_vendor_by_id(db, new_vendor.id, current_user)


def update_vendor(db: Session, vendor_id: str, data: VendorUpdate, current_user: User) -> VendorResponse:
    """Update contractor details and compliance records."""
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Vendor '{vendor_id}' not found.")

    update_dict = data.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        setattr(vendor, field, val)

    record_audit_event(
        db=db,
        action="VENDOR_UPDATED",
        entity_type="vendor",
        entity_id=vendor.id,
        actor_id=current_user.id,
        actor_email=current_user.email,
        details={"updated_fields": list(update_dict.keys())},
    )
    db.refresh(vendor)

    return get_vendor_by_id(db, vendor.id, current_user)


def get_vendor_dashboard(db: Session, vendor_id: str, current_user: User) -> VendorDashboardResponse:
    """
    Detailed contractor dashboard for assigned works, milestone deadlines, open defects,
    and progress submissions. Strictly enforces authorization for vendor persona.
    """
    user_role_ids = {r.id for r in current_user.roles}
    
    # Boundary enforcement: A vendor user cannot inspect another vendor's portal
    if "vendor" in user_role_ids and current_user.vendor_id != vendor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Contractor access denied: You cannot view or access another vendor's workspace.",
        )

    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Vendor '{vendor_id}' not found.")

    vendor_summary = get_vendor_by_id(db, vendor_id, current_user)

    # Assigned packages
    work_packages = db.query(WorkPackage).filter(WorkPackage.vendor_id == vendor_id).all()
    
    assigned_packages_summary: List[AssignedWorkPackageSummary] = []
    total_reported_pct = 0.0
    total_verified_pct = 0.0
    all_defects_count = 0
    critical_defects_count = 0
    milestones_total = 0
    milestones_completed = 0
    milestones_overdue = 0
    today = date.today()

    for wp in work_packages:
        project_name = wp.project.name if wp.project else "Unknown Project"
        ms_list = wp.milestones or []
        wp_defects = wp.defects or []

        open_wp_defects = [d for d in wp_defects if d.status != "Closed"]
        all_defects_count += len(open_wp_defects)
        critical_defects_count += sum(1 for d in open_wp_defects if d.severity == "Critical")

        ms_done = sum(1 for m in ms_list if m.verification_status == "Verified" or m.reported_status == "Completed")
        ms_total = len(ms_list)

        for m in ms_list:
            if m.due_date < today and m.verification_status != "Verified":
                milestones_overdue += 1

        milestones_total += ms_total
        milestones_completed += ms_done
        total_reported_pct += wp.reported_progress_percentage
        total_verified_pct += wp.verified_progress_percentage

        assigned_packages_summary.append(
            AssignedWorkPackageSummary(
                id=wp.id,
                work_id=wp.work_id,
                package_code=wp.work_id,
                title=wp.title,
                project_id=wp.project_id,
                project_name=project_name,
                category=wp.category,
                reported_progress_percentage=wp.reported_progress_percentage,
                verified_progress_percentage=wp.verified_progress_percentage,
                workflow_state=wp.workflow_state,
                planned_completion_date=wp.planned_completion_date,
                target_completion_date=wp.planned_completion_date,
                milestones_total=ms_total,
                milestones_completed=ms_done,
                open_defects_count=len(open_wp_defects),
            )
        )

    num_packages = len(work_packages)
    avg_reported = round(total_reported_pct / num_packages, 1) if num_packages > 0 else 0.0
    avg_verified = round(total_verified_pct / num_packages, 1) if num_packages > 0 else 0.0
    progress_gap = round(avg_reported - avg_verified, 1)

    # Submissions
    submissions = (
        db.query(ProgressSubmission)
        .filter(ProgressSubmission.vendor_id == vendor_id)
        .order_by(ProgressSubmission.created_at.desc())
        .limit(20)
        .all()
    )

    submission_responses: List[ProgressSubmissionResponse] = []
    for s in submissions:
        wp_title = s.work_package.title if s.work_package else None
        wp_code = s.work_package.work_id if s.work_package else None
        p_name = s.work_package.project.name if s.work_package and s.work_package.project else None
        submission_responses.append(
            ProgressSubmissionResponse(
                id=s.id,
                submission_code=s.submission_code,
                work_package_id=s.work_package_id,
                vendor_id=s.vendor_id,
                submitted_by_id=s.submitted_by_id,
                progress_percentage=s.progress_percentage,
                activities_description=s.activities_description,
                delay_or_blocker=s.delay_or_blocker,
                estimated_completion_date=s.estimated_completion_date,
                evidence_attachments=s.evidence_attachments or [],
                review_status=s.review_status,
                reviewer_id=s.reviewer_id,
                reviewer_notes=s.reviewer_notes,
                reviewed_at=s.reviewed_at,
                created_at=s.created_at,
                work_package_title=wp_title,
                work_package_code=wp_code,
                vendor_name=vendor.company_name,
                project_name=p_name,
            )
        )

    metrics = {
        "total_assigned_packages": num_packages,
        "active_packages": sum(1 for wp in work_packages if wp.workflow_state not in ("Verified Complete", "Ready for Handover", "Cancelled")),
        "average_reported_progress": avg_reported,
        "average_verified_progress": avg_verified,
        "progress_gap": progress_gap,
        "open_defects_count": all_defects_count,
        "critical_defects_count": critical_defects_count,
        "milestones_total": milestones_total,
        "milestones_completed": milestones_completed,
        "milestones_overdue": milestones_overdue,
        "compliance_status": vendor.compliance_status,
        "contract_valid_until": vendor.contract_end_date.isoformat() if vendor.contract_end_date else None,
    }

    return VendorDashboardResponse(
        vendor=vendor_summary,
        assigned_work_packages=assigned_packages_summary,
        recent_submissions=submission_responses,
        metrics=metrics,
    )


def submit_vendor_progress(
    db: Session,
    submission_in: ProgressSubmissionCreate,
    current_user: User,
) -> ProgressSubmissionResponse:
    """
    Submits a contractor progress update.
    CRITICAL ANTI-CORRUPTION RULE:
    Updating reported progress percentage to 100% NEVER alters verified_progress_percentage
    nor transitions the work package to 'Verified Complete'. Independent inspection is strictly required.
    """
    wp = db.query(WorkPackage).filter(WorkPackage.id == submission_in.work_package_id).first()
    if not wp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Work Package '{submission_in.work_package_id}' not found.")

    user_role_ids = {r.id for r in current_user.roles}

    # Vendor boundary check
    if "vendor" in user_role_ids:
        if not current_user.vendor_id or current_user.vendor_id != wp.vendor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Security Violation: You are not authorized to submit progress for another contractor's work package.",
            )
        vendor_id = current_user.vendor_id
    else:
        # PM or admin submitting on behalf of vendor
        vendor_id = wp.vendor_id

    sub_code = _generate_submission_code(db)

    new_submission = ProgressSubmission(
        id=f"sub-{uuid.uuid4().hex[:8]}",
        submission_code=sub_code,
        work_package_id=wp.id,
        vendor_id=vendor_id,
        submitted_by_id=current_user.id,
        progress_percentage=submission_in.progress_percentage,
        activities_description=submission_in.activities_description,
        delay_or_blocker=submission_in.delay_or_blocker,
        estimated_completion_date=submission_in.estimated_completion_date,
        evidence_attachments=submission_in.evidence_attachments or [],
        review_status="Under Review",
    )
    db.add(new_submission)

    # Update work package reported progress WITHOUT touching verified progress!
    old_reported = wp.reported_progress_percentage
    wp.reported_progress_percentage = round(submission_in.progress_percentage, 1)

    # Workflow state transition if applicable: Draft or Commenced -> Progress Reported
    if wp.workflow_state in ("Draft", "Work Commenced"):
        wp.workflow_state = "Progress Reported"

    # Append immutable audit trail
    record_audit_event(
        db=db,
        action="VENDOR_PROGRESS_SUBMITTED",
        entity_type="work_package",
        entity_id=wp.id,
        actor_id=current_user.id,
        actor_email=current_user.email,
        details={
            "submission_code": sub_code,
            "work_package_code": wp.work_id,
            "old_reported_progress": old_reported,
            "new_reported_progress": wp.reported_progress_percentage,
            "verified_progress_remains": wp.verified_progress_percentage,
            "has_delay_declared": bool(submission_in.delay_or_blocker),
        },
    )
    db.refresh(new_submission)
    db.refresh(wp)

    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()

    return ProgressSubmissionResponse(
        id=new_submission.id,
        submission_code=new_submission.submission_code,
        work_package_id=new_submission.work_package_id,
        vendor_id=new_submission.vendor_id,
        submitted_by_id=new_submission.submitted_by_id,
        progress_percentage=new_submission.progress_percentage,
        activities_description=new_submission.activities_description,
        delay_or_blocker=new_submission.delay_or_blocker,
        estimated_completion_date=new_submission.estimated_completion_date,
        evidence_attachments=new_submission.evidence_attachments or [],
        review_status=new_submission.review_status,
        reviewer_id=new_submission.reviewer_id,
        reviewer_notes=new_submission.reviewer_notes,
        reviewed_at=new_submission.reviewed_at,
        created_at=new_submission.created_at,
        work_package_title=wp.title,
        work_package_code=wp.work_id,
        vendor_name=vendor.company_name if vendor else "Assigned Vendor",
        project_name=wp.project.name if wp.project else "Project",
    )


def review_progress_submission(
    db: Session,
    submission_id: str,
    review_in: SubmissionReviewRequest,
    current_user: User,
) -> ProgressSubmissionResponse:
    """
    Independent review of a vendor's progress submission.
    Reviewer must not be the vendor (Vendor cannot review their own work).
    """
    user_role_ids = {r.id for r in current_user.roles}
    if "vendor" in user_role_ids and len(user_role_ids) == 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Conflict of Interest: A contractor cannot review or approve their own submissions.",
        )

    submission = db.query(ProgressSubmission).filter(ProgressSubmission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Submission '{submission_id}' not found.")

    if review_in.review_status not in ("Reviewed", "Rejected"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid review status. Expected 'Reviewed' or 'Rejected'.",
        )

    submission.review_status = review_in.review_status
    submission.reviewer_id = current_user.id
    submission.reviewer_notes = review_in.reviewer_notes
    submission.reviewed_at = datetime.now(timezone.utc)

    # Audit event
    record_audit_event(
        db=db,
        action="VENDOR_PROGRESS_REVIEWED",
        entity_type="progress_submission",
        entity_id=submission.id,
        actor_id=current_user.id,
        actor_email=current_user.email,
        details={
            "submission_code": submission.submission_code,
            "decision": review_in.review_status,
            "reviewer_notes": review_in.reviewer_notes,
            "work_package_id": submission.work_package_id,
        },
    )
    db.refresh(submission)

    wp = submission.work_package
    vendor = submission.vendor

    return ProgressSubmissionResponse(
        id=submission.id,
        submission_code=submission.submission_code,
        work_package_id=submission.work_package_id,
        vendor_id=submission.vendor_id,
        submitted_by_id=submission.submitted_by_id,
        progress_percentage=submission.progress_percentage,
        activities_description=submission.activities_description,
        delay_or_blocker=submission.delay_or_blocker,
        estimated_completion_date=submission.estimated_completion_date,
        evidence_attachments=submission.evidence_attachments or [],
        review_status=submission.review_status,
        reviewer_id=submission.reviewer_id,
        reviewer_notes=submission.reviewer_notes,
        reviewed_at=submission.reviewed_at,
        created_at=submission.created_at,
        work_package_title=wp.title if wp else None,
        work_package_code=wp.work_id if wp else None,
        vendor_name=vendor.company_name if vendor else None,
        project_name=wp.project.name if wp and wp.project else None,
    )


def list_progress_submissions(
    db: Session,
    current_user: User,
    work_package_id: Optional[str] = None,
    vendor_id: Optional[str] = None,
    review_status: Optional[str] = None,
) -> List[ProgressSubmissionResponse]:
    """List progress submissions with filtering and vendor tenancy checks."""
    user_role_ids = {r.id for r in current_user.roles}

    query = db.query(ProgressSubmission)

    # Enforce vendor boundary
    if "vendor" in user_role_ids:
        query = query.filter(ProgressSubmission.vendor_id == current_user.vendor_id)
    elif vendor_id:
        query = query.filter(ProgressSubmission.vendor_id == vendor_id)

    if work_package_id:
        query = query.filter(ProgressSubmission.work_package_id == work_package_id)

    if review_status:
        query = query.filter(ProgressSubmission.review_status == review_status)

    submissions = query.order_by(ProgressSubmission.created_at.desc()).all()

    results: List[ProgressSubmissionResponse] = []
    for s in submissions:
        wp = s.work_package
        vendor = s.vendor
        results.append(
            ProgressSubmissionResponse(
                id=s.id,
                submission_code=s.submission_code,
                work_package_id=s.work_package_id,
                vendor_id=s.vendor_id,
                submitted_by_id=s.submitted_by_id,
                progress_percentage=s.progress_percentage,
                activities_description=s.activities_description,
                delay_or_blocker=s.delay_or_blocker,
                estimated_completion_date=s.estimated_completion_date,
                evidence_attachments=s.evidence_attachments or [],
                review_status=s.review_status,
                reviewer_id=s.reviewer_id,
                reviewer_notes=s.reviewer_notes,
                reviewed_at=s.reviewed_at,
                created_at=s.created_at,
                work_package_title=wp.title if wp else None,
                work_package_code=wp.work_id if wp else None,
                vendor_name=vendor.company_name if vendor else None,
                project_name=wp.project.name if wp and wp.project else None,
            )
        )
    return results
