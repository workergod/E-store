import { collection, doc, getDocs, setDoc, query, where, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firestore';
import type { StockSnapshot } from '../shared/types/StockSnapshot';
import { auditLogRepository } from './AuditLogRepository';

const COLLECTION_NAME = 'stockSnapshots';

export const stockSnapshotRepository = {
  getCollection: () => collection(db, COLLECTION_NAME),

  getAll: async (companyId: string): Promise<StockSnapshot[]> => {
    const q = query(
      stockSnapshotRepository.getCollection(),
      where('companyId', '==', companyId),
      orderBy('snapshotDate', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockSnapshot));
  },

  getLatest: async (companyId: string): Promise<StockSnapshot | null> => {
    const q = query(
      stockSnapshotRepository.getCollection(),
      where('companyId', '==', companyId),
      orderBy('snapshotDate', 'desc'),
      limit(1)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as StockSnapshot;
  },

  /**
   * Generates a new snapshot reading current products.
   */
  generateSnapshot: async (companyId: string, userId: string, isAutomatic: boolean = false): Promise<string> => {
    const newRef = doc(stockSnapshotRepository.getCollection());
    
    // Read all products for the company
    const productsQuery = query(collection(db, 'products'), where('companyId', '==', companyId));
    const productsSnapshot = await getDocs(productsQuery);
    
    let totalValuation = 0;
    const snapshotProducts: StockSnapshot['products'] = [];

    productsSnapshot.forEach(productDoc => {
      const p = productDoc.data();
      // Only include active products that have some stock or value tracking
      if (p.status !== 'Active' && p.currentStock === 0) return;
      
      const qty = p.currentStock || 0;
      const cost = p.averageCost || p.lastPurchaseCost || p.purchasePrice || 0;
      const val = qty * cost;

      totalValuation += val;
      
      snapshotProducts.push({
        productId: productDoc.id,
        quantity: qty,
        averageCost: cost,
        valuation: val
      });
    });

    const payload: Omit<StockSnapshot, 'id'> = {
      companyId,
      snapshotDate: serverTimestamp() as any,
      products: snapshotProducts,
      totalValuation,
      totalProducts: snapshotProducts.length,
      createdBy: userId,
      createdAt: serverTimestamp() as any,
      isAutomatic
    };

    await setDoc(newRef, payload);

    await auditLogRepository.logAction(
      userId,
      companyId,
      'CREATE',
      'StockSnapshot',
      newRef.id,
      { totalValuation, totalProducts: snapshotProducts.length }
    );

    return newRef.id;
  }
};
