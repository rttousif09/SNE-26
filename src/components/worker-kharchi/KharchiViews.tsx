import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, ArrowUpDown, Eye, Edit2, RotateCcw, Filter, ExternalLink, 
  FileSpreadsheet, User, MapPin, Calculator, CheckCircle2, AlertTriangle, 
  History, ShieldAlert, ArrowRight, CornerDownRight 
} from 'lucide-react';
import * as XLSX from 'xlsx';

// ==========================================
// 1. KHARCHI LEDGER ALV TABLE TAB
// ==========================================
export const KharchiLedgerTab: React.FC<{
  transactions: any[];
  loading: boolean;
  onInspect: (tx: any) => void;
  onEdit: (tx: any) => void;
  onCancel: (tx: any) => void;
  onSelectWorkerDetail: (workerId: string) => void;
}> = ({
  transactions,
  loading,
  onInspect,
  onEdit,
  onCancel,
  onSelectWorkerDetail
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortField, setSortField] = useState<'date' | 'amount' | 'outstandingAmount' | 'voucherNo'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      if (typeFilter !== 'All' && tx.kharchiType !== typeFilter) return false;
      if (statusFilter !== 'All' && tx.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const v = (tx.voucherNo || '').toLowerCase();
        const wName = (tx.workerName || '').toLowerCase();
        const wId = (tx.workerEmployeeId || tx.workerId || '').toLowerCase();
        const p = (tx.projectName || '').toLowerCase();
        const r = (tx.remarks || '').toLowerCase();
        if (!v.includes(q) && !wName.includes(q) && !wId.includes(q) && !p.includes(q) && !r.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [transactions, typeFilter, statusFilter, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') {
        cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortField === 'amount') {
        cmp = parseFloat(a.amount || 0) - parseFloat(b.amount || 0);
      } else if (sortField === 'outstandingAmount') {
        cmp = parseFloat(a.outstandingAmount || 0) - parseFloat(b.outstandingAmount || 0);
      } else if (sortField === 'voucherNo') {
        cmp = (a.voucherNo || '').localeCompare(b.voucherNo || '');
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortField, sortOrder]);

  const totalPages = Math.ceil(sorted.length / pageSize) || 1;
  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, currentPage, pageSize]);

  const totalActiveAmt = useMemo(() => filtered.reduce((s, t) => s + (t.status !== 'Cancelled' ? parseFloat(t.amount || 0) : 0), 0), [filtered]);
  const totalActiveRec = useMemo(() => filtered.reduce((s, t) => s + (t.status !== 'Cancelled' ? parseFloat(t.recoveredAmount || 0) : 0), 0), [filtered]);
  const totalActiveOs = useMemo(() => filtered.reduce((s, t) => s + (t.status !== 'Cancelled' ? parseFloat(t.outstandingAmount || 0) : 0), 0), [filtered]);

  const handleExportExcel = () => {
    const data = sorted.map(t => ({
      'Date': t.date,
      'Voucher No': t.voucherNo,
      'Project': t.projectName || t.projectId,
      'Worker ID': t.workerEmployeeId || t.workerId,
      'Worker Name': t.workerName,
      'Kharchi Type': t.kharchiType,
      'Amount (₹)': parseFloat(t.amount || 0),
      'Recovered (₹)': parseFloat(t.recoveredAmount || 0),
      'Outstanding (₹)': parseFloat(t.outstandingAmount || 0),
      'Status': t.status,
      'Payment Mode': t.paymentMode || 'Cash',
      'Paid By': t.paidBy || 'Site Supervisor',
      'Remarks': t.remarks || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Kharchi Ledger");
    XLSX.writeFile(wb, `SN_Worker_Kharchi_Ledger_${new Date().toISOString().substring(0, 10)}.xlsx`);
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
      
      {/* Search and Filters Bar */}
      <div className="bg-[#f0f4f8] p-2 rounded border border-gray-300 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2 flex-1 min-w-[240px]">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search voucher, worker, remarks..."
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
            <option value="Weekly Kharchi">Weekly Kharchi</option>
            <option value="Sunday Kharchi">Sunday Kharchi</option>
            <option value="Emergency Kharchi">Emergency Kharchi</option>
            <option value="Travel Kharchi">Travel Kharchi</option>
            <option value="Other Kharchi">Other Kharchi</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="bg-white border border-gray-300 rounded px-2 py-1 text-[11px]"
          >
            <option value="All">All Statuses</option>
            <option value="Posted">Posted</option>
            <option value="Partially Recovered">Partially Recovered</option>
            <option value="Recovered">Recovered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[10px] text-gray-500 font-medium">
            Showing {filtered.length} vouchers
          </span>
          <button
            onClick={handleExportExcel}
            className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded font-semibold text-[10px] flex items-center space-x-1 shadow-xs"
          >
            <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
            <span>Excel</span>
          </button>
        </div>
      </div>

      {/* ALV Table */}
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
              <th className="py-2 px-2 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('voucherNo')}>
                <div className="flex items-center space-x-1">
                  <span>Voucher No</span>
                  <ArrowUpDown className="w-2.5 h-2.5 text-gray-400" />
                </div>
              </th>
              <th className="py-2 px-2">Project</th>
              <th className="py-2 px-2">Worker ID</th>
              <th className="py-2 px-2">Worker Name</th>
              <th className="py-2 px-2">Type</th>
              <th className="py-2 px-2 text-right cursor-pointer hover:bg-gray-200" onClick={() => handleSort('amount')}>
                <div className="flex items-center justify-end space-x-1">
                  <span>Amount (₹)</span>
                  <ArrowUpDown className="w-2.5 h-2.5 text-gray-400" />
                </div>
              </th>
              <th className="py-2 px-2 text-right">Recovered</th>
              <th className="py-2 px-2 text-right cursor-pointer hover:bg-gray-200" onClick={() => handleSort('outstandingAmount')}>
                <div className="flex items-center justify-end space-x-1">
                  <span>Outstanding</span>
                  <ArrowUpDown className="w-2.5 h-2.5 text-gray-400" />
                </div>
              </th>
              <th className="py-2 px-2 text-center">Status</th>
              <th className="py-2 px-2">Remarks</th>
              <th className="py-2 px-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 font-mono text-[10.5px]">
            {pagedRows.map((tx, idx) => {
              const isCancelled = tx.status === 'Cancelled';
              const amt = parseFloat(tx.amount || 0);
              const rec = parseFloat(tx.recoveredAmount || 0);
              const os = parseFloat(tx.outstandingAmount != null ? tx.outstandingAmount : (amt - rec));

              return (
                <tr
                  key={tx.id || idx}
                  className={`hover:bg-blue-50/40 transition-colors ${
                    isCancelled ? 'bg-rose-50/40 text-gray-400 line-through' : (idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50')
                  }`}
                >
                  <td className="py-1.5 px-2.5 whitespace-nowrap text-gray-700 font-medium">{tx.date}</td>
                  <td className="py-1.5 px-2 font-bold text-gray-900 whitespace-nowrap">
                    <button
                      onClick={() => onInspect(tx)}
                      className="text-[#0a6ed1] hover:underline flex items-center space-x-1 font-mono font-bold"
                    >
                      <span>{tx.voucherNo}</span>
                    </button>
                  </td>
                  <td className="py-1.5 px-2 whitespace-nowrap font-sans text-gray-700 max-w-[120px] truncate" title={tx.projectName}>
                    {tx.projectName || tx.projectId}
                  </td>
                  <td className="py-1.5 px-2 whitespace-nowrap text-gray-600">
                    <button
                      onClick={() => onSelectWorkerDetail(tx.workerId)}
                      className="hover:underline text-gray-800 font-semibold"
                      title="View worker detail history"
                    >
                      {tx.workerEmployeeId || tx.workerId}
                    </button>
                  </td>
                  <td className="py-1.5 px-2 whitespace-nowrap font-sans font-semibold text-gray-800">
                    <button
                      onClick={() => onSelectWorkerDetail(tx.workerId)}
                      className="hover:underline hover:text-[#0a6ed1]"
                    >
                      {tx.workerName || 'Worker'}
                    </button>
                  </td>
                  <td className="py-1.5 px-2 whitespace-nowrap font-sans">
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-gray-100 text-gray-800 border border-gray-250">
                      {tx.kharchiType}
                    </span>
                  </td>
                  <td className="py-1.5 px-2 text-right whitespace-nowrap font-bold text-rose-700">
                    ₹{amt.toLocaleString('en-IN')}
                  </td>
                  <td className="py-1.5 px-2 text-right whitespace-nowrap font-bold text-emerald-700">
                    {rec > 0 ? `₹${rec.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="py-1.5 px-2 text-right whitespace-nowrap font-bold text-rose-800">
                    {os > 0 ? `₹${os.toLocaleString('en-IN')}` : '₹0.00'}
                  </td>
                  <td className="py-1.5 px-2 text-center whitespace-nowrap font-sans">
                    <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-bold border ${
                      tx.status === 'Recovered' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                      tx.status === 'Partially Recovered' ? 'bg-amber-50 text-amber-700 border-amber-300' :
                      tx.status === 'Cancelled' ? 'bg-rose-50 text-rose-700 border-rose-300' :
                      'bg-blue-50 text-blue-700 border-blue-300'
                    }`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="py-1.5 px-2 max-w-[140px] truncate text-gray-500 font-sans text-[10px]" title={tx.remarks || ''}>
                    {tx.remarks || '—'}
                  </td>
                  <td className="py-1.5 px-2 text-center whitespace-nowrap font-sans">
                    <div className="flex items-center justify-center space-x-1">
                      <button
                        onClick={() => onInspect(tx)}
                        className="p-1 text-gray-500 hover:text-[#0a6ed1] hover:bg-gray-100 rounded"
                        title="View details & recovery breakup"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {!isCancelled && rec === 0 && (
                        <button
                          onClick={() => onEdit(tx)}
                          className="p-1 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded"
                          title="Edit transaction"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {!isCancelled && rec === 0 && (
                        <button
                          onClick={() => onCancel(tx)}
                          className="p-1 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded"
                          title="Cancel transaction (posts linked reversal)"
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
                <td colSpan={12} className="py-8 text-center text-gray-400 font-sans italic">
                  {loading ? 'Loading kharchi sub-ledger records...' : 'No kharchi transactions match the selected filters.'}
                </td>
              </tr>
            )}
          </tbody>

          {/* Table Footer */}
          <tfoot>
            <tr className="bg-gray-100 font-mono font-bold text-gray-800 border-t-2 border-gray-300 text-[11px]">
              <td colSpan={6} className="py-2 px-2.5 font-sans uppercase">
                Active Totals (Excluding Cancelled)
              </td>
              <td className="py-2 px-2 text-right text-rose-700">
                ₹{Math.round(totalActiveAmt).toLocaleString('en-IN')}
              </td>
              <td className="py-2 px-2 text-right text-emerald-700">
                ₹{Math.round(totalActiveRec).toLocaleString('en-IN')}
              </td>
              <td className="py-2 px-2 text-right text-rose-800">
                ₹{Math.round(totalActiveOs).toLocaleString('en-IN')} Dr
              </td>
              <td colSpan={3}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 py-1 bg-white border border-gray-300 rounded text-[10px]">
          <span className="text-gray-500">
            Page {currentPage} of {totalPages} ({sorted.length} records)
          </span>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2 py-0.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                className={`px-2 py-0.5 border rounded ${
                  currentPage === p ? 'bg-[#0a6ed1] text-white border-[#0a6ed1]' : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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

// ==========================================
// 2. WORKER-WISE SUMMARY TAB
// ==========================================
export const WorkerSummaryTab: React.FC<{
  workerSummary: any[];
  onSelectWorker: (workerId: string) => void;
}> = ({ workerSummary, onSelectWorker }) => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return workerSummary;
    const q = search.toLowerCase();
    return workerSummary.filter(w => 
      (w.workerName || '').toLowerCase().includes(q) ||
      (w.workerEmployeeId || '').toLowerCase().includes(q) ||
      (w.currentProject || '').toLowerCase().includes(q)
    );
  }, [workerSummary, search]);

  const totalKhar = filtered.reduce((s, w) => s + w.totalKharchi, 0);
  const totalRec = filtered.reduce((s, w) => s + w.totalRecovered, 0);
  const totalOs = filtered.reduce((s, w) => s + w.totalOutstanding, 0);

  return (
    <div className="space-y-3 text-[11px]">
      
      <div className="bg-[#f0f4f8] p-2 rounded border border-gray-300 flex items-center justify-between">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search worker by name, ID, or site..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded pl-8 pr-2 py-1 text-[11px] focus:outline-none focus:border-[#0a6ed1]"
          />
        </div>
        <span className="text-[10px] text-gray-500 font-medium">
          {filtered.length} workers with kharchi activity
        </span>
      </div>

      <div className="bg-white border border-gray-300 rounded shadow-xs overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#f0f4f8] text-gray-700 font-bold text-[10px] uppercase border-b border-gray-300">
              <th className="py-2 px-3">Worker ID</th>
              <th className="py-2 px-3">Worker Name</th>
              <th className="py-2 px-3">Current Site</th>
              <th className="py-2 px-3 text-center">Transactions</th>
              <th className="py-2 px-3 text-right">Total Kharchi</th>
              <th className="py-2 px-3 text-right">Recovered</th>
              <th className="py-2 px-3 text-right font-bold text-rose-800">Outstanding</th>
              <th className="py-2 px-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 font-mono text-[10.5px]">
            {filtered.map((w, idx) => (
              <tr key={w.workerId || idx} className="hover:bg-blue-50/40">
                <td className="py-2 px-3 font-bold text-gray-900">{w.workerEmployeeId || w.workerId}</td>
                <td className="py-2 px-3 font-sans font-semibold text-gray-800">{w.workerName}</td>
                <td className="py-2 px-3 font-sans text-gray-600">{w.currentProject}</td>
                <td className="py-2 px-3 text-center">{w.count}</td>
                <td className="py-2 px-3 text-right font-bold text-rose-700">₹{Math.round(w.totalKharchi).toLocaleString('en-IN')}</td>
                <td className="py-2 px-3 text-right font-bold text-emerald-700">₹{Math.round(w.totalRecovered).toLocaleString('en-IN')}</td>
                <td className="py-2 px-3 text-right font-bold text-rose-800">₹{Math.round(w.totalOutstanding).toLocaleString('en-IN')} Dr</td>
                <td className="py-2 px-3 text-center font-sans">
                  <button
                    onClick={() => onSelectWorker(w.workerId)}
                    className="px-2.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-[#0a6ed1] border border-blue-200 rounded font-semibold text-[10px]"
                  >
                    View Ledger
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="py-6 text-center text-gray-400 font-sans italic">
                  No worker summary records match search.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-mono font-bold text-gray-800 border-t-2 border-gray-300 text-[11px]">
              <td colSpan={4} className="py-2 px-3 font-sans uppercase">Total Summary</td>
              <td className="py-2 px-3 text-right text-rose-700">₹{Math.round(totalKhar).toLocaleString('en-IN')}</td>
              <td className="py-2 px-3 text-right text-emerald-700">₹{Math.round(totalRec).toLocaleString('en-IN')}</td>
              <td className="py-2 px-3 text-right text-rose-800">₹{Math.round(totalOs).toLocaleString('en-IN')} Dr</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

    </div>
  );
};

// ==========================================
// 3. WORKER DETAIL CHRONOLOGICAL VIEW
// ==========================================
export const WorkerDetailView: React.FC<{
  workerId: string;
  workers: any[];
  projects: any[];
  allTransactions: any[];
  onBack: () => void;
  onInspect: (tx: any) => void;
}> = ({ workerId, workers, projects, allTransactions, onBack, onInspect }) => {
  const worker = workers.find(w => w.id === workerId);
  const workerTx = useMemo(() => {
    return allTransactions
      .filter(t => t.workerId === workerId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [allTransactions, workerId]);

  const totalKharchi = workerTx.reduce((s, t) => s + (t.status !== 'Cancelled' ? parseFloat(t.amount || 0) : 0), 0);
  const totalRecovered = workerTx.reduce((s, t) => s + (t.status !== 'Cancelled' ? parseFloat(t.recoveredAmount || 0) : 0), 0);
  const currentOutstanding = Math.max(0, totalKharchi - totalRecovered);

  const projectMap = useMemo(() => {
    const m: Record<string, string> = {};
    projects.forEach(p => { m[p.id] = p.name; });
    return m;
  }, [projects]);

  return (
    <div className="space-y-3 text-[11px]">
      
      {/* Header Profile Box */}
      <div className="bg-[#f0f4f8] p-3 rounded border border-gray-300 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-[#0a6ed1] text-white flex items-center justify-center font-bold text-sm shadow-xs">
            {worker?.name ? worker.name.charAt(0) : 'W'}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-gray-900 text-xs">{worker?.name || 'Worker'}</span>
              <span className="font-mono text-gray-600 bg-white px-1.5 py-0.2 rounded border border-gray-300">
                {worker?.workerId || workerId}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-[10px] text-gray-500 mt-0.5">
              <span>Site: <strong>{projectMap[worker?.projectId] || 'Current Project'}</strong></span>
              <span>•</span>
              <span>Designation: <strong>{worker?.designation || 'Worker'}</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 font-mono">
          <div className="text-right">
            <span className="text-[9px] uppercase text-gray-500 block">Total Kharchi</span>
            <span className="font-bold text-gray-900">₹{Math.round(totalKharchi).toLocaleString('en-IN')}</span>
          </div>
          <div className="text-right">
            <span className="text-[9px] uppercase text-gray-500 block">Recovered</span>
            <span className="font-bold text-emerald-700">₹{Math.round(totalRecovered).toLocaleString('en-IN')}</span>
          </div>
          <div className="text-right bg-rose-50 px-2 py-1 rounded border border-rose-200">
            <span className="text-[9px] uppercase text-rose-800 font-bold block">Current Outstanding</span>
            <span className="font-black text-rose-700 text-xs">₹{Math.round(currentOutstanding).toLocaleString('en-IN')} Dr</span>
          </div>
          <button
            onClick={onBack}
            className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded font-semibold text-[10px] font-sans"
          >
            ← Back to Directory
          </button>
        </div>
      </div>

      {/* Chronological Register */}
      <div className="bg-white border border-gray-300 rounded shadow-xs overflow-x-auto">
        <div className="bg-gray-50 px-3 py-1.5 font-bold text-gray-800 text-[10.5px] border-b border-gray-200">
          Chronological Kharchi & Recovery Sub-Ledger Register
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#f0f4f8] text-gray-700 font-bold text-[9.5px] uppercase border-b border-gray-300">
              <th className="py-2 px-3">Date</th>
              <th className="py-2 px-3">Voucher No</th>
              <th className="py-2 px-3">Site Incurred</th>
              <th className="py-2 px-3">Type</th>
              <th className="py-2 px-3 text-right">Amount (₹)</th>
              <th className="py-2 px-3 text-right">Recovered</th>
              <th className="py-2 px-3 text-right">Outstanding</th>
              <th className="py-2 px-3 text-center">Status</th>
              <th className="py-2 px-3">Remarks</th>
              <th className="py-2 px-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 font-mono text-[10.5px]">
            {workerTx.map((tx, idx) => {
              const amt = parseFloat(tx.amount || 0);
              const rec = parseFloat(tx.recoveredAmount || 0);
              const os = parseFloat(tx.outstandingAmount != null ? tx.outstandingAmount : (amt - rec));
              return (
                <tr key={tx.id || idx} className="hover:bg-blue-50/40">
                  <td className="py-1.5 px-3 text-gray-700">{tx.date}</td>
                  <td className="py-1.5 px-3 font-bold text-gray-900">{tx.voucherNo}</td>
                  <td className="py-1.5 px-3 font-sans text-gray-700">{tx.projectName || projectMap[tx.projectId]}</td>
                  <td className="py-1.5 px-3 font-sans">
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-gray-100 text-gray-800 border border-gray-300">
                      {tx.kharchiType}
                    </span>
                  </td>
                  <td className="py-1.5 px-3 text-right font-bold text-rose-700">₹{amt.toLocaleString('en-IN')}</td>
                  <td className="py-1.5 px-3 text-right text-emerald-700">{rec > 0 ? `₹${rec.toLocaleString('en-IN')}` : '—'}</td>
                  <td className="py-1.5 px-3 text-right font-bold text-rose-800">₹{os.toLocaleString('en-IN')} Dr</td>
                  <td className="py-1.5 px-3 text-center font-sans">
                    <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-bold border ${
                      tx.status === 'Recovered' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                      tx.status === 'Partially Recovered' ? 'bg-amber-50 text-amber-700 border-amber-300' :
                      tx.status === 'Cancelled' ? 'bg-rose-50 text-rose-700 border-rose-300' :
                      'bg-blue-50 text-blue-700 border-blue-300'
                    }`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="py-1.5 px-3 font-sans text-gray-600 text-[10px]">{tx.remarks || '—'}</td>
                  <td className="py-1.5 px-3 text-center font-sans">
                    <button
                      onClick={() => onInspect(tx)}
                      className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-[#0a6ed1] border border-blue-200 rounded font-semibold text-[10px]"
                    >
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
            {workerTx.length === 0 && (
              <tr>
                <td colSpan={10} className="py-6 text-center text-gray-400 font-sans italic">
                  No kharchi vouchers recorded for this worker.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};

// ==========================================
// 4. RECONCILIATION TAB
// ==========================================
export const KharchiReconciliationTab: React.FC<{
  summary: any;
}> = ({ summary }) => {
  if (!summary) return null;
  const rec = summary.reconciliation;
  const isReconciled = rec.status === 'Reconciled';

  return (
    <div className="space-y-4 text-[11px]">
      
      <div className="bg-[#f0f4f8] p-3 rounded border border-gray-300">
        <h3 className="font-bold text-gray-900 text-xs flex items-center space-x-1.5">
          <Calculator className="w-4 h-4 text-[#0a6ed1]" />
          <span>Worker Kharchi Sub-Ledger Mathematical Reconciliation</span>
        </h3>
        <p className="text-[10px] text-gray-500 mt-0.5">
          Verifies that Total Posted Kharchi minus Total Recoveries exactly equals the sum of all individual transaction outstanding balances.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Math Breakdown */}
        <div className="bg-white border border-gray-300 rounded p-4 shadow-xs space-y-2.5 font-mono text-[11px]">
          <div className="flex justify-between items-center py-1 border-b border-gray-200">
            <span className="font-sans text-gray-700">Total Posted Kharchi (Debit):</span>
            <span className="font-bold text-gray-900">₹{Math.round(rec.totalPosted).toLocaleString('en-IN')}</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-gray-200 text-emerald-700 font-semibold">
            <span className="font-sans">(-) Total Cumulative Recoveries (PAY01):</span>
            <span>- ₹{Math.round(rec.totalRecovered).toLocaleString('en-IN')}</span>
          </div>

          <div className="flex justify-between items-center py-2 bg-blue-50/60 px-2 rounded font-bold text-xs border border-blue-200">
            <span className="font-sans text-blue-900">(=) Expected Net Outstanding Kharchi:</span>
            <span className="text-rose-700">₹{Math.round(rec.calculatedOutstanding).toLocaleString('en-IN')} Dr</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-gray-200">
            <span className="font-sans text-gray-700">Sum of Individual Transaction Outstandings:</span>
            <span className="font-bold text-gray-900">₹{Math.round(rec.sumIndividualOutstanding).toLocaleString('en-IN')}</span>
          </div>

          <div className={`flex justify-between items-center py-2 px-2 rounded font-bold text-xs border ${
            isReconciled ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-rose-50 border-rose-300 text-rose-800'
          }`}>
            <span className="font-sans">Variance / Difference:</span>
            <span>₹{rec.difference.toFixed(2)}</span>
          </div>
        </div>

        {/* Verification Status Card */}
        <div className="bg-white border border-gray-300 rounded p-4 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Audit Verification Status</span>
            <div className={`p-3 rounded border flex items-center space-x-2.5 ${
              isReconciled ? 'bg-emerald-100/70 border-emerald-400 text-emerald-900' : 'bg-rose-100/70 border-rose-400 text-rose-900'
            }`}>
              {isReconciled ? <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-rose-700 shrink-0" />}
              <div>
                <div className="font-bold text-xs uppercase">{rec.status}</div>
                <div className="text-[10px] mt-0.5">
                  {isReconciled 
                    ? 'Sub-ledger equation holds with zero discrepancy across all worker transactions.'
                    : 'Discrepancy detected between global ledger balance and transaction line items.'}
                </div>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-gray-500 font-mono mt-4 pt-3 border-t border-gray-200">
            <div>Accounting Rule: Continuous Worker Financial Liability</div>
            <div>Source Traceability: KHAR01 → WKL01 → PAY01 → Recovery → WKL01</div>
          </div>
        </div>

      </div>

    </div>
  );
};

// ==========================================
// 5. AUDIT TRAIL TAB
// ==========================================
export const KharchiAuditTab: React.FC = () => {
  const [data, setData] = useState<{ activityLogs: any[]; recoveryLogs: any[] }>({ activityLogs: [], recoveryLogs: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch('/api/worker-kharchi/audit-trails')
      .then(res => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4 text-[11px]">
      
      <div className="bg-[#f0f4f8] p-3 rounded border border-gray-300">
        <h3 className="font-bold text-gray-900 text-xs flex items-center space-x-1.5">
          <History className="w-4 h-4 text-[#0a6ed1]" />
          <span>Worker Kharchi Audit Trail & Operations Log</span>
        </h3>
        <p className="text-[10px] text-gray-500 mt-0.5">
          Immutable audit record of kharchi creation, edits, cancellations, and paycheck recoveries.
        </p>
      </div>

      {/* Recoveries Table */}
      <div className="bg-white border border-gray-300 rounded shadow-xs overflow-hidden">
        <div className="bg-gray-100 px-3 py-1.5 font-bold text-gray-800 text-[10.5px]">
          Recent Paycheck Wage Recoveries (PAY01 Settlements)
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#f0f4f8] text-gray-700 font-bold text-[9.5px] uppercase border-b border-gray-300">
              <th className="py-2 px-3">Recovery Date</th>
              <th className="py-2 px-3">Kharchi Voucher</th>
              <th className="py-2 px-3">PAY01 Settlement Voucher</th>
              <th className="py-2 px-3 text-right">Recovered Amount</th>
              <th className="py-2 px-3">Deducted By</th>
              <th className="py-2 px-3">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 font-mono text-[10px]">
            {data.recoveryLogs.map((r, i) => (
              <tr key={r.id || i} className="hover:bg-blue-50/40">
                <td className="py-1.5 px-3 text-gray-700">{r.recoveryDate}</td>
                <td className="py-1.5 px-3 font-bold text-gray-900">{r.kharchiVoucherNo || r.kharchiId}</td>
                <td className="py-1.5 px-3 font-bold text-[#0a6ed1]">{r.voucherNo || `PAY-${r.paymentId}`}</td>
                <td className="py-1.5 px-3 text-right font-bold text-emerald-700">₹{parseFloat(r.amount).toLocaleString('en-IN')}</td>
                <td className="py-1.5 px-3 font-sans text-gray-700">{r.createdBy || 'System'}</td>
                <td className="py-1.5 px-3 font-sans text-gray-600">{r.remarks || 'Wage settlement'}</td>
              </tr>
            ))}
            {data.recoveryLogs.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-center text-gray-400 font-sans italic">
                  No recoveries recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Activity Logs */}
      <div className="bg-white border border-gray-300 rounded shadow-xs overflow-hidden">
        <div className="bg-gray-100 px-3 py-1.5 font-bold text-gray-800 text-[10.5px]">
          System Operation Logs
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#f0f4f8] text-gray-700 font-bold text-[9.5px] uppercase border-b border-gray-300">
              <th className="py-2 px-3">Timestamp</th>
              <th className="py-2 px-3">User</th>
              <th className="py-2 px-3">Action</th>
              <th className="py-2 px-3">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-[10px]">
            {data.activityLogs.map((l, i) => (
              <tr key={l.id || i} className="hover:bg-gray-50">
                <td className="py-1.5 px-3 font-mono text-gray-600 whitespace-nowrap">{l.timestamp}</td>
                <td className="py-1.5 px-3 font-semibold text-gray-900">{l.username}</td>
                <td className="py-1.5 px-3 font-mono font-bold text-blue-700">{l.actionType}</td>
                <td className="py-1.5 px-3 text-gray-700 font-mono text-[9.5px]">{l.details}</td>
              </tr>
            ))}
            {data.activityLogs.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-gray-400 italic">
                  No activity logs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
