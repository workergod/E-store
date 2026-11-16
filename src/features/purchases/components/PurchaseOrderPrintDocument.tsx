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
    <div className="w-full max-w-[820px] mx-auto bg-white text-slate-900 p-5 sm:p-6 font-sans border border-slate-200 rounded-xl print:border-none print:p-0 print:max-w-none print:text-black">
      {/* Header: Logo, Name, PO Number, Date */}
      <div className="flex justify-between items-center pb-3 border-b-2 border-slate-900 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-13 h-13 rounded-lg border border-slate-300 overflow-hidden flex items-center justify-center bg-white shadow-xs shrink-0 print:border-slate-300">
            <img src={CRYODEAL_LOGO_BASE64} alt="Cryodeal Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase leading-none">
              CRYODEAL
            </h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">
              Store & Inventory Solutions
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="inline-block px-2.5 py-0.5 bg-slate-900 text-white text-[11px] font-extrabold uppercase tracking-wider rounded mb-1">
            Store Purchase List
          </div>
          <div className="font-mono text-base font-black text-slate-900 leading-tight">
            {po.poNumber}
          </div>
          <div className="text-[11px] text-slate-600 mt-0.5 font-semibold">
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
      <div className="my-3">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-900 uppercase text-[11px] font-black tracking-wider border-t-2 border-b-2 border-slate-900">
              <th className="px-2.5 py-2 text-center w-12 whitespace-nowrap">#</th>
              <th className="px-3 py-2">Item Description / Products to Buy</th>
              <th className="px-3 py-2 text-right w-36 whitespace-nowrap">Qty to Buy</th>
              <th className="px-2.5 py-2 text-center w-20 whitespace-nowrap">Bought</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {items.map((item, idx) => {
              const qty = Number(item.quantity) || 0;

              return (
                <tr key={idx} className="hover:bg-slate-50/50 break-inside-avoid print:break-inside-avoid">
                  <td className="px-2.5 py-2 text-center text-slate-500 font-bold text-xs">
                    {idx + 1}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-extrabold text-slate-900 text-xs">{item.productName || 'Item'}</div>
                    {item.sku && (
                      <div className="text-[10px] font-mono text-slate-500 mt-0.5">SKU: {item.sku}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-black text-slate-900 whitespace-nowrap text-xs">
                    {qty} <span className="text-[10px] font-semibold text-slate-500">{item.unit || 'pcs'}</span>
                  </td>
                  <td className="px-2.5 py-2 text-center">
                    <div className="inline-block w-4 h-4 rounded border-2 border-slate-400 bg-white"></div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Bar */}
      <div className="flex justify-between items-center px-4 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 break-inside-avoid print:break-inside-avoid">
        <div>
          Total Line Items: <span className="font-mono text-slate-900 text-xs font-extrabold">{items.length} items</span>
        </div>
        <div>
          Total Units to Buy: <span className="font-mono text-slate-900 text-xs font-extrabold">{totalQty} units</span>
        </div>
      </div>

      {/* Note Section (if any) */}
      {po.notes && po.notes.trim() && (
        <div className="my-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50/80 text-xs break-inside-avoid print:break-inside-avoid">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 block mb-0.5">
            Buying Note / Instructions:
          </span>
          <p className="text-slate-900 whitespace-pre-wrap leading-relaxed font-semibold text-[11px]">
            {po.notes.trim()}
          </p>
        </div>
      )}

      {/* Signatures: Verified By & Purchasing Team */}
      <div className="mt-6 pt-2 grid grid-cols-2 gap-16 text-center text-xs break-inside-avoid print:break-inside-avoid">
        <div>
          <div className="border-b-2 border-dashed border-slate-400 h-8 mb-1.5"></div>
          <p className="font-black text-slate-900 uppercase tracking-wider text-[11px]">Verified By</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Store In-Charge / Receiver</p>
          <p className="text-[10px] text-slate-400 mt-1.5">Date: __________________</p>
        </div>
        <div>
          <div className="border-b-2 border-dashed border-slate-400 h-8 mb-1.5"></div>
          <p className="font-black text-slate-900 uppercase tracking-wider text-[11px]">Purchasing Team</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Procurement / Buyer</p>
          <p className="text-[10px] text-slate-400 mt-1.5">Date: __________________</p>
        </div>
      </div>
    </div>
  );
};
