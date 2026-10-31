export type InspectionOutcome = 'Scheduled' | 'Passed' | 'Failed' | 'Conditional Pass';
export type ChecklistVerdict = 'Pass' | 'Fail' | 'Pending' | 'N/A';

export interface ChecklistItemResult {
  item: string;
  verdict: ChecklistVerdict;
  measurement?: string;
  notes?: string;
}

export interface EvidencePhoto {
  name: string;
  caption?: string;
  timestamp?: string;
  lat?: number;
  lng?: number;
  url?: string;
}

export interface Inspection {
  id: string;
  inspection_id: string;
  work_package_id: string;
  work_package_title?: string;
  work_id?: string;
  project_id?: string;
  project_name?: string;
  zone_name?: string;
  inspector_id?: string;
  inspector_name?: string;
  milestone_id?: string;
  milestone_name?: string;
  asset_id?: string;
  asset_code?: string;
  scheduled_date?: string;
  actual_inspection_date?: string;
  inspection_type: string;
  checklist_version: string;
  checklist_results?: ChecklistItemResult[];
  evidence_photos?: EvidencePhoto[];
  latitude?: number;
  longitude?: number;
  gps_accuracy_meters?: number;
  is_geofence_verified: boolean;
  outcome: InspectionOutcome;
  notes?: string;
  verified_percentage_awarded?: number;
  reviewer_decision?: string;
  inspector_signature?: string;
  open_defects_count: number;
  created_at: string;
}

export interface InspectionStats {
  total_inspections: number;
  scheduled_count: number;
  passed_count: number;
  failed_count: number;
  conditional_count: number;
  pass_rate_percentage: number;
}

export interface InspectionCreateRequest {
  work_package_id: string;
  milestone_id?: string;
  asset_id?: string;
  scheduled_date?: string;
  inspection_type: string;
  notes?: string;
}

export interface InspectionExecuteRequest {
  outcome: InspectionOutcome;
  checklist_results: ChecklistItemResult[];
  evidence_photos?: EvidencePhoto[];
  latitude?: number;
  longitude?: number;
  gps_accuracy_meters?: number;
  notes?: string;
  verified_percentage_awarded?: number;
  inspector_signature?: string;
}

export interface InspectionReviewRequest {
  reviewer_decision: string;
  notes?: string;
}
