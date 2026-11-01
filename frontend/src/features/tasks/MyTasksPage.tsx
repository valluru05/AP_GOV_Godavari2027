import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Clock,
  ClipboardCheck,
  Wrench,
  FileText,
  Calendar,
  Search,
  RefreshCw,
  ArrowRight,
  Flame,
  CheckCircle2,
  X
} from 'lucide-react';
import { api } from '../../services/api';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import type {
  MyTaskItem,
  MyTasksResponse
} from '../../types/notification';

export const MyTasksPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [taskData, setTaskData] = useState<MyTasksResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedTaskType, setSelectedTaskType] = useState<string>('All');
  const [selectedPriority, setSelectedPriority] = useState<string>('All');
  const [selectedDueStatus, setSelectedDueStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    loadTasks();
  }, [selectedTaskType, selectedPriority, selectedDueStatus]);

  const loadTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getMyTasks({
        task_type: selectedTaskType !== 'All' ? selectedTaskType : undefined,
        priority: selectedPriority !== 'All' ? selectedPriority : undefined,
        due_status: selectedDueStatus !== 'All' ? selectedDueStatus : undefined,
        search: searchQuery.trim() || undefined,
      });
      setTaskData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load task queue');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadTasks();
  };

  const resetFilters = () => {
    setSelectedTaskType('All');
    setSelectedPriority('All');
    setSelectedDueStatus('All');
    setSearchQuery('');
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'inspection':
        return <ClipboardCheck className="w-5 h-5 text-blue-600" />;
      case 'defect_rework':
        return <Wrench className="w-5 h-5 text-amber-600" />;
      case 'submission_review':
        return <FileText className="w-5 h-5 text-indigo-600" />;
      case 'milestone_approval':
        return <Clock className="w-5 h-5 text-rose-600" />;
      case 'asset_acceptance':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-slate-600" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <Badge variant="error" size="sm">CRITICAL</Badge>;
      case 'high':
        return <Badge variant="warning" size="sm">HIGH</Badge>;
      case 'medium':
        return <Badge variant="info" size="sm">MEDIUM</Badge>;
      default:
        return <Badge variant="neutral" size="sm">LOW</Badge>;
    }
  };

  const getDueDateBadge = (task: MyTaskItem) => {
    if (task.is_overdue) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
          <Clock className="w-3 h-3 text-rose-600" />
          <span>Overdue by {task.days_remaining_or_overdue}d</span>
        </span>
      );
    }
    if (task.days_remaining_or_overdue === 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
          <Clock className="w-3 h-3 text-amber-600" />
          <span>Due Today</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
        <Calendar className="w-3 h-3 text-slate-400" />
        <span>Due in {task.days_remaining_or_overdue}d</span>
      </span>
    );
  };

  const summary = taskData?.summary;

  return (
    <div className="space-y-6 pb-12">
      {/* Error Alert */}
      {error && (
        <div className="bg-rose-50 border border-rose-300 text-rose-800 text-sm px-4 py-3 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-700 hover:text-rose-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Executive Welcome & Context Header */}
      <div className="bg-gradient-to-r from-slate-900 to-[#174EA6] text-white rounded-xl p-5 shadow-md">

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/30 text-blue-200 uppercase tracking-wider">
                Section 18 Action Queue
              </span>
              <span className="text-xs text-blue-200 font-medium">
                Official: {user?.full_name || 'Officer'}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              My Tasks & Personal Action Queue
            </h1>
            <p className="text-xs text-blue-100 max-w-2xl mt-1">
              Consolidated real-time assignments: inspections to execute, defect corrective actions to verify, contractor progress submissions awaiting review, and critical path milestones.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={loadTasks}
              disabled={loading}
              icon={<RefreshCw className={`w-4 h-4 text-white ${loading ? 'animate-spin' : ''}`} />}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs"
            >
              Sync Tasks
            </Button>
          </div>
        </div>

        {/* Dynamic Summary KPI Cards */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/20">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/10">
              <div className="text-[11px] uppercase tracking-wider text-blue-200 font-medium">
                Total Action Items
              </div>
              <div className="text-2xl font-bold font-mono text-white mt-1">
                {summary.total_tasks}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/10">
              <div className="text-[11px] uppercase tracking-wider text-rose-300 font-medium flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                Critical Priority
              </div>
              <div className="text-2xl font-bold font-mono text-rose-200 mt-1">
                {summary.critical_tasks}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/10">
              <div className="text-[11px] uppercase tracking-wider text-amber-300 font-medium">
                Overdue Slipped
              </div>
              <div className="text-2xl font-bold font-mono text-amber-200 mt-1">
                {summary.overdue_tasks}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/10">
              <div className="text-[11px] uppercase tracking-wider text-emerald-300 font-medium">
                Due Today
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-200 mt-1">
                {summary.due_today_tasks}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter Control Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search box */}
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tasks by code, title, or Ghat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
            />
          </form>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedTaskType}
              onChange={(e) => setSelectedTaskType(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Task Types</option>
              <option value="inspection">Field Inspections ({summary?.inspections_count ?? 0})</option>
              <option value="defect_rework">Defect Remediation ({summary?.defects_count ?? 0})</option>
              <option value="submission_review">Progress Reviews ({summary?.reviews_count ?? 0})</option>
              <option value="milestone_approval">Milestones & Critical Path</option>
              <option value="asset_acceptance">Asset Commissioning</option>
            </select>

            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={selectedDueStatus}
              onChange={(e) => setSelectedDueStatus(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Timelines</option>
              <option value="overdue">Overdue Items</option>
              <option value="due_today">Due Today</option>
              <option value="upcoming">Upcoming</option>
            </select>

            {(selectedTaskType !== 'All' || selectedPriority !== 'All' || selectedDueStatus !== 'All' || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-xs text-rose-600 hover:bg-rose-50"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Task Queue List */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-xl p-16 text-center space-y-3 shadow-sm">
            <RefreshCw className="w-8 h-8 text-[#174EA6] animate-spin mx-auto" />
            <p className="text-sm font-medium text-slate-600">Retrieving personalized action queue...</p>
          </div>
        ) : !taskData || taskData.tasks.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-16 text-center space-y-3 shadow-sm">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">Your Action Queue is Clear!</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No outstanding inspections, rework actions, or reviews are currently assigned to your profile.
            </p>
            <Button variant="outline" size="sm" onClick={resetFilters} className="mt-2">
              Reset Filters
            </Button>
          </div>
        ) : (
          taskData.tasks.map((task) => (
            <div
              key={task.task_id}
              className={`bg-white border rounded-xl p-4 shadow-sm transition-all hover:shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-l-4 ${
                task.priority === 'critical'
                  ? 'border-l-rose-500 border-slate-200'
                  : task.priority === 'high'
                  ? 'border-l-amber-500 border-slate-200'
                  : 'border-l-blue-500 border-slate-200'
              }`}
            >
              <div className="flex items-start gap-3.5 flex-1 min-w-0">
                <div className="p-2 rounded-lg bg-slate-100 shrink-0 mt-0.5">
                  {getTaskIcon(task.task_type)}
                </div>
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">
                      {task.title}
                    </span>
                    {getPriorityBadge(task.priority)}
                    {getDueDateBadge(task)}
                    {task.zone_name && (
                      <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {task.zone_name}
                      </span>
                    )}
                    {task.work_package_code && (
                      <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-semibold">
                        {task.work_package_code}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">
                    {task.description}
                  </p>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2">
                    <span className="capitalize">Workflow: {task.task_type.replace('_', ' ')}</span>
                    <span>•</span>
                    <span className="font-medium text-slate-600">Current Status: {task.status}</span>
                  </div>
                </div>
              </div>

              {/* Direct Next Action Button */}
              <div className="shrink-0 self-end sm:self-center">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate(task.action_url)}
                  className="bg-[#174EA6] hover:bg-[#123e85] text-white text-xs gap-1.5 shadow-sm"
                >
                  <span>{task.action_label}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
