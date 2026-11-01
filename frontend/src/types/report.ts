export type ReportType =
  | 'project_progress'
  | 'work_package_status'
  | 'vendor_performance'
  | 'milestone_performance'
  | 'inspection_outcomes'
  | 'defect_rework'
  | 'asset_readiness'
  | 'overdue_works'
  | 'risk_register'
  | 'missing_evidence'
  | 'chain_completeness'
  | 'audit_history';

export interface ReportTypeOption {
  id: ReportType;
  title: string;
  description: string;
  category: string;
}

export interface ReportFilterParams {
  report_type: ReportType;
  start_date?: string;
  end_date?: string;
  project_id?: string;
  work_package_id?: string;
  vendor_id?: string;
  zone_id?: string;
  category?: string;
  status?: string;
  risk_level?: string;
  search?: string;
}

export type ReportColumnDataType = 'string' | 'number' | 'date' | 'badge' | 'currency' | 'percentage';

export interface ReportColumn {
  key: string;
  label: string;
  data_type: ReportColumnDataType;
}

export interface ReportSummaryStat {
  label: string;
  value: string;
  subtext?: string;
}

export interface ReportMetadata {
  report_type: string;
  title: string;
  description: string;
  generated_at: string;
  generated_by: string;
  total_records: number;
  applied_filters: Record<string, any>;
  demo_pilot_label: string;
}

export interface ReportDataResponse {
  metadata: ReportMetadata;
  summary_stats: ReportSummaryStat[];
  columns: ReportColumn[];
  rows: Record<string, any>[];
}
