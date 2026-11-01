import uuid
from datetime import datetime, date, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from fastapi import HTTPException, status

from app.models.domain import Defect, WorkPackage, Project, Zone, Vendor, Inspection, Asset
from app.models.user import User
from app.services.audit_service import record_audit_event
from app.schemas.defect import (
    DefectCreate,
    DefectVendorReworkRequest,
    DefectReinspectRequest,
    DefectCloseRequest,
    DefectResponse,
    DefectStats,
)


def _generate_defect_code(db: Session, wp_code: str) -> str:
    """Generates unique defect code format: DEF-{WP_CODE}-{001}."""
    count = db.query(func.count(Defect.id)).scalar() or 0
    clean_wp = wp_code.replace("WP-", "").replace("-", "")[:6]
    return f"DEF-{clean_wp}-{(count + 1):03d}"


def _serialize_defect(d: Defect) -> DefectResponse:
    wp = d.work_package
    project = wp.project if wp else None
    zone = project.zone if project else None
    insp = d.inspection
    asset = d.asset
    vendor = d.vendor or (wp.vendor if wp else None)
    reporter = d.reported_by
    verifier = d.verified_by
    closer = d.closed_by

    # Check overdue status
    is_overdue = False
    if d.target_resolution_date and d.status not in ["Resolved — Verification Passed", "Closed by Authorised User"]:
        is_overdue = d.target_resolution_date < date.today()

    return DefectResponse(
        id=d.id,
        defect_id=d.defect_id,
        work_package_id=d.work_package_id,
        work_package_title=wp.title if wp else None,
        work_id=wp.work_id if wp else None,
        project_id=wp.project_id if wp else None,
        project_name=project.name if project else None,
        zone_name=zone.name if zone else None,
        inspection_id=d.inspection_id,
        inspection_code=insp.inspection_id if insp else None,
        checklist_item_ref=d.checklist_item_ref,
        asset_id=d.asset_id,
        asset_code=asset.asset_code if asset else None,
        assigned_vendor_id=d.assigned_vendor_id or (wp.vendor_id if wp else None),
        assigned_vendor_name=vendor.company_name if vendor else None,
        title=d.title,
        description=d.description,
        category=d.category,
        severity=d.severity,
        status=d.status,
        target_resolution_date=d.target_resolution_date,
        is_overdue=is_overdue,
        reported_by_id=d.reported_by_id,
        reported_by_name=reporter.full_name if reporter else "Field Inspector",
        evidence_attachments=d.evidence_attachments or [],
        resolution_notes=d.resolution_notes,
        rework_evidence=d.rework_evidence or [],
        rework_count=d.rework_count or 0,
        verification_result=d.verification_result,
        verification_notes=d.verification_notes,
        verified_at=d.verified_at,
        verified_by_name=verifier.full_name if verifier else None,
        closed_at=d.closed_at,
        closed_by_name=closer.full_name if closer else None,
        history=d.history or [],
        created_at=d.created_at,
    )


def list_defects(
    db: Session,
    current_user: User,
    work_package_id: Optional[str] = None,
    project_id: Optional[str] = None,
    vendor_id: Optional[str] = None,
    severity: Optional[str] = None,
    status_filter: Optional[str] = None,
    zone_id: Optional[str] = None,
    search: Optional[str] = None,
) -> List[DefectResponse]:
    """Retrieve filtered defect records with tenancy enforcement for contractor accounts."""
    query = db.query(Defect).join(WorkPackage, Defect.work_package_id == WorkPackage.id)

    # Multi-tenancy isolation for contractor accounts
    is_vendor = any(r.id == "vendor" for r in current_user.roles) or current_user.vendor_id is not None
    if is_vendor and current_user.vendor_id:
        query = query.filter(
            or_(
                Defect.assigned_vendor_id == current_user.vendor_id,
                WorkPackage.vendor_id == current_user.vendor_id,
            )
        )
    elif vendor_id:
        query = query.filter(
            or_(
                Defect.assigned_vendor_id == vendor_id,
                WorkPackage.vendor_id == vendor_id,
            )
        )

    if work_package_id:
        query = query.filter(Defect.work_package_id == work_package_id)

    if project_id:
        query = query.filter(WorkPackage.project_id == project_id)

    if severity:
        query = query.filter(Defect.severity == severity)

    if status_filter:
        query = query.filter(Defect.status == status_filter)

    if zone_id:
        query = query.join(Project, WorkPackage.project_id == Project.id).filter(Project.zone_id == zone_id)

    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Defect.defect_id.ilike(search_fmt),
                Defect.title.ilike(search_fmt),
                Defect.description.ilike(search_fmt),
                WorkPackage.title.ilike(search_fmt),
                WorkPackage.work_id.ilike(search_fmt),
            )
        )

    defects = query.order_by(Defect.created_at.desc()).all()
    return [_serialize_defect(d) for d in defects]


def get_defect_by_id(db: Session, defect_id: str, current_user: User) -> DefectResponse:
    """Fetch single defect record by UUID or DEF- code with tenancy checks."""
    defect = (
        db.query(Defect)
        .filter(or_(Defect.id == defect_id, Defect.defect_id == defect_id))
        .first()
    )
    if not defect:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Defect '{defect_id}' not found.",
        )

    # Vendor isolation check
    is_vendor = any(r.id == "vendor" for r in current_user.roles) or current_user.vendor_id is not None
    if is_vendor and current_user.vendor_id:
        wp = defect.work_package
        if defect.assigned_vendor_id != current_user.vendor_id and (not wp or wp.vendor_id != current_user.vendor_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized: You can only view defects assigned to your organization.",
            )

    return _serialize_defect(defect)


def create_defect(db: Session, data: DefectCreate, current_user: User) -> DefectResponse:
    """Logs a new engineering defect ticket from failed inspection, audit observation, or review."""
    wp = db.query(WorkPackage).filter(WorkPackage.id == data.work_package_id).first()
    if not wp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Work package '{data.work_package_id}' not found.",
        )

    # Auto-resolve vendor from work package if not explicitly provided
    vendor_id = data.assigned_vendor_id or wp.vendor_id

    code = _generate_defect_code(db, wp.work_id)
    now = datetime.now(timezone.utc)

    initial_history = [
        {
            "timestamp": now.isoformat(),
            "action": "DEFECT_RECORDED",
            "actor_id": current_user.id,
            "actor_name": f"{current_user.full_name} ({current_user.username})",
            "from_status": None,
            "to_status": "Open",
            "notes": f"Defect logged with {data.severity} severity: {data.title}",
        }
    ]

    new_defect = Defect(
        id=f"def-{uuid.uuid4().hex[:8]}",
        defect_id=code,
        work_package_id=wp.id,
        inspection_id=data.inspection_id,
        checklist_item_ref=data.checklist_item_ref,
        asset_id=data.asset_id,
        assigned_vendor_id=vendor_id,
        title=data.title,
        description=data.description,
        category=data.category,
        severity=data.severity,
        status="Open",
        target_resolution_date=data.target_resolution_date,
        reported_by_id=current_user.id,
        evidence_attachments=[item.model_dump() for item in (data.evidence_attachments or [])],
        rework_count=0,
        history=initial_history,
        created_at=now,
    )
    db.add(new_defect)

    # Downstream workflow impact: Critical or High defect marks work package Rework Required
    if data.severity in ["Critical", "High"] and wp.workflow_state != "Verification Failed":
        wp.workflow_state = "Rework Required"
        if data.severity == "Critical":
            wp.risk_score = min(100, (wp.risk_score or 50) + 30)
            wp.risk_category = "Critical"

    db.flush()

    record_audit_event(
        db=db,
        action="DEFECT_LOGGED",
        entity_type="defect",
        entity_id=new_defect.id,
        actor_id=current_user.id,
        actor_email=current_user.email,
        details={
            "defect_code": new_defect.defect_id,
            "work_package_code": wp.work_id,
            "severity": new_defect.severity,
            "title": new_defect.title,
            "vendor_id": vendor_id,
        },
    )

    db.commit()
    db.refresh(new_defect)
    db.refresh(wp)
    return _serialize_defect(new_defect)


def vendor_submit_rework(
    db: Session,
    defect_id: str,
    data: DefectVendorReworkRequest,
    current_user: User,
) -> DefectResponse:
    """
    Contractor submits rectification explanation and photographic proof of rework.
    CRITICAL ANTI-CORRUPTION RULE:
    Vendor self-declaration does NOT resolve the defect!
    Status transitions strictly to 'Correction Submitted' / 'Verification Pending'.
    """
    defect = (
        db.query(Defect)
        .filter(or_(Defect.id == defect_id, Defect.defect_id == defect_id))
        .first()
    )
    if not defect:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Defect '{defect_id}' not found.",
        )

    # Tenancy check: Ensure vendor is assigned to this defect
    is_vendor = any(r.id == "vendor" for r in current_user.roles) or current_user.vendor_id is not None
    if is_vendor and current_user.vendor_id:
        wp = defect.work_package
        if defect.assigned_vendor_id != current_user.vendor_id and (not wp or wp.vendor_id != current_user.vendor_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized: You cannot submit rework on another contractor's defect.",
            )

    now = datetime.now(timezone.utc)
    old_status = defect.status

    defect.status = "Correction Submitted"
    defect.resolution_notes = data.resolution_notes
    defect.rework_evidence = [e.model_dump() for e in (data.rework_evidence or [])]
    defect.rework_count = (defect.rework_count or 0) + 1

    # Append to chronological history
    current_history = list(defect.history or [])
    current_history.append({
        "timestamp": now.isoformat(),
        "action": "CORRECTION_SUBMITTED",
        "actor_id": current_user.id,
        "actor_name": f"{current_user.full_name} ({current_user.username})",
        "from_status": old_status,
        "to_status": "Correction Submitted",
        "notes": f"Rework submission (Cycle #{defect.rework_count}): {data.resolution_notes[:120]}...",
    })
    defect.history = current_history

    record_audit_event(
        db=db,
        action="DEFECT_REWORK_SUBMITTED",
        entity_type="defect",
        entity_id=defect.id,
        actor_id=current_user.id,
        actor_email=current_user.email,
        details={
            "defect_code": defect.defect_id,
            "rework_cycle": defect.rework_count,
            "new_status": defect.status,
            "evidence_count": len(data.rework_evidence or []),
        },
    )

    db.commit()
    db.refresh(defect)
    return _serialize_defect(defect)


def reinspect_defect(
    db: Session,
    defect_id: str,
    data: DefectReinspectRequest,
    current_user: User,
) -> DefectResponse:
    """
    Quality Inspector conducts independent on-site re-inspection of corrected works.
    - If PASSED: Status becomes 'Resolved — Verification Passed'. Clears blocking status on work package.
    - If FAILED: Status becomes 'Rejected — Rework Required'. Enforces another rework cycle.
    """
    defect = (
        db.query(Defect)
        .filter(or_(Defect.id == defect_id, Defect.defect_id == defect_id))
        .first()
    )
    if not defect:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Defect '{defect_id}' not found.",
        )

    now = datetime.now(timezone.utc)
    old_status = defect.status
    wp = defect.work_package

    current_history = list(defect.history or [])

    if data.verdict == "Pass":
        defect.status = "Resolved — Verification Passed"
        defect.verification_result = "Pass"
        defect.verification_notes = data.verification_notes
        defect.verified_at = now
        defect.verified_by_id = current_user.id

        current_history.append({
            "timestamp": now.isoformat(),
            "action": "REINSPECT_VERIFIED_PASS",
            "actor_id": current_user.id,
            "actor_name": f"{current_user.full_name} ({current_user.username})",
            "from_status": old_status,
            "to_status": "Resolved — Verification Passed",
            "notes": f"Re-inspection PASSED: {data.verification_notes}",
        })

        # Check if all other defects on this work package are resolved or closed
        if wp:
            other_open = (
                db.query(func.count(Defect.id))
                .filter(
                    Defect.work_package_id == wp.id,
                    Defect.id != defect.id,
                    Defect.status.notin_(["Resolved — Verification Passed", "Closed by Authorised User"]),
                )
                .scalar()
                or 0
            )
            if other_open == 0 and wp.workflow_state in ["Verification Failed", "Rework Required"]:
                wp.workflow_state = "In Progress"

    else:  # Fail
        defect.status = "Rejected — Rework Required"
        defect.verification_result = "Fail"
        defect.verification_notes = data.verification_notes

        current_history.append({
            "timestamp": now.isoformat(),
            "action": "REINSPECT_VERIFIED_FAIL",
            "actor_id": current_user.id,
            "actor_name": f"{current_user.full_name} ({current_user.username})",
            "from_status": old_status,
            "to_status": "Rejected — Rework Required",
            "notes": f"Re-inspection FAILED: {data.verification_notes}",
        })

        if wp:
            wp.workflow_state = "Rework Required"

    defect.history = current_history

    record_audit_event(
        db=db,
        action="DEFECT_REINSPECTED",
        entity_type="defect",
        entity_id=defect.id,
        actor_id=current_user.id,
        actor_email=current_user.email,
        details={
            "defect_code": defect.defect_id,
            "verdict": data.verdict,
            "new_status": defect.status,
            "notes": data.verification_notes,
        },
    )

    db.commit()
    db.refresh(defect)
    if wp:
        db.refresh(wp)
    return _serialize_defect(defect)


def close_defect(
    db: Session,
    defect_id: str,
    data: DefectCloseRequest,
    current_user: User,
) -> DefectResponse:
    """Supervisory administrative sign-off closing a verified defect ticket."""
    defect = (
        db.query(Defect)
        .filter(or_(Defect.id == defect_id, Defect.defect_id == defect_id))
        .first()
    )
    if not defect:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Defect '{defect_id}' not found.",
        )

    now = datetime.now(timezone.utc)
    old_status = defect.status

    defect.status = "Closed by Authorised User"
    defect.closed_at = now
    defect.closed_by_id = current_user.id

    current_history = list(defect.history or [])
    current_history.append({
        "timestamp": now.isoformat(),
        "action": "DEFECT_CLOSED",
        "actor_id": current_user.id,
        "actor_name": f"{current_user.full_name} ({current_user.username})",
        "from_status": old_status,
        "to_status": "Closed by Authorised User",
        "notes": f"Official closure: {data.closure_notes}",
    })
    defect.history = current_history

    record_audit_event(
        db=db,
        action="DEFECT_CLOSED",
        entity_type="defect",
        entity_id=defect.id,
        actor_id=current_user.id,
        actor_email=current_user.email,
        details={
            "defect_code": defect.defect_id,
            "closure_notes": data.closure_notes,
            "closed_by": current_user.email,
        },
    )

    db.commit()
    db.refresh(defect)
    return _serialize_defect(defect)


def get_defect_stats(db: Session, current_user: User) -> DefectStats:
    """Calculate live defect statistics, severity distributions, and overdue counts."""
    query = db.query(Defect)

    # Vendor tenancy restriction
    is_vendor = any(r.id == "vendor" for r in current_user.roles) or current_user.vendor_id is not None
    if is_vendor and current_user.vendor_id:
        query = query.filter(Defect.assigned_vendor_id == current_user.vendor_id)

    total = query.count()
    open_count = query.filter(Defect.status.in_(["Open", "Assigned", "In Progress", "Rejected — Rework Required"])).count()
    critical_count = query.filter(
        Defect.severity == "Critical",
        Defect.status.notin_(["Resolved — Verification Passed", "Closed by Authorised User"])
    ).count()

    today_date = date.today()
    overdue_count = query.filter(
        Defect.target_resolution_date < today_date,
        Defect.status.notin_(["Resolved — Verification Passed", "Closed by Authorised User"])
    ).count()

    awaiting_verif = query.filter(Defect.status.in_(["Correction Submitted", "Verification Pending"])).count()
    resolved = query.filter(Defect.status == "Resolved — Verification Passed").count()
    closed = query.filter(Defect.status == "Closed by Authorised User").count()

    # Severity distribution
    sev_rows = (
        query.with_entities(Defect.severity, func.count(Defect.id))
        .group_by(Defect.severity)
        .all()
    )
    by_sev = {sev: count for sev, count in sev_rows}

    # Status distribution
    stat_rows = (
        query.with_entities(Defect.status, func.count(Defect.id))
        .group_by(Defect.status)
        .all()
    )
    by_stat = {st: count for st, count in stat_rows}

    # Project distribution
    proj_rows = (
        db.query(Project.name, func.count(Defect.id))
        .join(WorkPackage, Defect.work_package_id == WorkPackage.id)
        .join(Project, WorkPackage.project_id == Project.id)
        .group_by(Project.id, Project.name)
        .all()
    )
    by_proj = [{"project_name": p_name, "count": cnt} for p_name, cnt in proj_rows]

    return DefectStats(
        total_defects=total,
        open_defects=open_count,
        critical_defects=critical_count,
        overdue_defects=overdue_count,
        awaiting_verification=awaiting_verif,
        resolved_count=resolved,
        closed_count=closed,
        defects_by_severity=by_sev,
        defects_by_status=by_stat,
        defects_by_project=by_proj,
    )
