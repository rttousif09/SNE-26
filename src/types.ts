export interface Project {
  id: string;
  name: string;
  startDate: string;
  completionDate?: string;
  address: string;
  budget: number;
}

export interface Worker {
  id: string;
  serialNo: string;
  workerId: string;
  name: string;
  projectId: string;
  designation: string;
  joiningDate: string;
}

export interface Billing {
  id: string;
  srNo: string;
  projectId: string;
  billNo: string;
  workNature: string;
  amount: number;
  month: string; // YYYY-MM
  certifyDate: string;
}

export interface ClientPayment {
  id: string;
  projectId: string;
  amountReceived: number;
  date: string;
  remarks: string;
}

export interface Kharchi {
  id: string;
  projectId: string;
  workerId: string;
  date: string; // YYYY-MM-DD
  amount: number;
}

export interface Advance {
  id: string;
  projectId: string;
  workerId: string;
  amount: number;
  paidBy: string;
  remarks: string;
  date: string;
}

export interface WorkerPayment {
  id: string;
  projectId: string;
  workerId: string;
  month: string; // YYYY-MM
  workAmount: number;
  messDeduction: number;
  kharchiDeduction: number;
  advanceDeduction: number;
  netPayment: number;
  date: string;
}
