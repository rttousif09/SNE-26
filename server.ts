import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import dotenv from "dotenv";

dotenv.config();

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
  `);

  // Insert initial seed data if table is completely empty
  const countRow = db.prepare("SELECT COUNT(*) as count FROM projects").get() as { count: number };
  if (countRow.count === 0) {
    console.log("Seeding initial database content because DB is empty...");
    const baseProject = {
      id: "p1",
      name: "SDA Complex",
      startDate: "2025-01-10",
      completionDate: "2025-12-31",
      address: "Phase 1, Downtown",
      budget: 15000000
    };
    db.prepare(`
      INSERT INTO projects (id, name, startDate, completionDate, address, budget)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(baseProject.id, baseProject.name, baseProject.startDate, baseProject.completionDate, baseProject.address, baseProject.budget);

    const baseWorkers = [
      { id: "w1", serialNo: "1", workerId: "W-001", name: "Ramesh Kumar", projectId: "p1", designation: "Mason", joiningDate: "2025-01-12", exitDate: "" },
      { id: "w2", serialNo: "2", workerId: "W-002", name: "Suresh Singh", projectId: "p1", designation: "Labor", joiningDate: "2025-01-12", exitDate: "" }
    ];
    const insertWorker = db.prepare(`
      INSERT INTO workers (id, serialNo, workerId, name, projectId, designation, joiningDate, exitDate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    baseWorkers.forEach(w => insertWorker.run(w.id, w.serialNo, w.workerId, w.name, w.projectId, w.designation, w.joiningDate, w.exitDate));

    db.prepare(`
      INSERT INTO billings (id, srNo, projectId, billNo, workNature, amount, month, certifyDate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run("b1", "1", "p1", "BILL-001", "Foundation Work", 250000, "2025-02", "2025-02-28");

    db.prepare(`
      INSERT INTO client_payments (id, projectId, amountReceived, date, remarks, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run("cp1", "p1", 200000, "2025-03-05", "First installment received", "Received");

    db.prepare(`
      INSERT INTO kharchis (id, projectId, workerId, date, amount)
      VALUES (?, ?, ?, ?, ?)
    `).run("k1", "p1", "w2", "2025-02-02", 500);
    db.prepare(`
      INSERT INTO kharchis (id, projectId, workerId, date, amount)
      VALUES (?, ?, ?, ?, ?)
    `).run("k2", "p1", "w2", "2025-02-09", 500);

    db.prepare(`
      INSERT INTO advances (id, projectId, workerId, amount, paidBy, remarks, date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run("a1", "p1", "w1", 5000, "Admin Team", "Medical emergency emergency", "2025-02-15");
  }
}

initDbSchema();

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));

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
      const { id, name, startDate, completionDate, address, budget } = req.body;
      db.prepare(`
        INSERT INTO projects (id, name, startDate, completionDate, address, budget)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, name, startDate, completionDate || null, address, parseFloat(budget));
      res.status(201).json({ id, name, startDate, completionDate, address, budget });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/projects/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { name, startDate, completionDate, address, budget } = req.body;
      db.prepare(`
        UPDATE projects
        SET name = ?, startDate = ?, completionDate = ?, address = ?, budget = ?
        WHERE id = ?
      `).run(name, startDate, completionDate || null, address, parseFloat(budget), id);
      res.json({ id, name, startDate, completionDate, address, budget });
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
      const { id, srNo, projectId, billNo, workNature, amount, month, certifyDate } = req.body;
      db.prepare(`
        INSERT INTO billings (id, srNo, projectId, billNo, workNature, amount, month, certifyDate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, srNo || null, projectId, billNo, workNature, parseFloat(amount), month, certifyDate);
      res.status(201).json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/billings/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { srNo, projectId, billNo, workNature, amount, month, certifyDate } = req.body;
      db.prepare(`
        UPDATE billings
        SET srNo = ?, projectId = ?, billNo = ?, workNature = ?, amount = ?, month = ?, certifyDate = ?
        WHERE id = ?
      `).run(srNo || null, projectId, billNo, workNature, parseFloat(amount), month, certifyDate, id);
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
      const { id, projectId, workerId, month, workAmount, messDeduction, kharchiDeduction, advanceDeduction, netPayment, date } = req.body;
      db.prepare(`
        INSERT INTO worker_payments (id, projectId, workerId, month, workAmount, messDeduction, kharchiDeduction, advanceDeduction, netPayment, date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, projectId, workerId, month, parseFloat(workAmount), parseFloat(messDeduction), parseFloat(kharchiDeduction), parseFloat(advanceDeduction), parseFloat(netPayment), date);
      res.status(201).json(req.body);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/worker-payments/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { projectId, workerId, month, workAmount, messDeduction, kharchiDeduction, advanceDeduction, netPayment, date } = req.body;
      db.prepare(`
        UPDATE worker_payments
        SET projectId = ?, workerId = ?, month = ?, workAmount = ?, messDeduction = ?, kharchiDeduction = ?, advanceDeduction = ?, netPayment = ?, date = ?
        WHERE id = ?
      `).run(projectId, workerId, month, parseFloat(workAmount), parseFloat(messDeduction), parseFloat(kharchiDeduction), parseFloat(advanceDeduction), parseFloat(netPayment), date, id);
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
        attendance
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/backup/import", (req, res) => {
    const backup = req.body;
    const transaction = db.transaction(() => {
      // Clear all data
      db.prepare("DELETE FROM worker_payments").run();
      db.prepare("DELETE FROM advances").run();
      db.prepare("DELETE FROM kharchis").run();
      db.prepare("DELETE FROM client_payments").run();
      db.prepare("DELETE FROM billings").run();
      db.prepare("DELETE FROM workers").run();
      db.prepare("DELETE FROM attendance").run();
      db.prepare("DELETE FROM projects").run();

      // Insert fresh data
      if (backup.projects && Array.isArray(backup.projects)) {
        const insert = db.prepare(`
          INSERT INTO projects (id, name, startDate, completionDate, address, budget)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const p of backup.projects) {
          insert.run(p.id, p.name, p.startDate, p.completionDate || null, p.address, parseFloat(p.budget));
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
          INSERT INTO billings (id, srNo, projectId, billNo, workNature, amount, month, certifyDate)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const b of backup.billings) {
          insert.run(b.id, b.srNo || null, b.projectId, b.billNo, b.workNature, parseFloat(b.amount), b.month, b.certifyDate);
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
          INSERT INTO worker_payments (id, projectId, workerId, month, workAmount, messDeduction, kharchiDeduction, advanceDeduction, netPayment, date)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const wp of backup.workerPayments) {
          insert.run(wp.id, wp.projectId, wp.workerId, wp.month, parseFloat(wp.workAmount), parseFloat(wp.messDeduction), parseFloat(wp.kharchiDeduction), parseFloat(wp.advanceDeduction), parseFloat(wp.netPayment), wp.date);
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
