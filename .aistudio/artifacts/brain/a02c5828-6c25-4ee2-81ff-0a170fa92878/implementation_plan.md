# Implementation Plan — BOQ01 & JMR01 Modules Redesign

## 1. Executive Summary & Architecture Overview
This plan implements the complete redesign of **BOQ01 (Bill of Quantities & Work Order Management)** and the addition of **JMR01 (Joint Measurement Record System)** for SN ENTERPRISES ERP, based on the Reliance SupplierFirst functional workflow while adhering strictly to the classic SAP GUI desktop ERP visual language (compact 26–30px inputs, pale blue `#1e3a5f`/`#f0f4f8` color palette, dense ALV tables, square flat controls, fixed headers, and persistent action footers).

The solution operates 100% offline using **React 19**, **TypeScript**, **Express**, **SQLite (via `better-sqlite3`)**, and **Electron**.

---

## 2. User Review Required & Design Alignment
- **Navigation Placement**: JMR01 added to the primary ERP Sidebar under "BOQ & Measurements" (`tcode: 'JMR01'`) and accessible directly from BOQ01 with quick-jump action buttons.
- **Workflow State Machine**:
  - **BOQ01**: `Draft` → `Submitted` → `Approved` → `Active` → `In Progress` → `Completed` → `Closed` / `Revised`.
  - **JMR01**: `Draft` → `Submitted` → `Under Verification` → `Approved` → `Partially Billed` → `Billed` (with `Returned` / `Rejected`).
- **Billing Integration**: RA Billing (`BIL01`) can pull approved unbilled quantities directly from approved JMRs, recording clear allocation links without double-counting.

---

## 3. Database Schema & SQLite Migrations (Server-side)
All migrations will be idempotent, non-destructive, and executed inside `server.ts`.

### A. New SQLite Tables:
1. **`jmrs`**:
   - `id TEXT PRIMARY KEY`
   - `jmrNo TEXT NOT NULL UNIQUE` (e.g. `JMR-PRJ-2026-001`)
   - `projectId TEXT NOT NULL`
   - `boqId TEXT NOT NULL`
   - `company TEXT DEFAULT 'SN ENTERPRISES'`
   - `clientName TEXT NOT NULL`
   - `workOrderNo TEXT`
   - `date TEXT NOT NULL`
   - `startDate TEXT`
   - `endDate TEXT`
   - `location TEXT`
   - `referenceNo TEXT`
   - `remarks TEXT`
   - `items TEXT` (JSON array of `JMRItem` records containing measurement rows, deductions, net quantities, amounts)
   - `status TEXT NOT NULL DEFAULT 'Draft'`
   - `preparedBy TEXT`
   - `preparedDate TEXT`
   - `submittedBy TEXT`
   - `submittedDate TEXT`
   - `verifiedBy TEXT`
   - `verifiedDate TEXT`
   - `approvedBy TEXT`
   - `approvedDate TEXT`
   - `approvalRemarks TEXT`
   - `returnReason TEXT`
   - `linkedBillId TEXT`
   - `linkedBillNo TEXT`
   - `createdDate TEXT`
   - `modifiedDate TEXT`
2. **`jmr_audit_logs`**:
   - `id TEXT PRIMARY KEY`
   - `jmrNo TEXT NOT NULL`
   - `timestamp TEXT NOT NULL`
   - `username TEXT NOT NULL`
   - `action TEXT NOT NULL`
   - `details TEXT`
3. **`jmr_bill_allocations`**:
   - `id TEXT PRIMARY KEY`
   - `jmrId TEXT NOT NULL`
   - `billId TEXT NOT NULL`
   - `boqItemId TEXT NOT NULL`
   - `billedQuantity REAL NOT NULL`
   - `billedAmount REAL NOT NULL`
   - `allocationDate TEXT NOT NULL`

### B. Safe Migrations on Existing `boqs` Table:
- Ensure columns exist: `company`, `title`, `contractRef`, `effectiveDate`, `currency`, `attachments`.

---

## 4. API Endpoints (`server.ts`)
- `GET /api/jmrs` — Retrieve all JMRs (with optional filter by `projectId` and `boqId`).
- `GET /api/jmrs/:id` — Retrieve single JMR details with items.
- `POST /api/jmrs` — Create new JMR (Draft or Submitted) with audit logging.
- `PUT /api/jmrs/:id` — Update JMR (Draft editing, Submission, Verification, Approval, Return).
- `DELETE /api/jmrs/:id` — Delete Draft JMR (protected against deleting approved/billed JMRs).
- `GET /api/jmrs-audit-logs` & `POST /api/jmrs-audit-logs` — Audit log trail.
- `GET /api/jmr-allocations/:billId` — Retrieve JMR allocations for an RA bill.
- `POST /api/jmr-allocations` — Record JMR to Billing allocation.

---

## 5. TypeScript Data Models (`src/types.ts`)
- Extended `BOQItem`: `section`, `subSection`, `itemNumber`, `contractQuantity`, `unitRate`, `approvedRevisedQuantity`, `approvedRevisedRate`, `revisedAmount`, `measuredQuantity`, `billedQuantity`, `balanceQuantity`, `drawingRef`.
- `JMRMeasurementRow`:
  - `id`: string
  - `entryType`: `'Add'` | `'Subtract'`
  - `startDate`: string
  - `endDate`: string
  - `location`: string (Grid / Floor / Axis)
  - `equipmentNo`?: string
  - `method`: `'direct'` | `'dimensions'` | `'length_width'` | `'multiplier'` | `'count'`
  - `length`: number
  - `width`: number
  - `height`: number
  - `numberOfTimes`: number (multiplier, default 1)
  - `baseQuantity`: number
  - `calculatedQuantity`: number
  - `remarks`?: string
  - `description`?: string
- `JMRItem`:
  - `id`: string
  - `boqItemId`: string
  - `itemNumber`: string
  - `itemCode`: string
  - `description`: string (Full un-truncated specification)
  - `unit`: string
  - `rate`: number
  - `contractQuantity`: number
  - `previouslyApprovedQuantity`: number
  - `availableContractQuantity`: number
  - `netQuantity`: number (Sum of Add − Sum of Subtract)
  - `currentClaimAmount`: number
  - `measurementRows`: `JMRMeasurementRow[]`
  - `remarks`?: string
- `JMR`: Full record structure with header, workflow timestamps, user signatories, and audit status.

---

## 6. Frontend Modules & UI Components
### A. PART A — BOQ01: Redesigned BOQ & Work Order Module (`src/pages/BOQPage.tsx`)
- **A1. Order Register**:
  - Status tabs: `All BOQs`, `Draft`, `Approved`, `Active Work Orders`, `In Progress`, `Completed`, `Closed`.
  - Search & filter: BOQ No, WO / PO No, Project, Item Description, Client, Date Range.
  - SAP ALV table with expandable rows showing item count, measurement progress bar, contract vs billed amounts, balance value.
  - Action bar: `Create`, `Change`, `Display`, `Copy`, `Delete Draft`, `Import Excel`, `Export Excel`, `Print`, `Refresh`.
- **A2. Master Screen**:
  - Compact SAP-style header: Company (`SN ENTERPRISES`), Project, Client, BOQ No, Contract Ref, Date, Revision, Currency, Status, Remarks.
  - 6 Compact Tabs:
    1. `BOQ Items` (ALV grid with expandable descriptions, section subtotals, grand totals)
    2. `BOQ Summary` (Section breakdown, category breakdown, execution percentage)
    3. `Revisions / Variations` (Audit log of revisions, baseline snapshots, extra variation register)
    4. `Joint Measurements (JMR)` (Direct list of linked JMRs for this BOQ with progress tracking)
    5. `Attachments` (Specification drawings, contract agreements)
    6. `Change History` (Authoritative security log)

### B. PART B — JMR01: Joint Measurement Record Module (`src/pages/JMRPage.tsx`)
- **B1. JMR Register**:
  - Status tabs: `Draft`, `Submitted`, `Under Verification`, `Returned`, `Approved`, `Partially Billed`, `Billed`, `All`.
  - SAP Toolbar: `Create JMR`, `Display`, `Edit / Change`, `Verify`, `Approve`, `Return`, `Export Excel`, `Print PDF`, `Refresh`.
  - Columns: JMR Number, Project, BOQ/WO No, Client, Measurement Period, JMR Date, Total Quantity, Claim Amount, Status, Prepared By, Verified By, Approved By, Linked RA Bill.
- **B2 & B3. Create JMR Wizard & BOQ Item Selection**:
  - Step 1: Select Project & Active Approved BOQ.
  - Step 2: Set JMR Date, Period (Start & End), Location, Ref No, Remarks.
  - Step 3: Selection Table (matches reference screenshots):
    - Checkbox selection with "Select All".
    - Displays: Item No, Item Code, Description, Contract Qty, Previously Approved JMR Qty, Previously Billed Qty, Available Contract Qty, UOM, Rate, Current JMR Claimed Qty, Current Claim Amount.
    - Search & filter by description or item code.
    - "Open Measurement Window" action for each selected item.
    - Bulk Excel upload/template download button.
  - Step 4: Review Totals and Save as `Draft` or `Submit for Verification`.

### C. PART C — Measurement Entry Window (`src/components/JMRMeasurementModal.tsx`)
- High-priority modal matching the reference "Service Description" popup:
  - **C1. Pinned Header**: BOQ Item No, Full Description (scrollable tooltip/box), Unit, Rate, Contract Qty, Previously Approved Qty, Available Contract Qty.
  - **C2. Measurement Rows**:
    - Add / Subtract entry type switcher.
    - Measurement dates (Start & End).
    - Location / Grid / Floor & Equipment Number.
    - Method: Direct, Dimensions ($L \times W \times H$), Area ($L \times W$), Multiplier ($Base \times Times$), Count.
    - Number of Times multiplier.
    - Live calculated quantity and remarks.
  - **C3. Separate Add and Subtract Transactions**:
    - `+ Add Measurement` and `− Subtract Measurement` buttons.
    - Never overwrites previous rows; sub-total adds and deductions computed cleanly.
    - Live Net JMR Quantity ($= \sum \text{Add} - \sum \text{Subtract}$) and Live Claim Amount.
    - Validation prevents negative dimensions and negative net claims.
  - **C4. Pinned Footer & Scrolling Fix**:
    - Header pinned at top (`flex-shrink-0`).
    - Body scrollable with `min-h-0 overflow-y-auto`.
    - Footer pinned at bottom with `Cancel`, `Save Draft`, `Done` (`flex-shrink-0`).
    - Enforced `max-h-[90vh]` tested for $1366 \times 768$ and Electron restored windows.

### D. PART E — JMR Excel Upload & Template (`src/components/JMRExcelModal.tsx`)
- Excel upload & template generator for measurement rows:
  - Download template pre-filled with the selected BOQ's item numbers, codes, and descriptions.
  - Upload filled measurement Excel/CSV file with column mapping, preview, item validation, and atomic import.

### E. PART G — RA Billing Integration (`src/pages/Billing.tsx`)
- In `Billing.tsx` (BIL01), add a "Pull from Approved JMR" option:
  - Lets the user pick approved JMRs for the project.
  - Auto-populates measurement items with `Eligible Bill Quantity = Approved JMR Quantity − Previously Billed Quantity`.
  - Prevents duplicate billing and tracks partial allocations back to JMR items.

### F. PART H — Printable JMR PDF (`src/utils/jmrExport.ts`)
- Multi-page professional PDF using `jspdf` and `jspdf-autotable`:
  - Title: `SN ENTERPRISES ERP — JOINT MEASUREMENT RECORD (JMR01)`.
  - Project, Client, Contractor, Work Order No, JMR No, Period, and Date.
  - Item details table with Add/Subtract breakdown, net quantities, rates, and amounts.
  - Signatory blocks: Prepared By, Contractor Representative, Site Engineer, Client Representative, Approved By.

---

## 7. Verification & Testing Strategy
1. **BOQ Master**: Create a 100-item BOQ, paste a 3,000-character description, verify persistence in SQLite without truncation.
2. **JMR Creation**: Create JMR for BOQ, select items, add multiple measurements, subtract deduction, verify live net quantity math.
3. **Responsive Scrolling**: Test modal on 1366×768 resolution; verify Save and Done are never hidden.
4. **Approval Workflow**: Move from Draft → Submitted → Under Verification → Approved. Verify locked state after approval.
5. **Billing Integration**: Create an RA Bill pulling from approved JMR, verify partial and full billing calculations.
6. **PDF Generation**: Verify JMR PDF export with signature sections.
7. **Offline Compatibility**: Verify compilation (`compile_applet`) and linting (`lint_applet`) pass with 0 errors.
