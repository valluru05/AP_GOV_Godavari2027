import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Activity,
  Lightbulb,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Badge, type BadgeVariant } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { api } from '../../services/api';
import type { WorkPackageRiskEvaluation, RiskSeverity, RiskCategory } from '../../types/readiness';

interface RiskExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  workPackageId: string | null;
  onOpenChain?: (workPackageId: string) => void;
}

export const RiskExplanationModal: React.FC<RiskExplanationModalProps> = ({
  isOpen,
  onClose,
  workPackageId,
  onOpenChain,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<WorkPackageRiskEvaluation | null>(null);

  useEffect(() => {
    if (isOpen && workPackageId) {
      loadRisk(workPackageId);
    } else {
      setEvaluation(null);
      setError(null);
    }
  }, [isOpen, workPackageId]);

  const loadRisk = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getWorkPackageRisk(id);
      setEvaluation(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load risk evaluation');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category: RiskCategory) => {
    switch (category) {
      case 'Critical':
        return { text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', bar: 'bg-red-600' };
      case 'High':
        return { text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', bar: 'bg-orange-500' };
      case 'Moderate':
        return { text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', bar: 'bg-amber-500' };
      case 'Low':
        return { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', bar: 'bg-emerald-600' };
      default:
        return { text: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200', bar: 'bg-slate-400' };
    }
  };

  const getSeverityBadgeVariant = (severity: RiskSeverity): BadgeVariant => {
    switch (severity) {
      case 'Critical':
        return 'error';
      case 'High':
        return 'warning';
      case 'Moderate':
        return 'brand';
      case 'Low':
      default:
        return 'success';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Explainable Rule-Based Risk Engine"
      description="Transparent, deterministic 0–100 risk score and contributing factors computed per Section 14."
      maxWidth="2xl"
    >
      <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
        {loading && (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-brand mx-auto" />
            <p className="text-sm text-textSecondary font-medium">Evaluating decision-support risk rules A through G...</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {evaluation && !loading && (
          <>
            {/* Top Score Banner */}
            {(() => {
              const theme = getCategoryColor(evaluation.risk_category);
              return (
                <div className={`p-5 rounded-xl border ${theme.border} ${theme.bg} space-y-4`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">{evaluation.work_id}</span>
                      <h3 className="text-base font-bold text-slate-900">{evaluation.work_package_title}</h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Project: <span className="font-semibold">{evaluation.project_name}</span> &bull; Category: <span className="font-semibold">{evaluation.category}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-lg border border-slate-200 shadow-sm shrink-0">
                      <div className="text-right">
                        <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Score</span>
                        <span className={`text-2xl font-black ${theme.text}`}>{evaluation.risk_score}</span>
                        <span className="text-xs text-slate-400 font-medium"> / 100</span>
                      </div>
                      <div className="h-8 w-px bg-slate-200" />
                      <div>
                        <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Category</span>
                        <Badge variant={getSeverityBadgeVariant(evaluation.risk_category as any)} size="md">
                          {evaluation.risk_category}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar Gauge */}
                  <div className="space-y-1">
                    <div className="w-full bg-white/70 h-2.5 rounded-full overflow-hidden border border-slate-200/80">
                      <div
                        className={`h-full ${theme.bar} transition-all duration-500 rounded-full`}
                        style={{ width: `${Math.max(5, evaluation.risk_score)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                      <span>Low (0-24)</span>
                      <span>Moderate (25-49)</span>
                      <span>High (50-69)</span>
                      <span>Critical (70-100)</span>
                    </div>
                  </div>

                  {/* Plain Language Explanation */}
                  <div className="bg-white/90 p-3.5 rounded-lg border border-slate-200/60 text-xs text-slate-800 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-slate-900">
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                      Rule Engine Evaluation Summary:
                    </div>
                    <p className="leading-relaxed text-slate-700">
                      {evaluation.risk_explanation}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Contributing Rules Breakdown */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-textSecondary flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-brand" />
                  Contributing Risk Factors ({evaluation.factors.length})
                </span>
                <span className="text-[11px] text-textSecondary font-normal">Section 14 Documented Weights</span>
              </h4>

              {evaluation.factors.length === 0 ? (
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <p className="text-sm font-semibold text-textPrimary">Zero Active Risk Triggers</p>
                  <p className="text-xs text-textSecondary">Milestones are progressing on schedule, inspections are certified, and zero blocking defects exist.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {evaluation.factors.map((factor, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-xl border border-borderLight shadow-sm space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {factor.rule_id}
                          </span>
                          <h5 className="text-sm font-bold text-textPrimary">{factor.rule_name}</h5>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-bold font-mono text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                            +{factor.score_impact} pts
                          </span>
                          <Badge variant={getSeverityBadgeVariant(factor.severity)} size="sm">
                            {factor.severity}
                          </Badge>
                        </div>
                      </div>

                      <p className="text-xs text-textSecondary bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                        {factor.explanation}
                      </p>

                      <div className="flex items-center gap-2 text-xs text-brand font-medium pt-1">
                        <span className="font-bold text-slate-500 uppercase text-[10px]">Recommended Action:</span>
                        <span>{factor.suggested_action}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Suggested Next Actions */}
            {evaluation.suggested_actions.length > 0 && (
              <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-blue-600" />
                  Role-Appropriate Next Actions
                </h4>
                <ul className="space-y-1.5">
                  {evaluation.suggested_actions.map((act, aIdx) => (
                    <li key={aIdx} className="text-xs text-blue-950 flex items-start gap-2">
                      <ArrowRight className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <span>{act}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      <div className="px-6 py-4 bg-slate-50 border-t border-borderLight flex items-center justify-between">
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        {evaluation && onOpenChain && (
          <Button
            variant="primary"
            onClick={() => {
              onClose();
              onOpenChain(evaluation.work_package_id);
            }}
          >
            Inspect 12-Stage Chain
          </Button>
        )}
      </div>
    </Modal>
  );
};
