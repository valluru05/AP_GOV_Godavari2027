import React, { useState, useEffect } from 'react';
import { History, Shield, Search, RefreshCw, Terminal } from 'lucide-react';
import { api } from '../../services/api';
import type { AuditEvent } from '../../types/auth';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';

export const AuditExplorerPage: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [actorEmail, setActorEmail] = useState('');

  // Detail Modal
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

  const loadEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAuditEvents({
        action: actionFilter || undefined,
        entity_type: entityTypeFilter || undefined,
        actor_email: actorEmail || undefined,
        limit: 100,
      });
      setEvents(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch audit log');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [actionFilter, entityTypeFilter, actorEmail]);

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('FAILED') || action.includes('BLOCKED')) return 'error';
    if (action.includes('SUCCESS') || action.includes('CREATED') || action.includes('ACTIVATED')) return 'success';
    if (action.includes('UPDATED') || action.includes('DEACTIVATED')) return 'warning';
    return 'brand';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface p-6 rounded-xl border border-borderLight shadow-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
              <History className="w-5 h-5 text-brand" />
            </div>
            <h1 className="text-xl font-bold text-textPrimary tracking-tight">
              Immutable System Audit Explorer
            </h1>
          </div>
          <p className="text-xs text-textSecondary mt-1">
            Tamper-evident append-only ledger tracking all authentication, user modifications, and operational events.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="neutral" size="sm" icon={<Shield className="w-3.5 h-3.5 text-brand" />}>
            Append-Only Database Storage
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
            onClick={() => loadEvents()}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-surface p-4 rounded-xl border border-borderLight shadow-subtle flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-textSecondary absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Filter by actor email..."
            value={actorEmail}
            onChange={(e) => setActorEmail(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-borderLight rounded-lg text-textPrimary focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-2.5 py-1.5 text-xs bg-slate-50 border border-borderLight rounded-lg text-textPrimary focus:outline-none focus:ring-1 focus:ring-brand"
        >
          <option value="">All Action Types</option>
          <option value="AUTH_LOGIN_SUCCESS">AUTH_LOGIN_SUCCESS</option>
          <option value="AUTH_LOGIN_FAILED">AUTH_LOGIN_FAILED</option>
          <option value="AUTH_LOGOUT">AUTH_LOGOUT</option>
          <option value="USER_CREATED">USER_CREATED</option>
          <option value="USER_UPDATED">USER_UPDATED</option>
          <option value="USER_ACTIVATED">USER_ACTIVATED</option>
          <option value="USER_DEACTIVATED">USER_DEACTIVATED</option>
          <option value="SYSTEM_INITIALIZED">SYSTEM_INITIALIZED</option>
        </select>

        <select
          value={entityTypeFilter}
          onChange={(e) => setEntityTypeFilter(e.target.value)}
          className="px-2.5 py-1.5 text-xs bg-slate-50 border border-borderLight rounded-lg text-textPrimary focus:outline-none focus:ring-1 focus:ring-brand"
        >
          <option value="">All Entity Types</option>
          <option value="auth_session">auth_session</option>
          <option value="user">user</option>
          <option value="system">system</option>
        </select>
      </div>

      {error && (
        <div className="p-4 bg-govError-light border border-govError-border rounded-xl text-xs text-govError">
          {error}
        </div>
      )}

      {/* Audit Log Table */}
      <div className="bg-surface rounded-xl border border-borderLight shadow-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-textSecondary text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand" />
            Loading audit records...
          </div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center text-textSecondary text-xs">
            <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-textPrimary">No audit records found</p>
            <p className="mt-1">Events will appear as actions are performed in the application.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-borderLight text-textSecondary font-semibold">
                  <th className="py-3 px-4">Event Code</th>
                  <th className="py-3 px-4">Timestamp (UTC)</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderLight/60">
                {events.map((evt: AuditEvent) => (
                  <tr key={evt.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-brand text-[11px]">
                      {evt.event_id}
                    </td>
                    <td className="py-3 px-4 text-textSecondary text-[11px] whitespace-nowrap">
                      {new Date(evt.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={getActionBadgeVariant(evt.action)} size="sm">
                        {evt.action}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-textPrimary">
                        {evt.actor_email || 'System / Anonymous'}
                      </span>
                      {evt.ip_address && (
                        <span className="block text-[10px] text-slate-400 font-mono">
                          IP: {evt.ip_address}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                        {evt.entity_type}
                      </span>
                      <span className="block text-[10px] text-textSecondary font-mono truncate max-w-[120px] mt-0.5">
                        {evt.entity_id}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-textSecondary max-w-xs truncate">
                      {evt.reason || '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedEvent(evt)}
                        className="text-brand hover:underline font-medium text-[11px]"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audit Detail Modal */}
      <Modal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title={`Audit Event: ${selectedEvent?.event_id}`}
        description="Immutable record metadata and JSON payload."
        maxWidth="lg"
      >
        {selectedEvent && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-borderLight">
              <div>
                <span className="text-textSecondary block text-[11px]">Action</span>
                <span className="font-bold text-textPrimary">{selectedEvent.action}</span>
              </div>
              <div>
                <span className="text-textSecondary block text-[11px]">Timestamp</span>
                <span className="font-mono text-textPrimary">
                  {new Date(selectedEvent.created_at).toISOString()}
                </span>
              </div>
              <div>
                <span className="text-textSecondary block text-[11px]">Actor Email</span>
                <span className="font-semibold text-textPrimary">
                  {selectedEvent.actor_email || 'System'}
                </span>
              </div>
              <div>
                <span className="text-textSecondary block text-[11px]">IP Address</span>
                <span className="font-mono text-textPrimary">{selectedEvent.ip_address || '—'}</span>
              </div>
            </div>

            <div>
              <span className="text-textSecondary block text-[11px] mb-1 font-semibold">
                Reason / Decision Summary
              </span>
              <p className="bg-white p-2 rounded border border-borderLight text-textPrimary">
                {selectedEvent.reason || 'No description provided'}
              </p>
            </div>

            <div>
              <span className="text-textSecondary block text-[11px] mb-1 font-semibold flex items-center gap-1">
                <Terminal className="w-3.5 h-3.5 text-brand" /> Context Details & Payload (JSON)
              </span>
              <pre className="bg-[#0F172A] text-emerald-400 p-3 rounded-lg overflow-x-auto font-mono text-[11px] leading-relaxed max-h-56">
                {JSON.stringify(selectedEvent.details, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" size="sm" onClick={() => setSelectedEvent(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
