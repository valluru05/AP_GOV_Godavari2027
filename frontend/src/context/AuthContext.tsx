import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types/auth';
import { api } from '../services/api';

export interface DemoAccount {
  roleId: string;
  roleName: string;
  email: string;
  name: string;
  description: string;
  department: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    roleId: 'super_admin',
    roleName: 'Super Administrator',
    email: 'superadmin@civicproof.gov.in',
    name: 'Sri K. Ramesh Babu, IAS',
    description: 'Full oversight, role & permission control, system audit logs',
    department: 'MUNI-HQ (Headquarters)'
  },
  {
    roleId: 'municipal_admin',
    roleName: 'Municipal Administrator',
    email: 'muniadmin@civicproof.gov.in',
    name: 'P. Venkat Rao',
    description: 'Jurisdiction-wide authority, project assignment, final acceptance',
    department: 'MUNI-HQ (Command)'
  },
  {
    roleId: 'project_manager',
    roleName: 'Project Manager',
    email: 'pm@civicproof.gov.in',
    name: 'V. Krishna Mohan',
    description: 'Milestone tracking, vendor progress review, inspection requests',
    department: 'PWD-WTR (Water Works)'
  },
  {
    roleId: 'field_inspector',
    roleName: 'Field Inspector',
    email: 'inspector@civicproof.gov.in',
    name: 'M. Suresh Kumar',
    description: 'Mobile on-site inspection, checklists, defect logging, re-inspection',
    department: 'QA-INSP (Field Cell)'
  },
  {
    roleId: 'vendor',
    roleName: 'Vendor / Contractor',
    email: 'vendor@infra-ap.com',
    name: 'Rajesh Varma',
    description: 'Submits progress updates, uploads evidence, addresses defects',
    department: 'Godavari Infra Engg'
  },
  {
    roleId: 'asset_manager',
    roleName: 'Asset Manager',
    email: 'assets@civicproof.gov.in',
    name: 'T. Lakshmi Narayana',
    description: 'Manages municipal asset registry, QR codes, lifecycle status',
    department: 'PWD-WTR (Asset Div)'
  },
  {
    roleId: 'read_only_reviewer',
    roleName: 'Read-Only Reviewer',
    email: 'reviewer@audit.gov.in',
    name: 'Dr. S. Padmavathi',
    description: 'Vigilance & audit oversight, read-only dashboard & report export',
    department: 'State Vigilance Cell'
  }
];

const DEMO_PASSWORDS: Record<string, string> = {
  'superadmin@civicproof.gov.in': 'AdminPass123!',
  'muniadmin@civicproof.gov.in': 'MuniPass123!',
  'pm@civicproof.gov.in': 'PMPass123!',
  'inspector@civicproof.gov.in': 'InspectorPass123!',
  'vendor@infra-ap.com': 'VendorPass123!',
  'assets@civicproof.gov.in': 'AssetPass123!',
  'reviewer@audit.gov.in': 'ReviewerPass123!',
};

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  quickLogin: (email: string) => Promise<void>;
  hasRole: (roleId: string) => boolean;
  hasPermission: (permissionId: string) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    try {
      if (api.getToken()) {
        const currentUser = await api.getMe();
        setUser(currentUser);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.warn('Failed to fetch authenticated user profile', err);
      api.setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (usernameOrEmail: string, password: string) => {
    setIsLoading(true);
    try {
      const resp = await api.login(usernameOrEmail, password);
      setUser(resp.user);
    } finally {
      setIsLoading(false);
    }
  };

  const quickLogin = async (email: string) => {
    const pwd = DEMO_PASSWORDS[email] || 'AdminPass123!';
    await login(email, pwd);
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
    }
  };

  const hasRole = (roleId: string): boolean => {
    if (!user) return false;
    return user.roles.some((r) => r.id === roleId);
  };

  const hasPermission = (permissionId: string): boolean => {
    if (!user) return false;
    if (hasRole('super_admin')) return true;
    return user.permissions.includes(permissionId);
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        quickLogin,
        hasRole,
        hasPermission,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
