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
  status: 'Ongoing' | 'Completed' | 'On Hold' | 'Cancelled' | 'Archived';
  towersCount?: number;
  towerNames?: string[];
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
  dailyRate?: number;
}

export interface MeasurementItem {
  id: string;
  description: string;
  qtyExecuted: number;
  unit: string;
  rate: number;
  amount: number; // qtyExecuted * rate
  prevQty: number;
  cumulativeQty: number; // prevQty + qtyExecuted
  prevAmount?: number;
  cumulativeAmount?: number;
}

export interface Billing {
  id: string;
  srNo: string;
  projectId: string;
  billNo: string;
  workNature: string;
  prevAmount?: number;
  amount: number;
  cumulativeAmount?: number;
  month: string; // YYYY-MM
  certifyDate: string;
  tds?: number;
  retention?: number;
  gst?: number;
  debitAmount?: number;
  debitReason?: string;
  holdAmount?: number;
  holdReason?: string;
  extraWorkAmount?: number;
  billType?: string; // 'Running Account', 'Final Bill', 'Extra Item Bill', 'Additional Work Bill', 'Manpower Supply Bill'
  measurementItems?: MeasurementItem[];
  hardCopyFile?: string;
  hardCopyFileName?: string;
  hardCopyFileType?: string;
  tdsCertificateReceived?: number;
  tdsCertificatePending?: number;
  gstStatus?: string;
  taxInvoiceFile?: string;
  taxInvoiceFileName?: string;
  taxInvoiceFileType?: string;
  gstr3bFile?: string;
  gstr3bFileName?: string;
  gstr3bFileType?: string;
  retentionStatus?: 'Pending' | 'Partially Cleared' | 'Fully Resolved';
  holdStatus?: 'Pending' | 'Partially Cleared' | 'Fully Resolved';
}

export interface ClientPayment {
  id: string;
  projectId: string;
  amountReceived: number;
  date: string;
  remarks: string;
  status?: string;
  billId?: string;
  paymentReference?: string;
  paymentMode?: string;
  bankName?: string;
  utrChequeNo?: string;
  attachment?: string;
  isRetentionPayment?: number;
  retentionReleaseDate?: string;
  category?: string;
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
  floorAbstractsJson?: string;
  towerName?: string;
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
  materialType?: 'Consumable' | 'Returnable';
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
  shift?: 'Day' | 'Night';
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

export interface Staff {
  id: string;
  username: string;
  password?: string;
  name: string;
  allowedModules: string[];
  allowedProjects: string[];
  createdDate: string;
}

export interface FloorAbstractWorker {
  id: string;
  workerId: string;
  rate: number;
  hajiraPerWorker?: number;
  payableAmount: number;
  sharePercentage?: number;
  workerHajira?: number;
  includeInAvg?: boolean;
}

export interface FloorAbstract {
  id: string;
  projectId: string;
  towerName?: string;
  category: 'Amount' | 'Hajira';
  level: string;
  srNo: string;
  flatNo: string;
  amount?: number;
  averageRate?: number;
  totalHajira?: number;
  flatHajira?: number;
  workers: FloorAbstractWorker[];
  remarks?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  username: string;
  actionType: 'CREATE' | 'UPDATE' | 'DELETE' | string;
  module: 'projects' | 'payments' | 'expenses' | string;
  recordId: string;
  details: string;
}

export interface NumberingSettings {
  moduleKey: string;
  moduleName: string;
  prefix: string;
  suffix?: string | null;
  fyFormat: '25-26' | '2025-26' | 'FY25-26' | 'FY2025-26' | 'None';
  startingNumber: number;
  numLength: number;
  separator: string;
  seriesType: 'global' | 'fy-wise' | 'site-wise';
  status: 'Active' | 'Inactive';
  currentNumber?: number;
}

export interface NumberingAuditLog {
  id: string;
  timestamp: string;
  moduleKey: string;
  moduleName: string;
  prevPrefix: string;
  newPrefix: string;
  prevRunningNo: number;
  newRunningNo: number;
  username: string;
  details: string;
}

export interface Subcontractor {
  id: string;
  name: string;
  firmName?: string;
  contactPerson?: string;
  contactNumber?: string;
  address?: string;
  aadhaarNumber?: string;
  panNumber?: string;
  gstin?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branch?: string;
  workCategory?: string;
  agreementDate?: string;
  startDate?: string;
  status: 'Active' | 'Inactive';
  workOrderUpload?: string;
  panCopy?: string;
  aadhaarCopy?: string;
  gstCertificate?: string;
  otherDocuments?: string;
  createdBy?: string;
  createdDate?: string;
  modifiedBy?: string;
  modifiedDate?: string;
}

export interface SubcontractorBill {
  id: string;
  projectId: string;
  projectName?: string;
  billNo: string;
  billDate: string;
  subcontractorId: string;
  subcontractorName?: string;
  subcontractorFirm?: string;
  workDescription?: string;
  grossAmount: number;
  retentionAmount: number;
  tdsAmount: number;
  gstAmount: number;
  recoveryAmount: number;
  netPayableAmount: number;
  attachmentUpload?: string;
  status: 'Draft' | 'Approved' | 'Posted & Locked';
  createdBy?: string;
  createdDate?: string;
  modifiedBy?: string;
  modifiedDate?: string;
}

export interface SubcontractorPayment {
  id: string;
  projectId: string;
  projectName?: string;
  subcontractorId: string;
  subcontractorName?: string;
  subcontractorFirm?: string;
  date: string;
  amount: number;
  paymentMode: 'Bank Transfer' | 'Cash' | 'Cheque' | 'Other';
  remarks?: string;
  createdBy?: string;
  createdDate?: string;
}

export interface SubcontractorAuditTrail {
  id: string;
  timestamp: string;
  username: string;
  actionType: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'REVERSAL' | 'SYNC_PAYMENTS';
  recordId: string;
  oldValue?: string;
  newValue?: string;
  details: string;
}

export interface SubcontractorLedgerLine {
  date: string;
  particulars: string;
  referenceNo: string;
  projectId: string;
  projectName: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface SubcontractorLedgerSummary {
  totalBills: number;
  totalGst: number;
  totalTds: number;
  totalRetention: number;
  totalRecovery: number;
  totalPayments: number;
  outstandingBalance: number;
}

export interface SubcontractorLedger {
  subcontractor: Subcontractor;
  ledger: SubcontractorLedgerLine[];
  summary: SubcontractorLedgerSummary;
}

export interface BOQItem {
  id: string;
  itemCode: string;
  description: string;
  unit: string;
  boqQuantity: number;
  boqRate: number;
  boqAmount: number; // calculated: boqQuantity * boqRate
  executedQuantity: number;
  billedQuantity: number;
  remarks?: string;
  category?: 'Shuttering' | 'Reinforcement' | 'Concreting' | 'Excavation' | 'Masonry' | 'Plastering' | 'Flooring' | 'Other';
}

export interface BOQRevision {
  id: string;
  revisionNo: number;
  revisionDate: string;
  items: BOQItem[];
  remarks?: string;
}

export interface BOQExtraItem {
  id: string;
  itemCode: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
  remarks?: string;
  approvalStatus: 'Draft' | 'Pending Approval' | 'Approved' | 'Closed';
}

export interface BOQ {
  id: string;
  boqNo: string;
  projectId: string;
  clientName: string;
  date: string;
  revisionNo: number;
  remarks?: string;
  boqPdfName?: string;
  boqPdfData?: string;
  boqExcelName?: string;
  boqExcelData?: string;
  items: BOQItem[];
  revisions: BOQRevision[];
  extraItems: BOQExtraItem[];
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Revised' | 'Closed';
  createdBy?: string;
  createdDate?: string;
  modifiedBy?: string;
  modifiedDate?: string;
}

export interface BOQAuditLog {
  id: string;
  timestamp: string;
  username: string;
  boqId?: string;
  boqNo: string;
  action: string;
  oldValue?: string;
  newValue?: string;
  details: string;
}

export interface DMSDocument {
  id: string;
  projectId?: string;
  category: 'Project Documents' | 'Worker Documents' | 'Subcontractor Documents' | 'Company Documents';
  docType: string;
  fileName: string;
  description?: string;
  tags?: string; // stringified array of strings
  uploadDate: string;
  expiryDate?: string;
  attachmentData?: string;
  attachmentName?: string;
  attachmentType?: string;
  fileSize: number;
  version: number;
  revisions?: string; // stringified array of DocumentRevision
  status: 'Draft' | 'Pending Review' | 'Approved' | 'Rejected' | 'Archived';
  approver?: string;
  approvalDate?: string;
  approvalRemarks?: string;
  linkedEntity?: string; // stringified array of DocumentLink
  createdBy?: string;
  createdDate?: string;
  modifiedBy?: string;
  modifiedDate?: string;
}

export interface DocumentRevision {
  version: number;
  fileName: string;
  uploadDate: string;
  uploadedBy: string;
  attachmentName?: string;
  attachmentType?: string;
  attachmentData?: string;
  description?: string;
}

export interface DocumentLink {
  entityType: 'project' | 'worker' | 'staff' | 'subcontractor' | 'bill' | 'payment' | 'boq';
  entityId: string;
  entityLabel: string;
}

export interface DMSAuditLog {
  id: string;
  timestamp: string;
  username: string;
  actionType: string;
  recordId: string;
  details: string;
}






