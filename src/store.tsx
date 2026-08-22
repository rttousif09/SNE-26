import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Project, Worker, Billing, ClientPayment, Kharchi, Advance, WorkerPayment, Approval, ExpenseEntry, PaymentSheetApproval, MessBooking, DailyLabourReport, KharchiApproval, MaterialItem, MaterialIssue, MaterialReturn, MaterialPurchase, LabourPlanning, WorkerTransfer, Asset, AssetTransfer, AssetMaintenance, WorkerLedgerEntry, WorkerHold, WorkerRecoveryAuditTrail, AdvanceSheetApproval, Attendance, TrackedBill, BillTimelineEntry, FinancialYear, Staff, FloorAbstract, ActivityLog, NumberingSettings, NumberingAuditLog, BOQ, BOQItem, BOQRevision, BOQExtraItem, BOQAuditLog, ClientFloorBill } from './types';
import { getAllFromStore, saveAllToStore } from './lib/indexedDB';

class GlobalEventBus {
  private listeners: Record<string, Array<(data?: any) => void>> = {};

  on(event: string, callback: (data?: any) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => this.off(event, callback);
  }

  off(event: string, callback: (data?: any) => void) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event: string, data?: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (e) {
          console.error(`Error in event listener for ${event}:`, e);
        }
      });
    }
    window.dispatchEvent(new CustomEvent(event, { detail: data }));
  }
}

export const globalEventBus = new GlobalEventBus();

interface AppState {
  projects: Project[];
  workers: Worker[];
  billings: Billing[];
  clientPayments: ClientPayment[];
  kharchis: Kharchi[];
  advances: Advance[];
  workerPayments: WorkerPayment[];
  approvals: Approval[];
  kharchiApprovals: KharchiApproval[];
  paymentSheetApprovals: PaymentSheetApproval[];
  advanceSheetApprovals: AdvanceSheetApproval[];
  expensesLedger: ExpenseEntry[];
  messBookings: MessBooking[];
  dlrs: DailyLabourReport[];
  materialItems: MaterialItem[];
  materialIssues: MaterialIssue[];
  materialReturns: MaterialReturn[];
  materialPurchases: MaterialPurchase[];
  labourPlannings: LabourPlanning[];
  workerTransfers: WorkerTransfer[];
  assets: Asset[];
  assetTransfers: AssetTransfer[];
  assetMaintenances: AssetMaintenance[];
  workerLedger: WorkerLedgerEntry[];
  workerHolds: WorkerHold[];
  workerRecoveryAuditTrail: WorkerRecoveryAuditTrail[];
  attendance: Attendance[];
  trackedBills: TrackedBill[];
  clientFloorBills: ClientFloorBill[];
  billTimelines: BillTimelineEntry[];
  financialYears: FinancialYear[];
  staff: Staff[];
  floorAbstracts: FloorAbstract[];
  activityLogs: ActivityLog[];
  numberingSettings: NumberingSettings[];
  numberingAuditLogs: NumberingAuditLog[];
  boqs: BOQ[];
  boqAuditLogs: BOQAuditLog[];
}


interface AppContextType extends AppState {
  isDbLoaded: boolean;
  user: { username: string; name: string; role?: string; allowedModules?: string[]; allowedProjects?: string[] } | null;
  setUser: (user: { username: string; name: string; role?: string; allowedModules?: string[]; allowedProjects?: string[] } | null) => void;
  importBackup: (backupState: any) => Promise<boolean>;
  refreshActivityLogs: () => Promise<void>;
  refreshBillings: () => Promise<void>;
  refreshClientPayments: () => Promise<void>;
  fetchNumberingSettings: () => Promise<void>;
  fetchNumberingAuditLogs: () => Promise<void>;
  updateNumberingSetting: (moduleKey: string, payload: any) => Promise<boolean>;
  resetNumbering: (moduleKey: string, reason: string) => Promise<boolean>;
  previewNextNumber: (moduleKey: string, payload: { projectId?: string; dateStr?: string }) => Promise<{ docNumber: string; active: boolean }>;
  consumeNextNumber: (moduleKey: string, payload: { projectId?: string; dateStr?: string }) => Promise<{ docNumber: string; active: boolean }>;
  addProject: (project: Omit<Project, 'id'>) => void;
  updateProject: (id: string, project: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  addBOQ: (boq: Omit<BOQ, 'id'>) => Promise<void>;
  updateBOQ: (id: string, boq: Partial<BOQ>) => Promise<void>;
  deleteBOQ: (id: string) => Promise<void>;
  addBOQAuditLog: (log: Omit<BOQAuditLog, 'id' | 'timestamp'>) => Promise<void>;
  addWorker: (worker: Omit<Worker, 'id'>) => void;
  updateWorker: (id: string, worker: Partial<Worker>) => void;
  deleteWorker: (id: string) => void;
  addBilling: (billing: Omit<Billing, 'id'>) => void;
  updateBilling: (id: string, billing: Partial<Billing>) => void;
  deleteBilling: (id: string) => void;
  addClientPayment: (payment: Omit<ClientPayment, 'id'>) => void;
  updateClientPayment: (id: string, payment: Partial<ClientPayment>) => void;
  deleteClientPayment: (id: string) => void;
  addKharchi: (kharchi: Omit<Kharchi, 'id'>) => void;
  updateKharchi: (id: string, kharchi: Partial<Kharchi>) => void;
  deleteKharchi: (id: string) => void;
  addAdvance: (advance: Omit<Advance, 'id'>) => void;
  updateAdvance: (id: string, advance: Partial<Advance>) => void;
  deleteAdvance: (id: string) => void;
  addWorkerPayment: (payment: Omit<WorkerPayment, 'id'>) => void;
  updateWorkerPayment: (id: string, payment: Partial<WorkerPayment>) => void;
  deleteWorkerPayment: (id: string) => void;
  addApproval: (approval: Omit<Approval, 'id' | 'status'>) => void;
  updateApproval: (id: string, approval: Partial<Approval>) => void;
  deleteApproval: (id: string) => void;
  addKharchiApproval: (approval: Omit<KharchiApproval, 'id' | 'status'>) => void;
  updateKharchiApproval: (id: string, approval: Partial<KharchiApproval>) => void;
  deleteKharchiApproval: (id: string) => void;
  addPaymentSheetApproval: (approval: Omit<PaymentSheetApproval, 'id' | 'status'>) => void;
  updatePaymentSheetApproval: (id: string, approval: Partial<PaymentSheetApproval>) => void;
  deletePaymentSheetApproval: (id: string) => void;
  addAdvanceSheetApproval: (approval: Omit<AdvanceSheetApproval, 'id' | 'status'>) => void;
  updateAdvanceSheetApproval: (id: string, approval: Partial<AdvanceSheetApproval>) => void;
  deleteAdvanceSheetApproval: (id: string) => void;
  addExpenseEntry: (expense: Omit<ExpenseEntry, 'id'>) => void;
  updateExpenseEntry: (id: string, expense: Partial<ExpenseEntry>) => void;
  deleteExpenseEntry: (id: string) => void;
  addStaff: (staffMember: Omit<Staff, 'createdDate'>) => void;
  updateStaff: (id: string, staffMember: Partial<Staff>) => void;
  deleteStaff: (id: string) => void;
  addMessBooking: (booking: Omit<MessBooking, 'id'>) => void;
  updateMessBooking: (id: string, booking: Partial<MessBooking>) => void;
  deleteMessBooking: (id: string) => void;
  addDLR: (dlr: Omit<DailyLabourReport, 'id'>) => void;
  updateDLR: (id: string, dlr: Partial<DailyLabourReport>) => void;
  deleteDLR: (id: string) => void;
  addMaterialItem: (item: Omit<MaterialItem, 'id'>) => void;
  updateMaterialItem: (id: string, item: Partial<MaterialItem>) => void;
  deleteMaterialItem: (id: string) => void;
  addMaterialIssue: (issue: Omit<MaterialIssue, 'id'>) => void;
  updateMaterialIssue: (id: string, issue: Partial<MaterialIssue>) => void;
  deleteMaterialIssue: (id: string) => void;
  addMaterialReturn: (ret: Omit<MaterialReturn, 'id'>) => void;
  updateMaterialReturn: (id: string, ret: Partial<MaterialReturn>) => void;
  deleteMaterialReturn: (id: string) => void;
  addMaterialPurchase: (purchase: Omit<MaterialPurchase, 'id'>) => void;
  updateMaterialPurchase: (id: string, purchase: Partial<MaterialPurchase>) => void;
  deleteMaterialPurchase: (id: string) => void;
  addLabourPlanning: (planning: Omit<LabourPlanning, 'id'>) => void;
  updateLabourPlanning: (id: string, planning: Partial<LabourPlanning>) => void;
  deleteLabourPlanning: (id: string) => void;
  addWorkerTransfer: (transfer: Omit<WorkerTransfer, 'id'>) => void;
  addAsset: (asset: Omit<Asset, 'id'>) => Promise<void>;
  updateAsset: (id: string, asset: Partial<Asset>) => Promise<void>;
  deleteAsset: (id: string) => Promise<{ success: boolean; error?: string }>;
  addAssetTransfer: (transfer: Omit<AssetTransfer, 'id'>) => Promise<void>;
  addAssetMaintenance: (maintenance: Omit<AssetMaintenance, 'id'>) => Promise<void>;
  addWorkerLedgerEntry: (entry: Omit<WorkerLedgerEntry, 'id'>) => Promise<void>;
  updateWorkerLedgerEntry: (id: string, entry: Partial<WorkerLedgerEntry>) => Promise<void>;
  deleteWorkerLedgerEntry: (id: string) => Promise<void>;
  addWorkerHold: (hold: Omit<WorkerHold, 'id'>) => Promise<void>;
  updateWorkerHold: (id: string, hold: Partial<WorkerHold>) => Promise<void>;
  deleteWorkerHold: (id: string) => Promise<void>;
  addWorkerRecoveryAudit: (audit: Omit<WorkerRecoveryAuditTrail, 'id'>) => Promise<void>;
  addAttendance: (att: Omit<Attendance, 'id'>) => Promise<void>;
  addTrackedBill: (bill: Omit<TrackedBill, 'id'>) => Promise<void>;
  updateTrackedBill: (id: string, bill: Partial<TrackedBill>) => Promise<void>;
  deleteTrackedBill: (id: string) => Promise<void>;
  addClientFloorBill: (bill: Omit<ClientFloorBill, 'id'>) => Promise<void>;
  updateClientFloorBill: (id: string, bill: Partial<ClientFloorBill>) => Promise<void>;
  deleteClientFloorBill: (id: string) => Promise<void>;
  addBillTimeline: (timeline: Omit<BillTimelineEntry, 'id'>) => Promise<void>;
  addFinancialYear: (fy: Omit<FinancialYear, 'id'>) => Promise<void>;
  updateFinancialYear: (id: string, fy: Partial<FinancialYear>) => Promise<void>;
  deleteFinancialYear: (id: string) => Promise<void>;
  addFloorAbstract: (floorAbstract: Omit<FloorAbstract, 'id'>) => Promise<void>;
  updateFloorAbstract: (id: string, floorAbstract: Partial<FloorAbstract>) => Promise<void>;
  deleteFloorAbstract: (id: string) => Promise<void>;
}

const initialState: AppState = {
  projects: [
    { id: 'p1', name: 'S3 Eco City', startDate: '2026-01-01', completionDate: '2027-01-01', address: 'Plot 4, Sector 18', budget: 15000000, status: 'Ongoing' },
    { id: 'p2', name: 'EPR Mulund', startDate: '2026-01-01', completionDate: '2027-06-30', address: 'LBS Road, Mulund West', budget: 85000000, status: 'Ongoing' },
    { id: 'p3', name: 'City Center Mall', startDate: '2025-01-15', completionDate: '2026-01-15', address: 'Downtown', budget: 5000000, status: 'Ongoing' },
  ],
  workers: [
    { id: 'w1', serialNo: '1', workerId: 'EMP001', name: 'John Doe', projectId: 'p1', designation: 'Supervisor', joiningDate: '2025-01-10' },
    { id: 'w2', serialNo: '2', workerId: 'EMP002', name: 'Jane Smith', projectId: 'p1', designation: 'Mason', joiningDate: '2025-01-12' },
    { id: 'w3', serialNo: '3', workerId: 'EMP003', name: 'Mike Johnson', projectId: 'p2', designation: 'Electrician', joiningDate: '2025-03-05' },
  ],
  billings: [
    { id: 'b1', srNo: '1', projectId: 'p1', billNo: 'BILL-001', workNature: 'Foundation', amount: 250000, month: '2025-02', certifyDate: '2025-02-28' },
  ],
  clientPayments: [
    { id: 'cp1', projectId: 'p1', amountReceived: 200000, date: '2025-03-05', remarks: 'First Installment' },
  ],
  kharchis: [
    { id: 'k1', projectId: 'p1', workerId: 'w2', date: '2025-02-02', amount: 500 },
    { id: 'k2', projectId: 'p1', workerId: 'w2', date: '2025-02-09', amount: 500 },
  ],
  advances: [
    { id: 'a1', projectId: 'p1', workerId: 'w1', amount: 5000, paidBy: 'Admin', remarks: 'Medical emergency', date: '2025-02-15' },
  ],
  workerPayments: [],
  approvals: [],
  kharchiApprovals: [],
  paymentSheetApprovals: [],
  advanceSheetApprovals: [],
  expensesLedger: [
    { id: "el1", date: "2026-01-01", description: "Amount Credit", projectId: "", kharchi: 0, mess: 0, workerAdvance: 0, tiffin: 0, travel: 0, machineryMaterial: 0, workerPayment: 0, stationery: 0, others: 0, bank: "SBI", crBalance: 5000 },
    { id: "el2", date: "2026-01-01", description: "Travel Advance to Tripmaza", projectId: "p1", kharchi: 0, mess: 0, workerAdvance: 0, tiffin: 0, travel: 5000, machineryMaterial: 0, workerPayment: 0, stationery: 0, others: 0, bank: "", crBalance: 0 },
    { id: "el3", date: "2026-01-01", description: "Amount Credit", projectId: "", kharchi: 0, mess: 0, workerAdvance: 0, tiffin: 0, travel: 0, machineryMaterial: 0, workerPayment: 0, stationery: 0, others: 0, bank: "SBI", crBalance: 15000 },
    { id: "el4", date: "2026-01-01", description: "Mess", projectId: "p2", kharchi: 0, mess: 8000, workerAdvance: 0, tiffin: 0, travel: 0, machineryMaterial: 0, workerPayment: 0, stationery: 0, others: 0, bank: "", crBalance: 0 },
    { id: "el5", date: "2026-01-01", description: "Mess", projectId: "p1", kharchi: 0, mess: 7000, workerAdvance: 0, tiffin: 0, travel: 0, machineryMaterial: 0, workerPayment: 0, stationery: 0, others: 0, bank: "", crBalance: 0 },
    { id: "el6", date: "2026-01-04", description: "Amount Credit", projectId: "", kharchi: 0, mess: 0, workerAdvance: 0, tiffin: 0, travel: 0, machineryMaterial: 0, workerPayment: 0, stationery: 0, others: 0, bank: "SBI", crBalance: 1500 },
    { id: "el7", date: "2026-01-04", description: "Travel Allowance to Sakir Alam", projectId: "p1", kharchi: 0, mess: 0, workerAdvance: 0, tiffin: 0, travel: 1500, machineryMaterial: 0, workerPayment: 0, stationery: 0, others: 0, bank: "", crBalance: 0 },
    { id: "el8", date: "2026-01-06", description: "Amount Credit", projectId: "", kharchi: 0, mess: 0, workerAdvance: 0, tiffin: 0, travel: 0, machineryMaterial: 0, workerPayment: 0, stationery: 0, others: 0, bank: "SBI", crBalance: 50000 },
    { id: "el9", date: "2026-01-06", description: "Transfer to Nasrin Banu", projectId: "", kharchi: 0, mess: 0, workerAdvance: 0, tiffin: 0, travel: 0, machineryMaterial: 0, workerPayment: 0, stationery: 0, others: 5000, bank: "", crBalance: 0 },
    { id: "el10", date: "2026-01-06", description: "Advance to Faruq Alam", projectId: "p1", kharchi: 0, mess: 0, workerAdvance: 10000, tiffin: 0, travel: 0, machineryMaterial: 0, workerPayment: 0, stationery: 0, others: 0, bank: "", crBalance: 0 }
  ],
  messBookings: [],
  dlrs: [],
  materialItems: [],
  materialIssues: [],
  materialReturns: [],
  materialPurchases: [],
  labourPlannings: [],
  workerTransfers: [],
  assets: [
    { id: 'ast1', name: 'Drill Machine TE-70 Heavy', category: 'Drill Machine', assetCode: 'AST-1001', brand: 'Hilti', purchaseDate: '2026-01-10', purchaseCost: 45000, currentSiteId: 'p1', assignedTo: 'John Doe', status: 'In Use' },
    { id: 'ast2', name: 'Scaffolding Unit Set-B', category: 'Scaffolding', assetCode: 'AST-1002', brand: 'Supra', purchaseDate: '2026-01-15', purchaseCost: 120000, currentSiteId: 'p2', assignedTo: '', status: 'Available' },
    { id: 'ast3', name: 'Cutter Machine GDC-121', category: 'Cutter Machine', assetCode: 'AST-1003', brand: 'Bosch', purchaseDate: '2026-02-01', purchaseCost: 8500, currentSiteId: 'general_pool', assignedTo: 'Jane Smith', status: 'Under Maintenance' }
  ],
  assetTransfers: [
    { id: 'txn1', assetId: 'ast1', fromSiteId: 'general_pool', toSiteId: 'p1', transferDate: '2026-01-15', transferredBy: 'Admin Supervisor', remarks: 'Initial mobilization to block S3 Eco City' }
  ],
  assetMaintenances: [
    { id: 'maint1', assetId: 'ast3', maintenanceDate: '2026-02-15', maintenanceType: 'Repair', vendor: 'Universal Power Solutions', cost: 1200, remarks: 'Replaced carbon brushes and cleaned stator winding assembly', nextMaintenanceDate: '2026-08-15' }
  ],
  workerLedger: [],
  workerHolds: [],
  workerRecoveryAuditTrail: [],
  attendance: [],
  trackedBills: [],
    clientFloorBills: [],
  billTimelines: [],
  financialYears: [],
  staff: [],
  floorAbstracts: [],
  activityLogs: [],
  numberingSettings: [],
  numberingAuditLogs: [],
  boqs: [],
  boqAuditLogs: [],
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<AppContextType['user']>(null);

  const setUser = (usr: AppContextType['user']) => {
    if (usr) {
      localStorage.setItem('erp_auth_user', JSON.stringify(usr));
    } else {
      localStorage.removeItem('erp_auth_user');
    }
    setUserState(usr);
  };

  const [state, setState] = useState<AppState>({
    projects: [],
    workers: [],
    billings: [],
    clientPayments: [],
    kharchis: [],
    advances: [],
    workerPayments: [],
    approvals: [],
    kharchiApprovals: [],
    paymentSheetApprovals: [],
    advanceSheetApprovals: [],
    expensesLedger: [],
    messBookings: [],
    dlrs: [],
    materialItems: [],
    materialIssues: [],
    materialReturns: [],
    materialPurchases: [],
    labourPlannings: [],
    workerTransfers: [],
    assets: [],
    assetTransfers: [],
    assetMaintenances: [],
    workerLedger: [],
    workerHolds: [],
    workerRecoveryAuditTrail: [],
    attendance: [],
    trackedBills: [],
    clientFloorBills: [],
    billTimelines: [],
    financialYears: [],
    staff: [],
    floorAbstracts: [],
    activityLogs: [],
    numberingSettings: [],
    numberingAuditLogs: [],
    boqs: [],
    boqAuditLogs: [],
  });
  const [isDbLoaded, setIsDbLoaded] = useState(false);

  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const loadAllData = async () => {
      try {
        const [
          pRes, wRes, bRes, cpRes, kRes, aRes, wpRes, apRes, psaRes, elRes, mbRes, dlrRes, kaRes, miRes, misRes, mrRes, mpRes, lpRes, wtRes, assetsRes, assetTransfersRes, assetMaintenancesRes,
          wlRes, whRes, wratRes, asaRes, attRes, tbRes, tlRes, fyRes, staffRes, faRes, actRes, numSetRes, numAuditRes, boqsRes, boqAuditRes
        ] = await Promise.all([
          fetch('/api/projects').then(r => r.json()),
          fetch('/api/workers').then(r => r.json()),
          fetch('/api/billings').then(r => r.json()),
          fetch('/api/client-payments').then(r => r.json()),
          fetch('/api/kharchis').then(r => r.json()),
          fetch('/api/advances').then(r => r.json()),
          fetch('/api/worker-payments').then(r => r.json()),
          fetch('/api/approvals').then(r => r.json()).catch(() => []),
          fetch('/api/payment-sheet-approvals').then(r => r.json()).catch(() => []),
          fetch('/api/expenses_ledger').then(r => r.json()).catch(() => []),
          fetch('/api/mess-bookings').then(r => r.json()).catch(() => []),
          fetch('/api/dlrs').then(r => r.json()).catch(() => []),
          fetch('/api/kharchi-approvals').then(r => r.json()).catch(() => []),
          fetch('/api/material-items').then(r => r.json()).catch(() => []),
          fetch('/api/material-issues').then(r => r.json()).catch(() => []),
          fetch('/api/material-returns').then(r => r.json()).catch(() => []),
          fetch('/api/material-purchases').then(r => r.json()).catch(() => []),
          fetch('/api/labour-plannings').then(r => r.json()).catch(() => []),
          fetch('/api/worker-transfers').then(r => r.json()).catch(() => []),
          fetch('/api/assets').then(r => r.json()).catch(() => []),
          fetch('/api/asset-transfers').then(r => r.json()).catch(() => []),
          fetch('/api/asset-maintenances').then(r => r.json()).catch(() => []),
          fetch('/api/worker-ledger').then(r => r.json()).catch(() => []),
          fetch('/api/worker-holds').then(r => r.json()).catch(() => []),
          fetch('/api/worker-recovery-audit').then(r => r.json()).catch(() => []),
          fetch('/api/advance-sheet-approvals').then(r => r.json()).catch(() => []),
          fetch('/api/attendance').then(r => r.json()).catch(() => []),
          fetch('/api/tracked-bills').then(r => r.json()).catch(() => []),
          fetch('/api/bill-timelines').then(r => r.json()).catch(() => []),
          fetch('/api/financial-years').then(r => r.json()).catch(() => []),
          fetch('/api/staff').then(r => r.json()).catch(() => []),
          fetch('/api/floor-abstracts').then(r => r.json()).catch(() => []),
          fetch('/api/activity-logs').then(r => r.json()).catch(() => []),
          fetch('/api/numbering-settings').then(r => r.json()).catch(() => []),
          fetch('/api/numbering-settings/audit-logs').then(r => r.json()).catch(() => []),
          fetch('/api/boqs').then(r => r.json()).catch(() => []),
          fetch('/api/boqs-audit-logs').then(r => r.json()).catch(() => [])
        ]);

        const stateObj: AppState = {
          projects: pRes,
          workers: wRes,
          billings: bRes,
          clientPayments: cpRes,
          kharchis: kRes,
          advances: aRes,
          workerPayments: wpRes,
          approvals: apRes,
          kharchiApprovals: kaRes || [],
          paymentSheetApprovals: psaRes,
          advanceSheetApprovals: asaRes || [],
          expensesLedger: elRes,
          messBookings: mbRes,
          dlrs: dlrRes || [],
          materialItems: miRes || [],
          materialIssues: misRes || [],
          materialReturns: mrRes || [],
          materialPurchases: mpRes || [],
          labourPlannings: lpRes || [],
          workerTransfers: wtRes || [],
          assets: assetsRes || [],
          assetTransfers: assetTransfersRes || [],
          assetMaintenances: assetMaintenancesRes || [],
          workerLedger: wlRes || [],
          workerHolds: whRes || [],
          workerRecoveryAuditTrail: wratRes || [],
          attendance: attRes || [],
          trackedBills: tbRes || [],
          clientFloorBills: [],
          billTimelines: tlRes || [],
          financialYears: fyRes || [],
          staff: staffRes || [],
          floorAbstracts: faRes || [],
          activityLogs: actRes || [],
          numberingSettings: numSetRes || [],
          numberingAuditLogs: numAuditRes || [],
          boqs: boqsRes || [],
          boqAuditLogs: boqAuditRes || []
        };
        setState(stateObj);

        // Sync with IndexedDB
        await saveAllToStore('projects', pRes);
        await saveAllToStore('workers', wRes);
        await saveAllToStore('billings', bRes);
        await saveAllToStore('clientPayments', cpRes);
        await saveAllToStore('kharchis', kRes);
        await saveAllToStore('advances', aRes);
        await saveAllToStore('workerPayments', wpRes);
        await saveAllToStore('approvals', apRes);
        await saveAllToStore('kharchiApprovals', kaRes || []).catch(() => {});
        await saveAllToStore('paymentSheetApprovals', psaRes).catch(() => {});
        await saveAllToStore('expensesLedger', elRes).catch(() => {});
        await saveAllToStore('messBookings', mbRes).catch(() => {});
        if(dlrRes) await saveAllToStore('dlrs', dlrRes).catch(() => {});
        await saveAllToStore('materialItems', miRes || []).catch(() => {});
        await saveAllToStore('materialIssues', misRes || []).catch(() => {});
        await saveAllToStore('materialReturns', mrRes || []).catch(() => {});
        await saveAllToStore('materialPurchases', mpRes || []).catch(() => {});
        await saveAllToStore('labourPlannings', lpRes || []).catch(() => {});
        await saveAllToStore('workerTransfers', wtRes || []).catch(() => {});
        await saveAllToStore('assets', assetsRes || []).catch(() => {});
        await saveAllToStore('assetTransfers', assetTransfersRes || []).catch(() => {});
        await saveAllToStore('assetMaintenances', assetMaintenancesRes || []).catch(() => {});
        await saveAllToStore('attendance', attRes || []).catch(() => {});
        await saveAllToStore('trackedBills', tbRes || []).catch(() => {});
        await saveAllToStore('clientFloorBills', []).catch(() => {});
        await saveAllToStore('billTimelines', tlRes || []).catch(() => {});
        await saveAllToStore('financialYears', fyRes || []).catch(() => {});
        await saveAllToStore('floorAbstracts', faRes || []).catch(() => {});
        await saveAllToStore('activityLogs', actRes || []).catch(() => {});
        await saveAllToStore('numberingSettings', numSetRes || []).catch(() => {});
        await saveAllToStore('numberingAuditLogs', numAuditRes || []).catch(() => {});
        await saveAllToStore('boqs', boqsRes || []).catch(() => {});
        await saveAllToStore('boqAuditLogs', boqAuditRes || []).catch(() => {});
      } catch (err) {
        console.error('Error loading from Express API, loading from IndexedDB fallback:', err);
        try {
          const projects = await getAllFromStore('projects');
          const workers = await getAllFromStore('workers');
          const billings = await getAllFromStore('billings');
          const clientPayments = await getAllFromStore('clientPayments');
          const kharchis = await getAllFromStore('kharchis');
          const advances = await getAllFromStore('advances');
          const workerPayments = await getAllFromStore('workerPayments');
          const approvals = await getAllFromStore('approvals');
          const paymentSheetApprovals = await getAllFromStore('paymentSheetApprovals').catch(() => []);
          const kharchiApprovals = await getAllFromStore('kharchiApprovals').catch(() => []);
          const expensesLedger = await getAllFromStore('expensesLedger').catch(() => []);
          const messBookings = await getAllFromStore('messBookings').catch(() => []);
          const dlrs = await getAllFromStore('dlrs').catch(() => []);
          const materialItems = await getAllFromStore('materialItems').catch(() => []);
          const materialIssues = await getAllFromStore('materialIssues').catch(() => []);
          const materialReturns = await getAllFromStore('materialReturns').catch(() => []);
          const materialPurchases = await getAllFromStore('materialPurchases').catch(() => []);
          const labourPlannings = await getAllFromStore('labourPlannings').catch(() => []);
          const workerTransfers = await getAllFromStore('workerTransfers').catch(() => []);
          const assets = await getAllFromStore('assets').catch(() => []);
          const assetTransfers = await getAllFromStore('assetTransfers').catch(() => []);
          const assetMaintenances = await getAllFromStore('assetMaintenances').catch(() => []);
          const workerLedger = await getAllFromStore('workerLedger').catch(() => []);
          const workerHolds = await getAllFromStore('workerHolds').catch(() => []);
          const workerRecoveryAuditTrail = await getAllFromStore('workerRecoveryAuditTrail').catch(() => []);
          const advanceSheetApprovals = await getAllFromStore('advanceSheetApprovals').catch(() => []);
          const attendance = await getAllFromStore('attendance').catch(() => []);
          const trackedBills = await getAllFromStore('trackedBills').catch(() => []);
          const clientFloorBills = await getAllFromStore('clientFloorBills').catch(() => []);
          const billTimelines = await getAllFromStore('billTimelines').catch(() => []);
          const financialYears = await getAllFromStore('financialYears').catch(() => []);
          const staff = await getAllFromStore('staff').catch(() => []);
          const floorAbstracts = await getAllFromStore('floorAbstracts').catch(() => []);
          const activityLogs = await getAllFromStore('activityLogs').catch(() => []);
          const numberingSettings = await getAllFromStore('numberingSettings').catch(() => []);
          const numberingAuditLogs = await getAllFromStore('numberingAuditLogs').catch(() => []);
          const boqs = await getAllFromStore('boqs').catch(() => []);
          const boqAuditLogs = await getAllFromStore('boqAuditLogs').catch(() => []);

          const isDbEmpty = projects.length === 0 && workers.length === 0 && billings.length === 0 &&
                            clientPayments.length === 0 && kharchis.length === 0 && advances.length === 0 &&
                            workerPayments.length === 0 && approvals.length === 0 && paymentSheetApprovals.length === 0 &&
                            kharchiApprovals.length === 0 && advanceSheetApprovals.length === 0 &&
                            expensesLedger.length === 0 && messBookings.length === 0 && dlrs.length === 0 &&
                            materialItems.length === 0 && materialIssues.length === 0 && materialReturns.length === 0 && materialPurchases.length === 0 &&
                            labourPlannings.length === 0 && workerTransfers.length === 0 && assets.length === 0 &&
                            assetTransfers.length === 0 && assetMaintenances.length === 0 &&
                            workerLedger.length === 0 && workerHolds.length === 0 && workerRecoveryAuditTrail.length === 0 && attendance.length === 0 &&
                            trackedBills.length === 0 && billTimelines.length === 0 && financialYears.length === 0 && staff.length === 0 && floorAbstracts.length === 0 && activityLogs.length === 0;

          if (isDbEmpty) {
            setState(initialState);
          } else {
            setState({
              projects,
              workers,
              billings,
              clientPayments,
              kharchis,
              advances,
              workerPayments,
              approvals,
              kharchiApprovals,
              paymentSheetApprovals,
              advanceSheetApprovals,
              expensesLedger,
              messBookings,
              dlrs,
              materialItems,
              materialIssues,
              materialReturns,
              materialPurchases,
              labourPlannings,
              workerTransfers,
              assets,
              assetTransfers,
              assetMaintenances,
              workerLedger,
              workerHolds,
              workerRecoveryAuditTrail,
              attendance,
              trackedBills,
              clientFloorBills,
              billTimelines,
              financialYears,
              staff,
              floorAbstracts,
              activityLogs,
              numberingSettings,
              numberingAuditLogs,
              boqs,
              boqAuditLogs
            });
          }
        } catch (e) {
          console.error('IndexedDB fallback failed: ', e);
          setState(initialState);
        }
      } finally {
        setIsDbLoaded(true);
      }
    };

    loadAllData();
  }, []);

  useEffect(() => {
    const handleBillCreated = (data?: any) => {
      console.log('Event received: bill-create. Synchronizing state...', data);
      refreshClientPayments();
      refreshBillings();
    };

    const handleBillUpdated = (data?: any) => {
      console.log('Event received: bill-update. Synchronizing state...', data);
      refreshClientPayments();
      refreshBillings();
    };

    const handleBillDeleted = (data?: any) => {
      console.log('Event received: bill-delete. Synchronizing state...', data);
      refreshClientPayments();
      refreshBillings();
    };

    const unsubscribeCreate = globalEventBus.on('bill-create', handleBillCreated);
    const unsubscribeUpdate = globalEventBus.on('bill-update', handleBillUpdated);
    const unsubscribeDelete = globalEventBus.on('bill-delete', handleBillDeleted);

    window.addEventListener('bill-create', handleBillCreated as EventListener);
    window.addEventListener('bill-update', handleBillUpdated as EventListener);
    window.addEventListener('bill-delete', handleBillDeleted as EventListener);

    return () => {
      unsubscribeCreate();
      unsubscribeUpdate();
      unsubscribeDelete();
      window.removeEventListener('bill-create', handleBillCreated as EventListener);
      window.removeEventListener('bill-update', handleBillUpdated as EventListener);
      window.removeEventListener('bill-delete', handleBillDeleted as EventListener);
    };
  }, []);

  const importBackup = async (rawBackupState: any): Promise<boolean> => {
    try {
      const backupState = (rawBackupState && rawBackupState.backupData) ? rawBackupState.backupData : rawBackupState;
      if (!backupState || (!Array.isArray(backupState.projects) && !Array.isArray(backupState.workers))) {
        throw new Error('Invalid backup format');
      }
      
      const res = await fetch('/api/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backupState)
      });
      if (!res.ok) throw new Error('API importFailed');

      // Also save to IndexedDB as fallback
      await saveAllToStore('projects', backupState.projects || []);
      await saveAllToStore('workers', backupState.workers || []);
      await saveAllToStore('billings', backupState.billings || []);
      await saveAllToStore('clientPayments', backupState.clientPayments || []);
      await saveAllToStore('kharchis', backupState.kharchis || []);
      await saveAllToStore('advances', backupState.advances || []);
      await saveAllToStore('workerPayments', backupState.workerPayments || []);
      await saveAllToStore('approvals', backupState.approvals || []);
      await saveAllToStore('kharchiApprovals', backupState.kharchiApprovals || []).catch(() => {});
      await saveAllToStore('paymentSheetApprovals', backupState.paymentSheetApprovals || []);
      await saveAllToStore('advanceSheetApprovals', backupState.advanceSheetApprovals || []).catch(() => {});
      await saveAllToStore('expensesLedger', backupState.expensesLedger || []).catch(() => {});
      await saveAllToStore('messBookings', backupState.messBookings || []).catch(() => {});
      await saveAllToStore('dlrs', backupState.dlrs || []).catch(() => {});
      await saveAllToStore('materialItems', backupState.materialItems || []).catch(() => {});
      await saveAllToStore('materialIssues', backupState.materialIssues || []).catch(() => {});
      await saveAllToStore('materialReturns', backupState.materialReturns || []).catch(() => {});
      await saveAllToStore('materialPurchases', backupState.materialPurchases || []).catch(() => {});
      await saveAllToStore('labourPlannings', backupState.labourPlannings || []).catch(() => {});
      await saveAllToStore('workerTransfers', backupState.workerTransfers || []).catch(() => {});
      await saveAllToStore('assets', backupState.assets || []).catch(() => {});
      await saveAllToStore('assetTransfers', backupState.assetTransfers || []).catch(() => {});
      await saveAllToStore('assetMaintenances', backupState.assetMaintenances || []).catch(() => {});
      await saveAllToStore('workerLedger', backupState.workerLedger || []).catch(() => {});
      await saveAllToStore('workerHolds', backupState.workerHolds || []).catch(() => {});
      await saveAllToStore('workerRecoveryAuditTrail', backupState.workerRecoveryAuditTrail || []).catch(() => {});
      await saveAllToStore('attendance', backupState.attendance || []);
      await saveAllToStore('trackedBills', backupState.trackedBills || []).catch(() => {});
      await saveAllToStore('clientFloorBills', backupState.clientFloorBills || []).catch(() => {});
      await saveAllToStore('billTimelines', backupState.billTimelines || []).catch(() => {});
      await saveAllToStore('financialYears', backupState.financialYears || []).catch(() => {});
      await saveAllToStore('staff', backupState.staff || []).catch(() => {});
      await saveAllToStore('floorAbstracts', backupState.floorAbstracts || []).catch(() => {});
      await saveAllToStore('activityLogs', backupState.activityLogs || []).catch(() => {});
      await saveAllToStore('numberingSettings', backupState.numberingSettings || []).catch(() => {});
      await saveAllToStore('numberingAuditLogs', backupState.numberingAuditLogs || []).catch(() => {});
      await saveAllToStore('boqs', backupState.boqs || []).catch(() => {});
      await saveAllToStore('boqAuditLogs', backupState.boqAuditLogs || []).catch(() => {});

      setState(backupState);
      return true;
    } catch (e) {
      console.error('Backup import failed:', e);
      return false;
    }
  };

  const triggerSuccess = (message: string) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('show-success-toast', { detail: { message } }));
    }
  };

  const refreshActivityLogs = async () => {
    try {
      const res = await fetch('/api/activity-logs');
      if (res.ok) {
        const data = await res.json();
        setState(s => ({ ...s, activityLogs: data }));
        await saveAllToStore('activityLogs', data).catch(() => {});
      }
    } catch (e) {
      console.error('Failed to load activity logs:', e);
    }
  };

  const syncBOQBillings = async (currentBillings: Billing[]) => {
    const currentBoqs = stateRef.current.boqs;
    let boqsChanged = false;
    const newBoqs = currentBoqs.map(boq => {
      let boqChanged = false;
      const newItems = (boq.items || []).map(item => {
        let itemChanged = false;
        let floorChanged = false;
        const newFloors = (item.floors || []).map(floor => {
          const billedQty = currentBillings.flatMap(b => (b.measurementItems || [])).filter(mi => mi.boqItemId === item.id && mi.floorId === floor.id).reduce((sum, mi) => sum + (mi.qtyExecuted || 0), 0);
          if (floor.billedQuantity !== billedQty) {
            floor.billedQuantity = billedQty;
            floorChanged = true;
          }
          return floor;
        });
        if (floorChanged) itemChanged = true;
        const totalBilled = newFloors.reduce((s, f) => s + f.billedQuantity, 0);
        if (item.billedQuantity !== totalBilled) {
          item.billedQuantity = totalBilled;
          itemChanged = true;
        }
        return itemChanged ? { ...item, floors: newFloors } : item;
      });
      if (boq.items.some((_, i) => newItems[i] !== boq.items[i])) boqChanged = true;
      if (boqChanged) boqsChanged = true;
      return boqChanged ? { ...boq, items: newItems } : boq;
    });
    if (boqsChanged) {
      setState(s => ({ ...s, boqs: newBoqs }));
      await saveAllToStore('boqs', newBoqs).catch(() => {});
    }
  };

  const refreshBillings = async () => {
    try {
      const res = await fetch('/api/billings');
      if (res.ok) {
        const data = await res.json();
        setState(s => ({ ...s, billings: data }));
        await syncBOQBillings(data);
        await saveAllToStore('billings', data).catch(() => {});
      }
    } catch (e) {
      console.error('Failed to refresh billings:', e);
    }
  };

  const refreshClientPayments = async () => {
    try {
      const res = await fetch('/api/client-payments');
      if (res.ok) {
        const data = await res.json();
        setState(s => ({ ...s, clientPayments: data }));
        await saveAllToStore('clientPayments', data).catch(() => {});
      }
    } catch (e) {
      console.error('Failed to refresh client payments:', e);
    }
  };

  const fetchNumberingSettings = async () => {
    try {
      const res = await fetch('/api/numbering-settings');
      if (res.ok) {
        const data = await res.json();
        setState(s => ({ ...s, numberingSettings: data }));
      }
    } catch (e) {
      console.log('Failed to fetch numbering settings', e);
    }
  };

  const fetchNumberingAuditLogs = async () => {
    try {
      const res = await fetch('/api/numbering-settings/audit-logs');
      if (res.ok) {
        const data = await res.json();
        setState(s => ({ ...s, numberingAuditLogs: data }));
      }
    } catch (e) {
      console.log('Failed to fetch numbering audit logs', e);
    }
  };

  const updateNumberingSetting = async (moduleKey: string, payload: any) => {
    try {
      const res = await fetch(`/api/numbering-settings/${moduleKey}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Username': user?.username || 'Admin'
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await Promise.all([
          fetchNumberingSettings(),
          fetchNumberingAuditLogs(),
          refreshActivityLogs()
        ]);
        triggerSuccess('Numbering sequence settings updated successfully.');
        return true;
      } else {
        const err = await res.json();
        console.error('Update failed:', err.error);
        return false;
      }
    } catch (e) {
      console.error('Failed to update numbering setting', e);
      return false;
    }
  };

  const resetNumbering = async (moduleKey: string, reason: string) => {
    try {
      const res = await fetch(`/api/numbering-settings/reset/${moduleKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Username': user?.username || 'Admin'
        },
        body: JSON.stringify({ reason })
      });
      if (res.ok) {
        await Promise.all([
          fetchNumberingSettings(),
          fetchNumberingAuditLogs(),
          refreshActivityLogs()
        ]);
        triggerSuccess('Numbering sequence reset successfully.');
        return true;
      } else {
        const err = await res.json();
        console.error('Reset failed:', err.error);
        return false;
      }
    } catch (e) {
      console.error('Failed to reset numbering setting', e);
      return false;
    }
  };

  const previewNextNumber = async (moduleKey: string, payload: { projectId?: string; dateStr?: string }) => {
    try {
      const res = await fetch(`/api/numbering-settings/preview/${moduleKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.error('Failed to preview next number', e);
    }
    return { docNumber: '', active: false };
  };

  const consumeNextNumber = async (moduleKey: string, payload: { projectId?: string; dateStr?: string }) => {
    try {
      const res = await fetch(`/api/numbering-settings/consume/${moduleKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        fetchNumberingSettings();
        return data;
      }
    } catch (e) {
      console.error('Failed to consume next number', e);
    }
    return { docNumber: '', active: false };
  };

  const generateId = () => crypto.randomUUID();

  const addProject = async (project: Omit<Project, 'id'>) => {
    const newProject = { ...project, id: generateId() };
    setState(s => ({ ...s, projects: [...s.projects, newProject] }));
    triggerSuccess('New Project successfully registered: ' + newProject.name);
    try {
      await fetch('/api/projects', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Username': user?.username || 'Admin'
        },
        body: JSON.stringify(newProject)
      });
      await saveAllToStore('projects', [...state.projects, newProject]);
      refreshActivityLogs();
    } catch (e) {
      console.error(e);
    }
  };

  const updateProject = async (id: string, project: Partial<Project>) => {
    setState(s => ({ ...s, projects: s.projects.map(p => p.id === id ? { ...p, ...project } : p) }));
    triggerSuccess('Project data updated successfully.');
    try {
      const existing = state.projects.find(p => p.id === id);
      if (existing) {
        const merged = { ...existing, ...project };
        await fetch(`/api/projects/${id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'X-User-Username': user?.username || 'Admin'
          },
          body: JSON.stringify(merged)
        });
        await saveAllToStore('projects', state.projects.map(p => p.id === id ? merged : p));
        refreshActivityLogs();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteProject = async (id: string) => {
    setState(s => ({ ...s, projects: s.projects.filter(p => p.id !== id) }));
    triggerSuccess('Project record has been deleted.');
    try {
      await fetch(`/api/projects/${id}`, { 
        method: 'DELETE',
        headers: {
          'X-User-Username': user?.username || 'Admin'
        }
      });
      await saveAllToStore('projects', state.projects.filter(p => p.id !== id));
      refreshActivityLogs();
    } catch (e) {
      console.error(e);
    }
  };

  const addWorker = async (worker: Omit<Worker, 'id'>) => {
    const newWorker = { ...worker, id: generateId() };
    setState(s => ({ ...s, workers: [...s.workers, newWorker] }));
    triggerSuccess('New Worker registered: ' + newWorker.name);
    try {
      await fetch('/api/workers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWorker)
      });
      await saveAllToStore('workers', [...state.workers, newWorker]);
    } catch (e) {
      console.error(e);
    }
  };

  const updateWorker = async (id: string, worker: Partial<Worker>) => {
    setState(s => ({ ...s, workers: s.workers.map(w => w.id === id ? { ...w, ...worker } : w) }));
    triggerSuccess('Worker profile information successfully updated.');
    try {
      const existing = state.workers.find(w => w.id === id);
      if (existing) {
        const merged = { ...existing, ...worker };
        await fetch(`/api/workers/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(merged)
        });
        await saveAllToStore('workers', state.workers.map(w => w.id === id ? merged : w));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteWorker = async (id: string) => {
    setState(s => ({ ...s, workers: s.workers.filter(w => w.id !== id) }));
    triggerSuccess('Worker file deleted successfully from directory.');
    try {
      await fetch(`/api/workers/${id}`, { method: 'DELETE' });
      await saveAllToStore('workers', state.workers.filter(w => w.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const addBOQ = async (boq: Omit<BOQ, 'id'>) => {
    const newBOQ = { ...boq, id: generateId() };
    setState(s => ({ ...s, boqs: [...s.boqs, newBOQ] }));
    triggerSuccess('BOQ successfully created: ' + newBOQ.boqNo);
    try {
      await fetch('/api/boqs', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Username': user?.username || 'Admin'
        },
        body: JSON.stringify(newBOQ)
      });
      await saveAllToStore('boqs', [...state.boqs, newBOQ]);
      refreshActivityLogs();
    } catch (e) {
      console.error(e);
    }
  };

  const updateBOQ = async (id: string, boq: Partial<BOQ>) => {
    setState(s => {
      const updated = s.boqs.map(b => b.id === id ? { ...b, ...boq } : b);
      return { ...s, boqs: updated };
    });
    triggerSuccess('BOQ updated successfully.');
    try {
      const existing = state.boqs.find(b => b.id === id);
      if (existing) {
        const merged = { ...existing, ...boq };
        await fetch(`/api/boqs/${id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'X-User-Username': user?.username || 'Admin'
          },
          body: JSON.stringify(merged)
        });
        const currentUpdated = state.boqs.map(b => b.id === id ? merged : b);
        await saveAllToStore('boqs', currentUpdated);
        refreshActivityLogs();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteBOQ = async (id: string) => {
    setState(s => ({ ...s, boqs: s.boqs.filter(b => b.id !== id) }));
    triggerSuccess('BOQ deleted successfully.');
    try {
      await fetch(`/api/boqs/${id}`, { 
        method: 'DELETE',
        headers: { 'X-User-Username': user?.username || 'Admin' }
      });
      await saveAllToStore('boqs', state.boqs.filter(b => b.id !== id));
      refreshActivityLogs();
    } catch (e) {
      console.error(e);
    }
  };

  const addBOQAuditLog = async (log: Omit<BOQAuditLog, 'id' | 'timestamp'>) => {
    const newLog: BOQAuditLog = {
      ...log,
      id: 'bal_' + Math.random().toString(36).substring(2, 11),
      timestamp: new Date().toISOString()
    };
    setState(s => ({ ...s, boqAuditLogs: [newLog, ...s.boqAuditLogs] }));
    try {
      await fetch('/api/boqs-audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLog)
      });
      await saveAllToStore('boqAuditLogs', [newLog, ...state.boqAuditLogs]);
    } catch (e) {
      console.error(e);
    }
  };

  const addBilling = async (billing: Omit<Billing, 'id'>) => {
    const newBilling = { ...billing, id: generateId() };
    const updated = [...stateRef.current.billings, newBilling];
    setState(s => ({ ...s, billings: updated }));
    triggerSuccess('Billing entry logged successfully: ' + newBilling.billNo);
    try {
      await fetch('/api/billings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBilling)
      });
      await saveAllToStore('billings', updated);
      await refreshBillings();
      await refreshClientPayments();
      globalEventBus.emit('bill-create', newBilling);
    } catch (e) {
      console.error(e);
    }
  };

  const updateBilling = async (id: string, billing: Partial<Billing>) => {
    const currentBillings = stateRef.current.billings;
    const existing = currentBillings.find(b => b.id === id);
    if (existing) {
      const merged = { ...existing, ...billing };
      const updated = currentBillings.map(b => b.id === id ? merged : b);
      setState(s => ({ ...s, billings: updated }));
      triggerSuccess('Billing invoice record updated.');
      try {
        await fetch(`/api/billings/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(merged)
        });
        await saveAllToStore('billings', updated);
        await refreshBillings();
        await refreshClientPayments();
        globalEventBus.emit('bill-update', merged);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const deleteBilling = async (id: string) => {
    const updated = stateRef.current.billings.filter(b => b.id !== id);
    setState(s => ({ ...s, billings: updated }));
    triggerSuccess('Billing entry deleted from records.');
    try {
      await fetch(`/api/billings/${id}`, { method: 'DELETE' });
      await saveAllToStore('billings', updated);
      await refreshBillings();
      await refreshClientPayments();
      globalEventBus.emit('bill-delete', { id });
    } catch (e) {
      console.error(e);
    }
  };

  const addClientPayment = async (payment: Omit<ClientPayment, 'id'>) => {
    const newPayment = { ...payment, id: generateId() };
    const updated = [...stateRef.current.clientPayments, newPayment];
    setState(s => ({ ...s, clientPayments: updated }));
    try {
      await fetch('/api/client-payments', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Username': user?.username || 'Admin'
        },
        body: JSON.stringify(newPayment)
      });
      await saveAllToStore('clientPayments', updated);
      refreshActivityLogs();
    } catch (e) {
      console.error(e);
    }
  };

  const updateClientPayment = async (id: string, payment: Partial<ClientPayment>) => {
    const currentPayments = stateRef.current.clientPayments;
    const existing = currentPayments.find(cp => cp.id === id);
    if (existing) {
      const merged = { ...existing, ...payment };
      const updated = currentPayments.map(cp => cp.id === id ? merged : cp);
      setState(s => ({ ...s, clientPayments: updated }));
      try {
        await fetch(`/api/client-payments/${id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'X-User-Username': user?.username || 'Admin'
          },
          body: JSON.stringify(merged)
        });
        await saveAllToStore('clientPayments', updated);
        refreshActivityLogs();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const deleteClientPayment = async (id: string) => {
    const updated = stateRef.current.clientPayments.filter(cp => cp.id !== id);
    setState(s => ({ ...s, clientPayments: updated }));
    try {
      await fetch(`/api/client-payments/${id}`, { 
        method: 'DELETE',
        headers: {
          'X-User-Username': user?.username || 'Admin'
        }
      });
      await saveAllToStore('clientPayments', updated);
      refreshActivityLogs();
    } catch (e) {
      console.error(e);
    }
  };

  const addKharchi = async (kharchi: Omit<Kharchi, 'id'>) => {
    const newKharchi = { ...kharchi, id: generateId() };
    setState(s => ({ ...s, kharchis: [...s.kharchis, newKharchi] }));
    try {
      await fetch('/api/kharchis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newKharchi)
      });
      await saveAllToStore('kharchis', [...state.kharchis, newKharchi]);
    } catch (e) {
      console.error(e);
    }
  };

  const updateKharchi = async (id: string, kharchi: Partial<Kharchi>) => {
    setState(s => ({ ...s, kharchis: s.kharchis.map(k => k.id === id ? { ...k, ...kharchi } : k) }));
    try {
      const existing = state.kharchis.find(k => k.id === id);
      if (existing) {
        const merged = { ...existing, ...kharchi };
        await fetch(`/api/kharchis/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(merged)
        });
        await saveAllToStore('kharchis', state.kharchis.map(k => k.id === id ? merged : k));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteKharchi = async (id: string) => {
    setState(s => ({ ...s, kharchis: s.kharchis.filter(k => k.id !== id) }));
    try {
      await fetch(`/api/kharchis/${id}`, { method: 'DELETE' });
      await saveAllToStore('kharchis', state.kharchis.filter(k => k.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const addAdvance = async (advance: Omit<Advance, 'id'>) => {
    const newAdvance = { ...advance, id: generateId() };
    setState(s => ({ ...s, advances: [...s.advances, newAdvance] }));
    try {
      await fetch('/api/advances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAdvance)
      });
      await saveAllToStore('advances', [...state.advances, newAdvance]);
    } catch (e) {
      console.error(e);
    }
  };

  const updateAdvance = async (id: string, advance: Partial<Advance>) => {
    setState(s => ({ ...s, advances: s.advances.map(a => a.id === id ? { ...a, ...advance } : a) }));
    try {
      const existing = state.advances.find(a => a.id === id);
      if (existing) {
        const merged = { ...existing, ...advance };
        await fetch(`/api/advances/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(merged)
        });
        await saveAllToStore('advances', state.advances.map(a => a.id === id ? merged : a));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteAdvance = async (id: string) => {
    setState(s => ({ ...s, advances: s.advances.filter(a => a.id !== id) }));
    try {
      await fetch(`/api/advances/${id}`, { method: 'DELETE' });
      await saveAllToStore('advances', state.advances.filter(a => a.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const addWorkerPayment = async (payment: Omit<WorkerPayment, 'id'>) => {
    const newPayment = { ...payment, id: generateId() };
    setState(s => ({ ...s, workerPayments: [...s.workerPayments, newPayment] }));
    try {
      await fetch('/api/worker-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPayment)
      });
      await saveAllToStore('workerPayments', [...state.workerPayments, newPayment]);
    } catch (e) {
      console.error(e);
    }
  };

  const updateWorkerPayment = async (id: string, payment: Partial<WorkerPayment>) => {
    setState(s => ({ ...s, workerPayments: s.workerPayments.map(wp => wp.id === id ? { ...wp, ...payment } : wp) }));
    try {
      const existing = state.workerPayments.find(wp => wp.id === id);
      if (existing) {
        const merged = { ...existing, ...payment };
        await fetch(`/api/worker-payments/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(merged)
        });
        await saveAllToStore('workerPayments', state.workerPayments.map(wp => wp.id === id ? merged : wp));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteWorkerPayment = async (id: string) => {
    setState(s => ({ ...s, workerPayments: s.workerPayments.filter(wp => wp.id !== id) }));
    try {
      await fetch(`/api/worker-payments/${id}`, { method: 'DELETE' });
      await saveAllToStore('workerPayments', state.workerPayments.filter(wp => wp.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const addApproval = async (approval: Omit<Approval, 'id' | 'status'>) => {
    const newApproval: Approval = { ...approval, id: generateId(), status: 'Pending' };
    setState(s => ({ ...s, approvals: [...s.approvals, newApproval] }));
    try {
      await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newApproval)
      });
      await saveAllToStore('approvals', [...state.approvals, newApproval]);
    } catch (e) {
      console.error(e);
    }
  };

  const updateApproval = async (id: string, approval: Partial<Approval>) => {
    setState(s => ({ ...s, approvals: s.approvals.map(app => app.id === id ? { ...app, ...approval } : app) }));
    triggerSuccess(`Approval Request was successfully ${approval.status || 'processed'}.`);
    try {
      const existing = state.approvals.find(app => app.id === id);
      if (existing) {
        const merged = { ...existing, ...approval };
        await fetch(`/api/approvals/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: merged.status, approvalNotes: merged.approvalNotes, approvedAmount: merged.approvedAmount })
        });
        await saveAllToStore('approvals', state.approvals.map(app => app.id === id ? merged : app));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteApproval = async (id: string) => {
    setState(s => ({ ...s, approvals: s.approvals.filter(app => app.id !== id) }));
    triggerSuccess('Approval record deleted.');
    try {
      await fetch(`/api/approvals/${id}`, { method: 'DELETE' });
      await saveAllToStore('approvals', state.approvals.filter(app => app.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const addKharchiApproval = async (approval: Omit<KharchiApproval, 'id' | 'status'>) => {
    const newApproval: KharchiApproval = { ...approval, id: generateId(), status: 'Pending' };
    setState(s => ({ ...s, kharchiApprovals: [...s.kharchiApprovals, newApproval] }));
    try {
      await fetch('/api/kharchi-approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newApproval)
      });
      await saveAllToStore('kharchiApprovals', [...state.kharchiApprovals, newApproval]);
    } catch (e) {
      console.error(e);
    }
  };

  const updateKharchiApproval = async (id: string, approval: Partial<KharchiApproval>) => {
    setState(s => ({ ...s, kharchiApprovals: s.kharchiApprovals.map(app => app.id === id ? { ...app, ...approval } : app) }));
    try {
      const existing = state.kharchiApprovals.find(app => app.id === id);
      if (existing) {
        const merged = { ...existing, ...approval };
        await fetch(`/api/kharchi-approvals/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: merged.status, approvalNotes: merged.approvalNotes })
        });
        await saveAllToStore('kharchiApprovals', state.kharchiApprovals.map(app => app.id === id ? merged : app));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteKharchiApproval = async (id: string) => {
    setState(s => ({ ...s, kharchiApprovals: s.kharchiApprovals.filter(app => app.id !== id) }));
    try {
      await fetch(`/api/kharchi-approvals/${id}`, { method: 'DELETE' });
      await saveAllToStore('kharchiApprovals', state.kharchiApprovals.filter(app => app.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const addPaymentSheetApproval = async (approval: Omit<PaymentSheetApproval, 'id' | 'status'>) => {
    const newApproval: PaymentSheetApproval = { ...approval, id: generateId(), status: 'Pending' };
    setState(s => ({ ...s, paymentSheetApprovals: [...s.paymentSheetApprovals, newApproval] }));
    try {
      await fetch('/api/payment-sheet-approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newApproval)
      });
      await saveAllToStore('paymentSheetApprovals', [...state.paymentSheetApprovals, newApproval]);
    } catch (e) {
      console.error(e);
    }
  };

  const updatePaymentSheetApproval = async (id: string, approval: Partial<PaymentSheetApproval>) => {
    setState(s => ({ ...s, paymentSheetApprovals: s.paymentSheetApprovals.map(app => app.id === id ? { ...app, ...approval } : app) }));
    try {
      const existing = state.paymentSheetApprovals.find(app => app.id === id);
      if (existing) {
        const merged = { ...existing, ...approval };
        await fetch(`/api/payment-sheet-approvals/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: merged.status, approvalNotes: merged.approvalNotes })
        });
        await saveAllToStore('paymentSheetApprovals', state.paymentSheetApprovals.map(app => app.id === id ? merged : app));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deletePaymentSheetApproval = async (id: string) => {
    setState(s => ({ ...s, paymentSheetApprovals: s.paymentSheetApprovals.filter(app => app.id !== id) }));
    try {
      await fetch(`/api/payment-sheet-approvals/${id}`, { method: 'DELETE' });
      await saveAllToStore('paymentSheetApprovals', state.paymentSheetApprovals.filter(app => app.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const addAdvanceSheetApproval = async (approval: Omit<AdvanceSheetApproval, 'id' | 'status'>) => {
    const newApproval: AdvanceSheetApproval = { ...approval, id: generateId(), status: 'Pending' };
    setState(s => ({ ...s, advanceSheetApprovals: [...s.advanceSheetApprovals, newApproval] }));
    try {
      await fetch('/api/advance-sheet-approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newApproval)
      });
      await saveAllToStore('advanceSheetApprovals', [...state.advanceSheetApprovals, newApproval]).catch(() => {});
    } catch (e) {
      console.error(e);
    }
  };

  const updateAdvanceSheetApproval = async (id: string, approval: Partial<AdvanceSheetApproval>) => {
    setState(s => ({ ...s, advanceSheetApprovals: s.advanceSheetApprovals.map(app => app.id === id ? { ...app, ...approval } : app) }));
    try {
      const existing = state.advanceSheetApprovals.find(app => app.id === id);
      if (existing) {
        const merged = { ...existing, ...approval };
        await fetch(`/api/advance-sheet-approvals/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: merged.status, approvalNotes: merged.approvalNotes })
        });
        await saveAllToStore('advanceSheetApprovals', state.advanceSheetApprovals.map(app => app.id === id ? merged : app)).catch(() => {});
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteAdvanceSheetApproval = async (id: string) => {
    setState(s => ({ ...s, advanceSheetApprovals: s.advanceSheetApprovals.filter(app => app.id !== id) }));
    try {
      await fetch(`/api/advance-sheet-approvals/${id}`, { method: 'DELETE' });
      await saveAllToStore('advanceSheetApprovals', state.advanceSheetApprovals.filter(app => app.id !== id)).catch(() => {});
    } catch (e) {
      console.error(e);
    }
  };

  const addExpenseEntry = async (expense: Omit<ExpenseEntry, 'id'>) => {
    const newExpense: ExpenseEntry = { ...expense, id: generateId() };
    setState(s => ({ ...s, expensesLedger: [...s.expensesLedger, newExpense] }));
    try {
      await fetch('/api/expenses_ledger', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Username': user?.username || 'Admin'
        },
        body: JSON.stringify(newExpense)
      });
      await saveAllToStore('expensesLedger', [...state.expensesLedger, newExpense]);
      refreshActivityLogs();
    } catch (e) {
      console.error(e);
    }
  };

  const updateExpenseEntry = async (id: string, expense: Partial<ExpenseEntry>) => {
    setState(s => ({
      ...s,
      expensesLedger: s.expensesLedger.map(el => el.id === id ? { ...el, ...expense } : el)
    }));
    try {
      const existing = state.expensesLedger.find(el => el.id === id);
      if (existing) {
        const merged = { ...existing, ...expense };
        await fetch(`/api/expenses_ledger/${id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'X-User-Username': user?.username || 'Admin'
          },
          body: JSON.stringify(merged)
        });
        await saveAllToStore('expensesLedger', state.expensesLedger.map(el => el.id === id ? merged : el));
        refreshActivityLogs();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteExpenseEntry = async (id: string) => {
    setState(s => ({ ...s, expensesLedger: s.expensesLedger.filter(el => el.id !== id) }));
    try {
      await fetch(`/api/expenses_ledger/${id}`, { 
        method: 'DELETE',
        headers: {
          'X-User-Username': user?.username || 'Admin'
        }
      });
      await saveAllToStore('expensesLedger', state.expensesLedger.filter(el => el.id !== id));
      refreshActivityLogs();
    } catch (e) {
      console.error(e);
    }
  };

  const addMessBooking = async (booking: Omit<MessBooking, 'id'>) => {
    const id = crypto.randomUUID();
    const newBooking = { ...booking, id };
    setState(s => {
      const updated = [...s.messBookings, newBooking];
      saveAllToStore('messBookings', updated).catch(console.error);
      return { ...s, messBookings: updated };
    });
    try {
      await fetch('/api/mess-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBooking)
      });
    } catch (e) {
      console.error(e);
    }
  };

  const updateMessBooking = async (id: string, booking: Partial<MessBooking>) => {
    setState(s => {
      const updated = s.messBookings.map(mb => mb.id === id ? { ...mb, ...booking } : mb);
      saveAllToStore('messBookings', updated).catch(console.error);
      return { ...s, messBookings: updated };
    });
    try {
      const existing = state.messBookings.find(mb => mb.id === id);
      if (existing) {
        const updatedObj = { ...existing, ...booking };
        await fetch(`/api/mess-bookings/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedObj)
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteMessBooking = async (id: string) => {
    setState(s => {
      const updated = s.messBookings.filter(mb => mb.id !== id);
      saveAllToStore('messBookings', updated).catch(console.error);
      return { ...s, messBookings: updated };
    });
    try {
      await fetch(`/api/mess-bookings/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error(e);
    }
  };

  const addDLR = async (dlr: Omit<DailyLabourReport, 'id'>) => {
    const id = crypto.randomUUID();
    const newDlr = { ...dlr, id };
    setState(s => {
      const updated = [...s.dlrs, newDlr];
      saveAllToStore('dlrs', updated).catch(console.error);
      return { ...s, dlrs: updated };
    });
    try {
      await fetch('/api/dlrs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDlr)
      });
    } catch (e) {
      console.error(e);
    }
  };

  const updateDLR = async (id: string, dlr: Partial<DailyLabourReport>) => {
    setState(s => {
      const updated = s.dlrs.map(d => d.id === id ? { ...d, ...dlr } : d);
      saveAllToStore('dlrs', updated).catch(console.error);
      return { ...s, dlrs: updated };
    });
    try {
      const existing = state.dlrs.find(d => d.id === id);
      if (existing) {
        const updatedObj = { ...existing, ...dlr };
        await fetch(`/api/dlrs/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedObj)
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteDLR = async (id: string) => {
    setState(s => {
      const updated = s.dlrs.filter(d => d.id !== id);
      saveAllToStore('dlrs', updated).catch(console.error);
      return { ...s, dlrs: updated };
    });
    try {
      await fetch(`/api/dlrs/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error(e);
    }
  };

  const addMaterialItem = async (item: Omit<MaterialItem, 'id'>) => {
    const id = crypto.randomUUID();
    const nowStr = new Date().toISOString().substring(0, 10);
    const createdBy = user?.name || user?.username || 'System';
    const newItem: MaterialItem = {
      ...item,
      id,
      createdBy,
      createdDate: nowStr,
      modifiedBy: createdBy,
      modifiedDate: nowStr
    };
    setState(s => {
      const updated = [...s.materialItems, newItem];
      saveAllToStore('materialItems', updated).catch(console.error);
      return { ...s, materialItems: updated };
    });
    try {
      await fetch('/api/material-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
    } catch (e) {
      console.error(e);
    }
  };

  const updateMaterialItem = async (id: string, item: Partial<MaterialItem>) => {
    const nowStr = new Date().toISOString().substring(0, 10);
    const modifiedBy = user?.name || user?.username || 'System';
    setState(s => {
      const updated = s.materialItems.map(d => d.id === id ? { ...d, ...item, modifiedBy, modifiedDate: nowStr } : d);
      saveAllToStore('materialItems', updated).catch(console.error);
      return { ...s, materialItems: updated };
    });
    try {
      const existing = state.materialItems.find(d => d.id === id);
      if (existing) {
        const updatedObj = { ...existing, ...item, modifiedBy, modifiedDate: nowStr };
        await fetch(`/api/material-items/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedObj)
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteMaterialItem = async (id: string) => {
    setState(s => {
      const updated = s.materialItems.filter(d => d.id !== id);
      saveAllToStore('materialItems', updated).catch(console.error);
      return { ...s, materialItems: updated };
    });
    try {
      await fetch(`/api/material-items/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error(e);
    }
  };

  const addMaterialIssue = async (issue: Omit<MaterialIssue, 'id'>) => {
    const id = crypto.randomUUID();
    const nowStr = new Date().toISOString().substring(0, 10);
    const createdBy = user?.name || user?.username || 'System';
    const newIssue: MaterialIssue = {
      ...issue,
      id,
      createdBy,
      createdDate: nowStr,
      modifiedBy: createdBy,
      modifiedDate: nowStr
    };
    setState(s => {
      const updated = [...s.materialIssues, newIssue];
      saveAllToStore('materialIssues', updated).catch(console.error);
      return { ...s, materialIssues: updated };
    });
    try {
      await fetch('/api/material-issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newIssue)
      });
    } catch (e) {
      console.error(e);
    }
  };

  const updateMaterialIssue = async (id: string, issue: Partial<MaterialIssue>) => {
    const nowStr = new Date().toISOString().substring(0, 10);
    const modifiedBy = user?.name || user?.username || 'System';
    setState(s => {
      const updated = s.materialIssues.map(d => d.id === id ? { ...d, ...issue, modifiedBy, modifiedDate: nowStr } : d);
      saveAllToStore('materialIssues', updated).catch(console.error);
      return { ...s, materialIssues: updated };
    });
    try {
      const existing = state.materialIssues.find(d => d.id === id);
      if (existing) {
        const updatedObj = { ...existing, ...issue, modifiedBy, modifiedDate: nowStr };
        await fetch(`/api/material-issues/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedObj)
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteMaterialIssue = async (id: string) => {
    setState(s => {
      const updated = s.materialIssues.filter(d => d.id !== id);
      saveAllToStore('materialIssues', updated).catch(console.error);
      return { ...s, materialIssues: updated };
    });
    try {
      await fetch(`/api/material-issues/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error(e);
    }
  };

  const addMaterialReturn = async (ret: Omit<MaterialReturn, 'id'>) => {
    const id = crypto.randomUUID();
    const nowStr = new Date().toISOString().substring(0, 10);
    const createdBy = user?.name || user?.username || 'System';
    const newReturn: MaterialReturn = {
      ...ret,
      id,
      createdBy,
      createdDate: nowStr,
      modifiedBy: createdBy,
      modifiedDate: nowStr
    };
    setState(s => {
      const updated = [...s.materialReturns, newReturn];
      saveAllToStore('materialReturns', updated).catch(console.error);
      return { ...s, materialReturns: updated };
    });
    try {
      await fetch('/api/material-returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReturn)
      });
    } catch (e) {
      console.error(e);
    }
  };

  const updateMaterialReturn = async (id: string, ret: Partial<MaterialReturn>) => {
    const nowStr = new Date().toISOString().substring(0, 10);
    const modifiedBy = user?.name || user?.username || 'System';
    setState(s => {
      const updated = s.materialReturns.map(d => d.id === id ? { ...d, ...ret, modifiedBy, modifiedDate: nowStr } : d);
      saveAllToStore('materialReturns', updated).catch(console.error);
      return { ...s, materialReturns: updated };
    });
    try {
      const existing = state.materialReturns.find(d => d.id === id);
      if (existing) {
        const updatedObj = { ...existing, ...ret, modifiedBy, modifiedDate: nowStr };
        await fetch(`/api/material-returns/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedObj)
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteMaterialReturn = async (id: string) => {
    setState(s => {
      const updated = s.materialReturns.filter(d => d.id !== id);
      saveAllToStore('materialReturns', updated).catch(console.error);
      return { ...s, materialReturns: updated };
    });
    try {
      await fetch(`/api/material-returns/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error(e);
    }
  };

  const addMaterialPurchase = async (purchase: Omit<MaterialPurchase, 'id'>) => {
    const id = crypto.randomUUID();
    const nowStr = new Date().toISOString().substring(0, 10);
    const createdBy = user?.name || user?.username || 'System';
    const newPurchase: MaterialPurchase = {
      ...purchase,
      id,
      createdBy,
      createdDate: nowStr,
      modifiedBy: createdBy,
      modifiedDate: nowStr
    };
    setState(s => {
      const updated = [...s.materialPurchases, newPurchase];
      saveAllToStore('materialPurchases', updated).catch(console.error);
      return { ...s, materialPurchases: updated };
    });
    try {
      await fetch('/api/material-purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPurchase)
      });
    } catch (e) {
      console.error(e);
    }
  };

  const updateMaterialPurchase = async (id: string, purchase: Partial<MaterialPurchase>) => {
    const nowStr = new Date().toISOString().substring(0, 10);
    const modifiedBy = user?.name || user?.username || 'System';
    setState(s => {
      const updated = s.materialPurchases.map(d => d.id === id ? { ...d, ...purchase, modifiedBy, modifiedDate: nowStr } : d);
      saveAllToStore('materialPurchases', updated).catch(console.error);
      return { ...s, materialPurchases: updated };
    });
    try {
      const existing = state.materialPurchases.find(d => d.id === id);
      if (existing) {
        const updatedObj = { ...existing, ...purchase, modifiedBy, modifiedDate: nowStr };
        await fetch(`/api/material-purchases/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedObj)
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteMaterialPurchase = async (id: string) => {
    setState(s => {
      const updated = s.materialPurchases.filter(d => d.id !== id);
      saveAllToStore('materialPurchases', updated).catch(console.error);
      return { ...s, materialPurchases: updated };
    });
    try {
      await fetch(`/api/material-purchases/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error(e);
    }
  };

  const addLabourPlanning = async (planning: Omit<LabourPlanning, 'id'>) => {
    const id = crypto.randomUUID();
    const newPlanning: LabourPlanning = {
      ...planning,
      id
    };
    setState(s => {
      const updated = [...s.labourPlannings, newPlanning];
      saveAllToStore('labourPlannings', updated).catch(console.error);
      return { ...s, labourPlannings: updated };
    });
    try {
      await fetch('/api/labour-plannings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPlanning)
      });
    } catch (e) {
      console.error(e);
    }
  };

  const updateLabourPlanning = async (id: string, planning: Partial<LabourPlanning>) => {
    setState(s => {
      const updated = s.labourPlannings.map(p => p.id === id ? { ...p, ...planning } : p);
      saveAllToStore('labourPlannings', updated).catch(console.error);
      return { ...s, labourPlannings: updated };
    });
    try {
      const existing = state.labourPlannings.find(p => p.id === id);
      if (existing) {
        const updatedObj = { ...existing, ...planning };
        await fetch(`/api/labour-plannings/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedObj)
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteLabourPlanning = async (id: string) => {
    setState(s => {
      const updated = s.labourPlannings.filter(p => p.id !== id);
      saveAllToStore('labourPlannings', updated).catch(console.error);
      return { ...s, labourPlannings: updated };
    });
    try {
      await fetch(`/api/labour-plannings/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error(e);
    }
  };

  const addWorkerTransfer = async (transfer: Omit<WorkerTransfer, 'id'>) => {
    const id = crypto.randomUUID();
    const newTransfer: WorkerTransfer = {
      ...transfer,
      id
    };
    setState(s => {
      const updatedTransfers = [...s.workerTransfers, newTransfer];
      const updatedWorkers = s.workers.map(w => w.id === transfer.workerId ? { ...w, projectId: transfer.toProjectId } : w);
      
      saveAllToStore('workerTransfers', updatedTransfers).catch(console.error);
      saveAllToStore('workers', updatedWorkers).catch(console.error);
      
      return {
        ...s,
        workerTransfers: updatedTransfers,
        workers: updatedWorkers
      };
    });
    try {
      await fetch('/api/worker-transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTransfer)
      });
      // Synchronize worker's projectId update to the backend database as well
      const existing = state.workers.find(w => w.id === transfer.workerId);
      if (existing) {
        const updatedObj = { ...existing, projectId: transfer.toProjectId };
        await fetch(`/api/workers/${transfer.workerId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedObj)
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const addAsset = async (asset: Omit<Asset, 'id'>) => {
    const id = crypto.randomUUID();
    const newAsset: Asset = { ...asset, id };
    setState(s => {
      const updated = [...s.assets, newAsset];
      saveAllToStore('assets', updated).catch(console.error);
      return { ...s, assets: updated };
    });
    try {
      await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAsset)
      });
    } catch (e) {
      console.error(e);
    }
  };

  const updateAsset = async (id: string, asset: Partial<Asset>) => {
    setState(s => {
      const updated = s.assets.map(a => a.id === id ? { ...a, ...asset } as Asset : a);
      saveAllToStore('assets', updated).catch(console.error);
      return { ...s, assets: updated };
    });
    try {
      const current = state.assets.find(a => a.id === id);
      if (current) {
        const merged = { ...current, ...asset };
        await fetch(`/api/assets/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(merged)
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteAsset = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const hasTransfers = state.assetTransfers.some(t => t.assetId === id);
    const hasMaintenance = state.assetMaintenances.some(m => m.assetId === id);
    if (hasTransfers || hasMaintenance) {
      return { success: false, error: 'Cannot delete asset: This asset has a recorded transaction history (transfers or maintenance logs).' };
    }

    setState(s => {
      const updated = s.assets.filter(a => a.id !== id);
      saveAllToStore('assets', updated).catch(console.error);
      return { ...s, assets: updated };
    });
    try {
      const res = await fetch(`/api/assets/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errObj = await res.json().catch(() => ({}));
        return { success: false, error: errObj.error || 'Server error deleting asset.' };
      }
      return { success: true };
    } catch (e: any) {
      console.error(e);
      return { success: false, error: e.message || 'Network error deleting asset.' };
    }
  };

  const addAssetTransfer = async (transfer: Omit<AssetTransfer, 'id'>) => {
    const id = crypto.randomUUID();
    const newTransfer: AssetTransfer = { ...transfer, id };
    setState(s => {
      const updatedTransfers = [...s.assetTransfers, newTransfer];
      const updatedAssets = s.assets.map(a => a.id === transfer.assetId ? { ...a, currentSiteId: transfer.toSiteId } as Asset : a);
      
      saveAllToStore('assetTransfers', updatedTransfers).catch(console.error);
      saveAllToStore('assets', updatedAssets).catch(console.error);
      
      return {
        ...s,
        assetTransfers: updatedTransfers,
        assets: updatedAssets
      };
    });
    try {
      await fetch('/api/asset-transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTransfer)
      });
    } catch (e) {
      console.error(e);
    }
  };

  const addAssetMaintenance = async (maintenance: Omit<AssetMaintenance, 'id'>) => {
    const id = crypto.randomUUID();
    const newMaintenance: AssetMaintenance = { ...maintenance, id };
    setState(s => {
      const updated = [...s.assetMaintenances, newMaintenance];
      saveAllToStore('assetMaintenances', updated).catch(console.error);
      return { ...s, assetMaintenances: updated };
    });
    try {
      await fetch('/api/asset-maintenances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMaintenance)
      });
    } catch (e) {
      console.error(e);
    }
  };

  const addWorkerLedgerEntry = async (entry: Omit<WorkerLedgerEntry, 'id'>) => {
    const id = crypto.randomUUID();
    const newEntry: WorkerLedgerEntry = { ...entry, id };
    setState(s => {
      const updated = [...s.workerLedger, newEntry].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      saveAllToStore('workerLedger', updated).catch(console.error);
      return { ...s, workerLedger: updated };
    });
    try {
      await fetch('/api/worker-ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntry)
      });
    } catch (e) {
      console.error(e);
    }
  };

  const updateWorkerLedgerEntry = async (id: string, entry: Partial<WorkerLedgerEntry>) => {
    setState(s => {
      const updated = s.workerLedger.map(item => item.id === id ? { ...item, ...entry } : item).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      saveAllToStore('workerLedger', updated).catch(console.error);
      return { ...s, workerLedger: updated };
    });
    try {
      const fullEntry = state.workerLedger.find(item => item.id === id);
      if (fullEntry) {
        await fetch(`/api/worker-ledger/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...fullEntry, ...entry })
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteWorkerLedgerEntry = async (id: string) => {
    setState(s => {
      const updated = s.workerLedger.filter(item => item.id !== id);
      saveAllToStore('workerLedger', updated).catch(console.error);
      return { ...s, workerLedger: updated };
    });
    try {
      await fetch(`/api/worker-ledger/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error(e);
    }
  };

  const addWorkerHold = async (hold: Omit<WorkerHold, 'id'>) => {
    const id = crypto.randomUUID();
    const newHold: WorkerHold = { ...hold, id };
    setState(s => {
      const updated = [...s.workerHolds, newHold];
      saveAllToStore('workerHolds', updated).catch(console.error);
      return { ...s, workerHolds: updated };
    });
    try {
      await fetch('/api/worker-holds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newHold)
      });
    } catch (e) {
      console.error(e);
    }
  };

  const updateWorkerHold = async (id: string, hold: Partial<WorkerHold>) => {
    setState(s => {
      const updated = s.workerHolds.map(item => item.id === id ? { ...item, ...hold } : item);
      saveAllToStore('workerHolds', updated).catch(console.error);
      return { ...s, workerHolds: updated };
    });
    try {
      const fullHold = state.workerHolds.find(item => item.id === id);
      if (fullHold) {
        await fetch(`/api/worker-holds/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...fullHold, ...hold })
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteWorkerHold = async (id: string) => {
    setState(s => {
      const updated = s.workerHolds.filter(item => item.id !== id);
      saveAllToStore('workerHolds', updated).catch(console.error);
      return { ...s, workerHolds: updated };
    });
    try {
      await fetch(`/api/worker-holds/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error(e);
    }
  };

  const addWorkerRecoveryAudit = async (audit: Omit<WorkerRecoveryAuditTrail, 'id'>) => {
    const id = crypto.randomUUID();
    const newAudit: WorkerRecoveryAuditTrail = { ...audit, id };
    setState(s => {
      const updated = [...s.workerRecoveryAuditTrail, newAudit];
      saveAllToStore('workerRecoveryAuditTrail', updated).catch(console.error);
      return { ...s, workerRecoveryAuditTrail: updated };
    });
    try {
      await fetch('/api/worker-recovery-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAudit)
      });
    } catch (e) {
      console.error(e);
    }
  };

  const addAttendance = async (att: Omit<Attendance, 'id'>) => {
    const id = generateId();
    const newAtt: Attendance = { ...att, id };
    setState(s => {
      const updated = [...s.attendance, newAtt];
      saveAllToStore('attendance', updated).catch(console.error);
      return { ...s, attendance: updated };
    });
    try {
      await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAtt)
      });
    } catch (e) {
      console.error(e);
    }
  };

  
  const addClientFloorBill = async (bill: Omit<ClientFloorBill, 'id'>) => {
    const newBill = { ...bill, id: generateId() };
    setState(s => ({ ...s, clientFloorBills: [...(s.clientFloorBills || []), newBill] }));
    try {
      await fetch('/api/client-floor-bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBill)
      });
      await saveAllToStore('clientFloorBills', [...(state.clientFloorBills || []), newBill]);
    } catch (e) {
      console.error(e);
      await saveAllToStore('clientFloorBills', [...(state.clientFloorBills || []), newBill]);
    }
  };

  const updateClientFloorBill = async (id: string, bill: Partial<ClientFloorBill>) => {
    setState(s => {
      const updated = (s.clientFloorBills || []).map(tb => tb.id === id ? { ...tb, ...bill } : tb);
      saveAllToStore('clientFloorBills', updated).catch(() => {});
      return { ...s, clientFloorBills: updated };
    });
    try {
      const existing = (state.clientFloorBills || []).find(tb => tb.id === id);
      if (existing) {
        const merged = { ...existing, ...bill };
        await fetch(`/api/client-floor-bills/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(merged)
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteClientFloorBill = async (id: string) => {
    setState(s => {
      const filtered = (s.clientFloorBills || []).filter(tb => tb.id !== id);
      saveAllToStore('clientFloorBills', filtered).catch(() => {});
      return { ...s, clientFloorBills: filtered };
    });
    try {
      await fetch(`/api/client-floor-bills/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error(e);
    }
  };

  const addTrackedBill = async (bill: Omit<TrackedBill, 'id'>) => {
    const newBill = { ...bill, id: generateId() };
    setState(s => ({ ...s, trackedBills: [...s.trackedBills,
              newBill] }));
    try {
      await fetch('/api/tracked-bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBill)
      });
      await saveAllToStore('trackedBills', [...state.trackedBills,
              newBill]);
    } catch (e) {
      console.error(e);
    }
  };

  const updateTrackedBill = async (id: string, bill: Partial<TrackedBill>) => {
    setState(s => {
      const updated = s.trackedBills.map(tb => tb.id === id ? { ...tb, ...bill } : tb);
      saveAllToStore('trackedBills', updated).catch(() => {});
      return { ...s, trackedBills: updated };
    });
    try {
      const existing = state.trackedBills.find(tb => tb.id === id);
      if (existing) {
        const merged = { ...existing, ...bill };
        await fetch(`/api/tracked-bills/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(merged)
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteTrackedBill = async (id: string) => {
    setState(s => {
      const filteredBills = s.trackedBills.filter(tb => tb.id !== id);
      const filteredTimelines = s.billTimelines.filter(tl => tl.billId !== id);
      saveAllToStore('trackedBills', filteredBills).catch(() => {});
      saveAllToStore('billTimelines', filteredTimelines).catch(() => {});
      return { ...s, trackedBills: filteredBills, billTimelines: filteredTimelines };
    });
    try {
      await fetch(`/api/tracked-bills/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error(e);
    }
  };

  const addBillTimeline = async (timeline: Omit<BillTimelineEntry, 'id'>) => {
    const newTimeline = { ...timeline, id: generateId() };
    setState(s => {
      const updated = [...s.billTimelines, newTimeline];
      saveAllToStore('billTimelines', updated).catch(() => {});
      return { ...s, billTimelines: updated };
    });
    try {
      await fetch('/api/bill-timelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTimeline)
      });
    } catch (e) {
      console.error(e);
    }
  };

  const addFinancialYear = async (fy: Omit<FinancialYear, 'id'>) => {
    const newFy = { ...fy, id: generateId() };
    setState(s => ({ ...s, financialYears: [...s.financialYears, newFy] }));
    try {
      await fetch('/api/financial-years', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFy)
      });
      await saveAllToStore('financialYears', [...state.financialYears, newFy]);
    } catch (e) {
      console.error(e);
    }
  };

  const updateFinancialYear = async (id: string, fy: Partial<FinancialYear>) => {
    setState(s => {
      const updated = s.financialYears.map(f => f.id === id ? { ...f, ...fy } : f);
      saveAllToStore('financialYears', updated).catch(() => {});
      return { ...s, financialYears: updated };
    });
    try {
      const existing = state.financialYears.find(f => f.id === id);
      if (existing) {
        const merged = { ...existing, ...fy };
        await fetch(`/api/financial-years/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(merged)
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteFinancialYear = async (id: string) => {
    setState(s => {
      const filtered = s.financialYears.filter(f => f.id !== id);
      saveAllToStore('financialYears', filtered).catch(() => {});
      return { ...s, financialYears: filtered };
    });
    try {
      await fetch(`/api/financial-years/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error(e);
    }
  };

  const addFloorAbstract = async (floorAbstract: Omit<FloorAbstract, 'id'>) => {
    const newFa = { ...floorAbstract, id: generateId() };
    setState(s => {
      const updated = [...s.floorAbstracts, newFa as FloorAbstract];
      saveAllToStore('floorAbstracts', updated).catch(() => {});
      return { ...s, floorAbstracts: updated };
    });
    triggerSuccess('Floor Abstract saved.');
    try {
      await fetch('/api/floor-abstracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFa)
      });
    } catch (e) { console.error(e); }
  };

  const updateFloorAbstract = async (id: string, floorAbstract: Partial<FloorAbstract>) => {
    setState(s => {
      const updated = s.floorAbstracts.map(f => f.id === id ? { ...f, ...floorAbstract } : f);
      saveAllToStore('floorAbstracts', updated).catch(() => {});
      return { ...s, floorAbstracts: updated };
    });
    triggerSuccess('Floor Abstract updated.');
    try {
      const existing = state.floorAbstracts.find(f => f.id === id);
      if (existing) {
        const merged = { ...existing, ...floorAbstract };
        await fetch(`/api/floor-abstracts/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(merged)
        });
      }
    } catch (e) { console.error(e); }
  };

  const deleteFloorAbstract = async (id: string) => {
    setState(s => {
      const updated = s.floorAbstracts.filter(f => f.id !== id);
      saveAllToStore('floorAbstracts', updated).catch(() => {});
      return { ...s, floorAbstracts: updated };
    });
    triggerSuccess('Floor Abstract deleted.');
    try {
      await fetch(`/api/floor-abstracts/${id}`, { method: 'DELETE' });
    } catch (e) { console.error(e); }
  };

  const addStaff = async (staffMember: Omit<Staff, 'createdDate'>) => {
    const newStaff: Staff = { ...staffMember, createdDate: new Date().toISOString() };
    setState(s => ({ ...s, staff: [...s.staff, newStaff] }));
    triggerSuccess('New Staff account successfully registered: ' + newStaff.name);
    try {
      await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStaff)
      });
    } catch (e) {
      console.error(e);
    }
  };

  const updateStaff = async (id: string, staffMember: Partial<Staff>) => {
    setState(s => ({
      ...s,
      staff: s.staff.map(st => st.id === id ? { ...st, ...staffMember } as Staff : st)
    }));
    triggerSuccess('Staff account successfully updated.');
    try {
      await fetch(`/api/staff/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffMember)
      });
    } catch (e) {
      console.error(e);
    }
  };

  const deleteStaff = async (id: string) => {
    setState(s => ({
      ...s,
      staff: s.staff.filter(st => st.id !== id)
    }));
    triggerSuccess('Staff account successfully deleted.');
    try {
      await fetch(`/api/staff/${id}`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.error(e);
    }
  };


  return (
    <AppContext.Provider value={{
      ...state,
      projects: user?.role === 'staff' && user?.allowedProjects
        ? state.projects.filter(p => user.allowedProjects?.includes(p.id))
        : state.projects,
      isDbLoaded,
      user,
      setUser,
      importBackup,
      refreshActivityLogs,
      refreshBillings,
      refreshClientPayments,
      fetchNumberingSettings,
      fetchNumberingAuditLogs,
      updateNumberingSetting,
      resetNumbering,
      previewNextNumber,
      consumeNextNumber,
      addProject,
      updateProject,
      deleteProject,
      addBOQ,
      updateBOQ,
      deleteBOQ,
      addBOQAuditLog,
      addWorker,
      updateWorker,
      deleteWorker,
      addBilling,
      updateBilling,
      deleteBilling,
      addClientPayment,
      updateClientPayment,
      deleteClientPayment,
      addKharchi,
      updateKharchi,
      deleteKharchi,
      addAdvance,
      updateAdvance,
      deleteAdvance,
      addWorkerPayment,
      updateWorkerPayment,
      deleteWorkerPayment,
      addApproval,
      updateApproval,
      deleteApproval,
      addKharchiApproval,
      updateKharchiApproval,
      deleteKharchiApproval,
      addPaymentSheetApproval,
      updatePaymentSheetApproval,
      deletePaymentSheetApproval,
      addAdvanceSheetApproval,
      updateAdvanceSheetApproval,
      deleteAdvanceSheetApproval,
      addExpenseEntry,
      updateExpenseEntry,
      deleteExpenseEntry,
      addStaff,
      updateStaff,
      deleteStaff,
      addMessBooking,
      updateMessBooking,
      deleteMessBooking,
      addDLR,
      updateDLR,
      deleteDLR,
      addMaterialItem,
      updateMaterialItem,
      deleteMaterialItem,
      addMaterialIssue,
      updateMaterialIssue,
      deleteMaterialIssue,
      addMaterialReturn,
      updateMaterialReturn,
      deleteMaterialReturn,
      addMaterialPurchase,
      updateMaterialPurchase,
      deleteMaterialPurchase,
      addLabourPlanning,
      updateLabourPlanning,
      deleteLabourPlanning,
      addWorkerTransfer,
      addAsset,
      updateAsset,
      deleteAsset,
      addAssetTransfer,
      addAssetMaintenance,
      addWorkerLedgerEntry,
      updateWorkerLedgerEntry,
      deleteWorkerLedgerEntry,
      addWorkerHold,
      updateWorkerHold,
      deleteWorkerHold,
      addWorkerRecoveryAudit,
      addAttendance,
      addTrackedBill,
      addClientFloorBill,
      updateClientFloorBill,
      deleteClientFloorBill,
      updateTrackedBill,
      deleteTrackedBill,
      addBillTimeline,
      addFinancialYear,
      updateFinancialYear,
      deleteFinancialYear,
      addFloorAbstract,
      updateFloorAbstract,
      deleteFloorAbstract
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
