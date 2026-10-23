/**
 * Security Utilities
 * Defensive protections against XSS (Cross-Site Scripting) and Formula Injection (CWE-1236)
 */

/**
 * Escapes HTML entities to prevent Stored & Reflected Cross-Site Scripting (XSS)
 * when rendering dynamic strings into HTML documents or receipts.
 */
export function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitizes CSV cell values to prevent CSV / Spreadsheet Formula Injection (CWE-1236).
 * Any cell starting with =, +, -, @, tab, or carriage return is prefixed with a single quote (')
 * to force Excel / Google Sheets to treat it as plain text rather than executing macros/formulas.
 */
export function sanitizeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  // Detect dangerous formula triggers
  const isFormula = /^[=+\-@\t\r]/.test(str);
  const safeStr = isFormula ? `'${str}` : str;
  return `"${safeStr.replace(/"/g, '""')}"`;
}
