from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.domain import (
    Inspection,
    Defect,
    WorkPackage,
    OfflineSyncRecord,
    Asset,
    Zone,
    Project
)
from app.models.user import User, AuditEvent
from app.services.audit_service import record_audit_event
from app.schemas.offline import (
    SyncBatchRequest,
    SyncBatchResponse,
    SyncItemResult,
    OfflineInspectionDownload
)
from app.db.base import generate_uuid, get_utc_now


DEFAULT_CHECKLIST = [
    {
        "id": "chk-01",
        "category": "Structural Integrity",
        "description": "Verify physical alignment, mooring/fastening anchor bolts, and foundation soundness.",
        "requirement_type": "mandatory",
        "verdict": "pending",
        "notes": ""
    },
    {
        "id": "chk-02",
        "category": "Operational Safety",
        "description": "Inspect emergency valves, pressure relief gauges, and tactile safety anti-slip strips.",
        "requirement_type": "mandatory",
        "verdict": "pending",
        "notes": ""
    },
    {
        "id": "chk-03",
        "category": "Environmental & Sanitation",
        "description": "Check for biological leakage, gasket seal integrity, and waste discharge compliance.",
        "requirement_type": "mandatory",
        "verdict": "pending",
        "notes": ""
    },
    {
        "id": "chk-04",
        "category": "Signage & Crowd Visibility",
        "description": "Inspect multilingual public guidance placards and emergency egress directional arrows.",
        "requirement_type": "recommended",
        "verdict": "pending",
        "notes": ""
    }
]


def download_assigned_inspections(db: Session, current_user: User) -> List[OfflineInspectionDownload]:
    """
    Downloads assigned inspection dossiers and checklist templates into IndexedDB
    for offline execution in remote riverbed and ghat sectors.
    """
    query = db.query(Inspection).filter(Inspection.outcome.in_(["Scheduled", "In Progress"]))
    is_admin = any(r.name in ["super_admin", "municipal_administrator", "project_manager"] for r in current_user.roles)
    if not is_admin:
        assigned_user = query.filter(Inspection.inspector_id == current_user.id).all()
        inspections = assigned_user if assigned_user else query.all()
    else:
        inspections = query.all()

    results: List[OfflineInspectionDownload] = []
    for insp in inspections:
        wp = insp.work_package
        proj = wp.project if wp else None
        zone = proj.zone if proj else None
        asset = insp.asset

        checklist = insp.checklist_results if insp.checklist_results else DEFAULT_CHECKLIST

        results.append(
            OfflineInspectionDownload(
                id=insp.id,
                inspection_id=insp.inspection_id,
                work_package_id=insp.work_package_id,
                work_package_title=wp.title if wp else "General Works",
                project_id=proj.id if proj else "PRJ-001",
                project_name=proj.name if proj else "Pushkaralu Works",
                scheduled_date=str(insp.scheduled_date) if insp.scheduled_date else None,
                inspection_type=insp.inspection_type,
                checklist_version=insp.checklist_version,
                checklist_template=checklist,
                milestone_id=insp.milestone_id,
                asset_id=insp.asset_id,
                asset_name=asset.name if asset else None,
                zone_id=zone.id if zone else None,
                zone_name=zone.name if zone else None,
                latitude=insp.latitude or (zone.latitude if zone else None),
                longitude=insp.longitude or (zone.longitude if zone else None),
                outcome=insp.outcome
            )
        )
    return results


def process_sync_batch(db: Session, current_user: User, batch: SyncBatchRequest) -> SyncBatchResponse:
    """
    Processes queued offline field actions idempotently with conflict detection
    per Section 16 (Module 11) specifications.
    """
    results: List[SyncItemResult] = []
    synced_count = 0
    conflict_count = 0
    failed_count = 0

    for item in batch.items:
        # 1. Idempotency Check
        existing_record = db.query(OfflineSyncRecord).filter(
            OfflineSyncRecord.client_submission_id == item.client_submission_id
        ).first()

        if existing_record:
            # Already synced, return cached idempotent result
            if existing_record.status == "synced":
                synced_count += 1
            elif existing_record.status == "conflict":
                conflict_count += 1
            else:
                failed_count += 1

            results.append(
                SyncItemResult(
                    client_submission_id=item.client_submission_id,
                    action_type=item.action_type,
                    status=existing_record.status,  # type: ignore
                    server_id=existing_record.entity_id,
                    synced_at=existing_record.created_at,
                    conflict_details=existing_record.details.get("conflict_details") if existing_record.details else None
                )
            )
            continue

        # 2. Process Action Types
        try:
            if item.action_type == "execute_inspection":
                res = _execute_offline_inspection(db, current_user, item)
            elif item.action_type == "create_defect":
                res = _create_offline_defect(db, current_user, item)
            elif item.action_type == "save_inspection_draft":
                res = _save_offline_draft(db, current_user, item)
            else:
                res = SyncItemResult(
                    client_submission_id=item.client_submission_id,
                    action_type=item.action_type,
                    status="failed",
                    error_message=f"Unknown offline action type: {item.action_type}"
                )
        except Exception as e:
            res = SyncItemResult(
                client_submission_id=item.client_submission_id,
                action_type=item.action_type,
                status="failed",
                error_message=str(e)
            )

        if res.status == "synced":
            synced_count += 1
        elif res.status == "conflict":
            conflict_count += 1
        else:
            failed_count += 1

        results.append(res)

    db.commit()

    return SyncBatchResponse(
        processed_count=len(batch.items),
        synced_count=synced_count,
        conflict_count=conflict_count,
        failed_count=failed_count,
        results=results
    )


def _execute_offline_inspection(db: Session, user: User, item: Any) -> SyncItemResult:
    inspection_id = item.entity_id or item.payload.get("inspection_id")
    inspection = db.query(Inspection).filter(
        (Inspection.id == inspection_id) | (Inspection.inspection_id == inspection_id)
    ).first()

    if not inspection:
        return SyncItemResult(
            client_submission_id=item.client_submission_id,
            action_type=item.action_type,
            status="failed",
            error_message=f"Inspection '{inspection_id}' not found on server"
        )

    # CONFLICT DETECTION RULE:
    # If the inspection on server has already been concluded or reviewed while user was offline
    if inspection.outcome in ["Passed", "Failed", "Conditional Pass"] and inspection.reviewer_decision:
        conflict_details = {
            "server_outcome": inspection.outcome,
            "server_reviewer_decision": inspection.reviewer_decision,
            "server_inspection_date": str(inspection.actual_inspection_date),
            "client_submitted_outcome": item.payload.get("outcome", "Passed"),
            "resolution_guidance": "Server record was reviewed while device was offline. Authorised review required."
        }
        # Log conflict record
        sync_log = OfflineSyncRecord(
            client_submission_id=item.client_submission_id,
            user_id=user.id,
            action_type=item.action_type,
            entity_id=inspection.id,
            status="conflict",
            details={"conflict_details": conflict_details, "payload": item.payload}
        )
        db.add(sync_log)
        return SyncItemResult(
            client_submission_id=item.client_submission_id,
            action_type=item.action_type,
            status="conflict",
            server_id=inspection.id,
            conflict_details=conflict_details
        )

    # No conflict: Apply inspection verdict
    payload = item.payload
    inspection.outcome = payload.get("outcome", "Passed")
    inspection.notes = payload.get("notes", inspection.notes)
    inspection.actual_inspection_date = get_utc_now()
    inspection.inspector_id = user.id
    if "checklist_results" in payload:
        inspection.checklist_results = payload["checklist_results"]
    if "evidence_photos" in payload:
        inspection.evidence_photos = payload["evidence_photos"]
    if "latitude" in payload and payload["latitude"]:
        inspection.latitude = float(payload["latitude"])
    if "longitude" in payload and payload["longitude"]:
        inspection.longitude = float(payload["longitude"])
    if "gps_accuracy_meters" in payload and payload["gps_accuracy_meters"]:
        inspection.gps_accuracy_meters = float(payload["gps_accuracy_meters"])
    if "verified_percentage_awarded" in payload:
        inspection.verified_percentage_awarded = float(payload["verified_percentage_awarded"])

    # Update WorkPackage verified progress if passed
    if inspection.outcome == "Passed" and inspection.work_package:
        awarded = payload.get("verified_percentage_awarded", 5.0)
        max_allowed = min(100.0, inspection.work_package.reported_progress_percentage)
        new_progress = min(max_allowed, inspection.work_package.verified_progress_percentage + awarded)
        inspection.work_package.verified_progress_percentage = round(new_progress, 1)

    # Record sync log
    sync_log = OfflineSyncRecord(
        client_submission_id=item.client_submission_id,
        user_id=user.id,
        action_type=item.action_type,
        entity_id=inspection.id,
        status="synced",
        details={"outcome": inspection.outcome}
    )
    db.add(sync_log)

    # Audit event
    record_audit_event(
        db=db,
        action="OFFLINE_INSPECTION_SYNCED",
        entity_type="Inspection",
        entity_id=inspection.id,
        actor_id=user.id,
        actor_email=user.email,
        details={
            "client_submission_id": item.client_submission_id,
            "outcome": inspection.outcome,
            "offline_timestamp": str(item.client_timestamp)
        }
    )

    return SyncItemResult(
        client_submission_id=item.client_submission_id,
        action_type=item.action_type,
        status="synced",
        server_id=inspection.id,
        synced_at=get_utc_now()
    )


def _create_offline_defect(db: Session, user: User, item: Any) -> SyncItemResult:
    payload = item.payload
    work_package_id = item.entity_id or payload.get("work_package_id")

    wp = db.query(WorkPackage).filter(
        (WorkPackage.id == work_package_id) | (WorkPackage.work_id == work_package_id)
    ).first()

    if not wp:
        return SyncItemResult(
            client_submission_id=item.client_submission_id,
            action_type=item.action_type,
            status="failed",
            error_message=f"Work package '{work_package_id}' not found on server"
        )

    short_code = generate_uuid()[:6].upper()
    defect_id = f"DEF-OFF-{short_code}"

    defect = Defect(
        defect_id=defect_id,
        work_package_id=wp.id,
        inspection_id=payload.get("inspection_id"),
        asset_id=payload.get("asset_id"),
        checklist_item_ref=payload.get("checklist_item_ref"),
        title=payload.get("title", f"Offline Defect {short_code}"),
        description=payload.get("description", "Discovered during offline field inspection."),
        category=payload.get("category", "Quality & Safety"),
        severity=payload.get("severity", "High"),
        status="Open",
        reported_by_id=user.id,
        evidence_attachments=payload.get("evidence_attachments", []),
        history=[
            {
                "action": "OFFLINE_REPORTED",
                "timestamp": get_utc_now().isoformat(),
                "user": user.full_name,
                "notes": "Logged offline in disconnected field sector"
            }
        ]
    )
    db.add(defect)
    db.flush()

    sync_log = OfflineSyncRecord(
        client_submission_id=item.client_submission_id,
        user_id=user.id,
        action_type=item.action_type,
        entity_id=defect.id,
        status="synced",
        details={"defect_id": defect_id}
    )
    db.add(sync_log)

    return SyncItemResult(
        client_submission_id=item.client_submission_id,
        action_type=item.action_type,
        status="synced",
        server_id=defect.id,
        synced_at=get_utc_now()
    )


def _save_offline_draft(db: Session, user: User, item: Any) -> SyncItemResult:
    sync_log = OfflineSyncRecord(
        client_submission_id=item.client_submission_id,
        user_id=user.id,
        action_type=item.action_type,
        entity_id=item.entity_id,
        status="synced",
        details={"draft_acknowledged": True}
    )
    db.add(sync_log)
    return SyncItemResult(
        client_submission_id=item.client_submission_id,
        action_type=item.action_type,
        status="synced",
        server_id=item.entity_id,
        synced_at=get_utc_now()
    )
