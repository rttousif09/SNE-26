import React, { createContext, useContext, useState, useEffect } from 'react';
import { Project, Worker, Billing, ClientPayment, Kharchi, Advance, WorkerPayment } from './types';

interface AppState {
  projects: Project[];
  workers: Worker[];
  billings: Billing[];
  clientPayments: ClientPayment[];
  kharchis: Kharchi[];
  advances: Advance[];
  workerPayments: WorkerPayment[];
}

interface AppContextType extends AppState {
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
}

const initialState: AppState = {
  projects: [
    { id: 'p1', name: 'City Center Mall', startDate: '2025-01-15', completionDate: '2026-01-15', address: 'Downtown', budget: 5000000 },
    { id: 'p2', name: 'Riverside Apartments', startDate: '2025-03-01', completionDate: '', address: 'West End', budget: 3500000 },
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
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('erp_state');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return initialState;
      }
    }
    return initialState;
  });

  useEffect(() => {
    localStorage.setItem('erp_state', JSON.stringify(state));
  }, [state]);

  const generateId = () => crypto.randomUUID();

  const addProject = (project: Omit<Project, 'id'>) => {
    setState(s => ({ ...s, projects: [...s.projects, { ...project, id: generateId() }] }));
  };

  const updateProject = (id: string, project: Partial<Project>) => {
    setState(s => ({ ...s, projects: s.projects.map(p => p.id === id ? { ...p, ...project } : p) }));
  };

  const deleteProject = (id: string) => {
    setState(s => ({ ...s, projects: s.projects.filter(p => p.id !== id) }));
  };

  const addWorker = (worker: Omit<Worker, 'id'>) => {
    setState(s => ({ ...s, workers: [...s.workers, { ...worker, id: generateId() }] }));
  };

  const updateWorker = (id: string, worker: Partial<Worker>) => {
    setState(s => ({ ...s, workers: s.workers.map(w => w.id === id ? { ...w, ...worker } : w) }));
  };

  const deleteWorker = (id: string) => {
    setState(s => ({ ...s, workers: s.workers.filter(w => w.id !== id) }));
  };

  const addBilling = (billing: Omit<Billing, 'id'>) => {
    setState(s => ({ ...s, billings: [...s.billings, { ...billing, id: generateId() }] }));
  };

  const updateBilling = (id: string, billing: Partial<Billing>) => {
    setState(s => ({ ...s, billings: s.billings.map(b => b.id === id ? { ...b, ...billing } : b) }));
  };

  const deleteBilling = (id: string) => {
    setState(s => ({ ...s, billings: s.billings.filter(b => b.id !== id) }));
  };

  const addClientPayment = (payment: Omit<ClientPayment, 'id'>) => {
    setState(s => ({ ...s, clientPayments: [...s.clientPayments, { ...payment, id: generateId() }] }));
  };

  const updateClientPayment = (id: string, payment: Partial<ClientPayment>) => {
    setState(s => ({ ...s, clientPayments: s.clientPayments.map(cp => cp.id === id ? { ...cp, ...payment } : cp) }));
  };

  const deleteClientPayment = (id: string) => {
    setState(s => ({ ...s, clientPayments: s.clientPayments.filter(cp => cp.id !== id) }));
  };

  const addKharchi = (kharchi: Omit<Kharchi, 'id'>) => {
    setState(s => ({ ...s, kharchis: [...s.kharchis, { ...kharchi, id: generateId() }] }));
  };

  const updateKharchi = (id: string, kharchi: Partial<Kharchi>) => {
    setState(s => ({ ...s, kharchis: s.kharchis.map(k => k.id === id ? { ...k, ...kharchi } : k) }));
  };

  const deleteKharchi = (id: string) => {
    setState(s => ({ ...s, kharchis: s.kharchis.filter(k => k.id !== id) }));
  };

  const addAdvance = (advance: Omit<Advance, 'id'>) => {
    setState(s => ({ ...s, advances: [...s.advances, { ...advance, id: generateId() }] }));
  };

  const updateAdvance = (id: string, advance: Partial<Advance>) => {
    setState(s => ({ ...s, advances: s.advances.map(a => a.id === id ? { ...a, ...advance } : a) }));
  };

  const deleteAdvance = (id: string) => {
    setState(s => ({ ...s, advances: s.advances.filter(a => a.id !== id) }));
  };

  const addWorkerPayment = (payment: Omit<WorkerPayment, 'id'>) => {
    setState(s => ({ ...s, workerPayments: [...s.workerPayments, { ...payment, id: generateId() }] }));
  };

  const updateWorkerPayment = (id: string, payment: Partial<WorkerPayment>) => {
    setState(s => ({ ...s, workerPayments: s.workerPayments.map(wp => wp.id === id ? { ...wp, ...payment } : wp) }));
  };

  const deleteWorkerPayment = (id: string) => {
    setState(s => ({ ...s, workerPayments: s.workerPayments.filter(wp => wp.id !== id) }));
  };

  return (
    <AppContext.Provider value={{
      ...state,
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
      deleteWorkerPayment
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
