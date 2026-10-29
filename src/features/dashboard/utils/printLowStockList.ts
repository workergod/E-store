import type { Product } from '../../../shared/types/Product';
import type { Company } from '../../../types/Company';
import { CRYODEAL_LOGO_BASE64 } from '../../purchases/utils/logoDataUri';

export function generateLowStockListHtml(
  products: Product[],
  company?: Company | null,
  creatorName?: string
): string {
  const companyName = company?.companyName || 'CRYODEAL';
  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const currentTime = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });

  // Filter low stock and out of stock products
  const lowStockProducts = products
    .filter(p => (Number(p.currentStock) || 0) <= (Number(p.minimumStock) || 0))
    .sort((a, b) => (Number(a.currentStock) || 0) - (Number(b.currentStock) || 0));

  const totalItemsCount = lowStockProducts.length;
  const outOfStockCount = lowStockProducts.filter(p => (Number(p.currentStock) || 0) <= 0).length;
  const totalRestockUnits = lowStockProducts.reduce((sum, p) => {
    const cur = Number(p.currentStock) || 0;
    const min = Number(p.minimumStock) || 0;
    const needed = Math.max(min - cur, 1);
    return sum + needed;
  }, 0);

  const rowsHtml = lowStockProducts.map((p, idx) => {
    const cur = Number(p.currentStock) || 0;
    const min = Number(p.minimumStock) || 0;
    const needed = Math.max(min - cur, 1);
    const unit = p.unitId || (p as any).unit || 'pcs';
    const isOut = cur <= 0;

    return `
      <tr>
        <td style="text-align: center; color: #475569; font-weight: 800; padding: 14px 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px;">
          ${idx + 1}
        </td>
        <td style="padding: 14px 14px; border-bottom: 1px solid #e2e8f0;">
          <div style="font-weight: 850; color: #0f172a; font-size: 15px; line-height: 1.35;">
            ${p.name}
          </div>
          <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
            ${p.sku ? `<span style="font-family: monospace; font-size: 11px; color: #64748b; background: #f1f5f9; padding: 1px 6px; border-radius: 4px; border: 1px solid #e2e8f0;">SKU: ${p.sku}</span>` : ''}
            ${p.shortName ? `<span style="font-size: 11px; color: #64748b;">${p.shortName}</span>` : ''}
          </div>
        </td>
        <td style="text-align: center; padding: 14px 12px; border-bottom: 1px solid #e2e8f0;">
          <span style="display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; ${isOut ? 'background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5;' : 'background: #fef3c7; color: #b45309; border: 1px solid #fcd34d;'}">
            ${isOut ? 'Out of Stock' : 'Low Stock'}
          </span>
        </td>
        <td style="text-align: right; padding: 14px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 800; font-size: 14px; ${isOut ? 'color: #dc2626;' : 'color: #d97706;'}">
          ${cur} <span style="font-size: 12px; color: #64748b; font-weight: 600;">${unit}</span>
        </td>
        <td style="text-align: right; padding: 14px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #475569; font-size: 14px;">
          ${min} <span style="font-size: 12px; color: #94a3b8;">${unit}</span>
        </td>
        <td style="text-align: right; padding: 14px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 950; color: #0f172a; font-size: 16px;">
          ${needed} <span style="font-size: 12px; color: #475569; font-weight: 700;">${unit}</span>
        </td>
        <td style="text-align: center; padding: 14px 10px; border-bottom: 1px solid #e2e8f0;">
          <div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #64748b; border-radius: 4px; background: #ffffff;"></div>
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
            font-size: 14px;
            line-height: 1.5;
          }
          .doc-wrapper {
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
            padding: 20mm 22mm;
            margin: 0 auto;
            background: #ffffff;
          }
          .header-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 20px;
            border-bottom: 3px solid #0f172a;
          }
          .logo-box {
            display: flex;
            align-items: center;
            gap: 16px;
          }
          .logo-img {
            width: 68px;
            height: 68px;
            object-fit: contain;
            border-radius: 10px;
            border: 1.5px solid #cbd5e1;
            background: #ffffff;
            display: block;
          }
          .company-title {
            font-size: 30px;
            font-weight: 950;
            letter-spacing: -0.5px;
            color: #0f172a;
            text-transform: uppercase;
            margin: 0;
            line-height: 1;
          }
          .company-tagline {
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: #475569;
            margin-top: 5px;
          }
          .meta-box {
            text-align: right;
          }
          .doc-badge {
            display: inline-block;
            padding: 5px 12px;
            background: #dc2626;
            color: #ffffff;
            font-size: 12px;
            font-weight: 900;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            border-radius: 5px;
            margin-bottom: 6px;
          }
          .doc-date {
            font-size: 13px;
            color: #334155;
            font-weight: 700;
          }
          .doc-time {
            font-size: 11px;
            color: #64748b;
            margin-top: 2px;
          }
          .stats-banner {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 14px;
            margin: 22px 0 18px 0;
          }
          .stat-card {
            border: 1.5px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px 16px;
            background: #f8fafc;
          }
          .stat-label {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: #64748b;
          }
          .stat-val {
            font-size: 20px;
            font-weight: 950;
            color: #0f172a;
            margin-top: 2px;
          }
          .table-container {
            margin: 20px 0 16px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          thead th {
            background: #f1f5f9;
            border-top: 2px solid #0f172a;
            border-bottom: 2.5px solid #0f172a;
            padding: 12px 14px;
            font-size: 12px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: #0f172a;
          }
          .signatures-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 120px;
            margin-top: 60px;
            padding-top: 10px;
          }
          .sig-block {
            text-align: center;
          }
          .sig-line {
            border-bottom: 2px dashed #475569;
            height: 50px;
            margin-bottom: 8px;
          }
          .sig-title {
            font-size: 13px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #0f172a;
            margin: 0;
          }
          .sig-sub {
            font-size: 11px;
            font-weight: 600;
            color: #64748b;
            margin: 3px 0 0 0;
          }
          .sig-date-line {
            font-size: 11px;
            color: #94a3b8;
            margin-top: 6px;
          }
        </style>
      </head>
      <body>
        <div class="doc-wrapper">
          <!-- Header -->
          <div class="header-row">
            <div class="logo-box">
              <img src="${CRYODEAL_LOGO_BASE64}" alt="Cryodeal Logo" class="logo-img" />
              <div>
                <h1 class="company-title">${companyName}</h1>
                <div class="company-tagline">Store & Inventory Solutions</div>
              </div>
            </div>

            <div class="meta-box">
              <div class="doc-badge">Out of Stock Alert List</div>
              <div class="doc-date">Date: ${currentDate}</div>
              <div class="doc-time">Generated: ${currentTime}</div>
            </div>
          </div>

          <!-- Stats Overview -->
          <div class="stats-banner">
            <div class="stat-card" style="border-left: 4px solid #ef4444;">
              <div class="stat-label">Critical Out of Stock</div>
              <div class="stat-val" style="color: #b91c1c;">${outOfStockCount} items</div>
            </div>
            <div class="stat-card" style="border-left: 4px solid #f59e0b;">
              <div class="stat-label">Total Low Stock Items</div>
              <div class="stat-val" style="color: #b45309;">${totalItemsCount} items</div>
            </div>
            <div class="stat-card" style="border-left: 4px solid #0f172a;">
              <div class="stat-label">Total Restock Units Needed</div>
              <div class="stat-val">${totalRestockUnits} units</div>
            </div>
          </div>

          <!-- Items Table -->
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th style="width: 45px; text-align: center;">#</th>
                  <th style="text-align: left;">Product / Item Description</th>
                  <th style="width: 120px; text-align: center;">Status</th>
                  <th style="width: 110px; text-align: right;">Current</th>
                  <th style="width: 100px; text-align: right;">Min Stock</th>
                  <th style="width: 120px; text-align: right;">Qty to Buy</th>
                  <th style="width: 75px; text-align: center;">Bought</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml.length > 0 ? rowsHtml : `
                  <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: #15803d; font-weight: 700;">
                      ✓ All products are stocked at or above minimum levels! No items currently out of stock.
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>

          <!-- Signatures -->
          <div class="signatures-row">
            <div class="sig-block">
              <div class="sig-line"></div>
              <p class="sig-title">Verified By</p>
              <p class="sig-sub">${creatorName || 'Store In-Charge'}</p>
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

export function printLowStockList(
  products: Product[],
  company?: Company | null,
  creatorName?: string
): void {
  const html = generateLowStockListHtml(products, company, creatorName);
  
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
  }, 350);
}
