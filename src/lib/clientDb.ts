// Client-side mock database and router simulation for static environments like Vercel

export interface ClientDbData {
  projects: any[];
  workers: any[];
  billings: any[];
  clientPayments: any[];
  kharchis: any[];
  advances: any[];
  workerPayments: any[];
  approvals: any[];
  kharchiApprovals: any[];
  paymentSheetApprovals: any[];
  advanceSheetApprovals: any[];
  expensesLedger: any[];
  messBookings: any[];
  dlrs: any[];
  materialItems: any[];
  materialIssues: any[];
  materialReturns: any[];
  materialPurchases: any[];
  labourPlannings: any[];
  workerTransfers: any[];
  assets: any[];
  assetTransfers: any[];
  assetMaintenances: any[];
  workerLedger: any[];
  workerHolds: any[];
  workerRecoveryAuditTrail: any[];
  attendance: any[];
  trackedBills: any[];
  billTimelines: any[];
  financialYears: any[];
  staff: any[];
  floorAbstracts: any[];
  activityLogs: any[];
  numberingSettings: any[];
  numberingSequences: Record<string, Record<string, number>>;
  numberingAuditLogs: any[];
  boqs: any[];
  boqAuditLogs: any[];
  subcontractors: any[];
  subcontractorBills: any[];
  subcontractorPayments: any[];
}

// Check if keys exist in localStorage, if not initialize with default seed data
const SEED_PROJECTS = [
  {
    id: "p1",
    name: "S3 Eco City",
    clientName: "S3 Developers",
    startDate: "2026-01-01",
    completionDate: "2027-01-01",
    address: "Plot 4, Sector 18",
    budget: 15000000,
    status: "Ongoing"
  },
  {
    id: "p2",
    name: "EPR Mulund",
    clientName: "EPR Builders",
    startDate: "2026-01-01",
    completionDate: "2027-06-30",
    address: "LBS Road, Mulund West",
    budget: 85000000,
    status: "Ongoing"
  }
];

const SEED_WORKERS = [
  { id: "w1", serialNo: "1", workerId: "W-001", name: "Ramesh Kumar", projectId: "p1", designation: "Supervisor", joiningDate: "2026-01-12", exitDate: "", dailyRate: 600 },
  { id: "w2", serialNo: "2", workerId: "W-002", name: "Suresh Singh", projectId: "p1", designation: "Mason", joiningDate: "2026-01-12", exitDate: "", dailyRate: 500 }
];

const SEED_BILLINGS = [
  { id: "b1", srNo: "1", projectId: "p1", billNo: "BILL-001", workNature: "Foundation Work", amount: 250000, month: "2026-02", certifyDate: "2026-02-28", tds: 5000, retention: 12500, gst: 45000, debitAmount: 0, debitReason: "", billType: "RA Bill", measurementItems: "[]", holdAmount: 0, holdReason: "" }
];

const SEED_CLIENT_PAYMENTS = [
  { id: "cp1", projectId: "p1", amountReceived: 200000, date: "2026-03-05", remarks: "First installment received", status: "Received", billId: "b1", paymentReference: "TXN123456", paymentMode: "NEFT", bankName: "SBI", utrChequeNo: "UTIN00918", isRetentionPayment: 0, category: "Against RA Bill" }
];

const SEED_KHARCHIS = [
  { id: "k1", projectId: "p1", workerId: "w2", date: "2026-02-02", amount: 500 },
  { id: "k2", projectId: "p1", workerId: "w2", date: "2026-02-09", amount: 500 }
];

const SEED_ADVANCES = [
  { id: "a1", projectId: "p1", workerId: "w1", amount: 5000, paidBy: "Admin Team", remarks: "Medical emergency", date: "2026-02-15", isDeducted: 0, deductionAmount: 0 }
];

const SEED_EXPENSES_LEDGER = [
  { id: "el1", date: "2026-01-01", description: "Amount Credit", projectId: "", kharchi: 0, mess: 0, workerAdvance: 0, tiffin: 0, travel: 0, machineryMaterial: 0, workerPayment: 0, stationery: 0, others: 0, bank: "SBI", crBalance: 50000, status: "Approved" },
  { id: "el2", date: "2026-01-01", description: "Travel Advance to Tripmaza", projectId: "p1", kharchi: 0, mess: 0, workerAdvance: 0, tiffin: 0, travel: 5000, machineryMaterial: 0, workerPayment: 0, stationery: 0, others: 0, bank: "", crBalance: 0, status: "Approved" },
  { id: "el3", date: "2026-01-01", description: "Amount Credit", projectId: "", kharchi: 0, mess: 0, workerAdvance: 0, tiffin: 0, travel: 0, machineryMaterial: 0, workerPayment: 0, stationery: 0, others: 0, bank: "SBI", crBalance: 15000, status: "Approved" },
  { id: "el4", date: "2026-01-01", description: "Mess Booking Payment", projectId: "p2", kharchi: 0, mess: 8000, workerAdvance: 0, tiffin: 0, travel: 0, machineryMaterial: 0, workerPayment: 0, stationery: 0, others: 0, bank: "", crBalance: 0, status: "Approved" }
];

const SEED_NUMBERING_SETTINGS = [
  { moduleKey: "project-master", moduleName: "Project Master", prefix: "PROJ", suffix: "", fyFormat: "FY25-26", startingNumber: 1, numLength: 3, separator: "/", seriesType: "global", status: "Active" },
  { moduleKey: "worker-master", moduleName: "Worker Master", prefix: "WRK", suffix: "", fyFormat: "None", startingNumber: 1, numLength: 6, separator: "/", seriesType: "global", status: "Active" },
  { moduleKey: "staff-master", moduleName: "Staff Master", prefix: "STF", suffix: "", fyFormat: "None", startingNumber: 1, numLength: 4, separator: "/", seriesType: "global", status: "Active" },
  { moduleKey: "attendance", moduleName: "Attendance", prefix: "ATT", suffix: "", fyFormat: "None", startingNumber: 1, numLength: 5, separator: "/", seriesType: "global", status: "Active" },
  { moduleKey: "worker-advance", moduleName: "Worker Advance", prefix: "ADV", suffix: "", fyFormat: "25-26", startingNumber: 1, numLength: 4, separator: "/", seriesType: "global", status: "Active" },
  { moduleKey: "worker-payment", moduleName: "Worker Payment", prefix: "PAY", suffix: "", fyFormat: "2025-26", startingNumber: 1, numLength: 5, separator: "/", seriesType: "global", status: "Active" },
  { moduleKey: "weekly-kharchi", moduleName: "Weekly Kharchi", prefix: "KHA", suffix: "", fyFormat: "None", startingNumber: 1, numLength: 5, separator: "/", seriesType: "global", status: "Active" },
  { moduleKey: "expense-voucher", moduleName: "Expense Voucher", prefix: "EXP", suffix: "", fyFormat: "None", startingNumber: 1, numLength: 5, separator: "/", seriesType: "global", status: "Active" },
  { moduleKey: "material-issue", moduleName: "Material Issue", prefix: "MIS", suffix: "", fyFormat: "None", startingNumber: 1, numLength: 5, separator: "/", seriesType: "global", status: "Active" },
  { moduleKey: "material-receipt", moduleName: "Material Receipt", prefix: "MRX", suffix: "", fyFormat: "None", startingNumber: 1, numLength: 5, separator: "/", seriesType: "global", status: "Active" },
  { moduleKey: "material-return", moduleName: "Material Return", prefix: "MRT", suffix: "", fyFormat: "None", startingNumber: 1, numLength: 5, separator: "/", seriesType: "global", status: "Active" },
  { moduleKey: "purchase-entry", moduleName: "Purchase Entry", prefix: "PUR", suffix: "", fyFormat: "None", startingNumber: 1, numLength: 5, separator: "/", seriesType: "global", status: "Active" },
  { moduleKey: "supplier-payment", moduleName: "Supplier Payment", prefix: "SPY", suffix: "", fyFormat: "None", startingNumber: 1, numLength: 5, separator: "/", seriesType: "global", status: "Active" },
  { moduleKey: "billing", moduleName: "Billing", prefix: "BILL", suffix: "", fyFormat: "FY25-26", startingNumber: 1, numLength: 5, separator: "/", seriesType: "global", status: "Active" },
  { moduleKey: "client-payment", moduleName: "Client Payment", prefix: "CPM", suffix: "", fyFormat: "None", startingNumber: 1, numLength: 5, separator: "/", seriesType: "global", status: "Active" },
  { moduleKey: "floor-abstract", moduleName: "Floor Abstract", prefix: "FLR", suffix: "", fyFormat: "None", startingNumber: 1, numLength: 5, separator: "/", seriesType: "global", status: "Active" },
  { moduleKey: "retention-release", moduleName: "Retention Release", prefix: "RET", suffix: "", fyFormat: "None", startingNumber: 1, numLength: 5, separator: "/", seriesType: "global", status: "Active" },
  { moduleKey: "debit-note", moduleName: "Debit Note", prefix: "DBN", suffix: "", fyFormat: "None", startingNumber: 1, numLength: 5, separator: "/", seriesType: "global", status: "Active" },
  { moduleKey: "credit-note", moduleName: "Credit Note", prefix: "CRN", suffix: "", fyFormat: "None", startingNumber: 1, numLength: 5, separator: "/", seriesType: "global", status: "Active" },
  { moduleKey: "subcontractor-master", moduleName: "Subcontractor Master", prefix: "SUBC", suffix: "", fyFormat: "None", startingNumber: 1, numLength: 4, separator: "/", seriesType: "global", status: "Active" },
  { moduleKey: "subcontractor-billing", moduleName: "Subcontractor Billing", prefix: "SUBB", suffix: "", fyFormat: "FY25-26", startingNumber: 1, numLength: 5, separator: "/", seriesType: "global", status: "Active" },
  { moduleKey: "boq-master", moduleName: "BOQ Master", prefix: "BOQ", suffix: "", fyFormat: "None", startingNumber: 1, numLength: 4, separator: "/", seriesType: "global", status: "Active" }
];

const STORAGE_PREFIX = "sne_erp_client_";

function getLocalStorage<T>(key: string, defaultValue: T): T {
  try {
    const value = localStorage.getItem(STORAGE_PREFIX + key);
    if (value) {
      return JSON.parse(value);
    }
  } catch (e) {
    console.error("Error reading localStorage key", key, e);
  }
  return defaultValue;
}

function setLocalStorage<T>(key: string, value: T) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error("Error writing localStorage key", key, e);
  }
}

// DB state loader / initializer
export function initClientDb() {
  const isInitialized = localStorage.getItem(STORAGE_PREFIX + "initialized") === "true";
  if (!isInitialized) {
    setLocalStorage("projects", SEED_PROJECTS);
    setLocalStorage("workers", SEED_WORKERS);
    setLocalStorage("billings", SEED_BILLINGS);
    setLocalStorage("clientPayments", SEED_CLIENT_PAYMENTS);
    setLocalStorage("kharchis", SEED_KHARCHIS);
    setLocalStorage("advances", SEED_ADVANCES);
    setLocalStorage("workerPayments", []);
    setLocalStorage("approvals", []);
    setLocalStorage("kharchiApprovals", []);
    setLocalStorage("paymentSheetApprovals", []);
    setLocalStorage("advanceSheetApprovals", []);
    setLocalStorage("expensesLedger", SEED_EXPENSES_LEDGER);
    setLocalStorage("messBookings", []);
    setLocalStorage("dlrs", []);
    setLocalStorage("materialItems", []);
    setLocalStorage("materialIssues", []);
    setLocalStorage("materialReturns", []);
    setLocalStorage("materialPurchases", []);
    setLocalStorage("labourPlannings", []);
    setLocalStorage("workerTransfers", []);
    setLocalStorage("assets", []);
    setLocalStorage("assetTransfers", []);
    setLocalStorage("assetMaintenances", []);
    setLocalStorage("workerLedger", []);
    setLocalStorage("workerHolds", []);
    setLocalStorage("workerRecoveryAuditTrail", []);
    setLocalStorage("attendance", []);
    setLocalStorage("trackedBills", []);
    setLocalStorage("billTimelines", []);
    setLocalStorage("financialYears", []);
    setLocalStorage("staff", []);
    setLocalStorage("floorAbstracts", []);
    setLocalStorage("activityLogs", []);
    setLocalStorage("numberingSettings", SEED_NUMBERING_SETTINGS);
    
    // Sequences map (moduleKey -> seriesValue -> currentNumber)
    const initialSequences: Record<string, Record<string, number>> = {};
    SEED_NUMBERING_SETTINGS.forEach(s => {
      initialSequences[s.moduleKey] = { "global": s.startingNumber - 1 };
    });
    setLocalStorage("numberingSequences", initialSequences);
    setLocalStorage("numberingAuditLogs", []);
    setLocalStorage("boqs", []);
    setLocalStorage("boqAuditLogs", []);
    setLocalStorage("subcontractors", []);
    setLocalStorage("subcontractorBills", []);
    setLocalStorage("subcontractorPayments", []);

    localStorage.setItem(STORAGE_PREFIX + "initialized", "true");
  }
}

// Numbering sequences helper functions replicated
function resolveFY(fyFormat: string, dateStr?: string): string {
  if (fyFormat === "None" || !fyFormat) return "";
  const date = dateStr ? new Date(dateStr) : new Date();
  const year = date.getFullYear();
  const month = date.getMonth();
  const startYear = month < 3 ? year - 1 : year;
  const endYear = startYear + 1;
  const startYearShort = String(startYear).substring(2);
  const endYearShort = String(endYear).substring(2);
  
  switch (fyFormat) {
    case "25-26":
      return `${startYearShort}-${endYearShort}`;
    case "2025-26":
      return `${startYear}-${endYearShort}`;
    case "FY25-26":
      return `FY${startYearShort}-${endYearShort}`;
    case "FY2025-26":
      return `FY${startYear}-${endYearShort}`;
    default:
      return "";
  }
}

function getSeriesValue(seriesType: string, fyFormat: string, dateStr?: string, projectId?: string): string {
  if (seriesType === "fy-wise") {
    return resolveFY(fyFormat, dateStr) || "global";
  } else if (seriesType === "site-wise") {
    return projectId || "global";
  } else {
    return "global";
  }
}

function getSequenceAndConsume(moduleKey: string, dateStr?: string, projectId?: string, consume = false): string {
  const settings = getLocalStorage<any[]>("numberingSettings", SEED_NUMBERING_SETTINGS);
  const config = settings.find(s => s.moduleKey === moduleKey);
  if (!config) return "MOCK-" + Math.random().toString(36).substring(2, 7).toUpperCase();

  if (config.status !== "Active") {
    return "MOCK-" + Math.random().toString(36).substring(2, 7).toUpperCase();
  }

  const fyValue = resolveFY(config.fyFormat, dateStr);
  const seriesValue = getSeriesValue(config.seriesType, config.fyFormat, dateStr, projectId);
  
  const sequences = getLocalStorage<Record<string, Record<string, number>>>("numberingSequences", {});
  if (!sequences[moduleKey]) {
    sequences[moduleKey] = {};
  }
  if (sequences[moduleKey][seriesValue] === undefined) {
    sequences[moduleKey][seriesValue] = config.startingNumber - 1;
  }

  const prevVal = sequences[moduleKey][seriesValue];
  const nextVal = prevVal + 1;

  if (consume) {
    sequences[moduleKey][seriesValue] = nextVal;
    setLocalStorage("numberingSequences", sequences);
  }

  const parts = [];
  if (config.prefix) parts.push(config.prefix);
  if (config.fyFormat !== "None" && fyValue) parts.push(fyValue);
  parts.push(String(nextVal).padStart(config.numLength, "0"));

  let result = parts.join(config.separator || "/");
  if (config.suffix) {
    result = `${result}${config.separator || "/"}${config.suffix}`;
  }
  return result;
}

// Router mockup to simulate API requests locally
export async function simulateFetch(url: string, init?: RequestInit): Promise<Response> {
  initClientDb();

  const method = init?.method?.toUpperCase() || "GET";
  const pathname = url.split("?")[0];
  const bodyData = init?.body ? JSON.parse(init.body as string) : null;

  // Simple Router logic
  const responseHelper = (data: any, status = 200) => {
    return new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" }
    });
  };

  try {
    // 1. Auth Endpoint
    if (pathname === "/api/login" && method === "POST") {
      const { username, password } = bodyData || {};
      const normalizedUser = username ? username.trim() : "";
      
      if (normalizedUser === 'rejatousifsne' && password === 'Tousif09@') {
        return responseHelper({
          username: normalizedUser,
          name: 'Reja Tousif',
          role: 'admin',
          allowedModules: [],
          allowedProjects: []
        });
      } else if (normalizedUser === 'saddamsne' && password === 'Saddam09@') {
        return responseHelper({
          username: normalizedUser,
          name: 'Saddam Hussain',
          role: 'admin',
          allowedModules: [],
          allowedProjects: []
        });
      }

      // Check database staff
      const staffList = getLocalStorage<any[]>("staff", []);
      const user = staffList.find(s => s.username === normalizedUser);
      if (user && user.password === password) {
        return responseHelper({
          username: user.username,
          name: user.name,
          role: 'staff',
          allowedModules: user.allowedModules || [],
          allowedProjects: user.allowedProjects || []
        });
      }

      return responseHelper({ error: "Logon failed: Incorrect User ID or Password." }, 401);
    }

    // 2. Backup Import
    if (pathname === "/api/backup/import" && method === "POST") {
      const backupData = (bodyData && bodyData.backupData) ? bodyData.backupData : bodyData;
      if (backupData && (Array.isArray(backupData.projects) || Array.isArray(backupData.workers))) {
        Object.keys(backupData).forEach(key => {
          setLocalStorage(key, backupData[key]);
        });
        return responseHelper({ success: true });
      }
      return responseHelper({ error: "Invalid backup data" }, 400);
    }

    // 3. External News fallback
    if (pathname === "/api/external-data/news" && method === "GET") {
      return responseHelper({
        text: "Please configure a valid GEMINI_API_KEY inside AI Studio to see live grounding industry news. Running in local fallback sandbox.",
        groundingChunks: []
      });
    }

    // 4. Numbering setting previews / consumes
    if (pathname.startsWith("/api/numbering-settings/preview/") && method === "POST") {
      const moduleKey = pathname.split("/").pop() || "";
      const { projectId, dateStr } = bodyData || {};
      const docNo = getSequenceAndConsume(moduleKey, dateStr, projectId, false);
      return responseHelper({ active: true, docNumber: docNo });
    }

    if (pathname.startsWith("/api/numbering-settings/consume/") && method === "POST") {
      const moduleKey = pathname.split("/").pop() || "";
      const { projectId, dateStr } = bodyData || {};
      const docNo = getSequenceAndConsume(moduleKey, dateStr, projectId, true);
      return responseHelper({ active: true, docNumber: docNo });
    }

    // 5. REST Standard endpoints
    const restEndpoints = [
      "projects", "workers", "billings", "client-payments", "kharchis", "advances", "worker-payments",
      "approvals", "kharchi-approvals", "payment-sheet-approvals", "advance-sheet-approvals", "expenses_ledger",
      "mess-bookings", "dlrs", "material-items", "material-issues", "material-returns", "material-purchases",
      "labour-plannings", "worker-transfers", "assets", "asset-transfers", "asset-maintenances", "worker-ledger",
      "worker-holds", "worker-recovery-audit", "attendance", "tracked-bills", "bill-timelines", "financial-years",
      "staff", "floor-abstracts", "activity-logs", "numbering-settings", "boqs", "boqs-audit-logs",
      "subcontractors", "subcontractor-bills", "subcontractor-payments"
    ];

    for (const ep of restEndpoints) {
      // Map kebab-case endpoint to camelCase localStorage key
      let storageKey = ep.replace(/-([a-z])/g, g => g[1].toUpperCase()).replace("_", "");
      if (storageKey === "expensesLedger") storageKey = "expensesLedger";
      if (storageKey === "boqsAuditLogs") storageKey = "boqAuditLogs";
      if (storageKey === "subcontractorBills") storageKey = "subcontractorBills";
      if (storageKey === "subcontractorPayments") storageKey = "subcontractorPayments";

      // GET LIST
      if (pathname === `/api/${ep}` && method === "GET") {
        const list = getLocalStorage<any[]>(storageKey, []);
        return responseHelper(list);
      }

      // POST ITEM
      if (pathname === `/api/${ep}` && method === "POST") {
        const list = getLocalStorage<any[]>(storageKey, []);
        const newItem = { ...bodyData };
        if (!newItem.id) {
          newItem.id = ep.substring(0, 3) + "_" + Math.random().toString(36).substring(2, 11);
        }
        list.push(newItem);
        setLocalStorage(storageKey, list);
        return responseHelper(newItem, 201);
      }

      // PUT ITEM
      if (pathname.startsWith(`/api/${ep}/`) && method === "PUT") {
        const id = pathname.split("/").pop() || "";
        const list = getLocalStorage<any[]>(storageKey, []);
        const index = list.findIndex(item => item.id === id);
        if (index !== -1) {
          list[index] = { ...list[index], ...bodyData };
          setLocalStorage(storageKey, list);
          return responseHelper(list[index]);
        }
        return responseHelper({ error: "Item not found" }, 404);
      }

      // DELETE ITEM
      if (pathname.startsWith(`/api/${ep}/`) && method === "DELETE") {
        const id = pathname.split("/").pop() || "";
        const list = getLocalStorage<any[]>(storageKey, []);
        const filtered = list.filter(item => item.id !== id);
        setLocalStorage(storageKey, filtered);
        return responseHelper({ success: true, id });
      }
    }

    // Return a 404 for unhandled API endpoints
    return responseHelper({ error: `Not Found: ${method} ${pathname}` }, 404);

  } catch (err: any) {
    console.error("Local Client Db Router simulation error:", err);
    return responseHelper({ error: err.message }, 500);
  }
}
