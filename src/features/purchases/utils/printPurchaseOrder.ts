import type { PurchaseOrder } from '../../../shared/types/PurchaseOrder';
import type { Supplier } from '../../../shared/types/Supplier';
import type { Company } from '../../../types/Company';

export function generatePurchaseOrderHtml(
  po: PurchaseOrder,
  supplier?: Supplier | null,
  company?: Company | null,
  creatorName?: string
): string {
  const companyName = company?.companyName || 'Cryodeal';
  const companyAddress = company?.businessAddress || 'Main Central Warehouse & Tool Room, Industrial Area';
  const companyEmail = company?.supportEmail || 'cryodeal2023@gmail.com';
  const companyPhone = company?.supportPhone || '+91-Store Desk';

  const orderDate = po.purchaseDate && typeof (po.purchaseDate as any).toDate === 'function'
    ? (po.purchaseDate as any).toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : (po.purchaseDate ? new Date(po.purchaseDate as any).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A');

  const totalQty = (po.items || []).reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);

  const vendorName = po.supplierName || supplier?.companyName || 'Direct Vendor / Cash';
  const notesText = po.notes?.trim() 
    ? po.notes.trim() 
    : 'Please supply goods in proper packaging along with the original delivery challan/invoice citing PO Number.';

  const rowsHtml = (po.items || []).map((item, idx) => {
    const qty = Number(item.quantity) || 0;

    return `
      <tr>
        <td style="text-align: center; color: #64748b; font-weight: 500; padding: 10px 8px;">${idx + 1}</td>
        <td style="padding: 10px 12px;">
          <div style="font-weight: 700; color: #0f172a; font-size: 13px;">${item.productName || 'Item'}</div>
          ${item.sku ? `<div style="font-family: monospace; font-size: 11px; color: #64748b; margin-top: 2px;">SKU: ${item.sku}</div>` : ''}
        </td>
        <td style="text-align: right; font-weight: 700; color: #0f172a; white-space: nowrap; font-size: 13px; padding: 10px 14px;">
          ${qty} <span style="font-size: 11px; color: #64748b; font-weight: 500;">${item.unit || 'pcs'}</span>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Purchase Order - ${po.poNumber}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm 14mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Helvetica Neue", Arial, sans-serif;
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #0f172a;
            font-size: 12px;
            line-height: 1.4;
          }
          .po-wrapper {
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
            background: #ffffff;
          }
          .header-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: 16px;
            border-bottom: 2px solid #0f172a;
            gap: 20px;
          }
          .logo-box {
            display: flex;
            align-items: center;
            gap: 14px;
          }
          .logo-img {
            width: 60px;
            height: 60px;
            object-fit: contain;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            background: #ffffff;
          }
          .company-title {
            font-size: 24px;
            font-weight: 900;
            letter-spacing: -0.5px;
            color: #0f172a;
            text-transform: uppercase;
            margin: 0;
            line-height: 1.1;
          }
          .company-sub {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: #475569;
            margin: 3px 0 0 0;
          }
          .company-desc {
            font-size: 11px;
            color: #64748b;
            margin: 3px 0 0 0;
            max-width: 380px;
          }
          .company-contact {
            font-size: 11px;
            color: #64748b;
            margin: 2px 0 0 0;
          }
          .company-contact span {
            color: #334155;
            font-weight: 600;
          }
          .meta-box {
            text-align: right;
          }
          .po-pill {
            display: inline-block;
            padding: 4px 12px;
            background: #0f172a;
            color: #ffffff;
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 2px;
            text-transform: uppercase;
            border-radius: 4px;
          }
          .po-number-label {
            font-size: 10px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            margin-top: 8px;
          }
          .po-number-val {
            font-family: monospace;
            font-size: 18px;
            font-weight: 800;
            color: #0f172a;
            line-height: 1.2;
          }
          .po-date-line {
            font-size: 11px;
            color: #475569;
            margin-top: 4px;
          }
          .po-date-line strong {
            color: #0f172a;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin: 16px 0;
          }
          .info-card {
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 12px 14px;
            background: #f8fafc;
          }
          .info-card-label {
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #64748b;
            margin-bottom: 6px;
          }
          .info-card-title {
            font-size: 13px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 4px;
          }
          .info-card-row {
            font-size: 11px;
            color: #475569;
            margin: 2px 0;
          }
          .info-card-row strong {
            color: #1e293b;
          }
          .table-container {
            margin: 16px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          thead th {
            background: #f1f5f9;
            border-top: 1px solid #94a3b8;
            border-bottom: 2px solid #0f172a;
            padding: 9px 10px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #1e293b;
          }
          tbody td {
            padding: 9px 10px;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: middle;
          }
          .totals-grid {
            display: grid;
            grid-template-columns: 1.2fr 1fr;
            gap: 16px;
            margin: 16px 0;
            align-items: start;
          }
          .notes-box {
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 12px 14px;
            background: #f8fafc;
            min-height: 90px;
          }
          .notes-label {
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #64748b;
            margin-bottom: 4px;
          }
          .notes-text {
            font-size: 11px;
            color: #475569;
            font-style: italic;
            line-height: 1.5;
            margin: 0;
          }
          .summary-card {
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            overflow: hidden;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 7px 12px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 11px;
            color: #475569;
          }
          .summary-row strong {
            color: #0f172a;
            font-family: monospace;
          }
          .grand-total-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 12px;
            background: #0f172a;
            color: #ffffff;
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 0.5px;
          }
          .grand-total-val {
            font-family: monospace;
            font-size: 16px;
          }
          .signatures-row {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 24px;
            margin-top: 36px;
            padding-top: 16px;
            border-top: 1px solid #cbd5e1;
            text-align: center;
          }
          .sig-line {
            border-bottom: 1px dashed #94a3b8;
            height: 38px;
            margin-bottom: 6px;
          }
          .sig-title {
            font-size: 11px;
            font-weight: 700;
            color: #0f172a;
            margin: 0;
          }
          .sig-name {
            font-size: 10px;
            color: #64748b;
            margin: 2px 0 0 0;
          }
          .footer-text {
            margin-top: 24px;
            padding-top: 8px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            font-size: 10px;
            color: #94a3b8;
          }
        </style>
      </head>
      <body>
        <div class="po-wrapper">
          <!-- Header -->
          <div class="header-row">
            <div class="logo-box">
              <img src="/logo.jpg" alt="Logo" class="logo-img" />
              <div>
                <h1 class="company-title">${companyName}</h1>
                <p class="company-sub">Industrial Store & Inventory Solutions</p>
                <p class="company-desc">${companyAddress}</p>
                <p class="company-contact">
                  Email: <span>${companyEmail}</span> • Tel: <span>${companyPhone}</span>
                </p>
              </div>
            </div>

            <div class="meta-box">
              <div class="po-pill">Purchase Order</div>
              <div class="po-number-label">PO Number</div>
              <div class="po-number-val">${po.poNumber}</div>
              <div class="po-date-line"><strong>Date:</strong> ${orderDate}</div>
              <div class="po-date-line"><strong>Status:</strong> ${po.status.toUpperCase()}</div>
            </div>
          </div>

          <!-- Vendor & Shipping -->
          <div class="info-grid">
            <div class="info-card">
              <div class="info-card-label">Vendor / Supplier:</div>
              <div class="info-card-title">${vendorName}</div>
              ${supplier?.contactPerson ? `<div class="info-card-row"><strong>Attn:</strong> ${supplier.contactPerson}</div>` : ''}
              ${supplier?.phone ? `<div class="info-card-row"><strong>Phone:</strong> ${supplier.phone}</div>` : ''}
              ${supplier?.email ? `<div class="info-card-row"><strong>Email:</strong> ${supplier.email}</div>` : ''}
              ${supplier?.address ? `<div class="info-card-row"><strong>Address:</strong> ${supplier.address}</div>` : ''}
              ${supplier?.gstNumber ? `<div class="info-card-row"><strong>GST/Tax ID:</strong> ${supplier.gstNumber}</div>` : ''}
            </div>

            <div class="info-card">
              <div class="info-card-label">Ship To / Deliver To:</div>
              <div class="info-card-title">${companyName} Central Store</div>
              <div class="info-card-row"><strong>Attention:</strong> Store Keeper / Nibin John</div>
              <div class="info-card-row"><strong>Location:</strong> Main Store & Receiving Bay</div>
              <div class="info-card-row">${companyAddress}</div>
            </div>
          </div>

          <!-- Items Table -->
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th style="width: 45px; text-align: center;">#</th>
                  <th style="text-align: left;">Item Description & SKU</th>
                  <th style="width: 140px; text-align: right;">Ordered Qty</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>

          <!-- Totals & Notes -->
          <div class="totals-grid">
            <div class="notes-box">
              <div class="notes-label">Notes / Instructions:</div>
              <p class="notes-text">${notesText}</p>
            </div>

            <div class="summary-card">
              <div class="summary-row">
                <span>Total Line Items:</span>
                <strong>${(po.items || []).length} items</strong>
              </div>
              <div class="summary-row" style="background: #f1f5f9; border-bottom: none; font-size: 13px; font-weight: 700; color: #0f172a;">
                <span>Total Quantity to Supply:</span>
                <strong style="font-size: 14px;">${totalQty} units</strong>
              </div>
            </div>
          </div>

          <!-- Signatures -->
          <div class="signatures-row">
            <div>
              <div class="sig-line"></div>
              <p class="sig-title">Prepared By</p>
              <p class="sig-name">${creatorName || 'Store In-Charge'}</p>
            </div>
            <div>
              <div class="sig-line"></div>
              <p class="sig-title">Verified By</p>
              <p class="sig-name">Store Keeper / Receiver</p>
            </div>
            <div>
              <div class="sig-line"></div>
              <p class="sig-title">Authorized Signatory</p>
              <p class="sig-name">Managing Director (MD)</p>
            </div>
          </div>

          <div class="footer-text">
            This is an official computer-generated Purchase Order issued by ${companyName} E-Store System.
          </div>
        </div>
      </body>
    </html>
  `;
}

export function printPurchaseOrder(
  po: PurchaseOrder,
  supplier?: Supplier | null,
  company?: Company | null,
  creatorName?: string
): void {
  const html = generatePurchaseOrderHtml(po, supplier, company, creatorName);
  
  // Create isolated iframe
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
  doc.write(html);
  doc.close();

  // Wait for images and styling to paint, then trigger print
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
      }, 1500);
    }
  }, 250);
}
