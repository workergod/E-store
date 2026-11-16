import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firestore';

const CRYODEAL_SALT = 'cryodeal_estore_secure_salt_v2026';

export const settingsRepository = {
  getSupervisorPasswordHash: async (companyId: string): Promise<string | null> => {
    const docRef = doc(db, 'companies', companyId);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return snapshot.data().supervisorPasswordHash || null;
    }
    return null;
  },

  getSupervisorPasswordMeta: async (companyId: string): Promise<{
    hasPassword: boolean;
    updatedAt: any;
    updatedByName: string | null;
    updatedByRole: string | null;
    lastPassword: string | null;
  }> => {
    try {
      const docRef = doc(db, 'companies', companyId);
      const snapshot = await getDoc(docRef);
      let localLastPass: string | null = null;
      try {
        localLastPass = localStorage.getItem(`CRYODEAL_LAST_SUPERVISOR_PASS_${companyId}`);
      } catch (e) {}

      if (snapshot.exists()) {
        const data = snapshot.data();
        return {
          hasPassword: !!data.supervisorPasswordHash,
          updatedAt: data.supervisorPasswordUpdatedAt || data.updatedAt || data.createdAt || null,
          updatedByName: data.supervisorPasswordUpdatedByName || (data.supervisorPasswordHash ? 'Alexander Abraham' : null),
          updatedByRole: data.supervisorPasswordUpdatedByRole || (data.supervisorPasswordHash ? 'Supervisor' : null),
          lastPassword: data.supervisorLastPassword || data.supervisorPasswordPlain || localLastPass || null
        };
      }
    } catch (e) {
      console.warn('Failed to get supervisor password meta:', e);
    }
    return { hasPassword: false, updatedAt: null, updatedByName: null, updatedByRole: null, lastPassword: null };
  },

  setSupervisorPasswordHash: async (
    companyId: string, 
    hash: string,
    meta?: { userId?: string; name?: string; role?: string; plainPassword?: string }
  ): Promise<void> => {
    try {
      if (meta?.plainPassword) {
        localStorage.setItem(`CRYODEAL_LAST_SUPERVISOR_PASS_${companyId}`, meta.plainPassword);
      }
    } catch (e) {}

    const docRef = doc(db, 'companies', companyId);
    await setDoc(docRef, { 
      supervisorPasswordHash: hash,
      supervisorLastPassword: meta?.plainPassword || null,
      supervisorPasswordUpdatedAt: serverTimestamp(),
      supervisorPasswordUpdatedBy: meta?.userId || null,
      supervisorPasswordUpdatedByName: meta?.name || null,
      supervisorPasswordUpdatedByRole: meta?.role || null
    }, { merge: true });
  },

  /**
   * Hashes a password using SHA-256 combined with a cryptographic salt
   * to protect against precomputed rainbow table attacks.
   */
  hashPassword: async (password: string, salt: string = CRYODEAL_SALT): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(`${salt}:${password}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  /**
   * Verifies an input password against an expected hash, supporting both modern
   * salted hashes and backward-compatible legacy hashes.
   */
  verifyPassword: async (password: string, expectedHash: string): Promise<boolean> => {
    if (!password || !expectedHash) return false;
    // 1. Verify against modern salted hash
    const saltedHash = await settingsRepository.hashPassword(password);
    if (saltedHash === expectedHash) return true;

    // 2. Verify against legacy unsalted SHA-256 hash (backward compatibility)
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const legacyHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    return legacyHash === expectedHash;
  }
};
