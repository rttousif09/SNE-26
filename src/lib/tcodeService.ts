// SAP Transaction Code Service for SN ENTERPRISES ERP

export interface TCode {
  code: string;
  name: string;
  description: string;
  module: string;
  tab: string;
  props?: Record<string, any>;
  isActive: boolean;
  requiredRoles?: string[]; // Empty/undefined means accessible by all roles
}

export interface TCodeAuditLog {
  id: string;
  tcode: string;
  name: string;
  username: string;
  timestamp: string;
  project?: string;
  actionPerformed: string;
  deviceInfo: string;
}

export const DEFAULT_TCODES: TCode[] = [
  // Dashboard
  { code: "DASH01", name: "Dashboard", description: "Workspace main home screen and metrics summary", module: "Dashboard", tab: "dashboard", isActive: true },
  { code: "DASH02", name: "Executive Dashboard", description: "Executive expenses and operational statistics overview", module: "Dashboard", tab: "expenses-summary", isActive: true },
  { code: "DASH03", name: "Project Dashboard", description: "Monthly reports and progress summaries categorized by active projects", module: "Dashboard", tab: "site-monthly-summary", isActive: true },

  // Project
  { code: "PRJ01", name: "Create Project", description: "Register a brand new site or project master record", module: "Project", tab: "projects", props: { initialAction: "create" }, isActive: true, requiredRoles: ["admin"] },
  { code: "PRJ02", name: "Edit Project", description: "Modify metadata or update existing project details", module: "Project", tab: "projects", props: { initialAction: "edit" }, isActive: true, requiredRoles: ["admin"] },
  { code: "PRJ03", name: "View Project", description: "Browse details and metadata of projects", module: "Project", tab: "projects", props: { initialAction: "view" }, isActive: true },
  { code: "PRJ04", name: "Project List", description: "Complete directory of ongoing, finished, or archived projects", module: "Project", tab: "projects", props: { initialAction: "list" }, isActive: true },
  { code: "PRJ05", name: "Complete Project", description: "Close or flag an active project as completed", module: "Project", tab: "projects", props: { initialAction: "complete" }, isActive: true, requiredRoles: ["admin"] },
  { code: "PRJ06", name: "Archive Project", description: "Transfer historical projects to financial archives", module: "Project", tab: "financial-year-archive", isActive: true, requiredRoles: ["admin"] },

  // Worker
  { code: "WRK01", name: "Add Worker", description: "Onboard new worker details, personal records, and daily rates", module: "Worker", tab: "workers", props: { initialView: "add" }, isActive: true },
  { code: "WRK02", name: "Edit Worker", description: "Modify active worker profiles, designations, or wage configuration", module: "Worker", tab: "workers", props: { initialView: "list", action: "edit" }, isActive: true, requiredRoles: ["admin", "staff"] },
  { code: "WRK03", name: "Worker Ledger", description: "Check advance recoveries, outstanding dues, and payment registers", module: "Worker", tab: "worker-ledger", isActive: true },
  { code: "WRK04", name: "Worker Attendance", description: "Log daily site attendance via the Daily Labour Report (DLR)", module: "Worker", tab: "dlr", isActive: true },
  { code: "WRK05", name: "Worker Advance", description: "Request, record, or distribute worker advance amounts", module: "Worker", tab: "advance", isActive: true },
  { code: "WRK06", name: "Worker Payment", description: "Process wage payouts and weekly balances", module: "Worker", tab: "worker-payment", isActive: true },
  { code: "WRK07", name: "Worker Transfer", description: "Transfer workers between different site locations", module: "Worker", tab: "workers", props: { initialView: "transfer" }, isActive: true, requiredRoles: ["admin"] },
  { code: "WRK08", name: "Worker Leave", description: "Record leave request approvals and exits", module: "Worker", tab: "workers", props: { initialView: "leave" }, isActive: true },
  { code: "WRK09", name: "Worker Rejoin", description: "Re-onboard or re-activate historical worker profile", module: "Worker", tab: "workers", props: { initialView: "rejoin" }, isActive: true },
  { code: "WRK10", name: "Worker Documents", description: "Access documentation, ID proofs, and certifications", module: "Worker", tab: "dms", props: { initialFolder: "workers" }, isActive: true },

  // Floor Abstract
  { code: "FAB01", name: "Create Floor Abstract", description: "Log new concrete height, layout calculations, and floor records", module: "Floor Abstract", tab: "floor-abstracts", props: { initialAction: "create" }, isActive: true },
  { code: "FAB02", name: "Edit Floor Abstract", description: "Modify measurements or existing abstract files", module: "Floor Abstract", tab: "floor-abstracts", props: { initialAction: "edit" }, isActive: true, requiredRoles: ["admin", "staff"] },
  { code: "FAB03", name: "View Floor Abstract", description: "Browse historical lists of active floor abstract certificates", module: "Floor Abstract", tab: "floor-abstracts", props: { initialAction: "list" }, isActive: true },
  { code: "FAB04", name: "Print Floor Abstract", description: "Format and compile printer-friendly PDF summaries", module: "Floor Abstract", tab: "floor-abstracts", props: { initialAction: "print" }, isActive: true },
  { code: "FAB05", name: "Export Floor Abstract", description: "Download spreadsheet data or certified documents", module: "Floor Abstract", tab: "floor-abstracts", props: { initialAction: "export" }, isActive: true },

  // Billing
  { code: "BILL01", name: "Create Bill", description: "Generate project bills, RA bills, and certify measurements", module: "Billing", tab: "billing", props: { initialAction: "create" }, isActive: true },
  { code: "BILL02", name: "Edit Bill", description: "Update calculations, tax rates, TDS, and retentions on drafted bills", module: "Billing", tab: "billing", props: { initialAction: "edit" }, isActive: true, requiredRoles: ["admin"] },
  { code: "BILL03", name: "Bill Register", description: "Consolidated directory of all submitted invoices and progress bills", module: "Billing", tab: "billing", props: { initialAction: "list" }, isActive: true },
  { code: "BILL04", name: "Bill Approval", description: "Verify, reject, or authorize client invoices in the system", module: "Billing", tab: "approvals", props: { filterType: "billing" }, isActive: true, requiredRoles: ["admin"] },
  { code: "BILL05", name: "Print Bill", description: "Download custom-designed PDF report copies of client bills", module: "Billing", tab: "billing", props: { initialAction: "print" }, isActive: true },
  { code: "BILL06", name: "Export Bill", description: "Export billing aggregates and certified measurement lists to CSV", module: "Billing", tab: "billing", props: { initialAction: "export" }, isActive: true },

  // Client Payment
  { code: "CPAY01", name: "Record Payment", description: "Receive client payments, bank entries, and assign to RA bills", module: "Client Payment", tab: "client-payment", props: { initialAction: "create" }, isActive: true, requiredRoles: ["admin"] },
  { code: "CPAY02", name: "Payment History", description: "Audit trail log of all historical bank remittances and checks", module: "Client Payment", tab: "client-payment", props: { initialAction: "list" }, isActive: true },
  { code: "CPAY03", name: "Outstanding Summary", description: "Check outstanding client balances, billing gaps, and collections", module: "Client Payment", tab: "client-payment", props: { initialView: "outstanding" }, isActive: true },
  { code: "CPAY04", name: "GST Summary", description: "Consolidated taxation logs and billing invoices audit", module: "Client Payment", tab: "client-payment", props: { initialView: "gst" }, isActive: true },
  { code: "CPAY05", name: "Retention Summary", description: "Audit security retention amounts withheld by clients", module: "Client Payment", tab: "client-payment", props: { initialView: "retention" }, isActive: true },
  { code: "CPAY06", name: "Client Ledger", description: "Dual-column client reconciliation statements and statements of accounts", module: "Client Payment", tab: "client-payment", props: { initialView: "ledger" }, isActive: true },

  // Subcontractor
  { code: "SUB01", name: "Add Subcontractor", description: "Add subcontractor firm, profiles, and active labor contracts", module: "Subcontractor", tab: "subcontractors-master", props: { initialAction: "create" }, isActive: true },
  { code: "SUB02", name: "Subcontractor Billing", description: "Log subcontractor work invoices, progress bills, and TDS", module: "Subcontractor", tab: "subcontractors-billing", isActive: true },
  { code: "SUB03", name: "Payment Entry", description: "Remit milestone-based contract payments", module: "Subcontractor", tab: "subcontractors-payments", isActive: true, requiredRoles: ["admin"] },
  { code: "SUB04", name: "Ledger", description: "Generate real-time reconciliation logs for subcontractors", module: "Subcontractor", tab: "subcontractors-ledger", isActive: true },
  { code: "SUB05", name: "Documents", description: "Audit compliance records, agreements, and security checklists", module: "Subcontractor", tab: "subcontractors-audit", isActive: true },

  // BOQ
  { code: "BOQ01", name: "Create BOQ", description: "Draft Bill of Quantities schedule, items, and unit rates", module: "BOQ", tab: "boqs", props: { initialAction: "create" }, isActive: true },
  { code: "BOQ02", name: "Edit BOQ", description: "Amend measurements, quantities, or rate structures", module: "BOQ", tab: "boqs", props: { initialAction: "edit" }, isActive: true, requiredRoles: ["admin"] },
  { code: "BOQ03", name: "BOQ Comparison", description: "Perform cost analysis or comparative audits between BOQ versions", module: "BOQ", tab: "boqs", props: { initialAction: "compare" }, isActive: true },
  { code: "BOQ04", name: "BOQ Reports", description: "Consolidated summaries of quantities scheduled vs consumed", module: "BOQ", tab: "boqs", props: { initialAction: "reports" }, isActive: true },

  // Material
  { code: "MAT01", name: "Material Issue", description: "Issue cement, steel, or other assets to workers or site locations", module: "Material", tab: "materials", props: { initialTab: "issue" }, isActive: true },
  { code: "MAT02", name: "Material Receipt", description: "Log vendor deliveries, supply entries, and invoice matches", module: "Material", tab: "materials", props: { initialTab: "receipt" }, isActive: true },
  { code: "MAT03", name: "Material Transfer", description: "Initiate stock movements between warehouses or sites", module: "Material", tab: "materials", props: { initialTab: "transfer" }, isActive: true },
  { code: "MAT04", name: "Stock Register", description: "Verify real-time stock balances and physical inventory logs", module: "Material", tab: "materials", props: { initialTab: "register" }, isActive: true },

  // Expenses
  { code: "EXP01", name: "Add Expense", description: "Enter daily site petty cash, food, or miscellaneous expenditures", module: "Expenses", tab: "expenses", props: { initialAction: "create" }, isActive: true },
  { code: "EXP02", name: "Expense Register", description: "Consolidated log of petty cash voucher ledger books", module: "Expenses", tab: "expenses", props: { initialAction: "list" }, isActive: true },
  { code: "EXP03", name: "Expense Approval", description: "Reconcile, audit, and authorize submitted petty cash expenses", module: "Expenses", tab: "approvals", props: { filterType: "expenses" }, isActive: true, requiredRoles: ["admin"] },

  // Document Management
  { code: "DOC01", name: "Upload Document", description: "Store scans, legal agreements, site photos, or drawings", module: "Document Management", tab: "dms", props: { initialAction: "upload" }, isActive: true },
  { code: "DOC02", name: "Document Library", description: "Browse nested directory vault and access stored assets", module: "Document Management", tab: "dms", props: { initialAction: "list" }, isActive: true },
  { code: "DOC03", name: "Download Document", description: "Securely save document files to external computer", module: "Document Management", tab: "dms", props: { initialAction: "download" }, isActive: true },
  { code: "DOC04", name: "Archive Documents", description: "Lock or compress outdated folders and drawing files", module: "Document Management", tab: "dms", props: { initialAction: "archive" }, isActive: true, requiredRoles: ["admin"] },

  // Reports
  { code: "RPT01", name: "Worker Reports", description: "Attendance statistics, averages, and labor cost summaries", module: "Reports", tab: "site-monthly-summary", props: { category: "workers" }, isActive: true },
  { code: "RPT02", name: "Billing Reports", description: "Tracking, milestones, timeline, and collection status updates", module: "Reports", tab: "bill-tracking", isActive: true },
  { code: "RPT03", name: "Client Reports", description: "Certified bills, outstanding summaries, and client audit records", module: "Reports", tab: "site-monthly-summary", props: { category: "client" }, isActive: true },
  { code: "RPT04", name: "Financial Reports", description: "Consolidated P&L, balance checks, and expenses trends dashboards", module: "Reports", tab: "expenses-summary", isActive: true },
  { code: "RPT05", name: "Project Reports", description: "Sites performance, start-to-end metrics, and status cards", module: "Reports", tab: "site-monthly-summary", isActive: true },
  { code: "RPT06", name: "Graphs & Analytics", description: "Interactive SAP Business Intelligence & executive graphical reports", module: "Reports", tab: "analytics", props: { initialReportType: "all" }, isActive: true },
  { code: "RPT07", name: "Financial Graphs", description: "Income vs expense cashflow trends, gross vs net billing analytics", module: "Reports", tab: "analytics", props: { initialReportType: "financial" }, isActive: true },
  { code: "RPT08", name: "Project Graphs", description: "Site completion percentages, project budget comparisons & progress", module: "Reports", tab: "analytics", props: { initialReportType: "project" }, isActive: true },
  { code: "RPT09", name: "Billing Graphs", description: "Monthly billing trend, TDS, GST, retention and bill status distribution", module: "Reports", tab: "analytics", props: { initialReportType: "billing" }, isActive: true },
  { code: "RPT10", name: "Collection Graphs", description: "Client collections trend and client-wise outstanding balance bars", module: "Reports", tab: "analytics", props: { initialReportType: "collection" }, isActive: true },
  { code: "RPT11", name: "Expense Graphs", description: "Operational site expenditures, category distribution and project expenses", module: "Reports", tab: "analytics", props: { initialReportType: "expense" }, isActive: true },
  { code: "RPT12", name: "Worker Graphs", description: "Workforce status, wage disbursement trends and top earner rankings", module: "Reports", tab: "analytics", props: { initialReportType: "worker" }, isActive: true },
  { code: "RPT13", name: "Attendance Graphs", description: "Daily attendance logs, DLR labour counts and overtime hours analysis", module: "Reports", tab: "analytics", props: { initialReportType: "attendance" }, isActive: true },
  { code: "RPT14", name: "Subcontractor Graphs", description: "Contractor billed volumes, payments released and reconciliation dues", module: "Reports", tab: "analytics", props: { initialReportType: "subcontractor" }, isActive: true },
  { code: "RPT15", name: "BOQ / Progress Graphs", description: "BOQ scheduled quantities vs executed work & progress monitoring", module: "Reports", tab: "analytics", props: { initialReportType: "boq" }, isActive: true },

  // Approvals
  { code: "APR01", name: "Pending Approvals", description: "Main check board for all authorizations (expenses, vouchers, bills)", module: "Approvals", tab: "approvals", isActive: true, requiredRoles: ["admin"] },
  { code: "APR02", name: "Bill Approval", description: "Verify and sign off on customer billing certificates", module: "Approvals", tab: "approvals", props: { filterType: "billing" }, isActive: true, requiredRoles: ["admin"] },
  { code: "APR03", name: "Payment Approval", description: "Review and release worker payments and bank transfers", module: "Approvals", tab: "approvals", props: { filterType: "payments" }, isActive: true, requiredRoles: ["admin"] },
  { code: "APR04", name: "Expense Approval", description: "Approve site engineers' petty cash vouchers", module: "Approvals", tab: "approvals", props: { filterType: "expenses" }, isActive: true, requiredRoles: ["admin"] },

  // Settings
  { code: "SET01", name: "Company Settings", description: "Configure system rules, enterprise metadata, and project settings", module: "Settings", tab: "staff-management", isActive: true, requiredRoles: ["admin"] },
  { code: "SET02", name: "Numbering Settings", description: "Customize automatic prefixing and serial tracking per module", module: "Settings", tab: "numbering-settings", isActive: true, requiredRoles: ["admin"] },
  { code: "SET03", name: "User Management", description: "Manage login staff accounts, access lists, and passwords", module: "Settings", tab: "staff-management", isActive: true, requiredRoles: ["admin"] },
  { code: "SET04", name: "Role Management", description: "Configure custom roles, group privileges, and restrictions", module: "Settings", tab: "staff-management", props: { tab: "roles" }, isActive: true, requiredRoles: ["admin"] },
  { code: "SET05", name: "Backup Settings", description: "Configure and run manual or Google Drive backup procedures", module: "Settings", tab: "dashboard", props: { openBackup: true }, isActive: true, requiredRoles: ["admin"] },
  { code: "SET06", name: "Transaction Code Master", description: "Manage T-Codes, assign custom roles, rename shortcuts, or toggle statuses", module: "Settings", tab: "tcode-master", isActive: true, requiredRoles: ["admin"] },
];

const LOCAL_STORAGE_KEY_TCODES = "sne_erp_tcodes_master";
const LOCAL_STORAGE_KEY_FAVORITES = "sne_erp_tcodes_favorites";
const LOCAL_STORAGE_KEY_RECENT = "sne_erp_tcodes_recent";
const LOCAL_STORAGE_KEY_AUDIT = "sne_erp_tcodes_audit";

// Initialize T-Codes storage with default list if not yet established
export function getTCodeList(): TCode[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_TCODES);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed to parse stored T-Codes", e);
  }
  // Fallback and initial seed
  localStorage.setItem(LOCAL_STORAGE_KEY_TCODES, JSON.stringify(DEFAULT_TCODES));
  return DEFAULT_TCODES;
}

export function saveTCodeList(tcodes: TCode[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_TCODES, JSON.stringify(tcodes));
  } catch (e) {
    console.error("Failed to save T-Codes list", e);
  }
}

// Reset T-Codes to default settings
export function resetTCodeListToDefault(): TCode[] {
  saveTCodeList(DEFAULT_TCODES);
  return DEFAULT_TCODES;
}

// Favorites persistence helpers
export function getFavoriteTCodes(): string[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_FAVORITES);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error(e);
  }
  return ["DASH01", "WRK04", "EXP01", "SET02"]; // Seed defaults
}

export function toggleFavoriteTCode(code: string): string[] {
  const current = getFavoriteTCodes();
  let updated: string[];
  if (current.includes(code)) {
    updated = current.filter(c => c !== code);
  } else {
    updated = [...current, code];
  }
  localStorage.setItem(LOCAL_STORAGE_KEY_FAVORITES, JSON.stringify(updated));
  return updated;
}

// Recent transaction list helpers
export function getRecentTCodes(): string[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_RECENT);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error(e);
  }
  return ["DASH01"];
}

export function addRecentTCode(code: string): string[] {
  const current = getRecentTCodes();
  // Filter out existing and prepend, limit to 8
  const updated = [code, ...current.filter(c => c !== code)].slice(0, 8);
  localStorage.setItem(LOCAL_STORAGE_KEY_RECENT, JSON.stringify(updated));
  return updated;
}

export function removeRecentTCode(code: string): string[] {
  const current = getRecentTCodes();
  const updated = current.filter(c => c !== code);
  localStorage.setItem(LOCAL_STORAGE_KEY_RECENT, JSON.stringify(updated));
  return updated;
}

// Audit trail logging
export function getTCodeAuditTrail(): TCodeAuditLog[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_AUDIT);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error(e);
  }
  return [];
}

export function logTCodeExecution(code: string, username: string, actionPerformed: string, projectName?: string) {
  try {
    const logs = getTCodeAuditTrail();
    const tcodes = getTCodeList();
    const matched = tcodes.find(t => t.code.toUpperCase() === code.toUpperCase());
    const name = matched ? matched.name : "Unknown Action";

    const newLog: TCodeAuditLog = {
      id: "LOG_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6).toUpperCase(),
      tcode: code.toUpperCase(),
      name,
      username,
      timestamp: new Date().toISOString(),
      project: projectName,
      actionPerformed,
      deviceInfo: `OS: Linux / Screen: ${window.innerWidth}x${window.innerHeight} / Agent Client`
    };

    const updated = [newLog, ...logs].slice(0, 500); // Limit to latest 500 entries
    localStorage.setItem(LOCAL_STORAGE_KEY_AUDIT, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to log T-Code execution", e);
  }
}

// Validate Role privileges
export function checkUserPrivilege(tcode: TCode, userRole: string): boolean {
  if (!tcode.isActive) return false;
  if (!tcode.requiredRoles || tcode.requiredRoles.length === 0) return true;
  return tcode.requiredRoles.includes(userRole);
}
