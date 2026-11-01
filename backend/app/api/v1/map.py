from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.map import MapFeatureCollection, ZoneGeoBoundary
from app.services.map_service import get_map_features, get_map_zones

router = APIRouter(prefix="/map", tags=["Geographic Map & Zone Monitoring"])


@router.get("/features", response_model=MapFeatureCollection)
def get_features(
    zone_id: Optional[str] = Query(None, description="Filter features by zone ID"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type (project, asset, inspection, defect)"),
    category: Optional[str] = Query(None, description="Filter by category (Drinking Water, Sanitation, Public Safety, etc.)"),
    status: Optional[str] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Search query across entity titles and codes"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns GeoJSON FeatureCollection of all authorised projects, assets, inspections,
    and open defects with physical coordinates per Section 15 (Module 10).
    """
    return get_map_features(
        db=db,
        zone_id=zone_id,
        entity_type=entity_type,
        category=category,
        status=status,
        search=search
    )


@router.get("/zones", response_model=List[ZoneGeoBoundary])
def get_zones(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns GIS perimeter boundaries, center coordinates, readiness scores, and defect
    densities for Godavari Pushkaralu 2027 monitoring zones and ghat sectors.
    """
    return get_map_zones(db=db)
