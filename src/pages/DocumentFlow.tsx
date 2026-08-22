import React, { useState, useMemo } from 'react';
import { useAppContext } from '../store';
import { 
  DocFlowNode, 
  DocFlowFilter, 
  DocFlowCategory, 
  DocFlowStatus 
} from '../types';
import { 
  buildAllDocumentNodes, 
  searchDocumentFlow, 
  exportDocumentFlowToPDF, 
  exportDocumentFlowToExcel 
} from '../lib/documentFlowEngine';
import { DocumentFlowViewer } from '../components/DocumentFlowViewer';
import { SAPSelect } from '../components/SAPSelect';
import { F4Help } from '../components/F4Help';
import { 
  GitFork, Search, Filter, RefreshCw, Printer, Download, 
  FileSpreadsheet, Building, FileText, CreditCard, Users, 
  TrendingDown, Package, Server, ArrowLeftRight, CheckCircle2, 
  Clock, AlertTriangle, ShieldCheck, ChevronRight, Layers, HelpCircle
} from 'lucide-react';

interface DocumentFlowPageProps {
  initialDocumentIdOrNo?: string;
  initialPreset?: string;
  initialProjectId?: string;
}

export const DocumentFlowPage: React.FC<DocumentFlowPageProps> = ({
  initialDocumentIdOrNo,
  initialPreset,
  initialProjectId
}) => {
  const erpState = useAppContext();
  const { user, projects = [] } = erpState;

  // Build unified graph of all nodes
  const allNodes = useMemo(() => {
    return buildAllDocumentNodes(erpState);
  }, [erpState]);

  // Global filters
  const [filterPreset, setFilterPreset] = useState<string>(initialPreset || 'all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId || 'all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDocType, setSelectedDocType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Selected active focus node
  const [activeDocId, setActiveDocId] = useState<string>(() => {
    if (initialDocumentIdOrNo) return initialDocumentIdOrNo;
    const keys = Object.keys(allNodes);
    return keys[0] || '';
  });

  // Keep activeDocId valid if nodes update
  React.useEffect(() => {
    if (initialDocumentIdOrNo) {
      setActiveDocId(initialDocumentIdOrNo);
    }
  }, [initialDocumentIdOrNo]);

  // Handle Preset Selection
  const handlePresetChange = (preset: string) => {
    setFilterPreset(preset);
    if (preset === 'billing') {
      setSelectedCategory('Billing');
      setSelectedDocType('BILLING');
    } else if (preset === 'labour') {
      setSelectedCategory('Labour');
      setSelectedDocType('WORKER_PAYMENT');
    } else if (preset === 'subcontractor') {
      setSelectedCategory('Subcontractor');
      setSelectedDocType('SUBCONTRACTOR_BILL');
    } else if (preset === 'expense') {
      setSelectedCategory('Expense');
      setSelectedDocType('EXPENSE');
    } else if (preset === 'material') {
      setSelectedCategory('Material');
      setSelectedDocType('MATERIAL_PURCHASE');
    } else if (preset === 'asset') {
      setSelectedCategory('Asset');
      setSelectedDocType('ASSET');
    } else {
      setSelectedCategory('all');
      setSelectedDocType('all');
    }
  };

  // Filtered documents list
  const filteredDocList = useMemo(() => {
    const filter: DocFlowFilter = {
      searchQuery,
      projectId: selectedProjectId,
      category: selectedCategory,
      docType: selectedDocType,
      status: selectedStatus,
      dateFrom,
      dateTo
    };
    return searchDocumentFlow(filter, allNodes);
  }, [searchQuery, selectedProjectId, selectedCategory, selectedDocType, selectedStatus, dateFrom, dateTo, allNodes]);

  // Calculate summary metrics
  const summaryStats = useMemo(() => {
    let totalVal = 0;
    filteredDocList.forEach(d => {
      if (d.amount) totalVal += d.amount;
    });
    return {
      count: filteredDocList.length,
      totalAmount: totalVal
    };
  }, [filteredDocList]);

  const handleResetFilters = () => {
    setFilterPreset('all');
    setSearchQuery('');
    setSelectedProjectId('all');
    setSelectedCategory('all');
    setSelectedDocType('all');
    setSelectedStatus('all');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <div className="flex flex-col h-full bg-[#f0f4f8] text-slate-800 font-sans select-none overflow-hidden">
      {/* Top SAP Header / Title Bar */}
      <div className="bg-gradient-to-r from-[#00386b] via-[#0056b3] to-[#00386b] text-white px-4 py-2 flex flex-wrap items-center justify-between gap-2 shadow-xs shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-7 h-7 bg-white/20 rounded-[3px] flex items-center justify-center font-bold text-[12px] border border-white/30">
            <GitFork size={16} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold text-[13px] tracking-wide uppercase">
                SN ENTERPRISES — SAP Document Flow & Business Flow Workbench
              </h1>
              <span className="font-mono text-[9px] bg-amber-400 text-slate-900 font-extrabold px-1.5 py-0.2 rounded-[2px] shadow-2xs">
                T-Code: DF01 / DOCFLOW
              </span>
            </div>
            <p className="text-[10px] text-blue-100">
              End-to-End Enterprise Transaction Traceability Chain & Audit Inspector
            </p>
          </div>
        </div>

        {/* Global Flow Presets */}
        <div className="flex items-center space-x-1 overflow-x-auto py-1">
          <span className="text-[9px] font-bold text-blue-200 uppercase mr-1">Lifecycle Flows:</span>
          {[
            { key: 'all', label: 'Universal Overview' },
            { key: 'billing', label: 'Project → Billing → Client Payment' },
            { key: 'labour', label: 'Worker → DLR → Wages → Ledger' },
            { key: 'subcontractor', label: 'Subcontractor → Bill → Payment' },
            { key: 'expense', label: 'Site Expenses & Approvals' },
            { key: 'material', label: 'Materials & Goods Issue' },
            { key: 'asset', label: 'Asset & Plant Deployment' }
          ].map(pr => (
            <button
              key={pr.key}
              onClick={() => handlePresetChange(pr.key)}
              className={`px-2 py-1 rounded-[2px] text-[9px] font-bold cursor-pointer whitespace-nowrap transition-colors border ${
                filterPreset === pr.key 
                  ? 'bg-white text-[#00386b] border-white shadow-xs' 
                  : 'bg-white/10 hover:bg-white/20 text-white border-transparent'
              }`}
            >
              {pr.label}
            </button>
          ))}
        </div>
      </div>

      {/* SAP Filter Bar */}
      <div className="bg-[#eef2f6] border-b border-[#8c9ba8] px-3 py-2 flex flex-wrap items-center gap-2 text-[10px] shrink-0">
        {/* Search Query */}
        <div className="relative min-w-[200px] flex-1">
          <Search size={12} className="absolute left-2 top-2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Doc No (e.g. BILL-2026-0045, PRJ-..., CPAY-...), Name, Bill No..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-2 py-1 bg-white border border-slate-300 rounded-[2px] font-mono text-[10px] focus:border-[#0056b3] outline-none shadow-2xs"
          />
        </div>

        {/* Project Selector */}
        <div className="w-48">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full py-1 px-2 bg-white border border-slate-300 rounded-[2px] text-[10px] focus:border-[#0056b3] outline-none font-semibold text-slate-700 shadow-2xs"
          >
            <option value="all">-- All Projects --</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Category Selector */}
        <div className="w-32">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full py-1 px-2 bg-white border border-slate-300 rounded-[2px] text-[10px] focus:border-[#0056b3] outline-none text-slate-700 shadow-2xs"
          >
            <option value="all">All Categories</option>
            <option value="Billing">Billing & Revenue</option>
            <option value="Labour">Labour & Payroll</option>
            <option value="Subcontractor">Subcontractors</option>
            <option value="Expense">Site Expenses</option>
            <option value="Material">Material & Store</option>
            <option value="Asset">Assets & Plant</option>
            <option value="Project">Project Master</option>
          </select>
        </div>

        {/* Status Selector */}
        <div className="w-32">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full py-1 px-2 bg-white border border-slate-300 rounded-[2px] text-[10px] focus:border-[#0056b3] outline-none text-slate-700 shadow-2xs"
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Certified">Certified</option>
            <option value="Posted & Locked">Posted & Locked</option>
            <option value="Approved">Approved</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="On Hold">On Hold</option>
            <option value="Completed">Completed</option>
            <option value="Draft">Draft</option>
          </select>
        </div>

        {/* Date From & To */}
        <div className="flex items-center space-x-1">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="py-0.5 px-1.5 bg-white border border-slate-300 rounded-[2px] text-[9px] outline-none font-mono"
            title="Date From"
          />
          <span className="text-slate-400 font-mono text-[9px]">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="py-0.5 px-1.5 bg-white border border-slate-300 rounded-[2px] text-[9px] outline-none font-mono"
            title="Date To"
          />
        </div>

        {/* Reset Filters */}
        <button
          onClick={handleResetFilters}
          className="p-1 px-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded-[2px] text-[9px] font-bold flex items-center space-x-1 cursor-pointer shadow-2xs"
          title="Reset all filters"
        >
          <RefreshCw size={10} />
          <span>Reset</span>
        </button>
      </div>

      {/* Main Split Layout: Left Directory List + Right Document Flow Graph */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left Document Directory Sidebar */}
        <div className="w-72 bg-white border-r border-[#8c9ba8] flex flex-col overflow-hidden shrink-0">
          {/* List Header Summary */}
          <div className="bg-[#f1f5f9] p-2 border-b border-slate-200 flex items-center justify-between text-[10px]">
            <div>
              <span className="font-bold text-slate-800 uppercase tracking-tight">Document Directory</span>
              <span className="text-slate-500 block text-[8px] font-mono">
                {summaryStats.count} records | Total: ₹{summaryStats.totalAmount.toLocaleString('en-IN')}
              </span>
            </div>
            <span className="bg-blue-100 text-[#0056b3] text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
              SAP FB03
            </span>
          </div>

          {/* Document Items List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredDocList.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-[10px]">
                No matching transactions found with applied filters.
              </div>
            ) : (
              filteredDocList.map(node => {
                const isActive = node.id === activeDocId;
                return (
                  <div
                    key={node.id}
                    onClick={() => setActiveDocId(node.id)}
                    className={`p-2 cursor-pointer transition-colors border-l-3 ${
                      isActive 
                        ? 'bg-[#e6f2ff] border-l-[#0056b3] text-slate-900 shadow-2xs' 
                        : 'hover:bg-slate-50 border-l-transparent text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-mono font-bold text-[10px] text-[#0056b3] truncate">
                        {node.documentNumber}
                      </span>
                      <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-slate-100 border border-slate-200">
                        {node.status}
                      </span>
                    </div>

                    <p className="font-semibold text-[10px] line-clamp-1 text-slate-800">
                      {node.title}
                    </p>

                    <div className="flex items-center justify-between mt-1 text-[8px] text-slate-500">
                      <span className="truncate max-w-[120px]">{node.projectName || node.category}</span>
                      <span className="font-mono font-bold text-slate-700">
                        {node.amount ? `₹${node.amount.toLocaleString('en-IN')}` : (node.quantity ? `${node.quantity} ${node.unit || ''}` : node.date)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Active Document Flow Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <DocumentFlowViewer
            initialDocumentIdOrNo={activeDocId}
            allNodes={allNodes}
            user={user}
          />
        </div>
      </div>
    </div>
  );
};
