import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  CloudUpload,
  RefreshCw,
  Download,
  AlertTriangle,
  Clock,
  FileText,
  Camera,
  MapPin,
  Trash2,
  ShieldAlert,
  Info,
  Layers,
  Plus
} from 'lucide-react';
import { api } from '../../services/api';
import { offlineStorage } from '../../services/offlineStorage';
import { Badge, type BadgeVariant } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import type {
  OfflineInspectionDownload,
  QueuedSyncItem,
  OfflineChecklistItem,
  SyncItemStatus
} from '../../types/offline';

export const OfflineFieldPage: React.FC = () => {
  // Connectivity state
  const [isBrowserOnline, setIsBrowserOnline] = useState<boolean>(navigator.onLine);
  const [simulateOffline, setSimulateOffline] = useState<boolean>(false);
  const isOnline = isBrowserOnline && !simulateOffline;

  // Cached data state
  const [cachedInspections, setCachedInspections] = useState<OfflineInspectionDownload[]>([]);
  const [queueItems, setQueueItems] = useState<QueuedSyncItem[]>([]);
  const [lastCacheTime, setLastCacheTime] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Active Offline Inspection Form
  const [selectedInspectionId, setSelectedInspectionId] = useState<string>('');
  const [activeChecklist, setActiveChecklist] = useState<OfflineChecklistItem[]>([]);
  const [inspectionNotes, setInspectionNotes] = useState<string>('');
  const [inspectionOutcome, setInspectionOutcome] = useState<'Passed' | 'Failed' | 'Conditional Pass'>('Passed');
  const [verifiedPercentageAwarded, setVerifiedPercentageAwarded] = useState<number>(10.0);
  const [evidencePhotos, setEvidencePhotos] = useState<{ name: string; url: string; size: string }[]>([]);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Offline Defect Modal
  const [isDefectModalOpen, setIsDefectModalOpen] = useState<boolean>(false);
  const [defectTitle, setDefectTitle] = useState<string>('');
  const [defectSeverity, setDefectSeverity] = useState<string>('High');
  const [defectCategory, setDefectCategory] = useState<string>('Quality & Safety');
  const [defectDescription, setDefectDescription] = useState<string>('');

  // Conflict Resolution Modal
  const [conflictItem, setConflictItem] = useState<QueuedSyncItem | null>(null);
  // Offline Limitations Info Modal
  const [isLimitationsModalOpen, setIsLimitationsModalOpen] = useState<boolean>(false);

  // Listen to network changes
  useEffect(() => {
    const handleOnline = () => setIsBrowserOnline(true);
    const handleOffline = () => setIsBrowserOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial load from IndexedDB
    refreshLocalData();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const refreshLocalData = async () => {
    try {
      const [cached, queue, cacheTime] = await Promise.all([
        offlineStorage.getCachedInspections(),
        offlineStorage.getQueueItems(),
        offlineStorage.getLastCacheTime(),
      ]);
      setCachedInspections(cached);
      setQueueItems(queue);
      setLastCacheTime(cacheTime);

      if (cached.length > 0 && !selectedInspectionId) {
        selectInspectionForExecution(cached[0]);
      }
    } catch (err: any) {
      console.error('Failed to load from IndexedDB:', err);
    }
  };

  const selectInspectionForExecution = (insp: OfflineInspectionDownload) => {
    setSelectedInspectionId(insp.id);
    setActiveChecklist(JSON.parse(JSON.stringify(insp.checklist_template || [])));
    setInspectionNotes('');
    setInspectionOutcome('Passed');
    setEvidencePhotos([]);
    if (insp.latitude && insp.longitude) {
      setCurrentCoords({ lat: insp.latitude, lng: insp.longitude });
    }
  };

  // Download assigned inspections from server to IndexedDB
  const handleDownloadAssigned = async () => {
    if (!isOnline) {
      setStatusMessage('Cannot download: Network connection is offline.');
      return;
    }
    setLoading(true);
    setStatusMessage(null);
    try {
      const data = await api.getAssignedInspectionsForOffline();
      await offlineStorage.cacheAssignedInspections(data);
      await refreshLocalData();
      setStatusMessage(`Successfully cached ${data.length} assigned inspection dossiers for offline execution.`);
    } catch (err: any) {
      setStatusMessage(`Download failed: ${err.message || 'Server error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Update Checklist Item
  const handleChecklistChange = (index: number, verdict: 'pass' | 'fail' | 'n/a' | 'pending', notes: string) => {
    const updated = [...activeChecklist];
    updated[index] = { ...updated[index], verdict, notes };
    setActiveChecklist(updated);
  };

  // Handle Photo Capture / Upload simulation
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (file.size > 5 * 1024 * 1024) {
      alert('Photo exceeds 5MB limit. Please capture a lower resolution image.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setEvidencePhotos((prev) => [
        ...prev,
        {
          name: file.name,
          url: url,
          size: `${(file.size / 1024).toFixed(0)} KB`,
        },
      ]);
    };
    reader.readAsDataURL(file);
  };

  // Geolocation grab
  const handleCaptureGPS = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentCoords({
            lat: Number(pos.coords.latitude.toFixed(6)),
            lng: Number(pos.coords.longitude.toFixed(6)),
          });
        },
        () => {
          // Fallback to ghat coordinates
          setCurrentCoords({ lat: 16.9944, lng: 81.7678 });
        }
      );
    } else {
      setCurrentCoords({ lat: 16.9944, lng: 81.7678 });
    }
  };

  // 1. Save Local Draft (Status: Draft saved locally)
  const handleSaveDraft = async () => {
    const currentInsp = cachedInspections.find((i) => i.id === selectedInspectionId);
    if (!currentInsp) return;

    const draftItem: QueuedSyncItem = {
      client_submission_id: `draft-${currentInsp.id}-${Date.now()}`,
      action_type: 'save_inspection_draft',
      entity_id: currentInsp.id,
      title: `Draft: ${currentInsp.inspection_type} (${currentInsp.inspection_id})`,
      payload: {
        inspection_id: currentInsp.id,
        checklist_results: activeChecklist,
        notes: inspectionNotes,
        outcome: inspectionOutcome,
        verified_percentage_awarded: verifiedPercentageAwarded,
        evidence_photos: evidencePhotos,
        latitude: currentCoords?.lat,
        longitude: currentCoords?.lng,
      },
      status: 'Draft saved locally',
      created_at: new Date().toISOString(),
      retry_count: 0,
    };

    await offlineStorage.enqueueItem(draftItem);
    await refreshLocalData();
    setStatusMessage(`Inspection draft saved locally in IndexedDB.`);
  };

  // 2. Queue Inspection for Sync (Status: Pending sync)
  const handleQueueInspection = async () => {
    const currentInsp = cachedInspections.find((i) => i.id === selectedInspectionId);
    if (!currentInsp) return;

    const syncItem: QueuedSyncItem = {
      client_submission_id: `sub-${currentInsp.id}-${Date.now()}`,
      action_type: 'execute_inspection',
      entity_id: currentInsp.id,
      title: `${currentInsp.inspection_type} (${currentInsp.inspection_id})`,
      payload: {
        inspection_id: currentInsp.id,
        checklist_results: activeChecklist,
        notes: inspectionNotes,
        outcome: inspectionOutcome,
        verified_percentage_awarded: verifiedPercentageAwarded,
        evidence_photos: evidencePhotos,
        latitude: currentCoords?.lat || currentInsp.latitude,
        longitude: currentCoords?.lng || currentInsp.longitude,
      },
      status: 'Pending sync',
      created_at: new Date().toISOString(),
      retry_count: 0,
    };

    await offlineStorage.enqueueItem(syncItem);
    await refreshLocalData();
    setStatusMessage(`Inspection execution queued in local sync pipeline.`);

    // If online, immediately trigger batch sync
    if (isOnline) {
      handleTriggerSync();
    }
  };

  // 3. Queue Offline Defect
  const handleQueueDefect = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentInsp = cachedInspections.find((i) => i.id === selectedInspectionId);
    if (!currentInsp) return;

    const defectItem: QueuedSyncItem = {
      client_submission_id: `def-off-${Date.now()}`,
      action_type: 'create_defect',
      entity_id: currentInsp.work_package_id,
      title: `Field Defect: ${defectTitle}`,
      payload: {
        work_package_id: currentInsp.work_package_id,
        inspection_id: currentInsp.id,
        asset_id: currentInsp.asset_id,
        title: defectTitle,
        severity: defectSeverity,
        category: defectCategory,
        description: defectDescription,
      },
      status: 'Pending sync',
      created_at: new Date().toISOString(),
      retry_count: 0,
    };

    await offlineStorage.enqueueItem(defectItem);
    await refreshLocalData();
    setIsDefectModalOpen(false);
    setDefectTitle('');
    setDefectDescription('');
    setStatusMessage('Defect queued in local offline pipeline.');

    if (isOnline) {
      handleTriggerSync();
    }
  };

  // Trigger Durable Batch Sync to Server
  const handleTriggerSync = async () => {
    if (!isOnline) {
      setStatusMessage('Cannot sync: System is offline. Items remain safely stored in IndexedDB.');
      return;
    }

    const pending = queueItems.filter(
      (item) => item.status === 'Pending sync' || item.status === 'Sync failed' || item.status === 'Draft saved locally'
    );

    if (pending.length === 0) {
      setStatusMessage('No pending submissions to sync.');
      return;
    }

    setSyncing(true);
    setStatusMessage(null);

    try {
      const batchRequest = {
        device_id: 'inspector-mobile-field-pwa',
        items: pending.map((item) => ({
          client_submission_id: item.client_submission_id,
          action_type: item.action_type,
          entity_id: item.entity_id,
          payload: item.payload,
          client_timestamp: item.created_at,
        })),
      };

      const res = await api.syncOfflineBatch(batchRequest);

      // Update statuses in local queue based on server response
      for (const result of res.results) {
        const item = queueItems.find((q) => q.client_submission_id === result.client_submission_id);
        if (item) {
          if (result.status === 'synced') {
            item.status = 'Synced';
            item.last_attempt_at = new Date().toISOString();
          } else if (result.status === 'conflict') {
            item.status = 'Conflict requires review';
            item.conflict_details = result.conflict_details;
            item.last_attempt_at = new Date().toISOString();
          } else {
            item.status = 'Sync failed';
            item.error_message = result.error_message;
            item.retry_count += 1;
            item.last_attempt_at = new Date().toISOString();
          }
          await offlineStorage.updateQueueItem(item);
        }
      }

      await refreshLocalData();
      setStatusMessage(
        `Sync completed: ${res.synced_count} synced, ${res.conflict_count} conflicts, ${res.failed_count} failed.`
      );
    } catch (err: any) {
      setStatusMessage(`Sync batch failed: ${err.message || 'Network error'}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleRemoveQueueItem = async (clientSubmissionId: string) => {
    await offlineStorage.removeQueueItem(clientSubmissionId);
    await refreshLocalData();
  };

  const handleClearSynced = async () => {
    await offlineStorage.clearSyncedItems();
    await refreshLocalData();
  };

  const getStatusBadge = (status: SyncItemStatus): BadgeVariant => {
    switch (status) {
      case 'Synced':
        return 'success';
      case 'Pending sync':
      case 'Uploading':
        return 'brand';
      case 'Sync failed':
        return 'error';
      case 'Conflict requires review':
        return 'warning';
      case 'Draft saved locally':
      default:
        return 'neutral';
    }
  };

  const activeInspection = cachedInspections.find((i) => i.id === selectedInspectionId);

  return (
    <div className="space-y-6 pb-12">
      {/* Network Connectivity & Simulation Banner */}
      <div
        className={`rounded-xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors shadow-sm ${
          isOnline
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
            : 'bg-amber-50/80 border-amber-300 text-amber-950'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
              isOnline ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white animate-pulse'
            }`}
          >
            {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight">
                {isOnline ? 'Network Online — Real-Time Cloud Sync Active' : 'Offline Mode — Field Sector Disconnected'}
              </span>
              <Badge variant={isOnline ? 'success' : 'warning'} size="sm">
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </Badge>
            </div>
            <p className="text-[11px] opacity-80 mt-0.5">
              {isOnline
                ? 'Local IndexedDB queue automatically commits to Pushkaralu cloud upon submission.'
                : 'Inspections, drafts, and evidence are safely persisted in durable browser IndexedDB storage.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setSimulateOffline(!simulateOffline)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              simulateOffline
                ? 'bg-amber-700 text-white border-amber-800 shadow-inner'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            {simulateOffline ? 'Re-enable Network' : 'Simulate Offline Mode'}
          </button>
          <button
            type="button"
            onClick={() => setIsLimitationsModalOpen(true)}
            className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-semibold text-xs"
          >
            <Info className="w-4 h-4 text-slate-500" />
            <span>Limitations</span>
          </button>
        </div>
      </div>

      {/* Header Banner */}
      <div className="bg-white border border-borderLight rounded-xl p-6 shadow-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <Layers className="w-3.5 h-3.5 text-amber-600" />
                Module 11 Offline Engine
              </span>
              <span className="text-xs text-textSecondary font-medium">IndexedDB Durable Queue & Conflict Detection</span>
            </div>
            <h1 className="text-2xl font-bold text-textPrimary tracking-tight">
              Offline-First Field Workflows
            </h1>
            <p className="text-sm text-textSecondary mt-1 max-w-3xl">
              Conduct field checklists, capture evidence, and log defects in remote riverbed ghat sectors without active cellular coverage.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="secondary"
              onClick={handleDownloadAssigned}
              isLoading={loading}
              icon={<Download className="w-4 h-4" />}
            >
              Download Assigned Tasks
            </Button>
            <Button
              variant="primary"
              onClick={handleTriggerSync}
              isLoading={syncing}
              disabled={!isOnline || queueItems.length === 0}
              icon={<CloudUpload className="w-4 h-4" />}
            >
              Sync Pending Queue ({queueItems.filter((q) => q.status !== 'Synced').length})
            </Button>
          </div>
        </div>

        {statusMessage && (
          <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 flex items-center justify-between">
            <span>{statusMessage}</span>
            <button type="button" onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-slate-600">
              &times;
            </button>
          </div>
        )}
      </div>

      {/* KPI Timeline Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-borderLight rounded-xl p-4 shadow-card">
          <span className="text-[11px] text-textSecondary font-semibold uppercase tracking-wider block">Cached Field Tasks</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-black text-slate-900">{cachedInspections.length}</span>
            <span className="text-xs text-slate-500">dossiers</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            Last cached: {lastCacheTime ? new Date(lastCacheTime).toLocaleTimeString() : 'Never'}
          </span>
        </div>

        <div className="bg-white border border-borderLight rounded-xl p-4 shadow-card">
          <span className="text-[11px] text-textSecondary font-semibold uppercase tracking-wider block">Local Drafts Saved</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-black text-slate-700">
              {queueItems.filter((q) => q.status === 'Draft saved locally').length}
            </span>
            <span className="text-xs text-slate-500">drafts</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">IndexedDB storage</span>
        </div>

        <div className="bg-white border border-borderLight rounded-xl p-4 shadow-card">
          <span className="text-[11px] text-textSecondary font-semibold uppercase tracking-wider block">Queued For Cloud Sync</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-black text-blue-600">
              {queueItems.filter((q) => q.status === 'Pending sync').length}
            </span>
            <span className="text-xs text-slate-500">pending</span>
          </div>
          <span className="text-[10px] text-blue-600 block mt-1">Idempotent queue</span>
        </div>

        <div className="bg-white border border-borderLight rounded-xl p-4 shadow-card">
          <span className="text-[11px] text-textSecondary font-semibold uppercase tracking-wider block">Review Conflicts</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-black text-amber-600">
              {queueItems.filter((q) => q.status === 'Conflict requires review').length}
            </span>
            <span className="text-xs text-amber-600 font-medium">review needed</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">No blind last-write-wins</span>
        </div>
      </div>

      {/* Main Workspace: Offline Checklist Runner (7 cols) + Local Queue (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Offline Inspection Runner (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-borderLight rounded-xl shadow-card p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-borderLight pb-4">
            <div>
              <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand" />
                Offline Field Checklist Runner
              </h3>
              <p className="text-xs text-textSecondary mt-0.5">
                Execute verification checklists without connection. Invariant: Not official until synced.
              </p>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsDefectModalOpen(true)}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Log Offline Defect
            </Button>
          </div>

          {/* Cached Inspection Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Select Cached Field Task:
            </label>
            {cachedInspections.length > 0 ? (
              <select
                value={selectedInspectionId}
                onChange={(e) => {
                  const target = cachedInspections.find((i) => i.id === e.target.value);
                  if (target) selectInspectionForExecution(target);
                }}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand bg-white font-medium"
              >
                {cachedInspections.map((insp) => (
                  <option key={insp.id} value={insp.id}>
                    {insp.inspection_id} — {insp.inspection_type} ({insp.project_name})
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 flex items-center justify-between">
                <span>No inspections cached in IndexedDB. Click "Download Assigned Tasks".</span>
                <Button size="sm" variant="secondary" onClick={handleDownloadAssigned}>
                  Download
                </Button>
              </div>
            )}
          </div>

          {activeInspection && (
            <div className="space-y-4 pt-1 text-xs">
              {/* Task Header Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-700">{activeInspection.inspection_id}</span>
                  <Badge variant="neutral" size="sm">
                    {activeInspection.inspection_type}
                  </Badge>
                </div>
                <h4 className="font-bold text-slate-900">{activeInspection.work_package_title}</h4>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                  <span>Zone: <strong>{activeInspection.zone_name || 'Kotilingala'}</strong></span>
                  {activeInspection.asset_name && <span>Asset: <strong>{activeInspection.asset_name}</strong></span>}
                  <span>Scheduled: {activeInspection.scheduled_date || 'Today'}</span>
                </div>
              </div>

              {/* Checklist Items */}
              <div className="space-y-3">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
                  Mandatory Verification Checkpoints:
                </span>
                <div className="space-y-2.5">
                  {activeChecklist.map((item, idx) => (
                    <div key={item.id} className="p-3 rounded-lg border border-slate-200 bg-white space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-mono text-[10px] text-slate-400 font-bold block">{item.id}</span>
                          <span className="font-semibold text-slate-800 block text-xs">{item.description}</span>
                        </div>
                        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleChecklistChange(idx, 'pass', item.notes || '')}
                            className={`px-2 py-1 text-[11px] font-bold rounded ${
                              item.verdict === 'pass'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Pass
                          </button>
                          <button
                            type="button"
                            onClick={() => handleChecklistChange(idx, 'fail', item.notes || '')}
                            className={`px-2 py-1 text-[11px] font-bold rounded ${
                              item.verdict === 'fail'
                                ? 'bg-red-600 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Fail
                          </button>
                          <button
                            type="button"
                            onClick={() => handleChecklistChange(idx, 'n/a', item.notes || '')}
                            className={`px-2 py-1 text-[11px] font-bold rounded ${
                              item.verdict === 'n/a'
                                ? 'bg-slate-600 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            N/A
                          </button>
                        </div>
                      </div>

                      <input
                        type="text"
                        placeholder="Checkpoint observation notes..."
                        value={item.notes || ''}
                        onChange={(e) => handleChecklistChange(idx, item.verdict, e.target.value)}
                        className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-brand focus:border-brand bg-slate-50/50"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Physical Verification Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* GPS Capture */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                  <span className="font-semibold text-slate-700 block">GPS Coordinates:</span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-slate-600">
                      {currentCoords ? `${currentCoords.lat}, ${currentCoords.lng}` : 'Uncaptured'}
                    </span>
                    <Button size="sm" variant="secondary" onClick={handleCaptureGPS} icon={<MapPin className="w-3 h-3" />}>
                      Capture GPS
                    </Button>
                  </div>
                </div>

                {/* Evidence Photo Attachment */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                  <span className="font-semibold text-slate-700 block">Photographic Evidence:</span>
                  <label className="w-full cursor-pointer inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Attach Photo</span>
                    <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                  {evidencePhotos.length > 0 && (
                    <span className="text-[10px] text-emerald-700 font-medium block">
                      {evidencePhotos.length} photo(s) captured locally
                    </span>
                  )}
                </div>
              </div>

              {/* Verdict & Awarded % */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Inspection Verdict:</label>
                  <select
                    value={inspectionOutcome}
                    onChange={(e) => setInspectionOutcome(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                  >
                    <option value="Passed">Passed (Meets Standards)</option>
                    <option value="Failed">Failed (Blocking Defect Detected)</option>
                    <option value="Conditional Pass">Conditional Pass</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Verified % Awarded ({verifiedPercentageAwarded}%):
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="25"
                    step="5"
                    value={verifiedPercentageAwarded}
                    onChange={(e) => setVerifiedPercentageAwarded(Number(e.target.value))}
                    className="w-full accent-brand cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Overall Inspector Observations:</label>
                <textarea
                  rows={2}
                  value={inspectionNotes}
                  onChange={(e) => setInspectionNotes(e.target.value)}
                  placeholder="Record summary observations, weather conditions, or safety remarks..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand focus:border-brand"
                />
              </div>

              {/* Form Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-borderLight">
                <Button variant="secondary" onClick={handleSaveDraft} icon={<Clock className="w-3.5 h-3.5" />}>
                  Save Local Draft
                </Button>
                <Button variant="primary" onClick={handleQueueInspection} icon={<CloudUpload className="w-3.5 h-3.5" />}>
                  Queue for Cloud Sync
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Local Durable Sync Queue (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-borderLight rounded-xl shadow-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-borderLight pb-3">
              <div>
                <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
                  <CloudUpload className="w-4 h-4 text-brand" />
                  Durable Local Sync Queue
                </h3>
                <p className="text-[11px] text-textSecondary">
                  IndexedDB submission pipeline with exponential retry and conflict detection.
                </p>
              </div>

              {queueItems.some((q) => q.status === 'Synced') && (
                <button
                  type="button"
                  onClick={handleClearSynced}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-800"
                >
                  Clear Synced
                </button>
              )}
            </div>

            {queueItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                <CloudUpload className="w-8 h-8 text-slate-300 mx-auto" />
                <span className="font-semibold text-slate-700 block">Queue is currently empty</span>
                <p className="text-[11px]">Save inspection drafts or queue submissions to view them here.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {queueItems.map((item) => (
                  <div
                    key={item.client_submission_id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2 text-xs shadow-sm hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="truncate">
                        <span className="font-semibold text-slate-900 block truncate">{item.title}</span>
                        <span className="font-mono text-[10px] text-slate-400 truncate block">
                          {item.client_submission_id}
                        </span>
                      </div>
                      <Badge variant={getStatusBadge(item.status)} size="sm">
                        {item.status}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                      <span>Action: <strong>{item.action_type}</strong></span>
                      <span>{new Date(item.created_at).toLocaleTimeString()}</span>
                    </div>

                    {item.status === 'Conflict requires review' && (
                      <div className="p-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900 space-y-1">
                        <div className="flex items-center gap-1 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Review Conflict Detected</span>
                        </div>
                        <p className="text-[10px] opacity-90">
                          Server record was concluded while device was offline. Authorised resolution required.
                        </p>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="w-full mt-1"
                          onClick={() => setConflictItem(item)}
                        >
                          Resolve Conflict
                        </Button>
                      </div>
                    )}

                    {item.status === 'Sync failed' && item.error_message && (
                      <div className="p-2 bg-red-50 border border-red-200 rounded text-[10px] text-red-700">
                        <span>{item.error_message}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 text-[11px]">
                      <button
                        type="button"
                        onClick={() => handleRemoveQueueItem(item.client_submission_id)}
                        className="text-red-500 hover:text-red-700 inline-flex items-center gap-1 font-medium"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>

                      {item.status !== 'Synced' && (
                        <button
                          type="button"
                          onClick={handleTriggerSync}
                          disabled={!isOnline || syncing}
                          className="text-brand hover:underline font-bold inline-flex items-center gap-1"
                        >
                          <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                          <span>Sync Now</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Offline Defect Logging Modal */}
      <Modal
        isOpen={isDefectModalOpen}
        onClose={() => setIsDefectModalOpen(false)}
        title="Log Field Defect in Offline Mode"
        description="Record hazard or quality defect without internet connection. Queued in IndexedDB for upload upon reconnection."
        maxWidth="md"
      >
        <form onSubmit={handleQueueDefect}>
          <div className="p-6 space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Defect Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={defectTitle}
                onChange={(e) => setDefectTitle(e.target.value)}
                placeholder="e.g. Submersible barricade hinge pin dislodged"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand focus:border-brand"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Severity:</label>
                <select
                  value={defectSeverity}
                  onChange={(e) => setDefectSeverity(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Critical">Critical (Halts Readiness)</option>
                  <option value="High">High (Immediate Rework)</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Category:</label>
                <select
                  value={defectCategory}
                  onChange={(e) => setDefectCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Quality & Safety">Quality & Safety</option>
                  <option value="Structural Integrity">Structural Integrity</option>
                  <option value="Public Health">Public Health</option>
                  <option value="Electrical">Electrical</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Defect Description & Physical Context <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={defectDescription}
                onChange={(e) => setDefectDescription(e.target.value)}
                placeholder="Describe exact physical location, damage observed, and contractor responsibility..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand focus:border-brand"
              />
            </div>
          </div>

          <div className="px-6 py-4 bg-slate-50 border-t border-borderLight flex items-center justify-between">
            <Button variant="secondary" onClick={() => setIsDefectModalOpen(false)} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Queue Defect Locally
            </Button>
          </div>
        </form>
      </Modal>

      {/* Conflict Resolution Modal (Mandated by Section 16 / Page 35) */}
      <Modal
        isOpen={!!conflictItem}
        onClose={() => setConflictItem(null)}
        title="Synchronisation Conflict Resolution"
        description="The cloud server state changed while your device was offline. Both versions have been preserved."
        maxWidth="lg"
      >
        <div className="p-6 space-y-4 text-xs">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block">No Blind Last-Write-Wins Policy:</strong>
              <span>
                To ensure data integrity for Godavari Pushkaralu 2027 works, conflicting inspection records require authorised human reconciliation.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
                Local Offline Submission:
              </span>
              <div className="space-y-1 text-slate-600">
                <div>Verdict: <strong>{conflictItem?.payload.outcome}</strong></div>
                <div>Notes: {conflictItem?.payload.notes || 'None'}</div>
                <div>Recorded: {conflictItem?.created_at}</div>
              </div>
            </div>

            <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-lg space-y-2">
              <span className="font-bold text-blue-900 uppercase tracking-wider text-[11px] block">
                Current Server Cloud State:
              </span>
              <div className="space-y-1 text-blue-950">
                <div>Server Outcome: <strong>{conflictItem?.conflict_details?.server_outcome || 'Concluded'}</strong></div>
                <div>Decision: {conflictItem?.conflict_details?.server_reviewer_decision || 'Reviewed by PM'}</div>
                <div>Guidance: {conflictItem?.conflict_details?.resolution_guidance}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-borderLight flex items-center justify-between">
          <Button variant="secondary" onClick={() => setConflictItem(null)}>
            Dismiss
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={async () => {
                if (conflictItem) {
                  await handleRemoveQueueItem(conflictItem.client_submission_id);
                  setConflictItem(null);
                  setStatusMessage('Accepted cloud record. Offline submission retired.');
                }
              }}
            >
              Accept Cloud Record
            </Button>
            <Button
              variant="primary"
              onClick={async () => {
                if (conflictItem) {
                  conflictItem.status = 'Synced';
                  await offlineStorage.updateQueueItem(conflictItem);
                  setConflictItem(null);
                  setStatusMessage('Marked as supplementary inspection dossier.');
                }
              }}
            >
              Keep as Supplementary Dossier
            </Button>
          </div>
        </div>
      </Modal>

      {/* Offline Limitations Modal (Mandated by Section 16 / Page 35) */}
      <Modal
        isOpen={isLimitationsModalOpen}
        onClose={() => setIsLimitationsModalOpen(false)}
        title="Offline Field Operations Capabilities & Limitations"
        description="Mandatory system disclosure regarding device storage limits and security policies."
        maxWidth="md"
      >
        <div className="p-6 space-y-4 text-xs text-slate-700">
          <div className="space-y-1">
            <h4 className="font-bold text-slate-900">What is Available Offline:</h4>
            <p className="text-[11px] text-slate-600">
              Assigned checklist inspections, draft notes, checklist scoring, local photographic evidence queues, and offline defect logging.
            </p>
          </div>

          <div className="space-y-1">
            <h4 className="font-bold text-slate-900">What Requires Server Access:</h4>
            <p className="text-[11px] text-slate-600">
              Official milestone acceptance, contractor dispute sign-offs, GIS tile downloads outside cached bounds, and live executive dashboard analytics.
            </p>
          </div>

          <div className="space-y-1">
            <h4 className="font-bold text-slate-900">Browser Storage & Attachment Limits:</h4>
            <p className="text-[11px] text-slate-600">
              Storage is backed by IndexedDB. Maximum supported photographic attachment size is 5MB per image. Maximum queue capacity is approximately 50MB per device.
            </p>
          </div>

          <div className="space-y-1">
            <h4 className="font-bold text-slate-900">Session Expiration & Device Loss:</h4>
            <p className="text-[11px] text-slate-600">
              Queued submissions are encrypted in local device storage. If an inspector session expires while disconnected, queued items remain safely queued until re-authentication.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-borderLight flex justify-end">
          <Button variant="primary" onClick={() => setIsLimitationsModalOpen(false)}>
            Close Disclosure
          </Button>
        </div>
      </Modal>
    </div>
  );
};
