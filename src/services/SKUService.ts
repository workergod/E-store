import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firestore';

export const SKUService = {
  /**
   * Generates a sequential SKU for a given company.
   * Format: [PREFIX]-[6-DIGIT-SEQUENCE]
   * Example: ESP-000001
   */
  generateSequentialSKU: async (companyId: string, prefix: string = 'PRD'): Promise<string> => {
    // Note: In a high-traffic production system, we should use Firestore Transactions
    // or a dedicated counter document to guarantee no race conditions.
    // For this ERP implementation, querying the latest product is sufficient.
    
    const productsRef = collection(db, 'products');
    const q = query(
      productsRef,
      where('companyId', '==', companyId),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return `${prefix}-000001`;
    }
    
    const latestProduct = snapshot.docs[0].data();
    const latestSku: string = latestProduct.sku || '';
    
    // Extract number from end of SKU, assuming format PREFIX-XXXXXX
    const match = latestSku.match(/(\d+)$/);
    if (match) {
      const latestSequence = parseInt(match[1], 10);
      const nextSequence = (latestSequence + 1).toString().padStart(6, '0');
      return `${prefix}-${nextSequence}`;
    }
    
    // Fallback if parsing fails
    const fallbackSequence = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `${prefix}-${fallbackSequence}`;
  }
};
