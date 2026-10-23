import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR';
}

interface NotificationState {
  notifications: AppNotification[];
  dismissedIds: string[];
  markAllRead: () => void;
  markAsRead: (id: string) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  addNotification: (notification: Omit<AppNotification, 'id' | 'isRead'>) => void;
  syncLowStockAlerts: (products: any[]) => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: [],
      dismissedIds: [],

      markAllRead: () => set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, isRead: true }))
      })),

      markAsRead: (id) => set((state) => ({
        notifications: state.notifications.map(n => n.id === id ? { ...n, isRead: true } : n)
      })),

      removeNotification: (id) => set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id),
        dismissedIds: [...new Set([...state.dismissedIds, id])]
      })),

      clearAll: () => set((state) => {
        const allIds = state.notifications.map(n => n.id);
        return {
          notifications: [],
          dismissedIds: [...new Set([...state.dismissedIds, ...allIds])]
        };
      }),

      addNotification: (notification) => set((state) => {
        const id = Date.now().toString();
        return {
          notifications: [
            { ...notification, id, isRead: false },
            ...state.notifications
          ]
        };
      }),

      syncLowStockAlerts: (products) => set((state) => {
        // Find real active products that are currently low on stock
        const lowProducts = products.filter(p => 
          p.status === 'Active' && 
          Number(p.minimumStock) > 0 && 
          Number(p.currentStock) <= Number(p.minimumStock)
        );

        const currentAlerts = [...state.notifications];
        const newAlerts: AppNotification[] = [];

        // For each low stock product, if not already in notifications and not dismissed
        lowProducts.forEach(p => {
          const alertId = `low_stock_${p.id}_${p.currentStock}`;
          const existing = currentAlerts.find(a => a.id.startsWith(`low_stock_${p.id}`));
          
          if (!state.dismissedIds.includes(alertId) && !existing) {
            const unit = p.unitId || (p as any).unit || 'pcs';
            newAlerts.push({
              id: alertId,
              title: 'Low Stock Alert',
              message: `${p.name} is running low: ${p.currentStock} ${unit} remaining (Min alert: ${p.minimumStock} ${unit})`,
              time: 'Current alert',
              isRead: false,
              type: 'WARNING'
            });
          }
        });

        // Remove low stock alerts for products that are no longer low
        const activeLowIds = new Set(lowProducts.map(p => p.id));
        const filtered = currentAlerts.filter(a => {
          if (!a.id.startsWith('low_stock_')) return true;
          const prodId = a.id.replace('low_stock_', '').split('_')[0];
          return activeLowIds.has(prodId);
        });

        return {
          notifications: [...newAlerts, ...filtered]
        };
      })
    }),
    {
      name: 'estore_notifications',
      partialize: (state) => ({ 
        notifications: state.notifications, 
        dismissedIds: state.dismissedIds 
      })
    }
  )
);
