import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { offlineSyncService } from '../services/offlineSyncService';
import type { PendingSlip } from '../types';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingSlips, setPendingSlips] = useState<PendingSlip[]>(() => 
    offlineSyncService.getPendingSlips()
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Sync state with local storage updates and browser online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Internet reconnected! Ready to sync offline slips.', {
        id: 'network-online-toast',
        duration: 4000
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Offline Mode Activated: Slips will be saved locally on this device.', {
        id: 'network-offline-toast',
        duration: 5000
      });
    };

    const handleSlipsUpdate = () => {
      setPendingSlips(offlineSyncService.getPendingSlips());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    const unsubscribe = offlineSyncService.onSlipsUpdated(handleSlipsUpdate);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  // 1-Click Sync Handler
  const syncAll = useCallback(async () => {
    if (isSyncing) return;
    if (!navigator.onLine) {
      toast.error('Cannot sync while offline. Please connect to internet or Wi-Fi first.');
      return;
    }

    const count = pendingSlips.length;
    if (count === 0) {
      toast.info('No pending offline slips to sync.');
      return;
    }

    setIsSyncing(true);
    const toastId = toast.loading(`Syncing ${count} pending offline slip(s) to live database...`);

    try {
      const result = await offlineSyncService.syncAllPendingSlips();

      if (result.failed === 0) {
        toast.success(`All ${result.synced} pending slips synced successfully to live database!`, {
          id: toastId,
          duration: 5000
        });
      } else if (result.synced > 0) {
        toast.warning(
          `Synced ${result.synced} slip(s), but ${result.failed} failed. Review pending slips.`,
          { id: toastId, duration: 6000 }
        );
      } else {
        toast.error(`Sync failed for ${result.failed} slip(s). Check connection and retry.`, {
          id: toastId,
          duration: 6000
        });
      }
    } catch (err: any) {
      toast.error(err.message || 'Sync encountered an error', { id: toastId });
    } finally {
      setIsSyncing(false);
      setPendingSlips(offlineSyncService.getPendingSlips());
    }
  }, [isSyncing, pendingSlips.length]);

  const removeSlip = useCallback((id: string) => {
    offlineSyncService.removePendingSlip(id);
    setPendingSlips(offlineSyncService.getPendingSlips());
    toast.success('Offline slip removed from queue');
  }, []);

  const syncSingle = useCallback(async (slip: PendingSlip) => {
    if (!navigator.onLine) {
      toast.error('Cannot sync while offline.');
      return;
    }
    const toastId = toast.loading(`Syncing slip ${slip.slipCode}...`);
    const res = await offlineSyncService.syncSingleSlip(slip);
    if (res.success) {
      toast.success(`Slip ${slip.slipCode} synced! Record created: ${res.liveCode}`, { id: toastId });
    } else {
      toast.error(`Failed to sync ${slip.slipCode}: ${res.error}`, { id: toastId });
    }
    setPendingSlips(offlineSyncService.getPendingSlips());
  }, []);

  return {
    isOnline,
    pendingSlips,
    pendingCount: pendingSlips.length,
    isSyncing,
    syncAll,
    removeSlip,
    syncSingle
  };
}
