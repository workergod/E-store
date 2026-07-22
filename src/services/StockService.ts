import { productRepository } from '../repositories/ProductRepository';
import { stockSnapshotRepository } from '../repositories/StockSnapshotRepository';

export interface ValuationMetrics {
  totalProducts: number;
  currentStockValue: number; // Sum of (stock * cost)
  sellingValue: number;      // Sum of (stock * sellingPrice)
  potentialProfit: number;   // sellingValue - currentStockValue
  lowStockItems: number;
  outOfStockItems: number;
  damagedStock: number;
}

export interface MovementReport {
  opening: number;
  purchased: number;
  returned: number;
  issued: number;
  damaged: number;
  closing: number;
}

export const stockService = {
  getValuationMetrics: async (companyId: string): Promise<ValuationMetrics> => {
    const products = await productRepository.getAll(companyId);
    
    let currentStockValue = 0;
    let sellingValue = 0;
    let lowStockItems = 0;
    let outOfStockItems = 0;
    const damagedStock = 0; // Requires looking at ledger for DAMAGED or parsing adjustment reasons

    products.forEach(p => {
      if (p.status !== 'Active') return;
      
      const stock = p.currentStock || 0;
      const cost = p.averageCost || p.lastPurchaseCost || p.purchasePrice || 0;
      const sell = p.sellingPrice || 0;

      if (stock > 0) {
        currentStockValue += (stock * cost);
        sellingValue += (stock * sell);
      }
      
      if (stock === 0) outOfStockItems++;
      else if (stock <= (p.minimumStock || 5)) lowStockItems++;
    });

    return {
      totalProducts: products.length,
      currentStockValue,
      sellingValue,
      potentialProfit: sellingValue - currentStockValue,
      lowStockItems,
      outOfStockItems,
      damagedStock
    };
  },

  generateMonthlySnapshot: async (companyId: string, userId: string): Promise<void> => {
    // Check if snapshot exists for current month (could add date logic here)
    // For now, always generates a new snapshot when called.
    await stockSnapshotRepository.generateSnapshot(companyId, userId, false);
  }
};
