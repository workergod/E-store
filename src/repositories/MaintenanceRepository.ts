import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firestore';

export interface MaintenanceSettings {
  isEnabled: boolean;
  estimatedHours: number;
  message: string;
  updatedAt?: any;
}

const defaultSettings: MaintenanceSettings = {
  isEnabled: false,
  estimatedHours: 2,
  message: 'We are currently performing scheduled maintenance to upgrade our systems. We will be back online shortly.'
};

export const maintenanceRepository = {
  // Using the companies collection because firestore.rules already permits authenticated reads here
  docRef: doc(db, 'companies', 'system_maintenance'),

  async getSettings(): Promise<MaintenanceSettings> {
    try {
      const snap = await getDoc(this.docRef);
      if (snap.exists()) {
        return snap.data() as MaintenanceSettings;
      }
      return defaultSettings;
    } catch (error) {
      console.error('Failed to fetch maintenance settings:', error);
      return defaultSettings;
    }
  },

  async updateSettings(settings: Partial<MaintenanceSettings>): Promise<void> {
    try {
      await setDoc(this.docRef, {
        ...settings,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('Failed to update maintenance settings:', error);
      throw error;
    }
  },

  subscribe(callback: (settings: MaintenanceSettings) => void) {
    return onSnapshot(this.docRef, (doc) => {
      if (doc.exists()) {
        callback(doc.data() as MaintenanceSettings);
      } else {
        callback(defaultSettings);
      }
    }, (error) => {
      console.error('Maintenance subscription error:', error);
      // If there's an error (e.g. permission denied), default to open so we don't hang the app
      callback(defaultSettings);
    });
  }
};
