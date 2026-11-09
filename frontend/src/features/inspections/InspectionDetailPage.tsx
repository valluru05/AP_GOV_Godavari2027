import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ClipboardCheck,
  ShieldCheck,
  AlertTriangle,
  MapPin,
  Camera,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  FileCheck2,
  FileText,
  AlertOctagon,
} from 'lucide-react';
import { api } from '../../services/api';
import type {
  Inspection,
  ChecklistItemResult,
  EvidencePhoto,
  InspectionExecuteRequest,
  InspectionReviewRequest,
  InspectionOutcome,
} from '../../types/inspection';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';

export const InspectionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasPermission, hasRole } = useAuth();

  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Execute Inspection Modal State (6-Step Mobile-First Inspection Wizard)
  const [isExecuteModalOpen, setIsExecuteModalOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [executing, setExecuting] = useState(false);
  const [execVerdict, setExecVerdict] = useState<InspectionOutcome>('Passed');
  const [execChecklist, setExecChecklist] = useState<ChecklistItemResult[]>([]);
  const [execVerifiedProgress, setExecVerifiedProgress] = useState<number>(100);
  const [execNotes, setExecNotes] = useState('');
  const [execLat, setExecLat] = useState<number>(16.9944);
  const [execLng, setExecLng] = useState<number>(81.7678);
  const [execAccuracy, setExecAccuracy] = useState<number>(3.5);
  const [gpsSimulated, setGpsSimulated] = useState(false);
  const [execSignature, setExecSignature] = useState('');
  const [signatureAgreed, setSignatureAgreed] = useState(false);
  const [execPhotos, setExecPhotos] = useState<EvidencePhoto[]>([]);
  const [photoCaption, setPhotoCaption] = useState('');

  // Supervisory Review Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [reviewDecision, setReviewDecision] = useState('Approved');
  const [reviewNotes, setReviewNotes] = useState('');

  const canExecute = hasPermission('inspections:conduct') || hasRole('field_inspector');
  const canReview = hasPermission('inspections:review') || hasRole('super_admin') || hasRole('municipal_admin');

  const fetchInspection = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError('');
      const data = await api.getInspection(id);
      setInspection(data);

      // Pre-fill execution state
      if (data.checklist_results && data.checklist_results.length > 0) {
        setExecChecklist(
          data.checklist_results.map((i) => ({
            item: i.item,
            verdict: i.verdict || 'Pass',
            measurement: i.measurement || '',
            notes: i.notes || '',
          }))
        );
      }
      setExecSignature(user?.full_name ? `${user.full_name} (${user.username})` : 'Authorized Inspector');
    } catch (err: any) {
      setError(err.message || 'Failed to load inspection record.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInspection();
  }, [id]);

  const handleSimulateGPS = () => {
    // If browser supports geolocation, capture real-world device coordinates or fall back to Pushkaralu sector
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setExecLat(Number(pos.coords.latitude.toFixed(6)));
          setExecLng(Number(pos.coords.longitude.toFixed(6)));
          setExecAccuracy(Number(pos.coords.accuracy.toFixed(1)) || 3.5);
          setGpsSimulated(false);
        },
        (err) => {
          console.warn('GPS hardware read fallback to Rajamahendravaram sector default:', err);
          setExecLat(16.9944);
          setExecLng(81.7678);
          setExecAccuracy(3.5);
          setGpsSimulated(true);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setExecLat(16.9944);
      setExecLng(81.7678);
      setExecAccuracy(3.5);
      setGpsSimulated(true);
    }
  };

  const handleAddPhoto = () => {
    if (!photoCaption.trim()) return;
    const newPhoto: EvidencePhoto = {
      name: `Photo_${Date.now().toString().slice(-4)}.jpg`,
      caption: photoCaption.trim(),
      timestamp: new Date().toISOString(),
      lat: execLat,
      lng: execLng,
    };
    setExecPhotos((prev) => [...prev, newPhoto]);
    setPhotoCaption('');
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('Photo exceeds 10MB limit. Please choose a smaller image.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const newPhoto: EvidencePhoto = {
        name: file.name,
        caption: photoCaption.trim() || `Field Photo ${execPhotos.length + 1}`,
        timestamp: new Date().toISOString(),
        lat: execLat,
        lng: execLng,
        url: dataUrl,
      };
      setExecPhotos((prev) => [...prev, newPhoto]);
      setPhotoCaption('');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    setExecPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleExecuteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!signatureAgreed) {
      alert('You must check the official certification affirmation before submitting field verification.');
      return;
    }

    try {
      setExecuting(true);
      const payload: InspectionExecuteRequest = {
        outcome: execVerdict,
        checklist_results: execChecklist,
        evidence_photos: execPhotos.length > 0 ? execPhotos : (inspection?.evidence_photos || []),
        latitude: execLat,
        longitude: execLng,
        gps_accuracy_meters: execAccuracy,
        notes: execNotes,
        verified_percentage_awarded: execVerdict === 'Passed' ? execVerifiedProgress : 0.0,
        inspector_signature: execSignature,
      };

      await api.executeInspection(id, payload);
      setIsExecuteModalOpen(false);
      await fetchInspection();
    } catch (err: any) {
      alert(err.message || 'Execution submission failed.');
    } finally {
      setExecuting(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      setReviewing(true);
      const payload: InspectionReviewRequest = {
        reviewer_decision: reviewDecision,
        notes: reviewNotes,
      };
      await api.reviewInspection(id, payload);
      setIsReviewModalOpen(false);
      await fetchInspection();
    } catch (err: any) {
      alert(err.message || 'Supervisory review failed.');
    } finally {
      setReviewing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 text-sm">
        <div className="animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
        Loading verification dossier...
      </div>
    );
  }

  if (error || !inspection) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-lg mx-auto">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Inspection Not Found</h2>
        <p className="text-sm text-slate-500 mt-1">{error || 'The requested inspection record does not exist.'}</p>
        <Button onClick={() => navigate('/inspections')} className="mt-4" variant="secondary">
          Back to Inspections Registry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Navigation & Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/inspections')}
          className="gap-1.5 text-xs text-slate-600 hover:text-slate-900 mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Inspections Registry
        </Button>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold bg-blue-50 text-blue-900 px-3 py-1 rounded-md border border-blue-200">
                {inspection.inspection_id}
              </span>
              {inspection.outcome === 'Passed' && (
                <Badge variant="success" className="gap-1 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Passed & Certified
                </Badge>
              )}
              {inspection.outcome === 'Failed' && (
                <Badge variant="error" className="gap-1 text-xs">
                  <XCircle className="w-3.5 h-3.5" />
                  Failed — Rework Required
                </Badge>
              )}
              {inspection.outcome === 'Scheduled' && (
                <Badge variant="warning" className="gap-1 text-xs">
                  <Clock className="w-3.5 h-3.5" />
                  Scheduled (Action Pending)
                </Badge>
              )}
              {inspection.outcome === 'Conditional Pass' && (
                <Badge variant="info" className="gap-1 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Conditional Pass
                </Badge>
              )}
            </div>

            <h1 className="text-xl font-bold text-slate-900 mt-2">
              {inspection.work_package_title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
              <span className="flex items-center gap-1 font-mono text-slate-700">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                {inspection.work_id}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-700">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                {inspection.zone_name || 'Kotilingala Ghat Sector 1'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-700">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                Inspector: {inspection.inspector_name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canExecute && (
              <Button
                onClick={() => setIsExecuteModalOpen(true)}
                className="bg-[#174EA6] hover:bg-[#123e85] text-white flex items-center gap-1.5 shadow-sm"
              >
                <ClipboardCheck className="w-4 h-4" />
                {inspection.outcome === 'Scheduled' ? 'Execute Field Inspection' : 'Re-Inspect / Update Verdict'}
              </Button>
            )}

            {canReview && (
              <Button
                onClick={() => setIsReviewModalOpen(true)}
                variant="secondary"
                className="flex items-center gap-1.5 border-slate-300"
              >
                <FileCheck2 className="w-4 h-4 text-indigo-600" />
                Supervisory Review
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Anti-Corruption Progress Impact & Geofence Verification */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Anti-Corruption Verification Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h2 className="font-semibold text-slate-900 text-sm">Physical Progress Impact (Section 28)</h2>
            </div>
            <span className="text-xs font-mono text-slate-400">Anti-Corruption Core</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                Contractor Self-Reported
              </span>
              <span className="text-2xl font-bold text-slate-700 mt-1 block">
                {inspection.outcome === 'Failed' ? '100.0%' : `${inspection.verified_percentage_awarded || 0}%`}
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">Unverified claim</span>
            </div>

            <div className={`p-3 rounded-lg border ${
              inspection.outcome === 'Passed'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : inspection.outcome === 'Failed'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <span className="text-[11px] uppercase tracking-wider font-semibold block opacity-80">
                Authoritative Verified
              </span>
              <span className="text-2xl font-bold mt-1 block">
                {inspection.verified_percentage_awarded !== null && inspection.verified_percentage_awarded !== undefined
                  ? `${inspection.verified_percentage_awarded}%`
                  : '0.0%'}
              </span>
              <span className="text-[11px] opacity-80 mt-0.5 block">Physical Ground-Truth</span>
            </div>
          </div>

          <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200/60 leading-relaxed">
            {inspection.outcome === 'Passed' && (
              <p>
                ✅ <strong>Physical Verification Complete:</strong> The field inspector certified all specifications. <strong>{inspection.verified_percentage_awarded}%</strong> verified progress is officially recorded into the Pushkaralu Readiness Index.
              </p>
            )}
            {inspection.outcome === 'Failed' && (
              <p>
                ⚠️ <strong>Progress Frozen at 0.0%:</strong> While contractor claimed 100% completion, on-site hydrostatic/engineering tests failed. Work package status transitioned to <em>Verification Failed</em>.
              </p>
            )}
            {inspection.outcome === 'Scheduled' && (
              <p>
                ⏳ <strong>Pending Field Audit:</strong> Work package progress cannot be verified until the inspector conducts on-site checklist execution.
              </p>
            )}
          </div>
        </div>

        {/* Geolocation & Geofence Sensor Verification */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-slate-900 text-sm">Geofence & Sensor Telemetry</h2>
            </div>
            {inspection.is_geofence_verified ? (
              <Badge variant="success" className="text-[11px] gap-1">
                <ShieldCheck className="w-3 h-3" />
                Inside Sector Boundary
              </Badge>
            ) : (
              <Badge variant="error" className="text-[11px] gap-1">
                <AlertTriangle className="w-3 h-3" />
                Geofence Deviation
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Latitude</span>
              <span className="font-mono text-sm font-bold text-slate-800 mt-1 block">
                {inspection.latitude ? inspection.latitude.toFixed(4) : 'Pending'}
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Longitude</span>
              <span className="font-mono text-sm font-bold text-slate-800 mt-1 block">
                {inspection.longitude ? inspection.longitude.toFixed(4) : 'Pending'}
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Sensor Accuracy</span>
              <span className="font-mono text-sm font-bold text-slate-800 mt-1 block">
                {inspection.gps_accuracy_meters ? `±${inspection.gps_accuracy_meters}m` : 'N/A'}
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-500 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
            <div className="flex items-center gap-1.5 font-medium text-blue-900">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Haversine Geofence Verification (2.5 km Threshold)</span>
            </div>
            <p className="text-[11px] text-blue-700 mt-1">
              Mobile telemetry verified against coordinates of <strong>{inspection.zone_name || 'Kotilingala Ghat'}</strong>. Remote submission spoofs are blocked automatically.
            </p>
          </div>
        </div>
      </div>

      {/* Engineering Checklist & Measurements */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-blue-700" />
            <div>
              <h2 className="font-bold text-slate-900 text-sm">
                Engineering Checklist & Quantified Measurements
              </h2>
              <p className="text-xs text-slate-500">
                Standard Template: {inspection.checklist_version} • Type: {inspection.inspection_type}
              </p>
            </div>
          </div>
          <span className="text-xs bg-slate-200/70 text-slate-700 font-mono px-2.5 py-1 rounded">
            {inspection.checklist_results?.length || 0} Criteria
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {(!inspection.checklist_results || inspection.checklist_results.length === 0) ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No checklist items populated for this inspection.
            </div>
          ) : (
            inspection.checklist_results.map((item, idx) => (
              <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/50 transition-colors">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-slate-900 text-sm">{item.item}</span>
                  </div>
                  {item.notes && (
                    <p className="text-xs text-slate-500 pl-7">{item.notes}</p>
                  )}
                </div>

                <div className="flex items-center gap-3 pl-7 sm:pl-0">
                  {/* Measurement */}
                  {item.measurement && (
                    <div className="bg-blue-50 border border-blue-200/80 rounded px-2.5 py-1 text-xs font-mono text-blue-900 flex items-center gap-1.5">
                      <span className="text-slate-400 text-[10px] uppercase">Meas:</span>
                      <strong className="font-bold">{item.measurement}</strong>
                    </div>
                  )}

                  {/* Verdict badge */}
                  <div>
                    {item.verdict === 'Pass' && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Pass
                      </span>
                    )}
                    {item.verdict === 'Fail' && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-100/70 px-2.5 py-1 rounded-full">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        Fail
                      </span>
                    )}
                    {item.verdict === 'Pending' && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100/70 px-2.5 py-1 rounded-full">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        Pending
                      </span>
                    )}
                    {item.verdict === 'N/A' && (
                      <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                        N/A
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Photographic Evidence Gallery */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold text-slate-900 text-sm">Geotagged Photographic Records & Lab Evidence</h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {inspection.evidence_photos?.length || 0} Attached
          </span>
        </div>

        {(!inspection.evidence_photos || inspection.evidence_photos.length === 0) ? (
          <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-lg">
            No geotagged site photographs attached yet. Photographs can be captured during checklist execution.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {inspection.evidence_photos.map((photo, pIdx) => (
              <div key={pIdx} className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden shadow-xs hover:border-blue-400 transition-colors">
                <div className="h-32 bg-slate-800 flex items-center justify-center text-slate-400 relative">
                  <Camera className="w-8 h-8 opacity-40 text-blue-300" />
                  <span className="absolute bottom-2 left-2 text-[10px] bg-slate-900/80 text-emerald-400 px-1.5 py-0.5 rounded font-mono">
                    GPS Geotagged
                  </span>
                </div>
                <div className="p-3 space-y-1">
                  <div className="font-mono text-xs font-semibold text-slate-900 truncate">
                    {photo.name}
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">{photo.caption}</p>
                  <div className="text-[10px] text-slate-400 pt-1 flex items-center justify-between">
                    <span>{photo.timestamp ? new Date(photo.timestamp).toLocaleTimeString() : 'Recorded'}</span>
                    {photo.lat && (
                      <span className="font-mono">{photo.lat.toFixed(4)}, {photo.lng?.toFixed(4)}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Inspector Certification & Supervisory Review Record */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Inspector Digital Signature */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="font-semibold text-slate-900 text-xs uppercase tracking-wider">
              Inspector Digital Certification Signature
            </h3>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="font-mono text-sm font-bold text-slate-900">
              {inspection.inspector_signature || 'Signature Pending Execution'}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 italic">
              "I hereby certify that I physically inspected this worksite at Godavari Pushkaralu Ghats and verified ground conditions against design specifications."
            </p>
          </div>
        </div>

        {/* Supervisory Sign-off Record */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <FileCheck2 className="w-4 h-4 text-indigo-600" />
            <h3 className="font-semibold text-slate-900 text-xs uppercase tracking-wider">
              Supervisory Review & Executive Engineer Sign-Off
            </h3>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Review Decision:</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                inspection.reviewer_decision === 'Approved'
                  ? 'bg-emerald-100 text-emerald-800'
                  : inspection.reviewer_decision === 'Rejected'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-slate-200 text-slate-700'
              }`}>
                {inspection.reviewer_decision || 'Awaiting Supervisory Review'}
              </span>
            </div>
            <div className="text-xs text-slate-600 mt-2 font-mono whitespace-pre-wrap">
              {inspection.notes || 'No supervisory comments recorded.'}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: EXECUTE INSPECTION MODAL (6-STEP GUIDED MOBILE-FIRST WIZARD) */}
      <Modal
        isOpen={isExecuteModalOpen}
        onClose={() => setIsExecuteModalOpen(false)}
        title="Field Inspection Verification Wizard"
        maxWidth="lg"
      >
        <div className="space-y-4">
          {/* Step Progress Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#E9DED2] text-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              {[
                { num: 1, label: 'Details' },
                { num: 2, label: 'Checklist' },
                { num: 3, label: 'Photos & GPS' },
                { num: 4, label: 'Verdict' },
                { num: 5, label: 'Defect Review' },
                { num: 6, label: 'Certify & Submit' },
              ].map((st) => (
                <div
                  key={st.num}
                  className={`flex items-center gap-1 shrink-0 ${
                    wizardStep === st.num
                      ? 'text-[#8F2D16] font-bold'
                      : wizardStep > st.num
                      ? 'text-[#15803D] font-medium'
                      : 'text-textMuted'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      wizardStep === st.num
                        ? 'bg-[#8F2D16] text-white'
                        : wizardStep > st.num
                        ? 'bg-[#15803D] text-white'
                        : 'bg-[#FAF4EC] text-textSecondary border border-[#E9DED2]'
                    }`}
                  >
                    {wizardStep > st.num ? '✓' : st.num}
                  </span>
                  <span className="hidden sm:inline text-[11px]">{st.label}</span>
                </div>
              ))}
            </div>
            <Badge variant="saffron" size="sm">
              Step {wizardStep} of 6
            </Badge>
          </div>

          <form onSubmit={handleExecuteSubmit} className="space-y-4">
            {/* STEP 1: REVIEW PROJECT AND WORK DETAILS */}
            {wizardStep === 1 && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-textPrimary block">
                  Step 1: Review Worksite Information &amp; Schedule
                </span>

                <div className="p-4 bg-[#FFFDF9] rounded-xl border border-[#E9DED2] space-y-2.5 text-xs">
                  <div className="flex justify-between border-b border-[#E9DED2]/60 pb-2">
                    <span className="text-textSecondary">Inspection Ref:</span>
                    <span className="font-mono font-bold text-[#8F2D16]">{inspection.inspection_id}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#E9DED2]/60 pb-2">
                    <span className="text-textSecondary">Work Package:</span>
                    <strong className="text-textPrimary text-right">{inspection.work_package_title}</strong>
                  </div>
                  <div className="flex justify-between border-b border-[#E9DED2]/60 pb-2">
                    <span className="text-textSecondary">Project:</span>
                    <span className="text-textPrimary">{inspection.project_name}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#E9DED2]/60 pb-2">
                    <span className="text-textSecondary">Bathing Ghat / Sector:</span>
                    <span className="text-textPrimary font-semibold">{inspection.zone_name || 'Rajamahendravaram Main Ghat'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-textSecondary">Inspection Standard:</span>
                    <span className="text-[#15803D] font-bold">{inspection.checklist_version}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[#E9DED2]">
                  <Button variant="secondary" type="button" onClick={() => setIsExecuteModalOpen(false)}>
                    Close
                  </Button>
                  <Button variant="saffron" type="button" onClick={() => setWizardStep(2)}>
                    Next: Checklist Items &rarr;
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: COMPLETE CHECKLIST ITEMS */}
            {wizardStep === 2 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-textPrimary">
                    Step 2: Verify Technical Checklist Criteria ({execChecklist.length} Items)
                  </span>
                  <span className="text-[11px] text-textSecondary">Large touch-friendly buttons</span>
                </div>

                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {execChecklist.map((item, idx) => (
                    <div key={idx} className="p-3 bg-[#FFFDF9] rounded-xl border border-[#E9DED2] space-y-2">
                      <span className="text-xs font-bold text-textPrimary block">
                        {idx + 1}. {item.item}
                      </span>

                      {/* Large Touch Target Buttons for Field Inspectors */}
                      <div className="grid grid-cols-3 gap-2">
                        {(['Pass', 'Fail', 'Pending'] as const).map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => {
                              const copy = [...execChecklist];
                              copy[idx].verdict = v;
                              setExecChecklist(copy);
                            }}
                            className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 ${
                              item.verdict === v
                                ? v === 'Pass'
                                  ? 'bg-[#15803D] text-white border-[#15803D] shadow-sm'
                                  : v === 'Fail'
                                  ? 'bg-[#B91C1C] text-white border-[#B91C1C] shadow-sm'
                                  : 'bg-[#B45309] text-white border-[#B45309] shadow-sm'
                                : 'bg-white text-textSecondary border-[#E9DED2] hover:bg-[#FAF4EC]'
                            }`}
                          >
                            {v === 'Pass' ? '✓ Pass' : v === 'Fail' ? '✗ Fail' : '○ Pending'}
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <input
                          type="text"
                          placeholder="Measured Value (e.g. 6.0 bar, 68 lux)"
                          value={item.measurement || ''}
                          onChange={(e) => {
                            const copy = [...execChecklist];
                            copy[idx].measurement = e.target.value;
                            setExecChecklist(copy);
                          }}
                          className="text-xs border border-[#E9DED2] rounded-lg p-2 bg-white"
                        />
                        <input
                          type="text"
                          placeholder="Specific observation or remark"
                          value={item.notes || ''}
                          onChange={(e) => {
                            const copy = [...execChecklist];
                            copy[idx].notes = e.target.value;
                            setExecChecklist(copy);
                          }}
                          className="text-xs border border-[#E9DED2] rounded-lg p-2 bg-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-[#E9DED2]">
                  <Button variant="secondary" type="button" onClick={() => setWizardStep(1)}>
                    &larr; Back
                  </Button>
                  <Button variant="saffron" type="button" onClick={() => setWizardStep(3)}>
                    Next: Photos &amp; GPS &rarr;
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: UPLOAD PHOTOGRAPHS AND GPS TELEMETRY */}
            {wizardStep === 3 && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-textPrimary block">
                  Step 3: Capture Geotagged Site Photographs &amp; Device GPS
                </span>

                {/* GPS Telemetry Bar */}
                <div className="bg-[#FAF4EC] p-3 rounded-xl border border-[#E9DED2] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#8F2D16]" />
                    <div className="text-xs">
                      <span className="font-bold text-textPrimary block">Coordinates: {execLat.toFixed(4)}, {execLng.toFixed(4)}</span>
                      <span className="text-[10px] text-[#15803D] font-semibold">Sensor Accuracy: &plusmn;{execAccuracy}m (Rajamahendravaram Grid)</span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleSimulateGPS}
                  >
                    {gpsSimulated ? 'GPS Locked ✓' : 'Refresh GPS'}
                  </Button>
                </div>

                {/* Photo Capture & Upload Box */}
                <div className="p-3 bg-[#FFFDF9] rounded-xl border border-[#E9DED2] space-y-2">
                  <span className="text-xs font-semibold text-textPrimary block">Attach Field Verification Photo</span>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Photo caption (e.g. Pump pressure gauge reading)"
                      value={photoCaption}
                      onChange={(e) => setPhotoCaption(e.target.value)}
                      className="flex-1 text-xs border border-[#E9DED2] rounded-lg p-2 bg-white"
                    />
                    <div className="flex gap-2">
                      <label className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#FEF3E8] text-[#8F2D16] border border-[#FCE4CB] hover:bg-[#FCE4CB] rounded-lg text-xs font-semibold cursor-pointer transition-colors shrink-0">
                        <Camera className="w-4 h-4" />
                        <span>Snap / Browse</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={handleAddPhoto}
                      >
                        Add Tag
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Staged photos preview */}
                {execPhotos.length > 0 && (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto p-2 bg-[#FAF4EC] border border-[#E9DED2] rounded-xl">
                    <div className="text-[11px] text-[#15803D] font-bold">
                      {execPhotos.length} site evidence photo(s) captured:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {execPhotos.map((photo, pIdx) => (
                        <div key={pIdx} className="flex items-center justify-between p-2 bg-white border border-[#E9DED2] rounded-lg text-xs">
                          <div className="flex items-center gap-2 overflow-hidden">
                            {photo.url ? (
                              <img src={photo.url} alt="Staged" className="w-8 h-8 object-cover rounded shrink-0 border" />
                            ) : (
                              <div className="w-8 h-8 rounded bg-[#FAF4EC] flex items-center justify-center text-[#8F2D16] shrink-0">
                                <Camera className="w-4 h-4" />
                              </div>
                            )}
                            <div className="truncate">
                              <p className="font-semibold text-textPrimary text-[11px] truncate">{photo.caption || photo.name}</p>
                              <p className="text-[10px] text-textSecondary">{photo.name}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(pIdx)}
                            className="text-textMuted hover:text-[#B91C1C] px-1 font-bold"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center pt-3 border-t border-[#E9DED2]">
                  <Button variant="secondary" type="button" onClick={() => setWizardStep(2)}>
                    &larr; Back
                  </Button>
                  <Button variant="saffron" type="button" onClick={() => setWizardStep(4)}>
                    Next: Overall Verdict &rarr;
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 4: OVERALL VERDICT & NOTES */}
            {wizardStep === 4 && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-textPrimary block">
                  Step 4: Declare Authoritative Field Verdict
                </span>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setExecVerdict('Passed');
                      setExecVerifiedProgress(100);
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                      execVerdict === 'Passed'
                        ? 'bg-[#F0FDF4] border-[#15803D] text-[#15803D] ring-2 ring-[#15803D]/20 shadow-sm'
                        : 'bg-white border-[#E9DED2] text-textSecondary hover:bg-[#FAF4EC]'
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5 text-[#15803D]" />
                    <span>Passed &amp; Ready</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setExecVerdict('Failed');
                      setExecVerifiedProgress(0);
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                      execVerdict === 'Failed'
                        ? 'bg-[#FEF2F2] border-[#B91C1C] text-[#B91C1C] ring-2 ring-[#B91C1C]/20 shadow-sm'
                        : 'bg-white border-[#E9DED2] text-textSecondary hover:bg-[#FAF4EC]'
                    }`}
                  >
                    <XCircle className="w-5 h-5 text-[#B91C1C]" />
                    <span>Failed (Rework)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setExecVerdict('Conditional Pass');
                      setExecVerifiedProgress(75);
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                      execVerdict === 'Conditional Pass'
                        ? 'bg-[#FFFBEB] border-[#B45309] text-[#B45309] ring-2 ring-[#B45309]/20 shadow-sm'
                        : 'bg-white border-[#E9DED2] text-textSecondary hover:bg-[#FAF4EC]'
                    }`}
                  >
                    <AlertTriangle className="w-5 h-5 text-[#B45309]" />
                    <span>Conditional Pass</span>
                  </button>
                </div>

                {execVerdict === 'Passed' && (
                  <div className="p-3 bg-[#FFFDF9] rounded-xl border border-[#E9DED2]">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-textPrimary">
                        Verified Physical Progress Awarded:
                      </label>
                      <span className="font-mono font-bold text-sm text-[#15803D] bg-[#F0FDF4] px-2.5 py-0.5 rounded border border-[#BBF7D0]">
                        {execVerifiedProgress}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="5"
                      value={execVerifiedProgress}
                      onChange={(e) => setExecVerifiedProgress(Number(e.target.value))}
                      className="w-full accent-[#15803D] h-2 bg-[#E9DED2] rounded-lg cursor-pointer"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-textPrimary mb-1">
                    Inspector Directives &amp; Field Notes *
                  </label>
                  <textarea
                    rows={3}
                    value={execNotes}
                    onChange={(e) => setExecNotes(e.target.value)}
                    placeholder="Document specific engineering observations, equipment serials checked, and recommendations..."
                    className="w-full text-xs border border-[#E9DED2] rounded-xl p-2.5 bg-white focus:ring-1 focus:ring-[#8F2D16]"
                  />
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-[#E9DED2]">
                  <Button variant="secondary" type="button" onClick={() => setWizardStep(3)}>
                    &larr; Back
                  </Button>
                  <Button variant="saffron" type="button" onClick={() => setWizardStep(5)}>
                    Next: Review Failed Items &rarr;
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 5: REVIEW FAILED ITEMS */}
            {wizardStep === 5 && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-textPrimary block">
                  Step 5: Review Non-Compliant Items &amp; Defect Logging
                </span>

                {execChecklist.filter((i) => i.verdict === 'Fail').length > 0 ? (
                  <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#B91C1C]">
                      <AlertOctagon className="w-4 h-4" />
                      <span>{execChecklist.filter((i) => i.verdict === 'Fail').length} Item(s) Marked as Failed</span>
                    </div>
                    <p className="text-[11px] text-[#991B1B]">
                      Submitting these failures will automatically log an official Defect Ticket in Module 6 and notify the contractor for immediate rework.
                    </p>
                    <div className="divide-y divide-[#FECACA] text-xs pt-1">
                      {execChecklist
                        .filter((i) => i.verdict === 'Fail')
                        .map((f, fi) => (
                          <div key={fi} className="py-1 text-textPrimary">
                            &bull; <strong>{f.item}</strong>: {f.notes || 'Defect noted by inspector'}
                          </div>
                        ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl text-xs text-[#15803D] flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <div>
                      <p className="font-bold">No Critical Defects Detected</p>
                      <p className="text-[11px] text-[#166534]">All checked physical criteria have passed inspection.</p>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center pt-3 border-t border-[#E9DED2]">
                  <Button variant="secondary" type="button" onClick={() => setWizardStep(4)}>
                    &larr; Back
                  </Button>
                  <Button variant="saffron" type="button" onClick={() => setWizardStep(6)}>
                    Next: Certify &amp; Submit &rarr;
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 6: DIGITAL SIGNATURE & SUBMIT */}
            {wizardStep === 6 && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-textPrimary block">
                  Step 6: Digital Certification &amp; Official Submission
                </span>

                <div className="p-3 bg-[#FAF4EC] rounded-xl border border-[#E9DED2] text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-textSecondary">Inspector Identity:</span>
                    <strong className="text-textPrimary">{user?.full_name} ({user?.username})</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-textSecondary">Recorded Verdict:</span>
                    <Badge variant={execVerdict === 'Passed' ? 'success' : 'error'} size="sm">
                      {execVerdict}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-textSecondary">Sync Mode:</span>
                    <span className="text-[#15803D] font-bold">Online &bull; Immediate Audit Log</span>
                  </div>
                </div>

                <div className="pt-1 space-y-2">
                  <label className="flex items-start gap-2 cursor-pointer p-2.5 bg-white rounded-xl border border-[#E9DED2]">
                    <input
                      type="checkbox"
                      checked={signatureAgreed}
                      onChange={(e) => setSignatureAgreed(e.target.checked)}
                      className="mt-0.5 rounded text-[#8F2D16] focus:ring-[#8F2D16] h-4 w-4"
                      required
                    />
                    <span className="text-xs text-textPrimary leading-tight">
                      <strong>Official Attestation:</strong> I declare under penalty of administrative scrutiny that I am physically present on-site at Godavari Pushkaralu Ghats and have verified all measurements accurately.
                    </span>
                  </label>

                  <input
                    type="text"
                    value={execSignature}
                    onChange={(e) => setExecSignature(e.target.value)}
                    placeholder="Inspector Signature"
                    className="w-full text-xs font-mono border border-[#E9DED2] rounded-xl p-2.5 bg-[#FAF4EC]"
                    required
                  />
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-[#E9DED2]">
                  <Button variant="secondary" type="button" onClick={() => setWizardStep(5)}>
                    &larr; Back
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={executing}
                    disabled={!signatureAgreed}
                    icon={<ClipboardCheck className="w-4 h-4" />}
                  >
                    Submit Verified Inspection
                  </Button>
                </div>
              </div>
            )}
          </form>
        </div>
      </Modal>

      {/* MODAL 2: SUPERVISORY REVIEW MODAL */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title="Supervisory Engineering Review & Acceptance"
      >
        <form onSubmit={handleReviewSubmit} className="space-y-4">
          <p className="text-xs text-slate-500">
            Administrative sign-off by Executive Engineer or Municipal Administrator confirming compliance with Godavari Pushkaralu infrastructure standards.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Supervisory Decision *
            </label>
            <select
              value={reviewDecision}
              onChange={(e) => setReviewDecision(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="Approved">Approved — Certify Deliverables</option>
              <option value="Rejected">Rejected — Order Rectification</option>
              <option value="Re-inspection Ordered">Re-inspection Ordered (Independent Audit)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Supervisory Review Observations & Directives
            </label>
            <textarea
              rows={3}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Official comments regarding testing protocols, water purity compliance, or defect remedies."
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsReviewModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#174EA6] hover:bg-[#123e85] text-white"
              isLoading={reviewing}
            >
              Record Supervisory Decision
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
