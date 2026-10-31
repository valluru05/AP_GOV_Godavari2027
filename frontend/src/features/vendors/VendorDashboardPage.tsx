import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  ArrowLeft,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  FileText,
  AlertCircle,
  UploadCloud,
  Check,
  X,
  Layers,
  Info
} from 'lucide-react';
import { api } from '../../services/api';
import type {
  VendorDashboardData,
  AssignedWorkPackageSummary,
  ProgressSubmission,
  ProgressSubmissionCreate
} from '../../types/vendor';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';

export const VendorDashboardPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [dashboard, setDashboard] = useState<VendorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Submit Progress Modal State
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<AssignedWorkPackageSummary | null>(null);
  const [progressPercentage, setProgressPercentage] = useState<number>(50);
  const [activitiesDescription, setActivitiesDescription] = useState('');
  const [delayOrBlocker, setDelayOrBlocker] = useState('');
  const [estimatedCompletionDate, setEstimatedCompletionDate] = useState('');

  // Review Submission Modal State (for Admins / PMs)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<ProgressSubmission | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'Reviewed' | 'Rejected'>('Reviewed');
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState('');

  const isVendorUser = user?.roles.some((r) => r.id === 'vendor');
  const canReview = user?.roles.some((r) =>
    ['super_admin', 'municipal_admin', 'project_manager'].includes(r.id)
  );
  const canSubmit = user?.roles.some((r) =>
    ['vendor', 'super_admin', 'municipal_admin', 'project_manager'].includes(r.id)
  );

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      let data: VendorDashboardData;
      if (!id || id === 'me') {
        data = await api.getMyVendorDashboard();
      } else {
        data = await api.getVendorDashboard(id);
      }
      setDashboard(data);
    } catch (err: any) {
      console.error('Failed to load vendor dashboard:', err);
      setError(err.message || 'Failed to load contractor portal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [id]);

  const handleOpenSubmitModal = (wp?: AssignedWorkPackageSummary) => {
    if (wp) {
      setSelectedPackage(wp);
      setProgressPercentage(wp.reported_progress_percentage || 50);
    } else if (dashboard?.assigned_work_packages.length) {
      setSelectedPackage(dashboard.assigned_work_packages[0]);
      setProgressPercentage(dashboard.assigned_work_packages[0].reported_progress_percentage || 50);
    }
    setActivitiesDescription('');
    setDelayOrBlocker('');
    setEstimatedCompletionDate('');
    setSubmitError('');
    setSubmitSuccess('');
    setIsSubmitModalOpen(true);
  };

  const handleSubmitProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackage) return;
    setSubmitting(true);
    setSubmitError('');

    try {
      const payload: ProgressSubmissionCreate = {
        work_package_id: selectedPackage.id,
        progress_percentage: Number(progressPercentage),
        activities_description: activitiesDescription,
        delay_or_blocker: delayOrBlocker.trim() ? delayOrBlocker.trim() : undefined,
        estimated_completion_date: estimatedCompletionDate || undefined,
        evidence_attachments: [
          {
            name: `Progress_Report_${selectedPackage.work_id}_${new Date().toISOString().split('T')[0]}.pdf`,
            type: 'pdf',
            size_kb: 1420,
          },
        ],
      };

      await api.submitProgress(payload);
      setSubmitSuccess('Progress update submitted successfully! Sent to Municipal Engineering team for independent review.');
      setTimeout(() => {
        setIsSubmitModalOpen(false);
        fetchDashboard();
      }, 1400);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit progress update');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenReviewModal = (submission: ProgressSubmission) => {
    setSelectedSubmission(submission);
    setReviewDecision('Reviewed');
    setReviewerNotes('');
    setReviewError('');
    setIsReviewModalOpen(true);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission) return;
    setReviewing(true);
    setReviewError('');

    try {
      await api.reviewProgressSubmission(selectedSubmission.id, {
        review_status: reviewDecision,
        reviewer_notes: reviewerNotes,
      });
      setIsReviewModalOpen(false);
      fetchDashboard();
    } catch (err: any) {
      setReviewError(err.message || 'Failed to submit review');
    } finally {
      setReviewing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-500 max-w-7xl mx-auto">
        <div className="animate-spin w-9 h-9 border-3 border-brand border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-sm font-medium">Loading contractor portal and assigned work packages...</p>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="max-w-3xl mx-auto p-8 mt-12 bg-white rounded-xl border border-slate-200 shadow-card text-center">
        <AlertTriangle className="w-12 h-12 text-govWarning mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Unable to Access Contractor Portal</h2>
        <p className="text-sm text-slate-600 mt-2">{error || 'Contractor data not found.'}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="secondary" onClick={() => navigate('/vendors')}>
            Back to Contractor Directory
          </Button>
          <Button variant="primary" onClick={fetchDashboard}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const { vendor, assigned_work_packages, recent_submissions, metrics } = dashboard;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Back Navigation Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/vendors')}
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-brand transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Contractors Directory
        </button>

        {canSubmit && (
          <Button
            id="open-submit-progress-btn"
            variant="primary"
            onClick={() => handleOpenSubmitModal()}
            icon={<Send className="w-4 h-4" />}
          >
            Submit Progress Update
          </Button>
        )}
      </div>

      {/* Contractor Profile Hero Banner */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-brand-light flex items-center justify-center text-brand font-bold text-xl shrink-0">
              <Building2 className="w-8 h-8 text-brand" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900">{vendor.company_name}</h1>
                <span className="font-mono text-xs px-2.5 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded-md">
                  {vendor.vendor_code}
                </span>
                {vendor.compliance_status === 'Compliant' && (
                  <Badge variant="success" size="sm" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
                    Compliant
                  </Badge>
                )}
                {vendor.compliance_status === 'Renewal Due' && (
                  <Badge variant="warning" size="sm" icon={<AlertTriangle className="w-3.5 h-3.5" />}>
                    Renewal Due
                  </Badge>
                )}
                {vendor.compliance_status === 'Suspended' && (
                  <Badge variant="error" size="sm">
                    Suspended
                  </Badge>
                )}
              </div>

              <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                <span className="font-medium text-slate-700">{vendor.category}</span>
                <span>•</span>
                <span>Representative: <strong className="text-slate-700">{vendor.contact_name}</strong></span>
                <span>•</span>
                <span>{vendor.email}</span>
                {vendor.phone && (
                  <>
                    <span>•</span>
                    <span>{vendor.phone}</span>
                  </>
                )}
              </p>

              <div className="flex items-center gap-4 mt-3 text-xs text-slate-600 flex-wrap">
                <div className="flex items-center gap-1.5 font-mono">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Contract Ref: <strong>{vendor.contract_reference || 'N/A'}</strong></span>
                </div>
                {vendor.contract_end_date && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Valid Through: <strong>{vendor.contract_end_date}</strong></span>
                  </div>
                )}
                {vendor.compliance_document_ref && (
                  <div className="flex items-center gap-1.5 font-mono">
                    <ShieldCheck className="w-3.5 h-3.5 text-govSuccess" />
                    <span>Cert: <strong>{vendor.compliance_document_ref}</strong></span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex md:flex-col justify-end items-end gap-2 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
            <span className="text-xs text-slate-500 font-medium">Assigned Portfolio</span>
            <div className="text-2xl font-black text-brand font-mono">
              {metrics.total_assigned_packages} Works
            </div>
            <span className="text-xs text-slate-500">
              {metrics.active_packages} active execution
            </span>
          </div>
        </div>
      </div>

      {/* Critical Anti-Corruption Principle Callout */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex items-start gap-3.5">
        <Info className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed text-blue-900">
          <strong className="font-semibold block text-blue-950 text-sm mb-0.5">
            Core Anti-Corruption Rule: Contractor Progress Claim vs. Independent Field Verification
          </strong>
          Reporting 100% progress updates your registered claim in the project tracking system. In accordance with
          Pushkaralu 2027 statutory readiness guidelines, <strong className="underline">verified progress remains unchanged</strong> until
          an authorized municipal inspector executes physical on-site checklists, reviews photo geotags, and formally certifies readiness.
        </div>
      </div>

      {/* KPI Performance Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Avg Reported vs Verified Progress */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-card">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Progress Status</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {metrics.average_reported_progress}%
            </span>
            <span className="text-xs text-slate-500 font-medium">reported</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-emerald-700 font-semibold font-mono">{metrics.average_verified_progress}% verified</span>
            <span className="text-slate-400 font-mono text-[11px]">Gap: +{metrics.progress_gap}%</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2 relative">
            <div
              className="bg-brand/40 h-full absolute left-0"
              style={{ width: `${Math.min(metrics.average_reported_progress, 100)}%` }}
            />
            <div
              className="bg-govSuccess h-full absolute left-0"
              style={{ width: `${Math.min(metrics.average_verified_progress, 100)}%` }}
            />
          </div>
        </div>

        {/* Open Defects */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Open Defects</span>
            <AlertCircle className="w-4 h-4 text-govError" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-govError font-mono">{metrics.open_defects_count}</span>
            <span className="text-xs text-slate-500">tickets</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {metrics.critical_defects_count > 0 ? (
              <strong className="text-govError font-semibold">{metrics.critical_defects_count} Critical severity</strong>
            ) : (
              '0 Critical defects'
            )}
          </p>
        </div>

        {/* Milestone Adherence */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Milestone Adherence</span>
            <Clock className="w-4 h-4 text-brand" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {metrics.milestones_completed} / {metrics.milestones_total}
            </span>
            <span className="text-xs text-slate-500">completed</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {metrics.milestones_overdue > 0 ? (
              <strong className="text-govWarning font-semibold">{metrics.milestones_overdue} Overdue milestones</strong>
            ) : (
              <span className="text-govSuccess font-medium">All milestones on schedule</span>
            )}
          </p>
        </div>

        {/* Compliance & Quality */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Statutory Standing</span>
            <ShieldCheck className="w-4 h-4 text-govSuccess" />
          </div>
          <div className="mt-2 text-base font-bold text-slate-900">
            {metrics.compliance_status}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Valid until: <strong className="text-slate-700">{metrics.contract_valid_until || 'Indefinite'}</strong>
          </p>
        </div>
      </div>

      {/* Assigned Work Packages Section */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand" />
              Assigned Work Packages ({assigned_work_packages.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Dual progress tracking: Contractor Claimed vs Field-Verified Completion.
            </p>
          </div>
        </div>

        {assigned_work_packages.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No work packages currently assigned.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Work Package</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Workflow State</th>
                  <th className="py-3 px-4 min-w-[200px]">Reported vs. Verified</th>
                  <th className="py-3 px-4 text-center">Milestones</th>
                  <th className="py-3 px-4 text-center">Open Defects</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assigned_work_packages.map((wp) => {
                  const hasGap = wp.reported_progress_percentage > wp.verified_progress_percentage;
                  return (
                    <tr key={wp.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Title & Code */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{wp.title}</div>
                        <div className="text-xs font-mono text-slate-500 mt-0.5">{wp.work_id}</div>
                      </td>

                      {/* Project */}
                      <td className="py-3.5 px-4">
                        <span className="text-xs font-medium text-slate-700 block max-w-xs truncate">
                          {wp.project_name}
                        </span>
                        <span className="text-[11px] text-slate-400">{wp.category}</span>
                      </td>

                      {/* State */}
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            wp.workflow_state === 'Verified Complete'
                              ? 'success'
                              : wp.workflow_state === 'Verification Failed' || wp.workflow_state === 'Rework Required'
                              ? 'error'
                              : 'brand'
                          }
                          size="sm"
                        >
                          {wp.workflow_state}
                        </Badge>
                      </td>

                      {/* Dual Progress Bars */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-600 font-medium">
                              Reported: <strong className="text-slate-900 font-mono">{wp.reported_progress_percentage}%</strong>
                            </span>
                            <span className="text-emerald-700 font-semibold font-mono">
                              Verified: {wp.verified_progress_percentage}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden relative">
                            {/* Reported Claim */}
                            <div
                              className="bg-brand h-full absolute left-0"
                              style={{ width: `${Math.min(wp.reported_progress_percentage, 100)}%` }}
                            />
                            {/* Verified Actual */}
                            <div
                              className="bg-govSuccess h-full absolute left-0 opacity-90"
                              style={{ width: `${Math.min(wp.verified_progress_percentage, 100)}%` }}
                            />
                          </div>
                          {hasGap && (
                            <div className="text-[10px] text-amber-700 font-medium">
                              ⚠️ {(wp.reported_progress_percentage - wp.verified_progress_percentage).toFixed(1)}% claim pending physical inspection
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Milestones */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="text-xs font-mono font-semibold text-slate-800">
                          {wp.milestones_completed} / {wp.milestones_total}
                        </span>
                      </td>

                      {/* Defects */}
                      <td className="py-3.5 px-4 text-center">
                        {wp.open_defects_count > 0 ? (
                          <Badge variant="error" size="sm">
                            {wp.open_defects_count} open
                          </Badge>
                        ) : (
                          <Badge variant="success" size="sm">
                            0 defects
                          </Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {canSubmit && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenSubmitModal(wp)}
                            icon={<Send className="w-3 h-3" />}
                          >
                            Report Progress
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Progress Submissions History & Review Section */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand" />
              Contractor Progress Submissions ({recent_submissions.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Audit log of self-reported contractor updates and municipal engineer review decisions.
            </p>
          </div>
        </div>

        {recent_submissions.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No submissions recorded yet.</p>
            <p className="text-xs text-slate-400 mt-1">Submit progress updates to track field activities.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Submission Code</th>
                  <th className="py-3 px-4">Work Package</th>
                  <th className="py-3 px-4">Claimed Progress</th>
                  <th className="py-3 px-4 min-w-[280px]">Activities & Declared Impediments</th>
                  <th className="py-3 px-4">Review Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recent_submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Code */}
                    <td className="py-3.5 px-4 font-mono text-xs font-bold text-slate-900">
                      {sub.submission_code}
                    </td>

                    {/* Work Package */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 text-xs">{sub.work_package_title}</div>
                      <div className="text-[11px] font-mono text-slate-500">{sub.work_package_code}</div>
                    </td>

                    {/* Progress % */}
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-brand font-mono text-sm">
                        {sub.progress_percentage}%
                      </span>
                    </td>

                    {/* Activities & Delays */}
                    <td className="py-3.5 px-4">
                      <p className="text-xs text-slate-800 line-clamp-2">{sub.activities_description}</p>
                      {sub.delay_or_blocker && (
                        <div className="mt-1 flex items-start gap-1.5 text-[11px] text-amber-800 bg-amber-50 p-1.5 rounded-md border border-amber-200/60">
                          <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                          <span>
                            <strong>Declared Delay:</strong> {sub.delay_or_blocker}
                          </span>
                        </div>
                      )}
                      {sub.reviewer_notes && (
                        <div className="mt-1 text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-200">
                          <strong>Official Review Notes:</strong> {sub.reviewer_notes}
                        </div>
                      )}
                    </td>

                    {/* Review Status Badge */}
                    <td className="py-3.5 px-4">
                      {sub.review_status === 'Under Review' && (
                        <Badge variant="warning" size="sm" icon={<Clock className="w-3 h-3" />}>
                          Under Review
                        </Badge>
                      )}
                      {sub.review_status === 'Reviewed' && (
                        <Badge variant="success" size="sm" icon={<CheckCircle2 className="w-3 h-3" />}>
                          Reviewed
                        </Badge>
                      )}
                      {sub.review_status === 'Rejected' && (
                        <Badge variant="error" size="sm" icon={<X className="w-3 h-3" />}>
                          Rejected
                        </Badge>
                      )}
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-xs text-slate-500 font-mono">
                      {new Date(sub.created_at).toLocaleDateString()}
                    </td>

                    {/* Review Action (Only for authorized officials, NOT vendor self-review) */}
                    <td className="py-3.5 px-4 text-right">
                      {canReview && sub.review_status === 'Under Review' ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenReviewModal(sub)}
                        >
                          Review Claim
                        </Button>
                      ) : isVendorUser ? (
                        <span className="text-[11px] text-slate-400 italic">
                          {sub.review_status === 'Under Review' ? 'Awaiting Review' : 'Processed'}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Completed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Progress Submission Modal */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title="Submit Contractor Progress Report"
      >
        <form onSubmit={handleSubmitProgress} className="space-y-4">
          {submitError && (
            <div className="p-3 bg-govError-light border border-govError-border rounded-lg text-xs text-govError font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {submitError}
            </div>
          )}

          {submitSuccess && (
            <div className="p-3 bg-govSuccess-light border border-govSuccess-border rounded-lg text-xs text-govSuccess font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {submitSuccess}
            </div>
          )}

          {/* Work Package Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target Work Package *</label>
            <select
              aria-label="Target Work Package"
              value={selectedPackage?.id || ''}
              onChange={(e) => {
                const found = assigned_work_packages.find((wp) => wp.id === e.target.value);
                if (found) {
                  setSelectedPackage(found);
                  setProgressPercentage(found.reported_progress_percentage || 50);
                }
              }}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20"
              required
            >
              {assigned_work_packages.map((wp) => (
                <option key={wp.id} value={wp.id}>
                  {wp.work_id} — {wp.title} (Current: {wp.reported_progress_percentage}%)
                </option>
              ))}
            </select>
          </div>

          {/* Progress Percentage Slider */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700">
                Claimed Progress Percentage: <strong className="text-brand font-mono text-sm">{progressPercentage}%</strong>
              </label>
              <span className="text-[11px] text-slate-500 font-mono">
                Current verified: {selectedPackage?.verified_progress_percentage || 0}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={progressPercentage}
              onChange={(e) => setProgressPercentage(Number(e.target.value))}
              className="w-full accent-brand h-2 bg-slate-200 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
              <span>0% (Commencing)</span>
              <span>50% (Mid-way)</span>
              <span>100% (Substantially Complete)</span>
            </div>
          </div>

          {/* Warning on 100% */}
          {Number(progressPercentage) === 100 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Statutory Notice:</strong> Reporting 100% does NOT automatically declare this work package verified or complete.
                Mandatory physical inspection and pressure/quality testing will be scheduled immediately.
              </span>
            </div>
          )}

          {/* Activities Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Activities & Works Executed *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Specify structural milestones finished, materials used, concrete pour dates, or equipment erected..."
              value={activitiesDescription}
              onChange={(e) => setActivitiesDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Minimum 10 characters required. Provide technical specifics for the site engineer.
            </span>
          </div>

          {/* Delay / Impediment Declaration */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span>Delay / Site Impediment Declaration (Optional)</span>
              <span className="text-[11px] text-amber-600 font-medium">Transparent Bottleneck Declaration</span>
            </label>
            <textarea
              rows={2}
              placeholder="Declare any site handover delays, power cut, heavy rain, or supply chain blockages..."
              value={delayOrBlocker}
              onChange={(e) => setDelayOrBlocker(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>

          {/* Estimated Completion Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Estimated Completion Date
            </label>
            <input
              type="date"
              value={estimatedCompletionDate}
              onChange={(e) => setEstimatedCompletionDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>

          {/* Evidence Upload Mock */}
          <div className="border border-dashed border-slate-300 rounded-lg p-3 text-center bg-slate-50">
            <UploadCloud className="w-5 h-5 text-slate-400 mx-auto mb-1" />
            <span className="text-xs text-slate-600 font-medium block">
              Auto-attached site report & geotagged evidence
            </span>
            <span className="text-[11px] text-slate-400">PDF Report & Site Geo-photos will be archived in immutable storage</span>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setIsSubmitModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={submitting}
              disabled={activitiesDescription.length < 10}
              icon={<Send className="w-3.5 h-3.5" />}
            >
              Submit Progress Claim
            </Button>
          </div>
        </form>
      </Modal>

      {/* Official Review Modal (Admins / PMs) */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title="Official Progress Claim Review"
      >
        <form onSubmit={handleSubmitReview} className="space-y-4">
          {reviewError && (
            <div className="p-3 bg-govError-light border border-govError-border rounded-lg text-xs text-govError font-medium">
              {reviewError}
            </div>
          )}

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Submission Code:</span>
              <span className="font-mono font-bold text-slate-900">{selectedSubmission?.submission_code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Contractor:</span>
              <span className="font-semibold text-slate-900">{selectedSubmission?.vendor_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Claimed Progress:</span>
              <span className="font-bold text-brand font-mono">{selectedSubmission?.progress_percentage}%</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block mb-0.5">Reported Description:</span>
              <p className="text-slate-800 bg-white p-2 rounded border border-slate-200">
                {selectedSubmission?.activities_description}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Review Decision *</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setReviewDecision('Reviewed')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-xs font-semibold transition-all ${
                  reviewDecision === 'Reviewed'
                    ? 'border-govSuccess bg-govSuccess-light text-govSuccess shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Check className="w-4 h-4" />
                Accept & Review
              </button>

              <button
                type="button"
                onClick={() => setReviewDecision('Rejected')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-xs font-semibold transition-all ${
                  reviewDecision === 'Rejected'
                    ? 'border-govError bg-govError-light text-govError shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <X className="w-4 h-4" />
                Reject Claim
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Official Reviewer Notes *
            </label>
            <textarea
              required
              rows={3}
              placeholder="State verification findings, physical check results, or reasons for rejection..."
              value={reviewerNotes}
              onChange={(e) => setReviewerNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Required. This note will be recorded in the immutable audit trail.
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setIsReviewModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={reviewing}
              disabled={reviewerNotes.trim().length < 5}
            >
              Confirm Decision
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
