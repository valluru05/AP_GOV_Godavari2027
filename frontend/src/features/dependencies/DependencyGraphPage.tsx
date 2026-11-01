import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  AlertTriangle,
  Play,
  RotateCcw,
  Info,
  Calendar,
  ArrowRight,
  Plus,
  Sliders,
  Filter
} from 'lucide-react';
import { api } from '../../services/api';
import { Badge, type BadgeVariant } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import type {
  DependencyGraphResponse,
  DependencyGraphNode,
  MilestoneNodeStatus,
  DelayImpactSimulationResponse
} from '../../types/dependency';

export const DependencyGraphPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [graph, setGraph] = useState<DependencyGraphResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters & Views
  const [selectedProjectId, setSelectedProjectId] = useState<string>('All');
  const [highlightCriticalPath, setHighlightCriticalPath] = useState<boolean>(false);
  const [selectedNode, setSelectedNode] = useState<DependencyGraphNode | null>(null);

  // Simulator State
  const [simTargetMilestoneId, setSimTargetMilestoneId] = useState<string>('');
  const [simDelayDays, setSimDelayDays] = useState<number>(14);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [simResult, setSimResult] = useState<DelayImpactSimulationResponse | null>(null);
  const [simError, setSimError] = useState<string | null>(null);

  // Add Dependency Modal
  const [isAddDepOpen, setIsAddDepOpen] = useState<boolean>(false);
  const [depTargetId, setDepTargetId] = useState<string>('');
  const [depSourceId, setDepSourceId] = useState<string>('');
  const [addingDep, setAddingDep] = useState<boolean>(false);
  const [addDepError, setAddDepError] = useState<string | null>(null);

  useEffect(() => {
    loadGraph();
  }, [selectedProjectId]);

  const loadGraph = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDependencyGraph(selectedProjectId !== 'All' ? selectedProjectId : undefined);
      setGraph(data);
      if (data.nodes.length > 0 && !simTargetMilestoneId) {
        setSimTargetMilestoneId(data.nodes[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dependency graph');
    } finally {
      setLoading(false);
    }
  };

  const handleRunSimulation = async () => {
    if (!simTargetMilestoneId) return;
    setSimulating(true);
    setSimError(null);
    try {
      const res = await api.simulateDelayImpact({
        milestone_id: simTargetMilestoneId,
        delay_days: simDelayDays,
      });
      setSimResult(res);
    } catch (err: any) {
      setSimError(err.message || 'Simulation failed');
    } finally {
      setSimulating(false);
    }
  };

  const handleAddDependency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depTargetId || !depSourceId) return;
    setAddingDep(true);
    setAddDepError(null);
    try {
      await api.addMilestoneDependency({
        milestone_id: depTargetId,
        depends_on_id: depSourceId,
      });
      setIsAddDepOpen(false);
      setDepTargetId('');
      setDepSourceId('');
      loadGraph();
    } catch (err: any) {
      setAddDepError(err.message || 'Failed to add dependency');
    } finally {
      setAddingDep(false);
    }
  };

  const getNodeBadgeVariant = (status: MilestoneNodeStatus): BadgeVariant => {
    switch (status) {
      case 'Completed':
        return 'success';
      case 'Blocked':
      case 'Overdue':
        return 'error';
      case 'In Progress':
        return 'brand';
      case 'Pending':
      default:
        return 'neutral';
    }
  };

  // Group nodes into 4 sequential stages for clear layout
  const categorizeNodeStage = (node: DependencyGraphNode) => {
    if (node.predecessor_ids.length === 0) return 1; // Stage 1: Inception & Foundations
    if (node.successor_ids.length === 0) return 3;   // Stage 3: Commissioning & Acceptance
    return 2;                                       // Stage 2: Assembly & Installation
  };

  const stage1Nodes = (graph?.nodes || []).filter((n) => categorizeNodeStage(n) === 1);
  const stage2Nodes = (graph?.nodes || []).filter((n) => categorizeNodeStage(n) === 2);
  const stage3Nodes = (graph?.nodes || []).filter((n) => categorizeNodeStage(n) === 3);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white border border-borderLight rounded-xl p-6 shadow-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <GitBranch className="w-3.5 h-3.5 text-indigo-600" />
                Module 9 Core Engine
              </span>
              <span className="text-xs text-textSecondary font-medium">Critical Path Method (CPM) & DAG Cycle Protection</span>
            </div>
            <h1 className="text-2xl font-bold text-textPrimary tracking-tight">
              Readiness Dependency Graph & Risk Engine
            </h1>
            <p className="text-sm text-textSecondary mt-1 max-w-3xl">
              Directed Acyclic Graph (DAG) modeling contractual milestone predecessors, critical path duration, and predictive delay ripple-effects for Pushkaralu 2027.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="secondary"
              onClick={() => setIsAddDepOpen(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              Add Dependency
            </Button>
            <Button
              variant="secondary"
              onClick={loadGraph}
              isLoading={loading}
              icon={<RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
            >
              Refresh Graph
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Timeline Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Festival Countdown */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-xl p-5 shadow-card space-y-1.5">
          <span className="text-xs text-indigo-300 font-semibold uppercase tracking-wider block">Pushkaralu Target</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-amber-300">{graph?.days_to_pushkaralu ?? '--'}</span>
            <span className="text-xs text-indigo-200">Days to Festival</span>
          </div>
          <span className="text-[11px] text-indigo-300 block">Target: 14 July 2027</span>
        </div>

        {/* KPI 2: Critical Path Duration */}
        <div className="bg-white border border-borderLight rounded-xl p-5 shadow-card space-y-1.5">
          <span className="text-xs text-textSecondary font-semibold uppercase tracking-wider block">Critical Path Duration</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-slate-900">{graph?.critical_path_duration_days ?? '--'}</span>
            <span className="text-xs text-slate-500">Days minimum</span>
          </div>
          <span className="text-[11px] text-textSecondary block">{graph?.critical_path_milestone_ids.length ?? 0} milestones on critical path</span>
        </div>

        {/* KPI 3: Festival Safety Buffer */}
        <div className="bg-white border border-borderLight rounded-xl p-5 shadow-card space-y-1.5">
          <span className="text-xs text-textSecondary font-semibold uppercase tracking-wider block">Festival Float Buffer</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-emerald-600">{graph?.festival_buffer_days ?? '--'}</span>
            <span className="text-xs text-slate-500">Days slack</span>
          </div>
          <span className="text-[11px] text-emerald-700 font-medium block">Positive safety margin</span>
        </div>

        {/* KPI 4: Blocked Dependencies */}
        <div className="bg-white border border-borderLight rounded-xl p-5 shadow-card space-y-1.5">
          <span className="text-xs text-textSecondary font-semibold uppercase tracking-wider block">Blocked Milestones</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-red-600">{graph?.blocked_milestones ?? 0}</span>
            <span className="text-xs text-red-600 font-medium">unverified pred</span>
          </div>
          <span className="text-[11px] text-red-700 block">Downstream work halted</span>
        </div>

        {/* KPI 5: Total Network Edges */}
        <div className="bg-white border border-borderLight rounded-xl p-5 shadow-card space-y-1.5">
          <span className="text-xs text-textSecondary font-semibold uppercase tracking-wider block">Network Topology</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-indigo-700">{graph?.edges.length ?? 0}</span>
            <span className="text-xs text-slate-500">Directed edges</span>
          </div>
          <span className="text-[11px] text-textSecondary block">Across {graph?.total_milestones ?? 0} milestones</span>
        </div>
      </div>

      {/* Main Content Layout: Graph Canvas (Left 7 cols) + Simulator (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* DAG Visualizer (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-borderLight rounded-xl shadow-card p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-borderLight pb-4">
            <div>
              <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-indigo-600" />
                Milestone Dependency Directed Graph (DAG)
              </h3>
              <p className="text-xs text-textSecondary mt-0.5">
                Topological execution sequence. Red borders indicate blocked prerequisite dependencies.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="text-xs bg-transparent border-none text-slate-700 font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="All">All Projects</option>
                  <option value="proj-01">Kotilingala Water Supply</option>
                  <option value="proj-02">Pushkar Ghat Riverfront</option>
                  <option value="proj-03">VIP Ghat Sanitation</option>
                </select>
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={highlightCriticalPath}
                  onChange={(e) => setHighlightCriticalPath(e.target.checked)}
                  className="rounded border-slate-300 text-brand focus:ring-brand"
                />
                <span>Highlight Critical Path</span>
              </label>
            </div>
          </div>

          {selectedNode && (
            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg flex items-center justify-between text-xs text-indigo-950">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-indigo-700">{selectedNode.id}</span>
                <span className="font-semibold">{selectedNode.name}</span>
                <span className="text-[11px] text-indigo-600">({selectedNode.work_package_title})</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-medium text-slate-600">Float: <strong>{selectedNode.slack_days}d</strong></span>
                <span className="text-[11px] font-medium text-slate-600">Due: <strong>{selectedNode.due_date}</strong></span>
                <button
                  type="button"
                  onClick={() => setSelectedNode(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold ml-1 text-sm"
                >
                  &times;
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 3-Stage Topological Canvas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Stage 1: Inception & Civil Foundation */}
            <div className="space-y-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Stage 1: Civil Foundation</span>
                <span className="text-[10px] font-bold text-slate-400">({stage1Nodes.length})</span>
              </div>
              <div className="space-y-3">
                {stage1Nodes.map((node) => renderNodeCard(node))}
              </div>
            </div>

            {/* Stage 2: Mechanical, Electrical & Piping */}
            <div className="space-y-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Stage 2: Assembly & Installation</span>
                <span className="text-[10px] font-bold text-slate-400">({stage2Nodes.length})</span>
              </div>
              <div className="space-y-3">
                {stage2Nodes.map((node) => renderNodeCard(node))}
              </div>
            </div>

            {/* Stage 3: Testing, Quality Audit & Sign-off */}
            <div className="space-y-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Stage 3: Testing & Acceptance</span>
                <span className="text-[10px] font-bold text-slate-400">({stage3Nodes.length})</span>
              </div>
              <div className="space-y-3">
                {stage3Nodes.map((node) => renderNodeCard(node))}
              </div>
            </div>
          </div>

          {/* Graph Legend */}
          <div className="pt-3 border-t border-borderLight flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Completed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> In Progress
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" /> Blocked / Overdue
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" /> Pending
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-700 font-semibold">
              <span className="w-4 h-1 bg-amber-500 rounded" /> Critical Path Sequence (0 Slack)
            </div>
          </div>
        </div>

        {/* Predictive Delay Impact Simulator (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-borderLight rounded-xl shadow-card p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-borderLight pb-3">
              <Sliders className="w-4 h-4 text-brand" />
              <div>
                <h3 className="text-sm font-bold text-textPrimary">What-If Delay Simulator</h3>
                <p className="text-[11px] text-textSecondary">Simulate ripple effects on downstream milestones.</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Target Milestone to Delay</label>
                <select
                  value={simTargetMilestoneId}
                  onChange={(e) => setSimTargetMilestoneId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand bg-white"
                >
                  {(graph?.nodes || []).map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.id}: {n.name} ({n.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-slate-700">Simulated Delay:</span>
                  <span className="font-mono font-bold text-brand bg-brand-light px-2 py-0.5 rounded border border-brand-subtle">
                    +{simDelayDays} Days
                  </span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="60"
                  step="1"
                  value={simDelayDays}
                  onChange={(e) => setSimDelayDays(Number(e.target.value))}
                  className="w-full accent-brand cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>3 Days</span>
                  <span>14 Days</span>
                  <span>30 Days</span>
                  <span>60 Days</span>
                </div>
              </div>

              <Button
                variant="primary"
                size="sm"
                className="w-full"
                onClick={handleRunSimulation}
                isLoading={simulating}
                icon={<Play className="w-3.5 h-3.5" />}
              >
                Run Ripple-Effect Simulation
              </Button>
            </div>

            {simError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{simError}</span>
              </div>
            )}

            {simResult && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 pt-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-800">Simulation Output</span>
                  <Badge variant={simResult.pushkaralu_deadline_breached ? 'error' : 'success'} size="sm">
                    {simResult.pushkaralu_deadline_breached ? 'Festival Breach Risk' : 'Buffer Intact'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Impacted Nodes</span>
                    <span className="text-base font-black text-slate-900">{simResult.impacted_milestones.length} Milestones</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Remaining Slack</span>
                    <span className={`text-base font-black ${simResult.remaining_festival_buffer_days < 30 ? 'text-red-600' : 'text-emerald-700'}`}>
                      {simResult.remaining_festival_buffer_days} Days
                    </span>
                  </div>
                </div>

                {/* Impacted Milestones List */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider">Cascading Delayed Milestones:</span>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {simResult.impacted_milestones.map((imp) => (
                      <div key={imp.id} className="p-2 rounded bg-white border border-slate-200 text-xs flex items-center justify-between">
                        <div className="truncate max-w-[170px]">
                          <span className="font-semibold text-slate-800 block truncate">{imp.name}</span>
                          <span className="text-[10px] text-slate-400">Due: {imp.projected_due_date}</span>
                        </div>
                        <span className="text-[10px] font-bold font-mono text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                          +{imp.delay_days}d
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                <div className="space-y-1 pt-1 border-t border-slate-200">
                  <span className="text-[11px] font-bold text-indigo-900 block uppercase tracking-wider">Mitigation Action Plan:</span>
                  <ul className="text-[11px] text-indigo-950 space-y-1 pl-1">
                    {simResult.recommendations.map((rec, rIdx) => (
                      <li key={rIdx} className="flex items-start gap-1.5">
                        <ArrowRight className="w-3 h-3 text-indigo-600 shrink-0 mt-0.5" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Dependency Modal */}
      <Modal
        isOpen={isAddDepOpen}
        onClose={() => setIsAddDepOpen(false)}
        title="Add Milestone Dependency Edge"
        description="Establish prerequisite dependency between two milestones with automated cycle deadlock protection."
        maxWidth="md"
      >
        <form onSubmit={handleAddDependency}>
          <div className="p-6 space-y-4 text-xs">
            {addDepError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{addDepError}</span>
              </div>
            )}

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Dependent Milestone (Target) <span className="text-red-500">*</span>
              </label>
              <select
                value={depTargetId}
                onChange={(e) => setDepTargetId(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand bg-white"
              >
                <option value="">Select dependent milestone...</option>
                {(graph?.nodes || []).map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.id}: {n.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Prerequisite Milestone (Depends On) <span className="text-red-500">*</span>
              </label>
              <select
                value={depSourceId}
                onChange={(e) => setDepSourceId(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand bg-white"
              >
                <option value="">Select predecessor milestone...</option>
                {(graph?.nodes || []).map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.id}: {n.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-[11px] flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                <strong>Cycle Protection:</strong> The engine automatically checks ancestor reachability and rejects circular dependencies before writing to the database.
              </span>
            </div>
          </div>

          <div className="px-6 py-4 bg-slate-50 border-t border-borderLight flex items-center justify-between">
            <Button variant="secondary" onClick={() => setIsAddDepOpen(false)} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={addingDep}>
              Create Dependency Edge
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );

  function renderNodeCard(node: DependencyGraphNode) {
    const isCritical = node.is_on_critical_path;
    const isDimmed = highlightCriticalPath && !isCritical;
    const isBlocked = node.status === 'Blocked' || node.status === 'Overdue';

    return (
      <div
        key={node.id}
        onClick={() => {
          setSelectedNode(node);
          setSimTargetMilestoneId(node.id);
        }}
        className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
          isDimmed
            ? 'opacity-30 bg-white border-slate-200'
            : isBlocked
            ? 'bg-red-50/50 border-red-300 shadow-sm hover:border-red-400'
            : isCritical
            ? 'bg-amber-50/40 border-amber-300 shadow-sm hover:border-amber-400'
            : 'bg-white border-slate-200 shadow-sm hover:border-brand/40'
        }`}
      >
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="font-mono text-[10px] font-bold text-slate-500 uppercase">{node.id}</span>
          <div className="flex items-center gap-1">
            {isCritical && (
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                Critical Path
              </span>
            )}
            <Badge variant={getNodeBadgeVariant(node.status)} size="sm">
              {node.status}
            </Badge>
          </div>
        </div>

        <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">{node.name}</h4>
        <span className="text-[10px] text-slate-500 block truncate mt-0.5">{node.work_package_title}</span>

        <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>Due: {node.due_date}</span>
          </span>
          <span className="font-mono font-medium">Float: {node.slack_days}d</span>
        </div>

        {node.predecessor_ids.length > 0 && (
          <div className="mt-1.5 pt-1.5 border-t border-slate-100 text-[10px] text-slate-500 flex items-center gap-1 truncate">
            <span className="font-bold text-slate-400 uppercase text-[9px]">Pred:</span>
            <span className="truncate">{node.predecessor_ids.join(', ')}</span>
          </div>
        )}
      </div>
    );
  }
};
