import { issueRepository } from '../../../repositories/IssueRepository';
import { toolTransactionRepository } from '../../../repositories/ToolTransactionRepository';
import type { PendingSlip, OfflineSlipType, OfflineCatalogCache } from '../types';

const STORAGE_KEY_SLIPS = 'CRYODEAL_OFFLINE_PENDING_SLIPS';
const STORAGE_KEY_CATALOG = 'CRYODEAL_OFFLINE_CATALOG';
const EVENT_SLIPS_UPDATED = 'cryodeal:offline-slips-updated';

class OfflineSyncService {
  // Dispatch custom window event to notify components
  private notifyUpdate() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENT_SLIPS_UPDATED));
    }
  }

  // Subscribe to slip updates
  onSlipsUpdated(callback: () => void): () => void {
    if (typeof window === 'undefined') return () => {};
    const handler = () => callback();
    window.addEventListener(EVENT_SLIPS_UPDATED, handler);
    return () => window.removeEventListener(EVENT_SLIPS_UPDATED, handler);
  }

  // Retrieve all pending slips from local storage
  getPendingSlips(): PendingSlip[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SLIPS);
      if (!raw) return [];
      const slips: PendingSlip[] = JSON.parse(raw);
      return Array.isArray(slips) ? slips.sort((a, b) => b.createdAt - a.createdAt) : [];
    } catch (e) {
      console.error('Failed to parse offline pending slips', e);
      return [];
    }
  }

  // Save a new pending slip locally
  savePendingSlip(
    data: Omit<PendingSlip, 'id' | 'slipCode' | 'createdAt' | 'status'>
  ): PendingSlip {
    const existing = this.getPendingSlips();
    const timestamp = Date.now();
    const count = existing.length + 1;

    let prefix = 'OFF-CRYO';
    if (data.type === 'MATERIAL_RETURN_DIRECT' || data.type === 'MATERIAL_RETURN_ISSUE') {
      prefix = 'OFF-RET';
    } else if (data.type === 'TOOL_ISSUE') {
      prefix = 'OFF-TISS';
    } else if (data.type === 'TOOL_RETURN') {
      prefix = 'OFF-TRET';
    }

    const slipCode = `${prefix}-${count}`;
    const id = `OFFLINE_${timestamp}_${Math.floor(Math.random() * 1000)}`;

    const newSlip: PendingSlip = {
      ...data,
      id,
      slipCode,
      createdAt: timestamp,
      status: 'PENDING'
    };

    // If receiptData has temporary slip number, update it
    if (newSlip.receiptData) {
      newSlip.receiptData.issueNumber = slipCode;
      newSlip.receiptData.directReturnNumber = slipCode;
      newSlip.receiptData.isOfflineSlip = true;
    }

    const updated = [newSlip, ...existing];
    try {
      localStorage.setItem(STORAGE_KEY_SLIPS, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save offline slip to localStorage', e);
    }

    this.notifyUpdate();
    return newSlip;
  }

  // Remove a single pending slip by ID
  removePendingSlip(id: string): void {
    const existing = this.getPendingSlips();
    const filtered = existing.filter(s => s.id !== id);
    try {
      localStorage.setItem(STORAGE_KEY_SLIPS, JSON.stringify(filtered));
    } catch (e) {
      console.error('Failed to update offline slips', e);
    }
    this.notifyUpdate();
  }

  // Clear all pending slips
  clearAllPendingSlips(): void {
    try {
      localStorage.removeItem(STORAGE_KEY_SLIPS);
    } catch (e) {
      console.error('Failed to clear offline slips', e);
    }
    this.notifyUpdate();
  }

  // Cache catalog data for offline use
  cacheCatalog(
    companyId: string,
    data: {
      products?: any[];
      employees?: any[];
      tools?: any[];
      activeIssues?: any[];
    }
  ): void {
    if (!companyId) return;
    try {
      const current = this.getCachedCatalog(companyId);
      const cache: OfflineCatalogCache = {
        companyId,
        cachedAt: Date.now(),
        products: data.products ?? current.products,
        employees: data.employees ?? current.employees,
        tools: data.tools ?? current.tools,
        activeIssues: data.activeIssues ?? current.activeIssues
      };
      localStorage.setItem(`${STORAGE_KEY_CATALOG}_${companyId}`, JSON.stringify(cache));
    } catch (e) {
      console.warn('Failed to cache catalog data to localStorage', e);
    }
  }

  // Get cached catalog data
  getCachedCatalog(companyId: string): OfflineCatalogCache {
    if (!companyId) {
      return { companyId: '', cachedAt: 0, products: [], employees: [], tools: [], activeIssues: [] };
    }
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY_CATALOG}_${companyId}`);
      if (!raw) {
        return { companyId, cachedAt: 0, products: [], employees: [], tools: [], activeIssues: [] };
      }
      return JSON.parse(raw);
    } catch (e) {
      return { companyId, cachedAt: 0, products: [], employees: [], tools: [], activeIssues: [] };
    }
  }

  // Sync a single pending slip to the live Firestore database
  async syncSingleSlip(slip: PendingSlip): Promise<{ success: boolean; error?: string; liveId?: string; liveCode?: string }> {
    try {
      let liveId = '';
      let liveCode = '';

      switch (slip.type) {
        case 'MATERIAL_ISSUE': {
          liveId = await issueRepository.issueItems(slip.payload, slip.userId);
          liveCode = slip.payload?.issueNumber || liveId;
          break;
        }

        case 'MATERIAL_RETURN_DIRECT': {
          const res = await issueRepository.returnDirectItems(slip.payload, slip.companyId, slip.userId);
          liveId = res.id;
          liveCode = res.directReturnNumber;
          break;
        }

        case 'MATERIAL_RETURN_ISSUE': {
          await issueRepository.returnItems(
            slip.payload.issueId,
            slip.payload.returns,
            slip.companyId,
            slip.userId,
            slip.payload.siteName
          );
          liveId = slip.payload.issueId;
          liveCode = slip.payload.issueNumber || slip.payload.issueId;
          break;
        }

        case 'TOOL_ISSUE': {
          const res = await toolTransactionRepository.issueTools(slip.payload, slip.userId);
          liveId = res.id;
          liveCode = res.issueNumber;
          break;
        }

        case 'TOOL_RETURN': {
          const res = await toolTransactionRepository.returnTools(
            slip.payload.issueId,
            slip.payload.returns,
            slip.companyId,
            slip.userId,
            slip.payload.siteName,
            slip.payload.returnNotes
          );
          liveId = res.id;
          liveCode = res.returnNumber;
          break;
        }

        default:
          throw new Error(`Unknown slip type: ${slip.type}`);
      }

      // If successfully synced, remove from queue
      this.removePendingSlip(slip.id);
      return { success: true, liveId, liveCode };
    } catch (error: any) {
      console.error(`Failed to sync slip ${slip.slipCode}`, error);
      
      // Update slip status to FAILED with error message
      const existing = this.getPendingSlips();
      const updated = existing.map(s => {
        if (s.id === slip.id) {
          return { ...s, status: 'FAILED' as const, errorMessage: error.message || 'Sync failed' };
        }
        return s;
      });
      try {
        localStorage.setItem(STORAGE_KEY_SLIPS, JSON.stringify(updated));
      } catch (e) {}
      this.notifyUpdate();

      return { success: false, error: error.message || 'Network sync error' };
    }
  }

  // 1-Click Sync All Pending Slips
  async syncAllPendingSlips(): Promise<{
    total: number;
    synced: number;
    failed: number;
    errors: string[];
  }> {
    const slips = this.getPendingSlips();
    if (slips.length === 0) {
      return { total: 0, synced: 0, failed: 0, errors: [] };
    }

    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process slips in FIFO order (oldest first)
    const sorted = [...slips].sort((a, b) => a.createdAt - b.createdAt);

    for (const slip of sorted) {
      const res = await this.syncSingleSlip(slip);
      if (res.success) {
        synced++;
      } else {
        failed++;
        if (res.error) errors.push(`${slip.slipCode}: ${res.error}`);
      }
    }

    return {
      total: slips.length,
      synced,
      failed,
      errors
    };
  }
}

export const offlineSyncService = new OfflineSyncService();
