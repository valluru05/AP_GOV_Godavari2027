import type { User, TokenResponse, Department, Role, AuditEvent } from '../types/auth';

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

  async addMilestoneDependency(milestoneId: string, dependencyId: string): Promise<any> {
    return this.request<any>(`/projects/milestones/${milestoneId}/dependencies`, {
      method: 'POST',
      body: JSON.stringify({ dependency_milestone_id: dependencyId }),
    });
  }

  exportProjectsCsvUrl(): string {
    return `${API_BASE}/projects/export/csv`;
  }
}

export const api = new ApiClient();
