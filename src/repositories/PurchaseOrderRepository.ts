import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, serverTimestamp, runTransaction, limit, orderBy } from 'firebase/firestore';
import { db } from '../firebase/firestore';
import type { PurchaseOrder } from '../shared/types/PurchaseOrder';
import { auditLogRepository } from './AuditLogRepository';
import { stockLedgerRepository } from './StockLedgerRepository';

const COLLECTION_NAME = 'purchaseOrders';
const PRICE_HISTORY_COL = 'productPriceHistory';

export const purchaseOrderRepository = {
  getCollection: () => collection(db, COLLECTION_NAME),

  generatePONumber: async (companyId: string): Promise<string> => {
    // Sequence generator for PO-YYYY-CRYOXX (e.g. PO-2026-CRYO01, PO-2026-CRYO02)
    const q = query(
      collection(db, COLLECTION_NAME),
      where('companyId', '==', companyId)
    );
    const snapshot = await getDocs(q);
    const year = new Date().getFullYear();
    const prefix = `PO-${year}-CRYO`;
    
    if (snapshot.empty) {
      return `${prefix}01`;
    }
    
    let maxNum = 0;
    snapshot.docs.forEach(docSnap => {
      const numStr = docSnap.data().poNumber as string;
      if (!numStr) return;
      // Match PO-YYYY-CRYO(\d+) or legacy PO-YYYY-(\d+)
      const match = numStr.match(/PO-\d{4}-CRYO-?(\d+)/i) || numStr.match(/PO-\d{4}-(\d+)/i);
      if (match && match[1]) {
        const val = parseInt(match[1], 10);
        if (!isNaN(val) && val > maxNum) {
          maxNum = val;
        }
      }
    });

    const nextNum = (maxNum + 1).toString().padStart(2, '0');
    return `${prefix}${nextNum}`;
  },

  getAll: async (companyId: string): Promise<PurchaseOrder[]> => {
    const q = query(collection(db, COLLECTION_NAME), where('companyId', '==', companyId));
    const snapshot = await getDocs(q);
    const pos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PurchaseOrder));
    return pos.sort((a, b) => {
      const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt as any).getTime() : 0);
      const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt as any).getTime() : 0);
      return timeB - timeA;
    });
  },

  getById: async (id: string, companyId: string): Promise<PurchaseOrder | null> => {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists() && docSnap.data().companyId === companyId) {
      return { id: docSnap.id, ...docSnap.data() } as PurchaseOrder;
    }
    return null;
  },

  create: async (poData: Omit<PurchaseOrder, 'id' | 'poNumber' | 'createdAt' | 'updatedAt'>, userId: string): Promise<string> => {
    const docRef = doc(collection(db, COLLECTION_NAME));
    const poNumber = await purchaseOrderRepository.generatePONumber(poData.companyId);
    
    const dataToSave = {
      ...poData,
      poNumber,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(docRef, dataToSave);
    await auditLogRepository.logAction(userId, poData.companyId, 'CREATE', 'PurchaseOrder', docRef.id, { poNumber });
    return docRef.id;
  },

  updateStatus: async (id: string, companyId: string, status: PurchaseOrder['status'], userId: string): Promise<void> => {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists() || docSnap.data().companyId !== companyId) {
      throw new Error('PO not found or permission denied');
    }

    const updates: any = { status, updatedAt: serverTimestamp() };
    if (status === 'Approved') {
      updates.approvedBy = userId;
    }

    await updateDoc(docRef, updates);
    await auditLogRepository.logAction(userId, companyId, 'UPDATE', 'PurchaseOrder', id, { status });
  },

  delete: async (id: string, companyId: string, userId: string): Promise<void> => {
    const poRef = doc(db, COLLECTION_NAME, id);
    const poSnap = await getDoc(poRef);
    if (!poSnap.exists() || poSnap.data().companyId !== companyId) {
      throw new Error('Purchase Order not found or permission denied');
    }

    const poData = poSnap.data() as PurchaseOrder;

    // If items were already received, revert the stock
    const items = poData.items || [];
    for (const item of items) {
      const receivedQty = item.receivedQuantity || 0;
      if (receivedQty > 0) {
        try {
          await stockLedgerRepository.recordTransaction({
            transactionId: `revert_po_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            companyId,
            productId: item.productId,
            transactionType: 'ADJUSTMENT',
            referenceType: 'ADJUSTMENT',
            quantity: -receivedQty,
            notes: `Reverted PO deletion (${poData.poNumber})`,
            performedBy: userId
          });
        } catch (stockErr) {
          console.warn('Failed to revert stock for product in PO deletion:', stockErr);
        }
      }
    }

    await deleteDoc(poRef);
    try {
      await auditLogRepository.logAction(userId, companyId, 'DELETE', 'PurchaseOrder', id, { poNumber: poData.poNumber });
    } catch (e) {
      // ignore audit log failure if rules block it
    }
  },

  receiveGoods: async (poId: string, companyId: string, receivedItems: { productId: string; qtyToReceive: number }[], userId: string): Promise<void> => {
    const poRef = doc(db, COLLECTION_NAME, poId);

    await runTransaction(db, async (transaction) => {
      const poDoc = await transaction.get(poRef);
      if (!poDoc.exists() || poDoc.data().companyId !== companyId) {
        throw new Error('PO not found');
      }

      const poData = poDoc.data() as PurchaseOrder;
      
      if (poData.status === 'Completed' || poData.status === 'Cancelled') {
        throw new Error('Cannot receive goods for a purchase that is already Completed or Cancelled');
      }

      let allCompleted = true;
      let hasReceivedAnything = false;

      const newItems = poData.items.map((item: any) => {
        const receivedItem = receivedItems.find(ri => ri.productId === item.productId);
        if (receivedItem && receivedItem.qtyToReceive > 0) {
          item.receivedQuantity = (item.receivedQuantity || 0) + receivedItem.qtyToReceive;
          hasReceivedAnything = true;
          
          // Note: In a real runTransaction, we shouldn't nest another complex service call if it also uses runTransaction, 
          // because Firestore doesn't support nested transactions.
          // For architectural purity, StockLedger update should be done natively here inside this transaction
          // Or we defer it to batched writes. We'll do it securely inline here.
          
          // productRef unused here directly but kept for structural reference
        }
        
        if (item.receivedQuantity < item.quantity) {
          allCompleted = false;
        }
        return item;
      });

      if (!hasReceivedAnything) {
        throw new Error('No valid items received');
      }

      const newStatus = allCompleted ? 'Completed' : 'Partially Received';

      transaction.update(poRef, {
        items: newItems,
        status: newStatus,
        receivedBy: userId,
        updatedAt: serverTimestamp()
      });
      
      // Inline Product & Ledger updates
      for (const receivedItem of receivedItems) {
        if (receivedItem.qtyToReceive <= 0) continue;
        
        const itemLine = poData.items.find((i: any) => i.productId === receivedItem.productId);
        if (!itemLine) continue;

        const productRef = doc(db, 'products', receivedItem.productId);
        const productDoc = await transaction.get(productRef);
        if (productDoc.exists()) {
          const productData = productDoc.data();
          const currentStock = Number(productData.currentStock) || 0;
          const newStock = Math.round((currentStock + Number(receivedItem.qtyToReceive)) * 10000) / 10000;
          
          transaction.update(productRef, {
            currentStock: newStock,
            updatedAt: serverTimestamp()
          });

          // Ledger Entry
          const newTxnRef = doc(collection(db, 'stockLedger'));
          transaction.set(newTxnRef, {
            transactionId: `TXN-${Date.now()}`,
            companyId,
            productId: itemLine.productId,
            transactionType: 'PURCHASE',
            referenceType: 'PURCHASE_ORDER',
            referenceId: poId,
            referenceNumber: poData.poNumber,
            supplierId: poData.supplierId,
            quantity: receivedItem.qtyToReceive,
            beforeQuantity: currentStock,
            afterQuantity: newStock,
            createdAt: serverTimestamp(),
            performedBy: userId
          });
          

        }
      }
    });

    await auditLogRepository.logAction(userId, companyId, 'UPDATE', 'PurchaseOrder', poId, { action: 'RECEIVE_GOODS' });
  }
};
