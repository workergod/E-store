import { collection, doc, getDocs, setDoc, query, where, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firestore';
import type { StockSnapshot } from '../shared/types/StockSnapshot';
import { auditLogRepository } from './AuditLogRepository';

const COLLECTION_NAME = 'stockSnapshots';

export const stockSnapshotRepository = {
  getCollection: () => collection(db, COLLECTION_NAME),

  getSnapshots: async (companyId: string): Promise<StockSnapshot[]> => {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('companyId', '==', companyId)
    );
    const snap = await getDocs(q);
    const snapshots = snap.docs.map(d => ({ id: d.id, ...d.data() } as StockSnapshot));
    return snapshots.sort((a, b) => {
      const timeA = a.snapshotDate?.toDate ? a.snapshotDate.toDate().getTime() : (a.snapshotDate ? new Date(a.snapshotDate as any).getTime() : 0);
      const timeB = b.snapshotDate?.toDate ? b.snapshotDate.toDate().getTime() : (b.snapshotDate ? new Date(b.snapshotDate as any).getTime() : 0);
      return timeB - timeA;
    });
  },

  getLatest: async (companyId: string): Promise<StockSnapshot | null> => {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('companyId', '==', companyId)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const snapshots = snap.docs.map(d => ({ id: d.id, ...d.data() } as StockSnapshot));
    snapshots.sort((a, b) => {
      const timeA = a.snapshotDate?.toDate ? a.snapshotDate.toDate().getTime() : (a.snapshotDate ? new Date(a.snapshotDate as any).getTime() : 0);
      const timeB = b.snapshotDate?.toDate ? b.snapshotDate.toDate().getTime() : (b.snapshotDate ? new Date(b.snapshotDate as any).getTime() : 0);
      return timeB - timeA;
    });
    return snapshots[0];
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
