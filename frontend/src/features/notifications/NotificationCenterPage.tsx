import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Filter,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Radio
} from 'lucide-react';
import { api } from '../../services/api';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type {
  NotificationItem,
  ExternalChannelsStatusResponse
} from '../../types/notification';

export const NotificationCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [channelsStatus, setChannelsStatus] = useState<ExternalChannelsStatusResponse | null>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'critical' | 'warning'>('all');
  const [selectedTrigger, setSelectedTrigger] = useState<string>('All');

  useEffect(() => {
    loadData();
    loadChannelsStatus();
  }, [activeTab, selectedTrigger]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.getNotifications({
        unread_only: activeTab === 'unread' ? true : undefined,
        severity: activeTab === 'critical' || activeTab === 'warning' ? activeTab : undefined,
        trigger_type: selectedTrigger !== 'All' ? selectedTrigger : undefined,
      });
      setNotifications(res.notifications);
      setUnreadCount(res.unread_count);
      setTotalCount(res.total_count);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadChannelsStatus = async () => {
    try {
      const status = await api.getExternalChannelsStatus();
      setChannelsStatus(status);
    } catch (err) {
      console.error('Failed to load channels status:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleMarkSingleRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.markNotificationRead(id);
      setUnreadCount((c) => Math.max(0, c - 1));
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleCardClick = async (notif: NotificationItem) => {
    if (!notif.is_read) {
      try {
        await api.markNotificationRead(notif.id);
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // Continue
      }
    }
    if (notif.action_url) {
      navigate(notif.action_url);
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffSec < 60) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      if (diffSec < 172800) return 'Yesterday';
      return date.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    } catch {
      return isoString;
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'critical':
        return <Badge variant="error" size="sm">CRITICAL</Badge>;
      case 'warning':
        return <Badge variant="warning" size="sm">WARNING</Badge>;
      case 'success':
        return <Badge variant="success" size="sm">RESOLVED</Badge>;
      default:
        return <Badge variant="info" size="sm">INFO</Badge>;
    }
  };

  const getSeverityIcon = (sev: string) => {
    switch (sev) {
      case 'critical':
        return <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />;
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-blue-500 shrink-0" />;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Section 18 Statutory Transparency Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Radio className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">
                  Pushkaralu 2027 Instant In-App Event Dispatcher
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  IN-APP ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-3xl">
                {channelsStatus?.notice ||
                  'Per Section 18 statutory requirements, notifications are derived from verified application events (work assignments, field inspection outcomes, defect remediations, and critical path milestones). External SMS/Email adapters are transparently unconfigured in this demonstration pilot.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono bg-white/5 border border-white/10 px-3 py-2 rounded-lg text-slate-300">
            <span>SMS/Email:</span>
            <span className="text-amber-400 font-semibold">PILOT SIMULATION</span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 text-blue-800 rounded-lg">
              <Bell className="w-6 h-6 text-[#174EA6]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Notification Center
              </h1>
              <p className="text-sm text-slate-600">
                Live stream of field verification events, defect escalations, and statutory alerts.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={loadData}
            disabled={loading}
            icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>

          {unreadCount > 0 && (
            <Button
              variant="primary"
              onClick={handleMarkAllRead}
              icon={<CheckCheck className="w-4 h-4" />}
              className="bg-[#174EA6] hover:bg-[#123e85] text-white"
            >
              Mark All as Read ({unreadCount})
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs & Category Selector */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'all'
                ? 'bg-[#174EA6] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Events ({totalCount})
          </button>

          <button
            onClick={() => setActiveTab('unread')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'unread'
                ? 'bg-[#174EA6] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span className="bg-rose-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('critical')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'critical'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Critical Alerts
          </button>

          <button
            onClick={() => setActiveTab('warning')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'warning'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Warnings
          </button>
        </div>

        {/* Trigger type filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedTrigger}
            onChange={(e) => setSelectedTrigger(e.target.value)}
            className="text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Trigger Types</option>
            <option value="inspection_assignment">Inspection Assignment</option>
            <option value="inspection_failure">Inspection Failure</option>
            <option value="new_defect">New Defect</option>
            <option value="correction_submitted">Correction Submitted</option>
            <option value="reinspection_required">Re-inspection Required</option>
            <option value="progress_submission">Progress Submission</option>
            <option value="overdue_milestone">Overdue Milestone</option>
            <option value="blocking_risk">Blocking Readiness Risk</option>
            <option value="asset_acceptance">Asset Acceptance</option>
            <option value="approval_request">Approval Request</option>
          </select>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3 shadow-sm">
            <RefreshCw className="w-8 h-8 text-[#174EA6] animate-spin mx-auto" />
            <p className="text-sm font-medium text-slate-600">Loading statutory alerts...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3 shadow-sm">
            <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No Notifications</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              There are currently no active notifications matching your filter criteria.
            </p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleCardClick(notif)}
              className={`bg-white border rounded-xl p-4 shadow-sm transition-all hover:shadow-md cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                !notif.is_read
                  ? 'border-blue-300 bg-blue-50/20 ring-1 ring-blue-100'
                  : 'border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3.5 flex-1 min-w-0">
                {getSeverityIcon(notif.severity)}
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">
                      {notif.title}
                    </span>
                    {getSeverityBadge(notif.severity)}
                    {!notif.is_read && (
                      <span className="inline-block w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                    )}
                    <span className="text-[11px] font-mono text-slate-400">
                      {formatRelativeTime(notif.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {notif.message}
                  </p>
                  {notif.trigger_type && (
                    <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                      TRIGGER: {notif.trigger_type.replace(/_/g, ' ')}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {!notif.is_read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleMarkSingleRead(notif.id, e)}
                    className="text-xs text-slate-600 hover:text-slate-900"
                  >
                    Mark read
                  </Button>
                )}
                {notif.action_url && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-[#174EA6] hover:bg-[#123e85] text-white text-xs gap-1"
                  >
                    <span>View Record</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
