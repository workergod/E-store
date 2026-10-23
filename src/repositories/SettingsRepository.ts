import { doc, getDoc, setDoc } from 'firebase/firestore';
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

  setSupervisorPasswordHash: async (companyId: string, hash: string): Promise<void> => {
    const docRef = doc(db, 'companies', companyId);
    await setDoc(docRef, { supervisorPasswordHash: hash }, { merge: true });
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
