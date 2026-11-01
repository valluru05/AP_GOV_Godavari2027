export type MilestoneNodeStatus =
  | 'Completed'
  | 'In Progress'
  | 'Blocked'
  | 'Pending'
  | 'Overdue';

export interface DependencyGraphNode {
  id: string;
  name: string;
  work_package_id: string;
  work_package_title: string;
  work_id: string;
  project_id: string;
  project_name: string;
  due_date: string;
  is_mandatory: boolean;
  reported_status: string;
  verification_status: string;
  status: MilestoneNodeStatus;
  is_on_critical_path: boolean;
  slack_days: number;
  duration_days: number;
  risk_score: number;
  predecessor_ids: string[];
  successor_ids: string[];
}

export interface DependencyGraphEdge {
  source: string;
  target: string;
  source_name: string;
  target_name: string;
  is_blocked: boolean;
  is_critical: boolean;
}

export interface DependencyGraphResponse {
  nodes: DependencyGraphNode[];
  edges: DependencyGraphEdge[];
  critical_path_milestone_ids: string[];
  total_milestones: number;
  completed_milestones: number;
  blocked_milestones: number;
  overdue_milestones: number;
  festival_target_date: string;
  days_to_pushkaralu: number;
  critical_path_duration_days: number;
  festival_buffer_days: number;
}

export interface DelayImpactSimulationRequest {
  milestone_id: string;
  delay_days: number;
}

export interface ImpactedMilestone {
  id: string;
  name: string;
  work_package_title: string;
  original_due_date: string;
  projected_due_date: string;
  delay_days: number;
  is_critical_path: boolean;
}

export interface DelayImpactSimulationResponse {
  target_milestone_id: string;
  target_milestone_name: string;
  simulated_delay_days: number;
  impacted_milestones: ImpactedMilestone[];
  impacted_work_package_count: number;
  original_completion_date: string;
  new_projected_completion_date: string;
  pushkaralu_deadline_breached: boolean;
  remaining_festival_buffer_days: number;
  recommendations: string[];
}

export interface AddDependencyRequest {
  milestone_id: string;
  depends_on_id: string;
}
