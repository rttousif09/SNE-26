import React, { createContext, useContext, useState, useEffect } from 'react';
import { Project, Worker, Billing, ClientPayment, Kharchi, Advance, WorkerPayment, Approval, ExpenseEntry, PaymentSheetApproval, MessBooking, DailyLabourReport, KharchiApproval, MaterialItem, MaterialIssue, MaterialReturn, MaterialPurchase, LabourPlanning, WorkerTransfer } from './types';
import { getAllFromStore, saveAllToStore } from './lib/indexedDB';

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
  expensesLedger: ExpenseEntry[];
  messBookings: MessBooking[];
  dlrs: DailyLabourReport[];
  materialItems: MaterialItem[];
  materialIssues: MaterialIssue[];
  materialReturns: MaterialReturn[];
  materialPurchases: MaterialPurchase[];
  labourPlannings: LabourPlanning[];
  workerTransfers: WorkerTransfer[];
}

interface AppContextType extends AppState {
  isDbLoaded: boolean;
  user: { username: string; name: string } | null;
  setUser: (user: { username: string; name: string } | null) => void;
  importBackup: (backupState: AppState) => Promise<boolean>;
  addProject: (project: Omit<Project, 'id'>) => void;
  updateProject: (id: string, project: Partial<Project>) => void;
  deleteProject: (id: string) => void;
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
  addExpenseEntry: (expense: Omit<ExpenseEntry, 'id'>) => void;
  updateExpenseEntry: (id: string, expense: Partial<ExpenseEntry>) => void;
  deleteExpenseEntry: (id: string) => void;
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
}

const initialState: AppState = {
  projects: [
    { id: 'p1', name: 'S3 Eco City', startDate: '2026-01-01', completionDate: '2027-01-01', address: 'Plot 4, Sector 18', budget: 15000000 },
    { id: 'p2', name: 'EPR Mulund', startDate: '2026-01-01', completionDate: '2027-06-30', address: 'LBS Road, Mulund West', budget: 85000000 },
    { id: 'p3', name: 'City Center Mall', startDate: '2025-01-15', completionDate: '2026-01-15', address: 'Downtown', budget: 5000000 },
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
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<{ username: string; name: string } | null>(() => {
    try {
      const saved = localStorage.getItem('erp_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const setUser = (usr: { username: string; name: string } | null) => {
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
    expensesLedger: [],
    messBookings: [],
    dlrs: [],
    materialItems: [],
    materialIssues: [],
    materialReturns: [],
    materialPurchases: [],
    labourPlannings: [],
    workerTransfers: [],
  });
  const [isDbLoaded, setIsDbLoaded] = useState(false);

  useEffect(() => {
    const loadAllData = async () => {
      try {
        const [pRes, wRes, bRes, cpRes, kRes, aRes, wpRes, apRes, psaRes, elRes, mbRes, dlrRes, kaRes, miRes, misRes, mrRes, mpRes, lpRes, wtRes] = await Promise.all([
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
          fetch('/api/worker-transfers').then(r => r.json()).catch(() => [])
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
          expensesLedger: elRes,
          messBookings: mbRes,
          dlrs: dlrRes || [],
          materialItems: miRes || [],
          materialIssues: misRes || [],
          materialReturns: mrRes || [],
          materialPurchases: mpRes || [],
          labourPlannings: lpRes || [],
          workerTransfers: wtRes || []
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

          const isDbEmpty = projects.length === 0 && workers.length === 0 && billings.length === 0 &&
                            clientPayments.length === 0 && kharchis.length === 0 && advances.length === 0 &&
                            workerPayments.length === 0 && approvals.length === 0 && paymentSheetApprovals.length === 0 &&
                            kharchiApprovals.length === 0 &&
                            expensesLedger.length === 0 && messBookings.length === 0 && dlrs.length === 0 &&
                            materialItems.length === 0 && materialIssues.length === 0 && materialReturns.length === 0 && materialPurchases.length === 0 &&
                            labourPlannings.length === 0 && workerTransfers.length === 0;

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
              expensesLedger,
              messBookings,
              dlrs,
              materialItems,
              materialIssues,
              materialReturns,
              materialPurchases,
              labourPlannings,
              workerTransfers
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

  const importBackup = async (backupState: AppState): Promise<boolean> => {
    try {
      if (!backupState || !Array.isArray(backupState.projects) || !Array.isArray(backupState.workers)) {
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
      await saveAllToStore('paymentSheetApprovals', backupState.paymentSheetApprovals || []);

      setState(backupState);
      return true;
    } catch (e) {
      console.error('Backup import failed:', e);
      return false;
    }
  };

  const generateId = () => crypto.randomUUID();

  const addProject = async (project: Omit<Project, 'id'>) => {
    const newProject = { ...project, id: generateId() };
    setState(s => ({ ...s, projects: [...s.projects, newProject] }));
    try {
      await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject)
      });
      await saveAllToStore('projects', [...state.projects, newProject]);
    } catch (e) {
      console.error(e);
    }
  };

  const updateProject = async (id: string, project: Partial<Project>) => {
    setState(s => ({ ...s, projects: s.projects.map(p => p.id === id ? { ...p, ...project } : p) }));
    try {
      const existing = state.projects.find(p => p.id === id);
      if (existing) {
        const merged = { ...existing, ...project };
        await fetch(`/api/projects/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(merged)
        });
        await saveAllToStore('projects', state.projects.map(p => p.id === id ? merged : p));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteProject = async (id: string) => {
    setState(s => ({ ...s, projects: s.projects.filter(p => p.id !== id) }));
    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      await saveAllToStore('projects', state.projects.filter(p => p.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const addWorker = async (worker: Omit<Worker, 'id'>) => {
    const newWorker = { ...worker, id: generateId() };
    setState(s => ({ ...s, workers: [...s.workers, newWorker] }));
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
    try {
      await fetch(`/api/workers/${id}`, { method: 'DELETE' });
      await saveAllToStore('workers', state.workers.filter(w => w.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const addBilling = async (billing: Omit<Billing, 'id'>) => {
    const newBilling = { ...billing, id: generateId() };
    setState(s => ({ ...s, billings: [...s.billings, newBilling] }));
    try {
      await fetch('/api/billings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBilling)
      });
      await saveAllToStore('billings', [...state.billings, newBilling]);
    } catch (e) {
      console.error(e);
    }
  };

  const updateBilling = async (id: string, billing: Partial<Billing>) => {
    setState(s => ({ ...s, billings: s.billings.map(b => b.id === id ? { ...b, ...billing } : b) }));
    try {
      const existing = state.billings.find(b => b.id === id);
      if (existing) {
        const merged = { ...existing, ...billing };
        await fetch(`/api/billings/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(merged)
        });
        await saveAllToStore('billings', state.billings.map(b => b.id === id ? merged : b));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteBilling = async (id: string) => {
    setState(s => ({ ...s, billings: s.billings.filter(b => b.id !== id) }));
    try {
      await fetch(`/api/billings/${id}`, { method: 'DELETE' });
      await saveAllToStore('billings', state.billings.filter(b => b.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const addClientPayment = async (payment: Omit<ClientPayment, 'id'>) => {
    const newPayment = { ...payment, id: generateId() };
    setState(s => ({ ...s, clientPayments: [...s.clientPayments, newPayment] }));
    try {
      await fetch('/api/client-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPayment)
      });
      await saveAllToStore('clientPayments', [...state.clientPayments, newPayment]);
    } catch (e) {
      console.error(e);
    }
  };

  const updateClientPayment = async (id: string, payment: Partial<ClientPayment>) => {
    setState(s => ({ ...s, clientPayments: s.clientPayments.map(cp => cp.id === id ? { ...cp, ...payment } : cp) }));
    try {
      const existing = state.clientPayments.find(cp => cp.id === id);
      if (existing) {
        const merged = { ...existing, ...payment };
        await fetch(`/api/client-payments/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(merged)
        });
        await saveAllToStore('clientPayments', state.clientPayments.map(cp => cp.id === id ? merged : cp));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteClientPayment = async (id: string) => {
    setState(s => ({ ...s, clientPayments: s.clientPayments.filter(cp => cp.id !== id) }));
    try {
      await fetch(`/api/client-payments/${id}`, { method: 'DELETE' });
      await saveAllToStore('clientPayments', state.clientPayments.filter(cp => cp.id !== id));
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
    try {
      const existing = state.approvals.find(app => app.id === id);
      if (existing) {
        const merged = { ...existing, ...approval };
        await fetch(`/api/approvals/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: merged.status })
        });
        await saveAllToStore('approvals', state.approvals.map(app => app.id === id ? merged : app));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteApproval = async (id: string) => {
    setState(s => ({ ...s, approvals: s.approvals.filter(app => app.id !== id) }));
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
          body: JSON.stringify({ status: merged.status })
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
          body: JSON.stringify({ status: merged.status })
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

  const addExpenseEntry = async (expense: Omit<ExpenseEntry, 'id'>) => {
    const newExpense: ExpenseEntry = { ...expense, id: generateId() };
    setState(s => ({ ...s, expensesLedger: [...s.expensesLedger, newExpense] }));
    try {
      await fetch('/api/expenses_ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newExpense)
      });
      await saveAllToStore('expensesLedger', [...state.expensesLedger, newExpense]);
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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(merged)
        });
        await saveAllToStore('expensesLedger', state.expensesLedger.map(el => el.id === id ? merged : el));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteExpenseEntry = async (id: string) => {
    setState(s => ({ ...s, expensesLedger: s.expensesLedger.filter(el => el.id !== id) }));
    try {
      await fetch(`/api/expenses_ledger/${id}`, { method: 'DELETE' });
      await saveAllToStore('expensesLedger', state.expensesLedger.filter(el => el.id !== id));
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
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AppContext.Provider value={{
      ...state,
      isDbLoaded,
      user,
      setUser,
      importBackup,
      addProject,
      updateProject,
      deleteProject,
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
      addExpenseEntry,
      updateExpenseEntry,
      deleteExpenseEntry,
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
      addWorkerTransfer
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
