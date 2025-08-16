/**
 * Background Sync Manager
 * Handles offline queue and background synchronization with Google Calendar
 */

import { Event } from '@prisma/client';

interface SyncQueueItem {
  id: string;
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  retries: number;
  maxRetries: number;
}

class BackgroundSyncManager {
  private dbName = 'PhotoCalendarSync';
  private storeName = 'syncQueue';
  private db: IDBDatabase | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initDB();
    }
  }

  /**
   * Initialize IndexedDB for offline queue
   */
  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => {
        console.error('Failed to open IndexedDB');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('action', 'action', { unique: false });
        }
      };
    });
  }

  /**
   * Add item to sync queue
   */
  async addToQueue(action: SyncQueueItem['action'], data: any): Promise<void> {
    if (!this.db) {
      await this.initDB();
    }

    const item: SyncQueueItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      action,
      data,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: 3,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(item);

      request.onsuccess = () => {
        console.log('Added to sync queue:', item.id);
        this.requestBackgroundSync();
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to add to sync queue');
        reject(request.error);
      };
    });
  }

  /**
   * Get all items from sync queue
   */
  async getQueueItems(): Promise<SyncQueueItem[]> {
    if (!this.db) {
      await this.initDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Remove item from sync queue
   */
  async removeFromQueue(id: string): Promise<void> {
    if (!this.db) {
      await this.initDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('Removed from sync queue:', id);
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Update item in sync queue (for retry count)
   */
  async updateQueueItem(item: SyncQueueItem): Promise<void> {
    if (!this.db) {
      await this.initDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(item);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Request background sync from service worker
   */
  private async requestBackgroundSync(): Promise<void> {
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await (registration as any).sync.register('sync-calendar');
        console.log('Background sync requested');
      } catch (error) {
        console.error('Background sync registration failed:', error);
        // Fallback to immediate sync attempt
        this.processQueue();
      }
    } else {
      // Browser doesn't support background sync, try immediate sync
      this.processQueue();
    }
  }

  /**
   * Process sync queue
   */
  async processQueue(): Promise<void> {
    const items = await this.getQueueItems();
    
    if (items.length === 0) {
      console.log('Sync queue is empty');
      return;
    }

    console.log(`Processing ${items.length} items in sync queue`);

    for (const item of items) {
      try {
        await this.syncItem(item);
        await this.removeFromQueue(item.id);
      } catch (error) {
        console.error('Sync failed for item:', item.id, error);
        
        // Update retry count
        item.retries++;
        
        if (item.retries >= item.maxRetries) {
          console.error('Max retries reached, removing from queue:', item.id);
          await this.removeFromQueue(item.id);
          
          // Notify user of permanent failure
          this.notifyFailure(item);
        } else {
          // Update item with new retry count
          await this.updateQueueItem(item);
          
          // Schedule retry with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, item.retries), 30000);
          setTimeout(() => this.processQueue(), delay);
        }
      }
    }
  }

  /**
   * Sync individual item
   */
  private async syncItem(item: SyncQueueItem): Promise<void> {
    const endpoint = '/api/calendar/sync';
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: item.action,
        eventIds: item.data.eventIds,
        googleEventId: item.data.googleEventId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Sync failed');
    }

    console.log('Successfully synced:', item.id);
  }

  /**
   * Notify user of permanent sync failure
   */
  private notifyFailure(item: SyncQueueItem): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('동기화 실패', {
        body: `일정 동기화에 실패했습니다: ${item.action}`,
        icon: '/favicon-192x192.png',
        tag: 'sync-failure',
      });
    }
  }

  /**
   * Clear entire sync queue
   */
  async clearQueue(): Promise<void> {
    if (!this.db) {
      await this.initDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('Sync queue cleared');
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Get queue status
   */
  async getQueueStatus(): Promise<{
    count: number;
    oldestItem: SyncQueueItem | null;
    newestItem: SyncQueueItem | null;
  }> {
    const items = await this.getQueueItems();
    
    if (items.length === 0) {
      return {
        count: 0,
        oldestItem: null,
        newestItem: null,
      };
    }

    const sorted = items.sort((a, b) => a.timestamp - b.timestamp);
    
    return {
      count: items.length,
      oldestItem: sorted[0],
      newestItem: sorted[sorted.length - 1],
    };
  }
}

// Singleton instance
let backgroundSyncManager: BackgroundSyncManager | null = null;

export function getBackgroundSyncManager(): BackgroundSyncManager {
  if (!backgroundSyncManager && typeof window !== 'undefined') {
    backgroundSyncManager = new BackgroundSyncManager();
  }
  return backgroundSyncManager!;
}

// Hook for React components
export function useBackgroundSync() {
  const manager = getBackgroundSyncManager();
  
  return {
    addToQueue: (action: SyncQueueItem['action'], data: any) => 
      manager?.addToQueue(action, data),
    processQueue: () => manager?.processQueue(),
    getQueueStatus: () => manager?.getQueueStatus() || Promise.resolve({
      count: 0,
      oldestItem: null,
      newestItem: null,
    }),
    clearQueue: () => manager?.clearQueue(),
  };
}

// Auto-sync on network reconnection
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('Network reconnected, processing sync queue');
    getBackgroundSyncManager()?.processQueue();
  });
}