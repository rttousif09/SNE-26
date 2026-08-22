import React from 'react';
import { DocFlowNode, DocFlowStatus } from '../types';
import { 
  FileText, Building, CreditCard, Users, Layers, TrendingDown, 
  Package, Server, CheckCircle2, Clock, AlertTriangle, XCircle, 
  ArrowRight, Eye, ExternalLink, ArrowLeftRight, ShieldCheck, Shield
} from 'lucide-react';

interface DocumentFlowNodeCardProps {
  node: DocFlowNode;
  isCurrent?: boolean;
  onSelectNode: (node: DocFlowNode) => void;
  onOpenOriginalScreen: (node: DocFlowNode) => void;
  viewMode?: 'compact' | 'standard' | 'detailed';
}

export const DocumentFlowNodeCard: React.FC<DocumentFlowNodeCardProps> = ({
  node,
  isCurrent = false,
  onSelectNode,
  onOpenOriginalScreen,
  viewMode = 'standard'
}) => {
  const getCategoryIcon = (category: string, type: string) => {
    switch (type) {
      case 'PROJECT': return <Building size={14} className="text-blue-700" />;
      case 'BOQ': return <FileText size={14} className="text-indigo-700" />;
      case 'FLOOR_ABSTRACT':
      case 'CLIENT_FLOOR_BILL': return <Layers size={14} className="text-teal-700" />;
      case 'BILLING': return <FileText size={14} className="text-green-700 font-bold" />;
      case 'CLIENT_PAYMENT': return <CreditCard size={14} className="text-emerald-700" />;
      case 'WORKER':
      case 'WORKER_PAYMENT':
      case 'DLR': return <Users size={14} className="text-purple-700" />;
      case 'SUBCONTRACTOR':
      case 'SUBCONTRACTOR_BILL':
      case 'SUBCONTRACTOR_PAYMENT': return <ArrowLeftRight size={14} className="text-cyan-700" />;
      case 'EXPENSE':
      case 'MESS_BOOKING': return <TrendingDown size={14} className="text-rose-700" />;
      case 'MATERIAL_PURCHASE':
      case 'MATERIAL_ISSUE': return <Package size={14} className="text-amber-700" />;
      case 'ASSET': return <Server size={14} className="text-slate-700" />;
      default: return <FileText size={14} className="text-blue-600" />;
    }
  };

  const getStatusBadge = (status: DocFlowStatus, color: string) => {
    let bg = 'bg-slate-100 text-slate-700 border-slate-300';
    let icon = <Clock size={10} className="mr-1" />;

    if (color === 'green') {
      bg = 'bg-green-50 text-green-800 border-green-300';
      icon = <CheckCircle2 size={10} className="mr-1 text-green-600" />;
    } else if (color === 'blue') {
      bg = 'bg-blue-50 text-blue-800 border-blue-300';
      icon = <Clock size={10} className="mr-1 text-blue-600" />;
    } else if (color === 'amber') {
      bg = 'bg-amber-50 text-amber-900 border-amber-300';
      icon = <Clock size={10} className="mr-1 text-amber-600" />;
    } else if (color === 'red') {
      bg = 'bg-red-50 text-red-800 border-red-300';
      icon = <XCircle size={10} className="mr-1 text-red-600" />;
    } else if (color === 'purple') {
      bg = 'bg-purple-50 text-purple-800 border-purple-300';
      icon = <ShieldCheck size={10} className="mr-1 text-purple-600" />;
    }

    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-[2px] text-[9px] font-bold border ${bg}`}>
        {icon}
        {status}
      </span>
    );
  };

  return (
    <div
      onClick={() => onSelectNode(node)}
      className={`relative group rounded-[3px] border transition-all duration-150 cursor-pointer shadow-xs select-none ${
        isCurrent
          ? 'bg-gradient-to-b from-[#ffffff] to-[#e6f0fa] border-[#0056b3] ring-2 ring-[#0056b3]/30 shadow-md scale-[1.02] z-20'
          : 'bg-white hover:bg-[#f8fafc] border-[#8c9ba8] hover:border-[#0056b3]'
      } ${viewMode === 'compact' ? 'p-2' : 'p-2.5'}`}
      style={{ minWidth: viewMode === 'compact' ? '180px' : '230px', maxWidth: '300px' }}
    >
      {/* Active Document Indicator Ribbon */}
      {isCurrent && (
        <div className="absolute -top-2 left-2 bg-[#0056b3] text-white text-[8px] font-bold font-mono px-1.5 py-0.2 rounded-[2px] shadow-sm uppercase tracking-wider flex items-center space-x-1">
          <span>Active Focus</span>
        </div>
      )}

      {/* Top Header: Doc No + Category */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center space-x-1.5 min-w-0">
          <div className="p-1 rounded bg-[#eef2f6] border border-[#cbd5e1] shrink-0">
            {getCategoryIcon(node.category, node.documentType)}
          </div>
          <div className="truncate">
            <span className="font-mono font-bold text-[10px] text-[#0056b3] block truncate" title={node.documentNumber}>
              {node.documentNumber}
            </span>
            <span className="text-[9px] text-slate-500 font-semibold block truncate">
              {node.documentTypeName}
            </span>
          </div>
        </div>
        <div className="shrink-0 ml-1">
          {getStatusBadge(node.status, node.statusColor)}
        </div>
      </div>

      {/* Title & Subtitle */}
      <div className="border-t border-slate-100 pt-1.5 pb-1">
        <p className="font-semibold text-[10px] text-slate-900 line-clamp-1" title={node.title}>
          {node.title}
        </p>
        {node.subtitle && (
          <p className="text-[9px] text-slate-500 line-clamp-1 mt-0.5" title={node.subtitle}>
            {node.subtitle}
          </p>
        )}
      </div>

      {/* Numerical Values (Amount / Qty) & Date */}
      <div className="flex items-center justify-between mt-1 bg-slate-50 p-1 rounded-[2px] border border-slate-200 text-[9px]">
        <div>
          <span className="text-slate-400 text-[8px] uppercase block">Date</span>
          <span className="font-mono font-medium text-slate-700">{node.date}</span>
        </div>
        {(node.amount !== undefined && node.amount > 0) && (
          <div className="text-right">
            <span className="text-slate-400 text-[8px] uppercase block">Amount</span>
            <span className="font-mono font-bold text-slate-900">₹{node.amount.toLocaleString('en-IN')}</span>
          </div>
        )}
        {(node.quantity !== undefined && (!node.amount || node.amount === 0)) && (
          <div className="text-right">
            <span className="text-slate-400 text-[8px] uppercase block">Quantity</span>
            <span className="font-mono font-bold text-slate-800">{node.quantity} {node.unit || ''}</span>
          </div>
        )}
      </div>

      {/* Audit Info Footer */}
      {viewMode !== 'compact' && (
        <div className="mt-1.5 pt-1 border-t border-dashed border-slate-200 flex items-center justify-between text-[8px] text-slate-400">
          <span className="truncate max-w-[120px]" title={node.audit.createdBy || 'System'}>
            By: {node.audit.createdBy || 'System'}
          </span>
          {node.audit.approvedBy && (
            <span className="text-green-700 font-semibold truncate max-w-[100px]" title={`Approved by ${node.audit.approvedBy}`}>
              ✓ Appv: {node.audit.approvedBy}
            </span>
          )}
        </div>
      )}

      {/* Action Hover Controls */}
      <div className="mt-1.5 pt-1 flex items-center justify-between border-t border-slate-100">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelectNode(node);
          }}
          className="text-[9px] text-[#0056b3] hover:underline font-semibold flex items-center space-x-0.5 cursor-pointer"
        >
          <Eye size={10} />
          <span>Flow Tree</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenOriginalScreen(node);
          }}
          className="px-1.5 py-0.5 bg-gradient-to-b from-[#f7fafc] to-[#e2e8f0] hover:bg-[#cce8ff] hover:border-[#0056b3] text-[#00386b] border border-[#cbd5e1] rounded-[2px] text-[8px] font-bold flex items-center space-x-1 cursor-pointer shadow-2xs transition-colors"
          title={`Open original transaction: ${node.documentTypeName}`}
        >
          <span>Open Module</span>
          <ExternalLink size={8} />
        </button>
      </div>
    </div>
  );
};
