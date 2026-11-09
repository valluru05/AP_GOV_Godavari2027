import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Building2,
  MapPin,
  Camera,
  FileCheck2,
  Wrench,
  History,
  AlertOctagon,
  FileText,
  ExternalLink
} from 'lucide-react';
import { api } from '../../services/api';
import type {
  Defect,
  DefectSeverity,
  DefectStatus,
  DefectVendorReworkRequest,
  DefectReinspectRequest,
  DefectCloseRequest,
  DefectEvidenceItem,
} from '../../types/defect';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';

export const DefectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission, hasRole } = useAuth();

  const [defect, setDefect] = useState<Defect | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal States
  const [isReworkModalOpen, setIsReworkModalOpen] = useState(false);
  const [reworkStep, setReworkStep] = useState<1 | 2 | 3 | 4>(1);
  const [isReinspectModalOpen, setIsReinspectModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

  // Submitting States
  const [submittingRework, setSubmittingRework] = useState(false);
  const [submittingReinspect, setSubmittingReinspect] = useState(false);
  const [submittingClose, setSubmittingClose] = useState(false);

  // Form States
  const [reworkNotes, setReworkNotes] = useState('');
  const [reworkPhotoCaption, setReworkPhotoCaption] = useState('');
  const [reworkPhotos, setReworkPhotos] = useState<DefectEvidenceItem[]>([]);

  const [reinspectVerdict, setReinspectVerdict] = useState<'Pass' | 'Fail'>('Pass');
  const [reinspectNotes, setReinspectNotes] = useState('');
  const [reinspectMeasurements, setReinspectMeasurements] = useState('');

  const [closureNotes, setClosureNotes] = useState('');

  const isVendor = hasRole('vendor');
  const canSubmitRework = (hasPermission('defects:respond') || isVendor) && defect?.status !== 'Closed by Authorised User';
  const canReinspect = (hasPermission('defects:reinspect') || hasRole('field_inspector') || hasRole('super_admin')) && defect?.status !== 'Closed by Authorised User';
  const canClose = (hasPermission('defects:close') || hasRole('super_admin') || hasRole('municipal_admin')) && defect?.status !== 'Closed by Authorised User';

  const fetchDefect = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError('');
      const data = await api.getDefect(id);
      setDefect(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load defect dossier.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDefect();
  }, [id]);

  const handleAddReworkPhoto = () => {
    if (!reworkPhotoCaption.trim()) return;
    setReworkPhotos((prev) => [
      ...prev,
      {
        name: `Rework_Proof_${Date.now().toString().slice(-4)}.jpg`,
        caption: reworkPhotoCaption.trim(),
        timestamp: new Date().toISOString(),
      },
    ]);
    setReworkPhotoCaption('');
  };

  const handleReworkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !reworkNotes.trim()) return;
    try {
      setSubmittingRework(true);
      const payload: DefectVendorReworkRequest = {
        resolution_notes: reworkNotes.trim(),
        rework_evidence: reworkPhotos,
      };
      await api.submitDefectRework(id, payload);
      setIsReworkModalOpen(false);
      setReworkNotes('');
      setReworkPhotos([]);
      await fetchDefect();
    } catch (err: any) {
      alert(err.message || 'Rework submission failed.');
    } finally {
      setSubmittingRework(false);
    }
  };

  const handleReinspectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !reinspectNotes.trim()) return;
    try {
      setSubmittingReinspect(true);
      const payload: DefectReinspectRequest = {
        verdict: reinspectVerdict,
        verification_notes: reinspectNotes.trim(),
        reinspection_measurements: reinspectMeasurements.trim() || undefined,
      };
      await api.reinspectDefect(id, payload);
      setIsReinspectModalOpen(false);
      setReinspectNotes('');
      setReinspectMeasurements('');
      await fetchDefect();
    } catch (err: any) {
      alert(err.message || 'Re-inspection failed.');
    } finally {
      setSubmittingReinspect(false);
    }
  };

  const handleCloseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !closureNotes.trim()) return;
    try {
      setSubmittingClose(true);
      const payload: DefectCloseRequest = {
        closure_notes: closureNotes.trim(),
      };
      await api.closeDefect(id, payload);
      setIsCloseModalOpen(false);
      setClosureNotes('');
      await fetchDefect();
    } catch (err: any) {
      alert(err.message || 'Defect closure failed.');
    } finally {
      setSubmittingClose(false);
    }
  };

  const getSeverityBadge = (severity: DefectSeverity) => {
    switch (severity) {
      case 'Critical':
        return (
          <span className="inline-flex items-center gap-1 font-bold text-xs bg-rose-100 text-rose-800 px-3 py-1 rounded-full border border-rose-200">
            <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
            Critical Severity
          </span>
        );
      case 'High':
        return (
          <span className="inline-flex items-center gap-1 font-semibold text-xs bg-amber-100 text-amber-900 px-3 py-1 rounded-full border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            High Severity
          </span>
        );
      case 'Medium':
        return (
          <span className="inline-flex items-center gap-1 font-semibold text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full border border-blue-200">
            Medium Severity
          </span>
        );
      case 'Low':
        return (
          <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full border border-slate-200">
            Low Severity
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
            Closed by Authorised User
          </Badge>
        );
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 text-sm">
        <div className="animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
        Loading defect ticket dossier...
      </div>
    );
  }

  if (error || !defect) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-lg mx-auto">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Defect Ticket Not Found</h2>
        <p className="text-sm text-slate-500 mt-1">{error || 'The requested defect record does not exist.'}</p>
        <Button onClick={() => navigate('/defects')} className="mt-4" variant="secondary">
          Back to Defects Registry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header and Breadcrumbs */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/defects')}
          className="gap-1.5 text-xs text-slate-600 hover:text-slate-900 mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Defects Registry
        </Button>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-sm font-bold bg-slate-100 text-slate-900 px-3 py-1 rounded-md border border-slate-200">
                {defect.defect_id}
              </span>
              {getSeverityBadge(defect.severity)}
              {getStatusBadge(defect.status)}
              {defect.is_overdue && (
                <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded border border-rose-200">
                  Target Date Overdue
                </span>
              )}
            </div>

            <h1 className="text-xl font-bold text-slate-900 mt-2">
              {defect.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
              <span className="flex items-center gap-1 font-mono text-slate-700">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                {defect.work_id} — {defect.work_package_title}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-700">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                {defect.zone_name || 'Pushkaralu Sector'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-700">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                Contractor: {defect.assigned_vendor_name || 'Assigned Vendor'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {canSubmitRework && (
              <Button
                onClick={() => setIsReworkModalOpen(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 shadow-sm"
              >
                <Wrench className="w-4 h-4" />
                Submit Rework / Correction
              </Button>
            )}

            {canReinspect && (
              <Button
                onClick={() => setIsReinspectModalOpen(true)}
                className="bg-[#174EA6] hover:bg-[#123e85] text-white flex items-center gap-1.5 shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                Conduct Re-Inspection
              </Button>
            )}

            {canClose && defect.status !== 'Closed by Authorised User' && (
              <Button
                onClick={() => setIsCloseModalOpen(true)}
                variant="secondary"
                className="flex items-center gap-1.5 border-slate-300"
              >
                <ShieldCheck className="w-4 h-4 text-slate-600" />
                Authorize Closure
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Defect Classification & Quality Mandate */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Core Classification Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="font-semibold text-slate-900 text-sm">Defect Classification & Metadata</h2>
            <span className="text-xs font-mono text-slate-400">Section 29 Punch List</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Category</span>
              <span className="font-bold text-slate-800 mt-0.5 block">{defect.category}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Target Resolution Date</span>
              <span className={`font-bold mt-0.5 block ${defect.is_overdue ? 'text-rose-600' : 'text-slate-800'}`}>
                {defect.target_resolution_date || 'None'}
              </span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Reported By</span>
              <span className="font-medium text-slate-800 mt-0.5 block">{defect.reported_by_name}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Rework Cycles Executed</span>
              <span className="font-mono font-bold text-slate-800 mt-0.5 block">Cycle #{defect.rework_count}</span>
            </div>
          </div>

          {defect.inspection_code && (
            <div className="bg-blue-50/60 p-2.5 rounded border border-blue-100 flex items-center justify-between text-xs">
              <span className="text-blue-900 font-medium">Originated from Inspection:</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs font-mono text-blue-700 hover:text-blue-900 py-0.5 h-6"
                onClick={() => navigate(`/inspections/${defect.inspection_id}`)}
              >
                <span>{defect.inspection_code}</span>
                <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            </div>
          )}
        </div>

        {/* Quality Mandate Lifecycle Status */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="font-semibold text-slate-900 text-sm">Rework & Verification Chain (Section 29)</h2>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Infrastructure defects block work package verification. Progress cannot advance until quality rectification is physically certified on-site by field engineering inspectors.
          </p>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Current Phase:</span>
              <span className="font-semibold text-slate-900">{defect.status}</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all ${
                  defect.status === 'Closed by Authorised User'
                    ? 'bg-slate-700 w-full'
                    : defect.status === 'Resolved — Verification Passed'
                    ? 'bg-emerald-500 w-4/5'
                    : defect.status === 'Correction Submitted'
                    ? 'bg-blue-500 w-3/5'
                    : defect.status === 'Rejected — Rework Required'
                    ? 'bg-rose-500 w-2/5'
                    : 'bg-amber-500 w-1/5'
                }`}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>1. Logged</span>
              <span>2. Rework</span>
              <span>3. Verification</span>
              <span>4. Closed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Description & Initial Deficiency Evidence */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        <h2 className="font-semibold text-slate-900 text-sm border-b border-slate-100 pb-2">
          Engineering Deficiency Description & On-Site Findings
        </h2>
        <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
          {defect.description}
        </p>

        {defect.evidence_attachments && defect.evidence_attachments.length > 0 && (
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-slate-500" />
              <span>Inspection Evidence Photographs Attached at Incident Logging:</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {defect.evidence_attachments.map((att, aIdx) => (
                <div key={aIdx} className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                  <div className="font-mono font-bold text-slate-800 truncate">{att.name}</div>
                  <p className="text-slate-500 text-[11px]">{att.caption || 'Photographic record'}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Contractor Rework Submission & Evidence */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-amber-600" />
            <h2 className="font-semibold text-slate-900 text-sm">Contractor Corrective Action & Rework Details</h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {defect.rework_evidence?.length || 0} Evidence Photos
          </span>
        </div>

        {defect.resolution_notes ? (
          <div className="space-y-3">
            <div className="bg-amber-50/50 p-4 rounded-lg border border-amber-200/80 text-xs leading-relaxed text-amber-950">
              <div className="font-semibold mb-1 text-amber-900">Contractor Remediation Statement:</div>
              {defect.resolution_notes}
            </div>

            {defect.rework_evidence && defect.rework_evidence.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {defect.rework_evidence.map((p, pIdx) => (
                  <div key={pIdx} className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                    <span className="font-mono font-bold text-slate-800 block truncate">{p.name}</span>
                    <span className="text-slate-500 text-[11px] mt-0.5 block">{p.caption}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 bg-slate-50 rounded-lg text-center text-xs text-slate-400">
            Contractor has not yet submitted formal rectification details. Rework action is currently pending.
          </div>
        )}
      </div>

      {/* Quality Re-inspection Findings */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-emerald-600" />
            <h2 className="font-semibold text-slate-900 text-sm">Independent Quality Re-Inspection Findings</h2>
          </div>
          {defect.verification_result && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
              defect.verification_result === 'Pass'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-rose-100 text-rose-800'
            }`}>
              Verdict: {defect.verification_result}
            </span>
          )}
        </div>

        {defect.verification_notes ? (
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span>Verified by: <strong>{defect.verified_by_name || 'Quality Field Inspector'}</strong></span>
              <span>{defect.verified_at ? new Date(defect.verified_at).toLocaleString() : ''}</span>
            </div>
            <p className="text-slate-800 leading-relaxed font-mono">
              {defect.verification_notes}
            </p>
          </div>
        ) : (
          <div className="p-6 bg-slate-50 rounded-lg text-center text-xs text-slate-400">
            On-site quality re-inspection has not been conducted yet. Awaiting inspector field verification.
          </div>
        )}
      </div>

      {/* Chronological Audit Trail & Event History */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600" />
            <h2 className="font-semibold text-slate-900 text-sm">Chronological Lifecycle History & Audit Events</h2>
          </div>
          <span className="text-xs font-mono text-slate-400">{defect.history?.length || 0} Events</span>
        </div>

        <div className="space-y-3">
          {defect.history && defect.history.length > 0 ? (
            defect.history.map((h, hIdx) => (
              <div key={hIdx} className="flex items-start gap-3 text-xs border-l-2 border-blue-500 pl-3 py-1">
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{h.action}</span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(h.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-slate-500 text-[11px]">Actor: {h.actor_name || 'System Official'}</div>
                  <p className="text-slate-700 mt-1">{h.notes}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-xs text-slate-400">No events recorded.</div>
          )}
        </div>
      </div>

      {/* MODAL 1: VENDOR SUBMIT REWORK MODAL (4-STEP GUIDED WORKFLOW) */}
      <Modal
        isOpen={isReworkModalOpen}
        onClose={() => setIsReworkModalOpen(false)}
        title="Defect Correction &amp; Rework Submission"
        maxWidth="lg"
      >
        <div className="space-y-4">
          {/* Step Indicator */}
          <div className="flex items-center justify-between pb-3 border-b border-[#E9DED2] text-xs">
            {[
              { num: 1, label: 'Defect Issue' },
              { num: 2, label: 'Fix Required' },
              { num: 3, label: 'Upload Proof' },
              { num: 4, label: 'Submit Verification' },
            ].map((st) => (
              <div
                key={st.num}
                className={`flex items-center gap-1.5 ${
                  reworkStep === st.num
                    ? 'text-[#8F2D16] font-bold'
                    : reworkStep > st.num
                    ? 'text-[#15803D] font-medium'
                    : 'text-textMuted'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    reworkStep === st.num
                      ? 'bg-[#8F2D16] text-white shadow-sm'
                      : reworkStep > st.num
                      ? 'bg-[#15803D] text-white'
                      : 'bg-[#FAF4EC] text-textSecondary border border-[#E9DED2]'
                  }`}
                >
                  {reworkStep > st.num ? '✓' : st.num}
                </span>
                <span className="hidden sm:inline">{st.label}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleReworkSubmit} className="space-y-4">
            {/* STEP 1: VIEW DEFECT DESCRIPTION */}
            {reworkStep === 1 && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-textPrimary block">
                  Step 1: View Defect Details &amp; Inspector Citation
                </span>

                <div className="p-3.5 bg-[#FFFDF9] rounded-xl border border-[#E9DED2] space-y-2 text-xs">
                  <div className="flex justify-between border-b border-[#E9DED2]/60 pb-1.5">
                    <span className="text-textSecondary">Defect Reference:</span>
                    <span className="font-mono font-bold text-[#8F2D16]">{defect.defect_id}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#E9DED2]/60 pb-1.5">
                    <span className="text-textSecondary">Severity:</span>
                    {getSeverityBadge(defect.severity)}
                  </div>
                  <div className="flex justify-between border-b border-[#E9DED2]/60 pb-1.5">
                    <span className="text-textSecondary">Defect Title:</span>
                    <strong className="text-textPrimary">{defect.title}</strong>
                  </div>
                  <div>
                    <span className="text-textSecondary block mb-1">Ground Failure Description:</span>
                    <p className="bg-[#FEF2F2] p-2.5 rounded-lg text-[#991B1B] border border-[#FECACA] leading-relaxed">
                      {defect.description}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[#E9DED2]">
                  <Button variant="secondary" type="button" onClick={() => setIsReworkModalOpen(false)}>
                    Close
                  </Button>
                  <Button variant="saffron" type="button" onClick={() => setReworkStep(2)}>
                    Next: Enter Correction Details &rarr;
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: REVIEW REQUIRED CORRECTION */}
            {reworkStep === 2 && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-textPrimary block">
                  Step 2: Detail Technical Actions Taken to Rectify Defect
                </span>

                <div>
                  <label className="block text-xs font-semibold text-textPrimary mb-1">
                    Corrective Action Statement *
                  </label>
                  <textarea
                    rows={4}
                    value={reworkNotes}
                    onChange={(e) => setReworkNotes(e.target.value)}
                    placeholder="e.g. Removed damaged pipe flange, resurfaced mating faces, and installed new ANSI Class 150 EPDM gasket. Retorqued bolts to 140 Nm with torque wrench and conducted preliminary static pressure check."
                    className="w-full text-xs border border-[#E9DED2] rounded-xl p-2.5 bg-white focus:ring-1 focus:ring-[#8F2D16]"
                    required
                  />
                  <span className="text-[10px] text-textSecondary mt-0.5 block">
                    Describe specific component replacements, repairs, or re-testing performed.
                  </span>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-[#E9DED2]">
                  <Button variant="secondary" type="button" onClick={() => setReworkStep(1)}>
                    &larr; Back
                  </Button>
                  <Button
                    variant="saffron"
                    type="button"
                    disabled={reworkNotes.trim().length < 10}
                    onClick={() => setReworkStep(3)}
                  >
                    Next: Upload Evidence &rarr;
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: UPLOAD CORRECTION EVIDENCE */}
            {reworkStep === 3 && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-textPrimary block">
                  Step 3: Attach Photographic Evidence of Rework
                </span>

                <div className="p-3 bg-[#FAF4EC] rounded-xl border border-[#E9DED2] space-y-2">
                  <span className="text-xs font-semibold text-textPrimary block">Add Rework Photo</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Caption (e.g. Replacement gasket installed & dry-fit verified)"
                      value={reworkPhotoCaption}
                      onChange={(e) => setReworkPhotoCaption(e.target.value)}
                      className="flex-1 text-xs border border-[#E9DED2] rounded-lg p-2 bg-white"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="saffron"
                      onClick={handleAddReworkPhoto}
                    >
                      Attach Photo
                    </Button>
                  </div>
                </div>

                {reworkPhotos.length > 0 && (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto p-2 bg-[#FAF4EC] rounded-xl border border-[#E9DED2]">
                    <div className="text-[11px] text-[#15803D] font-bold">
                      {reworkPhotos.length} photo proof item(s) attached:
                    </div>
                    {reworkPhotos.map((p, pIdx) => (
                      <div key={pIdx} className="p-2 bg-white rounded-lg border border-[#E9DED2] flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Camera className="w-4 h-4 text-[#8F2D16]" />
                          <div>
                            <span className="font-semibold text-textPrimary block text-[11px]">{p.caption}</span>
                            <span className="text-[10px] text-textSecondary">{p.name}</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-textMuted">
                          {p.timestamp ? new Date(p.timestamp).toLocaleTimeString() : 'Recorded'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-between items-center pt-3 border-t border-[#E9DED2]">
                  <Button variant="secondary" type="button" onClick={() => setReworkStep(2)}>
                    &larr; Back
                  </Button>
                  <Button variant="saffron" type="button" onClick={() => setReworkStep(4)}>
                    Next: Review &amp; Submit &rarr;
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 4: SUBMIT FOR INDEPENDENT VERIFICATION */}
            {reworkStep === 4 && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-textPrimary block">
                  Step 4: Confirm Rework Claim &amp; Request Official Re-Inspection
                </span>

                <div className="p-3 bg-[#FAF4EC] rounded-xl border border-[#E9DED2] space-y-2 text-xs">
                  <div className="flex justify-between border-b border-[#E9DED2]/60 pb-1.5">
                    <span className="text-textSecondary">Target Defect:</span>
                    <strong className="text-textPrimary">{defect.title}</strong>
                  </div>
                  <div>
                    <span className="text-textSecondary block mb-1">Rework Declaration:</span>
                    <p className="bg-white p-2 rounded-lg text-textPrimary border border-[#E9DED2]/60">
                      {reworkNotes}
                    </p>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-textSecondary">Photographic Evidence:</span>
                    <span className="text-[#15803D] font-bold">{reworkPhotos.length} file(s) staged</span>
                  </div>
                </div>

                <div className="p-3 bg-[#FFFBEB] rounded-xl border border-[#FDE68A] text-xs text-[#B45309] leading-relaxed">
                  <strong>Independent Verification Notice:</strong> As per Government of Andhra Pradesh quality standards, contractors cannot approve their own corrections. Submitting this claim dispatches a Quality Field Inspector to independently test and close this defect on-site.
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-[#E9DED2]">
                  <Button variant="secondary" type="button" onClick={() => setReworkStep(3)}>
                    &larr; Back
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={submittingRework}
                    icon={<RotateCcw className="w-3.5 h-3.5" />}
                  >
                    Submit for Official Re-Inspection
                  </Button>
                </div>
              </div>
            )}
          </form>
        </div>
      </Modal>

      {/* MODAL 2: FIELD INSPECTOR RE-INSPECTION MODAL */}
      <Modal
        isOpen={isReinspectModalOpen}
        onClose={() => setIsReinspectModalOpen(false)}
        title="Quality Field Inspector Re-Inspection Verification"
      >
        <form onSubmit={handleReinspectSubmit} className="space-y-4">
          <p className="text-xs text-slate-500">
            Conduct independent on-site re-inspection and record authoritative engineering verdict for defect {defect.defect_id}.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Re-Inspection Verdict *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setReinspectVerdict('Pass')}
                className={`p-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  reinspectVerdict === 'Pass'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-400'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Pass — Verify Resolved
              </button>

              <button
                type="button"
                onClick={() => setReinspectVerdict('Fail')}
                className={`p-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  reinspectVerdict === 'Fail'
                    ? 'bg-rose-50 border-rose-500 text-rose-700 ring-2 ring-rose-400'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <XCircle className="w-4 h-4 text-rose-600" />
                Fail — Mandate Rework
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Quantified Measurements (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. 6.0 bar sustained for 30 mins with zero pressure drop"
              value={reinspectMeasurements}
              onChange={(e) => setReinspectMeasurements(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded p-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Field Inspector Verification Findings *
            </label>
            <textarea
              rows={3}
              value={reinspectNotes}
              onChange={(e) => setReinspectNotes(e.target.value)}
              placeholder="Detail visual, structural, or hydraulic findings confirming resolution or reasons for re-rejection."
              className="w-full text-xs border border-slate-200 rounded p-2 focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsReinspectModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#174EA6] hover:bg-[#123e85] text-white"
              isLoading={submittingReinspect}
            >
              Record Re-Inspection Verdict
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: DEFECT CLOSURE MODAL */}
      <Modal
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        title="Authorize Defect Ticket Closure"
      >
        <form onSubmit={handleCloseSubmit} className="space-y-4">
          <p className="text-xs text-slate-500">
            Official administrative closure by Municipal Administrator confirming satisfactory resolution of defect {defect.defect_id}.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Supervisory Closure Justification *
            </label>
            <textarea
              rows={3}
              value={closureNotes}
              onChange={(e) => setClosureNotes(e.target.value)}
              placeholder="e.g. Confirmed on-site hydrostatic re-test certification. Ticket formally closed and archived."
              className="w-full text-xs border border-slate-200 rounded p-2 focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCloseModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-slate-900 hover:bg-slate-800 text-white"
              isLoading={submittingClose}
            >
              Close & Archive Defect
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
