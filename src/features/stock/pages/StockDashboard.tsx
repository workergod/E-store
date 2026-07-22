import { useState, useEffect } from 'react';
import { Package, TrendingUp, AlertTriangle, XCircle, ArrowRight } from 'lucide-react';
import { useAuthStore } from "../../../store/authStore";
import { stockService } from '../../../services/StockService';
import type { ValuationMetrics } from '../../../services/StockService';
import { Button } from '../../../shared/ui/Button';
import { useNavigate } from 'react-router-dom';

export default function StockDashboard() {
  const navigate = useNavigate();
  const { company, user } = useAuthStore();
  const companyId = company?.companyId;

  const [metrics, setMetrics] = useState<ValuationMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const loadMetrics = async () => {
      if (!companyId) return;
      try {
        setIsLoading(true);
        const data = await stockService.getValuationMetrics(companyId);
        setMetrics(data);
      } catch (error) {
        console.error("Failed to load metrics", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadMetrics();
  }, [companyId]);

  const handleGenerateSnapshot = async () => {
    if (!companyId || !user) return;
    try {
      setIsGenerating(true);
      await stockService.generateMonthlySnapshot(companyId, user.uid);
      alert('Snapshot generated successfully!');
    } catch (error) {
      alert('Failed to generate snapshot');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Stock Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of inventory valuation and alerts.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleGenerateSnapshot} disabled={isGenerating}>
            {isGenerating ? 'Generating...' : 'Run EOM Snapshot'}
          </Button>
          <Button onClick={() => navigate('/stock/adjustments')}>
            Stock Adjustments
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Calculating metrics...</div>
      ) : metrics ? (
        <>
          {/* Top Level Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
              <div className="flex items-center gap-3 text-primary mb-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Package className="h-5 w-5" />
                </div>
                <h3 className="font-medium">Total Products</h3>
              </div>
              <p className="text-3xl font-bold">{metrics.totalProducts}</p>
            </div>
          </div>

          {/* Alert Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-orange-50 dark:bg-orange-950/20 rounded-xl p-6 border border-orange-200 dark:border-orange-900 shadow-sm flex justify-between items-center cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-950/40 transition-colors" onClick={() => navigate('/products')}>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-full text-orange-600 dark:text-orange-400">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100">Low Stock Alerts</h3>
                  <p className="text-orange-700 dark:text-orange-300">{metrics.lowStockItems} products are below minimum thresholds.</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-orange-500" />
            </div>

            <div className="bg-red-50 dark:bg-red-950/20 rounded-xl p-6 border border-red-200 dark:border-red-900 shadow-sm flex justify-between items-center cursor-pointer hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors" onClick={() => navigate('/products')}>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full text-red-600 dark:text-red-400">
                  <XCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">Out of Stock</h3>
                  <p className="text-red-700 dark:text-red-300">{metrics.outOfStockItems} products have zero stock remaining.</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-red-500" />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
