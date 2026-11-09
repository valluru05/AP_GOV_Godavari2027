import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  PackageCheck,
  Search,
  Plus,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  Wrench,
  Clock,
  Printer,
  MapPin,
  Building2,
  Droplets,
  Lightbulb,
  Sparkles,
  LifeBuoy,
  Signpost,
  Trash2,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { api } from '../../services/api';
import type { Asset, AssetStats, AssetCreateRequest, AssetCategory, AssetQRLabel } from '../../types/asset';
import type { ProjectSummary } from '../../types/project';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { QRScannerModal } from './QRScannerModal';
import { QRLabelModal } from './QRLabelModal';

const CATEGORIES: AssetCategory[] = [
  'Drinking-water units',
  'Public lighting',
  'Sanitation units',
  'River safety installation',
  'Signage',
  'Waste collection facilities',
  'Temporary access infrastructure',
];

export const AssetListPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission, hasRole } = useAuth();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [stats, setStats] = useState<AssetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [activeLabelData, setActiveLabelData] = useState<AssetQRLabel | null>(null);

  // Auto-open QR scanner or set filter if query param provided
  useEffect(() => {
    if (searchParams.get('scan') === 'open') {
      setIsScannerOpen(true);
    }
    if (searchParams.get('filter') === 'maintenance') {
      setStatusFilter('Maintenance');
    }
  }, [searchParams]);

  // Register Asset Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [formError, setFormError] = useState('');
  const [createForm, setCreateForm] = useState<AssetCreateRequest>({
    name: '',
    category: 'Drinking-water units',
    description: '',
    department: 'Rural Water Supply & Sanitation (RWSS)',
    location_name: '',
    zone_id: '',
    project_id: '',
    serial_number: '',
    model_number: '',
    lifecycle_status: 'Planned',
    readiness_notes: '',
  });

  const canManageAssets =
    hasPermission('assets:manage') ||
    hasRole('super_admin') ||
    hasRole('municipal_admin') ||
    hasRole('asset_manager');

  const loadData = async () => {
    try {
      setLoading(true);
      const [assetList, statsData] = await Promise.all([
        api.getAssets({
          category: categoryFilter || undefined,
          lifecycle_status: statusFilter || undefined,
          search: search || undefined,
        }),
        api.getAssetStats(),
      ]);
      setAssets(assetList);
      setStats(statsData);
    } catch (err: any) {
      console.error('Failed to load asset data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [categoryFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleOpenPrintModal = async (assetId: string) => {
    try {
      const label = await api.getAssetQRLabel(assetId);
      setActiveLabelData(label);
      setIsLabelModalOpen(true);
    } catch (err: any) {
      alert(err.message || 'Failed to fetch asset QR label.');
    }
  };

  const openCreateModal = async () => {
    try {
      setFormError('');
      const prjList = await api.getProjects();
      setProjects(prjList || []);
      if (prjList && prjList.length > 0) {
        setCreateForm((prev) => ({
          ...prev,
          project_id: prjList[0].id,
          zone_id: prjList[0].zone_id || '',
        }));
      }
      setIsCreateModalOpen(true);
    } catch (err: any) {
      console.error('Failed to load projects/zones:', err);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.category) {
      setFormError('Please fill in mandatory fields.');
      return;
    }

    try {
      setCreating(true);
      setFormError('');
      await api.createAsset(createForm);
      setIsCreateModalOpen(false);
      setCreateForm({
        name: '',
        category: 'Drinking-water units',
        description: '',
        department: 'Rural Water Supply & Sanitation (RWSS)',
        location_name: '',
        zone_id: '',
        project_id: '',
        serial_number: '',
        model_number: '',
        lifecycle_status: 'Planned',
        readiness_notes: '',
      });
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to register asset.');
    } finally {
      setCreating(false);
    }
  };

  const getCategoryIcon = (category: string, isSelected?: boolean) => {
    const iconClass = `w-4 h-4 shrink-0 ${isSelected ? 'text-white' : ''}`;
    switch (category) {
      case 'Drinking-water units':
        return <Droplets className={`${iconClass} ${isSelected ? '' : 'text-sky-600'}`} />;
      case 'Public lighting':
        return <Lightbulb className={`${iconClass} ${isSelected ? '' : 'text-amber-500'}`} />;
      case 'Sanitation units':
        return <Sparkles className={`${iconClass} ${isSelected ? '' : 'text-emerald-600'}`} />;
      case 'River safety installation':
        return <LifeBuoy className={`${iconClass} ${isSelected ? '' : 'text-rose-600'}`} />;
      case 'Signage':
        return <Signpost className={`${iconClass} ${isSelected ? '' : 'text-indigo-600'}`} />;
      case 'Waste collection facilities':
        return <Trash2 className={`${iconClass} ${isSelected ? '' : 'text-stone-600'}`} />;
      default:
        return <PackageCheck className={`${iconClass} ${isSelected ? '' : 'text-slate-600'}`} />;
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'Drinking-water units':
        return t('categories.drinkingWaterUnits');
      case 'Public lighting':
        return t('categories.publicLightingUnits');
      case 'Sanitation units':
        return t('categories.sanitationUnits');
      case 'River safety installation':
        return t('categories.riverSafety');
      case 'Signage':
        return t('categories.signage');
      case 'Waste collection facilities':
        return t('categories.wasteCollection');
      case 'Temporary shelters':
        return t('categories.temporaryShelters');
      default:
        return cat;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{t('assets.title')}</h1>
            <span className="text-xs bg-brand-50 text-brand-700 font-semibold px-2 py-0.5 rounded-full border border-brand-200">
              Module 7
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t('assets.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="secondary"
            className="gap-2 text-slate-700 shadow-sm"
            onClick={() => setIsScannerOpen(true)}
          >
            <QrCode className="w-4 h-4 text-brand-600" />
            {t('assets.scanQrBtn')}
          </Button>

          {canManageAssets && (
            <Button
              type="button"
              variant="primary"
              className="gap-2 shadow-sm"
              onClick={openCreateModal}
            >
              <Plus className="w-4 h-4" />
              {t('assets.registerAsset')}
            </Button>
          )}
        </div>
      </div>

      {/* KPI Stat Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">{t('assets.totalAssets')}</span>
              <PackageCheck className="w-4 h-4 text-brand-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{stats.total_assets}</div>
            <div className="text-xs text-slate-400 mt-1">{t('assets.totalAssetsSub')}</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm bg-gradient-to-br from-emerald-50/40 to-white">
            <div className="flex items-center justify-between text-emerald-700 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">{t('assets.operationallyReady')}</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-700">{stats.operationally_ready_count}</div>
            <div className="text-xs text-emerald-600 mt-1">{t('assets.operationallyReadySub')}</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm">
            <div className="flex items-center justify-between text-blue-700 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">{t('assets.pendingInspection')}</span>
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-800">{stats.pending_verification_count}</div>
            <div className="text-xs text-blue-600 mt-1">{t('assets.pendingInspectionSub')}</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm bg-gradient-to-br from-rose-50/40 to-white">
            <div className="flex items-center justify-between text-rose-700 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">{t('assets.verificationFailed')}</span>
              <ShieldAlert className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-bold text-rose-700">{stats.verification_failed_count}</div>
            <div className="text-xs text-rose-600 mt-1">{t('assets.verificationFailedSub')}</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm">
            <div className="flex items-center justify-between text-amber-800 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">{t('assets.maintenanceDue')}</span>
              <Wrench className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-amber-800">{stats.maintenance_required_count}</div>
            <div className="text-xs text-amber-700 mt-1">{t('assets.maintenanceDueSub')}</div>
          </div>
        </div>
      )}

      {/* Section 12 Statutory Mandate Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-xl p-4 shadow-sm flex items-start gap-3.5">
        <div className="p-2 bg-white/10 rounded-lg shrink-0 mt-0.5">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="text-xs leading-relaxed">
          <p className="font-bold text-sm text-white flex items-center gap-2">
            {t('assets.statutoryTitle')}
          </p>
          <p className="text-blue-100 mt-1">
            {t('assets.statutoryDesc')}
          </p>
        </div>
      </div>

      {/* Search & Category Filter Pills */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('assets.searchPlaceholder')}
              className="w-full pl-9 pr-24 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              className="absolute right-1.5 top-1.5 text-xs h-7"
            >
              {t('common.filter')}
            </Button>
          </form>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white font-medium text-slate-700 focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              <option value="">{t('assets.allLifecycleStates')}</option>
              <option value="Operationally Ready">{t('assets.operationallyReady')}</option>
              <option value="Verification Failed">{t('assets.verificationFailed')}</option>
              <option value="Inspection Pending">{t('assets.pendingInspection')}</option>
              <option value="Maintenance Required">{t('assets.maintenanceDue')}</option>
              <option value="Installed">{t('common.active')}</option>
              <option value="Accepted">{t('common.completed')}</option>
              <option value="Planned">{t('common.pending')}</option>
            </select>

            {(categoryFilter || statusFilter || search) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-rose-600 hover:text-rose-700"
                onClick={() => {
                  setCategoryFilter('');
                  setStatusFilter('');
                  setSearch('');
                }}
              >
                {t('dashboard.resetFilters')}
              </Button>
            )}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setCategoryFilter('')}
            className={`px-3 py-1.5 rounded-full font-semibold transition-all shrink-0 text-xs ${
              categoryFilter === ''
                ? 'bg-[#8F2D16] text-white shadow-sm ring-2 ring-[#8F2D16]/30'
                : 'bg-white border border-[#E9DED2] text-[#35251E] hover:bg-[#FAF4EC] hover:border-[#8F2D16]/40 shadow-subtle'
            }`}
          >
            {t('assets.allCategories')}
          </button>
          {CATEGORIES.map((cat) => {
            const isSelected = categoryFilter === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(isSelected ? '' : cat)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold transition-all shrink-0 text-xs ${
                  isSelected
                    ? 'bg-[#8F2D16] text-white shadow-sm ring-2 ring-[#8F2D16]/30'
                    : 'bg-white border border-[#E9DED2] text-[#35251E] hover:bg-[#FAF4EC] hover:border-[#8F2D16]/40 shadow-subtle'
                }`}
              >
                {getCategoryIcon(cat, isSelected)}
                <span>{getCategoryLabel(cat)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Asset Grid List */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">Loading asset registry...</div>
      ) : assets.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-xl border border-slate-200 p-8 space-y-3">
          <PackageCheck className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-700">No assets match the current criteria</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try adjusting your search terms, status filters, or clear category selections to see all registered municipal items.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-brand-300 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Top Row: Code + QR + Status Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                      {asset.asset_code}
                    </span>
                    <Badge variant={asset.readiness_badge_variant} className="text-[11px] font-semibold">
                      {asset.readiness_badge_text}
                    </Badge>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenPrintModal(asset.id)}
                    title="Print Physical QR Tag"
                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>

                {/* Name & Category */}
                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-snug">{asset.name}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                    {getCategoryIcon(asset.category)}
                    <span>{asset.category}</span>
                  </div>
                </div>

                {/* Location & Department */}
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{asset.location_name || asset.zone_name || 'Unassigned'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{asset.department || 'Municipal Administration'}</span>
                  </div>
                </div>

                {/* Verification & Defect Context */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <div className="flex items-center gap-2">
                    {asset.open_defect_count > 0 ? (
                      <span className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[11px]">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        {asset.open_defect_count} Defect(s) Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        0 Defects
                      </span>
                    )}

                    {asset.maintenance_history && asset.maintenance_history.length > 0 && (
                      <span className="text-slate-500 text-[11px]">
                        {asset.maintenance_history.length} service log(s)
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] font-mono text-slate-400">
                    {asset.qr_identifier}
                  </span>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="gap-1.5 text-xs text-slate-700"
                  onClick={() => handleOpenPrintModal(asset.id)}
                >
                  <QrCode className="w-3.5 h-3.5 text-brand-600" />
                  Print QR Label
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => navigate(`/assets/${asset.id}`)}
                >
                  View Dossier
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QR Scanner Modal with clean query param reset */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => {
          setIsScannerOpen(false);
          if (searchParams.get('scan') === 'open') {
            searchParams.delete('scan');
            setSearchParams(searchParams, { replace: true });
          }
        }}
      />

      {/* QR Printable Label Modal */}
      <QRLabelModal
        isOpen={isLabelModalOpen}
        onClose={() => setIsLabelModalOpen(false)}
        labelData={activeLabelData}
      />

      {/* Register Asset Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={t('assets.registerModalTitle')}
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('assets.assetNameLabel')} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              placeholder={t('assets.assetNamePlaceholder')}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('assets.assetCategoryLabel')} <span className="text-rose-500">*</span>
              </label>
              <select
                value={createForm.category}
                onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {getCategoryLabel(c)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('assets.departmentLabel')}
              </label>
              <input
                type="text"
                value={createForm.department || ''}
                onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                placeholder={t('assets.departmentPlaceholder')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('assets.locationGhatLabel')}
              </label>
              <input
                type="text"
                value={createForm.location_name || ''}
                onChange={(e) => setCreateForm({ ...createForm, location_name: e.target.value })}
                placeholder={t('assets.locationGhatPlaceholder')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('assets.linkedProjectLabel')}
              </label>
              <select
                value={createForm.project_id || ''}
                onChange={(e) => setCreateForm({ ...createForm, project_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value="">{t('assets.noneUnlinked')}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('assets.serialNumberLabel')}
              </label>
              <input
                type="text"
                value={createForm.serial_number || ''}
                onChange={(e) => setCreateForm({ ...createForm, serial_number: e.target.value })}
                placeholder={t('assets.serialNumberPlaceholder')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('assets.modelNumberLabel')}
              </label>
              <input
                type="text"
                value={createForm.model_number || ''}
                onChange={(e) => setCreateForm({ ...createForm, model_number: e.target.value })}
                placeholder={t('assets.modelNumberPlaceholder')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('assets.specificationsLabel')}
            </label>
            <textarea
              rows={2}
              value={createForm.description || ''}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              placeholder={t('assets.specificationsPlaceholder')}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={creating}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" disabled={creating}>
              {creating ? t('common.loading') : t('assets.saveRegisterAsset')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
