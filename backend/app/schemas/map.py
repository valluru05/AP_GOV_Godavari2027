from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field


class MapFeatureGeometry(BaseModel):
    type: Literal["Point"] = "Point"
    coordinates: List[float] = Field(..., description="[longitude, latitude] per GeoJSON RFC 7946")


class MapFeatureProperties(BaseModel):
    id: str
    entity_type: Literal["project", "asset", "inspection", "defect"]
    title: str
    code: str
    category: str
    status: str
    priority_or_severity: Optional[str] = None
    zone_id: Optional[str] = None
    zone_name: Optional[str] = None
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    work_package_title: Optional[str] = None
    latitude: float
    longitude: float
    details_url: str
    meta: Dict[str, Any] = Field(default_factory=dict)


class MapFeature(BaseModel):
    type: Literal["Feature"] = "Feature"
    geometry: MapFeatureGeometry
    properties: MapFeatureProperties


class MapFeatureCollection(BaseModel):
    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: List[MapFeature]
    total_features: int
    projects_count: int
    assets_count: int
    inspections_count: int
    defects_count: int
    demo_data_notice: str = "DEMO DATA: Synthetic geographic coordinates for Godavari Pushkaralu 2027 platform demonstration. Do not use for official navigational or engineering surveys."


class ZoneGeoBoundary(BaseModel):
    id: str
    code: str
    name: str
    description: Optional[str] = None
    center_lat: float
    center_lng: float
    radius_meters: float
    polygon_coordinates: List[List[float]] = Field(
        ..., description="List of [latitude, longitude] pairs defining perimeter polygon"
    )
    readiness_percentage: float
    total_projects: int
    total_assets: int
    open_defects: int
    risk_level: Literal["Low", "Medium", "High", "Critical"]
