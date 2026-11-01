import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def get_token(username_or_email: str = "superadmin@civicproof.gov.in", password: str = "AdminPass123!") -> str:
    r = client.post("/api/v1/auth/login", json={"username_or_email": username_or_email, "password": password})
    assert r.status_code == 200, f"Login failed for {username_or_email}: {r.text}"
    return r.json()["access_token"]


@pytest.fixture
def admin_headers():
    token = get_token("superadmin@civicproof.gov.in", "AdminPass123!")
    return {"Authorization": f"Bearer {token}"}


def test_unauthenticated_map_access_rejected():
    """Verify unauthorized requests to GIS endpoints are rejected with 401."""
    res = client.get("/api/v1/map/features")
    assert res.status_code == 401


def test_get_map_features_geojson_structure(admin_headers):
    """
    Verify /api/v1/map/features returns valid GeoJSON FeatureCollection
    with required properties, coordinates, counts, and demo data notice.
    """
    res = client.get("/api/v1/map/features", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()

    assert data["type"] == "FeatureCollection"
    assert "DEMO DATA" in data["demo_data_notice"]
    assert data["total_features"] > 0
    assert data["projects_count"] >= 1
    assert data["assets_count"] >= 1
    assert len(data["features"]) == data["total_features"]

    # Verify GeoJSON RFC 7946 compliance: Point coordinates [lng, lat]
    first_feature = data["features"][0]
    assert first_feature["type"] == "Feature"
    assert first_feature["geometry"]["type"] == "Point"
    coords = first_feature["geometry"]["coordinates"]
    assert len(coords) == 2
    assert isinstance(coords[0], float)  # longitude
    assert isinstance(coords[1], float)  # latitude

    # Verify properties
    props = first_feature["properties"]
    assert "id" in props
    assert props["entity_type"] in ["project", "asset", "inspection", "defect"]
    assert "title" in props
    assert "code" in props
    assert "details_url" in props


def test_filter_map_features_by_entity_type(admin_headers):
    """Verify entity_type filtering works cleanly."""
    res_assets = client.get("/api/v1/map/features?entity_type=asset", headers=admin_headers)
    assert res_assets.status_code == 200
    assets_data = res_assets.json()
    assert all(f["properties"]["entity_type"] == "asset" for f in assets_data["features"])

    res_projects = client.get("/api/v1/map/features?entity_type=project", headers=admin_headers)
    assert res_projects.status_code == 200
    proj_data = res_projects.json()
    assert all(f["properties"]["entity_type"] == "project" for f in proj_data["features"])


def test_filter_map_features_by_zone(admin_headers):
    """Verify zone-based GIS filtering."""
    res = client.get("/api/v1/map/features?zone_id=zone-koti", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total_features"] > 0
    for f in data["features"]:
        assert f["properties"]["zone_id"] == "zone-koti"


def test_get_map_zones_boundaries_and_readiness(admin_headers):
    """
    Verify /api/v1/map/zones returns perimeter polygon coordinates,
    center coordinates, readiness scores, and risk classifications.
    """
    res = client.get("/api/v1/map/zones", headers=admin_headers)
    assert res.status_code == 200
    zones = res.json()
    assert len(zones) >= 4

    zone_ids = [z["id"] for z in zones]
    assert "zone-koti" in zone_ids
    assert "zone-pushkar" in zone_ids

    koti = next(z for z in zones if z["id"] == "zone-koti")
    assert koti["center_lat"] > 16.0
    assert koti["center_lng"] > 81.0
    assert len(koti["polygon_coordinates"]) >= 4
    assert 0.0 <= koti["readiness_percentage"] <= 100.0
    assert koti["risk_level"] in ["Low", "Medium", "High", "Critical"]
