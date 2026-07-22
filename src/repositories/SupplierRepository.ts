import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firestore';
import type { Supplier } from '../shared/types/Supplier';
import { auditLogRepository } from './AuditLogRepository';

const COLLECTION_NAME = 'suppliers';

export const supplierRepository = {
  getCollection: () => collection(db, COLLECTION_NAME),

  getAll: async (companyId: string): Promise<Supplier[]> => {
    const q = query(collection(db, COLLECTION_NAME), where('companyId', '==', companyId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier));
  },

  getById: async (id: string, companyId: string): Promise<Supplier | null> => {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists() && docSnap.data().companyId === companyId) {
      return { id: docSnap.id, ...docSnap.data() } as Supplier;
    }
    return null;
  },

  create: async (supplierData: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>, userId: string): Promise<string> => {
    // Check duplicate code or name
    const q = query(
      collection(db, COLLECTION_NAME), 
      where('companyId', '==', supplierData.companyId),
      where('companyName', '==', supplierData.companyName)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      throw new Error('A supplier with this name already exists.');
    }

    const docRef = doc(collection(db, COLLECTION_NAME));
    const dataToSave = {
      ...supplierData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userId,
      updatedBy: userId
    };

    await setDoc(docRef, dataToSave);
    await auditLogRepository.logAction(userId, supplierData.companyId, 'CREATE', 'Supplier', docRef.id, { companyName: supplierData.companyName });
    return docRef.id;
  },

  update: async (id: string, supplierData: Partial<Supplier>, companyId: string, userId: string): Promise<void> => {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists() || docSnap.data().companyId !== companyId) {
      throw new Error('Supplier not found or permission denied');
    }

    const dataToUpdate = {
      ...supplierData,
      updatedAt: serverTimestamp(),
      updatedBy: userId
    };

    await updateDoc(docRef, dataToUpdate);
    await auditLogRepository.logAction(userId, companyId, 'UPDATE', 'Supplier', id, { updatedFields: Object.keys(supplierData) });
  },

  delete: async (id: string, companyId: string, userId: string): Promise<void> => {
    // Soft delete recommended in practice for linked entities
    // But providing standard delete here
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists() || docSnap.data().companyId !== companyId) {
      throw new Error('Supplier not found or permission denied');
    }

    await deleteDoc(docRef);
    await auditLogRepository.logAction(userId, companyId, 'DELETE', 'Supplier', id, { deletedSupplier: docSnap.data().companyName });
  }
};
