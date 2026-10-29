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
  supplier,
  company,
  creatorName
}) => {
  const companyName = company?.companyName || 'Cryodeal';
  const companyAddress = company?.businessAddress || 'Main Central Warehouse & Tool Room, Industrial Area';
  const companyEmail = company?.supportEmail || 'store@cryodeal.com';
  const companyPhone = company?.supportPhone || '+91-Store Desk';

  const orderDate = po.purchaseDate && typeof (po.purchaseDate as any).toDate === 'function'
    ? (po.purchaseDate as any).toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : (po.purchaseDate ? new Date(po.purchaseDate as any).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A');

  const totalQty = (po.items || []).reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);

  const vendorName = po.supplierName || supplier?.companyName || 'Direct Vendor / Cash';

  return (
    <div className="w-full max-w-[850px] mx-auto bg-white text-slate-900 p-8 sm:p-10 font-sans border border-slate-200 rounded-xl print:border-none print:p-0 print:max-w-none print:text-black">
      {/* Header with Cryodeal Logo and PO Header */}
      <div className="flex justify-between items-start pb-6 border-b-2 border-slate-900 gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center bg-white shadow-xs shrink-0 print:border-slate-300">
            <img src="/logo.jpg" alt="Cryodeal Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
              {companyName}
            </h1>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest mt-0.5">
              Industrial Store & Inventory Solutions
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              {companyAddress}
            </p>
            <p className="text-xs text-slate-500">
              Email: <span className="text-slate-700 font-medium">{companyEmail}</span> • Tel: <span className="text-slate-700 font-medium">{companyPhone}</span>
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-bold tracking-widest uppercase rounded">
            Purchase Order
          </div>
          <div className="mt-2">
            <span className="text-xs text-slate-500 uppercase block font-semibold">PO Number</span>
            <span className="font-mono text-xl font-extrabold text-slate-900 block">
              {po.poNumber}
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-600">
            <span className="font-semibold">Date:</span> {orderDate}
          </div>
          <div className="mt-0.5 text-xs text-slate-600">
            <span className="font-semibold">Status:</span>{' '}
            <span className="font-bold uppercase text-slate-800">
              {po.status}
            </span>
          </div>
        </div>
      </div>

      {/* Vendor & Delivery Information */}
      <div className="grid grid-cols-2 gap-8 my-6 text-xs">
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 print:bg-transparent print:border-slate-300">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
            Vendor / Supplier Information:
          </span>
          <p className="text-sm font-bold text-slate-900">{vendorName}</p>
          {supplier?.contactPerson && (
            <p className="text-slate-600 mt-0.5"><span className="font-medium text-slate-700">Attn:</span> {supplier.contactPerson}</p>
          )}
          {supplier?.phone && (
            <p className="text-slate-600 mt-0.5"><span className="font-medium text-slate-700">Phone:</span> {supplier.phone}</p>
          )}
          {supplier?.email && (
            <p className="text-slate-600 mt-0.5"><span className="font-medium text-slate-700">Email:</span> {supplier.email}</p>
          )}
          {supplier?.address && (
            <p className="text-slate-600 mt-0.5"><span className="font-medium text-slate-700">Address:</span> {supplier.address}</p>
          )}
          {supplier?.gstNumber && (
            <p className="text-slate-600 mt-0.5"><span className="font-medium text-slate-700">GST / Tax ID:</span> {supplier.gstNumber}</p>
          )}
        </div>

        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 print:bg-transparent print:border-slate-300">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
            Ship To / Deliver To:
          </span>
          <p className="text-sm font-bold text-slate-900">{companyName} Central Store</p>
          <p className="text-slate-600 mt-0.5"><span className="font-medium text-slate-700">Attention:</span> Store Keeper / Nibin John</p>
          <p className="text-slate-600 mt-0.5"><span className="font-medium text-slate-700">Destination:</span> Main Store & Receiving Bay</p>
          <p className="text-slate-600 mt-0.5">{companyAddress}</p>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="my-6">
        <table className="w-full text-xs text-left border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-100 text-slate-800 uppercase text-[11px] font-bold tracking-wider print:bg-slate-200">
              <th className="border border-slate-300 px-3 py-2.5 text-center w-12 whitespace-nowrap">#</th>
              <th className="border border-slate-300 px-4 py-2.5 whitespace-nowrap">Item Description & SKU</th>
              <th className="border border-slate-300 px-4 py-2.5 text-right w-40 whitespace-nowrap">Ordered Qty</th>
            </tr>
          </thead>
          <tbody>
            {(po.items || []).map((item, idx) => {
              const qty = Number(item.quantity) || 0;

              return (
                <tr key={idx} className="border border-slate-300 hover:bg-slate-50/50">
                  <td className="border border-slate-300 px-3 py-2 text-center text-slate-500 font-medium">
                    {idx + 1}
                  </td>
                  <td className="border border-slate-300 px-4 py-2">
                    <div className="font-bold text-slate-900 text-sm">{item.productName || 'Item'}</div>
                    {item.sku && (
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">SKU: {item.sku}</div>
                    )}
                  </td>
                  <td className="border border-slate-300 px-4 py-2 text-right font-bold text-slate-900 whitespace-nowrap text-sm">
                    {qty} <span className="text-xs font-normal text-slate-500">{item.unit || 'pcs'}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totals & Notes Section */}
      <div className="grid grid-cols-2 gap-8 my-6 text-xs items-start">
        <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 print:border-slate-300">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-1">
            Notes / Special Instructions:
          </span>
          <p className="text-slate-700 italic whitespace-pre-wrap leading-relaxed">
            {po.notes ? po.notes : 'Please supply goods in proper packaging along with the original delivery challan/invoice citing PO Number.'}
          </p>
        </div>

        <div className="border border-slate-300 rounded-lg overflow-hidden">
          <div className="flex justify-between items-center px-4 py-2.5 border-b border-slate-200 bg-slate-50 text-slate-700">
            <span className="font-semibold">Total Line Items:</span>
            <span className="font-bold font-mono">{(po.items || []).length} items</span>
          </div>
          <div className="flex justify-between items-center px-4 py-3 bg-slate-100 text-slate-900 font-bold text-sm">
            <span>Total Quantity to Supply:</span>
            <span className="font-mono text-base">{totalQty} units</span>
          </div>
        </div>
      </div>

      {/* Signatures & Authorizations */}
      <div className="mt-12 pt-8 border-t border-slate-300 grid grid-cols-3 gap-6 text-center text-xs">
        <div>
          <div className="border-b border-slate-400 h-10 mb-2"></div>
          <p className="font-bold text-slate-800">Prepared By</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{creatorName || 'Store In-Charge'}</p>
        </div>
        <div>
          <div className="border-b border-slate-400 h-10 mb-2"></div>
          <p className="font-bold text-slate-800">Verified By</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Store Keeper / Receiver</p>
        </div>
        <div>
          <div className="border-b border-slate-400 h-10 mb-2"></div>
          <p className="font-bold text-slate-800">Authorized Signatory</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Managing Director (MD)</p>
        </div>
      </div>

      {/* Footer Disclaimer */}
      <div className="mt-8 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400">
        This is an official computer-generated Purchase Order issued by {companyName} E-Store System.
      </div>
    </div>
  );
};
