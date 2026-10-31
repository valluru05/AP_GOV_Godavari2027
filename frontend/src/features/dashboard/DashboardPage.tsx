import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderGit2,
  Briefcase,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
  QrCode,
  ClipboardList,
  Filter,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Building,
  MapPin,
  ShieldCheck,
  Activity,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type {
  SummaryMetrics,
  DashboardVisualizations,
  ActionQueueItem,
  DashboardFilterOptions,
} from '../../types/dashboard';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Filters State
  const [filters, setFilters] = useState({
    project_id: '',
    zone_id: '',
    category: '',
    vendor_id: '',
    status: '',
    risk_level: '',
  });

  const [filterOptions, setFilterOptions] = useState<DashboardFilterOptions | null>(null);
  const [metrics, setMetrics] = useState<SummaryMetrics | null>(null);
  const [visuals, setVisuals] = useState<DashboardVisualizations | null>(null);
  const [actionQueue, setActionQueue] = useState<ActionQueueItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load Filter Options Once
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const opts = await api.getDashboardFilters();
        setFilterOptions(opts);
      } catch (err: any) {
        console.error('Failed to load filter options', err);
      }
    };
    fetchOptions();
  }, []);

  // Load Metrics, Visuals, and Action Queue on Filter Change
  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const activeFilters: Record<string, string> = {};
      if (filters.project_id) activeFilters.project_id = filters.project_id;
      if (filters.zone_id) activeFilters.zone_id = filters.zone_id;
      if (filters.category) activeFilters.category = filters.category;
      if (filters.vendor_id) activeFilters.vendor_id = filters.vendor_id;
      if (filters.status) activeFilters.status = filters.status;
      if (filters.risk_level) activeFilters.risk_level = filters.risk_level;

      const [metricsData, visualsData, queueData] = await Promise.all([
        api.getDashboardMetrics(activeFilters),
        api.getDashboardVisualizations(activeFilters),
        api.getDashboardActionQueue(),
      ]);

      setMetrics(metricsData);
      setVisuals(visualsData);
      setActionQueue(queueData);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve executive dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [filters]);

  const handleResetFilters = () => {
    setFilters({
      project_id: '',
      zone_id: '',
      category: '',
      vendor_id: '',
      status: '',
      risk_level: '',
    });
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== '');

  return (
    <div className="space-y-6">
      {/* Executive Welcome & Context Header */}
      <div className="bg-gradient-to-r from-[#174EA6] to-[#1E3A8A] text-white p-6 md:p-8 rounded-2xl shadow-card relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-sky-400/20 text-sky-200 border border-sky-300/30 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider">
                Module 2 • Executive Overview Dashboard
              </span>
              <span className="text-xs text-sky-300">Godavari Pushkaralu 2027</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Infrastructure Readiness Command Center
            </h1>
            <p className="text-sky-100 text-xs md:text-sm mt-1 max-w-2xl leading-relaxed">
              Monitoring active works for {user?.full_name || 'Authorized Official'} across bathing ghats,
              water distribution, sanitation, and physical asset verification. All metrics are live database aggregations.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 text-center">
              <span className="text-[10px] uppercase font-semibold text-sky-200 block">Readiness Mode</span>
              <span className="text-sm font-bold text-emerald-300 flex items-center justify-center gap-1 mt-0.5">
                <span className={`h-2 w-2 rounded-full ${loading ? 'bg-amber-400 animate-spin' : 'bg-emerald-400 animate-pulse'}`}></span>
                {loading ? 'Refreshing...' : 'Active Audit'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Multi-Dimensional Dashboard Filter Bar */}
      <div className="bg-surface p-4 rounded-xl border border-borderLight shadow-subtle flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-brand" />
            <span className="text-xs font-bold text-textPrimary uppercase tracking-wider">
              Jurisdiction & Sector Filters
            </span>
          </div>
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-brand hover:text-brand-hover flex items-center gap-1 font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {/* Project Filter */}
          <div>
            <label className="block text-[10px] font-semibold text-textSecondary uppercase mb-1">Project</label>
            <select
              value={filters.project_id}
              onChange={(e) => setFilters({ ...filters, project_id: e.target.value })}
              className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-borderLight rounded-lg text-textPrimary focus:ring-1 focus:ring-brand truncate"
            >
              <option value="">All Projects</option>
              {filterOptions?.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Location / Zone Filter */}
          <div>
            <label className="block text-[10px] font-semibold text-textSecondary uppercase mb-1">Ghat / Zone</label>
            <select
              value={filters.zone_id}
              onChange={(e) => setFilters({ ...filters, zone_id: e.target.value })}
              className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-borderLight rounded-lg text-textPrimary focus:ring-1 focus:ring-brand truncate"
            >
              <option value="">All Zones</option>
              {filterOptions?.zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[10px] font-semibold text-textSecondary uppercase mb-1">Work Category</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-borderLight rounded-lg text-textPrimary focus:ring-1 focus:ring-brand truncate"
            >
              <option value="">All Categories</option>
              {filterOptions?.categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Vendor Filter */}
          <div>
            <label className="block text-[10px] font-semibold text-textSecondary uppercase mb-1">Vendor</label>
            <select
              value={filters.vendor_id}
              onChange={(e) => setFilters({ ...filters, vendor_id: e.target.value })}
              className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-borderLight rounded-lg text-textPrimary focus:ring-1 focus:ring-brand truncate"
            >
              <option value="">All Vendors</option>
              {filterOptions?.vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-semibold text-textSecondary uppercase mb-1">Workflow State</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-borderLight rounded-lg text-textPrimary focus:ring-1 focus:ring-brand truncate"
            >
              <option value="">All States</option>
              {filterOptions?.statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Risk Level Filter */}
          <div>
            <label className="block text-[10px] font-semibold text-textSecondary uppercase mb-1">Risk Level</label>
            <select
              value={filters.risk_level}
              onChange={(e) => setFilters({ ...filters, risk_level: e.target.value })}
              className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-borderLight rounded-lg text-textPrimary focus:ring-1 focus:ring-brand truncate"
            >
              <option value="">All Risk Levels</option>
              {filterOptions?.risk_levels.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-govError-light border border-govError-border rounded-xl text-xs text-govError flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 12 Clickable Summary Metric Cards (Section 7 Requirements) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-textPrimary uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand" /> Core Readiness Indicators (Click to Inspect)
          </h2>
          <span className="text-[11px] text-textSecondary">Database-aggregated live figures</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {/* 1. Total Projects */}
          <div
            onClick={() => navigate('/projects')}
            className="p-3.5 bg-surface rounded-xl border border-borderLight shadow-subtle hover:border-brand/40 hover:shadow-card transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-textSecondary">Total Projects</span>
              <FolderGit2 className="w-4 h-4 text-brand group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-2xl font-extrabold text-textPrimary mt-1.5">{metrics?.total_projects ?? '—'}</p>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Approved Schemes</span>
          </div>

          {/* 2. Active Works */}
          <div
            onClick={() => navigate('/projects')}
            className="p-3.5 bg-surface rounded-xl border border-borderLight shadow-subtle hover:border-blue-400 hover:shadow-card transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-textSecondary">Active Works</span>
              <Briefcase className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-2xl font-extrabold text-blue-700 mt-1.5">{metrics?.active_works ?? '—'}</p>
            <span className="text-[10px] text-blue-600 font-medium mt-0.5 block">In Pipeline</span>
          </div>

          {/* 3. Reported-Complete Works (Contractor claims) */}
          <div
            onClick={() => navigate('/projects')}
            className="p-3.5 bg-surface rounded-xl border border-sky-200 bg-sky-50/20 shadow-subtle hover:border-sky-400 hover:shadow-card transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-sky-800">Reported Complete</span>
              <Clock className="w-4 h-4 text-sky-600 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-2xl font-extrabold text-sky-700 mt-1.5">{metrics?.reported_complete_works ?? '—'}</p>
            <span className="text-[10px] text-sky-600 font-medium mt-0.5 block">Vendor Claims 100%</span>
          </div>

          {/* 4. Verified-Complete Works (Engineering Truth) */}
          <div
            onClick={() => navigate('/inspections')}
            className="p-3.5 bg-surface rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-subtle hover:border-emerald-400 hover:shadow-card transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-800">Verified Complete</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-2xl font-extrabold text-emerald-700 mt-1.5">{metrics?.verified_complete_works ?? '—'}</p>
            <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block">Inspection Certified</span>
          </div>

          {/* 5. Accepted Works */}
          <div
            onClick={() => navigate('/readiness')}
            className="p-3.5 bg-surface rounded-xl border border-borderLight shadow-subtle hover:border-teal-400 hover:shadow-card transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-textSecondary">Accepted Works</span>
              <ShieldCheck className="w-4 h-4 text-teal-600 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-2xl font-extrabold text-teal-700 mt-1.5">{metrics?.accepted_works ?? '—'}</p>
            <span className="text-[10px] text-teal-600 font-medium mt-0.5 block">Formally Approved</span>
          </div>

          {/* 6. Works at Risk */}
          <div
            onClick={() => navigate('/readiness')}
            className="p-3.5 bg-surface rounded-xl border border-amber-200 bg-amber-50/20 shadow-subtle hover:border-amber-400 hover:shadow-card transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-amber-900">Works at Risk</span>
              <AlertTriangle className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-2xl font-extrabold text-amber-700 mt-1.5">{metrics?.works_at_risk ?? '—'}</p>
            <span className="text-[10px] text-amber-600 font-medium mt-0.5 block">Score ≥ 60 / Critical</span>
          </div>

          {/* 7. Overdue Milestones */}
          <div
            onClick={() => navigate('/projects')}
            className="p-3.5 bg-surface rounded-xl border border-rose-200 bg-rose-50/20 shadow-subtle hover:border-rose-400 hover:shadow-card transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-rose-900">Overdue Milestones</span>
              <Calendar className="w-4 h-4 text-rose-600 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-2xl font-extrabold text-rose-700 mt-1.5">{metrics?.overdue_milestones ?? '—'}</p>
            <span className="text-[10px] text-rose-600 font-medium mt-0.5 block">Deadline Breached</span>
          </div>

          {/* 8. Open Defects */}
          <div
            onClick={() => navigate('/defects')}
            className="p-3.5 bg-surface rounded-xl border border-red-200 bg-red-50/20 shadow-subtle hover:border-red-400 hover:shadow-card transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-red-900">Open Defects</span>
              <AlertOctagon className="w-4 h-4 text-govError group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-2xl font-extrabold text-govError mt-1.5">{metrics?.open_defects ?? '—'}</p>
            <span className="text-[10px] text-red-600 font-medium mt-0.5 block">Awaiting Rework</span>
          </div>

          {/* 9. Assets Registered */}
          <div
            onClick={() => navigate('/assets')}
            className="p-3.5 bg-surface rounded-xl border border-borderLight shadow-subtle hover:border-brand/40 hover:shadow-card transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-textSecondary">Assets Registered</span>
              <QrCode className="w-4 h-4 text-brand group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-2xl font-extrabold text-textPrimary mt-1.5">{metrics?.assets_registered ?? '—'}</p>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Physical Units</span>
          </div>

          {/* 10. Assets Awaiting Inspection */}
          <div
            onClick={() => navigate('/assets')}
            className="p-3.5 bg-surface rounded-xl border border-borderLight shadow-subtle hover:border-amber-400 hover:shadow-card transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-textSecondary">Assets Pending Insp</span>
              <Activity className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-2xl font-extrabold text-amber-700 mt-1.5">{metrics?.assets_awaiting_inspection ?? '—'}</p>
            <span className="text-[10px] text-amber-600 font-medium mt-0.5 block">Pre-Commissioning</span>
          </div>

          {/* 11. Assets Accepted */}
          <div
            onClick={() => navigate('/assets')}
            className="p-3.5 bg-surface rounded-xl border border-borderLight shadow-subtle hover:border-emerald-400 hover:shadow-card transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-textSecondary">Assets Accepted</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-2xl font-extrabold text-emerald-700 mt-1.5">{metrics?.assets_accepted ?? '—'}</p>
            <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block">Ready for Pilgrims</span>
          </div>

          {/* 12. Inspections Awaiting Action */}
          <div
            onClick={() => navigate('/inspections')}
            className="p-3.5 bg-surface rounded-xl border border-borderLight shadow-subtle hover:border-purple-400 hover:shadow-card transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-textSecondary">Pending Inspections</span>
              <ClipboardList className="w-4 h-4 text-purple-600 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-2xl font-extrabold text-purple-700 mt-1.5">{metrics?.inspections_awaiting_action ?? '—'}</p>
            <span className="text-[10px] text-purple-600 font-medium mt-0.5 block">Field Tasks Queued</span>
          </div>
        </div>
      </div>

      {/* Action Queue: Prioritized Urgent Items */}
      <div className="bg-surface rounded-xl border border-borderLight shadow-card overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-borderLight flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-govError" />
            <h2 className="text-sm font-bold text-textPrimary uppercase tracking-wider">
              Prioritized Action Queue (Immediate Municipal Intervention Required)
            </h2>
          </div>
          <span className="text-xs bg-red-100 text-govError px-2.5 py-0.5 rounded-full font-bold">
            {actionQueue.length} Active Triggers
          </span>
        </div>

        <div className="divide-y divide-borderLight/60 max-h-72 overflow-y-auto">
          {actionQueue.map((item) => (
            <div
              key={item.id}
              className="p-3.5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-start gap-3">
                <Badge
                  variant={
                    item.severity === 'Critical'
                      ? 'error'
                      : item.severity === 'High'
                      ? 'warning'
                      : 'info'
                  }
                  size="sm"
                >
                  {item.severity}
                </Badge>
                <div>
                  <span className="font-bold text-textPrimary text-xs block">{item.title}</span>
                  <p className="text-[11px] text-textSecondary mt-0.5">{item.description}</p>
                  <p className="text-[11px] text-brand font-medium mt-1 flex items-center gap-1">
                    <span className="font-semibold">Suggested Action:</span> {item.suggested_action}
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                icon={<ExternalLink className="w-3.5 h-3.5" />}
                onClick={() => navigate(item.link_url)}
                className="shrink-0"
              >
                Inspect Record
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Visual Analytics Grid: Charts & Comparisons */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: The Core Innovation: Reported Progress vs. Verified Progress Gap */}
        <div className="lg:col-span-8 bg-surface p-5 rounded-xl border border-borderLight shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand" /> Reported vs. Verified Progress Gap
              </h3>
              <p className="text-xs text-textSecondary mt-0.5">
                Highlights the critical discrepancy between vendor reported claims (blue) and field-verified completion (green).
              </p>
            </div>
            <Badge variant="brand" size="sm">
              Core Proof Mechanism
            </Badge>
          </div>

          <div className="h-72 w-full">
            {visuals?.reported_vs_verified_progress && visuals.reported_vs_verified_progress.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={visuals.reported_vs_verified_progress}
                  margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="work_id" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis unit="%" tick={{ fontSize: 11, fill: '#64748B' }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar
                    dataKey="reported_progress"
                    name="Vendor Reported %"
                    fill="#2563EB"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="verified_progress"
                    name="Inspection Verified %"
                    fill="#15803D"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-textSecondary">
                No progress data matching selected filters
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Project Status Distribution */}
        <div className="lg:col-span-4 bg-surface p-5 rounded-xl border border-borderLight shadow-card flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-brand" /> Work Status Breakdown
            </h3>
            <p className="text-xs text-textSecondary mt-0.5">Distribution of works across lifecycle states.</p>

            <div className="h-56 w-full mt-3">
              {visuals?.project_status_distribution && visuals.project_status_distribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={visuals.project_status_distribution}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {visuals.project_status_distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '8px',
                        border: '1px solid #E2E8F0',
                        fontSize: '11px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-textSecondary">
                  No status data
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-borderLight text-[11px]">
            {visuals?.project_status_distribution.map((item) => (
              <div key={item.status} className="flex items-center gap-1.5 truncate">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-textSecondary truncate">{item.status}:</span>
                <strong className="text-textPrimary">{item.count}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 3: Open Defects by Severity */}
        <div className="lg:col-span-4 bg-surface p-5 rounded-xl border border-borderLight shadow-card">
          <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-govError" /> Open Defects by Severity
          </h3>
          <p className="text-xs text-textSecondary mb-4">Unresolved corrective action items awaiting verification.</p>

          <div className="h-52 w-full">
            {visuals?.open_defects_by_severity ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={visuals.open_defects_by_severity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="severity" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      fontSize: '11px',
                    }}
                  />
                  <Bar dataKey="count" name="Defect Count" radius={[4, 4, 0, 0]}>
                    {visuals.open_defects_by_severity.map((entry, index) => (
                      <Cell key={`sev-cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>

        {/* Chart 4: Readiness by Zone / Ghat */}
        <div className="lg:col-span-8 bg-surface p-5 rounded-xl border border-borderLight shadow-card">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
                <MapPin className="w-4 h-4 text-teal-600" /> Infrastructure Readiness by Bathing Ghat
              </h3>
              <p className="text-xs text-textSecondary mt-0.5">Average verified completion percentage per sector.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/map')}>
              Open Map View
            </Button>
          </div>

          <div className="space-y-3 mt-4">
            {visuals?.work_readiness_by_zone.map((z) => (
              <div key={z.zone_code} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-textPrimary">
                    {z.zone_name} <span className="font-mono text-[10px] text-slate-400">[{z.zone_code}]</span>
                  </span>
                  <span className="font-bold text-brand">{z.readiness_percentage}% Verified</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-2.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${z.readiness_percentage}%`,
                      backgroundColor:
                        z.readiness_percentage >= 80
                          ? '#15803D'
                          : z.readiness_percentage >= 50
                          ? '#2563EB'
                          : '#B45309',
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-textSecondary">
                  <span>{z.total_works} works assigned</span>
                  <span>{z.verified_works} accepted / certified</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 5: Highest-Priority Rule-Based Risks & Recommendations */}
        <div className="lg:col-span-7 bg-surface p-5 rounded-xl border border-borderLight shadow-card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600" /> Explainable Risk Engine Triggers
              </h3>
              <p className="text-xs text-textSecondary mt-0.5">
                Rule-based decisions computed from overdue milestones, failed checks, and blocking defects.
              </p>
            </div>
            <Badge variant="warning" size="sm">
              Decision Support
            </Badge>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {visuals?.highest_priority_risks.map((risk) => (
              <div key={risk.work_id} className="p-3 bg-slate-50 border border-borderLight rounded-lg text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-textPrimary">{risk.title}</span>
                  <Badge
                    variant={risk.risk_category === 'Critical' ? 'error' : 'warning'}
                    size="sm"
                  >
                    Risk Score: {risk.risk_score}/100
                  </Badge>
                </div>
                <p className="text-[11px] text-textSecondary leading-snug">{risk.risk_explanation}</p>
                <div className="pt-1.5 mt-1 border-t border-borderLight/60 flex items-center justify-between text-[11px]">
                  <span className="text-amber-800 font-medium">Recommended: {risk.suggested_action}</span>
                  <button
                    onClick={() => navigate('/readiness')}
                    className="text-brand hover:underline font-semibold flex items-center"
                  >
                    View Chain <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 6: Upcoming Milestones & Deadlines */}
        <div className="lg:col-span-5 bg-surface p-5 rounded-xl border border-borderLight shadow-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" /> Target Deadlines & Proximity
            </h3>
            <span className="text-[11px] text-textSecondary">Next Critical Targets</span>
          </div>

          <div className="divide-y divide-borderLight/60 max-h-80 overflow-y-auto">
            {visuals?.upcoming_deadlines.map((dl) => (
              <div key={dl.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <span className="font-semibold text-textPrimary truncate block">{dl.title}</span>
                  <span className="text-[10px] text-textSecondary block">
                    Target: {dl.due_date} • {dl.category}
                  </span>
                </div>
                <div className="shrink-0 text-right">
                  {dl.is_overdue ? (
                    <Badge variant="error" size="sm">
                      {Math.abs(dl.days_remaining)}d Overdue
                    </Badge>
                  ) : (
                    <Badge variant="neutral" size="sm">
                      {dl.days_remaining}d Left
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 7: Vendor Workload & Performance Table */}
        <div className="lg:col-span-6 bg-surface p-5 rounded-xl border border-borderLight shadow-card">
          <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2 mb-1">
            <Building className="w-4 h-4 text-brand" /> Vendor Capacity & Defect Load
          </h3>
          <p className="text-xs text-textSecondary mb-3">Monitoring contractor workload and quality compliance.</p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-borderLight text-textSecondary">
                  <th className="py-2 px-3">Contractor</th>
                  <th className="py-2 px-3">Works</th>
                  <th className="py-2 px-3">Open Defects</th>
                  <th className="py-2 px-3">Verified Avg</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderLight/60">
                {visuals?.vendor_workload_performance.map((v) => (
                  <tr key={v.vendor_id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-textPrimary block">{v.vendor_name}</span>
                      <span className="text-[10px] text-textSecondary">{v.category}</span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold">{v.assigned_works}</td>
                    <td className="py-2.5 px-3">
                      {v.open_defects > 0 ? (
                        <span className="text-govError font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-200 text-[11px]">
                          {v.open_defects} Open
                        </span>
                      ) : (
                        <span className="text-govSuccess text-[11px]">0 Clean</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-brand">{v.completion_rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 8: Recent Field Inspection Activity Stream */}
        <div className="lg:col-span-6 bg-surface p-5 rounded-xl border border-borderLight shadow-card">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-purple-600" /> Recent Field Verifications
            </h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/inspections')}>
              View All
            </Button>
          </div>

          <div className="divide-y divide-borderLight/60 max-h-72 overflow-y-auto">
            {visuals?.recent_inspections.map((insp) => (
              <div key={insp.id} className="py-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-textPrimary">{insp.work_title}</span>
                  <Badge
                    variant={
                      insp.outcome === 'Passed'
                        ? 'success'
                        : insp.outcome === 'Failed'
                        ? 'error'
                        : 'neutral'
                    }
                    size="sm"
                  >
                    {insp.outcome}
                  </Badge>
                </div>
                <div className="text-[11px] text-textSecondary mt-0.5 flex items-center gap-2">
                  <span className="font-mono text-slate-500">{insp.inspection_id}</span>
                  <span>•</span>
                  <span>{insp.inspection_type}</span>
                  <span>•</span>
                  <span>{insp.date}</span>
                </div>
                {insp.notes && (
                  <p className="text-[11px] text-slate-600 mt-1 italic bg-slate-50 p-1.5 rounded border border-borderLight/60">
                    "{insp.notes}"
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
