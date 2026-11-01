import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { api } from '../../services/api';
import type { AcceptanceValidationResult } from '../../types/readiness';

interface AcceptanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  workPackageId: string | null;
  onAccepted?: () => void;
}

export const AcceptanceModal: React.FC<AcceptanceModalProps> = ({
  isOpen,
  onClose,
  workPackageId,
  onAccepted,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<AcceptanceValidationResult | null>(null);

  const [decisionNotes, setDecisionNotes] = useState<string>('');
  const [allowException, setAllowException] = useState<boolean>(false);
  const [exceptionReason, setExceptionReason] = useState<string>('');

  useEffect(() => {
    if (isOpen && workPackageId) {
      loadValidation(workPackageId);
      setDecisionNotes('');
      setAllowException(false);
      setExceptionReason('');
    } else {
      setValidation(null);
      setError(null);
    }
  }, [isOpen, workPackageId]);

  const loadValidation = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.validateAcceptance(id);
      setValidation(data);
    } catch (err: any) {
      setError(err.message || 'Failed to validate acceptance criteria');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workPackageId) return;

    if (!decisionNotes.trim() || decisionNotes.trim().length < 5) {
      setError('Please provide administrative decision notes (minimum 5 characters).');
      return;
    }

    if (allowException && (!exceptionReason.trim() || exceptionReason.trim().length < 10)) {
      setError('Official justification is required when granting an authorized exception (minimum 10 characters).');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await api.acceptWorkPackage(workPackageId, {
        decision_notes: decisionNotes.trim(),
        allow_exception: allowException,
        exception_reason: allowException ? exceptionReason.trim() : null,
      });
      if (onAccepted) onAccepted();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to execute administrative acceptance sign-off');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = validation && (validation.can_accept || (allowException && exceptionReason.trim().length >= 10)) && decisionNotes.trim().length >= 5;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Controlled Acceptance Gate & Sign-Off"
      description="Administrative sign-off verifying mandatory milestones, field inspections, technical evidence, and zero blocking defects per Section 13."
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit}>
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {loading && (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-brand mx-auto" />
              <p className="text-sm text-textSecondary font-medium">Running acceptance pre-flight checklist verification...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {validation && !loading && (
            <>
              {/* Status Header */}
              <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
                validation.can_accept ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center gap-3">
                  {validation.can_accept ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-600 shrink-0" />
                  )}
                  <div>
                    <h4 className={`text-sm font-bold ${validation.can_accept ? 'text-emerald-900' : 'text-red-900'}`}>
                      {validation.can_accept ? 'Acceptance Gate Ready: All Conditions Satisfied' : 'Acceptance Blocked: Prerequisites Incomplete'}
                    </h4>
                    <p className={`text-xs ${validation.can_accept ? 'text-emerald-700' : 'text-red-700'}`}>
                      {validation.summary_message}
                    </p>
                  </div>
                </div>
                <Badge variant={validation.can_accept ? 'success' : 'error'} size="md">
                  {validation.can_accept ? 'Compliant' : 'Blocked'}
                </Badge>
              </div>

              {/* Preflight Checklist Items */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-textSecondary flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-brand" />
                  Pre-Flight Verification Checklist (Section 13)
                </h4>

                <div className="space-y-2.5">
                  {validation.checks.map((check, idx) => {
                    const isPassed = check.status === 'PASSED';
                    const isWarning = check.status === 'WARNING';
                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-lg border text-xs flex items-start gap-3 transition-colors ${
                          isPassed
                            ? 'bg-white border-slate-200'
                            : isWarning
                            ? 'bg-amber-50/60 border-amber-200'
                            : 'bg-red-50/50 border-red-200'
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {isPassed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : isWarning ? (
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                        </div>

                        <div className="flex-1 space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{check.criterion}</span>
                            <span className="font-mono text-[10px] text-slate-400">{check.code}</span>
                          </div>
                          <p className="text-slate-600 leading-relaxed">{check.details}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Decision Notes */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-textPrimary uppercase tracking-wider block">
                  Official Administrative Remarks <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  placeholder="Record formal executive decision, quality committee observations, or acceptance sanction details..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand"
                  required
                />
              </div>

              {/* Exception Workflow if Blocked */}
              {!validation.can_accept && (
                <div className="p-4 bg-amber-50/70 border border-amber-300/80 rounded-xl space-y-3">
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="allowExceptionCheck"
                      checked={allowException}
                      onChange={(e) => setAllowException(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-amber-300 text-brand focus:ring-brand"
                    />
                    <label htmlFor="allowExceptionCheck" className="text-xs font-bold text-amber-950 cursor-pointer">
                      Authorised Administrative Exception Override (Section 13)
                    </label>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed pl-6">
                    Municipal Administrators and Super Administrators may authorize an exceptional sign-off with permanent append-only audit logging (recording approver identity, reason, scope, and timestamp).
                  </p>

                  {allowException && (
                    <div className="pl-6 space-y-2 pt-1 animate-in fade-in duration-200">
                      <label className="text-xs font-bold text-amber-950 uppercase tracking-wider block">
                        Government Memo / Sanction Justification <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={3}
                        value={exceptionReason}
                        onChange={(e) => setExceptionReason(e.target.value)}
                        placeholder="e.g., High-priority conditional acceptance granted per Govt Memo AP-GODAVARI-2027-EXC-04; remaining non-critical work scheduled under warranty period."
                        className="w-full px-3 py-2 text-xs border border-amber-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand bg-white"
                        required
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-borderLight flex items-center justify-between">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button
            variant={allowException ? 'danger' : 'primary'}
            type="submit"
            isLoading={submitting}
            disabled={!canSubmit || submitting}
            icon={<ShieldCheck className="w-4 h-4" />}
          >
            {allowException ? 'Authorize Sign-Off With Exception' : 'Approve Administrative Acceptance'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
