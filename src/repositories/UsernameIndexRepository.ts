import { db } from '../firebase/firestore';
import { doc, getDoc, runTransaction } from 'firebase/firestore';

export interface UsernameIndexDoc {
  uid: string;
  normalizedUsername: string;
  createdAt: string;
}

export const UsernameIndexRepository = {
  /**
   * Checks if a username is available.
   * Returns true if available, false if taken.
   */
  async isUsernameAvailable(normalizedUsername: string): Promise<boolean> {
    const docRef = doc(db, 'usernameIndex', normalizedUsername);
    const docSnap = await getDoc(docRef);
    return !docSnap.exists();
  },

  /**
   * Resolves a username to its internal auth email if it exists.
   * Returns null if the username doesn't exist.
   */
  async resolveUsernameToAuthEmail(normalizedUsername: string): Promise<string | null> {
    const docRef = doc(db, 'usernameIndex', normalizedUsername);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return `${normalizedUsername}@estorepro.internal`;
    }
    
    return null;
  },

  /**
   * Claims a username for a user atomically.
   * Throws an error if the username is already taken.
   */
  async claimUsername(uid: string, normalizedUsername: string): Promise<void> {
    const usernameRef = doc(db, 'usernameIndex', normalizedUsername);

    await runTransaction(db, async (transaction) => {
      const usernameDoc = await transaction.get(usernameRef);
      
      if (usernameDoc.exists()) {
        if (usernameDoc.data()?.uid === uid) {
          // Already claimed by this user
          return;
        }
        throw new Error('USERNAME_TAKEN');
      }

      transaction.set(usernameRef, {
        uid,
        normalizedUsername,
        createdAt: new Date().toISOString()
      });
    });
  }
};
