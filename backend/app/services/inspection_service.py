import math
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from fastapi import HTTPException, status

from app.models.domain import Inspection, WorkPackage, Milestone, Asset, Project, Zone
from app.models.user import User
from app.services.audit_service import record_audit_event
from app.schemas.inspection import (
    InspectionCreate,
    InspectionExecuteRequest,
    InspectionReviewRequest,
    InspectionResponse,
    InspectionStats,
)


def _haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two GPS coordinates in meters."""
    R = 6371000.0  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def _generate_inspection_code(db: Session, wp_code: str) -> str:
    """Generates unique inspection identifier: INSP-2027-{WP_CODE}-{XXXX}."""
    count = db.query(func.count(Inspection.id)).scalar() or 0
    clean_wp = wp_code.replace("WP-", "").replace("-", "")
    return f"INSP-2027-{clean_wp}-{(count + 1):03d}"


def _serialize_inspection(insp: Inspection) -> InspectionResponse:
    wp = insp.work_package
    project = wp.project if wp else None
    zone = project.zone if project and project.zone else None
    inspector = insp.inspector if hasattr(insp, 'inspector') else None
    milestone = insp.milestone if hasattr(insp, 'milestone') else None
    asset = insp.asset if hasattr(insp, 'asset') else None
    defects = insp.defects if hasattr(insp, 'defects') else []

    open_defects = sum(1 for d in defects if d.status != "Closed") if defects else 0

    return InspectionResponse(
        id=insp.id,
        inspection_id=insp.inspection_id,
        work_package_id=insp.work_package_id,
        work_package_title=wp.title if wp else None,
        work_id=wp.work_id if wp else None,
        project_id=wp.project_id if wp else None,
        project_name=project.name if project else None,
        zone_name=zone.name if zone else None,
        inspector_id=insp.inspector_id,
        inspector_name=inspector.full_name if inspector else "Assigned Inspector",
        milestone_id=insp.milestone_id,
        milestone_name=milestone.name if milestone else None,
        asset_id=insp.asset_id,
        asset_code=asset.asset_code if asset else None,
        scheduled_date=insp.scheduled_date,
        actual_inspection_date=insp.actual_inspection_date,
        inspection_type=insp.inspection_type,
        checklist_version=insp.checklist_version,
        checklist_results=insp.checklist_results or [],
        evidence_photos=insp.evidence_photos or [],
        latitude=insp.latitude,
        longitude=insp.longitude,
        gps_accuracy_meters=insp.gps_accuracy_meters,
        is_geofence_verified=insp.is_geofence_verified if insp.is_geofence_verified is not None else True,
        outcome=insp.outcome,
        notes=insp.notes,
        verified_percentage_awarded=insp.verified_percentage_awarded,
        reviewer_decision=insp.reviewer_decision,
        inspector_signature=insp.inspector_signature,
        open_defects_count=open_defects,
        created_at=insp.created_at,
    )


def list_inspections(
    db: Session,
    current_user: User,
    work_package_id: Optional[str] = None,
    project_id: Optional[str] = None,
    inspector_id: Optional[str] = None,
    outcome: Optional[str] = None,
    inspection_type: Optional[str] = None,
    zone_id: Optional[str] = None,
    search: Optional[str] = None,
) -> List[InspectionResponse]:
    """Retrieve inspections list with full relation hydration and dynamic filtering."""
    query = db.query(Inspection).join(WorkPackage, Inspection.work_package_id == WorkPackage.id)

    if work_package_id:
        query = query.filter(Inspection.work_package_id == work_package_id)

    if project_id:
        query = query.filter(WorkPackage.project_id == project_id)

    if inspector_id:
        query = query.filter(Inspection.inspector_id == inspector_id)

    if outcome:
        query = query.filter(Inspection.outcome == outcome)

    if inspection_type:
        query = query.filter(Inspection.inspection_type == inspection_type)

    if zone_id:
        query = query.join(Project, WorkPackage.project_id == Project.id).filter(Project.zone_id == zone_id)

    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Inspection.inspection_id.ilike(search_fmt),
                Inspection.notes.ilike(search_fmt),
                Inspection.inspection_type.ilike(search_fmt),
                WorkPackage.title.ilike(search_fmt),
                WorkPackage.work_id.ilike(search_fmt),
            )
        )

    inspections = query.order_by(Inspection.created_at.desc()).all()
    return [_serialize_inspection(i) for i in inspections]


def get_inspection_by_id(db: Session, inspection_id: str) -> InspectionResponse:
    """Fetch single inspection record by ID or inspection_id code."""
    insp = (
        db.query(Inspection)
        .filter(or_(Inspection.id == inspection_id, Inspection.inspection_id == inspection_id))
        .first()
    )
    if not insp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inspection '{inspection_id}' not found.",
        )
    return _serialize_inspection(insp)


def create_inspection(
    db: Session,
    data: InspectionCreate,
    current_user: User,
) -> InspectionResponse:
    """Schedules a new on-site inspection for an infrastructure work package."""
    wp = db.query(WorkPackage).filter(WorkPackage.id == data.work_package_id).first()
    if not wp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Work Package '{data.work_package_id}' not found.")

    if data.milestone_id:
        ms = db.query(Milestone).filter(Milestone.id == data.milestone_id).first()
        if not ms:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Milestone '{data.milestone_id}' not found.")

    code = _generate_inspection_code(db, wp.work_id)

    # Initial checklist template based on category
    default_checklist = []
    if "Water" in wp.category or "Hydraulic" in wp.category:
        default_checklist = [
            {"item": "Pipe joint welding & flange torque test", "verdict": "Pending", "measurement": None, "notes": None},
            {"item": "Hydrostatic pressure test sustained for 30 mins (6 bar)", "verdict": "Pending", "measurement": None, "notes": None},
            {"item": "Potability & microbial preliminary water sampling", "verdict": "Pending", "measurement": None, "notes": None},
        ]
    elif "Sanitation" in wp.category:
        default_checklist = [
            {"item": "Bio-digester tank seal integrity and gas ventilation", "verdict": "Pending", "measurement": None, "notes": None},
            {"item": "Wheelchair ramp gradient & non-slip surface compliance", "verdict": "Pending", "measurement": None, "notes": None},
            {"item": "Water supply pressure at tap manifolds (> 2.0 bar)", "verdict": "Pending", "measurement": None, "notes": None},
        ]
    elif "Lighting" in wp.category or "Electrical" in wp.category:
        default_checklist = [
            {"item": "High-mast tower foundation verticality & anchor torque", "verdict": "Pending", "measurement": None, "notes": None},
            {"item": "Earthing pit resistance verification (< 2.0 ohms)", "verdict": "Pending", "measurement": None, "notes": None},
            {"item": "Ground illumination lux level under 100% array (> 50 lux)", "verdict": "Pending", "measurement": None, "notes": None},
        ]
    else:
        default_checklist = [
            {"item": "Structural reinforcement & concrete grade verification", "verdict": "Pending", "measurement": None, "notes": None},
            {"item": "Dimensions and dimensional tolerances compliance", "verdict": "Pending", "measurement": None, "notes": None},
            {"item": "Worksite safety barriers & public hazard segregation", "verdict": "Pending", "measurement": None, "notes": None},
        ]

    new_inspection = Inspection(
        id=f"insp-{uuid.uuid4().hex[:8]}",
        inspection_id=code,
        work_package_id=wp.id,
        inspector_id=data.inspector_id or current_user.id,
        milestone_id=data.milestone_id,
        asset_id=data.asset_id,
        scheduled_date=data.scheduled_date,
        inspection_type=data.inspection_type,
        checklist_version=data.checklist_version,
        checklist_results=default_checklist,
        evidence_photos=[],
        outcome="Scheduled",
        notes=data.notes,
    )
    db.add(new_inspection)
    db.flush()

    record_audit_event(
        db=db,
        action="INSPECTION_SCHEDULED",
        entity_type="inspection",
        entity_id=new_inspection.id,
        actor_id=current_user.id,
        actor_email=current_user.email,
        details={
            "inspection_code": new_inspection.inspection_id,
            "work_package_code": wp.work_id,
            "inspection_type": new_inspection.inspection_type,
            "scheduled_date": new_inspection.scheduled_date.isoformat() if new_inspection.scheduled_date else None,
        },
    )
    db.refresh(new_inspection)
    return _serialize_inspection(new_inspection)


def execute_inspection(
    db: Session,
    inspection_id: str,
    exec_in: InspectionExecuteRequest,
    current_user: User,
) -> InspectionResponse:
    """
    Field Inspector executes checklists, records measurements, captures geotagged evidence,
    and issues an authoritative verdict.
    CRITICAL ANTI-CORRUPTION & DOWNSTREAM VERDICT LOGIC:
    - If PASSED: updates work_package.verified_progress_percentage to reflect physical truth,
      marks attached milestone as 'Verified', transitions workflow state.
    - If FAILED: verified progress is NOT awarded or remains frozen; transitions workflow to
      'Verification Failed' and flags need for defect logging.
    """
    insp = (
        db.query(Inspection)
        .filter(or_(Inspection.id == inspection_id, Inspection.inspection_id == inspection_id))
        .first()
    )
    if not insp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Inspection '{inspection_id}' not found.")

    wp = insp.work_package
    project = wp.project if wp else None
    zone = project.zone if project else None

    # Verify geofence if coordinates are provided and zone has coordinates
    is_geofence_ok = True
    if exec_in.latitude is not None and exec_in.longitude is not None and zone and zone.latitude and zone.longitude:
        dist_meters = _haversine_distance_meters(exec_in.latitude, exec_in.longitude, zone.latitude, zone.longitude)
        # Geofence threshold for Pushkaralu Ghat sectors: 2500 meters
        is_geofence_ok = dist_meters <= 2500.0

    insp.actual_inspection_date = datetime.now(timezone.utc)
    insp.outcome = exec_in.outcome
    insp.notes = exec_in.notes
    insp.latitude = exec_in.latitude
    insp.longitude = exec_in.longitude
    insp.gps_accuracy_meters = exec_in.gps_accuracy_meters
    insp.is_geofence_verified = is_geofence_ok
    insp.checklist_results = [item.model_dump() for item in exec_in.checklist_results]
    insp.evidence_photos = [photo.model_dump() for photo in (exec_in.evidence_photos or [])]
    insp.inspector_signature = exec_in.inspector_signature or f"{current_user.full_name} ({current_user.username})"

    old_verified = wp.verified_progress_percentage

    if exec_in.outcome == "Passed":
        # Progress awarded
        if exec_in.verified_percentage_awarded is not None:
            awarded = round(exec_in.verified_percentage_awarded, 1)
        else:
            awarded = wp.reported_progress_percentage

        wp.verified_progress_percentage = awarded

        # If attached to milestone: mark verified
        if insp.milestone_id:
            ms = db.query(Milestone).filter(Milestone.id == insp.milestone_id).first()
            if ms:
                ms.verification_status = "Verified"
                ms.completed_at = datetime.now(timezone.utc)

        # If attached to asset: mark installed/ready
        if insp.asset_id:
            ast = db.query(Asset).filter(Asset.id == insp.asset_id).first()
            if ast:
                ast.lifecycle_status = "Operational Readiness"

        if awarded >= 100.0:
            wp.workflow_state = "Verified Complete"
        else:
            wp.workflow_state = "In Progress"

        insp.verified_percentage_awarded = awarded

    elif exec_in.outcome == "Failed":
        # Crucial: Verified progress does NOT advance
        wp.workflow_state = "Verification Failed"
        insp.verified_percentage_awarded = 0.0

        if insp.milestone_id:
            ms = db.query(Milestone).filter(Milestone.id == insp.milestone_id).first()
            if ms:
                ms.verification_status = "Rejected"

    elif exec_in.outcome == "Conditional Pass":
        # Conditional pass grants partial verified progress if specified
        if exec_in.verified_percentage_awarded is not None:
            wp.verified_progress_percentage = round(exec_in.verified_percentage_awarded, 1)
        wp.workflow_state = "In Progress"
        insp.verified_percentage_awarded = wp.verified_progress_percentage

    # Emit immutable audit event
    record_audit_event(
        db=db,
        action="INSPECTION_VERDICT_RECORDED",
        entity_type="inspection",
        entity_id=insp.id,
        actor_id=current_user.id,
        actor_email=current_user.email,
        details={
            "inspection_code": insp.inspection_id,
            "verdict": insp.outcome,
            "work_package_code": wp.work_id,
            "old_verified_progress": old_verified,
            "new_verified_progress": wp.verified_progress_percentage,
            "is_geofence_verified": is_geofence_ok,
            "items_checked": len(exec_in.checklist_results),
            "signature": insp.inspector_signature,
        },
    )

    db.commit()
    db.refresh(insp)
    db.refresh(wp)
    return _serialize_inspection(insp)


def review_inspection(
    db: Session,
    inspection_id: str,
    review_in: InspectionReviewRequest,
    current_user: User,
) -> InspectionResponse:
    """Supervisory engineering review of a field inspection verdict."""
    insp = (
        db.query(Inspection)
        .filter(or_(Inspection.id == inspection_id, Inspection.inspection_id == inspection_id))
        .first()
    )
    if not insp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Inspection '{inspection_id}' not found.")

    insp.reviewer_decision = review_in.reviewer_decision
    if review_in.notes:
        insp.notes = f"{insp.notes or ''}\n[Reviewer Note by {current_user.full_name}]: {review_in.notes}".strip()

    record_audit_event(
        db=db,
        action="INSPECTION_REVIEWED",
        entity_type="inspection",
        entity_id=insp.id,
        actor_id=current_user.id,
        actor_email=current_user.email,
        details={
            "inspection_code": insp.inspection_id,
            "reviewer_decision": review_in.reviewer_decision,
            "reviewer_notes": review_in.notes,
        },
    )

    db.commit()
    db.refresh(insp)
    return _serialize_inspection(insp)


def get_inspection_stats(db: Session) -> InspectionStats:
    """Calculates live inspection pass rate and status distributions."""
    total = db.query(func.count(Inspection.id)).scalar() or 0
    scheduled = db.query(func.count(Inspection.id)).filter(Inspection.outcome == "Scheduled").scalar() or 0
    passed = db.query(func.count(Inspection.id)).filter(Inspection.outcome == "Passed").scalar() or 0
    failed = db.query(func.count(Inspection.id)).filter(Inspection.outcome == "Failed").scalar() or 0
    conditional = db.query(func.count(Inspection.id)).filter(Inspection.outcome == "Conditional Pass").scalar() or 0

    executed = passed + failed + conditional
    pass_rate = round((passed / executed) * 100.0, 1) if executed > 0 else 0.0

    return InspectionStats(
        total_inspections=total,
        scheduled_count=scheduled,
        passed_count=passed,
        failed_count=failed,
        conditional_count=conditional,
        pass_rate_percentage=pass_rate,
    )
