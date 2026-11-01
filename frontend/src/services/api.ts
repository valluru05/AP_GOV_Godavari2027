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


const API_BASE = '/api/v1';

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
}

export const api = new ApiClient();

