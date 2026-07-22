import { ShoppingCart, PackageMinus, PackagePlus, RefreshCcw, Wrench, AlertTriangle, ArrowRight } from 'lucide-react';
import type { StockTransaction } from '../../../shared/types/StockTransaction';

interface ProductTimelineProps {
  transactions: StockTransaction[];
}

export function ProductTimeline({ transactions }: ProductTimelineProps) {
  if (transactions.length === 0) {
    return <div className="text-center text-muted-foreground p-8">No stock movements recorded yet.</div>;
  }

  const getIcon = (type: StockTransaction['transactionType']) => {
    switch (type) {
      case 'PURCHASE':
        return <ShoppingCart className="h-5 w-5 text-blue-600" />;
      case 'ISSUE':
        return <Wrench className="h-5 w-5 text-orange-600" />;
      case 'RETURN':
        return <RefreshCcw className="h-5 w-5 text-green-600" />;
      case 'ADJUSTMENT':
        return <PackagePlus className="h-5 w-5 text-purple-600" />;
      case 'TRANSFER':
        return <ArrowRight className="h-5 w-5 text-gray-600" />; // Note: ArrowRight not imported here to save space, using Refresh for now
      case 'DAMAGED':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'OPENING':
        return <PackagePlus className="h-5 w-5 text-green-600" />;
      default:
        return <PackageMinus className="h-5 w-5 text-gray-600" />;
    }
  };

  const getBackgroundColor = (type: StockTransaction['transactionType']) => {
    switch (type) {
      case 'PURCHASE': return 'bg-blue-100';
      case 'ISSUE': return 'bg-orange-100';
      case 'RETURN': return 'bg-green-100';
      case 'ADJUSTMENT': return 'bg-purple-100';
      case 'DAMAGED': return 'bg-red-100';
      case 'OPENING': return 'bg-green-100';
      default: return 'bg-gray-100';
    }
  };

  return (
    <div className="relative border-l-2 border-border ml-4 mt-6">
      {transactions.map((tx) => (
        <div key={tx.id} className="mb-8 ml-6 relative group">
          <span className={`absolute flex items-center justify-center w-10 h-10 rounded-full -left-11 ring-4 ring-background ${getBackgroundColor(tx.transactionType)}`}>
            {getIcon(tx.transactionType)}
          </span>
          <div className="bg-card border border-border p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">{tx.transactionType}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${tx.quantity > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {tx.quantity > 0 ? '+' : ''}{tx.quantity}
                </span>
              </div>
              <time className="block mb-1 text-xs font-normal text-muted-foreground">
                {tx.createdAt && typeof (tx.createdAt as any).toDate === 'function' ? (tx.createdAt as any).toDate().toLocaleDateString() : 'N/A'}
              </time>
            </div>
            
            <div className="text-sm text-muted-foreground flex gap-4">
              <span><strong>Balance:</strong> {tx.afterQuantity}</span>
              {tx.referenceNumber && <span><strong>Ref:</strong> {tx.referenceNumber}</span>}
              {tx.adjustmentReason && <span><strong>Reason:</strong> {tx.adjustmentReason}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
