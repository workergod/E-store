import { create } from 'zustand';

interface AppSettings {
  notificationsEnabled: boolean;
  language: string;
  currency: string;
  autoPrintReceipts: boolean;
}

interface SettingsState {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: {
    notificationsEnabled: true,
    language: 'en',
    currency: 'USD',
    autoPrintReceipts: false,
  },
  updateSettings: (newSettings) => 
    set((state) => ({
      settings: { ...state.settings, ...newSettings }
    })),
}));
