import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ClipboardCheck,
  Search,
  Plus,
  ShieldCheck,
  AlertTriangle,
  FileCheck2,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  SlidersHorizontal,
  Activity,
  ArrowRight
} from 'lucide-react';
import { api } from '../../services/api';
import type { Inspection, InspectionStats, InspectionCreateRequest } from '../../types/inspection';
import type { WorkPackage } from '../../types/project';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';

export const InspectionListPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission, hasRole } = useAuth();

  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [stats, setStats] = useState<InspectionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Scheduling Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [allWorkPackages, setAllWorkPackages] = useState<WorkPackage[]>([]);
  const [scheduleData, setScheduleData] = useState<InspectionCreateRequest>({
    work_package_id: '',
    milestone_id: '',
    scheduled_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    inspection_type: 'Pre-Commissioning Verification',
    notes: '',
  });
  const [formError, setFormError] = useState('');

  const canSchedule = hasPermission('inspections:assign') || hasRole('super_admin') || hasRole('municipal_admin');

  const loadData = async () => {
    try {
      setLoading(true);
      const [inspData, statsData] = await Promise.all([
        api.getInspections({
          search: search || undefined,
          outcome: outcomeFilter || undefined,
          inspection_type: typeFilter || undefined,
        }),
        api.getInspectionStats(),
      ]);
      setInspections(inspData);
      setStats(statsData);
    } catch (err: any) {
      console.error('Failed to load inspection records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [outcomeFilter, typeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const openScheduleModal = async () => {
    try {
      setFormError('');
      const wps = await api.getWorkPackages();
      setAllWorkPackages(wps);
      if (wps.length > 0) {
        setScheduleData((prev) => ({ ...prev, work_package_id: wps[0].id }));
      }
      setIsScheduleModalOpen(true);
    } catch (err: any) {
      console.error('Failed to load work packages for scheduling:', err);
      setIsScheduleModalOpen(true);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleData.work_package_id) {
      setFormError('Please select a target work package.');
      return;
    }
    try {
      setScheduling(true);
      setFormError('');
      await api.scheduleInspection({
        ...scheduleData,
        milestone_id: scheduleData.milestone_id || undefined,
      });
      setIsScheduleModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to schedule field inspection.');
    } finally {
      setScheduling(false);
    }
  };

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case 'Passed':
        return (
          <Badge variant="success" className="gap-1 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Passed
          </Badge>
        );
      case 'Failed':
        return (
          <Badge variant="error" className="gap-1 font-semibold">
            <XCircle className="w-3.5 h-3.5" />
            Failed (Defect)
          </Badge>
        );
      case 'Scheduled':
        return (
          <Badge variant="warning" className="gap-1 font-semibold">
            <Clock className="w-3.5 h-3.5" />
            Scheduled
          </Badge>
        );
      case 'Conditional Pass':
        return (
          <Badge variant="info" className="gap-1 font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            Conditional Pass
          </Badge>
        );
      default:
        return <Badge variant="neutral">{outcome}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {t('inspections.title')}
            </h1>
            <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-medium">
              Module 5
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t('inspections.subtitle')}
          </p>
        </div>
        {canSchedule && (
          <Button
            onClick={openScheduleModal}
            className="flex items-center gap-2 bg-[#174EA6] hover:bg-[#123e85] text-white shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t('inspections.newInspection')}
          </Button>
        )}
      </div>

      {/* Mandatory Anti-Corruption & Section 28 Rule Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-xl p-5 shadow-sm border border-blue-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 pointer-events-none">
          <ShieldCheck className="w-48 h-48 text-white" />
        </div>
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-800/80 rounded-lg text-blue-200 mt-0.5 shrink-0">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-base text-white tracking-wide">
                Physical Verification Integrity Policy (Section 28 & 31.4)
              </h2>
              <span className="text-[11px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded border border-emerald-500/30">
                Rule Active
              </span>
            </div>
            <p className="text-xs text-blue-100 leading-relaxed max-w-4xl">
              Contractor progress self-declarations <strong>do not award verified progress</strong>. Physical progress (<code className="text-emerald-300 bg-blue-950/50 px-1 py-0.5 rounded">verified_progress_percentage</code>) is legally recognized and awarded solely through independent on-site engineering checklists, geotagged evidence, and sensor-verified measurements.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Summary Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium uppercase tracking-wider">Total Audits</span>
              <FileCheck2 className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{stats.total_inspections}</span>
              <span className="text-xs text-slate-500">records</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-600">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Passed Verdicts</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-700">{stats.passed_count}</span>
              <span className="text-xs text-emerald-600 font-medium">certified</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-rose-600">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Failed / Defects</span>
              <XCircle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-rose-700">{stats.failed_count}</span>
              <span className="text-xs text-rose-600 font-medium">rework req</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-600">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Scheduled / Open</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-700">{stats.scheduled_count}</span>
              <span className="text-xs text-amber-600 font-medium">pending dispatch</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between col-span-2 md:col-span-1">
            <div className="flex items-center justify-between text-indigo-600">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Pass Rate</span>
              <Activity className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-slate-900">{stats.pass_rate_percentage}%</span>
                <span className="text-xs text-slate-500">first-time pass</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full"
                  style={{ width: `${Math.min(stats.pass_rate_percentage, 100)}%` }}
                />
              </div>
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
              placeholder={t('inspections.searchPlaceholder')}
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
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Outcomes</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Passed">Passed</option>
              <option value="Failed">Failed (Defect)</option>
              <option value="Conditional Pass">Conditional Pass</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Inspection Types</option>
              <option value="Mandatory Pressure/Safety Test">Pressure / Safety Test</option>
              <option value="Sanitation & Acceptance Audit">Sanitation Audit</option>
              <option value="Electrical & Illumination Audit">Electrical & Illumination</option>
              <option value="Pre-Commissioning Verification">Pre-Commissioning</option>
              <option value="Civil & Structural Stability Audit">Civil & Structural</option>
            </select>

            <Button type="submit" variant="secondary" size="sm" className="text-xs px-3 py-2">
              Filter
            </Button>

            {(search || outcomeFilter || typeFilter) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-slate-500 hover:text-slate-800"
                onClick={() => {
                  setSearch('');
                  setOutcomeFilter('');
                  setTypeFilter('');
                }}
              >
                Reset
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* Inspections Registry Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
            Loading field verification records...
          </div>
        ) : inspections.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-900">No field inspections found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              No verification records match your selected query criteria.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card Layout for <md */}
            <div className="md:hidden divide-y divide-slate-100">
              {inspections.map((insp) => (
                <div
                  key={insp.id}
                  onClick={() => navigate(`/inspections/${insp.id}`)}
                  className="p-4 space-y-2.5 active:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-blue-900">{insp.inspection_id}</span>
                    {getOutcomeBadge(insp.outcome)}
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-slate-900 leading-snug">
                      {insp.work_package_title || 'Work Package'}
                    </h4>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-[#E87512] shrink-0" />
                      <span>{insp.zone_name || 'Pushkaralu Sector'}</span>
                      <span className="text-slate-300">•</span>
                      <span className="font-mono text-slate-500">{insp.work_id}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">Inspector</span>
                      <span className="font-medium text-slate-900">{insp.inspector_name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">Verified Award</span>
                      <span className="font-bold text-emerald-700">
                        {insp.verified_percentage_awarded !== null && insp.verified_percentage_awarded !== undefined
                          ? `${insp.verified_percentage_awarded}%`
                          : insp.outcome === 'Failed'
                          ? '0.0%'
                          : 'Pending'}
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
                    <th className="px-4 py-3">Inspection Code</th>
                    <th className="px-4 py-3">Work Package & Ghat</th>
                    <th className="px-4 py-3">Type & Version</th>
                    <th className="px-4 py-3">Geofence Status</th>
                    <th className="px-4 py-3">Verdict / Outcome</th>
                    <th className="px-4 py-3">Verified vs Reported</th>
                    <th className="px-4 py-3">Inspector & Date</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
              <tbody className="divide-y divide-slate-100">
                {inspections.map((insp) => (
                  <tr
                    key={insp.id}
                    className="hover:bg-slate-50/75 transition-colors cursor-pointer"
                    onClick={() => navigate(`/inspections/${insp.id}`)}
                  >
                    {/* Code */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="font-mono font-bold text-blue-900 text-xs">
                        {insp.inspection_id}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {insp.checklist_results?.length || 0} checklist items
                      </div>
                    </td>

                    {/* Work Package */}
                    <td className="px-4 py-3.5 max-w-xs">
                      <div className="font-semibold text-slate-900 truncate text-xs">
                        {insp.work_package_title || 'Work Package'}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{insp.zone_name || 'Pushkaralu Sector'}</span>
                        <span className="text-slate-300">•</span>
                        <span className="font-mono text-slate-500">{insp.work_id}</span>
                      </div>
                    </td>

                    {/* Type & Version */}
                    <td className="px-4 py-3.5">
                      <div className="text-xs text-slate-800 font-medium">{insp.inspection_type}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Template {insp.checklist_version}
                      </div>
                    </td>

                    {/* Geofence Status */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {insp.is_geofence_verified ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          On-Site Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          Geofence Alert
                        </span>
                      )}
                    </td>

                    {/* Verdict */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {getOutcomeBadge(insp.outcome)}
                    </td>

                    {/* Verified vs Reported */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="text-xs font-bold text-emerald-700">
                            {insp.verified_percentage_awarded !== null && insp.verified_percentage_awarded !== undefined
                              ? `${insp.verified_percentage_awarded}% Verified`
                              : insp.outcome === 'Failed'
                              ? '0.0% Verified'
                              : 'Pending Audit'}
                          </div>
                          {insp.outcome === 'Failed' && (
                            <div className="text-[10px] text-rose-600 font-medium">
                              Blocked by defect
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Inspector & Date */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="text-xs text-slate-900 font-medium">{insp.inspector_name}</div>
                      <div className="text-[11px] text-slate-400">
                        {insp.actual_inspection_date
                          ? new Date(insp.actual_inspection_date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : insp.scheduled_date
                          ? `Sched: ${insp.scheduled_date}`
                          : 'Date pending'}
                      </div>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-blue-700 hover:text-blue-900 hover:bg-blue-50 gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/inspections/${insp.id}`);
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

      {/* Schedule Inspection Modal */}
      <Modal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        title={t('inspections.scheduleModalTitle')}
      >
        <form onSubmit={handleScheduleSubmit} className="space-y-4">
          <p className="text-xs text-slate-500">
            {t('inspections.scheduleModalDesc')}
          </p>

          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('inspections.workPackageLabel')} *
            </label>
            <select
              value={scheduleData.work_package_id}
              onChange={(e) =>
                setScheduleData((prev) => ({ ...prev, work_package_id: e.target.value }))
              }
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            >
              <option value="">{t('inspections.selectWorkPackage')}</option>
              {allWorkPackages.map((wp) => (
                <option key={wp.id} value={wp.id}>
                  {wp.work_id} — {wp.title} ({wp.category})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('inspections.inspectionType')} *
            </label>
            <select
              value={scheduleData.inspection_type}
              onChange={(e) =>
                setScheduleData((prev) => ({ ...prev, inspection_type: e.target.value }))
              }
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            >
              <option value="Pre-Commissioning Verification">Pre-Commissioning Verification</option>
              <option value="Mandatory Pressure/Safety Test">Mandatory Pressure / Safety Test</option>
              <option value="Sanitation & Acceptance Audit">Sanitation & Acceptance Audit</option>
              <option value="Electrical & Illumination Audit">Electrical & Illumination Audit</option>
              <option value="Civil & Structural Stability Audit">Civil & Structural Stability Audit</option>
              <option value="Defect Re-inspection">Defect Re-inspection</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('inspections.scheduledDateLabel')} *
            </label>
            <input
              type="date"
              value={scheduleData.scheduled_date}
              onChange={(e) =>
                setScheduleData((prev) => ({ ...prev, scheduled_date: e.target.value }))
              }
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('inspections.auditScopeLabel')}
            </label>
            <textarea
              rows={3}
              value={scheduleData.notes}
              onChange={(e) =>
                setScheduleData((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="e.g. Conduct hydrostatic pressure test at 6 bar for 30 minutes. Check flange torque and potability TDS sample."
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsScheduleModalOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              className="bg-[#174EA6] hover:bg-[#123e85] text-white"
              isLoading={scheduling}
            >
              {t('inspections.btnSchedule')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
