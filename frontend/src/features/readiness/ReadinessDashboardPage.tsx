import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Activity,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Info
} from 'lucide-react';
import { api } from '../../services/api';
import { Badge, type BadgeVariant } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ReadinessChainModal } from './ReadinessChainModal';
import { RiskExplanationModal } from './RiskExplanationModal';
import { AcceptanceModal } from './AcceptanceModal';
import type {
  ReadinessDashboardSummary,
  RiskCategory,
} from '../../types/readiness';

export const ReadinessDashboardPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [summary, setSummary] = useState<ReadinessDashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRiskCategory, setSelectedRiskCategory] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Modal States
  const [selectedChainWpId, setSelectedChainWpId] = useState<string | null>(null);
  const [selectedRiskWpId, setSelectedRiskWpId] = useState<string | null>(null);
  const [selectedAcceptWpId, setSelectedAcceptWpId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedRiskCategory, selectedCategory]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getReadinessDashboard({
        risk_category: selectedRiskCategory !== 'All' ? selectedRiskCategory : undefined,
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
      });
      setSummary(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load readiness dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  const filteredPackages = (summary?.highest_risk_work_packages || []).filter((wp) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      wp.work_id.toLowerCase().includes(q) ||
      wp.work_package_title.toLowerCase().includes(q) ||
      wp.project_name.toLowerCase().includes(q) ||
      (wp.vendor_name && wp.vendor_name.toLowerCase().includes(q))
    );
  });

  const getRiskCategoryBadgeVariant = (cat: RiskCategory): BadgeVariant => {
    switch (cat) {
      case 'Critical':
        return 'error';
      case 'High':
        return 'warning';
      case 'Moderate':
        return 'brand';
      case 'Low':
        return 'success';
      default:
        return 'neutral';
    }
  };

  const getScoreColorClass = (score: number) => {
    if (score >= 70) return 'text-red-700 bg-red-50 border-red-200';
    if (score >= 50) return 'text-orange-700 bg-orange-50 border-orange-200';
    if (score >= 25) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white border border-borderLight rounded-xl p-6 shadow-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-brand border border-blue-200">
                <ShieldCheck className="w-3.5 h-3.5 text-brand" />
                Pushkaralu 2027 Core Architecture
              </span>
              <span className="text-xs text-textSecondary font-medium">Sections 13 & 14 Invariant Compliant</span>
            </div>
            <h1 className="text-2xl font-bold text-textPrimary tracking-tight">
              Verified Readiness Chain & Risk Engine
            </h1>
            <p className="text-sm text-textSecondary mt-1 max-w-3xl">
              Strict separation between vendor-reported progress and field-verified progress, 12-stage audited lifecycle traceability, and explainable 0–100 risk scoring.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="secondary"
              onClick={loadData}
              isLoading={loading}
              icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Hero 5 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Average Risk Index */}
        <div className="bg-white border border-borderLight rounded-xl p-5 shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">Avg Risk Index</span>
            <Activity className="w-4 h-4 text-brand" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{summary?.average_risk_score ?? '--'}</span>
            <span className="text-xs text-slate-500 font-medium">/ 100</span>
          </div>
          <div className="text-xs text-textSecondary">
            {summary && summary.average_risk_score >= 50 ? (
              <span className="text-red-600 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> High overall risk profile
              </span>
            ) : (
              <span className="text-emerald-700 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Moderate portfolio risk
              </span>
            )}
          </div>
        </div>

        {/* KPI 2: Acceptance Gate */}
        <div className="bg-white border border-borderLight rounded-xl p-5 shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">Acceptance Gate</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-700">{summary?.accepted_work_packages ?? 0}</span>
            <span className="text-xs text-slate-500 font-medium">/ {summary?.total_work_packages ?? 0} packages</span>
          </div>
          <div className="text-xs text-textSecondary">
            <span>{summary?.pending_acceptance_count ?? 0} ready for review</span>
          </div>
        </div>

        {/* KPI 3: Blocked Readiness Chains */}
        <div className="bg-white border border-borderLight rounded-xl p-5 shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">Blocked Chains</span>
            <XCircle className="w-4 h-4 text-red-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-red-700">{summary?.blocked_work_packages ?? 0}</span>
            <span className="text-xs text-red-600 font-medium">critical / high</span>
          </div>
          <div className="text-xs text-red-700">
            <span>Blocked by defects or tests</span>
          </div>
        </div>

        {/* KPI 4: Overdue Milestones (Rule A) */}
        <div className="bg-white border border-borderLight rounded-xl p-5 shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">Overdue Milestones</span>
            <Clock className="w-4 h-4 text-orange-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-orange-600">{summary?.overdue_milestones_count ?? 0}</span>
            <span className="text-xs text-slate-500 font-medium">Rule A</span>
          </div>
          <div className="text-xs text-textSecondary">
            <span>Unverified past deadline</span>
          </div>
        </div>

        {/* KPI 5: Blocking Defects (Rule D) */}
        <div className="bg-white border border-borderLight rounded-xl p-5 shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">Blocking Defects</span>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-red-600">{summary?.open_blocking_defects_count ?? 0}</span>
            <span className="text-xs text-slate-500 font-medium">Rule D</span>
          </div>
          <div className="text-xs text-textSecondary">
            <span>Critical/High quality defects</span>
          </div>
        </div>
      </div>

      {/* Invariant Educational Callout */}
      <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-4 flex items-start gap-3 text-xs text-blue-900">
        <Info className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold">Core Invariant: Reported Progress ≠ Verified Progress</span>
          <p className="text-blue-800 leading-relaxed">
            In CivicProof, vendor-submitted progress is treated solely as a contractor assertion. Verified progress requires certified field inspections, geo-tagged photographs, and laboratory test certificates. Formal acceptance is permanently blocked until all 12 stages in the readiness chain are satisfied or granted an authorized administrative exception.
          </p>
        </div>
      </div>

      {/* Filter and Risk Distribution Bar */}
      <div className="bg-white border border-borderLight rounded-xl p-4 shadow-card space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box & Category Dropdown */}
          <div className="flex flex-1 items-center gap-3 max-w-xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search work packages, projects, vendors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand bg-white text-slate-700 font-medium"
            >
              <option value="All">All Categories</option>
              <option value="Drinking Water">Drinking Water</option>
              <option value="Sanitation">Sanitation</option>
              <option value="Public Safety">Public Safety</option>
              <option value="Public Lighting">Public Lighting</option>
            </select>
          </div>

          {/* Risk Category Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['All', 'Critical', 'High', 'Moderate', 'Low'].map((cat) => {
              const count =
                cat === 'All'
                  ? summary?.total_work_packages ?? 0
                  : summary?.risk_distribution[cat] ?? 0;
              const isSelected = selectedRiskCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedRiskCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-brand text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>{cat}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Prioritized Work Packages Table */}
      <div className="bg-white border border-borderLight rounded-xl shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-borderLight flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-textPrimary">
              Prioritized Infrastructure Work Packages ({filteredPackages.length})
            </h3>
            <p className="text-xs text-textSecondary mt-0.5">
              Ranked in real time by 0–100 explainable risk score computed from Rules A through G.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 m-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-borderLight text-slate-500 uppercase font-semibold">
                <th className="py-3 px-4">Work Package</th>
                <th className="py-3 px-4">Project & Vendor</th>
                <th className="py-3 px-4 text-center">Progress (Reported vs Verified)</th>
                <th className="py-3 px-4 text-center">Risk Score & Category</th>
                <th className="py-3 px-4">Primary Risk Factor</th>
                <th className="py-3 px-4 text-center">Workflow State</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderLight">
              {filteredPackages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-textSecondary font-medium">
                    No work packages matched your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredPackages.map((wp) => {
                  const delta = wp.reported_progress_percentage - wp.verified_progress_percentage;
                  const scoreClass = getScoreColorClass(wp.risk_score);
                  const primaryFactor = wp.factors[0];

                  return (
                    <tr key={wp.work_package_id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Work Package */}
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-brand block">{wp.work_id}</span>
                        <span className="font-bold text-textPrimary line-clamp-1">{wp.work_package_title}</span>
                        <span className="text-[11px] text-textSecondary">{wp.category}</span>
                      </td>

                      {/* Project & Vendor */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 block line-clamp-1">{wp.project_name}</span>
                        <span className="text-[11px] text-slate-500">{wp.vendor_name || 'No Vendor Assigned'}</span>
                      </td>

                      {/* Reported vs Verified Progress */}
                      <td className="py-3 px-4 text-center">
                        <div className="space-y-1 inline-block text-left w-36">
                          <div className="flex justify-between text-[11px] font-medium">
                            <span className="text-slate-600">Reported: <b>{wp.reported_progress_percentage}%</b></span>
                            <span className="text-emerald-700">Verified: <b>{wp.verified_progress_percentage}%</b></span>
                          </div>
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                            <div
                              className="bg-emerald-600 h-full"
                              style={{ width: `${Math.min(100, wp.verified_progress_percentage)}%` }}
                              title={`Verified: ${wp.verified_progress_percentage}%`}
                            />
                            {delta > 0 && (
                              <div
                                className="bg-amber-400 h-full"
                                style={{ width: `${Math.min(100 - wp.verified_progress_percentage, delta)}%` }}
                                title={`Unverified Claim: ${delta}%`}
                              />
                            )}
                          </div>
                          {delta > 0 && (
                            <span className="text-[10px] font-bold text-amber-700 block text-right">
                              Δ -{delta.toFixed(0)}% Unverified
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Risk Score & Category */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded font-black font-mono border ${scoreClass}`}>
                            {wp.risk_score}
                          </span>
                          <Badge variant={getRiskCategoryBadgeVariant(wp.risk_category)} size="sm">
                            {wp.risk_category}
                          </Badge>
                        </div>
                      </td>

                      {/* Primary Factor */}
                      <td className="py-3 px-4 max-w-[200px]">
                        {primaryFactor ? (
                          <div className="space-y-0.5">
                            <span className="font-semibold text-slate-900 block truncate" title={primaryFactor.rule_name}>
                              {primaryFactor.rule_name}
                            </span>
                            <span className="text-[11px] text-slate-500 line-clamp-1" title={primaryFactor.explanation}>
                              {primaryFactor.explanation}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">No active risk triggers</span>
                        )}
                      </td>

                      {/* Workflow State */}
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant={
                            wp.workflow_state.includes('Accepted')
                              ? 'success'
                              : wp.workflow_state === 'Verification Failed' || wp.workflow_state === 'Rework Required'
                              ? 'error'
                              : 'neutral'
                          }
                          size="sm"
                        >
                          {wp.workflow_state}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedChainWpId(wp.work_package_id)}
                            title="Inspect 12-Stage Verified Readiness Chain"
                          >
                            12-Stage Chain
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedRiskWpId(wp.work_package_id)}
                            title="View Explainable Risk Rule Breakdown"
                          >
                            Risk Factors
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setSelectedAcceptWpId(wp.work_package_id)}
                            title="Execute Controlled Acceptance Gate Review"
                          >
                            Acceptance
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <ReadinessChainModal
        isOpen={Boolean(selectedChainWpId)}
        onClose={() => setSelectedChainWpId(null)}
        workPackageId={selectedChainWpId}
        onOpenAcceptance={(id) => setSelectedAcceptWpId(id)}
      />

      <RiskExplanationModal
        isOpen={Boolean(selectedRiskWpId)}
        onClose={() => setSelectedRiskWpId(null)}
        workPackageId={selectedRiskWpId}
        onOpenChain={(id) => setSelectedChainWpId(id)}
      />

      <AcceptanceModal
        isOpen={Boolean(selectedAcceptWpId)}
        onClose={() => setSelectedAcceptWpId(null)}
        workPackageId={selectedAcceptWpId}
        onAccepted={() => {
          loadData();
        }}
      />
    </div>
  );
};
