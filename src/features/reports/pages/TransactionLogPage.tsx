import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  collection, query, where, getDocs, deleteDoc, doc, getDoc, updateDoc, 
  serverTimestamp, Timestamp 
} from 'firebase/firestore';
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
import { ProductSearchSelect } from '../../../shared/forms/ProductSearchSelect';
import type { Employee } from '../../../shared/types/Employee';
import type { Product } from '../../../shared/types/Product';
import { 
  Printer, RefreshCw, ArrowUpRight, ArrowDownLeft, ShoppingCart, 
  Trash2, ArrowUpDown, ArrowUp, ArrowDown, Eye, Pencil, Plus, Clock, History
} from 'lucide-react';
import { toast } from 'sonner';
import { escapeHtml } from '../../../shared/utils/security';

interface LogItem {
  productId: string;
  name: string;
  qty: number;
  unit?: string;
  sku?: string;
  returnedQty?: number;
}

interface EditHistoryRecord {
  editedByName: string;
  editedByRole: string;
  editedById: string;
  editedAt: any;
  notes?: string;
}

interface LogEntry {
  id: string;
  type: 'ISSUE' | 'RETURN' | 'PURCHASE';
  issueNumber?: string;
  isDirectReturn?: boolean;
  directReturnNumber?: string;
  date: any;
  staffName: string;
  customerOrTech: string;
  employeeId?: string;
  items: LogItem[];
  rawItems?: any[];
  notes?: string;
  status?: string;
  siteName?: string;
  additionalTechnicians?: string[];
  lastEditedByName?: string;
  lastEditedByRole?: string;
  lastEditedById?: string;
  lastEditedAt?: any;
  editHistory?: EditHistoryRecord[];
}

interface EditFormState {
  id: string;
  type: 'ISSUE' | 'RETURN' | 'PURCHASE';
  issueNumber?: string;
  isDirectReturn?: boolean;
  directReturnNumber?: string;
  dateStr: string;
  staffName: string;
  employeeId: string;
  customerOrTech: string;
  siteName: string;
  additionalTechnicians: string[];
  notes: string;
  items: {
    productId: string;
    name: string;
    sku?: string;
    unit?: string;
    qty: number;
    originalQty: number;
  }[];
  editReason: string;
}

const typeConfig = {
  ISSUE:    { label: 'Issue',    color: 'text-orange-600 bg-orange-50 border-orange-200', icon: ArrowUpRight },
  RETURN:   { label: 'Return',   color: 'text-green-600 bg-green-50 border-green-200',    icon: ArrowDownLeft },
  PURCHASE: { label: 'Purchase', color: 'text-blue-600 bg-blue-50 border-blue-200',       icon: ShoppingCart },
};

export default function TransactionLogPage() {
  const { company, user } = useAuthStore();
  const roleLower = (user?.role || '').toString().toLowerCase();
  const isSuperOrOwner = roleLower === 'superadmin' || roleLower === 'owner' || roleLower === 'md' || roleLower === 'admin';
  const isStoreKeeper = roleLower === 'store keeper' || roleLower === 'storekeeper' || roleLower === 'store_keeper';
  
  // Both SuperAdmin/Owner/Admin AND Store Keeper can edit & delete transactions
  const canDelete = isSuperOrOwner || isStoreKeeper;
  const canEdit = true;
  const companyId = company?.companyId;
  const printRef = useRef<HTMLDivElement>(null);
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const [filter, setFilter] = useState<'ALL' | 'ISSUE' | 'RETURN' | 'PURCHASE'>(
    (location.state as any)?.filter || 'ALL'
  );
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'date' | 'type' | 'customerOrTech' | 'staffName'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  // Edit Modal State
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [selectedNewProductId, setSelectedNewProductId] = useState<string>('');
  const [newProductQty, setNewProductQty] = useState<string>('1');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  const handleSort = (field: 'date' | 'type' | 'customerOrTech' | 'staffName') => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const loadLogs = async () => {
    if (!companyId) { setIsLoading(false); return; }
    try {
      setIsLoading(true);
      const entries: LogEntry[] = [];

      // Load employees and products for name and unit mapping
      const [empList, prodList] = await Promise.all([
        employeeRepository.getAll(companyId),
        productRepository.getAll(companyId)
      ]);

      setEmployees(empList);
      setProducts(prodList);

      const empMap: Record<string, string> = {};
      empList.forEach(e => { if (e.id) empMap[e.id] = `${e.firstName} ${e.lastName}`; });

      const prodUnitMap: Record<string, string> = {};
      const prodSkuMap: Record<string, string> = {};
      prodList.forEach(p => {
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
      issueSnap.forEach(docSnap => {
        const d = docSnap.data();
        entries.push({
          id: docSnap.id,
          type: 'ISSUE',
          issueNumber: d.issueNumber || null,
          date: d.createdAt,
          staffName: d.createdByName || 'Staff',
          customerOrTech: empMap[d.employeeId] || d.employeeId,
          employeeId: d.employeeId,
          items: (d.items || []).map((it: any) => ({
            productId: it.productId,
            name: it.productName,
            qty: it.issuedQty,
            returnedQty: it.returnedQty || 0,
            unit: it.unit || prodUnitMap[it.productId] || '',
            sku: it.sku || prodSkuMap[it.productId] || ''
          })),
          rawItems: d.items || [],
          notes: d.notes,
          status: d.status,
          siteName: d.siteName,
          additionalTechnicians: d.additionalTechnicians,
          lastEditedByName: d.lastEditedByName,
          lastEditedByRole: d.lastEditedByRole,
          lastEditedById: d.lastEditedById,
          lastEditedAt: d.lastEditedAt,
          editHistory: d.editHistory || [],
        });
      });

      // 2. Returns
      const returnSnap = await getDocs(query(
        collection(db, 'returnTransactions'),
        where('companyId', '==', companyId)
      ));
      returnSnap.forEach(docSnap => {
        const d = docSnap.data();
        const isDirect = Boolean(d.isDirectReturn || d.issueId === 'DIRECT_RETURN');
        const directReturnNumber = d.directReturnNumber || (isDirect ? 'CRYO(W/O)-1' : null);
        const resolvedTechName = empMap[d.employeeId] || (d.employeeName && d.employeeName !== 'UNLINKED' ? d.employeeName : (isDirect ? 'Direct Return' : d.employeeId));

        entries.push({
          id: docSnap.id,
          type: 'RETURN',
          issueNumber: d.issueNumber || null,
          isDirectReturn: isDirect,
          directReturnNumber: directReturnNumber || undefined,
          date: d.createdAt,
          staffName: d.createdByName || 'Staff',
          customerOrTech: resolvedTechName,
          employeeId: d.employeeId,
          items: (d.items || []).map((it: any) => ({
            productId: it.productId,
            name: it.productName,
            qty: it.returnedQty,
            unit: it.unit || prodUnitMap[it.productId] || '',
            sku: it.sku || prodSkuMap[it.productId] || ''
          })),
          rawItems: d.items || [],
          notes: d.notes,
          lastEditedByName: d.lastEditedByName,
          lastEditedByRole: d.lastEditedByRole,
          lastEditedById: d.lastEditedById,
          lastEditedAt: d.lastEditedAt,
          editHistory: d.editHistory || [],
        });
      });

      // 3. Purchase Orders
      const poSnap = await getDocs(query(
        collection(db, 'purchaseOrders'),
        where('companyId', '==', companyId)
      ));
      poSnap.forEach(docSnap => {
        const d = docSnap.data();
        entries.push({
          id: docSnap.id,
          type: 'PURCHASE',
          issueNumber: d.poNumber || null,
          date: d.createdAt,
          staffName: d.createdBy || 'Staff',
          customerOrTech: d.supplierName || d.supplierId || 'Supplier',
          items: (d.items || []).map((it: any) => ({
            productId: it.productId,
            name: it.productName,
            qty: it.quantity,
            unit: it.unit || prodUnitMap[it.productId] || '',
            sku: it.sku || prodSkuMap[it.productId] || ''
          })),
          rawItems: d.items || [],
          status: d.status,
          notes: d.notes,
          lastEditedByName: d.lastEditedByName,
          lastEditedByRole: d.lastEditedByRole,
          lastEditedById: d.lastEditedById,
          lastEditedAt: d.lastEditedAt,
          editHistory: d.editHistory || [],
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

  const handleOpenEdit = (log: LogEntry) => {
    let dateStr = '';
    try {
      const d = log.date?.toDate ? log.date.toDate() : new Date(log.date || Date.now());
      const pad = (n: number) => n.toString().padStart(2, '0');
      dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      dateStr = new Date().toISOString().slice(0, 16);
    }

    setEditForm({
      id: log.id,
      type: log.type,
      issueNumber: log.issueNumber,
      isDirectReturn: log.isDirectReturn,
      directReturnNumber: log.directReturnNumber,
      dateStr,
      staffName: log.staffName,
      employeeId: log.employeeId || '',
      customerOrTech: log.customerOrTech || '',
      siteName: log.siteName || '',
      additionalTechnicians: [...(log.additionalTechnicians || [])],
      notes: log.notes || '',
      items: log.items.map(it => ({
        productId: it.productId || '',
        name: it.name,
        sku: it.sku || '',
        unit: it.unit || '',
        qty: it.qty,
        originalQty: it.qty
      })),
      editReason: ''
    });
    setSelectedNewProductId('');
    setNewProductQty('1');
  };

  const handleSaveEdit = async () => {
    if (!editForm || !companyId) return;
    if (editForm.items.length === 0) {
      toast.error('Transaction must have at least one product item');
      return;
    }
    for (const it of editForm.items) {
      if (it.qty <= 0) {
        toast.error(`Quantity for "${it.name}" must be greater than 0`);
        return;
      }
    }

    setIsSavingEdit(true);
    try {
      const editorName = user?.fullName || user?.username || (isStoreKeeper ? 'Store Keeper' : 'Staff');
      const editorRole = (user?.role as string) || (isStoreKeeper ? 'Store Keeper' : 'Staff');
      const editorId = user?.uid || 'System';
      const nowTimestamp = serverTimestamp();
      const newTxDate = Timestamp.fromDate(new Date(editForm.dateStr || Date.now()));

      const editAuditRecord: EditHistoryRecord = {
        editedByName: editorName,
        editedByRole: editorRole,
        editedById: editorId,
        editedAt: new Date().toISOString(),
        notes: editForm.editReason.trim() || 'Transaction details edited'
      };

      if (editForm.type === 'ISSUE') {
        const issueRef = doc(db, 'issueTransactions', editForm.id);
        const issueSnap = await getDoc(issueRef);
        if (!issueSnap.exists()) throw new Error('Transaction record not found');
        const origData = issueSnap.data();
        const origItems: any[] = origData.items || [];

        // 1. Reconcile Stock differences
        for (const it of editForm.items) {
          const match = origItems.find((oi: any) => oi.productId === it.productId);
          const oldIssued = match ? Number(match.issuedQty) || 0 : 0;
          const diff = it.qty - oldIssued; // diff > 0 => issued more, stock decreases
          if (diff !== 0 && it.productId) {
            await stockLedgerRepository.recordTransaction({
              transactionId: `adj_${Date.now()}_${Math.floor(Math.random()*1000)}`,
              companyId,
              productId: it.productId,
              transactionType: 'ADJUSTMENT',
              referenceId: editForm.id,
              referenceType: 'ISSUE',
              quantity: -diff,
              notes: `Issue Edit (${editForm.id}) by ${editorName} (${editorRole})`,
              performedBy: editorId
            });
          }
        }

        // For removed items
        for (const oi of origItems) {
          const exists = editForm.items.some(it => it.productId === oi.productId);
          if (!exists && oi.productId) {
            const netIssued = (Number(oi.issuedQty) || 0) - (Number(oi.returnedQty) || 0);
            if (netIssued > 0) {
              await stockLedgerRepository.recordTransaction({
                transactionId: `adj_${Date.now()}_${Math.floor(Math.random()*1000)}`,
                companyId,
                productId: oi.productId,
                transactionType: 'ADJUSTMENT',
                referenceId: editForm.id,
                referenceType: 'ISSUE',
                quantity: netIssued,
                notes: `Issue Item Removed during Edit (${editForm.id}) by ${editorName}`,
                performedBy: editorId
              });
            }
          }
        }

        // Format updated items array
        const updatedItems = editForm.items.map(it => {
          const match = origItems.find((oi: any) => oi.productId === it.productId);
          const returnedQty = match ? Number(match.returnedQty) || 0 : 0;
          const issuedQty = Number(it.qty) || 0;
          return {
            productId: it.productId,
            productName: it.name,
            sku: it.sku || '',
            unit: it.unit || 'pcs',
            issuedQty,
            returnedQty,
            usedQty: Math.max(0, issuedQty - returnedQty)
          };
        });

        const anyRet = updatedItems.some(it => it.returnedQty > 0);
        const allRet = updatedItems.every(it => it.returnedQty >= it.issuedQty);
        const status = allRet ? 'CLOSED' : (anyRet ? 'PARTIALLY_RETURNED' : 'ISSUED');

        const existingHistory = origData.editHistory || [];

        await updateDoc(issueRef, {
          employeeId: editForm.employeeId,
          siteName: editForm.siteName,
          additionalTechnicians: editForm.additionalTechnicians,
          notes: editForm.notes,
          items: updatedItems,
          status,
          createdAt: newTxDate,
          updatedAt: nowTimestamp,
          updatedBy: editorId,
          lastEditedByName: editorName,
          lastEditedByRole: editorRole,
          lastEditedById: editorId,
          lastEditedAt: nowTimestamp,
          editHistory: [...existingHistory, editAuditRecord]
        });

      } else if (editForm.type === 'RETURN') {
        const returnRef = doc(db, 'returnTransactions', editForm.id);
        const returnSnap = await getDoc(returnRef);
        if (!returnSnap.exists()) throw new Error('Transaction record not found');
        const origData = returnSnap.data();
        const origItems: any[] = origData.items || [];

        // Stock reconciliation for return
        for (const it of editForm.items) {
          const match = origItems.find((oi: any) => oi.productId === it.productId);
          const oldRet = match ? Number(match.returnedQty) || 0 : 0;
          const diff = it.qty - oldRet; // diff > 0 => returned more to store, stock increases
          if (diff !== 0 && it.productId) {
            await stockLedgerRepository.recordTransaction({
              transactionId: `adj_${Date.now()}_${Math.floor(Math.random()*1000)}`,
              companyId,
              productId: it.productId,
              transactionType: 'ADJUSTMENT',
              referenceId: editForm.id,
              referenceType: 'RETURN',
              quantity: diff,
              notes: `Return Edit (${editForm.id}) by ${editorName} (${editorRole})`,
              performedBy: editorId
            });
          }
        }

        // If linked to issueId (and not direct return), sync return quantities
        if (origData.issueId && origData.issueId !== 'DIRECT_RETURN') {
          const issueRef = doc(db, 'issueTransactions', origData.issueId);
          const issueSnap = await getDoc(issueRef);
          if (issueSnap.exists()) {
            const issueData = issueSnap.data();
            const issueItems = (issueData.items || []).map((it: any) => {
              const retItem = editForm.items.find(ri => ri.productId === it.productId);
              const origRetItem = origItems.find((oi: any) => oi.productId === it.productId);
              if (retItem) {
                const delta = Number(retItem.qty) - (origRetItem ? Number(origRetItem.returnedQty) || 0 : 0);
                const newRet = Math.max(0, (it.returnedQty || 0) + delta);
                return {
                  ...it,
                  returnedQty: newRet,
                  usedQty: Math.max(0, it.issuedQty - newRet)
                };
              }
              return it;
            });
            const anyRet = issueItems.some((it: any) => it.returnedQty > 0);
            const allRet = issueItems.every((it: any) => it.returnedQty >= it.issuedQty);
            await updateDoc(issueRef, {
              items: issueItems,
              status: allRet ? 'CLOSED' : (anyRet ? 'PARTIALLY_RETURNED' : 'ISSUED'),
              updatedAt: nowTimestamp,
              updatedBy: editorId
            });
          }
        }

        const updatedItems = editForm.items.map(it => ({
          productId: it.productId,
          productName: it.name,
          sku: it.sku || '',
          unit: it.unit || 'pcs',
          returnedQty: Number(it.qty) || 0
        }));

        const existingHistory = origData.editHistory || [];

        await updateDoc(returnRef, {
          employeeId: editForm.employeeId,
          notes: editForm.notes,
          items: updatedItems,
          createdAt: newTxDate,
          updatedAt: nowTimestamp,
          updatedBy: editorId,
          lastEditedByName: editorName,
          lastEditedByRole: editorRole,
          lastEditedById: editorId,
          lastEditedAt: nowTimestamp,
          editHistory: [...existingHistory, editAuditRecord]
        });

      } else if (editForm.type === 'PURCHASE') {
        const poRef = doc(db, 'purchaseOrders', editForm.id);
        const poSnap = await getDoc(poRef);
        if (!poSnap.exists()) throw new Error('Transaction record not found');
        const origData = poSnap.data();

        const updatedItems = editForm.items.map(it => ({
          productId: it.productId,
          productName: it.name,
          sku: it.sku || '',
          unit: it.unit || 'pcs',
          quantity: Number(it.qty) || 0
        }));

        const existingHistory = origData.editHistory || [];

        await updateDoc(poRef, {
          supplierName: editForm.customerOrTech,
          notes: editForm.notes,
          items: updatedItems,
          createdAt: newTxDate,
          updatedAt: nowTimestamp,
          updatedBy: editorId,
          lastEditedByName: editorName,
          lastEditedByRole: editorRole,
          lastEditedById: editorId,
          lastEditedAt: nowTimestamp,
          editHistory: [...existingHistory, editAuditRecord]
        });
      }

      toast.success(`Transaction updated successfully by ${editorName} (${editorRole})`);
      setEditForm(null);
      await loadLogs();
    } catch (err: any) {
      console.error('Failed to update transaction:', err);
      toast.error('Failed to update transaction: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (id: string, type: string) => {
    if (!window.confirm('Are you sure you want to delete this transaction log? This will automatically revert the product stock balances.')) return;
    try {
      setIsLoading(true);
      const activeCompanyId = companyId || useAuthStore.getState().company?.companyId || 'company_Zu6sHXTq';
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
                  companyId: activeCompanyId,
                  productId: item.productId,
                  transactionType: 'ADJUSTMENT',
                  referenceType: 'ADJUSTMENT',
                  quantity: netQty,
                  notes: `Reverted Issue deletion (ID: ${id})`,
                  performedBy: userId
                });
              } catch (stockErr) {
                console.warn('Failed to revert stock for product:', stockErr);
              }
            }
          }
        }
        
        try {
          const returnSnap = await getDocs(query(
            collection(db, 'returnTransactions'),
            where('companyId', '==', activeCompanyId),
            where('issueId', '==', id)
          ));
          for (const docObj of returnSnap.docs) {
            await deleteDoc(docObj.ref);
          }
        } catch (retErr) {
          console.warn('Failed to query/delete linked returns:', retErr);
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
                  companyId: activeCompanyId,
                  productId: item.productId,
                  transactionType: 'ADJUSTMENT',
                  referenceType: 'ADJUSTMENT',
                  quantity: -returnedQty,
                  notes: `Reverted Return deletion (ID: ${id})`,
                  performedBy: userId
                });
              } catch (stockErr) {
                console.warn('Failed to revert stock for product:', stockErr);
              }
            }
          }

          if (d.issueId && d.issueId !== 'DIRECT_RETURN') {
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
                  companyId: activeCompanyId,
                  productId: item.productId,
                  transactionType: 'ADJUSTMENT',
                  referenceType: 'ADJUSTMENT',
                  quantity: -receivedQty,
                  notes: `Reverted Purchase deletion (ID: ${id})`,
                  performedBy: userId
                });
              } catch (stockErr) {
                console.warn('Failed to revert stock for product:', stockErr);
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
    const safeTitle = escapeHtml(`${log.type} Receipt - ${log.id}`);
    const safeTypeHeading = escapeHtml(log.type === 'ISSUE' ? 'Material Issue Receipt' : log.type === 'RETURN' ? 'Material Return Receipt' : 'Purchase Order Receipt');
    const safeRefLabel = escapeHtml(log.isDirectReturn ? 'DIRECT RETURN NO' : (log.issueNumber ? 'REFERENCE / ISSUE NO' : 'TRANSACTION ID'));
    const safeRefValue = escapeHtml(log.isDirectReturn ? (log.directReturnNumber || 'CRYO(W/O)-1') : (log.issueNumber || log.id));
    const safePartyLabel = escapeHtml(log.type === 'PURCHASE' ? 'Supplier' : 'Issued To');
    const safeCustomerOrTech = escapeHtml(log.customerOrTech);
    const safeStaffName = escapeHtml(log.staffName);
    const safeSiteName = log.siteName ? escapeHtml(log.siteName) : '';
    const safeAdditionalTechs = log.additionalTechnicians && log.additionalTechnicians.length > 0 
      ? log.additionalTechnicians.map(t => escapeHtml(t)).join(', ') 
      : '';
    const safeLastEditor = log.lastEditedByName ? escapeHtml(log.lastEditedByName) : '';
    const safeLastRole = log.lastEditedByRole ? escapeHtml(log.lastEditedByRole) : 'Staff';
    const safeNotes = log.notes ? escapeHtml(log.notes) : '';

    w.document.write(`
      <html><head><title>${safeTitle}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 13px; padding: 30px; color: #111; }
        .header { display: flex; justify-content: space-between; border-bottom: 3px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px; }
        .title { font-size: 22px; font-weight: bold; text-transform: uppercase; color: #2563eb; }
        .grid { display: flex; justify-content: space-between; background: #f9fafb; padding: 14px; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { background: #2563eb; color: white; padding: 10px; text-align: left; font-size: 12px; }
        td { padding: 9px 10px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
        .qty { text-align: right; font-weight: bold; font-size: 14px; color: #2563eb; }
        .footer { margin-top: 40px; display: flex; justify-content: space-between; }
        .sig { width: 200px; border-top: 1px dashed #666; text-align: center; padding-top: 6px; font-size: 11px; font-weight: bold; }
      </style>
      </head><body>
        <div class="header">
          <div>
            <div class="title">${safeTypeHeading}</div>
            <div style="font-size: 11px; color: #666; margin-top: 4px;">OFFICIAL RECORD</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 10px; color: #666; font-weight: bold;">
              ${safeRefLabel}
            </div>
            <div style="font-family: monospace; font-weight: bold; font-size: 16px; color: #2563eb;">
              ${safeRefValue}
            </div>
          </div>
        </div>

        <div class="grid">
          <div>
            <div style="font-size: 10px; color: #666; font-weight: bold; text-transform: uppercase;">${safePartyLabel}</div>
            <div style="font-size: 15px; font-weight: bold; margin-top: 2px;">${safeCustomerOrTech}</div>
            ${safeAdditionalTechs ? `<div style="font-size: 11px; margin-top: 2px;">+ ${safeAdditionalTechs}</div>` : ''}
            ${safeSiteName ? `<div style="font-size: 11px; color: #666; margin-top: 4px;">Site: <b>${safeSiteName}</b></div>` : ''}
          </div>
          <div style="text-align: right;">
            <div style="font-size: 10px; color: #666; font-weight: bold;">DATE & TIME</div>
            <div style="font-weight: bold; margin-top: 2px;">${formatDate(log.date)}</div>
            <div style="font-size: 11px; color: #666; margin-top: 4px;">Staff: <b>${safeStaffName}</b></div>
            ${safeLastEditor ? `
              <div style="font-size: 10px; color: #b45309; margin-top: 2px; font-weight: bold;">
                Edited by: ${safeLastEditor} (${safeLastRole})
              </div>
            ` : ''}
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
                <td style="font-weight: 500;">${escapeHtml(it.name)}</td>
                <td style="font-family: monospace; font-size: 11px; color: #666;">${escapeHtml(it.sku || '-')}</td>
                <td class="qty">${Number(it.qty) || 0} <span style="font-size: 11px; font-weight: normal; color: #666;">${escapeHtml(it.unit || '')}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        ${safeNotes ? `
          <div style="margin-top: 20px; padding: 10px; background: #fffbeb; border-left: 3px solid #f59e0b; font-size: 12px;">
            <b>Notes:</b> ${safeNotes}
          </div>
        ` : ''}

        <div class="footer">
          <div class="sig">Given By (${safeStaffName})</div>
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
      const s = search.toLowerCase().trim();
      const sClean = s.replace(/[^a-z0-9]/g, '');
      return l.customerOrTech.toLowerCase().includes(s)
        || l.staffName.toLowerCase().includes(s)
        || (l.issueNumber && l.issueNumber.toLowerCase().includes(s))
        || (l.issueNumber && l.issueNumber.toLowerCase().replace(/[^a-z0-9]/g, '').includes(sClean))
        || (l.directReturnNumber && l.directReturnNumber.toLowerCase().includes(s))
        || (l.directReturnNumber && l.directReturnNumber.toLowerCase().replace(/[^a-z0-9]/g, '').includes(sClean))
        || (l.isDirectReturn && (s.includes('direct') || s.includes('w/o') || s.includes('without')))
        || (l.lastEditedByName && l.lastEditedByName.toLowerCase().includes(s))
        || (l.lastEditedByRole && l.lastEditedByRole.toLowerCase().includes(s))
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
          placeholder="Search by name, product, editor..."
          className="ml-auto h-8 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 w-60"
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
                  {log.isDirectReturn ? (
                    <div style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 'bold', marginTop: '2px', color: '#15803d' }}>
                      {log.directReturnNumber || 'CRYO(W/O)-1'}
                      <span style={{ fontSize: '9px', fontWeight: 'normal', color: '#666', display: 'block' }}>(Direct / W/O)</span>
                    </div>
                  ) : log.issueNumber ? (
                    <div style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 'bold', marginTop: '2px' }}>
                      {log.type === 'RETURN' ? `Ref: ${log.issueNumber}` : log.issueNumber}
                    </div>
                  ) : (
                    <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#999', marginTop: '2px' }}>
                      #{log.id.slice(-6)}
                    </div>
                  )}
                </td>
                <td style={{ padding: '7px 8px', border: '1px solid #e5e7eb', fontSize: '10px' }}>{formatDate(log.date)}</td>
                <td style={{ padding: '7px 8px', border: '1px solid #e5e7eb', fontWeight: 'bold' }}>{log.customerOrTech}</td>
                <td style={{ padding: '7px 8px', border: '1px solid #e5e7eb', fontSize: '10px' }}>
                  {log.items.map(it => `${it.name} × ${it.qty} ${it.unit || ''}`.trim()).join(', ')}
                </td>
                <td style={{ padding: '7px 8px', border: '1px solid #e5e7eb' }}>
                  <div>{log.staffName}</div>
                  {log.lastEditedByName && (
                    <div style={{ fontSize: '10px', color: '#b45309', marginTop: '2px', fontWeight: 'bold' }}>
                      Edited by: {log.lastEditedByName} ({log.lastEditedByRole || 'Staff'})
                    </div>
                  )}
                </td>
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
                        <div className="flex flex-col items-start gap-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
                            <Icon className="h-3 w-3" /> {cfg.label}
                          </span>
                          {log.isDirectReturn ? (
                            <div className="flex flex-col items-start">
                              <span className="font-mono text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30 whitespace-nowrap">
                                {log.directReturnNumber || 'CRYO(W/O)-1'}
                              </span>
                              <span className="text-[9px] text-muted-foreground font-medium mt-0.5">
                                (Without Issue)
                              </span>
                            </div>
                          ) : log.issueNumber ? (
                            <span className="font-mono text-[11px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 whitespace-nowrap">
                              {log.type === 'RETURN' ? `Ref: ${log.issueNumber}` : log.issueNumber}
                            </span>
                          ) : (
                            <span className="font-mono text-[10px] text-muted-foreground">
                              #{log.id.slice(-6)}
                            </span>
                          )}
                        </div>
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
                      <td className="px-4 py-3 text-sm">
                        <div className="font-semibold text-foreground">{log.staffName}</div>
                        {log.lastEditedByName && (
                          <div className="mt-1 flex flex-col items-start gap-0.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/60 rounded px-1.5 py-0.5 shadow-xs">
                              <Pencil className="h-2.5 w-2.5" />
                              <span>Edited by {log.lastEditedByName}</span>
                              {log.lastEditedByRole && <span className="opacity-80 font-normal">({log.lastEditedByRole})</span>}
                            </span>
                            {log.lastEditedAt && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Clock className="h-2.5 w-2.5 opacity-70" />
                                {formatDate(log.lastEditedAt)}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
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
                          {canEdit && (
                            <AppButton 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleOpenEdit(log)} 
                              className="text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 h-8 w-8"
                              title="Edit Transaction"
                            >
                              <Pencil className="h-4 w-4" />
                            </AppButton>
                          )}
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
              ? `Material Issue Details ${selectedLog.issueNumber ? `(${selectedLog.issueNumber})` : ''}` 
              : selectedLog.type === 'RETURN' 
              ? (selectedLog.isDirectReturn
                  ? `Direct Material Return Details (${selectedLog.directReturnNumber || 'CRYO(W/O)-1'})`
                  : `Material Return Details ${selectedLog.issueNumber ? `(from ${selectedLog.issueNumber})` : ''}`)
              : `Purchase Order Details ${selectedLog.issueNumber ? `(${selectedLog.issueNumber})` : ''}`
          }
          description={`Reference: ${selectedLog.isDirectReturn ? `${selectedLog.directReturnNumber || 'CRYO(W/O)-1'} (Direct Return - Without Issue)` : (selectedLog.issueNumber || selectedLog.id)} • Transaction ID: ${selectedLog.id}`}
          className="max-w-2xl max-h-[90vh] flex flex-col"
          footer={
            <div className="flex justify-between w-full">
              <AppButton variant="outline" size="sm" onClick={() => handlePrintSingle(selectedLog)}>
                <Printer className="h-4 w-4 mr-2" /> Print Receipt
              </AppButton>
              <div className="flex gap-2">
                {canEdit && (
                  <AppButton 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      const logToEdit = selectedLog;
                      setSelectedLog(null);
                      handleOpenEdit(logToEdit);
                    }}
                    className="text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                  >
                    <Pencil className="h-4 w-4 mr-1.5" /> Edit Transaction
                  </AppButton>
                )}
                <AppButton variant="default" size="sm" onClick={() => setSelectedLog(null)}>
                  Close
                </AppButton>
              </div>
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
                  Given By / Staff: <span className="font-medium text-foreground">{selectedLog.staffName}</span>
                </p>
              </div>

              {/* Show Edited Info Banner if transaction was edited */}
              {selectedLog.lastEditedByName && (
                <div className="col-span-2 p-2.5 bg-amber-500/10 border-l-3 border-amber-500 rounded-r text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Pencil className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div>
                      <span className="font-bold text-amber-800 dark:text-amber-300">Edited by:</span>{' '}
                      <span className="font-semibold text-foreground">{selectedLog.lastEditedByName}</span>{' '}
                      <span className="text-muted-foreground font-medium">({selectedLog.lastEditedByRole || 'Staff'})</span>
                    </div>
                  </div>
                  {selectedLog.lastEditedAt && (
                    <span className="text-muted-foreground text-[11px]">{formatDate(selectedLog.lastEditedAt)}</span>
                  )}
                </div>
              )}

              {selectedLog.notes && (
                <div className="col-span-2 p-2.5 bg-muted border-l-2 border-primary/50 rounded-r text-xs">
                  <span className="font-bold text-foreground">Notes:</span> {selectedLog.notes}
                </div>
              )}
            </div>

            {/* Complete Items Table */}
            <div>
              <div className="flex justify-between items-center mb-2 px-1">
                <h4 className="font-semibold text-sm">
                  {selectedLog.type === 'ISSUE' ? 'Issued' : selectedLog.type === 'RETURN' ? 'Returned' : 'Purchased'} Materials List ({selectedLog.items.length} {selectedLog.items.length === 1 ? 'item' : 'items'})
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

            {/* Edit Audit History */}
            {selectedLog.editHistory && selectedLog.editHistory.length > 0 && (
              <div className="border border-border rounded-lg p-3 bg-muted/20">
                <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5 text-primary" /> Edit Audit History ({selectedLog.editHistory.length})
                </h5>
                <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                  {selectedLog.editHistory.map((h, i) => (
                    <div key={i} className="text-xs flex items-center justify-between text-muted-foreground border-b border-border/40 pb-1.5 last:border-0">
                      <div>
                        <span className="font-semibold text-foreground">{h.editedByName}</span>{' '}
                        <span className="text-[11px] opacity-80">({h.editedByRole || 'Staff'})</span>
                        {h.notes && <p className="text-[11px] text-muted-foreground italic mt-0.5">"{h.notes}"</p>}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono shrink-0 ml-2">
                        {formatDate(h.editedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </AppDialog>
      )}

      {/* Edit Transaction Modal */}
      {editForm && (
        <AppDialog
          isOpen={!!editForm}
          onOpenChange={(open) => !open && !isSavingEdit && setEditForm(null)}
          title={`Edit ${
            editForm.type === 'ISSUE' 
              ? `Material Issue (${editForm.issueNumber || editForm.id})` 
              : editForm.type === 'RETURN' 
              ? (editForm.isDirectReturn ? `Direct Material Return (${editForm.directReturnNumber || 'CRYO(W/O)-1'})` : `Material Return ${editForm.issueNumber ? `(from ${editForm.issueNumber})` : ''}`) 
              : 'Purchase Order'
          }`}
          description={`Reference: ${editForm.isDirectReturn ? `${editForm.directReturnNumber || 'CRYO(W/O)-1'} (Direct Return - Without Issue)` : (editForm.issueNumber || editForm.id)} • Originally created by ${editForm.staffName}`}
          className="max-w-3xl max-h-[92vh] flex flex-col"
          footer={
            <div className="flex justify-end gap-2 w-full">
              <AppButton variant="outline" size="sm" onClick={() => setEditForm(null)} disabled={isSavingEdit}>
                Cancel
              </AppButton>
              <AppButton size="sm" onClick={handleSaveEdit} disabled={isSavingEdit}>
                {isSavingEdit ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving Changes & Adjusting Stock...
                  </>
                ) : (
                  'Save Changes & Update Stock'
                )}
              </AppButton>
            </div>
          }
        >
          <div className="space-y-4 overflow-y-auto max-h-[64vh] pr-1">
            {/* Editor Identity Notice */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold flex items-center justify-center">
                  <Pencil className="h-3.5 w-3.5" />
                </div>
                <div>
                  <span className="font-semibold text-foreground">Editing recorded by:</span>{' '}
                  <span className="font-bold text-primary">{user?.fullName || user?.username || 'Staff'}</span>
                  <span className="text-muted-foreground ml-1 font-medium">({user?.role || 'Staff'})</span>
                </div>
              </div>
              <span className="text-[11px] text-muted-foreground hidden sm:inline">Stock will update automatically</span>
            </div>

            {/* Header Form Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-muted/20 border border-border rounded-lg text-sm">
              {/* Primary Technician or Supplier */}
              {editForm.type === 'PURCHASE' ? (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
                    Supplier Name
                  </label>
                  <input
                    type="text"
                    value={editForm.customerOrTech}
                    onChange={(e) => setEditForm(prev => prev ? ({ ...prev, customerOrTech: e.target.value }) : null)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
                    Primary Technician / Employee
                  </label>
                  <select
                    value={editForm.employeeId}
                    onChange={(e) => {
                      const emp = employees.find(emp => emp.id === e.target.value);
                      setEditForm(prev => prev ? ({
                        ...prev,
                        employeeId: e.target.value,
                        customerOrTech: emp ? `${emp.firstName} ${emp.lastName}` : prev.customerOrTech
                      }) : null);
                    }}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="">Select Technician...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.designation || emp.role || 'Staff'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date & Time */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
                  Transaction Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={editForm.dateStr}
                  onChange={(e) => setEditForm(prev => prev ? ({ ...prev, dateStr: e.target.value }) : null)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {/* Site Name (for Issue) */}
              {editForm.type === 'ISSUE' && (
                <div className="col-span-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
                    Site Name / Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 4S Catering (Pattom)"
                    value={editForm.siteName}
                    onChange={(e) => setEditForm(prev => prev ? ({ ...prev, siteName: e.target.value }) : null)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              )}

              {/* Additional Technicians (for Issue) */}
              {editForm.type === 'ISSUE' && (
                <div className="col-span-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
                    Additional Technicians (Comma Separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ABHIJITH SHAJI, VISHNU"
                    value={editForm.additionalTechnicians.join(', ')}
                    onChange={(e) => {
                      const list = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                      setEditForm(prev => prev ? ({ ...prev, additionalTechnicians: list }) : null);
                    }}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              )}
            </div>

            {/* Editable Items Table */}
            <div>
              <div className="flex justify-between items-center mb-1.5 px-1">
                <h4 className="font-semibold text-sm">
                  Products in Transaction ({editForm.items.length})
                </h4>
                <span className="text-[11px] text-muted-foreground">Adjust quantity as needed</span>
              </div>

              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/60 text-xs text-muted-foreground uppercase">
                    <tr>
                      <th className="px-3 py-2.5 w-10 text-center">#</th>
                      <th className="px-3 py-2.5">Product Name</th>
                      <th className="px-3 py-2.5 w-28 text-right">Original Qty</th>
                      <th className="px-3 py-2.5 w-36 text-right">New Qty</th>
                      <th className="px-3 py-2.5 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {editForm.items.map((item, idx) => {
                      const diff = Number(item.qty) - Number(item.originalQty);
                      return (
                        <tr key={idx} className="hover:bg-muted/10 transition-colors">
                          <td className="px-3 py-2 text-center text-xs text-muted-foreground font-mono">{idx + 1}</td>
                          <td className="px-3 py-2">
                            <div className="font-medium text-foreground">{item.name}</div>
                            {item.sku && <div className="text-xs text-muted-foreground font-mono">{item.sku}</div>}
                          </td>
                          <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                            {item.originalQty} {item.unit || ''}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <div className="relative flex items-center">
                                <input
                                  type="number"
                                  step="any"
                                  min="0.0001"
                                  value={item.qty === 0 ? '' : item.qty}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                    setEditForm(prev => {
                                      if (!prev) return null;
                                      const updated = [...prev.items];
                                      updated[idx] = { ...updated[idx], qty: isNaN(val) ? 0 : val };
                                      return { ...prev, items: updated };
                                    });
                                  }}
                                  className="w-28 h-8 rounded border border-input bg-background pl-2 pr-10 text-right text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                                <span className="absolute right-2 text-xs font-semibold text-muted-foreground uppercase pointer-events-none">
                                  {item.unit || ''}
                                </span>
                              </div>
                            </div>
                            {diff !== 0 && (
                              <span className={`text-[10px] font-semibold block text-right mt-0.5 ${diff > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                {diff > 0 ? `+${diff} ${item.unit || ''} (${editForm.type === 'ISSUE' ? 'deducts stock' : 'adds to stock'})` : `${diff} ${item.unit || ''} (${editForm.type === 'ISSUE' ? 'restores stock' : 'deducts stock'})`}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {editForm.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditForm(prev => {
                                    if (!prev) return null;
                                    return { ...prev, items: prev.items.filter((_, i) => i !== idx) };
                                  });
                                }}
                                className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                                title="Remove Item"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Add another product row */}
            {(() => {
              const selectedNewProduct = products.find(p => p.id === selectedNewProductId);
              const newProdUnit = selectedNewProduct ? (selectedNewProduct.unitId || (selectedNewProduct as any).unit || 'pcs') : '';
              const newProdStock = selectedNewProduct ? Number(selectedNewProduct.currentStock) || 0 : null;

              return (
                <div className="p-4 bg-muted/20 border border-dashed border-border rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Plus className="h-3.5 w-3.5 text-primary" /> Add Another Product to Transaction
                    </label>
                    {selectedNewProduct && (
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                        (newProdStock ?? 0) > 0 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                          : 'bg-destructive/10 text-destructive border border-destructive/20'
                      }`}>
                        Current Stock: <b>{newProdStock}</b> {newProdUnit}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <div className="flex-1">
                      <ProductSearchSelect
                        products={products}
                        value={selectedNewProductId}
                        onChange={(id) => {
                          setSelectedNewProductId(id);
                          if (!newProductQty || newProductQty === '0') {
                            setNewProductQty('1');
                          }
                        }}
                        placeholder="Search product to add (e.g. 3core cable, copper pipe, plug)..."
                      />
                    </div>

                    {/* Quantity Input with Dynamic Unit Badge */}
                    <div className="w-full sm:w-40">
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="Qty"
                          value={newProductQty}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || /^\d*\.?\d*$/.test(val)) {
                              setNewProductQty(val);
                            }
                          }}
                          className="w-full h-10 rounded-md border border-input bg-background pl-3 pr-14 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        />
                        <span className="absolute right-2 px-1.5 py-0.5 bg-muted/80 text-muted-foreground text-xs font-bold rounded uppercase pointer-events-none">
                          {newProdUnit || 'Unit'}
                        </span>
                      </div>
                    </div>

                    <AppButton
                      type="button"
                      variant="default"
                      className="h-10 px-4 shrink-0 font-semibold shadow-sm"
                      disabled={!selectedNewProductId}
                      onClick={() => {
                        if (!selectedNewProductId) {
                          toast.error('Please select a product first');
                          return;
                        }
                        const qtyNum = parseFloat(newProductQty);
                        if (isNaN(qtyNum) || qtyNum <= 0) {
                          toast.error(`Please enter a valid quantity for ${newProdUnit || 'items'}`);
                          return;
                        }
                        const p = products.find(prod => prod.id === selectedNewProductId);
                        if (!p) return;
                        const pUnit = p.unitId || (p as any).unit || 'pcs';

                        setEditForm(prev => {
                          if (!prev) return null;
                          const alreadyIdx = prev.items.findIndex(it => it.productId === p.id);
                          if (alreadyIdx >= 0) {
                            const copy = [...prev.items];
                            copy[alreadyIdx].qty = Math.round((copy[alreadyIdx].qty + qtyNum) * 10000) / 10000;
                            return { ...prev, items: copy };
                          }
                          return {
                            ...prev,
                            items: [
                              ...prev.items,
                              {
                                productId: p.id,
                                name: p.name,
                                sku: p.sku || '',
                                unit: pUnit,
                                qty: qtyNum,
                                originalQty: 0
                              }
                            ]
                          };
                        });

                        toast.success(`Added ${qtyNum} ${pUnit} of "${p.name}"`);
                        setSelectedNewProductId('');
                        setNewProductQty('1');
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Product
                    </AppButton>
                  </div>

                  {/* Selected Product info footer */}
                  {selectedNewProduct && (
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1.5 border-t border-border/40">
                      <span>Unit of Measure: <b className="text-foreground uppercase">{newProdUnit}</b></span>
                      <span>•</span>
                      <span>SKU: <code className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded">{selectedNewProduct.sku || 'N/A'}</code></span>
                      <span>•</span>
                      <span>Available in Store: <b className="text-foreground">{newProdStock} {newProdUnit}</b></span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Notes & Reason for Edit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
                  Transaction Notes
                </label>
                <textarea
                  rows={2}
                  value={editForm.notes}
                  onChange={(e) => setEditForm(prev => prev ? ({ ...prev, notes: e.target.value }) : null)}
                  className="w-full rounded-md border border-input bg-background p-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="Notes about this transaction..."
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
                  Reason for Edit (Audit History)
                </label>
                <textarea
                  rows={2}
                  value={editForm.editReason}
                  onChange={(e) => setEditForm(prev => prev ? ({ ...prev, editReason: e.target.value }) : null)}
                  className="w-full rounded-md border border-input bg-background p-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="e.g. Corrected issued quantity after technician returned extra cable"
                />
              </div>
            </div>
          </div>
        </AppDialog>
      )}
    </PageContainer>
  );
}
