export interface MilestoneSimple {
  id: string;
  name: string;
  due_date: string;
  is_mandatory: boolean;
  reported_status: string;
  verification_status: string;
}

export interface Milestone {
  id: string;
  work_package_id: string;
  name: string;
  description?: string;
  due_date: string;
  is_mandatory: boolean;
  acceptance_criteria?: string;
  required_evidence_type?: string;
  responsible_party?: string;
  reported_status: string;
  verification_status: string;
  completed_at?: string;
  verification_timestamp?: string;
  created_at: string;
  dependencies: MilestoneSimple[];
}

export interface WorkPackage {
  id: string;
  work_id: string;
  project_id: string;
  title: string;
  description?: string;
  category: string;
  vendor_id?: string;
  vendor_name?: string;
  responsible_manager_id?: string;
  priority: string;
  planned_start_date?: string;
  planned_completion_date?: string;
  actual_completion_date?: string;
  reported_progress_percentage: number;
  verified_progress_percentage: number;
  workflow_state: string;
  risk_score: number;
  risk_category: string;
  risk_explanation?: string;
  created_at: string;
  updated_at: string;
  milestones: Milestone[];
  defects_count: number;
  inspections_count: number;
  assets_count: number;
}

export interface ProjectSummary {
  id: string;
  project_identifier: string;
  name: string;
  description?: string;
  category: string;
  zone_id?: string;
  zone_name?: string;
  current_status: string;
  priority: string;
  start_date?: string;
  planned_completion_date?: string;
  funding_reference?: string;
  created_at: string;
  work_packages_count: number;
  reported_progress_avg: number;
  verified_progress_avg: number;
}

export interface ProjectDetail extends ProjectSummary {
  department_id?: string;
  department_name?: string;
  project_manager_id?: string;
  created_by_id?: string;
  latitude?: number;
  longitude?: number;
  work_packages: WorkPackage[];
}
