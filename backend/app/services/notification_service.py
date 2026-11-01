from datetime import datetime, date, timedelta, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc

from app.models.user import User
from app.models.domain import (
    Notification,
    Inspection,
    Defect,
    ProgressSubmission,
    WorkPackage,
    Milestone,
    Asset,
    Zone,
    Vendor
)
from app.schemas.notification import (
    NotificationRead,
    NotificationListResponse,
    MyTaskItem,
    MyTasksSummary,
    MyTasksResponse,
    ExternalChannelsStatusResponse
)
from app.db.base import get_utc_now


def create_notification(
    db: Session,
    user_id: str,
    trigger_type: str,
    title: str,
    message: str,
    severity: str = "info",
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    action_url: Optional[str] = None,
    deduplication_key: Optional[str] = None
) -> Notification:
    """
    Creates an in-app notification. If deduplication_key is provided and already
    exists, returns the existing record without duplicate creation (Section 18).
    """
    if deduplication_key:
        existing = db.query(Notification).filter(
            Notification.deduplication_key == deduplication_key
        ).first()
        if existing:
            return existing

    notification = Notification(
        user_id=user_id,
        trigger_type=trigger_type,
        title=title,
        message=message,
        severity=severity,
        entity_type=entity_type,
        entity_id=entity_id,
        action_url=action_url,
        is_read=False,
        deduplication_key=deduplication_key,
        created_at=get_utc_now()
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def _seed_role_initial_notifications_if_empty(db: Session, user: User) -> None:
    """
    Auto-seeds realistic statutory Pushkaralu notifications tailored to user's role
    if the notification table is currently empty for this user.
    """
    existing_count = db.query(Notification).filter(Notification.user_id == user.id).count()
    if existing_count > 0:
        return

    now = get_utc_now()
    role_names = [r.id for r in user.roles]

    if "field_inspector" in role_names:
        seed_items = [
            {
                "trigger_type": "inspection_assignment",
                "title": "New Physical Inspection Scheduled: Kotilingala RO Dispensers",
                "message": "You have been assigned to verify 8 automated stainless steel kiosks at Kotilingala Ghat (INS-2027-001).",
                "severity": "info",
                "entity_type": "inspection",
                "entity_id": "ins-001",
                "action_url": "/inspections/ins-001",
                "offset_hours": 1
            },
            {
                "trigger_type": "reinspection_required",
                "title": "Re-inspection Verification Required: Rebar Spacing Defect",
                "message": "Vendor Godavari Infra submitted corrective action evidence for DEF-2027-001. On-site verification pending.",
                "severity": "warning",
                "entity_type": "defect",
                "entity_id": "def-001",
                "action_url": "/defects/def-001",
                "offset_hours": 3
            },
            {
                "trigger_type": "missing_evidence",
                "title": "Missing Hydrostatic Pressure Test Certificate",
                "message": "Pipeline pressure log missing on Kotilingala potable water distribution line verification dossier.",
                "severity": "critical",
                "entity_type": "work_package",
                "entity_id": "wp-001",
                "action_url": "/projects/prj-001",
                "offset_hours": 6
            }
        ]
    elif "vendor" in role_names:
        seed_items = [
            {
                "trigger_type": "new_defect",
                "title": "Urgent Defect DEF-2027-002: Electrical Grounding Incomplete",
                "message": "Independent inspector flagged missing copper earthing strips at Pushkar Ghat Mobile Bio-toilets.",
                "severity": "critical",
                "entity_type": "defect",
                "entity_id": "def-002",
                "action_url": "/defects/def-002",
                "offset_hours": 2
            },
            {
                "trigger_type": "upcoming_deadline",
                "title": "Contractual Milestone Deadline Approaching",
                "message": "Milestone MLS-2027-003 (Dispensers & Kiosks Commissioning) due in 3 business days.",
                "severity": "warning",
                "entity_type": "milestone",
                "entity_id": "mls-003",
                "action_url": "/projects/prj-001",
                "offset_hours": 5
            },
            {
                "trigger_type": "correction_submitted",
                "title": "Rework Evidence Acknowledged by QC Auditor",
                "message": "Concrete cube 28-day compressive strength certificate received. Awaiting field inspector sign-off.",
                "severity": "success",
                "entity_type": "defect",
                "entity_id": "def-001",
                "action_url": "/defects/def-001",
                "offset_hours": 12
            }
        ]
    else:
        # Super Admin / Project Manager / Municipal Admin
        seed_items = [
            {
                "trigger_type": "progress_submission",
                "title": "New Vendor Progress Claim: Godavari Infra Engineering",
                "message": "Vendor submitted 20.0% completion claim with factory fabrication certificates on WP-DW-KOTI-02.",
                "severity": "info",
                "entity_type": "progress_submission",
                "entity_id": "sub-002",
                "action_url": "/vendors/vnd-001",
                "offset_hours": 1
            },
            {
                "trigger_type": "overdue_milestone",
                "title": "Critical Path Alert: Overdue Foundation Pour",
                "message": "Milestone MLS-2027-001 is past scheduled completion date; eroding Pushkaralu 2027 buffer days.",
                "severity": "critical",
                "entity_type": "milestone",
                "entity_id": "mls-001",
                "action_url": "/projects/prj-001",
                "offset_hours": 4
            },
            {
                "trigger_type": "blocking_risk",
                "title": "Blocking Readiness Risk: Kotilingala Kiosks Verification Gap",
                "message": "Reported progress (60%) vs verified progress (50%) variance exceeds allowable threshold (Rule B).",
                "severity": "warning",
                "entity_type": "work_package",
                "entity_id": "wp-002",
                "action_url": "/readiness",
                "offset_hours": 8
            },
            {
                "trigger_type": "asset_acceptance",
                "title": "Municipal Asset Awaiting Acceptance: Floating Safety Boom",
                "message": "AST-2027-005 river barrier requires joint diver inspection before Pushkaralu commissioning.",
                "severity": "warning",
                "entity_type": "asset",
                "entity_id": "ast-005",
                "action_url": "/assets/ast-005",
                "offset_hours": 16
            },
            {
                "trigger_type": "approval_request",
                "title": "Final Acceptance Sign-off Requested: Sump Tank",
                "message": "Work package WP-DW-KOTI-01 passed all 4 readiness gates. Joint sign-off required.",
                "severity": "info",
                "entity_type": "work_package",
                "entity_id": "wp-001",
                "action_url": "/readiness",
                "offset_hours": 24
            }
        ]

    for item in seed_items:
        n = Notification(
            user_id=user.id,
            trigger_type=item["trigger_type"],
            title=item["title"],
            message=item["message"],
            severity=item["severity"],
            entity_type=item.get("entity_type"),
            entity_id=item.get("entity_id"),
            action_url=item.get("action_url"),
            is_read=False,
            deduplication_key=f"seed-{user.id}-{item['trigger_type']}-{item['entity_id']}",
            created_at=now - timedelta(hours=item["offset_hours"])
        )
        db.add(n)
    db.commit()


def get_user_notifications(
    db: Session,
    user: User,
    unread_only: bool = False,
    trigger_type: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
) -> NotificationListResponse:
    """
    Retrieves notifications for the current user with unread counts and filters.
    """
    _seed_role_initial_notifications_if_empty(db, user)

    query = db.query(Notification).filter(Notification.user_id == user.id)

    if unread_only:
        query = query.filter(Notification.is_read.is_(False))
    if trigger_type and trigger_type != "All":
        query = query.filter(Notification.trigger_type == trigger_type)
    if severity and severity != "All":
        query = query.filter(Notification.severity == severity)

    total_count = query.count()
    unread_count = db.query(Notification).filter(
        Notification.user_id == user.id,
        Notification.is_read.is_(False)
    ).count()

    notifications = query.order_by(desc(Notification.created_at)).offset(offset).limit(limit).all()

    return NotificationListResponse(
        notifications=[NotificationRead.model_validate(n) for n in notifications],
        unread_count=unread_count,
        total_count=total_count
    )


def mark_notification_as_read(db: Session, notification_id: str, user_id: str) -> NotificationRead:
    n = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == user_id
    ).first()
    if not n:
        raise ValueError("Notification not found or access denied")

    n.is_read = True
    n.read_at = get_utc_now()
    db.commit()
    db.refresh(n)
    return NotificationRead.model_validate(n)


def mark_all_notifications_as_read(db: Session, user_id: str) -> int:
    now = get_utc_now()
    rows = db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read.is_(False)
    ).all()
    count = len(rows)
    for r in rows:
        r.is_read = True
        r.read_at = now
    db.commit()
    return count


def get_unread_count(db: Session, user_id: str) -> int:
    return db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read.is_(False)
    ).count()


def get_my_tasks(
    db: Session,
    user: User,
    task_type: Optional[str] = None,
    priority: Optional[str] = None,
    due_status: Optional[str] = None,
    search: Optional[str] = None
) -> MyTasksResponse:
    """
    Generates personalized task queue combining assigned inspections, pending reviews,
    outstanding vendor corrections, overdue assignments, and relevant risk actions (Section 18).
    """
    role_names = [r.id for r in user.roles]
    today = date.today()
    tasks: List[MyTaskItem] = []

    # 1. Assigned Inspections (for field inspectors or administrative oversight)
    if "field_inspector" in role_names or "super_admin" in role_names or "municipal_admin" in role_names:
        insp_q = db.query(Inspection)
        if "field_inspector" in role_names and not ("super_admin" in role_names):
            insp_q = insp_q.filter(
                or_(Inspection.inspector_id == user.id, Inspection.inspector_id.is_(None))
            )
        open_inspections = insp_q.filter(
            Inspection.outcome.in_(["Scheduled", "In Progress", "Failed"])
        ).all()

        for ins in open_inspections:
            wp = ins.work_package
            is_overdue = False
            days_diff = 0
            due_d = ins.scheduled_date or today
            if due_d < today:
                is_overdue = True
                days_diff = (today - due_d).days
            else:
                days_diff = (due_d - today).days

            prio = "high" if ins.outcome == "Failed" else ("critical" if is_overdue else "medium")
            tasks.append(
                MyTaskItem(
                    task_id=f"task-insp-{ins.id}",
                    task_type="inspection",
                    title=f"Conduct Inspection: {ins.inspection_type} ({ins.inspection_id})",
                    description=f"Verify checklist items and photographic evidence for {wp.title if wp else 'Work Package'}.",
                    priority=prio,
                    status=ins.outcome,
                    due_date=due_d,
                    is_overdue=is_overdue,
                    days_remaining_or_overdue=days_diff,
                    entity_id=ins.id,
                    entity_type="inspection",
                    action_label="Execute Field Checklist",
                    action_url=f"/inspections/{ins.id}",
                    zone_name=wp.project.zone.name if wp and wp.project and wp.project.zone else None,
                    work_package_code=wp.work_id if wp else None
                )
            )

    # 2. Defect Rework (for vendors / contractors or QA auditors)
    if "vendor" in role_names or user.vendor_id:
        defect_q = db.query(Defect).filter(
            Defect.status.in_(["Open", "Assigned", "In Progress", "Rejected — Rework Required"])
        )
        if user.vendor_id:
            defect_q = defect_q.filter(Defect.assigned_vendor_id == user.vendor_id)
        open_defects = defect_q.all()
    else:
        # Admins and inspectors also see severe open defects needing verification
        open_defects = db.query(Defect).filter(
            Defect.status.in_(["Open", "Correction Submitted", "Rejected — Rework Required"])
        ).limit(10).all()

    for df in open_defects:
        wp = df.work_package
        due_d = df.target_resolution_date or (today + timedelta(days=2))
        is_overdue = due_d < today
        days_diff = (today - due_d).days if is_overdue else (due_d - today).days
        prio = "critical" if df.severity.lower() == "critical" or is_overdue else ("high" if df.severity.lower() == "high" else "medium")

        action_label = "Verify Corrective Action" if df.status == "Correction Submitted" else "Remediate Defect & Submit Proof"
        tasks.append(
            MyTaskItem(
                task_id=f"task-def-{df.id}",
                task_type="defect_rework",
                title=f"Defect Remediation: {df.title} ({df.defect_id})",
                description=f"Severity: {df.severity}. Status: {df.status}. {df.description[:120]}...",
                priority=prio,
                status=df.status,
                due_date=due_d,
                is_overdue=is_overdue,
                days_remaining_or_overdue=days_diff,
                entity_id=df.id,
                entity_type="defect",
                action_label=action_label,
                action_url=f"/defects/{df.id}",
                zone_name=wp.project.zone.name if wp and wp.project and wp.project.zone else None,
                work_package_code=wp.work_id if wp else None
            )
        )

    # 3. Pending Progress Submission Reviews (for Project Managers / Super Admins)
    if "project_manager" in role_names or "super_admin" in role_names or "municipal_admin" in role_names:
        subs = db.query(ProgressSubmission).filter(
            ProgressSubmission.review_status.in_(["Under Review", "Pending"])
        ).all()
        for sub in subs:
            wp = sub.work_package
            created_d = sub.created_at.date() if sub.created_at else today
            review_due = created_d + timedelta(days=2)
            is_overdue = review_due < today
            days_diff = (today - review_due).days if is_overdue else (review_due - today).days

            tasks.append(
                MyTaskItem(
                    task_id=f"task-sub-{sub.id}",
                    task_type="submission_review",
                    title=f"Review Vendor Progress Claim: {wp.title if wp else 'Work Package'} ({sub.submission_code})",
                    description=f"Vendor claimed {sub.progress_percentage:.1f}% progress. {sub.activities_description[:120]}...",
                    priority="critical" if is_overdue else "high",
                    status=sub.review_status,
                    due_date=review_due,
                    is_overdue=is_overdue,
                    days_remaining_or_overdue=days_diff,
                    entity_id=sub.id,
                    entity_type="progress_submission",
                    action_label="Review & Audit Progress Claim",
                    action_url=f"/vendors/{sub.vendor_id if sub.vendor_id else 'vnd-001'}",
                    zone_name=wp.project.zone.name if wp and wp.project and wp.project.zone else None,
                    work_package_code=wp.work_id if wp else None
                )
            )

    # 4. Overdue Milestones & Critical Path Actions
    if "project_manager" in role_names or "super_admin" in role_names or "municipal_admin" in role_names:
        overdue_milestones = db.query(Milestone).filter(
            Milestone.verification_status != "Verified",
            Milestone.due_date < today
        ).all()
        for mls in overdue_milestones:
            wp = mls.work_package
            days_over = (today - mls.due_date).days
            tasks.append(
                MyTaskItem(
                    task_id=f"task-mls-{mls.id}",
                    task_type="milestone_approval",
                    title=f"Mitigate Overdue Milestone: {mls.name}",
                    description=f"Milestone slipped by {days_over} day(s). Due date was {mls.due_date.isoformat()}.",
                    priority="critical" if days_over > 7 else "high",
                    status=mls.verification_status,
                    due_date=mls.due_date,
                    is_overdue=True,
                    days_remaining_or_overdue=days_over,
                    entity_id=mls.id,
                    entity_type="milestone",
                    action_label="Review Milestone Timeline",
                    action_url=f"/projects/{wp.project_id if wp else 'prj-001'}",
                    zone_name=wp.project.zone.name if wp and wp.project and wp.project.zone else None,
                    work_package_code=wp.work_id if wp else None
                )
            )

    # 5. Asset Commissioning / Maintenance
    if "asset_manager" in role_names or "super_admin" in role_names or "municipal_admin" in role_names:
        assets_needing_action = db.query(Asset).filter(
            Asset.lifecycle_status.in_(["Maintenance Required", "Installation Pending", "Inspection Pending", "Verification Failed"])
        ).all()
        for ast in assets_needing_action:
            tasks.append(
                MyTaskItem(
                    task_id=f"task-ast-{ast.id}",
                    task_type="asset_acceptance",
                    title=f"Asset Maintenance & Readiness: {ast.name} ({ast.asset_code})",
                    description=f"Status: {ast.lifecycle_status}. Category: {ast.category}. Location: {ast.zone.name if ast.zone else 'Godavari Ghat'}.",
                    priority="high",
                    status=ast.lifecycle_status,
                    due_date=today + timedelta(days=3),
                    is_overdue=False,
                    days_remaining_or_overdue=3,
                    entity_id=ast.id,
                    entity_type="asset",
                    action_label="Conduct Asset Inspection & Acceptance",
                    action_url=f"/assets/{ast.id}",
                    zone_name=ast.zone.name if ast.zone else None,
                    work_package_code=ast.work_package.work_id if ast.work_package else None
                )
            )

    # Apply filters
    filtered_tasks = tasks
    if task_type and task_type != "All":
        filtered_tasks = [t for t in filtered_tasks if t.task_type == task_type]
    if priority and priority != "All":
        filtered_tasks = [t for t in filtered_tasks if t.priority == priority]
    if due_status == "overdue":
        filtered_tasks = [t for t in filtered_tasks if t.is_overdue]
    elif due_status == "due_today":
        filtered_tasks = [t for t in filtered_tasks if t.due_date == today]
    elif due_status == "upcoming":
        filtered_tasks = [t for t in filtered_tasks if not t.is_overdue and t.due_date != today]

    if search and search.strip():
        q = search.strip().lower()
        filtered_tasks = [
            t for t in filtered_tasks
            if q in t.title.lower() or q in t.description.lower() or (t.work_package_code and q in t.work_package_code.lower())
        ]

    # Sort tasks: Critical & Overdue first, then by due date
    def task_sort_key(t: MyTaskItem):
        prio_rank = {"critical": 0, "high": 1, "medium": 2, "low": 3}.get(t.priority, 4)
        overdue_rank = 0 if t.is_overdue else 1
        return (overdue_rank, prio_rank, t.due_date or today)

    filtered_tasks.sort(key=task_sort_key)

    summary = MyTasksSummary(
        total_tasks=len(tasks),
        critical_tasks=len([t for t in tasks if t.priority == "critical"]),
        overdue_tasks=len([t for t in tasks if t.is_overdue]),
        due_today_tasks=len([t for t in tasks if t.due_date == today]),
        inspections_count=len([t for t in tasks if t.task_type == "inspection"]),
        defects_count=len([t for t in tasks if t.task_type == "defect_rework"]),
        reviews_count=len([t for t in tasks if t.task_type == "submission_review"]),
        approvals_count=len([t for t in tasks if t.task_type in ("milestone_approval", "asset_acceptance")])
    )

    return MyTasksResponse(
        summary=summary,
        tasks=filtered_tasks
    )


def get_external_channels_status() -> ExternalChannelsStatusResponse:
    """
    Transparently discloses external messaging adapters per Section 18 (Page 39).
    Never claims messages were delivered if external gateways are unconfigured.
    """
    return ExternalChannelsStatusResponse(
        in_app_delivery="active",
        sms_gateway="unconfigured_pilot_simulation",
        email_smtp="unconfigured_pilot_simulation",
        whatsapp_api="unconfigured_pilot_simulation",
        notice="In accordance with Section 18 requirements, external SMS/Email gateways are unconfigured in this local demonstration environment. All statutory alerts and notifications are delivered instantaneously through the In-App Notification Center."
    )
