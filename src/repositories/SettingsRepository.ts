import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/firestore';

export const settingsRepository = {
  getSupervisorPasswordHash: async (companyId: string): Promise<string | null> => {
    const docRef = doc(db, 'companies', companyId);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return snapshot.data().supervisorPasswordHash || null;
    }
    return null;
  },

  setSupervisorPasswordHash: async (companyId: string, hash: string): Promise<void> => {
    const docRef = doc(db, 'companies', companyId);
    await setDoc(docRef, { supervisorPasswordHash: hash }, { merge: true });
  },

  hashPassword: async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
};
