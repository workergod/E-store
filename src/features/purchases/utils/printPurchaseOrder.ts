import type { PurchaseOrder } from '../../../shared/types/PurchaseOrder';
import type { Supplier } from '../../../shared/types/Supplier';
import type { Company } from '../../../types/Company';

export function generatePurchaseOrderHtml(
  po: PurchaseOrder,
  supplier?: Supplier | null,
  _company?: Company | null,
  _creatorName?: string
): string {
  const orderDate = po.purchaseDate && typeof (po.purchaseDate as any).toDate === 'function'
    ? (po.purchaseDate as any).toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : (po.purchaseDate ? new Date(po.purchaseDate as any).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A');

  const items = po.items || [];
  const totalQty = items.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
  const supplierName = po.supplierName || supplier?.companyName || '';

  const rowsHtml = items.map((item, idx) => {
    const qty = Number(item.quantity) || 0;

    return `
      <tr>
        <td style="text-align: center; color: #64748b; font-weight: 700; padding: 12px 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px;">
          ${idx + 1}
        </td>
        <td style="padding: 12px 14px; border-bottom: 1px solid #e2e8f0;">
          <div style="font-weight: 800; color: #0f172a; font-size: 14px; line-height: 1.3;">
            ${item.productName || 'Item'}
          </div>
          ${item.sku ? `<div style="font-family: monospace; font-size: 11px; color: #64748b; margin-top: 3px;">SKU: ${item.sku}</div>` : ''}
        </td>
        <td style="text-align: right; font-weight: 900; color: #0f172a; white-space: nowrap; font-size: 15px; padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">
          ${qty} <span style="font-size: 12px; color: #475569; font-weight: 600;">${item.unit || 'pcs'}</span>
        </td>
        <td style="text-align: center; padding: 12px 10px; border-bottom: 1px solid #e2e8f0;">
          <div style="display: inline-block; width: 18px; height: 18px; border: 2px solid #94a3b8; border-radius: 4px; background: #ffffff;"></div>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title></title>
        <style>
          @page {
            size: A4 portrait;
            margin: 0mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #0f172a;
            font-size: 13px;
            line-height: 1.4;
          }
          .po-wrapper {
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
            padding: 16mm 18mm;
            margin: 0 auto;
            background: #ffffff;
          }
          .header-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 18px;
            border-bottom: 2.5px solid #0f172a;
          }
          .logo-box {
            display: flex;
            align-items: center;
            gap: 14px;
          }
          .logo-img {
            width: 52px;
            height: 52px;
            object-fit: contain;
            border-radius: 8px;
            border: 1px solid #cbd5e1;
            background: #ffffff;
          }
          .company-title {
            font-size: 26px;
            font-weight: 900;
            letter-spacing: -0.5px;
            color: #0f172a;
            text-transform: uppercase;
            margin: 0;
            line-height: 1;
          }
          .company-tagline {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: #64748b;
            margin-top: 4px;
          }
          .meta-box {
            text-align: right;
          }
          .doc-badge {
            display: inline-block;
            padding: 4px 10px;
            background: #0f172a;
            color: #ffffff;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            border-radius: 4px;
            margin-bottom: 5px;
          }
          .po-number-val {
            font-family: monospace;
            font-size: 17px;
            font-weight: 900;
            color: #0f172a;
            line-height: 1.2;
          }
          .po-date-val {
            font-size: 12px;
            color: #475569;
            margin-top: 2px;
            font-weight: 600;
          }
          .supplier-line {
            font-size: 11px;
            color: #64748b;
            margin-top: 2px;
          }
          .supplier-line strong {
            color: #1e293b;
          }
          .table-container {
            margin: 22px 0 16px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          thead th {
            background: #f1f5f9;
            border-top: 1.5px solid #0f172a;
            border-bottom: 2px solid #0f172a;
            padding: 10px 12px;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: #0f172a;
          }
          .summary-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 14px;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            margin-top: 14px;
            font-size: 12px;
            font-weight: 700;
            color: #334155;
          }
          .summary-val {
            font-family: monospace;
            font-size: 14px;
            font-weight: 800;
            color: #0f172a;
          }
          .note-section {
            margin-top: 18px;
            padding: 12px 14px;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            background: #f8fafc;
          }
          .note-label {
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #475569;
            margin-bottom: 4px;
          }
          .note-content {
            font-size: 12px;
            color: #0f172a;
            margin: 0;
            line-height: 1.45;
            white-space: pre-wrap;
          }
          .signatures-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 80px;
            margin-top: 55px;
            padding-top: 10px;
          }
          .sig-block {
            text-align: center;
          }
          .sig-line {
            border-bottom: 1.5px dashed #64748b;
            height: 44px;
            margin-bottom: 8px;
          }
          .sig-title {
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: #0f172a;
            margin: 0;
          }
          .sig-sub {
            font-size: 10px;
            color: #64748b;
            margin: 2px 0 0 0;
          }
          .sig-date-line {
            font-size: 10px;
            color: #94a3b8;
            margin-top: 6px;
          }
        </style>
      </head>
      <body>
        <div class="po-wrapper">
          <!-- Header: Logo, Name, Document Type, PO Number, Date -->
          <div class="header-row">
            <div class="logo-box">
              <img src="/logo.jpg" alt="Cryodeal Logo" class="logo-img" />
              <div>
                <h1 class="company-title">CRYODEAL</h1>
                <div class="company-tagline">Store & Inventory Solutions</div>
              </div>
            </div>

            <div class="meta-box">
              <div class="doc-badge">Store Purchase List</div>
              <div class="po-number-val">${po.poNumber}</div>
              <div class="po-date-val">Date: ${orderDate}</div>
              ${supplierName && supplierName !== 'Direct Vendor / Cash' ? `<div class="supplier-line">Supplier: <strong>${supplierName}</strong></div>` : ''}
            </div>
          </div>

          <!-- Store Items to Buy List -->
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th style="width: 45px; text-align: center;">#</th>
                  <th style="text-align: left;">Item Description / Products to Buy</th>
                  <th style="width: 140px; text-align: right;">Qty to Buy</th>
                  <th style="width: 75px; text-align: center;">Bought</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>

          <!-- Summary Bar -->
          <div class="summary-bar">
            <div>
              Total Line Items: <span class="summary-val">${items.length} items</span>
            </div>
            <div>
              Total Units to Buy: <span class="summary-val">${totalQty} units</span>
            </div>
          </div>

          <!-- Note / Instructions (if any) -->
          ${po.notes && po.notes.trim() ? `
            <div class="note-section">
              <div class="note-label">Buying Note / Instructions:</div>
              <p class="note-content">${po.notes.trim()}</p>
            </div>
          ` : ''}

          <!-- Signatures: Verified By and Purchasing Team -->
          <div class="signatures-row">
            <div class="sig-block">
              <div class="sig-line"></div>
              <p class="sig-title">Verified By</p>
              <p class="sig-sub">Store In-Charge / Receiver</p>
              <p class="sig-date-line">Date: __________________</p>
            </div>
            <div class="sig-block">
              <div class="sig-line"></div>
              <p class="sig-title">Purchasing Team</p>
              <p class="sig-sub">Procurement / Buyer</p>
              <p class="sig-date-line">Date: __________________</p>
            </div>
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
