export type MapEntityType = 'project' | 'asset' | 'inspection' | 'defect';

export interface MapFeatureGeometry {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface MapFeatureProperties {
  id: string;
  entity_type: MapEntityType;
  title: string;
  code: string;
  category: string;
  status: string;
  priority_or_severity?: string | null;
  zone_id?: string | null;
  zone_name?: string | null;
  project_id?: string | null;
  project_name?: string | null;
  work_package_title?: string | null;
  latitude: number;
  longitude: number;
  details_url: string;
  meta: Record<string, any>;
}

export interface MapFeature {
  type: 'Feature';
  geometry: MapFeatureGeometry;
  properties: MapFeatureProperties;
}

export interface MapFeatureCollection {
  type: 'FeatureCollection';
  features: MapFeature[];
  total_features: number;
  projects_count: number;
  assets_count: number;
  inspections_count: number;
  defects_count: number;
  demo_data_notice: string;
}

export interface ZoneGeoBoundary {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  center_lat: number;
  center_lng: number;
  radius_meters: number;
  polygon_coordinates: [number, number][]; // Array of [lat, lng]
  readiness_percentage: number;
  total_projects: number;
  total_assets: number;
  open_defects: number;
  risk_level: 'Low' | 'Medium' | 'High' | 'Critical';
}

export interface MapFilterParams {
  zone_id?: string;
  entity_type?: MapEntityType | 'All';
  category?: string;
  status?: string;
  search?: string;
}
