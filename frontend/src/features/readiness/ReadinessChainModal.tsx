import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  MinusCircle,
  FileText,
  User,
  Calendar,
  Layers,
  Loader2,
  ShieldAlert
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Badge, type BadgeVariant } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { api } from '../../services/api';
import type { ReadinessChainResponse, ChainStepStatus } from '../../types/readiness';

interface ReadinessChainModalProps {
  isOpen: boolean;
  onClose: () => void;
  workPackageId: string | null;
  onOpenAcceptance?: (workPackageId: string) => void;
}

export const ReadinessChainModal: React.FC<ReadinessChainModalProps> = ({
  isOpen,
  onClose,
  workPackageId,
  onOpenAcceptance,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [chain, setChain] = useState<ReadinessChainResponse | null>(null);

  useEffect(() => {
    if (isOpen && workPackageId) {
      loadChain(workPackageId);
    } else {
      setChain(null);
      setError(null);
    }
  }, [isOpen, workPackageId]);

  const loadChain = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getReadinessChain(id);
      setChain(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load readiness chain');
    } finally {
      setLoading(false);
    }
  };

  const getStepIcon = (status: ChainStepStatus) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'Blocked':
        return <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse" />;
      case 'Failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'Awaiting Authorisation':
        return <ShieldAlert className="w-5 h-5 text-indigo-600" />;
      case 'Not Applicable':
        return <MinusCircle className="w-5 h-5 text-slate-400" />;
      case 'Pending':
      default:
        return <Clock className="w-5 h-5 text-amber-500" />;
    }
  };

  const getStepBadgeVariant = (status: ChainStepStatus): BadgeVariant => {
    switch (status) {
      case 'Completed':
        return 'success';
      case 'Blocked':
      case 'Failed':
        return 'error';
      case 'Awaiting Authorisation':
        return 'brand';
      case 'Pending':
        return 'warning';
      case 'Not Applicable':
      default:
        return 'neutral';
    }
  };

  const delta = chain ? chain.reported_progress_percentage - chain.verified_progress_percentage : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Verified Readiness Chain (12 Stages)"
      description="Cryptographically & administratively audited lifecycle connecting project sanction to Godavari Pushkaralu operational deployment."
      maxWidth="2xl"
    >
      <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
        {loading && (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-brand mx-auto" />
            <p className="text-sm text-textSecondary font-medium">Assembling 12-stage verified readiness graph...</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {chain && !loading && (
          <>
            {/* Header Card */}
            <div className="bg-slate-50 border border-borderLight rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-mono font-bold text-brand uppercase tracking-wider">{chain.work_id}</span>
                  <h3 className="text-base font-bold text-textPrimary">{chain.work_package_title}</h3>
                  <p className="text-xs text-textSecondary mt-0.5">
                    Project: <span className="font-semibold text-textPrimary">{chain.project_name}</span> &bull; Vendor: <span className="font-semibold text-textPrimary">{chain.vendor_name || 'Unassigned'}</span>
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <Badge variant={chain.is_blocked ? 'error' : 'success'} size="md">
                    {chain.is_blocked ? 'Readiness Blocked' : 'Chain Unblocked'}
                  </Badge>
                  <Badge variant="neutral" size="md">
                    {chain.workflow_state}
                  </Badge>
                </div>
              </div>

              {/* Progress Invariant Comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-borderLight">
                <div className="bg-white p-3 rounded-lg border border-borderLight shadow-sm">
                  <span className="text-xs text-textSecondary font-medium block">Reported Progress (Vendor Claim)</span>
                  <span className="text-xl font-bold text-slate-800">{chain.reported_progress_percentage}%</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-borderLight shadow-sm">
                  <span className="text-xs text-textSecondary font-medium block">Verified Progress (Field Accredited)</span>
                  <span className="text-xl font-bold text-emerald-700">{chain.verified_progress_percentage}%</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-borderLight shadow-sm">
                  <span className="text-xs text-textSecondary font-medium block">Verification Gap (Delta)</span>
                  <span className={`text-xl font-bold ${delta > 0 ? 'text-amber-600' : 'text-emerald-700'}`}>
                    {delta > 0 ? `Δ -${delta.toFixed(1)}%` : 'Fully Reconciled'}
                  </span>
                </div>
              </div>

              {/* Section 13 Principle Box */}
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-lg p-3 text-xs text-amber-900 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Core Invariant (Section 13):</span> Contractor progress submissions are unverified claims. Verification and Acceptance are only certified following independent field inspection and defect remediation.
                </div>
              </div>

              {chain.is_blocked && chain.blocking_reasons.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-red-800">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Blocking Conditions Requiring Immediate Action:</span>
                  </div>
                  <ul className="list-disc list-inside text-xs text-red-700 space-y-0.5 pl-2">
                    {chain.blocking_reasons.map((reason, idx) => (
                      <li key={idx} className="font-medium">{reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Vertical 12-Stage Timeline */}
            <div className="space-y-4 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-textSecondary flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand" />
                12-Stage Dependency Sequence
              </h4>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                {chain.chain_steps.map((step) => {
                  const badgeVariant = getStepBadgeVariant(step.status);
                  return (
                    <div key={step.step_number} className="relative group">
                      {/* Timeline Node Icon */}
                      <div className="absolute -left-6 top-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-white ring-4 ring-white shadow-sm z-10">
                        {getStepIcon(step.status)}
                      </div>

                      {/* Card Content */}
                      <div className={`p-4 rounded-xl border transition-all ${
                        step.status === 'Blocked' || step.status === 'Failed'
                          ? 'bg-red-50/40 border-red-200'
                          : step.status === 'Completed'
                          ? 'bg-white border-borderLight shadow-sm hover:border-emerald-300'
                          : 'bg-white border-borderLight shadow-sm'
                      }`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400">#{step.step_number}</span>
                            <h5 className="text-sm font-bold text-textPrimary">{step.title}</h5>
                          </div>
                          <Badge variant={badgeVariant} size="sm">
                            {step.status_label}
                          </Badge>
                        </div>

                        {/* Actor & Timestamp */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-textSecondary mb-2">
                          {step.actor_name && (
                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-medium text-textPrimary">{step.actor_name}</span>
                              {step.actor_role && <span className="text-slate-400">({step.actor_role})</span>}
                            </span>
                          )}
                          {step.timestamp && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>{new Date(step.timestamp).toLocaleDateString()}</span>
                            </span>
                          )}
                        </div>

                        {/* Notes */}
                        {step.notes && (
                          <p className="text-xs text-textSecondary bg-slate-50 p-2.5 rounded-lg border border-slate-100 mb-2">
                            {step.notes}
                          </p>
                        )}

                        {/* Missing Requirements Warnings */}
                        {step.missing_requirements && step.missing_requirements.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <span className="text-[11px] font-semibold text-red-700 uppercase tracking-wider block">Outstanding Requirements:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {step.missing_requirements.map((req, rIdx) => (
                                <span key={rIdx} className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-red-100/80 text-red-800 border border-red-200">
                                  &bull; {req}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Evidence Files */}
                        {step.evidence_refs && step.evidence_refs.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-2">
                            {step.evidence_refs.map((ev, eIdx) => (
                              <div
                                key={eIdx}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50/70 border border-blue-200/60 text-xs text-blue-900"
                              >
                                <FileText className="w-3.5 h-3.5 text-blue-600" />
                                <span className="font-medium truncate max-w-[180px]">{ev.name || ev.caption || 'Attachment'}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer Actions */}
      <div className="px-6 py-4 bg-slate-50 border-t border-borderLight flex items-center justify-between">
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        {chain && onOpenAcceptance && (
          <Button
            variant="primary"
            icon={<ShieldCheck className="w-4 h-4" />}
            onClick={() => {
              onClose();
              onOpenAcceptance(chain.work_package_id);
            }}
          >
            Review Acceptance Gate
          </Button>
        )}
      </div>
    </Modal>
  );
};
