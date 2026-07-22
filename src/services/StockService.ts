import { productRepository } from '../repositories/ProductRepository';
import { stockSnapshotRepository } from '../repositories/StockSnapshotRepository';

export interface ValuationMetrics {
  totalProducts: number;
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
    let lowStockItems = 0;
    let outOfStockItems = 0;
    const damagedStock = 0; // Requires looking at ledger for DAMAGED or parsing adjustment reasons

    products.forEach(p => {
      if (p.status !== 'Active') return;
      
      const stock = p.currentStock || 0;
      
      if (stock === 0) outOfStockItems++;
      else if (stock <= (p.minimumStock || 5)) lowStockItems++;
    });

    return {
      totalProducts: products.length,
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
