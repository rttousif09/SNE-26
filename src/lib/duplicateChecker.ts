import { WorkerPayment, Advance, Attendance, Billing, ClientPayment, ExpenseEntry, MaterialPurchase, MaterialIssue, MaterialReturn, SupplierPayment, DuplicateOverrideLog, Project, Worker } from '../types';

// Load Override Logs from store (localstorage)
export const getOverrideLogs = (): DuplicateOverrideLog[] => {
  try {
    const data = localStorage.getItem('erp_duplicate_overrides');
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error loading override logs:', e);
    return [];
  }
};

// Save Override Log
export const addOverrideLog = (userName: string, module: string, warningDetails: string, reason: string): DuplicateOverrideLog => {
  const logs = getOverrideLogs();
  const newLog: DuplicateOverrideLog = {
    id: crypto.randomUUID(),
    userName: userName || 'Unknown',
    dateTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
    module,
    warningDetails,
    reason
  };
  logs.push(newLog);
  localStorage.setItem('erp_duplicate_overrides', JSON.stringify(logs));
  return newLog;
};

// 1. Worker Payment Duplicate Check
// Checks: Employee ID (workerId), Payment Period (month), Payment Date (date), Amount (netPayment)
export const checkWorkerPaymentDuplicate = (
  payments: WorkerPayment[],
  newPayment: { workerId: string; month: string; date: string; amount: number },
  excludeId?: string
): WorkerPayment[] => {
  return payments.filter(p => {
    if (excludeId && p.id === excludeId) return false;
    return (
      p.workerId === newPayment.workerId &&
      p.month === newPayment.month &&
      p.date === newPayment.date &&
      Math.abs(Number(p.netPayment || p.workAmount || 0) - newPayment.amount) < 0.01
    );
  });
};

// 2. Worker Advance Duplicate Check
// Checks: Employee ID (workerId), Advance Date (date), Advance Amount (amount)
export const checkWorkerAdvanceDuplicate = (
  advances: Advance[],
  newAdvance: { workerId: string; date: string; amount: number },
  excludeId?: string
): Advance[] => {
  return advances.filter(a => {
    if (excludeId && a.id === excludeId) return false;
    return (
      a.workerId === newAdvance.workerId &&
      a.date === newAdvance.date &&
      Math.abs(Number(a.amount || 0) - newAdvance.amount) < 0.01
    );
  });
};

// 3. Attendance Duplicate Check
// Checks: Same Worker, Same Date, Same Site (projectId)
export const checkAttendanceDuplicate = (
  attendanceList: Attendance[],
  newAtt: { workerId: string; date: string; projectId: string },
  excludeId?: string
): Attendance[] => {
  return attendanceList.filter(a => {
    if (excludeId && a.id === excludeId) return false;
    return (
      a.workerId === newAtt.workerId &&
      a.date === newAtt.date &&
      a.projectId === newAtt.projectId
    );
  });
};

// 4. Billing Duplicate Check
// Checks: Bill Number (billNo), Site (projectId), Billing Period (month)
export const checkBillingDuplicate = (
  billings: Billing[],
  newBill: { billNo: string; projectId: string; month: string },
  excludeId?: string
): Billing[] => {
  return billings.filter(b => {
    if (excludeId && b.id === excludeId) return false;
    return (
      b.billNo.trim().toLowerCase() === newBill.billNo.trim().toLowerCase() &&
      b.projectId === newBill.projectId &&
      b.month === newBill.month
    );
  });
};

// 5. Client Payment Duplicate Check
// Checks: Project ID, Amount, Date, Remarks/Receipt Details
export const checkClientPaymentDuplicate = (
  payments: ClientPayment[],
  newPay: { projectId: string; amountReceived: number; date: string; remarks: string },
  excludeId?: string
): ClientPayment[] => {
  return payments.filter(p => {
    if (excludeId && p.id === excludeId) return false;
    return (
      p.projectId === newPay.projectId &&
      Math.abs(Number(p.amountReceived || 0) - newPay.amountReceived) < 0.01 &&
      p.date === newPay.date &&
      p.remarks.trim().toLowerCase() === newPay.remarks.trim().toLowerCase()
    );
  });
};

// 6. Expense Duplicate Check
// Checks: Expense Date (date), Amount, Category/Description, Site (projectId)
export const checkExpenseDuplicate = (
  expenses: ExpenseEntry[],
  newExpense: { date: string; description: string; projectId: string; amount: number; category: string },
  excludeId?: string
): ExpenseEntry[] => {
  return expenses.filter(e => {
    if (excludeId && e.id === excludeId) return false;
    
    // Check if categories are similar
    const cat = newExpense.category as keyof ExpenseEntry;
    const sameCategoryAmount = e[cat] !== undefined && Math.abs(Number(e[cat] || 0) - newExpense.amount) < 0.01;
    const sameOverallCrBalance = Math.abs(Number(e.crBalance || 0) - newExpense.amount) < 0.01;
    
    return (
      e.date === newExpense.date &&
      e.projectId === newExpense.projectId &&
      (sameCategoryAmount || sameOverallCrBalance) &&
      (e.description.trim().toLowerCase() === newExpense.description.trim().toLowerCase() ||
       e.description.toLowerCase().includes(newExpense.description.toLowerCase()) || 
       newExpense.description.toLowerCase().includes(e.description.toLowerCase()))
    );
  });
};

// 7. Material Purchase Duplicate Check
// Checks: Invoice Number, Supplier Name, Purchase Date
export const checkMaterialPurchaseDuplicate = (
  purchases: MaterialPurchase[],
  newPurchase: { invoiceNumber: string; supplierName: string; purchaseDate: string },
  excludeId?: string
): MaterialPurchase[] => {
  return purchases.filter(p => {
    if (excludeId && p.id === excludeId) return false;
    if (!p.invoiceNumber || !newPurchase.invoiceNumber) return false;
    return (
      p.invoiceNumber.trim().toLowerCase() === newPurchase.invoiceNumber.trim().toLowerCase() &&
      p.supplierName.trim().toLowerCase() === newPurchase.supplierName.trim().toLowerCase() &&
      p.purchaseDate === newPurchase.purchaseDate
    );
  });
};

// 8. Material Issue & Return Duplicate Check
// Checks: Voucher Number, Date, Site, Item
export const checkMaterialIssueDuplicate = (
  issues: MaterialIssue[],
  newIssue: { voucherNo: string; issueDate: string; projectId: string; itemId: string },
  excludeId?: string
): MaterialIssue[] => {
  return issues.filter(i => {
    if (excludeId && i.id === excludeId) return false;
    if (!i.voucherNo || !newIssue.voucherNo) return false;
    return (
      i.voucherNo.trim().toLowerCase() === newIssue.voucherNo.trim().toLowerCase() &&
      i.issueDate === newIssue.issueDate &&
      i.projectId === newIssue.projectId &&
      i.itemId === newIssue.itemId
    );
  });
};

export const checkMaterialReturnDuplicate = (
  returns: MaterialReturn[],
  newReturn: { voucherNo: string; returnDate: string; projectId: string; itemId: string },
  excludeId?: string
): MaterialReturn[] => {
  return returns.filter(r => {
    if (excludeId && r.id === excludeId) return false;
    if (!r.voucherNo || !newReturn.voucherNo) return false;
    return (
      r.voucherNo.trim().toLowerCase() === newReturn.voucherNo.trim().toLowerCase() &&
      r.returnDate === newReturn.returnDate &&
      r.projectId === newReturn.projectId &&
      r.itemId === newReturn.itemId
    );
  });
};

// 9. Supplier Payment Duplicate Check
// Checks: Payment Reference Number (invoiceReference), Supplier Name (supplierName), Payment Amount (amountPaid), Date (paymentDate)
export const checkSupplierPaymentDuplicate = (
  payments: SupplierPayment[],
  newPay: { invoiceReference: string; supplierName: string; amountPaid: number; paymentDate: string },
  excludeId?: string
): SupplierPayment[] => {
  return payments.filter(p => {
    if (excludeId && p.id === excludeId) return false;
    return (
      p.supplierName.trim().toLowerCase() === newPay.supplierName.trim().toLowerCase() &&
      Math.abs(Number(p.amountPaid || 0) - newPay.amountPaid) < 0.01 &&
      p.paymentDate === newPay.paymentDate &&
      (p.invoiceReference || '').trim().toLowerCase() === (newPay.invoiceReference || '').trim().toLowerCase()
    );
  });
};
