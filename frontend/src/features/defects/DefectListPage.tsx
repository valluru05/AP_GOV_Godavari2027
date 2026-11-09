import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Search,
  Plus,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Clock,
  RotateCcw,
  SlidersHorizontal,
  ArrowRight,
  MapPin,
  Building2,
  FileCheck2,
  Wrench,
  AlertOctagon
} from 'lucide-react';
import { api } from '../../services/api';
import type { Defect, DefectStats, DefectCreateRequest, DefectSeverity, DefectStatus } from '../../types/defect';
import type { WorkPackage } from '../../types/project';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';

export const DefectListPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission, hasRole } = useAuth();

  const [defects, setDefects] = useState<Defect[]>([]);
  const [stats, setStats] = useState<DefectStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Log Defect Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [allWorkPackages, setAllWorkPackages] = useState<WorkPackage[]>([]);
  const [formData, setFormData] = useState<DefectCreateRequest>({
    work_package_id: '',
    title: '',
    description: '',
    category: 'Quality & Safety',
    severity: 'High',
    target_resolution_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
  });
  const [evidenceName, setEvidenceName] = useState('');
  const [evidenceCaption, setEvidenceCaption] = useState('');
  const [formError, setFormError] = useState('');

  const canCreateDefect = hasPermission('defects:create') || hasRole('super_admin') || hasRole('field_inspector');

  const loadData = async () => {
    try {
      setLoading(true);
      const [defectData, statsData] = await Promise.all([
        api.getDefects({
          search: search || undefined,
          severity: severityFilter || undefined,
          status: statusFilter || undefined,
        }),
        api.getDefectStats(),
      ]);
      setDefects(defectData);
      setStats(statsData);
    } catch (err: any) {
      console.error('Failed to load defect records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [severityFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const openCreateModal = async () => {
    try {
      setFormError('');
      const prjList = await api.getProjects();
      const wps: WorkPackage[] = [];
      prjList.forEach((p: any) => {
        if (p.work_packages) {
          wps.push(...p.work_packages);
        }
      });
      setAllWorkPackages(wps);
      if (wps.length > 0) {
        setFormData((prev) => ({ ...prev, work_package_id: wps[0].id }));
      }
      setIsCreateModalOpen(true);
    } catch (err: any) {
      console.error('Failed to load work packages:', err);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.work_package_id || !formData.title.trim() || !formData.description.trim()) {
      setFormError('Please fill in all mandatory fields.');
      return;
    }

    try {
      setCreating(true);
      setFormError('');
      const attachments = evidenceName.trim()
        ? [{ name: evidenceName.trim(), caption: evidenceCaption.trim() }]
        : [];

      await api.createDefect({
        ...formData,
        evidence_attachments: attachments,
      });

      setIsCreateModalOpen(false);
      setFormData({
        work_package_id: '',
        title: '',
        description: '',
        category: 'Quality & Safety',
        severity: 'High',
        target_resolution_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      });
      setEvidenceName('');
      setEvidenceCaption('');
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to log defect ticket.');
    } finally {
      setCreating(false);
    }
  };

  const getSeverityBadge = (severity: DefectSeverity) => {
    switch (severity) {
      case 'Critical':
        return (
          <span className="inline-flex items-center gap-1 font-bold text-xs bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full border border-rose-200">
            <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
            Critical
          </span>
        );
      case 'High':
        return (
          <span className="inline-flex items-center gap-1 font-semibold text-xs bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            High
          </span>
        );
      case 'Medium':
        return (
          <span className="inline-flex items-center gap-1 font-semibold text-xs bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full border border-blue-200">
            Medium
          </span>
        );
      case 'Low':
        return (
          <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200">
            Low
          </span>
        );
    }
  };

  const getStatusBadge = (status: DefectStatus) => {
    switch (status) {
      case 'Open':
      case 'Assigned':
        return (
          <Badge variant="warning" className="gap-1 font-semibold text-xs">
            <Clock className="w-3 h-3" />
            {status}
          </Badge>
        );
      case 'In Progress':
        return (
          <Badge variant="info" className="gap-1 font-semibold text-xs">
            <Wrench className="w-3 h-3" />
            In Progress
          </Badge>
        );
      case 'Correction Submitted':
      case 'Verification Pending':
        return (
          <Badge variant="brand" className="gap-1 font-semibold text-xs">
            <FileCheck2 className="w-3 h-3" />
            Awaiting Re-Inspection
          </Badge>
        );
      case 'Rejected — Rework Required':
        return (
          <Badge variant="error" className="gap-1 font-semibold text-xs">
            <RotateCcw className="w-3 h-3" />
            Rework Required
          </Badge>
        );
      case 'Resolved — Verification Passed':
        return (
          <Badge variant="success" className="gap-1 font-semibold text-xs">
            <CheckCircle2 className="w-3 h-3" />
            Verified Resolved
          </Badge>
        );
      case 'Closed by Authorised User':
        return (
          <Badge variant="neutral" className="gap-1 font-medium text-xs">
            <ShieldCheck className="w-3 h-3 text-slate-600" />
            Closed & Archived
          </Badge>
        );
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {t('defects.title')}
            </h1>
            <span className="bg-amber-100 text-amber-900 text-xs px-2.5 py-0.5 rounded-full font-medium">
              Module 6
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t('defects.subtitle')}
          </p>
        </div>
        {canCreateDefect && (
          <Button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-[#174EA6] hover:bg-[#123e85] text-white shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t('defects.reportDefect')}
          </Button>
        )}
      </div>

      {/* Mandatory Anti-Corruption & Quality Rule Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl p-5 shadow-sm border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 pointer-events-none">
          <ShieldAlert className="w-48 h-48 text-white" />
        </div>
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400 mt-0.5 shrink-0 border border-amber-500/30">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-base text-white tracking-wide">
                Corrective Action & Verification Mandate (Section 29)
              </h2>
              <span className="text-[11px] bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded border border-amber-500/30">
                Rule Active
              </span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed max-w-4xl">
              A contractor marking a defect as fixed or submitting photographic proof <strong>does not constitute resolution</strong>. A defect may only transition to <code className="text-emerald-300 bg-slate-950/60 px-1 py-0.5 rounded">Resolved — Verification Passed</code> after an authorized Quality Field Inspector executes physical on-site re-inspection and certifies structural and hydraulic compliance.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Metric Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium uppercase tracking-wider">Total Defects</span>
              <AlertTriangle className="w-4 h-4 text-slate-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{stats.total_defects}</span>
              <span className="text-xs text-slate-500">tickets</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-xs flex flex-col justify-between bg-rose-50/20">
            <div className="flex items-center justify-between text-rose-600">
              <span className="text-xs font-medium uppercase tracking-wider">Critical Blocking</span>
              <AlertOctagon className="w-4 h-4 text-rose-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-rose-700">{stats.critical_defects}</span>
              <span className="text-xs text-rose-600 font-medium">blocking readiness</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-600">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Open & Rework</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-700">{stats.open_defects}</span>
              <span className="text-xs text-amber-600 font-medium">in resolution</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs flex flex-col justify-between bg-blue-50/20">
            <div className="flex items-center justify-between text-blue-600">
              <span className="text-xs font-medium uppercase tracking-wider">Awaiting Verification</span>
              <FileCheck2 className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-blue-800">{stats.awaiting_verification}</span>
              <span className="text-xs text-blue-700 font-medium">rework submitted</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-600">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Resolved / Closed</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-700">
                {stats.resolved_count + stats.closed_count}
              </span>
              <span className="text-xs text-emerald-600 font-medium">certified</span>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t('defects.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 px-1 font-medium">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span>Filters:</span>
            </div>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="Open">Open</option>
              <option value="Assigned">Assigned</option>
              <option value="Correction Submitted">Correction Submitted</option>
              <option value="Rejected — Rework Required">Rework Required</option>
              <option value="Resolved — Verification Passed">Resolved</option>
              <option value="Closed by Authorised User">Closed</option>
            </select>

            <Button type="submit" variant="secondary" size="sm" className="text-xs px-3 py-2">
              Filter
            </Button>

            {(search || severityFilter || statusFilter) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-slate-500 hover:text-slate-800"
                onClick={() => {
                  setSearch('');
                  setSeverityFilter('');
                  setStatusFilter('');
                }}
              >
                Reset
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* Defects Registry Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
            Loading non-conformance records...
          </div>
        ) : defects.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-900">No defect tickets found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              No open punch-list items or non-conformances match your selected criteria.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card Layout for <md */}
            <div className="md:hidden divide-y divide-slate-100">
              {defects.map((d) => (
                <div
                  key={d.id}
                  onClick={() => navigate(`/defects/${d.id}`)}
                  className="p-4 space-y-2.5 active:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-slate-900">{d.defect_id}</span>
                      {getSeverityBadge(d.severity)}
                    </div>
                    {getStatusBadge(d.status)}
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-slate-900 leading-snug">{d.title}</h4>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-[#E87512] shrink-0" />
                      <span>{d.zone_name || 'Pushkaralu Sector'}</span>
                      <span>•</span>
                      <span className="truncate">{d.work_package_title}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div className="truncate">
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">Vendor</span>
                      <span className="font-medium text-slate-800 truncate">{d.assigned_vendor_name || 'Unassigned'}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">Deadline</span>
                      <span className={d.is_overdue ? 'font-bold text-rose-600' : 'font-medium text-slate-700'}>
                        {d.target_resolution_date || 'No deadline'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View for >=md */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Defect ID & Severity</th>
                    <th className="px-4 py-3">Title & Category</th>
                    <th className="px-4 py-3">Work Package & Ghat</th>
                    <th className="px-4 py-3">Responsible Vendor</th>
                    <th className="px-4 py-3">Lifecycle Status</th>
                    <th className="px-4 py-3">Target Date</th>
                    <th className="px-4 py-3">Rework Cycles</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
              <tbody className="divide-y divide-slate-100">
                {defects.map((d) => (
                  <tr
                    key={d.id}
                    className="hover:bg-slate-50/75 transition-colors cursor-pointer"
                    onClick={() => navigate(`/defects/${d.id}`)}
                  >
                    {/* ID & Severity */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-900 text-xs">
                        {d.defect_id}
                      </div>
                      <div className="mt-1">
                        {getSeverityBadge(d.severity)}
                      </div>
                    </td>

                    {/* Title & Category */}
                    <td className="px-4 py-3.5 max-w-xs">
                      <div className="font-semibold text-slate-900 text-xs line-clamp-1">
                        {d.title}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {d.category}
                      </div>
                    </td>

                    {/* Work Package */}
                    <td className="px-4 py-3.5 max-w-xs">
                      <div className="font-medium text-slate-800 text-xs truncate">
                        {d.work_package_title}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{d.zone_name || 'Pushkaralu Sector'}</span>
                        <span>•</span>
                        <span>{d.work_id}</span>
                      </div>
                    </td>

                    {/* Responsible Vendor */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-slate-700">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[140px]">
                          {d.assigned_vendor_name || 'Unassigned'}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {getStatusBadge(d.status)}
                    </td>

                    {/* Target Date */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className={`text-xs ${d.is_overdue ? 'font-bold text-rose-600' : 'text-slate-700'}`}>
                        {d.target_resolution_date || 'No deadline'}
                      </div>
                      {d.is_overdue && (
                        <div className="text-[10px] text-rose-600 font-medium">Overdue</div>
                      )}
                    </td>

                    {/* Rework Cycles */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                        Cycle #{d.rework_count}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-blue-700 hover:text-blue-900 hover:bg-blue-50 gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/defects/${d.id}`);
                        }}
                      >
                        <span>Dossier</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      </div>

      {/* Log Defect Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Log Engineering Defect / Non-Conformance Ticket"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          <p className="text-xs text-slate-500">
            Formally record an infrastructure defect, hydraulic failure, or structural deficiency requiring contractor rework and independent quality certification.
          </p>

          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Work Package *
            </label>
            <select
              value={formData.work_package_id}
              onChange={(e) => setFormData((prev) => ({ ...prev, work_package_id: e.target.value }))}
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            >
              {allWorkPackages.map((wp) => (
                <option key={wp.id} value={wp.id}>
                  {wp.work_id} — {wp.title} ({wp.category})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Defect Title *
            </label>
            <input
              type="text"
              placeholder="e.g. Manifold Gasket Rupture Under Pressure Test"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              >
                <option value="Quality & Safety">Quality & Safety</option>
                <option value="Hydraulic Quality & Safety">Hydraulic Quality & Safety</option>
                <option value="Structural Safety">Structural Safety</option>
                <option value="Electrical Safety">Electrical Safety</option>
                <option value="Sanitation & Public Accessibility">Sanitation & Accessibility</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Severity Level *
              </label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData((prev) => ({ ...prev, severity: e.target.value as DefectSeverity }))}
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              >
                <option value="Critical">Critical (Halts Readiness)</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Target Resolution Date *
            </label>
            <input
              type="date"
              value={formData.target_resolution_date}
              onChange={(e) => setFormData((prev) => ({ ...prev, target_resolution_date: e.target.value }))}
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Engineering Description & Deficiency Observations *
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Detail specific non-conformances, failed test metrics, exact chainage/location, and required remedial actions..."
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              Attach Photographic Evidence (Optional)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Filename (e.g. Gasket_Seepage.jpg)"
                value={evidenceName}
                onChange={(e) => setEvidenceName(e.target.value)}
                className="text-xs border border-slate-200 rounded p-1.5 bg-white"
              />
              <input
                type="text"
                placeholder="Caption (e.g. Active seepage at joint 3B)"
                value={evidenceCaption}
                onChange={(e) => setEvidenceCaption(e.target.value)}
                className="text-xs border border-slate-200 rounded p-1.5 bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#174EA6] hover:bg-[#123e85] text-white"
              isLoading={creating}
            >
              Log Defect Ticket
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
