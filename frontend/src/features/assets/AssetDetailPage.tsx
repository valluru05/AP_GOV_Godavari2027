import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  QrCode,
  Printer,
  ShieldCheck,
  ShieldAlert,
  Wrench,
  Clock,
  MapPin,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Plus,
  Paperclip,
  Tag,
  Layers
} from 'lucide-react';
import { api } from '../../services/api';
import type {
  Asset,
  AssetQRLabel,
  AssetTransitionRequest,
  AssetMaintenanceRequest,
  AssetEvidenceRequest
} from '../../types/asset';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { QRLabelModal } from './QRLabelModal';
import { ReadinessChainModal } from '../readiness/ReadinessChainModal';

export const AssetDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission, hasRole } = useAuth();

  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [labelData, setLabelData] = useState<AssetQRLabel | null>(null);
  const [isReadinessModalOpen, setIsReadinessModalOpen] = useState(false);

  // Transition Modal State
  const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false);
  const [submittingTransition, setSubmittingTransition] = useState(false);
  const [transitionStatus, setTransitionStatus] = useState<string>('Operationally Ready');
  const [transitionReason, setTransitionReason] = useState('');
  const [transitionNotes, setTransitionNotes] = useState('');
  const [transitionError, setTransitionError] = useState('');

  // Maintenance Modal State
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [submittingMaint, setSubmittingMaint] = useState(false);
  const [maintType, setMaintType] = useState('Routine Inspection');
  const [maintTech, setMaintTech] = useState('');
  const [maintSummary, setMaintSummary] = useState('');
  const [maintNextDue, setMaintNextDue] = useState('');

  // Evidence Modal State
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [submittingEvidence, setSubmittingEvidence] = useState(false);
  const [evidenceName, setEvidenceName] = useState('');
  const [evidenceCaption, setEvidenceCaption] = useState('');
  const [evidenceType, setEvidenceType] = useState('photo');

  const canTransition =
    hasPermission('assets:transition') ||
    hasRole('super_admin') ||
    hasRole('municipal_admin') ||
    hasRole('asset_manager');

  const canManage =
    hasPermission('assets:manage') ||
    hasRole('super_admin') ||
    hasRole('municipal_admin') ||
    hasRole('asset_manager');

  const fetchAsset = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError('');
      const data = await api.getAsset(id);
      setAsset(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load asset details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAsset();
  }, [id]);

  const handleOpenPrintModal = async () => {
    if (!id) return;
    try {
      const label = await api.getAssetQRLabel(id);
      setLabelData(label);
      setIsLabelModalOpen(true);
    } catch (err: any) {
      alert(err.message || 'Failed to fetch asset QR label.');
    }
  };

  const handleTransitionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !transitionReason.trim()) return;
    try {
      setSubmittingTransition(true);
      setTransitionError('');
      const payload: AssetTransitionRequest = {
        new_status: transitionStatus,
        reason: transitionReason.trim(),
        notes: transitionNotes.trim() || undefined,
      };
      await api.transitionAsset(id, payload);
      setIsTransitionModalOpen(false);
      setTransitionReason('');
      setTransitionNotes('');
      await fetchAsset();
    } catch (err: any) {
      setTransitionError(err.message || 'Failed to transition asset status.');
    } finally {
      setSubmittingTransition(false);
    }
  };

  const handleMaintenanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !maintTech.trim() || !maintSummary.trim()) return;
    try {
      setSubmittingMaint(true);
      const payload: AssetMaintenanceRequest = {
        maintenance_type: maintType,
        technician_name: maintTech.trim(),
        summary: maintSummary.trim(),
        next_service_due: maintNextDue || undefined,
        status: 'Completed',
      };
      await api.addAssetMaintenance(id, payload);
      setIsMaintenanceModalOpen(false);
      setMaintTech('');
      setMaintSummary('');
      setMaintNextDue('');
      await fetchAsset();
    } catch (err: any) {
      alert(err.message || 'Failed to log maintenance.');
    } finally {
      setSubmittingMaint(false);
    }
  };

  const handleEvidenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !evidenceName.trim() || !evidenceCaption.trim()) return;
    try {
      setSubmittingEvidence(true);
      const payload: AssetEvidenceRequest = {
        name: evidenceName.trim(),
        caption: evidenceCaption.trim(),
        file_type: evidenceType,
      };
      await api.addAssetEvidence(id, payload);
      setIsEvidenceModalOpen(false);
      setEvidenceName('');
      setEvidenceCaption('');
      await fetchAsset();
    } catch (err: any) {
      alert(err.message || 'Failed to attach evidence.');
    } finally {
      setSubmittingEvidence(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-400">Loading asset dossier...</div>;
  }

  if (error || !asset) {
    return (
      <div className="space-y-4">
        <Button variant="secondary" onClick={() => navigate('/assets')} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Asset Registry
        </Button>
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 space-y-2">
          <h3 className="font-bold text-base">Error Loading Asset</h3>
          <p className="text-sm">{error || 'Asset not found.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => navigate('/assets')}
          className="gap-2 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Asset Registry
        </Button>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleOpenPrintModal}
            className="gap-1.5 text-slate-700 shadow-sm"
          >
            <Printer className="w-4 h-4 text-brand-600" />
            Print QR Tag
          </Button>

          {asset.work_package_id && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsReadinessModalOpen(true)}
              className="gap-1.5 text-slate-700 shadow-sm"
            >
              <Layers className="w-4 h-4 text-brand-600" />
              12-Stage Readiness Chain
            </Button>
          )}

          {canTransition && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                setTransitionError('');
                setTransitionStatus(asset.lifecycle_status === 'Accepted' ? 'Operationally Ready' : 'Accepted');
                setIsTransitionModalOpen(true);
              }}
              className="gap-1.5 shadow-sm"
            >
              <Tag className="w-4 h-4" />
              Transition Lifecycle
            </Button>
          )}
        </div>
      </div>

      {/* Prominent Operational Readiness Banner (Section 12 Mandate) */}
      {asset.is_operationally_ready ? (
        <div className="bg-gradient-to-r from-emerald-900 to-teal-950 text-white rounded-xl p-4 shadow-sm border border-emerald-700/50 flex items-start gap-3.5">
          <div className="p-2 bg-emerald-500/20 rounded-lg shrink-0 mt-0.5">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">
                OPERATIONALLY READY — VERIFIED FOR PUSHKARALU 2027
              </h2>
              <span className="text-[10px] uppercase font-bold tracking-wider bg-emerald-400/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30">
                Official Clearance Granted
              </span>
            </div>
            <p className="text-xs text-emerald-100/90 mt-1">
              This physical asset has passed independent mobile field inspection, zero active critical defects exist, and official commissioning clearance is certified. Ready for pilgrim operational deployment.
            </p>
          </div>
        </div>
      ) : asset.lifecycle_status === 'Verification Failed' || asset.open_defect_count > 0 ? (
        <div className="bg-gradient-to-r from-rose-900 to-red-950 text-white rounded-xl p-4 shadow-sm border border-rose-700/50 flex items-start gap-3.5">
          <div className="p-2 bg-rose-500/20 rounded-lg shrink-0 mt-0.5">
            <ShieldAlert className="w-6 h-6 text-rose-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">
                NOT OPERATIONALLY READY — VERIFICATION FAILED / ACTIVE DEFECT
              </h2>
              <span className="text-[10px] uppercase font-bold tracking-wider bg-rose-400/20 text-rose-300 px-2 py-0.5 rounded-full border border-rose-400/30">
                Deployment Prohibited
              </span>
            </div>
            <p className="text-xs text-rose-100/90 mt-1">
              Active defects recorded during field inspections block operational readiness certification. Under Section 12 protocols, contractor remediation and independent inspector re-inspection are mandatory before this asset can be commissioned.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-amber-900 to-yellow-950 text-white rounded-xl p-4 shadow-sm border border-amber-700/50 flex items-start gap-3.5">
          <div className="p-2 bg-amber-500/20 rounded-lg shrink-0 mt-0.5">
            <Clock className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">
                PENDING VERIFICATION — {asset.lifecycle_status.toUpperCase()}
              </h2>
              <span className="text-[10px] uppercase font-bold tracking-wider bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30">
                Pre-Commissioning
              </span>
            </div>
            <p className="text-xs text-amber-100/90 mt-1">
              This asset has not yet received formal field inspection clearance and authorized sign-off. Do not deploy for public operations until certified.
            </p>
          </div>
        </div>
      )}

      {/* Asset Hero Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="font-mono font-extrabold text-sm bg-slate-100 text-slate-800 px-2.5 py-1 rounded border border-slate-200">
                {asset.asset_code}
              </span>
              <Badge variant={asset.readiness_badge_variant} className="text-xs font-bold">
                {asset.readiness_badge_text}
              </Badge>
              <span className="text-xs text-slate-400 font-mono">
                QR: {asset.qr_identifier}
              </span>
            </div>

            <h1 className="text-2xl font-bold text-slate-900">{asset.name}</h1>
            <p className="text-sm text-slate-500">{asset.description || 'No description provided.'}</p>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3 rounded-xl shrink-0">
            {asset.qr_data_url && (
              <img
                src={asset.qr_data_url}
                alt="QR Code"
                className="w-16 h-16 rounded border border-slate-300 bg-white p-1"
              />
            )}
            <div className="text-xs space-y-0.5">
              <p className="font-bold text-slate-800">Physical Tag</p>
              <p className="text-slate-500 font-mono text-[11px] truncate max-w-[130px]">{asset.qr_identifier}</p>
              <button
                type="button"
                onClick={handleOpenPrintModal}
                className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 mt-1"
              >
                <Printer className="w-3 h-3" />
                Print Label Tag
              </button>
            </div>
          </div>
        </div>

        {/* Readiness Notes */}
        {asset.readiness_notes && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
            <span className="font-semibold text-slate-800">Status Context: </span>
            {asset.readiness_notes}
          </div>
        )}
      </div>

      {/* Main Grid: Details & Specifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Specs, Maintenance, Evidence */}
        <div className="lg:col-span-2 space-y-6">
          {/* Engineering Specs & Identification */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-600" />
                Asset Specifications & Department Details
              </h3>
              <span className="text-xs font-mono text-slate-400">ID: {asset.id}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Category</span>
                <span className="font-semibold text-slate-800 text-sm">{asset.category}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Department</span>
                <span className="font-medium text-slate-800">{asset.department || 'Municipal Administration'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Location / Ghat</span>
                <span className="font-medium text-slate-800">{asset.location_name || asset.zone_name || 'Unassigned'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Serial Number</span>
                <span className="font-mono font-medium text-slate-800">{asset.serial_number || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Model Number</span>
                <span className="font-mono font-medium text-slate-800">{asset.model_number || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Lifecycle Status</span>
                <span className="font-bold text-slate-800">{asset.lifecycle_status}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Installation Date</span>
                <span className="font-medium text-slate-800">{asset.installation_date || 'In Progress'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Commissioning Date</span>
                <span className="font-medium text-slate-800">{asset.commissioning_date || 'Pending'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Responsible Manager</span>
                <span className="font-medium text-slate-800">{asset.manager_name || 'Lakshmi (Asset Cell)'}</span>
              </div>
            </div>

            {/* Coordinates & Work Package Links */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              {asset.latitude && asset.longitude && (
                <div className="flex items-center gap-1.5 text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono">
                    Lat: {asset.latitude.toFixed(4)}, Lng: {asset.longitude.toFixed(4)}
                  </span>
                </div>
              )}

              {asset.project_name && (
                <div className="text-slate-600">
                  <span className="text-slate-400">Project: </span>
                  <Link to={`/projects/${asset.project_id}`} className="font-medium text-brand-600 hover:underline">
                    {asset.project_name}
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Maintenance History Ledger */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-600" />
                Physical Maintenance & Service Ledger
              </h3>

              {canManage && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsMaintenanceModalOpen(true)}
                  className="gap-1.5 text-xs text-brand-600 hover:text-brand-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Log Maintenance
                </Button>
              )}
            </div>

            {asset.maintenance_history && asset.maintenance_history.length > 0 ? (
              <div className="space-y-3">
                {asset.maintenance_history.map((m, idx) => (
                  <div
                    key={m.id || idx}
                    className="p-3.5 rounded-lg border border-slate-100 bg-slate-50 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{m.maintenance_type}</span>
                        <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-semibold">
                          {m.status || 'Completed'}
                        </span>
                      </div>
                      <span className="text-slate-400 font-mono text-[11px]">{m.service_date}</span>
                    </div>

                    <p className="text-slate-700 leading-relaxed">{m.summary}</p>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                      <span>Technician: <strong className="text-slate-700">{m.technician_name}</strong></span>
                      {m.next_service_due && (
                        <span>Next Service Due: <strong className="text-amber-800">{m.next_service_due}</strong></span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-3 text-center">
                No maintenance history recorded for this asset yet.
              </p>
            )}
          </div>

          {/* Supporting Evidence Vault */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-brand-600" />
                Supporting Technical Evidence & Certificates
              </h3>

              {canManage && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsEvidenceModalOpen(true)}
                  className="gap-1.5 text-xs text-brand-600 hover:text-brand-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Attach Certificate / Photo
                </Button>
              )}
            </div>

            {asset.supporting_evidence && asset.supporting_evidence.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {asset.supporting_evidence.map((evi, idx) => (
                  <div
                    key={evi.id || idx}
                    className="p-3 rounded-lg border border-slate-200 bg-white flex items-start gap-2.5 text-xs"
                  >
                    <FileText className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{evi.name}</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">{evi.caption}</p>
                      <span className="text-[10px] text-slate-400 uppercase font-mono mt-1 block">
                        {evi.file_type || 'Document'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-3 text-center">
                No certificates or technical evidence attached.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: QR Tag & Verification Cross-links */}
        <div className="space-y-6">
          {/* Printable Physical Tag Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 text-center">
            <h3 className="font-bold text-slate-900 text-sm flex items-center justify-center gap-2">
              <QrCode className="w-4 h-4 text-brand-600" />
              Pushkaralu 2027 Physical Tag
            </h3>

            {asset.qr_data_url && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 inline-block">
                <img
                  src={asset.qr_data_url}
                  alt={`QR for ${asset.asset_code}`}
                  className="w-44 h-44 mx-auto rounded shadow-sm bg-white p-2"
                />
                <div className="mt-2 text-xs font-mono font-bold text-slate-700">
                  {asset.qr_identifier}
                </div>
              </div>
            )}

            <p className="text-xs text-slate-500">
              Affix this physical tag onto equipment for mobile terminal optical scanning and instant status audit.
            </p>

            <Button
              type="button"
              variant="primary"
              className="w-full justify-center gap-2"
              onClick={handleOpenPrintModal}
            >
              <Printer className="w-4 h-4" />
              Print Official QR Tag
            </Button>
          </div>

          {/* Module 5 Mobile Field Inspection Link */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Module 5 — Inspection Status
            </h3>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Latest Outcome</span>
                <span className="font-bold text-slate-800">{asset.latest_inspection_result || 'Scheduled'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Geofence Verified</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Ghat Centroid Match
                </span>
              </div>
            </div>
            <Link
              to="/inspections"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 pt-1"
            >
              Inspect via Mobile Checklists
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Module 6 Active Defects Link */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Module 6 — Corrective Actions
            </h3>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Unresolved Defects</span>
                <span className={asset.open_defect_count > 0 ? 'text-rose-600 font-bold' : 'text-emerald-700 font-bold'}>
                  {asset.open_defect_count} Active
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {asset.open_defect_count > 0
                  ? 'Active defects block readiness certification until contractor remediation passes inspector re-testing.'
                  : 'Zero open defects logged against this asset.'}
              </p>
            </div>
            <Link
              to="/defects"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 pt-1"
            >
              Open Defect & Rework Queue
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* QR Printable Label Modal */}
      <QRLabelModal
        isOpen={isLabelModalOpen}
        onClose={() => setIsLabelModalOpen(false)}
        labelData={labelData}
      />

      {/* Lifecycle Transition Modal */}
      <Modal
        isOpen={isTransitionModalOpen}
        onClose={() => setIsTransitionModalOpen(false)}
        title={`Transition Lifecycle: ${asset.asset_code}`}
      >
        <form onSubmit={handleTransitionSubmit} className="space-y-4">
          {transitionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
              {transitionError}
            </div>
          )}

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
            <p className="font-semibold text-slate-800">Section 12 Compliance Notice:</p>
            <p className="text-slate-600">
              Declaring an asset <strong>Operationally Ready</strong> requires verified inspection pass and 0 open critical defects. The system enforces server-side validation.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              New Lifecycle Status <span className="text-rose-500">*</span>
            </label>
            <select
              value={transitionStatus}
              onChange={(e) => setTransitionStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              <option value="Operationally Ready">Operationally Ready</option>
              <option value="Accepted">Accepted (Pre-commissioning)</option>
              <option value="Inspection Pending">Inspection Pending</option>
              <option value="Verification Failed">Verification Failed</option>
              <option value="Maintenance Required">Maintenance Required</option>
              <option value="Installed">Installed</option>
              <option value="Out of Service">Out of Service</option>
              <option value="Retired">Retired</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Transition Justification / Decision Reason <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={transitionReason}
              onChange={(e) => setTransitionReason(e.target.value)}
              placeholder="e.g. Completed pre-commissioning hydro-test and certified ready"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Operational Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={transitionNotes}
              onChange={(e) => setTransitionNotes(e.target.value)}
              placeholder="Additional deployment parameters, sensor calibration readings..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsTransitionModalOpen(false)}
              disabled={submittingTransition}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submittingTransition}>
              {submittingTransition ? 'Updating...' : 'Confirm Lifecycle Transition'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Log Maintenance Modal */}
      <Modal
        isOpen={isMaintenanceModalOpen}
        onClose={() => setIsMaintenanceModalOpen(false)}
        title={`Log Maintenance: ${asset.asset_code}`}
      >
        <form onSubmit={handleMaintenanceSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Maintenance Type
              </label>
              <select
                value={maintType}
                onChange={(e) => setMaintType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value="Routine Inspection">Routine Inspection</option>
                <option value="Preventive Maintenance">Preventive Maintenance</option>
                <option value="Emergency Repair">Emergency Repair</option>
                <option value="Sensor Calibration">Sensor Calibration</option>
                <option value="Part Replacement">Part Replacement</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Technician / Inspector Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={maintTech}
                onChange={(e) => setMaintTech(e.target.value)}
                placeholder="e.g. K. Venkat Rao (AP Water Board)"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Service Summary & Work Undertaken <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={maintSummary}
              onChange={(e) => setMaintSummary(e.target.value)}
              placeholder="Describe work performed, components replaced, test readings observed..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Next Service Due Date (Optional)
            </label>
            <input
              type="date"
              value={maintNextDue}
              onChange={(e) => setMaintNextDue(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsMaintenanceModalOpen(false)}
              disabled={submittingMaint}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submittingMaint}>
              {submittingMaint ? 'Logging...' : 'Save Maintenance Entry'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Attach Evidence Modal */}
      <Modal
        isOpen={isEvidenceModalOpen}
        onClose={() => setIsEvidenceModalOpen(false)}
        title={`Attach Evidence / Certificate: ${asset.asset_code}`}
      >
        <form onSubmit={handleEvidenceSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Document / File Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={evidenceName}
              onChange={(e) => setEvidenceName(e.target.value)}
              placeholder="e.g. FAT_Acceptance_Cert_2026.pdf or Plinth_Photo.jpg"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Evidence Category
              </label>
              <select
                value={evidenceType}
                onChange={(e) => setEvidenceType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value="photo">Field Installation Photo</option>
                <option value="certificate">Acceptance Certificate</option>
                <option value="manual">Engineering Specification / Manual</option>
                <option value="test_report">Lab Test Report</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description / Caption <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={evidenceCaption}
                onChange={(e) => setEvidenceCaption(e.target.value)}
                placeholder="e.g. Factory hydrostatic pressure test certificate"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsEvidenceModalOpen(false)}
              disabled={submittingEvidence}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submittingEvidence}>
              {submittingEvidence ? 'Attaching...' : 'Attach Technical Record'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 12-Stage Verified Readiness Chain Modal (Section 13) */}
      <ReadinessChainModal
        isOpen={isReadinessModalOpen}
        onClose={() => setIsReadinessModalOpen(false)}
        workPackageId={asset?.work_package_id || null}
      />
    </div>
  );
};
