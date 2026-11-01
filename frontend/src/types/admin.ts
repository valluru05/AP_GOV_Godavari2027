export interface PermissionItem {
  id: string;
  name: string;
  category: string;
  description?: string;
}

export interface PermissionCategoryGroup {
  category: string;
  permissions: PermissionItem[];
}

export interface RoleMatrixItem {
  id: string;
  name: string;
  description?: string;
  is_system_role: boolean;
  permission_ids: string[];
}

export interface RoleMatrixResponse {
  roles: RoleMatrixItem[];
  categories: PermissionCategoryGroup[];
}

export interface DepartmentDetailResponse {
  id: string;
  code: string;
  name: string;
  description?: string;
  user_count: number;
  project_count: number;
}

export interface ZoneAdminResponse {
  id: string;
  code: string;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  is_active: boolean;
  project_count: number;
  asset_count: number;
}

export type CheckType = 'pass_fail' | 'measurement' | 'visual_rating';

export interface ChecklistItemDef {
  id: string;
  title: string;
  check_type: CheckType;
  mandatory: boolean;
  requires_photo: boolean;
  acceptance_criteria: string;
}

export interface ChecklistTemplateResponse {
  id: string;
  template_code: string;
  name: string;
  category: string;
  version: string;
  description?: string;
  is_active: boolean;
  items: ChecklistItemDef[];
  created_at: string;
  updated_at: string;
}

export interface ChecklistTemplateCreateRequest {
  template_code: string;
  name: string;
  category: string;
  version?: string;
  description?: string;
  items: ChecklistItemDef[];
}

export interface SystemConfigResponse {
  project_categories: string[];
  work_categories: string[];
  vendor_categories: string[];
  asset_categories: string[];
  defect_sla_rules: Record<string, { max_resolution_hours: number; escalation_hours: number; description: string }>;
  risk_weights: Record<string, { weight: number; description: string }>;
  readiness_gate_thresholds: Record<string, number>;
  data_retention_days: number;
  notification_channels: Record<string, string>;
  last_updated_at?: string;
  last_updated_by?: string;
}

export interface SystemConfigUpdateRequest {
  project_categories?: string[];
  work_categories?: string[];
  vendor_categories?: string[];
  asset_categories?: string[];
  defect_sla_rules?: Record<string, any>;
  risk_weights?: Record<string, any>;
  readiness_gate_thresholds?: Record<string, number>;
  data_retention_days?: number;
}

export interface DemoDataResetResponse {
  status: string;
  message: string;
  reseeded_counts: Record<string, number>;
}
