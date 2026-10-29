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
  po
}) => {
  const orderDate = po.purchaseDate && typeof (po.purchaseDate as any).toDate === 'function'
    ? (po.purchaseDate as any).toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : (po.purchaseDate ? new Date(po.purchaseDate as any).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A');

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
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs font-extrabold uppercase tracking-widest text-slate-900 mb-1">
            Purchase Order
          </div>
          <div className="font-mono text-lg font-black text-slate-900 leading-tight">
            {po.poNumber}
          </div>
          <div className="text-xs text-slate-600 mt-1">
            <span className="font-semibold text-slate-700">Date:</span> {orderDate}
          </div>
        </div>
      </div>

      {/* Store Items List Table */}
      <div className="my-7">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-900 uppercase text-[11px] font-extrabold tracking-wider border-t border-b-2 border-slate-900">
              <th className="px-3 py-2.5 text-center w-12 whitespace-nowrap">#</th>
              <th className="px-4 py-2.5">Item Description</th>
              <th className="px-4 py-2.5 text-right w-36 whitespace-nowrap">Qty</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {(po.items || []).map((item, idx) => {
              const qty = Number(item.quantity) || 0;

              return (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="px-3 py-3 text-center text-slate-500 font-semibold">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-900 text-sm">{item.productName || 'Item'}</div>
                    {item.sku && (
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">SKU: {item.sku}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-extrabold text-slate-900 whitespace-nowrap text-sm">
                    {qty} <span className="text-xs font-normal text-slate-500">{item.unit || 'pcs'}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Note Section */}
      {po.notes && po.notes.trim() && (
        <div className="my-5 p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 text-xs">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 block mb-1">
            Note:
          </span>
          <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">
            {po.notes.trim()}
          </p>
        </div>
      )}

      {/* Signatures: Verified By & Purchasing Team */}
      <div className="mt-16 pt-6 grid grid-cols-2 gap-16 text-center text-xs">
        <div>
          <div className="border-b border-dashed border-slate-400 h-10 mb-2"></div>
          <p className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px]">Verified By</p>
        </div>
        <div>
          <div className="border-b border-dashed border-slate-400 h-10 mb-2"></div>
          <p className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px]">Purchasing Team</p>
        </div>
      </div>
    </div>
  );
};
