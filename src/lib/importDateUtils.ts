import * as XLSX from 'xlsx';

/**
 * Configurable list of recognized date field names across ERP modules.
 * Can be extended dynamically as new modules/templates are added.
 */
export const KNOWN_DATE_FIELDS: string[] = [
  'joiningDate',
  'exitDate',
  'attendanceDate',
  'paymentDate',
  'advanceDate',
  'billingDate',
  'invoiceDate',
  'certificationDate',
  'certifyDate',
  'purchaseDate',
  'issueDate',
  'returnDate',
  'transferDate',
  'approvalDate',
  'projectStartDate',
  'projectCompletionDate',
  'agreementDate',
  'workStartDate',
  'financialDate',
  'expenseDate',
  'documentDate',
  'expiryDate',
  'startDate',
  'completionDate',
  'fromDate',
  'toDate',
  'date',
  'entryDate',
  'txnDate',
  'transactionDate',
  'datePaid',
  'dob',
  'doj',
  'doe',
  'validFrom',
  'validTo',
  'orderDate',
  'deliveryDate',
  'voucherDate'
];

/**
 * Checks if a given field name or column header represents a date field.
 */
export function isDateField(fieldName?: string | null): boolean {
  if (!fieldName) return false;
  const clean = fieldName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  
  if (clean.includes('date')) return true;
  if (['doj', 'dob', 'doe', 'fromdate', 'todate'].includes(clean)) return true;
  
  return KNOWN_DATE_FIELDS.some(f => f.toLowerCase() === clean);
}

/**
 * Metadata about an Excel cell or column definition
 */
export interface CellDateInfo {
  isDateColumn?: boolean;
  isDateFormatted?: boolean;
  columnName?: string;
  targetField?: string;
  format?: string;
  cellType?: string;
}

/**
 * Safely access SheetJS SSF library across ESM and CommonJS bundler environments
 */
function getSSF(): any {
  return (XLSX as any)?.SSF || (XLSX as any)?.default?.SSF || null;
}

/**
 * Checks if a number-format code from Excel represents a date format
 */
export function isExcelDateFormat(formatCode?: string): boolean {
  if (!formatCode) return false;
  try {
    const ssf = getSSF();
    if (ssf && typeof ssf.is_date === 'function') {
      return ssf.is_date(formatCode);
    }
    // Fallback regex matching common Excel date formatting patterns
    return /[ymdhs]/i.test(formatCode) && !/^\$?#,##0/i.test(formatCode);
  } catch {
    return false;
  }
}

/**
 * Leap year check for accurate calendar date validation
 */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Returns the maximum days in a given month of a given year
 */
function getDaysInMonth(year: number, month: number): number {
  const days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return days[month - 1] || 0;
}

/**
 * Validates year, month, and day against calendar rules
 */
export function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (isNaN(year) || isNaN(month) || isNaN(day)) return false;
  if (year < 1900 || year > 2150) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > getDaysInMonth(year, month)) return false;
  return true;
}

/**
 * Parses an Excel serial date number (e.g. 46262 for 2026-08-28).
 * Uses SSF.parse_date_code when available with an exact mathematical fallback
 * honoring the 1900 leap-year system.
 */
export function parseExcelSerialDate(serial: number): { y: number; m: number; d: number } | null {
  if (typeof serial !== 'number' || isNaN(serial) || serial <= 0 || serial >= 3000000) {
    return null;
  }

  // 1. Try XLSX SSF parser
  try {
    const ssf = getSSF();
    if (ssf && typeof ssf.parse_date_code === 'function') {
      const parsed = ssf.parse_date_code(serial);
      if (parsed && isValidCalendarDate(parsed.y, parsed.m, parsed.d)) {
        return { y: parsed.y, m: parsed.m, d: parsed.d };
      }
    }
  } catch {
    // proceed to arithmetic fallback
  }

  // 2. High-precision calendar arithmetic
  // Excel epoch: 1 is Jan 1, 1900.
  // Due to Lotus 1-2-3 bug replicated in Excel, 1900 is treated as a leap year,
  // making serial 60 = Feb 29 1900. For serials > 60, one day is subtracted.
  const wholeDays = Math.floor(serial);
  if (wholeDays < 1) return null;
  const adjustedDays = wholeDays > 60 ? wholeDays - 1 : wholeDays;
  
  // Base: Dec 31, 1899 UTC
  const epoch = new Date(Date.UTC(1899, 11, 31));
  epoch.setUTCDate(epoch.getUTCDate() + adjustedDays);

  const y = epoch.getUTCFullYear();
  const m = epoch.getUTCMonth() + 1;
  const d = epoch.getUTCDate();

  if (isValidCalendarDate(y, m, d)) {
    return { y, m, d };
  }

  return null;
}

/**
 * English month names mapping for text dates like "28-Aug-2026"
 */
const MONTH_NAMES_MAP: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12
};

/**
 * Formats a Date object into YYYY-MM-DD avoiding any timezone shifts.
 */
function formatDateObjectToYMD(d: Date): string {
  if (isNaN(d.getTime())) return 'Invalid Date';
  // If midnight in UTC but not in local, it was set as UTC midnight (e.g. SheetJS UTC dates)
  if (
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    (d.getHours() !== 0 || d.getMinutes() !== 0)
  ) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  // Otherwise use local components
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Normalizes an imported date value into standard database format: YYYY-MM-DD.
 * 
 * Handles:
 * 1. Excel serial date numbers (e.g. 46262 -> "2026-08-28")
 * 2. JavaScript Date objects without timezone day-shifting
 * 3. DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY
 * 4. YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD
 * 5. MM/DD/YYYY where clearly applicable
 * 6. Excel formatted date cells
 * 7. Empty/null date values
 * 8. Timestamps (ISO and Unix timestamps)
 * 9. Preserves normal numeric values when column is not a date
 * 
 * @param value The raw imported value from Excel, CSV, or user input
 * @param cellInfoOrIsDate Flag or metadata indicating if the cell/column is a date
 * @returns Normalized "YYYY-MM-DD", empty string for empty input, or "Invalid Date" for unparseable dates
 */
export function normalizeImportedDate(
  value: any,
  cellInfoOrIsDate?: boolean | string | CellDateInfo
): string {
  // 1. Detect empty / null values
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
    return '';
  }

  // Determine whether this value is expected to be a date
  let isDateContext = false;
  if (typeof cellInfoOrIsDate === 'boolean') {
    isDateContext = cellInfoOrIsDate;
  } else if (typeof cellInfoOrIsDate === 'string') {
    isDateContext = isDateField(cellInfoOrIsDate);
  } else if (cellInfoOrIsDate && typeof cellInfoOrIsDate === 'object') {
    isDateContext = Boolean(
      cellInfoOrIsDate.isDateColumn ||
      cellInfoOrIsDate.isDateFormatted ||
      cellInfoOrIsDate.cellType === 'd' ||
      isExcelDateFormat(cellInfoOrIsDate.format) ||
      (cellInfoOrIsDate.columnName && isDateField(cellInfoOrIsDate.columnName)) ||
      (cellInfoOrIsDate.targetField && isDateField(cellInfoOrIsDate.targetField))
    );
  }

  // 2. JavaScript Date objects
  if (value instanceof Date) {
    return formatDateObjectToYMD(value);
  }

  // 3. Numbers / Numeric inputs
  if (typeof value === 'number') {
    // If NOT in a date context, PRESERVE numeric value untouched (do not damage amounts, rates, etc.)
    if (!isDateContext) {
      return String(value);
    }

    // In date context: check if it's an Excel serial date
    const parsedExcel = parseExcelSerialDate(value);
    if (parsedExcel) {
      const y = parsedExcel.y;
      const m = String(parsedExcel.m).padStart(2, '0');
      const d = String(parsedExcel.d).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    // Unix timestamp in milliseconds (e.g. 1787923200000)
    if (value > 100000000000) {
      const d = new Date(value);
      return formatDateObjectToYMD(d);
    }

    // Unix timestamp in seconds (e.g. 1787923200)
    if (value > 1000000000) {
      const d = new Date(value * 1000);
      return formatDateObjectToYMD(d);
    }

    return 'Invalid Date';
  }

  // 4. String parsing
  const strVal = String(value).trim();
  if (strVal === '') return '';

  // 4a. Pure numeric string in date context (e.g. "46262")
  if (/^\d+(\.\d+)?$/.test(strVal)) {
    if (!isDateContext) {
      return strVal;
    }
    const num = Number(strVal);
    const parsedExcel = parseExcelSerialDate(num);
    if (parsedExcel) {
      const y = parsedExcel.y;
      const m = String(parsedExcel.m).padStart(2, '0');
      const d = String(parsedExcel.d).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  // 4b. ISO / Standard YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD (with optional timestamp)
  const ymdMatch = strVal.match(/^(\d{4})[-\/\.](\d{1,2})[-\/\.](\d{1,2})(?:[T\s].*)?$/);
  if (ymdMatch) {
    const y = parseInt(ymdMatch[1], 10);
    const m = parseInt(ymdMatch[2], 10);
    const d = parseInt(ymdMatch[3], 10);
    if (isValidCalendarDate(y, m, d)) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // 4c. DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY (with optional timestamp)
  const dmyMatch = strVal.match(/^(\d{1,2})[-\/\.](\d{1,2})[-\/\.](\d{2,4})(?:[T\s].*)?$/);
  if (dmyMatch) {
    const part1 = parseInt(dmyMatch[1], 10);
    const part2 = parseInt(dmyMatch[2], 10);
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) {
      year += year >= 50 ? 1900 : 2000;
    }

    // MM/DD/YYYY where clearly applicable:
    // If part1 <= 12 and part2 > 12, part2 is day and part1 is month (e.g. 08/28/2026)
    if (part1 <= 12 && part2 > 12) {
      if (isValidCalendarDate(year, part1, part2)) {
        return `${year}-${String(part1).padStart(2, '0')}-${String(part2).padStart(2, '0')}`;
      }
    }

    // Default primary standard: DD/MM/YYYY (e.g. 28-08-2026)
    if (isValidCalendarDate(year, part2, part1)) {
      return `${year}-${String(part2).padStart(2, '0')}-${String(part1).padStart(2, '0')}`;
    }

    // Fallback if part1 <= 12 and part2 <= 12: try as MM/DD/YYYY if DD/MM/YYYY was invalid
    if (isValidCalendarDate(year, part1, part2)) {
      return `${year}-${String(part1).padStart(2, '0')}-${String(part2).padStart(2, '0')}`;
    }
  }

  // 4d. Word month formats like "28-Aug-2026", "28 Aug 2026", "August 28, 2026"
  const wordMonthMatch1 = strVal.match(/^(\d{1,2})[-\s]([A-Za-z]+)[-\s](\d{2,4})/);
  if (wordMonthMatch1) {
    const day = parseInt(wordMonthMatch1[1], 10);
    const monthKey = wordMonthMatch1[2].toLowerCase();
    let year = parseInt(wordMonthMatch1[3], 10);
    if (year < 100) year += year >= 50 ? 1900 : 2000;
    const month = MONTH_NAMES_MAP[monthKey];
    if (month && isValidCalendarDate(year, month, day)) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  const wordMonthMatch2 = strVal.match(/^([A-Za-z]+)[-\s](\d{1,2})(?:st|nd|rd|th)?[,\s]+(\d{2,4})/);
  if (wordMonthMatch2) {
    const monthKey = wordMonthMatch2[1].toLowerCase();
    const day = parseInt(wordMonthMatch2[2], 10);
    let year = parseInt(wordMonthMatch2[3], 10);
    if (year < 100) year += year >= 50 ? 1900 : 2000;
    const month = MONTH_NAMES_MAP[monthKey];
    if (month && isValidCalendarDate(year, month, day)) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // 4e. Standard Date constructor fallback (for complex RFC/ISO strings)
  const parsedDate = new Date(strVal);
  if (!isNaN(parsedDate.getTime())) {
    const ymd = formatDateObjectToYMD(parsedDate);
    const parts = ymd.split('-').map(Number);
    if (parts.length === 3 && isValidCalendarDate(parts[0], parts[1], parts[2])) {
      return ymd;
    }
  }

  return 'Invalid Date';
}

/**
 * Formats a normalized standard date (YYYY-MM-DD) into UI display format (DD-MM-YYYY).
 * Keeps 'Invalid Date' and empty values readable.
 */
export function formatToUIDate(isoDate: string | null | undefined): string {
  if (!isoDate || isoDate === 'Invalid Date') return isoDate || '';
  const clean = String(isoDate).trim();
  const parts = clean.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return isoDate;
}
