export interface Permission {
  id: string;
  name: string;
  category: string;
  description?: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  is_system_role: boolean;
  permissions: Permission[];
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  phone?: string;
  department_id?: string;
  department?: Department;
  vendor_id?: string;
  is_active: boolean;
  roles: Role[];
  permissions: string[];
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface AuditEvent {
  id: string;
  event_id: string;
  actor_id?: string;
  actor_email?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  reason?: string;
  details?: Record<string, any>;
  ip_address?: string;
  created_at: string;
}
