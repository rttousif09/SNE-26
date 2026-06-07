import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

let aiClient: GoogleGenAI | null = null;
function getAiClient() {
  if (!aiClient) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' }
      }
    });
  }
  return aiClient;
}

const PORT = parseInt(process.env.PORT || "3000", 10);
const DB_FILE = process.env.DATABASE_FILE || "database.sqlite";

// Initialize SQLite database
const db = new Database(DB_FILE);
db.pragma("foreign_keys = ON");

// Initialize Schema
function initDbSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      clientName TEXT,
      startDate TEXT NOT NULL,
      completionDate TEXT,
      address TEXT NOT NULL,
      budget REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'Ongoing'
    );

    CREATE TABLE IF NOT EXISTS workers (
      id TEXT PRIMARY KEY,
      serialNo TEXT,
      workerId TEXT NOT NULL,
      name TEXT NOT NULL,
      projectId TEXT NOT NULL,
      designation TEXT NOT NULL,
      joiningDate TEXT NOT NULL,
      exitDate TEXT,
      dailyRate REAL,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS billings (
      id TEXT PRIMARY KEY,
      srNo TEXT,
      projectId TEXT NOT NULL,
      billNo TEXT NOT NULL,
      workNature TEXT NOT NULL,
      amount REAL NOT NULL,
      month TEXT NOT NULL,
      certifyDate TEXT NOT NULL,
      tds REAL DEFAULT 0,
      retention REAL DEFAULT 0,
      gst REAL DEFAULT 0,
      debitAmount REAL DEFAULT 0,
      debitReason TEXT,
      billType TEXT,
      measurementItems TEXT,
      hardCopyFile TEXT,
      hardCopyFileName TEXT,
      hardCopyFileType TEXT,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS client_payments (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      amountReceived REAL NOT NULL,
      date TEXT NOT NULL,
      remarks TEXT,
      status TEXT DEFAULT 'Received',
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS kharchis (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      workerId TEXT NOT NULL,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (workerId) REFERENCES workers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS advances (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      workerId TEXT NOT NULL,
      amount REAL NOT NULL,
      paidBy TEXT NOT NULL,
      remarks TEXT,
      date TEXT NOT NULL,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (workerId) REFERENCES workers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS worker_payments (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      workerId TEXT NOT NULL,
      month TEXT NOT NULL,
      workAmount REAL NOT NULL,
      messDeduction REAL NOT NULL,
      kharchiDeduction REAL NOT NULL,
      advanceDeduction REAL NOT NULL,
      netPayment REAL NOT NULL,
      date TEXT NOT NULL,
      level TEXT,
      workCategory TEXT DEFAULT 'Monthly work',
      workDays REAL,
      ratePerDay REAL,
      overtimeHours REAL,
      allowance REAL,
      supplyAmount REAL DEFAULT 0,
      supplyDetails TEXT,
      floorAbstractsJson TEXT,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (workerId) REFERENCES workers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id TEXT PRIMARY KEY,
      workerId TEXT NOT NULL,
      projectId TEXT NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL, -- 'Present', 'Absent', 'HalfDay', etc.
      FOREIGN KEY (workerId) REFERENCES workers(id) ON DELETE CASCADE,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY,
      workerId TEXT NOT NULL,
      projectId TEXT NOT NULL,
      amount REAL NOT NULL,
      remarks TEXT,
      date TEXT NOT NULL,
      status TEXT DEFAULT 'Pending',
      approvalNotes TEXT,
      FOREIGN KEY (workerId) REFERENCES workers(id) ON DELETE CASCADE,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS kharchi_approvals (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      month TEXT NOT NULL,
      totalAmount REAL NOT NULL,
      remarks TEXT,
      date TEXT NOT NULL,
      status TEXT NOT NULL,
      approvalNotes TEXT,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payment_sheet_approvals (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      month TEXT NOT NULL,
      totalAmount REAL NOT NULL,
      remarks TEXT,
      date TEXT NOT NULL,
      status TEXT DEFAULT 'Pending',
      approvalNotes TEXT,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS expenses_ledger (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      projectId TEXT,
      kharchi REAL DEFAULT 0,
      mess REAL DEFAULT 0,
      workerAdvance REAL DEFAULT 0,
      tiffin REAL DEFAULT 0,
      travel REAL DEFAULT 0,
      machineryMaterial REAL DEFAULT 0,
      workerPayment REAL DEFAULT 0,
      stationery REAL DEFAULT 0,
      others REAL DEFAULT 0,
      bank TEXT,
      crBalance REAL DEFAULT 0,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS mess_bookings (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      fromDate TEXT NOT NULL,
      toDate TEXT NOT NULL,
      workerCount INTEGER NOT NULL,
      ratePerWeek REAL NOT NULL,
      totalComputed REAL NOT NULL,
      amountPaid REAL NOT NULL,
      amountDue REAL NOT NULL,
      paidTo TEXT NOT NULL,
      paymentDate TEXT NOT NULL,
      remarks TEXT,
      postedExpenseId TEXT,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS dlrs (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      projectId TEXT NOT NULL,
      carpenter INTEGER DEFAULT 0,
      fitter INTEGER DEFAULT 0,
      helper INTEGER DEFAULT 0,
      mason INTEGER DEFAULT 0,
      rigger INTEGER DEFAULT 0,
      staff INTEGER DEFAULT 0,
      remarks TEXT,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS material_items (
      id TEXT PRIMARY KEY,
      itemCode TEXT,
      itemName TEXT NOT NULL,
      category TEXT NOT NULL,
      materialType TEXT DEFAULT 'Consumable',
      unit TEXT NOT NULL,
      description TEXT,
      createdBy TEXT,
      createdDate TEXT,
      modifiedBy TEXT,
      modifiedDate TEXT
    );

    CREATE TABLE IF NOT EXISTS material_issues (
      id TEXT PRIMARY KEY,
      voucherNo TEXT NOT NULL,
      issueDate TEXT NOT NULL,
      projectId TEXT NOT NULL,
      tower TEXT,
      floor TEXT,
      itemId TEXT NOT NULL,
      qty REAL NOT NULL,
      issuedTo TEXT NOT NULL,
      remarks TEXT,
      createdBy TEXT,
      createdDate TEXT,
      modifiedBy TEXT,
      modifiedDate TEXT,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (itemId) REFERENCES material_items(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS material_returns (
      id TEXT PRIMARY KEY,
      voucherNo TEXT NOT NULL,
      returnDate TEXT NOT NULL,
      projectId TEXT NOT NULL,
      tower TEXT,
      floor TEXT,
      itemId TEXT NOT NULL,
      qty REAL NOT NULL,
      returnedBy TEXT NOT NULL,
      condition TEXT NOT NULL,
      remarks TEXT,
      createdBy TEXT,
      createdDate TEXT,
      modifiedBy TEXT,
      modifiedDate TEXT,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (itemId) REFERENCES material_items(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS material_purchases (
      id TEXT PRIMARY KEY,
      purchaseDate TEXT NOT NULL,
      purchaseVoucherNo TEXT NOT NULL,
      supplierName TEXT NOT NULL,
      supplierMobile TEXT NOT NULL,
      gstNo TEXT,
      projectId TEXT NOT NULL,
      itemId TEXT NOT NULL,
      qty REAL NOT NULL,
      rate REAL NOT NULL,
      totalAmount REAL NOT NULL,
      transportCharges REAL DEFAULT 0,
      loadingCharges REAL DEFAULT 0,
      otherCharges REAL DEFAULT 0,
      grandTotal REAL NOT NULL,
      invoiceNumber TEXT NOT NULL,
      invoiceDate TEXT NOT NULL,
      remarks TEXT,
      createdBy TEXT,
      createdDate TEXT,
      modifiedBy TEXT,
      modifiedDate TEXT,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (itemId) REFERENCES material_items(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS labour_plannings (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      tower TEXT,
      floor TEXT,
      activityName TEXT NOT NULL,
      requiredDate TEXT NOT NULL,
      requiredCompletionDate TEXT NOT NULL,
      remarks TEXT,
      carpenterReq INTEGER DEFAULT 0,
      helperReq INTEGER DEFAULT 0,
      barBenderReq INTEGER DEFAULT 0,
      steelFixerReq INTEGER DEFAULT 0,
      masonReq INTEGER DEFAULT 0,
      concreteWorkerReq INTEGER DEFAULT 0,
      supervisorReq INTEGER DEFAULT 0,
      foremanReq INTEGER DEFAULT 0,
      otherReq INTEGER DEFAULT 0,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS worker_transfers (
      id TEXT PRIMARY KEY,
      workerId TEXT NOT NULL,
      fromProjectId TEXT NOT NULL,
      toProjectId TEXT NOT NULL,
      transferDate TEXT NOT NULL,
      remarks TEXT,
      FOREIGN KEY (workerId) REFERENCES workers(id) ON DELETE CASCADE,
      FOREIGN KEY (fromProjectId) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (toProjectId) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      assetCode TEXT NOT NULL,
      brand TEXT NOT NULL,
      purchaseDate TEXT NOT NULL,
      purchaseCost REAL NOT NULL,
      currentSiteId TEXT NOT NULL,
      assignedTo TEXT,
      status TEXT NOT NULL,
      remarks TEXT,
      createdBy TEXT,
      createdDate TEXT
    );

    CREATE TABLE IF NOT EXISTS asset_transfers (
      id TEXT PRIMARY KEY,
      assetId TEXT NOT NULL,
      fromSiteId TEXT NOT NULL,
      toSiteId TEXT NOT NULL,
      transferDate TEXT NOT NULL,
      transferredBy TEXT NOT NULL,
      remarks TEXT,
      FOREIGN KEY (assetId) REFERENCES assets(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS asset_maintenances (
      id TEXT PRIMARY KEY,
      assetId TEXT NOT NULL,
      maintenanceDate TEXT NOT NULL,
      maintenanceType TEXT NOT NULL,
      vendor TEXT NOT NULL,
      cost REAL NOT NULL,
      remarks TEXT,
      nextMaintenanceDate TEXT,
      FOREIGN KEY (assetId) REFERENCES assets(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS worker_ledger (
      id TEXT PRIMARY KEY,
      workerId TEXT NOT NULL,
      projectId TEXT NOT NULL,
      date TEXT NOT NULL,
      voucherNo TEXT,
      description TEXT NOT NULL,
      entryType TEXT NOT NULL,
      debit REAL DEFAULT 0,
      credit REAL DEFAULT 0,
      runningBalance REAL DEFAULT 0,
      paymentId TEXT,
      advanceId TEXT,
      createdBy TEXT,
      createdDate TEXT,
      FOREIGN KEY (workerId) REFERENCES workers(id) ON DELETE CASCADE,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS worker_holds (
      id TEXT PRIMARY KEY,
      workerId TEXT NOT NULL,
      projectId TEXT NOT NULL,
      holdDate TEXT NOT NULL,
      holdAmount REAL NOT NULL,
      reason TEXT,
      releasedAmount REAL DEFAULT 0,
      remainingHold REAL NOT NULL,
      status TEXT DEFAULT 'Held',
      releaseDate TEXT,
      remarks TEXT,
      releaseHistory TEXT,
      FOREIGN KEY (workerId) REFERENCES workers(id) ON DELETE CASCADE,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS worker_recovery_audit_trail (
      id TEXT PRIMARY KEY,
      paymentId TEXT NOT NULL,
      workerId TEXT NOT NULL,
      prevValue REAL NOT NULL,
      newValue REAL NOT NULL,
      modifiedBy TEXT NOT NULL,
      modifiedDate TEXT NOT NULL,
      FOREIGN KEY (workerId) REFERENCES workers(id) ON DELETE CASCADE,
      FOREIGN KEY (paymentId) REFERENCES worker_payments(id) ON DELETE CASCADE
    );
  `);

  // Migrate existing databases to make sure they have the new columns
  try {
    db.exec("ALTER TABLE approvals ADD COLUMN approvalNotes TEXT");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE kharchi_approvals ADD COLUMN approvalNotes TEXT");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE payment_sheet_approvals ADD COLUMN approvalNotes TEXT");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE worker_payments ADD COLUMN recoveryAmount REAL DEFAULT 0");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE worker_payments ADD COLUMN paymentStatus TEXT DEFAULT 'Pending'");
  } catch (e) {}

  try {
    db.exec("ALTER TABLE billings ADD COLUMN tds REAL DEFAULT 0");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE billings ADD COLUMN retention REAL DEFAULT 0");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE projects ADD COLUMN clientName TEXT");
  } catch (e) {}
  try { db.exec("ALTER TABLE projects ADD COLUMN status TEXT DEFAULT 'Ongoing'"); } catch (e) {}
  try { db.exec("ALTER TABLE projects ADD COLUMN projectManager TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE projects ADD COLUMN pmContact TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE projects ADD COLUMN billingEngineer TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE projects ADD COLUMN beContact TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE projects ADD COLUMN siteIncharge TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE projects ADD COLUMN siContact TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE projects ADD COLUMN ourRepresentatives TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE projects ADD COLUMN repContact TEXT"); } catch (e) {}

  try {
    db.exec("ALTER TABLE billings ADD COLUMN gst REAL DEFAULT 0");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE billings ADD COLUMN debitAmount REAL DEFAULT 0");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE billings ADD COLUMN debitReason TEXT");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE billings ADD COLUMN hardCopyFile TEXT");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE billings ADD COLUMN hardCopyFileName TEXT");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE billings ADD COLUMN hardCopyFileType TEXT");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE billings ADD COLUMN billType TEXT");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE billings ADD COLUMN measurementItems TEXT");
  } catch (e) {}

  try {
    db.exec("ALTER TABLE worker_payments ADD COLUMN level TEXT");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE worker_payments ADD COLUMN supplyAmount REAL DEFAULT 0");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE worker_payments ADD COLUMN supplyDetails TEXT");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE worker_payments ADD COLUMN workCategory TEXT DEFAULT 'Monthly work'");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE worker_payments ADD COLUMN workDays REAL");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE worker_payments ADD COLUMN ratePerDay REAL");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE worker_payments ADD COLUMN overtimeHours REAL");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE worker_payments ADD COLUMN allowance REAL");
  } catch (e) {}

  // New features columns migrations (Advances, WorkerPayments, Approvals, Expenses, Advance Sheet Approvals)
  try { db.exec("ALTER TABLE advances ADD COLUMN paidByDetails TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE advances ADD COLUMN isDeducted INTEGER DEFAULT 0"); } catch (e) {}
  try { db.exec("ALTER TABLE advances ADD COLUMN deductionMonth TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE advances ADD COLUMN deductionAmount REAL DEFAULT 0"); } catch (e) {}
  try { db.exec("ALTER TABLE advances ADD COLUMN receiptProof TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE advances ADD COLUMN receiptFileName TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE advances ADD COLUMN receiptFileType TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE advances ADD COLUMN deductionDetails TEXT"); } catch (e) {}

  try { db.exec("ALTER TABLE worker_payments ADD COLUMN otherDeduction REAL DEFAULT 0"); } catch (e) {}
  try { db.exec("ALTER TABLE worker_payments ADD COLUMN otherDeductionDetails TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE worker_payments ADD COLUMN floorAbstractsJson TEXT"); } catch (e) {}

  try { db.exec("ALTER TABLE approvals ADD COLUMN requestAmount REAL DEFAULT 0"); } catch (e) {}
  try { db.exec("ALTER TABLE approvals ADD COLUMN approvedAmount REAL DEFAULT 0"); } catch (e) {}

  try { db.exec("ALTER TABLE expenses_ledger ADD COLUMN receiptProof TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE expenses_ledger ADD COLUMN receiptFileName TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE expenses_ledger ADD COLUMN receiptFileType TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE expenses_ledger ADD COLUMN status TEXT DEFAULT 'Draft'"); } catch (e) {}
  try { db.exec("ALTER TABLE expenses_ledger ADD COLUMN approvalNotes TEXT"); } catch (e) {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS advance_sheet_approvals (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      month TEXT NOT NULL,
      totalAmount REAL NOT NULL,
      remarks TEXT,
      date TEXT NOT NULL,
      status TEXT DEFAULT 'Pending',
      approvalNotes TEXT,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tracked_bills (
      id TEXT PRIMARY KEY,
      billNo TEXT NOT NULL,
      billType TEXT NOT NULL,
      clientName TEXT NOT NULL,
      projectId TEXT NOT NULL,
      billingPeriod TEXT NOT NULL,
      billDate TEXT NOT NULL,
      billAmount REAL NOT NULL,
      remarks TEXT,
      currentStatus TEXT NOT NULL,
      statusUpdateDate TEXT NOT NULL,
      updatedBy TEXT NOT NULL,
      amountCertified REAL DEFAULT 0,
      amountReceived REAL DEFAULT 0,
      outstandingAmount REAL DEFAULT 0,
      lastPaymentDate TEXT,
      expectedPaymentDate TEXT,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bill_timeline (
      id TEXT PRIMARY KEY,
      billId TEXT NOT NULL,
      status TEXT NOT NULL,
      updateDate TEXT NOT NULL,
      updatedBy TEXT NOT NULL,
      remarks TEXT,
      FOREIGN KEY (billId) REFERENCES tracked_bills(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS financial_years (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      startDate TEXT NOT NULL,
      endDate TEXT NOT NULL,
      status TEXT NOT NULL,
      totalBilling REAL DEFAULT 0,
      totalReceipts REAL DEFAULT 0,
      labourCost REAL DEFAULT 0,
      materialCost REAL DEFAULT 0,
      expenses REAL DEFAULT 0,
      profitLoss REAL DEFAULT 0,
      closedBy TEXT,
      closedDate TEXT
    );

    CREATE TABLE IF NOT EXISTS daily_site_summaries (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      date TEXT NOT NULL,
      workforceSummary TEXT,
      financialSummary TEXT,
      materialSummary TEXT,
      billingSummary TEXT,
      projectActivitySummary TEXT,
      aiInsights TEXT,
      riskAlerts TEXT,
      healthScore INTEGER,
      healthStatus TEXT,
      generatedAt TEXT NOT NULL,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS staff (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      allowedModules TEXT, -- JSON array of module string keys
      allowedProjects TEXT, -- JSON array of project ID strings
      createdDate TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS floor_abstracts (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      category TEXT NOT NULL,
      level TEXT NOT NULL,
      srNo TEXT,
      flatNo TEXT,
      amount REAL,
      averageRate REAL,
      totalHajira REAL,
      flatHajira REAL,
      workers TEXT, -- JSON array of worker entries
      remarks TEXT,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    );
  `);


  // Insert initial seed data if table is completely empty
  const countRow = db.prepare("SELECT COUNT(*) as count FROM projects").get() as { count: number };
  if (countRow.count === 0) {
    console.log("Seeding initial database content because DB is empty...");
    const baseProjects = [
      {
        id: "p1",
        name: "S3 Eco City",
        startDate: "2026-01-01",
        completionDate: "2027-01-01",
        address: "Plot 4, Sector 18",
        budget: 15000000
      },
      {
        id: "p2",
        name: "EPR Mulund",
        startDate: "2026-01-01",
        completionDate: "2027-06-30",
        address: "LBS Road, Mulund West",
        budget: 85000000
      }
    ];
    const insertProj = db.prepare(`
      INSERT INTO projects (id, name, clientName, startDate, completionDate, address, budget)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    baseProjects.forEach(p => insertProj.run(p.id, p.name, null, p.startDate, p.completionDate, p.address, p.budget));

    const baseWorkers = [
      { id: "w1", serialNo: "1", workerId: "W-001", name: "Ramesh Kumar", projectId: "p1", designation: "Supervisor", joiningDate: "2026-01-12", exitDate: "" },
      { id: "w2", serialNo: "2", workerId: "W-002", name: "Suresh Singh", projectId: "p1", designation: "Mason", joiningDate: "2026-01-12", exitDate: "" }
    ];
    const insertWorker = db.prepare(`
      INSERT INTO workers (id, serialNo, workerId, name, projectId, designation, joiningDate, exitDate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    baseWorkers.forEach(w => insertWorker.run(w.id, w.serialNo, w.workerId, w.name, w.projectId, w.designation, w.joiningDate, w.exitDate));

    db.prepare(`
      INSERT INTO billings (id, srNo, projectId, billNo, workNature, amount, month, certifyDate, tds, retention, gst)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run("b1", "1", "p1", "BILL-001", "Foundation Work", 250000, "2026-02", "2026-02-28", 5000, 12500, 45000);

    db.prepare(`
      INSERT INTO client_payments (id, projectId, amountReceived, date, remarks, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run("cp1", "p1", 200000, "2026-03-05", "First installment received", "Received");

    db.prepare(`
      INSERT INTO kharchis (id, projectId, workerId, date, amount)
      VALUES (?, ?, ?, ?, ?)
    `).run("k1", "p1", "w2", "2026-02-02", 500);
    db.prepare(`
      INSERT INTO kharchis (id, projectId, workerId, date, amount)
      VALUES (?, ?, ?, ?, ?)
    `).run("k2", "p1", "w2", "2026-02-09", 500);

    db.prepare(`
      INSERT INTO advances (id, projectId, workerId, amount, paidBy, remarks, date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run("a1", "p1", "w1", 5000, "Admin Team", "Medical emergency emergency", "2026-02-15");
  }

  // Seed initial expenses_ledger data if empty
  const countExpenses = db.prepare("SELECT COUNT(*) as count FROM expenses_ledger").get() as { count: number };
  if (countExpenses.count === 0) {
    console.log("Seeding initial expenses_ledger records...");
    const seedLedger = [
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
    ];
    
    const insertEl = db.prepare(`
      INSERT INTO expenses_ledger (id, date, description, projectId, kharchi, mess, workerAdvance, tiffin, travel, machineryMaterial, workerPayment, stationery, others, bank, crBalance)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const item of seedLedger) {
      insertEl.run(
        item.id,
        item.date,
        item.description,
        item.projectId || null,
        item.kharchi,
        item.mess,
        item.workerAdvance,
        item.tiffin,
        item.travel,
        item.machineryMaterial,
        item.workerPayment,
        item.stationery,
        item.others,
        item.bank || null,
        item.crBalance
      );
    }
  }
  
  try { db.exec("ALTER TABLE material_items ADD COLUMN materialType TEXT DEFAULT 'Consumable'"); } catch (e) {}

  try { db.exec("ALTER TABLE client_payments ADD COLUMN billId TEXT"); } catch(e) {}
  try { db.exec("ALTER TABLE client_payments ADD COLUMN paymentReference TEXT"); } catch(e) {}
  try { db.exec("ALTER TABLE client_payments ADD COLUMN paymentMode TEXT"); } catch(e) {}
  try { db.exec("ALTER TABLE client_payments ADD COLUMN bankName TEXT"); } catch(e) {}
  try { db.exec("ALTER TABLE client_payments ADD COLUMN utrChequeNo TEXT"); } catch(e) {}
  try { db.exec("ALTER TABLE client_payments ADD COLUMN attachment TEXT"); } catch(e) {}
  try { db.exec("ALTER TABLE client_payments ADD COLUMN isRetentionPayment INTEGER DEFAULT 0"); } catch(e) {}
  try { db.exec("ALTER TABLE client_payments ADD COLUMN retentionReleaseDate TEXT"); } catch(e) {}
  try { db.exec("ALTER TABLE client_payments ADD COLUMN category TEXT"); } catch(e) {}

  try { db.exec("ALTER TABLE billings ADD COLUMN tdsCertificateReceived INTEGER DEFAULT 0"); } catch(e) {}
  try { db.exec("ALTER TABLE billings ADD COLUMN tdsCertificatePending INTEGER DEFAULT 1"); } catch(e) {}
  try { db.exec("ALTER TABLE billings ADD COLUMN gstStatus TEXT"); } catch(e) {}
}

initDbSchema();

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  
  // Custom API Route for Industry News
  app.get("/api/external-data/news", async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "YOUR_API_KEY") {
        return res.json({ text: "Please configure a valid GEMINI_API_KEY to see live industry news.", groundingChunks: [] });
      }
      
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: "What are today's latest industry news or regulatory updates relevant to the construction business and real estate? Keep the summary concise but informative.",
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
      
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      res.json({ text: response.text, groundingChunks: chunks || [] });
    } catch (err: any) {
      // Instead of failing loudly, we provide a graceful fallback so the UI handles it nicely.
      res.json({ 
        text: "Could not load news at this time. Please check your API key and try again.", 
        groundingChunks: [] 
      });
    }
  });

  // API Routes

  // Auth Endpoints
  app.post("/api/login", (req, res) => {
    try {
      const { username, password } = req.body;
      const normalizedUser = username ? username.trim() : "";
      
      // Check hardcoded super admins / owners
      if (normalizedUser === 'rejatousifsne' && password === 'Tousif09@') {
        return res.json({
          username: normalizedUser,
          name: 'Reja Tousif',
          role: 'admin',
          allowedModules: [], // empty means all / unrestricted
          allowedProjects: [] // empty means all / unrestricted
        });
      } else if (normalizedUser === 'saddamsne' && password === 'Saddam09@') {
        return res.json({
          username: normalizedUser,
          name: 'Saddam Hussain',
          role: 'admin',
          allowedModules: [],
          allowedProjects: []
        });
      }
      
      // Check database staff
      const userRow = db.prepare("SELECT * FROM staff WHERE username = ?").get(normalizedUser) as any;
      if (userRow && userRow.password === password) {
        return res.json({
          username: userRow.username,
          name: userRow.name,
          role: 'staff',
          allowedModules: JSON.parse(userRow.allowedModules || '[]'),
          allowedProjects: JSON.parse(userRow.allowedProjects || '[]')
        });
      }
      
      res.status(401).json({ error: "Logon failed: Incorrect User ID or Password." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Staff CRUD Endpoints
  app.get("/api/staff", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM staff").all() as any[];
      const processed = rows.map(r => ({
        ...r,
        allowedModules: JSON.parse(r.allowedModules || '[]'),
        allowedProjects: JSON.parse(r.allowedProjects || '[]')
      }));
      res.json(processed);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/staff", (req, res) => {
    try {
      const { id, username, password, name, allowedModules, allowedProjects } = req.body;
      const createdDate = new Date().toISOString();
      db.prepare(`
        INSERT INTO staff (id, username, password, name, allowedModules, allowedProjects, createdDate)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, 
        username.trim(), 
        password, 
        name, 
        JSON.stringify(allowedModules || []), 
        JSON.stringify(allowedProjects || []), 
        createdDate
      );
      res.status(201).json({ id, username, password, name, allowedModules, allowedProjects, createdDate });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/staff/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { username, password, name, allowedModules, allowedProjects } = req.body;
      db.prepare(`
        UPDATE staff
        SET username = ?, password = ?, name = ?, allowedModules = ?, allowedProjects = ?
        WHERE id = ?
      `).run(
        username.trim(), 
        password, 
        name, 
        JSON.stringify(allowedModules || []), 
        JSON.stringify(allowedProjects || []), 
        id
      );
      res.json({ id, username, password, name, allowedModules, allowedProjects });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/staff/:id", (req, res) => {
    try {
      const { id } = req.params;
      db.prepare("DELETE FROM staff WHERE id = ?").run(id);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/floor-abstracts", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM floor_abstracts").all() as any[];
      const processed = rows.map(r => ({
        ...r,
        workers: JSON.parse(r.workers || '[]')
      }));
      res.json(processed);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/floor-abstracts", (req, res) => {
    try {
      const { id, projectId, category, level, srNo, flatNo, amount, averageRate, totalHajira, flatHajira, workers, remarks } = req.body;
      db.prepare(`
        INSERT INTO floor_abstracts (id, projectId, category, level, srNo, flatNo, amount, averageRate, totalHajira, flatHajira, workers, remarks)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, projectId, category, level, srNo, flatNo, amount || null, averageRate || null, totalHajira || null, flatHajira || null, JSON.stringify(workers || []), remarks || ""
      );
      res.json({ id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/floor-abstracts/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { projectId, category, level, srNo, flatNo, amount, averageRate, totalHajira, flatHajira, workers, remarks } = req.body;
      db.prepare(`
        UPDATE floor_abstracts SET 
          projectId = ?, category = ?, level = ?, srNo = ?, flatNo = ?, amount = ?, averageRate = ?, totalHajira = ?, flatHajira = ?, workers = ?, remarks = ?
        WHERE id = ?
      `).run(
        projectId, category, level, srNo, flatNo, amount || null, averageRate || null, totalHajira || null, flatHajira || null, JSON.stringify(workers || []), remarks || "", id
      );
      res.json({ id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/floor-abstracts/:id", (req, res) => {
    try {
      const { id } = req.params;
      db.prepare("DELETE FROM floor_abstracts WHERE id = ?").run(id);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 1. Projects
  app.get("/api/projects", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM projects").all();
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/projects", (req, res) => {
    try {
      const { id, name, clientName, startDate, completionDate, address, budget, projectManager, pmContact, billingEngineer, beContact, siteIncharge, siContact, ourRepresentatives, repContact, status } = req.body;
      db.prepare(`
        INSERT INTO projects (id, name, clientName, startDate, completionDate, address, budget, projectManager, pmContact, billingEngineer, beContact, siteIncharge, siContact, ourRepresentatives, repContact, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, name, clientName || null, startDate, completionDate || null, address, parseFloat(budget),
        projectManager || "", pmContact || "", billingEngineer || "", beContact || "",
        siteIncharge || "", siContact || "", ourRepresentatives || "", repContact || "",
        status || "Ongoing"
      );
      res.status(201).json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/projects/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { name, clientName, startDate, completionDate, address, budget, projectManager, pmContact, billingEngineer, beContact, siteIncharge, siContact, ourRepresentatives, repContact, status } = req.body;
      db.prepare(`
        UPDATE projects
        SET name = ?, clientName = ?, startDate = ?, completionDate = ?, address = ?, budget = ?,
            projectManager = ?, pmContact = ?, billingEngineer = ?, beContact = ?, siteIncharge = ?, siContact = ?, ourRepresentatives = ?, repContact = ?, status = ?
        WHERE id = ?
      `).run(
        name, clientName || null, startDate, completionDate || null, address, parseFloat(budget),
        projectManager || "", pmContact || "", billingEngineer || "", beContact || "",
        siteIncharge || "", siContact || "", ourRepresentatives || "", repContact || "",
        status || "Ongoing",
        id
      );
      res.json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/projects/:id", (req, res) => {
    try {
      const { id } = req.params;
      db.prepare("DELETE FROM projects WHERE id = ?").run(id);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Workers
  app.get("/api/workers", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM workers").all();
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/workers/bulk", (req, res) => {
    try {
      const records = req.body;
      if (!Array.isArray(records)) {
        return res.status(400).json({ error: "Expected an array of records" });
      }
      
      const insert = db.prepare(`
        INSERT INTO workers (id, serialNo, workerId, name, projectId, designation, joiningDate, exitDate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const transaction = db.transaction((recs) => {
        let count = 0;
        for (const rec of recs) {
          // If a worker with the same ID already exists, or basically just insert
          // Since we want this to be safe, we can use INSERT OR REPLACE or just let it fail on duplication. Let's let it fail on duplication of UI logic or use REPLACE.
          try {
            insert.run(rec.id, rec.serialNo || null, rec.workerId, rec.name, rec.projectId, rec.designation, rec.joiningDate, rec.exitDate || null);
            count++;
          } catch (e: any) {
            // Ignore duplicates if needed, or throw. For now let's throw to be strict, but we could also console.log.
            throw e;
          }
        }
        return count;
      });
      
      const count = transaction(records);
      res.status(201).json({ count });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/workers", (req, res) => {
    try {
      const { id, serialNo, workerId, name, projectId, designation, joiningDate, exitDate, dailyRate } = req.body;
      db.prepare(`
        INSERT INTO workers (id, serialNo, workerId, name, projectId, designation, joiningDate, exitDate, dailyRate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, serialNo || null, workerId, name, projectId, designation, joiningDate, exitDate || null, dailyRate || null);
      res.status(201).json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/workers/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { serialNo, workerId, name, projectId, designation, joiningDate, exitDate, dailyRate } = req.body;
      db.prepare(`
        UPDATE workers
        SET serialNo = ?, workerId = ?, name = ?, projectId = ?, designation = ?, joiningDate = ?, exitDate = ?, dailyRate = ?
        WHERE id = ?
      `).run(serialNo || null, workerId, name, projectId, designation, joiningDate, exitDate || null, dailyRate || null, id);
      res.json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/workers/:id", (req, res) => {
    try {
      const { id } = req.params;
      db.prepare("DELETE FROM workers WHERE id = ?").run(id);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Billing
  app.get("/api/billings", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM billings").all();
      const mapped = rows.map((row: any) => {
        let parsedItems = [];
        if (row.measurementItems) {
          try {
            parsedItems = JSON.parse(row.measurementItems);
          } catch (e) {
            parsedItems = [];
          }
        }
        return {
          ...row,
          measurementItems: parsedItems
        };
      });
      res.json(mapped);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/billings", (req, res) => {
    try {
      const { id, srNo, projectId, billNo, workNature, amount, month, certifyDate, tds, retention, gst, debitAmount, debitReason, hardCopyFile, hardCopyFileName, hardCopyFileType, billType, measurementItems, tdsCertificateReceived, tdsCertificatePending, gstStatus } = req.body;
      const mItemsStr = measurementItems ? (typeof measurementItems === 'string' ? measurementItems : JSON.stringify(measurementItems)) : null;
      db.prepare(`
        INSERT INTO billings (id, srNo, projectId, billNo, workNature, amount, month, certifyDate, tds, retention, gst, debitAmount, debitReason, billType, measurementItems, hardCopyFile, hardCopyFileName, hardCopyFileType, tdsCertificateReceived, tdsCertificatePending, gstStatus)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        srNo || null,
        projectId,
        billNo,
        workNature,
        parseFloat(amount),
        month,
        certifyDate,
        parseFloat(tds || 0),
        parseFloat(retention || 0),
        parseFloat(gst || 0),
        parseFloat(debitAmount || 0),
        debitReason || null,
        billType || null,
        mItemsStr,
        hardCopyFile || null,
        hardCopyFileName || null,
        hardCopyFileType || null,
        tdsCertificateReceived ? 1 : 0,
        tdsCertificatePending ? 1 : 0,
        gstStatus || null
      );
      res.status(201).json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/billings/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { srNo, projectId, billNo, workNature, amount, month, certifyDate, tds, retention, gst, debitAmount, debitReason, hardCopyFile, hardCopyFileName, hardCopyFileType, billType, measurementItems, tdsCertificateReceived, tdsCertificatePending, gstStatus } = req.body;
      const mItemsStr = measurementItems ? (typeof measurementItems === 'string' ? measurementItems : JSON.stringify(measurementItems)) : null;
      db.prepare(`
        UPDATE billings
        SET srNo = ?, projectId = ?, billNo = ?, workNature = ?, amount = ?, month = ?, certifyDate = ?, tds = ?, retention = ?, gst = ?, debitAmount = ?, debitReason = ?, billType = ?, measurementItems = ?, hardCopyFile = ?, hardCopyFileName = ?, hardCopyFileType = ?, tdsCertificateReceived = ?, tdsCertificatePending = ?, gstStatus = ?
        WHERE id = ?
      `).run(
        srNo || null,
        projectId,
        billNo,
        workNature,
        parseFloat(amount),
        month,
        certifyDate,
        parseFloat(tds || 0),
        parseFloat(retention || 0),
        parseFloat(gst || 0),
        parseFloat(debitAmount || 0),
        debitReason || null,
        billType || null,
        mItemsStr,
        hardCopyFile || null,
        hardCopyFileName || null,
        hardCopyFileType || null,
        tdsCertificateReceived ? 1 : 0,
        tdsCertificatePending ? 1 : 0,
        gstStatus || null,
        id
      );
      res.json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/billings/:id", (req, res) => {
    try {
      const { id } = req.params;
      db.prepare("DELETE FROM billings WHERE id = ?").run(id);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Client Payments
  app.get("/api/client-payments", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM client_payments").all();
      // Map database schema client_payments -> clientPayments
      const formatted = rows.map((row: any) => ({
        id: row.id,
        projectId: row.projectId,
        amountReceived: row.amountReceived,
        date: row.date,
        remarks: row.remarks,
        status: row.status,
        billId: row.billId,
        paymentReference: row.paymentReference,
        paymentMode: row.paymentMode,
        bankName: row.bankName,
        utrChequeNo: row.utrChequeNo,
        attachment: row.attachment,
        isRetentionPayment: row.isRetentionPayment,
        retentionReleaseDate: row.retentionReleaseDate,
        category: row.category
      }));
      res.json(formatted);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/client-payments", (req, res) => {
    try {
      const { id, projectId, amountReceived, date, remarks, status, billId, paymentReference, paymentMode, bankName, utrChequeNo, attachment, isRetentionPayment, retentionReleaseDate, category } = req.body;
      db.prepare(`
        INSERT INTO client_payments (id, projectId, amountReceived, date, remarks, status, billId, paymentReference, paymentMode, bankName, utrChequeNo, attachment, isRetentionPayment, retentionReleaseDate, category)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, projectId, parseFloat(amountReceived), date, remarks || "", status || "Received", billId || null, paymentReference || null, paymentMode || null, bankName || null, utrChequeNo || null, attachment || null, isRetentionPayment ? 1 : 0, retentionReleaseDate || null, category || null);
      res.status(201).json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/client-payments/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { projectId, amountReceived, date, remarks, status, billId, paymentReference, paymentMode, bankName, utrChequeNo, attachment, isRetentionPayment, retentionReleaseDate, category } = req.body;
      db.prepare(`
        UPDATE client_payments
        SET projectId = ?, amountReceived = ?, date = ?, remarks = ?, status = ?, billId = ?, paymentReference = ?, paymentMode = ?, bankName = ?, utrChequeNo = ?, attachment = ?, isRetentionPayment = ?, retentionReleaseDate = ?, category = ?
        WHERE id = ?
      `).run(projectId, parseFloat(amountReceived), date, remarks || "", status || "Received", billId || null, paymentReference || null, paymentMode || null, bankName || null, utrChequeNo || null, attachment || null, isRetentionPayment ? 1 : 0, retentionReleaseDate || null, category || null, id);
      res.json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/client-payments/:id", (req, res) => {
    try {
      const { id } = req.params;
      db.prepare("DELETE FROM client_payments WHERE id = ?").run(id);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Kharchis (Expenses)
  app.get("/api/kharchis", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM kharchis").all();
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/kharchis", (req, res) => {
    try {
      const { id, projectId, workerId, date, amount } = req.body;
      db.prepare(`
        INSERT INTO kharchis (id, projectId, workerId, date, amount)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, projectId, workerId, date, parseFloat(amount));
      res.status(201).json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/kharchis/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { projectId, workerId, date, amount } = req.body;
      db.prepare(`
        UPDATE kharchis
        SET projectId = ?, workerId = ?, date = ?, amount = ?
        WHERE id = ?
      `).run(projectId, workerId, date, parseFloat(amount), id);
      res.json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/kharchis/:id", (req, res) => {
    try {
      const { id } = req.params;
      db.prepare("DELETE FROM kharchis WHERE id = ?").run(id);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Advances
  app.get("/api/advances", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM advances").all();
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/advances", (req, res) => {
    try {
      const { id, projectId, workerId, amount, paidBy, paidByDetails, remarks, date, isDeducted, deductionMonth, deductionAmount, receiptProof, receiptFileName, receiptFileType, deductionDetails } = req.body;
      db.prepare(`
        INSERT INTO advances (id, projectId, workerId, amount, paidBy, paidByDetails, remarks, date, isDeducted, deductionMonth, deductionAmount, receiptProof, receiptFileName, receiptFileType, deductionDetails)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, projectId, workerId, parseFloat(amount), paidBy, paidByDetails || "", remarks || "", date, 
        isDeducted ? 1 : 0, deductionMonth || "", parseFloat(deductionAmount || 0), 
        receiptProof || "", receiptFileName || "", receiptFileType || "", deductionDetails || ""
      );
      res.status(201).json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/advances/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { projectId, workerId, amount, paidBy, paidByDetails, remarks, date, isDeducted, deductionMonth, deductionAmount, receiptProof, receiptFileName, receiptFileType, deductionDetails } = req.body;
      db.prepare(`
        UPDATE advances
        SET projectId = ?, workerId = ?, amount = ?, paidBy = ?, paidByDetails = ?, remarks = ?, date = ?, 
            isDeducted = ?, deductionMonth = ?, deductionAmount = ?, receiptProof = ?, receiptFileName = ?, receiptFileType = ?, deductionDetails = ?
        WHERE id = ?
      `).run(
        projectId, workerId, parseFloat(amount), paidBy, paidByDetails || "", remarks || "", date, 
        isDeducted ? 1 : 0, deductionMonth || "", parseFloat(deductionAmount || 0), 
        receiptProof || "", receiptFileName || "", receiptFileType || "", deductionDetails || "", id
      );
      res.json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/advances/:id", (req, res) => {
    try {
      const { id } = req.params;
      db.prepare("DELETE FROM advances WHERE id = ?").run(id);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. Worker Payments
  app.get("/api/worker-payments", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM worker_payments").all();
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/worker-payments", (req, res) => {
    try {
      const { id, projectId, workerId, month, workAmount, messDeduction, kharchiDeduction, advanceDeduction, netPayment, date, level, workCategory, workDays, ratePerDay, overtimeHours, allowance, supplyAmount, supplyDetails, recoveryAmount, paymentStatus, otherDeduction, otherDeductionDetails, floorAbstractsJson } = req.body;
      db.prepare(`
        INSERT INTO worker_payments (id, projectId, workerId, month, workAmount, messDeduction, kharchiDeduction, advanceDeduction, netPayment, date, level, workCategory, workDays, ratePerDay, overtimeHours, allowance, supplyAmount, supplyDetails, recoveryAmount, paymentStatus, otherDeduction, otherDeductionDetails, floorAbstractsJson)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        projectId,
        workerId,
        month,
        parseFloat(workAmount || 0),
        parseFloat(messDeduction || 0),
        parseFloat(kharchiDeduction || 0),
        parseFloat(advanceDeduction || 0),
        parseFloat(netPayment || 0),
        date,
        level || null,
        workCategory || 'Monthly work',
        workDays ? parseFloat(workDays) : null,
        ratePerDay ? parseFloat(ratePerDay) : null,
        overtimeHours ? parseFloat(overtimeHours) : null,
        allowance ? parseFloat(allowance) : null,
        parseFloat(supplyAmount || 0),
        supplyDetails || null,
        parseFloat(recoveryAmount || 0),
        paymentStatus || 'Pending',
        parseFloat(otherDeduction || 0),
        otherDeductionDetails || "",
        floorAbstractsJson || null
      );
      res.status(201).json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/worker-payments/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { projectId, workerId, month, workAmount, messDeduction, kharchiDeduction, advanceDeduction, netPayment, date, level, workCategory, workDays, ratePerDay, overtimeHours, allowance, supplyAmount, supplyDetails, recoveryAmount, paymentStatus, otherDeduction, otherDeductionDetails, floorAbstractsJson } = req.body;
      db.prepare(`
        UPDATE worker_payments
        SET projectId = ?, workerId = ?, month = ?, workAmount = ?, messDeduction = ?, kharchiDeduction = ?, advanceDeduction = ?, netPayment = ?, date = ?, level = ?, workCategory = ?, workDays = ?, ratePerDay = ?, overtimeHours = ?, allowance = ?, supplyAmount = ?, supplyDetails = ?, recoveryAmount = ?, paymentStatus = ?, otherDeduction = ?, otherDeductionDetails = ?, floorAbstractsJson = ?
        WHERE id = ?
      `).run(
        projectId,
        workerId,
        month,
        parseFloat(workAmount || 0),
        parseFloat(messDeduction || 0),
        parseFloat(kharchiDeduction || 0),
        parseFloat(advanceDeduction || 0),
        parseFloat(netPayment || 0),
        date,
        level || null,
        workCategory || 'Monthly work',
        workDays ? parseFloat(workDays) : null,
        ratePerDay ? parseFloat(ratePerDay) : null,
        overtimeHours ? parseFloat(overtimeHours) : null,
        allowance ? parseFloat(allowance) : null,
        parseFloat(supplyAmount || 0),
        supplyDetails || null,
        parseFloat(recoveryAmount || 0),
        paymentStatus || 'Pending',
        parseFloat(otherDeduction || 0),
        otherDeductionDetails || "",
        floorAbstractsJson || null,
        id
      );
      res.json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/worker-payments/:id", (req, res) => {
    try {
      const { id } = req.params;
      db.prepare("DELETE FROM worker_payments WHERE id = ?").run(id);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7.5 Worker Ledger, Holds, and Audit Trails
  app.get("/api/worker-ledger", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM worker_ledger ORDER BY date ASC, id ASC").all();
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/worker-ledger", (req, res) => {
    try {
      const { id, workerId, projectId, date, voucherNo, description, entryType, debit, credit, runningBalance, paymentId, advanceId, createdBy, createdDate } = req.body;
      db.prepare(`
        INSERT INTO worker_ledger (id, workerId, projectId, date, voucherNo, description, entryType, debit, credit, runningBalance, paymentId, advanceId, createdBy, createdDate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        workerId,
        projectId,
        date,
        voucherNo || null,
        description,
        entryType,
        parseFloat(debit || 0),
        parseFloat(credit || 0),
        parseFloat(runningBalance || 0),
        paymentId || null,
        advanceId || null,
        createdBy || null,
        createdDate || null
      );
      res.status(201).json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/worker-ledger/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { workerId, projectId, date, voucherNo, description, entryType, debit, credit, runningBalance, paymentId, advanceId, createdBy, createdDate } = req.body;
      db.prepare(`
        UPDATE worker_ledger
        SET workerId = ?, projectId = ?, date = ?, voucherNo = ?, description = ?, entryType = ?, debit = ?, credit = ?, runningBalance = ?, paymentId = ?, advanceId = ?, createdBy = ?, createdDate = ?
        WHERE id = ?
      `).run(
        workerId,
        projectId,
        date,
        voucherNo || null,
        description,
        entryType,
        parseFloat(debit || 0),
        parseFloat(credit || 0),
        parseFloat(runningBalance || 0),
        paymentId || null,
        advanceId || null,
        createdBy || null,
        createdDate || null,
        id
      );
      res.json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/worker-ledger/:id", (req, res) => {
    try {
      const { id } = req.params;
      db.prepare("DELETE FROM worker_ledger WHERE id = ?").run(id);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/worker-holds", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM worker_holds").all();
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/worker-holds", (req, res) => {
    try {
      const { id, workerId, projectId, holdDate, holdAmount, reason, releasedAmount, remainingHold, status, releaseDate, remarks, releaseHistory } = req.body;
      db.prepare(`
        INSERT INTO worker_holds (id, workerId, projectId, holdDate, holdAmount, reason, releasedAmount, remainingHold, status, releaseDate, remarks, releaseHistory)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        workerId,
        projectId,
        holdDate,
        parseFloat(holdAmount || 0),
        reason || null,
        parseFloat(releasedAmount || 0),
        parseFloat(remainingHold || 0),
        status || 'Held',
        releaseDate || null,
        remarks || null,
        releaseHistory || null
      );
      res.status(201).json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/worker-holds/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { workerId, projectId, holdDate, holdAmount, reason, releasedAmount, remainingHold, status, releaseDate, remarks, releaseHistory } = req.body;
      db.prepare(`
        UPDATE worker_holds
        SET workerId = ?, projectId = ?, holdDate = ?, holdAmount = ?, reason = ?, releasedAmount = ?, remainingHold = ?, status = ?, releaseDate = ?, remarks = ?, releaseHistory = ?
        WHERE id = ?
      `).run(
        workerId,
        projectId,
        holdDate,
        parseFloat(holdAmount || 0),
        reason || null,
        parseFloat(releasedAmount || 0),
        parseFloat(remainingHold || 0),
        status || 'Held',
        releaseDate || null,
        remarks || null,
        releaseHistory || null,
        id
      );
      res.json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/worker-holds/:id", (req, res) => {
    try {
      const { id } = req.params;
      db.prepare("DELETE FROM worker_holds WHERE id = ?").run(id);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/worker-recovery-audit", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM worker_recovery_audit_trail").all();
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/worker-recovery-audit", (req, res) => {
    try {
      const { id, paymentId, workerId, prevValue, newValue, modifiedBy, modifiedDate } = req.body;
      db.prepare(`
        INSERT INTO worker_recovery_audit_trail (id, paymentId, workerId, prevValue, newValue, modifiedBy, modifiedDate)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        paymentId,
        workerId,
        parseFloat(prevValue || 0),
        parseFloat(newValue || 0),
        modifiedBy,
        modifiedDate
      );
      res.status(201).json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 8. Attendance (Bonus offline system requirement)
  app.get("/api/attendance", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM attendance").all();
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/attendance", (req, res) => {
    try {
      const { id, workerId, projectId, date, status } = req.body;
      db.prepare(`
        INSERT INTO attendance (id, workerId, projectId, date, status)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, workerId, projectId, date, status);
      res.status(201).json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 8.5. Approvals (Managing Director requests, Owner Saddam Hussain approves/rejects)
  app.get("/api/approvals", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM approvals").all();
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/approvals", (req, res) => {
    try {
      const { id, workerId, projectId, amount, remarks, date, status, requestAmount, approvedAmount } = req.body;
      db.prepare(`
        INSERT INTO approvals (id, workerId, projectId, amount, remarks, date, status, requestAmount, approvedAmount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, workerId, projectId, parseFloat(amount), remarks || "", date, status || "Pending",
        parseFloat(requestAmount || amount || 0), parseFloat(approvedAmount || amount || 0)
      );
      res.status(201).json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/approvals/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { status, approvalNotes, approvedAmount } = req.body;
      db.prepare(`
        UPDATE approvals
        SET status = ?, approvalNotes = ?, approvedAmount = ?, amount = ?
        WHERE id = ?
      `).run(status, approvalNotes || "", parseFloat(approvedAmount || 0), parseFloat(approvedAmount || 0), id);
      res.json({ id, status, approvalNotes, approvedAmount });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/approvals/:id", (req, res) => {
    try {
      const { id } = req.params;
      db.prepare("DELETE FROM approvals WHERE id = ?").run(id);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 8.5.5. Payment Sheet Approvals
  app.get("/api/kharchi-approvals", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM kharchi_approvals").all();
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/kharchi-approvals", (req, res) => {
    try {
      const { id, projectId, month, totalAmount, remarks, date, status } = req.body;
      db.prepare(`
        INSERT INTO kharchi_approvals (id, projectId, month, totalAmount, remarks, date, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, projectId, month, parseFloat(totalAmount), remarks || "", date, status || "Pending");
      res.status(201).json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/kharchi-approvals/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { status, approvalNotes } = req.body;
      db.prepare(`
        UPDATE kharchi_approvals
        SET status = ?, approvalNotes = ?
        WHERE id = ?
      `).run(status, approvalNotes || "", id);
      res.json({ id, status, approvalNotes });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/kharchi-approvals/:id", (req, res) => {
    try {
      const { id } = req.params;
      db.prepare("DELETE FROM kharchi_approvals WHERE id = ?").run(id);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/payment-sheet-approvals", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM payment_sheet_approvals").all();
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/payment-sheet-approvals", (req, res) => {
    try {
      const { id, projectId, month, totalAmount, remarks, date, status } = req.body;
      db.prepare(`
        INSERT INTO payment_sheet_approvals (id, projectId, month, totalAmount, remarks, date, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, projectId, month, parseFloat(totalAmount), remarks || "", date, status || "Pending");
      res.status(201).json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/payment-sheet-approvals/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { status, approvalNotes } = req.body;
      db.prepare(`
        UPDATE payment_sheet_approvals
        SET status = ?, approvalNotes = ?
        WHERE id = ?
      `).run(status, approvalNotes || "", id);
      res.json({ id, status, approvalNotes });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/payment-sheet-approvals/:id", (req, res) => {
    try {
      const { id } = req.params;
      db.prepare("DELETE FROM payment_sheet_approvals WHERE id = ?").run(id);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 8.6 Expenses Ledger (Owner and Managing Director expenses summary)
  app.get("/api/expenses_ledger", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM expenses_ledger").all();
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/expenses_ledger", (req, res) => {
    try {
      const {
        id, date, description, projectId, kharchi, mess, workerAdvance,
        tiffin, travel, machineryMaterial, workerPayment, stationery, others, bank, crBalance,
        receiptProof, receiptFileName, receiptFileType, status, approvalNotes
      } = req.body;
      db.prepare(`
        INSERT INTO expenses_ledger (
          id, date, description, projectId, kharchi, mess, workerAdvance,
          tiffin, travel, machineryMaterial, workerPayment, stationery, others, bank, crBalance,
          receiptProof, receiptFileName, receiptFileType, status, approvalNotes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, date, description, projectId || null,
        parseFloat(kharchi || 0), parseFloat(mess || 0), parseFloat(workerAdvance || 0),
        parseFloat(tiffin || 0), parseFloat(travel || 0), parseFloat(machineryMaterial || 0),
        parseFloat(workerPayment || 0), parseFloat(stationery || 0), parseFloat(others || 0),
        bank || null, parseFloat(crBalance || 0),
        receiptProof || "", receiptFileName || "", receiptFileType || "", status || "Draft", approvalNotes || ""
      );
      res.status(201).json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/expenses_ledger/:id", (req, res) => {
    try {
      const { id } = req.params;
      const {
        date, description, projectId, kharchi, mess, workerAdvance,
        tiffin, travel, machineryMaterial, workerPayment, stationery, others, bank, crBalance,
        receiptProof, receiptFileName, receiptFileType, status, approvalNotes
      } = req.body;
      db.prepare(`
        UPDATE expenses_ledger
        SET date = ?, description = ?, projectId = ?, kharchi = ?, mess = ?, workerAdvance = ?,
            tiffin = ?, travel = ?, machineryMaterial = ?, workerPayment = ?, stationery = ?, others = ?,
            bank = ?, crBalance = ?, receiptProof = ?, receiptFileName = ?, receiptFileType = ?, status = ?, approvalNotes = ?
        WHERE id = ?
      `).run(
        date, description, projectId || null,
        parseFloat(kharchi || 0), parseFloat(mess || 0), parseFloat(workerAdvance || 0),
        parseFloat(tiffin || 0), parseFloat(travel || 0), parseFloat(machineryMaterial || 0),
        parseFloat(workerPayment || 0), parseFloat(stationery || 0), parseFloat(others || 0),
        bank || null, parseFloat(crBalance || 0),
        receiptProof || "", receiptFileName || "", receiptFileType || "", status || "Draft", approvalNotes || "", id
      );
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/expenses_ledger/:id", (req, res) => {
    try {
      const { id } = req.params;
      db.prepare("DELETE FROM expenses_ledger WHERE id = ?").run(id);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Advance Sheet Approvals Endpoints
  app.get("/api/advance-sheet-approvals", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM advance_sheet_approvals").all();
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/advance-sheet-approvals", (req, res) => {
    try {
      const { id, projectId, month, totalAmount, remarks, date, status } = req.body;
      db.prepare(`
        INSERT INTO advance_sheet_approvals (id, projectId, month, totalAmount, remarks, date, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, projectId, month, parseFloat(totalAmount), remarks || "", date, status || "Pending");
      res.status(201).json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/advance-sheet-approvals/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { status, approvalNotes } = req.body;
      db.prepare(`
        UPDATE advance_sheet_approvals
        SET status = ?, approvalNotes = ?
        WHERE id = ?
      `).run(status, approvalNotes || "", id);
      res.json({ id, status, approvalNotes });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/advance-sheet-approvals/:id", (req, res) => {
    try {
      const { id } = req.params;
      db.prepare("DELETE FROM advance_sheet_approvals WHERE id = ?").run(id);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 8.7 Mess Bookings API
  app.get("/api/mess-bookings", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM mess_bookings").all();
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/mess-bookings", (req, res) => {
    try {
      const {
        id, projectId, fromDate, toDate, workerCount, ratePerWeek,
        totalComputed, amountPaid, amountDue, paidTo, paymentDate, remarks, postedExpenseId
      } = req.body;
      db.prepare(`
        INSERT INTO mess_bookings (
          id, projectId, fromDate, toDate, workerCount, ratePerWeek,
          totalComputed, amountPaid, amountDue, paidTo, paymentDate, remarks, postedExpenseId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, projectId, fromDate, toDate, parseInt(workerCount, 10), parseFloat(ratePerWeek),
        parseFloat(totalComputed), parseFloat(amountPaid), parseFloat(amountDue),
        paidTo || "", paymentDate, remarks || "", postedExpenseId || null
      );
      res.status(201).json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/mess-bookings/:id", (req, res) => {
    try {
      const { id } = req.params;
      const {
        projectId, fromDate, toDate, workerCount, ratePerWeek,
        totalComputed, amountPaid, amountDue, paidTo, paymentDate, remarks, postedExpenseId
      } = req.body;
      db.prepare(`
        UPDATE mess_bookings
        SET projectId = ?, fromDate = ?, toDate = ?, workerCount = ?, ratePerWeek = ?,
            totalComputed = ?, amountPaid = ?, amountDue = ?, paidTo = ?, paymentDate = ?,
            remarks = ?, postedExpenseId = ?
        WHERE id = ?
      `).run(
        projectId, fromDate, toDate, parseInt(workerCount, 10), parseFloat(ratePerWeek),
        parseFloat(totalComputed), parseFloat(amountPaid), parseFloat(amountDue),
        paidTo || "", paymentDate, remarks || "", postedExpenseId || null, id
      );
      res.json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/mess-bookings/:id", (req, res) => {
    try {
      const { id } = req.params;
      db.prepare("DELETE FROM mess_bookings WHERE id = ?").run(id);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --------------
  // DLR (Daily Labour Report) endpoints
  // --------------
  app.get("/api/dlrs", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM dlrs").all();
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/dlrs", (req, res) => {
    try {
      const { id, date, projectId, carpenter, fitter, helper, mason, rigger, staff, remarks } = req.body;
      db.prepare(`
        INSERT INTO dlrs (
          id, date, projectId, carpenter, fitter, helper, mason, rigger, staff, remarks
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, date, projectId, parseInt(carpenter || 0), parseInt(fitter || 0), parseInt(helper || 0),
        parseInt(mason || 0), parseInt(rigger || 0), parseInt(staff || 0), remarks || ""
      );
      res.json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/dlrs/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { date, projectId, carpenter, fitter, helper, mason, rigger, staff, remarks } = req.body;
      db.prepare(`
        UPDATE dlrs
        SET date = ?, projectId = ?, carpenter = ?, fitter = ?, helper = ?, mason = ?, rigger = ?, staff = ?, remarks = ?
        WHERE id = ?
      `).run(
        date, projectId, parseInt(carpenter || 0), parseInt(fitter || 0), parseInt(helper || 0),
        parseInt(mason || 0), parseInt(rigger || 0), parseInt(staff || 0), remarks || "", id
      );
      res.json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/dlrs/:id", (req, res) => {
    try {
      const { id } = req.params;
      db.prepare("DELETE FROM dlrs WHERE id = ?").run(id);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --------------
  // Material Items (Master) endpoints
  // --------------
  app.get("/api/material-items", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM material_items").all();
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/material-items/bulk", (req, res) => {
    try {
      const records = req.body;
      if (!Array.isArray(records)) {
        return res.status(400).json({ error: "Expected an array of records" });
      }

      const insert = db.prepare(`
        INSERT INTO material_items (id, itemCode, itemName, category, materialType, unit, description, createdBy, createdDate, modifiedBy, modifiedDate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const transaction = db.transaction((recs) => {
        let count = 0;
        for (const rec of recs) {
          try {
            insert.run(
              rec.id, rec.itemCode || null, rec.itemName, rec.category, rec.materialType || 'Consumable', rec.unit, 
              rec.description || null, rec.createdBy || null, rec.createdDate || null, rec.modifiedBy || null, rec.modifiedDate || null
            );
            count++;
          } catch (e: any) {
            throw e;
          }
        }
        return count;
      });

      const count = transaction(records);
      res.status(201).json({ count });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/material-items", (req, res) => {
    try {
      const { id, itemCode, itemName, category, materialType, unit, description, createdBy, createdDate } = req.body;
      db.prepare(`
        INSERT INTO material_items (id, itemCode, itemName, category, materialType, unit, description, createdBy, createdDate, modifiedBy, modifiedDate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, itemCode || null, itemName, category, materialType || 'Consumable', unit, description || null, createdBy || null, createdDate || null, createdBy || null, createdDate || null);
      res.status(201).json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/material-items/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { itemCode, itemName, category, materialType, unit, description, modifiedBy, modifiedDate } = req.body;
      db.prepare(`
        UPDATE material_items
        SET itemCode = ?, itemName = ?, category = ?, materialType = ?, unit = ?, description = ?, modifiedBy = ?, modifiedDate = ?
        WHERE id = ?
      `).run(itemCode || null, itemName, category, materialType || 'Consumable', unit, description || null, modifiedBy || null, modifiedDate || null, id);
      res.json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/material-items/:id", (req, res) => {
    try {
      const { id } = req.params;
      db.prepare("DELETE FROM material_items WHERE id = ?").run(id);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --------------
  // Material Issues endpoints
  // --------------
  app.get("/api/material-issues", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM material_issues").all();
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/material-issues", (req, res) => {
    try {
      const { id, voucherNo, issueDate, projectId, tower, floor, itemId, qty, issuedTo, remarks, createdBy, createdDate } = req.body;
      db.prepare(`
        INSERT INTO material_issues (id, voucherNo, issueDate, projectId, tower, floor, itemId, qty, issuedTo, remarks, createdBy, createdDate, modifiedBy, modifiedDate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, voucherNo, issueDate, projectId, tower || null, floor || null, itemId, parseFloat(qty), issuedTo, remarks || null, createdBy || null, createdDate || null, createdBy || null, createdDate || null);
      res.status(201).json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/material-issues/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { voucherNo, issueDate, projectId, tower, floor, itemId, qty, issuedTo, remarks, modifiedBy, modifiedDate } = req.body;
      db.prepare(`
        UPDATE material_issues
        SET voucherNo = ?, issueDate = ?, projectId = ?, tower = ?, floor = ?, itemId = ?, qty = ?, issuedTo = ?, remarks = ?, modifiedBy = ?, modifiedDate = ?
        WHERE id = ?
      `).run(voucherNo, issueDate, projectId, tower || null, floor || null, itemId, parseFloat(qty), issuedTo, remarks || null, modifiedBy || null, modifiedDate || null, id);
      res.json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/material-issues/:id", (req, res) => {
    try {
      const { id } = req.params;
      db.prepare("DELETE FROM material_issues WHERE id = ?").run(id);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --------------
  // Material Returns endpoints
  // --------------
  app.get("/api/material-returns", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM material_returns").all();
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/material-returns", (req, res) => {
    try {
      const { id, voucherNo, returnDate, projectId, tower, floor, itemId, qty, returnedBy, condition, remarks, createdBy, createdDate } = req.body;
      db.prepare(`
        INSERT INTO material_returns (id, voucherNo, returnDate, projectId, tower, floor, itemId, qty, returnedBy, condition, remarks, createdBy, createdDate, modifiedBy, modifiedDate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, voucherNo, returnDate, projectId, tower || null, floor || null, itemId, parseFloat(qty), returnedBy, condition, remarks || null, createdBy || null, createdDate || null, createdBy || null, createdDate || null);
      res.status(201).json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/material-returns/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { voucherNo, returnDate, projectId, tower, floor, itemId, qty, returnedBy, condition, remarks, modifiedBy, modifiedDate } = req.body;
      db.prepare(`
        UPDATE material_returns
        SET voucherNo = ?, returnDate = ?, projectId = ?, tower = ?, floor = ?, itemId = ?, qty = ?, returnedBy = ?, condition = ?, remarks = ?, modifiedBy = ?, modifiedDate = ?
        WHERE id = ?
      `).run(voucherNo, returnDate, projectId, tower || null, floor || null, itemId, parseFloat(qty), returnedBy, condition, remarks || null, modifiedBy || null, modifiedDate || null, id);
      res.json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/material-returns/:id", (req, res) => {
    try {
      const { id } = req.params;
      db.prepare("DELETE FROM material_returns WHERE id = ?").run(id);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --------------
  // Material Purchases endpoints
  // --------------
  app.get("/api/material-purchases", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM material_purchases").all();
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/material-purchases", (req, res) => {
    try {
      const {
        id, purchaseDate, purchaseVoucherNo, supplierName, supplierMobile, gstNo, projectId, itemId, qty, rate, totalAmount,
        transportCharges, loadingCharges, otherCharges, grandTotal, invoiceNumber, invoiceDate, remarks, createdBy, createdDate
      } = req.body;
      db.prepare(`
        INSERT INTO material_purchases (
          id, purchaseDate, purchaseVoucherNo, supplierName, supplierMobile, gstNo, projectId, itemId, qty, rate, totalAmount,
          transportCharges, loadingCharges, otherCharges, grandTotal, invoiceNumber, invoiceDate, remarks, createdBy, createdDate, modifiedBy, modifiedDate
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, purchaseDate, purchaseVoucherNo, supplierName, supplierMobile, gstNo || null, projectId, itemId, parseFloat(qty), parseFloat(rate), parseFloat(totalAmount),
        parseFloat(transportCharges || 0), parseFloat(loadingCharges || 0), parseFloat(otherCharges || 0), parseFloat(grandTotal), invoiceNumber, invoiceDate, remarks || null,
        createdBy || null, createdDate || null, createdBy || null, createdDate || null
      );
      res.status(201).json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/material-purchases/:id", (req, res) => {
    try {
      const { id } = req.params;
      const {
        purchaseDate, purchaseVoucherNo, supplierName, supplierMobile, gstNo, projectId, itemId, qty, rate, totalAmount,
        transportCharges, loadingCharges, otherCharges, grandTotal, invoiceNumber, invoiceDate, remarks, modifiedBy, modifiedDate
      } = req.body;
      db.prepare(`
        UPDATE material_purchases
        SET purchaseDate = ?, purchaseVoucherNo = ?, supplierName = ?, supplierMobile = ?, gstNo = ?, projectId = ?, itemId = ?, qty = ?, rate = ?, totalAmount = ?,
            transportCharges = ?, loadingCharges = ?, otherCharges = ?, grandTotal = ?, invoiceNumber = ?, invoiceDate = ?, remarks = ?, modifiedBy = ?, modifiedDate = ?
        WHERE id = ?
      `).run(
        purchaseDate, purchaseVoucherNo, supplierName, supplierMobile, gstNo || null, projectId, itemId, parseFloat(qty), parseFloat(rate), parseFloat(totalAmount),
        parseFloat(transportCharges || 0), parseFloat(loadingCharges || 0), parseFloat(otherCharges || 0), parseFloat(grandTotal), invoiceNumber, invoiceDate, remarks || null,
        modifiedBy || null, modifiedDate || null, id
      );
      res.json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/material-purchases/:id", (req, res) => {
    try {
      const { id } = req.params;
      db.prepare("DELETE FROM material_purchases WHERE id = ?").run(id);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 8.5 Labour Plannings and Worker Transfers
  app.get("/api/labour-plannings", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM labour_plannings").all();
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/labour-plannings", (req, res) => {
    try {
      const {
        id, projectId, tower, floor, activityName, requiredDate, requiredCompletionDate, remarks,
        carpenterReq, helperReq, barBenderReq, steelFixerReq, masonReq, concreteWorkerReq,
        supervisorReq, foremanReq, otherReq
      } = req.body;
      db.prepare(`
        INSERT INTO labour_plannings (
          id, projectId, tower, floor, activityName, requiredDate, requiredCompletionDate, remarks,
          carpenterReq, helperReq, barBenderReq, steelFixerReq, masonReq, concreteWorkerReq,
          supervisorReq, foremanReq, otherReq
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, projectId, tower || null, floor || null, activityName, requiredDate, requiredCompletionDate, remarks || null,
        parseInt(carpenterReq || 0), parseInt(helperReq || 0), parseInt(barBenderReq || 0),
        parseInt(steelFixerReq || 0), parseInt(masonReq || 0), parseInt(concreteWorkerReq || 0),
        parseInt(supervisorReq || 0), parseInt(foremanReq || 0), parseInt(otherReq || 0)
      );
      res.status(201).json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/labour-plannings/:id", (req, res) => {
    try {
      const { id } = req.params;
      const {
        projectId, tower, floor, activityName, requiredDate, requiredCompletionDate, remarks,
        carpenterReq, helperReq, barBenderReq, steelFixerReq, masonReq, concreteWorkerReq,
        supervisorReq, foremanReq, otherReq
      } = req.body;
      db.prepare(`
        UPDATE labour_plannings
        SET projectId = ?, tower = ?, floor = ?, activityName = ?, requiredDate = ?, requiredCompletionDate = ?, remarks = ?,
            carpenterReq = ?, helperReq = ?, barBenderReq = ?, steelFixerReq = ?, masonReq = ?, concreteWorkerReq = ?,
            supervisorReq = ?, foremanReq = ?, otherReq = ?
        WHERE id = ?
      `).run(
        projectId, tower || null, floor || null, activityName, requiredDate, requiredCompletionDate, remarks || null,
        parseInt(carpenterReq || 0), parseInt(helperReq || 0), parseInt(barBenderReq || 0),
        parseInt(steelFixerReq || 0), parseInt(masonReq || 0), parseInt(concreteWorkerReq || 0),
        parseInt(supervisorReq || 0), parseInt(foremanReq || 0), parseInt(otherReq || 0),
        id
      );
      res.json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/labour-plannings/:id", (req, res) => {
    try {
      const { id } = req.params;
      db.prepare("DELETE FROM labour_plannings WHERE id = ?").run(id);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/worker-transfers", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM worker_transfers").all();
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/worker-transfers", (req, res) => {
    try {
      const { id, workerId, fromProjectId, toProjectId, transferDate, remarks } = req.body;
      const transaction = db.transaction(() => {
        db.prepare(`
          INSERT INTO worker_transfers (id, workerId, fromProjectId, toProjectId, transferDate, remarks)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(id, workerId, fromProjectId, toProjectId, transferDate, remarks || null);

        db.prepare(`
          UPDATE workers
          SET projectId = ?
          WHERE id = ?
        `).run(toProjectId, workerId);
      });
      transaction();
      res.status(201).json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Assets Endpoints
  app.get("/api/assets", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM assets").all();
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/assets", (req, res) => {
    try {
      const { id, name, category, assetCode, brand, purchaseDate, purchaseCost, currentSiteId, assignedTo, status, remarks, createdBy, createdDate } = req.body;
      db.prepare(`
        INSERT INTO assets (id, name, category, assetCode, brand, purchaseDate, purchaseCost, currentSiteId, assignedTo, status, remarks, createdBy, createdDate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        name,
        category,
        assetCode,
        brand,
        purchaseDate,
        parseFloat(purchaseCost || 0),
        currentSiteId,
        assignedTo || null,
        status,
        remarks || null,
        createdBy || null,
        createdDate || null
      );
      res.status(201).json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/assets/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { name, category, assetCode, brand, purchaseDate, purchaseCost, currentSiteId, assignedTo, status, remarks } = req.body;
      db.prepare(`
        UPDATE assets
        SET name = ?, category = ?, assetCode = ?, brand = ?, purchaseDate = ?, purchaseCost = ?, currentSiteId = ?, assignedTo = ?, status = ?, remarks = ?
        WHERE id = ?
      `).run(
        name,
        category,
        assetCode,
        brand,
        purchaseDate,
        parseFloat(purchaseCost || 0),
        currentSiteId,
        assignedTo || null,
        status,
        remarks || null,
        id
      );
      res.json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/assets/:id", (req, res) => {
    try {
      const { id } = req.params;
      const transfers = db.prepare("SELECT COUNT(*) as count FROM asset_transfers WHERE assetId = ?").get() as { count: number };
      const maintenance = db.prepare("SELECT COUNT(*) as count FROM asset_maintenances WHERE assetId = ?").get() as { count: number };
      if (transfers.count > 0 || maintenance.count > 0) {
        return res.status(400).json({ error: "Cannot delete asset: This asset has a recorded transaction history (transfers or maintenance logs)." });
      }
      db.prepare("DELETE FROM assets WHERE id = ?").run(id);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Asset Transfers Endpoints
  app.get("/api/asset-transfers", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM asset_transfers").all();
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/asset-transfers", (req, res) => {
    try {
      const { id, assetId, fromSiteId, toSiteId, transferDate, transferredBy, remarks } = req.body;
      const transaction = db.transaction(() => {
        db.prepare(`
          INSERT INTO asset_transfers (id, assetId, fromSiteId, toSiteId, transferDate, transferredBy, remarks)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(id, assetId, fromSiteId, toSiteId, transferDate, transferredBy, remarks || null);

        db.prepare(`
          UPDATE assets
          SET currentSiteId = ?
          WHERE id = ?
        `).run(toSiteId, assetId);
      });
      transaction();
      res.status(201).json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Asset Maintenances Endpoints
  app.get("/api/asset-maintenances", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM asset_maintenances").all();
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/asset-maintenances", (req, res) => {
    try {
      const { id, assetId, maintenanceDate, maintenanceType, vendor, cost, remarks, nextMaintenanceDate } = req.body;
      db.prepare(`
        INSERT INTO asset_maintenances (id, assetId, maintenanceDate, maintenanceType, vendor, cost, remarks, nextMaintenanceDate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        assetId,
        maintenanceDate,
        maintenanceType,
        vendor,
        parseFloat(cost || 0),
        remarks || null,
        nextMaintenanceDate || null
      );
      res.status(201).json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });


  // 9. Full Backup Export/Import APIs
  app.get("/api/backup/export", (req, res) => {
    try {
      const projects = db.prepare("SELECT * FROM projects").all();
      const workers = db.prepare("SELECT * FROM workers").all();
      const billings = db.prepare("SELECT * FROM billings").all();
      const clientPayments = db.prepare("SELECT * FROM client_payments").all();
      const kharchis = db.prepare("SELECT * FROM kharchis").all();
      const advances = db.prepare("SELECT * FROM advances").all();
      const workerPayments = db.prepare("SELECT * FROM worker_payments").all();
      const attendance = db.prepare("SELECT * FROM attendance").all();
      const approvals = db.prepare("SELECT * FROM approvals").all();
      const paymentSheetApprovals = db.prepare("SELECT * FROM payment_sheet_approvals").all();
      const expensesLedger = db.prepare("SELECT * FROM expenses_ledger").all();
      const messBookings = db.prepare("SELECT * FROM mess_bookings").all();
      let dlrs = [];
      try {
        dlrs = db.prepare("SELECT * FROM dlrs").all();
      } catch(e) {}
 
       res.json({
         projects,
         workers,
         billings,
         clientPayments: clientPayments.map((row: any) => ({
           id: row.id,
           projectId: row.projectId,
           amountReceived: row.amountReceived,
           date: row.date,
           remarks: row.remarks,
           status: row.status
         })),
          kharchis,
          advances,
          workerPayments,
          attendance,
          approvals,
          paymentSheetApprovals,
          expensesLedger,
          messBookings,
          dlrs
       });
     } catch (err: any) {
       res.status(500).json({ error: err.message });
     }
   });

  app.post("/api/backup/import", (req, res) => {
    const backup = req.body;
    const transaction = db.transaction(() => {
      // Clear all data
      db.prepare("DELETE FROM approvals").run();
      db.prepare("DELETE FROM payment_sheet_approvals").run();
      db.prepare("DELETE FROM worker_payments").run();
      db.prepare("DELETE FROM advances").run();
      db.prepare("DELETE FROM kharchis").run();
      db.prepare("DELETE FROM client_payments").run();
      db.prepare("DELETE FROM billings").run();
      db.prepare("DELETE FROM workers").run();
      db.prepare("DELETE FROM attendance").run();
      db.prepare("DELETE FROM projects").run();
      db.prepare("DELETE FROM expenses_ledger").run();
      db.prepare("DELETE FROM mess_bookings").run();
      try { db.prepare("DELETE FROM tracked_bills").run(); } catch(e){}
      try { db.prepare("DELETE FROM bill_timeline").run(); } catch(e){}

      // Insert fresh data
      if (backup.projects && Array.isArray(backup.projects)) {
        const insert = db.prepare(`
          INSERT INTO projects (id, name, clientName, startDate, completionDate, address, budget, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const p of backup.projects) {
          insert.run(p.id, p.name, p.clientName || null, p.startDate, p.completionDate || null, p.address, parseFloat(p.budget), p.status || "Ongoing");
        }
      }

      if (backup.workers && Array.isArray(backup.workers)) {
        const insert = db.prepare(`
          INSERT INTO workers (id, serialNo, workerId, name, projectId, designation, joiningDate, exitDate)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const w of backup.workers) {
          insert.run(w.id, w.serialNo || null, w.workerId, w.name, w.projectId, w.designation, w.joiningDate, w.exitDate || null);
        }
      }

      if (backup.billings && Array.isArray(backup.billings)) {
        const insert = db.prepare(`
          INSERT INTO billings (id, srNo, projectId, billNo, workNature, amount, month, certifyDate, tds, retention, gst)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const b of backup.billings) {
          insert.run(
            b.id,
            b.srNo || null,
            b.projectId,
            b.billNo,
            b.workNature,
            parseFloat(b.amount),
            b.month,
            b.certifyDate,
            parseFloat(b.tds || 0),
            parseFloat(b.retention || 0),
            parseFloat(b.gst || 0)
          );
        }
      }

      if (backup.clientPayments && Array.isArray(backup.clientPayments)) {
        const insert = db.prepare(`
          INSERT INTO client_payments (id, projectId, amountReceived, date, remarks, status)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const cp of backup.clientPayments) {
          insert.run(cp.id, cp.projectId, parseFloat(cp.amountReceived), cp.date, cp.remarks || "", cp.status || "Received");
        }
      }

      if (backup.kharchis && Array.isArray(backup.kharchis)) {
        const insert = db.prepare(`
          INSERT INTO kharchis (id, projectId, workerId, date, amount)
          VALUES (?, ?, ?, ?, ?)
        `);
        for (const k of backup.kharchis) {
          insert.run(k.id, k.projectId, k.workerId, k.date, parseFloat(k.amount));
        }
      }

      if (backup.advances && Array.isArray(backup.advances)) {
        const insert = db.prepare(`
          INSERT INTO advances (id, projectId, workerId, amount, paidBy, remarks, date)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        for (const a of backup.advances) {
          insert.run(a.id, a.projectId, a.workerId, parseFloat(a.amount), a.paidBy, a.remarks || "", a.date);
        }
      }

      if (backup.workerPayments && Array.isArray(backup.workerPayments)) {
        const insert = db.prepare(`
          INSERT INTO worker_payments (id, projectId, workerId, month, workAmount, messDeduction, kharchiDeduction, advanceDeduction, netPayment, date, level, workCategory, workDays, ratePerDay, overtimeHours, allowance, supplyAmount, supplyDetails)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const wp of backup.workerPayments) {
          insert.run(wp.id, wp.projectId, wp.workerId, wp.month, parseFloat(wp.workAmount), parseFloat(wp.messDeduction), parseFloat(wp.kharchiDeduction), parseFloat(wp.advanceDeduction), parseFloat(wp.netPayment), wp.date, wp.level || null, wp.workCategory || 'Monthly work', wp.workDays ? parseFloat(wp.workDays) : null, wp.ratePerDay ? parseFloat(wp.ratePerDay) : null, wp.overtimeHours ? parseFloat(wp.overtimeHours) : null, wp.allowance ? parseFloat(wp.allowance) : null, parseFloat(wp.supplyAmount || 0), wp.supplyDetails || null);
        }
      }

      if (backup.attendance && Array.isArray(backup.attendance)) {
        const insert = db.prepare(`
          INSERT INTO attendance (id, workerId, projectId, date, status)
          VALUES (?, ?, ?, ?, ?)
        `);
        for (const att of backup.attendance) {
          insert.run(att.id, att.workerId, att.projectId, att.date, att.status);
        }
      }

      if (backup.approvals && Array.isArray(backup.approvals)) {
        const insert = db.prepare(`
          INSERT INTO approvals (id, workerId, projectId, amount, remarks, date, status)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        for (const app of backup.approvals) {
          insert.run(app.id, app.workerId, app.projectId, parseFloat(app.amount), app.remarks || "", app.date, app.status || "Pending");
        }
      }

      if (backup.paymentSheetApprovals && Array.isArray(backup.paymentSheetApprovals)) {
        const insert = db.prepare(`
          INSERT INTO payment_sheet_approvals (id, projectId, month, totalAmount, remarks, date, status)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        for (const psa of backup.paymentSheetApprovals) {
          insert.run(psa.id, psa.projectId, psa.month, parseFloat(psa.totalAmount), psa.remarks || "", psa.date, psa.status || "Pending");
        }
      }

      if (backup.expensesLedger && Array.isArray(backup.expensesLedger)) {
        const insert = db.prepare(`
          INSERT INTO expenses_ledger (
            id, date, description, projectId, kharchi, mess, workerAdvance,
            tiffin, travel, machineryMaterial, workerPayment, stationery, others, bank, crBalance
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const el of backup.expensesLedger) {
          insert.run(
            el.id,
            el.date,
            el.description,
            el.projectId || null,
            parseFloat(el.kharchi || 0),
            parseFloat(el.mess || 0),
            parseFloat(el.workerAdvance || 0),
            parseFloat(el.tiffin || 0),
            parseFloat(el.travel || 0),
            parseFloat(el.machineryMaterial || 0),
            parseFloat(el.workerPayment || 0),
            parseFloat(el.stationery || 0),
            parseFloat(el.others || 0),
            el.bank || null,
            parseFloat(el.crBalance || 0)
          );
        }
      }

      if (backup.messBookings && Array.isArray(backup.messBookings)) {
        const insert = db.prepare(`
          INSERT INTO mess_bookings (
            id, projectId, fromDate, toDate, workerCount, ratePerWeek,
            totalComputed, amountPaid, amountDue, paidTo, paymentDate, remarks, postedExpenseId
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const mb of backup.messBookings) {
          insert.run(
            mb.id,
            mb.projectId,
            mb.fromDate,
            mb.toDate,
            parseInt(mb.workerCount, 10),
            parseFloat(mb.ratePerWeek),
            parseFloat(mb.totalComputed),
            parseFloat(mb.amountPaid),
            parseFloat(mb.amountDue),
            mb.paidTo || "",
            mb.paymentDate,
            mb.remarks || "",
            mb.postedExpenseId || null
          );
        }
      }

      if (backup.dlrs && Array.isArray(backup.dlrs)) {
        const insert = db.prepare(`
          INSERT INTO dlrs (
            id, date, projectId, carpenter, fitter, helper, mason, rigger, staff, remarks
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const d of backup.dlrs) {
          insert.run(
            d.id, d.date, d.projectId, parseInt(d.carpenter || 0), parseInt(d.fitter || 0), parseInt(d.helper || 0),
            parseInt(d.mason || 0), parseInt(d.rigger || 0), parseInt(d.staff || 0), d.remarks || ""
          );
        }
      }

      if (backup.trackedBills && Array.isArray(backup.trackedBills)) {
        const insert = db.prepare(`
          INSERT INTO tracked_bills (
            id, billNo, billType, clientName, projectId, billingPeriod, billDate, billAmount, remarks,
            currentStatus, statusUpdateDate, updatedBy, amountCertified, amountReceived, outstandingAmount,
            lastPaymentDate, expectedPaymentDate
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const tb of backup.trackedBills) {
          insert.run(
            tb.id,
            tb.billNo,
            tb.billType,
            tb.clientName,
            tb.projectId,
            tb.billingPeriod,
            tb.billDate,
            parseFloat(tb.billAmount || 0),
            tb.remarks || null,
            tb.currentStatus,
            tb.statusUpdateDate,
            tb.updatedBy,
            parseFloat(tb.amountCertified || 0),
            parseFloat(tb.amountReceived || 0),
            parseFloat(tb.outstandingAmount || 0),
            tb.lastPaymentDate || null,
            tb.expectedPaymentDate || null
          );
        }
      }

      if (backup.billTimelines && Array.isArray(backup.billTimelines)) {
        const insert = db.prepare(`
          INSERT INTO bill_timeline (id, billId, status, updateDate, updatedBy, remarks)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const tl of backup.billTimelines) {
          insert.run(
            tl.id,
            tl.billId,
            tl.status,
            tl.updateDate,
            tl.updatedBy,
            tl.remarks || null
          );
        }
      }
    });

    try {
      transaction();
      res.json({ success: true, message: "Backup database imported successfully!" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });


  // ------------------------------------
  // Tracked Bills & Status Timelines API
  // ------------------------------------
  app.get("/api/tracked-bills", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM tracked_bills").all();
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/tracked-bills", (req, res) => {
    try {
      const {
        id, billNo, billType, clientName, projectId, billingPeriod, billDate, billAmount, remarks,
        currentStatus, statusUpdateDate, updatedBy, amountCertified, amountReceived, outstandingAmount,
        lastPaymentDate, expectedPaymentDate
      } = req.body;

      db.prepare(`
        INSERT INTO tracked_bills (
          id, billNo, billType, clientName, projectId, billingPeriod, billDate, billAmount, remarks,
          currentStatus, statusUpdateDate, updatedBy, amountCertified, amountReceived, outstandingAmount,
          lastPaymentDate, expectedPaymentDate
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        billNo,
        billType,
        clientName,
        projectId,
        billingPeriod,
        billDate,
        parseFloat(billAmount || 0),
        remarks || null,
        currentStatus,
        statusUpdateDate,
        updatedBy,
        parseFloat(amountCertified || 0),
        parseFloat(amountReceived || 0),
        parseFloat(outstandingAmount || 0),
        lastPaymentDate || null,
        expectedPaymentDate || null
      );

      res.status(201).json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/tracked-bills/:id", (req, res) => {
    try {
      const { id } = req.params;
      const {
        billNo, billType, clientName, projectId, billingPeriod, billDate, billAmount, remarks,
        currentStatus, statusUpdateDate, updatedBy, amountCertified, amountReceived, outstandingAmount,
        lastPaymentDate, expectedPaymentDate
      } = req.body;

      db.prepare(`
        UPDATE tracked_bills
        SET billNo = ?, billType = ?, clientName = ?, projectId = ?, billingPeriod = ?, billDate = ?, billAmount = ?, remarks = ?,
            currentStatus = ?, statusUpdateDate = ?, updatedBy = ?, amountCertified = ?, amountReceived = ?, outstandingAmount = ?,
            lastPaymentDate = ?, expectedPaymentDate = ?
        WHERE id = ?
      `).run(
        billNo,
        billType,
        clientName,
        projectId,
        billingPeriod,
        billDate,
        parseFloat(billAmount || 0),
        remarks || null,
        currentStatus,
        statusUpdateDate,
        updatedBy,
        parseFloat(amountCertified || 0),
        parseFloat(amountReceived || 0),
        parseFloat(outstandingAmount || 0),
        lastPaymentDate || null,
        expectedPaymentDate || null,
        id
      );

      res.json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/tracked-bills/:id", (req, res) => {
    try {
      const { id } = req.params;
      db.prepare("DELETE FROM tracked_bills WHERE id = ?").run(id);
      db.prepare("DELETE FROM bill_timeline WHERE billId = ?").run(id);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/bill-timelines", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM bill_timeline").all();
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/bill-timelines", (req, res) => {
    try {
      const { id, billId, status, updateDate, updatedBy, remarks } = req.body;
      db.prepare(`
        INSERT INTO bill_timeline (id, billId, status, updateDate, updatedBy, remarks)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        id,
        billId,
        status,
        updateDate,
        updatedBy,
        remarks || null
      );
      res.status(201).json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ------------------------------------
  // Financial Years
  // ------------------------------------
  app.get("/api/financial-years", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM financial_years").all();
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/financial-years", (req, res) => {
    try {
      const { id, name, startDate, endDate, status, totalBilling, totalReceipts, labourCost, materialCost, expenses, profitLoss, closedBy, closedDate } = req.body;
      db.prepare(`
        INSERT INTO financial_years (id, name, startDate, endDate, status, totalBilling, totalReceipts, labourCost, materialCost, expenses, profitLoss, closedBy, closedDate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, name, startDate, endDate, status, 
        parseFloat(totalBilling || 0), parseFloat(totalReceipts || 0), parseFloat(labourCost || 0), 
        parseFloat(materialCost || 0), parseFloat(expenses || 0), parseFloat(profitLoss || 0), 
        closedBy || null, closedDate || null
      );
      res.status(201).json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/financial-years/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { name, startDate, endDate, status, totalBilling, totalReceipts, labourCost, materialCost, expenses, profitLoss, closedBy, closedDate } = req.body;
      db.prepare(`
        UPDATE financial_years
        SET name=?, startDate=?, endDate=?, status=?, totalBilling=?, totalReceipts=?, labourCost=?, materialCost=?, expenses=?, profitLoss=?, closedBy=?, closedDate=?
        WHERE id=?
      `).run(
        name, startDate, endDate, status, 
        parseFloat(totalBilling || 0), parseFloat(totalReceipts || 0), parseFloat(labourCost || 0), 
        parseFloat(materialCost || 0), parseFloat(expenses || 0), parseFloat(profitLoss || 0), 
        closedBy || null, closedDate || null, 
        id
      );
      res.json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/financial-years/:id", (req, res) => {
    try {
      const { id } = req.params;
      db.prepare("DELETE FROM financial_years WHERE id=?").run(id);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 17. Daily Site Summaries
  app.get("/api/daily-summaries", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM daily_site_summaries ORDER BY date DESC").all();
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/generate-daily-summary", async (req, res) => {
    try {
      const { projectId, date } = req.body;
      if (!projectId || !date) {
        return res.status(400).json({ error: "Missing projectId or date" });
      }

      // Fetch project details
      const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(projectId) as any;
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Collect raw data for the specific project and date
      const attendance = db.prepare("SELECT * FROM attendance WHERE projectId = ? AND date = ?").all(projectId, date) as any[];
      const totalWorkers = db.prepare("SELECT COUNT(*) as count FROM workers WHERE projectId = ?").get(projectId) as any;
      const advances = db.prepare("SELECT amount FROM advances WHERE projectId = ? AND date = ?").all(projectId, date) as any[];
      const workerPayments = db.prepare("SELECT netPayment FROM worker_payments WHERE projectId = ? AND date = ?").all(projectId, date) as any[];
      const kharchis = db.prepare("SELECT amount FROM kharchis WHERE projectId = ? AND date = ?").all(projectId, date) as any[];
      
      const ledgerExpenses = db.prepare("SELECT kharchi, mess, workerAdvance, tiffin, travel, machineryMaterial, workerPayment, stationery, others FROM expenses_ledger WHERE projectId = ? AND date = ?").all(projectId, date) as any[];
      
      const issues = db.prepare("SELECT i.qty, m.itemName, m.unit FROM material_issues i JOIN material_items m ON i.itemId = m.id WHERE i.projectId = ? AND i.issueDate = ?").all(projectId, date) as any[];
      const returns = db.prepare("SELECT r.qty, m.itemName, m.unit FROM material_returns r JOIN material_items m ON r.itemId = m.id WHERE r.projectId = ? AND r.returnDate = ?").all(projectId, date) as any[];
      
      const bills = db.prepare("SELECT amount FROM billings WHERE projectId = ? AND certifyDate = ?").all(projectId, date) as any[];
      const cPayments = db.prepare("SELECT amountReceived FROM client_payments WHERE projectId = ? AND date = ?").all(projectId, date) as any[];
      
      const dlrs = db.prepare("SELECT carpenter, fitter, helper, mason, rigger, staff, remarks FROM dlrs WHERE projectId = ? AND date = ?").all(projectId, date) as any[];

      // Yesterday metrics for comparison
      const yesterdayDate = new Date(new Date(date).getTime() - 86400000).toISOString().split('T')[0];
      const yAttendance = db.prepare("SELECT * FROM attendance WHERE projectId = ? AND date = ?").all(projectId, yesterdayDate) as any[];
      const yExpenses = db.prepare("SELECT kharchi, mess, workerAdvance, tiffin, travel, machineryMaterial, workerPayment, stationery, others FROM expenses_ledger WHERE projectId = ? AND date = ?").all(projectId, yesterdayDate) as any[];
      
      const calcExpenses = (list: any[]) => list.reduce((acc, exp) => acc + (exp.kharchi||0) + (exp.mess||0) + (exp.workerAdvance||0) + (exp.tiffin||0) + (exp.travel||0) + (exp.machineryMaterial||0) + (exp.workerPayment||0) + (exp.stationery||0) + (exp.others||0), 0);

      const yesterdayExpTotal = calcExpenses(yExpenses);
      const todayExpTotal = calcExpenses(ledgerExpenses);

      // Build data string
      const rawData = `
        Project Name: ${project.name}
        Date: ${date}
        
        Total Assigned Workers (approx): ${totalWorkers?.count || 0}
        Attendance Records Today: ${attendance.length} (${attendance.filter(a => a.status === 'Present').length} Present, ${attendance.filter(a => a.status === 'Absent').length} Absent)
        Attendance Yesterday: ${yAttendance.filter(a => a.status === 'Present').length} Present
        
        Financials Today:
        Advances: ${advances.length} records, Total: ${advances.reduce((s, a) => s + parseFloat(a.amount || 0), 0)}
        Worker Payments: ${workerPayments.length} records, Total: ${workerPayments.reduce((s, p) => s + parseFloat(p.netPayment || 0), 0)}
        Kharchis (Pocket Money): ${kharchis.length} records, Total: ${kharchis.reduce((s, k) => s + parseFloat(k.amount || 0), 0)}
        Ledger Expenses Today: ${todayExpTotal} from records: ${JSON.stringify(ledgerExpenses)}
        Ledger Expenses Yesterday: ${yesterdayExpTotal}
        
        Materials Today:
        Issued: ${JSON.stringify(issues)}
        Returned: ${JSON.stringify(returns)}
        
        Billing Today:
        Bills Certified: ${bills.reduce((s, b) => s + parseFloat(b.amount || 0), 0)}
        Client Payments Received: ${cPayments.reduce((s, cp) => s + parseFloat(cp.amountReceived || 0), 0)}
        
        Daily Labour Report / Activities Today:
        ${JSON.stringify(dlrs)}
      `;

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
      }
      
      // Dynamic import to avoid breaking if not available globally
      const { Type } = require("@google/genai");
      const ai = getAiClient();
      
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `You are an AI ERP Manager for SN ENTERPRISES. Analyze the following site activity data for the day and generate a concise management site summary. Be professional and objective. Focus on metrics. Calculate the cash outflows. For health status, use 'Green', 'Yellow', or 'Red'. Data:\n\n${rawData}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              workforceSummary: { type: Type.STRING, description: "Total Assigned, Present, Absent, Attendance Percentage." },
              financialSummary: { type: Type.STRING, description: "Today's Expenses, Advances, Worker Payments, Total Cash Outflow." },
              materialSummary: { type: Type.STRING, description: "Materials Issued, Returns, and any Stock alerts." },
              billingSummary: { type: Type.STRING, description: "Bills Raised, Client Payments, Outstanding updates." },
              projectActivitySummary: { type: Type.STRING, description: "Work Completed, Major Activities, Site Diary Notes." },
              aiInsights: { type: Type.STRING, description: "Analyze trends, identify observations (e.g., expenses unusually high, productivity dropping)." },
              riskAlerts: { type: Type.STRING, description: "Identify risks such as low attendance, negative cash flow, missing reports." },
              healthScore: { type: Type.INTEGER, description: "Score out of 100 based on the day's performance metrics." },
              healthStatus: { type: Type.STRING, description: "Green, Yellow, or Red" },
            },
            required: ["workforceSummary", "financialSummary", "materialSummary", "billingSummary", "projectActivitySummary", "aiInsights", "riskAlerts", "healthScore", "healthStatus"],
          },
        },
      });

      const jsonStr = response.text?.trim() || "{}";
      const summaryObj = JSON.parse(jsonStr);
      
      const newId = "sum_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
      
      db.prepare(`
        INSERT INTO daily_site_summaries (id, projectId, date, workforceSummary, financialSummary, materialSummary, billingSummary, projectActivitySummary, aiInsights, riskAlerts, healthScore, healthStatus, generatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(projectId, date) DO UPDATE SET
          workforceSummary = excluded.workforceSummary,
          financialSummary = excluded.financialSummary,
          materialSummary = excluded.materialSummary,
          billingSummary = excluded.billingSummary,
          projectActivitySummary = excluded.projectActivitySummary,
          aiInsights = excluded.aiInsights,
          riskAlerts = excluded.riskAlerts,
          healthScore = excluded.healthScore,
          healthStatus = excluded.healthStatus,
          generatedAt = excluded.generatedAt
      `).run(
        newId, projectId, date, 
        summaryObj.workforceSummary || "", 
        summaryObj.financialSummary || "", 
        summaryObj.materialSummary || "", 
        summaryObj.billingSummary || "", 
        summaryObj.projectActivitySummary || "", 
        summaryObj.aiInsights || "", 
        summaryObj.riskAlerts || "", 
        summaryObj.healthScore || 0, 
        summaryObj.healthStatus || "Red", 
        new Date().toISOString()
      );

      // Return the generated (or updated) object
      const savedDoc = db.prepare("SELECT * FROM daily_site_summaries WHERE projectId = ? AND date = ?").get(projectId, date);
      res.json(savedDoc);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // Serve frontend SPA files correctly in both Dev and Prod

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Enterprise System Server running on http://localhost:${PORT}`);
  });
}

startServer();
