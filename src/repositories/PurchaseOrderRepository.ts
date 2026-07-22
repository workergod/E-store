import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, serverTimestamp, runTransaction, limit, orderBy } from 'firebase/firestore';
import { db } from '../firebase/firestore';
import type { PurchaseOrder } from '../shared/types/PurchaseOrder';
import { auditLogRepository } from './AuditLogRepository';

const COLLECTION_NAME = 'purchaseOrders';
const PRICE_HISTORY_COL = 'productPriceHistory';

export const purchaseOrderRepository = {
  getCollection: () => collection(db, COLLECTION_NAME),

  generatePONumber: async (companyId: string): Promise<string> => {
    // Simple sequence generator: find last PO and increment
    const q = query(
      collection(db, COLLECTION_NAME),
      where('companyId', '==', companyId),
      orderBy('poNumber', 'desc'),
      limit(1)
    );
    const snapshot = await getDocs(q);
    const year = new Date().getFullYear();
    if (snapshot.empty) {
      return `PO-${year}-000001`;
    }
    const lastPO = snapshot.docs[0].data().poNumber as string;
    const parts = lastPO.split('-');
    if (parts.length === 3) {
      const lastNum = parseInt(parts[2], 10);
      const nextNum = (lastNum + 1).toString().padStart(6, '0');
      return `PO-${year}-${nextNum}`;
    }
    return `PO-${year}-000001`;
  },

  getAll: async (companyId: string): Promise<PurchaseOrder[]> => {
    const q = query(collection(db, COLLECTION_NAME), where('companyId', '==', companyId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PurchaseOrder));
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

  receiveGoods: async (poId: string, companyId: string, receivedItems: { productId: string; qtyToReceive: number }[], userId: string): Promise<void> => {
    const poRef = doc(db, COLLECTION_NAME, poId);

    await runTransaction(db, async (transaction) => {
      const poDoc = await transaction.get(poRef);
      if (!poDoc.exists() || poDoc.data().companyId !== companyId) {
        throw new Error('PO not found');
      }

      const poData = poDoc.data() as PurchaseOrder;
      
      if (poData.status !== 'Approved' && poData.status !== 'Partially Received') {
        throw new Error('Cannot receive goods for a PO that is not Approved or Partially Received');
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
          const currentStock = productData.currentStock || 0;
          const newStock = currentStock + receivedItem.qtyToReceive;
          
          // Cost tracking updates
          const lastPurchaseCost = itemLine.unitCost;
          
          transaction.update(productRef, {
            currentStock: newStock,
            lastPurchaseCost: lastPurchaseCost,
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
            unitCost: itemLine.unitCost,
            totalCost: itemLine.unitCost * receivedItem.qtyToReceive,
            createdAt: serverTimestamp(),
            performedBy: userId
          });
          
          // Product Price History Entry if cost changed (simplified)
          if (productData.lastPurchaseCost !== lastPurchaseCost) {
             const phRef = doc(collection(db, PRICE_HISTORY_COL));
             transaction.set(phRef, {
               companyId,
               productId: itemLine.productId,
               purchaseOrderId: poId,
               supplierId: poData.supplierId,
               oldCost: productData.lastPurchaseCost || 0,
               newCost: lastPurchaseCost,
               effectiveDate: serverTimestamp(),
               performedBy: userId
             });
          }
        }
      }
    });

    await auditLogRepository.logAction(userId, companyId, 'UPDATE', 'PurchaseOrder', poId, { action: 'RECEIVE_GOODS' });
  }
};
