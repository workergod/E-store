import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from "../../../store/authStore";
import { stockAdjustmentRepository } from '../../../repositories/StockAdjustmentRepository';
import type { StockAdjustment } from '../../../shared/types/StockAdjustment';
import { Button } from '../../../shared/ui/Button';
import { Input } from '../../../shared/ui/Input';

export default function StockAdjustmentsPage() {
  const navigate = useNavigate();
  const { company } = useAuthStore();
  const companyId = company?.companyId;

  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    if (!companyId) return;
    try {
      setIsLoading(true);
      const data = await stockAdjustmentRepository.getAll(companyId);
      setAdjustments(data);
    } catch (error) {
      toast.error('Failed to load adjustments');
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const filtered = adjustments.filter(adj => 
    adj.adjustmentNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
    adj.reason.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Stock Adjustments</h1>
          <p className="text-muted-foreground mt-1">Manage physical counts and manual stock corrections.</p>
        </div>
        <Button onClick={() => navigate('/stock/adjustments/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Adjustment
        </Button>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by ID or Reason..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading adjustments...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <h3 className="text-lg font-semibold">No adjustments found</h3>
            <p className="text-muted-foreground mt-1">Run a physical count or correct stock levels.</p>
            <Button onClick={() => navigate('/stock/adjustments/new')} className="mt-6" variant="outline">Create Adjustment</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3">Adjustment Number</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Reason</th>
                  <th className="px-6 py-3">Items Adjusted</th>
                  <th className="px-6 py-3 text-right">Value Impact</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((adj) => (
                  <tr key={adj.id} className="border-b border-border hover:bg-muted/50">
                    <td className="px-6 py-4 font-medium">{adj.adjustmentNumber}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {adj.createdAt && typeof (adj.createdAt as any).toDate === 'function' ? (adj.createdAt as any).toDate().toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4">{adj.reason}</td>
                    <td className="px-6 py-4">{adj.items.length} items</td>
                    <td className={`px-6 py-4 text-right font-medium ${adj.totalValueImpact > 0 ? 'text-green-600' : adj.totalValueImpact < 0 ? 'text-red-500' : ''}`}>
                      ${adj.totalValueImpact.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        adj.status === 'Draft' ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {adj.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/stock/adjustments/${adj.id}`)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
