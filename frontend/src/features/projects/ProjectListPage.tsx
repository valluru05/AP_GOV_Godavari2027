import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FolderGit2,
  Plus,
  Search,
  Download,
  Calendar,
  RefreshCw,
  ArrowUpDown,
  MapPin,
  ChevronRight,
} from 'lucide-react';
import { api } from '../../services/api';
import type { ProjectSummary } from '../../types/project';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';

export const ProjectListPage: React.FC = () => {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [zones, setZones] = useState<any[]>([]);

  // Sorting
  const [sortBy, setSortBy] = useState<'name' | 'identifier' | 'priority' | 'created_at'>('created_at');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Create Project Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newIdentifier, setNewIdentifier] = useState('');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCat, setNewCat] = useState('Drinking Water');
  const [newZoneId, setNewZoneId] = useState('');
  const [newPriority, setNewPriority] = useState('High');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newFunding, setNewFunding] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const canCreate = hasPermission('projects:create');

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, filterOpts] = await Promise.all([
        api.getProjects({
          search: search || undefined,
          category: category || undefined,
          status: status || undefined,
          zone_id: zoneId || undefined,
        }),
        api.getDashboardFilters(),
      ]);
      setProjects(data);
      setZones(filterOpts.zones || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch project register');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [search, category, status, zoneId]);

  const handleSort = (field: 'name' | 'identifier' | 'priority' | 'created_at') => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(true);
    }
  };

  const sortedProjects = [...projects].sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
    else if (sortBy === 'identifier') cmp = a.project_identifier.localeCompare(b.project_identifier);
    else if (sortBy === 'priority') cmp = a.priority.localeCompare(b.priority);
    else if (sortBy === 'created_at') cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return sortAsc ? cmp : -cmp;
  });

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateLoading(true);
    try {
      await api.createProject({
        project_identifier: newIdentifier.toUpperCase(),
        name: newName,
        description: newDesc,
        category: newCat,
        zone_id: newZoneId || undefined,
        priority: newPriority,
        start_date: newStartDate || undefined,
        planned_completion_date: newEndDate || undefined,
        funding_reference: newFunding || undefined,
      });
      setCreateModalOpen(false);
      // Reset form
      setNewIdentifier('');
      setNewName('');
      setNewDesc('');
      setNewFunding('');
      await loadProjects();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create project');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleExportCsv = () => {
    const token = api.getToken();
    // Open authenticated CSV export
    fetch(api.exportProjectsCsvUrl(), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CivicProof_Projects_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch((err) => alert('CSV Export failed: ' + err.message));
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-surface p-4 sm:p-6 rounded-xl border border-borderLight shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-brand-light text-brand rounded-lg">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-textPrimary tracking-tight">
              {t('projects.title')}
            </h1>
          </div>
          <p className="text-xs text-textSecondary mt-1">
            {t('projects.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            icon={<Download className="w-4 h-4" />}
            onClick={handleExportCsv}
          >
            {t('reports.exportCsv')}
          </Button>
          {canCreate && (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setCreateModalOpen(true)}
            >
              {t('projects.newProject')}
            </Button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface p-3.5 sm:p-4 rounded-xl border border-borderLight shadow-subtle flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-textSecondary absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={t('projects.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#FFFDF9] border border-borderLight rounded-lg text-textPrimary focus:ring-1 focus:ring-brand focus:border-brand"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Category Filter */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-[#FFFDF9] border border-borderLight rounded-lg text-textPrimary focus:ring-1 focus:ring-brand"
          >
            <option value="">All Categories</option>
            <option value="Drinking Water">Drinking Water</option>
            <option value="Sanitation">Sanitation</option>
            <option value="Public Lighting">Public Lighting</option>
            <option value="Public Safety">Public Safety</option>
            <option value="Pedestrian Access">Pedestrian Access</option>
          </select>

          {/* Ghat/Zone Filter */}
          <select
            value={zoneId}
            onChange={(e) => setZoneId(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-[#FFFDF9] border border-borderLight rounded-lg text-textPrimary focus:ring-1 focus:ring-brand"
          >
            <option value="">All Ghats / Sectors</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-[#FFFDF9] border border-borderLight rounded-lg text-textPrimary focus:ring-1 focus:ring-brand"
          >
            <option value="">All Statuses</option>
            <option value="In Progress">In Progress</option>
            <option value="Verification Pending">Verification Pending</option>
            <option value="Accepted">Accepted</option>
            <option value="Delayed">Delayed</option>
          </select>

          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
            onClick={() => loadProjects()}
          >
            Reload
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-govError-light border border-govError-border rounded-xl text-xs text-govError">
          {error}
        </div>
      )}

      {/* Projects Table */}
      <div className="bg-surface rounded-xl border border-borderLight shadow-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-textSecondary text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand" />
            Loading project register...
          </div>
        ) : sortedProjects.length === 0 ? (
          <div className="p-12 text-center text-textSecondary text-xs">
            <FolderGit2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-textPrimary">No projects found</p>
            <p className="mt-1">Try adjusting your filters or search keywords.</p>
          </div>
        ) : (
          <>
            {/* Mobile Stacked Card View (Visible on <md) */}
            <div className="md:hidden divide-y divide-borderLight/60">
              {sortedProjects.map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/projects/${p.id}`)}
                  className="p-4 space-y-2.5 active:bg-[#FAF4EC] transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-brand">{p.project_identifier}</span>
                    <Badge
                      variant={
                        p.current_status === 'Accepted'
                          ? 'success'
                          : p.current_status === 'Delayed'
                          ? 'error'
                          : 'brand'
                      }
                      size="sm"
                    >
                      {p.current_status}
                    </Badge>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-textPrimary leading-snug">{p.name}</h4>
                    <p className="text-[11px] text-textSecondary line-clamp-2 mt-0.5">{p.description || p.category}</p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-textSecondary pt-1">
                    <span className="flex items-center gap-1 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-[#E87512]" />
                      {p.zone_name || 'Unassigned'}
                    </span>
                    <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded font-semibold text-slate-700">
                      {p.work_packages_count} packages
                    </span>
                  </div>

                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-textSecondary">Verified Progress</span>
                      <span className="font-bold text-emerald-700">{p.verified_progress_avg}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                      <div
                        className="bg-emerald-600 h-2"
                        style={{ width: `${p.verified_progress_avg}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (Visible on >=md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#FAF4EC] border-b border-borderLight text-textSecondary font-semibold">
                    <th
                      onClick={() => handleSort('identifier')}
                      className="py-3 px-4 cursor-pointer hover:text-textPrimary"
                    >
                      <div className="flex items-center gap-1">
                        <span>Project Code</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('name')}
                      className="py-3 px-4 cursor-pointer hover:text-textPrimary"
                    >
                      <div className="flex items-center gap-1">
                        <span>Scheme & Description</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-3 px-4">Ghat / Zone</th>
                    <th className="py-3 px-4">Work Packages</th>
                    <th className="py-3 px-4">Reported vs. Verified</th>
                    <th className="py-3 px-4">Priority & Status</th>
                    <th className="py-3 px-4">Target Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
              <tbody className="divide-y divide-borderLight/60">
                {sortedProjects.map((p) => {
                  return (
                    <tr
                      key={p.id}
                      onClick={() => navigate(`/projects/${p.id}`)}
                      className="hover:bg-[#FAF4EC]/70 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-brand whitespace-nowrap">
                        {p.project_identifier}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <span className="font-semibold text-textPrimary block truncate group-hover:text-brand transition-colors">
                          {p.name}
                        </span>
                        <span className="text-[11px] text-textSecondary line-clamp-1 mt-0.5">
                          {p.description || p.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {p.zone_name ? (
                          <span className="flex items-center gap-1 text-slate-700 font-medium">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {p.zone_name}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-semibold font-mono text-[11px]">
                          {p.work_packages_count} packages
                        </span>
                      </td>
                      <td className="py-3 px-4 min-w-[140px]">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-blue-700 font-medium">Rep: {p.reported_progress_avg}%</span>
                            <span className="text-emerald-700 font-bold">Ver: {p.verified_progress_avg}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden flex">
                            <div
                              className="bg-emerald-600 h-1.5"
                              style={{ width: `${p.verified_progress_avg}%` }}
                            />
                            <div
                              className="bg-blue-400 h-1.5 opacity-60"
                              style={{
                                width: `${Math.max(0, p.reported_progress_avg - p.verified_progress_avg)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <Badge
                            variant={
                              p.current_status === 'Accepted'
                                ? 'success'
                                : p.current_status === 'Delayed'
                                ? 'error'
                                : 'brand'
                            }
                            size="sm"
                          >
                            {p.current_status}
                          </Badge>
                          <span className="text-[10px] text-textSecondary uppercase font-semibold">
                            Priority: {p.priority}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-textSecondary text-[11px]">
                        {p.planned_completion_date ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {p.planned_completion_date}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/projects/${p.id}`);
                          }}
                          className="px-2.5 py-1 text-xs font-medium text-brand bg-brand-light hover:bg-brand-subtle rounded-md border border-brand/20 transition-colors inline-flex items-center gap-1"
                        >
                          View Details <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      </div>

      {/* Create New Project Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Initiate Municipal Infrastructure Project"
        description="Creates a new capital or event readiness work project under Godavari Pushkaralu 2027."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateProject} className="space-y-4">
          {createError && (
            <div className="p-3 bg-govError-light border border-govError-border rounded-lg text-xs text-govError">
              {createError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-textPrimary mb-1">
                Project Identifier (Unique Code)
              </label>
              <input
                type="text"
                required
                placeholder="e.g. PRJ-2027-DW05"
                value={newIdentifier}
                onChange={(e) => setNewIdentifier(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-borderLight rounded-lg text-textPrimary uppercase font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-textPrimary mb-1">Priority</label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-borderLight rounded-lg text-textPrimary"
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-textPrimary mb-1">Project Scheme Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Saraswati Ghat Emergency Evacuation Causeway"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-borderLight rounded-lg text-textPrimary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-textPrimary mb-1">Description & Scope</label>
            <textarea
              rows={2}
              placeholder="Describe public-sector purpose, capacity, and critical facilities..."
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-borderLight rounded-lg text-textPrimary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-textPrimary mb-1">Category</label>
              <select
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-borderLight rounded-lg text-textPrimary"
              >
                <option value="Drinking Water">Drinking Water</option>
                <option value="Sanitation">Sanitation</option>
                <option value="Public Lighting">Public Lighting</option>
                <option value="Public Safety">Public Safety</option>
                <option value="Pedestrian Access">Pedestrian Access</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-textPrimary mb-1">Ghat / Zone Sector</label>
              <select
                value={newZoneId}
                onChange={(e) => setNewZoneId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-borderLight rounded-lg text-textPrimary"
              >
                <option value="">Select Bathing Ghat...</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-textPrimary mb-1">Start Date</label>
              <input
                type="date"
                value={newStartDate}
                onChange={(e) => setNewStartDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-borderLight rounded-lg text-textPrimary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-textPrimary mb-1">Planned Completion Date</label>
              <input
                type="date"
                value={newEndDate}
                onChange={(e) => setNewEndDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-borderLight rounded-lg text-textPrimary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-textPrimary mb-1">
              Funding / Budget Reference (Confidential)
            </label>
            <input
              type="text"
              placeholder="e.g. AP-GODAVARI-2027-PW-044"
              value={newFunding}
              onChange={(e) => setNewFunding(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-borderLight rounded-lg text-textPrimary font-mono"
            />
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
            <Button type="submit" variant="primary" size="sm" isLoading={createLoading}>
              Save & Create Project
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
