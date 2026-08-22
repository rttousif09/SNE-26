import React from 'react';
import { DocFlowNode } from '../types';
import { useAppContext } from '../store';
import { buildAllDocumentNodes, resolveDocumentChain } from '../lib/documentFlowEngine';
import { GitFork, ArrowRight, ArrowLeft, ExternalLink, ShieldCheck, Eye } from 'lucide-react';

interface RelatedDocumentsSectionProps {
  documentIdOrNo: string;
  title?: string;
  onOpenFlowModal?: (docId: string) => void;
  onOpenViewer?: (docId: string) => void;
  onNavigateToTab?: (tab: string, title?: string, props?: any) => void;
  className?: string;
}

export const RelatedDocumentsSection: React.FC<RelatedDocumentsSectionProps> = ({
  documentIdOrNo,
  title,
  onOpenFlowModal,
  onOpenViewer,
  onNavigateToTab,
  className = ''
}) => {
  const erpState = useAppContext();

  const allNodes = React.useMemo(() => {
    return buildAllDocumentNodes(erpState);
  }, [erpState]);

  const chain = React.useMemo(() => {
    return resolveDocumentChain(documentIdOrNo, allNodes);
  }, [documentIdOrNo, allNodes]);

  if (!chain || !chain.currentDoc) {
    return null;
  }

  const { currentDoc, precedingDocs, followUpDocs } = chain;

  const handleOpenDoc = (node: DocFlowNode) => {
    if (onNavigateToTab) {
      onNavigateToTab(node.targetTab, node.title, node.targetProps);
    } else if ((window as any).openWorkspaceTab) {
      (window as any).openWorkspaceTab(node.targetTab, node.title, node.targetProps);
    }
  };

  const handleOpenFlow = () => {
    if (onOpenViewer) {
      onOpenViewer(currentDoc.id);
    } else if (onOpenFlowModal) {
      onOpenFlowModal(currentDoc.id);
    } else if ((window as any).openDocumentFlow) {
      (window as any).openDocumentFlow(currentDoc.id);
    }
  };

  return (
    <div className={`bg-gradient-to-b from-[#f8fafc] to-[#eef2f6] border border-[#8c9ba8] rounded-[3px] p-2.5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-300 mb-2">
        <div className="flex items-center space-x-1.5">
          <GitFork size={13} className="text-[#0056b3]" />
          <span className="font-bold text-[10px] text-[#00386b] uppercase tracking-wide">
            {title || 'SAP Connected Business Flow'}
          </span>
          <span className="font-mono text-[9px] bg-blue-100 text-[#0056b3] px-1 py-0.2 rounded font-bold">
            {currentDoc.documentNumber}
          </span>
        </div>

        <button
          type="button"
          onClick={handleOpenFlow}
          className="px-2 py-0.5 bg-[#0056b3] hover:bg-[#00386b] text-white rounded-[2px] text-[8px] font-bold flex items-center space-x-1 cursor-pointer shadow-2xs transition-colors"
          title="Open interactive Document Flow chain"
        >
          <Eye size={9} />
          <span>Interactive Flow</span>
        </button>
      </div>

      {/* Preceding & Follow-Up Mini Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[9px]">
        {/* Preceding Documents */}
        <div className="bg-white p-2 rounded border border-slate-200">
          <div className="flex items-center space-x-1 text-slate-500 font-bold uppercase text-[8px] mb-1">
            <ArrowLeft size={9} />
            <span>Preceding Source Documents ({precedingDocs.length})</span>
          </div>

          {precedingDocs.length === 0 ? (
            <p className="text-slate-400 italic text-[8px]">Originating root document (no upstream links)</p>
          ) : (
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {precedingDocs.map(pNode => (
                <div 
                  key={pNode.id}
                  onClick={() => handleOpenDoc(pNode)}
                  className="p-1 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-[2px] flex items-center justify-between cursor-pointer group"
                >
                  <div className="min-w-0 truncate">
                    <span className="font-mono font-bold text-[8px] text-[#0056b3] block truncate">{pNode.documentNumber}</span>
                    <span className="text-[8px] text-slate-600 truncate block">{pNode.title}</span>
                  </div>
                  <ExternalLink size={9} className="text-slate-400 group-hover:text-blue-600 shrink-0 ml-1" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Follow-Up Documents */}
        <div className="bg-white p-2 rounded border border-slate-200">
          <div className="flex items-center space-x-1 text-slate-500 font-bold uppercase text-[8px] mb-1">
            <span>Follow-Up Created Documents ({followUpDocs.length})</span>
            <ArrowRight size={9} />
          </div>

          {followUpDocs.length === 0 ? (
            <p className="text-slate-400 italic text-[8px]">No downstream transactions posted yet</p>
          ) : (
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {followUpDocs.map(fNode => (
                <div 
                  key={fNode.id}
                  onClick={() => handleOpenDoc(fNode)}
                  className="p-1 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-[2px] flex items-center justify-between cursor-pointer group"
                >
                  <div className="min-w-0 truncate">
                    <span className="font-mono font-bold text-[8px] text-[#0056b3] block truncate">{fNode.documentNumber}</span>
                    <span className="text-[8px] text-slate-600 truncate block">{fNode.title}</span>
                  </div>
                  <ExternalLink size={9} className="text-slate-400 group-hover:text-blue-600 shrink-0 ml-1" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
