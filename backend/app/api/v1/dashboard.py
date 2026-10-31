from datetime import date, datetime, timedelta, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_
from app.db.session import get_db
from app.models.user import User, AuditEvent
from app.models.domain import Zone, Vendor, Project, WorkPackage, Milestone, Inspection, Defect, Asset
from app.schemas.dashboard import (
    SummaryMetrics,
    DashboardVisualizations,
    ActionQueueItem,
    DashboardFilterOptions,
    StatusDistributionItem,
    ReportedVsVerifiedItem,
    DefectSeverityItem,
    ZoneReadinessItem,
    VendorPerformanceItem,
    DeadlineItem,
    RecentInspectionItem,
    PriorityRiskItem,
)
from app.api.deps import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Executive Overview Dashboard"])


def apply_work_filters(
    query,
    project_id: Optional[str] = None,
    zone_id: Optional[str] = None,
    category: Optional[str] = None,
    vendor_id: Optional[str] = None,
    status: Optional[str] = None,
    risk_level: Optional[str] = None,
):
    """Applies common dashboard query filters to WorkPackage queries."""
    if project_id:
        query = query.filter(WorkPackage.project_id == project_id)
    if zone_id:
        query = query.join(WorkPackage.project).filter(Project.zone_id == zone_id)
    if category:
        query = query.filter(WorkPackage.category == category)
    if vendor_id:
        query = query.filter(WorkPackage.vendor_id == vendor_id)
    if status:
        query = query.filter(WorkPackage.workflow_state == status)
    if risk_level:
        query = query.filter(WorkPackage.risk_category == risk_level)
    return query


@router.get("/filters", response_model=DashboardFilterOptions)
def get_dashboard_filter_options(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns available filter options for dynamic dashboard slicing."""
    projects = db.query(Project.id, Project.name).order_by(Project.name).all()
    zones = db.query(Zone.id, Zone.name).order_by(Zone.name).all()
    categories_raw = db.query(WorkPackage.category).distinct().all()
    vendors = db.query(Vendor.id, Vendor.company_name).order_by(Vendor.company_name).all()
    statuses_raw = db.query(WorkPackage.workflow_state).distinct().all()

    return DashboardFilterOptions(
        projects=[{"id": p.id, "name": p.name} for p in projects],
        zones=[{"id": z.id, "name": z.name} for z in zones],
        categories=[c[0] for c in categories_raw if c[0]],
        vendors=[{"id": v.id, "name": v.company_name} for v in vendors],
        statuses=[s[0] for s in statuses_raw if s[0]],
        risk_levels=["Critical", "High", "Moderate", "Low"]
    )


@router.get("/metrics", response_model=SummaryMetrics)
def get_summary_metrics(
    project_id: Optional[str] = Query(None),
    zone_id: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    vendor_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Computes live database-backed summary metrics.
    No hardcoded values. All metrics reflect persisted records and applied filters.
    """
    # 1. Total Projects
    p_query = db.query(Project)
    if zone_id:
        p_query = p_query.filter(Project.zone_id == zone_id)
    if project_id:
        p_query = p_query.filter(Project.id == project_id)
    total_projects = p_query.count()

    # 2. Work Packages query
    w_query = db.query(WorkPackage)
    w_query = apply_work_filters(w_query, project_id, zone_id, category, vendor_id, status, risk_level)
    filtered_works = w_query.all()
    work_ids = [w.id for w in filtered_works]

    # Active works: In Progress, Progress Reported, Inspection Pending, Rework Required
    active_works = sum(1 for w in filtered_works if w.workflow_state in [
        "In Progress", "Progress Reported", "Inspection Pending", "Rework Required", "Verification Failed"
    ])

    # Reported complete: vendor claims 100%
    reported_complete = sum(1 for w in filtered_works if w.reported_progress_percentage >= 100.0)

    # Verified complete: certified by inspector at 100%
    verified_complete = sum(1 for w in filtered_works if w.verified_progress_percentage >= 100.0)

    # Accepted works
    accepted_works = sum(1 for w in filtered_works if w.workflow_state in ["Accepted", "Operationally Ready"])

    # Works at risk: Critical or High risk category or risk_score >= 60
    works_at_risk = sum(1 for w in filtered_works if w.risk_score >= 60 or w.risk_category in ["Critical", "High"])

    # 3. Overdue milestones (due_date < today and verification_status != 'Verified')
    today = date.today()
    m_query = db.query(Milestone).filter(
        Milestone.due_date < today,
        Milestone.verification_status != "Verified"
    )
    if work_ids:
        m_query = m_query.filter(Milestone.work_package_id.in_(work_ids))
    elif project_id or zone_id or category or vendor_id or status or risk_level:
        m_query = m_query.filter(Milestone.work_package_id == "NONE")
    overdue_milestones = m_query.count()

    # 4. Open defects
    d_query = db.query(Defect).filter(Defect.status.notin_(["Closed", "Resolved"]))
    if work_ids:
        d_query = d_query.filter(Defect.work_package_id.in_(work_ids))
    elif project_id or zone_id or category or vendor_id or status or risk_level:
        d_query = d_query.filter(Defect.work_package_id == "NONE")
    open_defects = d_query.count()

    # 5. Assets
    a_query = db.query(Asset)
    if zone_id:
        a_query = a_query.filter(Asset.zone_id == zone_id)
    if project_id:
        a_query = a_query.filter(Asset.project_id == project_id)
    if work_ids:
        a_query = a_query.filter(Asset.work_package_id.in_(work_ids))
    elif project_id or zone_id or category or vendor_id or status or risk_level:
        a_query = a_query.filter(Asset.work_package_id == "NONE")
    assets = a_query.all()

    assets_registered = len(assets)
    assets_awaiting_inspection = sum(1 for a in assets if a.lifecycle_status in ["Inspection Pending", "Installed"])
    assets_accepted = sum(1 for a in assets if a.lifecycle_status in ["Accepted", "Operationally Ready"])

    # 6. Inspections awaiting action
    insp_query = db.query(Inspection).filter(Inspection.outcome.in_(["Scheduled", "In Progress"]))
    if work_ids:
        insp_query = insp_query.filter(Inspection.work_package_id.in_(work_ids))
    elif project_id or zone_id or category or vendor_id or status or risk_level:
        insp_query = insp_query.filter(Inspection.work_package_id == "NONE")
    inspections_awaiting_action = insp_query.count()

    return SummaryMetrics(
        total_projects=total_projects,
        active_works=active_works,
        reported_complete_works=reported_complete,
        verified_complete_works=verified_complete,
        accepted_works=accepted_works,
        works_at_risk=works_at_risk,
        overdue_milestones=overdue_milestones,
        open_defects=open_defects,
        assets_registered=assets_registered,
        assets_awaiting_inspection=assets_awaiting_inspection,
        assets_accepted=assets_accepted,
        inspections_awaiting_action=inspections_awaiting_action,
    )


@router.get("/visualizations", response_model=DashboardVisualizations)
def get_visualizations(
    project_id: Optional[str] = Query(None),
    zone_id: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    vendor_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns rich dataset for the 10 visual analytical components required by Section 7.
    """
    w_query = db.query(WorkPackage)
    w_query = apply_work_filters(w_query, project_id, zone_id, category, vendor_id, status, risk_level)
    works = w_query.all()
    work_ids = [w.id for w in works]

    # 1. Project Status Distribution
    status_counts: Dict[str, int] = {}
    for w in works:
        status_counts[w.workflow_state] = status_counts.get(w.workflow_state, 0) + 1

    color_map = {
        "In Progress": "#2563EB",
        "Progress Reported": "#0284C7",
        "Inspection Pending": "#D97706",
        "Verification Failed": "#DC2626",
        "Rework Required": "#B45309",
        "Accepted": "#15803D",
        "Operationally Ready": "#0F9488",
    }
    project_status_dist = [
        StatusDistributionItem(
            status=st,
            count=cnt,
            color=color_map.get(st, "#64748B")
        )
        for st, cnt in status_counts.items()
    ]

    # 2. Reported vs Verified Progress Comparison (The Core Innovation)
    reported_vs_verified = [
        ReportedVsVerifiedItem(
            work_id=w.work_id,
            title=w.title,
            reported_progress=w.reported_progress_percentage,
            verified_progress=w.verified_progress_percentage,
            gap=round(w.reported_progress_percentage - w.verified_progress_percentage, 1),
            workflow_state=w.workflow_state
        )
        for w in works
    ]

    # 3. Open Defects by Severity
    d_query = db.query(Defect).filter(Defect.status.notin_(["Closed", "Resolved"]))
    if work_ids:
        d_query = d_query.filter(Defect.work_package_id.in_(work_ids))
    elif project_id or zone_id or category or vendor_id or status or risk_level:
        d_query = d_query.filter(Defect.work_package_id == "NONE")
    open_defects = d_query.all()

    severity_counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    for d in open_defects:
        if d.severity in severity_counts:
            severity_counts[d.severity] += 1

    severity_colors = {
        "Critical": "#B91C1C",
        "High": "#EA580C",
        "Medium": "#D97706",
        "Low": "#2563EB"
    }
    defects_by_sev = [
        DefectSeverityItem(
            severity=sev,
            count=count,
            color=severity_colors[sev]
        )
        for sev, count in severity_counts.items()
    ]

    # 4. Work Readiness by Zone
    zones = db.query(Zone).all()
    zone_readiness = []
    for z in zones:
        z_works = [w for w in works if w.project and w.project.zone_id == z.id]
        if not z_works:
            continue
        verified_count = sum(1 for w in z_works if w.verified_progress_percentage >= 100.0 or w.workflow_state in ["Accepted", "Operationally Ready"])
        avg_verified = sum(w.verified_progress_percentage for w in z_works) / len(z_works)
        zone_readiness.append(ZoneReadinessItem(
            zone_code=z.code,
            zone_name=z.name,
            total_works=len(z_works),
            verified_works=verified_count,
            readiness_percentage=round(avg_verified, 1)
        ))

    # 5. Vendor Workload & Performance
    vendors = db.query(Vendor).all()
    vendor_perf = []
    for v in vendors:
        v_works = [w for w in works if w.vendor_id == v.id]
        v_defects = sum(len([d for d in w.defects if d.status not in ["Closed", "Resolved"]]) for w in v_works)
        total_prog = sum(w.verified_progress_percentage for w in v_works) if v_works else 0
        comp_rate = round(total_prog / len(v_works), 1) if v_works else 0.0
        vendor_perf.append(VendorPerformanceItem(
            vendor_id=v.id,
            vendor_name=v.company_name,
            category=v.category,
            assigned_works=len(v_works),
            open_defects=v_defects,
            completion_rate=comp_rate
        ))

    # 6. Upcoming Deadlines
    today = date.today()
    deadlines = []
    for w in works:
        if w.planned_completion_date:
            days = (w.planned_completion_date - today).days
            deadlines.append(DeadlineItem(
                id=w.id,
                work_id=w.work_id,
                title=w.title,
                due_date=w.planned_completion_date,
                days_remaining=days,
                is_overdue=days < 0 and w.workflow_state not in ["Accepted", "Operationally Ready"],
                category=w.category
            ))
    deadlines.sort(key=lambda x: x.days_remaining)

    # 7. Recent Inspections
    recent_insps = db.query(Inspection).order_by(Inspection.created_at.desc()).limit(6).all()
    recent_inspection_items = [
        RecentInspectionItem(
            id=insp.id,
            inspection_id=insp.inspection_id,
            work_title=insp.work_package.title if insp.work_package else "Infrastructure Inspection",
            inspection_type=insp.inspection_type,
            outcome=insp.outcome,
            date=insp.scheduled_date.isoformat() if insp.scheduled_date else insp.created_at.strftime("%Y-%m-%d"),
            notes=insp.notes
        )
        for insp in recent_insps
    ]

    # 8. Highest Priority Risks
    risky_works = sorted([w for w in works if w.risk_score > 0], key=lambda x: x.risk_score, reverse=True)[:5]
    priority_risks = [
        PriorityRiskItem(
            work_id=w.work_id,
            title=w.title,
            risk_score=w.risk_score,
            risk_category=w.risk_category,
            risk_explanation=w.risk_explanation or "Rule-based risk factor flagged based on dependencies and inspections.",
            suggested_action="Review defect tickets & expedite verification inspection." if w.risk_score > 70 else "Monitor vendor submission cadence."
        )
        for w in risky_works
    ]

    # 9. Recent Audit Events
    audits = db.query(AuditEvent).order_by(AuditEvent.created_at.desc()).limit(6).all()
    recent_audits = [
        {
            "id": a.id,
            "event_id": a.event_id,
            "action": a.action,
            "actor": a.actor_email or "System",
            "timestamp": a.created_at.isoformat(),
            "entity": f"{a.entity_type} : {a.entity_id}",
            "reason": a.reason
        }
        for a in audits
    ]

    return DashboardVisualizations(
        project_status_distribution=project_status_dist,
        reported_vs_verified_progress=reported_vs_verified,
        open_defects_by_severity=defects_by_sev,
        work_readiness_by_zone=zone_readiness,
        vendor_workload_performance=vendor_perf,
        upcoming_deadlines=deadlines[:8],
        recent_inspections=recent_inspection_items,
        highest_priority_risks=priority_risks,
        recent_audit_events=recent_audits,
    )


@router.get("/action-queue", response_model=List[ActionQueueItem])
def get_action_queue(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Computes a prioritized queue of actionable items requiring municipal attention.
    Ordered by urgency (Critical items first, followed by High, Moderate).
    """
    today = date.today()
    items: List[ActionQueueItem] = []

    # 1. Critical Defects
    critical_defects = db.query(Defect).filter(
        Defect.severity == "Critical",
        Defect.status.notin_(["Closed", "Resolved"])
    ).all()
    for cd in critical_defects:
        items.append(ActionQueueItem(
            id=f"act-def-{cd.id}",
            item_type="CRITICAL_DEFECT",
            title=f"Critical Defect: {cd.defect_id}",
            description=f"{cd.title} in {cd.work_package.title if cd.work_package else 'Work Package'}.",
            severity="Critical",
            priority_order=1,
            entity_type="defect",
            entity_id=cd.id,
            link_url=f"/defects?id={cd.id}",
            suggested_action="Escalate to vendor for immediate engineering rectification"
        ))

    # 2. Failed Inspections
    failed_inspections = db.query(Inspection).filter(
        Inspection.outcome == "Failed"
    ).all()
    for fi in failed_inspections:
        items.append(ActionQueueItem(
            id=f"act-insp-{fi.id}",
            item_type="FAILED_INSPECTION",
            title=f"Failed Inspection: {fi.inspection_id}",
            description=f"Mandatory checklist checks failed for {fi.work_package.title if fi.work_package else 'Work'}.",
            severity="Critical",
            priority_order=2,
            entity_type="inspection",
            entity_id=fi.id,
            link_url=f"/inspections?id={fi.id}",
            suggested_action="Verify defect tickets created and schedule re-inspection"
        ))

    # 3. Overdue Milestones
    overdue_milestones = db.query(Milestone).filter(
        Milestone.due_date < today,
        Milestone.verification_status != "Verified"
    ).all()
    for om in overdue_milestones:
        days_late = (today - om.due_date).days
        items.append(ActionQueueItem(
            id=f"act-ms-{om.id}",
            item_type="OVERDUE_MILESTONE",
            title=f"Milestone Overdue: {om.name}",
            description=f"Due date was {om.due_date.isoformat()} ({days_late} days past schedule).",
            severity="High",
            priority_order=3,
            entity_type="milestone",
            entity_id=om.id,
            link_url=f"/projects?milestone_id={om.id}",
            suggested_action="Review contractor delay justification and re-baseline schedule"
        ))

    # 4. Inspections Overdue / Scheduled
    pending_inspections = db.query(Inspection).filter(
        Inspection.outcome.in_(["Scheduled", "In Progress"])
    ).all()
    for pi in pending_inspections:
        items.append(ActionQueueItem(
            id=f"act-pinsp-{pi.id}",
            item_type="INSPECTION_AWAITING_ACTION",
            title=f"Inspection Awaiting Execution: {pi.inspection_id}",
            description=f"{pi.inspection_type} assigned to field inspector.",
            severity="Moderate",
            priority_order=4,
            entity_type="inspection",
            entity_id=pi.id,
            link_url=f"/inspections?id={pi.id}",
            suggested_action="Deploy field inspector with mobile checklist"
        ))

    # 5. Assets Awaiting Inspection / Acceptance
    assets_awaiting = db.query(Asset).filter(
        Asset.lifecycle_status.in_(["Installed", "Inspection Pending", "Verification Failed"])
    ).all()
    for aa in assets_awaiting:
        items.append(ActionQueueItem(
            id=f"act-ast-{aa.id}",
            item_type="ASSET_AWAITING_ACCEPTANCE",
            title=f"Asset Not Operationally Ready: {aa.asset_code}",
            description=f"{aa.name} current status is '{aa.lifecycle_status}'. Physical verification pending.",
            severity="Moderate" if aa.lifecycle_status != "Verification Failed" else "High",
            priority_order=5,
            entity_type="asset",
            entity_id=aa.id,
            link_url=f"/assets?id={aa.id}",
            suggested_action="Complete independent inspection before marking operationally ready"
        ))

    # Sort strictly by priority order
    items.sort(key=lambda x: x.priority_order)
    return items
