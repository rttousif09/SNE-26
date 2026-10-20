import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { BOQItem } from '../types';
import { FileSpreadsheet, Check, AlertTriangle, AlertCircle, X, ArrowRight, RefreshCw, Upload } from 'lucide-react';

interface BOQExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (items: BOQItem[]) => void;
  existingItemCodes?: string[];
  existingItemNumbers?: string[];
}

interface ColumnMapping {
  itemNumber: string;
  itemCode: string;
  section: string;
  subSection: string;
  description: string;
  unit: string;
  quantity: string;
  rate: string;
  drawingRef: string;
  remarks: string;
}

interface ParsedRowResult {
  rowIndex: number;
  isSectionHeader: boolean;
  item?: BOQItem;
  status: 'valid' | 'warning' | 'error' | 'section';
  errors: string[];
}

export const BOQExcelImportModal: React.FC<BOQExcelImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  existingItemCodes = [],
  existingItemNumbers = []
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [rawRows, setRawRows] = useState<any[][]>([]);
  const [headerRowIndex, setHeaderRowIndex] = useState<number>(0);
  const [headers, setHeaders] = useState<string[]>([]);
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [mapping, setMapping] = useState<ColumnMapping>({
    itemNumber: '',
    itemCode: '',
    section: '',
    subSection: '',
    description: '',
    unit: '',
    quantity: '',
    rate: '',
    drawingRef: '',
    remarks: ''
  });
  const [parsedResults, setParsedResults] = useState<ParsedRowResult[]>([]);
  const [importSummary, setImportSummary] = useState<{ imported: number; skipped: number; rejected: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Auto-detect columns based on header strings
  const autoDetectColumns = (headerList: string[]): ColumnMapping => {
    const map: ColumnMapping = {
      itemNumber: '',
      itemCode: '',
      section: '',
      subSection: '',
      description: '',
      unit: '',
      quantity: '',
      rate: '',
      drawingRef: '',
      remarks: ''
    };

    headerList.forEach(col => {
      const lower = col.toLowerCase().trim();
      if (!map.itemNumber && (lower.includes('item no') || lower.includes('item_no') || lower.includes('s.no') || lower.includes('sr no') || lower === 'item' || lower === 'no')) {
        map.itemNumber = col;
      } else if (!map.itemCode && (lower.includes('code') || lower.includes('item code') || lower.includes('ref code'))) {
        map.itemCode = col;
      } else if (!map.section && (lower.includes('section') || lower.includes('category') || lower.includes('trade') || lower.includes('heading'))) {
        map.section = col;
      } else if (!map.subSection && (lower.includes('sub section') || lower.includes('sub-section') || lower.includes('sub_section') || lower.includes('sub category'))) {
        map.subSection = col;
      } else if (!map.description && (lower.includes('desc') || lower.includes('work description') || lower.includes('scope') || lower.includes('particulars') || lower.includes('specification'))) {
        map.description = col;
      } else if (!map.unit && (lower.includes('unit') || lower.includes('uom') || lower === 'u.o.m')) {
        map.unit = col;
      } else if (!map.quantity && (lower.includes('qty') || lower.includes('quantity') || lower.includes('boq qty') || lower.includes('contract qty'))) {
        map.quantity = col;
      } else if (!map.rate && (lower.includes('rate') || lower.includes('price') || lower.includes('unit rate') || lower.includes('contract rate'))) {
        map.rate = col;
      } else if (!map.drawingRef && (lower.includes('drawing') || lower.includes('dwg') || lower.includes('spec') || lower.includes('is code'))) {
        map.drawingRef = col;
      } else if (!map.remarks && (lower.includes('remark') || lower.includes('note') || lower.includes('comment'))) {
        map.remarks = col;
      }
    });

    return map;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const selectedFile = files[0];
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        setWorkbook(wb);
        setSheetNames(wb.SheetNames);
        if (wb.SheetNames.length > 0) {
          const firstSheet = wb.SheetNames[0];
          setSelectedSheet(firstSheet);
          loadSheetData(wb, firstSheet);
        }
      } catch (err: any) {
        console.error('Failed to parse workbook:', err);
        alert('Failed to read Excel file: ' + err.message);
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  const loadSheetData = (wb: XLSX.WorkBook, sheetName: string) => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return;
    const rawData: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    setRawRows(rawData);

    // Look for first row with at least 3 non-empty text strings as header
    let detectedHeaderIdx = 0;
    for (let i = 0; i < Math.min(10, rawData.length); i++) {
      const row = rawData[i];
      const nonEmpties = row.filter((c: any) => String(c).trim().length > 0);
      if (nonEmpties.length >= 3) {
        detectedHeaderIdx = i;
        break;
      }
    }

    setHeaderRowIndex(detectedHeaderIdx);
    const headerCols = (rawData[detectedHeaderIdx] || []).map((c: any, idx: number) =>
      String(c).trim() || `Column_${idx + 1}`
    );
    setHeaders(headerCols);
    const autoMapped = autoDetectColumns(headerCols);
    setMapping(autoMapped);
    setStep('mapping');
  };

  const handleSheetSelect = (sheetName: string) => {
    setSelectedSheet(sheetName);
    if (workbook) {
      loadSheetData(workbook, sheetName);
    }
  };

  const handleHeaderRowChange = (idx: number) => {
    setHeaderRowIndex(idx);
    if (rawRows[idx]) {
      const headerCols = rawRows[idx].map((c: any, i: number) => String(c).trim() || `Column_${i + 1}`);
      setHeaders(headerCols);
      const autoMapped = autoDetectColumns(headerCols);
      setMapping(autoMapped);
    }
  };

  const proceedToPreview = () => {
    // Validate mapping
    if (!mapping.description) {
      alert('Please map the "Work Description" column.');
      return;
    }
    if (!mapping.quantity) {
      alert('Please map the "Quantity" column.');
      return;
    }
    if (!mapping.rate) {
      alert('Please map the "Unit Rate" column.');
      return;
    }

    // Process all rows from headerRowIndex + 1 to end
    const results: ParsedRowResult[] = [];
    const seenCodes = new Set<string>();
    const seenNumbers = new Set<string>();

    let currentSection = '';
    let currentSubSection = '';

    for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.every((c: any) => String(c).trim() === '')) {
        continue; // skip blank row
      }

      const getVal = (colName: string): string => {
        if (!colName) return '';
        const idx = headers.indexOf(colName);
        if (idx === -1) return '';
        const val = row[idx];
        return val !== undefined && val !== null ? String(val).trim() : '';
      };

      const rawNum = getVal(mapping.itemNumber);
      const rawCode = getVal(mapping.itemCode);
      const rawSec = getVal(mapping.section);
      const rawSub = getVal(mapping.subSection);
      const rawDesc = getVal(mapping.description);
      const rawUnit = getVal(mapping.unit) || 'cum';
      const rawQtyStr = getVal(mapping.quantity).replace(/,/g, '');
      const rawRateStr = getVal(mapping.rate).replace(/,/g, '');
      const rawDwg = getVal(mapping.drawingRef);
      const rawRemarks = getVal(mapping.remarks);

      if (rawSec) currentSection = rawSec;
      if (rawSub) currentSubSection = rawSub;

      const qty = parseFloat(rawQtyStr);
      const rate = parseFloat(rawRateStr);

      // Check if this is a section heading row (has description or section, but no quantity or rate)
      const isHeadingRow = (rawDesc || rawSec) && (isNaN(qty) || qty <= 0) && (isNaN(rate) || rate <= 0);

      if (isHeadingRow) {
        if (rawDesc.toLowerCase().includes('section') || rawDesc.toLowerCase().includes('heading') || !rawQtyStr) {
          currentSection = rawDesc || rawSec;
        }
        results.push({
          rowIndex: r + 1,
          isSectionHeader: true,
          status: 'section',
          errors: []
        });
        continue;
      }

      const errors: string[] = [];

      if (!rawDesc) {
        errors.push('Missing Work Description');
      }

      if (isNaN(qty) || qty <= 0) {
        errors.push(`Invalid Quantity ("${rawQtyStr}")`);
      }

      if (isNaN(rate) || rate <= 0) {
        errors.push(`Invalid Rate ("${rawRateStr}")`);
      }

      const effectiveCode = rawCode || (rawNum ? `ITEM-${rawNum}` : `IMP-${r + 1}`);

      // Check duplicate in file
      if (seenCodes.has(effectiveCode.toLowerCase())) {
        errors.push(`Duplicate item code in file: "${effectiveCode}"`);
      } else {
        seenCodes.add(effectiveCode.toLowerCase());
      }

      if (existingItemCodes.map(c => c.toLowerCase()).includes(effectiveCode.toLowerCase())) {
        errors.push(`Item code already exists in active BOQ: "${effectiveCode}"`);
      }

      if (rawNum) {
        if (seenNumbers.has(rawNum.toLowerCase())) {
          errors.push(`Duplicate item number in file: "${rawNum}"`);
        } else {
          seenNumbers.add(rawNum.toLowerCase());
        }
        if (existingItemNumbers.map(n => n.toLowerCase()).includes(rawNum.toLowerCase())) {
          errors.push(`Item number already exists in active BOQ: "${rawNum}"`);
        }
      }

      const boqItem: BOQItem = {
        id: 'item_imp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        section: currentSection || undefined,
        subSection: currentSubSection || undefined,
        itemNumber: rawNum || undefined,
        itemCode: effectiveCode,
        description: rawDesc, // Complete work description preserved without truncation
        unit: rawUnit,
        contractQuantity: !isNaN(qty) ? qty : 0,
        unitRate: !isNaN(rate) ? rate : 0,
        originalQuantity: !isNaN(qty) ? qty : 0,
        originalRate: !isNaN(rate) ? rate : 0,
        boqQuantity: !isNaN(qty) ? qty : 0,
        boqRate: !isNaN(rate) ? rate : 0,
        boqAmount: !isNaN(qty) && !isNaN(rate) ? parseFloat((qty * rate).toFixed(2)) : 0,
        approvedRevisedQuantity: !isNaN(qty) ? qty : 0,
        approvedRevisedRate: !isNaN(rate) ? rate : 0,
        revisedAmount: !isNaN(qty) && !isNaN(rate) ? parseFloat((qty * rate).toFixed(2)) : 0,
        executedQuantity: 0,
        billedQuantity: 0,
        drawingRef: rawDwg || undefined,
        remarks: rawRemarks || undefined
      };

      results.push({
        rowIndex: r + 1,
        isSectionHeader: false,
        item: boqItem,
        status: errors.length > 0 ? 'error' : 'valid',
        errors
      });
    }

    setParsedResults(results);
    setStep('preview');
  };

  const handleExecuteImport = () => {
    const validItems = parsedResults
      .filter(res => res.status === 'valid' && res.item)
      .map(res => res.item!);

    const skipped = parsedResults.filter(res => res.status === 'section').length;
    const rejected = parsedResults.filter(res => res.status === 'error').length;

    if (validItems.length === 0) {
      alert('No valid items found to import. Please correct mapping or errors.');
      return;
    }

    onImport(validItems);
    setImportSummary({
      imported: validItems.length,
      skipped,
      rejected
    });
  };

  const validCount = parsedResults.filter(r => r.status === 'valid').length;
  const errorCount = parsedResults.filter(r => r.status === 'error').length;
  const sectionCount = parsedResults.filter(r => r.status === 'section').length;

  return (
    <div className="fixed inset-0 z-[130] overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        className="sap-panel bg-[#f0f4f8] border-2 border-[#8c9ba8] w-full max-w-5xl rounded-xs shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-[11px] relative z-10 font-sans"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-4 py-2.5 bg-[#1e3a5f] text-white flex justify-between items-center border-b border-[#0f243d] flex-shrink-0 select-none">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet size={16} className="text-emerald-400" />
            <span className="text-xs font-bold tracking-wide">
              📥 Excel BOQ Import & Field Mapping Utility
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded font-bold text-lg leading-none cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="bg-[#e2e8f0] border-b border-[#cbd5e1] px-4 py-2 flex items-center justify-between text-xs select-none flex-shrink-0">
          <div className="flex items-center space-x-4">
            <span className={`flex items-center gap-1 font-bold ${step === 'upload' ? 'text-blue-900' : 'text-slate-500'}`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${step === 'upload' ? 'bg-blue-800 text-white' : 'bg-slate-300 text-slate-700'}`}>1</span>
              <span>Upload & Sheet</span>
            </span>
            <span className="text-slate-400">&gt;</span>
            <span className={`flex items-center gap-1 font-bold ${step === 'mapping' ? 'text-blue-900' : 'text-slate-500'}`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${step === 'mapping' ? 'bg-blue-800 text-white' : 'bg-slate-300 text-slate-700'}`}>2</span>
              <span>Column Mapping</span>
            </span>
            <span className="text-slate-400">&gt;</span>
            <span className={`flex items-center gap-1 font-bold ${step === 'preview' ? 'text-blue-900' : 'text-slate-500'}`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${step === 'preview' ? 'bg-blue-800 text-white' : 'bg-slate-300 text-slate-700'}`}>3</span>
              <span>Validation & Import</span>
            </span>
          </div>

          {file && (
            <span className="text-[11px] text-slate-600 font-mono truncate max-w-xs">
              File: <strong className="text-slate-900">{file.name}</strong> ({sheetNames.length} sheet{sheetNames.length > 1 ? 's' : ''})
            </span>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 bg-white/80">
          {importSummary ? (
            <div className="p-6 bg-emerald-50 border border-emerald-300 rounded text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-700">
                <Check size={28} />
              </div>
              <h3 className="text-sm font-bold text-emerald-900">BOQ Import Completed Successfully</h3>
              <p className="text-xs text-emerald-800">
                Imported <strong className="font-mono text-sm">{importSummary.imported}</strong> valid items into the BOQ Master.
              </p>
              <div className="flex justify-center gap-6 text-[11px] text-slate-600 pt-2 border-t border-emerald-200">
                <span>Section headings skipped: <strong>{importSummary.skipped}</strong></span>
                <span>Rejected rows: <strong className="text-red-600">{importSummary.rejected}</strong></span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-1.5 rounded text-xs font-bold shadow-xs cursor-pointer"
              >
                Done / Close Window
              </button>
            </div>
          ) : step === 'upload' ? (
            <div className="p-8 border-2 border-dashed border-[#8c9ba8] bg-slate-50 rounded text-center space-y-4">
              <FileSpreadsheet size={40} className="mx-auto text-emerald-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">Select Construction BOQ Excel File</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv) containing Item Numbers, Descriptions, Quantities and Rates.
                </p>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx, .xls, .csv"
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-[#1e3a5f] hover:bg-[#152943] text-white px-5 py-2 rounded text-xs font-bold flex items-center gap-2 mx-auto cursor-pointer shadow-xs border border-[#0f243d]"
              >
                <Upload size={14} />
                <span>Browse File from Computer</span>
              </button>
            </div>
          ) : step === 'mapping' ? (
            <div className="space-y-4">
              {/* Sheet & Header row selection toolbar */}
              <div className="bg-[#f0f4f8] p-3 border border-[#cbd5e1] rounded flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">Select Worksheet:</span>
                  <select
                    value={selectedSheet}
                    onChange={e => handleSheetSelect(e.target.value)}
                    className="bg-white border border-[#8c9ba8] rounded px-2 py-1 text-xs font-semibold"
                  >
                    {sheetNames.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">Header Row (1-indexed):</span>
                  <select
                    value={headerRowIndex}
                    onChange={e => handleHeaderRowChange(Number(e.target.value))}
                    className="bg-white border border-[#8c9ba8] rounded px-2 py-1 text-xs font-mono font-bold"
                  >
                    {rawRows.slice(0, 15).map((row, idx) => (
                      <option key={idx} value={idx}>
                        Row {idx + 1}: {row.filter(c => String(c).trim()).slice(0, 3).join(' | ')}...
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Column Mapping Form */}
              <div className="bg-white border border-[#cbd5e1] rounded p-4 shadow-2xs space-y-3">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <div>
                    <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wide">
                      Map Excel Columns to ERP BOQ Fields
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      Verify column matching. Description, Quantity, and Unit Rate are required.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMapping(autoDetectColumns(headers))}
                    className="text-[11px] text-blue-700 hover:text-blue-900 flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <RefreshCw size={11} /> Auto Re-detect
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      BOQ Item Number
                    </label>
                    <select
                      value={mapping.itemNumber}
                      onChange={e => setMapping(prev => ({ ...prev, itemNumber: e.target.value }))}
                      className="w-full bg-white border border-[#8c9ba8] rounded px-2 py-1 text-xs"
                    >
                      <option value="">-- None / Auto-generate --</option>
                      {headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      Item Reference Code
                    </label>
                    <select
                      value={mapping.itemCode}
                      onChange={e => setMapping(prev => ({ ...prev, itemCode: e.target.value }))}
                      className="w-full bg-white border border-[#8c9ba8] rounded px-2 py-1 text-xs"
                    >
                      <option value="">-- None / Auto-generate from Item No --</option>
                      {headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      Work Description <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={mapping.description}
                      onChange={e => setMapping(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full bg-white border border-blue-600 rounded px-2 py-1 text-xs font-bold text-blue-950"
                      required
                    >
                      <option value="">-- Select Description Column --</option>
                      {headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      Section / Main Group
                    </label>
                    <select
                      value={mapping.section}
                      onChange={e => setMapping(prev => ({ ...prev, section: e.target.value }))}
                      className="w-full bg-white border border-[#8c9ba8] rounded px-2 py-1 text-xs"
                    >
                      <option value="">-- None / Header rows --</option>
                      {headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      Sub-Section
                    </label>
                    <select
                      value={mapping.subSection}
                      onChange={e => setMapping(prev => ({ ...prev, subSection: e.target.value }))}
                      className="w-full bg-white border border-[#8c9ba8] rounded px-2 py-1 text-xs"
                    >
                      <option value="">-- None --</option>
                      {headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      Unit of Measurement (UoM)
                    </label>
                    <select
                      value={mapping.unit}
                      onChange={e => setMapping(prev => ({ ...prev, unit: e.target.value }))}
                      className="w-full bg-white border border-[#8c9ba8] rounded px-2 py-1 text-xs"
                    >
                      <option value="">-- Defaults to "cum" --</option>
                      {headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      Contract Quantity <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={mapping.quantity}
                      onChange={e => setMapping(prev => ({ ...prev, quantity: e.target.value }))}
                      className="w-full bg-white border border-blue-600 rounded px-2 py-1 text-xs font-bold text-blue-950"
                      required
                    >
                      <option value="">-- Select Quantity Column --</option>
                      {headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      Unit Rate (₹) <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={mapping.rate}
                      onChange={e => setMapping(prev => ({ ...prev, rate: e.target.value }))}
                      className="w-full bg-white border border-blue-600 rounded px-2 py-1 text-xs font-bold text-blue-950"
                      required
                    >
                      <option value="">-- Select Rate Column --</option>
                      {headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      Drawing / Specification Reference
                    </label>
                    <select
                      value={mapping.drawingRef}
                      onChange={e => setMapping(prev => ({ ...prev, drawingRef: e.target.value }))}
                      className="w-full bg-white border border-[#8c9ba8] rounded px-2 py-1 text-xs"
                    >
                      <option value="">-- None --</option>
                      {headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Sample Excel Data Preview (First 5 Rows) */}
              <div className="bg-white border border-[#cbd5e1] rounded overflow-hidden">
                <div className="px-3 py-2 bg-slate-100 font-bold text-xs text-slate-700 border-b border-slate-200">
                  Raw Excel File Rows Preview (Showing first 5 rows)
                </div>
                <div className="overflow-x-auto max-h-40">
                  <table className="w-full text-[10px] border-collapse">
                    <thead>
                      <tr className="bg-slate-200 text-slate-800 font-mono">
                        <th className="border border-slate-300 px-2 py-1 text-center w-8">#</th>
                        {headers.map((h, i) => (
                          <th key={i} className="border border-slate-300 px-2 py-1 text-left font-bold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rawRows.slice(headerRowIndex + 1, headerRowIndex + 6).map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50">
                          <td className="border border-slate-300 px-2 py-1 text-center font-mono text-slate-500">
                            {headerRowIndex + 2 + rIdx}
                          </td>
                          {headers.map((_, cIdx) => (
                            <td key={cIdx} className="border border-slate-300 px-2 py-1 max-w-[200px] truncate">
                              {row[cIdx] !== undefined ? String(row[cIdx]) : ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* Step 3: Validation & Preview */
            <div className="space-y-3">
              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-3 bg-white p-3 rounded border border-[#cbd5e1] shadow-2xs text-center">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Rows Analyzed</span>
                  <span className="text-sm font-bold text-slate-800 font-mono">{parsedResults.length}</span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-700 uppercase font-semibold block">Valid Items to Import</span>
                  <span className="text-sm font-bold text-emerald-700 font-mono">✓ {validCount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-amber-700 uppercase font-semibold block">Section Headings Detected</span>
                  <span className="text-sm font-bold text-amber-700 font-mono">📁 {sectionCount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-red-600 uppercase font-semibold block">Rows with Errors</span>
                  <span className="text-sm font-bold text-red-600 font-mono">⚠️ {errorCount}</span>
                </div>
              </div>

              {/* Table of items to be imported */}
              <div className="bg-white border border-[#cbd5e1] rounded overflow-hidden">
                <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
                  <table className="w-full text-[11px] border-collapse">
                    <thead className="bg-[#1e3a5f] text-white text-[10px] uppercase font-semibold sticky top-0 z-10">
                      <tr>
                        <th className="border border-blue-900 px-2 py-1.5 text-center w-12">Row</th>
                        <th className="border border-blue-900 px-2 py-1.5 text-center w-16">Status</th>
                        <th className="border border-blue-900 px-2 py-1.5 text-left w-20">Item No</th>
                        <th className="border border-blue-900 px-2 py-1.5 text-left w-24">Item Code</th>
                        <th className="border border-blue-900 px-2 py-1.5 text-left w-28">Section</th>
                        <th className="border border-blue-900 px-2 py-1.5 text-left min-w-[200px]">Description</th>
                        <th className="border border-blue-900 px-2 py-1.5 text-center w-14">Unit</th>
                        <th className="border border-blue-900 px-2 py-1.5 text-right w-20">Qty</th>
                        <th className="border border-blue-900 px-2 py-1.5 text-right w-20">Rate (₹)</th>
                        <th className="border border-blue-900 px-2 py-1.5 text-right w-24">Amount (₹)</th>
                        <th className="border border-blue-900 px-2 py-1.5 text-left min-w-[150px]">Validation Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {parsedResults.map(res => {
                        if (res.status === 'section') {
                          return (
                            <tr key={res.rowIndex} className="bg-amber-50/60 font-semibold text-amber-900 text-[10px]">
                              <td className="px-2 py-1 text-center font-mono">{res.rowIndex}</td>
                              <td className="px-2 py-1 text-center">
                                <span className="bg-amber-100 text-amber-800 px-1 rounded text-[9px]">Section</span>
                              </td>
                              <td colSpan={9} className="px-2 py-1">
                                Section Heading Row (Skipped as specification item)
                              </td>
                            </tr>
                          );
                        }

                        const it = res.item!;
                        return (
                          <tr
                            key={res.rowIndex}
                            className={`hover:bg-slate-50 ${
                              res.status === 'error' ? 'bg-red-50/50' : ''
                            }`}
                          >
                            <td className="px-2 py-1 text-center font-mono text-slate-500">{res.rowIndex}</td>
                            <td className="px-2 py-1 text-center">
                              {res.status === 'valid' ? (
                                <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                  Valid
                                </span>
                              ) : (
                                <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center justify-center gap-0.5">
                                  <AlertCircle size={10} /> Error
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-1 font-mono">{it.itemNumber || '-'}</td>
                            <td className="px-2 py-1 font-mono font-bold text-blue-900">{it.itemCode}</td>
                            <td className="px-2 py-1 text-slate-600 truncate max-w-[110px]">{it.section || '-'}</td>
                            <td className="px-2 py-1 max-w-xs break-words">{it.description}</td>
                            <td className="px-2 py-1 text-center font-mono">{it.unit}</td>
                            <td className="px-2 py-1 text-right font-mono font-bold">
                              {it.boqQuantity.toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                            </td>
                            <td className="px-2 py-1 text-right font-mono">
                              ₹{it.boqRate.toLocaleString('en-IN')}
                            </td>
                            <td className="px-2 py-1 text-right font-mono font-bold text-slate-900">
                              ₹{it.boqAmount.toLocaleString('en-IN')}
                            </td>
                            <td className="px-2 py-1">
                              {res.errors.length > 0 ? (
                                <div className="text-[10px] text-red-700 space-y-0.5">
                                  {res.errors.map((e, ei) => (
                                    <div key={ei} className="flex items-center gap-1">
                                      <span>•</span> <span>{e}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[10px] text-emerald-700">✓ Ready to import</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Persistent Footer */}
        {!importSummary && (
          <div className="px-4 py-2.5 bg-[#e5ebf0] border-t border-[#cbd5e1] flex justify-between items-center flex-shrink-0 select-none">
            <div>
              {step === 'preview' && (
                <button
                  type="button"
                  onClick={() => setStep('mapping')}
                  className="bg-white hover:bg-slate-100 text-slate-700 px-3 py-1 rounded text-xs font-bold border border-[#8c9ba8] cursor-pointer"
                >
                  ← Back to Mapping
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="bg-white hover:bg-slate-100 text-slate-700 px-4 py-1 rounded text-xs font-bold border border-[#8c9ba8] cursor-pointer"
              >
                Cancel
              </button>

              {step === 'mapping' && (
                <button
                  type="button"
                  onClick={proceedToPreview}
                  className="bg-[#1e3a5f] hover:bg-[#152943] text-white px-5 py-1 rounded text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer border border-[#0f243d]"
                >
                  <span>Validate & Preview Rows</span>
                  <ArrowRight size={13} />
                </button>
              )}

              {step === 'preview' && (
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={validCount === 0}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-1 rounded text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:bg-slate-400 disabled:cursor-not-allowed border border-emerald-900"
                >
                  <Check size={14} />
                  <span>Import {validCount} Valid Items</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
