import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Printer, ShoppingBag, ReceiptText } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../../../store/authStore';
import { productRepository } from '../../../repositories/ProductRepository';
import { salesRepository, type CustomerSale } from '../../../repositories/SalesRepository';
import { PageContainer } from '../../../shared/layouts/PageContainer';
import { PageHeader } from '../../../shared/layouts/PageHeader';
import { AppButton } from '../../../shared/app/AppButton';
import { AppCard } from '../../../shared/app/AppCard';

interface SaleItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
}

export default function CustomerSalesPage() {
  const { user, company } = useAuthStore();
  const companyId = company?.companyId;
  const printRef = useRef<HTMLDivElement>(null);

  const [products, setProducts] = useState<any[]>([]);
  const [pastSales, setPastSales] = useState<CustomerSale[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [view, setView] = useState<'new' | 'history' | 'receipt'>('new');
  const [receipt, setReceipt] = useState<CustomerSale | null>(null);

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [servedBy, setServedBy] = useState(user?.fullName || '');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<SaleItem[]>([
    { productId: '', productName: '', sku: '', quantity: 1 }
  ]);

  useEffect(() => {
    if (!companyId) { return; }
    const load = async () => {
      try {
        const [prods, sales] = await Promise.all([
          productRepository.getAll(companyId),
          salesRepository.getAll(companyId)
        ]);
        setProducts(prods.filter(p => p.status === 'Active'));
        setPastSales(sales);
      } catch (e) {
        toast.error('Failed to load data');
      }
    };
    load();
  }, [companyId]);

  const handleProductSelect = (index: number, productId: string) => {
    const prod = products.find(p => p.id === productId);
    setItems(prev => prev.map((item, i) => i === index ? {
      ...item,
      productId,
      productName: prod?.name || '',
      sku: prod?.sku || '',
    } : item));
  };

  const handleQtyChange = (index: number, qty: number) => {
    setItems(prev => prev.map((item, i) => i === index ? {
      ...item,
      quantity: qty,
    } : item));
  };



  const addRow = () => setItems(prev => [...prev, { productId: '', productName: '', sku: '', quantity: 1 }]);
  const removeRow = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!companyId || !user) return;
    if (!customerName.trim()) { toast.error('Customer name is required'); return; }
    const validItems = items.filter(it => it.productId);
    if (validItems.length === 0) { toast.error('Add at least one product'); return; }
    try {
      setIsSaving(true);
      const id = await salesRepository.create({
        companyId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        servedBy: servedBy.trim() || user.fullName || 'Staff',
        saleDate: new Date(),
        items: validItems,
        notes,
      }, user.uid);
      const newReceipt = await salesRepository.getById(id);
      if (newReceipt) {
        setReceipt(newReceipt);
        setPastSales(prev => [newReceipt, ...prev]);
        setView('receipt');
        toast.success('Sale recorded successfully!');
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to save sale');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML;
    if (!printContent) return;
    const w = window.open('', '_blank', 'width=400,height=600');
    if (!w) { window.print(); return; }
    w.document.write(`
      <html><head><title>Customer Receipt</title>
      <style>
        body { font-family: 'Courier New', monospace; font-size: 13px; margin: 0; padding: 16px; max-width: 380px; }
        h2 { text-align: center; margin: 0 0 4px; font-size: 16px; }
        .center { text-align: center; }
        .divider { border-top: 1px dashed #000; margin: 8px 0; }
        table { width: 100%; border-collapse: collapse; }
        td, th { padding: 3px 4px; font-size: 12px; }
        .right { text-align: right; }
        .bold { font-weight: bold; }
        .total-row td { font-weight: bold; font-size: 14px; border-top: 1px solid #000; }
        .footer { text-align: center; margin-top: 12px; font-size: 11px; }
      </style></head><body>${printContent}</body></html>
    `);
    w.document.close();
    w.print();
  };

  const resetForm = () => {
    setCustomerName(''); setCustomerPhone(''); setNotes('');
    setItems([{ productId: '', productName: '', sku: '', quantity: 1 }]);
    setReceipt(null); setView('new');
  };

  const formatDate = (d: any) => {
    if (!d) return '';
    const date = d?.toDate ? d.toDate() : new Date(d);
    return date.toLocaleDateString('en-IN') + ' ' + date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  if (view === 'receipt' && receipt) {
    return (
      <PageContainer>
        <div className="max-w-lg mx-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Receipt Generated</h2>
            <div className="flex gap-2">
              <AppButton variant="outline" onClick={resetForm}>New Sale</AppButton>
              <AppButton onClick={handlePrint}><Printer className="h-4 w-4 mr-2" />Print Receipt</AppButton>
            </div>
          </div>

          {/* Receipt preview */}
          <AppCard className="p-6">
            <div ref={printRef}>
              <h2>{company?.companyName || 'E Store Pro'}</h2>
              <div className="center" style={{textAlign:'center',marginBottom:'8px'}}>
                <div style={{fontSize:'11px'}}>Customer Receipt</div>
                <div style={{fontSize:'11px'}}>Receipt No: {receipt.receiptNo}</div>
                <div style={{fontSize:'11px'}}>{formatDate(receipt.createdAt)}</div>
              </div>
              <div className="divider" style={{borderTop:'1px dashed #999',margin:'8px 0'}} />
              <div style={{fontSize:'12px',marginBottom:'8px'}}>
                <div><strong>Customer:</strong> {receipt.customerName}</div>
                {receipt.customerPhone && <div><strong>Phone:</strong> {receipt.customerPhone}</div>}
                <div><strong>Served by:</strong> {receipt.servedBy}</div>
              </div>
              <div className="divider" style={{borderTop:'1px dashed #999',margin:'8px 0'}} />
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{borderBottom:'1px solid #ccc'}}>
                    <th style={{textAlign:'left',padding:'3px 4px',fontSize:'11px'}}>Item</th>
                    <th style={{textAlign:'right',padding:'3px 4px',fontSize:'11px'}}>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {receipt.items.map((it, i) => (
                    <tr key={i} style={{borderBottom:'1px dotted #eee'}}>
                      <td style={{padding:'3px 4px',fontSize:'12px'}}>{it.productName}</td>
                      <td style={{textAlign:'right',padding:'3px 4px',fontSize:'12px'}}>{it.quantity}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td colSpan={2} style={{borderTop:'1px solid #ccc',padding:'2px'}} /></tr>
                </tfoot>
              </table>
              {receipt.notes && (
                <div style={{marginTop:'8px',fontSize:'11px',fontStyle:'italic'}}>Note: {receipt.notes}</div>
              )}
              <div className="footer" style={{textAlign:'center',marginTop:'12px',fontSize:'11px',color:'#666'}}>
                Thank you for your purchase!<br />Visit again
              </div>
            </div>
          </AppCard>
        </div>
      </PageContainer>
    );
  }

  if (view === 'history') {
    return (
      <PageContainer>
        <PageHeader
          title="Sales History"
          description="All customer sales transactions."
          actions={
            <div className="flex gap-2">
              <AppButton variant="outline" onClick={() => setView('new')}><Plus className="h-4 w-4 mr-2" />New Sale</AppButton>
            </div>
          }
        />
        <AppCard className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Receipt No</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">Served By</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-center">Print</th>
              </tr>
            </thead>
            <tbody>
              {pastSales.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No sales yet</td></tr>
              )}
              {pastSales.map(sale => (
                <tr key={sale.id} className="border-b border-border hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs">{sale.receiptNo}</td>
                  <td className="px-4 py-3 font-medium">{sale.customerName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{sale.customerPhone || '-'}</td>
                  <td className="px-4 py-3">{sale.servedBy}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(sale.createdAt)}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => { setReceipt(sale); setView('receipt'); }}
                      className="text-primary hover:underline text-xs"
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AppCard>
      </PageContainer>
    );
  }

  // New Sale Form
  return (
    <PageContainer>
      <PageHeader
        title="New Customer Sale"
        description="Record a sale when a customer buys products from the shop."
        actions={
          <div className="flex gap-2">
            <AppButton variant="outline" onClick={() => setView('history')}><ReceiptText className="h-4 w-4 mr-2" />Sales History</AppButton>
          </div>
        }
      />

      <div className="space-y-6">
        {/* Customer Details */}
        <AppCard className="p-6">
          <h3 className="font-semibold mb-4 text-base">Customer Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Customer Name *</label>
              <input
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="e.g. Rajan Kumar"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone Number</label>
              <input
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="e.g. 9876543210"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Served By</label>
              <input
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Staff name"
                value={servedBy}
                onChange={e => setServedBy(e.target.value)}
              />
            </div>
          </div>
        </AppCard>

        {/* Products */}
        <AppCard className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-base">Products Sold</h3>
            <AppButton type="button" variant="outline" size="sm" onClick={addRow}>
              <Plus className="h-4 w-4 mr-2" />Add Item
            </AppButton>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left">Product</th>
                  <th className="px-3 py-2 text-left w-24">Qty</th>
                  <th className="px-3 py-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="px-2 py-2">
                      <select
                        className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        value={item.productId}
                        onChange={e => handleProductSelect(i, e.target.value)}
                      >
                        <option value="">Select Product...</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name} (Stock: {p.currentStock})</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number" min="1"
                        className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        value={item.quantity}
                        onChange={e => handleQtyChange(i, Number(e.target.value))}
                      />
                    </td>
                    <td className="px-2 py-2">
                      {items.length > 1 && (
                        <button onClick={() => removeRow(i)} className="text-destructive hover:bg-destructive/10 p-1 rounded">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AppCard>

        {/* Notes */}
        <AppCard className="p-6">
          <h3 className="font-semibold mb-3 text-base">Notes (Optional)</h3>
          <textarea
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[70px] focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Any additional notes..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </AppCard>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <AppButton variant="outline" onClick={resetForm}>Clear</AppButton>
          <AppButton onClick={handleSave} disabled={isSaving}>
            <ShoppingBag className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Complete Sale & Print Receipt'}
          </AppButton>
        </div>
      </div>
    </PageContainer>
  );
}
