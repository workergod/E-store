import { create } from 'zustand';

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
  markAllRead: () => void;
  markAsRead: (id: string) => void;
  addNotification: (notification: Omit<AppNotification, 'id' | 'isRead'>) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [
    {
      id: '1',
      title: 'New Feature Live',
      message: 'Material Issues now have a beautiful new receipt layout.',
      time: 'Just now',
      isRead: false,
      type: 'SUCCESS'
    },
    {
      id: '2',
      title: 'Low Stock Alert',
      message: 'Capacitor 1.5 uF is running low (40 left)',
      time: '2 hours ago',
      isRead: false,
      type: 'WARNING'
    }
  ],
  markAllRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, isRead: true }))
  })),
  markAsRead: (id) => set((state) => ({
    notifications: state.notifications.map(n => n.id === id ? { ...n, isRead: true } : n)
  })),
  clearAll: () => set({ notifications: [] }),
  addNotification: (notification) => set((state) => ({
    notifications: [
      { ...notification, id: Date.now().toString(), isRead: false },
      ...state.notifications
    ]
  }))
}));
