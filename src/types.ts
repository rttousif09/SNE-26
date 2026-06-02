export interface Project {
  id: string;
  name: string;
  clientName?: string;
  startDate: string;
  completionDate?: string;
  address: string;
  budget: number;
  projectType?: 'Residential' | 'Commercial' | 'Government';
  workOrderNo?: string;
  scopeOfWork?: string;
  rateType?: 'Supply' | 'Item Rate' | 'BUA Basis' | 'Lump-sum';
  workOrderAttachment?: string;
  workOrderFileName?: string;
  workOrderFileType?: string;
  projectManager?: string;
  pmContact?: string;
  billingEngineer?: string;
  beContact?: string;
  siteIncharge?: string;
  siContact?: string;
  ourRepresentatives?: string;
  repContact?: string;
}

export interface Worker {
  id: string;
  serialNo: string;
  workerId: string;
  name: string;
  projectId: string;
  designation: string;
  joiningDate: string;
  exitDate?: string;
  mobileNo?: string;
  openingAdvance?: number;
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
  tds?: number;
  retention?: number;
  gst?: number;
  hardCopyFile?: string;
  hardCopyFileName?: string;
  hardCopyFileType?: string;
}

export interface ClientPayment {
  id: string;
  projectId: string;
  amountReceived: number;
  date: string;
  remarks: string;
  status?: string;
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
  paidByDetails?: string;
  remarks: string;
  date: string;
  isDeducted?: boolean;
  deductionMonth?: string;
  deductionAmount?: number;
  receiptProof?: string; // base64 string
  receiptFileName?: string;
  receiptFileType?: string;
  deductionDetails?: string;
}

export interface SupplyDetail {
  id: string;
  description: string;
  hours: number;
  rate: number;
  total: number;
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
  level?: string;
  workCategory?: string;
  workDays?: number;
  ratePerDay?: number;
  overtimeHours?: number;
  allowance?: number;
  supplyAmount?: number;
  supplyDetails?: string; // JSON string of SupplyDetail[]
  recoveryAmount?: number;
  paymentStatus?: 'Pending' | 'Paid';
  otherDeduction?: number;
  otherDeductionDetails?: string;
}

export interface WorkerLedgerEntry {
  id: string;
  workerId: string;
  projectId: string;
  date: string;
  voucherNo?: string;
  description: string;
  entryType: 'Opening Balance' | 'Advance Given' | 'Advance Recovery' | 'Worker Payment' | 'Bonus' | 'Deduction' | 'Other';
  debit: number;
  credit: number;
  runningBalance: number;
  paymentId?: string;
  advanceId?: string;
  remarks?: string;
  createdBy?: string;
  createdDate?: string;
}

export interface WorkerHold {
  id: string;
  workerId: string;
  projectId: string;
  holdDate: string;
  holdAmount: number;
  reason?: string;
  releasedAmount: number;
  remainingHold: number;
  status: 'Held' | 'Partially Released' | 'Released';
  releaseDate?: string;
  remarks?: string;
  releaseHistory?: string; // JSON array of release events
}

export interface WorkerRecoveryAuditTrail {
  id: string;
  paymentId: string;
  workerId: string;
  prevValue: number;
  newValue: number;
  modifiedBy: string;
  modifiedDate: string;
}

export interface Approval {
  id: string;
  workerId: string;
  projectId: string;
  amount: number; // Represents approved amount
  requestAmount?: number;
  approvedAmount?: number;
  remarks: string;
  date: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approvalNotes?: string;
}

export interface AdvanceSheetApproval {
  id: string;
  projectId: string;
  month: string; // YYYY-MM
  totalAmount: number;
  requestAmount?: number;
  approvedAmount?: number;
  remarks: string;
  date: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approvalNotes?: string;
}

export interface KharchiApproval {
  id: string;
  projectId: string;
  month: string; // YYYY-MM
  totalAmount: number;
  requestAmount?: number;
  approvedAmount?: number;
  remarks: string;
  date: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approvalNotes?: string;
}

export interface PaymentSheetApproval {
  id: string;
  projectId: string;
  month: string; // YYYY-MM
  totalAmount: number;
  requestAmount?: number;
  approvedAmount?: number;
  remarks: string;
  date: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approvalNotes?: string;
}

export interface DailyLabourReport {
  id: string;
  date: string;
  projectId: string;
  carpenter: number;
  fitter: number;
  helper: number;
  mason: number;
  rigger: number;
  staff: number;
  remarks?: string;
}

export interface MaterialItem {
  id: string;
  itemCode?: string;
  itemName: string;
  category: string;
  unit: string;
  description?: string;
  createdBy?: string;
  createdDate?: string;
  modifiedBy?: string;
  modifiedDate?: string;
}

export interface MaterialIssue {
  id: string;
  voucherNo: string;
  issueDate: string;
  projectId: string;
  tower?: string;
  floor?: string;
  itemId: string;
  qty: number;
  issuedTo: string;
  remarks?: string;
  createdBy?: string;
  createdDate?: string;
  modifiedBy?: string;
  modifiedDate?: string;
}

export interface MaterialReturn {
  id: string;
  voucherNo: string;
  returnDate: string;
  projectId: string;
  tower?: string;
  floor?: string;
  itemId: string;
  qty: number;
  returnedBy: string;
  condition: 'Good' | 'Damaged' | 'Scrap';
  remarks?: string;
  createdBy?: string;
  createdDate?: string;
  modifiedBy?: string;
  modifiedDate?: string;
}

export interface MaterialPurchase {
  id: string;
  purchaseDate: string;
  purchaseVoucherNo: string;
  supplierName: string;
  supplierMobile: string;
  gstNo?: string;
  projectId: string;
  itemId: string;
  qty: number;
  rate: number;
  totalAmount: number;
  transportCharges: number;
  loadingCharges: number;
  otherCharges: number;
  grandTotal: number;
  invoiceNumber: string;
  invoiceDate: string;
  remarks?: string;
  createdBy?: string;
  createdDate?: string;
  modifiedBy?: string;
  modifiedDate?: string;
}

export interface ExpenseEntry {
  id: string;
  date: string;
  description: string;
  projectId?: string;
  kharchi: number;
  mess: number;
  workerAdvance: number;
  tiffin: number;
  travel: number;
  machineryMaterial: number;
  workerPayment: number;
  stationery: number;
  others: number;
  bank?: string;
  crBalance: number;
  requestAmount?: number;
  approvedAmount?: number;
  receiptProof?: string; // base64 string
  receiptFileName?: string;
  receiptFileType?: string;
  status?: 'Draft' | 'Submitted' | 'Approved' | 'Rejected';
  approvalNotes?: string;
}

export interface MessBooking {
  id: string;
  projectId: string;
  fromDate: string; // YYYY-MM-DD
  toDate: string; // YYYY-MM-DD
  workerCount: number;
  ratePerWeek: number;
  totalComputed: number;
  amountPaid: number;
  amountDue: number;
  paidTo: string;
  paymentDate: string; // YYYY-MM-DD
  remarks?: string;
  postedExpenseId?: string;
}

export interface LabourPlanning {
  id: string;
  projectId: string;
  tower?: string;
  floor?: string;
  activityName: string;
  requiredDate: string;
  requiredCompletionDate: string;
  remarks?: string;
  carpenterReq: number;
  helperReq: number;
  barBenderReq: number;
  steelFixerReq: number;
  masonReq: number;
  concreteWorkerReq: number;
  supervisorReq: number;
  foremanReq: number;
  otherReq: number;
}

export interface WorkerTransfer {
  id: string;
  workerId: string;
  fromProjectId: string;
  toProjectId: string;
  transferDate: string;
  remarks?: string;
}

export type AssetCategory =
  | 'Vibrator'
  | 'Drill Machine'
  | 'Cutter Machine'
  | 'Scaffolding'
  | 'Shuttering Material'
  | 'Props'
  | 'Jack System'
  | 'Power Tools'
  | 'Safety Equipment'
  | 'Other';

export type AssetStatus =
  | 'Available'
  | 'In Use'
  | 'Under Maintenance'
  | 'Damaged'
  | 'Lost'
  | 'Disposed';

export interface Asset {
  id: string;
  name: string;
  category: AssetCategory;
  assetCode: string;
  brand: string;
  purchaseDate: string;
  purchaseCost: number;
  currentSiteId: string; // references Project ID or 'general_pool' / 'unassigned'
  assignedTo?: string;
  status: AssetStatus;
  remarks?: string;
  createdBy?: string;
  createdDate?: string;
}

export interface AssetTransfer {
  id: string;
  assetId: string;
  fromSiteId: string;
  toSiteId: string;
  transferDate: string;
  transferredBy: string;
  remarks?: string;
}

export interface AssetMaintenance {
  id: string;
  assetId: string;
  maintenanceDate: string;
  maintenanceType: string;
  vendor: string;
  cost: number;
  remarks?: string;
  nextMaintenanceDate?: string;
}

export interface Attendance {
  id: string;
  workerId: string;
  projectId: string;
  date: string; // YYYY-MM-DD
  status: 'Present' | 'Absent' | 'HalfDay' | 'Leave';
}

export interface DuplicateOverrideLog {
  id: string;
  userName: string;
  dateTime: string;
  module: string;
  warningDetails: string;
  reason: string;
}

export interface SupplierPayment {
  id: string;
  supplierName: string;
  paymentDate: string;
  amountPaid: number;
  paymentMode: string;
  invoiceReference?: string;
  remarks?: string;
}

export type BillStatus = 'Draft' | 'Submitted' | 'Under Review' | 'Certified' | 'Payment Expected' | 'Partially Paid' | 'Fully Paid' | 'Closed';

export interface TrackedBill {
  id: string;
  billNo: string;
  billType: 'RA Bill' | 'Final Bill' | 'Extra Item Bill';
  clientName: string;
  projectId: string;
  billingPeriod: string;
  billDate: string;
  billAmount: number;
  remarks: string;
  currentStatus: BillStatus;
  statusUpdateDate: string;
  updatedBy: string;
  amountCertified: number;
  amountReceived: number;
  outstandingAmount: number;
  lastPaymentDate?: string;
  expectedPaymentDate?: string;
}

export interface BillTimelineEntry {
  id: string;
  billId: string;
  status: BillStatus;
  updateDate: string;
  updatedBy: string;
  remarks: string;
}

export type FinancialYearStatus = 'Active' | 'Closed' | 'Archived';

export interface FinancialYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: FinancialYearStatus;
  totalBilling: number;
  totalReceipts: number;
  labourCost: number;
  materialCost: number;
  expenses: number;
  profitLoss: number;
  closedBy?: string;
  closedDate?: string;
}




