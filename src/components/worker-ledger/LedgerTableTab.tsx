import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, FileSpreadsheet, Eye, RotateCcw, Filter, ExternalLink, ArrowUpDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { LedgerItem } from './Modals';

interface Props {
  entries: LedgerItem[];
  loading: boolean;
  workerName: string;
  workerId: string;
  projectMap: Record<string, string>;
  onInspect: (item: LedgerItem) => void;
  onReverse: (item: LedgerItem) => void;
}

export const LedgerTableTab: React.FC<Props> = ({
  entries,
  loading,
  workerName,
  workerId,
  projectMap,
  onInspect,
  onReverse
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortField, setSortField] = useState<'date' | 'debit' | 'credit' | 'runningBalance'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Filter entries
  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (typeFilter !== 'All' && e.entryType !== typeFilter) return false;
      if (statusFilter !== 'All' && (e.status || 'Posted') !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const v = (e.voucherNo || '').toLowerCase();
        const p = (e.particulars || e.description || '').toLowerCase();
        const m = (e.sourceModule || '').toLowerCase();
        const r = (e.sourceVoucherNo || e.sourceTransactionId || '').toLowerCase();
        const rem = (e.remarks || '').toLowerCase();
        if (!v.includes(q) && !p.includes(q) && !m.includes(q) && !r.includes(q) && !rem.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [entries, typeFilter, statusFilter, search]);

  // Sort entries
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') {
        cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortField === 'debit') {
        cmp = a.debit - b.debit;
      } else if (sortField === 'credit') {
        cmp = a.credit - b.credit;
      } else if (sortField === 'runningBalance') {
        cmp = a.runningBalance - b.runningBalance;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(sorted.length / pageSize) || 1;
  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, currentPage, pageSize]);

  // Totals
  const totalDebit = useMemo(() => filtered.reduce((s, e) => s + (e.status !== 'Reversed' ? e.debit : 0), 0), [filtered]);
  const totalCredit = useMemo(() => filtered.reduce((s, e) => s + (e.status !== 'Reversed' ? e.credit : 0), 0), [filtered]);

  const handleExportExcel = () => {
    const data = sorted.map(e => ({
      'Date': e.date,
      'Voucher No': e.voucherNo,
      'Project': projectMap[e.projectId] || e.projectId,
      'Particulars': e.particulars || e.description,
      'Transaction Type': e.entryType,
      'Debit (Dr)': e.debit,
      'Credit (Cr)': e.credit,
      'Running Balance': e.formattedBalance || e.runningBalance,
      'Source Module': e.sourceModule,
      'Source Ref': e.sourceVoucherNo || e.sourceTransactionId,
      'Status': e.status || 'Posted',
      'Remarks': e.remarks || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Worker Ledger");
    XLSX.writeFile(wb, `SN_Worker_Ledger_${workerName.replace(/\s+/g, '_')}_${workerId}.xlsx`);
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-2 text-[11px]">
      
      {/* Search & Action Bar */}
      <div className="bg-[#f0f4f8] p-2 rounded border border-gray-300 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2 flex-1 min-w-[240px]">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search voucher, particulars, source ref..."
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full bg-white border border-gray-300 rounded pl-8 pr-2 py-1 text-[11px] focus:outline-none focus:border-[#0a6ed1]"
            />
          </div>

          <select
            value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value); setCurrentPage(1); }}
            className="bg-white border border-gray-300 rounded px-2 py-1 text-[11px]"
          >
            <option value="All">All Types</option>
            <option value="Earnings">Earnings</option>
            <option value="Advance">Advances</option>
            <option value="Kharchi">Kharchi</option>
            <option value="Payment">Payments</option>
            <option value="Adjustment">Adjustments</option>
            <option value="Opening Balance">Opening Balance</option>
            <option value="Reversal">Reversals</option>
            <option value="Hold Release">Hold Releases</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="bg-white border border-gray-300 rounded px-2 py-1 text-[11px]"
          >
            <option value="All">All Statuses</option>
            <option value="Posted">Posted</option>
            <option value="Reversed">Reversed</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[10px] text-gray-600 font-medium">
            Showing {filtered.length} transactions
          </span>
          <button
            onClick={handleExportExcel}
            className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded font-semibold text-[10px] flex items-center space-x-1 shadow-xs"
          >
            <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* ALV-style dense table */}
      <div className="bg-white border border-gray-300 rounded shadow-xs overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#f0f4f8] text-gray-700 font-bold text-[10px] uppercase border-b border-gray-300 tracking-wider">
              <th className="py-2 px-2.5 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('date')}>
                <div className="flex items-center space-x-1">
                  <span>Date</span>
                  <ArrowUpDown className="w-2.5 h-2.5 text-gray-400" />
                </div>
              </th>
              <th className="py-2 px-2">Voucher No</th>
              <th className="py-2 px-2">Project</th>
              <th className="py-2 px-2">Particulars</th>
              <th className="py-2 px-2">Tx Type</th>
              <th className="py-2 px-2 text-right cursor-pointer hover:bg-gray-200" onClick={() => handleSort('debit')}>
                <div className="flex items-center justify-end space-x-1">
                  <span>Debit (Dr)</span>
                  <ArrowUpDown className="w-2.5 h-2.5 text-gray-400" />
                </div>
              </th>
              <th className="py-2 px-2 text-right cursor-pointer hover:bg-gray-200" onClick={() => handleSort('credit')}>
                <div className="flex items-center justify-end space-x-1">
                  <span>Credit (Cr)</span>
                  <ArrowUpDown className="w-2.5 h-2.5 text-gray-400" />
                </div>
              </th>
              <th className="py-2 px-2 text-right cursor-pointer hover:bg-gray-200" onClick={() => handleSort('runningBalance')}>
                <div className="flex items-center justify-end space-x-1">
                  <span>Running Balance</span>
                  <ArrowUpDown className="w-2.5 h-2.5 text-gray-400" />
                </div>
              </th>
              <th className="py-2 px-2 text-center">Source</th>
              <th className="py-2 px-2">Source Ref</th>
              <th className="py-2 px-2 text-center">Status</th>
              <th className="py-2 px-2">Remarks</th>
              <th className="py-2 px-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 font-mono text-[10.5px]">
            {pagedRows.map((row, idx) => {
              const isReversed = row.status === 'Reversed';
              return (
                <tr 
                  key={row.id || idx} 
                  className={`hover:bg-blue-50/50 transition-colors ${
                    isReversed ? 'bg-rose-50/40 text-gray-500 line-through' : (idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50')
                  }`}
                >
                  <td className="py-1.5 px-2.5 whitespace-nowrap text-gray-700 font-medium">
                    {row.date}
                  </td>
                  <td className="py-1.5 px-2 font-bold text-gray-900 whitespace-nowrap">
                    {row.voucherNo}
                  </td>
                  <td className="py-1.5 px-2 whitespace-nowrap max-w-[120px] truncate font-sans text-gray-700" title={projectMap[row.projectId] || row.projectId}>
                    {projectMap[row.projectId] || row.projectId || 'Site'}
                  </td>
                  <td className="py-1.5 px-2 max-w-[200px] truncate font-sans text-gray-800" title={row.particulars || row.description}>
                    {row.particulars || row.description}
                  </td>
                  <td className="py-1.5 px-2 whitespace-nowrap font-sans">
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-gray-100 text-gray-700 border border-gray-250">
                      {row.entryType}
                    </span>
                  </td>
                  <td className="py-1.5 px-2 text-right whitespace-nowrap font-bold text-rose-700">
                    {row.debit > 0 ? `₹${row.debit.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="py-1.5 px-2 text-right whitespace-nowrap font-bold text-emerald-700">
                    {row.credit > 0 ? `₹${row.credit.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className={`py-1.5 px-2 text-right whitespace-nowrap font-bold ${
                    row.runningBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                    {row.formattedBalance || `₹${Math.abs(row.runningBalance).toLocaleString('en-IN')} ${row.runningBalance >= 0 ? 'Cr' : 'Dr'}`}
                  </td>
                  <td className="py-1.5 px-2 text-center whitespace-nowrap font-bold text-blue-700 font-sans">
                    {row.sourceModule || 'SYS'}
                  </td>
                  <td className="py-1.5 px-2 whitespace-nowrap">
                    <button
                      onClick={() => onInspect(row)}
                      className="text-[#0a6ed1] hover:underline flex items-center space-x-1 font-semibold"
                      title="Drill-down: Click to view original transaction and settlement breakup"
                    >
                      <span>{row.sourceVoucherNo || row.sourceTransactionId || 'View'}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  </td>
                  <td className="py-1.5 px-2 text-center whitespace-nowrap font-sans">
                    <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-bold border ${
                      row.status === 'Posted' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : row.status === 'Reversed'
                        ? 'bg-rose-50 text-rose-700 border-rose-300'
                        : 'bg-amber-50 text-amber-700 border-amber-300'
                    }`}>
                      {row.status || 'Posted'}
                    </span>
                  </td>
                  <td className="py-1.5 px-2 max-w-[140px] truncate text-gray-500 font-sans text-[10px]" title={row.remarks || ''}>
                    {row.remarks || '—'}
                  </td>
                  <td className="py-1.5 px-2 text-center whitespace-nowrap font-sans">
                    <div className="flex items-center justify-center space-x-1">
                      <button
                        onClick={() => onInspect(row)}
                        className="p-1 text-gray-500 hover:text-[#0a6ed1] hover:bg-gray-100 rounded"
                        title="View details & settlement breakup"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {row.status === 'Posted' && (
                        <button
                          onClick={() => onReverse(row)}
                          className="p-1 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded"
                          title="Authorized Reversal: creates linked reverse entry"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {pagedRows.length === 0 && (
              <tr>
                <td colSpan={13} className="py-8 text-center text-gray-400 font-sans italic">
                  {loading ? 'Loading worker sub-ledger records...' : 'No ledger transactions match the criteria.'}
                </td>
              </tr>
            )}
          </tbody>

          {/* Table Footer with Summary */}
          <tfoot>
            <tr className="bg-gray-100 font-mono font-bold text-gray-800 border-t-2 border-gray-300 text-[11px]">
              <td colSpan={5} className="py-2 px-2.5 font-sans uppercase">
                Active Total (Excluding Reversals)
              </td>
              <td className="py-2 px-2 text-right text-rose-700">
                ₹{Math.round(totalDebit).toLocaleString('en-IN')} Dr
              </td>
              <td className="py-2 px-2 text-right text-emerald-700">
                ₹{Math.round(totalCredit).toLocaleString('en-IN')} Cr
              </td>
              <td className={`py-2 px-2 text-right ${totalCredit - totalDebit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                ₹{Math.abs(Math.round(totalCredit - totalDebit)).toLocaleString('en-IN')} {totalCredit - totalDebit >= 0 ? 'Cr' : 'Dr'}
              </td>
              <td colSpan={5}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 py-1 bg-white border border-gray-300 rounded text-[10px]">
          <span className="text-gray-500">
            Page {currentPage} of {totalPages} ({sorted.length} total rows)
          </span>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-2 py-0.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`px-2 py-0.5 border rounded ${
                    currentPage === p ? 'bg-[#0a6ed1] text-white border-[#0a6ed1]' : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-2 py-0.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
