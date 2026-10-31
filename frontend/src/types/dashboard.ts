export interface SummaryMetrics {
  total_projects: number;
  active_works: number;
  reported_complete_works: number;
  verified_complete_works: number;
  accepted_works: number;
  works_at_risk: number;
  overdue_milestones: number;
  open_defects: number;
  assets_registered: number;
  assets_awaiting_inspection: number;
  assets_accepted: number;
  inspections_awaiting_action: number;
}

export interface StatusDistributionItem {
  status: string;
  count: number;
  color: string;
}

export interface ReportedVsVerifiedItem {
  work_id: string;
  title: string;
  reported_progress: number;
  verified_progress: number;
  gap: number;
  workflow_state: string;
}

export interface DefectSeverityItem {
  severity: string;
  count: number;
  color: string;
}

export interface ZoneReadinessItem {
  zone_code: string;
  zone_name: string;
  total_works: number;
  verified_works: number;
  readiness_percentage: number;
}

export interface VendorPerformanceItem {
  vendor_id: string;
  vendor_name: string;
  category: string;
  assigned_works: number;
  open_defects: number;
  completion_rate: number;
}

export interface DeadlineItem {
  id: string;
  work_id: string;
  title: string;
  due_date: string;
  days_remaining: number;
  is_overdue: boolean;
  category: string;
}

export interface RecentInspectionItem {
  id: string;
  inspection_id: string;
  work_title: string;
  inspection_type: string;
  outcome: string;
  date: string;
  notes?: string;
}

export interface PriorityRiskItem {
  work_id: string;
  title: string;
  risk_score: number;
  risk_category: string;
  risk_explanation: string;
  suggested_action: string;
}

export interface DashboardVisualizations {
  project_status_distribution: StatusDistributionItem[];
  reported_vs_verified_progress: ReportedVsVerifiedItem[];
  open_defects_by_severity: DefectSeverityItem[];
  work_readiness_by_zone: ZoneReadinessItem[];
  vendor_workload_performance: VendorPerformanceItem[];
  upcoming_deadlines: DeadlineItem[];
  recent_inspections: RecentInspectionItem[];
  highest_priority_risks: PriorityRiskItem[];
  recent_audit_events: Array<{
    id: string;
    event_id: string;
    action: string;
    actor: string;
    timestamp: string;
    entity: string;
    reason?: string;
  }>;
}

export interface ActionQueueItem {
  id: string;
  item_type: string;
  title: string;
  description: string;
  severity: 'Critical' | 'High' | 'Moderate' | 'Low';
  priority_order: number;
  entity_type: string;
  entity_id: string;
  link_url: string;
  suggested_action: string;
}

export interface DashboardFilterOptions {
  projects: Array<{ id: string; name: string }>;
  zones: Array<{ id: string; name: string }>;
  categories: string[];
  vendors: Array<{ id: string; name: string }>;
  statuses: string[];
  risk_levels: string[];
}
