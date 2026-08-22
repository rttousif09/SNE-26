import React from 'react';
import { DocFlowNode } from '../types';
import { DocumentFlowViewer } from './DocumentFlowViewer';
import { useAppContext } from '../store';
import { buildAllDocumentNodes } from '../lib/documentFlowEngine';
import { X, Maximize2, Minimize2 } from 'lucide-react';

interface DocumentFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentIdOrNo?: string;
  onNavigateToTab?: (tab: string, title?: string, props?: any) => void;
}

export const DocumentFlowModal: React.FC<DocumentFlowModalProps> = ({
  isOpen,
  onClose,
  documentIdOrNo,
  onNavigateToTab
}) => {
  const erpState = useAppContext();
  const [isFullScreen, setIsFullScreen] = React.useState(false);

  // Compute all document nodes from live global store
  const allNodes = React.useMemo(() => {
    return buildAllDocumentNodes(erpState);
  }, [erpState]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div 
        className={`bg-white rounded-[3px] border border-[#0056b3] shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isFullScreen ? 'w-full h-full' : 'w-full max-w-6xl h-[90vh]'
        }`}
      >
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-[#00386b] via-[#0056b3] to-[#00386b] text-white px-3 py-2 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center space-x-2">
            <span className="font-mono font-bold text-[11px] bg-white/20 px-1.5 py-0.5 rounded-[2px]">
              SAP Business Flow Engine
            </span>
            <span className="text-[12px] font-semibold">
              Traceability Chain & Audit Inspector
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10 cursor-pointer"
              title={isFullScreen ? 'Restore Size' : 'Maximize Window'}
            >
              {isFullScreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10 cursor-pointer"
              title="Close Document Flow (Esc)"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden">
          <DocumentFlowViewer
            initialDocumentIdOrNo={documentIdOrNo}
            allNodes={allNodes}
            onNavigateToTab={onNavigateToTab}
            onClose={onClose}
            user={erpState.user}
          />
        </div>
      </div>
    </div>
  );
};
