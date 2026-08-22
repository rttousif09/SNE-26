import React, { useState, useMemo } from 'react';
import { 
  ChevronDown, ChevronUp, ChevronsUpDown, Search, Download, 
  Eye, Filter, CheckSquare, Square, MoreHorizontal, ArrowUpDown,
  Printer, SlidersHorizontal, RefreshCw, X, ChevronLeft, ChevronRight
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';

export interface ColumnDef<T> {
  key: string;
  header: string;
  accessor?: (row: T) => any;
  render?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
  minWidth?: string;
  sticky?: 'left' | 'right';
  className?: string;
  headerClassName?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  keyField?: string;
  title?: string;
  searchPlaceholder?: string;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  bulkActions?: {
    label: string;
    onClick: (selectedRows: T[]) => void;
    icon?: React.ReactNode;
    variant?: 'primary' | 'danger' | 'secondary';
  }[];
  onRowClick?: (row: T) => void;
  defaultSortField?: string;
  defaultSortOrder?: 'asc' | 'desc';
  pageSizeOptions?: number[];
  defaultPageSize?: number;
  onExportExcel?: () => void;
  onPrint?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: {
    label: string;
    onClick: () => void;
  };
  isLoading?: boolean;
  filterChips?: { key: string; label: string; onRemove: () => void }[];
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  data = [],
  columns,
  keyField = 'id',
  title,
  searchPlaceholder = 'Search records...',
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  bulkActions = [],
  onRowClick,
  defaultSortField,
  defaultSortOrder = 'desc',
  pageSizeOptions = [10, 25, 50, 100],
  defaultPageSize = 25,
  onExportExcel,
  onPrint,
  emptyTitle = 'No Records Found',
  emptyDescription = 'No transactions match the selected filters or search query.',
  emptyAction,
  isLoading = false,
  filterChips = [],
  className = ''
}: DataTableProps<T>) {
  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Sort state
  const [sortField, setSortField] = useState<string | undefined>(defaultSortField);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(defaultSortOrder);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // Density control: 'compact' (dense SAP GUI / Excel density) vs 'comfortable' (Fiori / Oracle)
  const [density, setDensity] = useState<'compact' | 'comfortable'>('compact');

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    columns.forEach(col => {
      init[col.key] = true;
    });
    return init;
  });
  const [showColMenu, setShowColMenu] = useState(false);

  // Filtered and Sorted Data
  const processedData = useMemo(() => {
    let result = [...data];

    // 1. Quick search across all string/number fields
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(row => {
        return Object.entries(row).some(([_, val]) => {
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(q);
        });
      });
    }

    // 2. Sort
    if (sortField) {
      const col = columns.find(c => c.key === sortField);
      result.sort((a, b) => {
        let valA = col?.accessor ? col.accessor(a) : a[sortField];
        let valB = col?.accessor ? col.accessor(b) : b[sortField];

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchTerm, sortField, sortOrder, columns]);

  // Paginated Data
  const totalPages = Math.max(1, Math.ceil(processedData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedData.slice(start, start + pageSize);
  }, [processedData, currentPage, pageSize]);

  // Selection handlers
  const allCurrentPageSelected = paginatedData.length > 0 && paginatedData.every(row => selectedIds.includes(row[keyField]));
  const toggleSelectAll = () => {
    if (!onSelectionChange) return;
    if (allCurrentPageSelected) {
      const pageIds = paginatedData.map(r => r[keyField]);
      onSelectionChange(selectedIds.filter(id => !pageIds.includes(id)));
    } else {
      const pageIds = paginatedData.map(r => r[keyField]);
      const next = Array.from(new Set([...selectedIds, ...pageIds]));
      onSelectionChange(next);
    }
  };

  const toggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onSelectionChange) return;
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(i => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const handleSort = (key: string, sortable?: boolean) => {
    if (sortable === false) return;
    if (sortField === key) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(key);
      setSortOrder('asc');
    }
  };

  const activeCols = columns.filter(c => visibleColumns[c.key] !== false);

  // Density classes
  const pyClass = density === 'compact' ? 'py-1.5' : 'py-3';
  const textClass = density === 'compact' ? 'text-[11px]' : 'text-xs';

  return (
    <div className={`bg-white dark:bg-[#1E2228] border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs flex flex-col ${className}`}>
      {/* Table Toolbar */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 select-none">
        {/* Left: Search input & Active Filters */}
        <div className="flex items-center space-x-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder}
              className="w-full pl-8 pr-8 py-1.5 text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Right: Actions, Density, Column Selector, Exports */}
        <div className="flex items-center space-x-1.5 shrink-0">
          {/* Bulk actions if items selected */}
          {selectable && selectedIds.length > 0 && bulkActions.length > 0 && (
            <div className="flex items-center space-x-1.5 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-2 py-1 rounded-md text-xs font-semibold mr-2">
              <span className="text-blue-800 dark:text-blue-300 font-mono font-bold">
                {selectedIds.length} Selected
              </span>
              {bulkActions.map((action, idx) => {
                const selectedRows = data.filter(r => selectedIds.includes(r[keyField]));
                return (
                  <button
                    key={idx}
                    onClick={() => action.onClick(selectedRows)}
                    className="flex items-center space-x-1 px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold cursor-pointer transition-colors"
                  >
                    {action.icon}
                    <span>{action.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Density Switcher */}
          <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-md overflow-hidden text-[10px] font-bold font-sans">
            <button
              onClick={() => setDensity('compact')}
              className={`px-2 py-1 transition-colors cursor-pointer ${
                density === 'compact'
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold'
                  : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
              title="Compact View (High Density)"
            >
              Compact
            </button>
            <button
              onClick={() => setDensity('comfortable')}
              className={`px-2 py-1 transition-colors cursor-pointer ${
                density === 'comfortable'
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold'
                  : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
              title="Comfortable View"
            >
              Comfortable
            </button>
          </div>

          {/* Column Visibility Menu */}
          <div className="relative">
            <button
              onClick={() => setShowColMenu(!showColMenu)}
              className="flex items-center space-x-1 p-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Show / Hide Columns"
            >
              <SlidersHorizontal size={13} />
            </button>

            {showColMenu && (
              <div className="absolute right-0 mt-1 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg z-30 p-2 text-xs">
                <span className="font-bold text-[10px] uppercase text-slate-400 block mb-1.5">Column Visibility</span>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {columns.map(col => (
                    <label key={col.key} className="flex items-center space-x-2 text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={visibleColumns[col.key] !== false}
                        onChange={e => {
                          setVisibleColumns(prev => ({
                            ...prev,
                            [col.key]: e.target.checked
                          }));
                        }}
                        className="rounded text-blue-600 focus:ring-0"
                      />
                      <span className="truncate">{col.header}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Export Excel */}
          {onExportExcel && (
            <button
              onClick={onExportExcel}
              className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Export Table (Excel)"
            >
              <Download size={13} />
            </button>
          )}

          {/* Print */}
          {onPrint && (
            <button
              onClick={onPrint}
              className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Print Table"
            >
              <Printer size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Filter Chips Bar (Active Filters) */}
      {filterChips.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-900/40 px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 flex items-center flex-wrap gap-1.5 text-[10px]">
          <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px] mr-1">Active Filters:</span>
          {filterChips.map(chip => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 rounded-full text-slate-700 dark:text-slate-200 font-medium"
            >
              <span>{chip.label}</span>
              <button onClick={chip.onRemove} className="text-slate-400 hover:text-rose-600 cursor-pointer ml-0.5">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Main Table Container with Sticky Header */}
      <div className="overflow-x-auto overflow-y-auto max-h-[650px] relative scrollbar-thin">
        <table className="w-full border-collapse text-left font-sans">
          {/* Sticky Header */}
          <thead className="sticky top-0 z-10 bg-[#F1F4F8] dark:bg-[#252A30] border-b border-slate-200 dark:border-slate-700 shadow-2xs">
            <tr>
              {selectable && (
                <th className="p-2.5 w-10 text-center sticky left-0 bg-[#F1F4F8] dark:bg-[#252A30] z-20">
                  <button onClick={toggleSelectAll} className="cursor-pointer text-slate-600 dark:text-slate-300">
                    {allCurrentPageSelected ? <CheckSquare size={14} className="text-blue-600" /> : <Square size={14} />}
                  </button>
                </th>
              )}

              {activeCols.map(col => {
                const isSorted = sortField === col.key;
                const isSticky = !!col.sticky;

                return (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key, col.sortable)}
                    style={{ width: col.width, minWidth: col.minWidth }}
                    className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 select-none ${
                      col.sortable !== false ? 'cursor-pointer hover:bg-slate-200/80 dark:hover:bg-slate-700/80' : ''
                    } ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    } ${
                      isSticky ? 'sticky left-0 bg-[#F1F4F8] dark:bg-[#252A30] z-10' : ''
                    } ${col.headerClassName || ''}`}
                  >
                    <div className={`inline-flex items-center gap-1 ${col.align === 'right' ? 'justify-end w-full' : ''}`}>
                      <span>{col.header}</span>
                      {col.sortable !== false && (
                        <span className="text-slate-400">
                          {isSorted ? (
                            sortOrder === 'asc' ? <ChevronUp size={12} className="text-blue-600" /> : <ChevronDown size={12} className="text-blue-600" />
                          ) : (
                            <ArrowUpDown size={10} className="opacity-40" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-[#1E2228]">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={activeCols.length + (selectable ? 1 : 0)} className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-2">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-1">
                      <Search size={18} />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{emptyTitle}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{emptyDescription}</p>
                    {emptyAction && (
                      <button
                        onClick={emptyAction.onClick}
                        className="mt-2 px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700 cursor-pointer"
                      >
                        {emptyAction.label}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIdx) => {
                const isSelected = selectedIds.includes(row[keyField]);

                return (
                  <tr
                    key={row[keyField] || rowIdx}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`transition-colors ${textClass} ${
                      isSelected
                        ? 'bg-blue-50/70 dark:bg-blue-950/30'
                        : rowIdx % 2 === 0
                        ? 'bg-white dark:bg-[#1E2228]'
                        : 'bg-slate-50/40 dark:bg-[#22262D]/60'
                    } ${
                      onRowClick ? 'cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-950/20' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    {selectable && (
                      <td className={`p-2.5 text-center sticky left-0 z-5 ${isSelected ? 'bg-blue-50/70 dark:bg-blue-950/30' : 'bg-inherit'}`}>
                        <button onClick={e => toggleSelectRow(row[keyField], e)} className="cursor-pointer text-slate-600 dark:text-slate-300">
                          {isSelected ? <CheckSquare size={14} className="text-blue-600" /> : <Square size={14} />}
                        </button>
                      </td>
                    )}

                    {activeCols.map(col => {
                      const isSticky = !!col.sticky;
                      return (
                        <td
                          key={col.key}
                          style={{ width: col.width, minWidth: col.minWidth }}
                          className={`px-3 ${pyClass} ${
                            col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                          } text-slate-800 dark:text-slate-200 ${
                            isSticky ? 'sticky left-0 bg-inherit z-5 font-semibold' : ''
                          } ${col.className || ''}`}
                        >
                          {col.render
                            ? col.render(row, rowIdx)
                            : col.accessor
                            ? col.accessor(row)
                            : row[col.key] !== undefined && row[col.key] !== null
                            ? String(row[col.key])
                            : '-'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 select-none bg-slate-50/50 dark:bg-slate-900/30">
        <div className="flex items-center space-x-2">
          <span>Showing</span>
          <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
            {processedData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
          </span>
          <span>to</span>
          <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
            {Math.min(processedData.length, currentPage * pageSize)}
          </span>
          <span>of</span>
          <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
            {processedData.length}
          </span>
          <span>entries</span>
        </div>

        <div className="flex items-center space-x-3">
          {/* Rows per page selector */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px]">Rows:</span>
            <select
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-0.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              {pageSizeOptions.map(size => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          {/* Page Navigation buttons */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft size={14} />
            </button>

            <span className="px-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Next Page"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
