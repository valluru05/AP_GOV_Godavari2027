export type ChainStepStatus =
  | 'Completed'
  | 'Pending'
  | 'Blocked'
  | 'Failed'
  | 'Awaiting Authorisation'
  | 'Not Applicable';

export interface ReadinessChainStep {
  step_number: number;
  stage_id: string;
  title: string;
  entity_type: string;
  entity_id?: string | null;
  status: ChainStepStatus;
  status_label: string;
  timestamp?: string | null;
  actor_name?: string | null;
  actor_role?: string | null;
  notes?: string | null;
  evidence_refs?: Array<{
    name: string;
    type?: string;
    caption?: string;
    url?: string;
    size_kb?: number;
    timestamp?: string;
  }> | null;
  missing_requirements?: string[] | null;
}

export interface ReadinessChainResponse {
  work_package_id: string;
  work_id: string;
  work_package_title: string;
  project_id: string;
  project_name: string;
  vendor_id?: string | null;
  vendor_name?: string | null;
  reported_progress_percentage: number;
  verified_progress_percentage: number;
  workflow_state: string;
  operational_readiness_state?: string | null;
  is_blocked: boolean;
  blocking_reasons: string[];
  chain_steps: ReadinessChainStep[];
}

export interface AcceptanceCriteriaCheck {
  code: string;
  criterion: string;
  status: 'PASSED' | 'FAILED' | 'WARNING';
  details: string;
  is_blocking: boolean;
}

export interface AcceptanceValidationResult {
  work_package_id: string;
  work_package_title: string;
  work_id: string;
  can_accept: boolean;
  checks: AcceptanceCriteriaCheck[];
  unresolved_blocking_defects_count: number;
  unverified_mandatory_milestones_count: number;
  missing_evidence_count: number;
  failed_inspections_count: number;
  summary_message: string;
}

export interface AcceptanceTransitionRequest {
  decision_notes: string;
  allow_exception?: boolean;
  exception_reason?: string | null;
}

export type RiskSeverity = 'Critical' | 'High' | 'Moderate' | 'Low';
export type RiskCategory = 'Critical' | 'High' | 'Moderate' | 'Low' | 'Insufficient Data';

export interface RiskFactor {
  rule_id: string;
  rule_name: string;
  severity: RiskSeverity;
  score_impact: number;
  explanation: string;
  suggested_action: string;
  trigger_data?: Record<string, any> | null;
}

export interface WorkPackageRiskEvaluation {
  work_package_id: string;
  work_id: string;
  work_package_title: string;
  project_id: string;
  project_name: string;
  category: string;
  vendor_name?: string | null;
  reported_progress_percentage: number;
  verified_progress_percentage: number;
  workflow_state: string;
  risk_score: number;
  risk_category: RiskCategory;
  risk_explanation: string;
  factors: RiskFactor[];
  suggested_actions: string[];
  evaluated_at: string;
}

export interface ReadinessDashboardSummary {
  total_work_packages: number;
  accepted_work_packages: number;
  in_progress_work_packages: number;
  blocked_work_packages: number;
  average_risk_score: number;
  risk_distribution: Record<string, number>;
  overdue_milestones_count: number;
  open_blocking_defects_count: number;
  pending_acceptance_count: number;
  highest_risk_work_packages: WorkPackageRiskEvaluation[];
}
