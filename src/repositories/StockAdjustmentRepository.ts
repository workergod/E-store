import { collection, doc, getDoc, getDocs, setDoc, query, where, orderBy, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db } from '../firebase/firestore';
import type { StockAdjustment } from '../shared/types/StockAdjustment';
import { auditLogRepository } from './AuditLogRepository';

const COLLECTION_NAME = 'stockAdjustments';

export const stockAdjustmentRepository = {
  getCollection: () => collection(db, COLLECTION_NAME),

  getAll: async (companyId: string): Promise<StockAdjustment[]> => {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('companyId', '==', companyId)
    );
    const snapshot = await getDocs(q);
    const adjustments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockAdjustment));
    return adjustments.sort((a, b) => {
      const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt as any).getTime() : 0);
      const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt as any).getTime() : 0);
      return timeB - timeA;
    });
  },

  getById: async (id: string, companyId: string): Promise<StockAdjustment | null> => {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists() || docSnap.data().companyId !== companyId) return null;
    return { id: docSnap.id, ...docSnap.data() } as StockAdjustment;
  },

  create: async (data: Omit<StockAdjustment, 'id' | 'createdAt' | 'status' | 'adjustmentNumber'>, userId: string): Promise<string> => {
    const newRef = doc(stockAdjustmentRepository.getCollection());
    
    // Generate Adjustment Number (Format: ADJ-YYYY-XXXXXX)
    const year = new Date().getFullYear();
    const randomHex = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0').toUpperCase();
    const adjustmentNumber = `ADJ-${year}-${randomHex}`;

    const payload: Omit<StockAdjustment, 'id'> = {
      ...data,
      adjustmentNumber,
      status: 'Draft',
      createdAt: serverTimestamp() as any,
    };

    await setDoc(newRef, payload);

    await auditLogRepository.logAction(
      userId,
      data.companyId,
      'CREATE',
      'StockAdjustment',
      newRef.id,
      { adjustmentNumber }
    );

    return newRef.id;
  },

  approveAdjustment: async (id: string, companyId: string, userId: string): Promise<void> => {
    const adjRef = doc(db, COLLECTION_NAME, id);

    await runTransaction(db, async (transaction) => {
      const adjDoc = await transaction.get(adjRef);
      if (!adjDoc.exists()) throw new Error('Adjustment not found');
      
      const adjData = adjDoc.data() as StockAdjustment;
      if (adjData.companyId !== companyId) throw new Error('Permission denied');
      if (adjData.status !== 'Draft') throw new Error('Adjustment is already processed');

      // Loop through items and update products + create ledger entries
      for (const item of adjData.items) {
        if (item.difference === 0) continue; // No change needed

        const productRef = doc(db, 'products', item.productId);
        const productDoc = await transaction.get(productRef);
        if (!productDoc.exists()) continue; // Skip deleted products

        const pData = productDoc.data();
        const currentStock = pData.currentStock || 0;
        const newStock = currentStock + item.difference;

        // 1. Update Product
        transaction.update(productRef, {
          currentStock: newStock,
          updatedAt: serverTimestamp()
        });

        // 2. Create Ledger Entry
        const ledgerRef = doc(collection(db, 'stockLedger'));
        transaction.set(ledgerRef, {
          transactionId: `TXN-${Math.floor(Math.random() * 0xffffff).toString(16).toUpperCase()}`,
          companyId,
          productId: item.productId,
          transactionType: 'ADJUSTMENT',
          referenceType: 'MANUAL_ADJUSTMENT',
          referenceId: id,
          referenceNumber: adjData.adjustmentNumber,
          adjustmentReason: adjData.reason,
          quantity: item.difference,
          beforeQuantity: currentStock,
          afterQuantity: newStock,
          unitCost: item.unitCost,
          totalCost: item.totalValueImpact,
          createdAt: serverTimestamp(),
          performedBy: userId,
          approvedBy: userId
        });
      }

      // 3. Update Adjustment Status
      transaction.update(adjRef, {
        status: 'Approved',
        approvedBy: userId,
        updatedAt: serverTimestamp()
      });
    });

    await auditLogRepository.logAction(
      userId,
      companyId,
      'UPDATE',
      'StockAdjustment',
      id,
      { status: 'Approved' }
    );
  }
};
