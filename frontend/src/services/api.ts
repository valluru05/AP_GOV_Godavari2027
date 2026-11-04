import type { User, TokenResponse, Department, Role, AuditEvent } from '../types/auth';
import type {
  Vendor,
  VendorDashboardData,
  ProgressSubmission,
  ProgressSubmissionCreate,
  SubmissionReviewRequest
} from '../types/vendor';
import type {
  Inspection,
  InspectionStats,
  InspectionCreateRequest,
  InspectionExecuteRequest,
  InspectionReviewRequest,
} from '../types/inspection';
import type {
  Defect,
  DefectStats,
  DefectCreateRequest,
  DefectVendorReworkRequest,
  DefectReinspectRequest,
  DefectCloseRequest,
} from '../types/defect';
import type {
  Asset,
  AssetStats,
  AssetCreateRequest,
  AssetUpdateRequest,
  AssetTransitionRequest,
  AssetMaintenanceRequest,
  AssetEvidenceRequest,
  AssetQRLabel
} from '../types/asset';
import type {
  ReadinessDashboardSummary,
  ReadinessChainResponse,
  WorkPackageRiskEvaluation,
  AcceptanceValidationResult,
  AcceptanceTransitionRequest,
} from '../types/readiness';
import type {
  DependencyGraphResponse,
  DelayImpactSimulationRequest,
  DelayImpactSimulationResponse,
  AddDependencyRequest,
} from '../types/dependency';
import type {
  MapFeatureCollection,
  ZoneGeoBoundary,
  MapFilterParams,
} from '../types/map';
import type {
  OfflineInspectionDownload,
  SyncBatchRequest,
  SyncBatchResponse,
} from '../types/offline';
import type {
  ReportTypeOption,
  ReportFilterParams,
  ReportDataResponse,
} from '../types/report';
import type {
  NotificationItem,
  NotificationListResponse,
  MyTasksResponse,
  ExternalChannelsStatusResponse
} from '../types/notification';
import type {
  RoleMatrixResponse,
  RoleMatrixItem,
  DepartmentDetailResponse,
  ZoneAdminResponse,
  ChecklistTemplateResponse,
  ChecklistTemplateCreateRequest,
  SystemConfigResponse,
  SystemConfigUpdateRequest,
  DemoDataResetResponse,
} from '../types/admin';


const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || '/api/v1';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('civicproof_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('civicproof_token', token);
    } else {
      localStorage.removeItem('civicproof_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'same-origin', // sends HttpOnly cookies
    });

    if (!response.ok) {
      let errorMessage = 'Request failed';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || JSON.stringify(errorData);
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // --- Auth APIs ---
  async login(usernameOrEmail: string, password: string): Promise<TokenResponse> {
    const res = await this.request<TokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username_or_email: usernameOrEmail,
        password,
      }),
    });
    this.setToken(res.access_token);
    return res;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.setToken(null);
    }
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  async resetPassword(email: string, newPassword: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        email,
        new_password: newPassword,
      }),
    });
  }

  // --- Users & Roles APIs ---
  async getUsers(params: {
    search?: string;
    role_id?: string;
    department_id?: string;
    is_active?: boolean;
    skip?: number;
    limit?: number;
  } = {}): Promise<User[]> {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.set('search', params.search);
    if (params.role_id) searchParams.set('role_id', params.role_id);
    if (params.department_id) searchParams.set('department_id', params.department_id);
    if (params.is_active !== undefined) searchParams.set('is_active', String(params.is_active));
    if (params.skip !== undefined) searchParams.set('skip', String(params.skip));
    if (params.limit !== undefined) searchParams.set('limit', String(params.limit));

    const qs = searchParams.toString();
    return this.request<User[]>(`/users${qs ? `?${qs}` : ''}`);
  }

  async createUser(payload: {
    email: string;
    username: string;
    full_name: string;
    phone?: string;
    password: string;
    department_id?: string;
    role_ids: string[];
    vendor_id?: string;
  }): Promise<User> {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateUser(userId: string, payload: {
    full_name?: string;
    phone?: string;
    department_id?: string;
    role_ids?: string[];
    is_active?: boolean;
  }): Promise<User> {
    return this.request<User>(`/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async toggleUserStatus(userId: string): Promise<User> {
    return this.request<User>(`/users/${userId}/toggle-status`, {
      method: 'POST',
    });
  }

  async getDepartments(): Promise<Department[]> {
    return this.request<Department[]>('/users/meta/departments');
  }

  async getRoles(): Promise<Role[]> {
    return this.request<Role[]>('/users/meta/roles');
  }

  // --- Audit APIs ---
  async getAuditEvents(params: {
    action?: string;
    entity_type?: string;
    entity_id?: string;
    actor_email?: string;
    skip?: number;
    limit?: number;
  } = {}): Promise<AuditEvent[]> {
    const searchParams = new URLSearchParams();
    if (params.action) searchParams.set('action', params.action);
    if (params.entity_type) searchParams.set('entity_type', params.entity_type);
    if (params.entity_id) searchParams.set('entity_id', params.entity_id);
    if (params.actor_email) searchParams.set('actor_email', params.actor_email);
    if (params.skip !== undefined) searchParams.set('skip', String(params.skip));
    if (params.limit !== undefined) searchParams.set('limit', String(params.limit));

    const qs = searchParams.toString();
    return this.request<AuditEvent[]>(`/audit${qs ? `?${qs}` : ''}`);
  }

  // --- Dashboard APIs ---
  async getDashboardFilters(): Promise<any> {
    return this.request<any>('/dashboard/filters');
  }

  async getDashboardMetrics(params: {
    project_id?: string;
    zone_id?: string;
    category?: string;
    vendor_id?: string;
    status?: string;
    risk_level?: string;
  } = {}): Promise<any> {
    const searchParams = new URLSearchParams();
    if (params.project_id) searchParams.set('project_id', params.project_id);
    if (params.zone_id) searchParams.set('zone_id', params.zone_id);
    if (params.category) searchParams.set('category', params.category);
    if (params.vendor_id) searchParams.set('vendor_id', params.vendor_id);
    if (params.status) searchParams.set('status', params.status);
    if (params.risk_level) searchParams.set('risk_level', params.risk_level);

    const qs = searchParams.toString();
    return this.request<any>(`/dashboard/metrics${qs ? `?${qs}` : ''}`);
  }

  async getDashboardVisualizations(params: {
    project_id?: string;
    zone_id?: string;
    category?: string;
    vendor_id?: string;
    status?: string;
    risk_level?: string;
  } = {}): Promise<any> {
    const searchParams = new URLSearchParams();
    if (params.project_id) searchParams.set('project_id', params.project_id);
    if (params.zone_id) searchParams.set('zone_id', params.zone_id);
    if (params.category) searchParams.set('category', params.category);
    if (params.vendor_id) searchParams.set('vendor_id', params.vendor_id);
    if (params.status) searchParams.set('status', params.status);
    if (params.risk_level) searchParams.set('risk_level', params.risk_level);

    const qs = searchParams.toString();
    return this.request<any>(`/dashboard/visualizations${qs ? `?${qs}` : ''}`);
  }

  async getDashboardActionQueue(): Promise<any[]> {
    return this.request<any[]>('/dashboard/action-queue');
  }

  // --- Project & Work Package APIs ---
  async getProjects(params: {
    search?: string;
    category?: string;
    status?: string;
    zone_id?: string;
    skip?: number;
    limit?: number;
  } = {}): Promise<any[]> {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.set('search', params.search);
    if (params.category) searchParams.set('category', params.category);
    if (params.status) searchParams.set('status', params.status);
    if (params.zone_id) searchParams.set('zone_id', params.zone_id);
    if (params.skip !== undefined) searchParams.set('skip', String(params.skip));
    if (params.limit !== undefined) searchParams.set('limit', String(params.limit));

    const qs = searchParams.toString();
    return this.request<any[]>(`/projects${qs ? `?${qs}` : ''}`);
  }

  async getProjectDetail(projectId: string): Promise<any> {
    return this.request<any>(`/projects/${projectId}`);
  }

  async createProject(payload: any): Promise<any> {
    return this.request<any>('/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateProject(projectId: string, payload: any): Promise<any> {
    return this.request<any>(`/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async createWorkPackage(projectId: string, payload: any): Promise<any> {
    return this.request<any>(`/projects/${projectId}/work-packages`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateWorkPackageStatus(workPackageId: string, targetState: string, reason?: string): Promise<any> {
    return this.request<any>(`/projects/work-packages/${workPackageId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ target_state: targetState, reason }),
    });
  }

  async createMilestone(workPackageId: string, payload: any): Promise<any> {
    return this.request<any>(`/projects/work-packages/${workPackageId}/milestones`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }


  exportProjectsCsvUrl(): string {
    return `${API_BASE}/projects/export/csv`;
  }

  // --- Vendor & Progress Submission APIs (Module 4) ---
  async getVendors(params?: { search?: string; status?: string; category?: string }): Promise<Vendor[]> {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.status) q.append('status', params.status);
    if (params?.category) q.append('category', params.category);
    const query = q.toString() ? `?${q.toString()}` : '';
    return this.request<Vendor[]>(`/vendors${query}`);
  }

  async getVendorById(id: string): Promise<Vendor> {
    return this.request<Vendor>(`/vendors/${id}`);
  }

  async registerVendor(payload: any): Promise<Vendor> {
    return this.request<Vendor>('/vendors', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateVendor(id: string, payload: any): Promise<Vendor> {
    return this.request<Vendor>(`/vendors/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async getVendorDashboard(id: string): Promise<VendorDashboardData> {
    return this.request<VendorDashboardData>(`/vendors/${id}/dashboard`);
  }

  async getMyVendorDashboard(): Promise<VendorDashboardData> {
    return this.request<VendorDashboardData>('/vendors/me/dashboard');
  }

  async getProgressSubmissions(params?: { work_package_id?: string; vendor_id?: string; review_status?: string }): Promise<ProgressSubmission[]> {
    const q = new URLSearchParams();
    if (params?.work_package_id) q.append('work_package_id', params.work_package_id);
    if (params?.vendor_id) q.append('vendor_id', params.vendor_id);
    if (params?.review_status) q.append('review_status', params.review_status);
    const query = q.toString() ? `?${q.toString()}` : '';
    return this.request<ProgressSubmission[]>(`/vendors/progress-submissions${query}`);
  }

  async submitProgress(payload: ProgressSubmissionCreate): Promise<ProgressSubmission> {
    return this.request<ProgressSubmission>('/vendors/progress-submissions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async reviewProgressSubmission(id: string, payload: SubmissionReviewRequest): Promise<ProgressSubmission> {
    return this.request<ProgressSubmission>(`/vendors/progress-submissions/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  // --- Module 5: Field Verification & Inspections APIs ---
  async getInspections(params?: {
    work_package_id?: string;
    project_id?: string;
    inspector_id?: string;
    outcome?: string;
    inspection_type?: string;
    zone_id?: string;
    search?: string;
  }): Promise<Inspection[]> {
    const q = new URLSearchParams();
    if (params?.work_package_id) q.append('work_package_id', params.work_package_id);
    if (params?.project_id) q.append('project_id', params.project_id);
    if (params?.inspector_id) q.append('inspector_id', params.inspector_id);
    if (params?.outcome) q.append('outcome', params.outcome);
    if (params?.inspection_type) q.append('inspection_type', params.inspection_type);
    if (params?.zone_id) q.append('zone_id', params.zone_id);
    if (params?.search) q.append('search', params.search);
    const query = q.toString() ? `?${q.toString()}` : '';
    return this.request<Inspection[]>(`/inspections${query}`);
  }

  async getInspectionStats(): Promise<InspectionStats> {
    return this.request<InspectionStats>('/inspections/stats');
  }

  async getInspection(id: string): Promise<Inspection> {
    return this.request<Inspection>(`/inspections/${id}`);
  }

  async scheduleInspection(payload: InspectionCreateRequest): Promise<Inspection> {
    return this.request<Inspection>('/inspections', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async executeInspection(id: string, payload: InspectionExecuteRequest): Promise<Inspection> {
    return this.request<Inspection>(`/inspections/${id}/execute`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async reviewInspection(id: string, payload: InspectionReviewRequest): Promise<Inspection> {
    return this.request<Inspection>(`/inspections/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  // --- Module 6: Defects, Corrective Action & Rework APIs ---
  async getDefects(params?: {
    work_package_id?: string;
    project_id?: string;
    vendor_id?: string;
    severity?: string;
    status?: string;
    zone_id?: string;
    search?: string;
  }): Promise<Defect[]> {
    const q = new URLSearchParams();
    if (params?.work_package_id) q.append('work_package_id', params.work_package_id);
    if (params?.project_id) q.append('project_id', params.project_id);
    if (params?.vendor_id) q.append('vendor_id', params.vendor_id);
    if (params?.severity) q.append('severity', params.severity);
    if (params?.status) q.append('status', params.status);
    if (params?.zone_id) q.append('zone_id', params.zone_id);
    if (params?.search) q.append('search', params.search);
    const query = q.toString() ? `?${q.toString()}` : '';
    return this.request<Defect[]>(`/defects${query}`);
  }

  async getDefectStats(): Promise<DefectStats> {
    return this.request<DefectStats>('/defects/stats');
  }

  async getDefect(id: string): Promise<Defect> {
    return this.request<Defect>(`/defects/${id}`);
  }

  async createDefect(payload: DefectCreateRequest): Promise<Defect> {
    return this.request<Defect>('/defects', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async submitDefectRework(id: string, payload: DefectVendorReworkRequest): Promise<Defect> {
    return this.request<Defect>(`/defects/${id}/rework`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async reinspectDefect(id: string, payload: DefectReinspectRequest): Promise<Defect> {
    return this.request<Defect>(`/defects/${id}/reinspect`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async closeDefect(id: string, payload: DefectCloseRequest): Promise<Defect> {
    return this.request<Defect>(`/defects/${id}/close`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // --- Module 7 Municipal Asset Registry & QR Traceability APIs ---
  async getAssets(params?: {
    category?: string;
    lifecycle_status?: string;
    zone_id?: string;
    project_id?: string;
    search?: string;
  }): Promise<Asset[]> {
    const q = new URLSearchParams();
    if (params?.category) q.append('category', params.category);
    if (params?.lifecycle_status) q.append('lifecycle_status', params.lifecycle_status);
    if (params?.zone_id) q.append('zone_id', params.zone_id);
    if (params?.project_id) q.append('project_id', params.project_id);
    if (params?.search) q.append('search', params.search);
    const query = q.toString() ? `?${q.toString()}` : '';
    return this.request<Asset[]>(`/assets${query}`);
  }

  async getAssetStats(): Promise<AssetStats> {
    return this.request<AssetStats>('/assets/stats');
  }

  async getAsset(id: string): Promise<Asset> {
    return this.request<Asset>(`/assets/${id}`);
  }

  async lookupAssetByQR(qrIdentifier: string): Promise<Asset> {
    return this.request<Asset>(`/assets/lookup/qr/${encodeURIComponent(qrIdentifier)}`);
  }

  async getAssetQRLabel(id: string): Promise<AssetQRLabel> {
    return this.request<AssetQRLabel>(`/assets/${id}/qr-label`);
  }

  async createAsset(payload: AssetCreateRequest): Promise<Asset> {
    return this.request<Asset>('/assets', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateAsset(id: string, payload: AssetUpdateRequest): Promise<Asset> {
    return this.request<Asset>(`/assets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async transitionAsset(id: string, payload: AssetTransitionRequest): Promise<Asset> {
    return this.request<Asset>(`/assets/${id}/transition`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async addAssetMaintenance(id: string, payload: AssetMaintenanceRequest): Promise<Asset> {
    return this.request<Asset>(`/assets/${id}/maintenance`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async addAssetEvidence(id: string, payload: AssetEvidenceRequest): Promise<Asset> {
    return this.request<Asset>(`/assets/${id}/evidence`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // --- Readiness Chain & Risk Engine ---
  async getReadinessDashboard(params?: {
    project_id?: string;
    zone_id?: string;
    category?: string;
    risk_category?: string;
  }): Promise<ReadinessDashboardSummary> {
    const query = new URLSearchParams();
    if (params?.project_id) query.append('project_id', params.project_id);
    if (params?.zone_id) query.append('zone_id', params.zone_id);
    if (params?.category) query.append('category', params.category);
    if (params?.risk_category) query.append('risk_category', params.risk_category);
    const qs = query.toString();
    return this.request<ReadinessDashboardSummary>(`/readiness/dashboard${qs ? `?${qs}` : ''}`);
  }

  async getReadinessChain(workPackageId: string): Promise<ReadinessChainResponse> {
    return this.request<ReadinessChainResponse>(`/readiness/work-packages/${encodeURIComponent(workPackageId)}/chain`);
  }

  async getWorkPackageRisk(workPackageId: string): Promise<WorkPackageRiskEvaluation> {
    return this.request<WorkPackageRiskEvaluation>(`/readiness/work-packages/${encodeURIComponent(workPackageId)}/risk`);
  }

  async validateAcceptance(workPackageId: string): Promise<AcceptanceValidationResult> {
    return this.request<AcceptanceValidationResult>(`/readiness/work-packages/${encodeURIComponent(workPackageId)}/validate-acceptance`, {
      method: 'POST',
    });
  }

  async acceptWorkPackage(workPackageId: string, payload: AcceptanceTransitionRequest): Promise<any> {
    return this.request<any>(`/readiness/work-packages/${encodeURIComponent(workPackageId)}/accept`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // --- Module 9: Readiness Dependency Graph & Risk Engine ---
  async getDependencyGraph(projectId?: string): Promise<DependencyGraphResponse> {
    const qs = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
    return this.request<DependencyGraphResponse>(`/dependencies/graph${qs}`);
  }

  async simulateDelayImpact(payload: DelayImpactSimulationRequest): Promise<DelayImpactSimulationResponse> {
    return this.request<DelayImpactSimulationResponse>('/dependencies/simulate-impact', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async addMilestoneDependency(arg1: AddDependencyRequest | string, arg2?: string): Promise<any> {
    const payload: AddDependencyRequest = typeof arg1 === 'string'
      ? { milestone_id: arg1, depends_on_id: arg2! }
      : arg1;
    return this.request<any>('/dependencies', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async deleteMilestoneDependency(milestoneId: string, dependsOnId: string): Promise<any> {
    const qs = `?milestone_id=${encodeURIComponent(milestoneId)}&depends_on_id=${encodeURIComponent(dependsOnId)}`;
    return this.request<any>(`/dependencies${qs}`, {
      method: 'DELETE',
    });
  }

  // --- Geographic Map & Zone Monitoring (Module 10) ---
  async getMapFeatures(params?: MapFilterParams): Promise<MapFeatureCollection> {
    const q = new URLSearchParams();
    if (params?.zone_id && params.zone_id !== 'All') q.append('zone_id', params.zone_id);
    if (params?.entity_type && params.entity_type !== 'All') q.append('entity_type', params.entity_type);
    if (params?.category && params.category !== 'All') q.append('category', params.category);
    if (params?.status && params.status !== 'All') q.append('status', params.status);
    if (params?.search) q.append('search', params.search);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.request<MapFeatureCollection>(`/map/features${qs}`);
  }

  async getMapZones(): Promise<ZoneGeoBoundary[]> {
    return this.request<ZoneGeoBoundary[]>('/map/zones');
  }

  // --- Offline-First Field Workflows (Module 11) ---
  async getAssignedInspectionsForOffline(): Promise<OfflineInspectionDownload[]> {
    return this.request<OfflineInspectionDownload[]>('/offline/assigned-inspections');
  }

  async syncOfflineBatch(batch: SyncBatchRequest): Promise<SyncBatchResponse> {
    return this.request<SyncBatchResponse>('/offline/sync', {
      method: 'POST',
      body: JSON.stringify(batch),
    });
  }

  // --- Reports, Exports, & Audit History (Module 12) ---
  async getReportTypes(): Promise<ReportTypeOption[]> {
    return this.request<ReportTypeOption[]>('/reports/types');
  }

  async getReportData(filters: ReportFilterParams): Promise<ReportDataResponse> {
    return this.request<ReportDataResponse>('/reports/data', {
      method: 'POST',
      body: JSON.stringify(filters),
    });
  }

  async downloadReportCsv(params: Partial<ReportFilterParams>): Promise<Blob> {
    const q = new URLSearchParams();
    if (params.report_type) q.append('report_type', params.report_type);
    if (params.zone_id && params.zone_id !== 'All') q.append('zone_id', params.zone_id);
    if (params.category && params.category !== 'All') q.append('category', params.category);
    if (params.status && params.status !== 'All') q.append('status', params.status);
    if (params.risk_level && params.risk_level !== 'All') q.append('risk_level', params.risk_level);
    if (params.search) q.append('search', params.search);

    const qs = q.toString() ? `?${q.toString()}` : '';
    const url = `${API_BASE}/reports/export/csv${qs}`;

    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(url, { headers, credentials: 'same-origin' });
    if (!res.ok) {
      let err = 'Export failed';
      try {
        const json = await res.json();
        err = json.detail || err;
      } catch {
        err = `HTTP ${res.status}: ${res.statusText}`;
      }
      throw new Error(err);
    }
    return res.blob();
  }

  // --- Notifications & Task Management (Module 13) ---
  async getNotifications(params?: {
    unread_only?: boolean;
    trigger_type?: string;
    severity?: string;
    limit?: number;
    offset?: number;
  }): Promise<NotificationListResponse> {
    const q = new URLSearchParams();
    if (params?.unread_only) q.append('unread_only', 'true');
    if (params?.trigger_type && params.trigger_type !== 'All') q.append('trigger_type', params.trigger_type);
    if (params?.severity && params.severity !== 'All') q.append('severity', params.severity);
    if (params?.limit) q.append('limit', String(params.limit));
    if (params?.offset) q.append('offset', String(params.offset));
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.request<NotificationListResponse>(`/notifications${qs}`);
  }


  async getUnreadNotificationCount(): Promise<number> {
    const res = await this.request<{ unread_count: number }>('/notifications/unread-count');
    return res.unread_count;
  }

  async markNotificationRead(id: string): Promise<NotificationItem> {
    return this.request<NotificationItem>(`/notifications/${id}/read`, {
      method: 'POST',
    });
  }

  async markAllNotificationsRead(): Promise<{ marked_count: number }> {
    return this.request<{ marked_count: number }>('/notifications/mark-all-read', {
      method: 'POST',
    });
  }

  async getMyTasks(params?: {
    task_type?: string;
    priority?: string;
    due_status?: string;
    search?: string;
  }): Promise<MyTasksResponse> {
    const q = new URLSearchParams();
    if (params?.task_type && params.task_type !== 'All') q.append('task_type', params.task_type);
    if (params?.priority && params.priority !== 'All') q.append('priority', params.priority);
    if (params?.due_status && params.due_status !== 'All') q.append('due_status', params.due_status);
    if (params?.search) q.append('search', params.search);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.request<MyTasksResponse>(`/notifications/my-tasks${qs}`);
  }

  async getExternalChannelsStatus(): Promise<ExternalChannelsStatusResponse> {
    return this.request<ExternalChannelsStatusResponse>('/notifications/external-channels-status');
  }

  // --- Administration & Configuration (Module 14 - Section 19) ---
  async getRolesMatrix(): Promise<RoleMatrixResponse> {
    return this.request<RoleMatrixResponse>('/admin/roles-matrix');
  }

  async updateRolePermissions(roleId: string, permissionIds: string[]): Promise<RoleMatrixItem> {
    return this.request<RoleMatrixItem>(`/admin/roles/${roleId}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permission_ids: permissionIds }),
    });
  }

  async createCustomRole(data: { name: string; description?: string; permission_ids: string[] }): Promise<RoleMatrixItem> {
    return this.request<RoleMatrixItem>('/admin/roles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAdminDepartments(): Promise<DepartmentDetailResponse[]> {
    return this.request<DepartmentDetailResponse[]>('/admin/departments');
  }

  async createDepartment(data: { code: string; name: string; description?: string }): Promise<DepartmentDetailResponse> {
    return this.request<DepartmentDetailResponse>('/admin/departments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAdminZones(): Promise<ZoneAdminResponse[]> {
    return this.request<ZoneAdminResponse[]>('/admin/zones');
  }

  async createZone(data: { code: string; name: string; description?: string; latitude: number; longitude: number }): Promise<ZoneAdminResponse> {
    return this.request<ZoneAdminResponse>('/admin/zones', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getChecklistTemplates(category?: string): Promise<ChecklistTemplateResponse[]> {
    const q = category && category !== 'All' ? `?category=${encodeURIComponent(category)}` : '';
    return this.request<ChecklistTemplateResponse[]>(`/admin/checklist-templates${q}`);
  }

  async createChecklistTemplate(data: ChecklistTemplateCreateRequest): Promise<ChecklistTemplateResponse> {
    return this.request<ChecklistTemplateResponse>('/admin/checklist-templates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSystemConfig(): Promise<SystemConfigResponse> {
    return this.request<SystemConfigResponse>('/admin/system-config');
  }

  async updateSystemConfig(data: SystemConfigUpdateRequest): Promise<SystemConfigResponse> {
    return this.request<SystemConfigResponse>('/admin/system-config', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async resetDemoData(confirmationCode: string): Promise<DemoDataResetResponse> {
    return this.request<DemoDataResetResponse>('/admin/demo-data-reset', {
      method: 'POST',
      body: JSON.stringify({ confirmation_code: confirmationCode }),
    });
  }
}

export const api = new ApiClient();



