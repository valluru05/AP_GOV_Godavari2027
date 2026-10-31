import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  CheckCircle,
  XCircle,
  Key,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { api } from '../../services/api';
import type { User, Role, Department } from '../../types/auth';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';

export const UsersPage: React.FC = () => {
  const { user: currentUser, hasPermission } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedDept, setSelectedDept] = useState('');

  // Create User Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formFullName, setFormFullName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formDeptId, setFormDeptId] = useState('');
  const [formSelectedRoles, setFormSelectedRoles] = useState<string[]>(['field_inspector']);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Role Matrix Modal
  const [matrixModalOpen, setMatrixModalOpen] = useState(false);

  const canManageUsers = hasPermission('users:manage');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersData, rolesData, deptsData] = await Promise.all([
        api.getUsers({
          search: search || undefined,
          role_id: selectedRole || undefined,
          department_id: selectedDept || undefined,
        }),
        api.getRoles(),
        api.getDepartments(),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
      setDepartments(deptsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load user records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, selectedRole, selectedDept]);

  const handleToggleStatus = async (userToToggle: User) => {
    if (!canManageUsers) return;
    if (userToToggle.id === currentUser?.id) {
      alert('You cannot deactivate your own administrative account.');
      return;
    }
    try {
      await api.toggleUserStatus(userToToggle.id);
      await loadData();
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSubmitting(true);
    try {
      await api.createUser({
        full_name: formFullName,
        email: formEmail,
        username: formUsername,
        phone: formPhone || undefined,
        password: formPassword,
        department_id: formDeptId || undefined,
        role_ids: formSelectedRoles,
      });
      setCreateModalOpen(false);
      // Reset form
      setFormFullName('');
      setFormEmail('');
      setFormUsername('');
      setFormPhone('');
      setFormPassword('');
      setFormDeptId('');
      setFormSelectedRoles(['field_inspector']);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create user');
    } finally {
      setFormSubmitting(false);
    }
  };

  const toggleRoleSelection = (roleId: string) => {
    setFormSelectedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Title and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-6 rounded-xl border border-borderLight shadow-card">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-brand-light text-brand rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-textPrimary tracking-tight">
              User & Role Access Management
            </h1>
          </div>
          <p className="text-xs text-textSecondary mt-1">
            Authoritative registry of municipal engineers, event officers, inspectors, and contractors.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Key className="w-4 h-4" />}
            onClick={() => setMatrixModalOpen(true)}
          >
            Role & Permission Matrix
          </Button>
          {canManageUsers && (
            <Button
              variant="primary"
              size="sm"
              icon={<UserPlus className="w-4 h-4" />}
              onClick={() => setCreateModalOpen(true)}
            >
              Add New User
            </Button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface p-4 rounded-xl border border-borderLight shadow-subtle flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-textSecondary absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, email, or username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-borderLight rounded-lg text-textPrimary focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-borderLight rounded-lg text-textPrimary focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>

          {/* Role Filter */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-borderLight rounded-lg text-textPrimary focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="">All Roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
            onClick={() => loadData()}
            title="Refresh"
          >
            Reload
          </Button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-govError-light border border-govError-border rounded-xl text-xs text-govError flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-surface rounded-xl border border-borderLight shadow-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-textSecondary text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand" />
            Loading municipal user directory...
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-textSecondary text-xs">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-textPrimary">No matching accounts found</p>
            <p className="mt-1">Try refining search parameters or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-borderLight text-textSecondary font-semibold">
                  <th className="py-3 px-4">User Details</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Assigned Roles</th>
                  <th className="py-3 px-4">Permissions</th>
                  <th className="py-3 px-4">Status</th>
                  {canManageUsers && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-borderLight/60">
                {users.map((u) => {
                  const isCurrent = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-brand font-bold flex items-center justify-center shrink-0 text-xs">
                            {u.full_name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-textPrimary flex items-center gap-1.5">
                              <span>{u.full_name}</span>
                              {isCurrent && (
                                <span className="text-[10px] bg-sky-100 text-sky-800 px-1.5 py-0.2 rounded font-normal">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-textSecondary text-[11px] font-mono mt-0.5">
                              {u.email} • @{u.username}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {u.department ? (
                          <div>
                            <span className="font-medium text-textPrimary">{u.department.name}</span>
                            <span className="block text-[11px] text-textSecondary font-mono">
                              [{u.department.code}]
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">External / Vendor</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {u.roles.map((r) => (
                            <Badge key={r.id} variant="brand" size="sm">
                              {r.name}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-600 font-mono text-[11px]">
                          {u.permissions.length} actions permitted
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {u.is_active ? (
                          <Badge variant="success" size="sm" icon={<CheckCircle className="w-3 h-3" />}>
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="error" size="sm" icon={<XCircle className="w-3 h-3" />}>
                            Deactivated
                          </Badge>
                        )}
                      </td>
                      {canManageUsers && (
                        <td className="py-3 px-4 text-right">
                          <button
                            disabled={isCurrent}
                            onClick={() => handleToggleStatus(u)}
                            className={`px-2 py-1 text-[11px] font-medium rounded border transition-colors ${
                              isCurrent
                                ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200'
                                : u.is_active
                                ? 'border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100'
                                : 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                            }`}
                          >
                            {u.is_active ? 'Deactivate' : 'Reactivate'}
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add New User Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Add Municipal User"
        description="Creates an authorized account with encrypted password and assigned role permissions."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          {formError && (
            <div className="p-3 bg-govError-light border border-govError-border rounded-lg text-xs text-govError flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-textPrimary mb-1">Full Official Name</label>
              <input
                type="text"
                required
                placeholder="e.g. B. Nageswara Rao"
                value={formFullName}
                onChange={(e) => setFormFullName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-borderLight rounded-lg text-textPrimary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-textPrimary mb-1">Official Email</label>
              <input
                type="email"
                required
                placeholder="e.g. nageswar@civicproof.gov.in"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-borderLight rounded-lg text-textPrimary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-textPrimary mb-1">Username</label>
              <input
                type="text"
                required
                placeholder="e.g. insp_nageswar"
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-borderLight rounded-lg text-textPrimary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-textPrimary mb-1">Phone Number</label>
              <input
                type="tel"
                placeholder="+91 883 2460010"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-borderLight rounded-lg text-textPrimary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-textPrimary mb-1">Initial Password (min 8 chars)</label>
            <input
              type="password"
              required
              minLength={8}
              placeholder="••••••••••••"
              value={formPassword}
              onChange={(e) => setFormPassword(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-borderLight rounded-lg text-textPrimary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-textPrimary mb-1">Department</label>
            <select
              value={formDeptId}
              onChange={(e) => setFormDeptId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-borderLight rounded-lg text-textPrimary"
            >
              <option value="">None (External / Vendor)</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-textPrimary mb-1.5">Assigned Roles</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border border-borderLight rounded-lg p-2.5 bg-slate-50/50">
              {roles.map((r) => {
                const checked = formSelectedRoles.includes(r.id);
                return (
                  <label
                    key={r.id}
                    className={`flex items-start gap-2 p-2 rounded cursor-pointer border text-xs transition-colors ${
                      checked
                        ? 'bg-brand-light/50 border-brand/40 text-brand font-medium'
                        : 'bg-surface border-borderLight text-textSecondary'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRoleSelection(r.id)}
                      className="mt-0.5 rounded text-brand focus:ring-brand"
                    />
                    <div>
                      <span className="font-semibold block">{r.name}</span>
                      <span className="text-[10px] text-textSecondary block leading-tight">
                        {r.description}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-borderLight">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={formSubmitting}>
              Create Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Role & Permission Matrix Inspector Modal */}
      <Modal
        isOpen={matrixModalOpen}
        onClose={() => setMatrixModalOpen(false)}
        title="Configured Role & Permission Matrix"
        description="Public-sector separation of duties: fine-grained action boundaries enforced on backend APIs."
        maxWidth="2xl"
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {roles.map((r) => (
            <div key={r.id} className="border border-borderLight rounded-lg p-3 bg-slate-50/40">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm text-brand">{r.name}</span>
                <span className="text-[11px] text-textSecondary font-mono">{r.id}</span>
              </div>
              <p className="text-xs text-textSecondary mb-2">{r.description}</p>
              <div className="flex flex-wrap gap-1">
                {r.permissions.map((p) => (
                  <span
                    key={p.id}
                    className="text-[10px] font-mono bg-white border border-borderLight px-2 py-0.5 rounded text-slate-700"
                    title={p.description}
                  >
                    {p.id}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
};
