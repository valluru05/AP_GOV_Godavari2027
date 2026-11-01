from typing import Optional
from fastapi import APIRouter, Depends, Query, Path, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, require_permission
from app.models.user import User
from app.schemas.dependency import (
    DependencyGraphResponse,
    DelayImpactSimulationRequest,
    DelayImpactSimulationResponse,
    AddDependencyRequest
)
from app.services.dependency_service import (
    get_dependency_graph,
    simulate_delay_impact,
    add_dependency,
    remove_dependency
)

router = APIRouter(prefix="/dependencies", tags=["Readiness Dependency Graph & Risk Engine"])


@router.get("/graph", response_model=DependencyGraphResponse)
def get_graph(
    project_id: Optional[str] = Query(None, description="Filter DAG by Project ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns the complete milestone DAG, Critical Path Method (CPM) calculations,
    and festival buffer days to Godavari Pushkaralu 2027 per Section 14 (Module 9).
    """
    return get_dependency_graph(db=db, project_id=project_id)


@router.post("/simulate-impact", response_model=DelayImpactSimulationResponse)
def simulate_milestone_delay(
    payload: DelayImpactSimulationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Simulates the ripple effect of delaying a milestone across downstream dependencies,
    identifying impacted work packages and festival buffer erosion.
    """
    return simulate_delay_impact(
        db=db,
        milestone_id=payload.milestone_id,
        delay_days=payload.delay_days
    )


@router.post("", status_code=status.HTTP_201_CREATED)
def create_milestone_dependency(
    payload: AddDependencyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("milestones:edit"))
):
    """
    Creates a dependency edge (milestone_id depends on depends_on_id)
    with strict cycle detection preventing circular dependency deadlocks.
    """
    return add_dependency(
        db=db,
        milestone_id=payload.milestone_id,
        depends_on_id=payload.depends_on_id
    )


@router.delete("", status_code=status.HTTP_200_OK)
def delete_milestone_dependency(
    milestone_id: str = Query(..., description="Dependent milestone ID"),
    depends_on_id: str = Query(..., description="Prerequisite milestone ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("milestones:edit"))
):
    """
    Removes a milestone dependency edge.
    """
    return remove_dependency(
        db=db,
        milestone_id=milestone_id,
        depends_on_id=depends_on_id
    )
