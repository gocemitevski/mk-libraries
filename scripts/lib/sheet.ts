import ExcelJS from 'exceljs';

export type CellValue = string | number | null;
export type Row = Record<string, CellValue>;

/** Ќелиите со хиперлинк доаѓаат како објект - го вадиме текстот/URL-то. */
export function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value instanceof Date) {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${p(value.getDate())}.${p(value.getMonth() + 1)}.${value.getFullYear()}`;
  }
  if (typeof value === 'object') {
    const o = value as {
      text?: string;
      hyperlink?: string;
      richText?: { text: string }[];
      result?: ExcelJS.CellValue;
      error?: string;
    };
    if (o.hyperlink) return String(o.hyperlink).trim();
    if (Array.isArray(o.richText)) return o.richText.map((t) => t.text).join('').trim();
    if (typeof o.text === 'string') return o.text.trim();
    if (o.error) return '';
    if (o.result !== undefined && o.result !== null) return cellText(o.result);
  }
  return '';
}

export async function readWorkbook(path: string): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  return wb;
}

/**
 * Го чита листот како низа речници по име на колона.
 * `headerRow` е 1-базиран ред со имиња на колони; податоците следат.
 */
export function sheetToRows(ws: ExcelJS.Worksheet, headerRow = 1): Row[] {
  const headerValues = ws.getRow(headerRow).values as ExcelJS.CellValue[];
  const headers = headerValues
    .map((v, i) => ({ i, name: cellText(v) }))
    .filter((h) => h.name !== '' && h.i > 0);

  const rows: Row[] = [];
  for (let r = headerRow + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const out: Row = {};
    let any = false;
    for (const h of headers) {
      const cell = row.getCell(h.i);
      const raw = cell.value;
      const value: CellValue =
        typeof raw === 'number' ? raw : cellText(raw) === '' ? null : cellText(raw);
      if (value !== null && value !== '') any = true;
      out[h.name] = value;
    }
    if (any) rows.push(out);
  }
  return rows;
}

/** Текстуална ќелија од лист што нема табеларна структура (нпр. легенда). */
export function sheetColumn(ws: ExcelJS.Worksheet, col = 1): string[] {
  const out: string[] = [];
  for (let r = 1; r <= ws.rowCount; r++) {
    const t = cellText(ws.getRow(r).getCell(col).value);
    out.push(t);
  }
  return out;
}
