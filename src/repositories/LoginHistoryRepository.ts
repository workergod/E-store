import { collection, doc, setDoc, getDocs, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firestore';

export const loginHistoryRepository = {
  logSignIn: async (uid: string, ipAddress: string = 'Unknown', userAgent: string = navigator.userAgent) => {
    try {
      const historyRef = doc(collection(db, 'loginHistory'));
      await setDoc(historyRef, {
        uid,
        timestamp: serverTimestamp(),
        ipAddress,
        userAgent,
        status: 'SUCCESS'
      });
    } catch (error) {
      console.error('Failed to log sign in history:', error);
    }
  },
  
  logFailure: async (uid: string | null, reason: string, ipAddress: string = 'Unknown', userAgent: string = navigator.userAgent) => {
    try {
      const historyRef = doc(collection(db, 'loginHistory'));
      await setDoc(historyRef, {
        uid: uid || 'UNKNOWN',
        timestamp: serverTimestamp(),
        ipAddress,
        userAgent,
        status: 'FAILED',
        reason
      });
    } catch (error) {
      console.error('Failed to log sign in failure history:', error);
    }
  },
  
  getAllHistory: async () => {
    try {
      const q = query(collection(db, 'loginHistory'), orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Failed to fetch login history:', error);
      return [];
    }
  }
};
