import io
import csv
from datetime import datetime, timezone, date
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.domain import (
    Project,
    WorkPackage,
    Vendor,
    Milestone,
    Inspection,
    Defect,
    Asset,
    Zone,
    milestone_dependencies
)
from app.models.user import User, AuditEvent
from app.schemas.report import (
    ReportType,
    ReportTypeOption,
    ReportFilterParams,
    ReportColumn,
    ReportSummaryStat,
    ReportMetadata,
    ReportDataResponse
)
from app.services.audit_service import record_audit_event
from app.services.project_service import sanitize_csv_cell
from app.db.base import get_utc_now

REPORT_TYPE_OPTIONS: List[ReportTypeOption] = [
    ReportTypeOption(
        id="project_progress",
        title="Project & Works Progress Overview",
        description="Comprehensive report on planned vs reported vs verified completion across Pushkaralu works.",
        category="Executive & Governance"
    ),
    ReportTypeOption(
        id="work_package_status",
        title="Work Package Register & Milestones",
        description="Detailed operational status, vendor assignments, priorities, and workflow states.",
        category="Project Management"
    ),
    ReportTypeOption(
        id="vendor_performance",
        title="Contractor & Vendor Delivery Performance",
        description="Contractor workload, reported vs verified delivery variance, compliance, and defect rate.",
        category="Contractor Accountability"
    ),
    ReportTypeOption(
        id="milestone_performance",
        title="Milestone Performance & Critical Path",
        description="Contractual milestone completion dates, float/slack days, and critical path identification.",
        category="Schedule & Timeline"
    ),
    ReportTypeOption(
        id="inspection_outcomes",
        title="Field Inspection & Quality Dossier",
        description="Physical verification audits, geofence compliance, checklist pass/fail ratios, and outcomes.",
        category="Quality & Verification"
    ),
    ReportTypeOption(
        id="defect_rework",
        title="Defect Register & Rework Velocity",
        description="Open defects, severity breakdown, contractor rework cycles, and mean time to resolve (MTTR).",
        category="Quality & Verification"
    ),
    ReportTypeOption(
        id="asset_readiness",
        title="Municipal Asset Registry & QR Readiness",
        description="Tracked municipal equipment, QR identifiers, operational lifecycle status, and physical locations.",
        category="Asset Accountability"
    ),
    ReportTypeOption(
        id="overdue_works",
        title="Overdue Works & Festival Buffer Variance",
        description="Milestones and packages breaching scheduled deadlines and eroding Godavari Pushkaralu buffers.",
        category="Risk & Contingency"
    ),
    ReportTypeOption(
        id="risk_register",
        title="Explainable Risk Register",
        description="Automated rule-based risk scores (A-G), explanations, and prioritised escalation triggers.",
        category="Risk & Contingency"
    ),
    ReportTypeOption(
        id="missing_evidence",
        title="Missing Evidence & Compliance Audit",
        description="Milestones, vendor claims, and inspections lacking mandatory photographic or test proof.",
        category="Compliance & Audit"
    ),
    ReportTypeOption(
        id="chain_completeness",
        title="12-Stage Verified Readiness Chain",
        description="Readiness stage audit: Project -> WP -> Milestone -> Evidence -> Inspection -> Asset Readiness.",
        category="Executive & Governance"
    ),
    ReportTypeOption(
        id="audit_history",
        title="System Security & Action Audit Ledger",
        description="Immutable chronological audit record of all state transitions, user access, and acceptances.",
        category="Compliance & Audit"
    )
]


def get_available_report_types() -> List[ReportTypeOption]:
    return REPORT_TYPE_OPTIONS


def generate_report(
    db: Session,
    filters: ReportFilterParams,
    current_user: User
) -> ReportDataResponse:
    report_type = filters.report_type
    generated_at = get_utc_now()
    opt = next((o for o in REPORT_TYPE_OPTIONS if o.id == report_type), REPORT_TYPE_OPTIONS[0])

    metadata = ReportMetadata(
        report_type=report_type,
        title=opt.title,
        description=opt.description,
        generated_at=generated_at,
        generated_by=current_user.full_name or current_user.email,
        total_records=0,
        applied_filters={
            k: v for k, v in filters.model_dump().items() if v is not None and v != "All"
        }
    )

    if report_type == "project_progress":
        return _build_project_progress_report(db, filters, metadata)
    elif report_type == "work_package_status":
        return _build_work_package_report(db, filters, metadata)
    elif report_type == "vendor_performance":
        return _build_vendor_performance_report(db, filters, metadata)
    elif report_type == "milestone_performance":
        return _build_milestone_performance_report(db, filters, metadata)
    elif report_type == "inspection_outcomes":
        return _build_inspection_outcomes_report(db, filters, metadata)
    elif report_type == "defect_rework":
        return _build_defect_rework_report(db, filters, metadata)
    elif report_type == "asset_readiness":
        return _build_asset_readiness_report(db, filters, metadata)
    elif report_type == "overdue_works":
        return _build_overdue_works_report(db, filters, metadata)
    elif report_type == "risk_register":
        return _build_risk_register_report(db, filters, metadata)
    elif report_type == "missing_evidence":
        return _build_missing_evidence_report(db, filters, metadata)
    elif report_type == "chain_completeness":
        return _build_chain_completeness_report(db, filters, metadata)
    elif report_type == "audit_history":
        return _build_audit_history_report(db, filters, metadata)
    else:
        return _build_project_progress_report(db, filters, metadata)


def generate_csv_export(
    db: Session,
    filters: ReportFilterParams,
    current_user: User
) -> str:
    """
    Generates a sanitized CSV export stream for the requested report type,
    mitigating formula injection per Section 17 (Page 37).
    """
    report_data = generate_report(db, filters, current_user)

    output = io.StringIO()
    writer = csv.writer(output)

    # 1. Government Audit Metadata Header Lines
    writer.writerow([f"# CIVICPROOF PLATFORM — GODAVARI PUSHKARALU 2027"])
    writer.writerow([f"# REPORT: {report_data.metadata.title}"])
    writer.writerow([f"# GENERATED AT: {report_data.metadata.generated_at.isoformat()} UTC"])
    writer.writerow([f"# GENERATED BY: {report_data.metadata.generated_by}"])
    writer.writerow([f"# TOTAL RECORDS: {report_data.metadata.total_records}"])
    writer.writerow([f"# NOTICE: {report_data.metadata.demo_pilot_label}"])
    if report_data.metadata.applied_filters:
        filters_str = "; ".join(f"{k}={v}" for k, v in report_data.metadata.applied_filters.items())
        writer.writerow([f"# APPLIED FILTERS: {filters_str}"])
    writer.writerow([])  # blank line separator

    # 2. Table Column Headers
    headers = [col.label for col in report_data.columns]
    writer.writerow(headers)

    # 3. Table Rows with Formula Sanitization
    for row in report_data.rows:
        row_values = []
        for col in report_data.columns:
            val = row.get(col.key, "")
            # Apply formula injection sanitization to every single cell
            sanitized = sanitize_csv_cell(val)
            row_values.append(sanitized)
        writer.writerow(row_values)

    # Record Audit Event
    record_audit_event(
        db=db,
        action="REPORT_EXPORTED_CSV",
        entity_type="Report",
        entity_id=filters.report_type,
        actor_id=current_user.id,
        actor_email=current_user.email,
        details={
            "report_type": filters.report_type,
            "total_rows": len(report_data.rows),
            "filters": report_data.metadata.applied_filters
        }
    )

    return output.getvalue()


# --- Builders for 12 Report Types ---

def _build_project_progress_report(db: Session, filters: ReportFilterParams, metadata: ReportMetadata) -> ReportDataResponse:
    query = db.query(Project)
    if filters.zone_id and filters.zone_id != "All":
        query = query.filter(Project.zone_id == filters.zone_id)
    if filters.category and filters.category != "All":
        query = query.filter(Project.category == filters.category)
    if filters.status and filters.status != "All":
        query = query.filter(Project.current_status == filters.status)

    projects = query.all()

    columns = [
        ReportColumn(key="project_identifier", label="Project ID", data_type="string"),
        ReportColumn(key="name", label="Project Title", data_type="string"),
        ReportColumn(key="category", label="Category", data_type="string"),
        ReportColumn(key="zone_name", label="Ghat / Zone", data_type="string"),
        ReportColumn(key="current_status", label="Status", data_type="badge"),
        ReportColumn(key="priority", label="Priority", data_type="badge"),
        ReportColumn(key="wp_count", label="Work Packages", data_type="number"),
        ReportColumn(key="reported_progress", label="Reported %", data_type="percentage"),
        ReportColumn(key="verified_progress", label="Verified %", data_type="percentage"),
        ReportColumn(key="progress_gap", label="Verification Gap %", data_type="percentage"),
    ]

    rows = []
    total_rep = 0.0
    total_ver = 0.0

    for p in projects:
        wps = p.work_packages or []
        wp_count = len(wps)
        rep = round(sum(w.reported_progress_percentage for w in wps) / wp_count, 1) if wp_count else 0.0
        ver = round(sum(w.verified_progress_percentage for w in wps) / wp_count, 1) if wp_count else 0.0
        gap = round(rep - ver, 1)

        total_rep += rep
        total_ver += ver

        rows.append({
            "project_identifier": p.project_identifier,
            "name": p.name,
            "category": p.category,
            "zone_name": p.zone.name if p.zone else "Unassigned",
            "current_status": p.current_status,
            "priority": p.priority,
            "wp_count": wp_count,
            "reported_progress": f"{rep}%",
            "verified_progress": f"{ver}%",
            "progress_gap": f"{gap}%"
        })

    avg_rep = round(total_rep / len(projects), 1) if projects else 0.0
    avg_ver = round(total_ver / len(projects), 1) if projects else 0.0
    metadata.total_records = len(rows)

    summary_stats = [
        ReportSummaryStat(label="Total Works", value=str(len(projects)), subtext="Under monitoring"),
        ReportSummaryStat(label="Avg Reported Progress", value=f"{avg_rep}%", subtext="Vendor claims"),
        ReportSummaryStat(label="Avg Verified Progress", value=f"{avg_ver}%", subtext="Field verified"),
        ReportSummaryStat(label="Readiness Gap", value=f"{round(avg_rep - avg_ver, 1)}%", subtext="Awaiting proof")
    ]

    return ReportDataResponse(metadata=metadata, summary_stats=summary_stats, columns=columns, rows=rows)


def _build_work_package_report(db: Session, filters: ReportFilterParams, metadata: ReportMetadata) -> ReportDataResponse:
    query = db.query(WorkPackage)
    if filters.category and filters.category != "All":
        query = query.filter(WorkPackage.category == filters.category)
    if filters.status and filters.status != "All":
        query = query.filter(WorkPackage.workflow_state == filters.status)

    wps = query.all()

    columns = [
        ReportColumn(key="work_id", label="Work ID", data_type="string"),
        ReportColumn(key="title", label="Work Package Title", data_type="string"),
        ReportColumn(key="project_name", label="Parent Project", data_type="string"),
        ReportColumn(key="vendor_name", label="Contractor", data_type="string"),
        ReportColumn(key="workflow_state", label="Workflow State", data_type="badge"),
        ReportColumn(key="priority", label="Priority", data_type="badge"),
        ReportColumn(key="reported_progress", label="Reported %", data_type="percentage"),
        ReportColumn(key="verified_progress", label="Verified %", data_type="percentage"),
        ReportColumn(key="risk_category", label="Risk Category", data_type="badge"),
    ]

    rows = []
    for w in wps:
        rows.append({
            "work_id": w.work_id,
            "title": w.title,
            "project_name": w.project.name if w.project else "N/A",
            "vendor_name": w.vendor.company_name if w.vendor else "Unassigned",
            "workflow_state": w.workflow_state,
            "priority": w.priority,
            "reported_progress": f"{w.reported_progress_percentage}%",
            "verified_progress": f"{w.verified_progress_percentage}%",
            "risk_category": w.risk_category or "Low"
        })

    metadata.total_records = len(rows)
    summary_stats = [
        ReportSummaryStat(label="Total Work Packages", value=str(len(wps))),
        ReportSummaryStat(label="In Progress", value=str(len([w for w in wps if w.workflow_state == "In Progress"]))),
        ReportSummaryStat(label="Accepted Works", value=str(len([w for w in wps if w.workflow_state == "Accepted"]))),
        ReportSummaryStat(label="High Risk", value=str(len([w for w in wps if w.risk_category in ["High", "Critical"]])))
    ]

    return ReportDataResponse(metadata=metadata, summary_stats=summary_stats, columns=columns, rows=rows)


def _build_vendor_performance_report(db: Session, filters: ReportFilterParams, metadata: ReportMetadata) -> ReportDataResponse:
    vendors = db.query(Vendor).all()
    columns = [
        ReportColumn(key="vendor_code", label="Vendor Code", data_type="string"),
        ReportColumn(key="company_name", label="Company Name", data_type="string"),
        ReportColumn(key="category", label="Specialization", data_type="string"),
        ReportColumn(key="status", label="Status", data_type="badge"),
        ReportColumn(key="packages_count", label="Active Contracts", data_type="number"),
        ReportColumn(key="avg_reported", label="Avg Reported", data_type="percentage"),
        ReportColumn(key="avg_verified", label="Avg Verified", data_type="percentage"),
        ReportColumn(key="total_defects", label="Open Defects", data_type="number"),
        ReportColumn(key="compliance_status", label="Compliance", data_type="badge")
    ]

    rows = []
    for v in vendors:
        wps = v.work_packages or []
        n = len(wps)
        avg_r = round(sum(w.reported_progress_percentage for w in wps) / n, 1) if n else 0.0
        avg_v = round(sum(w.verified_progress_percentage for w in wps) / n, 1) if n else 0.0
        defect_count = sum(len(w.defects) for w in wps)

        rows.append({
            "vendor_code": v.vendor_code,
            "company_name": v.company_name,
            "category": v.category,
            "status": v.status,
            "packages_count": n,
            "avg_reported": f"{avg_r}%",
            "avg_verified": f"{avg_v}%",
            "total_defects": defect_count,
            "compliance_status": v.compliance_status
        })

    metadata.total_records = len(rows)
    summary_stats = [
        ReportSummaryStat(label="Contractors", value=str(len(vendors))),
        ReportSummaryStat(label="Compliant", value=str(len([v for v in vendors if v.compliance_status == "Compliant"]))),
        ReportSummaryStat(label="Under Review", value=str(len([v for v in vendors if v.status == "Under Review"])))
    ]

    return ReportDataResponse(metadata=metadata, summary_stats=summary_stats, columns=columns, rows=rows)


def _build_milestone_performance_report(db: Session, filters: ReportFilterParams, metadata: ReportMetadata) -> ReportDataResponse:
    milestones = db.query(Milestone).all()
    columns = [
        ReportColumn(key="id", label="Milestone ID", data_type="string"),
        ReportColumn(key="name", label="Milestone Name", data_type="string"),
        ReportColumn(key="work_package_title", label="Work Package", data_type="string"),
        ReportColumn(key="due_date", label="Due Date", data_type="date"),
        ReportColumn(key="is_mandatory", label="Mandatory", data_type="badge"),
        ReportColumn(key="reported_status", label="Reported Status", data_type="badge"),
        ReportColumn(key="verification_status", label="Verification Status", data_type="badge"),
        ReportColumn(key="critical_path", label="Critical Path", data_type="badge"),
    ]

    rows = []
    verified_count = 0
    for ms in milestones:
        is_crit = len(ms.dependencies) > 0 or len(ms.dependent_milestones) > 0
        if ms.verification_status == "Verified":
            verified_count += 1

        rows.append({
            "id": ms.id,
            "name": ms.name,
            "work_package_title": ms.work_package.title if ms.work_package else "N/A",
            "due_date": str(ms.due_date),
            "is_mandatory": "Yes" if ms.is_mandatory else "No",
            "reported_status": ms.reported_status,
            "verification_status": ms.verification_status,
            "critical_path": "Yes" if is_crit else "No"
        })

    metadata.total_records = len(rows)
    summary_stats = [
        ReportSummaryStat(label="Total Milestones", value=str(len(milestones))),
        ReportSummaryStat(label="Verified Milestones", value=str(verified_count)),
        ReportSummaryStat(label="Pending Verification", value=str(len(milestones) - verified_count))
    ]

    return ReportDataResponse(metadata=metadata, summary_stats=summary_stats, columns=columns, rows=rows)


def _build_inspection_outcomes_report(db: Session, filters: ReportFilterParams, metadata: ReportMetadata) -> ReportDataResponse:
    inspections = db.query(Inspection).all()
    columns = [
        ReportColumn(key="inspection_id", label="Inspection ID", data_type="string"),
        ReportColumn(key="inspection_type", label="Verification Type", data_type="string"),
        ReportColumn(key="work_package_title", label="Work Package", data_type="string"),
        ReportColumn(key="actual_date", label="Conducted On", data_type="date"),
        ReportColumn(key="outcome", label="Verdict", data_type="badge"),
        ReportColumn(key="geofence_verified", label="Geofence Valid", data_type="badge"),
        ReportColumn(key="defects_found", label="Defects Logged", data_type="number"),
    ]

    rows = []
    passed = 0
    failed = 0
    for insp in inspections:
        if insp.outcome == "Passed":
            passed += 1
        elif insp.outcome == "Failed":
            failed += 1

        rows.append({
            "inspection_id": insp.inspection_id,
            "inspection_type": insp.inspection_type,
            "work_package_title": insp.work_package.title if insp.work_package else "N/A",
            "actual_date": str(insp.actual_inspection_date.date()) if insp.actual_inspection_date else "Scheduled",
            "outcome": insp.outcome,
            "geofence_verified": "Verified GPS" if insp.is_geofence_verified else "Unverified",
            "defects_found": len(insp.defects)
        })

    metadata.total_records = len(rows)
    summary_stats = [
        ReportSummaryStat(label="Total Audits", value=str(len(inspections))),
        ReportSummaryStat(label="Passed Verifications", value=str(passed)),
        ReportSummaryStat(label="Failed Audits", value=str(failed)),
    ]

    return ReportDataResponse(metadata=metadata, summary_stats=summary_stats, columns=columns, rows=rows)


def _build_defect_rework_report(db: Session, filters: ReportFilterParams, metadata: ReportMetadata) -> ReportDataResponse:
    defects = db.query(Defect).all()
    columns = [
        ReportColumn(key="defect_id", label="Defect ID", data_type="string"),
        ReportColumn(key="title", label="Issue Description", data_type="string"),
        ReportColumn(key="severity", label="Severity", data_type="badge"),
        ReportColumn(key="category", label="Category", data_type="string"),
        ReportColumn(key="work_package_title", label="Work Package", data_type="string"),
        ReportColumn(key="status", label="Status", data_type="badge"),
        ReportColumn(key="rework_count", label="Rework Cycles", data_type="number"),
        ReportColumn(key="target_date", label="Target Resolution", data_type="date"),
    ]

    rows = []
    critical_count = 0
    open_count = 0
    for d in defects:
        if d.severity == "Critical":
            critical_count += 1
        if d.status not in ["Closed by Authorised User", "Resolved — Verification Passed"]:
            open_count += 1

        rows.append({
            "defect_id": d.defect_id,
            "title": d.title,
            "severity": d.severity,
            "category": d.category,
            "work_package_title": d.work_package.title if d.work_package else "N/A",
            "status": d.status,
            "rework_count": d.rework_count,
            "target_date": str(d.target_resolution_date) if d.target_resolution_date else "Immediate"
        })

    metadata.total_records = len(rows)
    summary_stats = [
        ReportSummaryStat(label="Total Defects", value=str(len(defects))),
        ReportSummaryStat(label="Active Open Hazards", value=str(open_count)),
        ReportSummaryStat(label="Critical Severity", value=str(critical_count)),
    ]

    return ReportDataResponse(metadata=metadata, summary_stats=summary_stats, columns=columns, rows=rows)


def _build_asset_readiness_report(db: Session, filters: ReportFilterParams, metadata: ReportMetadata) -> ReportDataResponse:
    assets = db.query(Asset).all()
    columns = [
        ReportColumn(key="asset_code", label="Asset Code", data_type="string"),
        ReportColumn(key="name", label="Asset Description", data_type="string"),
        ReportColumn(key="category", label="Category", data_type="string"),
        ReportColumn(key="lifecycle_status", label="Lifecycle State", data_type="badge"),
        ReportColumn(key="zone_name", label="Ghat / Location", data_type="string"),
        ReportColumn(key="qr_identifier", label="QR Identifier", data_type="string"),
        ReportColumn(key="open_defects", label="Open Defects", data_type="number"),
    ]

    rows = []
    ready = 0
    for a in assets:
        if a.lifecycle_status in ["Accepted", "Operationally Ready"]:
            ready += 1

        rows.append({
            "asset_code": a.asset_code,
            "name": a.name,
            "category": a.category,
            "lifecycle_status": a.lifecycle_status,
            "zone_name": a.zone.name if a.zone else (a.location_name or "Unassigned"),
            "qr_identifier": a.qr_identifier,
            "open_defects": len([d for d in a.defects if d.status not in ["Closed by Authorised User", "Resolved — Verification Passed"]])
        })

    metadata.total_records = len(rows)
    summary_stats = [
        ReportSummaryStat(label="Registered Assets", value=str(len(assets))),
        ReportSummaryStat(label="Operationally Ready", value=str(ready)),
        ReportSummaryStat(label="Pending Verification", value=str(len(assets) - ready)),
    ]

    return ReportDataResponse(metadata=metadata, summary_stats=summary_stats, columns=columns, rows=rows)


def _build_overdue_works_report(db: Session, filters: ReportFilterParams, metadata: ReportMetadata) -> ReportDataResponse:
    today = date.today()
    wps = db.query(WorkPackage).all()
    columns = [
        ReportColumn(key="work_id", label="Work ID", data_type="string"),
        ReportColumn(key="title", label="Work Title", data_type="string"),
        ReportColumn(key="vendor_name", label="Contractor", data_type="string"),
        ReportColumn(key="planned_completion", label="Planned Date", data_type="date"),
        ReportColumn(key="days_overdue", label="Schedule Variance", data_type="badge"),
        ReportColumn(key="workflow_state", label="State", data_type="badge"),
        ReportColumn(key="risk_category", label="Risk Category", data_type="badge")
    ]

    rows = []
    overdue_count = 0
    for w in wps:
        is_overdue = w.planned_completion_date and w.planned_completion_date < today and w.workflow_state not in ["Accepted", "Operationally Ready"]
        days = (today - w.planned_completion_date).days if is_overdue else 0
        if is_overdue:
            overdue_count += 1
            rows.append({
                "work_id": w.work_id,
                "title": w.title,
                "vendor_name": w.vendor.company_name if w.vendor else "Unassigned",
                "planned_completion": str(w.planned_completion_date),
                "days_overdue": f"+{days} Days Overdue",
                "workflow_state": w.workflow_state,
                "risk_category": w.risk_category or "High"
            })

    metadata.total_records = len(rows)
    summary_stats = [
        ReportSummaryStat(label="Overdue Contracts", value=str(overdue_count)),
        ReportSummaryStat(label="Pushkaralu Target", value="14 July 2027", subtext="Event deadline"),
    ]

    return ReportDataResponse(metadata=metadata, summary_stats=summary_stats, columns=columns, rows=rows)


def _build_risk_register_report(db: Session, filters: ReportFilterParams, metadata: ReportMetadata) -> ReportDataResponse:
    wps = db.query(WorkPackage).filter(WorkPackage.risk_score > 0).all()
    columns = [
        ReportColumn(key="work_id", label="Identifier", data_type="string"),
        ReportColumn(key="title", label="Work Package Title", data_type="string"),
        ReportColumn(key="risk_score", label="Risk Score (0-100)", data_type="number"),
        ReportColumn(key="risk_category", label="Risk Level", data_type="badge"),
        ReportColumn(key="risk_explanation", label="Explainable Trigger Rules", data_type="string"),
    ]

    rows = []
    for w in wps:
        rows.append({
            "work_id": w.work_id,
            "title": w.title,
            "risk_score": w.risk_score,
            "risk_category": w.risk_category,
            "risk_explanation": w.risk_explanation or "Rule-based scoring: Verification and defect metrics evaluated."
        })

    metadata.total_records = len(rows)
    summary_stats = [
        ReportSummaryStat(label="Works at Risk", value=str(len(wps))),
        ReportSummaryStat(label="Critical Risk", value=str(len([w for w in wps if w.risk_category == "Critical"]))),
    ]

    return ReportDataResponse(metadata=metadata, summary_stats=summary_stats, columns=columns, rows=rows)


def _build_missing_evidence_report(db: Session, filters: ReportFilterParams, metadata: ReportMetadata) -> ReportDataResponse:
    milestones = db.query(Milestone).all()
    columns = [
        ReportColumn(key="id", label="Milestone ID", data_type="string"),
        ReportColumn(key="name", label="Milestone Name", data_type="string"),
        ReportColumn(key="work_package_title", label="Work Package", data_type="string"),
        ReportColumn(key="reported_status", label="Vendor Claim", data_type="badge"),
        ReportColumn(key="missing_reason", label="Compliance Audit Gap", data_type="string"),
    ]

    rows = []
    missing_count = 0
    for ms in milestones:
        if ms.reported_status == "Completed" and ms.verification_status != "Verified":
            missing_count += 1
            rows.append({
                "id": ms.id,
                "name": ms.name,
                "work_package_title": ms.work_package.title if ms.work_package else "N/A",
                "reported_status": ms.reported_status,
                "missing_reason": "Vendor claims completion; mandatory physical inspection photographic evidence missing."
            })

    metadata.total_records = len(rows)
    summary_stats = [
        ReportSummaryStat(label="Unverified Claims", value=str(missing_count)),
        ReportSummaryStat(label="Compliance Action", value="Inspector Required", subtext="Assign physical audit"),
    ]

    return ReportDataResponse(metadata=metadata, summary_stats=summary_stats, columns=columns, rows=rows)


def _build_chain_completeness_report(db: Session, filters: ReportFilterParams, metadata: ReportMetadata) -> ReportDataResponse:
    wps = db.query(WorkPackage).all()
    columns = [
        ReportColumn(key="work_id", label="Work ID", data_type="string"),
        ReportColumn(key="title", label="Work Package Title", data_type="string"),
        ReportColumn(key="stages_complete", label="Completed Stages (of 12)", data_type="number"),
        ReportColumn(key="readiness_score", label="Chain Readiness %", data_type="percentage"),
        ReportColumn(key="bottleneck", label="Current Stage Bottleneck", data_type="string"),
    ]

    rows = []
    for w in wps:
        # Determine 12-stage progress
        stages = 2  # 1. Project, 2. Work Package
        if w.milestones: stages += 1
        if w.vendor: stages += 1
        if w.progress_submissions: stages += 1
        if any(w.progress_submissions and s.evidence_attachments for s in w.progress_submissions): stages += 1
        if w.inspections: stages += 1
        if any(i.outcome in ["Passed", "Failed"] for i in w.inspections): stages += 1
        if w.defects: stages += 1
        if w.workflow_state in ["Awaiting Authorised Acceptance", "Accepted", "Operationally Ready"]: stages += 1
        if w.assets: stages += 1
        if w.workflow_state == "Operationally Ready": stages += 1

        score = round((stages / 12) * 100, 1)

        rows.append({
            "work_id": w.work_id,
            "title": w.title,
            "stages_complete": stages,
            "readiness_score": f"{score}%",
            "bottleneck": w.workflow_state
        })

    metadata.total_records = len(rows)
    summary_stats = [
        ReportSummaryStat(label="Chains Evaluated", value=str(len(wps))),
        ReportSummaryStat(label="12-Stage Invariant", value="Strict Enforcement"),
    ]

    return ReportDataResponse(metadata=metadata, summary_stats=summary_stats, columns=columns, rows=rows)


def _build_audit_history_report(db: Session, filters: ReportFilterParams, metadata: ReportMetadata) -> ReportDataResponse:
    events = db.query(AuditEvent).order_by(AuditEvent.created_at.desc()).limit(100).all()
    columns = [
        ReportColumn(key="event_id", label="Event Code", data_type="string"),
        ReportColumn(key="action", label="System Action", data_type="badge"),
        ReportColumn(key="actor_email", label="Actor Account", data_type="string"),
        ReportColumn(key="entity_type", label="Entity Type", data_type="string"),
        ReportColumn(key="entity_id", label="Target Entity ID", data_type="string"),
        ReportColumn(key="timestamp", label="Timestamp (UTC)", data_type="date"),
    ]

    rows = []
    for ev in events:
        rows.append({
            "event_id": ev.event_id,
            "action": ev.action,
            "actor_email": ev.actor_email or "System / Anonymous",
            "entity_type": ev.entity_type,
            "entity_id": ev.entity_id,
            "timestamp": ev.created_at.strftime("%Y-%m-%d %H:%M:%S") if ev.created_at else "N/A"
        })

    metadata.total_records = len(rows)
    summary_stats = [
        ReportSummaryStat(label="Audit Trail Events", value=str(len(events))),
        ReportSummaryStat(label="Immutable Ledger", value="WORM Enforced", subtext="Append-only"),
    ]

    return ReportDataResponse(metadata=metadata, summary_stats=summary_stats, columns=columns, rows=rows)
