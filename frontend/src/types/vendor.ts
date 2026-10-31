export interface Vendor {
  id: string;
  vendor_code: string;
  company_name: string;
  category: string;
  contact_name: string;
  email: string;
  phone?: string | null;
  contract_reference?: string | null;
  status: 'Active' | 'Suspended' | 'Under Review';
  contract_start_date?: string | null;
  contract_end_date?: string | null;
  compliance_status: 'Compliant' | 'Renewal Due' | 'Suspended';
  compliance_document_ref?: string | null;
  compliance_document_expiry?: string | null;
  created_at: string;
  updated_at: string;
  assigned_packages_count: number;
  active_packages_count: number;
  total_contract_value?: number | null;
  is_financial_masked: boolean;
}

export interface AssignedWorkPackageSummary {
  id: string;
  work_id: string;
  package_code?: string | null;
  title: string;
  project_id: string;
  project_name: string;
  category: string;
  reported_progress_percentage: number;
  verified_progress_percentage: number;
  workflow_state: string;
  planned_completion_date?: string | null;
  target_completion_date?: string | null;
  milestones_total: number;
  milestones_completed: number;
  open_defects_count: number;
}

export interface ProgressSubmission {
  id: string;
  submission_code: string;
  work_package_id: string;
  vendor_id: string;
  submitted_by_id?: string | null;
  progress_percentage: number;
  activities_description: string;
  delay_or_blocker?: string | null;
  estimated_completion_date?: string | null;
  evidence_attachments?: Array<{ name: string; type: string; size_kb: number; url?: string }> | null;
  review_status: 'Under Review' | 'Reviewed' | 'Rejected' | 'Superseded';
  reviewer_id?: string | null;
  reviewer_notes?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  work_package_title?: string | null;
  work_package_code?: string | null;
  vendor_name?: string | null;
  project_name?: string | null;
}

export interface VendorMetrics {
  total_assigned_packages: number;
  active_packages: number;
  average_reported_progress: number;
  average_verified_progress: number;
  progress_gap: number;
  open_defects_count: number;
  critical_defects_count: number;
  milestones_total: number;
  milestones_completed: number;
  milestones_overdue: number;
  compliance_status: string;
  contract_valid_until?: string | null;
}

export interface VendorDashboardData {
  vendor: Vendor;
  assigned_work_packages: AssignedWorkPackageSummary[];
  recent_submissions: ProgressSubmission[];
  metrics: VendorMetrics;
}

export interface ProgressSubmissionCreate {
  work_package_id: string;
  progress_percentage: number;
  activities_description: string;
  delay_or_blocker?: string | null;
  estimated_completion_date?: string | null;
  evidence_attachments?: Array<{ name: string; type: string; size_kb: number; url?: string }>;
}

export interface SubmissionReviewRequest {
  review_status: 'Reviewed' | 'Rejected';
  reviewer_notes: string;
}

export interface VendorCreatePayload {
  vendor_code: string;
  company_name: string;
  category: string;
  contact_name: string;
  email: string;
  phone?: string;
  contract_reference?: string;
  status?: string;
  contract_start_date?: string;
  contract_end_date?: string;
  compliance_status?: string;
  compliance_document_ref?: string;
  compliance_document_expiry?: string;
}
