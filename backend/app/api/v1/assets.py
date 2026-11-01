from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.api.deps import get_current_user, require_permission
from app.schemas.asset import (
    AssetCreate,
    AssetUpdate,
    AssetTransitionRequest,
    AssetMaintenanceCreate,
    AssetEvidenceCreate,
    AssetResponse,
    AssetQRLabelResponse,
    AssetStats
)
from app.services.asset_service import AssetService

router = APIRouter(prefix="/assets", tags=["Municipal Assets & QR Traceability"])


@router.get("", response_model=List[AssetResponse])
def list_assets(
    category: Optional[str] = Query(None, description="Filter by category"),
    lifecycle_status: Optional[str] = Query(None, description="Filter by status"),
    zone_id: Optional[str] = Query(None, description="Filter by Ghat/Zone"),
    project_id: Optional[str] = Query(None, description="Filter by project"),
    search: Optional[str] = Query(None, description="Search by code, name, location, serial number"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("assets:read")),
):
    """List municipal assets with optional filtering and computed operational readiness."""
    return AssetService.list_assets(
        db=db,
        category=category,
        lifecycle_status=lifecycle_status,
        zone_id=zone_id,
        project_id=project_id,
        search=search,
    )


@router.get("/stats", response_model=AssetStats)
def get_asset_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("assets:read")),
):
    """Retrieve live Pushkaralu 2027 asset inventory KPI statistics."""
    return AssetService.get_stats(db=db)


@router.get("/lookup/qr/{qr_identifier}", response_model=AssetResponse)
def lookup_asset_by_qr(
    qr_identifier: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("assets:read")),
):
    """
    Opaque QR code resolver.
    Enforces authentication while protecting internal database keys.
    """
    return AssetService.get_asset_by_qr(db=db, qr_identifier=qr_identifier)


@router.get("/{asset_id}/qr-label", response_model=AssetQRLabelResponse)
def get_asset_qr_label(
    asset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("assets:read")),
):
    """Generate printable official municipal QR asset label with embedded vector QR."""
    return AssetService.get_qr_label(db=db, asset_id=asset_id)


@router.get("/{asset_id}", response_model=AssetResponse)
def get_asset(
    asset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("assets:read")),
):
    """Retrieve comprehensive asset dossier including readiness evaluation and maintenance history."""
    return AssetService.get_asset(db=db, asset_id=asset_id)


@router.post("", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
def create_asset(
    payload: AssetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("assets:manage")),
):
    """Register a new physical municipal asset with auto-generated code and secure QR token."""
    return AssetService.create_asset(db=db, payload=payload, current_user=current_user)


@router.patch("/{asset_id}", response_model=AssetResponse)
def update_asset(
    asset_id: str,
    payload: AssetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("assets:manage")),
):
    """Update asset specifications, department, or location details."""
    return AssetService.update_asset(
        db=db, asset_id=asset_id, payload=payload, current_user=current_user
    )


@router.post("/{asset_id}/transition", response_model=AssetResponse)
def transition_asset_status(
    asset_id: str,
    payload: AssetTransitionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("assets:transition")),
):
    """
    Advance or regress asset lifecycle state machine.
    Enforces business validation: cannot declare Operationally Ready while critical defects exist.
    """
    return AssetService.transition_asset_status(
        db=db, asset_id=asset_id, payload=payload, current_user=current_user
    )


@router.post("/{asset_id}/maintenance", response_model=AssetResponse)
def add_maintenance_record(
    asset_id: str,
    payload: AssetMaintenanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("assets:manage")),
):
    """Log routine, preventive, or emergency maintenance performed on an asset."""
    return AssetService.add_maintenance_record(
        db=db, asset_id=asset_id, payload=payload, current_user=current_user
    )


@router.post("/{asset_id}/evidence", response_model=AssetResponse)
def add_supporting_evidence(
    asset_id: str,
    payload: AssetEvidenceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("assets:manage")),
):
    """Attach manufacturer certificates, commissioning reports, or installation photos."""
    return AssetService.add_supporting_evidence(
        db=db, asset_id=asset_id, payload=payload, current_user=current_user
    )
