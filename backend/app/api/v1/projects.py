import io
import csv
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.db.session import get_db
from app.models.user import User
from app.models.domain import Project, WorkPackage, Milestone, Zone, Vendor, milestone_dependencies
from app.schemas.project import (
    ProjectSummary, ProjectDetail, ProjectCreate, ProjectUpdate,
    WorkPackageResponse, WorkPackageCreate, WorkPackageStatusUpdate,
    MilestoneResponse, MilestoneCreate, MilestoneDependencyAdd
)
from app.services.audit_service import record_audit_event
from app.services.project_service import (
    detect_milestone_cycle, validate_workflow_transition, sanitize_csv_cell
)
from app.api.deps import get_current_user, require_permission

router = APIRouter(prefix="/projects", tags=["Project & Work Register"])


def is_privileged_for_financials(user: User) -> bool:
    """Checks if current user role is authorized to view confidential funding references."""
    role_ids = {r.id for r in user.roles}
    return any(r in role_ids for r in ["super_admin", "municipal_admin", "project_manager", "read_only_reviewer"])


def serialize_project_summary(p: Project, privileged: bool) -> ProjectSummary:
    """Serializes project summary with confidential budget masking."""
    wps = p.work_packages or []
    wp_count = len(wps)
    rep_avg = round(sum(w.reported_progress_percentage for w in wps) / wp_count, 1) if wp_count else 0.0
    ver_avg = round(sum(w.verified_progress_percentage for w in wps) / wp_count, 1) if wp_count else 0.0

    return ProjectSummary(
        id=p.id,
        project_identifier=p.project_identifier,
        name=p.name,
        description=p.description,
        category=p.category,
        zone_id=p.zone_id,
        zone_name=p.zone.name if p.zone else None,
        current_status=p.current_status,
        priority=p.priority,
        start_date=p.start_date,
        planned_completion_date=p.planned_completion_date,
        funding_reference=p.funding_reference if privileged else "RESTRICTED",
        created_at=p.created_at,
        work_packages_count=wp_count,
        reported_progress_avg=rep_avg,
        verified_progress_avg=ver_avg,
    )


def serialize_work_package(w: WorkPackage) -> WorkPackageResponse:
    """Serializes work package with counts and milestones."""
    return WorkPackageResponse(
        id=w.id,
        work_id=w.work_id,
        project_id=w.project_id,
        title=w.title,
        description=w.description,
        category=w.category,
        vendor_id=w.vendor_id,
        vendor_name=w.vendor.company_name if w.vendor else None,
        responsible_manager_id=w.responsible_manager_id,
        priority=w.priority,
        planned_start_date=w.planned_start_date,
        planned_completion_date=w.planned_completion_date,
        actual_completion_date=w.actual_completion_date,
        reported_progress_percentage=w.reported_progress_percentage,
        verified_progress_percentage=w.verified_progress_percentage,
        workflow_state=w.workflow_state,
        risk_score=w.risk_score,
        risk_category=w.risk_category,
        risk_explanation=w.risk_explanation,
        created_at=w.created_at,
        updated_at=w.updated_at,
        milestones=[
            MilestoneResponse(
                id=m.id,
                work_package_id=m.work_package_id,
                name=m.name,
                description=m.description,
                due_date=m.due_date,
                is_mandatory=m.is_mandatory,
                acceptance_criteria=m.acceptance_criteria,
                required_evidence_type=m.required_evidence_type,
                responsible_party=m.responsible_party,
                reported_status=m.reported_status,
                verification_status=m.verification_status,
                completed_at=m.completed_at,
                verification_timestamp=m.verification_timestamp,
                created_at=m.created_at,
                dependencies=[
                    {"id": dep.id, "name": dep.name, "due_date": dep.due_date, "is_mandatory": dep.is_mandatory, "reported_status": dep.reported_status, "verification_status": dep.verification_status}
                    for dep in m.dependencies
                ]
            )
            for m in (w.milestones or [])
        ],
        defects_count=len(w.defects or []),
        inspections_count=len(w.inspections or []),
        assets_count=len(w.assets or []),
    )


@router.get("", response_model=List[ProjectSummary])
def list_projects(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    zone_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lists projects with search, multi-column filtering, and pagination.
    Masks confidential financial data for non-privileged accounts.
    """
    query = db.query(Project)

    if search:
        search_filter = f"%{search.lower()}%"
        query = query.filter(
            or_(
                Project.name.ilike(search_filter),
                Project.project_identifier.ilike(search_filter),
                Project.description.ilike(search_filter)
            )
        )
    if category:
        query = query.filter(Project.category == category)
    if status:
        query = query.filter(Project.current_status == status)
    if zone_id:
        query = query.filter(Project.zone_id == zone_id)

    projects = query.order_by(Project.created_at.desc()).offset(skip).limit(limit).all()
    privileged = is_privileged_for_financials(current_user)

    return [serialize_project_summary(p, privileged) for p in projects]


@router.get("/export/csv")
def export_projects_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("reports:export"))
):
    """
    Exports project and work package register as CSV.
    Strictly applies formula injection mitigation by escaping active characters.
    """
    projects = db.query(Project).all()
    privileged = is_privileged_for_financials(current_user)

    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "Project ID", "Project Name", "Category", "Ghat / Zone", "Current Status",
        "Priority", "Start Date", "Planned Completion", "Funding Reference",
        "Work Package ID", "Work Title", "Vendor", "Workflow State",
        "Reported Progress %", "Verified Progress %", "Risk Score"
    ])

    for p in projects:
        zone_name = p.zone.name if p.zone else ""
        funding = p.funding_reference if privileged else "RESTRICTED"
        if not p.work_packages:
            writer.writerow([
                sanitize_csv_cell(p.project_identifier),
                sanitize_csv_cell(p.name),
                sanitize_csv_cell(p.category),
                sanitize_csv_cell(zone_name),
                sanitize_csv_cell(p.current_status),
                sanitize_csv_cell(p.priority),
                sanitize_csv_cell(p.start_date),
                sanitize_csv_cell(p.planned_completion_date),
                sanitize_csv_cell(funding),
                "", "", "", "", "", "", ""
            ])
        else:
            for w in p.work_packages:
                vendor_name = w.vendor.company_name if w.vendor else "Unassigned"
                writer.writerow([
                    sanitize_csv_cell(p.project_identifier),
                    sanitize_csv_cell(p.name),
                    sanitize_csv_cell(p.category),
                    sanitize_csv_cell(zone_name),
                    sanitize_csv_cell(p.current_status),
                    sanitize_csv_cell(p.priority),
                    sanitize_csv_cell(p.start_date),
                    sanitize_csv_cell(p.planned_completion_date),
                    sanitize_csv_cell(funding),
                    sanitize_csv_cell(w.work_id),
                    sanitize_csv_cell(w.title),
                    sanitize_csv_cell(vendor_name),
                    sanitize_csv_cell(w.workflow_state),
                    sanitize_csv_cell(w.reported_progress_percentage),
                    sanitize_csv_cell(w.verified_progress_percentage),
                    sanitize_csv_cell(w.risk_score)
                ])

    output.seek(0)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=civicproof_projects_{datetime.now().strftime('%Y%m%d')}.csv"}
    )


@router.post("", response_model=ProjectDetail, status_code=status.HTTP_201_CREATED)
def create_project(
    project_in: ProjectCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("projects:create"))
):
    """Creates a new municipal infrastructure project."""
    # Check duplicate identifier
    if db.query(Project).filter(Project.project_identifier == project_in.project_identifier.upper()).first():
        raise HTTPException(status_code=400, detail="Project identifier already exists")

    new_project = Project(
        project_identifier=project_in.project_identifier.upper(),
        name=project_in.name,
        description=project_in.description,
        category=project_in.category,
        zone_id=project_in.zone_id,
        department_id=project_in.department_id,
        project_manager_id=project_in.project_manager_id or current_user.id,
        created_by_id=current_user.id,
        start_date=project_in.start_date,
        planned_completion_date=project_in.planned_completion_date,
        priority=project_in.priority,
        funding_reference=project_in.funding_reference,
        latitude=project_in.latitude,
        longitude=project_in.longitude,
        current_status="In Progress"
    )

    db.add(new_project)
    db.commit()
    db.refresh(new_project)

    ip_addr = request.client.host if request.client else "unknown"
    record_audit_event(
        db=db,
        action="PROJECT_CREATED",
        entity_type="project",
        entity_id=new_project.id,
        actor_id=current_user.id,
        actor_email=current_user.email,
        reason=f"Project {new_project.project_identifier} initiated by {current_user.full_name}",
        details={"name": new_project.name, "category": new_project.category},
        ip_address=ip_addr
    )

    privileged = is_privileged_for_financials(current_user)
    summary = serialize_project_summary(new_project, privileged)
    return ProjectDetail(
        **summary.model_dump(),
        department_id=new_project.department_id,
        department_name=new_project.department.name if getattr(new_project, "department", None) else None,
        project_manager_id=new_project.project_manager_id,
        created_by_id=new_project.created_by_id,
        latitude=new_project.latitude,
        longitude=new_project.longitude,
        work_packages=[]
    )


@router.get("/{project_id}", response_model=ProjectDetail)
def get_project_detail(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves complete project detail, including all work packages and relationships."""
    project = db.query(Project).filter(
        or_(Project.id == project_id, Project.project_identifier == project_id)
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    privileged = is_privileged_for_financials(current_user)
    summary = serialize_project_summary(project, privileged)

    return ProjectDetail(
        **summary.model_dump(),
        department_id=project.department_id,
        department_name=project.department.name if getattr(project, "department", None) else None,
        project_manager_id=project.project_manager_id,
        created_by_id=project.created_by_id,
        latitude=project.latitude,
        longitude=project.longitude,
        work_packages=[serialize_work_package(w) for w in (project.work_packages or [])]
    )


@router.patch("/{project_id}", response_model=ProjectDetail)
def update_project(
    project_id: str,
    project_in: ProjectUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("projects:edit"))
):
    """Updates project information and assignments."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    changes = {}
    for field, val in project_in.model_dump(exclude_unset=True).items():
        old_val = getattr(project, field)
        if old_val != val:
            changes[field] = {"old": str(old_val), "new": str(val)}
            setattr(project, field, val)

    db.commit()
    db.refresh(project)

    ip_addr = request.client.host if request.client else "unknown"
    record_audit_event(
        db=db,
        action="PROJECT_UPDATED",
        entity_type="project",
        entity_id=project.id,
        actor_id=current_user.id,
        actor_email=current_user.email,
        reason="Project metadata updated by project administrator",
        details=changes,
        ip_address=ip_addr
    )

    privileged = is_privileged_for_financials(current_user)
    summary = serialize_project_summary(project, privileged)
    return ProjectDetail(
        **summary.model_dump(),
        department_id=project.department_id,
        project_manager_id=project.project_manager_id,
        created_by_id=project.created_by_id,
        latitude=project.latitude,
        longitude=project.longitude,
        work_packages=[serialize_work_package(w) for w in (project.work_packages or [])]
    )


# --- Work Package Operations ---

@router.post("/{project_id}/work-packages", response_model=WorkPackageResponse, status_code=status.HTTP_201_CREATED)
def create_work_package(
    project_id: str,
    wp_in: WorkPackageCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("projects:edit"))
):
    """Creates a new work package under an existing project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Parent project not found")

    if db.query(WorkPackage).filter(WorkPackage.work_id == wp_in.work_id.upper()).first():
        raise HTTPException(status_code=400, detail="Work package ID already exists")

    new_wp = WorkPackage(
        work_id=wp_in.work_id.upper(),
        project_id=project.id,
        title=wp_in.title,
        description=wp_in.description,
        category=wp_in.category,
        vendor_id=wp_in.vendor_id,
        responsible_manager_id=current_user.id,
        priority=wp_in.priority,
        planned_start_date=wp_in.planned_start_date,
        planned_completion_date=wp_in.planned_completion_date,
        workflow_state="Assigned" if wp_in.vendor_id else "Planned",
        reported_progress_percentage=0.0,
        verified_progress_percentage=0.0,
        risk_score=10,
        risk_category="Low"
    )

    db.add(new_wp)
    db.commit()
    db.refresh(new_wp)

    ip_addr = request.client.host if request.client else "unknown"
    record_audit_event(
        db=db,
        action="WORK_PACKAGE_CREATED",
        entity_type="work_package",
        entity_id=new_wp.id,
        actor_id=current_user.id,
        actor_email=current_user.email,
        reason=f"Work package {new_wp.work_id} added under project {project.project_identifier}",
        details={"title": new_wp.title, "vendor_id": new_wp.vendor_id},
        ip_address=ip_addr
    )

    return serialize_work_package(new_wp)


@router.patch("/work-packages/{wp_id}/status", response_model=WorkPackageResponse)
def transition_work_package_status(
    wp_id: str,
    status_update: WorkPackageStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Enforces controlled workflow transitions on a work package.
    Arbitrary dropdown jumping is blocked; separation of duties and acceptance conditions are validated.
    """
    wp = db.query(WorkPackage).filter(WorkPackage.id == wp_id).first()
    if not wp:
        raise HTTPException(status_code=404, detail="Work package not found")

    user_roles = [r.id for r in current_user.roles]
    valid, error_msg = validate_workflow_transition(db, wp, status_update.target_state, user_roles)
    if not valid:
        raise HTTPException(status_code=400, detail=error_msg)

    old_state = wp.workflow_state
    wp.workflow_state = status_update.target_state
    if status_update.target_state == "Accepted":
        wp.actual_completion_date = date.today()

    db.commit()
    db.refresh(wp)

    ip_addr = request.client.host if request.client else "unknown"
    record_audit_event(
        db=db,
        action="WORK_PACKAGE_STATE_TRANSITION",
        entity_type="work_package",
        entity_id=wp.id,
        actor_id=current_user.id,
        actor_email=current_user.email,
        reason=status_update.reason or f"Transitioned from {old_state} to {status_update.target_state}",
        details={"old_state": old_state, "new_state": status_update.target_state},
        ip_address=ip_addr
    )

    return serialize_work_package(wp)


# --- Milestone Operations & Cycle-Protected Dependencies ---

@router.post("/work-packages/{wp_id}/milestones", response_model=MilestoneResponse, status_code=status.HTTP_201_CREATED)
def create_milestone(
    wp_id: str,
    milestone_in: MilestoneCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("milestones:create"))
):
    """Creates a milestone for a work package with optional validated dependencies."""
    wp = db.query(WorkPackage).filter(WorkPackage.id == wp_id).first()
    if not wp:
        raise HTTPException(status_code=404, detail="Work package not found")

    new_ms = Milestone(
        work_package_id=wp.id,
        name=milestone_in.name,
        description=milestone_in.description,
        due_date=milestone_in.due_date,
        is_mandatory=milestone_in.is_mandatory,
        acceptance_criteria=milestone_in.acceptance_criteria,
        required_evidence_type=milestone_in.required_evidence_type,
        responsible_party=milestone_in.responsible_party,
        reported_status="Pending",
        verification_status="Unverified"
    )

    db.add(new_ms)
    db.commit()
    db.refresh(new_ms)

    # Attach dependencies if provided
    if milestone_in.dependency_ids:
        for dep_id in milestone_in.dependency_ids:
            if not detect_milestone_cycle(db, new_ms.id, dep_id):
                dep_ms = db.query(Milestone).filter(Milestone.id == dep_id).first()
                if dep_ms:
                    new_ms.dependencies.append(dep_ms)
        db.commit()
        db.refresh(new_ms)

    ip_addr = request.client.host if request.client else "unknown"
    record_audit_event(
        db=db,
        action="MILESTONE_CREATED",
        entity_type="milestone",
        entity_id=new_ms.id,
        actor_id=current_user.id,
        actor_email=current_user.email,
        reason=f"Milestone '{new_ms.name}' created for work package {wp.work_id}",
        ip_address=ip_addr
    )

    return MilestoneResponse(
        id=new_ms.id,
        work_package_id=new_ms.work_package_id,
        name=new_ms.name,
        description=new_ms.description,
        due_date=new_ms.due_date,
        is_mandatory=new_ms.is_mandatory,
        acceptance_criteria=new_ms.acceptance_criteria,
        required_evidence_type=new_ms.required_evidence_type,
        responsible_party=new_ms.responsible_party,
        reported_status=new_ms.reported_status,
        verification_status=new_ms.verification_status,
        completed_at=new_ms.completed_at,
        verification_timestamp=new_ms.verification_timestamp,
        created_at=new_ms.created_at,
        dependencies=[
            {"id": d.id, "name": d.name, "due_date": d.due_date, "is_mandatory": d.is_mandatory, "reported_status": d.reported_status, "verification_status": d.verification_status}
            for d in new_ms.dependencies
        ]
    )


@router.post("/milestones/{milestone_id}/dependencies", response_model=MilestoneResponse)
def add_milestone_dependency(
    milestone_id: str,
    dep_in: MilestoneDependencyAdd,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("milestones:edit"))
):
    """
    Adds a dependency relationship between milestones.
    CRITICAL: Validates dependencies using cycle detection to prevent circular deadlocks.
    """
    ms = db.query(Milestone).filter(Milestone.id == milestone_id).first()
    if not ms:
        raise HTTPException(status_code=404, detail="Target milestone not found")

    dep_ms = db.query(Milestone).filter(Milestone.id == dep_in.dependency_milestone_id).first()
    if not dep_ms:
        raise HTTPException(status_code=404, detail="Dependency milestone not found")

    # Check for cycle
    has_cycle = detect_milestone_cycle(db, ms.id, dep_ms.id)
    if has_cycle:
        raise HTTPException(
            status_code=400,
            detail=f"Circular dependency error: Milestone '{dep_ms.name}' already depends directly or indirectly on '{ms.name}'."
        )

    # Avoid duplicate
    if dep_ms not in ms.dependencies:
        ms.dependencies.append(dep_ms)
        db.commit()
        db.refresh(ms)

    ip_addr = request.client.host if request.client else "unknown"
    record_audit_event(
        db=db,
        action="MILESTONE_DEPENDENCY_ADDED",
        entity_type="milestone",
        entity_id=ms.id,
        actor_id=current_user.id,
        actor_email=current_user.email,
        reason=f"Added dependency: '{ms.name}' now depends on '{dep_ms.name}'",
        ip_address=ip_addr
    )

    return MilestoneResponse(
        id=ms.id,
        work_package_id=ms.work_package_id,
        name=ms.name,
        description=ms.description,
        due_date=ms.due_date,
        is_mandatory=ms.is_mandatory,
        acceptance_criteria=ms.acceptance_criteria,
        required_evidence_type=ms.required_evidence_type,
        responsible_party=ms.responsible_party,
        reported_status=ms.reported_status,
        verification_status=ms.verification_status,
        completed_at=ms.completed_at,
        verification_timestamp=ms.verification_timestamp,
        created_at=ms.created_at,
        dependencies=[
            {"id": d.id, "name": d.name, "due_date": d.due_date, "is_mandatory": d.is_mandatory, "reported_status": d.reported_status, "verification_status": d.verification_status}
            for d in ms.dependencies
        ]
    )
