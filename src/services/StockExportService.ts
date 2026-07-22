import type { Product } from '../shared/types/Product';
import type { StockTransaction } from '../shared/types/StockTransaction';
import type { StockAdjustment } from '../shared/types/StockAdjustment';

export const stockExportService = {
  exportCurrentStock: (products: Product[]) => {
    console.log(`Exporting ${products.length} current stock items to CSV/Excel...`);
  },

  exportLedger: (transactions: StockTransaction[]) => {
    console.log(`Exporting ${transactions.length} ledger transactions to CSV/Excel...`);
  },

  exportAdjustments: (adjustments: StockAdjustment[]) => {
    console.log(`Exporting ${adjustments.length} adjustments to CSV/Excel...`);
  }
};
