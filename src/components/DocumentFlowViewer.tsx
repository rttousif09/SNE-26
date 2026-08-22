import React, { useState, useMemo } from 'react';
import { 
  DocFlowNode, 
  DocFlowChain, 
  DocFlowCategory, 
  DocFlowStatus 
} from '../types';
import { DocumentFlowNodeCard } from './DocumentFlowNodeCard';
import { 
  resolveDocumentChain, 
  exportDocumentFlowToPDF, 
  exportDocumentFlowToExcel 
} from '../lib/documentFlowEngine';
import { 
  ArrowRight, ArrowLeft, GitFork, ArrowLeftRight, Layers, 
  Printer, Download, FileSpreadsheet, ExternalLink, ShieldCheck, 
  Search, RefreshCw, Eye, CheckCircle2, Clock, XCircle, Info, 
  ChevronRight, Calendar, User, FileText, ArrowUpRight, Filter
} from 'lucide-react';

interface DocumentFlowViewerProps {
  initialDocumentIdOrNo?: string;
  allNodes: Record<string, DocFlowNode>;
  onNavigateToTab?: (tab: string, title?: string, props?: any) => void;
  onClose?: () => void;
  user?: { username: string; name: string } | null;
  compact?: boolean;
}

export const DocumentFlowViewer: React.FC<DocumentFlowViewerProps> = ({
  initialDocumentIdOrNo,
  allNodes,
  onNavigateToTab,
  onClose,
  user,
  compact = false
}) => {
  const [selectedDocId, setSelectedDocId] = useState<string>(
    initialDocumentIdOrNo || (Object.keys(allNodes)[0] || '')
  );

  const [activeFilterView, setActiveFilterView] = useState<'all' | 'preceding' | 'followup' | 'timeline' | 'table'>('all');
  const [stageOrientation, setStageOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [showInspector, setShowInspector] = useState<boolean>(true);
  const [quickSearch, setQuickSearch] = useState<string>('');

  // Update selected doc if prop changes
  React.useEffect(() => {
    if (initialDocumentIdOrNo) {
      setSelectedDocId(initialDocumentIdOrNo);
    }
  }, [initialDocumentIdOrNo]);

  // Compute chain for active selected doc
  const chain: DocFlowChain | null = useMemo(() => {
    return resolveDocumentChain(selectedDocId, allNodes);
  }, [selectedDocId, allNodes]);

  const currentDoc = chain?.currentDoc;

  // Handle drill down to original module
  const handleOpenOriginalScreen = (node: DocFlowNode) => {
    if (onNavigateToTab) {
      onNavigateToTab(node.targetTab, node.title, node.targetProps);
    } else if ((window as any).openWorkspaceTab) {
      (window as any).openWorkspaceTab(node.targetTab, node.title, node.targetProps);
    }
    if (onClose) {
      onClose();
    }
  };

  // Filtered nodes based on active view tab
  const displayedNodes = useMemo(() => {
    if (!chain) return [];
    let list: DocFlowNode[] = [];
    if (activeFilterView === 'preceding') {
      list = [...chain.precedingDocs, ...(currentDoc ? [currentDoc] : [])];
    } else if (activeFilterView === 'followup') {
      list = [...(currentDoc ? [currentDoc] : []), ...chain.followUpDocs];
    } else {
      list = chain.allRelatedNodes;
    }

    if (quickSearch.trim()) {
      const q = quickSearch.trim().toLowerCase();
      list = list.filter(n => 
        n.documentNumber.toLowerCase().includes(q) ||
        n.title.toLowerCase().includes(q) ||
        n.documentTypeName.toLowerCase().includes(q) ||
        (n.projectName && n.projectName.toLowerCase().includes(q))
      );
    }

    return list;
  }, [chain, activeFilterView, currentDoc, quickSearch]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    if (!chain) return;
    exportDocumentFlowToPDF(
      currentDoc ? `${currentDoc.documentNumber}_Chain` : 'All_Documents',
      currentDoc,
      displayedNodes,
      user?.name || 'Authorized Staff'
    );
  };

  const handleExportExcel = () => {
    if (!chain) return;
    exportDocumentFlowToExcel(
      currentDoc ? `${currentDoc.documentNumber}_Chain` : 'All_Documents',
      displayedNodes
    );
  };

  if (!chain || !currentDoc) {
    return (
      <div className="p-8 text-center bg-white border border-[#8c9ba8] rounded-sm">
        <Info size={32} className="mx-auto text-slate-400 mb-2" />
        <p className="font-bold text-slate-700 text-[12px]">No document flow records found</p>
        <p className="text-slate-500 text-[10px] mt-1">Select another transaction or verify database state.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-slate-800 font-sans select-none overflow-hidden">
      {/* Top SAP Action Toolbar */}
      <div className="bg-[#eef2f6] border-b border-[#8c9ba8] p-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 bg-[#0056b3] text-white rounded-[2px] flex items-center justify-center font-bold text-[10px]">
            <GitFork size={12} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-[12px] text-[#0056b3] font-mono">{currentDoc.documentNumber}</span>
              <span className="text-[10px] text-slate-600 font-semibold">({currentDoc.documentTypeName})</span>
              <span className={`px-1.5 py-0.2 text-[8px] font-bold rounded-[2px] border ${
                currentDoc.statusColor === 'green' ? 'bg-green-50 text-green-800 border-green-300' :
                currentDoc.statusColor === 'blue' ? 'bg-blue-50 text-blue-800 border-blue-300' :
                currentDoc.statusColor === 'amber' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                'bg-slate-50 text-slate-800 border-slate-300'
              }`}>
                {currentDoc.status}
              </span>
            </div>
            <span className="text-[9px] text-slate-500 block truncate max-w-md">
              Project: <span className="font-semibold text-slate-700">{currentDoc.projectName || 'Universal Site'}</span> | Date: {currentDoc.date}
            </span>
          </div>
        </div>

        {/* View mode toggle tabs */}
        <div className="flex items-center space-x-1">
          <div className="bg-white border border-[#cbd5e1] p-0.5 rounded-[2px] flex items-center space-x-0.5">
            <button
              onClick={() => setActiveFilterView('all')}
              className={`px-2 py-1 rounded-[2px] text-[9px] font-bold cursor-pointer transition-colors ${
                activeFilterView === 'all' ? 'bg-[#0056b3] text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="View entire lifecycle and connected branches"
            >
              Complete Flow ({chain.allRelatedNodes.length})
            </button>

            <button
              onClick={() => setActiveFilterView('preceding')}
              className={`px-2 py-1 rounded-[2px] text-[9px] font-bold cursor-pointer transition-colors flex items-center space-x-1 ${
                activeFilterView === 'preceding' ? 'bg-[#0056b3] text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Preceding Documents: Upstream origins, measurements and approvals"
            >
              <ArrowLeft size={10} />
              <span>Preceding ({chain.precedingDocs.length})</span>
            </button>

            <button
              onClick={() => setActiveFilterView('followup')}
              className={`px-2 py-1 rounded-[2px] text-[9px] font-bold cursor-pointer transition-colors flex items-center space-x-1 ${
                activeFilterView === 'followup' ? 'bg-[#0056b3] text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Follow-Up Documents: Downstream billings, payments and postings"
            >
              <span>Follow-Up ({chain.followUpDocs.length})</span>
              <ArrowRight size={10} />
            </button>

            <button
              onClick={() => setActiveFilterView('table')}
              className={`px-2 py-1 rounded-[2px] text-[9px] font-bold cursor-pointer transition-colors ${
                activeFilterView === 'table' ? 'bg-[#0056b3] text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Audit Table Grid Matrix"
            >
              Table View
            </button>
          </div>

          {/* Export Actions */}
          <div className="flex items-center space-x-1 pl-2 border-l border-slate-300">
            <button
              onClick={handleExportPDF}
              className="p-1 px-2 bg-white hover:bg-red-50 text-red-700 border border-slate-300 hover:border-red-400 rounded-[2px] text-[9px] font-bold flex items-center space-x-1 cursor-pointer shadow-2xs"
              title="Export SAP Audit PDF"
            >
              <Download size={10} />
              <span>PDF</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="p-1 px-2 bg-white hover:bg-green-50 text-green-700 border border-slate-300 hover:border-green-400 rounded-[2px] text-[9px] font-bold flex items-center space-x-1 cursor-pointer shadow-2xs"
              title="Export Excel Worksheet"
            >
              <FileSpreadsheet size={10} />
              <span>Excel</span>
            </button>

            <button
              onClick={handlePrint}
              className="p-1 px-2 bg-white hover:bg-blue-50 text-[#0056b3] border border-slate-300 hover:border-blue-400 rounded-[2px] text-[9px] font-bold flex items-center space-x-1 cursor-pointer shadow-2xs"
              title="Print Document Flow Sheet"
            >
              <Printer size={10} />
              <span>Print</span>
            </button>

            <button
              onClick={() => handleOpenOriginalScreen(currentDoc)}
              className="p-1 px-2.5 bg-gradient-to-b from-[#0056b3] to-[#00386b] text-white hover:brightness-110 rounded-[2px] text-[9px] font-bold flex items-center space-x-1 cursor-pointer shadow-xs ml-1"
              title="Jump directly to the original module screen for this transaction"
            >
              <span>Open in {currentDoc.documentTypeName}</span>
              <ExternalLink size={10} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Flow Stage Canvas + Side Inspector Layout */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Visual Graph / Pipeline Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#edf2f7] border-r border-[#cbd5e1]">
          {/* Filter Search within current chain */}
          <div className="bg-white px-3 py-1.5 border-b border-slate-200 flex items-center justify-between text-[10px]">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-slate-600">Business Flow Stages:</span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-500 font-mono text-[9px]">
                Showing {displayedNodes.length} related documents across {chain.stages.length} lifecycle phases
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search size={11} className="absolute left-2 top-1.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter nodes in chain..."
                  value={quickSearch}
                  onChange={(e) => setQuickSearch(e.target.value)}
                  className="pl-6 pr-2 py-0.5 text-[9px] bg-slate-50 border border-slate-300 rounded-[2px] focus:bg-white focus:border-[#0056b3] outline-none w-48 font-mono"
                />
              </div>

              <button
                onClick={() => setStageOrientation(prev => prev === 'horizontal' ? 'vertical' : 'horizontal')}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-[2px] text-[9px] font-semibold text-slate-700 cursor-pointer"
                title="Switch layout between Horizontal Pipeline and Vertical Sequence"
              >
                {stageOrientation === 'horizontal' ? '⇄ Horizontal Flow' : '⇅ Vertical Sequence'}
              </button>

              <button
                onClick={() => setShowInspector(prev => !prev)}
                className={`px-2 py-0.5 border rounded-[2px] text-[9px] font-semibold cursor-pointer ${
                  showInspector ? 'bg-blue-50 text-[#0056b3] border-blue-300 font-bold' : 'bg-slate-100 text-slate-700 border-slate-300'
                }`}
                title="Toggle Audit & Inspector Side Drawer"
              >
                {showInspector ? 'Hide Inspector' : 'Show Inspector'}
              </button>
            </div>
          </div>

          {/* Flow Workspace Area */}
          <div className="flex-1 overflow-auto p-4">
            {activeFilterView === 'table' ? (
              /* Table Matrix View */
              <div className="bg-white border border-[#8c9ba8] rounded-[2px] overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse text-[10px]">
                  <thead className="bg-[#eef2f6] text-slate-700 font-bold border-b border-[#8c9ba8]">
                    <tr>
                      <th className="p-2 border-r border-[#8c9ba8]">Doc Number</th>
                      <th className="p-2 border-r border-[#8c9ba8]">Transaction Type</th>
                      <th className="p-2 border-r border-[#8c9ba8]">Description / Particulars</th>
                      <th className="p-2 border-r border-[#8c9ba8]">Project / Entity</th>
                      <th className="p-2 border-r border-[#8c9ba8]">Date</th>
                      <th className="p-2 border-r border-[#8c9ba8] text-right">Amount / Qty</th>
                      <th className="p-2 border-r border-[#8c9ba8] text-center">Status</th>
                      <th className="p-2 border-r border-[#8c9ba8]">Created By</th>
                      <th className="p-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {displayedNodes.map((n) => {
                      const isSel = n.id === currentDoc.id;
                      return (
                        <tr 
                          key={n.id}
                          onClick={() => setSelectedDocId(n.id)}
                          className={`hover:bg-[#e6f2ff] cursor-pointer transition-colors ${
                            isSel ? 'bg-[#cce8ff] font-semibold' : ''
                          }`}
                        >
                          <td className="p-2 border-r border-slate-200 font-mono font-bold text-[#0056b3]">
                            {n.documentNumber}
                          </td>
                          <td className="p-2 border-r border-slate-200 font-medium text-slate-700">
                            {n.documentTypeName}
                          </td>
                          <td className="p-2 border-r border-slate-200">
                            <span className="block truncate max-w-xs">{n.title}</span>
                          </td>
                          <td className="p-2 border-r border-slate-200 text-slate-600">
                            {n.projectName || n.clientName || n.workerName || n.subcontractorName || 'N/A'}
                          </td>
                          <td className="p-2 border-r border-slate-200 font-mono text-slate-600">
                            {n.date}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-right font-mono font-bold text-slate-800">
                            {n.amount ? `₹${n.amount.toLocaleString('en-IN')}` : (n.quantity ? `${n.quantity} ${n.unit || ''}` : '-')}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-center">
                            <span className="px-1.5 py-0.5 rounded-[2px] text-[8px] font-bold bg-slate-100 border border-slate-300">
                              {n.status}
                            </span>
                          </td>
                          <td className="p-2 border-r border-slate-200 text-slate-500 text-[9px]">
                            {n.audit.createdBy || 'System'}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenOriginalScreen(n);
                              }}
                              className="px-1.5 py-0.5 bg-white hover:bg-blue-50 border border-slate-300 text-[#0056b3] rounded text-[8px] font-bold cursor-pointer inline-flex items-center space-x-0.5"
                            >
                              <span>Open</span>
                              <ExternalLink size={8} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : stageOrientation === 'horizontal' ? (
              /* Horizontal Pipeline Stage Graph */
              <div className="flex items-start space-x-6 min-w-max pb-6">
                {chain.stages.map((stg, stgIdx) => (
                  <div key={stg.stageKey} className="flex items-start">
                    {/* Stage Column Box */}
                    <div className="bg-slate-50 border border-[#cbd5e1] rounded-[4px] p-2.5 shadow-xs w-72 flex flex-col">
                      <div className="bg-[#eef2f6] border border-[#cbd5e1] px-2 py-1 rounded-[2px] mb-2 flex items-center justify-between">
                        <span className="font-bold text-[10px] text-[#0056b3] tracking-tight uppercase">
                          {stg.stageTitle}
                        </span>
                        <span className="bg-white border border-slate-300 px-1 py-0.2 rounded font-mono text-[8px] font-bold text-slate-600">
                          {stg.nodes.length}
                        </span>
                      </div>

                      <div className="flex flex-col space-y-2.5">
                        {stg.nodes.map(node => (
                          <DocumentFlowNodeCard
                            key={node.id}
                            node={node}
                            isCurrent={node.id === currentDoc.id}
                            onSelectNode={(n) => setSelectedDocId(n.id)}
                            onOpenOriginalScreen={handleOpenOriginalScreen}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Connecting Chevron Arrow to next stage */}
                    {stgIdx < chain.stages.length - 1 && (
                      <div className="flex flex-col items-center justify-center px-3 self-center text-slate-400">
                        <div className="w-6 h-0.5 bg-slate-300"></div>
                        <ArrowRight size={16} className="text-[#0056b3] my-1" />
                        <div className="w-6 h-0.5 bg-slate-300"></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              /* Vertical Sequence View */
              <div className="max-w-2xl mx-auto flex flex-col space-y-4 pb-6">
                {chain.stages.map((stg, stgIdx) => (
                  <div key={stg.stageKey} className="relative">
                    <div className="bg-white border border-[#8c9ba8] rounded-[3px] p-3 shadow-xs">
                      <div className="flex items-center space-x-2 mb-2 pb-1.5 border-b border-slate-200">
                        <div className="w-5 h-5 bg-[#0056b3] text-white rounded-full flex items-center justify-center font-bold text-[9px]">
                          {stgIdx + 1}
                        </div>
                        <span className="font-bold text-[11px] text-[#0056b3]">{stg.stageTitle}</span>
                        <span className="text-slate-400 text-[9px]">({stg.nodes.length} documents)</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {stg.nodes.map(node => (
                          <DocumentFlowNodeCard
                            key={node.id}
                            node={node}
                            isCurrent={node.id === currentDoc.id}
                            onSelectNode={(n) => setSelectedDocId(n.id)}
                            onOpenOriginalScreen={handleOpenOriginalScreen}
                          />
                        ))}
                      </div>
                    </div>

                    {stgIdx < chain.stages.length - 1 && (
                      <div className="flex justify-center py-2">
                        <div className="flex flex-col items-center">
                          <div className="w-0.5 h-3 bg-slate-300"></div>
                          <ChevronRight size={14} className="text-[#0056b3] rotate-90" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Selected Document Details & Audit Inspector Drawer */}
        {showInspector && (
          <div className="w-80 bg-white border-l border-[#8c9ba8] flex flex-col overflow-hidden shrink-0 shadow-md">
            {/* Inspector Header */}
            <div className="bg-[#0056b3] text-white p-2.5 flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <ShieldCheck size={14} className="text-amber-300" />
                <span className="font-bold text-[11px] font-mono">SAP Document Inspector</span>
              </div>
              <button
                onClick={() => setShowInspector(false)}
                className="text-white/80 hover:text-white p-0.5 rounded cursor-pointer text-[10px]"
              >
                ✕
              </button>
            </div>

            {/* Inspector Body */}
            <div className="flex-1 overflow-y-auto p-3 divide-y divide-slate-200 text-[10px]">
              {/* Document Identity Banner */}
              <div className="pb-3">
                <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Document Key</span>
                <p className="font-mono font-extrabold text-[14px] text-[#0056b3]">{currentDoc.documentNumber}</p>
                <div className="flex items-center space-x-1 mt-1">
                  <span className="font-bold text-slate-800">{currentDoc.documentTypeName}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-500">{currentDoc.category}</span>
                </div>
                <p className="text-slate-600 font-medium mt-1 leading-snug">{currentDoc.title}</p>
              </div>

              {/* Status & Core Amounts */}
              <div className="py-2.5">
                <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider mb-1.5">Posting Status & Valuation</span>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded border border-slate-200">
                  <div>
                    <span className="text-slate-400 text-[8px] uppercase block">Posting Status</span>
                    <span className="font-bold text-slate-900">{currentDoc.status}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[8px] uppercase block">Value Amount</span>
                    <span className="font-mono font-extrabold text-slate-900">
                      {currentDoc.amount ? `₹${currentDoc.amount.toLocaleString('en-IN')}` : (currentDoc.quantity ? `${currentDoc.quantity} ${currentDoc.unit || ''}` : '₹0.00')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[8px] uppercase block">Posting Date</span>
                    <span className="font-mono font-medium text-slate-700">{currentDoc.date}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[8px] uppercase block">Project Site</span>
                    <span className="font-medium text-slate-700 truncate block" title={currentDoc.projectName}>
                      {currentDoc.projectName || 'Universal'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Audit Trail & Authorization */}
              <div className="py-2.5">
                <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider mb-1.5">Security Audit Trail</span>
                <div className="space-y-1.5 text-[9px]">
                  <div className="flex items-start justify-between">
                    <span className="text-slate-500">Created By:</span>
                    <span className="font-semibold text-slate-800 text-right">{currentDoc.audit.createdBy || 'System Administrator'}</span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-slate-500">Creation Date:</span>
                    <span className="font-mono text-slate-700">{currentDoc.audit.createdDate || currentDoc.date}</span>
                  </div>
                  {currentDoc.audit.approvedBy && (
                    <div className="flex items-start justify-between text-green-800 bg-green-50/70 p-1 rounded">
                      <span>Approved By:</span>
                      <span className="font-bold">{currentDoc.audit.approvedBy} ({currentDoc.audit.approvedDate || currentDoc.date})</span>
                    </div>
                  )}
                  {currentDoc.audit.postedBy && (
                    <div className="flex items-start justify-between text-blue-900 bg-blue-50/70 p-1 rounded">
                      <span>Posted To Ledger:</span>
                      <span className="font-bold">{currentDoc.audit.postedBy}</span>
                    </div>
                  )}
                  {currentDoc.audit.reversedBy && (
                    <div className="flex items-start justify-between text-purple-900 bg-purple-50 p-1 rounded">
                      <span>Reversed By:</span>
                      <span className="font-bold">{currentDoc.audit.reversedBy}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Preceding Document Links */}
              <div className="py-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                    Preceding Documents ({currentDoc.precedingDocIds.length})
                  </span>
                </div>
                {currentDoc.precedingDocIds.length === 0 ? (
                  <p className="text-slate-400 italic text-[9px]">This is an originating root transaction.</p>
                ) : (
                  <div className="space-y-1">
                    {currentDoc.precedingDocIds.map(pId => {
                      const pNode = allNodes[pId];
                      if (!pNode) return null;
                      return (
                        <div
                          key={pId}
                          onClick={() => setSelectedDocId(pNode.id)}
                          className="p-1.5 bg-slate-50 hover:bg-[#e6f2ff] border border-slate-200 hover:border-blue-400 rounded-[2px] cursor-pointer flex items-center justify-between"
                        >
                          <div className="min-w-0 truncate">
                            <span className="font-mono font-bold text-[9px] text-[#0056b3] block truncate">{pNode.documentNumber}</span>
                            <span className="text-[8px] text-slate-500 truncate block">{pNode.documentTypeName}</span>
                          </div>
                          <ArrowRight size={10} className="text-slate-400 shrink-0 ml-1" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Follow-Up Document Links */}
              <div className="py-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                    Follow-Up Documents ({currentDoc.followUpDocIds.length})
                  </span>
                </div>
                {currentDoc.followUpDocIds.length === 0 ? (
                  <p className="text-slate-400 italic text-[9px]">No downstream documents created yet.</p>
                ) : (
                  <div className="space-y-1">
                    {currentDoc.followUpDocIds.map(fId => {
                      const fNode = allNodes[fId];
                      if (!fNode) return null;
                      return (
                        <div
                          key={fId}
                          onClick={() => setSelectedDocId(fNode.id)}
                          className="p-1.5 bg-slate-50 hover:bg-[#e6f2ff] border border-slate-200 hover:border-blue-400 rounded-[2px] cursor-pointer flex items-center justify-between"
                        >
                          <div className="min-w-0 truncate">
                            <span className="font-mono font-bold text-[9px] text-[#0056b3] block truncate">{fNode.documentNumber}</span>
                            <span className="text-[8px] text-slate-500 truncate block">{fNode.documentTypeName}</span>
                          </div>
                          <ArrowRight size={10} className="text-slate-400 shrink-0 ml-1" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Primary Action Button */}
              <div className="pt-3">
                <button
                  onClick={() => handleOpenOriginalScreen(currentDoc)}
                  className="w-full py-2 bg-gradient-to-b from-[#0056b3] to-[#00386b] hover:from-[#004494] hover:to-[#002850] text-white rounded-[2px] font-bold text-[10px] flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm transition-all"
                >
                  <ExternalLink size={12} />
                  <span>Drill Down into {currentDoc.documentTypeName}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
