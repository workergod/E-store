import { collection, doc, getDocs, setDoc, deleteDoc, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firestore';
import type { DocumentRecord, EntityType } from '../shared/types/Document';
import { auditLogRepository } from './AuditLogRepository';

const COLLECTION_NAME = 'documents';

export const documentRepository = {
  getCollection: () => collection(db, COLLECTION_NAME),

  getByEntity: async (companyId: string, entityType: EntityType, entityId: string): Promise<DocumentRecord[]> => {
    const q = query(
      documentRepository.getCollection(),
      where('companyId', '==', companyId),
      where('entityType', '==', entityType),
      where('entityId', '==', entityId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DocumentRecord));
  },

  create: async (data: Omit<DocumentRecord, 'id' | 'createdAt'>, userId: string): Promise<string> => {
    const newRef = doc(documentRepository.getCollection());
    
    const payload: Omit<DocumentRecord, 'id'> = {
      ...data,
      createdAt: serverTimestamp() as any,
    };

    await setDoc(newRef, payload);

    await auditLogRepository.logAction(
      userId,
      data.companyId,
      'CREATE',
      'Document',
      newRef.id,
      { fileName: data.fileName, entityType: data.entityType, entityId: data.entityId }
    );

    return newRef.id;
  },

  delete: async (id: string, companyId: string, userId: string): Promise<void> => {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);

    await auditLogRepository.logAction(
      userId,
      companyId,
      'DELETE',
      'Document',
      id,
      {}
    );
  }
};
