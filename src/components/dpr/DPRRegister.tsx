import React, { useState, useMemo } from 'react';
import { 
  Plus, Search, RefreshCw, Printer, FileSpreadsheet, Eye, Edit2, 
  FileText, History, Trash2, Shield, Lock, CheckCircle2, AlertTriangle, 
  Clock, Calendar, Filter, ChevronRight, Layers, ArrowUpDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { DPRReport, DPRStatus } from '../../types/dpr';
import { SAPSelect } from '../SAPSelect';

interface DPRRegisterProps {
  reports: DPRReport[];
  projects: any[];
  loading: boolean;
  selectedProject: string;
  setSelectedProject: (p: string) => void;
  dateStart: string;
  setDateStart: (d: string) => void;
  dateEnd: string;
  setDateEnd: (d: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onRefresh: () => void;
  onCreateNew: () => void;
  onSelectReport: (report: DPRReport) => void;
  onPreviewPDF: (report: DPRReport) => void;
  onOpenAudit: (dprId: string, reportNo: string) => void;
  onDeleteReport: (id: string) => void;
}

export const DPRRegister: React.FC<DPRRegisterProps> = ({
  reports,
  projects,
  loading,
  selectedProject,
  setSelectedProject,
  dateStart,
  setDateStart,
  dateEnd,
  setDateEnd,
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery,
  onRefresh,
  onCreateNew,
  onSelectReport,
  onPreviewPDF,
  onOpenAudit,
  onDeleteReport
}) => {
  const [sortField, setSortField] = useState<'date' | 'reportNo' | 'status'>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Filtered & Sorted reports
  const sortedReports = useMemo(() => {
    return [...reports].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') cmp = a.date.localeCompare(b.date);
      else if (sortField === 'reportNo') cmp = a.reportNo.localeCompare(b.reportNo);
      else if (sortField === 'status') cmp = a.status.localeCompare(b.status);
      return sortAsc ? cmp : -cmp;
    });
  }, [reports, sortField, sortAsc]);

  const totalPages = Math.ceil(sortedReports.length / pageSize) || 1;
  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedReports.slice(start, start + pageSize);
  }, [sortedReports, currentPage, pageSize]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const total = reports.length;
    const approved = reports.filter(r => r.status === 'Approved' || r.status === 'Locked').length;
    const inReview = reports.filter(r => r.status === 'Submitted' || r.status === 'Reviewed').length;
    const drafts = reports.filter(r => r.status === 'Draft').length;

    let totalConcrete = 0;
    let openHindrances = 0;

    reports.forEach(r => {
      if (r.concrete && Array.isArray(r.concrete)) {
        totalConcrete += r.concrete.reduce((sum, c) => sum + Number(c.volume || 0), 0);
      }
      if (r.hindrances && Array.isArray(r.hindrances)) {
        openHindrances += r.hindrances.filter(h => h.status === 'Pending' || h.status === 'Under Review').length;
      }
    });

    return { total, approved, inReview, drafts, totalConcrete, openHindrances };
  }, [reports]);

  // Export Register Table to Excel
  const handleExportRegisterExcel = () => {
    const data = sortedReports.map((r, idx) => {
      const manpowerCount = r.manpower?.reduce((s, m) => s + (Number(m.skilled || 0) + Number(m.semiSkilled || 0) + Number(m.unskilled || 0)), 0) || 0;
      const concreteVol = r.concrete?.reduce((s, c) => s + Number(c.volume || 0), 0) || 0;
      const hindrancesCount = r.hindrances?.filter(h => h.status !== 'Resolved').length || 0;

      return {
        'S.No': idx + 1,
        'Date': r.date,
        'Report No': r.reportNo,
        'Project Name': r.projectName || r.projectId,
        'Project Code': r.projectCode || '-',
        'Client': r.clientName || '-',
        'Status': r.status,
        'Weather': r.weather || 'Sunny',
        'Total Manpower': manpowerCount,
        'Concrete Volume (cum)': concreteVol,
        'Active Hindrances': hindrancesCount,
        'Prepared By': r.preparedBy || '-',
        'Reviewed By': r.reviewedBy || '-',
        'Approved By': r.approvedBy || '-'
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DPR Register");
    XLSX.writeFile(wb, `SN_DPR01_Register_${new Date().toISOString().substring(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-2 text-[11px]">
      
      {/* Top Action Ribbon (Classic SAP Style) */}
      <div className="bg-white border border-gray-300 rounded px-3 py-1.5 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-1.5">
          <button
            onClick={onCreateNew}
            className="px-2.5 py-1 bg-[#0a6ed1] hover:bg-[#0854a0] text-white rounded font-bold flex items-center space-x-1 shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create DPR</span>
          </button>

          <button
            onClick={onRefresh}
            className="px-2 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50 text-gray-700 font-semibold flex items-center space-x-1"
          >
            <RefreshCw className={`w-3 h-3 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportRegisterExcel}
            className="px-2 py-1 border border-gray-300 rounded bg-white hover:bg-emerald-50 text-emerald-700 font-semibold flex items-center space-x-1"
          >
            <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
            <span>Export Register</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-2 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50 text-gray-700 flex items-center space-x-1"
          >
            <Printer className="w-3 h-3 text-gray-500" />
            <span>Print List</span>
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Project Filter */}
          <div className="flex items-center space-x-1">
            <span className="text-[10px] uppercase font-bold text-gray-500">Project:</span>
            <SAPSelect
              value={selectedProject}
              onChange={e => { setSelectedProject(e.target.value); setCurrentPage(1); }}
              className="bg-white border border-gray-300 rounded px-2 py-0.5 text-[11px] font-medium"
            >
              <option value="All">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </SAPSelect>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-1">
            <span className="text-[10px] uppercase font-bold text-gray-500">Status:</span>
            <SAPSelect
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="bg-white border border-gray-300 rounded px-2 py-0.5 text-[11px] font-medium"
            >
              <option value="All">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Submitted">Submitted</option>
              <option value="Reviewed">Reviewed</option>
              <option value="Approved">Approved</option>
              <option value="Locked">Locked</option>
            </SAPSelect>
          </div>

          {/* Date Range */}
          <div className="flex items-center space-x-1">
            <span className="text-[10px] uppercase font-bold text-gray-500">Date:</span>
            <input
              type="date"
              value={dateStart}
              onChange={e => { setDateStart(e.target.value); setCurrentPage(1); }}
              className="bg-white border border-gray-300 rounded px-1.5 py-0.5 text-[10.5px]"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={dateEnd}
              onChange={e => { setDateEnd(e.target.value); setCurrentPage(1); }}
              className="bg-white border border-gray-300 rounded px-1.5 py-0.5 text-[10.5px]"
            />
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3 h-3 text-gray-400 absolute left-2 top-1.5" />
            <input
              type="text"
              placeholder="Search report no, project..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="bg-white border border-gray-300 rounded pl-6 pr-2 py-0.5 text-[11px] w-44 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* KPI Summary Tiles (Compact SAP Strip) */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        <div className="bg-white border border-gray-300 rounded p-2 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[9.5px] uppercase font-bold text-gray-500 block">Total Reports</span>
            <span className="text-sm font-black font-mono text-gray-800">{metrics.total}</span>
          </div>
          <Layers className="w-5 h-5 text-gray-400" />
        </div>

        <div className="bg-white border border-gray-300 rounded p-2 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[9.5px] uppercase font-bold text-gray-500 block">Approved & Locked</span>
            <span className="text-sm font-black font-mono text-emerald-700">{metrics.approved}</span>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        </div>

        <div className="bg-white border border-gray-300 rounded p-2 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[9.5px] uppercase font-bold text-gray-500 block">In Review / Submitted</span>
            <span className="text-sm font-black font-mono text-blue-700">{metrics.inReview}</span>
          </div>
          <Clock className="w-5 h-5 text-blue-500" />
        </div>

        <div className="bg-white border border-gray-300 rounded p-2 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[9.5px] uppercase font-bold text-gray-500 block">Draft Reports</span>
            <span className="text-sm font-black font-mono text-gray-600">{metrics.drafts}</span>
          </div>
          <Edit2 className="w-5 h-5 text-gray-400" />
        </div>

        <div className="bg-white border border-gray-300 rounded p-2 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[9.5px] uppercase font-bold text-gray-500 block">Total Concrete (cum)</span>
            <span className="text-sm font-black font-mono text-indigo-700">{metrics.totalConcrete.toFixed(1)}</span>
          </div>
          <div className="text-xs font-bold text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">m³</div>
        </div>

        <div className="bg-white border border-gray-300 rounded p-2 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[9.5px] uppercase font-bold text-gray-500 block">Open Hindrances</span>
            <span className={`text-sm font-black font-mono ${metrics.openHindrances > 0 ? 'text-rose-600' : 'text-gray-700'}`}>
              {metrics.openHindrances}
            </span>
          </div>
          <AlertTriangle className={`w-5 h-5 ${metrics.openHindrances > 0 ? 'text-rose-500' : 'text-gray-400'}`} />
        </div>
      </div>

      {/* Main ALV Table */}
      <div className="bg-white border border-gray-300 rounded shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#eef2f6] text-[#0a6ed1] font-bold border-b border-gray-300 text-[10.5px]">
                <th 
                  onClick={() => { setSortField('date'); setSortAsc(!sortAsc); }}
                  className="p-2 border-r border-gray-300 cursor-pointer hover:bg-gray-200 select-none w-24"
                >
                  <div className="flex items-center space-x-1">
                    <span>Date</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th 
                  onClick={() => { setSortField('reportNo'); setSortAsc(!sortAsc); }}
                  className="p-2 border-r border-gray-300 cursor-pointer hover:bg-gray-200 select-none w-36"
                >
                  <div className="flex items-center space-x-1">
                    <span>Report No.</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th className="p-2 border-r border-gray-300">Project Name</th>
                <th 
                  onClick={() => { setSortField('status'); setSortAsc(!sortAsc); }}
                  className="p-2 border-r border-gray-300 cursor-pointer hover:bg-gray-200 select-none w-24 text-center"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th className="p-2 border-r border-gray-300 text-center w-24">Manpower</th>
                <th className="p-2 border-r border-gray-300 text-right w-24">Concrete</th>
                <th className="p-2 border-r border-gray-300 text-center w-24">Hindrances</th>
                <th className="p-2 border-r border-gray-300 w-32">Prepared By</th>
                <th className="p-2 border-r border-gray-300 w-32">Approved By</th>
                <th className="p-2 text-center w-40">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedReports.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-gray-500 italic">
                    {loading ? "Loading Daily Progress Reports..." : "No DPR records found matching your filters. Click 'Create DPR' to begin."}
                  </td>
                </tr>
              ) : (
                paginatedReports.map(r => {
                  const manpowerCount = r.manpower?.reduce((s, m) => s + (Number(m.skilled || 0) + Number(m.semiSkilled || 0) + Number(m.unskilled || 0)), 0) || 0;
                  const concreteVol = r.concrete?.reduce((s, c) => s + Number(c.volume || 0), 0) || 0;
                  const activeHindrances = r.hindrances?.filter(h => h.status !== 'Resolved').length || 0;
                  const isLocked = r.status === 'Locked' || r.status === 'Approved';

                  return (
                    <tr 
                      key={r.id} 
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                      onClick={() => onSelectReport(r)}
                    >
                      <td className="p-2 border-r border-gray-200 font-mono font-bold text-gray-800 whitespace-nowrap">
                        {r.date}
                      </td>
                      <td className="p-2 border-r border-gray-200 font-mono font-bold text-[#0a6ed1] whitespace-nowrap">
                        {r.reportNo}
                      </td>
                      <td className="p-2 border-r border-gray-200 text-gray-900 font-medium">
                        <div className="truncate max-w-xs" title={r.projectName || r.projectId}>
                          {r.projectName || r.projectId}
                        </div>
                        {r.clientName && (
                          <div className="text-[9.5px] text-gray-400">Client: {r.clientName}</div>
                        )}
                      </td>
                      <td className="p-2 border-r border-gray-200 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold ${
                          r.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                          r.status === 'Locked' ? 'bg-gray-800 text-white' :
                          r.status === 'Reviewed' ? 'bg-indigo-100 text-indigo-800 border border-indigo-300' :
                          r.status === 'Submitted' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                          'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}>
                          {r.status === 'Locked' && <Lock className="w-2.5 h-2.5 inline mr-1" />}
                          {r.status}
                        </span>
                      </td>
                      <td className="p-2 border-r border-gray-200 text-center font-mono font-semibold text-gray-700">
                        {manpowerCount}
                      </td>
                      <td className="p-2 border-r border-gray-200 text-right font-mono font-bold text-gray-800">
                        {concreteVol > 0 ? `${concreteVol.toFixed(1)} m³` : '-'}
                      </td>
                      <td className="p-2 border-r border-gray-200 text-center">
                        {activeHindrances > 0 ? (
                          <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-bold text-[9.5px]">
                            {activeHindrances} open
                          </span>
                        ) : (
                          <span className="text-gray-400 text-[10px]">Nil</span>
                        )}
                      </td>
                      <td className="p-2 border-r border-gray-200 text-gray-700 truncate max-w-[110px]" title={r.preparedBy}>
                        {r.preparedBy || '-'}
                      </td>
                      <td className="p-2 border-r border-gray-200 text-gray-700 truncate max-w-[110px]" title={r.approvedBy}>
                        {r.approvedBy || '-'}
                      </td>
                      <td className="p-1.5 text-center whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => onSelectReport(r)}
                            className="p-1 border border-gray-300 rounded bg-white hover:bg-gray-100 text-[#0a6ed1]"
                            title="Open & Edit DPR"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>

                          <button
                            onClick={() => onPreviewPDF(r)}
                            className="p-1 border border-gray-300 rounded bg-white hover:bg-blue-50 text-[#0a6ed1]"
                            title="Preview 2-Page PDF"
                          >
                            <Eye className="w-3 h-3" />
                          </button>

                          <button
                            onClick={() => onOpenAudit(r.id, r.reportNo)}
                            className="p-1 border border-gray-300 rounded bg-white hover:bg-gray-100 text-gray-600"
                            title="View Audit Trail"
                          >
                            <History className="w-3 h-3" />
                          </button>

                          {r.status === 'Draft' && (
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete Draft report ${r.reportNo}?`)) {
                                  onDeleteReport(r.id);
                                }
                              }}
                              className="p-1 border border-gray-300 rounded bg-white hover:bg-rose-50 text-rose-600"
                              title="Delete Draft"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="bg-[#f8f9fa] border-t border-gray-300 px-3 py-1.5 flex flex-wrap items-center justify-between text-[10px] text-gray-600">
          <div>
            Showing {(paginatedReports.length > 0 ? (currentPage - 1) * pageSize + 1 : 0)} to {Math.min(currentPage * pageSize, sortedReports.length)} of {sortedReports.length} records
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2 py-0.5 border border-gray-300 rounded bg-white disabled:opacity-40 disabled:cursor-not-allowed font-semibold"
            >
              Prev
            </button>
            <span className="px-2 font-mono">Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2 py-0.5 border border-gray-300 rounded bg-white disabled:opacity-40 disabled:cursor-not-allowed font-semibold"
            >
              Next
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
