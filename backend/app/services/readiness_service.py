from datetime import datetime, date, timedelta, timezone
from typing import List, Optional, Dict, Any, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc

from app.models.domain import (
    Project, WorkPackage, Milestone, Inspection, Defect, Asset, ProgressSubmission, Zone, Vendor
)
from app.models.user import User
from app.schemas.readiness import (
    ReadinessChainStep,
    ReadinessChainResponse,
    AcceptanceCriteriaCheck,
    AcceptanceValidationResult,
    AcceptanceTransitionRequest,
    RiskFactor,
    WorkPackageRiskEvaluation,
    ReadinessDashboardSummary,
)
from app.services.audit_service import record_audit_event


def build_readiness_chain(db: Session, work_package_id: str) -> ReadinessChainResponse:
    """
    Constructs the end-to-end 12-stage verified readiness chain for a work package
    per Section 13 (Verified Readiness Chain) of the CivicProof specification.
    """
    wp = db.query(WorkPackage).filter(WorkPackage.id == work_package_id).first()
    if not wp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Work package '{work_package_id}' not found")

    project = wp.project
    vendor = wp.vendor
    milestones = db.query(Milestone).filter(Milestone.work_package_id == wp.id).order_by(Milestone.due_date).all()
    inspections = db.query(Inspection).filter(Inspection.work_package_id == wp.id).order_by(desc(Inspection.actual_inspection_date)).all()
    defects = db.query(Defect).filter(Defect.work_package_id == wp.id).order_by(desc(Defect.created_at)).all()
    submissions = db.query(ProgressSubmission).filter(ProgressSubmission.work_package_id == wp.id).order_by(desc(ProgressSubmission.created_at)).all()
    assets = db.query(Asset).filter(Asset.work_package_id == wp.id).all()
    primary_asset = assets[0] if assets else None

    chain_steps: List[ReadinessChainStep] = []
    blocking_reasons: List[str] = []

    # 1. Project Inception
    proj_status = "Completed" if project.current_status in ["In Progress", "Completed", "Active"] else "Pending"
    chain_steps.append(ReadinessChainStep(
        step_number=1,
        stage_id="project",
        title="Project Inception & Administrative Sanction",
        entity_type="Project",
        entity_id=project.id,
        status=proj_status,
        status_label="Sanctioned",
        timestamp=project.created_at,
        actor_name="Godavari Pushkaralu High-Powered Committee",
        actor_role="Sanctioning Authority",
        notes=f"Project '{project.name}' approved under priority '{project.priority}'. Funding ref: {project.funding_reference or 'N/A'}"
    ))

    # 2. Work Package Scoping & Contractor Assignment
    wp_status = "Completed" if vendor is not None else "Pending"
    chain_steps.append(ReadinessChainStep(
        step_number=2,
        stage_id="work_package",
        title="Work Package Scoping & Contractor Contracting",
        entity_type="WorkPackage",
        entity_id=wp.id,
        status=wp_status,
        status_label="Contracted" if vendor else "Unassigned",
        timestamp=wp.created_at,
        actor_name=vendor.company_name if vendor else "Unassigned",
        actor_role="Appointed Contractor" if vendor else "Procurement Cell",
        notes=f"Scope: {wp.title}. Priority: {wp.priority}. Target completion: {wp.planned_completion_date or 'TBD'}"
    ))

    # 3. Milestone Definition & Verification Path
    mandatory_ms = [m for m in milestones if m.is_mandatory]
    overdue_ms = [m for m in mandatory_ms if m.due_date < date.today() and m.verification_status != "Verified"]
    unverified_ms = [m for m in mandatory_ms if m.verification_status != "Verified"]

    if not mandatory_ms:
        ms_step_status = "Pending"
        ms_label = "No Milestones Defined"
        ms_notes = "Mandatory work milestones have not yet been formalized."
    elif overdue_ms:
        ms_step_status = "Blocked"
        ms_label = f"{len(overdue_ms)} Milestone(s) Overdue"
        ms_notes = f"Overdue milestone: '{overdue_ms[0].name}' was due on {overdue_ms[0].due_date.isoformat()}."
        blocking_reasons.append(f"Milestone '{overdue_ms[0].name}' is overdue and unverified")
    elif unverified_ms:
        ms_step_status = "Pending"
        ms_label = f"{len(mandatory_ms) - len(unverified_ms)}/{len(mandatory_ms)} Verified"
        ms_notes = f"Next milestone: '{unverified_ms[0].name}' due {unverified_ms[0].due_date.isoformat()}."
    else:
        ms_step_status = "Completed"
        ms_label = f"All {len(mandatory_ms)} Milestones Verified"
        ms_notes = "All mandatory technical milestones have been field verified."

    chain_steps.append(ReadinessChainStep(
        step_number=3,
        stage_id="milestone",
        title="Contractual Milestone Execution",
        entity_type="Milestone",
        entity_id=mandatory_ms[0].id if mandatory_ms else None,
        status=ms_step_status,
        status_label=ms_label,
        timestamp=milestones[-1].created_at if milestones else None,
        actor_name="Executive Engineer & Contractor",
        actor_role="Supervising Engineers",
        notes=ms_notes,
        missing_requirements=[f"Verify milestone: {m.name}" for m in unverified_ms[:2]]
    ))

    # 4. Vendor Progress Submission
    latest_sub = submissions[0] if submissions else None
    if not latest_sub:
        sub_status = "Pending"
        sub_label = f"Reported {wp.reported_progress_percentage}% (No Formal Submission)"
        sub_notes = "Vendor progress claimed without formal submission filing."
    elif latest_sub.review_status == "Reviewed":
        sub_status = "Completed"
        sub_label = f"Submitted {latest_sub.progress_percentage}% (Reviewed)"
        sub_notes = f"Submission {latest_sub.submission_code} reviewed. Remarks: {latest_sub.reviewer_notes or 'Accepted'}"
    elif latest_sub.review_status == "Rejected":
        sub_status = "Failed"
        sub_label = f"Submission Rejected ({latest_sub.submission_code})"
        sub_notes = f"Contractor submission rejected by reviewer: {latest_sub.reviewer_notes or 'Inadequate'}"
        blocking_reasons.append(f"Vendor submission {latest_sub.submission_code} was rejected")
    else:
        sub_status = "Pending"
        sub_label = f"Under Review ({latest_sub.progress_percentage}%)"
        sub_notes = f"Formal progress submission {latest_sub.submission_code} filed and awaiting administrative review."

    chain_steps.append(ReadinessChainStep(
        step_number=4,
        stage_id="vendor_submission",
        title="Vendor Progress Submission",
        entity_type="ProgressSubmission",
        entity_id=latest_sub.id if latest_sub else None,
        status=sub_status,
        status_label=sub_label,
        timestamp=latest_sub.created_at if latest_sub else None,
        actor_name=vendor.company_name if vendor else "Vendor",
        actor_role="Contractor Project Lead",
        notes=sub_notes
    ))

    # 5. Supporting Technical Evidence
    evidence_items = []
    if latest_sub and latest_sub.evidence_attachments:
        evidence_items.extend(latest_sub.evidence_attachments)
    for insp in inspections:
        if insp.evidence_photos:
            evidence_items.extend(insp.evidence_photos)

    if not evidence_items:
        ev_status = "Pending"
        ev_label = "Missing Evidence"
        ev_notes = "Mandatory photographic or laboratory test certificates have not been uploaded."
        missing_ev = ["Upload geo-tagged site photographs", "Upload material/weld test certificates"]
    else:
        ev_status = "Completed"
        ev_label = f"{len(evidence_items)} Evidence File(s) Registered"
        ev_notes = f"Verified photographic and laboratory test evidence present in vault."
        missing_ev = []

    chain_steps.append(ReadinessChainStep(
        step_number=5,
        stage_id="supporting_evidence",
        title="Supporting Technical & Photographic Evidence",
        entity_type="Inspection",
        entity_id=inspections[0].id if inspections else None,
        status=ev_status,
        status_label=ev_label,
        timestamp=latest_sub.created_at if latest_sub else None,
        actor_name="Field Inspection Unit",
        actor_role="Evidence Custodian",
        notes=ev_notes,
        evidence_refs=evidence_items[:4],
        missing_requirements=missing_ev
    ))

    # 6. Field Inspection
    latest_insp = inspections[0] if inspections else None
    if not latest_insp:
        insp_status = "Pending"
        insp_label = "Inspection Not Scheduled"
        insp_notes = "Mandatory independent field verification has not been performed."
    elif latest_insp.outcome in ["Passed", "Conditional Pass"]:
        insp_status = "Completed"
        insp_label = f"Inspection {latest_insp.outcome}"
        insp_notes = f"Inspection {latest_insp.inspection_id} completed with geofence verification."
    elif latest_insp.outcome == "Failed":
        insp_status = "Failed"
        insp_label = "Field Inspection Failed"
        insp_notes = f"Inspection {latest_insp.inspection_id} failed: {latest_insp.notes or 'Deficiencies noted'}"
        blocking_reasons.append(f"Inspection {latest_insp.inspection_id} failed field verification")
    else:
        insp_status = "Pending"
        insp_label = f"Inspection {latest_insp.outcome}"
        insp_notes = f"Inspection {latest_insp.inspection_id} scheduled for {latest_insp.scheduled_date or 'upcoming'}"

    chain_steps.append(ReadinessChainStep(
        step_number=6,
        stage_id="inspection",
        title="Field Inspection & Geofenced Audit",
        entity_type="Inspection",
        entity_id=latest_insp.id if latest_insp else None,
        status=insp_status,
        status_label=insp_label,
        timestamp=latest_insp.actual_inspection_date if latest_insp else None,
        actor_name=latest_insp.inspector_signature if latest_insp and latest_insp.inspector_signature else "Quality Assurance Inspector",
        actor_role="Independent Quality Inspector",
        notes=insp_notes
    ))

    # 7. Inspection Decision & Verified Progress Accreditation
    if not latest_insp:
        dec_status = "Pending"
        dec_label = "0.0% Verified"
        dec_notes = "No inspection verdict issued."
    elif latest_insp.outcome == "Passed":
        dec_status = "Completed"
        dec_label = f"Verified: {wp.verified_progress_percentage}% Accredited"
        dec_notes = f"Inspector certified {latest_insp.verified_percentage_awarded or wp.verified_progress_percentage}% verified progress."
    elif latest_insp.outcome == "Failed":
        dec_status = "Failed"
        dec_label = "0.0% Progress Awarded (Rejected)"
        dec_notes = "Failed test prevents progress verification. Section 28 invariant enforced."
    else:
        dec_status = "Pending"
        dec_label = "Awaiting Final Verdict"
        dec_notes = "Checklist undergoing review."

    chain_steps.append(ReadinessChainStep(
        step_number=7,
        stage_id="inspection_decision",
        title="Inspection Verdict & Progress Accreditation",
        entity_type="Inspection",
        entity_id=latest_insp.id if latest_insp else None,
        status=dec_status,
        status_label=dec_label,
        timestamp=latest_insp.actual_inspection_date if latest_insp else None,
        actor_name="Quality Assurance Cell",
        actor_role="Certifying Authority",
        notes=dec_notes
    ))

    # 8. Defects & Corrective Actions
    active_critical_high = [
        d for d in defects
        if d.severity in ["Critical", "High"] and d.status not in ["Resolved — Verification Passed", "Closed by Authorised User"]
    ]
    active_other_defects = [
        d for d in defects
        if d.severity not in ["Critical", "High"] and d.status not in ["Resolved — Verification Passed", "Closed by Authorised User"]
    ]

    if active_critical_high:
        defect_status = "Blocked"
        defect_label = f"{len(active_critical_high)} Blocking Defect(s) Active"
        defect_notes = f"Defect {active_critical_high[0].defect_id} ({active_critical_high[0].severity}): '{active_critical_high[0].title}' blocks readiness."
        blocking_reasons.append(f"Blocking defect {active_critical_high[0].defect_id} is unresolved")
    elif active_other_defects:
        defect_status = "Pending"
        defect_label = f"{len(active_other_defects)} Moderate Defect(s) in Remediation"
        defect_notes = f"Moderate/Low defects logged; vendor actively addressing."
    elif defects:
        defect_status = "Completed"
        defect_label = f"All {len(defects)} Defects Resolved"
        defect_notes = "All historical defects have been remediated and certified closed."
    else:
        defect_status = "Completed"
        defect_label = "Zero Defects Logged"
        defect_notes = "Clean quality record. No non-conformances identified."

    chain_steps.append(ReadinessChainStep(
        step_number=8,
        stage_id="defects",
        title="Defects & Corrective Action Tracking",
        entity_type="Defect",
        entity_id=active_critical_high[0].id if active_critical_high else (defects[0].id if defects else None),
        status=defect_status,
        status_label=defect_label,
        timestamp=defects[0].created_at if defects else None,
        actor_name="Quality Assurance & Contractor",
        actor_role="Remediation Cell",
        notes=defect_notes
    ))

    # 9. Re-inspection & Rework Certification
    reinspection_needed = [d for d in defects if d.status in ["Correction Submitted", "Verification Pending", "Rejected — Rework Required"]]
    reinspected_passed = [d for d in defects if d.status in ["Resolved — Verification Passed", "Closed by Authorised User"]]

    if reinspection_needed:
        re_status = "Pending"
        re_label = f"{len(reinspection_needed)} Re-inspection(s) Pending"
        re_notes = f"Contractor submitted rework for {reinspection_needed[0].defect_id}. Independent verification pending."
    elif active_critical_high:
        re_status = "Blocked"
        re_label = "Rework Not Yet Submitted"
        re_notes = "Vendor has not yet submitted corrective actions for blocking defects."
    else:
        re_status = "Completed"
        re_label = "Re-inspections Certified" if reinspected_passed else "No Rework Required"
        re_notes = "All corrective actions verified with photographic evidence."

    chain_steps.append(ReadinessChainStep(
        step_number=9,
        stage_id="reinspection",
        title="Re-inspection & Rework Certification",
        entity_type="Defect",
        entity_id=reinspection_needed[0].id if reinspection_needed else None,
        status=re_status,
        status_label=re_label,
        timestamp=None,
        actor_name="Senior Quality Auditor",
        actor_role="Independent Re-inspector",
        notes=re_notes
    ))

    # 10. Authorised Acceptance Sign-Off
    if wp.workflow_state in ["Accepted", "Completed"]:
        acc_status = "Completed"
        acc_label = "Formally Accepted"
        acc_notes = f"Work package has achieved official administrative acceptance. Completion recorded on {wp.actual_completion_date or 'today'}."
    elif blocking_reasons:
        acc_status = "Blocked"
        acc_label = "Acceptance Gate Blocked"
        acc_notes = f"Acceptance prevented by: {', '.join(blocking_reasons[:2])}."
    elif wp.verified_progress_percentage >= 90.0 and not unverified_ms:
        acc_status = "Awaiting Authorisation"
        acc_label = "Awaiting Authorisation"
        acc_notes = "All prerequisite verification checks satisfied. Ready for Municipal Commissioner sign-off."
    else:
        acc_status = "Pending"
        acc_label = f"In Progress ({wp.verified_progress_percentage}% verified)"
        acc_notes = "Work in progress. Minimum 90% verified milestone progress required for acceptance."

    chain_steps.append(ReadinessChainStep(
        step_number=10,
        stage_id="acceptance",
        title="Authorised Acceptance & Administrative Sign-off",
        entity_type="WorkPackage",
        entity_id=wp.id,
        status=acc_status,
        status_label=acc_label,
        timestamp=wp.updated_at if wp.workflow_state in ["Accepted", "Completed"] else None,
        actor_name="Municipal Administrator",
        actor_role="Authorised Reviewer",
        notes=acc_notes
    ))

    # 11. Linked Municipal Asset Registration
    if not primary_asset:
        asset_status = "Not Applicable"
        asset_label = "No Capital Asset Linked"
        asset_notes = "This civil work package does not produce a discrete tagged municipal asset."
    else:
        asset_status = "Completed"
        asset_label = f"Asset {primary_asset.asset_code} Tagged"
        asset_notes = f"Linked to {primary_asset.name} ({primary_asset.category}). QR code registered."

    chain_steps.append(ReadinessChainStep(
        step_number=11,
        stage_id="linked_asset",
        title="Municipal Asset Registry & QR Serialization",
        entity_type="Asset",
        entity_id=primary_asset.id if primary_asset else None,
        status=asset_status,
        status_label=asset_label,
        timestamp=primary_asset.created_at if primary_asset else None,
        actor_name="Municipal Asset Registrar",
        actor_role="Asset Registrar",
        notes=asset_notes
    ))

    # 12. Pushkaralu Operational Readiness Decision
    if not primary_asset:
        op_status = "Completed" if wp.workflow_state in ["Accepted", "Completed"] else "Pending"
        op_label = "Work Ready for Event" if wp.workflow_state in ["Accepted", "Completed"] else "Pending Completion"
        op_notes = "Civil service ready for Godavari Pushkaralu operations." if wp.workflow_state in ["Accepted", "Completed"] else "Work in progress."
    else:
        if primary_asset.lifecycle_status == "Operationally Ready":
            op_status = "Completed"
            op_label = "Operationally Ready"
            op_notes = f"Asset {primary_asset.asset_code} certified operationally ready for Pushkaralu 2027 pilgrims."
        elif primary_asset.lifecycle_status in ["Verification Failed", "Maintenance Required", "Out of Service"]:
            op_status = "Blocked"
            op_label = f"Readiness Blocked ({primary_asset.lifecycle_status})"
            op_notes = f"Asset {primary_asset.asset_code} cannot be declared operationally ready due to {primary_asset.lifecycle_status} state."
            blocking_reasons.append(f"Asset is in {primary_asset.lifecycle_status} state")
        elif primary_asset.lifecycle_status == "Accepted":
            op_status = "Awaiting Authorisation"
            op_label = "Ready for Final Commissioning"
            op_notes = "Asset accepted by municipal engineers; awaiting pre-event operational commissioning."
        else:
            op_status = "Pending"
            op_label = primary_asset.lifecycle_status
            op_notes = f"Asset is currently {primary_asset.lifecycle_status}."

    chain_steps.append(ReadinessChainStep(
        step_number=12,
        stage_id="operational_readiness",
        title="Godavari Pushkaralu Operational Readiness Decision",
        entity_type="Asset" if primary_asset else "WorkPackage",
        entity_id=primary_asset.id if primary_asset else wp.id,
        status=op_status,
        status_label=op_label,
        timestamp=primary_asset.updated_at if primary_asset and primary_asset.lifecycle_status == "Operationally Ready" else None,
        actor_name="District Collector / Pushkaralu Special Officer",
        actor_role="High-Powered Readiness Authority",
        notes=op_notes
    ))

    is_blocked = len(blocking_reasons) > 0 or any(step.status in ["Blocked", "Failed"] for step in chain_steps)

    return ReadinessChainResponse(
        work_package_id=wp.id,
        work_id=wp.work_id,
        work_package_title=wp.title,
        project_id=project.id,
        project_name=project.name,
        vendor_id=vendor.id if vendor else None,
        vendor_name=vendor.company_name if vendor else None,
        reported_progress_percentage=wp.reported_progress_percentage,
        verified_progress_percentage=wp.verified_progress_percentage,
        workflow_state=wp.workflow_state,
        operational_readiness_state=primary_asset.lifecycle_status if primary_asset else ("Accepted" if wp.workflow_state in ["Accepted", "Completed"] else "In Progress"),
        is_blocked=is_blocked,
        blocking_reasons=list(dict.fromkeys(blocking_reasons)),
        chain_steps=chain_steps
    )


def validate_acceptance_criteria(db: Session, work_package_id: str) -> AcceptanceValidationResult:
    """
    Evaluates explicit, testable criteria before accepting a work package per Section 13:
    1. Mandatory milestones completed and verified
    2. Required inspections conducted with passing outcome
    3. Required evidence present
    4. Zero unresolved blocking (Critical/High) defects
    5. Verified progress threshold met (>= 90%)
    """
    wp = db.query(WorkPackage).filter(WorkPackage.id == work_package_id).first()
    if not wp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Work package '{work_package_id}' not found")

    milestones = db.query(Milestone).filter(Milestone.work_package_id == wp.id).all()
    inspections = db.query(Inspection).filter(Inspection.work_package_id == wp.id).all()
    defects = db.query(Defect).filter(Defect.work_package_id == wp.id).all()
    submissions = db.query(ProgressSubmission).filter(ProgressSubmission.work_package_id == wp.id).all()

    checks: List[AcceptanceCriteriaCheck] = []

    # Check 1: Mandatory Milestones
    mandatory_ms = [m for m in milestones if m.is_mandatory]
    unverified_mandatory = [m for m in mandatory_ms if m.verification_status != "Verified"]
    if not mandatory_ms:
        checks.append(AcceptanceCriteriaCheck(
            code="CRIT_MILESTONES",
            criterion="Mandatory Milestones Verification",
            status="WARNING",
            details="No mandatory milestones defined for this package.",
            is_blocking=False
        ))
    elif unverified_mandatory:
        unverified_names = ", ".join([f"'{m.name}'" for m in unverified_mandatory[:3]])
        checks.append(AcceptanceCriteriaCheck(
            code="CRIT_MILESTONES",
            criterion="Mandatory Milestones Verification",
            status="FAILED",
            details=f"{len(unverified_mandatory)} of {len(mandatory_ms)} mandatory milestone(s) remain unverified: {unverified_names}.",
            is_blocking=True
        ))
    else:
        checks.append(AcceptanceCriteriaCheck(
            code="CRIT_MILESTONES",
            criterion="Mandatory Milestones Verification",
            status="PASSED",
            details=f"All {len(mandatory_ms)} mandatory contractual milestones have been independently verified.",
            is_blocking=True
        ))

    # Check 2: Required Inspections
    failed_inspections = [i for i in inspections if i.outcome == "Failed"]
    passed_inspections = [i for i in inspections if i.outcome in ["Passed", "Conditional Pass"]]
    if failed_inspections:
        checks.append(AcceptanceCriteriaCheck(
            code="CRIT_INSPECTIONS",
            criterion="Field Quality & Safety Verification",
            status="FAILED",
            details=f"Inspection {failed_inspections[0].inspection_id} failed with critical non-compliance: {failed_inspections[0].notes or 'Failed'}.",
            is_blocking=True
        ))
    elif not passed_inspections:
        checks.append(AcceptanceCriteriaCheck(
            code="CRIT_INSPECTIONS",
            criterion="Field Quality & Safety Verification",
            status="FAILED",
            details="Zero passed quality inspections recorded on this work package.",
            is_blocking=True
        ))
    else:
        checks.append(AcceptanceCriteriaCheck(
            code="CRIT_INSPECTIONS",
            criterion="Field Quality & Safety Verification",
            status="PASSED",
            details=f"{len(passed_inspections)} field quality and safety inspection(s) completed and certified.",
            is_blocking=True
        ))

    # Check 3: Blocking Defects
    blocking_defects = [
        d for d in defects
        if d.severity in ["Critical", "High"] and d.status not in ["Resolved — Verification Passed", "Closed by Authorised User"]
    ]
    if blocking_defects:
        defect_details = ", ".join([f"{d.defect_id} ({d.severity})" for d in blocking_defects[:3]])
        checks.append(AcceptanceCriteriaCheck(
            code="CRIT_DEFECTS",
            criterion="Zero Unresolved Blocking Defects",
            status="FAILED",
            details=f"{len(blocking_defects)} unresolved Critical/High defect(s) prevent acceptance: {defect_details}.",
            is_blocking=True
        ))
    else:
        checks.append(AcceptanceCriteriaCheck(
            code="CRIT_DEFECTS",
            criterion="Zero Unresolved Blocking Defects",
            status="PASSED",
            details="Zero unresolved Critical or High defects logged against this work package.",
            is_blocking=True
        ))

    # Check 4: Supporting Technical Evidence
    evidence_count = 0
    for s in submissions:
        if s.evidence_attachments:
            evidence_count += len(s.evidence_attachments)
    for i in inspections:
        if i.evidence_photos:
            evidence_count += len(i.evidence_photos)

    if evidence_count == 0:
        checks.append(AcceptanceCriteriaCheck(
            code="CRIT_EVIDENCE",
            criterion="Mandatory Technical Evidence Vault",
            status="FAILED",
            details="Zero photographic or laboratory test certificates uploaded to verify claimed progress.",
            is_blocking=True
        ))
    elif evidence_count < 2:
        checks.append(AcceptanceCriteriaCheck(
            code="CRIT_EVIDENCE",
            criterion="Mandatory Technical Evidence Vault",
            status="WARNING",
            details=f"Only {evidence_count} evidence file registered. Additional site verification recommended.",
            is_blocking=False
        ))
    else:
        checks.append(AcceptanceCriteriaCheck(
            code="CRIT_EVIDENCE",
            criterion="Mandatory Technical Evidence Vault",
            status="PASSED",
            details=f"{evidence_count} technical verification and photographic evidence items certified.",
            is_blocking=True
        ))

    # Check 5: Verified Progress Accreditation
    if wp.verified_progress_percentage < 90.0:
        checks.append(AcceptanceCriteriaCheck(
            code="CRIT_PROGRESS",
            criterion="Verified Progress Accreditation (>=90%)",
            status="FAILED",
            details=f"Verified progress is {wp.verified_progress_percentage}%. Minimum 90.0% verified completion required for acceptance sign-off.",
            is_blocking=True
        ))
    else:
        checks.append(AcceptanceCriteriaCheck(
            code="CRIT_PROGRESS",
            criterion="Verified Progress Accreditation (>=90%)",
            status="PASSED",
            details=f"Verified progress is {wp.verified_progress_percentage}% (meets >=90.0% threshold).",
            is_blocking=True
        ))

    blocking_failures = [c for c in checks if c.status == "FAILED" and c.is_blocking]
    can_accept = len(blocking_failures) == 0

    if can_accept:
        summary_message = "All mandatory readiness and quality criteria satisfied. Ready for formal acceptance."
    else:
        summary_message = f"Acceptance BLOCKED: {len(blocking_failures)} mandatory condition(s) unsatisfied."

    return AcceptanceValidationResult(
        work_package_id=wp.id,
        work_package_title=wp.title,
        work_id=wp.work_id,
        can_accept=can_accept,
        checks=checks,
        unresolved_blocking_defects_count=len(blocking_defects),
        unverified_mandatory_milestones_count=len(unverified_mandatory),
        missing_evidence_count=1 if evidence_count == 0 else 0,
        failed_inspections_count=len(failed_inspections),
        summary_message=summary_message
    )


def transition_work_package_acceptance(
    db: Session,
    work_package_id: str,
    payload: AcceptanceTransitionRequest,
    current_user: User
) -> WorkPackage:
    """
    Executes controlled acceptance action with audit logging.
    If conditions fail and allow_exception is false, rejects transition.
    If allow_exception is true, requires authorized reviewer permissions.
    """
    wp = db.query(WorkPackage).filter(WorkPackage.id == work_package_id).first()
    if not wp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Work package '{work_package_id}' not found")

    validation = validate_acceptance_criteria(db, work_package_id)

    if not validation.can_accept and not payload.allow_exception:
        failed_reasons = [c.details for c in validation.checks if c.status == "FAILED"]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Acceptance criteria unsatisfied: {'; '.join(failed_reasons)}"
        )

    # Check RBAC for authorized acceptance
    user_roles = [r.id for r in current_user.roles]
    is_authorized = any(r in ["super_admin", "municipal_admin"] for r in user_roles)
    if not is_authorized:
        # Check permissions
        perms = set()
        for r in current_user.roles:
            for p in r.permissions:
                perms.add(p.id)
        if "acceptance:approve" not in perms:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only authorized Municipal Administrators or Super Administrators can execute formal acceptance sign-off."
            )

    if payload.allow_exception:
        if not payload.exception_reason or len(payload.exception_reason.strip()) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Official justification (minimum 10 characters) is required when accepting with an authorized exception."
            )

    previous_state = wp.workflow_state
    new_state = "Accepted with Exception" if payload.allow_exception else "Accepted"
    wp.workflow_state = new_state
    wp.actual_completion_date = date.today()
    wp.updated_at = datetime.now(timezone.utc)

    # Record append-only audit event
    record_audit_event(
        db=db,
        action="WORK_PACKAGE_ACCEPTANCE",
        entity_type="WorkPackage",
        entity_id=wp.id,
        actor_id=current_user.id,
        reason=payload.exception_reason if payload.allow_exception else payload.decision_notes,
        details={
            "previous_state": {"workflow_state": previous_state, "verified_progress": wp.verified_progress_percentage},
            "new_state": {
                "workflow_state": new_state,
                "actual_completion_date": wp.actual_completion_date.isoformat(),
                "allow_exception": payload.allow_exception,
                "exception_reason": payload.exception_reason,
                "decision_notes": payload.decision_notes
            }
        }
    )

    db.commit()
    db.refresh(wp)
    return wp


def evaluate_work_package_risk(db: Session, wp: WorkPackage) -> WorkPackageRiskEvaluation:
    """
    Transparent, explainable rule-based risk engine per Section 14:
    Executes Rules A through G, computes 0-100 score, assigns risk category,
    generates plain-language explanation and role-appropriate actions.
    """
    today = date.today()
    milestones = db.query(Milestone).filter(Milestone.work_package_id == wp.id).order_by(Milestone.due_date).all()
    inspections = db.query(Inspection).filter(Inspection.work_package_id == wp.id).all()
    defects = db.query(Defect).filter(Defect.work_package_id == wp.id).all()
    submissions = db.query(ProgressSubmission).filter(ProgressSubmission.work_package_id == wp.id).order_by(desc(ProgressSubmission.created_at)).all()

    factors: List[RiskFactor] = []
    actions: List[str] = []
    total_score = 0

    # If no milestones exist at all -> Insufficient Data
    if not milestones and not inspections:
        return WorkPackageRiskEvaluation(
            work_package_id=wp.id,
            work_id=wp.work_id,
            work_package_title=wp.title,
            project_id=wp.project_id,
            project_name=wp.project.name if wp.project else "Unknown",
            category=wp.category,
            vendor_name=wp.vendor.company_name if wp.vendor else None,
            reported_progress_percentage=wp.reported_progress_percentage,
            verified_progress_percentage=wp.verified_progress_percentage,
            workflow_state=wp.workflow_state,
            risk_score=0,
            risk_category="Insufficient Data",
            risk_explanation="Insufficient data: No contractual milestones or field inspections have been scheduled yet.",
            factors=[],
            suggested_actions=["Formalize contractual milestones", "Schedule baseline field inspection"],
            evaluated_at=datetime.now(timezone.utc)
        )

    # RULE A: Overdue Milestone
    # If due date has passed and milestone is not accepted/verified
    overdue_milestones = [m for m in milestones if m.due_date < today and m.verification_status != "Verified"]
    if overdue_milestones:
        pts = min(35, len(overdue_milestones) * 20)
        total_score += pts
        ms_names = ", ".join([f"'{m.name}' (due {m.due_date.isoformat()})" for m in overdue_milestones[:2]])
        factors.append(RiskFactor(
            rule_id="RULE_A",
            rule_name="Overdue Contractual Milestone",
            severity="Critical" if len(overdue_milestones) > 1 else "High",
            score_impact=pts,
            explanation=f"{len(overdue_milestones)} milestone(s) overdue and unverified: {ms_names}.",
            suggested_action="Review overdue milestone and schedule expedited inspection.",
            trigger_data={"count": len(overdue_milestones), "oldest_due": overdue_milestones[0].due_date.isoformat()}
        ))
        actions.append("Review overdue milestone and issue formal contractor notice.")

    # RULE B: Deadline Approaching
    # If required milestone is due within 14 days and not verified
    approaching = [
        m for m in milestones
        if today <= m.due_date <= today + timedelta(days=14) and m.verification_status != "Verified"
    ]
    if approaching:
        pts = 15
        total_score += pts
        factors.append(RiskFactor(
            rule_id="RULE_B",
            rule_name="Contractual Deadline Approaching",
            severity="Moderate",
            score_impact=pts,
            explanation=f"Milestone '{approaching[0].name}' is due within {(approaching[0].due_date - today).days} days ({approaching[0].due_date.isoformat()}) and is not yet verified.",
            suggested_action="Alert field inspection team to pre-schedule milestone verification.",
            trigger_data={"days_remaining": (approaching[0].due_date - today).days}
        ))
        actions.append("Pre-schedule field verification before milestone deadline.")

    # RULE C: Failed Verification
    # Mandatory inspection failed
    failed_inspections = [i for i in inspections if i.outcome == "Failed"]
    if failed_inspections:
        pts = 30
        total_score += pts
        factors.append(RiskFactor(
            rule_id="RULE_C",
            rule_name="Failed Field Verification",
            severity="Critical",
            score_impact=pts,
            explanation=f"Inspection {failed_inspections[0].inspection_id} failed quality/safety verification. Remediation required before further progress credit.",
            suggested_action="Schedule mandatory re-inspection following contractor defect remediation.",
            trigger_data={"inspection_id": failed_inspections[0].inspection_id}
        ))
        actions.append("Require contractor remediation and re-inspect failed components.")

    # RULE D: Blocking Defect
    # Unresolved critical or high defects
    active_critical = [
        d for d in defects
        if d.severity == "Critical" and d.status not in ["Resolved — Verification Passed", "Closed by Authorised User"]
    ]
    active_high = [
        d for d in defects
        if d.severity == "High" and d.status not in ["Resolved — Verification Passed", "Closed by Authorised User"]
    ]
    if active_critical or active_high:
        crit_pts = len(active_critical) * 25
        high_pts = len(active_high) * 15
        pts = min(40, crit_pts + high_pts)
        total_score += pts
        defect_sample = (active_critical + active_high)[0]
        factors.append(RiskFactor(
            rule_id="RULE_D",
            rule_name="Unresolved Blocking Defect",
            severity="Critical" if active_critical else "High",
            score_impact=pts,
            explanation=f"{len(active_critical)} Critical and {len(active_high)} High unresolved defect(s) prevent readiness. Example: {defect_sample.defect_id} ('{defect_sample.title}').",
            suggested_action="Escalate defect remediation to contractor leadership and verify corrective actions.",
            trigger_data={"critical_count": len(active_critical), "high_count": len(active_high)}
        ))
        actions.append("Escalate blocking defects and mandate immediate corrective submission.")

    # RULE E: Missing Required Evidence
    # Work package has claimed progress (>10%) but missing supporting photos/lab certs
    has_evidence = False
    if submissions and any(s.evidence_attachments for s in submissions):
        has_evidence = True
    if inspections and any(i.evidence_photos for i in inspections):
        has_evidence = True

    if wp.reported_progress_percentage > 10.0 and not has_evidence:
        pts = 15
        total_score += pts
        factors.append(RiskFactor(
            rule_id="RULE_E",
            rule_name="Missing Mandatory Evidence",
            severity="Moderate",
            score_impact=pts,
            explanation=f"Contractor claimed {wp.reported_progress_percentage}% progress without uploading mandatory photographic or laboratory test certificates.",
            suggested_action="Issue formal request for supporting evidence documents before inspection.",
            trigger_data={"reported_progress": wp.reported_progress_percentage}
        ))
        actions.append("Request mandatory photo/test documentation from contractor.")

    # RULE F: Dependency Blocked
    # A milestone depends on another milestone that is not yet verified
    dependency_blocked_milestones = []
    for m in milestones:
        if m.dependencies:
            for dep in m.dependencies:
                if dep.verification_status != "Verified":
                    dependency_blocked_milestones.append((m, dep))
                    break

    if dependency_blocked_milestones:
        pts = 20
        total_score += pts
        blocked_m, predecessor = dependency_blocked_milestones[0]
        factors.append(RiskFactor(
            rule_id="RULE_F",
            rule_name="Predecessor Milestone Dependency Blocked",
            severity="High",
            score_impact=pts,
            explanation=f"Milestone '{blocked_m.name}' cannot proceed because prerequisite milestone '{predecessor.name}' is unverified.",
            suggested_action="Prioritize completion and verification of prerequisite milestone.",
            trigger_data={"blocked_milestone": blocked_m.name, "prerequisite": predecessor.name}
        ))
        actions.append(f"Accelerate verification of predecessor milestone '{predecessor.name}'.")

    # RULE G: Stale Progress
    # No submission or inspection in the last 14 days while work is in progress
    if wp.workflow_state in ["In Progress", "Rework Required"] and wp.verified_progress_percentage < 100.0:
        def _to_utc(dt: Optional[datetime]) -> datetime:
            if dt is None:
                return datetime.now(timezone.utc)
            if dt.tzinfo is None:
                return dt.replace(tzinfo=timezone.utc)
            return dt

        activity_candidates = [_to_utc(wp.updated_at)]
        if submissions and submissions[0].created_at:
            activity_candidates.append(_to_utc(submissions[0].created_at))
        if inspections and inspections[0].actual_inspection_date:
            activity_candidates.append(_to_utc(inspections[0].actual_inspection_date))

        latest_activity = max(activity_candidates)
        days_inactive = (datetime.now(timezone.utc) - latest_activity).days
        if days_inactive >= 14:
            pts = 10
            total_score += pts
            factors.append(RiskFactor(
                rule_id="RULE_G",
                rule_name="Stale Progress / Dormant Activity",
                severity="Moderate" if days_inactive >= 21 else "Low",
                score_impact=pts,
                explanation=f"Zero field activity, submissions, or inspections recorded in the past {days_inactive} days.",
                suggested_action="Request immediate status briefing from appointed contractor.",
                trigger_data={"days_inactive": days_inactive}
            ))
            actions.append("Request contractor status briefing and dispatch field inspector.")

    # Clamp total score between 0 and 100
    risk_score = min(100, max(0, total_score))

    # Determine standard Risk Category
    if risk_score >= 70:
        risk_category = "Critical"
    elif risk_score >= 50:
        risk_category = "High"
    elif risk_score >= 25:
        risk_category = "Moderate"
    else:
        risk_category = "Low"

    # Synthesize plain-language explanation
    if not factors:
        risk_explanation = "Low risk: Milestones are progressing on schedule with active field verification and zero blocking defects."
        actions.append("Continue routine milestone oversight.")
    else:
        factor_summaries = [f.explanation for f in factors[:3]]
        risk_explanation = f"{risk_category} risk ({risk_score}/100): " + " ".join(factor_summaries)

    # Persist updated risk metrics onto WorkPackage
    wp.risk_score = risk_score
    wp.risk_category = risk_category
    wp.risk_explanation = risk_explanation
    db.commit()

    return WorkPackageRiskEvaluation(
        work_package_id=wp.id,
        work_id=wp.work_id,
        work_package_title=wp.title,
        project_id=wp.project_id,
        project_name=wp.project.name if wp.project else "Unknown",
        category=wp.category,
        vendor_name=wp.vendor.company_name if wp.vendor else None,
        reported_progress_percentage=wp.reported_progress_percentage,
        verified_progress_percentage=wp.verified_progress_percentage,
        workflow_state=wp.workflow_state,
        risk_score=risk_score,
        risk_category=risk_category,
        risk_explanation=risk_explanation,
        factors=factors,
        suggested_actions=list(dict.fromkeys(actions)),
        evaluated_at=datetime.now(timezone.utc)
    )


def get_readiness_dashboard_summary(
    db: Session,
    project_id: Optional[str] = None,
    zone_id: Optional[str] = None,
    category: Optional[str] = None,
    risk_category: Optional[str] = None
) -> ReadinessDashboardSummary:
    """
    Computes system-wide readiness statistics and retrieves prioritized high-risk work packages.
    """
    query = db.query(WorkPackage)
    if project_id:
        query = query.filter(WorkPackage.project_id == project_id)
    if category:
        query = query.filter(WorkPackage.category == category)
    if zone_id:
        query = query.join(Project).filter(Project.zone_id == zone_id)

    work_packages = query.all()
    today = date.today()

    evaluations: List[WorkPackageRiskEvaluation] = []
    risk_distribution: Dict[str, int] = {
        "Critical": 0,
        "High": 0,
        "Moderate": 0,
        "Low": 0,
        "Insufficient Data": 0
    }
    total_score = 0
    accepted_count = 0
    in_progress_count = 0
    blocked_count = 0
    pending_acceptance_count = 0

    for wp in work_packages:
        ev = evaluate_work_package_risk(db, wp)
        evaluations.append(ev)
        risk_distribution[ev.risk_category] = risk_distribution.get(ev.risk_category, 0) + 1
        total_score += ev.risk_score

        if wp.workflow_state in ["Accepted", "Completed"]:
            accepted_count += 1
        elif wp.workflow_state == "In Progress":
            in_progress_count += 1

        if ev.risk_category in ["Critical", "High"] or any(f.rule_id in ["RULE_C", "RULE_D"] for f in ev.factors):
            blocked_count += 1

        if wp.verified_progress_percentage >= 90.0 and wp.workflow_state not in ["Accepted", "Completed"]:
            pending_acceptance_count += 1

    # Overdue milestones system-wide
    overdue_milestones = db.query(Milestone).filter(
        Milestone.due_date < today,
        Milestone.verification_status != "Verified"
    ).count()

    # Open blocking defects system-wide
    open_blocking_defects = db.query(Defect).filter(
        Defect.severity.in_(["Critical", "High"]),
        Defect.status.notin_(["Resolved — Verification Passed", "Closed by Authorised User"])
    ).count()

    # Filter evaluations by risk_category if requested
    filtered_evaluations = evaluations
    if risk_category:
        filtered_evaluations = [e for e in evaluations if e.risk_category.lower() == risk_category.lower()]

    # Sort by risk_score desc
    sorted_evaluations = sorted(filtered_evaluations, key=lambda x: x.risk_score, reverse=True)

    avg_score = round(total_score / len(work_packages), 1) if work_packages else 0.0

    return ReadinessDashboardSummary(
        total_work_packages=len(work_packages),
        accepted_work_packages=accepted_count,
        in_progress_work_packages=in_progress_count,
        blocked_work_packages=blocked_count,
        average_risk_score=avg_score,
        risk_distribution=risk_distribution,
        overdue_milestones_count=overdue_milestones,
        open_blocking_defects_count=open_blocking_defects,
        pending_acceptance_count=pending_acceptance_count,
        highest_risk_work_packages=sorted_evaluations
    )
