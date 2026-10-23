import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { collection, query, where, orderBy, getDocs, deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase/firestore';
import { useAuthStore } from '../../../store/authStore';
import { Role } from '../../../constants/roles';
import { employeeRepository } from '../../../repositories/EmployeeRepository';
import { productRepository } from '../../../repositories/ProductRepository';
import { stockLedgerRepository } from '../../../repositories/StockLedgerRepository';
import { PageContainer } from '../../../shared/layouts/PageContainer';
import { PageHeader } from '../../../shared/layouts/PageHeader';
import { AppButton } from '../../../shared/app/AppButton';
import { AppCard } from '../../../shared/app/AppCard';
import { AppDialog } from '../../../shared/overlays/AppDialog';
import { Printer, RefreshCw, ArrowUpRight, ArrowDownLeft, ShoppingCart, ShoppingBag, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface LogEntry {
  id: string;
  type: 'ISSUE' | 'RETURN' | 'PURCHASE';
  date: any;
  staffName: string;
  customerOrTech: string;
  items: { name: string; qty: number; unit?: string; sku?: string }[];
  notes?: string;
  status?: string;
  siteName?: string;
  additionalTechnicians?: string[];
}

const typeConfig = {
  ISSUE:    { label: 'Issue',    color: 'text-orange-600 bg-orange-50 border-orange-200', icon: ArrowUpRight },
  RETURN:   { label: 'Return',   color: 'text-green-600 bg-green-50 border-green-200',    icon: ArrowDownLeft },
  PURCHASE: { label: 'Purchase', color: 'text-blue-600 bg-blue-50 border-blue-200',       icon: ShoppingCart },
};

export default function TransactionLogPage() {
  const { company, user } = useAuthStore();
  const canDelete = user?.role === Role.SUPER_ADMIN || user?.role === Role.OWNER || (user?.role as any) === Role.MD;
  const companyId = company?.companyId;
  const printRef = useRef<HTMLDivElement>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const [filter, setFilter] = useState<'ALL' | 'ISSUE' | 'RETURN' | 'PURCHASE'>(
    (location.state as any)?.filter || 'ALL'
  );
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'date' | 'type' | 'customerOrTech' | 'staffName'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: 'date' | 'type' | 'customerOrTech' | 'staffName') => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  const loadLogs = async () => {
    if (!companyId) { setIsLoading(false); return; }
    try {
      setIsLoading(true);
      const entries: LogEntry[] = [];

      // Load employees and products for name and unit mapping
      const [employees, products] = await Promise.all([
        employeeRepository.getAll(companyId),
        productRepository.getAll(companyId)
      ]);

      const empMap: Record<string, string> = {};
      employees.forEach(e => { if (e.id) empMap[e.id] = `${e.firstName} ${e.lastName}`; });

      const prodUnitMap: Record<string, string> = {};
      const prodSkuMap: Record<string, string> = {};
      products.forEach(p => {
        if (p.id) {
          prodUnitMap[p.id] = p.unitId || (p as any).unit || 'pcs';
          prodSkuMap[p.id] = p.sku || '';
        }
      });

      // 1. Issues
      const issueSnap = await getDocs(query(
        collection(db, 'issueTransactions'),
        where('companyId', '==', companyId)
      ));
      issueSnap.forEach(doc => {
        const d = doc.data();
        entries.push({
          id: doc.id,
          type: 'ISSUE',
          date: d.createdAt,
          staffName: d.createdByName || 'Staff',
          customerOrTech: empMap[d.employeeId] || d.employeeId,
          items: (d.items || []).map((it: any) => ({
            name: it.productName,
            qty: it.issuedQty,
            unit: it.unit || prodUnitMap[it.productId] || '',
            sku: it.sku || prodSkuMap[it.productId] || ''
          })),
          notes: d.notes,
          status: d.status,
          siteName: d.siteName,
          additionalTechnicians: d.additionalTechnicians,
        });
      });

      // 2. Returns
      const returnSnap = await getDocs(query(
        collection(db, 'returnTransactions'),
        where('companyId', '==', companyId)
      ));
      returnSnap.forEach(doc => {
        const d = doc.data();
        entries.push({
          id: doc.id,
          type: 'RETURN',
          date: d.createdAt,
          staffName: d.createdByName || 'Staff',
          customerOrTech: empMap[d.employeeId] || d.employeeId,
          items: (d.items || []).map((it: any) => ({
            name: it.productName,
            qty: it.returnedQty,
            unit: it.unit || prodUnitMap[it.productId] || '',
            sku: it.sku || prodSkuMap[it.productId] || ''
          })),
          notes: d.notes,
        });
      });

      // 3. Purchase Orders
      const poSnap = await getDocs(query(
        collection(db, 'purchaseOrders'),
        where('companyId', '==', companyId)
      ));
      poSnap.forEach(doc => {
        const d = doc.data();
        entries.push({
          id: doc.id,
          type: 'PURCHASE',
          date: d.createdAt,
          staffName: d.createdBy || 'Staff',
          customerOrTech: d.supplierName || d.supplierId || 'Supplier',
          items: (d.items || []).map((it: any) => ({
            name: it.productName,
            qty: it.quantity,
            unit: it.unit || prodUnitMap[it.productId] || '',
            sku: it.sku || prodSkuMap[it.productId] || ''
          })),
          status: d.status,
          notes: d.notes,
        });
      });



      // Sort all by date descending
      entries.sort((a, b) => {
        const da = a.date?.toDate?.() || new Date(a.date || 0);
        const db2 = b.date?.toDate?.() || new Date(b.date || 0);
        return db2.getTime() - da.getTime();
      });

      setLogs(entries);
    } catch (e) {
      toast.error('Failed to load transaction log');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadLogs(); }, [companyId]);

  const handleDelete = async (id: string, type: string) => {
    if (!window.confirm('Are you sure you want to delete this transaction log? This will automatically revert the product stock balances.')) return;
    try {
      setIsLoading(true);
      const userId = useAuthStore.getState().user?.uid || 'System';

      if (type === 'ISSUE') {
        const issueRef = doc(db, 'issueTransactions', id);
        const issueSnap = await getDoc(issueRef);
        if (issueSnap.exists()) {
          const d = issueSnap.data();
          const items = d.items || [];
          for (const item of items) {
            const netQty = item.issuedQty - (item.returnedQty || 0);
            if (netQty > 0) {
              try {
                await stockLedgerRepository.recordTransaction({
                  transactionId: `adj_${Date.now()}_${Math.floor(Math.random()*1000)}`,
                  companyId: companyId!,
                  productId: item.productId,
                  transactionType: 'ADJUSTMENT',
                  referenceType: 'ADJUSTMENT',
                  quantity: netQty,
                  notes: `Reverted Issue deletion (ID: ${id})`,
                  performedBy: userId
                });
              } catch (stockErr) {
                console.warn('Failed to revert stock for product (it may have been deleted):', stockErr);
              }
            }
          }
        }
        
        const returnSnap = await getDocs(query(
          collection(db, 'returnTransactions'),
          where('issueId', '==', id)
        ));
        for (const docObj of returnSnap.docs) {
          await deleteDoc(docObj.ref);
        }
        await deleteDoc(issueRef);

      } else if (type === 'RETURN') {
        const returnRef = doc(db, 'returnTransactions', id);
        const returnSnap = await getDoc(returnRef);
        if (returnSnap.exists()) {
          const d = returnSnap.data();
          const items = d.items || [];
          for (const item of items) {
            const returnedQty = item.returnedQty || 0;
            if (returnedQty > 0) {
              try {
                await stockLedgerRepository.recordTransaction({
                  transactionId: `adj_${Date.now()}_${Math.floor(Math.random()*1000)}`,
                  companyId: companyId!,
                  productId: item.productId,
                  transactionType: 'ADJUSTMENT',
                  referenceType: 'ADJUSTMENT',
                  quantity: -returnedQty,
                  notes: `Reverted Return deletion (ID: ${id})`,
                  performedBy: userId
                });
              } catch (stockErr) {
                console.warn('Failed to revert stock for product (it may have been deleted):', stockErr);
              }
            }
          }

          if (d.issueId) {
            const issueRef = doc(db, 'issueTransactions', d.issueId);
            const issueSnap = await getDoc(issueRef);
            if (issueSnap.exists()) {
              const issueData = issueSnap.data();
              const updatedItems = (issueData.items || []).map((it: any) => {
                const retItem = items.find((ri: any) => ri.productId === it.productId);
                if (retItem) {
                  const newReturned = Math.max(0, it.returnedQty - retItem.returnedQty);
                  return {
                    ...it,
                    returnedQty: newReturned,
                    usedQty: it.issuedQty - newReturned
                  };
                }
                return it;
              });

              const anyReturned = updatedItems.some((it: any) => it.returnedQty > 0);
              const allFullyReturned = updatedItems.every((it: any) => it.returnedQty === it.issuedQty);
              const newStatus = allFullyReturned ? 'CLOSED' : (anyReturned ? 'PARTIALLY_RETURNED' : 'ISSUED');

              await updateDoc(issueRef, {
                items: updatedItems,
                status: newStatus
              });
            }
          }
        }
        await deleteDoc(returnRef);

      } else if (type === 'PURCHASE') {
        const poRef = doc(db, 'purchaseOrders', id);
        const poSnap = await getDoc(poRef);
        if (poSnap.exists()) {
          const d = poSnap.data();
          const items = d.items || [];
          for (const item of items) {
            const receivedQty = item.receivedQuantity || 0;
            if (receivedQty > 0) {
              try {
                await stockLedgerRepository.recordTransaction({
                  transactionId: `adj_${Date.now()}_${Math.floor(Math.random()*1000)}`,
                  companyId: companyId!,
                  productId: item.productId,
                  transactionType: 'ADJUSTMENT',
                  referenceType: 'ADJUSTMENT',
                  quantity: -receivedQty,
                  notes: `Reverted PO deletion (ID: ${id})`,
                  performedBy: userId
                });
              } catch (stockErr) {
                console.warn('Failed to revert stock for product (it may have been deleted):', stockErr);
              }
            }
          }
        }
        await deleteDoc(poRef);
      }

      toast.success('Transaction deleted and stock reverted successfully');
      loadLogs();
    } catch (e: any) {
      toast.error('Failed to delete transaction: ' + e.message);
      setIsLoading(false);
    }
  };

  const formatDate = (d: any) => {
    if (!d) return '-';
    try {
      const date = d?.toDate ? d.toDate() : new Date(d);
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        + ' ' + date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } catch { return '-'; }
  };

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) { window.print(); return; }
    w.document.write(`
      <html><head><title>Transaction Log Report</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
        h2 { text-align: center; margin-bottom: 4px; }
        p.sub { text-align: center; color: #666; margin-bottom: 16px; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f3f4f6; padding: 8px; text-align: left; font-size: 11px; border: 1px solid #ddd; }
        td { padding: 7px 8px; border: 1px solid #e5e7eb; font-size: 11px; vertical-align: top; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: bold; }
        .ISSUE { background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa; }
        .RETURN { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
        .PURCHASE { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
        .SALE { background: #faf5ff; color: #7c3aed; border: 1px solid #ddd6fe; }
      </style></head><body>
      ${content}
      <p style="text-align:center;margin-top:20px;font-size:10px;color:#999;">
        Printed on ${new Date().toLocaleString('en-IN')} • ${company?.companyName || 'Cryodeal'}
      </p>
      </body></html>
    `);
    w.document.close();
    w.print();
  };

  const handlePrintSingle = (log: LogEntry) => {
    const w = window.open('', '_blank', 'width=800,height=700');
    if (!w) return;
    w.document.write(`
      <html><head><title>${log.type} Receipt - ${log.id}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 13px; padding: 30px; color: #111; }
        .header { display: flex; justify-content: space-between; border-bottom: 3px solid #059669; padding-bottom: 12px; margin-bottom: 20px; }
        .title { font-size: 22px; font-weight: bold; text-transform: uppercase; color: #059669; }
        .grid { display: flex; justify-content: space-between; background: #f9fafb; padding: 14px; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { background: #059669; color: white; padding: 10px; text-align: left; font-size: 12px; }
        td { padding: 9px 10px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
        .qty { text-align: right; font-weight: bold; font-size: 14px; color: #059669; }
        .footer { margin-top: 40px; display: flex; justify-content: space-between; }
        .sig { width: 200px; border-top: 1px dashed #666; text-align: center; padding-top: 6px; font-size: 11px; font-weight: bold; }
      </style>
      </head><body>
        <div class="header">
          <div>
            <div class="title">${log.type === 'ISSUE' ? 'Material Issue Receipt' : log.type === 'RETURN' ? 'Material Return Receipt' : 'Purchase Order Receipt'}</div>
            <div style="font-size: 11px; color: #666; margin-top: 4px;">OFFICIAL RECORD</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 10px; color: #666; font-weight: bold;">TRANSACTION ID</div>
            <div style="font-family: monospace; font-weight: bold;">${log.id}</div>
          </div>
        </div>

        <div class="grid">
          <div>
            <div style="font-size: 10px; color: #666; font-weight: bold; text-transform: uppercase;">${log.type === 'PURCHASE' ? 'Supplier' : 'Issued To'}</div>
            <div style="font-size: 15px; font-weight: bold; margin-top: 2px;">${log.customerOrTech}</div>
            ${log.additionalTechnicians && log.additionalTechnicians.length > 0 ? `<div style="font-size: 11px; margin-top: 2px;">+ ${log.additionalTechnicians.join(', ')}</div>` : ''}
            ${log.siteName ? `<div style="font-size: 11px; color: #666; margin-top: 4px;">Site: <b>${log.siteName}</b></div>` : ''}
          </div>
          <div style="text-align: right;">
            <div style="font-size: 10px; color: #666; font-weight: bold;">DATE & TIME</div>
            <div style="font-weight: bold; margin-top: 2px;">${formatDate(log.date)}</div>
            <div style="font-size: 11px; color: #666; margin-top: 4px;">Staff: <b>${log.staffName}</b></div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">#</th>
              <th>Product Description</th>
              <th>SKU</th>
              <th style="text-align: right; width: 120px;">Quantity</th>
            </tr>
          </thead>
          <tbody>
            ${log.items.map((it, idx) => `
              <tr>
                <td style="text-align: center; color: #666;">${idx + 1}</td>
                <td style="font-weight: 500;">${it.name}</td>
                <td style="font-family: monospace; font-size: 11px; color: #666;">${it.sku || '-'}</td>
                <td class="qty">${it.qty} <span style="font-size: 11px; font-weight: normal; color: #666;">${it.unit || ''}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        ${log.notes ? `
          <div style="margin-top: 20px; padding: 10px; background: #fffbeb; border-left: 3px solid #f59e0b; font-size: 12px;">
            <b>Notes:</b> ${log.notes}
          </div>
        ` : ''}

        <div class="footer">
          <div class="sig">Given By (${log.staffName})</div>
          <div class="sig">Received By (Signature)</div>
        </div>
      </body></html>
    `);
    w.document.close();
    setTimeout(() => { w.print(); }, 250);
  };

  const filtered = logs.filter(l => {
    if (filter !== 'ALL' && l.type !== filter) return false;
    if (search) {
      const s = search.toLowerCase();
      return l.customerOrTech.toLowerCase().includes(s)
        || l.staffName.toLowerCase().includes(s)
        || (l.notes && l.notes.toLowerCase().includes(s))
        || (l.siteName && l.siteName.toLowerCase().includes(s))
        || (l.additionalTechnicians && l.additionalTechnicians.some(t => t.toLowerCase().includes(s)))
        || l.items.some(it => it.name.toLowerCase().includes(s));
    }
    return true;
  }).sort((a, b) => {
    let cmp = 0;
    if (sortField === 'date') {
      const timeA = a.date?.toDate ? a.date.toDate().getTime() : new Date(a.date || 0).getTime();
      const timeB = b.date?.toDate ? b.date.toDate().getTime() : new Date(b.date || 0).getTime();
      cmp = timeA - timeB;
    } else if (sortField === 'type') {
      cmp = a.type.localeCompare(b.type);
    } else if (sortField === 'customerOrTech') {
      cmp = (a.customerOrTech || '').localeCompare(b.customerOrTech || '');
    } else if (sortField === 'staffName') {
      cmp = (a.staffName || '').localeCompare(b.staffName || '');
    }
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  return (
    <PageContainer>
      <PageHeader
        title="Transaction Log"
        description="Complete record of all material issues, returns, and purchases."
        actions={
          <div className="flex gap-2">
            <AppButton variant="outline" size="sm" onClick={loadLogs} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />Refresh
            </AppButton>
            <AppButton size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />Print Report
            </AppButton>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['ALL', 'ISSUE', 'RETURN', 'PURCHASE'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filter === f
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:bg-muted'
            }`}
          >
            {f === 'ALL' ? 'All Transactions' : f.charAt(0) + f.slice(1).toLowerCase()}
            {f !== 'ALL' && (
              <span className="ml-1 opacity-70">({logs.filter(l => l.type === f).length})</span>
            )}
          </button>
        ))}
        <input
          type="text"
          placeholder="Search by name, product..."
          className="ml-auto h-8 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 w-52"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Print-ready content */}
      <div ref={printRef} className="hidden">
        <h2 style={{ textAlign: 'center', margin: '0 0 4px' }}>Transaction Log Report</h2>
        <p style={{ textAlign: 'center', fontSize: '11px', color: '#666', marginBottom: '16px' }}>
          {company?.companyName || 'Cryodeal'} • Filtered: {filter}
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ background: '#f3f4f6', padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Type</th>
              <th style={{ background: '#f3f4f6', padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Date & Time</th>
              <th style={{ background: '#f3f4f6', padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Technician</th>
              <th style={{ background: '#f3f4f6', padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Items</th>
              <th style={{ background: '#f3f4f6', padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Given By / Staff</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(log => (
              <tr key={log.id}>
                <td style={{ padding: '7px 8px', border: '1px solid #e5e7eb' }}>
                  <span className={`badge ${log.type}`}>{log.type}</span>
                </td>
                <td style={{ padding: '7px 8px', border: '1px solid #e5e7eb', fontSize: '10px' }}>{formatDate(log.date)}</td>
                <td style={{ padding: '7px 8px', border: '1px solid #e5e7eb', fontWeight: 'bold' }}>{log.customerOrTech}</td>
                <td style={{ padding: '7px 8px', border: '1px solid #e5e7eb', fontSize: '10px' }}>
                  {log.items.map(it => `${it.name} × ${it.qty} ${it.unit || ''}`.trim()).join(', ')}
                </td>
                <td style={{ padding: '7px 8px', border: '1px solid #e5e7eb' }}>{log.staffName}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ padding: '16px', textAlign: 'center', color: '#999' }}>No transactions found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* UI Table */}
      <AppCard className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading transactions...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No transactions found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
                <tr>
                  <th 
                    onClick={() => handleSort('type')}
                    className="px-4 py-3 text-left cursor-pointer select-none hover:text-foreground transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>Type</span>
                      {sortField === 'type' ? (
                        sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-30" />
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('date')}
                    className="px-4 py-3 text-left cursor-pointer select-none hover:text-foreground transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>Date & Time</span>
                      {sortField === 'date' ? (
                        sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-30" />
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('customerOrTech')}
                    className="px-4 py-3 text-left cursor-pointer select-none hover:text-foreground transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>Technician</span>
                      {sortField === 'customerOrTech' ? (
                        sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-30" />
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left">Items</th>
                  <th 
                    onClick={() => handleSort('staffName')}
                    className="px-4 py-3 text-left cursor-pointer select-none hover:text-foreground transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>Given By / Staff</span>
                      {sortField === 'staffName' ? (
                        sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-30" />
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(log => {
                  const cfg = typeConfig[log.type];
                  const Icon = cfg.icon;
                  return (
                    <tr key={log.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
                          <Icon className="h-3 w-3" /> {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(log.date)}</td>
                      <td className="px-4 py-3 font-medium">
                        {log.customerOrTech}
                        {log.additionalTechnicians && log.additionalTechnicians.length > 0 && (
                          <span className="text-muted-foreground font-normal ml-1 text-xs">
                            (+{log.additionalTechnicians.length} others)
                          </span>
                        )}
                        {log.siteName && (
                          <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-1">
                            Site: {log.siteName}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-xs">
                          {log.items.slice(0, 3).map((it, _i) => (
                            <div key={_i} className="text-xs">
                              <span className="font-medium">{it.name}</span>
                              <span className="text-muted-foreground ml-1">× {it.qty} {it.unit || ''}</span>
                            </div>
                          ))}
                          {log.items.length > 3 && (
                            <button
                              type="button"
                              onClick={() => setSelectedLog(log)}
                              className="text-xs text-primary font-semibold hover:underline mt-0.5 cursor-pointer block text-left"
                            >
                              +{log.items.length - 3} more (view all)
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{log.staffName}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <AppButton 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setSelectedLog(log)} 
                            className="text-primary hover:bg-primary/10 h-8 w-8"
                            title="View Full Items & Details"
                          >
                            <Eye className="h-4 w-4" />
                          </AppButton>
                          {canDelete && (
                            <AppButton 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDelete(log.id, log.type)} 
                              className="text-destructive hover:bg-destructive/10 h-8 w-8"
                              title="Delete Transaction"
                            >
                              <Trash2 className="h-4 w-4" />
                            </AppButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AppCard>

      {/* Transaction Details & Items Modal */}
      {selectedLog && (
        <AppDialog
          isOpen={!!selectedLog}
          onOpenChange={(open) => !open && setSelectedLog(null)}
          title={
            selectedLog.type === 'ISSUE' 
              ? 'Material Issue Details' 
              : selectedLog.type === 'RETURN' 
              ? 'Material Return Details' 
              : 'Purchase Order Details'
          }
          description={`Transaction ID: ${selectedLog.id}`}
          className="max-w-2xl max-h-[90vh] flex flex-col"
          footer={
            <div className="flex justify-between w-full">
              <AppButton variant="outline" size="sm" onClick={() => handlePrintSingle(selectedLog)}>
                <Printer className="h-4 w-4 mr-2" /> Print Receipt
              </AppButton>
              <AppButton variant="default" size="sm" onClick={() => setSelectedLog(null)}>
                Close
              </AppButton>
            </div>
          }
        >
          <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-1">
            {/* Metadata Card */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/30 border border-border text-sm">
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase">
                  {selectedLog.type === 'PURCHASE' ? 'Supplier' : 'Technician'}
                </p>
                <p className="font-bold text-foreground text-base mt-0.5">{selectedLog.customerOrTech}</p>
                {selectedLog.additionalTechnicians && selectedLog.additionalTechnicians.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    + {selectedLog.additionalTechnicians.join(', ')}
                  </p>
                )}
                {selectedLog.siteName && (
                  <p className="text-xs font-medium text-muted-foreground mt-1">
                    Site: <span className="text-foreground">{selectedLog.siteName}</span>
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground font-semibold uppercase">Date & Time</p>
                <p className="font-medium text-foreground mt-0.5">{formatDate(selectedLog.date)}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Staff: <span className="font-medium text-foreground">{selectedLog.staffName}</span>
                </p>
              </div>
              {selectedLog.notes && (
                <div className="col-span-2 p-2.5 bg-amber-500/10 border-l-2 border-amber-500 rounded-r text-xs">
                  <span className="font-bold text-amber-700 dark:text-amber-400">Notes:</span> {selectedLog.notes}
                </div>
              )}
            </div>

            {/* Complete Items Table */}
            <div>
              <div className="flex justify-between items-center mb-2 px-1">
                <h4 className="font-semibold text-sm">
                  Issued Materials List ({selectedLog.items.length} {selectedLog.items.length === 1 ? 'item' : 'items'})
                </h4>
              </div>

              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/60 text-xs text-muted-foreground uppercase">
                    <tr>
                      <th className="px-4 py-2.5 w-12 text-center">#</th>
                      <th className="px-4 py-2.5">Product Name</th>
                      <th className="px-4 py-2.5 text-right w-36">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedLog.items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5 text-center text-xs text-muted-foreground font-mono">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="font-medium text-foreground">{it.name}</div>
                          {it.sku && <div className="text-xs text-muted-foreground font-mono">{it.sku}</div>}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className="font-bold text-base text-primary">{it.qty}</span>{' '}
                          <span className="text-xs font-semibold text-muted-foreground">{it.unit || ''}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </AppDialog>
      )}
    </PageContainer>
  );
}
