import React from 'react';
import type { PurchaseOrder } from '../../../shared/types/PurchaseOrder';
import type { Supplier } from '../../../shared/types/Supplier';
import type { Company } from '../../../types/Company';

interface PurchaseOrderPrintDocumentProps {
  po: PurchaseOrder;
  supplier?: Supplier | null;
  company?: Company | null;
  creatorName?: string;
}

export const PurchaseOrderPrintDocument: React.FC<PurchaseOrderPrintDocumentProps> = ({
  po,
  supplier
}) => {
  const orderDate = po.purchaseDate && typeof (po.purchaseDate as any).toDate === 'function'
    ? (po.purchaseDate as any).toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : (po.purchaseDate ? new Date(po.purchaseDate as any).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A');

  const items = po.items || [];
  const totalQty = items.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
  const supplierName = po.supplierName || supplier?.companyName || '';

  return (
    <div className="w-full max-w-[760px] mx-auto bg-white text-slate-900 p-8 sm:p-10 font-sans border border-slate-200 rounded-xl print:border-none print:p-0 print:max-w-none print:text-black">
      {/* Header: Logo, Name, PO Number, Date */}
      <div className="flex justify-between items-center pb-5 border-b-2 border-slate-900 gap-6">
        <div className="flex items-center gap-3.5">
          <div className="w-13 h-13 rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center bg-white shadow-xs shrink-0 print:border-slate-300">
            <img src="/logo.jpg" alt="Cryodeal Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase leading-none">
              CRYODEAL
            </h1>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-1">
              Store & Inventory Solutions
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="inline-block px-2.5 py-1 bg-slate-900 text-white text-[11px] font-extrabold uppercase tracking-wider rounded mb-1">
            Store Purchase List
          </div>
          <div className="font-mono text-lg font-black text-slate-900 leading-tight">
            {po.poNumber}
          </div>
          <div className="text-xs text-slate-600 mt-0.5 font-semibold">
            Date: {orderDate}
          </div>
          {supplierName && supplierName !== 'Direct Vendor / Cash' && (
            <div className="text-[11px] text-slate-500 mt-0.5">
              Supplier: <strong className="text-slate-800">{supplierName}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Store Items List Table */}
      <div className="my-6">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-900 uppercase text-[11px] font-extrabold tracking-wider border-t border-b-2 border-slate-900">
              <th className="px-3 py-2.5 text-center w-12 whitespace-nowrap">#</th>
              <th className="px-4 py-2.5">Item Description / Products to Buy</th>
              <th className="px-4 py-2.5 text-right w-36 whitespace-nowrap">Qty to Buy</th>
              <th className="px-3 py-2.5 text-center w-20 whitespace-nowrap">Bought</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {items.map((item, idx) => {
              const qty = Number(item.quantity) || 0;

              return (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="px-3 py-3 text-center text-slate-500 font-bold">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-extrabold text-slate-900 text-sm">{item.productName || 'Item'}</div>
                    {item.sku && (
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">SKU: {item.sku}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-black text-slate-900 whitespace-nowrap text-sm">
                    {qty} <span className="text-xs font-semibold text-slate-500">{item.unit || 'pcs'}</span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="inline-block w-4.5 h-4.5 rounded border-2 border-slate-400 bg-white"></div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Bar */}
      <div className="flex justify-between items-center px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700">
        <div>
          Total Line Items: <span className="font-mono text-slate-900 text-sm">{items.length} items</span>
        </div>
        <div>
          Total Units to Buy: <span className="font-mono text-slate-900 text-sm">{totalQty} units</span>
        </div>
      </div>

      {/* Note Section (if any) */}
      {po.notes && po.notes.trim() && (
        <div className="my-5 p-3.5 rounded-lg border border-slate-200 bg-slate-50/80 text-xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 block mb-1">
            Buying Note / Instructions:
          </span>
          <p className="text-slate-900 whitespace-pre-wrap leading-relaxed font-medium">
            {po.notes.trim()}
          </p>
        </div>
      )}

      {/* Signatures: Verified By & Purchasing Team */}
      <div className="mt-14 pt-6 grid grid-cols-2 gap-16 text-center text-xs">
        <div>
          <div className="border-b-2 border-dashed border-slate-400 h-10 mb-2"></div>
          <p className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px]">Verified By</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Store In-Charge / Receiver</p>
          <p className="text-[10px] text-slate-400 mt-2">Date: __________________</p>
        </div>
        <div>
          <div className="border-b-2 border-dashed border-slate-400 h-10 mb-2"></div>
          <p className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px]">Purchasing Team</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Procurement / Buyer</p>
          <p className="text-[10px] text-slate-400 mt-2">Date: __________________</p>
        </div>
      </div>
    </div>
  );
};
