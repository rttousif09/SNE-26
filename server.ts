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
      budget REAL NOT NULL
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
      FOREIGN KEY (workerId) REFERENCES workers(id) ON DELETE CASCADE,
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
  `);

  // Migrate existing databases to make sure they have the new columns
  try {
    db.exec("ALTER TABLE billings ADD COLUMN tds REAL DEFAULT 0");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE billings ADD COLUMN retention REAL DEFAULT 0");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE projects ADD COLUMN clientName TEXT");
  } catch (e) {}

  try {
    db.exec("ALTER TABLE billings ADD COLUMN gst REAL DEFAULT 0");
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
}

initDbSchema();

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  
  // Custom API Route for Industry News
  app.get("/api/external-data/news", async (req, res) => {
    try {
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
      console.error("Gemini API Error:", err);
      res.status(500).json({ error: err.message || "Failed to fetch news." });
    }
  });

  // API Routes

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
      const { id, name, clientName, startDate, completionDate, address, budget } = req.body;
      db.prepare(`
        INSERT INTO projects (id, name, clientName, startDate, completionDate, address, budget)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, name, clientName || null, startDate, completionDate || null, address, parseFloat(budget));
      res.status(201).json({ id, name, clientName, startDate, completionDate, address, budget });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/projects/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { name, clientName, startDate, completionDate, address, budget } = req.body;
      db.prepare(`
        UPDATE projects
        SET name = ?, clientName = ?, startDate = ?, completionDate = ?, address = ?, budget = ?
        WHERE id = ?
      `).run(name, clientName || null, startDate, completionDate || null, address, parseFloat(budget), id);
      res.json({ id, name, clientName, startDate, completionDate, address, budget });
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

  app.post("/api/workers", (req, res) => {
    try {
      const { id, serialNo, workerId, name, projectId, designation, joiningDate, exitDate } = req.body;
      db.prepare(`
        INSERT INTO workers (id, serialNo, workerId, name, projectId, designation, joiningDate, exitDate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, serialNo || null, workerId, name, projectId, designation, joiningDate, exitDate || null);
      res.status(201).json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/workers/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { serialNo, workerId, name, projectId, designation, joiningDate, exitDate } = req.body;
      db.prepare(`
        UPDATE workers
        SET serialNo = ?, workerId = ?, name = ?, projectId = ?, designation = ?, joiningDate = ?, exitDate = ?
        WHERE id = ?
      `).run(serialNo || null, workerId, name, projectId, designation, joiningDate, exitDate || null, id);
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
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/billings", (req, res) => {
    try {
      const { id, srNo, projectId, billNo, workNature, amount, month, certifyDate, tds, retention, gst, hardCopyFile, hardCopyFileName, hardCopyFileType } = req.body;
      db.prepare(`
        INSERT INTO billings (id, srNo, projectId, billNo, workNature, amount, month, certifyDate, tds, retention, gst, hardCopyFile, hardCopyFileName, hardCopyFileType)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        hardCopyFile || null,
        hardCopyFileName || null,
        hardCopyFileType || null
      );
      res.status(201).json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/billings/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { srNo, projectId, billNo, workNature, amount, month, certifyDate, tds, retention, gst, hardCopyFile, hardCopyFileName, hardCopyFileType } = req.body;
      db.prepare(`
        UPDATE billings
        SET srNo = ?, projectId = ?, billNo = ?, workNature = ?, amount = ?, month = ?, certifyDate = ?, tds = ?, retention = ?, gst = ?, hardCopyFile = ?, hardCopyFileName = ?, hardCopyFileType = ?
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
        hardCopyFile || null,
        hardCopyFileName || null,
        hardCopyFileType || null,
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
        status: row.status
      }));
      res.json(formatted);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/client-payments", (req, res) => {
    try {
      const { id, projectId, amountReceived, date, remarks, status } = req.body;
      db.prepare(`
        INSERT INTO client_payments (id, projectId, amountReceived, date, remarks, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, projectId, parseFloat(amountReceived), date, remarks || "", status || "Received");
      res.status(201).json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/client-payments/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { projectId, amountReceived, date, remarks, status } = req.body;
      db.prepare(`
        UPDATE client_payments
        SET projectId = ?, amountReceived = ?, date = ?, remarks = ?, status = ?
        WHERE id = ?
      `).run(projectId, parseFloat(amountReceived), date, remarks || "", status || "Received", id);
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
      const { id, projectId, workerId, amount, paidBy, remarks, date } = req.body;
      db.prepare(`
        INSERT INTO advances (id, projectId, workerId, amount, paidBy, remarks, date)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, projectId, workerId, parseFloat(amount), paidBy, remarks || "", date);
      res.status(201).json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/advances/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { projectId, workerId, amount, paidBy, remarks, date } = req.body;
      db.prepare(`
        UPDATE advances
        SET projectId = ?, workerId = ?, amount = ?, paidBy = ?, remarks = ?, date = ?
        WHERE id = ?
      `).run(projectId, workerId, parseFloat(amount), paidBy, remarks || "", date, id);
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
      const { id, projectId, workerId, month, workAmount, messDeduction, kharchiDeduction, advanceDeduction, netPayment, date, level, workCategory, workDays, ratePerDay, overtimeHours, allowance, supplyAmount, supplyDetails } = req.body;
      db.prepare(`
        INSERT INTO worker_payments (id, projectId, workerId, month, workAmount, messDeduction, kharchiDeduction, advanceDeduction, netPayment, date, level, workCategory, workDays, ratePerDay, overtimeHours, allowance, supplyAmount, supplyDetails)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        supplyDetails || null
      );
      res.status(201).json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/worker-payments/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { projectId, workerId, month, workAmount, messDeduction, kharchiDeduction, advanceDeduction, netPayment, date, level, workCategory, workDays, ratePerDay, overtimeHours, allowance, supplyAmount, supplyDetails } = req.body;
      db.prepare(`
        UPDATE worker_payments
        SET projectId = ?, workerId = ?, month = ?, workAmount = ?, messDeduction = ?, kharchiDeduction = ?, advanceDeduction = ?, netPayment = ?, date = ?, level = ?, workCategory = ?, workDays = ?, ratePerDay = ?, overtimeHours = ?, allowance = ?, supplyAmount = ?, supplyDetails = ?
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
      const { id, workerId, projectId, amount, remarks, date, status } = req.body;
      db.prepare(`
        INSERT INTO approvals (id, workerId, projectId, amount, remarks, date, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, workerId, projectId, parseFloat(amount), remarks || "", date, status || "Pending");
      res.status(201).json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/approvals/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      db.prepare(`
        UPDATE approvals
        SET status = ?
        WHERE id = ?
      `).run(status, id);
      res.json({ id, status });
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
      const { status } = req.body;
      db.prepare(`
        UPDATE payment_sheet_approvals
        SET status = ?
        WHERE id = ?
      `).run(status, id);
      res.json({ id, status });
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
        tiffin, travel, machineryMaterial, workerPayment, stationery, others, bank, crBalance
      } = req.body;
      db.prepare(`
        INSERT INTO expenses_ledger (
          id, date, description, projectId, kharchi, mess, workerAdvance,
          tiffin, travel, machineryMaterial, workerPayment, stationery, others, bank, crBalance
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, date, description, projectId || null,
        parseFloat(kharchi || 0), parseFloat(mess || 0), parseFloat(workerAdvance || 0),
        parseFloat(tiffin || 0), parseFloat(travel || 0), parseFloat(machineryMaterial || 0),
        parseFloat(workerPayment || 0), parseFloat(stationery || 0), parseFloat(others || 0),
        bank || null, parseFloat(crBalance || 0)
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
        tiffin, travel, machineryMaterial, workerPayment, stationery, others, bank, crBalance
      } = req.body;
      db.prepare(`
        UPDATE expenses_ledger
        SET date = ?, description = ?, projectId = ?, kharchi = ?, mess = ?, workerAdvance = ?,
            tiffin = ?, travel = ?, machineryMaterial = ?, workerPayment = ?, stationery = ?, others = ?,
            bank = ?, crBalance = ?
        WHERE id = ?
      `).run(
        date, description, projectId || null,
        parseFloat(kharchi || 0), parseFloat(mess || 0), parseFloat(workerAdvance || 0),
        parseFloat(tiffin || 0), parseFloat(travel || 0), parseFloat(machineryMaterial || 0),
        parseFloat(workerPayment || 0), parseFloat(stationery || 0), parseFloat(others || 0),
        bank || null, parseFloat(crBalance || 0), id
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
          messBookings
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

      // Insert fresh data
      if (backup.projects && Array.isArray(backup.projects)) {
        const insert = db.prepare(`
          INSERT INTO projects (id, name, clientName, startDate, completionDate, address, budget)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        for (const p of backup.projects) {
          insert.run(p.id, p.name, p.clientName || null, p.startDate, p.completionDate || null, p.address, parseFloat(p.budget));
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
    });

    try {
      transaction();
      res.json({ success: true, message: "Backup database imported successfully!" });
    } catch (err: any) {
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
