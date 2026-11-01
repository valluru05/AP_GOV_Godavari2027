export type AssetCategory =
  | 'Drinking-water units'
  | 'Public lighting'
  | 'Sanitation units'
  | 'River safety installation'
  | 'Signage'
  | 'Waste collection facilities'
  | 'Temporary access infrastructure'
  | string;

export type AssetStatus =
  | 'Planned'
  | 'Procurement Pending'
  | 'Installation Pending'
  | 'Installed'
  | 'Inspection Pending'
  | 'Verification Failed'
  | 'Accepted'
  | 'Operationally Ready'
  | 'Maintenance Required'
  | 'Out of Service'
  | 'Retired'
  | string;

export interface AssetMaintenance {
  id?: string;
  service_date: string;
  maintenance_type: string;
  technician_name: string;
  summary: string;
  status?: string;
  parts_replaced?: string;
  next_service_due?: string;
  logged_by?: string;
  logged_at?: string;
}

export interface AssetEvidence {
  id?: string;
  name: string;
  caption: string;
  file_type?: string;
  uploaded_by?: string;
  uploaded_at?: string;
}

export interface Asset {
  id: string;
  asset_code: string;
  name: string;
  category: AssetCategory;
  description?: string;
  department?: string;
  location_name?: string;
  zone_id?: string;
  project_id?: string;
  work_package_id?: string;
  responsible_manager_id?: string;
  serial_number?: string;
  model_number?: string;
  lifecycle_status: AssetStatus;
  qr_identifier: string;
  installation_date?: string;
  commissioning_date?: string;
  latitude?: number;
  longitude?: number;
  readiness_notes?: string;
  maintenance_history: AssetMaintenance[];
  supporting_evidence: AssetEvidence[];
  created_at: string;
  updated_at?: string;

  // Computed fields
  is_operationally_ready: boolean;
  readiness_badge_text: string;
  readiness_badge_variant: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'brand';
  open_defect_count: number;
  latest_inspection_result?: string;
  zone_name?: string;
  project_name?: string;
  work_package_name?: string;
  manager_name?: string;
  qr_data_url?: string;
}

export interface AssetCreateRequest {
  name: string;
  category: AssetCategory;
  description?: string;
  department?: string;
  location_name?: string;
  zone_id?: string;
  project_id?: string;
  work_package_id?: string;
  serial_number?: string;
  model_number?: string;
  installation_date?: string;
  commissioning_date?: string;
  latitude?: number;
  longitude?: number;
  lifecycle_status?: AssetStatus;
  readiness_notes?: string;
}

export interface AssetUpdateRequest {
  name?: string;
  category?: AssetCategory;
  description?: string;
  department?: string;
  location_name?: string;
  zone_id?: string;
  project_id?: string;
  work_package_id?: string;
  serial_number?: string;
  model_number?: string;
  installation_date?: string;
  commissioning_date?: string;
  latitude?: number;
  longitude?: number;
  readiness_notes?: string;
}

export interface AssetTransitionRequest {
  new_status: AssetStatus;
  reason: string;
  notes?: string;
}

export interface AssetMaintenanceRequest {
  maintenance_type: string;
  technician_name: string;
  summary: string;
  service_date?: string;
  next_service_due?: string;
  status?: string;
  parts_replaced?: string;
}

export interface AssetEvidenceRequest {
  name: string;
  caption: string;
  file_type?: string;
}

export interface AssetQRLabel {
  asset_id: string;
  asset_code: string;
  asset_name: string;
  department?: string;
  location_name?: string;
  zone_name?: string;
  qr_identifier: string;
  qr_data_url: string;
  verification_url: string;
  lifecycle_status: string;
  is_operationally_ready: boolean;
  pushkaralu_event: string;
}

export interface AssetStats {
  total_assets: number;
  operationally_ready_count: number;
  pending_verification_count: number;
  verification_failed_count: number;
  maintenance_required_count: number;
  installed_count: number;
  assets_by_category: Record<string, number>;
  assets_by_status: Record<string, number>;
  assets_by_zone: Array<{ zone_name: string; count: number }>;
}
