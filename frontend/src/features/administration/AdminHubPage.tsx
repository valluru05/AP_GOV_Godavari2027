import React, { useState, useEffect } from 'react';
import {
  Shield,
  Key,
  Building2,
  MapPin,
  CheckSquare,
  Sliders,
  RotateCcw,
  Plus,
  Save,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Lock,
  Layers,
  Clock,
  Trash2,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import type {
  RoleMatrixResponse,
  RoleMatrixItem,
  DepartmentDetailResponse,
  ZoneAdminResponse,
  ChecklistTemplateResponse,
  ChecklistItemDef,
  SystemConfigResponse,
  DemoDataResetResponse,
} from '../../types/admin';

export const AdminHubPage: React.FC = () => {
  const { hasRole } = useAuth();
  const isSuperAdmin = hasRole('super_admin');

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    'roles' | 'departments' | 'zones' | 'checklists' | 'governance' | 'demo_reset'
  >('roles');

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Tab 1: Roles Matrix State
  const [rolesMatrix, setRolesMatrix] = useState<RoleMatrixResponse | null>(null);
  const [selectedRole, setSelectedRole] = useState<RoleMatrixItem | null>(null);
  const [editablePermissions, setEditablePermissions] = useState<string[]>([]);
  const [newRoleModalOpen, setNewRoleModalOpen] = useState<boolean>(false);
  const [newRoleName, setNewRoleName] = useState<string>('');
  const [newRoleDesc, setNewRoleDesc] = useState<string>('');

  // Tab 2: Departments State
  const [departments, setDepartments] = useState<DepartmentDetailResponse[]>([]);
  const [newDeptModalOpen, setNewDeptModalOpen] = useState<boolean>(false);
  const [newDeptCode, setNewDeptCode] = useState<string>('');
  const [newDeptName, setNewDeptName] = useState<string>('');
  const [newDeptDesc, setNewDeptDesc] = useState<string>('');

  // Tab 3: Zones State
  const [zones, setZones] = useState<ZoneAdminResponse[]>([]);
  const [newZoneModalOpen, setNewZoneModalOpen] = useState<boolean>(false);
  const [newZoneCode, setNewZoneCode] = useState<string>('');
  const [newZoneName, setNewZoneName] = useState<string>('');
  const [newZoneDesc, setNewZoneDesc] = useState<string>('');
  const [newZoneLat, setNewZoneLat] = useState<string>('16.9944');
  const [newZoneLng, setNewZoneLng] = useState<string>('81.7678');

  // Tab 4: Checklist Templates State
  const [templates, setTemplates] = useState<ChecklistTemplateResponse[]>([]);
  const [templateFilterCategory, setTemplateFilterCategory] = useState<string>('All');
  const [newTemplateModalOpen, setNewTemplateModalOpen] = useState<boolean>(false);
  const [newTplCode, setNewTplCode] = useState<string>('');
  const [newTplName, setNewTplName] = useState<string>('');
  const [newTplCat, setNewTplCat] = useState<string>('Drinking Water');
  const [newTplDesc, setNewTplDesc] = useState<string>('');
  const [newTplItems, setNewTplItems] = useState<ChecklistItemDef[]>([
    {
      id: 'item-1',
      title: 'Structural foundation integrity and torque check',
      check_type: 'pass_fail',
      mandatory: true,
      requires_photo: true,
      acceptance_criteria: 'Zero fissures, torque verified to IS 456 spec',
    },
    {
      id: 'item-2',
      title: 'Operational pressure / flow test',
      check_type: 'measurement',
      mandatory: true,
      requires_photo: true,
      acceptance_criteria: 'Continuous pressure >= 3.5 bar for 15 minutes',
    },
  ]);

  // Tab 5: Governance & Thresholds State
  const [systemConfig, setSystemConfig] = useState<SystemConfigResponse | null>(null);
  const [editableConfig, setEditableConfig] = useState<SystemConfigResponse | null>(null);

  // Tab 6: Demo Data & Invariant State
  const [resetModalOpen, setResetModalOpen] = useState<boolean>(false);
  const [resetConfirmCode, setResetConfirmCode] = useState<string>('');
  const [resetting, setResetting] = useState<boolean>(false);
  const [resetResult, setResetResult] = useState<DemoDataResetResponse | null>(null);
  const [invariantTestResult, setInvariantTestResult] = useState<string | null>(null);

  // Load active tab data
  const loadTabData = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      if (activeTab === 'roles') {
        const matrix = await api.getRolesMatrix();
        setRolesMatrix(matrix);
        if (!selectedRole && matrix.roles.length > 0) {
          setSelectedRole(matrix.roles[0]);
          setEditablePermissions(matrix.roles[0].permission_ids);
        } else if (selectedRole) {
          const fresh = matrix.roles.find((r) => r.id === selectedRole.id);
          if (fresh) {
            setSelectedRole(fresh);
            setEditablePermissions(fresh.permission_ids);
          }
        }
      } else if (activeTab === 'departments') {
        const depts = await api.getAdminDepartments();
        setDepartments(depts);
      } else if (activeTab === 'zones') {
        const z = await api.getAdminZones();
        setZones(z);
      } else if (activeTab === 'checklists') {
        const tpls = await api.getChecklistTemplates(templateFilterCategory);
        setTemplates(tpls);
      } else if (activeTab === 'governance') {
        const cfg = await api.getSystemConfig();
        setSystemConfig(cfg);
        setEditableConfig(JSON.parse(JSON.stringify(cfg)));
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load configuration data' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTabData();
  }, [activeTab, templateFilterCategory]);

  // Tab 1 handlers
  const handleSelectRole = (r: RoleMatrixItem) => {
    setSelectedRole(r);
    setEditablePermissions([...r.permission_ids]);
  };

  const handleTogglePermission = (permId: string) => {
    if (!editablePermissions) return;
    if (editablePermissions.includes(permId)) {
      setEditablePermissions(editablePermissions.filter((p) => p !== permId));
    } else {
      setEditablePermissions([...editablePermissions, permId]);
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setSaving(true);
    setFeedback(null);
    try {
      const updated = await api.updateRolePermissions(selectedRole.id, editablePermissions);
      setFeedback({
        type: 'success',
        message: `Role permissions for "${updated.name}" updated and audited successfully.`,
      });
      // Refresh matrix
      const matrix = await api.getRolesMatrix();
      setRolesMatrix(matrix);
      setSelectedRole(updated);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save role permissions' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    setSaving(true);
    try {
      const created = await api.createCustomRole({
        name: newRoleName.trim(),
        description: newRoleDesc.trim() || undefined,
        permission_ids: editablePermissions,
      });
      setNewRoleModalOpen(false);
      setNewRoleName('');
      setNewRoleDesc('');
      setFeedback({ type: 'success', message: `Custom role "${created.name}" created.` });
      const matrix = await api.getRolesMatrix();
      setRolesMatrix(matrix);
      setSelectedRole(created);
      setEditablePermissions(created.permission_ids);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to create role' });
    } finally {
      setSaving(false);
    }
  };

  // Tab 2 handlers
  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptCode.trim() || !newDeptName.trim()) return;
    setSaving(true);
    try {
      const dept = await api.createDepartment({
        code: newDeptCode.trim().toUpperCase(),
        name: newDeptName.trim(),
        description: newDeptDesc.trim() || undefined,
      });
      setNewDeptModalOpen(false);
      setNewDeptCode('');
      setNewDeptName('');
      setNewDeptDesc('');
      setFeedback({ type: 'success', message: `Department ${dept.name} (${dept.code}) created.` });
      const depts = await api.getAdminDepartments();
      setDepartments(depts);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to create department' });
    } finally {
      setSaving(false);
    }
  };

  // Tab 3 handlers
  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZoneCode.trim() || !newZoneName.trim()) return;
    setSaving(true);
    try {
      const z = await api.createZone({
        code: newZoneCode.trim().toUpperCase(),
        name: newZoneName.trim(),
        description: newZoneDesc.trim() || undefined,
        latitude: parseFloat(newZoneLat) || 16.9944,
        longitude: parseFloat(newZoneLng) || 81.7678,
      });
      setNewZoneModalOpen(false);
      setNewZoneCode('');
      setNewZoneName('');
      setNewZoneDesc('');
      setFeedback({ type: 'success', message: `Ghat / Zone ${z.name} registered.` });
      const allZones = await api.getAdminZones();
      setZones(allZones);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to register zone' });
    } finally {
      setSaving(false);
    }
  };

  // Tab 4 handlers
  const handleAddChecklistItem = () => {
    const nextId = `item-${newTplItems.length + 1}`;
    setNewTplItems([
      ...newTplItems,
      {
        id: nextId,
        title: '',
        check_type: 'pass_fail',
        mandatory: true,
        requires_photo: false,
        acceptance_criteria: '',
      },
    ]);
  };

  const handleRemoveChecklistItem = (index: number) => {
    if (newTplItems.length <= 1) return;
    setNewTplItems(newTplItems.filter((_, i) => i !== index));
  };

  const handleUpdateChecklistItem = (index: number, field: keyof ChecklistItemDef, val: any) => {
    const updated = [...newTplItems];
    updated[index] = { ...updated[index], [field]: val };
    setNewTplItems(updated);
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTplCode.trim() || !newTplName.trim()) return;
    setSaving(true);
    try {
      const created = await api.createChecklistTemplate({
        template_code: newTplCode.trim().toUpperCase(),
        name: newTplName.trim(),
        category: newTplCat,
        description: newTplDesc.trim() || undefined,
        items: newTplItems.filter((it) => it.title.trim().length > 0),
      });
      setNewTemplateModalOpen(false);
      setNewTplCode('');
      setNewTplName('');
      setNewTplDesc('');
      setFeedback({ type: 'success', message: `Checklist template "${created.name}" published.` });
      const tpls = await api.getChecklistTemplates(templateFilterCategory);
      setTemplates(tpls);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to publish template' });
    } finally {
      setSaving(false);
    }
  };

  // Tab 5 handlers
  const handleSaveGovernanceConfig = async () => {
    if (!editableConfig) return;
    setSaving(true);
    setFeedback(null);
    try {
      const updated = await api.updateSystemConfig({
        defect_sla_rules: editableConfig.defect_sla_rules,
        risk_weights: editableConfig.risk_weights,
        readiness_gate_thresholds: editableConfig.readiness_gate_thresholds,
        data_retention_days: editableConfig.data_retention_days,
      });
      setSystemConfig(updated);
      setEditableConfig(JSON.parse(JSON.stringify(updated)));
      setFeedback({ type: 'success', message: 'System governance thresholds and SLA rules updated and audited.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update governance configuration' });
    } finally {
      setSaving(false);
    }
  };

  // Tab 6 handlers
  const handleTestAuditPurgeInvariant = async () => {
    setInvariantTestResult(null);
    try {
      const res = await fetch('/api/v1/admin/audit-history', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('civicproof_token')}`,
        },
      });
      const data = await res.json();
      if (res.status === 403) {
        setInvariantTestResult(
          `Section 19 Invariant Enforced (HTTP 403 Forbidden): "${data.detail}"`
        );
      } else {
        setInvariantTestResult(`Unexpected response: HTTP ${res.status}`);
      }
    } catch (err: any) {
      setInvariantTestResult(`Invariant verification caught error: ${err.message}`);
    }
  };

  const handleExecuteReset = async () => {
    if (resetConfirmCode !== 'RESET-PUSHKARALU-2027') {
      alert('Confirmation code mismatch. Please enter RESET-PUSHKARALU-2027 exactly.');
      return;
    }
    setResetting(true);
    try {
      const res = await api.resetDemoData(resetConfirmCode);
      setResetResult(res);
      setResetModalOpen(false);
      setResetConfirmCode('');
      setFeedback({ type: 'success', message: res.message });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Demo data reset failed' });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center text-brand border border-sky-100">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Administration & System Configuration
              </h1>
              <p className="text-sm text-slate-500">
                Section 19 Platform Hub: RBAC Matrix, Department Directories, Ghat Registries, Inspection Checklists, and Governance Rules
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadTabData}
            icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
          <a
            href="/admin/users"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <Shield className="w-3.5 h-3.5 text-slate-500" />
            User Accounts
          </a>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span className="text-sm font-medium">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-bold uppercase tracking-wider hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2 gap-2 overflow-x-auto shadow-sm">
        <button
          onClick={() => setActiveTab('roles')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'roles'
              ? 'border-brand text-brand'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Key className="w-4 h-4" />
          Roles & Permissions Matrix
        </button>
        <button
          onClick={() => setActiveTab('departments')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'departments'
              ? 'border-brand text-brand'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Departments ({departments.length || '...'})
        </button>
        <button
          onClick={() => setActiveTab('zones')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'zones'
              ? 'border-brand text-brand'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <MapPin className="w-4 h-4" />
          Ghats & Spatial Zones ({zones.length || '...'})
        </button>
        <button
          onClick={() => setActiveTab('checklists')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'checklists'
              ? 'border-brand text-brand'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          Inspection Checklist Templates
        </button>
        <button
          onClick={() => setActiveTab('governance')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'governance'
              ? 'border-brand text-brand'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Risk Weights & SLAs
        </button>
        <button
          onClick={() => setActiveTab('demo_reset')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'demo_reset'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          Governance & Sandbox Reset
        </button>
      </div>

      {/* Tab 1: Roles & Permissions Matrix */}
      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Roles List Sidebar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                System & Custom Roles
              </h2>
              {isSuperAdmin && (
                <button
                  onClick={() => setNewRoleModalOpen(true)}
                  className="p-1 text-brand hover:bg-sky-50 rounded"
                  title="Create Custom Role"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="space-y-1">
              {rolesMatrix?.roles.map((r) => {
                const isSelected = selectedRole?.id === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => handleSelectRole(r)}
                    className={`w-full text-left p-3 rounded-lg border transition-all flex flex-col gap-1 ${
                      isSelected
                        ? 'bg-sky-50/80 border-sky-300 shadow-xs'
                        : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-bold ${isSelected ? 'text-brand' : 'text-slate-800'}`}>
                        {r.name}
                      </span>
                      <Badge
                        variant={r.is_system_role ? 'neutral' : 'brand'}
                        size="sm"
                      >
                        {r.is_system_role ? 'System' : 'Custom'}
                      </Badge>
                    </div>
                    {r.description && (
                      <p className="text-xs text-slate-500 line-clamp-1">{r.description}</p>
                    )}
                    <span className="text-[11px] text-slate-400 mt-1">
                      {r.permission_ids.length} permissions assigned
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Permissions Matrix for Selected Role */}
          <div className="lg:col-span-3 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
            {selectedRole ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-bold text-slate-900">{selectedRole.name}</h2>
                      <Badge variant={selectedRole.is_system_role ? 'neutral' : 'brand'}>
                        {selectedRole.is_system_role ? 'Protected System Role' : 'Custom Configurable Role'}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {selectedRole.description || 'Custom organizational permission profile.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">
                      <strong>{editablePermissions.length}</strong> active permissions
                    </span>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSavePermissions}
                      disabled={saving}
                      icon={<Save className="w-4 h-4" />}
                    >
                      {saving ? 'Saving...' : 'Save Permissions'}
                    </Button>
                  </div>
                </div>

                {/* Categorized Permissions Grid */}
                <div className="space-y-6">
                  {rolesMatrix?.categories.map((cat) => (
                    <div key={cat.category} className="space-y-3">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5">
                        <Layers className="w-4 h-4 text-brand" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          {cat.category}
                        </h3>
                        <span className="text-[11px] text-slate-400">
                          ({cat.permissions.filter((p) => editablePermissions.includes(p.id)).length} of {cat.permissions.length} granted)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {cat.permissions.map((p) => {
                          const isChecked = editablePermissions.includes(p.id);
                          return (
                            <label
                              key={p.id}
                              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                isChecked
                                  ? 'bg-sky-50/50 border-sky-200'
                                  : 'bg-white border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleTogglePermission(p.id)}
                                className="mt-1 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                              />
                              <div className="min-w-0">
                                <span className="text-xs font-semibold text-slate-900 block">
                                  {p.name}
                                </span>
                                <span className="text-[11px] font-mono text-slate-400 block">
                                  {p.id}
                                </span>
                                {p.description && (
                                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                                    {p.description}
                                  </p>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-slate-500">
                Select a role from the sidebar to inspect or modify its permission envelope.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Departments */}
      {activeTab === 'departments' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Pushkaralu Department Directory</h2>
              <p className="text-xs text-slate-500">
                Participating statutory agencies, municipal engineering departments, and governance boards
              </p>
            </div>
            {isSuperAdmin && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setNewDeptModalOpen(true)}
                icon={<Plus className="w-4 h-4" />}
              >
                Add Department
              </Button>
            )}
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Department / Authority Name</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-center">Active Staff</th>
                  <th className="py-3 px-4 text-center">Linked Projects</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {departments.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-brand">{d.code}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{d.name}</td>
                    <td className="py-3 px-4 text-xs text-slate-500 max-w-md">
                      {d.description || '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant="neutral" size="sm">
                        {d.user_count} officers
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant="info" size="sm">
                        {d.project_count} projects
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Zones / Ghats */}
      {activeTab === 'zones' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Ghats & Pushkaralu Spatial Zones</h2>
              <p className="text-xs text-slate-500">
                Geographic deployment sectors along the Godavari river with registered coordinates & assets
              </p>
            </div>
            {isSuperAdmin && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setNewZoneModalOpen(true)}
                icon={<Plus className="w-4 h-4" />}
              >
                Register New Ghat / Zone
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {zones.map((z) => (
              <div
                key={z.id}
                className="p-4 rounded-xl border border-slate-200 hover:border-sky-300 transition-all bg-white shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-brand bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                    {z.code}
                  </span>
                  <Badge variant={z.is_active ? 'success' : 'neutral'} size="sm">
                    {z.is_active ? 'Active Sector' : 'Inactive'}
                  </Badge>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900">{z.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                    {z.description || 'Official Pushkaralu pilgrimage ghat sector.'}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1 font-mono">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {z.latitude.toFixed(4)}, {z.longitude.toFixed(4)}
                  </span>
                  <div className="flex gap-2">
                    <span><strong>{z.project_count}</strong> projects</span>
                    <span>•</span>
                    <span><strong>{z.asset_count}</strong> assets</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Checklist Templates */}
      {activeTab === 'checklists' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Inspection Checklist Templates</h2>
              <p className="text-xs text-slate-500">
                Standardized verification criteria enforced during field inspections across Pushkaralu works
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={templateFilterCategory}
                onChange={(e) => setTemplateFilterCategory(e.target.value)}
                className="text-xs rounded-lg border-slate-300 py-1.5 px-3 focus:ring-brand focus:border-brand"
              >
                <option value="All">All Categories</option>
                <option value="Drinking Water">Drinking Water</option>
                <option value="Sanitation">Sanitation</option>
                <option value="Electrical">Electrical</option>
                <option value="Structural & Safety">Structural & Safety</option>
              </select>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setNewTemplateModalOpen(true)}
                icon={<Plus className="w-4 h-4" />}
              >
                New Template
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="p-5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-brand bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                      {tpl.template_code}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">{tpl.name}</h3>
                    <Badge variant="brand" size="sm">{tpl.category}</Badge>
                    <span className="text-xs font-mono text-slate-400">Ver {tpl.version}</span>
                  </div>
                  <Badge variant={tpl.is_active ? 'success' : 'neutral'} size="sm">
                    {tpl.is_active ? 'Active Template' : 'Archived'}
                  </Badge>
                </div>

                {tpl.description && (
                  <p className="text-xs text-slate-600">{tpl.description}</p>
                )}

                {/* Items preview table */}
                <div className="border border-slate-100 rounded-lg overflow-hidden bg-slate-50/50">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">Verification Item</th>
                        <th className="py-2 px-3">Type</th>
                        <th className="py-2 px-3">Mandatory</th>
                        <th className="py-2 px-3">Photo Required</th>
                        <th className="py-2 px-3">Acceptance Criteria</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {tpl.items.map((it, idx) => (
                        <tr key={it.id || idx}>
                          <td className="py-2 px-3 font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-2 px-3 font-medium text-slate-800">{it.title}</td>
                          <td className="py-2 px-3 capitalize font-mono text-slate-600">
                            {it.check_type.replace('_', ' ')}
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                it.mandatory ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {it.mandatory ? 'YES' : 'OPT'}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                it.requires_photo ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {it.requires_photo ? 'PHOTO' : 'NO'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-500 max-w-sm">{it.acceptance_criteria}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Governance & Thresholds */}
      {activeTab === 'governance' && editableConfig && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Governance Rules, Risk Weights & Defect SLAs
              </h2>
              <p className="text-xs text-slate-500">
                Section 14 & 19 parameters: Defect turnaround SLAs, Rule A-G explainable risk weights, and readiness gates
              </p>
              {systemConfig?.last_updated_at && (
                <span className="text-[11px] text-slate-400 block mt-1">
                  Audited configuration synchronized: {new Date(systemConfig.last_updated_at).toLocaleString()}
                  {systemConfig.last_updated_by ? ` (by ${systemConfig.last_updated_by})` : ''}
                </span>
              )}
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveGovernanceConfig}
              disabled={saving}
              icon={<Save className="w-4 h-4" />}
            >
              {saving ? 'Updating...' : 'Save Governance Config'}
            </Button>
          </div>

          {/* Section: Defect SLA Rules */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-brand" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Defect SLA Rules & Escalation Windows
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(editableConfig.defect_sla_rules).map(([sev, rule]) => (
                <div
                  key={sev}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 capitalize text-sm">{sev}</span>
                    <Badge
                      variant={
                        sev === 'Critical'
                          ? 'error'
                          : sev === 'Major'
                          ? 'warning'
                          : sev === 'Minor'
                          ? 'info'
                          : 'neutral'
                      }
                      size="sm"
                    >
                      {sev}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500">{rule.description}</p>
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block">
                        Max Resolution (Hours)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={rule.max_resolution_hours}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          setEditableConfig({
                            ...editableConfig,
                            defect_sla_rules: {
                              ...editableConfig.defect_sla_rules,
                              [sev]: { ...rule, max_resolution_hours: val },
                            },
                          });
                        }}
                        className="w-full mt-0.5 text-xs rounded border-slate-300 py-1 px-2"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block">
                        Supervisory Escalation (Hours)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={rule.escalation_hours}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          setEditableConfig({
                            ...editableConfig,
                            defect_sla_rules: {
                              ...editableConfig.defect_sla_rules,
                              [sev]: { ...rule, escalation_hours: val },
                            },
                          });
                        }}
                        className="w-full mt-0.5 text-xs rounded border-slate-300 py-1 px-2"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Explainable Risk Weights (Rules A - G) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Explainable Readiness Risk Weights (Section 14: Rules A through G)
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(editableConfig.risk_weights).map(([ruleKey, rule]) => (
                <div
                  key={ruleKey}
                  className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-brand bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                      {ruleKey}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-500">Weight:</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="50"
                        value={rule.weight}
                        onChange={(e) => {
                          const w = parseFloat(e.target.value) || 0;
                          setEditableConfig({
                            ...editableConfig,
                            risk_weights: {
                              ...editableConfig.risk_weights,
                              [ruleKey]: { ...rule, weight: w },
                            },
                          });
                        }}
                        className="w-16 text-xs text-right font-bold rounded border-slate-300 py-1 px-1.5 text-brand"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-600">{rule.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Gate Thresholds & Retention */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Readiness Gate Minimum Percentages
              </h4>
              <div className="space-y-2">
                {Object.entries(editableConfig.readiness_gate_thresholds).map(([gate, pct]) => (
                  <div key={gate} className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 capitalize">{gate.replace('_', ' ')}</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={pct}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setEditableConfig({
                            ...editableConfig,
                            readiness_gate_thresholds: {
                              ...editableConfig.readiness_gate_thresholds,
                              [gate]: val,
                            },
                          });
                        }}
                        className="w-16 text-xs text-right font-bold rounded border-slate-300 py-1 px-1.5"
                      />
                      <span className="text-slate-500 font-bold">%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Statutory Data Retention
              </h4>
              <p className="text-xs text-slate-500">
                Period for active immutable retention of high-frequency GPS evidence and event logs
              </p>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="number"
                  min="365"
                  value={editableConfig.data_retention_days}
                  onChange={(e) => {
                    const days = parseInt(e.target.value) || 365;
                    setEditableConfig({ ...editableConfig, data_retention_days: days });
                  }}
                  className="w-24 text-xs font-bold rounded border-slate-300 py-1 px-2"
                />
                <span className="text-xs font-semibold text-slate-600">
                  days ({(editableConfig.data_retention_days / 365).toFixed(1)} years minimum)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Demo Data & Governance Invariants */}
      {activeTab === 'demo_reset' && (
        <div className="space-y-6">
          {/* Section 19 Invariant Notice */}
          <div className="p-6 rounded-xl border-2 border-slate-300 bg-slate-900 text-white space-y-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Section 19 Invariant: Tamper-Evident Statutory Audit Immutability
                </h3>
                <p className="text-xs text-slate-400">
                  CivicProof implements write-only append-only cryptographic event logging. Deletion or purging of audit entries is architecturally rejected.
                </p>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-lg font-mono text-xs text-slate-300 border border-slate-800 space-y-2">
              <p className="text-emerald-400 font-semibold">
                ✓ HTTP DELETE /api/v1/admin/audit-history → 403 Forbidden
              </p>
              <p className="text-slate-400">
                Statutory audit entries contain SHA-256 state hashes that ensure non-repudiation during legislative review.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestAuditPurgeInvariant}
                className="bg-transparent text-white border-slate-600 hover:bg-slate-800"
              >
                Verify Audit Protection Invariant (HTTP Test)
              </Button>
            </div>

            {invariantTestResult && (
              <div className="p-3 rounded bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs font-mono">
                {invariantTestResult}
              </div>
            )}
          </div>

          {/* Sandbox & Demo Data Reset */}
          <div className="bg-white rounded-xl border border-amber-200 p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Godavari Pushkaralu 2027 Sandbox Demo Data Reset
                </h3>
                <p className="text-xs text-slate-500">
                  Restore pristine pilot scenario: Kotilingala Ghat drinking water failure, Saraswati Ghat sanitation passed, and pending electrical audits
                </p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-amber-50/60 border border-amber-200 text-xs text-amber-900 space-y-2">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                Warning: This resets operational state across work packages, inspections, defects, and offline sync logs.
              </p>
              <p>
                Only administrators with <code className="font-mono font-bold">super_admin</code> clearance can trigger a sandbox reset. Confirmation passphrase is required.
              </p>
            </div>

            {resetResult && (
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {resetResult.message}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                  {Object.entries(resetResult.reseeded_counts).map(([k, v]) => (
                    <div key={k} className="bg-white p-2 rounded border border-emerald-100">
                      <span className="text-slate-500 capitalize block">{k.replace('_', ' ')}</span>
                      <span className="font-bold text-slate-900">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2">
              <Button
                variant="danger"
                size="md"
                onClick={() => setResetModalOpen(true)}
                icon={<RotateCcw className="w-4 h-4" />}
              >
                Reset Demo Data (Passphrase Required)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Custom Role */}
      <Modal
        isOpen={newRoleModalOpen}
        onClose={() => setNewRoleModalOpen(false)}
        title="Create Custom Security Role"
      >
        <form onSubmit={handleCreateRole} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block">Role Name</label>
            <input
              type="text"
              required
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="e.g. Safety Audit Specialist"
              className="w-full mt-1 text-sm rounded-lg border-slate-300 py-2 px-3"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block">Description</label>
            <textarea
              rows={2}
              value={newRoleDesc}
              onChange={(e) => setNewRoleDesc(e.target.value)}
              placeholder="Responsibilities and authorization scope..."
              className="w-full mt-1 text-sm rounded-lg border-slate-300 py-2 px-3"
            />
          </div>
          <p className="text-xs text-slate-500">
            Note: Newly created roles inherit the currently selected permissions ({editablePermissions.length} permissions).
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setNewRoleModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={saving}>
              {saving ? 'Creating...' : 'Create Role'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Department */}
      <Modal
        isOpen={newDeptModalOpen}
        onClose={() => setNewDeptModalOpen(false)}
        title="Register Pushkaralu Department"
      >
        <form onSubmit={handleCreateDepartment} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block">Code</label>
              <input
                type="text"
                required
                value={newDeptCode}
                onChange={(e) => setNewDeptCode(e.target.value)}
                placeholder="e.g. DISASTER-MGMT"
                className="w-full mt-1 text-sm font-mono uppercase rounded-lg border-slate-300 py-2 px-3"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-700 block">Department Name</label>
              <input
                type="text"
                required
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                placeholder="e.g. State Disaster Management Authority"
                className="w-full mt-1 text-sm rounded-lg border-slate-300 py-2 px-3"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block">Description</label>
            <textarea
              rows={2}
              value={newDeptDesc}
              onChange={(e) => setNewDeptDesc(e.target.value)}
              placeholder="Role in Pushkaralu 2027 infrastructure readiness..."
              className="w-full mt-1 text-sm rounded-lg border-slate-300 py-2 px-3"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setNewDeptModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={saving}>
              {saving ? 'Registering...' : 'Register Department'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Register Zone / Ghat */}
      <Modal
        isOpen={newZoneModalOpen}
        onClose={() => setNewZoneModalOpen(false)}
        title="Register Pushkaralu Ghat / Spatial Zone"
      >
        <form onSubmit={handleCreateZone} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block">Zone Code</label>
              <input
                type="text"
                required
                value={newZoneCode}
                onChange={(e) => setNewZoneCode(e.target.value)}
                placeholder="e.g. Z-GOD-05"
                className="w-full mt-1 text-sm font-mono uppercase rounded-lg border-slate-300 py-2 px-3"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-700 block">Ghat / Location Name</label>
              <input
                type="text"
                required
                value={newZoneName}
                onChange={(e) => setNewZoneName(e.target.value)}
                placeholder="e.g. Markandeya Pushkar Ghat"
                className="w-full mt-1 text-sm rounded-lg border-slate-300 py-2 px-3"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block">Description</label>
            <input
              type="text"
              value={newZoneDesc}
              onChange={(e) => setNewZoneDesc(e.target.value)}
              placeholder="Ghat frontage, bathing capacity, key facilities..."
              className="w-full mt-1 text-sm rounded-lg border-slate-300 py-2 px-3"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block">Latitude</label>
              <input
                type="number"
                step="0.0001"
                required
                value={newZoneLat}
                onChange={(e) => setNewZoneLat(e.target.value)}
                className="w-full mt-1 text-sm font-mono rounded-lg border-slate-300 py-2 px-3"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block">Longitude</label>
              <input
                type="number"
                step="0.0001"
                required
                value={newZoneLng}
                onChange={(e) => setNewZoneLng(e.target.value)}
                className="w-full mt-1 text-sm font-mono rounded-lg border-slate-300 py-2 px-3"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setNewZoneModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={saving}>
              {saving ? 'Registering...' : 'Register Zone'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: New Checklist Template */}
      <Modal
        isOpen={newTemplateModalOpen}
        onClose={() => setNewTemplateModalOpen(false)}
        title="Publish Inspection Checklist Template"
      >
        <form onSubmit={handleCreateTemplate} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block">Template Code</label>
              <input
                type="text"
                required
                value={newTplCode}
                onChange={(e) => setNewTplCode(e.target.value)}
                placeholder="e.g. CHK-CROWD-V1"
                className="w-full mt-1 text-sm font-mono uppercase rounded-lg border-slate-300 py-2 px-3"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-700 block">Template Title</label>
              <input
                type="text"
                required
                value={newTplName}
                onChange={(e) => setNewTplName(e.target.value)}
                placeholder="e.g. Crowd Control Barrier Stability Audit"
                className="w-full mt-1 text-sm rounded-lg border-slate-300 py-2 px-3"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block">Category</label>
              <select
                value={newTplCat}
                onChange={(e) => setNewTplCat(e.target.value)}
                className="w-full mt-1 text-sm rounded-lg border-slate-300 py-2 px-3"
              >
                <option value="Drinking Water">Drinking Water</option>
                <option value="Sanitation">Sanitation</option>
                <option value="Electrical">Electrical</option>
                <option value="Structural & Safety">Structural & Safety</option>
                <option value="Crowd Management">Crowd Management</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block">Scope Description</label>
              <input
                type="text"
                value={newTplDesc}
                onChange={(e) => setNewTplDesc(e.target.value)}
                placeholder="Audit parameters and safety guidelines..."
                className="w-full mt-1 text-sm rounded-lg border-slate-300 py-2 px-3"
              />
            </div>
          </div>

          {/* Checklist Items Builder */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Checklist Verification Items ({newTplItems.length})
              </h4>
              <button
                type="button"
                onClick={handleAddChecklistItem}
                className="text-xs font-semibold text-brand flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> Add Item
              </button>
            </div>

            <div className="space-y-2">
              {newTplItems.map((item, idx) => (
                <div key={item.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-slate-500">#{idx + 1}</span>
                    <input
                      type="text"
                      required
                      value={item.title}
                      onChange={(e) => handleUpdateChecklistItem(idx, 'title', e.target.value)}
                      placeholder="Verification item title..."
                      className="flex-1 text-xs rounded border-slate-300 py-1.5 px-2 bg-white"
                    />
                    <select
                      value={item.check_type}
                      onChange={(e) => handleUpdateChecklistItem(idx, 'check_type', e.target.value)}
                      className="text-xs rounded border-slate-300 py-1.5 px-2 bg-white"
                    >
                      <option value="pass_fail">Pass/Fail</option>
                      <option value="measurement">Measurement</option>
                      <option value="visual_rating">Visual Rating</option>
                    </select>
                    {newTplItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveChecklistItem(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <input
                      type="text"
                      value={item.acceptance_criteria}
                      onChange={(e) => handleUpdateChecklistItem(idx, 'acceptance_criteria', e.target.value)}
                      placeholder="Acceptance criteria..."
                      className="sm:col-span-2 text-xs rounded border-slate-300 py-1 px-2 bg-white"
                    />
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.mandatory}
                          onChange={(e) => handleUpdateChecklistItem(idx, 'mandatory', e.target.checked)}
                          className="h-3.5 w-3.5 rounded text-brand"
                        />
                        <span className="text-[11px] text-slate-700 font-medium">Mandatory</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.requires_photo}
                          onChange={(e) => handleUpdateChecklistItem(idx, 'requires_photo', e.target.checked)}
                          className="h-3.5 w-3.5 rounded text-brand"
                        />
                        <span className="text-[11px] text-slate-700 font-medium">Photo</span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <Button variant="outline" size="sm" type="button" onClick={() => setNewTemplateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={saving}>
              {saving ? 'Publishing...' : 'Publish Template'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Confirm Demo Data Reset */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Confirm Sandbox Demo-Data Reset"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-2">
            <p className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Destructive Operation: Resets all live operational pilot records!
            </p>
            <p>
              To confirm, type <span className="font-mono font-bold text-rose-800">RESET-PUSHKARALU-2027</span> into the verification input below.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block">
              Type Passphrase to Confirm
            </label>
            <input
              type="text"
              value={resetConfirmCode}
              onChange={(e) => setResetConfirmCode(e.target.value)}
              placeholder="RESET-PUSHKARALU-2027"
              className="w-full mt-1 text-sm font-mono tracking-wider rounded-lg border-slate-300 py-2 px-3 focus:ring-rose-500 focus:border-rose-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setResetModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleExecuteReset}
              disabled={resetConfirmCode !== 'RESET-PUSHKARALU-2027' || resetting}
            >
              {resetting ? 'Resetting Sandbox...' : 'Confirm Sandbox Reset'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
