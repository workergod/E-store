import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firestore';
import type { Product } from '../shared/types/Product';
import { auditLogRepository } from './AuditLogRepository';
import { SKUService } from '../services/SKUService';

export const productRepository = {
  getCollection: () => collection(db, 'products'),

  getAll: async (companyId: string): Promise<Product[]> => {
    const q = query(productRepository.getCollection(), where('companyId', '==', companyId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
  },

  getById: async (id: string, companyId: string): Promise<Product | null> => {
    const docRef = doc(db, 'products', id);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      const data = snapshot.data();
      if (data.companyId === companyId) {
        return { id: snapshot.id, ...data } as Product;
      }
    }
    return null;
  },

  checkDuplicate: async (companyId: string, sku: string, barcode?: string, name?: string, brandId?: string, excludeId?: string): Promise<string | null> => {
    if (sku) {
      const skuQ = query(productRepository.getCollection(), where('companyId', '==', companyId), where('sku', '==', sku));
      const skuSnap = await getDocs(skuQ);
      if (!skuSnap.empty && skuSnap.docs.some(d => d.id !== excludeId)) return 'SKU already exists';
    }
    if (barcode) {
      const bcQ = query(productRepository.getCollection(), where('companyId', '==', companyId), where('barcode', '==', barcode));
      const bcSnap = await getDocs(bcQ);
      if (!bcSnap.empty && bcSnap.docs.some(d => d.id !== excludeId)) return 'Barcode already exists';
    }
    return null;
  },

  create: async (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'sku'> & { sku?: string }, userId: string): Promise<string> => {
    const sku = data.sku || await SKUService.generateSequentialSKU(data.companyId);
    
    const duplicateError = await productRepository.checkDuplicate(data.companyId, sku, data.barcode, data.name, data.brandId);
    if (duplicateError) throw new Error(duplicateError);

    const now = serverTimestamp();
    const payload = {
      ...data,
      sku,
      currentStock: data.openingStock || 0,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId
    };

    const docRef = await addDoc(productRepository.getCollection(), payload);
    await auditLogRepository.logAction(userId, data.companyId, 'CREATE', 'Product', docRef.id, payload);
    return docRef.id;
  },

  // Used for seeding — skips duplicate check (caller must check SKU first)
  createDirect: async (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>, userId: string): Promise<string> => {
    const now = serverTimestamp();
    const payload = {
      ...data,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId
    };
    const docRef = await addDoc(productRepository.getCollection(), payload);
    return docRef.id;
  },

  update: async (id: string, data: Partial<Product>, companyId: string, userId: string): Promise<void> => {
    if (data.sku || data.barcode || data.name || data.brandId) {
      const duplicateError = await productRepository.checkDuplicate(
        companyId, 
        data.sku as string, 
        data.barcode as string, 
        data.name, 
        data.brandId, 
        id
      );
      if (duplicateError) throw new Error(duplicateError);
    }

    const docRef = doc(db, 'products', id);
    const payload = { ...data, updatedAt: serverTimestamp(), updatedBy: userId };

    await updateDoc(docRef, payload);
    await auditLogRepository.logAction(userId, companyId, 'UPDATE', 'Product', id, payload);
  },

  delete: async (id: string, companyId: string, userId: string): Promise<void> => {
    const docRef = doc(db, 'products', id);
    const payload = { status: 'DELETED', updatedAt: serverTimestamp(), updatedBy: userId };
    await updateDoc(docRef, payload);
    await auditLogRepository.logAction(userId, companyId, 'DELETE', 'Product', id, payload);
  }
};
