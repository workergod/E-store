import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firestore';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'READ' | 'SYSTEM';

export const auditLogRepository = {
  logAction: async (
    userId: string,
    companyId: string | null,
    action: AuditAction,
    resource: string,
    resourceId: string,
    details: Record<string, any> = {}
  ) => {
    try {
      const logRef = doc(collection(db, 'auditLogs'));
      await setDoc(logRef, {
        userId,
        companyId,
        action,
        resource,
        resourceId,
        details,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }
};
