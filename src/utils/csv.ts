/**
 * CSV utilities following RFC 4180.
 *
 * Key guarantees:
 *  - UTF-8 with BOM (Excel auto-detects UTF-8 reliably with BOM).
 *  - CRLF line endings (Excel-friendly; POSIX-spec compliant per RFC 4180).
 *  - Every field is properly escaped: if it contains a comma, double-quote,
 *    carriage return or line feed, it is wrapped in double-quotes and any
 *    inner double-quotes are doubled.
 *  - null / undefined become empty cells (NOT the literal "null"/"undefined").
 *  - The download helper revokes the object URL to avoid memory leaks.
 */

/** Escape a single cell value for inclusion in a CSV row. */
export function csvField(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'string' ? value : String(value);
  // RFC 4180: quote when the field contains comma, quote, CR or LF.
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Build a CSV row from an array of cell values. */
export function csvRow(cells: readonly unknown[]): string {
  return cells.map(csvField).join(',');
}

/** Build a full CSV document from rows (CRLF separated, no trailing newline). */
export function csvDocument(rows: readonly (readonly unknown[])[]): string {
  return rows.map(csvRow).join('\r\n');
}

/** UTF-8 BOM that makes Excel reliably detect the encoding as UTF-8. */
const UTF8_BOM = '\uFEFF';

/** Build a Blob with UTF-8 BOM and `text/csv;charset=utf-8;` MIME. */
export function csvBlob(content: string): Blob {
  return new Blob([UTF8_BOM + content], { type: 'text/csv;charset=utf-8;' });
}

/**
 * Build a CSV Blob directly from rows (most common entrypoint).
 * Convenience over csvDocument + csvBlob.
 */
export function csvRowsBlob(rows: readonly (readonly unknown[])[]): Blob {
  return csvBlob(csvDocument(rows));
}

/**
 * Trigger a CSV file download in the browser.
 * Revokes the object URL after the click to avoid memory leaks.
 */
export function csvDownload(rows: readonly (readonly unknown[])[], filename: string): void {
  const blob = csvRowsBlob(rows);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Defer revocation so the browser has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
