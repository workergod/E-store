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
import type { Tool, ToolCondition } from '../../../shared/types/Tool';
import { toolRepository } from '../../../repositories/ToolRepository';
import { ToolSearchSelect } from '../../../shared/forms/ToolSearchSelect';
import { 
  Printer, RefreshCw, ArrowUpRight, ArrowDownLeft, ShoppingCart, 
  Trash2, ArrowUpDown, ArrowUp, ArrowDown, Eye, Pencil, Plus, Clock, History,
  Wrench, RotateCcw, Package
} from 'lucide-react';
import { toast } from 'sonner';
import { escapeHtml } from '../../../shared/utils/security';
import { printMaterialReceipt } from '../../inventory/utils/printMaterialReceipt';

const TOOL_CONDITIONS: { value: ToolCondition; label: string }[] = [
  { value: 'NEW', label: 'New' },
  { value: 'EXCELLENT', label: 'Excellent' },
  { value: 'GOOD', label: 'Good' },
  { value: 'FAIR', label: 'Fair' },
  { value: 'NEEDS_REPAIR', label: 'Needs Repair' },
  { value: 'DAMAGED', label: 'Damaged' },
];

interface LogItem {
  productId: string; // for tools: toolId
  name: string;
  qty: number;
  unit?: string;
  sku?: string;
  returnedQty?: number;
  brand?: string;
  serialNumber?: string;
  conditionOut?: string;
  conditionIn?: string;
  actionNeeded?: string;
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
  isToolIssue?: boolean;
  isToolReturn?: boolean;
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
  expectedReturnDate?: string;
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
  isToolIssue?: boolean;
  isToolReturn?: boolean;
  issueNumber?: string;
  isDirectReturn?: boolean;
  directReturnNumber?: string;
  dateStr: string;
  staffName: string;
  employeeId: string;
  customerOrTech: string;
  siteName: string;
  expectedReturnDate?: string;
  additionalTechnicians: string[];
  notes: string;
  items: {
    productId: string; // for tools: toolId
    name: string;
    sku?: string;
    unit?: string;
    qty: number;
    originalQty: number;
    conditionOut?: string;
    conditionIn?: string;
    brand?: string;
    serialNumber?: string;
    actionNeeded?: string;
  }[];
  editReason: string;
}

const getLogBadge = (log: LogEntry) => {
  if (log.isToolIssue) {
    return {
      label: 'Tool Issue',
      color: 'text-amber-800 bg-amber-50 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700',
      icon: Wrench,
      refClass: 'text-amber-800 dark:text-amber-300 bg-amber-500/10 border-amber-500/30'
    };
  }
  if (log.isToolReturn) {
    return {
      label: 'Tool Return',
      color: 'text-purple-800 bg-purple-50 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-700',
      icon: RotateCcw,
      refClass: 'text-purple-800 dark:text-purple-300 bg-purple-500/10 border-purple-500/30'
    };
  }
  if (log.type === 'ISSUE') {
    return {
      label: 'Issue',
      color: 'text-orange-600 bg-orange-50 border-orange-200',
      icon: ArrowUpRight,
      refClass: 'text-primary bg-primary/10 border-primary/20'
    };
  }
  if (log.type === 'RETURN') {
    return {
      label: 'Return',
      color: 'text-green-600 bg-green-50 border-green-200',
      icon: ArrowDownLeft,
      refClass: 'text-primary bg-primary/10 border-primary/20'
    };
  }
  return {
    label: 'Purchase',
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    icon: ShoppingCart,
    refClass: 'text-blue-700 bg-blue-500/10 border-blue-500/30'
  };
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
  const [tools, setTools] = useState<Tool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const [filter, setFilter] = useState<'ALL' | 'ISSUE' | 'RETURN' | 'PURCHASE' | 'TOOL_ISSUE' | 'TOOL_RETURN'>(
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
  const [selectedNewToolId, setSelectedNewToolId] = useState<string>('');
  const [newToolQty, setNewToolQty] = useState<string>('1');
  const [newToolCondition, setNewToolCondition] = useState<ToolCondition>('GOOD');
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

      // Load employees, products, and tools for name and unit mapping
      const [empList, prodList, toolList] = await Promise.all([
        employeeRepository.getAll(companyId),
        productRepository.getAll(companyId),
        toolRepository.getAll(companyId)
      ]);

      setEmployees(empList);
      setProducts(prodList);
      setTools(toolList);

      const empMap: Record<string, string> = {};
      empList.forEach(e => { if (e.id) empMap[e.id] = `${e.firstName} ${e.lastName}`; });

      const toolMap: Record<string, Tool> = {};
      toolList.forEach(t => { if (t.id) toolMap[t.id] = t; });

      const prodUnitMap: Record<string, string> = {};
      const prodSkuMap: Record<string, string> = {};
      prodList.forEach(p => {
        if (p.id) {
          prodUnitMap[p.id] = p.unitId || (p as any).unit || 'pcs';
          prodSkuMap[p.id] = p.sku || '';
        }
      });

      // Helper to detect raw Firebase UIDs (e.g. P7fJQTSmUgRpGc9qyFETxQMuqvh2)
      const isRawUid = (str?: string | null): boolean => {
        if (!str) return false;
        return /^[A-Za-z0-9_-]{20,36}$/.test(str.trim());
      };

      // Load users for UID -> Display Name mapping
      const userMap: Record<string, string> = {};
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        usersSnap.forEach(uDoc => {
          const uData = uDoc.data();
          const name = uData.fullName || uData.username || uData.displayName || '';
          if (name) userMap[uDoc.id] = name;
        });
      } catch (err) {
        console.warn('Could not load users map in TransactionLogPage', err);
      }
      if (user?.uid) {
        userMap[user.uid] = user.fullName || user.username || userMap[user.uid] || 'Staff';
      }

      const resolveStaffName = (rawName?: string, rawUid?: string): string => {
        if (rawName && !isRawUid(rawName)) return rawName;
        if (rawUid && userMap[rawUid]) return userMap[rawUid];
        if (rawUid && empMap[rawUid]) return empMap[rawUid];
        if (rawUid && user?.uid === rawUid) return user.fullName || user.username || 'Staff';
        if (rawName && userMap[rawName]) return userMap[rawName];
        if (rawName && empMap[rawName]) return empMap[rawName];
        if (rawName && user?.uid === rawName) return user.fullName || user.username || 'Staff';
        return 'Store Keeper';
      };

      // 1. Issues (Material Issues & Tool Issues)
      const issueSnap = await getDocs(query(
        collection(db, 'issueTransactions'),
        where('companyId', '==', companyId)
      ));
      issueSnap.forEach(docSnap => {
        const d = docSnap.data();
        const isTool = Boolean(d.isToolIssue || (d.issueNumber && d.issueNumber.includes('TISS')));
        const mappedItems: LogItem[] = isTool
          ? (d.items || []).map((it: any) => {
              const toolObj = toolMap[it.toolId] || toolMap[it.productId];
              const name = it.toolName || it.name || it.productName || toolObj?.name || 'Tool';
              const sku = it.toolCode || it.sku || toolObj?.toolCode || '';
              const qty = Number(it.quantity ?? it.issuedQty ?? 1);
              const returnedQty = Number(it.returnedQuantity ?? it.returnedQty ?? 0);
              return {
                productId: it.toolId || it.productId || '',
                name,
                qty: isNaN(qty) ? 1 : qty,
                returnedQty: isNaN(returnedQty) ? 0 : returnedQty,
                unit: 'pcs',
                sku,
                brand: it.brand || toolObj?.brand || '',
                serialNumber: it.serialNumber || toolObj?.serialNumber || '',
                conditionOut: it.conditionOut || toolObj?.condition || 'GOOD'
              };
            })
          : (d.items || []).map((it: any) => ({
              productId: it.productId,
              name: it.productName,
              qty: it.issuedQty,
              returnedQty: it.returnedQty || 0,
              unit: it.unit || prodUnitMap[it.productId] || '',
              sku: it.sku || prodSkuMap[it.productId] || ''
            }));

        const techName = d.employeeName || empMap[d.employeeId] || d.employeeId;

        entries.push({
          id: docSnap.id,
          type: 'ISSUE',
          isToolIssue: isTool,
          issueNumber: d.issueNumber || null,
          date: d.createdAt || d.issueDate,
          staffName: resolveStaffName(d.createdByName, d.createdBy),
          customerOrTech: techName,
          employeeId: d.employeeId,
          items: mappedItems,
          rawItems: d.items || [],
          notes: d.notes,
          status: d.status,
          siteName: d.siteName,
          expectedReturnDate: d.expectedReturnDate,
          additionalTechnicians: d.additionalTechnicians,
          lastEditedByName: d.lastEditedByName,
          lastEditedByRole: d.lastEditedByRole,
          lastEditedById: d.lastEditedById,
          lastEditedAt: d.lastEditedAt,
          editHistory: d.editHistory || [],
        });
      });

      // 2. Returns (Material Returns & Tool Returns)
      const returnSnap = await getDocs(query(
        collection(db, 'returnTransactions'),
        where('companyId', '==', companyId)
      ));
      returnSnap.forEach(docSnap => {
        const d = docSnap.data();
        const isTool = Boolean(d.isToolReturn || (d.returnNumber && d.returnNumber.includes('TRET')));
        const isDirect = Boolean(d.isDirectReturn || d.issueId === 'DIRECT_RETURN');
        const directReturnNumber = d.directReturnNumber || (isDirect ? 'CRYO(W/O)-1' : null);
        const resolvedTechName = d.employeeName || empMap[d.employeeId] || (d.employeeName && d.employeeName !== 'UNLINKED' ? d.employeeName : (isDirect ? 'Direct Return' : d.employeeId));

        const mappedItems: LogItem[] = isTool
          ? (d.items || []).map((it: any) => {
              const toolObj = toolMap[it.toolId] || toolMap[it.productId];
              const name = it.toolName || it.name || it.productName || toolObj?.name || 'Tool';
              const sku = it.toolCode || it.sku || toolObj?.toolCode || '';
              const qty = Number(it.returnQty ?? it.quantity ?? it.returnedQty ?? 1);
              return {
                productId: it.toolId || it.productId || '',
                name,
                qty: isNaN(qty) ? 1 : qty,
                unit: 'pcs',
                sku,
                brand: it.brand || toolObj?.brand || '',
                serialNumber: it.serialNumber || toolObj?.serialNumber || '',
                conditionIn: it.conditionIn || 'GOOD',
                actionNeeded: it.actionNeeded || 'RESTOCK'
              };
            })
          : (d.items || []).map((it: any) => ({
              productId: it.productId,
              name: it.productName,
              qty: it.returnedQty,
              unit: it.unit || prodUnitMap[it.productId] || '',
              sku: it.sku || prodSkuMap[it.productId] || ''
            }));

        entries.push({
          id: docSnap.id,
          type: 'RETURN',
          isToolReturn: isTool,
          issueNumber: d.returnNumber || d.issueNumber || null,
          isDirectReturn: isDirect,
          directReturnNumber: directReturnNumber || undefined,
          date: d.createdAt || d.returnDate,
          staffName: resolveStaffName(d.createdByName, d.createdBy),
          customerOrTech: resolvedTechName,
          employeeId: d.employeeId,
          items: mappedItems,
          rawItems: d.items || [],
          siteName: d.siteName || '',
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
        const resolvedStaff = resolveStaffName(d.createdByName || d.receivedByName, d.createdBy || d.receivedBy);
        if (!d.createdByName && docSnap.id && resolvedStaff && resolvedStaff !== 'Store Keeper') {
          updateDoc(doc(db, 'purchaseOrders', docSnap.id), { createdByName: resolvedStaff }).catch(() => {});
        }

        entries.push({
          id: docSnap.id,
          type: 'PURCHASE',
          issueNumber: d.poNumber || null,
          date: d.createdAt,
          staffName: resolvedStaff,
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
      isToolIssue: log.isToolIssue,
      isToolReturn: log.isToolReturn,
      issueNumber: log.issueNumber,
      isDirectReturn: log.isDirectReturn,
      directReturnNumber: log.directReturnNumber,
      dateStr,
      staffName: log.staffName,
      employeeId: log.employeeId || '',
      customerOrTech: log.customerOrTech || '',
      siteName: log.siteName || '',
      expectedReturnDate: log.expectedReturnDate || '',
      additionalTechnicians: [...(log.additionalTechnicians || [])],
      notes: log.notes || '',
      items: log.items.map(it => ({
        productId: it.productId || '',
        name: it.name,
        sku: it.sku || '',
        unit: it.unit || (log.isToolIssue || log.isToolReturn ? 'pcs' : ''),
        qty: it.qty,
        originalQty: it.qty,
        conditionOut: it.conditionOut || 'GOOD',
        conditionIn: it.conditionIn || 'GOOD',
        brand: it.brand || '',
        serialNumber: it.serialNumber || '',
        actionNeeded: it.actionNeeded || 'RESTOCK'
      })),
      editReason: ''
    });
    setSelectedNewProductId('');
    setNewProductQty('1');
    setSelectedNewToolId('');
    setNewToolQty('1');
    setNewToolCondition('GOOD');
  };

  const handleSaveEdit = async () => {
    if (!editForm || !companyId) return;
    if (editForm.items.length === 0) {
      toast.error(editForm.isToolIssue ? 'Tool issue must have at least one tool item' : 'Transaction must have at least one product item');
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

      if (editForm.isToolIssue) {
        const issueRef = doc(db, 'issueTransactions', editForm.id);
        const issueSnap = await getDoc(issueRef);
        if (!issueSnap.exists()) throw new Error('Tool issue record not found');
        const origData = issueSnap.data();
        const origItems: any[] = origData.items || [];

        // 1. Reconcile Tool Stocks
        for (const it of editForm.items) {
          const match = origItems.find((oi: any) => (oi.toolId === it.productId || oi.productId === it.productId));
          const oldIssued = match ? Number(match.quantity ?? match.issuedQty ?? 0) : 0;
          const diff = it.qty - oldIssued; // diff > 0 => issued more, available decreases, issued increases
          if (diff !== 0 && it.productId) {
            const toolRef = doc(db, 'products', it.productId);
            const toolSnap = await getDoc(toolRef);
            if (toolSnap.exists()) {
              const cur = toolSnap.data();
              const curAvail = Number(cur.availableQty) || 0;
              const curIssued = Number(cur.issuedQty) || 0;
              const newAvail = Math.max(0, curAvail - diff);
              const newIssued = Math.max(0, curIssued + diff);
              const newStatus = newAvail === 0 ? 'IN_USE' : (cur.status === 'IN_USE' ? 'AVAILABLE' : cur.status);
              await updateDoc(toolRef, {
                availableQty: newAvail,
                issuedQty: newIssued,
                status: newStatus,
                updatedAt: nowTimestamp,
                updatedBy: editorId
              });
            }
          }
        }

        // For removed tools
        for (const oi of origItems) {
          const oiId = oi.toolId || oi.productId;
          const stillExists = editForm.items.some(it => it.productId === oiId);
          if (!stillExists && oiId) {
            const netIssued = (Number(oi.quantity ?? oi.issuedQty ?? 0)) - (Number(oi.returnedQuantity ?? oi.returnedQty ?? 0));
            if (netIssued > 0) {
              const toolRef = doc(db, 'products', oiId);
              const toolSnap = await getDoc(toolRef);
              if (toolSnap.exists()) {
                const cur = toolSnap.data();
                const curAvail = Number(cur.availableQty) || 0;
                const curIssued = Number(cur.issuedQty) || 0;
                await updateDoc(toolRef, {
                  availableQty: curAvail + netIssued,
                  issuedQty: Math.max(0, curIssued - netIssued),
                  status: 'AVAILABLE',
                  updatedAt: nowTimestamp,
                  updatedBy: editorId
                });
              }
            }
          }
        }

        const updatedToolItems = editForm.items.map(it => {
          const match = origItems.find((oi: any) => (oi.toolId === it.productId || oi.productId === it.productId));
          const returnedQuantity = match ? Number(match.returnedQuantity ?? match.returnedQty ?? 0) : 0;
          return {
            toolId: it.productId,
            toolCode: it.sku || '',
            toolName: it.name,
            brand: it.brand || '',
            serialNumber: it.serialNumber || '',
            quantity: Number(it.qty) || 1,
            conditionOut: it.conditionOut || 'GOOD',
            returnedQuantity
          };
        });

        const allRet = updatedToolItems.every(it => it.returnedQuantity >= it.quantity);
        const anyRet = updatedToolItems.some(it => it.returnedQuantity > 0);
        const status = allRet ? 'CLOSED' : (anyRet ? 'PARTIALLY_RETURNED' : 'ISSUED');

        const existingHistory = origData.editHistory || [];

        await updateDoc(issueRef, {
          employeeId: editForm.employeeId,
          employeeName: editForm.customerOrTech,
          siteName: editForm.siteName,
          additionalTechnicians: editForm.additionalTechnicians,
          expectedReturnDate: editForm.expectedReturnDate || '',
          notes: editForm.notes,
          items: updatedToolItems,
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

      } else if (editForm.isToolReturn) {
        const returnRef = doc(db, 'returnTransactions', editForm.id);
        const returnSnap = await getDoc(returnRef);
        if (!returnSnap.exists()) throw new Error('Tool return record not found');
        const origData = returnSnap.data();
        const origItems: any[] = origData.items || [];

        for (const it of editForm.items) {
          const match = origItems.find((oi: any) => (oi.toolId === it.productId || oi.productId === it.productId));
          const oldRet = match ? Number(match.returnQty ?? match.quantity ?? 0) : 0;
          const diff = it.qty - oldRet;
          if (diff !== 0 && it.productId) {
            const toolRef = doc(db, 'products', it.productId);
            const toolSnap = await getDoc(toolRef);
            if (toolSnap.exists()) {
              const cur = toolSnap.data();
              const curAvail = Number(cur.availableQty) || 0;
              const curIssued = Number(cur.issuedQty) || 0;
              await updateDoc(toolRef, {
                availableQty: curAvail + diff,
                issuedQty: Math.max(0, curIssued - diff),
                status: 'AVAILABLE',
                updatedAt: nowTimestamp,
                updatedBy: editorId
              });
            }
          }
        }

        if (origData.issueId) {
          const issueRef = doc(db, 'issueTransactions', origData.issueId);
          const issueSnap = await getDoc(issueRef);
          if (issueSnap.exists()) {
            const issueData = issueSnap.data();
            const issueItems = (issueData.items || []).map((it: any) => {
              const retItem = editForm.items.find(ri => ri.productId === (it.toolId || it.productId));
              const origRetItem = origItems.find((oi: any) => (oi.toolId || oi.productId) === (it.toolId || it.productId));
              if (retItem) {
                const delta = Number(retItem.qty) - (origRetItem ? Number(origRetItem.returnQty ?? origRetItem.quantity ?? 0) : 0);
                const newRet = Math.max(0, (it.returnedQuantity || 0) + delta);
                return {
                  ...it,
                  returnedQuantity: newRet
                };
              }
              return it;
            });
            const allRet = issueItems.every((it: any) => (it.returnedQuantity || 0) >= (it.quantity || it.issuedQty || 1));
            const anyRet = issueItems.some((it: any) => (it.returnedQuantity || 0) > 0);
            await updateDoc(issueRef, {
              items: issueItems,
              status: allRet ? 'CLOSED' : (anyRet ? 'PARTIALLY_RETURNED' : 'ISSUED'),
              updatedAt: nowTimestamp,
              updatedBy: editorId
            });
          }
        }

        const updatedReturnItems = editForm.items.map(it => {
          const match = origItems.find((oi: any) => (oi.toolId === it.productId || oi.productId === it.productId));
          return {
            toolId: it.productId,
            toolCode: it.sku || '',
            toolName: it.name,
            serialNumber: it.serialNumber || '',
            returnQty: Number(it.qty) || 1,
            conditionIn: it.conditionIn || origMatch?.conditionIn || 'GOOD',
            actionNeeded: it.actionNeeded || origMatch?.actionNeeded || 'RESTOCK',
            notes: origMatch?.notes || ''
          };
        });

        const existingHistory = origData.editHistory || [];

        await updateDoc(returnRef, {
          employeeId: editForm.employeeId,
          employeeName: editForm.customerOrTech,
          siteName: editForm.siteName,
          notes: editForm.notes,
          items: updatedReturnItems,
          createdAt: newTxDate,
          updatedAt: nowTimestamp,
          updatedBy: editorId,
          lastEditedByName: editorName,
          lastEditedByRole: editorRole,
          lastEditedById: editorId,
          lastEditedAt: nowTimestamp,
          editHistory: [...existingHistory, editAuditRecord]
        });

      } else if (editForm.type === 'ISSUE') {
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
          siteName: editForm.siteName || '',
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

      toast.success(`${editForm.isToolIssue ? 'Tool Issue' : (editForm.isToolReturn ? 'Tool Return' : 'Transaction')} updated successfully by ${editorName} (${editorRole})`);
      setEditForm(null);
      await loadLogs();
    } catch (err: any) {
      console.error('Failed to update transaction:', err);
      toast.error('Failed to update transaction: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (log: LogEntry) => {
    const isTool = log.isToolIssue || log.isToolReturn;
    const confirmMsg = isTool
      ? `Are you sure you want to delete this ${log.isToolIssue ? 'Tool Issue' : 'Tool Return'} (${log.issueNumber || log.id})? This will automatically restore the tool stock.`
      : 'Are you sure you want to delete this transaction log? This will automatically revert the product stock balances.';
    if (!window.confirm(confirmMsg)) return;

    try {
      setIsLoading(true);
      const activeCompanyId = companyId || useAuthStore.getState().company?.companyId || 'company_Zu6sHXTq';
      const userId = useAuthStore.getState().user?.uid || 'System';

      if (log.isToolIssue) {
        const issueRef = doc(db, 'issueTransactions', log.id);
        const issueSnap = await getDoc(issueRef);
        if (issueSnap.exists()) {
          const d = issueSnap.data();
          const items = d.items || [];
          for (const item of items) {
            const netQty = (Number(item.quantity ?? item.issuedQty) || 0) - (Number(item.returnedQuantity ?? item.returnedQty) || 0);
            const toolId = item.toolId || item.productId;
            if (netQty > 0 && toolId) {
              try {
                const toolRef = doc(db, 'products', toolId);
                const toolSnap = await getDoc(toolRef);
                if (toolSnap.exists()) {
                  const tData = toolSnap.data();
                  const curAvail = Number(tData.availableQty) || 0;
                  const curIssued = Number(tData.issuedQty) || 0;
                  await updateDoc(toolRef, {
                    availableQty: curAvail + netQty,
                    issuedQty: Math.max(0, curIssued - netQty),
                    status: 'AVAILABLE',
                    updatedAt: serverTimestamp(),
                    updatedBy: userId
                  });
                }
              } catch (toolErr) {
                console.warn('Failed to revert tool stock:', toolErr);
              }
            }
          }

          try {
            const returnSnap = await getDocs(query(
              collection(db, 'returnTransactions'),
              where('companyId', '==', activeCompanyId),
              where('issueId', '==', log.id)
            ));
            for (const docObj of returnSnap.docs) {
              await deleteDoc(docObj.ref);
            }
          } catch (retErr) {
            console.warn('Failed to delete linked tool returns:', retErr);
          }
        }
        await deleteDoc(issueRef);
        toast.success('Tool issue deleted and tool stock restored successfully');

      } else if (log.isToolReturn) {
        const returnRef = doc(db, 'returnTransactions', log.id);
        const returnSnap = await getDoc(returnRef);
        if (returnSnap.exists()) {
          const d = returnSnap.data();
          const items = d.items || [];
          for (const item of items) {
            const retQty = Number(item.returnQty ?? item.quantity) || 0;
            const toolId = item.toolId || item.productId;
            if (retQty > 0 && toolId) {
              try {
                const toolRef = doc(db, 'products', toolId);
                const toolSnap = await getDoc(toolRef);
                if (toolSnap.exists()) {
                  const tData = toolSnap.data();
                  const curAvail = Number(tData.availableQty) || 0;
                  const curIssued = Number(tData.issuedQty) || 0;
                  await updateDoc(toolRef, {
                    availableQty: Math.max(0, curAvail - retQty),
                    issuedQty: curIssued + retQty,
                    updatedAt: serverTimestamp(),
                    updatedBy: userId
                  });
                }
              } catch (toolErr) {
                console.warn('Failed to revert tool return stock:', toolErr);
              }
            }
          }

          if (d.issueId) {
            try {
              const issueRef = doc(db, 'issueTransactions', d.issueId);
              const issueSnap = await getDoc(issueRef);
              if (issueSnap.exists()) {
                const issueData = issueSnap.data();
                const updatedItems = (issueData.items || []).map((it: any) => {
                  const retItem = items.find((ri: any) => (ri.toolId || ri.productId) === (it.toolId || it.productId));
                  if (retItem) {
                    const newRet = Math.max(0, (it.returnedQuantity || 0) - (retItem.returnQty || retItem.quantity || 0));
                    return { ...it, returnedQuantity: newRet };
                  }
                  return it;
                });
                const anyRet = updatedItems.some((it: any) => (it.returnedQuantity || 0) > 0);
                const allRet = updatedItems.every((it: any) => (it.returnedQuantity || 0) >= (it.quantity || 1));
                await updateDoc(issueRef, {
                  items: updatedItems,
                  status: allRet ? 'CLOSED' : (anyRet ? 'PARTIALLY_RETURNED' : 'ISSUED')
                });
              }
            } catch (syncErr) {
              console.warn('Failed to sync linked issue doc:', syncErr);
            }
          }
        }
        await deleteDoc(returnRef);
        toast.success('Tool return deleted and tool stock restored successfully');

      } else if (log.type === 'ISSUE') {
        const issueRef = doc(db, 'issueTransactions', log.id);
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
                  notes: `Reverted Issue deletion (ID: ${log.id})`,
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
            where('issueId', '==', log.id)
          ));
          for (const docObj of returnSnap.docs) {
            await deleteDoc(docObj.ref);
          }
        } catch (retErr) {
          console.warn('Failed to query/delete linked returns:', retErr);
        }
        await deleteDoc(issueRef);
        toast.success('Transaction deleted and stock reverted successfully');

      } else if (log.type === 'RETURN') {
        const returnRef = doc(db, 'returnTransactions', log.id);
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
                  notes: `Reverted Return deletion (ID: ${log.id})`,
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
        toast.success('Transaction deleted and stock reverted successfully');

      } else if (log.type === 'PURCHASE') {
        const poRef = doc(db, 'purchaseOrders', log.id);
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
                  notes: `Reverted Purchase deletion (ID: ${log.id})`,
                  performedBy: userId
                });
              } catch (stockErr) {
                console.warn('Failed to revert stock for product:', stockErr);
              }
            }
          }
        }
        await deleteDoc(poRef);
        toast.success('Transaction deleted and stock reverted successfully');
      }

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

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      window.print();
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="en"><head><meta charset="utf-8"/><title></title>
      <style>
        @page { size: A4 landscape; margin: 0mm; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 11px; padding: 14mm 16mm; color: #000000; margin: 0; background: #ffffff; }
        h2 { text-align: center; margin-bottom: 4px; font-size: 18px; font-weight: 900; color: #000000; }
        p.sub { text-align: center; color: #000000; margin-bottom: 16px; font-size: 11px; font-weight: 700; }
        table { width: 100%; border-collapse: collapse; border: 1.5px solid #000000; }
        th { background: #000000 !important; color: #ffffff !important; padding: 8px; text-align: left; font-size: 11px; font-weight: 800; border: 1px solid #000000; }
        td { padding: 7px 8px; border: 1px solid #000000; font-size: 11px; vertical-align: top; color: #000000; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 800; border: 1px solid #000000; color: #000000; }
        .ISSUE { background: #f4f4f4; }
        .RETURN { background: #e5e5e5; }
        .PURCHASE { background: #f0f0f0; }
        .TOOL_ISSUE { background: #fef3c7; }
        .TOOL_RETURN { background: #f3e8ff; }
      </style></head><body>
      ${content}
      <p style="text-align:center;margin-top:20px;font-size:10px;color:#000000;font-weight:700;">
        Printed on ${new Date().toLocaleString('en-IN')} • ${company?.companyName || 'Cryodeal'}
      </p>
      </body></html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        window.print();
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 2000);
      }
    }, 300);
  };

  const handlePrintSingle = (log: LogEntry) => {
    printMaterialReceipt(
      {
        id: log.id,
        type: log.type,
        isToolIssue: log.isToolIssue,
        isToolReturn: log.isToolReturn,
        issueNumber: log.issueNumber,
        isDirectReturn: log.isDirectReturn,
        directReturnNumber: log.directReturnNumber,
        date: log.date,
        staffName: log.staffName,
        customerOrTech: log.customerOrTech,
        siteName: log.siteName,
        additionalTechnicians: log.additionalTechnicians,
        notes: log.notes,
        lastEditedByName: log.lastEditedByName,
        lastEditedByRole: log.lastEditedByRole,
        lastEditedAt: log.lastEditedAt,
        items: log.items.map(it => ({
          name: it.name,
          qty: it.qty,
          unit: it.unit || 'pcs',
          sku: it.sku,
          condition: it.conditionOut || it.conditionIn
        }))
      },
      company?.companyName || 'CRYODEAL'
    );
  };

  const filtered = logs.filter(l => {
    if (filter === 'ISSUE' && (l.type !== 'ISSUE' || l.isToolIssue)) return false;
    if (filter === 'RETURN' && (l.type !== 'RETURN' || l.isToolReturn)) return false;
    if (filter === 'TOOL_ISSUE' && !l.isToolIssue) return false;
    if (filter === 'TOOL_RETURN' && !l.isToolReturn) return false;
    if (filter === 'PURCHASE' && l.type !== 'PURCHASE') return false;
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
        || (l.isToolIssue && (s.includes('tool') || s.includes('tiss')))
        || (l.isToolReturn && (s.includes('tool') || s.includes('tret')))
        || (l.lastEditedByName && l.lastEditedByName.toLowerCase().includes(s))
        || (l.lastEditedByRole && l.lastEditedByRole.toLowerCase().includes(s))
        || (l.notes && l.notes.toLowerCase().includes(s))
        || (l.siteName && l.siteName.toLowerCase().includes(s))
        || (l.additionalTechnicians && l.additionalTechnicians.some(t => t.toLowerCase().includes(s)))
        || l.items.some(it => it.name.toLowerCase().includes(s) || (it.sku && it.sku.toLowerCase().includes(s)));
    }
    return true;
  }).sort((a, b) => {
    let cmp = 0;
    if (sortField === 'date') {
      const timeA = a.date?.toDate ? a.date.toDate().getTime() : new Date(a.date || 0).getTime();
      const timeB = b.date?.toDate ? b.date.toDate().getTime() : new Date(b.date || 0).getTime();
      cmp = timeA - timeB;
    } else if (sortField === 'type') {
      const typeKey = (l: LogEntry) => l.isToolIssue ? 'TOOL_ISSUE' : (l.isToolReturn ? 'TOOL_RETURN' : l.type);
      cmp = typeKey(a).localeCompare(typeKey(b));
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
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        {[
          { id: 'ALL', label: 'All Transactions', count: logs.length },
          { id: 'ISSUE', label: 'Material Issues', count: logs.filter(l => l.type === 'ISSUE' && !l.isToolIssue).length },
          { id: 'RETURN', label: 'Material Returns', count: logs.filter(l => l.type === 'RETURN' && !l.isToolReturn).length },
          { id: 'TOOL_ISSUE', label: 'Tool Issues', count: logs.filter(l => l.isToolIssue).length },
          { id: 'TOOL_RETURN', label: 'Tool Returns', count: logs.filter(l => l.isToolReturn).length },
          { id: 'PURCHASE', label: 'Purchases', count: logs.filter(l => l.type === 'PURCHASE').length },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as any)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
              filter === f.id
                ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                : 'bg-background text-muted-foreground border-border hover:bg-muted'
            }`}
          >
            {f.label}
            <span className="ml-1 opacity-70">({f.count})</span>
          </button>
        ))}
        <input
          type="text"
          placeholder="Search by name, tool, product, editor..."
          className="ml-auto h-8 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 w-64"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Print-ready content */}
      <div ref={printRef} className="hidden">
        <h2 style={{ textAlign: 'center', margin: '0 0 4px', fontWeight: '900', color: '#000000' }}>Transaction Log Report</h2>
        <p style={{ textAlign: 'center', fontSize: '11px', color: '#000000', fontWeight: '700', marginBottom: '16px' }}>
          {company?.companyName || 'Cryodeal'} • Filtered: {filter}
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000000' }}>
          <thead>
            <tr>
              <th style={{ background: '#000000', color: '#ffffff', padding: '8px', textAlign: 'left', border: '1px solid #000000', fontWeight: '800' }}>Type & Ref</th>
              <th style={{ background: '#000000', color: '#ffffff', padding: '8px', textAlign: 'left', border: '1px solid #000000', fontWeight: '800' }}>Date & Time</th>
              <th style={{ background: '#000000', color: '#ffffff', padding: '8px', textAlign: 'left', border: '1px solid #000000', fontWeight: '800' }}>Technician / Party</th>
              <th style={{ background: '#000000', color: '#ffffff', padding: '8px', textAlign: 'left', border: '1px solid #000000', fontWeight: '800' }}>Items Dispatched / Returned</th>
              <th style={{ background: '#000000', color: '#ffffff', padding: '8px', textAlign: 'left', border: '1px solid #000000', fontWeight: '800' }}>Staff / Store Keeper</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(log => (
              <tr key={log.id}>
                <td style={{ padding: '7px 8px', border: '1px solid #000000', color: '#000000' }}>
                  <span className={`badge ${log.isToolIssue ? 'TOOL_ISSUE' : (log.isToolReturn ? 'TOOL_RETURN' : log.type)}`}>
                    {log.isToolIssue ? 'TOOL ISSUE' : (log.isToolReturn ? 'TOOL RETURN' : log.type)}
                  </span>
                  {log.isDirectReturn ? (
                    <div style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 'bold', marginTop: '2px', color: '#000000' }}>
                      {log.directReturnNumber || 'CRYO(W/O)-1'}
                      <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#000000', display: 'block' }}>(Direct / W/O)</span>
                    </div>
                  ) : log.issueNumber ? (
                    <div style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 'bold', marginTop: '2px', color: '#000000' }}>
                      {log.type === 'RETURN' && !log.isToolReturn ? `Ref: ${log.issueNumber}` : log.issueNumber}
                    </div>
                  ) : (
                    <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#000000', marginTop: '2px' }}>
                      #{log.id.slice(-6)}
                    </div>
                  )}
                </td>
                <td style={{ padding: '7px 8px', border: '1px solid #000000', fontSize: '11px', color: '#000000', fontWeight: '600' }}>{formatDate(log.date)}</td>
                <td style={{ padding: '7px 8px', border: '1px solid #000000', fontWeight: '800', color: '#000000' }}>{log.customerOrTech}</td>
                <td style={{ padding: '7px 8px', border: '1px solid #000000', fontSize: '11px', color: '#000000', fontWeight: '600' }}>
                  {log.items.map(it => `${it.name} × ${it.qty} ${it.unit || 'pcs'}${it.conditionOut ? ` (${it.conditionOut})` : ''}`).join(', ')}
                </td>
                <td style={{ padding: '7px 8px', border: '1px solid #000000', color: '#000000', fontWeight: '600' }}>
                  <div>{log.staffName}</div>
                  {log.lastEditedByName && (
                    <div style={{ fontSize: '10px', color: '#000000', marginTop: '2px', fontWeight: '800' }}>
                      Audit: Edited by {log.lastEditedByName} ({log.lastEditedByRole || 'Staff'})
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ padding: '16px', textAlign: 'center', color: '#000000', fontWeight: '700' }}>No transactions found</td></tr>
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
                  const badge = getLogBadge(log);
                  const Icon = badge.icon;
                  return (
                    <tr key={log.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.color}`}>
                            <Icon className="h-3.5 w-3.5" /> {badge.label}
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
                            <span className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap ${badge.refClass}`}>
                              {log.type === 'RETURN' && !log.isToolReturn ? `Ref: ${log.issueNumber}` : log.issueNumber}
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
                              <span className="font-medium text-foreground">{it.name}</span>
                              <span className="text-muted-foreground ml-1">× {it.qty} {it.unit || 'pcs'}</span>
                              {it.conditionOut && (
                                <span className="ml-1 text-[10px] text-amber-700 dark:text-amber-400 font-semibold uppercase">
                                  ({it.conditionOut})
                                </span>
                              )}
                              {it.conditionIn && (
                                <span className="ml-1 text-[10px] text-purple-700 dark:text-purple-400 font-semibold uppercase">
                                  ({it.conditionIn})
                                </span>
                              )}
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
                              onClick={() => handleDelete(log)} 
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
            selectedLog.isToolIssue
              ? `Tool Issue Details (${selectedLog.issueNumber || selectedLog.id})`
              : selectedLog.isToolReturn
              ? `Tool Return Details (${selectedLog.issueNumber || selectedLog.id})`
              : selectedLog.type === 'ISSUE' 
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
                {selectedLog.expectedReturnDate && (
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mt-1">
                    Expected Return: <span className="font-bold">{selectedLog.expectedReturnDate}</span>
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground font-semibold uppercase">Date & Time</p>
                <p className="font-medium text-foreground mt-0.5">{formatDate(selectedLog.date)}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {selectedLog.type === 'PURCHASE' ? 'Received in Store By:' : 'Given By / Staff:'}{' '}
                  <span className="font-medium text-foreground">{selectedLog.staffName}</span>
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
                  {selectedLog.isToolIssue
                    ? 'Issued Tools List'
                    : selectedLog.isToolReturn
                    ? 'Returned Tools List'
                    : selectedLog.type === 'ISSUE'
                    ? 'Issued Materials List'
                    : selectedLog.type === 'RETURN'
                    ? 'Returned Materials List'
                    : 'Purchased Materials List'} ({selectedLog.items.length} {selectedLog.items.length === 1 ? 'item' : 'items'})
                </h4>
              </div>

              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/60 text-xs text-muted-foreground uppercase">
                    <tr>
                      <th className="px-4 py-2.5 w-12 text-center">#</th>
                      <th className="px-4 py-2.5">{selectedLog.isToolIssue || selectedLog.isToolReturn ? 'Tool Description' : 'Product Name'}</th>
                      {(selectedLog.isToolIssue || selectedLog.isToolReturn) && (
                        <th className="px-4 py-2.5 w-32 text-center">Condition</th>
                      )}
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
                        {(selectedLog.isToolIssue || selectedLog.isToolReturn) && (
                          <td className="px-4 py-2.5 text-center">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-muted text-foreground uppercase">
                              {it.conditionOut || it.conditionIn || 'GOOD'}
                            </span>
                          </td>
                        )}
                        <td className="px-4 py-2.5 text-right">
                          <span className="font-bold text-base text-primary">{it.qty}</span>{' '}
                          <span className="text-xs font-semibold text-muted-foreground">{it.unit || 'pcs'}</span>
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
            editForm.isToolIssue
              ? `Tool Issue (${editForm.issueNumber || editForm.id})`
              : editForm.isToolReturn
              ? `Tool Return (${editForm.issueNumber || editForm.id})`
              : editForm.type === 'ISSUE' 
              ? `Material Issue (${editForm.issueNumber || editForm.id})` 
              : editForm.type === 'RETURN' 
              ? (editForm.isDirectReturn ? `Direct Material Return (${editForm.directReturnNumber || 'CRYO(W/O)-1'})` : `Material Return ${editForm.issueNumber ? `(from ${editForm.issueNumber})` : ''}`) 
              : 'Purchase Order'
          }`}
          description={`Reference: ${editForm.isDirectReturn ? `${editForm.directReturnNumber || 'CRYO(W/O)-1'} (Direct Return - Without Issue)` : (editForm.issueNumber || editForm.id)} • Originally recorded by ${editForm.staffName}`}
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
              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                {editForm.isToolIssue || editForm.isToolReturn ? 'Tool stock will update automatically' : 'Stock will update automatically'}
              </span>
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

              {/* Site Name (for Issue & Return) */}
              {(editForm.type === 'ISSUE' || editForm.type === 'RETURN') && (
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

              {/* Expected Return Date (for Tool Issue) */}
              {editForm.isToolIssue && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
                    Expected Return Date
                  </label>
                  <input
                    type="date"
                    value={editForm.expectedReturnDate || ''}
                    onChange={(e) => setEditForm(prev => prev ? ({ ...prev, expectedReturnDate: e.target.value }) : null)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              )}

              {/* Additional Technicians (for Issue) */}
              {editForm.type === 'ISSUE' && (
                <div className={editForm.isToolIssue ? "col-span-1" : "col-span-1 sm:col-span-2"}>
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
                  {editForm.isToolIssue
                    ? `Tools in Issue (${editForm.items.length})`
                    : editForm.isToolReturn
                    ? `Tools in Return (${editForm.items.length})`
                    : `Products in Transaction (${editForm.items.length})`}
                </h4>
                <span className="text-[11px] text-muted-foreground">Adjust quantity as needed</span>
              </div>

              {/* Tools Issue Editable Table */}
              {editForm.isToolIssue ? (
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/60 text-xs text-muted-foreground uppercase">
                      <tr>
                        <th className="px-3 py-2.5 w-10 text-center">#</th>
                        <th className="px-3 py-2.5">Tool Name & Code</th>
                        <th className="px-3 py-2.5 w-36 text-center">Condition Out</th>
                        <th className="px-3 py-2.5 w-24 text-right">Orig Qty</th>
                        <th className="px-3 py-2.5 w-32 text-right">New Qty</th>
                        <th className="px-3 py-2.5 w-10 text-center"></th>
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
                            <td className="px-3 py-2 text-center">
                              <select
                                value={item.conditionOut || 'GOOD'}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditForm(prev => {
                                    if (!prev) return null;
                                    const updated = [...prev.items];
                                    updated[idx] = { ...updated[idx], conditionOut: val };
                                    return { ...prev, items: updated };
                                  });
                                }}
                                className="h-8 rounded border border-input bg-background px-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                              >
                                {TOOL_CONDITIONS.map(c => (
                                  <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                              {item.originalQty} pcs
                            </td>
                            <td className="px-3 py-2 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={item.qty === 0 ? '' : item.qty}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                    setEditForm(prev => {
                                      if (!prev) return null;
                                      const updated = [...prev.items];
                                      updated[idx] = { ...updated[idx], qty: isNaN(val) ? 0 : val };
                                      return { ...prev, items: updated };
                                    });
                                  }}
                                  className="w-20 h-8 rounded border border-input bg-background px-2 text-right text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                                <span className="text-xs text-muted-foreground">pcs</span>
                              </div>
                              {diff !== 0 && (
                                <span className={`text-[10px] font-semibold block text-right mt-0.5 ${diff > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                  {diff > 0 ? `+${diff} (deducts store)` : `${diff} (returns store)`}
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
                                  title="Remove Tool"
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
              ) : (
                /* Material Products Table */
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/60 text-xs text-muted-foreground uppercase">
                      <tr>
                        <th className="px-3 py-2.5 w-10 text-center">#</th>
                        <th className="px-3 py-2.5">{editForm.isToolReturn ? 'Tool Name' : 'Product Name'}</th>
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
              )}
            </div>

            {/* Add another item row */}
            {editForm.isToolIssue ? (
              /* Add Tool Row */
              (() => {
                const selectedNewTool = tools.find(t => t.id === selectedNewToolId);
                const newToolAvail = selectedNewTool ? Number(selectedNewTool.availableQty) || 0 : null;

                return (
                  <div className="p-4 bg-muted/20 border border-dashed border-border rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Wrench className="h-3.5 w-3.5 text-amber-600" /> Add Another Tool to Issue
                      </label>
                      {selectedNewTool && (
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                          (newToolAvail ?? 0) > 0 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                            : 'bg-destructive/10 text-destructive border border-destructive/20'
                        }`}>
                          Available in Store: <b>{newToolAvail}</b> pcs
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                      <div className="flex-1">
                        <ToolSearchSelect
                          tools={tools}
                          value={selectedNewToolId}
                          onChange={(id) => {
                            setSelectedNewToolId(id);
                            if (!newToolQty || newToolQty === '0') {
                              setNewToolQty('1');
                            }
                          }}
                          placeholder="Search tool by name, code, brand, serial..."
                        />
                      </div>

                      <div className="w-full sm:w-32">
                        <select
                          value={newToolCondition}
                          onChange={(e) => setNewToolCondition(e.target.value as ToolCondition)}
                          className="w-full h-10 rounded-md border border-input bg-background px-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          {TOOL_CONDITIONS.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="w-full sm:w-24">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          placeholder="Qty"
                          value={newToolQty}
                          onChange={(e) => setNewToolQty(e.target.value)}
                          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-center"
                        />
                      </div>

                      <AppButton
                        type="button"
                        variant="default"
                        className="h-10 px-4 shrink-0 font-semibold shadow-sm"
                        disabled={!selectedNewToolId}
                        onClick={() => {
                          if (!selectedNewToolId) {
                            toast.error('Please select a tool first');
                            return;
                          }
                          const qtyNum = parseInt(newToolQty, 10);
                          if (isNaN(qtyNum) || qtyNum <= 0) {
                            toast.error('Please enter a valid tool quantity');
                            return;
                          }
                          const t = tools.find(tool => tool.id === selectedNewToolId);
                          if (!t) return;

                          setEditForm(prev => {
                            if (!prev) return null;
                            const alreadyIdx = prev.items.findIndex(it => it.productId === t.id);
                            if (alreadyIdx >= 0) {
                              const copy = [...prev.items];
                              copy[alreadyIdx].qty += qtyNum;
                              return { ...prev, items: copy };
                            }
                            return {
                              ...prev,
                              items: [
                                ...prev.items,
                                {
                                  productId: t.id!,
                                  name: t.name,
                                  sku: t.toolCode || '',
                                  unit: 'pcs',
                                  qty: qtyNum,
                                  originalQty: 0,
                                  conditionOut: newToolCondition,
                                  brand: t.brand || '',
                                  serialNumber: t.serialNumber || ''
                                }
                              ]
                            };
                          });

                          toast.success(`Added ${qtyNum} pcs of "${t.name}"`);
                          setSelectedNewToolId('');
                          setNewToolQty('1');
                          setNewToolCondition('GOOD');
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add Tool
                      </AppButton>
                    </div>

                    {selectedNewTool && (
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1.5 border-t border-border/40">
                        <span>Tool Code: <code className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded">{selectedNewTool.toolCode || 'N/A'}</code></span>
                        {selectedNewTool.brand && <span>• Brand: <b className="text-foreground">{selectedNewTool.brand}</b></span>}
                        <span>• Available: <b className="text-foreground">{newToolAvail} pcs</b></span>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              /* Add Product Row */
              (() => {
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
              })()
            )}

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
                  placeholder="e.g. Corrected tool condition or issued quantity"
                />
              </div>
            </div>
          </div>
        </AppDialog>
      )}
    </PageContainer>
  );
}
