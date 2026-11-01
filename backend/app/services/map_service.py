from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.domain import Zone, Project, WorkPackage, Asset, Inspection, Defect
from app.schemas.map import (
    MapFeature,
    MapFeatureGeometry,
    MapFeatureProperties,
    MapFeatureCollection,
    ZoneGeoBoundary
)

# Realistic perimeter boundary coordinates around Rajahmundry riverfront sectors (Lat, Lng)
ZONE_POLYGONS: Dict[str, List[List[float]]] = {
    "zone-koti": [
        [16.9960, 81.7660],
        [16.9965, 81.7695],
        [16.9928, 81.7702],
        [16.9922, 81.7668],
        [16.9960, 81.7660]
    ],
    "zone-pushkar": [
        [17.0030, 81.7725],
        [17.0035, 81.7760],
        [16.9995, 81.7768],
        [16.9990, 81.7732],
        [17.0030, 81.7725]
    ],
    "zone-saraswati": [
        [16.9898, 81.7592],
        [16.9902, 81.7630],
        [16.9860, 81.7638],
        [16.9855, 81.7600],
        [16.9898, 81.7592]
    ],
    "zone-dowles": [
        [16.9445, 81.7765],
        [16.9450, 81.7812],
        [16.9395, 81.7820],
        [16.9390, 81.7770],
        [16.9445, 81.7765]
    ]
}

ZONE_RADII_METERS: Dict[str, float] = {
    "zone-koti": 450.0,
    "zone-pushkar": 400.0,
    "zone-saraswati": 500.0,
    "zone-dowles": 650.0
}


def get_map_features(
    db: Session,
    zone_id: Optional[str] = None,
    entity_type: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None
) -> MapFeatureCollection:
    features: List[MapFeature] = []
    projects_count = 0
    assets_count = 0
    inspections_count = 0
    defects_count = 0

    zones_by_id = {z.id: z for z in db.query(Zone).all()}

    # 1. Projects
    if not entity_type or entity_type.lower() == "project":
        proj_query = db.query(Project)
        if zone_id and zone_id != "All":
            proj_query = proj_query.filter(Project.zone_id == zone_id)
        if category and category != "All":
            proj_query = proj_query.filter(Project.category == category)
        if status and status != "All":
            proj_query = proj_query.filter(Project.current_status == status)

        for p in proj_query.all():
            lat = p.latitude
            lng = p.longitude
            if (lat is None or lng is None) and p.zone_id in zones_by_id:
                zone = zones_by_id[p.zone_id]
                lat = zone.latitude
                lng = zone.longitude

            if lat is not None and lng is not None:
                if search:
                    q = search.lower()
                    if q not in p.name.lower() and q not in p.project_identifier.lower():
                        continue

                zone_name = zones_by_id.get(p.zone_id).name if p.zone_id in zones_by_id else "Unassigned Zone"
                projects_count += 1
                features.append(
                    MapFeature(
                        geometry=MapFeatureGeometry(coordinates=[lng, lat]),
                        properties=MapFeatureProperties(
                            id=p.id,
                            entity_type="project",
                            title=p.name,
                            code=p.project_identifier,
                            category=p.category,
                            status=p.current_status,
                            priority_or_severity=p.priority,
                            zone_id=p.zone_id,
                            zone_name=zone_name,
                            latitude=lat,
                            longitude=lng,
                            details_url=f"/projects/{p.id}",
                            meta={
                                "work_packages_count": len(p.work_packages),
                                "planned_completion": str(p.planned_completion_date) if p.planned_completion_date else None,
                                "priority": p.priority
                            }
                        )
                    )
                )

    # 2. Assets
    if not entity_type or entity_type.lower() == "asset":
        asset_query = db.query(Asset)
        if zone_id and zone_id != "All":
            asset_query = asset_query.filter(Asset.zone_id == zone_id)
        if category and category != "All":
            asset_query = asset_query.filter(Asset.category == category)
        if status and status != "All":
            asset_query = asset_query.filter(Asset.lifecycle_status == status)

        for a in asset_query.all():
            lat = a.latitude
            lng = a.longitude
            if (lat is None or lng is None) and a.zone_id in zones_by_id:
                zone = zones_by_id[a.zone_id]
                lat = zone.latitude
                lng = zone.longitude

            if lat is not None and lng is not None:
                if search:
                    q = search.lower()
                    if q not in a.name.lower() and q not in a.asset_code.lower() and q not in a.qr_identifier.lower():
                        continue

                zone_name = zones_by_id.get(a.zone_id).name if a.zone_id in zones_by_id else "Unassigned Zone"
                project_name = a.project.name if a.project else None
                wp_title = a.work_package.title if a.work_package else None
                assets_count += 1
                features.append(
                    MapFeature(
                        geometry=MapFeatureGeometry(coordinates=[lng, lat]),
                        properties=MapFeatureProperties(
                            id=a.id,
                            entity_type="asset",
                            title=a.name,
                            code=a.asset_code,
                            category=a.category,
                            status=a.lifecycle_status,
                            priority_or_severity=None,
                            zone_id=a.zone_id,
                            zone_name=zone_name,
                            project_id=a.project_id,
                            project_name=project_name,
                            work_package_title=wp_title,
                            latitude=lat,
                            longitude=lng,
                            details_url=f"/assets?asset_id={a.id}",
                            meta={
                                "qr_identifier": a.qr_identifier,
                                "location_name": a.location_name,
                                "open_defects": len([d for d in a.defects if d.status not in ["Resolved — Verification Passed", "Closed by Authorised User"]])
                            }
                        )
                    )
                )

    # 3. Inspections
    if not entity_type or entity_type.lower() == "inspection":
        insp_query = db.query(Inspection).filter(Inspection.latitude.isnot(None), Inspection.longitude.isnot(None))
        for i in insp_query.all():
            wp = i.work_package
            proj = wp.project if wp else None
            p_zone_id = proj.zone_id if proj else None

            if zone_id and zone_id != "All" and p_zone_id != zone_id:
                continue
            if category and category != "All" and (not proj or proj.category != category):
                continue
            if status and status != "All" and i.outcome != status:
                continue
            if search:
                q = search.lower()
                if q not in i.inspection_id.lower() and q not in i.inspection_type.lower() and (not wp or q not in wp.title.lower()):
                    continue

            zone_name = zones_by_id.get(p_zone_id).name if p_zone_id in zones_by_id else "Field Verification Sector"
            inspections_count += 1
            features.append(
                MapFeature(
                    geometry=MapFeatureGeometry(coordinates=[i.longitude, i.latitude]),
                    properties=MapFeatureProperties(
                        id=i.id,
                        entity_type="inspection",
                        title=f"{i.inspection_type} ({i.inspection_id})",
                        code=i.inspection_id,
                        category=proj.category if proj else "Field Inspection",
                        status=i.outcome,
                        priority_or_severity=None,
                        zone_id=p_zone_id,
                        zone_name=zone_name,
                        project_id=proj.id if proj else None,
                        project_name=proj.name if proj else None,
                        work_package_title=wp.title if wp else None,
                        latitude=i.latitude,
                        longitude=i.longitude,
                        details_url=f"/inspections/{i.id}",
                        meta={
                            "inspection_type": i.inspection_type,
                            "gps_accuracy": i.gps_accuracy_meters,
                            "geofence_verified": i.is_geofence_verified,
                            "defects_count": len(i.defects)
                        }
                    )
                )
            )

    # 4. Defects
    if not entity_type or entity_type.lower() == "defect":
        defect_query = db.query(Defect)
        if status and status != "All":
            defect_query = defect_query.filter(Defect.status == status)

        for d in defect_query.all():
            wp = d.work_package
            proj = wp.project if wp else None
            p_zone_id = proj.zone_id if proj else None

            if zone_id and zone_id != "All" and p_zone_id != zone_id:
                continue
            if category and category != "All" and d.category != category:
                continue

            # Determine coordinates: Asset -> Inspection -> Project -> Zone
            lat = None
            lng = None
            if d.asset and d.asset.latitude and d.asset.longitude:
                lat = d.asset.latitude
                lng = d.asset.longitude
            elif d.inspection and d.inspection.latitude and d.inspection.longitude:
                lat = d.inspection.latitude
                lng = d.inspection.longitude
            elif proj and proj.latitude and proj.longitude:
                lat = proj.latitude
                lng = proj.longitude
            elif p_zone_id in zones_by_id:
                lat = zones_by_id[p_zone_id].latitude
                lng = zones_by_id[p_zone_id].longitude

            if lat is not None and lng is not None:
                if search:
                    q = search.lower()
                    if q not in d.title.lower() and q not in d.defect_id.lower() and q not in d.description.lower():
                        continue

                zone_name = zones_by_id.get(p_zone_id).name if p_zone_id in zones_by_id else "Unassigned Zone"
                defects_count += 1
                features.append(
                    MapFeature(
                        geometry=MapFeatureGeometry(coordinates=[lng, lat]),
                        properties=MapFeatureProperties(
                            id=d.id,
                            entity_type="defect",
                            title=d.title,
                            code=d.defect_id,
                            category=d.category,
                            status=d.status,
                            priority_or_severity=d.severity,
                            zone_id=p_zone_id,
                            zone_name=zone_name,
                            project_id=proj.id if proj else None,
                            project_name=proj.name if proj else None,
                            work_package_title=wp.title if wp else None,
                            latitude=lat,
                            longitude=lng,
                            details_url=f"/defects?defect_id={d.id}",
                            meta={
                                "severity": d.severity,
                                "rework_count": d.rework_count,
                                "target_resolution": str(d.target_resolution_date) if d.target_resolution_date else None
                            }
                        )
                    )
                )

    return MapFeatureCollection(
        features=features,
        total_features=len(features),
        projects_count=projects_count,
        assets_count=assets_count,
        inspections_count=inspections_count,
        defects_count=defects_count
    )


def get_map_zones(db: Session) -> List[ZoneGeoBoundary]:
    zones = db.query(Zone).all()
    results: List[ZoneGeoBoundary] = []

    for z in zones:
        poly = ZONE_POLYGONS.get(z.id, [
            [z.latitude - 0.003, z.longitude - 0.003],
            [z.latitude - 0.003, z.longitude + 0.003],
            [z.latitude + 0.003, z.longitude + 0.003],
            [z.latitude + 0.003, z.longitude - 0.003],
            [z.latitude - 0.003, z.longitude - 0.003],
        ] if z.latitude and z.longitude else [])

        radius = ZONE_RADII_METERS.get(z.id, 400.0)

        # Calculate metrics for zone
        projects = db.query(Project).filter(Project.zone_id == z.id).all()
        assets = db.query(Asset).filter(Asset.zone_id == z.id).all()

        # Work packages in zone
        wp_list = []
        for p in projects:
            wp_list.extend(p.work_packages)

        if wp_list:
            avg_readiness = sum(wp.verified_progress_percentage for wp in wp_list) / len(wp_list)
        else:
            avg_readiness = 0.0

        # Open defects in zone
        open_defects_count = 0
        critical_defects = 0
        for wp in wp_list:
            for d in wp.defects:
                if d.status not in ["Resolved — Verification Passed", "Closed by Authorised User"]:
                    open_defects_count += 1
                    if d.severity == "Critical":
                        critical_defects += 1

        if critical_defects > 0 or avg_readiness < 40:
            risk = "Critical" if critical_defects > 1 else "High"
        elif avg_readiness < 70 or open_defects_count > 2:
            risk = "Medium"
        else:
            risk = "Low"

        results.append(
            ZoneGeoBoundary(
                id=z.id,
                code=z.code,
                name=z.name,
                description=z.description,
                center_lat=z.latitude or 16.9944,
                center_lng=z.longitude or 81.7678,
                radius_meters=radius,
                polygon_coordinates=poly,
                readiness_percentage=round(avg_readiness, 1),
                total_projects=len(projects),
                total_assets=len(assets),
                open_defects=open_defects_count,
                risk_level=risk
            )
        )

    return results
