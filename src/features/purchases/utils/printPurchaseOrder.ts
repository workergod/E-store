import type { PurchaseOrder } from '../../../shared/types/PurchaseOrder';
import type { Supplier } from '../../../shared/types/Supplier';
import type { Company } from '../../../types/Company';

export function generatePurchaseOrderHtml(
  po: PurchaseOrder,
  _supplier?: Supplier | null,
  _company?: Company | null,
  _creatorName?: string
): string {
  const orderDate = po.purchaseDate && typeof (po.purchaseDate as any).toDate === 'function'
    ? (po.purchaseDate as any).toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : (po.purchaseDate ? new Date(po.purchaseDate as any).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A');

  const rowsHtml = (po.items || []).map((item, idx) => {
    const qty = Number(item.quantity) || 0;

    return `
      <tr>
        <td style="text-align: center; color: #64748b; font-weight: 600; padding: 12px 10px;">${idx + 1}</td>
        <td style="padding: 12px 14px;">
          <div style="font-weight: 700; color: #0f172a; font-size: 13px;">${item.productName || 'Item'}</div>
          ${item.sku ? `<div style="font-family: monospace; font-size: 11px; color: #64748b; margin-top: 2px;">SKU: ${item.sku}</div>` : ''}
        </td>
        <td style="text-align: right; font-weight: 800; color: #0f172a; white-space: nowrap; font-size: 14px; padding: 12px 14px;">
          ${qty} <span style="font-size: 12px; color: #64748b; font-weight: 500;">${item.unit || 'pcs'}</span>
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
            margin: 16mm 20mm;
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
            font-size: 13px;
            line-height: 1.5;
          }
          .po-wrapper {
            width: 100%;
            max-width: 750px;
            margin: 0 auto;
            background: #ffffff;
          }
          .header-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 20px;
            border-bottom: 2px solid #0f172a;
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
            border: 1px solid #e2e8f0;
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
          .meta-box {
            text-align: right;
          }
          .po-title {
            font-size: 13px;
            font-weight: 800;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            color: #0f172a;
            margin-bottom: 4px;
          }
          .po-number-val {
            font-family: monospace;
            font-size: 18px;
            font-weight: 800;
            color: #0f172a;
            line-height: 1.2;
          }
          .po-date-val {
            font-size: 12px;
            color: #475569;
            margin-top: 3px;
          }
          .table-container {
            margin: 28px 0 20px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          thead th {
            background: #f8fafc;
            border-top: 1px solid #cbd5e1;
            border-bottom: 2px solid #0f172a;
            padding: 11px 14px;
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #0f172a;
          }
          tbody td {
            border-bottom: 1px solid #e2e8f0;
          }
          tbody tr:last-child td {
            border-bottom: 1px solid #cbd5e1;
          }
          .note-section {
            margin-top: 24px;
            padding: 12px 16px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            background: #f8fafc;
          }
          .note-label {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #475569;
            margin-bottom: 4px;
          }
          .note-content {
            font-size: 12px;
            color: #1e293b;
            margin: 0;
            line-height: 1.5;
            white-space: pre-wrap;
          }
          .signatures-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 100px;
            margin-top: 70px;
            padding-top: 10px;
          }
          .sig-block {
            text-align: center;
          }
          .sig-line {
            border-bottom: 1px dashed #94a3b8;
            height: 48px;
            margin-bottom: 8px;
          }
          .sig-title {
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #0f172a;
            margin: 0;
          }
        </style>
      </head>
      <body>
        <div class="po-wrapper">
          <!-- Header: Logo, Name, PO Number, Date -->
          <div class="header-row">
            <div class="logo-box">
              <img src="/logo.jpg" alt="Cryodeal Logo" class="logo-img" />
              <h1 class="company-title">CRYODEAL</h1>
            </div>

            <div class="meta-box">
              <div class="po-title">Purchase Order</div>
              <div class="po-number-val">${po.poNumber}</div>
              <div class="po-date-val"><strong>Date:</strong> ${orderDate}</div>
            </div>
          </div>

          <!-- Store Items List -->
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th style="width: 50px; text-align: center;">#</th>
                  <th style="text-align: left;">Item Description</th>
                  <th style="width: 140px; text-align: right;">Qty</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>

          <!-- Note -->
          ${po.notes && po.notes.trim() ? `
            <div class="note-section">
              <div class="note-label">Note:</div>
              <p class="note-content">${po.notes.trim()}</p>
            </div>
          ` : ''}

          <!-- Signatures: Verified By and Purchasing Team -->
          <div class="signatures-row">
            <div class="sig-block">
              <div class="sig-line"></div>
              <p class="sig-title">Verified By</p>
            </div>
            <div class="sig-block">
              <div class="sig-line"></div>
              <p class="sig-title">Purchasing Team</p>
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
