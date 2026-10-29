import React from 'react';
import type { PurchaseOrder } from '../../../shared/types/PurchaseOrder';
import type { Supplier } from '../../../shared/types/Supplier';
import type { Company } from '../../../types/Company';
import { CRYODEAL_LOGO_BASE64 } from '../utils/logoDataUri';

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
    <div className="w-full max-w-[820px] mx-auto bg-white text-slate-900 p-8 sm:p-12 font-sans border border-slate-200 rounded-xl print:border-none print:p-0 print:max-w-none print:text-black">
      {/* Header: Logo, Name, PO Number, Date */}
      <div className="flex justify-between items-center pb-6 border-b-3 border-slate-900 gap-6">
        <div className="flex items-center gap-4">
          <div className="w-18 h-18 rounded-xl border border-slate-300 overflow-hidden flex items-center justify-center bg-white shadow-xs shrink-0 print:border-slate-300">
            <img src={CRYODEAL_LOGO_BASE64} alt="Cryodeal Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase leading-none">
              CRYODEAL
            </h1>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1.5">
              Store & Inventory Solutions
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-extrabold uppercase tracking-wider rounded mb-1.5">
            Store Purchase List
          </div>
          <div className="font-mono text-xl font-black text-slate-900 leading-tight">
            {po.poNumber}
          </div>
          <div className="text-xs text-slate-600 mt-1 font-semibold">
            Date: {orderDate}
          </div>
          {supplierName && supplierName !== 'Direct Vendor / Cash' && (
            <div className="text-xs text-slate-500 mt-1">
              Supplier: <strong className="text-slate-800">{supplierName}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Store Items List Table */}
      <div className="my-7">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-900 uppercase text-xs font-black tracking-wider border-t-2 border-b-3 border-slate-900">
              <th className="px-3 py-3 text-center w-14 whitespace-nowrap">#</th>
              <th className="px-4 py-3">Item Description / Products to Buy</th>
              <th className="px-4 py-3 text-right w-40 whitespace-nowrap">Qty to Buy</th>
              <th className="px-3 py-3 text-center w-24 whitespace-nowrap">Bought</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {items.map((item, idx) => {
              const qty = Number(item.quantity) || 0;

              return (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="px-3 py-3.5 text-center text-slate-500 font-bold text-base">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="font-extrabold text-slate-900 text-base">{item.productName || 'Item'}</div>
                    {item.sku && (
                      <div className="text-xs font-mono text-slate-500 mt-1">SKU: {item.sku}</div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right font-black text-slate-900 whitespace-nowrap text-base">
                    {qty} <span className="text-xs font-semibold text-slate-500">{item.unit || 'pcs'}</span>
                  </td>
                  <td className="px-3 py-3.5 text-center">
                    <div className="inline-block w-5 h-5 rounded border-2 border-slate-400 bg-white"></div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Bar */}
      <div className="flex justify-between items-center px-5 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700">
        <div>
          Total Line Items: <span className="font-mono text-slate-900 text-base font-extrabold">{items.length} items</span>
        </div>
        <div>
          Total Units to Buy: <span className="font-mono text-slate-900 text-base font-extrabold">{totalQty} units</span>
        </div>
      </div>

      {/* Note Section (if any) */}
      {po.notes && po.notes.trim() && (
        <div className="my-6 p-4 rounded-xl border border-slate-200 bg-slate-50/80 text-sm">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600 block mb-1">
            Buying Note / Instructions:
          </span>
          <p className="text-slate-900 whitespace-pre-wrap leading-relaxed font-semibold">
            {po.notes.trim()}
          </p>
        </div>
      )}

      {/* Signatures: Verified By & Purchasing Team */}
      <div className="mt-16 pt-8 grid grid-cols-2 gap-20 text-center text-sm">
        <div>
          <div className="border-b-2 border-dashed border-slate-400 h-12 mb-2"></div>
          <p className="font-black text-slate-900 uppercase tracking-wider text-xs">Verified By</p>
          <p className="text-xs text-slate-500 mt-0.5">Store In-Charge / Receiver</p>
          <p className="text-xs text-slate-400 mt-2">Date: __________________</p>
        </div>
        <div>
          <div className="border-b-2 border-dashed border-slate-400 h-12 mb-2"></div>
          <p className="font-black text-slate-900 uppercase tracking-wider text-xs">Purchasing Team</p>
          <p className="text-xs text-slate-500 mt-0.5">Procurement / Buyer</p>
          <p className="text-xs text-slate-400 mt-2">Date: __________________</p>
        </div>
      </div>
    </div>
  );
};
