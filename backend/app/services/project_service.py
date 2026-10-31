from typing import List, Set, Dict, Optional, Tuple, Any
from sqlalchemy.orm import Session
from app.models.domain import Milestone, WorkPackage, Defect, Inspection


def detect_milestone_cycle(db: Session, milestone_id: str, new_dependency_id: str) -> bool:
    """
    Checks if adding `new_dependency_id` as a dependency of `milestone_id` creates a cycle.
    In a directed graph, if `new_dependency_id` can reach `milestone_id`, then adding the edge
    `milestone_id -> new_dependency_id` will form a directed cycle.
    Returns True if a cycle would be created, False otherwise.
    """
    if milestone_id == new_dependency_id:
        return True

    # Depth-First Search from new_dependency_id to check if it reaches milestone_id
    visited: Set[str] = set()
    stack: List[str] = [new_dependency_id]

    while stack:
        current_id = stack.pop()
        if current_id == milestone_id:
            return True

        if current_id not in visited:
            visited.add(current_id)
            current_ms = db.query(Milestone).filter(Milestone.id == current_id).first()
            if current_ms:
                for dep in current_ms.dependencies:
                    if dep.id not in visited:
                        stack.append(dep.id)

    return False


# Configured valid state transitions
ALLOWED_WORKFLOW_TRANSITIONS: Dict[str, List[str]] = {
    "Draft": ["Planned", "Cancelled"],
    "Planned": ["Assigned", "Draft", "Cancelled"],
    "Assigned": ["In Progress", "On Hold", "Cancelled"],
    "In Progress": ["Progress Reported", "Inspection Pending", "On Hold", "Cancelled"],
    "Progress Reported": ["Inspection Pending", "Rework Required", "In Progress"],
    "Inspection Pending": ["Verification Passed", "Verification Failed", "Rework Required"],
    "Verification Failed": ["Rework Required", "On Hold"],
    "Rework Required": ["In Progress", "Progress Reported", "Inspection Pending"],
    "Verification Passed": ["Awaiting Authorised Acceptance", "Rework Required"],
    "Awaiting Authorised Acceptance": ["Accepted", "Rework Required", "Verification Passed"],
    "Accepted": ["Operationally Ready", "On Hold"],
    "Operationally Ready": ["Maintenance Required", "On Hold"],
    "On Hold": ["In Progress", "Assigned", "Cancelled"],
    "Cancelled": ["Draft"],
}


def validate_workflow_transition(
    db: Session,
    work_package: WorkPackage,
    target_state: str,
    user_roles: List[str]
) -> Tuple[bool, Optional[str]]:
    """
    Validates whether transitioning work_package to target_state is permitted.
    Enforces role permissions and acceptance prerequisites.
    """
    current_state = work_package.workflow_state

    # 1. Check if transition is defined in state machine
    allowed_targets = ALLOWED_WORKFLOW_TRANSITIONS.get(current_state, [])
    if target_state not in allowed_targets and "super_admin" not in user_roles:
        return False, f"Invalid transition: Cannot move from '{current_state}' directly to '{target_state}'."

    # 2. Separation of duties: Vendor cannot approve work or set acceptance states
    if "vendor" in user_roles and not any(r in user_roles for r in ["super_admin", "municipal_admin", "project_manager", "field_inspector"]):
        vendor_allowed = ["Progress Reported", "In Progress"]
        if target_state not in vendor_allowed:
            return False, f"Vendors are only permitted to submit progress reports. '{target_state}' requires municipal authority."

    # 3. Acceptance transition rules
    if target_state in ["Accepted", "Operationally Ready"]:
        # Rule A: Cannot accept if open critical/high defects exist
        open_defects = [d for d in work_package.defects if d.status not in ["Closed", "Resolved"]]
        critical_defects = [d for d in open_defects if d.severity in ["Critical", "High"]]
        if critical_defects:
            return False, f"Cannot accept work: {len(critical_defects)} unresolved Critical/High defect(s) exist ({critical_defects[0].defect_id})."

        # Rule B: Mandatory milestones must be verified
        for ms in work_package.milestones:
            if ms.is_mandatory and ms.verification_status != "Verified":
                return False, f"Cannot accept work: Mandatory milestone '{ms.name}' is unverified."

        # Rule C: Only municipal administrators or super admins can perform final acceptance
        if not any(r in user_roles for r in ["super_admin", "municipal_admin"]):
            return False, "Only an authorized Municipal Administrator can approve the acceptance transition."

    return True, None


def sanitize_csv_cell(value: Any) -> str:
    """
    Mitigates spreadsheet formula injection (OWASP standard).
    Prefixes cell with single quote if it begins with dangerous characters (=, +, -, @, tab, CR).
    """
    if value is None:
        return ""
    str_val = str(value)
    if str_val and str_val[0] in ("=", "+", "-", "@", "\t", "\r"):
        return f"'{str_val}"
    return str_val
