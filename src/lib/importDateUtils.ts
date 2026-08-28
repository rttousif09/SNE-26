import * as XLSX from 'xlsx';

/**
 * Normalizes a date value from an import source (like Excel) into YYYY-MM-DD.
 * Handles Excel serial dates, JavaScript Dates, and various string formats.
 */
export function normalizeImportedDate(value: any, isDateColumn: boolean): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  // 1. If it's a JavaScript Date object (e.g., from sheet_to_json with cellDates: true)
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return 'Invalid Date';
    // Use UTC methods to avoid timezone shift if the date was parsed in UTC, 
    // but Excel dates parsed by cellDates: true are usually in local time.
    // However, XLSX cellDates: true parses them as UTC dates.
    // Wait, let's just use local time extraction for safety, or check if it has a time component.
    // A safer way is to format it back:
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 2. If it's a number (or numeric string) and the column is expected to be a date, convert Excel serial
  const numValue = Number(value);
  if (!isNaN(numValue) && isDateColumn && String(value).trim() !== '') {
    // Basic bounds check to ensure it's a reasonable Excel date (e.g., year 1900 to 2100)
    // Excel date 1 is Jan 1, 1900. 100000 is year 2173.
    if (numValue > 0 && numValue < 100000) {
      const parsedDate = XLSX.SSF.parse_date_code(numValue);
      if (parsedDate) {
        const year = parsedDate.y;
        const month = String(parsedDate.m).padStart(2, '0');
        const day = String(parsedDate.d).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }
    // If it's outside bounds or couldn't parse, fall through to string parsing or invalid
  }
  
  // If it's a number but NOT a date column, leave it as is. 
  if (typeof value === 'number') {
      return value.toString();
  }

  // 3. String parsing
  const strVal = String(value).trim();
  
  // YYYY-MM-DD or YYYY/MM/DD
  let match = strVal.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (match) {
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const d = parseInt(match[3], 10);
    if (isValidDate(y, m, d)) return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  // DD-MM-YYYY or DD/MM/YYYY
  match = strVal.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
  if (match) {
    const d = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const y = parseInt(match[3], 10);
    if (isValidDate(y, m, d)) return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  
  // Fallback to JS Date parsing
  const fallbackDate = new Date(strVal);
  if (!isNaN(fallbackDate.getTime())) {
      const year = fallbackDate.getFullYear();
      const month = String(fallbackDate.getMonth() + 1).padStart(2, '0');
      const day = String(fallbackDate.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
  }

  return 'Invalid Date';
}

function isValidDate(y: number, m: number, d: number) {
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  // basic check
  return true;
}

/**
 * Formats a YYYY-MM-DD date to DD-MM-YYYY for UI display
 */
export function formatToUIDate(isoDate: string | null): string {
    if (!isoDate || isoDate === 'Invalid Date') return isoDate || '';
    const parts = isoDate.split('-');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return isoDate;
}

