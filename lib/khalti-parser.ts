import * as XLSX from "xlsx";

export type ParsedKhaltiRow = {
  sourceRow: number;
  date: Date;
  description: string;
  amount: number;
  balance?: number;
  reference?: string;
};

type SheetCell = string | number | Date | boolean | null | undefined;
type RowObject = Record<string, SheetCell>;

const dateKeys = ["date", "transaction date", "created date", "created at", "txn date"];
const timeKeys = ["time", "transaction time"];
const descriptionKeys = ["description", "particulars", "remarks", "details", "transaction details", "narration", "service", "purpose"];
const amountKeys = ["amount", "transaction amount", "total amount", "paid amount", "received amount"];
const debitKeys = ["debit", "dr", "withdrawal", "paid", "sent", "expense", "amount(-) rs", "amount (-) rs", "amount(-)", "amount -"];
const creditKeys = ["credit", "cr", "deposit", "received", "income", "amount(+) rs", "amount (+) rs", "amount(+)", "amount +"];
const balanceKeys = ["balance", "available balance", "closing balance", "current balance"];
const referenceKeys = ["reference", "reference no", "reference number", "transaction id", "txn id", "id", "token"];

export function parseKhaltiStatementBytes(bytes: ArrayBuffer | Uint8Array): ParsedKhaltiRow[] {
  const workbook = XLSX.read(bytes, {
    type: bytes instanceof ArrayBuffer ? "array" : "buffer",
    raw: false,
    cellDates: true,
  });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) return [];

  const rawRows = XLSX.utils.sheet_to_json<SheetCell[]>(firstSheet, {
    header: 1,
    defval: "",
    blankrows: false,
  });

  const headerIndex = findHeaderIndex(rawRows);
  if (headerIndex === -1) return [];

  const headers = rawRows[headerIndex].map((cell, index) => normalizeHeader(String(cell || `Column ${index + 1}`)));
  return rawRows
    .slice(headerIndex + 1)
    .map((row, index) => toObject(headers, row, headerIndex + index + 2))
    .map(parseKhaltiRow)
    .filter((row): row is ParsedKhaltiRow => Boolean(row));
}

export function previewKhaltiRows(bytes: ArrayBuffer | Uint8Array, limit = 12) {
  return parseKhaltiStatementBytes(bytes).slice(0, limit);
}

function findHeaderIndex(rows: SheetCell[][]) {
  return rows.findIndex((row) => {
    const normalized = row.map((cell) => normalizeHeader(String(cell)));
    const hasDate = normalized.some((cell) => dateKeys.includes(cell));
    const hasDescription = normalized.some((cell) => descriptionKeys.includes(cell));
    const hasAmount =
      normalized.some((cell) => amountKeys.includes(cell)) ||
      normalized.some((cell) => debitKeys.includes(cell)) ||
      normalized.some((cell) => creditKeys.includes(cell));
    return hasDate && hasDescription && hasAmount;
  });
}

function toObject(headers: string[], row: SheetCell[], sourceRow: number): RowObject & { __sourceRow: number } {
  const object = Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])) as RowObject & {
    __sourceRow: number;
  };
  object.__sourceRow = sourceRow;
  return object;
}

function parseKhaltiRow(row: RowObject & { __sourceRow: number }): ParsedKhaltiRow | null {
  const date = parseDate(readFirst(row, dateKeys), readFirst(row, timeKeys));
  const description = buildDescription(row);
  const signedAmount = parseSignedAmount(row);
  const balance = parseAmount(readFirst(row, balanceKeys));
  const reference = String(readFirst(row, referenceKeys) ?? "").trim() || undefined;

  if (!date || !description || signedAmount === null) return null;
  return {
    sourceRow: row.__sourceRow,
    date,
    description,
    amount: signedAmount,
    balance: balance ?? undefined,
    reference,
  };
}

function parseSignedAmount(row: RowObject) {
  const direct = parseAmount(readFirst(row, amountKeys));
  if (direct !== null) {
    const type = String(readFirst(row, ["type", "transaction type", "dr/cr", "debit/credit"]) ?? "").toLowerCase();
    if (/\b(dr|debit|paid|sent|withdrawal)\b/.test(type)) return -Math.abs(direct);
    if (/\b(cr|credit|received|deposit)\b/.test(type)) return Math.abs(direct);
    return direct;
  }

  const debit = parseAmount(readFirst(row, debitKeys));
  const credit = parseAmount(readFirst(row, creditKeys));
  if (debit !== null && debit !== 0) return -Math.abs(debit);
  if (credit !== null && credit !== 0) return Math.abs(credit);
  return null;
}

function buildDescription(row: RowObject) {
  const remarks = String(readFirst(row, ["remarks"]) ?? "").trim();
  const description = String(readFirst(row, descriptionKeys) ?? "").trim();
  const type = String(readFirst(row, ["transaction type", "type"]) ?? "").trim();
  return [remarks, description, type].filter(Boolean).join(" · ");
}

function readFirst(row: RowObject, keys: string[]) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== "") return row[key];
  }
  return undefined;
}

function parseDate(value: SheetCell, timeValue?: SheetCell) {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value;
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return new Date(parsed.y, parsed.m - 1, parsed.d);
  }
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.valueOf())) return null;

  const time = String(timeValue ?? "").trim();
  const match = time.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (match) {
    parsed.setHours(Number(match[1]), Number(match[2]), Number(match[3] ?? 0), 0);
  }
  return parsed;
}

function parseAmount(value: SheetCell) {
  const raw = String(value ?? "")
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "")
    .trim();
  if (!raw) return null;
  const amount = Number(raw);
  return Number.isFinite(amount) ? amount : null;
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
