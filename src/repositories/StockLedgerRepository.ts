import { collection, doc, runTransaction, serverTimestamp, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firestore';
import type { StockTransaction } from '../shared/types/StockTransaction';
import { auditLogRepository } from './AuditLogRepository';

export const stockLedgerRepository = {
  getCollection: () => collection(db, 'stockLedger'),

  getHistoryByProduct: async (productId: string, companyId: string): Promise<StockTransaction[]> => {
    const q = query(
      stockLedgerRepository.getCollection(),
      where('companyId', '==', companyId),
      where('productId', '==', productId),
      orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockTransaction));
  },

  /**
   * Safely records a transaction and updates the cached currentStock on the Product atomically.
   */
  recordTransaction: async (transactionData: Omit<StockTransaction, 'id' | 'createdAt' | 'beforeQuantity' | 'afterQuantity'>): Promise<void> => {
    const productRef = doc(db, 'products', transactionData.productId);
    const newTxnRef = doc(stockLedgerRepository.getCollection());

    await runTransaction(db, async (transaction) => {
      const productDoc = await transaction.get(productRef);
      if (!productDoc.exists()) {
        throw new Error('Product does not exist');
      }

      const productData = productDoc.data();
      if (productData.companyId !== transactionData.companyId) {
        throw new Error('Permission denied');
      }

      const currentStock = productData.currentStock || 0;
      const newStock = currentStock + transactionData.quantity;

      // Prepare final transaction payload
      const txnPayload: any = {
        ...transactionData,
        beforeQuantity: currentStock,
        afterQuantity: newStock,
        createdAt: serverTimestamp()
      };

      // 1. Update Product Cache
      transaction.update(productRef, { currentStock: newStock, updatedAt: serverTimestamp() });
      
      // 2. Insert Ledger Record
      transaction.set(newTxnRef, txnPayload);
    });

    await auditLogRepository.logAction(
      transactionData.performedBy, 
      transactionData.companyId, 
      'CREATE', 
      'StockTransaction', 
      newTxnRef.id, 
      { transactionType: transactionData.transactionType, quantity: transactionData.quantity }
    );
  }
};
