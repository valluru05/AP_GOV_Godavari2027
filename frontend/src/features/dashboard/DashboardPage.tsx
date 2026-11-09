import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HardHat,
  Cog,
  Flag,
  ShieldCheck,
  Award,
  AlertTriangle,
  Filter,
  RotateCcw,
  Calendar,
  ClipboardCheck,
  Send,
  UploadCloud,
  Wrench,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { DashboardMapWidget } from './DashboardMapWidget';
import { ActionQueueWidget } from './ActionQueueWidget';
import { ReadinessGaugeWidget } from './ReadinessGaugeWidget';
import type {
  SummaryMetrics,
  ActionQueueItem,
  DashboardFilterOptions,
} from '../../types/dashboard';
import type { Inspection } from '../../types/inspection';
import type { Defect } from '../../types/defect';
import type { VendorDashboardData } from '../../types/vendor';
import pushkaraluHeroBanner from '../../assets/pushkaralu-hero-banner.jpg';

export const DashboardPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();

  // Primary Role Detection
  const isInspector = hasRole('field_inspector');
  const isVendor = hasRole('vendor');
  const isProjectManager = hasRole('project_manager');

  // Filters State for Executive Dashboard
  const [filters, setFilters] = useState({
    project_id: '',
    zone_id: '',
    category: '',
    vendor_id: '',
    status: '',
    date_range: 'Jan 01, 2026 - Jul 31, 2027',
  });

  const [filterOptions, setFilterOptions] = useState<DashboardFilterOptions | null>(null);
  const [metrics, setMetrics] = useState<SummaryMetrics | null>(null);
  const [actionQueue, setActionQueue] = useState<ActionQueueItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Role-specific data states
  const [vendorData, setVendorData] = useState<VendorDashboardData | null>(null);
  const [inspectorInspections, setInspectorInspections] = useState<Inspection[]>([]);
  const [openDefects, setOpenDefects] = useState<Defect[]>([]);

  // Load Filter Options
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const opts = await api.getDashboardFilters();
        setFilterOptions(opts);
      } catch (err) {
        console.warn('Failed to load filter options', err);
      }
    };
    fetchOptions();
  }, []);

  // Load Executive Metrics and Action Queue
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const activeFilters: Record<string, string> = {};
      if (filters.project_id) activeFilters.project_id = filters.project_id;
      if (filters.zone_id) activeFilters.zone_id = filters.zone_id;
      if (filters.category) activeFilters.category = filters.category;
      if (filters.vendor_id) activeFilters.vendor_id = filters.vendor_id;
      if (filters.status) activeFilters.status = filters.status;

      const [metricsData, queueData] = await Promise.all([
        api.getDashboardMetrics(activeFilters),
        api.getDashboardActionQueue(),
      ]);

      setMetrics(metricsData);
      setActionQueue(queueData || []);

      // If user is inspector, load inspections
      if (isInspector) {
        const insp = await api.getInspections({});
        setInspectorInspections(insp);
      }

      // If user is vendor, load vendor dashboard
      if (isVendor) {
        const vData = await api.getMyVendorDashboard();
        setVendorData(vData);
      }

      // If user is PM or inspector, load open defects
      if (isInspector || isVendor || isProjectManager) {
        const defs = await api.getDefects({ status: 'Open' });
        setOpenDefects(defs);
      }
    } catch (err: any) {
      console.warn('Dashboard data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [filters, user]);

  const handleResetFilters = () => {
    setFilters({
      project_id: '',
      zone_id: '',
      category: '',
      vendor_id: '',
      status: '',
      date_range: 'Jan 01, 2026 - Jul 31, 2027',
    });
  };

  const currentDateFormatted = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // =========================================================================
  // VIEW B: FIELD INSPECTOR ROLE DASHBOARD
  // =========================================================================
  if (isInspector) {
    const pendingCount = inspectorInspections.filter((i) => i.outcome === 'Scheduled').length;
    const completedCount = inspectorInspections.filter((i) => i.outcome === 'Passed').length;
    const failedCount = inspectorInspections.filter((i) => i.outcome === 'Failed').length;

    return (
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-[#E9DED2] shadow-card">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="brand" size="sm">Field Cell &bull; QA-INSP</Badge>
              <span className="text-xs text-textSecondary">{currentDateFormatted}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-textPrimary tracking-tight">
              Welcome, {user?.full_name}
            </h1>
            <p className="text-xs text-textSecondary mt-0.5">
              Conduct on-site engineering verifications, log photographic proof, and certify bathing ghat readiness.
            </p>
          </div>

          {/* Primary Action Button */}
          <Button
            variant="saffron"
            size="lg"
            icon={<ClipboardCheck className="w-5 h-5" />}
            onClick={() => navigate('/inspections')}
            className="shadow-md"
          >
            Start Field Inspection
          </Button>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 bg-white rounded-2xl border border-[#E9DED2] shadow-card">
            <span className="text-[11px] font-semibold text-textSecondary block">Assigned Inspections</span>
            <p className="text-2xl font-extrabold text-textPrimary mt-1">{inspectorInspections.length}</p>
            <span className="text-[10px] text-[#8F2D16] font-medium mt-0.5 block">Scheduled for Ghats</span>
          </div>
          <div className="p-4 bg-white rounded-2xl border border-[#FED7AA] bg-[#FFF7ED]/30 shadow-card">
            <span className="text-[11px] font-semibold text-[#B45309] block">Due Today / Pending</span>
            <p className="text-2xl font-extrabold text-[#B45309] mt-1">{pendingCount}</p>
            <span className="text-[10px] text-[#B45309] font-medium mt-0.5 block">Immediate action required</span>
          </div>
          <div className="p-4 bg-white rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4]/30 shadow-card">
            <span className="text-[11px] font-semibold text-[#15803D] block">Certified Complete</span>
            <p className="text-2xl font-extrabold text-[#15803D] mt-1">{completedCount}</p>
            <span className="text-[10px] text-[#15803D] font-medium mt-0.5 block">Verified & Approved</span>
          </div>
          <div className="p-4 bg-white rounded-2xl border border-[#FECACA] bg-[#FEF2F2]/30 shadow-card">
            <span className="text-[11px] font-semibold text-[#B91C1C] block">Defects Logged</span>
            <p className="text-2xl font-extrabold text-[#B91C1C] mt-1">{failedCount}</p>
            <span className="text-[10px] text-[#B91C1C] font-medium mt-0.5 block">Re-inspection required</span>
          </div>
        </div>

        {/* Inspector Assigned Work List */}
        <div className="bg-white rounded-2xl border border-[#E9DED2] shadow-card p-5">
          <div className="flex items-center justify-between mb-4 border-b border-[#E9DED2] pb-3">
            <div>
              <h3 className="text-sm font-bold text-textPrimary uppercase tracking-wider flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-[#8F2D16]" /> My Inspection Assignments
              </h3>
              <p className="text-xs text-textSecondary mt-0.5">
                Select an assigned ghat work package to record checklist findings and upload GPS-tagged photos.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/inspections')}>
              View All Records
            </Button>
          </div>

          <div className="divide-y divide-[#E9DED2]/60">
            {inspectorInspections.map((insp) => (
              <div
                key={insp.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF4EC]/60 px-2 rounded-xl transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-textPrimary">
                      {insp.work_package_title || insp.inspection_type}
                    </span>
                    <Badge
                      variant={
                        insp.outcome === 'Passed'
                          ? 'success'
                          : insp.outcome === 'Failed'
                          ? 'error'
                          : 'warning'
                      }
                      size="sm"
                    >
                      {insp.outcome}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-textSecondary mt-0.5">
                    {insp.inspection_type} &bull; Scheduled: {insp.scheduled_date} &bull; Ref: {insp.inspection_id}
                  </p>
                </div>
                <Button
                  variant="saffron"
                  size="sm"
                  onClick={() => navigate(`/inspections/${insp.id}`)}
                >
                  Conduct Inspection
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW C: VENDOR / CONTRACTOR ROLE DASHBOARD
  // =========================================================================
  if (isVendor) {
    const assignedWorks = vendorData?.assigned_work_packages || [];
    const pendingSubmissions = vendorData?.recent_submissions || [];
    const openDefectCount = vendorData?.metrics?.open_defects_count || openDefects.length;

    return (
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-[#E9DED2] shadow-card">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="saffron" size="sm">Contractor Portal</Badge>
              <span className="text-xs text-textSecondary">{currentDateFormatted}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-textPrimary tracking-tight">
              {user?.full_name} &bull; {vendorData?.vendor?.company_name || 'Assigned Contractor'}
            </h1>
            <p className="text-xs text-textSecondary mt-0.5">
              Submit progress milestones, upload physical proof photographs, and address inspection defect notices.
            </p>
          </div>

          {/* 3 Prominent Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="saffron"
              size="md"
              icon={<Send className="w-4 h-4" />}
              onClick={() => navigate('/vendor-portal')}
            >
              Submit Progress
            </Button>
            <Button
              variant="secondary"
              size="md"
              icon={<UploadCloud className="w-4 h-4 text-[#8F2D16]" />}
              onClick={() => navigate('/vendor-portal')}
            >
              Upload Evidence
            </Button>
            <Button
              variant="outline"
              size="md"
              icon={<Wrench className="w-4 h-4" />}
              onClick={() => navigate('/defects')}
            >
              Respond to Defect
            </Button>
          </div>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 bg-white rounded-2xl border border-[#E9DED2] shadow-card">
            <span className="text-[11px] font-semibold text-textSecondary block">Assigned Works</span>
            <p className="text-2xl font-extrabold text-textPrimary mt-1">{assignedWorks.length}</p>
            <span className="text-[10px] text-textSecondary mt-0.5 block">Approved Work Packages</span>
          </div>
          <div className="p-4 bg-white rounded-2xl border border-[#E9DED2] shadow-card">
            <span className="text-[11px] font-semibold text-[#8F2D16] block">Pending Submissions</span>
            <p className="text-2xl font-extrabold text-[#8F2D16] mt-1">{pendingSubmissions.length}</p>
            <span className="text-[10px] text-[#8F2D16] mt-0.5 block">Awaiting Govt Review</span>
          </div>
          <div className="p-4 bg-white rounded-2xl border border-[#FECACA] bg-[#FEF2F2]/30 shadow-card">
            <span className="text-[11px] font-semibold text-[#B91C1C] block">Defects Requiring Correction</span>
            <p className="text-2xl font-extrabold text-[#B91C1C] mt-1">{openDefectCount}</p>
            <span className="text-[10px] text-[#B91C1C] mt-0.5 block">Action required before payment</span>
          </div>
          <div className="p-4 bg-white rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4]/30 shadow-card">
            <span className="text-[11px] font-semibold text-[#15803D] block">Verified & Accepted</span>
            <p className="text-2xl font-extrabold text-[#15803D] mt-1">
              {vendorData?.metrics?.milestones_completed ?? 1}
            </p>
            <span className="text-[10px] text-[#15803D] mt-0.5 block">Inspection Passed</span>
          </div>
        </div>

        {/* Vendor Works Table */}
        <div className="bg-white rounded-2xl border border-[#E9DED2] shadow-card p-5">
          <div className="flex items-center justify-between mb-4 border-b border-[#E9DED2] pb-3">
            <h3 className="text-sm font-bold text-textPrimary uppercase tracking-wider">
              My Work Execution Status
            </h3>
            <Button variant="outline" size="sm" onClick={() => navigate('/vendor-portal')}>
              Open Full Portal
            </Button>
          </div>

          <div className="space-y-3">
            {assignedWorks.map((work) => (
              <div
                key={work.id}
                className="p-4 rounded-xl border border-[#E9DED2] bg-[#FFFDF9] flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-textPrimary">{work.title}</span>
                    <Badge variant="brand" size="sm">{work.workflow_state}</Badge>
                  </div>
                  <p className="text-[11px] text-textSecondary mt-0.5">
                    Target Completion: {work.target_completion_date} &bull; Ghat Sector: {work.category}
                  </p>

                  {/* Progress Comparison */}
                  <div className="flex items-center gap-4 mt-2 text-xs">
                    <div>
                      <span className="text-textSecondary text-[11px]">Reported: </span>
                      <strong className="text-[#8F2D16]">{work.reported_progress_percentage}%</strong>
                    </div>
                    <div>
                      <span className="text-textSecondary text-[11px]">Verified: </span>
                      <strong className="text-[#15803D]">{work.verified_progress_percentage}%</strong>
                    </div>
                  </div>
                </div>

                <Button
                  variant="saffron"
                  size="sm"
                  onClick={() => navigate('/vendor-portal')}
                >
                  Update Progress
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW D: PROJECT MANAGER ROLE DASHBOARD
  // =========================================================================
  if (isProjectManager) {
    return (
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-[#E9DED2] shadow-card">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="brand" size="sm">Project Management Cell</Badge>
              <span className="text-xs text-textSecondary">{currentDateFormatted}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-textPrimary tracking-tight">
              Welcome, {user?.full_name}
            </h1>
            <p className="text-xs text-textSecondary mt-0.5">
              Supervise work package milestones, validate vendor claims, and coordinate field verification schedules.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="saffron"
              size="md"
              icon={<ClipboardCheck className="w-4 h-4" />}
              onClick={() => navigate('/inspections')}
            >
              Request Inspection
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={() => navigate('/projects')}
            >
              View All Projects
            </Button>
          </div>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 bg-white rounded-2xl border border-[#E9DED2] shadow-card">
            <span className="text-[11px] font-semibold text-textSecondary block">Assigned Schemes</span>
            <p className="text-2xl font-extrabold text-textPrimary mt-1">{metrics?.total_projects ?? 8}</p>
            <span className="text-[10px] text-textSecondary mt-0.5 block">Under Active PWD Oversight</span>
          </div>
          <div className="p-4 bg-white rounded-2xl border border-[#FED7AA] bg-[#FFF7ED]/30 shadow-card">
            <span className="text-[11px] font-semibold text-[#B45309] block">Milestones Due Soon</span>
            <p className="text-2xl font-extrabold text-[#B45309] mt-1">{metrics?.overdue_milestones ?? 2}</p>
            <span className="text-[10px] text-[#B45309] mt-0.5 block">Next 14 days target</span>
          </div>
          <div className="p-4 bg-white rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4]/30 shadow-card">
            <span className="text-[11px] font-semibold text-[#15803D] block">Vendor Claims Under Review</span>
            <p className="text-2xl font-extrabold text-[#15803D] mt-1">{metrics?.reported_complete_works ?? 2}</p>
            <span className="text-[10px] text-[#15803D] mt-0.5 block">Awaiting PM certification</span>
          </div>
          <div className="p-4 bg-white rounded-2xl border border-[#FECACA] bg-[#FEF2F2]/30 shadow-card">
            <span className="text-[11px] font-semibold text-[#B91C1C] block">Blocked Work Packages</span>
            <p className="text-2xl font-extrabold text-[#B91C1C] mt-1">{openDefects.length}</p>
            <span className="text-[10px] text-[#B91C1C] mt-0.5 block">Critical defect holds</span>
          </div>
        </div>

        {/* Tactical Actions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7">
            <ActionQueueWidget items={actionQueue} />
          </div>
          <div className="lg:col-span-5">
            <ReadinessGaugeWidget
              score={72}
              onTrackCount={5}
              atRiskCount={2}
              overdueCount={1}
            />
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW A & DEFAULT: MUNICIPAL ADMIN / SUPER ADMIN / EXECUTIVE COMMAND CENTER
  // (EXACT LAYOUT AS SHOWN IN USER REFERENCE IMAGE)
  // =========================================================================
  return (
    <div className="space-y-4 sm:space-y-5">
      {/* =================================================================== */}
      {/* SECTION 1: Pushkaralu Panoramic Hero Banner with Live Readiness Dot */}
      {/* =================================================================== */}
      <div className="relative rounded-2xl overflow-hidden border border-[#E9DED2] shadow-card bg-gradient-to-r from-[#FFF5E6] via-[#FAF0E1] to-[#FFF5E6]">
        {/* Banner Image as Responsive Container */}
        <div className="relative w-full h-[140px] sm:h-[165px] md:h-[185px] lg:h-[200px] overflow-hidden">
          <img
            src={pushkaraluHeroBanner}
            alt="Sri Godavari Pushkaralu 2027 Infrastructure Readiness Command Center"
            className="w-full h-full object-cover object-left-top"
          />

          {/* Dynamic Live Readiness Score Badge in upper-right corner */}
          <div className="absolute top-3 right-3 sm:top-4 sm:right-5 bg-gradient-to-b from-[#691807]/90 to-[#481105]/95 backdrop-blur-md text-white px-3.5 py-2 rounded-xl border border-white/20 shadow-lg flex flex-col min-w-[170px] sm:min-w-[190px]">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E] animate-pulse"></span>
              <span className="text-[11px] font-bold text-white tracking-wide">
                Pushkaralu Readiness
              </span>
            </div>
            <span className="text-xs font-semibold text-[#FDE047] leading-tight">
              In Progress (72%)
            </span>
            <div className="w-full bg-white/20 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div className="bg-[#22C55E] h-1.5 rounded-full w-[72%] transition-all duration-1000"></div>
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* SECTION 2: Jurisdiction & Sector Filter Bar                         */}
      {/* =================================================================== */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#E9DED2] shadow-subtle flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#E87512]" />
            <span className="text-xs font-bold text-textPrimary uppercase tracking-wider">
              Jurisdiction &amp; Filters
            </span>
            {loading && (
              <span className="text-[10px] text-[#8F2D16] font-medium animate-pulse ml-2">
                &bull; Refreshing data...
              </span>
            )}
          </div>
          {(filters.project_id || filters.zone_id || filters.category || filters.vendor_id || filters.status) && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-[#8F2D16] hover:text-[#73200E] flex items-center gap-1 font-semibold transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
          {/* Project */}
          <div>
            <label className="block text-[10px] font-semibold text-textSecondary uppercase mb-1">Project</label>
            <select
              value={filters.project_id}
              onChange={(e) => setFilters({ ...filters, project_id: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs bg-[#FFFDF9] border border-[#E9DED2] rounded-lg text-textPrimary focus:ring-1 focus:ring-[#8F2D16] focus:border-[#8F2D16] truncate"
            >
              <option value="">All Projects</option>
              {filterOptions?.projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Ghat / Zone */}
          <div>
            <label className="block text-[10px] font-semibold text-textSecondary uppercase mb-1">Ghat / Zone</label>
            <select
              value={filters.zone_id}
              onChange={(e) => setFilters({ ...filters, zone_id: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs bg-[#FFFDF9] border border-[#E9DED2] rounded-lg text-textPrimary focus:ring-1 focus:ring-[#8F2D16] focus:border-[#8F2D16] truncate"
            >
              <option value="">All Ghats &amp; Zones</option>
              {filterOptions?.zones.map((z) => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
          </div>

          {/* Work Category */}
          <div>
            <label className="block text-[10px] font-semibold text-textSecondary uppercase mb-1">Work Category</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs bg-[#FFFDF9] border border-[#E9DED2] rounded-lg text-textPrimary focus:ring-1 focus:ring-[#8F2D16] focus:border-[#8F2D16] truncate"
            >
              <option value="">All Categories</option>
              {filterOptions?.categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Vendor */}
          <div>
            <label className="block text-[10px] font-semibold text-textSecondary uppercase mb-1">Vendor</label>
            <select
              value={filters.vendor_id}
              onChange={(e) => setFilters({ ...filters, vendor_id: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs bg-[#FFFDF9] border border-[#E9DED2] rounded-lg text-textPrimary focus:ring-1 focus:ring-[#8F2D16] focus:border-[#8F2D16] truncate"
            >
              <option value="">All Vendors</option>
              {filterOptions?.vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          {/* Workflow State */}
          <div>
            <label className="block text-[10px] font-semibold text-textSecondary uppercase mb-1">Workflow State</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs bg-[#FFFDF9] border border-[#E9DED2] rounded-lg text-textPrimary focus:ring-1 focus:ring-[#8F2D16] focus:border-[#8F2D16] truncate"
            >
              <option value="">All States</option>
              {filterOptions?.statuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-[10px] font-semibold text-textSecondary uppercase mb-1">Date Range</label>
            <div className="flex items-center justify-between px-2.5 py-1.5 text-xs bg-[#FFFDF9] border border-[#E9DED2] rounded-lg text-textPrimary">
              <span className="truncate">{filters.date_range}</span>
              <Calendar className="w-3.5 h-3.5 text-textSecondary shrink-0 ml-1" />
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* SECTION 3: 6 Clickable Summary Metric Cards (Exact Reference Design)*/}
      {/* =================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Total Projects */}
        <div
          onClick={() => navigate('/projects')}
          className="p-3.5 bg-white rounded-2xl border border-[#E9DED2] shadow-subtle hover:border-[#E87512] hover:shadow-card transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-8 h-8 rounded-full bg-[#FEF3E8] border border-[#FCE4CB] flex items-center justify-center shrink-0">
              <HardHat className="w-4 h-4 text-[#E87512]" />
            </div>
            <span className="text-[11px] font-bold text-textSecondary">Total Projects</span>
          </div>
          <p className="text-2xl font-extrabold text-textPrimary tracking-tight pl-1">
            {metrics?.total_projects ?? 8}
          </p>
          <span className="text-[10px] text-textSecondary block mt-0.5 pl-1">Approved Schemes</span>
        </div>

        {/* 2. Active Works */}
        <div
          onClick={() => navigate('/projects')}
          className="p-3.5 bg-white rounded-2xl border border-[#E9DED2] shadow-subtle hover:border-[#E87512] hover:shadow-card transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-8 h-8 rounded-full bg-[#FEF3E8] border border-[#FCE4CB] flex items-center justify-center shrink-0">
              <Cog className="w-4 h-4 text-[#E87512]" />
            </div>
            <span className="text-[11px] font-bold text-textSecondary">Active Works</span>
          </div>
          <p className="text-2xl font-extrabold text-textPrimary tracking-tight pl-1">
            {metrics?.active_works ?? 4}
          </p>
          <span className="text-[10px] text-textSecondary block mt-0.5 pl-1">In Execution</span>
        </div>

        {/* 3. Reported Complete */}
        <div
          onClick={() => navigate('/projects')}
          className="p-3.5 bg-white rounded-2xl border border-[#FED7AA]/70 bg-[#FFF7ED]/25 shadow-subtle hover:border-[#E87512] hover:shadow-card transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-8 h-8 rounded-full bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center shrink-0">
              <Flag className="w-4 h-4 text-[#B91C1C]" />
            </div>
            <span className="text-[11px] font-bold text-[#8F2D16]">Reported Complete</span>
          </div>
          <p className="text-2xl font-extrabold text-[#8F2D16] tracking-tight pl-1">
            {metrics?.reported_complete_works ?? 2}
          </p>
          <span className="text-[10px] text-textSecondary block mt-0.5 pl-1">Vendor Claims 100%</span>
        </div>

        {/* 4. Verified Complete */}
        <div
          onClick={() => navigate('/inspections')}
          className="p-3.5 bg-white rounded-2xl border border-[#BBF7D0]/70 bg-[#F0FDF4]/25 shadow-subtle hover:border-[#15803D] hover:shadow-card transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-8 h-8 rounded-full bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-[#15803D]" />
            </div>
            <span className="text-[11px] font-bold text-[#15803D]">Verified Complete</span>
          </div>
          <p className="text-2xl font-extrabold text-[#15803D] tracking-tight pl-1">
            {metrics?.verified_complete_works ?? 1}
          </p>
          <span className="text-[10px] text-[#15803D] block mt-0.5 pl-1">Inspection Certified</span>
        </div>

        {/* 5. Accepted Works */}
        <div
          onClick={() => navigate('/readiness')}
          className="p-3.5 bg-white rounded-2xl border border-[#FDE68A]/70 bg-[#FFFBEB]/25 shadow-subtle hover:border-[#B45309] hover:shadow-card transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-8 h-8 rounded-full bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-center shrink-0">
              <Award className="w-4 h-4 text-[#B45309]" />
            </div>
            <span className="text-[11px] font-bold text-[#B45309]">Accepted Works</span>
          </div>
          <p className="text-2xl font-extrabold text-[#B45309] tracking-tight pl-1">
            {metrics?.accepted_works ?? 1}
          </p>
          <span className="text-[10px] text-[#B45309] block mt-0.5 pl-1">Formally Approved</span>
        </div>

        {/* 6. Works at Risk */}
        <div
          onClick={() => navigate('/readiness')}
          className="p-3.5 bg-white rounded-2xl border border-[#FECACA]/70 bg-[#FEF2F2]/25 shadow-subtle hover:border-[#B91C1C] hover:shadow-card transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-8 h-8 rounded-full bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-[#B91C1C]" />
            </div>
            <span className="text-[11px] font-bold text-[#B91C1C]">Works at Risk</span>
          </div>
          <p className="text-2xl font-extrabold text-[#B91C1C] tracking-tight pl-1">
            {metrics?.works_at_risk ?? 3}
          </p>
          <span className="text-[10px] text-[#B91C1C] block mt-0.5 pl-1">Score &ge; 60 / Critical</span>
        </div>
      </div>

      {/* =================================================================== */}
      {/* SECTION 4: 3-Column Tactical Display (Map + Queue + Gauge)          */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left (Column 1, ~42%): Project Readiness Map */}
        <div className="lg:col-span-5 min-h-[340px]">
          <DashboardMapWidget />
        </div>

        {/* Middle (Column 2, ~35%): Prioritized Action Queue */}
        <div className="lg:col-span-4 min-h-[340px]">
          <ActionQueueWidget items={actionQueue} />
        </div>

        {/* Right (Column 3, ~23%): Overall Project Readiness Arc Gauge */}
        <div className="lg:col-span-3 min-h-[340px]">
          <ReadinessGaugeWidget
            score={72}
            onTrackCount={5}
            atRiskCount={2}
            overdueCount={1}
          />
        </div>
      </div>

      {/* =================================================================== */}
      {/* SECTION 5: Advanced Links & Progressive Disclosure Section          */}
      {/* =================================================================== */}
      <div className="p-4 bg-white rounded-2xl border border-[#E9DED2] shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-textSecondary">
          <Sparkles className="w-4 h-4 text-[#E87512]" />
          <span>
            Explore advanced telemetry, multi-party cryptographic audits, and dependency chains:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => navigate('/readiness')}
            className="px-3 py-1.5 rounded-lg bg-[#FAF4EC] hover:bg-[#F2E7D9] text-[#8F2D16] font-bold transition-colors inline-flex items-center gap-1"
          >
            <span>Readiness Chain</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => navigate('/dependencies')}
            className="px-3 py-1.5 rounded-lg bg-[#FAF4EC] hover:bg-[#F2E7D9] text-[#8F2D16] font-bold transition-colors inline-flex items-center gap-1"
          >
            <span>Dependency Graph</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => navigate('/admin/audit')}
            className="px-3 py-1.5 rounded-lg bg-[#FAF4EC] hover:bg-[#F2E7D9] text-[#8F2D16] font-bold transition-colors inline-flex items-center gap-1"
          >
            <span>Audit Explorer</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
