export type DefectSeverity = 'Critical' | 'High' | 'Medium' | 'Low';

export type DefectStatus =
  | 'Open'
  | 'Assigned'
  | 'Acknowledged'
  | 'In Progress'
  | 'Correction Submitted'
  | 'Verification Pending'
  | 'Rejected — Rework Required'
  | 'Resolved — Verification Passed'
  | 'Closed by Authorised User';

export interface DefectEvidenceItem {
  name: string;
  caption?: string;
  url?: string;
  timestamp?: string;
}

export interface DefectHistoryItem {
  timestamp: string;
  action: string;
  actor_id?: string;
  actor_name?: string;
  from_status?: string;
  to_status?: string;
  notes?: string;
}

export interface Defect {
  id: string;
  defect_id: string;
  work_package_id: string;
  work_package_title?: string;
  work_id?: string;
  project_id?: string;
  project_name?: string;
  zone_name?: string;
  inspection_id?: string;
  inspection_code?: string;
  checklist_item_ref?: string;
  asset_id?: string;
  asset_code?: string;
  assigned_vendor_id?: string;
  assigned_vendor_name?: string;
  title: string;
  description: string;
  category: string;
  severity: DefectSeverity;
  status: DefectStatus;
  target_resolution_date?: string;
  is_overdue: boolean;
  reported_by_id?: string;
  reported_by_name?: string;
  evidence_attachments?: DefectEvidenceItem[];
  resolution_notes?: string;
  rework_evidence?: DefectEvidenceItem[];
  rework_count: number;
  verification_result?: string;
  verification_notes?: string;
  verified_at?: string;
  verified_by_name?: string;
  closed_at?: string;
  closed_by_name?: string;
  history?: DefectHistoryItem[];
  created_at: string;
}

export interface DefectStats {
  total_defects: number;
  open_defects: number;
  critical_defects: number;
  overdue_defects: number;
  awaiting_verification: number;
  resolved_count: number;
  closed_count: number;
  defects_by_severity: Record<string, number>;
  defects_by_status: Record<string, number>;
  defects_by_project: { project_name: string; count: number }[];
}

export interface DefectCreateRequest {
  work_package_id: string;
  title: string;
  description: string;
  category?: string;
  severity?: DefectSeverity;
  target_resolution_date?: string;
  inspection_id?: string;
  checklist_item_ref?: string;
  asset_id?: string;
  assigned_vendor_id?: string;
  evidence_attachments?: DefectEvidenceItem[];
}

export interface DefectVendorReworkRequest {
  resolution_notes: string;
  rework_evidence?: DefectEvidenceItem[];
}

export interface DefectReinspectRequest {
  verdict: 'Pass' | 'Fail';
  verification_notes: string;
  reinspection_measurements?: string;
  reinspection_evidence?: DefectEvidenceItem[];
}

export interface DefectCloseRequest {
  closure_notes: string;
}
