import React, { useState } from 'react';
import { X, Download, Upload, CheckCircle, AlertTriangle, FileSpreadsheet, FileText } from 'lucide-react';
import { JMRItem, JMRMeasurementRow } from '../types';

interface JMRExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: JMRItem[];
  onImport: (importedRowsByItemNo: Record<string, JMRMeasurementRow[]>) => void;
}

interface ParsedRow {
  itemNumber: string;
  entryType: 'Add' | 'Subtract';
  startDate: string;
  endDate: string;
  location: string;
  equipmentNo: string;
  method: 'dimensions' | 'length_width' | 'multiplier' | 'count' | 'direct';
  length: number;
  width: number;
  height: number;
  numberOfTimes: number;
  baseQuantity: number;
  calculatedQuantity: number;
  remarks: string;
  isValid: boolean;
  error?: string;
}

export const JMRExcelModal: React.FC<JMRExcelModalProps> = ({
  isOpen,
  onClose,
  items,
  onImport
}) => {
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [parseError, setParseError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Generate and download pre-filled CSV template
  const handleDownloadTemplate = () => {
    const headers = [
      'Item No',
      'Item Code',
      'Work Description',
      'UOM',
      'Rate',
      'Entry Type (Add/Subtract)',
      'Start Date (YYYY-MM-DD)',
      'End Date (YYYY-MM-DD)',
      'Location / Grid',
      'Equipment No',
      'Method (dimensions/length_width/multiplier/count/direct)',
      'Length',
      'Width',
      'Height',
      'No of Times',
      'Base Qty',
      'Remarks'
    ];

    const today = new Date().toISOString().split('T')[0];
    const rows = items.map(item => [
      `"${item.itemNumber}"`,
      `"${item.itemCode || ''}"`,
      `"${(item.description || '').replace(/"/g, '""').substring(0, 100)}"`,
      `"${item.unit}"`,
      `"${item.rate || 0}"`,
      '"Add"',
      `"${today}"`,
      `"${today}"`,
      '"Grid A1-B2 Floor 1"',
      '""',
      '"dimensions"',
      '10',
      '2.5',
      '0.3',
      '1',
      '7.5',
      '"Sample excavation / measurement"'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `JMR_Measurement_Template_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse CSV or Text File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setParseError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          setParseError('The selected file is empty.');
          return;
        }

        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
        if (lines.length < 2) {
          setParseError('File must contain at least a header row and one data row.');
          return;
        }

        // Simple CSV splitter handling quoted fields
        const parseLine = (line: string): string[] => {
          const result: string[] = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
              } else {
                inQuotes = !inQuotes;
              }
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        };

        const parsed: ParsedRow[] = [];
        const validItemNumbers = new Set(items.map(i => String(i.itemNumber).trim()));

        // Skip header line (index 0)
        for (let i = 1; i < lines.length; i++) {
          const cols = parseLine(lines[i]);
          if (cols.length < 5) continue; // Skip blank or fragmented lines

          const itemNum = cols[0]?.replace(/^"|"$/g, '').trim();
          const entryTypeRaw = cols[5]?.replace(/^"|"$/g, '').trim().toLowerCase();
          const entryType: 'Add' | 'Subtract' = (entryTypeRaw === 'subtract' || entryTypeRaw === 'sub' || entryTypeRaw === '-') ? 'Subtract' : 'Add';
          const startDate = cols[6]?.replace(/^"|"$/g, '').trim() || new Date().toISOString().split('T')[0];
          const endDate = cols[7]?.replace(/^"|"$/g, '').trim() || startDate;
          const location = cols[8]?.replace(/^"|"$/g, '').trim() || '';
          const equipmentNo = cols[9]?.replace(/^"|"$/g, '').trim() || '';
          
          let method = cols[10]?.replace(/^"|"$/g, '').trim().toLowerCase() as any;
          if (!['dimensions', 'length_width', 'multiplier', 'count', 'direct'].includes(method)) {
            method = 'dimensions';
          }

          const length = parseFloat(cols[11]?.replace(/^"|"$/g, '')) || 0;
          const width = parseFloat(cols[12]?.replace(/^"|"$/g, '')) || 0;
          const height = parseFloat(cols[13]?.replace(/^"|"$/g, '')) || 0;
          const numberOfTimes = parseFloat(cols[14]?.replace(/^"|"$/g, '')) || 1;
          const baseQuantity = parseFloat(cols[15]?.replace(/^"|"$/g, '')) || 0;
          const remarks = cols[16]?.replace(/^"|"$/g, '').trim() || '';

          // Calculate quantity
          let calculatedQuantity = 0;
          if (method === 'dimensions') {
            const vol = (length || 1) * (width || 1) * (height || 1);
            calculatedQuantity = parseFloat((vol * numberOfTimes).toFixed(4));
          } else if (method === 'length_width') {
            calculatedQuantity = parseFloat(((length * width) * numberOfTimes).toFixed(4));
          } else {
            calculatedQuantity = parseFloat((baseQuantity * numberOfTimes).toFixed(4));
          }

          const isValid = validItemNumbers.has(itemNum);
          parsed.push({
            itemNumber: itemNum,
            entryType,
            startDate,
            endDate,
            location,
            equipmentNo,
            method,
            length,
            width,
            height,
            numberOfTimes,
            baseQuantity,
            calculatedQuantity,
            remarks,
            isValid,
            error: isValid ? undefined : `Item #${itemNum} does not match any BOQ item in this order.`
          });
        }

        setParsedRows(parsed);
      } catch (err: any) {
        setParseError(`Failed to process spreadsheet file: ${err.message || 'Unknown error'}`);
      }
    };

    reader.readAsText(file);
  };

  // Perform import
  const handleCommitImport = () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      alert('No valid measurement rows found to import.');
      return;
    }

    const grouped: Record<string, JMRMeasurementRow[]> = {};
    validRows.forEach(row => {
      if (!grouped[row.itemNumber]) {
        grouped[row.itemNumber] = [];
      }
      grouped[row.itemNumber].push({
        id: `meas_imp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        entryType: row.entryType,
        startDate: row.startDate,
        endDate: row.endDate,
        location: row.location,
        equipmentNo: row.equipmentNo,
        method: row.method,
        length: row.length,
        width: row.width,
        height: row.height,
        numberOfTimes: row.numberOfTimes,
        baseQuantity: row.baseQuantity,
        calculatedQuantity: row.calculatedQuantity,
        remarks: row.remarks ? `${row.remarks} [Imported]` : 'Imported via CSV',
        description: ''
      });
    });

    onImport(grouped);
    onClose();
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[1px] p-4">
      <div className="bg-[#f0f2f5] border border-[#718baf] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col rounded-none overflow-hidden font-sans text-xs">
        
        {/* Header */}
        <div className="bg-[#1e3a5f] text-white px-4 py-2.5 flex items-center justify-between border-b border-[#0f233a] flex-shrink-0">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet size={16} className="text-[#a5c7f9]" />
            <span className="font-bold tracking-wide">
              EXCEL / CSV MEASUREMENT UPLOAD & TEMPLATE (JMR01)
            </span>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-white p-1">
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          
          {/* Step 1 & 2 Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Step 1: Download Template */}
            <div className="bg-white border border-[#b6c7db] p-3 shadow-2xs">
              <div className="flex items-center gap-2 text-[#1e3a5f] font-bold text-xs mb-2">
                <span className="bg-[#1e3a5f] text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">1</span>
                <span>Download Measurement Template</span>
              </div>
              <p className="text-gray-600 text-[11px] mb-3 leading-normal">
                Download a pre-formatted spreadsheet template pre-populated with all {items.length} BOQ items, unit rates, descriptions, and formulas for this project.
              </p>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="bg-[#2f4f75] hover:bg-[#1e3a5f] text-white px-3 py-1.5 font-semibold text-xs flex items-center gap-1.5 shadow-2xs border border-[#1e3a5f]"
              >
                <Download size={13} /> Download Pre-Filled CSV Template
              </button>
            </div>

            {/* Step 2: Upload File */}
            <div className="bg-white border border-[#b6c7db] p-3 shadow-2xs">
              <div className="flex items-center gap-2 text-[#1e3a5f] font-bold text-xs mb-2">
                <span className="bg-[#1e3a5f] text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">2</span>
                <span>Upload Filled Measurement File</span>
              </div>
              <p className="text-gray-600 text-[11px] mb-2 leading-normal">
                Upload your completed CSV or spreadsheet containing site measurements, Add/Subtract transactions, and dimensions.
              </p>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:border-0 file:text-xs file:font-semibold file:bg-[#e4ebf3] file:text-[#1e3a5f] hover:file:bg-[#d0deed] cursor-pointer"
              />
              {fileName && (
                <div className="mt-2 text-[11px] text-gray-700 font-mono">
                  Selected: <span className="font-bold">{fileName}</span>
                </div>
              )}
            </div>

          </div>

          {/* Parse Error Notification */}
          {parseError && (
            <div className="p-2.5 bg-rose-50 border border-rose-300 text-rose-800 flex items-center gap-2 text-xs">
              <AlertTriangle size={15} />
              <span>{parseError}</span>
            </div>
          )}

          {/* Preview of Parsed Rows */}
          {parsedRows.length > 0 && (
            <div className="bg-white border border-[#b6c7db] p-3 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <div className="font-bold text-[#1e3a5f] flex items-center gap-2">
                  <FileText size={14} /> Measurement Rows Preview ({parsedRows.length} total)
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle size={12} /> {validCount} Valid
                  </span>
                  {invalidCount > 0 && (
                    <span className="text-rose-700 font-bold flex items-center gap-1">
                      <AlertTriangle size={12} /> {invalidCount} Invalid
                    </span>
                  )}
                </div>
              </div>

              <div className="border border-gray-200 overflow-x-auto max-h-56">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 text-[10px] uppercase font-semibold">
                      <th className="p-1 border-b">Status</th>
                      <th className="p-1 border-b">Item No</th>
                      <th className="p-1 border-b">Type</th>
                      <th className="p-1 border-b">Dates</th>
                      <th className="p-1 border-b">Location</th>
                      <th className="p-1 border-b">Formula / Dimensions</th>
                      <th className="p-1 border-b text-right">Net Qty</th>
                      <th className="p-1 border-b">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {parsedRows.slice(0, 50).map((r, i) => (
                      <tr key={i} className={r.isValid ? 'hover:bg-gray-50' : 'bg-rose-50/50'}>
                        <td className="p-1">
                          {r.isValid ? (
                            <CheckCircle size={12} className="text-emerald-600" />
                          ) : (
                            <span title={r.error} className="text-rose-600 font-bold cursor-help">⚠</span>
                          )}
                        </td>
                        <td className="p-1 font-mono font-bold text-[#1e3a5f]">{r.itemNumber}</td>
                        <td className="p-1">
                          <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${r.entryType === 'Add' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                            {r.entryType}
                          </span>
                        </td>
                        <td className="p-1 font-mono text-[10px]">{r.startDate}</td>
                        <td className="p-1 truncate max-w-xs">{r.location || '—'}</td>
                        <td className="p-1 font-mono text-[10px]">
                          {r.method === 'dimensions' ? `${r.length}×${r.width}×${r.height} (×${r.numberOfTimes})` : `${r.baseQuantity} (×${r.numberOfTimes})`}
                        </td>
                        <td className="p-1 text-right font-mono font-bold">
                          {r.calculatedQuantity}
                        </td>
                        <td className="p-1 text-gray-500 truncate max-w-xs">{r.remarks || r.error || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 50 && (
                <div className="text-[10px] text-gray-500 mt-1 italic">
                  Showing first 50 rows of {parsedRows.length}.
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-[#f8fafc] border-t border-[#cbd5e1] p-3 flex items-center justify-between flex-shrink-0">
          <div className="text-gray-500 text-[11px]">
            {validCount > 0 ? `Ready to import ${validCount} measurement entries.` : 'Awaiting file upload.'}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-white hover:bg-gray-100 text-gray-700 px-4 py-1.5 text-xs font-semibold border border-gray-400 shadow-2xs"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={validCount === 0}
              onClick={handleCommitImport}
              className={`px-5 py-1.5 text-xs font-bold border shadow-2xs flex items-center gap-1.5 ${validCount > 0 ? 'bg-[#1e3a5f] hover:bg-[#152840] text-white border-[#0f233a]' : 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed'}`}
            >
              <CheckCircle size={14} className={validCount > 0 ? 'text-emerald-400' : 'text-gray-400'} />
              Import {validCount} Measurements
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
