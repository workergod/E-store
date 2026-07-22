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
      where('entityId', '==', entityId)
    );
    const snapshot = await getDocs(q);
    const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DocumentRecord));
    return docs.sort((a, b) => {
      const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt as any).getTime() : 0);
      const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt as any).getTime() : 0);
      return timeB - timeA;
    });
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
