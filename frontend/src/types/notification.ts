export type NotificationSeverity = 'critical' | 'warning' | 'info' | 'success';

export type NotificationTriggerType =
  | 'work_assignment'
  | 'progress_submission'
  | 'inspection_assignment'
  | 'inspection_failure'
  | 'missing_evidence'
  | 'new_defect'
  | 'correction_submitted'
  | 'reinspection_required'
  | 'upcoming_deadline'
  | 'overdue_milestone'
  | 'blocking_risk'
  | 'asset_acceptance'
  | 'approval_request';

export interface NotificationItem {
  id: string;
  user_id: string;
  trigger_type: NotificationTriggerType | string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  entity_type?: string;
  entity_id?: string;
  action_url?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface NotificationListResponse {
  notifications: NotificationItem[];
  unread_count: number;
  total_count: number;
}

export type TaskType =
  | 'inspection'
  | 'defect_rework'
  | 'submission_review'
  | 'asset_acceptance'
  | 'milestone_approval'
  | 'risk_mitigation';

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

export interface MyTaskItem {
  task_id: string;
  task_type: TaskType;
  title: string;
  description: string;
  priority: TaskPriority;
  status: string;
  due_date?: string;
  is_overdue: boolean;
  days_remaining_or_overdue: number;
  entity_id: string;
  entity_type: string;
  action_label: string;
  action_url: string;
  zone_name?: string;
  work_package_code?: string;
}

export interface MyTasksSummary {
  total_tasks: number;
  critical_tasks: number;
  overdue_tasks: number;
  due_today_tasks: number;
  inspections_count: number;
  defects_count: number;
  reviews_count: number;
  approvals_count: number;
}

export interface MyTasksResponse {
  summary: MyTasksSummary;
  tasks: MyTaskItem[];
}

export interface ExternalChannelsStatusResponse {
  in_app_delivery: string;
  sms_gateway: string;
  email_smtp: string;
  whatsapp_api: string;
  notice: string;
}
