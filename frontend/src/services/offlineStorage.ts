import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
  OfflineInspectionDownload,
  QueuedSyncItem,
} from '../types/offline';

interface CivicProofOfflineDB extends DBSchema {
  cached_inspections: {
    key: string;
    value: OfflineInspectionDownload;
  };
  draft_inspections: {
    key: string;
    value: QueuedSyncItem;
  };
  sync_queue: {
    key: string;
    value: QueuedSyncItem;
  };
  metadata: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'civicproof_offline_db';
const DB_VERSION = 1;

class OfflineStorageManager {
  private dbPromise: Promise<IDBPDatabase<CivicProofOfflineDB>> | null = null;

  private getDB() {
    if (!this.dbPromise) {
      this.dbPromise = openDB<CivicProofOfflineDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('cached_inspections')) {
            db.createObjectStore('cached_inspections', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('draft_inspections')) {
            db.createObjectStore('draft_inspections', { keyPath: 'entity_id' });
          }
          if (!db.objectStoreNames.contains('sync_queue')) {
            db.createObjectStore('sync_queue', { keyPath: 'client_submission_id' });
          }
          if (!db.objectStoreNames.contains('metadata')) {
            db.createObjectStore('metadata');
          }
        },
      });
    }
    return this.dbPromise;
  }

  // --- Assigned Inspections Caching ---
  async cacheAssignedInspections(inspections: OfflineInspectionDownload[]): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction('cached_inspections', 'readwrite');
    for (const insp of inspections) {
      await tx.store.put(insp);
    }
    await tx.done;

    // Record last cached timestamp
    const metaTx = db.transaction('metadata', 'readwrite');
    await metaTx.store.put(new Date().toISOString(), 'last_cache_time');
    await metaTx.done;
  }

  async getCachedInspections(): Promise<OfflineInspectionDownload[]> {
    const db = await this.getDB();
    return db.getAll('cached_inspections');
  }

  async getCachedInspection(id: string): Promise<OfflineInspectionDownload | undefined> {
    const db = await this.getDB();
    return db.get('cached_inspections', id);
  }

  // --- Draft Inspections ---
  async saveDraftInspection(item: QueuedSyncItem): Promise<void> {
    const db = await this.getDB();
    await db.put('draft_inspections', item);
  }

  async getDraftInspection(entityId: string): Promise<QueuedSyncItem | undefined> {
    const db = await this.getDB();
    return db.get('draft_inspections', entityId);
  }

  async getAllDrafts(): Promise<QueuedSyncItem[]> {
    const db = await this.getDB();
    return db.getAll('draft_inspections');
  }

  async removeDraft(entityId: string): Promise<void> {
    const db = await this.getDB();
    await db.delete('draft_inspections', entityId);
  }

  // --- Durable Sync Queue ---
  async enqueueItem(item: QueuedSyncItem): Promise<void> {
    const db = await this.getDB();
    await db.put('sync_queue', item);
  }

  async getQueueItems(): Promise<QueuedSyncItem[]> {
    const db = await this.getDB();
    return db.getAll('sync_queue');
  }

  async updateQueueItem(item: QueuedSyncItem): Promise<void> {
    const db = await this.getDB();
    await db.put('sync_queue', item);
  }

  async removeQueueItem(clientSubmissionId: string): Promise<void> {
    const db = await this.getDB();
    await db.delete('sync_queue', clientSubmissionId);
  }

  async clearSyncedItems(): Promise<void> {
    const db = await this.getDB();
    const items = await db.getAll('sync_queue');
    const tx = db.transaction('sync_queue', 'readwrite');
    for (const item of items) {
      if (item.status === 'Synced') {
        await tx.store.delete(item.client_submission_id);
      }
    }
    await tx.done;
  }

  async getLastCacheTime(): Promise<string | null> {
    const db = await this.getDB();
    return (await db.get('metadata', 'last_cache_time')) || null;
  }
}

export const offlineStorage = new OfflineStorageManager();
