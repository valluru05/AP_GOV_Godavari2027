import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  AlertOctagon,
  Plus,
  GitBranch,
  RefreshCw,
  Lock,
  Layers
} from 'lucide-react';
import { api } from '../../services/api';
import type { ProjectDetail, WorkPackage, Milestone } from '../../types/project';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ReadinessChainModal } from '../readiness/ReadinessChainModal';

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active Tab: 1. Overview, 2. Work Packages, 3. Milestones, 4. Vendors, 5. Inspections, 6. Defects, 7. Assets, 8. Evidence, 9. Activity & Audit
  const [activeTab, setActiveTab] = useState<
    'overview' | 'work_packages' | 'milestones' | 'vendors' | 'inspections' | 'defects' | 'assets' | 'evidence' | 'activity'
  >('overview');

  // Add Work Package Modal
  const [addWpOpen, setAddWpOpen] = useState(false);
  const [wpIdCode, setWpIdCode] = useState('');
  const [wpTitle, setWpTitle] = useState('');
  const [wpDesc, setWpDesc] = useState('');
  const [wpCategory, setWpCategory] = useState('Drinking Water');
  const [wpPriority, setWpPriority] = useState('High');
  const [wpVendorId, setWpVendorId] = useState('');
  const [wpStartDate, setWpStartDate] = useState('');
  const [wpEndDate, setWpEndDate] = useState('');
  const [vendorsList, setVendorsList] = useState<any[]>([]);
  const [wpSubmitting, setWpSubmitting] = useState(false);
  const [wpError, setWpError] = useState<string | null>(null);

  // Add Milestone Modal
  const [addMsOpen, setAddMsOpen] = useState(false);
  const [msTargetWpId, setMsTargetWpId] = useState('');
  const [msName, setMsName] = useState('');
  const [msDesc, setMsDesc] = useState('');
  const [msDueDate, setMsDueDate] = useState('');
  const [msCriteria, setMsCriteria] = useState('');
  const [msEvidenceType, setMsEvidenceType] = useState('Photographic Inspection');
  const [msSubmitting, setMsSubmitting] = useState(false);
  const [msError, setMsError] = useState<string | null>(null);

  // Add Dependency Modal
  const [addDepOpen, setAddDepOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [dependencyTargetId, setDependencyTargetId] = useState('');
  const [depSubmitting, setDepSubmitting] = useState(false);
  const [depError, setDepError] = useState<string | null>(null);

  // Transition Status Modal
  const [transitionOpen, setTransitionOpen] = useState(false);
  const [selectedWp, setSelectedWp] = useState<WorkPackage | null>(null);
  const [targetState, setTargetState] = useState('');
  const [transitionReason, setTransitionReason] = useState('');
  const [transitionSubmitting, setTransitionSubmitting] = useState(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [selectedChainWpId, setSelectedChainWpId] = useState<string | null>(null);

  const canEdit = hasPermission('projects:edit');

  const loadProjectDetail = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [projData, filterOpts] = await Promise.all([
        api.getProjectDetail(id),
        api.getDashboardFilters(),
      ]);
      setProject(projData);
      setVendorsList(filterOpts.vendors || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch project record');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjectDetail();
  }, [id]);

  const handleCreateWorkPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    setWpError(null);
    setWpSubmitting(true);
    try {
      await api.createWorkPackage(project.id, {
        project_id: project.id,
        work_id: wpIdCode.toUpperCase(),
        title: wpTitle,
        description: wpDesc,
        category: wpCategory,
        vendor_id: wpVendorId || undefined,
        priority: wpPriority,
        planned_start_date: wpStartDate || undefined,
        planned_completion_date: wpEndDate || undefined,
      });
      setAddWpOpen(false);
      setWpIdCode('');
      setWpTitle('');
      setWpDesc('');
      await loadProjectDetail();
    } catch (err: any) {
      setWpError(err.message || 'Failed to create work package');
    } finally {
      setWpSubmitting(false);
    }
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsError(null);
    setMsSubmitting(true);
    try {
      await api.createMilestone(msTargetWpId, {
        work_package_id: msTargetWpId,
        name: msName,
        description: msDesc,
        due_date: msDueDate,
        acceptance_criteria: msCriteria || undefined,
        required_evidence_type: msEvidenceType,
        is_mandatory: true,
      });
      setAddMsOpen(false);
      setMsName('');
      setMsDesc('');
      setMsDueDate('');
      setMsCriteria('');
      await loadProjectDetail();
    } catch (err: any) {
      setMsError(err.message || 'Failed to add milestone');
    } finally {
      setMsSubmitting(false);
    }
  };

  const handleAddDependency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMilestone) return;
    setDepError(null);
    setDepSubmitting(true);
    try {
      await api.addMilestoneDependency(selectedMilestone.id, dependencyTargetId);
      setAddDepOpen(false);
      await loadProjectDetail();
    } catch (err: any) {
      // Shows cycle detection error clearly
      setDepError(err.message || 'Dependency addition failed');
    } finally {
      setDepSubmitting(false);
    }
  };

  const handleStatusTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWp) return;
    setTransitionError(null);
    setTransitionSubmitting(true);
    try {
      await api.updateWorkPackageStatus(selectedWp.id, targetState, transitionReason);
      setTransitionOpen(false);
      await loadProjectDetail();
    } catch (err: any) {
      setTransitionError(err.message || 'Status transition blocked');
    } finally {
      setTransitionSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-xs text-textSecondary">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-brand" />
        <span>Loading municipal infrastructure project records...</span>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-8 max-w-lg mx-auto bg-surface border border-borderLight rounded-xl text-center space-y-3">
        <AlertOctagon className="w-8 h-8 text-govError mx-auto" />
        <h2 className="text-base font-bold text-textPrimary">Project Record Error</h2>
        <p className="text-xs text-textSecondary">{error || 'Project not found'}</p>
        <Button variant="secondary" size="sm" onClick={() => navigate('/projects')}>
          Return to Projects
        </Button>
      </div>
    );
  }

  const allMilestones = project.work_packages.flatMap((w) => w.milestones);
  const totalReportedAvg = project.reported_progress_avg;
  const totalVerifiedAvg = project.verified_progress_avg;

  const tabs = [
    { key: 'overview', name: '1. Overview' },
    { key: 'work_packages', name: `2. Work Packages (${project.work_packages.length})` },
    { key: 'milestones', name: `3. Milestones (${allMilestones.length})` },
    { key: 'vendors', name: '4. Vendors' },
    { key: 'inspections', name: '5. Inspections' },
    { key: 'defects', name: '6. Defects' },
    { key: 'assets', name: '7. Assets' },
    { key: 'evidence', name: '8. Evidence Vault' },
    { key: 'activity', name: '9. Activity & Audit' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Return Action */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/projects')}
          className="text-xs font-medium text-brand hover:underline inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Project Register
        </button>
        <Badge variant="brand" size="sm">
          Pushkaralu 2027 Priority Work
        </Badge>
      </div>

      {/* Project Banner Header */}
      <div className="bg-surface p-6 rounded-xl border border-borderLight shadow-card">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold bg-brand-light text-brand px-2 py-0.5 rounded border border-brand-subtle">
                {project.project_identifier}
              </span>
              <Badge
                variant={
                  project.current_status === 'Accepted'
                    ? 'success'
                    : project.current_status === 'Delayed'
                    ? 'error'
                    : 'brand'
                }
                size="sm"
              >
                {project.current_status}
              </Badge>
              <Badge variant="neutral" size="sm">
                Priority: {project.priority}
              </Badge>
              {project.zone_name && (
                <span className="text-xs text-textSecondary flex items-center gap-1 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {project.zone_name}
                </span>
              )}
            </div>

            <h1 className="text-xl md:text-2xl font-bold text-textPrimary tracking-tight">
              {project.name}
            </h1>
            <p className="text-xs text-textSecondary max-w-3xl leading-relaxed">
              {project.description || 'No detailed scope notes registered.'}
            </p>
          </div>

          {/* Verification Comparison Pill */}
          <div className="p-3 bg-slate-50 border border-borderLight rounded-xl shrink-0 min-w-[200px] text-center">
            <span className="text-[10px] uppercase font-semibold text-textSecondary block">
              Verified Physical Progress
            </span>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-2xl font-extrabold text-emerald-700">{totalVerifiedAvg}%</span>
              <span className="text-xs text-textSecondary">/ {totalReportedAvg}% rep</span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Verified by independent QA audit
            </span>
          </div>
        </div>

        {/* Supporting Metadata Grid */}
        <div className="mt-6 pt-4 border-t border-borderLight grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-textSecondary block text-[11px]">Work Category</span>
            <span className="font-semibold text-textPrimary">{project.category}</span>
          </div>
          <div>
            <span className="text-textSecondary block text-[11px]">Planned Window</span>
            <span className="font-semibold text-textPrimary">
              {project.start_date || '—'} &rarr; {project.planned_completion_date || '—'}
            </span>
          </div>
          <div>
            <span className="text-textSecondary block text-[11px]">Budget & Funding Ref</span>
            <span className="font-mono font-semibold text-slate-700 flex items-center gap-1">
              {project.funding_reference === 'RESTRICTED' ? (
                <>
                  <Lock className="w-3 h-3 text-slate-400" /> Restricted
                </>
              ) : (
                project.funding_reference || 'Unassigned'
              )}
            </span>
          </div>
          <div>
            <span className="text-textSecondary block text-[11px]">Created At</span>
            <span className="text-textPrimary">{new Date(project.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* 9 Tab Navigation (Section 8, page 18) */}
      <div className="border-b border-borderLight flex overflow-x-auto gap-2 bg-surface px-4 rounded-xl shadow-subtle">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`py-3 px-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-brand text-brand'
                : 'border-transparent text-textSecondary hover:text-textPrimary'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-8 bg-surface p-6 rounded-xl border border-borderLight shadow-card space-y-4">
            <h3 className="text-sm font-bold text-textPrimary uppercase tracking-wider">
              Project Readiness Profile & Scope
            </h3>
            <p className="text-xs text-textSecondary leading-relaxed">
              {project.description}
            </p>

            <div className="p-4 bg-slate-50 border border-borderLight rounded-xl space-y-2">
              <span className="text-xs font-bold text-textPrimary block">Readiness Chain Validation:</span>
              <p className="text-[11px] text-textSecondary">
                All constituent work packages must complete independent checklist verification and resolve
                all blocking defect tickets before final administrative acceptance can be conferred.
              </p>
            </div>
          </div>

          <div className="md:col-span-4 bg-surface p-6 rounded-xl border border-borderLight shadow-card space-y-4">
            <h3 className="text-sm font-bold text-textPrimary uppercase tracking-wider">
              Constituent Work Packages
            </h3>
            <div className="space-y-2">
              {project.work_packages.map((wp) => (
                <div key={wp.id} className="p-2.5 bg-slate-50 rounded-lg border border-borderLight text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-mono font-bold text-brand">{wp.work_id}</span>
                    <Badge variant="brand" size="sm">
                      {wp.workflow_state}
                    </Badge>
                  </div>
                  <span className="text-textPrimary font-medium block truncate">{wp.title}</span>
                  <div className="flex justify-between text-[10px] text-textSecondary mt-1">
                    <span>Rep: {wp.reported_progress_percentage}%</span>
                    <span className="font-bold text-emerald-700">Ver: {wp.verified_progress_percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Work Packages */}
      {activeTab === 'work_packages' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-textPrimary uppercase tracking-wider">
              Work Packages ({project.work_packages.length})
            </h3>
            {canEdit && (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setAddWpOpen(true)}
              >
                Add Work Package
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {project.work_packages.map((wp) => (
              <div
                key={wp.id}
                className="bg-surface p-5 rounded-xl border border-borderLight shadow-card hover:border-brand/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-brand bg-brand-light px-2 py-0.5 rounded border border-brand-subtle">
                      {wp.work_id}
                    </span>
                    <Badge
                      variant={
                        wp.workflow_state === 'Accepted'
                          ? 'success'
                          : wp.workflow_state === 'Verification Failed'
                          ? 'error'
                          : 'brand'
                      }
                      size="sm"
                    >
                      {wp.workflow_state}
                    </Badge>
                    <span className="text-[11px] text-textSecondary font-medium">
                      Vendor: <strong>{wp.vendor_name || 'Unassigned'}</strong>
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-textPrimary">{wp.title}</h4>
                  <p className="text-xs text-textSecondary line-clamp-2">{wp.description}</p>

                  {wp.risk_explanation && (
                    <div className="p-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900 mt-1">
                      <strong>Risk Note ({wp.risk_score}/100):</strong> {wp.risk_explanation}
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 shrink-0">
                  <div className="text-right min-w-[120px]">
                    <span className="text-[10px] text-textSecondary block uppercase font-semibold">
                      Progress Audit
                    </span>
                    <span className="text-xs block text-blue-700">Reported: {wp.reported_progress_percentage}%</span>
                    <span className="text-xs block font-bold text-emerald-700">Verified: {wp.verified_progress_percentage}%</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Layers className="w-3.5 h-3.5" />}
                      onClick={() => setSelectedChainWpId(wp.id)}
                    >
                      Readiness Chain
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedWp(wp);
                        setTargetState('');
                        setTransitionReason('');
                        setTransitionError(null);
                        setTransitionOpen(true);
                      }}
                    >
                      Change Status
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Plus className="w-3.5 h-3.5" />}
                      onClick={() => {
                        setMsTargetWpId(wp.id);
                        setAddMsOpen(true);
                      }}
                    >
                      Milestone
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Milestones & Cyclic-Protected Dependency View */}
      {activeTab === 'milestones' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-textPrimary uppercase tracking-wider">
                Engineering Milestones & Dependency Relationships
              </h3>
              <p className="text-xs text-textSecondary">
                Milestones with cycle-validated predecessors preventing project deadlocks.
              </p>
            </div>
            {canEdit && (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  if (project.work_packages.length > 0) {
                    setMsTargetWpId(project.work_packages[0].id);
                    setAddMsOpen(true);
                  }
                }}
              >
                Add Milestone
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allMilestones.map((ms) => (
              <div
                key={ms.id}
                className="bg-surface p-4 rounded-xl border border-borderLight shadow-subtle space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-textPrimary">{ms.name}</span>
                    <Badge
                      variant={
                        ms.verification_status === 'Verified'
                          ? 'success'
                          : ms.verification_status === 'Rejected'
                          ? 'error'
                          : 'neutral'
                      }
                      size="sm"
                    >
                      {ms.verification_status}
                    </Badge>
                  </div>
                  {ms.description && <p className="text-xs text-textSecondary mt-1">{ms.description}</p>}

                  <div className="mt-2 pt-2 border-t border-borderLight text-xs text-textSecondary space-y-1">
                    <div className="flex justify-between">
                      <span>Target Due Date:</span>
                      <strong className="text-textPrimary">{ms.due_date}</strong>
                    </div>
                    {ms.acceptance_criteria && (
                      <div className="flex justify-between">
                        <span>Acceptance Check:</span>
                        <span className="text-textPrimary truncate max-w-[200px]">{ms.acceptance_criteria}</span>
                      </div>
                    )}
                  </div>

                  {/* Dependencies badges */}
                  <div className="mt-2 pt-2 border-t border-borderLight/60">
                    <span className="text-[10px] uppercase font-bold text-textSecondary block mb-1">
                      Predecessor Dependencies:
                    </span>
                    {ms.dependencies.length === 0 ? (
                      <span className="text-[11px] text-slate-400 italic">No predecessor prerequisites</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {ms.dependencies.map((dep) => (
                          <span
                            key={dep.id}
                            className="text-[10px] font-medium bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-700 flex items-center gap-1"
                          >
                            <GitBranch className="w-2.5 h-2.5 text-brand" />
                            {dep.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-borderLight flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<GitBranch className="w-3.5 h-3.5" />}
                    onClick={() => {
                      setSelectedMilestone(ms);
                      setDependencyTargetId('');
                      setDepError(null);
                      setAddDepOpen(true);
                    }}
                  >
                    Add Dependency
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Vendors */}
      {activeTab === 'vendors' && (
        <div className="bg-surface p-6 rounded-xl border border-borderLight shadow-card space-y-4">
          <h3 className="text-sm font-bold text-textPrimary uppercase tracking-wider">
            Assigned Contractors & Engineering Firms
          </h3>
          <div className="divide-y divide-borderLight">
            {project.work_packages
              .filter((w) => w.vendor_id)
              .map((w) => (
                <div key={w.id} className="py-3 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-textPrimary text-sm block">{w.vendor_name}</span>
                    <span className="text-textSecondary text-[11px]">Assigned to: {w.title}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/vendors')}>
                    View Vendor Profile
                  </Button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Tab 5: Inspections */}
      {activeTab === 'inspections' && (
        <div className="bg-surface p-6 rounded-xl border border-borderLight shadow-card space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-textPrimary uppercase tracking-wider">
              Linked Field Inspections
            </h3>
            <Button variant="outline" size="sm" onClick={() => navigate('/inspections')}>
              Open Inspections Cell
            </Button>
          </div>
          <p className="text-xs text-textSecondary">
            Independent checklist inspections conducted on site by QA engineers.
          </p>
        </div>
      )}

      {/* Tab 6: Defects */}
      {activeTab === 'defects' && (
        <div className="bg-surface p-6 rounded-xl border border-borderLight shadow-card space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-textPrimary uppercase tracking-wider">
              Defects & Corrective Action Items
            </h3>
            <Button variant="outline" size="sm" onClick={() => navigate('/defects')}>
              Open Defect Ledger
            </Button>
          </div>
          <p className="text-xs text-textSecondary">
            Non-conformance records and re-work items blocking acceptance transitions.
          </p>
        </div>
      )}

      {/* Tab 7: Assets */}
      {activeTab === 'assets' && (
        <div className="bg-surface p-6 rounded-xl border border-borderLight shadow-card space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-textPrimary uppercase tracking-wider">
              Registered Municipal Assets
            </h3>
            <Button variant="outline" size="sm" onClick={() => navigate('/assets')}>
              Open Asset Registry
            </Button>
          </div>
          <p className="text-xs text-textSecondary">
            Physical equipment units, automated kiosks, and high-mast arrays linked to this project.
          </p>
        </div>
      )}

      {/* Tab 8: Evidence Vault */}
      {activeTab === 'evidence' && (
        <div className="bg-surface p-6 rounded-xl border border-borderLight shadow-card space-y-3">
          <h3 className="text-sm font-bold text-textPrimary uppercase tracking-wider">
            Evidence Vault & Lab Certificates
          </h3>
          <p className="text-xs text-textSecondary">
            Photographs, pressure gauge readings, and geotechnical compaction reports.
          </p>
        </div>
      )}

      {/* Tab 9: Activity & Audit */}
      {activeTab === 'activity' && (
        <div className="bg-surface p-6 rounded-xl border border-borderLight shadow-card space-y-3">
          <h3 className="text-sm font-bold text-textPrimary uppercase tracking-wider">
            Immutable Project Audit History
          </h3>
          <p className="text-xs text-textSecondary">
            Traceable log of all milestone updates, status transitions, and administrative approvals.
          </p>
        </div>
      )}

      {/* Add Work Package Modal */}
      <Modal
        isOpen={addWpOpen}
        onClose={() => setAddWpOpen(false)}
        title="Create Work Package"
        description={`Add a sub-package under project ${project.project_identifier}.`}
      >
        <form onSubmit={handleCreateWorkPackage} className="space-y-4">
          {wpError && (
            <div className="p-3 bg-govError-light border border-govError-border rounded-lg text-xs text-govError">
              {wpError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-textPrimary mb-1">Work ID Code</label>
              <input
                type="text"
                required
                placeholder="e.g. WP-DW-009"
                value={wpIdCode}
                onChange={(e) => setWpIdCode(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-borderLight rounded-lg uppercase font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-textPrimary mb-1">Priority</label>
              <select
                value={wpPriority}
                onChange={(e) => setWpPriority(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-borderLight rounded-lg"
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-textPrimary mb-1">Category</label>
            <select
              value={wpCategory}
              onChange={(e) => setWpCategory(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-borderLight rounded-lg"
            >
              <option value="Drinking Water">Drinking Water</option>
              <option value="Sanitation">Sanitation</option>
              <option value="Public Lighting">Public Lighting</option>
              <option value="Public Safety">Public Safety</option>
              <option value="Pedestrian Access">Pedestrian Access</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-textPrimary mb-1">Work Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Pump Room Electrical Synchronizer"
              value={wpTitle}
              onChange={(e) => setWpTitle(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-borderLight rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-textPrimary mb-1">Description</label>
            <textarea
              rows={2}
              value={wpDesc}
              onChange={(e) => setWpDesc(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-borderLight rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-textPrimary mb-1">Assigned Vendor</label>
            <select
              value={wpVendorId}
              onChange={(e) => setWpVendorId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-borderLight rounded-lg"
            >
              <option value="">Unassigned</option>
              {vendorsList.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-textPrimary mb-1">Start Date</label>
              <input
                type="date"
                value={wpStartDate}
                onChange={(e) => setWpStartDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-borderLight rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-textPrimary mb-1">Completion Date</label>
              <input
                type="date"
                value={wpEndDate}
                onChange={(e) => setWpEndDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-borderLight rounded-lg"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-borderLight">
            <Button type="button" variant="secondary" size="sm" onClick={() => setAddWpOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={wpSubmitting}>
              Create Work Package
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Milestone Modal */}
      <Modal
        isOpen={addMsOpen}
        onClose={() => setAddMsOpen(false)}
        title="Add Milestone"
        description="Define an engineering milestone with measurable acceptance criteria."
      >
        <form onSubmit={handleCreateMilestone} className="space-y-4">
          {msError && (
            <div className="p-3 bg-govError-light border border-govError-border rounded-lg text-xs text-govError">
              {msError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-textPrimary mb-1">Milestone Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Pump Pressure Test Certification"
              value={msName}
              onChange={(e) => setMsName(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-borderLight rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-textPrimary mb-1">Due Date</label>
            <input
              type="date"
              required
              value={msDueDate}
              onChange={(e) => setMsDueDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-borderLight rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-textPrimary mb-1">Required Evidence Type</label>
            <select
              value={msEvidenceType}
              onChange={(e) => setMsEvidenceType(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-borderLight rounded-lg"
            >
              <option value="Photographic Inspection">Photographic Inspection</option>
              <option value="Hydrostatic Pressure Test">Hydrostatic Pressure Test</option>
              <option value="Lab Water Quality Certificate">Lab Water Quality Certificate</option>
              <option value="Electrical Luminescence Lux Audit">Electrical Luminescence Lux Audit</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-textPrimary mb-1">Acceptance Criteria</label>
            <textarea
              rows={2}
              placeholder="Explicit specification that field inspector must verify..."
              value={msCriteria}
              onChange={(e) => setMsCriteria(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-borderLight rounded-lg"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-borderLight">
            <Button type="button" variant="secondary" size="sm" onClick={() => setAddMsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={msSubmitting}>
              Save Milestone
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Milestone Dependency Modal (With Cycle Validation) */}
      <Modal
        isOpen={addDepOpen}
        onClose={() => setAddDepOpen(false)}
        title="Add Predecessor Dependency"
        description={`Select a prerequisite milestone that must finish before '${selectedMilestone?.name}'.`}
      >
        <form onSubmit={handleAddDependency} className="space-y-4">
          {depError && (
            <div className="p-3 bg-govError-light border border-govError-border rounded-lg text-xs text-govError">
              <strong className="block mb-0.5">Cycle Validation Error:</strong>
              {depError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-textPrimary mb-1">
              Select Predecessor Milestone
            </label>
            <select
              required
              value={dependencyTargetId}
              onChange={(e) => setDependencyTargetId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-borderLight rounded-lg text-textPrimary"
            >
              <option value="">Choose milestone...</option>
              {allMilestones
                .filter((m) => m.id !== selectedMilestone?.id)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} (Due: {m.due_date})
                  </option>
                ))}
            </select>
            <p className="text-[11px] text-textSecondary mt-1">
              The platform evaluates the directed dependency graph and blocks any cyclic loops.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-borderLight">
            <Button type="button" variant="secondary" size="sm" onClick={() => setAddDepOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={depSubmitting}>
              Establish Dependency
            </Button>
          </div>
        </form>
      </Modal>

      {/* Controlled Workflow Status Transition Modal */}
      <Modal
        isOpen={transitionOpen}
        onClose={() => setTransitionOpen(false)}
        title={`Transition Workflow: ${selectedWp?.work_id}`}
        description={`Current state: ${selectedWp?.workflow_state}. Changes require satisfying policy rules.`}
      >
        <form onSubmit={handleStatusTransition} className="space-y-4">
          {transitionError && (
            <div className="p-3 bg-govError-light border border-govError-border rounded-lg text-xs text-govError">
              <strong className="block mb-0.5">Transition Blocked:</strong>
              {transitionError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-textPrimary mb-1">Target State</label>
            <select
              required
              value={targetState}
              onChange={(e) => setTargetState(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-borderLight rounded-lg text-textPrimary"
            >
              <option value="">Select Target State...</option>
              <option value="Planned">Planned</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Progress Reported">Progress Reported</option>
              <option value="Inspection Pending">Inspection Pending</option>
              <option value="Verification Passed">Verification Passed</option>
              <option value="Verification Failed">Verification Failed</option>
              <option value="Rework Required">Rework Required</option>
              <option value="Awaiting Authorised Acceptance">Awaiting Authorised Acceptance</option>
              <option value="Accepted">Accepted (Authorised Reviewer Only)</option>
              <option value="Operationally Ready">Operationally Ready</option>
              <option value="On Hold">On Hold</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-textPrimary mb-1">Decision / Reason</label>
            <textarea
              rows={2}
              required
              placeholder="State rationale for transition..."
              value={transitionReason}
              onChange={(e) => setTransitionReason(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-borderLight rounded-lg text-textPrimary"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-borderLight">
            <Button type="button" variant="secondary" size="sm" onClick={() => setTransitionOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={transitionSubmitting}>
              Apply Transition
            </Button>
          </div>
        </form>
      </Modal>

      {/* 12-Stage Verified Readiness Chain Modal (Section 13) */}
      <ReadinessChainModal
        isOpen={Boolean(selectedChainWpId)}
        onClose={() => setSelectedChainWpId(null)}
        workPackageId={selectedChainWpId}
      />
    </div>
  );
};
