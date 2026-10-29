import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import { 
  Plus, Trash2, ArrowLeft, Printer, Eye, 
  ShoppingCart, PackageSearch, CheckCircle2, AlertTriangle, 
  Sparkles, CheckSquare, Square,
  Paperclip, Upload, Download, FileText, Image as ImageIcon, Loader2, Info, Receipt
} from 'lucide-react';
import { toast } from 'sonner';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase/firestore';

import { useAuthStore } from "../../../store/authStore";
import { purchaseOrderRepository } from '../../../repositories/PurchaseOrderRepository';
import { supplierRepository } from '../../../repositories/SupplierRepository';
import { productRepository } from '../../../repositories/ProductRepository';
import type { Supplier } from '../../../shared/types/Supplier';
import type { Product } from '../../../shared/types/Product';
import type { PurchaseOrder, PurchaseAttachment } from '../../../shared/types/PurchaseOrder';
import { printPurchaseOrder } from '../utils/printPurchaseOrder';

import { PageContainer } from '../../../shared/layouts/PageContainer';
import { PageHeader } from '../../../shared/layouts/PageHeader';
import { AppButton } from '../../../shared/app/AppButton';
import { AppCard } from '../../../shared/app/AppCard';
import { AppDialog } from '../../../shared/overlays/AppDialog';
import { ProductSearchSelect } from '../../../shared/forms/ProductSearchSelect';
import { SupplierSearchSelect } from '../../../shared/forms/SupplierSearchSelect';
import { StatusBadge } from '../../../shared/feedback/StatusBadge';
import { cn } from '../../../shared/utils/cn';
import {
  processAttachmentFile,
  formatFileSize,
  isImageFile,
  isPdfFile,
  downloadAttachment,
  validateAttachmentFile
} from '../../../shared/utils/attachmentUtils';

interface FormBillItem {
  id: string; // unique row id
  productId: string;
  productName: string;
  quantity: number | string;
  unit: string;
  unitPrice: number;
  restockNow: boolean; // "Ticking method": whether to restock directly into products
  saveAsNewProduct?: boolean; // if custom product, whether to register into Products catalog
}

export default function PurchaseOrderForm() {
  const { id } = useParams<{ id?: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, company } = useAuthStore();
  const companyId = company?.companyId;

  const prefillProduct = (location.state as any)?.prefillProduct;
  const prefillProductId = searchParams.get('productId') || prefillProduct?.id || '';

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [createdOrders, setCreatedOrders] = useState<PurchaseOrder[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [existingPoNumber, setExistingPoNumber] = useState<string>('');

  // Bill & Header State
  const [supplierId, setSupplierId] = useState(prefillProduct?.supplierId || '');
  const [supplierName, setSupplierName] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [billNumber, setBillNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Bill Attachments State
  const [attachments, setAttachments] = useState<PurchaseAttachment[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<PurchaseAttachment | null>(null);

  // Items State (Ticking Method)
  const [items, setItems] = useState<FormBillItem[]>([
    {
      id: `row-${Date.now()}-1`,
      productId: prefillProductId,
      productName: prefillProduct?.name || '',
      quantity: 1,
      unit: prefillProduct?.unitId || (prefillProduct as any)?.unit || 'pcs',
      unitPrice: 0,
      restockNow: true,
      saveAsNewProduct: true
    }
  ]);

  const loadCreatedOrders = useCallback(async () => {
    if (!companyId) return;
    try {
      const orders = await purchaseOrderRepository.getAll(companyId);
      setCreatedOrders(orders);
    } catch (err) {
      console.error("Failed to load created purchase orders:", err);
    }
  }, [companyId]);

  const loadData = useCallback(async () => {
    if (!companyId) return;
    try {
      const [supData, prodData] = await Promise.all([
        supplierRepository.getAll(companyId),
        productRepository.getAll(companyId)
      ]);
      setSuppliers(supData.filter(s => !s.status || s.status.toLowerCase() === 'active'));
      setProducts(prodData.filter(p => !p.status || p.status.toLowerCase() === 'active'));

      if (!id && prefillProductId) {
        const foundProd = prodData.find(p => p.id === prefillProductId) || prefillProduct;
        if (foundProd) {
          setItems([
            {
              id: `row-${Date.now()}-prefill`,
              productId: prefillProductId,
              productName: foundProd.name,
              quantity: 1,
              unit: foundProd.unitId || (foundProd as any)?.unit || 'pcs',
              unitPrice: 0,
              restockNow: true,
              saveAsNewProduct: true
            }
          ]);
          if (foundProd.supplierId) {
            setSupplierId(foundProd.supplierId);
          }
        }
      }

      if (id) {
        const poSnap = await getDoc(doc(db, 'purchaseOrders', id));
        if (poSnap.exists() && poSnap.data().companyId === companyId) {
          const data = poSnap.data();
          setExistingPoNumber(data.poNumber || '');
          setSupplierId(data.supplierId || '');
          setSupplierName(data.supplierName || '');
          setNotes(data.notes || '');
          if (data.billNumber) setBillNumber(data.billNumber);
          
          let pDate = new Date().toISOString().split('T')[0];
          if (data.purchaseDate) {
            const d = data.purchaseDate.toDate ? data.purchaseDate.toDate() : new Date(data.purchaseDate);
            pDate = d.toISOString().split('T')[0];
          }
          setPurchaseDate(pDate);

          setItems(
            (data.items || []).map((it: any, idx: number) => ({
              id: `edit-row-${idx}`,
              productId: it.productId || '',
              productName: it.productName || '',
              quantity: it.quantity,
              unit: it.unit || 'pcs',
              unitPrice: it.unitPrice || 0,
              restockNow: (it.receivedQuantity || 0) > 0 || data.status === 'Completed',
              saveAsNewProduct: false
            }))
          );

          if (data.attachments && Array.isArray(data.attachments)) {
            setAttachments(data.attachments);
          } else {
            setAttachments([]);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load initial data:", err);
    }
  }, [companyId, id, prefillProductId, prefillProduct]);

  useEffect(() => {
    loadData();
    loadCreatedOrders();
  }, [loadData, loadCreatedOrders]);

  // Low stock products from catalog
  const lowStockProducts = useMemo(() => {
    return products.filter(p => (Number(p.currentStock) || 0) <= (Number(p.minimumStock) || 0));
  }, [products]);

  // Metrics
  const validItems = items.filter(i => (i.productName && i.productName.trim().length > 0) || i.productId);
  const totalUnits = items.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
  const tickedItems = items.filter(i => i.restockNow && ((i.productName && i.productName.trim().length > 0) || i.productId));
  const newItemsToCreate = items.filter(i => !i.productId && i.productName.trim().length > 0 && i.saveAsNewProduct);
  const allTicked = items.length > 0 && items.every(i => i.restockNow);

  // Quick Action: Add all low stock products to the bill
  const handleAddAllLowStock = () => {
    if (lowStockProducts.length === 0) {
      toast.info("No low stock products found in inventory!");
      return;
    }
    const lowItems: FormBillItem[] = lowStockProducts.map((p, idx) => {
      const minStock = Number(p.minimumStock) || 0;
      const curStock = Number(p.currentStock) || 0;
      const needed = Math.max(minStock - curStock, 1);
      const u = p.unitId || (p as any).unit || 'pcs';
      return {
        id: `low-stock-${p.id}-${idx}`,
        productId: p.id || '',
        productName: p.name,
        quantity: needed,
        unit: u,
        unitPrice: 0,
        restockNow: true,
        saveAsNewProduct: false
      };
    });

    setItems(lowItems);
    toast.success(`Loaded ${lowItems.length} low-stock products ready for restocking!`);
  };

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: `row-${Date.now()}-${prev.length + 1}`,
        productId: '',
        productName: '',
        quantity: 1,
        unit: 'pcs',
        unitPrice: 0,
        restockNow: true,
        saveAsNewProduct: true
      }
    ]);
  };

  const handleRemoveItem = (idToRemove: string) => {
    setItems(prev => prev.filter(i => i.id !== idToRemove));
  };

  const handleUpdateItem = (rowId: string, field: keyof FormBillItem, val: any) => {
    setItems(prev =>
      prev.map(i => {
        if (i.id === rowId) {
          return { ...i, [field]: val };
        }
        return i;
      })
    );
  };

  const handleToggleAllTicked = (targetState: boolean) => {
    setItems(prev => prev.map(i => ({ ...i, restockNow: targetState })));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !companyId) return;

    try {
      setIsUploadingAttachment(true);
      const newAttachments: PurchaseAttachment[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const validation = validateAttachmentFile(file);
        if (!validation.valid) {
          toast.error(validation.error);
          continue;
        }
        const att = await processAttachmentFile(file, companyId);
        newAttachments.push(att);
      }

      if (newAttachments.length === 0) return;

      setAttachments(prev => [...prev, ...newAttachments]);
      toast.success(`${newAttachments.length} document(s) attached!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload attachment');
    } finally {
      setIsUploadingAttachment(false);
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = (attId: string) => {
    setAttachments(prev => prev.filter(a => a.id !== attId));
    toast.info("Attachment removed from bill");
  };

  // Submit Handler: Saves PO, creates any new products, automatically restocks ticked products, and prints
  const handleSaveOrder = async (shouldPrint = false) => {
    if (!companyId || !user) return;

    if (validItems.length === 0) {
      toast.error("Please add at least one product or item to the bill");
      return;
    }

    for (const it of validItems) {
      if (!it.quantity || Number(it.quantity) <= 0) {
        toast.error(`Please enter a valid quantity for "${it.productName || 'Item'}"`);
        return;
      }
    }

    try {
      setIsSaving(true);

      // Process items and automatically register new items into Products catalog if needed
      const enrichedItems = [];
      let newProductsCreatedCount = 0;

      for (const item of validItems) {
        let prodId = item.productId || '';
        let finalName = item.productName?.trim() || 'Item';
        let prod = products.find(p => p.id === prodId);

        // If no productId, check if a product with the same name already exists
        if (!prodId && finalName) {
          const matched = products.find(p => p.name.toLowerCase() === finalName.toLowerCase());
          if (matched && matched.id) {
            prodId = matched.id;
            prod = matched;
          } else if (item.saveAsNewProduct) {
            // Automatically register new product into Products section!
            try {
              const newProdId = await productRepository.create({
                companyId,
                name: finalName,
                unitId: item.unit || 'pcs',
                categoryId: '',
                brandId: '',
                openingStock: 0,
                currentStock: 0,
                minimumStock: 5,
                isSerialized: false,
                status: 'Active'
              }, user.uid);

              prodId = newProdId;
              newProductsCreatedCount++;
            } catch (createProdErr) {
              console.warn("Failed to auto-register new product:", createProdErr);
            }
          }
        }

        const unit = prod?.unitId || (prod as any)?.unit || item.unit || 'pcs';
        const qty = Number(item.quantity) || 0;
        const restockQuantity = item.restockNow ? qty : 0;

        enrichedItems.push({
          productId: prodId,
          productName: finalName,
          sku: prod?.sku || '',
          quantity: qty,
          unitPrice: 0,
          totalAmount: 0,
          unit,
          receivedQuantity: restockQuantity,
          restockNow: item.restockNow
        });
      }

      const totalQuantity = enrichedItems.reduce((sum, item) => sum + item.quantity, 0);
      const effectiveSupplierName = supplierName?.trim() || 
        (supplierId ? suppliers.find(s => s.id === supplierId)?.companyName : '') || 
        'Direct Vendor / Cash';

      const allItemsRestocked = enrichedItems.length > 0 && enrichedItems.every(i => i.receivedQuantity >= i.quantity);
      const someItemsRestocked = enrichedItems.some(i => i.receivedQuantity > 0);

      const payload = {
        companyId,
        supplierId: supplierId || '',
        supplierName: effectiveSupplierName,
        billNumber: billNumber.trim() || '',
        status: (allItemsRestocked ? 'Completed' : (someItemsRestocked ? 'Partially Received' : 'Ordered')) as any,
        purchaseDate: new Date(purchaseDate || new Date().toISOString().split('T')[0]),
        notes: notes || '',
        items: enrichedItems,
        totalQuantity,
        totalAmount: 0,
        attachments,
        attachmentUrls: attachments.map(a => a.url),
        createdBy: user.uid
      };

      if (isEditing && id) {
        const poRef = doc(db, 'purchaseOrders', id);
        await updateDoc(poRef, {
          supplierId: supplierId || '',
          supplierName: effectiveSupplierName,
          billNumber: billNumber.trim() || '',
          purchaseDate: new Date(purchaseDate),
          notes: notes || '',
          items: enrichedItems,
          totalQuantity,
          attachments,
          attachmentUrls: attachments.map(a => a.url),
          updatedAt: serverTimestamp()
        });
        toast.success(`Purchase Order ${existingPoNumber || ''} updated!`);
        navigate(`/purchases/${id}`);
      } else {
        const newId = await purchaseOrderRepository.create(payload, user.uid, allItemsRestocked);
        const createdPO = await purchaseOrderRepository.getById(newId, companyId);

        // Feedback message
        const restockedCount = enrichedItems.filter(i => i.receivedQuantity > 0).length;
        if (newProductsCreatedCount > 0 && restockedCount > 0) {
          toast.success(`Order created! ${restockedCount} items restocked & ${newProductsCreatedCount} new product(s) added to Products section!`);
        } else if (restockedCount > 0) {
          toast.success(`Order created! ${restockedCount} product(s) automatically restocked in Products section!`);
        } else {
          toast.success("Purchase Order recorded successfully!");
        }

        // Trigger immediate print if requested
        if (shouldPrint && createdPO) {
          const sup = suppliers.find(s => s.id === createdPO.supplierId) || null;
          printPurchaseOrder(
            createdPO,
            sup,
            company,
            user?.displayName || user?.email || 'Store In-Charge'
          );
        }

        // Refresh live created orders list below and reload products
        await loadCreatedOrders();
        await loadData();

        // Reset form for next order
        setSupplierId('');
        setSupplierName('');
        setBillNumber('');
        setNotes('');
        setAttachments([]);
        setPurchaseDate(new Date().toISOString().split('T')[0]);
        setItems([
          {
            id: `row-${Date.now()}-fresh`,
            productId: '',
            productName: '',
            quantity: 1,
            unit: 'pcs',
            unitPrice: 0,
            restockNow: true,
            saveAsNewProduct: true
          }
        ]);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to save purchase bill");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageContainer>
      {/* Navigation Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <AppButton 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/purchases')} 
            className="-ml-3 text-muted-foreground mb-1 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Purchases
          </AppButton>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <Receipt className="h-6 w-6 text-primary" />
            {isEditing ? `Edit Purchase Bill ${existingPoNumber}` : "Purchase Order Bills"}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Record supplier purchase bills, attach bill & document photos, and tick items to automatically restock products.
          </p>
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
          <AppButton
            type="button"
            variant="outline"
            onClick={() => handleSaveOrder(true)}
            disabled={isSaving}
            className="shadow-xs font-semibold"
          >
            <Printer className="h-4 w-4 mr-2" /> Print Store List
          </AppButton>

          <AppButton
            type="button"
            onClick={() => handleSaveOrder(false)}
            disabled={isSaving}
            className="bg-primary text-primary-foreground font-semibold shadow-xs"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {isSaving ? 'Restocking...' : (isEditing ? 'Save Changes' : 'Save & Restock Products')}
          </AppButton>
        </div>
      </div>

      <div className="space-y-6">
        {/* SECTION 1: Bill & Supplier Details (Full-width 4-column card) */}
        <AppCard className="p-5 border border-border shadow-xs bg-card">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5 uppercase tracking-wider">
                Supplier / Vendor
              </label>
              <SupplierSearchSelect
                supplierId={supplierId}
                supplierName={supplierName}
                onChange={(sId, sName) => {
                  setSupplierId(sId);
                  setSupplierName(sName);
                }}
                suppliers={suppliers}
                placeholder="Type or select supplier..."
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5 uppercase tracking-wider">
                Supplier Bill / Invoice #
              </label>
              <input
                type="text"
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                placeholder="e.g. INV-8921 or Challan #"
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5 uppercase tracking-wider">
                Purchase / Bill Date
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5 uppercase tracking-wider">
                Buying Note / Remarks
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Instructions or remarks..."
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary transition-all"
              />
            </div>
          </div>
        </AppCard>

        {/* SECTION 2: Low Stock Restock Assistant Banner */}
        {lowStockProducts.length > 0 && !isEditing && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-950 dark:text-amber-200">
                  {lowStockProducts.length} store product(s) need refilling
                </p>
                <p className="text-xs text-amber-900/80 dark:text-amber-300/80">
                  Click the button to load all low-stock items into this bill table with calculated restock quantities.
                </p>
              </div>
            </div>
            <AppButton
              type="button"
              onClick={handleAddAllLowStock}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shrink-0 shadow-xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Load All Low Stock Items to Bill
            </AppButton>
          </div>
        )}

        {/* SECTION 3: Main Purchase Items Table (Ticking Method & Stock Impact) */}
        <AppCard className="p-6 border border-border shadow-xs bg-card overflow-visible">
          {/* Table Header Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border mb-4">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-primary" /> Purchase Items & Restock Checklist
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tick items to immediately add their quantities to the Products section when saved.
              </p>
            </div>

            {/* Quick Bulk Ticking Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleToggleAllTicked(true)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
                  allTicked
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                    : "bg-muted/50 text-muted-foreground hover:text-foreground border-border"
                )}
              >
                <CheckSquare className="h-3.5 w-3.5" /> Tick All (Restock All)
              </button>
              <button
                type="button"
                onClick={() => handleToggleAllTicked(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted/50 text-muted-foreground hover:text-foreground border border-border transition-all cursor-pointer"
              >
                <Square className="h-3.5 w-3.5" /> Untick All
              </button>
            </div>
          </div>

          {/* Full-width Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 rounded-lg">
                <tr>
                  <th className="px-3 py-3 text-center w-16 font-bold" title="Tick to restock item to Products section">
                    Restock [✓]
                  </th>
                  <th className="px-4 py-3 font-bold text-left w-[44%]">
                    Product / Item Description
                  </th>
                  <th className="px-4 py-3 font-bold text-left w-[15%]">
                    Current Stock
                  </th>
                  <th className="px-4 py-3 font-bold text-left w-[18%] min-w-[130px]">
                    Bill / Restock Qty
                  </th>
                  <th className="px-4 py-3 font-bold text-left w-[17%]">
                    New Stock Preview
                  </th>
                  <th className="px-3 py-3 text-center w-[6%]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item, index) => {
                  const prod = products.find(p => p.id === item.productId);
                  const isExistingCatalog = Boolean(prod);
                  const currentStock = prod ? Number(prod.currentStock) || 0 : 0;
                  const unit = prod ? (prod.unitId || (prod as any).unit || 'pcs') : (item.unit || 'pcs');
                  const qty = Number(item.quantity) || 0;
                  const newStock = Math.round((currentStock + qty) * 100) / 100;
                  const isNewItem = !item.productId && Boolean(item.productName.trim());

                  return (
                    <tr 
                      key={item.id} 
                      className={cn(
                        "transition-colors",
                        item.restockNow ? "bg-emerald-500/[0.03] hover:bg-emerald-500/[0.07]" : "hover:bg-muted/20"
                      )}
                    >
                      {/* Ticking Checkbox */}
                      <td className="px-3 py-3 text-center">
                        <label className="inline-flex items-center justify-center cursor-pointer p-1">
                          <input
                            type="checkbox"
                            checked={item.restockNow}
                            onChange={(e) => handleUpdateItem(item.id, 'restockNow', e.target.checked)}
                            className="h-5 w-5 rounded border-2 border-border text-emerald-600 focus:ring-emerald-500 cursor-pointer transition-all"
                            title="Tick to automatically restock this product in the Products section"
                          />
                        </label>
                      </td>

                      {/* Product Selector / Input */}
                      <td className="p-3 relative">
                        <ProductSearchSelect
                          value={item.productId || ''}
                          productName={item.productName || ''}
                          onChange={(prodId, prodName, product) => {
                            handleUpdateItem(item.id, 'productId', prodId);
                            handleUpdateItem(item.id, 'productName', prodName || product?.name || '');
                            if (product) {
                              const u = product.unitId || (product as any).unit || 'pcs';
                              handleUpdateItem(item.id, 'unit', u);
                            }
                          }}
                          products={products}
                          allowCustom={true}
                          placeholder="Type any product name or search store items..."
                        />

                        {/* Existing Product SKU or New Product Pill */}
                        {prod?.sku ? (
                          <div className="text-[11px] font-mono text-muted-foreground mt-1 ml-1 flex items-center gap-1.5">
                            <span className="bg-muted px-1.5 py-0.5 rounded border border-border/40 text-[10px]">SKU</span>
                            <span>{prod.sku}</span>
                          </div>
                        ) : isNewItem ? (
                          <div className="flex items-center gap-2 mt-1.5 ml-1">
                            <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-semibold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                              <Sparkles className="h-3 w-3" /> New Item
                            </span>
                            <label className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={item.saveAsNewProduct}
                                onChange={(e) => handleUpdateItem(item.id, 'saveAsNewProduct', e.target.checked)}
                                className="h-3.5 w-3.5 rounded border-input text-primary cursor-pointer"
                              />
                              <span>Add to Products section automatically</span>
                            </label>
                          </div>
                        ) : null}
                      </td>

                      {/* Current Stock */}
                      <td className="px-4 py-3 font-medium">
                        {isExistingCatalog ? (
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold",
                            currentStock > (Number(prod?.minimumStock) || 0)
                              ? "bg-emerald-500/10 text-emerald-600"
                              : "bg-destructive/10 text-destructive"
                          )}>
                            {currentStock} {unit}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs font-medium">New Item (0)</span>
                        )}
                      </td>

                      {/* Bill / Restock Qty Input */}
                      <td className="p-3">
                        <div className="relative flex items-center min-w-[120px]">
                          <input
                            type="number"
                            step="any"
                            min="0.01"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(item.id, 'quantity', e.target.value)}
                            className="w-full h-10 rounded-lg border border-input bg-background px-3 pr-14 text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-primary shadow-xs transition-all"
                            placeholder="1"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border select-none">
                            {unit}
                          </span>
                        </div>
                      </td>

                      {/* Stock After Restock Preview */}
                      <td className="px-4 py-3 font-medium">
                        {item.restockNow ? (
                          isExistingCatalog ? (
                            <div className="text-xs">
                              <span className="text-emerald-600 font-extrabold text-sm block">
                                {currentStock} → {newStock} {unit}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                (+{qty} restocked to inventory)
                              </span>
                            </div>
                          ) : (
                            <div className="text-xs">
                              <span className="text-blue-600 font-extrabold text-sm block">
                                0 → {qty} {unit}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                (New product created with {qty} {unit})
                              </span>
                            </div>
                          )
                        ) : (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-semibold block text-slate-500">Ordered Only</span>
                            <span className="text-[11px]">Stock unchanged until received</span>
                          </div>
                        )}
                      </td>

                      {/* Delete Action */}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={items.length === 1}
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors disabled:opacity-30 cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Add Another Item Button */}
          <div className="pt-4 flex items-center justify-between border-t border-border mt-4">
            <AppButton
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddItem}
              className="text-primary font-semibold hover:bg-primary/10 border-primary/30"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Add Another Product / Item
            </AppButton>

            <span className="text-xs text-muted-foreground font-medium">
              {validItems.length} items configured • {totalUnits} total units
            </span>
          </div>
        </AppCard>

        {/* SECTION 4: Bill & Document Attachments */}
        <AppCard className="p-6 border border-border shadow-xs bg-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Paperclip className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold text-foreground">Bill & Document Attachments</h3>
                {attachments.length > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {attachments.length}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Attach supplier bill, invoice, or receipt photos (Image, PDF, Document).
              </p>
            </div>

            <div>
              <input 
                type="file" 
                multiple 
                accept="image/*,.pdf,.doc,.docx" 
                onChange={handleFileUpload} 
                className="hidden" 
                id="form-bill-upload"
                disabled={isUploadingAttachment}
              />
              <label 
                htmlFor="form-bill-upload" 
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs cursor-pointer ${isUploadingAttachment ? 'opacity-60 pointer-events-none' : ''}`}
              >
                {isUploadingAttachment ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" /> Attach Bill / Document
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Limitations Helper Box */}
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-900 dark:text-blue-200 mb-4">
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
            <div className="space-y-0.5">
              <span className="font-semibold text-blue-950 dark:text-blue-100">Attachment Limitations: </span>
              <span className="text-muted-foreground text-[11px]">
                Maximum <strong>2 MB</strong> per PDF / document bill. Camera photos are accepted up to <strong>10 MB</strong> and auto-compressed to ~200 KB. Formats: <span className="font-mono">PDF, JPG, PNG, WebP, DOC, DOCX</span>.
              </span>
            </div>
          </div>

          {attachments.length === 0 ? (
            <div className="p-8 border-2 border-dashed border-border rounded-xl text-center flex flex-col items-center justify-center bg-muted/20">
              <Paperclip className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-semibold text-foreground">No documents or bills attached yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Attach bills, supplier receipts, or photos to keep complete purchase records.
              </p>
              <label 
                htmlFor="form-bill-upload" 
                className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-primary/40 text-primary hover:bg-primary/10 transition-colors cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5" /> Upload First Bill / Document
              </label>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {attachments.map((att) => {
                const isImg = isImageFile(att.type, att.name);
                const isPdf = isPdfFile(att.type, att.name);

                return (
                  <div 
                    key={att.id} 
                    className="flex flex-col justify-between p-3.5 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start gap-3">
                      {isImg ? (
                        <div 
                          onClick={() => setPreviewAttachment(att)}
                          className="w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0 cursor-pointer border border-border/60 hover:opacity-90"
                        >
                          <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div 
                          onClick={() => setPreviewAttachment(att)}
                          className={`w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer ${isPdf ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-primary/10 text-primary'}`}
                        >
                          {isPdf ? <FileText className="h-7 w-7" /> : <ImageIcon className="h-7 w-7" />}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate" title={att.name}>
                          {att.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatFileSize(att.size)} • Attached
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 mt-3 pt-2.5 border-t border-border/60">
                      <AppButton 
                        type="button"
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setPreviewAttachment(att)}
                        className="h-7 px-2 text-xs"
                        title="View / Preview"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" /> View
                      </AppButton>

                      <AppButton 
                        type="button"
                        variant="ghost" 
                        size="sm" 
                        onClick={() => downloadAttachment(att)}
                        className="h-7 px-2 text-xs"
                        title="Download file"
                      >
                        <Download className="h-3.5 w-3.5 mr-1" /> Download
                      </AppButton>

                      <AppButton 
                        type="button"
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleRemoveAttachment(att.id)}
                        className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        title="Remove attachment"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </AppButton>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </AppCard>

        {/* SECTION 5: Bill Summary & Action Controls Bar */}
        <AppCard className="p-6 border-2 border-primary/20 shadow-md bg-gradient-to-r from-card to-primary/[0.03]">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-foreground">Bill Summary:</span>
                <span className="px-2.5 py-0.5 rounded-md bg-muted text-xs font-bold text-foreground">
                  {validItems.length} Line Items
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-muted text-xs font-bold text-foreground">
                  {totalUnits} Total Units
                </span>
                {attachments.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-md bg-primary/10 text-xs font-bold text-primary flex items-center gap-1">
                    <Paperclip className="h-3 w-3" /> {attachments.length} Bill Document{attachments.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Automatic Restock Feedback */}
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>
                  <strong>{tickedItems.length} ticked item(s)</strong> will be automatically restocked into the Products section.
                </span>
                {newItemsToCreate.length > 0 && (
                  <span className="text-blue-600 dark:text-blue-400 font-bold ml-1">
                    • ({newItemsToCreate.length} new product(s) registered)
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <AppButton
                type="button"
                variant="outline"
                size="lg"
                onClick={() => handleSaveOrder(true)}
                disabled={isSaving}
                className="font-bold shadow-xs h-12 px-6"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Store Purchase List
              </AppButton>

              <AppButton
                type="button"
                size="lg"
                onClick={() => handleSaveOrder(false)}
                disabled={isSaving}
                className="bg-primary text-primary-foreground font-black text-sm shadow-md h-12 px-8"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {isSaving ? 'Updating Products...' : (isEditing ? 'Save Changes' : 'Save & Automatically Restock Products')}
              </AppButton>
            </div>
          </div>
        </AppCard>

        {/* SECTION 5: Recent Created Purchase Orders Table */}
        <div className="pt-8 border-t border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" /> Created Purchase Orders & Bills
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                History of purchase orders and restock bills recorded in the system.
              </p>
            </div>
            <AppButton variant="outline" size="sm" onClick={() => navigate('/purchases')} className="self-start sm:self-auto">
              View All in Purchase Orders →
            </AppButton>
          </div>

          <div className="bg-card rounded-xl border border-border shadow-xs overflow-hidden">
            {createdOrders.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center">
                <PackageSearch className="h-10 w-10 text-muted-foreground mb-2 opacity-50" />
                <p className="text-sm font-semibold text-foreground">No purchase orders created yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Add items in the form above and click &quot;Save & Automatically Restock Products&quot; to create your first order.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Purchase ID</th>
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold">Supplier</th>
                      <th className="px-4 py-3 font-semibold">Items & Qty</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {createdOrders.map((order) => {
                      const totalOrderUnits = order.totalQuantity ?? (order.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
                      const orderDate = order.purchaseDate && typeof (order.purchaseDate as any).toDate === 'function'
                        ? (order.purchaseDate as any).toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : (order.purchaseDate ? new Date(order.purchaseDate as any).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A');

                      const supplierDisplay = order.supplierName || suppliers.find(s => s.id === order.supplierId)?.companyName || 'Direct Vendor / Cash';

                      return (
                        <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <span 
                                onClick={() => navigate(`/purchases/${order.id}`)}
                                className="font-mono font-bold text-primary hover:underline cursor-pointer"
                              >
                                {order.poNumber}
                              </span>
                              {(order.attachments && order.attachments.length > 0) && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20" title={`${order.attachments.length} attached bill document(s)`}>
                                  <Paperclip className="h-3 w-3" /> {order.attachments.length}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                            {orderDate}
                          </td>
                          <td className="px-4 py-3 font-medium text-foreground text-xs">
                            {supplierDisplay}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs font-medium text-foreground">
                              {(order.items || []).length} {(order.items || []).length === 1 ? 'item' : 'items'}
                              <span className="text-muted-foreground font-normal ml-1">({totalOrderUnits} units)</span>
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate max-w-[220px]" title={(order.items || []).map(i => i.productName || 'Item').join(', ')}>
                              {(order.items || []).map(i => i.productName || 'Item').join(', ')}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <StatusBadge status={order.status} />
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              <AppButton
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const sup = suppliers.find(s => s.id === order.supplierId) || null;
                                  printPurchaseOrder(
                                    order,
                                    sup,
                                    company,
                                    user?.displayName || user?.email || 'Store In-Charge'
                                  );
                                }}
                                className="h-8 px-2.5 text-xs font-semibold"
                                title="Print Purchase Order"
                              >
                                <Printer className="h-3.5 w-3.5 mr-1" /> Print
                              </AppButton>
                              <AppButton
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/purchases/${order.id}`)}
                                className="h-8 px-2.5 text-xs font-semibold"
                                title="View Details & Attached Bills"
                              >
                                <Eye className="h-3.5 w-3.5 mr-1" /> View
                              </AppButton>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bill Attachment Preview Modal */}
      <AppDialog 
        isOpen={!!previewAttachment} 
        onClose={() => setPreviewAttachment(null)}
        title={previewAttachment?.name || "Document Preview"}
        description={previewAttachment ? `${formatFileSize(previewAttachment.size)} • Attached Bill Document` : ''}
      >
        <div className="my-4 flex flex-col items-center justify-center max-h-[70vh] overflow-y-auto">
          {previewAttachment && isImageFile(previewAttachment.type, previewAttachment.name) ? (
            <img 
              src={previewAttachment.url} 
              alt={previewAttachment.name} 
              className="max-h-[65vh] w-auto rounded-lg object-contain border border-border shadow-sm" 
            />
          ) : previewAttachment && isPdfFile(previewAttachment.type, previewAttachment.name) ? (
            <iframe 
              src={previewAttachment.url} 
              title={previewAttachment.name} 
              className="w-full h-[60vh] rounded-lg border border-border" 
            />
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/60" />
              <p className="font-semibold text-foreground">{previewAttachment?.name}</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">This document format can be downloaded directly.</p>
              {previewAttachment && (
                <AppButton onClick={() => downloadAttachment(previewAttachment)}>
                  <Download className="h-4 w-4 mr-2" /> Download File
                </AppButton>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 pt-3 border-t border-border">
          {previewAttachment && (
            <AppButton variant="outline" onClick={() => downloadAttachment(previewAttachment)}>
              <Download className="h-4 w-4 mr-2" /> Download
            </AppButton>
          )}
          <AppButton variant="secondary" onClick={() => setPreviewAttachment(null)}>Close</AppButton>
        </div>
      </AppDialog>
    </PageContainer>
  );
}
