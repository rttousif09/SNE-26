import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, ChevronDown, ChevronUp, ChevronsUpDown, Download, Printer, 
  X, Filter, Eye, Edit, Trash2, FileText, Check, MoreVertical, 
  SlidersHorizontal, RefreshCw, ChevronLeft, ChevronRight, ChevronsLeft, 
  ChevronsRight, CheckSquare, Square, AlertCircle, Plus, Info, HelpCircle
} from 'lucide-react';
// xlsx & jspdf imports for native enterprise exports
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Type definitions
export interface ERPColumn<T> {
  key: (keyof T & string) | string;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  frozen?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: number; // width in px
  isNumeric?: boolean;
}

export interface ERPBulkAction {
  label: string;
  onClick: (selectedIds: string[]) => void;
  icon?: React.ReactNode;
  className?: string;
}

export interface ERPRowAction<T> {
  label: string;
  onClick: (row: T) => void;
  icon: React.ReactNode;
  tooltip?: string;
  className?: string;
  show?: (row: T) => boolean;
  disabled?: (row: T) => boolean;
}

interface ERPTableProps<T> {
  id?: string;
  data: T[];
  columns: ERPColumn<T>[];
  idKey?: keyof T & string; // unique ID key, e.g. "id" or "workerId"
  searchPlaceholder?: string;
  searchKeys?: (keyof T & string)[];
  loading?: boolean;
  selectedRowId?: string;
  onRowClick?: (row: T) => void;
  bulkActions?: ERPBulkAction[];
  rowActions?: ERPRowAction<T>[];
  summaryFooter?: (filteredData: T[]) => React.ReactNode;
  onAddNew?: () => void;
  addNewText?: string;
  lastUpdated?: string;
  exportFilename?: string;
  // Common badge mapping config for easy status tags
  statusBadgeColumns?: string[];
}

export function ERPTable<T extends Record<string, any>>({
  id = 'erp-table',
  data = [],
  columns = [],
  idKey = 'id',
  searchPlaceholder = 'Quick search records...',
  searchKeys = [],
  loading = false,
  selectedRowId,
  onRowClick,
  bulkActions = [],
  rowActions = [],
  summaryFooter,
  onAddNew,
  addNewText = 'Add New Record',
  lastUpdated,
  exportFilename = 'erp_report',
  statusBadgeColumns = ['status', 'approvedStatus', 'attendanceStatus', 'role', 'designation']
}: ERPTableProps<T>) {

  // Current system local timestamp fallback
  const finalLastUpdated = useMemo(() => {
    if (lastUpdated) return lastUpdated;
    const now = new Date();
    return now.toLocaleString('en-IN', { timeZone: 'IST' }) + ' (IST)';
  }, [lastUpdated]);

  // States
  const [globalSearch, setGlobalSearch] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [showFilterRow, setShowFilterRow] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState<number | 'all'>(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(columns.map(c => c.key));
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    columns.forEach(col => {
      initial[col.key] = col.width || 150;
    });
    return initial;
  });

  // Column resizing state variables
  const resizingColumn = useRef<string | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);

  // Reset selected IDs when data size changes or on unmount
  useEffect(() => {
    setSelectedIds([]);
  }, [data.length]);

  // Handle Resize Mouse Events
  const handleMouseDown = (key: string, e: React.MouseEvent) => {
    resizingColumn.current = key;
    startX.current = e.pageX;
    startWidth.current = columnWidths[key] || 150;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!resizingColumn.current) return;
    const diff = e.pageX - startX.current;
    const newWidth = Math.max(70, startWidth.current + diff);
    setColumnWidths(prev => ({
      ...prev,
      [resizingColumn.current!]: newWidth
    }));
  };

  const handleMouseUp = () => {
    resizingColumn.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // Standard helper for safe string conversion
  const getSafeString = (val: any): string => {
    if (val === null || val === undefined) return '';
    return String(val).toLowerCase();
  };

  // Status Badge Styling Parser
  const renderStatusBadge = (val: any) => {
    const text = String(val).trim();
    const cleanVal = text.toLowerCase();
    
    // Status color presets
    const activeGreen = 'bg-emerald-50 text-emerald-700 border-emerald-300';
    const warningAmber = 'bg-amber-50 text-amber-700 border-amber-300';
    const dangerRed = 'bg-rose-50 text-rose-700 border-rose-300';
    const infoBlue = 'bg-sky-50 text-sky-700 border-sky-300';
    const neutralSlate = 'bg-slate-50 text-slate-700 border-slate-300';

    let colorStyle = neutralSlate;

    if (['active', 'approved', 'completed', 'present', 'ongoing', 'paid', 'success', 'yes'].includes(cleanVal)) {
      colorStyle = activeGreen;
    } else if (['pending', 'on leave', 'transferred', 'warning', 'review', 'partial', 'hold'].includes(cleanVal)) {
      colorStyle = warningAmber;
    } else if (['returned', 'left', 'rejected', 'danger', 'inactive', 'no', 'absent'].includes(cleanVal)) {
      colorStyle = dangerRed;
    } else if (['manager', 'engineer', 'supervisor', 'admin', 'office', 'staff'].includes(cleanVal)) {
      colorStyle = infoBlue;
    }

    return (
      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${colorStyle} inline-block shadow-2xs`}>
        {text}
      </span>
    );
  };

  // Main Filtering Logic
  const filteredData = useMemo(() => {
    return data.filter(row => {
      // 1. Global search match
      if (globalSearch.trim() !== '') {
        const term = globalSearch.toLowerCase();
        const keysToSearch = searchKeys.length > 0 ? searchKeys : columns.map(c => c.key);
        const matchesGlobal = keysToSearch.some(key => {
          const val = row[key];
          return getSafeString(val).includes(term);
        });
        if (!matchesGlobal) return false;
      }

      // 2. Column-wise filters match
      const colFilterKeys = Object.keys(columnFilters);
      for (const key of colFilterKeys) {
        const filterVal = columnFilters[key];
        if (filterVal && filterVal.trim() !== '') {
          const rowVal = row[key];
          if (!getSafeString(rowVal).includes(filterVal.toLowerCase())) {
            return false;
          }
        }
      }

      return true;
    });
  }, [data, globalSearch, columnFilters, searchKeys, columns]);

  // Main Sorting Logic (supports multi-column sorting natively)
  const sortedData = useMemo(() => {
    if (sortConfig.length === 0) return filteredData;

    return [...filteredData].sort((a, b) => {
      for (const sort of sortConfig) {
        const valA = a[sort.key];
        const valB = b[sort.key];

        if (valA === valB) continue;

        const isNum = typeof valA === 'number' && typeof valB === 'number';
        if (isNum) {
          return sort.direction === 'asc' ? valA - valB : valB - valA;
        } else {
          const strA = getSafeString(valA);
          const strB = getSafeString(valB);
          return sort.direction === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
        }
      }
      return 0;
    });
  }, [filteredData, sortConfig]);

  // Pagination Logic
  const paginatedData = useMemo(() => {
    if (pageSize === 'all') return sortedData;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = useMemo(() => {
    if (pageSize === 'all') return 1;
    return Math.ceil(sortedData.length / pageSize);
  }, [sortedData.length, pageSize]);

  // Adjust current page if it is out of range
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Selection helpers
  const isAllSelected = useMemo(() => {
    if (paginatedData.length === 0) return false;
    return paginatedData.every(row => selectedIds.includes(String(row[idKey])));
  }, [paginatedData, selectedIds, idKey]);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      const pageRowIds = paginatedData.map(row => String(row[idKey]));
      setSelectedIds(prev => prev.filter(id => !pageRowIds.includes(id)));
    } else {
      const pageRowIds = paginatedData.map(row => String(row[idKey]));
      setSelectedIds(prev => {
        const merged = [...prev, ...pageRowIds];
        return Array.from(new Set(merged));
      });
    }
  };

  const toggleSelectRow = (rowId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent triggering row click callbacks
    setSelectedIds(prev => 
      prev.includes(rowId) ? prev.filter(id => id !== rowId) : [...prev, rowId]
    );
  };

  // Handle single column sorting toggle
  const handleSort = (key: string, multiSort = false) => {
    setSortConfig(prev => {
      const existing = prev.find(s => s.key === key);
      if (!existing) {
        if (multiSort) {
          return [...prev, { key, direction: 'asc' }];
        }
        return [{ key, direction: 'asc' }];
      } else if (existing.direction === 'asc') {
        if (multiSort) {
          return prev.map(s => s.key === key ? { ...s, direction: 'desc' as const } : s);
        }
        return [{ key, direction: 'desc' as const }];
      } else {
        if (multiSort) {
          return prev.filter(s => s.key !== key);
        }
        return [];
      }
    });
  };

  // EXPORT FUNCTIONS
  // 1. Export CSV
  const handleExportCSV = () => {
    const csvHeaders = columns.filter(c => visibleColumns.includes(c.key)).map(c => c.header).join(',');
    const csvRows = sortedData.map(row => {
      return columns
        .filter(c => visibleColumns.includes(c.key))
        .map(c => {
          const val = row[c.key];
          // escape quotes
          const escaped = String(val === null || val === undefined ? '' : val).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(',');
    });
    
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [csvHeaders, ...csvRows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${exportFilename}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. Export Excel (Real workbook using xlsx)
  const handleExportExcel = () => {
    const exportColumns = columns.filter(c => visibleColumns.includes(c.key));
    const excelData = sortedData.map(row => {
      const obj: Record<string, any> = {};
      exportColumns.forEach(c => {
        obj[c.header] = row[c.key];
      });
      return obj;
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    
    // Auto-fit column widths
    const maxLens = exportColumns.map(c => {
      const headerLen = c.header.length;
      const dataLens = sortedData.map(row => String(row[c.key] || '').length);
      return Math.max(headerLen, ...dataLens, 10) * 1.2;
    });
    worksheet['!cols'] = maxLens.map(len => ({ wch: len }));

    XLSX.writeFile(workbook, `${exportFilename}_${Date.now()}.xlsx`);
  };

  // 3. Export PDF (Real multi-page tabular PDF using jsPDF and jspdf-autotable)
  const handleExportPDF = () => {
    const doc = new jsPDF('landscape', 'pt', 'a4');
    
    // ERP Branding Header
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(40, 30, 762, 50, 'F');
    doc.setTextColor(245, 158, 11); // Amber-500
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('SN ENTERPRISES - ERP ARCHIVE REPORT', 55, 52);
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Document Type: ${exportFilename.toUpperCase()} | Generated: ${finalLastUpdated}`, 55, 68);

    const exportColumns = columns.filter(c => visibleColumns.includes(c.key));
    const tableHeaders = exportColumns.map(c => c.header);
    const tableBody = sortedData.map(row => {
      return exportColumns.map(c => {
        const val = row[c.key];
        return val === null || val === undefined ? '' : String(val);
      });
    });

    // Generate table layout
    (doc as any).autoTable({
      head: [tableHeaders],
      body: tableBody,
      startY: 95,
      margin: { left: 40, right: 40 },
      styles: {
        fontSize: 8,
        cellPadding: 4,
        overflow: 'linebreak',
        halign: 'left'
      },
      headStyles: {
        fillColor: [51, 65, 85], // Slate-700
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252] // Slate-50
      },
      footerStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: 'bold'
      },
      didDrawPage: (data: any) => {
        // Page footer count
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`Page ${data.pageNumber} | Confidential construction ledger report for SN Enterprises`, 40, 565);
      }
    });

    doc.save(`${exportFilename}_${Date.now()}.pdf`);
  };

  // 4. Print Table View
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const exportColumns = columns.filter(c => visibleColumns.includes(c.key));
    
    const html = `
      <html>
        <head>
          <title>Print Ledger | SN Enterprises</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; color: #1e293b; }
            h1 { font-size: 18px; color: #1e293b; border-bottom: 2px solid #f59e0b; padding-bottom: 8px; margin-bottom: 20px; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
            th { background-color: #334155; color: white; text-align: left; padding: 8px 10px; font-weight: bold; border: 1px solid #e2e8f0; }
            td { padding: 7px 10px; border: 1px solid #e2e8f0; text-align: left; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .meta { font-size: 10px; color: #64748b; margin-top: -10px; margin-bottom: 15px; font-weight: 500; }
            .footer { margin-top: 30px; border-top: 1px solid #cbd5e1; padding-top: 10px; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <h1>SN Enterprises construction audit registry - ${exportFilename.toUpperCase()}</h1>
          <div class="meta">Generated: ${finalLastUpdated} | Filtered Records: ${sortedData.length} of ${data.length} total</div>
          <table>
            <thead>
              <tr>
                ${exportColumns.map(c => `<th>${c.header}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${sortedData.map(row => `
                <tr>
                  ${exportColumns.map(c => `<td>${row[c.key] === null || row[c.key] === undefined ? '' : row[c.key]}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            <span>Prepared on Construction ERP Terminal</span>
            <span>Page 1 of 1</span>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col w-full text-[11px] relative" id={id}>
      
      {/* 1. Header Toolbar (Search, config columns, actions, status filter panel toggle) */}
      <div className="bg-slate-50 border-b border-gray-200 p-3 flex flex-wrap gap-2.5 justify-between items-center z-20">
        
        {/* Left block: Search input & Add new buttons */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1.5 text-gray-400" size={13} />
            <input 
              type="text" 
              placeholder={searchPlaceholder}
              value={globalSearch}
              onChange={(e) => {
                setGlobalSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 pr-7 py-1 w-full border border-gray-300 rounded font-medium text-[11px] bg-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
            />
            {globalSearch && (
              <button 
                onClick={() => setGlobalSearch('')}
                className="absolute right-2 top-2 text-gray-400 hover:text-gray-700"
              >
                <X size={11} />
              </button>
            )}
          </div>

          <button 
            onClick={() => setShowFilterRow(!showFilterRow)}
            className={`px-2.5 py-1 rounded border font-bold flex items-center space-x-1 text-[10px] transition ${
              showFilterRow || Object.values(columnFilters).some(v => v !== '')
                ? 'bg-amber-500 text-slate-900 border-amber-600 shadow-xs' 
                : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300'
            }`}
            title="Toggle column-wise advanced filter fields"
          >
            <Filter size={12} />
            <span>Advanced Filters</span>
            {Object.values(columnFilters).some(v => v !== '') && (
              <span className="w-1.5 h-1.5 bg-rose-600 rounded-full inline-block animate-ping" />
            )}
          </button>

          {/* Column configs */}
          <div className="relative">
            <button 
              onClick={() => setShowColumnConfig(!showColumnConfig)}
              className={`px-2.5 py-1 rounded border bg-white hover:bg-gray-100 text-gray-700 border-gray-300 font-bold flex items-center space-x-1 text-[10px] transition ${
                showColumnConfig ? 'bg-gray-100 border-gray-400' : ''
              }`}
              title="Show/Hide Columns"
            >
              <SlidersHorizontal size={12} />
              <span>Visible Columns</span>
              <ChevronDown size={10} />
            </button>

            <AnimatePresence>
              {showColumnConfig && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowColumnConfig(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute left-0 mt-1 w-52 bg-white border border-gray-200 rounded shadow-lg p-2.5 z-40 max-h-64 overflow-y-auto space-y-1.5"
                  >
                    <div className="font-extrabold uppercase text-[8px] text-gray-400 border-b pb-1 mb-1.5 flex justify-between">
                      <span>Select columns to display</span>
                      <button 
                        onClick={() => setVisibleColumns(columns.map(c => c.key))}
                        className="text-amber-600 hover:text-amber-800"
                      >
                        Reset All
                      </button>
                    </div>
                    {columns.map(col => {
                      const isVis = visibleColumns.includes(col.key);
                      return (
                        <label 
                          key={col.key} 
                          className="flex items-center space-x-2 p-1 hover:bg-slate-50 rounded cursor-pointer text-[10px] font-semibold text-slate-700"
                        >
                          <input 
                            type="checkbox" 
                            checked={isVis} 
                            disabled={isVis && visibleColumns.length === 1} // leave at least 1 column
                            onChange={() => {
                              setVisibleColumns(prev => 
                                prev.includes(col.key) 
                                  ? prev.filter(k => k !== col.key) 
                                  : [...prev, col.key]
                              );
                            }}
                            className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                          />
                          <span>{col.header}</span>
                        </label>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Reset Filters button */}
          {(Object.values(columnFilters).some(v => v !== '') || globalSearch !== '') && (
            <button 
              onClick={() => {
                setGlobalSearch('');
                setColumnFilters({});
                setSortConfig([]);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded font-bold text-[10px] transition"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Right block: Export toolbars & Call to Action */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex space-x-1 border border-gray-300 rounded bg-white p-0.5">
            <button 
              onClick={handleExportExcel} 
              disabled={sortedData.length === 0}
              className="p-1 hover:bg-gray-100 text-emerald-700 rounded transition disabled:opacity-40"
              title="Export filtered to Excel Document"
            >
              <Download size={13} className="inline mr-0.5" />
              <span className="text-[9px] font-bold">EXCEL</span>
            </button>
            <span className="w-[1px] bg-gray-300 my-1" />
            <button 
              onClick={handleExportPDF} 
              disabled={sortedData.length === 0}
              className="p-1 hover:bg-gray-100 text-rose-700 rounded transition disabled:opacity-40"
              title="Export filtered as professional PDF"
            >
              <FileText size={13} className="inline mr-0.5" />
              <span className="text-[9px] font-bold">PDF</span>
            </button>
            <span className="w-[1px] bg-gray-300 my-1" />
            <button 
              onClick={handleExportCSV} 
              disabled={sortedData.length === 0}
              className="p-1 hover:bg-gray-100 text-sky-700 rounded transition disabled:opacity-40"
              title="Download standard CSV"
            >
              <Download size={13} className="inline mr-0.5" />
              <span className="text-[9px] font-bold">CSV</span>
            </button>
            <span className="w-[1px] bg-gray-300 my-1" />
            <button 
              onClick={handlePrint} 
              disabled={sortedData.length === 0}
              className="p-1 hover:bg-gray-100 text-gray-700 rounded transition disabled:opacity-40"
              title="Send to physical printer or save to PDF"
            >
              <Printer size={13} />
            </button>
          </div>

          {onAddNew && (
            <button 
              onClick={onAddNew}
              className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-extrabold px-3 py-1 rounded flex items-center space-x-1 transition shadow-xs cursor-pointer text-[10px] uppercase tracking-wide shrink-0"
            >
              <Plus size={12} className="stroke-[3px]" />
              <span>{addNewText}</span>
            </button>
          )}
        </div>

      </div>

      {/* 2. Column-wise Advanced Filters Panel */}
      <AnimatePresence>
        {showFilterRow && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-slate-50/50 border-b border-gray-200 p-2.5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 z-10"
          >
            {columns.filter(c => visibleColumns.includes(c.key) && c.filterable !== false).map(col => (
              <div key={col.key} className="flex flex-col space-y-0.5">
                <label className="text-[8px] font-bold uppercase text-gray-500 tracking-wider truncate">{col.header}</label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder={`Filter by ${col.header}...`}
                    value={columnFilters[col.key] || ''}
                    onChange={(e) => {
                      setColumnFilters(prev => ({
                        ...prev,
                        [col.key]: e.target.value
                      }));
                      setCurrentPage(1);
                    }}
                    className="py-0.5 px-2 w-full border border-gray-300 rounded text-[10px] font-medium outline-none focus:border-amber-500 bg-white"
                  />
                  {columnFilters[col.key] && (
                    <button 
                      onClick={() => setColumnFilters(prev => ({ ...prev, [col.key]: '' }))}
                      className="absolute right-1 top-1 text-gray-400 hover:text-gray-700"
                    >
                      <X size={9} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Main Data Table Frame */}
      <div className="overflow-x-auto overflow-y-auto max-h-[580px] w-full border-b border-gray-200 scrollbar-thin">
        
        {/* Desktop View Table */}
        <table className="min-w-full table-fixed border-collapse divide-y divide-gray-200 text-[11px] hidden md:table">
          
          {/* Table Colgroups for Resizing representation */}
          <colgroup>
            {/* Multi-selection column */}
            {bulkActions.length > 0 && <col style={{ width: '45px' }} />}
            {/* Standard columns */}
            {columns.filter(c => visibleColumns.includes(c.key)).map(col => (
              <col key={col.key} style={{ width: `${columnWidths[col.key] || 150}px` }} />
            ))}
            {/* Row Actions column */}
            {rowActions.length > 0 && <col style={{ width: '120px' }} />}
          </colgroup>

          {/* Sticky Table Header */}
          <thead className="bg-slate-700 text-white sticky top-0 z-10 select-none shadow-sm font-semibold">
            <tr>
              
              {/* Selection Column Header */}
              {bulkActions.length > 0 && (
                <th className="px-3 py-2 text-center w-[45px] bg-slate-800 border-r border-slate-600">
                  <button 
                    onClick={toggleSelectAll} 
                    className="text-white hover:text-amber-400 transition inline-block align-middle"
                    title={isAllSelected ? "Deselect page records" : "Select all page records"}
                  >
                    {isAllSelected ? <CheckSquare size={13} className="text-amber-400" /> : <Square size={13} />}
                  </button>
                </th>
              )}

              {/* Mapped Visible Column Headers */}
              {columns.filter(c => visibleColumns.includes(c.key)).map((col, index) => {
                const isSort = col.sortable !== false;
                const activeSort = sortConfig.find(s => s.key === col.key);
                const isFrozen = col.frozen;
                const frozenStyle = isFrozen ? 'sticky left-0 bg-slate-800 z-12 border-r border-slate-600' : '';

                return (
                  <th 
                    key={col.key}
                    onClick={() => isSort && handleSort(col.key)}
                    className={`px-3 py-2 text-${col.align || 'left'} font-bold text-[10px] uppercase tracking-wider relative border-r border-slate-600/50 group ${
                      isSort ? 'cursor-pointer hover:bg-slate-800 transition' : ''
                    } ${frozenStyle}`}
                    style={{ 
                      textAlign: col.align || (col.isNumeric ? 'right' : 'left'),
                    }}
                  >
                    <div className="flex items-center space-x-1.5 justify-between">
                      <span className="truncate">{col.header}</span>
                      
                      {/* Sorting indicators */}
                      {isSort && (
                        <span className="text-slate-400 group-hover:text-amber-400 transition">
                          {activeSort?.direction === 'asc' && <ChevronUp size={11} className="text-amber-400" />}
                          {activeSort?.direction === 'desc' && <ChevronDown size={11} className="text-amber-400" />}
                          {!activeSort && <ChevronsUpDown size={11} className="opacity-40" />}
                        </span>
                      )}
                    </div>

                    {/* Resize Handle Drag Area */}
                    <div 
                      onMouseDown={(e) => handleMouseDown(col.key, e)}
                      onClick={(e) => e.stopPropagation()} // block sorting toggle
                      className="absolute right-0 top-0 bottom-0 w-1 bg-transparent hover:bg-amber-500 cursor-col-resize z-10 transition duration-150"
                    />
                  </th>
                );
              })}

              {/* Actions Header */}
              {rowActions.length > 0 && (
                <th className="px-3 py-2 text-center bg-slate-800 font-bold text-[10px] uppercase tracking-wider sticky right-0 border-l border-slate-600 z-12">
                  <span>Actions</span>
                </th>
              )}

            </tr>
          </thead>

          {/* Table Body Content */}
          <tbody className="divide-y divide-gray-200 bg-white">
            
            {/* Loading state skeleton template */}
            {loading ? (
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={rIdx} className="animate-pulse bg-slate-50">
                  {bulkActions.length > 0 && (
                    <td className="p-3 text-center border-r border-gray-100">
                      <div className="w-4 h-4 bg-gray-200 rounded mx-auto" />
                    </td>
                  )}
                  {columns.filter(c => visibleColumns.includes(c.key)).map((c, colIdx) => (
                    <td key={colIdx} className="p-3">
                      <div className={`h-3 bg-gray-200 rounded ${c.isNumeric ? 'ml-auto w-12' : 'w-24'}`} />
                    </td>
                  ))}
                  {rowActions.length > 0 && (
                    <td className="p-3 sticky right-0 bg-slate-50 border-l border-gray-100">
                      <div className="w-16 h-3 bg-gray-200 rounded mx-auto" />
                    </td>
                  )}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              
              /* Clean illustrative Empty State */
              <tr>
                <td 
                  colSpan={columns.filter(c => visibleColumns.includes(c.key)).length + (bulkActions.length > 0 ? 1 : 0) + (rowActions.length > 0 ? 1 : 0)}
                  className="py-16 text-center text-gray-500 bg-slate-50/50"
                >
                  <div className="max-w-md mx-auto space-y-3 flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center border-2 border-slate-200 animate-bounce">
                      <AlertCircle className="text-slate-400" size={24} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-[12px] uppercase tracking-wide">No Records Found</h3>
                      <p className="text-[10px] text-gray-400 mt-1">
                        There are no rows matches your current filters or query params inside SN Enterprises ERP.
                      </p>
                    </div>
                    {onAddNew && (
                      <button 
                        onClick={onAddNew}
                        className="bg-slate-800 hover:bg-slate-700 text-amber-500 border border-slate-700 font-bold px-3 py-1 rounded text-[10px] uppercase transition shadow-sm"
                      >
                        {addNewText}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
              
            ) : (
              
              /* Real Row lists render */
              paginatedData.map((row, rIdx) => {
                const rowId = String(row[idKey]);
                const isSelected = selectedIds.includes(rowId);
                const isHighlighted = selectedRowId === rowId;

                return (
                  <tr 
                    key={rowId}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`transition duration-150 group text-slate-800 ${
                      isSelected 
                        ? 'bg-amber-50/70 hover:bg-amber-50' 
                        : isHighlighted
                        ? 'bg-amber-100/70 hover:bg-amber-100 font-medium'
                        : rIdx % 2 === 0 
                        ? 'bg-white hover:bg-slate-50/80' 
                        : 'bg-slate-50/40 hover:bg-slate-50/80'
                    } ${onRowClick ? 'cursor-pointer' : ''}`}
                  >
                    
                    {/* Multiselect Column cell */}
                    {bulkActions.length > 0 && (
                      <td 
                        className="px-3 py-2 text-center border-r border-gray-100"
                        onClick={(e) => e.stopPropagation()} // hold row select trigger
                      >
                        <button 
                          onClick={(e) => toggleSelectRow(rowId, e)}
                          className="text-gray-400 hover:text-amber-500 transition inline-block align-middle"
                        >
                          {isSelected ? <CheckSquare size={13} className="text-amber-500" /> : <Square size={13} />}
                        </button>
                      </td>
                    )}

                    {/* Standard cells mapping */}
                    {columns.filter(c => visibleColumns.includes(c.key)).map(col => {
                      const val = row[col.key];
                      const isFrozen = col.frozen;
                      const frozenStyle = isFrozen ? 'sticky left-0 bg-slate-50 group-hover:bg-slate-100/90 z-11 border-r border-gray-200' : '';
                      const isNumeric = col.isNumeric;
                      
                      // Check if it's status column to format badge automatically
                      const isStatus = statusBadgeColumns.includes(col.key);

                      return (
                        <td 
                          key={col.key}
                          className={`px-3 py-1.5 whitespace-nowrap truncate font-medium ${frozenStyle}`}
                          style={{ 
                            textAlign: col.align || (isNumeric ? 'right' : 'left'),
                            maxWidth: `${columnWidths[col.key] || 150}px`
                          }}
                        >
                          {col.render ? (
                            col.render(val, row)
                          ) : isStatus ? (
                            renderStatusBadge(val)
                          ) : isNumeric ? (
                            <span className="font-mono font-bold text-slate-900">
                              {typeof val === 'number' ? `₹${val.toLocaleString('en-IN')}` : val}
                            </span>
                          ) : (
                            val === null || val === undefined ? (
                              <span className="text-gray-300 font-mono">-</span>
                            ) : (
                              String(val)
                            )
                          )}
                        </td>
                      );
                    })}

                    {/* Row Actions cell */}
                    {rowActions.length > 0 && (
                      <td 
                        className="px-3 py-1.5 whitespace-nowrap text-center sticky right-0 bg-white group-hover:bg-slate-50 z-11 border-l border-gray-200 shadow-2xl"
                        onClick={(e) => e.stopPropagation()} // bypass row navigation
                      >
                        <div className="inline-flex space-x-1 justify-center">
                          {rowActions.filter(act => !act.show || act.show(row)).map((act, aIdx) => {
                            const isActDisabled = act.disabled?.(row);
                            return (
                              <button 
                                key={aIdx}
                                onClick={() => !isActDisabled && act.onClick(row)}
                                disabled={isActDisabled}
                                className={`p-1 rounded text-gray-650 hover:text-slate-900 transition relative group-tooltip disabled:opacity-30 disabled:cursor-not-allowed ${
                                  isActDisabled ? '' : 'hover:bg-gray-100'
                                } ${act.className || ''}`}
                                title={act.tooltip || act.label}
                              >
                                {act.icon}
                                
                                {/* Soft tooltip representation */}
                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 bg-slate-800 text-white font-bold text-[8px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition mb-1 z-30 shadow-md uppercase tracking-wider whitespace-nowrap">
                                  {act.tooltip || act.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    )}

                  </tr>
                );
              })
            )}

          </tbody>
        </table>

        {/* 4. Auto-Responsive Mobile Card Grid (displays beautifully on mobile screens) */}
        <div className="md:hidden p-3 space-y-3.5 bg-slate-50">
          {loading ? (
            Array.from({ length: 3 }).map((_, rIdx) => (
              <div key={rIdx} className="bg-white border rounded p-3 space-y-2 animate-pulse">
                <div className="h-3 bg-gray-200 rounded w-1/3" />
                <div className="h-3 bg-gray-200 rounded w-full" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))
          ) : paginatedData.length === 0 ? (
            <div className="text-center py-10 bg-white rounded border border-gray-200">
              <AlertCircle size={20} className="mx-auto text-gray-400 mb-1" />
              <div className="font-bold text-gray-700 text-[10px] uppercase">No Match Found</div>
            </div>
          ) : (
            paginatedData.map((row) => {
              const rowId = String(row[idKey]);
              const isSelected = selectedIds.includes(rowId);
              
              return (
                <div 
                  key={rowId}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`bg-white border rounded-lg p-3 space-y-2 relative shadow-xs transition ${
                    isSelected ? 'border-amber-500 bg-amber-50/20' : 'border-gray-200 hover:border-amber-400'
                  }`}
                >
                  {/* Select badge box on top-right */}
                  {bulkActions.length > 0 && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectRow(rowId, e);
                      }}
                      className="absolute right-2 top-2 text-gray-400 hover:text-amber-500"
                    >
                      {isSelected ? <CheckSquare size={14} className="text-amber-500" /> : <Square size={14} />}
                    </button>
                  )}

                  {/* Render Columns as Label-Value Pairs */}
                  <div className="space-y-1.5">
                    {columns.filter(c => visibleColumns.includes(c.key)).slice(0, 5).map(col => {
                      const val = row[col.key];
                      const isStatus = statusBadgeColumns.includes(col.key);

                      return (
                        <div key={col.key} className="flex justify-between items-start text-[10px]">
                          <span className="text-gray-400 font-extrabold uppercase tracking-wide mr-2 truncate max-w-[120px]">{col.header}:</span>
                          <span className="font-semibold text-slate-800 text-right truncate max-w-[180px]">
                            {col.render ? (
                              col.render(val, row)
                            ) : isStatus ? (
                              renderStatusBadge(val)
                            ) : col.isNumeric ? (
                              <span className="font-mono text-slate-950 font-bold">₹{val?.toLocaleString() || val}</span>
                            ) : (
                              val || '-'
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Actions Bar for Mobile card */}
                  {rowActions.length > 0 && (
                    <div className="border-t pt-2 mt-2 flex justify-end space-x-2">
                      {rowActions.filter(act => !act.show || act.show(row)).map((act, aIdx) => {
                        const isActDisabled = act.disabled?.(row);
                        return (
                          <button 
                            key={aIdx}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isActDisabled) act.onClick(row);
                            }}
                            disabled={isActDisabled}
                            className={`px-2 py-0.5 rounded border border-gray-300 hover:bg-slate-50 text-gray-700 flex items-center space-x-1 transition text-[9px] font-bold uppercase disabled:opacity-30 disabled:cursor-not-allowed ${act.className || ''}`}
                          >
                            {act.icon}
                            <span>{act.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>

      </div>

      {/* 5. Custom Computed Summary Row (Summary Footer) */}
      {summaryFooter && sortedData.length > 0 && !loading && (
        <div className="bg-slate-50 border-b border-gray-200 px-4 py-2.5 z-10 font-bold">
          {summaryFooter(sortedData)}
        </div>
      )}

      {/* 6. Pagination Footer Control Block */}
      <div className="bg-slate-50 p-2.5 flex flex-col sm:flex-row justify-between items-center gap-2.5 select-none z-10 border-t border-gray-200">
        
        {/* Left block: Display counts */}
        <div className="text-[10px] text-gray-500 font-bold flex flex-wrap gap-x-3 items-center justify-center sm:justify-start">
          <span>
            Showing {sortedData.length === 0 ? 0 : (currentPage - 1) * (pageSize === 'all' ? sortedData.length : pageSize) + 1}
            –
            {pageSize === 'all' ? sortedData.length : Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} records 
            {sortedData.length !== data.length && ` (Filtered from ${data.length} total)`}
          </span>
          {lastUpdated && (
            <span className="text-gray-400 font-medium">| Sync: {finalLastUpdated}</span>
          )}
        </div>

        {/* Center/Right block: size, navigation */}
        <div className="flex flex-wrap items-center gap-2.5 justify-center">
          
          {/* Page size dropdown */}
          <div className="flex items-center space-x-1.5 text-[10px]">
            <span className="text-gray-400 font-bold">Rows:</span>
            <select 
              value={pageSize === 'all' ? 'all' : pageSize} 
              onChange={(e) => {
                const val = e.target.value;
                setPageSize(val === 'all' ? 'all' : Number(val));
                setCurrentPage(1);
              }}
              className="border border-gray-300 rounded px-1.5 py-0.5 bg-white font-bold outline-none focus:border-amber-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value="all">All</option>
            </select>
          </div>

          {/* Page buttons */}
          {pageSize !== 'all' && totalPages > 1 && (
            <div className="inline-flex space-x-1">
              
              <button 
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1 border rounded bg-white hover:bg-gray-100 border-gray-300 disabled:opacity-45 text-gray-600"
                title="First page"
              >
                <ChevronsLeft size={12} />
              </button>

              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 border rounded bg-white hover:bg-gray-100 border-gray-300 disabled:opacity-45 text-gray-600"
                title="Previous page"
              >
                <ChevronLeft size={12} />
              </button>

              {/* Mapped numeric buttons */}
              {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
                // Keep active page centered
                let pNum = idx + 1;
                if (currentPage > 3) {
                  pNum = currentPage - 3 + idx;
                  if (pNum + (4 - idx) > totalPages) {
                    pNum = totalPages - 4 + idx;
                  }
                }
                pNum = Math.max(1, pNum);
                if (pNum > totalPages) return null;

                return (
                  <button 
                    key={pNum}
                    onClick={() => setCurrentPage(pNum)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                      currentPage === pNum 
                        ? 'bg-amber-500 border-amber-600 text-slate-900 font-extrabold shadow-2xs' 
                        : 'bg-white hover:bg-gray-100 border-gray-300 text-gray-650'
                    }`}
                  >
                    {pNum}
                  </button>
                );
              })}

              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 border rounded bg-white hover:bg-gray-100 border-gray-300 disabled:opacity-45 text-gray-600"
                title="Next page"
              >
                <ChevronRight size={12} />
              </button>

              <button 
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1 border rounded bg-white hover:bg-gray-100 border-gray-300 disabled:opacity-45 text-gray-600"
                title="Last page"
              >
                <ChevronsRight size={12} />
              </button>

            </div>
          )}

        </div>

      </div>

      {/* 7. Slide-up Multi-Row Bulk Action Bar (only visible when rows are checked!) */}
      <AnimatePresence>
        {selectedIds.length > 0 && bulkActions.length > 0 && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900 border-2 border-amber-500 text-white rounded-full px-5 py-2.5 flex items-center space-x-4 shadow-2xl z-30 font-bold"
          >
            <div className="flex items-center space-x-1.5">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-900 flex items-center justify-center text-[10px] font-extrabold shadow-sm">
                {selectedIds.length}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-gray-300">Selected</span>
            </div>
            
            <span className="h-4 w-[1px] bg-slate-700" />

            <div className="flex items-center space-x-2">
              {bulkActions.map((act, idx) => (
                <button 
                  key={idx}
                  onClick={() => {
                    act.onClick(selectedIds);
                    setSelectedIds([]);
                  }}
                  className={`px-3 py-1 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 rounded-full text-[9px] uppercase tracking-wide flex items-center space-x-1 transition border border-slate-700 shadow-sm cursor-pointer ${act.className || ''}`}
                >
                  {act.icon}
                  <span>{act.label}</span>
                </button>
              ))}
              
              <button 
                onClick={() => setSelectedIds([])}
                className="p-1 hover:bg-slate-800 rounded-full text-gray-400 hover:text-white transition"
                title="Deselect all rows"
              >
                <X size={12} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
