import * as XLSX from 'xlsx';

/* ============================================================
   Excel export helper (SheetJS / xlsx)
   ------------------------------------------------------------
   Produces a real .xlsx workbook from one or more sheets of
   detailed records. Used by the per-page Export buttons.

   Usage:
     exportToExcel({
       filename: 'requirements',
       sheets: [{
         name: 'Requirements',
         columns: [
           { header: 'Delivery ID', key: 'delivery_id' },
           { header: 'Trainers',    value: (r) => r.trainer_required || 0 },
         ],
         rows: [...],
       }],
     });

   Each column has either `key` (read row[key]) or `value(row)`
   (computed). A trailing date stamp is appended to the filename.
   ============================================================ */

export function exportToExcel({ filename = 'export', sheets = [] }) {
  if (!sheets.length) return;

  const wb = XLSX.utils.book_new();

  sheets.forEach((sheet, idx) => {
    const { name = `Sheet${idx + 1}`, columns = [], rows = [] } = sheet;

    const headerRow = columns.map((c) => c.header);
    const dataRows = rows.map((row) =>
      columns.map((c) => {
        const raw = typeof c.value === 'function' ? c.value(row) : row[c.key];
        if (raw == null) return '';
        // Keep numbers as numbers so Excel treats them numerically.
        if (typeof raw === 'number' || typeof raw === 'boolean') return raw;
        return String(raw);
      }),
    );

    const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);

    // Auto-ish column widths based on header + sampled content.
    ws['!cols'] = columns.map((c, ci) => {
      let max = String(c.header || '').length;
      for (let r = 0; r < Math.min(dataRows.length, 200); r++) {
        const cell = dataRows[r][ci];
        const len = cell == null ? 0 : String(cell).length;
        if (len > max) max = len;
      }
      return { wch: Math.min(60, Math.max(10, max + 2)) };
    });

    XLSX.utils.book_append_sheet(wb, ws, String(name).slice(0, 31));
  });

  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${filename}-${stamp}.xlsx`);
}
