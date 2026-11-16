import React, { useState } from 'react';
import { 
  WifiOff, Wifi, RefreshCw, Eye, Trash2, Printer, 
  CheckCircle2, AlertTriangle, Layers, Clock, ArrowRight, X
} from 'lucide-react';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { AppDialog } from '../../../shared/overlays/AppDialog';
import { AppButton } from '../../../shared/app/AppButton';
import { printMaterialReceipt } from '../../inventory/utils/printMaterialReceipt';
import type { PendingSlip } from '../types';

export function OfflineSyncBanner() {
  const { isOnline, pendingSlips, pendingCount, isSyncing, syncAll, removeSlip, syncSingle } = useOfflineSync();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<PendingSlip | null>(null);

  // If online and 0 pending slips, do not clutter the screen
  if (isOnline && pendingCount === 0) {
    return null;
  }

  const handlePrintSlip = (slip: PendingSlip) => {
    if (slip.receiptData) {
      printMaterialReceipt(slip.receiptData);
    }
  };

  return (
    <>
      {/* 1. Offline Mode Active Banner */}
      {!isOnline && (
        <div className="bg-amber-600 text-white px-4 py-2 text-xs font-medium flex items-center justify-between gap-3 shadow-md z-30 animate-in fade-in">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
            </span>
            <div className="flex items-center gap-2 truncate">
              <span className="font-extrabold uppercase tracking-wider bg-black/25 px-2 py-0.5 rounded text-[11px] flex items-center gap-1">
                <WifiOff className="h-3 w-3" /> Offline Mode
              </span>
              <span className="hidden md:inline text-amber-100 truncate">
                Power or Internet outage detected. Store Keeper can safely create and print Issue & Return Slips.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {pendingCount > 0 ? (
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-black/30 hover:bg-black/40 text-white font-bold px-3 py-1 rounded text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Pending Slips ({pendingCount})</span>
              </button>
            ) : (
              <span className="text-[11px] text-amber-100 hidden sm:inline">
                Slips save locally
              </span>
            )}
          </div>
        </div>
      )}

      {/* 2. Internet Restored with Pending Slips Banner */}
      {isOnline && pendingCount > 0 && (
        <div className="bg-emerald-600 text-white px-4 py-2.5 text-xs font-medium flex items-center justify-between gap-3 shadow-md z-30 animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
            </span>
            <div className="flex items-center gap-2 truncate">
              <span className="font-extrabold uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded text-[11px] flex items-center gap-1">
                <Wifi className="h-3 w-3" /> Internet Connected
              </span>
              <span className="text-emerald-100 truncate">
                You have <b>{pendingCount} emergency offline {pendingCount === 1 ? 'slip' : 'slips'}</b> ready to sync to the live database.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-black/20 hover:bg-black/30 text-white font-semibold px-2.5 py-1 rounded text-xs transition-colors cursor-pointer"
            >
              Review ({pendingCount})
            </button>

            <button
              onClick={syncAll}
              disabled={isSyncing}
              className="bg-white text-emerald-700 hover:bg-emerald-50 active:scale-95 text-xs font-black px-3.5 py-1 rounded-md shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : `Sync Pending Slips (${pendingCount})`}</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Review & Manage Offline Pending Slips Modal */}
      {isModalOpen && (
        <AppDialog
          isOpen={isModalOpen}
          onOpenChange={(open) => !open && setIsModalOpen(false)}
          title="Emergency Offline Pending Slips"
          description={`${pendingCount} slip(s) saved in local device memory during network outage.`}
          className="max-w-2xl w-[95vw] sm:w-full overflow-hidden flex flex-col max-h-[85vh]"
        >
          <div className="flex flex-col flex-1 overflow-hidden space-y-4">
            {/* Header Status Bar */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border text-xs">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                <span className="font-bold text-foreground">
                  Status: {isOnline ? 'Online & Ready to Sync' : 'Offline (Local Mode)'}
                </span>
              </div>
              <span className="text-muted-foreground font-mono">
                Queue: {pendingCount} {pendingCount === 1 ? 'slip' : 'slips'}
              </span>
            </div>

            {/* Slips List */}
            <div className="flex-1 overflow-y-auto max-h-[400px] space-y-2.5 pr-1">
              {pendingSlips.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2 opacity-60" />
                  <p className="font-bold text-sm text-foreground">All Slips Synced</p>
                  <p className="text-xs text-muted-foreground mt-1">There are no offline pending slips waiting in queue.</p>
                </div>
              ) : (
                pendingSlips.map((slip) => {
                  const typeLabel = 
                    slip.type === 'MATERIAL_ISSUE' ? 'Material Issue' :
                    slip.type === 'MATERIAL_RETURN_DIRECT' ? 'Direct Return' :
                    slip.type === 'MATERIAL_RETURN_ISSUE' ? 'Issue Return' :
                    slip.type === 'TOOL_ISSUE' ? 'Tool Issue' : 'Tool Return';

                  const badgeColor = 
                    slip.type.includes('ISSUE') ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' :
                    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';

                  return (
                    <div 
                      key={slip.id}
                      className="p-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-foreground text-sm font-mono">
                            {slip.slipCode}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${badgeColor}`}>
                            {typeLabel}
                          </span>
                          <span className="text-muted-foreground text-[11px] flex items-center gap-1 font-mono">
                            <Clock className="h-3 w-3" />
                            {new Date(slip.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className="text-xs text-foreground font-semibold">
                          <span>{slip.customerOrTech}</span>
                          {slip.siteName && (
                            <span className="text-muted-foreground font-normal ml-1.5">• Site: {slip.siteName}</span>
                          )}
                        </div>

                        <p className="text-[11px] text-muted-foreground italic truncate">
                          {slip.itemsSummary || `${slip.itemCount} item(s)`}
                        </p>

                        {slip.status === 'FAILED' && (
                          <p className="text-[11px] text-destructive font-semibold flex items-center gap-1 mt-1">
                            <AlertTriangle className="h-3 w-3" />
                            Sync error: {slip.errorMessage || 'Failed to upload'}
                          </p>
                        )}
                      </div>

                      {/* Slip Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        {slip.receiptData && (
                          <AppButton
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1.5"
                            onClick={() => handlePrintSlip(slip)}
                            title="Print Voucher"
                          >
                            <Printer className="h-3.5 w-3.5 text-primary" />
                            <span className="hidden sm:inline">Print Slip</span>
                          </AppButton>
                        )}

                        {isOnline && (
                          <AppButton
                            size="sm"
                            className="h-8 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => syncSingle(slip)}
                            disabled={isSyncing}
                            title="Sync this slip now"
                          >
                            <RefreshCw className="h-3 w-3" />
                            <span>Sync</span>
                          </AppButton>
                        )}

                        <button
                          onClick={() => {
                            if (window.confirm(`Discard offline slip ${slip.slipCode}? This cannot be undone.`)) {
                              removeSlip(slip.id);
                            }
                          }}
                          className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          title="Discard offline record"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Bottom Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-border gap-2">
              <span className="text-xs text-muted-foreground">
                Slips are stored safely in device storage.
              </span>

              <div className="flex items-center gap-2">
                <AppButton variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                  Close
                </AppButton>

                {pendingCount > 0 && isOnline && (
                  <AppButton
                    size="sm"
                    onClick={syncAll}
                    disabled={isSyncing}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold gap-1.5"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>Sync All ({pendingCount})</span>
                  </AppButton>
                )}
              </div>
            </div>
          </div>
        </AppDialog>
      )}
    </>
  );
}
