import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { collection, query, where, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../../firebase/firestore';
import { useAuthStore } from '../../../store/authStore';
import { employeeRepository } from '../../../repositories/EmployeeRepository';
import { PageContainer } from '../../../shared/layouts/PageContainer';
import { PageHeader } from '../../../shared/layouts/PageHeader';
import { AppButton } from '../../../shared/app/AppButton';
import { AppCard } from '../../../shared/app/AppCard';
import { Printer, RefreshCw, ArrowUpRight, ArrowDownLeft, ShoppingCart, ShoppingBag, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface LogEntry {
  id: string;
  type: 'ISSUE' | 'RETURN' | 'PURCHASE' | 'SALE';
  date: any;
  staffName: string;
  customerOrTech: string;
  phone?: string;
  items: { name: string; qty: number; unit?: string }[];
  notes?: string;
  status?: string;
}

const typeConfig = {
  ISSUE:    { label: 'Issue',    color: 'text-orange-600 bg-orange-50 border-orange-200', icon: ArrowUpRight },
  RETURN:   { label: 'Return',   color: 'text-green-600 bg-green-50 border-green-200',    icon: ArrowDownLeft },
  PURCHASE: { label: 'Purchase', color: 'text-blue-600 bg-blue-50 border-blue-200',       icon: ShoppingCart },
  SALE:     { label: 'Sale',     color: 'text-purple-600 bg-purple-50 border-purple-200', icon: ShoppingBag },
};

export default function TransactionLogPage() {
  const { company } = useAuthStore();
  const companyId = company?.companyId;
  const printRef = useRef<HTMLDivElement>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const [filter, setFilter] = useState<'ALL' | 'ISSUE' | 'RETURN' | 'PURCHASE' | 'SALE'>(
    (location.state as any)?.filter || 'ALL'
  );
  const [search, setSearch] = useState('');

  const loadLogs = async () => {
    if (!companyId) { setIsLoading(false); return; }
    try {
      setIsLoading(true);
      const entries: LogEntry[] = [];

      // Load employees for name lookup
      const employees = await employeeRepository.getAll(companyId);
      const empMap: Record<string, string> = {};
      employees.forEach(e => { if (e.id) empMap[e.id] = `${e.firstName} ${e.lastName}`; });

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
          items: (d.items || []).map((it: any) => ({ name: it.productName, qty: it.issuedQty })),
          notes: d.notes,
          status: d.status,
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
          items: (d.items || []).map((it: any) => ({ name: it.productName, qty: it.returnedQty })),
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
          items: (d.items || []).map((it: any) => ({ name: it.productName, qty: it.quantity })),
          status: d.status,
          notes: d.notes,
        });
      });

      // 4. Customer Sales
      try {
        const saleSnap = await getDocs(query(
          collection(db, 'customerSales'),
          where('companyId', '==', companyId)
        ));
        saleSnap.forEach(doc => {
          const d = doc.data();
          entries.push({
            id: doc.id,
            type: 'SALE',
            date: d.createdAt,
            staffName: d.servedBy || 'Staff',
            customerOrTech: d.customerName,
            phone: d.customerPhone,
            items: (d.items || []).map((it: any) => ({ name: it.productName, qty: it.quantity })),
            notes: d.notes,
          });
        });
      } catch (_) { /* sales collection may not exist yet */ }

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
    if (!window.confirm('Are you sure you want to delete this transaction log? This will not revert inventory balances.')) return;
    try {
      setIsLoading(true);
      let colName = '';
      if (type === 'ISSUE') colName = 'issueTransactions';
      else if (type === 'RETURN') colName = 'returnTransactions';
      else if (type === 'PURCHASE') colName = 'purchaseOrders';
      else if (type === 'SALE') colName = 'customerSales';

      if (colName) {
        await deleteDoc(doc(db, colName, id));
        toast.success('Transaction deleted');
        loadLogs();
      }
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
        Printed on ${new Date().toLocaleString('en-IN')} • ${company?.companyName || 'E Store Pro'}
      </p>
      </body></html>
    `);
    w.document.close();
    w.print();
  };

  const filtered = logs.filter(l => {
    if (filter !== 'ALL' && l.type !== filter) return false;
    if (search) {
      const s = search.toLowerCase();
      return l.customerOrTech.toLowerCase().includes(s)
        || l.staffName.toLowerCase().includes(s)
        || l.items.some(it => it.name.toLowerCase().includes(s));
    }
    return true;
  });

  return (
    <PageContainer>
      <PageHeader
        title="Transaction Log"
        description="Complete record of all material issues, returns, purchases, and customer sales."
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
        {(['ALL', 'ISSUE', 'RETURN', 'PURCHASE', 'SALE'] as const).map(f => (
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
          {company?.companyName || 'E Store Pro'} • Filtered: {filter}
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ background: '#f3f4f6', padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Type</th>
              <th style={{ background: '#f3f4f6', padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Date & Time</th>
              <th style={{ background: '#f3f4f6', padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Technician / Customer</th>
              <th style={{ background: '#f3f4f6', padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Phone</th>
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
                <td style={{ padding: '7px 8px', border: '1px solid #e5e7eb' }}>{log.phone || '-'}</td>
                <td style={{ padding: '7px 8px', border: '1px solid #e5e7eb', fontSize: '10px' }}>
                  {log.items.map(it => `${it.name} × ${it.qty}`).join(', ')}
                </td>
                <td style={{ padding: '7px 8px', border: '1px solid #e5e7eb' }}>{log.staffName}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ padding: '16px', textAlign: 'center', color: '#999' }}>No transactions found</td></tr>
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
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Date & Time</th>
                  <th className="px-4 py-3 text-left">Technician / Customer</th>
                  <th className="px-4 py-3 text-left">Phone</th>
                  <th className="px-4 py-3 text-left">Items</th>
                  <th className="px-4 py-3 text-left">Given By / Staff</th>
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
                      <td className="px-4 py-3 font-medium">{log.customerOrTech}</td>
                      <td className="px-4 py-3 text-muted-foreground">{log.phone || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="max-w-xs">
                          {log.items.slice(0, 3).map((it, _i) => (
                            <div key={_i} className="text-xs">
                              <span className="font-medium">{it.name}</span>
                              <span className="text-muted-foreground ml-1">× {it.qty}</span>
                            </div>
                          ))}
                          {log.items.length > 3 && (
                            <div className="text-xs text-muted-foreground">+{log.items.length - 3} more</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{log.staffName}</td>
                      <td className="px-4 py-3 text-right">
                        <AppButton variant="ghost" size="icon" onClick={() => handleDelete(log.id, log.type)} className="text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4" />
                        </AppButton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AppCard>
    </PageContainer>
  );
}
