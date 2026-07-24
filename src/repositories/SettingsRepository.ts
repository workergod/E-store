import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/firestore';

export const settingsRepository = {
  getSupervisorPasswordHash: async (companyId: string): Promise<string | null> => {
    const docRef = doc(db, 'settings', `supervisor_${companyId}`);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return snapshot.data().passwordHash;
    }
    return null;
  },

  setSupervisorPasswordHash: async (companyId: string, hash: string): Promise<void> => {
    const docRef = doc(db, 'settings', `supervisor_${companyId}`);
    await setDoc(docRef, { passwordHash: hash }, { merge: true });
  },

  hashPassword: async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
};
