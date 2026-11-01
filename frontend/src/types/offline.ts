export type OfflineActionType = 'execute_inspection' | 'create_defect' | 'save_inspection_draft';

export type SyncItemStatus =
  | 'Draft saved locally'
  | 'Pending sync'
  | 'Uploading'
  | 'Synced'
  | 'Sync failed'
  | 'Conflict requires review';

export interface OfflineInspectionDownload {
  id: string;
  inspection_id: string;
  work_package_id: string;
  work_package_title: string;
  project_id: string;
  project_name: string;
  scheduled_date?: string | null;
  inspection_type: string;
  checklist_version: string;
  checklist_template: OfflineChecklistItem[];
  milestone_id?: string | null;
  asset_id?: string | null;
  asset_name?: string | null;
  zone_id?: string | null;
  zone_name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  outcome: string;
}

export interface OfflineChecklistItem {
  id: string;
  category: string;
  description: string;
  requirement_type: string;
  verdict: 'pass' | 'fail' | 'n/a' | 'pending';
  notes?: string;
}

export interface QueuedSyncItem {
  client_submission_id: string;
  action_type: OfflineActionType;
  entity_id: string;
  title: string;
  payload: Record<string, any>;
  status: SyncItemStatus;
  error_message?: string;
  conflict_details?: Record<string, any>;
  created_at: string;
  last_attempt_at?: string;
  retry_count: number;
}

export interface SyncBatchRequest {
  device_id?: string;
  items: {
    client_submission_id: string;
    action_type: OfflineActionType;
    entity_id?: string;
    payload: Record<string, any>;
    client_timestamp?: string;
  }[];
}

export interface SyncItemResult {
  client_submission_id: string;
  action_type: string;
  status: 'synced' | 'conflict' | 'failed';
  server_id?: string;
  error_message?: string;
  conflict_details?: Record<string, any>;
  synced_at?: string;
}

export interface SyncBatchResponse {
  processed_count: number;
  synced_count: number;
  conflict_count: number;
  failed_count: number;
  results: SyncItemResult[];
}
