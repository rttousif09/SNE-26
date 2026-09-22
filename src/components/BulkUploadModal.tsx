import React, { useState, useRef, useEffect } from 'react';
import { SAPSelect } from './SAPSelect';
import Papa from 'papaparse';
import { read, utils, write } from 'xlsx';
import { normalizeImportedDate, formatToUIDate, isDateField, isExcelDateFormat } from '../lib/importDateUtils';
import { 
  Upload, X, AlertTriangle, FileSpreadsheet, Download, 
  CheckCircle2, Info, Settings2, Eye, ArrowRight,
  HelpCircle, ChevronDown, ChevronUp, RefreshCw, AlertCircle
} from 'lucide-react';
import { AnimateModal, UploadProgressBar } from './AnimatedERP';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (data: any[]) => Promise<void>;
  expectedColumns: string[];
  entityName: string;
  projectsContext?: any[]; // for project name lookup
  workersContext?: any[];  // for worker name/ID lookup
}

// Map friendly headers to database properties
const KEY_VARIATIONS: Record<string, string[]> = {
  projectId: ['project', 'projectid', 'projectname', 'site', 'sitename', 'siteid', 'project_id', 'site_id', 'site_name'],
  workerId: ['workerid', 'empid', 'idno', 'workeridno', 'worker_id', 'employeeid', 'worker', 'worker_name', 'employee_name', 'employee'],
  serialNo: ['serialno', 'srno', 'sno', 'serialnum', 'serial_no', 'sr_no', 's.no', 'slno'],
  name: ['name', 'workername', 'fullname', 'nameoftheworker', 'worker_name', 'employee_name'],
  designation: ['designation', 'role', 'workerrole', 'category', 'workertype', 'designation_name', 'type_of_worker'],
  joiningDate: ['joiningdate', 'doj', 'joindate', 'joining_date', 'date_of_joining', 'dateofjoining'],
  exitDate: ['exitdate', 'doe', 'exit_date', 'date_of_exit', 'dateofexit'],
  attendanceDate: ['attendancedate', 'attendance_date', 'present_date', 'duty_date'],
  startDate: ['startDate', 'startdate', 'start_date', 'commencementdate', 'commencement_date'],
  completionDate: ['completionDate', 'completiondate', 'enddate', 'completion_date', 'end_date', 'project_end_date'],
  clientName: ['clientName', 'clientname', 'client', 'client_name', 'customer'],
  address: ['address', 'location', 'siteaddress', 'site_address', 'project_location'],
  budget: ['budget', 'projectbudget', 'costlimit', 'value', 'project_value', 'total_budget'],
  status: ['status', 'state', 'currentstatus', 'current_status'],
  amount: ['amount', 'value', 'price', 'amt', 'total', 'subtotal', 'bill_amount'],
  amountReceived: ['amountReceived', 'amountreceived', 'received', 'receivedamount', 'payment', 'cashreceived', 'amount_received'],
  date: ['date', 'datepaid', 'txndate', 'transactiondate', 'entrydate', 'date_paid', 'payment_date', 'txn_date'],
  fromDate: ['fromDate', 'fromdate', 'start_date', 'from_date', 'start', 'period_from'],
  toDate: ['toDate', 'todate', 'end_date', 'to_date', 'end', 'period_to'],
  workerCount: ['workerCount', 'workercount', 'workers', 'numworkers', 'noofworkers', 'total_workers'],
  ratePerWeek: ['ratePerWeek', 'rateperweek', 'weekly_rate', 'rate', 'week_rate'],
  totalComputed: ['totalComputed', 'totalcomputed', 'computedtotal', 'total_computed', 'amount_computed'],
  amountPaid: ['amountPaid', 'amountpaid', 'paid', 'totalpaid', 'amount_paid'],
  amountDue: ['amountDue', 'amountdue', 'due', 'totaldue', 'balance', 'amount_due'],
  paidTo: ['paidTo', 'paidto', 'receivedby', 'paid_to', 'payee'],
  paymentDate: ['paymentDate', 'paymentdate', 'date_paid', 'pay_date', 'payment_date'],
  advanceDate: ['advanceDate', 'advancedate', 'advance_date', 'date_advance'],
  billingDate: ['billingDate', 'billingdate', 'billing_date', 'bill_date', 'billdate'],
  invoiceDate: ['invoiceDate', 'invoicedate', 'invoice_date', 'date_of_invoice'],
  certificationDate: ['certificationDate', 'certificationdate', 'certification_date', 'certifieddate', 'certifydate', 'certified_date'],
  issueDate: ['issueDate', 'issuedate', 'issue_date', 'date_of_issue'],
  returnDate: ['returnDate', 'returndate', 'return_date', 'date_of_return'],
  transferDate: ['transferDate', 'transferdate', 'transfer_date'],
  approvalDate: ['approvalDate', 'approvaldate', 'approval_date'],
  projectStartDate: ['projectStartDate', 'projectstartdate', 'project_start_date'],
  projectCompletionDate: ['projectCompletionDate', 'projectcompletiondate', 'project_completion_date'],
  agreementDate: ['agreementDate', 'agreementdate', 'agreement_date'],
  workStartDate: ['workStartDate', 'workstartdate', 'work_start_date'],
  financialDate: ['financialDate', 'financialdate', 'financial_date'],
  expenseDate: ['expenseDate', 'expensedate', 'expense_date'],
  documentDate: ['documentDate', 'documentdate', 'document_date'],
  expiryDate: ['expiryDate', 'expirydate', 'expiry_date', 'valid_till', 'expiration_date'],
  paidBy: ['paidBy', 'paidby', 'paymentmode', 'payee', 'source', 'paid_by', 'mode_of_payment', 'payment_mode', 'mode'],
  paidByDetails: ['paidByDetails', 'paidbydetails', 'mode_details', 'reference', 'utr', 'cheque_no', 'payment_reference'],
  remarks: ['remarks', 'description', 'notes', 'comment', 'narrative', 'particulars'],
  itemName: ['itemName', 'itemname', 'materialname', 'nameofitem', 'item_name', 'material_name', 'item_description'],
  itemCode: ['itemCode', 'itemcode', 'code', 'materialcode', 'item_code', 'material_code'],
  category: ['category', 'group', 'type', 'assetcategory', 'materialtype', 'asset_category', 'classification'],
  unit: ['unit', 'uom', 'measurementunit', 'units', 'unit_of_measure'],
  qty: ['qty', 'quantity', 'count', 'amount_executed', 'vol', 'pieces'],
  rate: ['rate', 'costperunit', 'unitrate', 'unitcost', 'price_per_unit'],
  purchaseCost: ['purchaseCost', 'purchasecost', 'cost', 'purchaserate', 'pricepaid', 'purchase_cost'],
  purchaseDate: ['purchaseDate', 'purchasedate', 'dateofpurchase', 'buydate', 'purchase_date'],
  brand: ['brand', 'manufacturer', 'make', 'brand_name'],
  assetCode: ['assetCode', 'assetcode', 'code', 'tag', 'tagno', 'idno', 'asset_code', 'equipment_code'],
  currentSiteId: ['currentSiteId', 'currentsite', 'assignsite', 'siteid', 'current_site', 'project_site'],
  assignedTo: ['assignedTo', 'assignedto', 'worker_assigned', 'assignee', 'issued_to'],
  kharchi: ['kharchi', 'kharchi_amount', 'kharchiamount', 'kharchi_rs'],
  mess: ['mess', 'mess_amount', 'messamount', 'mess_rs'],
  workerAdvance: ['workerAdvance', 'workeradvance', 'advance', 'advance_amount', 'advance_rs'],
  tiffin: ['tiffin', 'tiffin_charges', 'tiffinamount', 'tiffin_rs'],
  travel: ['travel', 'travel_charges', 'travelamount', 'travel_rs'],
  machineryMaterial: ['machineryMaterial', 'machinerymaterial', 'machinery', 'materials', 'machinery_rs'],
  workerPayment: ['workerPayment', 'workerpayment', 'payment', 'worker_paid', 'worker_rs'],
  stationery: ['stationery', 'stationery_charges', 'office_supplies', 'stationery_rs'],
  others: ['others', 'other_charges', 'miscellaneous', 'misc', 'others_rs'],
  bank: ['bank', 'bank_name', 'account', 'source_bank', 'paid_from'],
  crBalance: ['crBalance', 'crbalance', 'carryover', 'opening_cash', 'balance_cr', 'cash_carried_forward'],
  carpenter: ['carpenter', 'carpenters', 'carpenter_qty', 'carpenter_count'],
  fitter: ['fitter', 'fitters', 'fitter_qty', 'fitter_count'],
  helper: ['helper', 'helpers', 'helper_qty', 'helper_count'],
  mason: ['mason', 'masons', 'mason_qty', 'mason_count'],
  rigger: ['rigger', 'riggers', 'rigger_qty', 'rigger_count'],
  staff: ['staff', 'staff_qty', 'supervisors', 'staff_count'],
  billNo: ['billNo', 'billno', 'invoice', 'invoiceno', 'bill_number', 'bill_no'],
  workNature: ['workNature', 'worknature', 'work_description', 'description_of_work', 'nature_of_work'],
  month: ['month', 'period', 'billing_month', 'billing_period'],
  certifyDate: ['certifyDate', 'certifydate', 'certified_date', 'certification_date']
};

function getSampleValue(col: string): any {
  const norm = col.toLowerCase();
  if (norm.includes('project') || norm.includes('site')) return 'S3 Eco City';
  if (norm.includes('worker') || norm.includes('emp') || norm.includes('employee')) return 'John Doe';
  if (norm.includes('serial') || norm.includes('srno') || norm.includes('sno') || norm.includes('s.no')) return '1';
  if (norm.includes('name')) return 'John Doe';
  if (norm.includes('designation')) return 'Mason';
  if (isDateField(col)) return '2026-08-28';
  if (norm.includes('amount') || norm.includes('budget') || norm.includes('cost') || norm.includes('balance') || norm.includes('kharchi') || norm.includes('mess') || norm.includes('advance') || norm.includes('tiffin') || norm.includes('travel') || norm.includes('machinery') || norm.includes('stationery') || norm.includes('others')) return 15000;
  if (norm.includes('category')) return 'Power Tools';
  if (norm.includes('unit')) return 'Units';
  if (norm.includes('qty') || norm.includes('qtyexecuted') || norm.includes('quantity')) return 120;
  if (norm.includes('rate')) return 550;
  if (norm.includes('brand')) return 'Bosch';
  if (norm.includes('code') || norm.includes('assetcode')) return 'AST-8829';
  if (norm.includes('billno')) return 'BILL-9901';
  if (norm.includes('worknature')) return 'Brickwork plastering';
  if (norm.includes('month')) return '2026-06';
  if (norm.includes('carpenter') || norm.includes('fitter') || norm.includes('helper') || norm.includes('mason') || norm.includes('rigger') || norm.includes('staff')) return 2;
  return 'Sample Text';
}

function getColumnFriendlyDescription(col: string): string {
  const norm = col.toLowerCase();
  if (col === 'projectId') return 'Site / Project reference';
  if (col === 'workerId') return 'Worker / Employee ID or Name';
  if (col === 'serialNo') return 'Row sequence index';
  if (col === 'crBalance') return 'Carry Forward cash credit';
  if (col === 'amountPaid') return 'Actual Cash Disbursed';
  if (col === 'amountDue') return 'Pending outstanding balance';
  if (col === 'totalComputed') return 'Calculated wages/bill total';
  if (isDateField(col)) return 'Date (YYYY-MM-DD or DD-MM-YYYY)';
  if (norm.includes('qty')) return 'Quantity number';
  if (norm.includes('rate')) return 'Rate per unit amount';
  return col.replace(/([A-Z])/g, ' $1').trim();
}

export function BulkUploadModal({
  isOpen,
  onClose,
  onUpload,
  expectedColumns,
  entityName,
  projectsContext = [],
  workersContext = [],
}: BulkUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [dateFormattedHeaders, setDateFormattedHeaders] = useState<Set<string>>(new Set());
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [processedData, setProcessedData] = useState<any[]>([]);
  
  const [showMappingPanel, setShowMappingPanel] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [warningsCount, setWarningsCount] = useState(0);
  const [invalidDatesCount, setInvalidDatesCount] = useState(0);
  const [resolvedProjectsCount, setResolvedProjectsCount] = useState(0);
  const [resolvedWorkersCount, setResolvedWorkersCount] = useState(0);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-set the initial configuration mapping when rawHeaders alters
  useEffect(() => {
    if (rawHeaders.length === 0) return;

    const initialMaps: Record<string, string> = {};
    expectedColumns.forEach((expectedKey) => {
      const normExpected = expectedKey.toLowerCase();
      const variations = KEY_VARIATIONS[expectedKey] || [normExpected];

      // Find standard matches
      const matchedHeader = rawHeaders.find((h) => {
        const normH = h.toLowerCase().replace(/[\s_\-]/g, '');
        return (
          normH === normExpected ||
          variations.some((v) => v.toLowerCase().replace(/[\s_\-]/g, '') === normH)
        );
      });

      if (matchedHeader) {
        initialMaps[expectedKey] = matchedHeader;
      } else {
        // Fallback: Check if there's an exact case-insensitive match
        const exactCiMatch = rawHeaders.find((h) => h.toLowerCase() === normExpected);
        if (exactCiMatch) {
          initialMaps[expectedKey] = exactCiMatch;
        } else {
          initialMaps[expectedKey] = ''; // Left for manual selection or empty default value
        }
      }
    });

    setMappings(initialMaps);
  }, [rawHeaders, expectedColumns]);

  // Recalculate parsed and matched rows when mappings or rawRows changes
  useEffect(() => {
    if (rawRows.length === 0) return;
    recalculateProcessedRows();
  }, [mappings, rawRows, projectsContext, workersContext, dateFormattedHeaders]);

  const recalculateProcessedRows = () => {
    const list: any[] = [];
    let warnCount = 0;
    let invDateCount = 0;
    let resolvedProj = 0;
    let resolvedWork = 0;
    let validationErrors: string[] = [];

    // Check if critical identification columns are unmapped
    const criticalFields = expectedColumns.filter(c => ['name', 'itemName', 'date', 'projectId', 'amount'].includes(c));
    const unmappedCritical = criticalFields.filter(col => !mappings[col]);

    if (unmappedCritical.length > 0) {
      validationErrors.push(`Critical inputs are not mapped: [${unmappedCritical.map(getColumnFriendlyDescription).join(', ')}]. Please configure mappings above.`);
    }

    rawRows.forEach((row, idx) => {
      const newRow: any = { _rowNum: idx + 1, _hasInvalidDate: false };

      // Initialize with correct key defaults
      expectedColumns.forEach((col) => {
        newRow[col] = '';
      });

      // Align Excel row and cell values using columns mappings
      expectedColumns.forEach((expectedKey) => {
        const rawHeaderKey = mappings[expectedKey];
        if (!rawHeaderKey) return; // Skip if user explicitly ignored this column

        const val = row[rawHeaderKey];
        if (val !== undefined && val !== null && val !== '') {
          // Check if it is a date column (target is date field, source header is date, or source cell was date-formatted)
          const isDateColumn = isDateField(expectedKey) || isDateField(rawHeaderKey) || dateFormattedHeaders.has(rawHeaderKey);
          
          // Convert numbers correctly (strip characters that break parsing)
          const isNumeric = ['budget', 'amount', 'amountReceived', 'purchaseCost', 'rate', 'qty', 'workerCount', 'ratePerWeek', 'totalComputed', 'amountPaid', 'amountDue', 'kharchi', 'mess', 'workerAdvance', 'tiffin', 'travel', 'machineryMaterial', 'workerPayment', 'stationery', 'others', 'crBalance', 'carpenter', 'fitter', 'helper', 'mason', 'rigger', 'staff'].includes(expectedKey);
          
          if (isDateColumn) {
            newRow[`_${expectedKey}Raw`] = val;
            const parsedDate = normalizeImportedDate(val, {
              isDateColumn: true,
              columnName: rawHeaderKey,
              targetField: expectedKey,
              isDateFormatted: dateFormattedHeaders.has(rawHeaderKey)
            });
            newRow[expectedKey] = parsedDate;
            if (parsedDate === 'Invalid Date') {
              newRow[`_${expectedKey}Warning`] = `Invalid Date: "${val}"`;
              newRow._hasInvalidDate = true;
              warnCount++;
              invDateCount++;
              if (validationErrors.length < 5) {
                validationErrors.push(`Row ${idx + 1}: ${getColumnFriendlyDescription(expectedKey)} is an Invalid Date ("${val}"). Please correct it before import.`);
              }
            }
          } else if (isNumeric) {
            const strVal = String(val).replace(/[^\d.\-]/g, '');
            newRow[expectedKey] = strVal ? Number(strVal) : 0;
          } else {
            // General clean strings
            newRow[expectedKey] = String(val).trim();
          }
        }
      });

      // 1. Resolve Project Info (Fuzzy text search matches)
      if (expectedColumns.includes('projectId') && newRow.projectId) {
        const rawProjText = String(newRow.projectId).toLowerCase().trim();
        const foundProj = projectsContext.find(
          (p) =>
            p.id.toLowerCase() === rawProjText ||
            p.name.toLowerCase() === rawProjText ||
            p.name.toLowerCase().includes(rawProjText) ||
            rawProjText.includes(p.name.toLowerCase())
        );

        if (foundProj) {
          newRow.projectId = foundProj.id;
          newRow._projectMatchedName = foundProj.name;
          resolvedProj++;
        } else {
          newRow._projectWarning = `Unresolved: No project records match name "${newRow.projectId}"`;
          warnCount++;
        }
      } else if (expectedColumns.includes('projectId') && !newRow.projectId) {
        newRow._projectWarning = 'Empty Project details';
        warnCount++;
      }

      // 2. Resolve Worker Info (Fuzzy ID/Name lookup)
      if (expectedColumns.includes('workerId') && newRow.workerId) {
        const rawWorkerText = String(newRow.workerId).toLowerCase().trim();
        const foundWorker = workersContext.find(
          (w) =>
            w.id.toLowerCase() === rawWorkerText ||
            w.workerId.toLowerCase() === rawWorkerText ||
            w.name.toLowerCase() === rawWorkerText ||
            w.serialNo?.toLowerCase() === rawWorkerText
        );

        if (foundWorker) {
          newRow.workerId = foundWorker.id;
          newRow._workerMatchedName = foundWorker.name;
          resolvedWork++;
        } else {
          newRow._workerWarning = `Unresolved: Worker "${newRow.workerId}" not found in database`;
          warnCount++;
        }
      } else if (expectedColumns.includes('workerId') && !newRow.workerId) {
        newRow._workerWarning = 'Empty Worker details';
        warnCount++;
      }

      list.push(newRow);
    });

    setErrors(validationErrors);
    setWarningsCount(warnCount);
    setInvalidDatesCount(invDateCount);
    setResolvedProjectsCount(resolvedProj);
    setResolvedWorkersCount(resolvedWork);
    setProcessedData(list);
  };

  /**
   * Allows user to manually fix an invalid date row inline prior to finalizing the import.
   */
  const handleInlineDateFix = (rowIndex: number, columnKey: string, newValue: string) => {
    const normalized = normalizeImportedDate(newValue, true);
    setProcessedData((prev) => {
      const updated = [...prev];
      const targetRow = { ...updated[rowIndex] };
      targetRow[columnKey] = normalized;

      if (normalized && normalized !== 'Invalid Date') {
        delete targetRow[`_${columnKey}Warning`];
        const hasOtherInvalid = expectedColumns.some(
          col => isDateField(col) && targetRow[col] === 'Invalid Date'
        );
        targetRow._hasInvalidDate = hasOtherInvalid;
      } else {
        targetRow[columnKey] = 'Invalid Date';
        targetRow[`_${columnKey}Warning`] = `Invalid Date: "${newValue}"`;
        targetRow._hasInvalidDate = true;
      }

      updated[rowIndex] = targetRow;

      // Recalculate summary error counts
      let newInvCount = 0;
      updated.forEach(r => {
        if (expectedColumns.some(c => isDateField(c) && r[c] === 'Invalid Date')) {
          newInvCount++;
        }
      });
      setInvalidDatesCount(newInvCount);
      if (newInvCount === 0) {
        setErrors(prevErrors => prevErrors.filter(e => !e.includes('Invalid Date')));
      }

      return updated;
    });
  };

  const handleMapChange = (expectedKey: string, rawHeaderValue: string) => {
    setMappings((prev) => ({
      ...prev,
      [expectedKey]: rawHeaderValue,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrors([]);
    setShowMappingPanel(false);

    const fileNameLower = selectedFile.name.toLowerCase();

    // 1. STANDARD EXCEL LOADER
    if (fileNameLower.endsWith('.xlsx') || fileNameLower.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const binaryData = evt.target?.result;
          const workbook = read(binaryData, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Get Raw Headers using array parsing first to maintain order
          const jsonHeadersOnly = utils.sheet_to_json(worksheet, { header: 1 });
          const headers = (jsonHeadersOnly[0] || []) as string[];
          const cleanHeaders = headers.map(h => String(h).trim()).filter(Boolean);
          
          // Detect any columns where cells have date formatting
          const detectedDateCols = new Set<string>();
          if (worksheet && worksheet['!ref']) {
            const range = utils.decode_range(worksheet['!ref']);
            for (let C = range.s.c; C <= range.e.c; ++C) {
              const headerCell = worksheet[utils.encode_cell({ r: range.s.r, c: C })];
              const headerName = headerCell ? String(headerCell.v).trim() : cleanHeaders[C];
              if (!headerName) continue;

              for (let R = range.s.r + 1; R <= Math.min(range.e.r, range.s.r + 20); ++R) {
                const cell = worksheet[utils.encode_cell({ r: R, c: C })];
                if (cell && (cell.t === 'd' || (cell.z && isExcelDateFormat(cell.z)))) {
                  detectedDateCols.add(headerName);
                  break;
                }
              }
            }
          }
          setDateFormattedHeaders(detectedDateCols);

          const parsedRows = utils.sheet_to_json(worksheet, { defval: "" });

          if (parsedRows.length === 0) {
            setErrors(["The Excel spreadsheet contains no data rows."]);
            return;
          }

          setRawHeaders(cleanHeaders);
          setRawRows(parsedRows);
        } catch (err: any) {
          setErrors([`Failed to parse Excel file: ${err.message || err}`]);
        }
      };
      reader.readAsArrayBuffer(selectedFile);
    } 
    // 2. FLAT CSV PARSER FALLBACK
    else {
      setDateFormattedHeaders(new Set());
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            setErrors(results.errors.map((err) => `Row ${err.row}: ${err.message}`));
            return;
          }

          const parsedRows = results.data;
          if (parsedRows.length === 0) {
            setErrors(["The CSV spreadsheet contains no data rows."]);
            return;
          }

          if (results.meta && results.meta.fields) {
            setRawHeaders(results.meta.fields.filter(Boolean));
          } else if (parsedRows[0]) {
            setRawHeaders(Object.keys(parsedRows[0]));
          }

          setRawRows(parsedRows);
        },
        error: (error) => {
          setErrors([error.message]);
        },
      });
    }
  };

  const handleUpload = async () => {
    if (processedData.length === 0) return;

    // Guard: Do NOT silently save an incorrect value. Prevent saving rows with "Invalid Date".
    const invalidRows = processedData.filter(row => 
      expectedColumns.some(col => isDateField(col) && row[col] === 'Invalid Date') || row._hasInvalidDate
    );
    if (invalidRows.length > 0) {
      setErrors([`Cannot import: ${invalidRows.length} record(s) contain Invalid Date. Please correct them in the preview table before proceeding.`]);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    let currentProg = 0;
    const interval = setInterval(() => {
      currentProg += Math.floor(Math.random() * 20) + 15;
      if (currentProg >= 100) {
        currentProg = 100;
        clearInterval(interval);
        setTimeout(async () => {
          try {
            // Filter database fields (strip meta internal properties prefixed by _ )
            const cleanUploadSet = processedData.map(item => {
              const cleanItem = { ...item };
              Object.keys(cleanItem).forEach(k => {
                if (k.startsWith('_')) delete cleanItem[k];
              });
              return cleanItem;
            });

            await onUpload(cleanUploadSet);
            setIsUploading(false);
            resetStates();
            onClose();
          } catch (err: any) {
            setErrors([err.message || "Failed to finalize database injection."]);
            setIsUploading(false);
          }
        }, 200);
      }
      setUploadProgress(currentProg);
    }, 45);
  };

  const resetStates = () => {
    setFile(null);
    setRawHeaders([]);
    setRawRows([]);
    setDateFormattedHeaders(new Set());
    setMappings({});
    setProcessedData([]);
    setShowMappingPanel(false);
    setErrors([]);
    setInvalidDatesCount(0);
  };

  const closeAndReset = () => {
    resetStates();
    onClose();
  };

  const triggerDownload = (url: string, filename: string) => {
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadTemplate = (format: 'xlsx' | 'csv') => {
    // Construct dummy data headers & values
    const headingRow = expectedColumns.reduce((acc, col) => {
      acc[col] = getSampleValue(col);
      return acc;
    }, {} as Record<string, any>);

    if (format === 'xlsx') {
      const ws = utils.json_to_sheet([headingRow]);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "Template Map Guidelines");
      
      // Auto-fit Column width computation
      const maxCols = expectedColumns.map(col => ({ wch: Math.max(col.length + 3, 14) }));
      ws['!cols'] = maxCols;

      const excelBuffer = write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
      const url = URL.createObjectURL(blob);
      triggerDownload(url, `${entityName.toLowerCase().replace(/\s+/g, '_')}_import_template.xlsx`);
    } else {
      const csvStr = Papa.unparse([headingRow]);
      const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      triggerDownload(url, `${entityName.toLowerCase().replace(/\s+/g, '_')}_import_template.csv`);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimateModal isOpen={isOpen} onClose={closeAndReset} maxWidthClass="max-w-4xl">
      <div className="flex flex-col max-h-[90vh] bg-white rounded-lg shadow-xl overflow-hidden font-sans">
        
        {/* Header Ribbon */}
        <div className="bg-[#0056b3] text-white px-4 py-3 flex items-center justify-between shrink-0 border-b border-blue-900">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet size={18} className="text-blue-200" />
            <div>
              <h2 className="text-xs font-bold tracking-wide uppercase font-sans">
                Universal Bulk Importer: {entityName}
              </h2>
              <p className="text-[10px] text-blue-100 font-sans mt-0.5">
                XLSX/CSV data ingestion engine with automatic date normalization
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={closeAndReset}
            className="text-white/80 hover:text-white hover:bg-blue-700/60 p-1 rounded-sm transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Scroll Content */}
        <div className="p-4 overflow-y-auto space-y-3.5 flex-1 text-slate-800 text-xs">
          
          {/* Action Top Bar: Template Generation & Quick Instruction */}
          <div className="bg-slate-50 border border-slate-200 rounded p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="space-y-0.5 max-w-xl">
              <span className="font-bold text-[10px] uppercase text-slate-700 font-sans flex items-center gap-1">
                <Info size={12} className="text-[#0056b3]" />
                Standard Template Formatting Guidelines
              </span>
              <p className="text-[9.5px] text-slate-500 leading-relaxed font-sans">
                Dates are normalized globally to <span className="font-mono font-semibold text-slate-700">YYYY-MM-DD</span> in the database while displayed as <span className="font-mono font-semibold text-slate-700">DD-MM-YYYY</span> in the ERP. Excel serial numbers (e.g. 46262), DD-MM-YYYY, and ISO formats are fully supported.
              </p>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => downloadTemplate('xlsx')}
                className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-sans font-bold text-[9px] rounded flex items-center space-x-1 shadow-2xs transition cursor-pointer"
              >
                <Download size={11} className="text-green-700" />
                <span>Template (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={() => downloadTemplate('csv')}
                className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-sans font-bold text-[9px] rounded flex items-center space-x-1 shadow-2xs transition cursor-pointer"
              >
                <Download size={11} className="text-blue-700" />
                <span>Template (.csv)</span>
              </button>
            </div>
          </div>

          {/* Interactive Drag Drop or Browse Section */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2 select-none ${
              file ? 'border-emerald-400 bg-emerald-50/20' : 'border-slate-300 hover:border-[#0056b3] bg-slate-50/50 hover:bg-blue-50/10'
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept=".csv, .xlsx, .xls" 
              className="hidden" 
            />

            {file ? (
              <div className="flex flex-col items-center">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-full mb-1">
                  <CheckCircle2 size={24} />
                </div>
                <span className="font-bold text-[11px] text-emerald-900 font-sans">{file.name}</span>
                <span className="text-[9px] text-slate-500 font-mono mt-0.5">
                  {(file.size / 1024).toFixed(1)} KB &bull; {rawRows.length} data rows recognized
                </span>
                <span className="text-[8px] text-blue-600 underline mt-1 font-sans">Click to pick a different file</span>
              </div>
            ) : (
              <>
                <div className="p-2 bg-blue-100 text-[#0056b3] rounded-full">
                  <Upload size={20} />
                </div>
                <div>
                  <span className="font-bold text-[11px] text-slate-700 block font-sans">Select or Drop Excel / CSV Document</span>
                  <span className="text-[9px] text-slate-400 font-sans">Supports Microsoft Excel (.xlsx, .xls) and UTF-8 CSV</span>
                </div>
              </>
            )}
          </div>

          {/* Processed Data Section: Mapping Controls & Preview Grid */}
          {file && processedData.length > 0 && (
            <div className="space-y-3.5">
              
              {/* Dynamic Header Column Mapping Panel */}
              <div className="border border-slate-250 rounded-sm bg-white overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => setShowMappingPanel(!showMappingPanel)}
                  className="w-full bg-slate-50 hover:bg-slate-100 px-3 py-2 border-b flex items-center justify-between text-left transition select-none cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <Settings2 size={13} className="text-[#0056b3]" />
                    <span className="font-bold text-[10px] text-slate-700 font-sans uppercase">
                      Header Column Mapping Configuration
                    </span>
                    <span className="bg-slate-200 text-slate-600 text-[8px] font-mono px-1.5 py-0.2 rounded-full font-bold">
                      {Object.values(mappings).filter(Boolean).length} / {expectedColumns.length} Mapped
                    </span>
                  </div>
                  <div className="text-slate-400">
                    {showMappingPanel ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </button>

                {showMappingPanel && (
                  <div className="p-3 bg-slate-50/40 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {expectedColumns.map((expectedKey) => {
                      const isMapped = Boolean(mappings[expectedKey]);
                      return (
                        <div 
                          key={expectedKey}
                          className={`p-2 rounded border text-left flex flex-col justify-between ${
                            isMapped ? 'bg-white border-slate-300' : 'bg-amber-50/50 border-amber-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-[9.5px] text-slate-800 font-sans truncate">
                              {expectedKey}
                            </span>
                            <span className="text-[7.5px] uppercase font-bold font-mono px-1 py-0.2 rounded bg-slate-100 text-slate-500">
                              {expectedFieldsRules(expectedKey)}
                            </span>
                          </div>
                          
                          <div className="relative">
                            <SAPSelect
                              value={mappings[expectedKey] || ''}
                              onChange={(e) => handleMapChange(expectedKey, e.target.value)}
                              className="w-full border border-slate-300 rounded px-1.5 py-1 text-[10px] font-bold bg-white outline-hidden hover:border-slate-400 focus:border-indigo-500 transition cursor-pointer appearance-none pr-6"
                            >
                              <option value="">[Ignore / Default]</option>
                              {rawHeaders.map((header) => (
                                <option key={header} value={header}>
                                  {header}
                                </option>
                              ))}
                            </SAPSelect>
                            <div className="absolute right-1.5 top-2 pointer-events-none text-slate-400">
                              <ChevronDown size={11} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Realtime Analytics & Warnings Banner */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="bg-emerald-50/50 p-2 border border-emerald-100 rounded-sm text-center">
                  <span className="block text-emerald-800 font-extrabold text-xs">{processedData.length}</span>
                  <span className="text-[8px] text-emerald-700 font-sans">Total Parsed Records</span>
                </div>
                {expectedColumns.includes('projectId') && (
                  <div className={`p-2 border rounded-sm text-center ${warningsCount > 0 ? 'bg-amber-50/50 border-amber-200' : 'bg-emerald-50/50 border-emerald-100'}`}>
                    <span className="block text-slate-800 font-extrabold text-xs">
                      {resolvedProjectsCount} / {processedData.length}
                    </span>
                    <span className="text-[8px] text-slate-600 font-sans block truncate">Sites Resolved</span>
                  </div>
                )}
                {invalidDatesCount > 0 ? (
                  <div className="bg-red-50/80 p-2 border border-red-200 rounded-sm text-center">
                    <span className="block text-red-700 font-extrabold text-xs">{invalidDatesCount}</span>
                    <span className="text-[8px] text-red-600 font-sans font-bold">Invalid Dates (Action Required)</span>
                  </div>
                ) : (
                  <div className="bg-indigo-50/50 p-2 border border-indigo-100 rounded-sm text-center">
                    <span className="block text-indigo-800 font-extrabold text-xs">
                      {processedData.length}
                    </span>
                    <span className="text-[8px] text-indigo-700 font-sans block truncate">Dates Validated</span>
                  </div>
                )}
                <div className={`p-2 border rounded-sm text-center ${warningsCount > 0 ? 'bg-amber-50/30 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                  <span className={`block font-extrabold text-xs ${warningsCount > 0 ? 'text-amber-700' : 'text-slate-600'}`}>{warningsCount}</span>
                  <span className="text-[8px] text-slate-500 font-sans">Total Warnings</span>
                </div>
              </div>

              {/* Sample Grid Preview Container */}
              <div className="border border-slate-250 rounded-sm overflow-hidden bg-white">
                <div className="bg-slate-100 px-3 py-1.5 flex items-center justify-between text-slate-700 border-b">
                  <span className="font-bold text-[9px] flex items-center font-sans uppercase">
                    <Eye size={12} className="mr-1 text-[#0056b3]" />
                    Bulk Import Realtime Preview & Date Normalization
                  </span>
                  <span className="text-[8px] text-slate-500 font-mono">
                    Showing all mapped columns &bull; UI Display: DD-MM-YYYY
                  </span>
                </div>
                
                <div className="overflow-x-auto w-full max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-[9px] border-collapse min-w-[800px]">
                    <thead className="sticky top-0 z-10 bg-slate-100">
                      <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 font-bold uppercase">
                        <th className="px-2.5 py-1.5 border-r border-slate-200 w-10 text-center">#</th>
                        <th className="px-2.5 py-1.5 border-r border-slate-200 font-sans text-[8px] text-center w-24">Status</th>
                        {expectedColumns.map((col) => (
                          <th key={col} className="px-2.5 py-1.5 border-r border-slate-200 font-sans text-[8px] whitespace-nowrap">
                            {col.replace(/([A-Z])/g, ' $1').trim()}
                            {isDateField(col) && (
                              <span className="text-blue-600 text-[7px] ml-1 font-mono font-normal">(Date)</span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {processedData.map((row, index) => (
                        <tr key={index} className={`hover:bg-[#e6f2ff] even:bg-slate-50/40 border-b last:border-b-0 ${row._hasInvalidDate ? 'bg-red-50/30' : ''}`}>
                          <td className="px-2.5 py-2 border-r border-slate-200 font-bold text-center text-slate-500 bg-slate-100/50">
                            {row._rowNum}
                          </td>
                          <td className="px-2.5 py-2 border-r border-slate-200 text-center whitespace-nowrap">
                            {row._hasInvalidDate ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[7.5px] font-bold bg-red-100 text-red-700 border border-red-200">
                                Invalid Date
                              </span>
                            ) : (row._projectWarning || row._workerWarning) ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[7.5px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                                Warning
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[7.5px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                Valid
                              </span>
                            )}
                          </td>
                          {expectedColumns.map((col) => {
                            const val = row[col];
                            
                            // Advanced visual rendering for Project resolved IDs
                            if (col === 'projectId') {
                              return (
                                <td key={col} className="px-2.5 py-2 border-r border-slate-200">
                                  {row._projectMatchedName ? (
                                    <div className="flex flex-col font-sans">
                                      <span className="font-semibold text-slate-800 leading-tight">{row._projectMatchedName}</span>
                                      <span className="text-[7.5px] font-mono text-emerald-600 block mt-0.5 font-semibold bg-emerald-50 max-w-max px-1 py-0.2 rounded-2xs">ID: {val}</span>
                                    </div>
                                  ) : (
                                    <span className="text-amber-600 font-sans leading-tight block text-[8.5px] font-semibold">
                                      ⚠️ {val || '[Missing ProjectName]'}
                                    </span>
                                  )}
                                </td>
                              );
                            }

                            // Dynamic visual formatting for Workers
                            if (col === 'workerId') {
                              return (
                                <td key={col} className="px-2.5 py-2 border-r border-slate-200">
                                  {row._workerMatchedName ? (
                                    <div className="flex flex-col font-sans">
                                      <span className="font-semibold text-slate-800 leading-tight">{row._workerMatchedName}</span>
                                      <span className="text-[7.5px] font-mono text-indigo-600 block mt-0.5 font-semibold bg-indigo-50 max-w-max px-1 py-0.2 rounded-2xs">ID: {val}</span>
                                    </div>
                                  ) : (
                                    <span className="text-amber-600 font-sans leading-tight block text-[8.5px] font-semibold">
                                      ⚠️ {val || '[Missing WorkerCode]'}
                                    </span>
                                  )}
                                </td>
                              );
                            }

                            // Check if date column for custom UI display
                            const isDateColumn = isDateField(col);

                            // Render date column with readable DD-MM-YYYY format and inline correction if invalid
                            if (isDateColumn) {
                              const isInvalid = val === 'Invalid Date';
                              return (
                                <td key={col} className={`px-2.5 py-2 border-r border-slate-200 font-mono text-[8.5px] ${isInvalid ? 'bg-red-50' : ''}`}>
                                  {isInvalid ? (
                                    <div className="flex flex-col gap-1">
                                      <span className="text-red-600 font-bold flex items-center gap-1">
                                        <AlertCircle size={10} className="shrink-0" /> Invalid Date
                                      </span>
                                      {row[`_${col}Raw`] && (
                                        <span className="text-[7px] text-slate-500 font-mono">Raw: "{String(row[`_${col}Raw`])}"</span>
                                      )}
                                      <div className="flex items-center gap-1 mt-0.5">
                                        <input
                                          type="text"
                                          placeholder="DD-MM-YYYY"
                                          defaultValue=""
                                          className="text-[8px] px-1 py-0.5 border border-red-300 rounded bg-white text-slate-800 outline-none focus:border-indigo-500 w-24"
                                          title="Enter corrected date and press Enter or blur"
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              handleInlineDateFix(index, col, (e.target as HTMLInputElement).value);
                                            }
                                          }}
                                          onBlur={(e) => {
                                            if (e.target.value.trim()) {
                                              handleInlineDateFix(index, col, e.target.value);
                                            }
                                          }}
                                        />
                                        <span className="text-[7px] text-slate-400">↵ save</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-slate-800 font-semibold font-mono">
                                      {val ? formatToUIDate(val as string) : '-'}
                                    </span>
                                  )}
                                </td>
                              );
                            }

                            // Render numeric parameters
                            if (typeof val === 'number') {
                              return (
                                <td key={col} className="px-2.5 py-2 border-r border-slate-200 font-mono text-slate-700 whitespace-nowrap">
                                  {val.toLocaleString('en-IN')}
                                </td>
                              );
                            }

                            // General text
                            return (
                              <td key={col} className="px-2.5 py-2 border-r border-slate-200 max-w-[150px] truncate leading-tight font-medium text-slate-700">
                                {val || '-'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* Core Upload progressing animation */}
          {isUploading && (
            <div className="mt-4 pt-2">
              <UploadProgressBar progressCount={uploadProgress} />
            </div>
          )}

          {/* Interactive validations status or alert notices */}
          {errors.length > 0 && !isUploading && (
            <div className="p-3 bg-red-50 border border-red-200 rounded flex items-start space-x-2.5 text-left font-sans">
              <AlertCircle size={15} className="text-red-700 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-red-900 font-bold text-[10px]">Import Warnings / Errors Detected:</h4>
                <div className="space-y-0.5 mt-0.5">
                  {errors.slice(0, 3).map((err, i) => (
                    <p key={i} className="text-[9px] text-red-700 leading-relaxed font-sans">{err}</p>
                  ))}
                  {errors.length > 3 && (
                    <p className="text-[8px] text-red-600 italic">...and {errors.length - 3} more issues.</p>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer controls */}
        <div className="p-3.5 border-t bg-slate-50 flex justify-end space-x-2 shrink-0">
          <button
            type="button"
            onClick={closeAndReset}
            className="px-4 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-sans font-bold select-none cursor-pointer text-[10.5px] rounded transition duration-150"
            disabled={isUploading}
          >
            Close Dialog
          </button>
          
          {file && (
            <button
              onClick={handleUpload}
              className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white font-sans font-bold select-none cursor-pointer text-[10.5px] rounded transition duration-150 flex items-center space-x-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
              disabled={processedData.length === 0 || errors.length > 0 || invalidDatesCount > 0 || isUploading}
            >
              {isUploading ? (
                <>
                  <RefreshCw size={11} className="animate-spin" />
                  <span>Processing database injection...</span>
                </>
              ) : (
                <span>Publish {processedData.length} Mapped Records</span>
              )}
            </button>
          )}
        </div>
      </div>
    </AnimateModal>
  );
}

// Inline helper for brief formatting tip
function expectedFieldsRules(col: string): string {
  const norm = col.toLowerCase();
  if (norm.includes('amount') || norm.includes('cost') || norm.includes('rate') || norm.includes('budget') || norm.includes('balance') || norm.includes('kharchi') || norm.includes('mess') || norm.includes('advance') || norm.includes('tiffin') || norm.includes('travel') || norm.includes('machinery') || norm.includes('stationery') || norm.includes('others')) return 'Number';
  if (isDateField(col)) return 'Date';
  if (norm.includes('qty') || norm.includes('quantity') || norm.includes('count')) return 'Integer';
  return 'Text';
}
