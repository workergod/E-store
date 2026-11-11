import { CRYODEAL_LOGO_BASE64 } from '../../purchases/utils/logoDataUri';
import { escapeHtml } from '../../../shared/utils/security';

export interface MaterialReceiptItem {
  name: string;
  qty: number;
  unit?: string;
  sku?: string;
  condition?: string;
}

export interface MaterialReceiptData {
  id: string;
  type: 'ISSUE' | 'RETURN' | 'PURCHASE';
  isToolIssue?: boolean;
  isToolReturn?: boolean;
  issueNumber?: string;
  isDirectReturn?: boolean;
  directReturnNumber?: string;
  date: any;
  staffName: string;
  customerOrTech: string;
  employeeRole?: string;
  items: MaterialReceiptItem[];
  notes?: string;
  siteName?: string;
  additionalTechnicians?: string[];
  lastEditedByName?: string;
  lastEditedByRole?: string;
  lastEditedAt?: any;
}

function formatDate(val: any): string {
  if (!val) return '-';
  try {
    let d: Date;
    if (val && typeof val.toDate === 'function') {
      d = val.toDate();
    } else {
      d = new Date(val);
    }
    if (isNaN(d.getTime())) return '-';
    return (
      d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }) +
      ' ' +
      d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    );
  } catch {
    return '-';
  }
}

function isRawUid(str?: string | null): boolean {
  if (!str) return false;
  return /^[A-Za-z0-9_-]{20,36}$/.test(str.trim());
}

function cleanStaffName(name?: string | null): string {
  if (!name) return 'Store Keeper';
  const trimmed = name.trim();
  if (isRawUid(trimmed)) {
    return 'Store Keeper';
  }
  return trimmed;
}

export function generateMaterialReceiptHtml(
  data: MaterialReceiptData,
  companyName: string = 'CRYODEAL'
): string {
  const isToolIssue = Boolean(data.isToolIssue || (data.issueNumber && data.issueNumber.includes('TISS')));
  const isToolReturn = Boolean(data.isToolReturn || (data.issueNumber && data.issueNumber.includes('TRET')));
  const isIssue = data.type === 'ISSUE' && !isToolIssue;
  const isReturn = data.type === 'RETURN' && !isToolReturn;
  const isPurchase = data.type === 'PURCHASE';

  // Headings
  let title = 'MATERIAL ISSUE RECEIPT';
  let subHeading = 'OFFICIAL STORE ISSUE RECORD';
  let partyLabel = 'ISSUED TO (TECHNICIAN)';
  let staffLabel = 'ISSUED BY (STORE KEEPER)';
  let refLabel = data.issueNumber ? 'REFERENCE / ISSUE NO' : 'TRANSACTION ID';
  let refValue = data.issueNumber || data.id;

  if (isToolIssue) {
    title = 'TOOL & EQUIPMENT ISSUE VOUCHER';
    subHeading = 'OFFICIAL STORE TOOL ISSUE RECORD';
    partyLabel = 'ISSUED TO (TECHNICIAN)';
    staffLabel = 'ISSUED BY (STORE KEEPER)';
    refLabel = 'TOOL ISSUE SLIP NO';
    refValue = data.issueNumber || data.id;
  } else if (isToolReturn) {
    title = 'TOOL & EQUIPMENT RETURN ACKNOWLEDGEMENT';
    subHeading = 'OFFICIAL STORE TOOL RETURN RECORD';
    partyLabel = 'RETURNED BY (TECHNICIAN)';
    staffLabel = 'RECEIVED IN STORE BY';
    refLabel = 'TOOL RETURN SLIP NO';
    refValue = data.issueNumber || data.id;
  } else if (isReturn) {
    if (data.isDirectReturn) {
      title = 'DIRECT MATERIAL RETURN RECEIPT';
      subHeading = 'OFFICIAL STORE RETURN RECORD (WITHOUT ISSUE)';
      refLabel = 'DIRECT RETURN NO';
      refValue = data.directReturnNumber || 'CRYO(W/O)-1';
    } else {
      title = 'MATERIAL RETURN RECEIPT';
      subHeading = 'OFFICIAL STORE RETURN RECORD';
      refLabel = data.issueNumber ? 'RETURN REF / ISSUE NO' : 'TRANSACTION ID';
      refValue = data.issueNumber || data.id;
    }
    partyLabel = 'RETURNED BY (TECHNICIAN)';
    staffLabel = 'RECEIVED IN STORE BY';
  } else if (isPurchase) {
    title = 'GOODS RECEIPT / PURCHASE RESTOCK';
    subHeading = 'OFFICIAL GOODS INWARD STORE RECORD';
    refLabel = 'PURCHASE ORDER NO';
    refValue = data.issueNumber || data.id;
    partyLabel = 'SUPPLIER / VENDOR';
    staffLabel = 'RECEIVED IN STORE BY';
  }

  const safeTitle = escapeHtml(title);
  const safeSubHeading = escapeHtml(subHeading);
  const safeRefLabel = escapeHtml(refLabel);
  const safeRefValue = escapeHtml(refValue);
  const safePartyLabel = escapeHtml(partyLabel);
  const safeStaffLabel = escapeHtml(staffLabel);
  const safeCustomerOrTech = escapeHtml(data.customerOrTech || '-');
  const safeStaffName = escapeHtml(cleanStaffName(data.staffName));
  const safeSiteName = data.siteName ? escapeHtml(data.siteName) : '';
  const safeRole = data.employeeRole ? escapeHtml(data.employeeRole) : '';
  const safeAdditionalTechs =
    data.additionalTechnicians && data.additionalTechnicians.length > 0
      ? data.additionalTechnicians.map(t => escapeHtml(t)).join(', ')
      : '';
  const safeNotes = data.notes ? escapeHtml(data.notes) : '';
  const safeLastEditor = data.lastEditedByName ? escapeHtml(data.lastEditedByName) : '';
  const safeLastRole = data.lastEditedByRole ? escapeHtml(data.lastEditedByRole) : 'Staff';

  const items = data.items || [];

  // Signatures configuration
  let sig1Title = 'GIVEN BY / ISSUED BY';
  let sig1Name = safeStaffName;
  let sig1Desc = 'Store Keeper / Issuer';

  let sig2Title = 'RECEIVED BY';
  let sig2Name = safeCustomerOrTech;
  let sig2Desc = 'Technician (Sign & Date)';

  if (isReturn) {
    sig1Title = 'RETURNED BY';
    sig1Name = safeCustomerOrTech;
    sig1Desc = 'Technician (Sign & Date)';

    sig2Title = 'RECEIVED IN STORE BY';
    sig2Name = safeStaffName;
    sig2Desc = 'Store Keeper / Custodian';
  } else if (isPurchase) {
    sig1Title = 'RECEIVED IN STORE';
    sig1Name = safeStaffName;
    sig1Desc = 'Store Keeper';

    sig2Title = 'DELIVERED BY';
    sig2Name = safeCustomerOrTech;
    sig2Desc = 'Supplier / Delivery Agent';
  }

  const rowsHtml = items.map((item, idx) => {
    const qty = Number(item.qty) || 0;
    const unit = item.unit || 'pcs';
    const conditionHtml = item.condition ? `
      <div style="font-size: 11px; font-weight: 800; color: #000000; margin-top: 3px;">
        Condition: <span style="font-weight: 900; text-transform: uppercase;">${escapeHtml(item.condition)}</span>
      </div>
    ` : '';

    return `
      <tr>
        <td style="text-align: center; font-weight: 800; color: #000000; font-size: 13px; padding: 10px 6px; border-bottom: 1.5px solid #000000; border-right: 1px solid #000000;">
          ${idx + 1}
        </td>
        <td style="padding: 10px 12px; border-bottom: 1.5px solid #000000; border-right: 1px solid #000000;">
          <div style="font-weight: 900; color: #000000; font-size: 14px; line-height: 1.35;">
            ${escapeHtml(item.name)}
          </div>
          ${conditionHtml}
        </td>
        <td style="padding: 10px 12px; border-bottom: 1.5px solid #000000; border-right: 1px solid #000000; font-family: monospace; font-size: 12px; font-weight: 800; color: #000000;">
          ${escapeHtml(item.sku || '-')}
        </td>
        <td style="text-align: right; font-weight: 950; color: #000000; white-space: nowrap; font-size: 16px; padding: 10px 14px; border-bottom: 1.5px solid #000000;">
          ${qty} <span style="font-size: 12px; font-weight: 800; color: #000000;">${escapeHtml(unit)}</span>
        </td>
      </tr>
    `;
  }).join('');

  const printTimestamp = formatDate(new Date());

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
            color: #000000 !important;
            font-size: 13px;
            line-height: 1.45;
          }
          .receipt-wrapper {
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
            padding: 16mm 18mm;
            margin: 0 auto;
            background: #ffffff;
            color: #000000;
          }
          .header-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 14px;
            border-bottom: 3px solid #000000;
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
            border-radius: 6px;
            border: 1.5px solid #000000;
            background: #ffffff;
            display: block;
          }
          .company-title {
            font-size: 24px;
            font-weight: 950;
            color: #000000;
            letter-spacing: -0.5px;
            line-height: 1.1;
          }
          .company-sub {
            font-size: 11px;
            font-weight: 800;
            color: #000000;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            margin-top: 3px;
          }
          .company-tagline {
            font-size: 10px;
            font-weight: 700;
            color: #000000;
            margin-top: 1px;
          }
          .doc-type-box {
            text-align: right;
          }
          .doc-title {
            font-size: 20px;
            font-weight: 950;
            text-transform: uppercase;
            color: #000000;
            letter-spacing: 0.5px;
            line-height: 1.15;
          }
          .doc-sub {
            font-size: 10px;
            font-weight: 800;
            color: #000000;
            letter-spacing: 1px;
            text-transform: uppercase;
            margin-top: 3px;
          }
          .doc-ref-label {
            font-size: 11px;
            font-weight: 900;
            color: #000000;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 6px;
          }
          .doc-ref-value {
            font-family: monospace;
            font-weight: 950;
            font-size: 18px;
            color: #000000;
            letter-spacing: 0.5px;
          }

          /* Info Grid Box */
          .info-box {
            border: 2px solid #000000;
            margin-top: 16px;
            margin-bottom: 18px;
            padding: 12px 16px;
            display: flex;
            justify-content: space-between;
            background: #ffffff;
          }
          .info-label {
            font-size: 10.5px;
            font-weight: 900;
            text-transform: uppercase;
            color: #000000;
            letter-spacing: 0.5px;
          }
          .info-value-lg {
            font-size: 16px;
            font-weight: 950;
            color: #000000;
            margin-top: 2px;
          }
          .info-value-sm {
            font-size: 12px;
            font-weight: 750;
            color: #000000;
            margin-top: 2px;
          }
          .info-site {
            font-size: 12px;
            font-weight: 850;
            color: #000000;
            margin-top: 4px;
          }

          /* Table */
          table.items-table {
            width: 100%;
            border-collapse: collapse;
            border: 2px solid #000000;
            margin-top: 4px;
          }
          table.items-table th {
            background: #000000 !important;
            color: #ffffff !important;
            font-size: 11.5px;
            font-weight: 900;
            padding: 10px 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 2px solid #000000;
            border-right: 1px solid #333333;
          }
          table.items-table th:last-child {
            border-right: none;
          }
          .total-row td {
            padding: 10px 14px;
            border-top: 2.5px solid #000000;
            border-bottom: 2px solid #000000;
            background: #f4f4f4 !important;
            color: #000000;
          }

          /* Notes */
          .notes-box {
            border: 1.5px solid #000000;
            padding: 10px 14px;
            margin-top: 14px;
            font-size: 12px;
            color: #000000;
          }

          /* Signatures 4 columns */
          .signatures-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            margin-top: 48px;
            page-break-inside: avoid;
          }
          .sig-column {
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
          }
          .sig-space {
            height: 52px;
          }
          .sig-line {
            border-top: 1.5px solid #000000;
            margin-bottom: 6px;
          }
          .sig-title {
            font-size: 10.5px;
            font-weight: 950;
            color: #000000;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            line-height: 1.25;
          }
          .sig-name {
            font-size: 11px;
            font-weight: 800;
            color: #000000;
            margin-top: 3px;
            line-height: 1.2;
          }
          .sig-desc {
            font-size: 9.5px;
            font-weight: 700;
            color: #000000;
            margin-top: 2px;
          }

          .footer-strip {
            margin-top: 36px;
            border-top: 1px solid #000000;
            padding-top: 6px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 9.5px;
            font-weight: 800;
            color: #000000;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
        </style>
      </head>
      <body>
        <div class="receipt-wrapper">
          <!-- Header -->
          <div class="header-row">
            <div class="logo-box">
              <img src="${CRYODEAL_LOGO_BASE64}" alt="Logo" class="logo-img" />
              <div>
                <div class="company-title">${escapeHtml(companyName)}</div>
                <div class="company-sub">Central Store & Inventory Control</div>
                <div class="company-tagline">Cryodeal Engineering Solutions & Services</div>
              </div>
            </div>
            <div class="doc-type-box">
              <div class="doc-title">${safeTitle}</div>
              <div class="doc-sub">${safeSubHeading}</div>
              <div class="doc-ref-label">${safeRefLabel}</div>
              <div class="doc-ref-value">${safeRefValue}</div>
            </div>
          </div>

          <!-- Metadata Box -->
          <div class="info-box">
            <div>
              <div class="info-label">${safePartyLabel}</div>
              <div class="info-value-lg">${safeCustomerOrTech}</div>
              ${safeRole ? `<div class="info-value-sm">Role: <b>${safeRole}</b></div>` : ''}
              ${safeAdditionalTechs ? `<div class="info-value-sm">Assisting Techs: <b>${safeAdditionalTechs}</b></div>` : ''}
              ${safeSiteName ? `<div class="info-site">Site / Project: <b>${safeSiteName}</b></div>` : ''}
            </div>
            <div style="text-align: right;">
              <div class="info-label">DATE & TIME</div>
              <div class="info-value-lg" style="font-size: 14px;">${formatDate(data.date)}</div>
              <div class="info-label" style="margin-top: 8px;">${safeStaffLabel}</div>
              <div class="info-value-sm" style="font-size: 13px;"><b>${safeStaffName}</b></div>
              ${safeLastEditor ? `
                <div style="font-size: 10px; color: #000000; margin-top: 4px; font-weight: 800;">
                  Audit: Edited by ${safeLastEditor} (${safeLastRole})
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Items Table -->
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 42px; text-align: center;">#</th>
                <th style="text-align: left;">${(isToolIssue || isToolReturn) ? 'Tool / Equipment Description' : 'Product / Item Description'}</th>
                <th style="width: 180px; text-align: left;">${(isToolIssue || isToolReturn) ? 'Tool Code / Tag' : 'SKU / Code'}</th>
                <th style="width: 140px; text-align: right;">Quantity</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
              <tr class="total-row">
                <td colspan="4" style="font-weight: 950; font-size: 13px; text-transform: uppercase;">
                  Total Line Items: ${items.length}
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Notes -->
          ${safeNotes ? `
            <div class="notes-box">
              <span style="font-weight: 950; text-transform: uppercase;">Notes / Remarks:</span> ${safeNotes}
            </div>
          ` : ''}

          <!-- 4 Signatures: Issued/Given By, Received By, Supervisor/Project Engr, Approved By (Right) -->
          <div class="signatures-grid">
            <div class="sig-column">
              <div class="sig-space"></div>
              <div class="sig-line"></div>
              <div class="sig-title">${sig1Title}</div>
              <div class="sig-name">(${sig1Name})</div>
              <div class="sig-desc">${sig1Desc}</div>
            </div>

            <div class="sig-column">
              <div class="sig-space"></div>
              <div class="sig-line"></div>
              <div class="sig-title">${sig2Title}</div>
              <div class="sig-name">(${sig2Name})</div>
              <div class="sig-desc">${sig2Desc}</div>
            </div>

            <div class="sig-column">
              <div class="sig-space"></div>
              <div class="sig-line"></div>
              <div class="sig-title">SUPERVISOR / PROJECT ENGR</div>
              <div class="sig-name">(Signature & Date)</div>
              <div class="sig-desc">Site / Project In-Charge</div>
            </div>

            <div class="sig-column" style="text-align: right;">
              <div class="sig-space"></div>
              <div class="sig-line"></div>
              <div class="sig-title">APPROVED BY</div>
              <div class="sig-name">(Authorized Signatory)</div>
              <div class="sig-desc">Store Manager / Management</div>
            </div>
          </div>

          <!-- Footer Strip -->
          <div class="footer-strip">
            <div>Official Store Inventory Voucher • Cryodeal Store System</div>
            <div>Printed: ${printTimestamp}</div>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function printMaterialReceipt(
  data: MaterialReceiptData,
  companyName: string = 'CRYODEAL'
): void {
  const html = generateMaterialReceiptHtml(data, companyName);

  // Create isolated invisible iframe
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

  // Give base64 images and fonts time to paint, then trigger print
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
  }, 300);
}
