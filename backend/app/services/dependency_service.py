from datetime import date, datetime, timedelta, timezone
from typing import List, Optional, Dict, Any, Set, Tuple
from collections import deque
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, delete, insert

from app.models.domain import Milestone, WorkPackage, Project, milestone_dependencies
from app.schemas.dependency import (
    DependencyGraphNode,
    DependencyGraphEdge,
    DependencyGraphResponse,
    DelayImpactSimulationResponse,
    ImpactedMilestone
)

FESTIVAL_DATE = date(2027, 7, 14)


def get_dependency_graph(db: Session, project_id: Optional[str] = None) -> DependencyGraphResponse:
    """
    Assembles the complete milestone DAG, performs Critical Path Method (CPM) analysis,
    identifies blocked nodes, and evaluates buffer days to Pushkaralu 2027.
    """
    today = date.today()
    query = db.query(Milestone)
    if project_id:
        query = query.join(WorkPackage).filter(WorkPackage.project_id == project_id)

    milestones = query.all()
    if not milestones:
        return DependencyGraphResponse(
            nodes=[],
            edges=[],
            critical_path_milestone_ids=[],
            total_milestones=0,
            completed_milestones=0,
            blocked_milestones=0,
            overdue_milestones=0,
            festival_target_date="2027-07-14",
            days_to_pushkaralu=(FESTIVAL_DATE - today).days,
            critical_path_duration_days=0,
            festival_buffer_days=(FESTIVAL_DATE - today).days
        )

    # Fetch explicit dependency edges from milestone_dependencies table
    dep_rows = db.execute(select(milestone_dependencies)).fetchall()
    # (milestone_id, depends_on_id): milestone_id depends on depends_on_id
    # Graph direction: depends_on_id -> milestone_id (predecessor -> successor)

    ms_map: Dict[str, Milestone] = {m.id: m for m in milestones}
    preds_map: Dict[str, List[str]] = {m.id: [] for m in milestones}
    succs_map: Dict[str, List[str]] = {m.id: [] for m in milestones}

    valid_edges: List[Tuple[str, str]] = []
    for row in dep_rows:
        target_id, source_id = row[0], row[1]
        if source_id in ms_map and target_id in ms_map:
            preds_map[target_id].append(source_id)
            succs_map[source_id].append(target_id)
            valid_edges.append((source_id, target_id))

    # --- Critical Path Method (CPM) Analysis ---
    # Duration estimation: 14 days default per milestone or difference between due dates
    durations: Dict[str, int] = {}
    for m in milestones:
        durations[m.id] = 14

    # Topological sort for forward pass
    in_degree: Dict[str, int] = {m.id: len(preds_map[m.id]) for m in milestones}
    queue = deque([m.id for m in milestones if in_degree[m.id] == 0])
    topo_order: List[str] = []

    earliest_start: Dict[str, int] = {m.id: 0 for m in milestones}
    earliest_finish: Dict[str, int] = {m.id: 0 for m in milestones}

    while queue:
        u = queue.popleft()
        topo_order.append(u)
        earliest_finish[u] = earliest_start[u] + durations[u]

        for v in succs_map[u]:
            earliest_start[v] = max(earliest_start[v], earliest_finish[u])
            in_degree[v] -= 1
            if in_degree[v] == 0:
                queue.append(v)

    # Max project duration from forward pass
    max_duration = max(earliest_finish.values()) if earliest_finish else 0

    # Backward pass
    latest_finish: Dict[str, int] = {m.id: max_duration for m in milestones}
    latest_start: Dict[str, int] = {m.id: max_duration - durations[m.id] for m in milestones}

    for u in reversed(topo_order):
        if succs_map[u]:
            latest_finish[u] = min(latest_start[v] for v in succs_map[u])
            latest_start[u] = latest_finish[u] - durations[u]

    # Calculate slack and critical path
    slack: Dict[str, int] = {}
    critical_path_ids: Set[str] = set()
    for m in milestones:
        s = latest_start[m.id] - earliest_start[m.id]
        slack[m.id] = s
        if s <= 0:
            critical_path_ids.add(m.id)

    # --- Node Status Determination ---
    nodes: List[DependencyGraphNode] = []
    completed_count = 0
    blocked_count = 0
    overdue_count = 0

    for m in milestones:
        wp = m.work_package
        proj = wp.project if wp else None

        # Check if any predecessor is not verified
        has_unverified_pred = any(
            ms_map[pred_id].verification_status != "Verified"
            for pred_id in preds_map[m.id]
            if pred_id in ms_map
        )

        if m.verification_status == "Verified":
            node_status = "Completed"
            completed_count += 1
        elif has_unverified_pred:
            node_status = "Blocked"
            blocked_count += 1
        elif m.due_date < today and m.verification_status != "Verified":
            node_status = "Overdue"
            overdue_count += 1
        elif m.reported_status == "Reported Complete" or m.reported_status == "In Progress":
            node_status = "In Progress"
        else:
            node_status = "Pending"

        nodes.append(DependencyGraphNode(
            id=m.id,
            name=m.name,
            work_package_id=wp.id if wp else "N/A",
            work_package_title=wp.title if wp else "N/A",
            work_id=wp.work_id if wp else "N/A",
            project_id=proj.id if proj else "N/A",
            project_name=proj.name if proj else "N/A",
            due_date=m.due_date,
            is_mandatory=m.is_mandatory,
            reported_status=m.reported_status,
            verification_status=m.verification_status,
            status=node_status,
            is_on_critical_path=m.id in critical_path_ids,
            slack_days=max(0, slack.get(m.id, 0)),
            duration_days=durations.get(m.id, 14),
            risk_score=wp.risk_score if wp else 0,
            predecessor_ids=preds_map[m.id],
            successor_ids=succs_map[m.id]
        ))

    # --- Edge List with Critical Path and Blocked State ---
    edges: List[DependencyGraphEdge] = []
    for source_id, target_id in valid_edges:
        source_m = ms_map[source_id]
        target_m = ms_map[target_id]
        is_blocked = source_m.verification_status != "Verified"
        is_critical = source_id in critical_path_ids and target_id in critical_path_ids

        edges.append(DependencyGraphEdge(
            source=source_id,
            target=target_id,
            source_name=source_m.name,
            target_name=target_m.name,
            is_blocked=is_blocked,
            is_critical=is_critical
        ))

    days_to_pushkaralu = max(0, (FESTIVAL_DATE - today).days)
    festival_buffer = max(0, days_to_pushkaralu - max_duration)

    return DependencyGraphResponse(
        nodes=nodes,
        edges=edges,
        critical_path_milestone_ids=list(critical_path_ids),
        total_milestones=len(milestones),
        completed_milestones=completed_count,
        blocked_milestones=blocked_count,
        overdue_milestones=overdue_count,
        festival_target_date="2027-07-14",
        days_to_pushkaralu=days_to_pushkaralu,
        critical_path_duration_days=max_duration,
        festival_buffer_days=festival_buffer
    )


def simulate_delay_impact(
    db: Session,
    milestone_id: str,
    delay_days: int
) -> DelayImpactSimulationResponse:
    """
    Simulates the cascading ripple effect of delaying a milestone across
    all transitive downstream dependencies and evaluates Pushkaralu deadline impact.
    """
    target = db.query(Milestone).filter(Milestone.id == milestone_id).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Milestone '{milestone_id}' not found")

    # Fetch all dependencies
    all_milestones = db.query(Milestone).all()
    ms_map = {m.id: m for m in all_milestones}

    dep_rows = db.execute(select(milestone_dependencies)).fetchall()
    # (milestone_id, depends_on_id): depends_on_id is predecessor of milestone_id
    succs: Dict[str, List[str]] = {m.id: [] for m in all_milestones}
    for row in dep_rows:
        target_dep, source_pred = row[0], row[1]
        if source_pred in succs:
            succs[source_pred].append(target_dep)

    # Transitive traversal to find all impacted downstream nodes
    visited: Set[str] = set()
    queue = deque([milestone_id])
    while queue:
        curr = queue.popleft()
        for nxt in succs.get(curr, []):
            if nxt not in visited:
                visited.add(nxt)
                queue.append(nxt)

    impacted: List[ImpactedMilestone] = []
    impacted_wp_ids: Set[str] = set()

    # Target milestone itself
    target_projected = target.due_date + timedelta(days=delay_days)
    impacted.append(ImpactedMilestone(
        id=target.id,
        name=target.name,
        work_package_title=target.work_package.title if target.work_package else "N/A",
        original_due_date=target.due_date,
        projected_due_date=target_projected,
        delay_days=delay_days,
        is_critical_path=True
    ))
    if target.work_package_id:
        impacted_wp_ids.add(target.work_package_id)

    # Downstream milestones
    for succ_id in visited:
        m = ms_map.get(succ_id)
        if m:
            m_projected = m.due_date + timedelta(days=delay_days)
            impacted.append(ImpactedMilestone(
                id=m.id,
                name=m.name,
                work_package_title=m.work_package.title if m.work_package else "N/A",
                original_due_date=m.due_date,
                projected_due_date=m_projected,
                delay_days=delay_days,
                is_critical_path=True
            ))
            if m.work_package_id:
                impacted_wp_ids.add(m.work_package_id)

    max_projected = max(imp.projected_due_date for imp in impacted)
    original_latest = max(imp.original_due_date for imp in impacted)

    deadline_breached = max_projected >= FESTIVAL_DATE
    remaining_buffer = (FESTIVAL_DATE - max_projected).days

    recs = []
    if delay_days >= 14:
        recs.append("Mandate double-shift working hours for contractor crews.")
        recs.append("Pre-schedule parallel quality inspection for ready sub-components.")
    if deadline_breached:
        recs.append("CRITICAL: Projected completion exceeds Godavari Pushkaralu festival opening. Escalate to District Collector.")
    else:
        recs.append(f"Festival buffer remains positive ({remaining_buffer} days). Maintain tight bi-weekly progress review.")

    return DelayImpactSimulationResponse(
        target_milestone_id=target.id,
        target_milestone_name=target.name,
        simulated_delay_days=delay_days,
        impacted_milestones=impacted,
        impacted_work_package_count=len(impacted_wp_ids),
        original_completion_date=original_latest,
        new_projected_completion_date=max_projected,
        pushkaralu_deadline_breached=deadline_breached,
        remaining_festival_buffer_days=remaining_buffer,
        recommendations=recs
    )


def add_dependency(db: Session, milestone_id: str, depends_on_id: str):
    """
    Adds a dependency (milestone_id depends on depends_on_id) with strict cycle detection.
    """
    if milestone_id == depends_on_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A milestone cannot depend on itself."
        )

    m1 = db.query(Milestone).filter(Milestone.id == milestone_id).first()
    m2 = db.query(Milestone).filter(Milestone.id == depends_on_id).first()
    if not m1 or not m2:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Milestone not found")

    # Cycle Detection: Is milestone_id already an ancestor of depends_on_id?
    # If depends_on_id can reach milestone_id, then adding milestone_id -> depends_on_id would form a cycle!
    dep_rows = db.execute(select(milestone_dependencies)).fetchall()
    adj: Dict[str, List[str]] = {}
    for row in dep_rows:
        target_id, source_id = row[0], row[1]
        adj.setdefault(source_id, []).append(target_id)

    # Check reachability from milestone_id to depends_on_id
    visited: Set[str] = set()
    queue = deque([milestone_id])
    while queue:
        curr = queue.popleft()
        if curr == depends_on_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Circular dependency detected! Adding this dependency would create a cycle between '{m1.name}' and '{m2.name}'."
            )
        for nxt in adj.get(curr, []):
            if nxt not in visited:
                visited.add(nxt)
                queue.append(nxt)

    # Check if edge already exists
    existing = db.execute(
        select(milestone_dependencies).where(
            milestone_dependencies.c.milestone_id == milestone_id,
            milestone_dependencies.c.depends_on_id == depends_on_id
        )
    ).first()

    if existing:
        return {"status": "already_exists", "message": "Dependency already exists"}

    db.execute(
        insert(milestone_dependencies).values(
            milestone_id=milestone_id,
            depends_on_id=depends_on_id
        )
    )
    db.commit()
    return {"status": "created", "message": f"Dependency created: '{m1.name}' depends on '{m2.name}'"}


def remove_dependency(db: Session, milestone_id: str, depends_on_id: str):
    """
    Removes a milestone dependency edge.
    """
    db.execute(
        delete(milestone_dependencies).where(
            milestone_dependencies.c.milestone_id == milestone_id,
            milestone_dependencies.c.depends_on_id == depends_on_id
        )
    )
    db.commit()
    return {"status": "removed", "message": "Dependency removed successfully"}
