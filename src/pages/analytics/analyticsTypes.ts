import { 
  Project, Worker, Billing, ClientPayment, ExpenseEntry, WorkerPayment, 
  DailyLabourReport, Attendance, FloorAbstract, BOQ, Subcontractor, 
  SubcontractorBill, SubcontractorPayment 
} from '../../types';

export interface AnalyticsFilterState {
  projectId: string; // 'All' or specific ID
  clientId: string; // 'All' or specific client name
  financialYear: string; // 'All', '2024-25', '2025-26', '2026-27'
  month: string; // 'All' or 'YYYY-MM'
  dateFrom: string; // 'YYYY-MM-DD'
  dateTo: string; // 'YYYY-MM-DD'
  workerId: string; // 'All' or specific worker ID
  subcontractorId: string; // 'All' or specific subcontractor ID
  reportType: string; // 'all' | 'financial' | 'project' | 'billing' | 'collection' | 'expense' | 'worker' | 'attendance' | 'subcontractor' | 'boq' | 'floor'
}

export const DEFAULT_ANALYTICS_FILTERS: AnalyticsFilterState = {
  projectId: 'All',
  clientId: 'All',
  financialYear: 'All',
  month: 'All',
  dateFrom: '',
  dateTo: '',
  workerId: 'All',
  subcontractorId: 'All',
  reportType: 'all',
};

// Helper: Format INR
export const formatINR = (amount: number): string => {
  if (isNaN(amount) || !isFinite(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatCompactINR = (val: number): string => {
  if (!val || isNaN(val)) return '₹0';
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(2)} Cr`;
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(2)} L`;
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(1)} k`;
  return `${sign}₹${abs.toFixed(0)}`;
};

// Helper: check if a date falls within Financial Year (April 1 to March 31)
export const isDateInFY = (dateStr: string, fy: string): boolean => {
  if (!dateStr || fy === 'All') return true;
  const parts = fy.split('-');
  if (parts.length !== 2) return true;
  let startYear = parseInt(parts[0], 10);
  if (startYear < 100) startYear += 2000;
  const startFY = `${startYear}-04-01`;
  const endFY = `${startYear + 1}-03-31`;
  const d = dateStr.substring(0, 10);
  return d >= startFY && d <= endFY;
};

// Helper: match date filters
export const matchesDateFilters = (
  dateStr: string | undefined, 
  filters: AnalyticsFilterState
): boolean => {
  if (!dateStr) return true;
  const d = dateStr.substring(0, 10);

  if (filters.dateFrom && d < filters.dateFrom) return false;
  if (filters.dateTo && d > filters.dateTo) return false;

  if (filters.month !== 'All') {
    if (!d.startsWith(filters.month)) return false;
  }

  if (filters.financialYear !== 'All') {
    if (!isDateInFY(d, filters.financialYear)) return false;
  }

  return true;
};
