import React, { useState, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import { read, utils, write } from 'xlsx';
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
  joiningDate: ['joiningdate', 'doj', 'joindate', 'joining_date', 'date_of_joining'],
  startDate: ['startDate', 'startdate', 'start_date', 'commencementdate'],
  completionDate: ['completionDate', 'completiondate', 'enddate', 'completion_date', 'end_date'],
  clientName: ['clientName', 'clientname', 'client', 'client_name', 'customer'],
  address: ['address', 'location', 'siteaddress', 'site_address', 'project_location'],
  budget: ['budget', 'projectbudget', 'costlimit', 'value', 'project_value', 'total_budget'],
  status: ['status', 'state', 'currentstatus', 'current_status'],
  amount: ['amount', 'value', 'price', 'amt', 'total', 'subtotal', 'bill_amount'],
  amountReceived: ['amountReceived', 'amountreceived', 'received', 'receivedamount', 'payment', 'cashreceived', 'amount_received'],
  date: ['date', 'datepaid', 'txndate', 'transactiondate', 'entrydate', 'date_paid', 'payment_date', 'txn_date'],
  fromDate: ['fromDate', 'fromdate', 'start_date', 'from_date', 'start'],
  toDate: ['toDate', 'todate', 'end_date', 'to_date', 'end'],
  workerCount: ['workerCount', 'workercount', 'workers', 'numworkers', 'noofworkers', 'total_workers'],
  ratePerWeek: ['ratePerWeek', 'rateperweek', 'weekly_rate', 'rate', 'week_rate'],
  totalComputed: ['totalComputed', 'totalcomputed', 'computedtotal', 'total_computed', 'amount_computed'],
  amountPaid: ['amountPaid', 'amountpaid', 'paid', 'totalpaid', 'amount_paid'],
  amountDue: ['amountDue', 'amountdue', 'due', 'totaldue', 'balance', 'amount_due'],
  paidTo: ['paidTo', 'paidto', 'receivedby', 'paid_to', 'payee'],
  paymentDate: ['paymentDate', 'paymentdate', 'date_paid', 'pay_date'],
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
  if (norm.includes('worker') || norm.includes('emp') || norm.includes('employee')) return 'John Doe'; // Friendly display
  if (norm.includes('serial') || norm.includes('srno') || norm.includes('sno') || norm.includes('s.no')) return '1';
  if (norm.includes('name')) return 'John Doe';
  if (norm.includes('designation')) return 'Mason';
  if (norm.includes('date')) return '2026-06-01';
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
  if (norm.includes('date')) return 'Date format (YYYY-MM-DD)';
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
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [processedData, setProcessedData] = useState<any[]>([]);
  
  const [showMappingPanel, setShowMappingPanel] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [warningsCount, setWarningsCount] = useState(0);
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
  }, [mappings, rawRows, projectsContext, workersContext]);

  const recalculateProcessedRows = () => {
    const list: any[] = [];
    let warnCount = 0;
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
      const newRow: any = { _rowNum: idx + 1 };

      // Initialize with correct key defaults
      expectedColumns.forEach((col) => {
        newRow[col] = '';
      });

      // Align Excel row and cell values using columns mappings
      expectedColumns.forEach((expectedKey) => {
        const rawHeaderKey = mappings[expectedKey];
        if (!rawHeaderKey) return; // Skip if user explicitly ignored this column

        const val = row[rawHeaderKey];
        if (val !== undefined && val !== null) {
          // Convert numbers correctly (strip characters that break parsing)
          const isNumeric = ['budget', 'amount', 'amountReceived', 'purchaseCost', 'rate', 'qty', 'workerCount', 'ratePerWeek', 'totalComputed', 'amountPaid', 'amountDue', 'kharchi', 'mess', 'workerAdvance', 'tiffin', 'travel', 'machineryMaterial', 'workerPayment', 'stationery', 'others', 'crBalance', 'carpenter', 'fitter', 'helper', 'mason', 'rigger', 'staff'].includes(expectedKey);
          
          if (isNumeric) {
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
    setResolvedProjectsCount(resolvedProj);
    setResolvedWorkersCount(resolvedWork);
    setProcessedData(list);
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
    setMappings({});
    setProcessedData([]);
    setShowMappingPanel(false);
    setErrors([]);
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
      
      const arrayBuffer = write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      triggerDownload(url, `${entityName}_Template_Sample.xlsx`);
    } else {
      const csvStr = Papa.unparse([headingRow]);
      const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      triggerDownload(url, `${entityName}_Template_Sample.csv`);
    }
  };

  // Dynamically enlarge modal based on whether file is loaded
  const modalWidthClass = file ? 'max-w-4xl' : 'max-w-md';

  return (
    <AnimateModal isOpen={isOpen} onClose={closeAndReset} maxWidthClass={modalWidthClass}>
      <div className="flex flex-col font-mono text-[11px] select-none text-slate-800 h-[85vh] md:h-auto max-h-[90vh]">
        
        {/* Header toolbar */}
        <div className="flex justify-between items-center p-3.5 border-b bg-[#eef2f6] shrink-0">
          <h2 className="font-bold text-[var(--color-sap-blue-val)] flex items-center text-xs font-sans">
            <Upload size={14} className="mr-2 text-[#0056b3]" />
            Smart Sheet Import Suite: <span className="text-[#0056b3] ml-1 font-bold">[{entityName}]</span>
          </h2>
          <button onClick={closeAndReset} className="text-gray-500 hover:text-red-500 transition cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          
          {/* Top Info guides */}
          {!file && (
            <div>
              <p className="text-[10px] text-gray-500 font-sans leading-relaxed">
                Connect your Excel books (<b className="text-gray-700">.xlsx / .xls</b>) or text spreadsheets (<b className="text-gray-700">.csv</b>). The background indexer runs fuzzy-matching algorithms to automatically link row values with correct Projects and Employees in your system ledger.
              </p>
            </div>
          )}

          {/* Guidelines template links */}
          {!file && (
            <div className="border border-indigo-150 bg-indigo-50/40 p-3 rounded flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2.5 sm:space-y-0">
              <div>
                <p className="font-sans font-bold text-indigo-950 text-[10px] flex items-center">
                  <FileSpreadsheet size={13} className="mr-1.5 text-indigo-800" />
                  Guide Templates for Formatting:
                </p>
                <p className="text-[9px] text-indigo-700 font-sans mt-0.5">Use as is or check sample column conventions to avoid manual mapping.</p>
              </div>
              <div className="flex items-center space-x-1.5 shrink-0 self-end sm:self-center">
                <button
                  onClick={() => downloadTemplate('xlsx')}
                  className="px-2.5 py-1 bg-[#217346] hover:bg-[#1a5c38] text-white rounded font-sans text-[10px] font-bold flex items-center transition cursor-pointer"
                  title="Download guideline Excel ledger"
                >
                  <Download size={11} className="mr-1" />
                  Excel Worksheet
                </button>
                <button
                  onClick={() => downloadTemplate('csv')}
                  className="px-2 py-1 bg-slate-600 hover:bg-slate-700 text-white rounded font-sans text-[10px] font-bold flex items-center transition cursor-pointer"
                  title="Download standard CSV text guideline"
                >
                  <Download size={11} className="mr-1" />
                  CSV format
                </button>
              </div>
            </div>
          )}

          {/* Excel upload form dropzone */}
          <div className={`border-2 border-dashed rounded p-5 text-center transition relative ${file ? 'border-indigo-400 bg-indigo-50/10 py-4' : 'border-slate-300 hover:bg-slate-50'}`}>
            <input
              type="file"
              accept=".csv, .xlsx, .xls"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
              disabled={isUploading}
            />

            {file ? (
              <div className="flex flex-col md:flex-row md:items-center justify-between font-sans gap-3">
                <div className="flex items-center space-x-2.5 text-left">
                  <div className="bg-emerald-100 p-2 rounded-sm text-emerald-800 shrink-0">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 overflow-hidden text-ellipsis line-clamp-1">{file.name}</h3>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {rawRows.length} rows parsed | {rawHeaders.length} source columns identified
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 max-sm:w-full max-sm:justify-end">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 text-[#0056b3] border border-[#0056b3]/30 text-[10px] hover:bg-[var(--btn-hover-top)]/5 bg-white font-bold rounded cursor-pointer"
                  >
                    Load New File
                  </button>
                  <button
                    onClick={resetStates}
                    className="px-2.5 py-1 text-red-700 border border-red-200 text-[10px] hover:bg-red-50 bg-white font-bold rounded cursor-pointer"
                  >
                    Clear File
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload size={24} className="mx-auto text-slate-400 animate-bounce" />
                <p className="text-[10px] text-[var(--color-sap-blue-val)] font-sans font-extrabold">DRAG & DROP WORKSHEET OR BROWSE DEVICE</p>
                <div className="pt-1.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-1.5 bg-[var(--btn-hover-top)] text-white hover:bg-[#003d80] rounded font-sans font-bold select-none cursor-pointer text-[10px]"
                  >
                    Import From Computer
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Active Cockpit: Mappings Panel & Realtime Sample Grid */}
          {file && (
            <div className="space-y-3.5">
              
              {/* Mapper toggle tab */}
              <div className="border border-slate-250 rounded-sm">
                <button
                  type="button"
                  onClick={() => setShowMappingPanel(!showMappingPanel)}
                  className="w-full bg-slate-50 px-3 py-2 flex items-center justify-between text-slate-700 font-bold font-sans text-[10px] outline-hidden cursor-pointer"
                >
                  <div className="flex items-center space-x-1.5">
                    <Settings2 size={13} className="text-slate-500" />
                    <span>Customize Column Mapping Linkage</span>
                    <span className="bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-xs text-[9px] font-mono ml-2">
                      {Object.values(mappings).filter(Boolean).length} / {expectedColumns.length} mapped
                    </span>
                  </div>
                  {showMappingPanel ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {showMappingPanel && (
                  <div className="p-3 border-t bg-white grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2.5 max-h-60 overflow-y-auto">
                    {expectedColumns.map((expectedKey) => {
                      const isMapped = !!mappings[expectedKey];
                      return (
                        <div key={expectedKey} className="flex flex-col space-y-1 bg-slate-50 p-2 border border-slate-200 rounded-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 text-[10px] font-sans truncate" title={expectedKey}>
                              {expectedKey.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                            <span className="text-[8px] text-gray-400 italic">
                              {expectedFieldsRules(expectedKey)}
                            </span>
                          </div>
                          <p className="text-[8px] text-gray-500 font-sans shrink-0 truncate-2-lines line-clamp-1">
                            {getColumnFriendlyDescription(expectedKey)}
                          </p>
                          <div className="relative mt-1">
                            <select
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
                            </select>
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

              {/* Realtime Resolved Analytics Banner */}
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
                {expectedColumns.includes('workerId') && (
                  <div className="bg-indigo-50/50 p-2 border border-indigo-100 rounded-sm text-center">
                    <span className="block text-indigo-800 font-extrabold text-xs">
                      {resolvedWorkersCount} / {processedData.length}
                    </span>
                    <span className="text-[8px] text-indigo-700 font-sans block truncate">Workers Match</span>
                  </div>
                )}
                <div className={`p-2 border rounded-sm text-center ${warningsCount > 0 ? 'bg-amber-50/30 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                  <span className={`block font-extrabold text-xs ${warningsCount > 0 ? 'text-amber-700' : 'text-slate-600'}`}>{warningsCount}</span>
                  <span className="text-[8px] text-slate-500 font-sans">Warnings Detected</span>
                </div>
              </div>

              {/* Sample Grid Preview Container */}
              <div className="border border-slate-250 rounded-sm overflow-hidden bg-white">
                <div className="bg-slate-100 px-3 py-1.5 flex items-center justify-between text-slate-700 border-b">
                  <span className="font-bold text-[9px] flex items-center font-sans uppercase">
                    <Eye size={12} className="mr-1 text-[#0056b3]" />
                    Realtime Data Parsing Preview (First 5 Rows)
                  </span>
                  <span className="text-[8px] text-slate-500 font-mono">Verify auto-resolved rows</span>
                </div>
                
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left text-[9px] border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold uppercase">
                        <th className="px-2.5 py-1.5 border-r border-slate-150 w-12 text-center">#</th>
                        {expectedColumns.slice(0, 6).map((col) => (
                          <th key={col} className="px-2.5 py-1.5 border-r border-slate-200 font-sans text-[8px]">
                            {col.replace(/([A-Z])/g, ' $1').trim()}
                          </th>
                        ))}
                        {expectedColumns.length > 6 && (
                          <th className="px-2.5 py-1.5 font-sans text-[8px] text-slate-400 italic">More fields...</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {processedData.slice(0, 5).map((row, index) => (
                        <tr key={index} className="hover:bg-[#e6f2ff] even:bg-slate-50/40 border-b last:border-b-0">
                          <td className="px-2.5 py-2 border-r border-slate-200 font-bold text-center text-slate-500 bg-slate-100/50">
                            {row._rowNum}
                          </td>
                          {expectedColumns.slice(0, 6).map((col) => {
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

                            // Render general parameters with nice design
                            return (
                              <td key={col} className="px-2.5 py-2 border-r border-slate-200 max-w-[120px] truncate leading-tight font-medium">
                                {typeof val === 'number' ? (
                                  <span className="font-mono text-slate-700">
                                    {val.toLocaleString('en-IN')}
                                  </span>
                                ) : (
                                  val || '-'
                                )}
                              </td>
                            );
                          })}
                          {expectedColumns.length > 6 && (
                            <td className="px-2.5 py-2 text-slate-400 italic text-[7.5px]">
                              {expectedColumns.length - 6} other fields mapped
                            </td>
                          )}
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
                <h4 className="text-red-900 font-bold text-[10px]">Mapping Blocking Errors Detect:</h4>
                <p className="text-[9px] text-red-700 leading-relaxed mt-0.5">{errors[0]}</p>
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
              disabled={processedData.length === 0 || errors.length > 0 || isUploading}
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
  if (norm.includes('date')) return 'Date';
  if (norm.includes('qty') || norm.includes('quantity') || norm.includes('count')) return 'Integer';
  return 'Text';
}
