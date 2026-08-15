import React, { useState } from 'react';
import { X, Search, FileText, Download, ExternalLink } from 'lucide-react';
import { formatINR } from './analyticsTypes';
import * as XLSX from 'xlsx';

export interface DrillDownData {
  title: string;
  subtitle?: string;
  category: string;
  columns: { key: string; label: string; format?: 'currency' | 'date' | 'number' | 'text' }[];
  rows: any[];
}

interface AnalyticsDrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: DrillDownData | null;
}

export const AnalyticsDrillDownModal: React.FC<AnalyticsDrillDownModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen || !data) return null;

  const filteredRows = data.rows.filter(row => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return Object.values(row).some(val => 
      String(val || '').toLowerCase().includes(term)
    );
  });

  const handleExportExcel = () => {
    try {
      const ws = XLSX.utils.json_to_sheet(filteredRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Drilldown_Records");
      XLSX.writeFile(wb, `${data.title.replace(/\s+/g, '_')}_DrillDown.xlsx`);
    } catch (e) {
      console.error('Export drilldown failed', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="bg-white border border-slate-300 rounded shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* SAP Modal Header */}
        <div className="bg-[#002f6c] text-white px-4 py-2.5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-amber-400" />
            <div>
              <h3 className="text-[13px] font-bold tracking-tight">{data.title}</h3>
              {data.subtitle && (
                <p className="text-[11px] text-blue-200">{data.subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-[11px] font-medium transition-colors flex items-center gap-1 border border-white/20"
              title="Export Drilldown Records to Excel"
            >
              <Download size={12} />
              Export
            </button>
            <button
              onClick={onClose}
              className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Search Bar & Stats */}
        <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search records..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1 bg-white border border-slate-300 rounded text-[11px] focus:outline-none focus:border-[#0056b3]"
            />
          </div>
          <div className="text-[11px] text-slate-600 font-medium">
            Showing <span className="font-bold text-slate-900">{filteredRows.length}</span> of {data.rows.length} records
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto p-4">
          {filteredRows.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FileText size={32} className="mx-auto mb-2 text-slate-300" />
              <p className="text-[13px] font-medium text-slate-700">No records found</p>
              <p className="text-[11px] text-slate-400">There are no matching transaction entries for this query.</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded overflow-hidden shadow-sm">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
                    <th className="py-2 px-3 w-12 text-center">#</th>
                    {data.columns.map(col => (
                      <th key={col.key} className="py-2 px-3">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                      <td className="py-2 px-3 text-center text-slate-400 font-mono">
                        {idx + 1}
                      </td>
                      {data.columns.map(col => {
                        const val = row[col.key];
                        let renderedVal: React.ReactNode = val;

                        if (col.format === 'currency') {
                          renderedVal = (
                            <span className="font-semibold font-mono text-slate-900">
                              {formatINR(Number(val) || 0)}
                            </span>
                          );
                        } else if (col.format === 'date') {
                          renderedVal = (
                            <span className="text-slate-600 font-mono">
                              {val ? String(val).substring(0, 10) : '-'}
                            </span>
                          );
                        }

                        return (
                          <td key={col.key} className="py-2 px-3 text-slate-700">
                            {renderedVal ?? '-'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 border-t border-slate-300 px-4 py-2 flex items-center justify-between text-[11px] text-slate-500">
          <span>SN ENTERPRISES ERP &bull; Business Intelligence Drilldown</span>
          <button
            onClick={onClose}
            className="px-4 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium rounded border border-slate-300 transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
