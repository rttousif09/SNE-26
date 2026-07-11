import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, FileText, Download, Printer, Settings, Eye, Check, RefreshCw, 
  ChevronLeft, ChevronRight, Minimize2, Maximize2, Sparkles, Layout, Info
} from 'lucide-react';
import { 
  exportToPDFEnterprise, 
  exportToExcelEnterprise, 
  EnterpriseReportOptions, 
  ReportSummaryBlock 
} from '../lib/reportEngine';
import { useAppContext } from '../store';

interface ReportPreviewModalProps {
  title: string;
  subtitle?: string;
  projectName?: string;
  clientName?: string;
  dateRange?: string;
  headers: string[];
  data: (string | number)[][];
  columnAlignments?: ('left' | 'center' | 'right')[];
  totals?: (string | number)[];
  summaryBlocks?: ReportSummaryBlock[];
  isOpen: boolean;
  onClose: () => void;
  filename?: string;
}

export const ReportPreviewModal: React.FC<ReportPreviewModalProps> = ({
  title, subtitle, projectName, clientName, dateRange, headers, data,
  columnAlignments, totals, summaryBlocks, isOpen, onClose, filename = 'Enterprise_Report'
}) => {
  const { user } = useAppContext();
  
  // Layout Options State
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(
    headers.length > 7 ? 'landscape' : 'portrait'
  );
  const [paperSize, setPaperSize] = useState<'a4' | 'letter'>('a4');
  const [marginSize, setMarginSize] = useState<'compact' | 'normal' | 'wide'>('normal');
  const [useWatermark, setUseWatermark] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Generate PDF bloburl when options change
  const handleGeneratePreview = () => {
    setIsGenerating(true);
    try {
      const options: EnterpriseReportOptions = {
        title,
        subtitle,
        projectName,
        clientName,
        dateRange,
        headers,
        data,
        columnAlignments,
        totals,
        summaryBlocks,
        userName: user?.name || user?.username || 'Admin',
        watermark: useWatermark,
        orientation,
        paperSize,
        marginSize
      };

      const blobUrl = exportToPDFEnterprise(options);
      setPreviewUrl(blobUrl);
    } catch (err) {
      console.error("Error generating report PDF preview: ", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Trigger preview generation on initial open or option change
  useEffect(() => {
    if (isOpen) {
      handleGeneratePreview();
    }
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [isOpen, orientation, paperSize, marginSize, useWatermark]);

  const handleDownloadPDF = () => {
    if (previewUrl) {
      const link = document.createElement('a');
      link.href = previewUrl;
      link.download = `${filename.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
      link.click();
    }
  };

  const handleExportExcel = () => {
    const options: EnterpriseReportOptions = {
      title,
      subtitle,
      projectName,
      clientName,
      dateRange,
      headers,
      data,
      columnAlignments,
      totals,
      summaryBlocks,
      userName: user?.name || user?.username || 'Admin',
      orientation,
      paperSize
    };
    exportToExcelEnterprise(options, filename);
  };

  const handlePrint = () => {
    if (previewUrl) {
      const printWindow = window.open(previewUrl, '_blank');
      printWindow?.addEventListener('load', () => {
        printWindow.print();
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 15 }}
        className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden text-[11px]"
      >
        {/* Header toolbar */}
        <div className="flex items-center justify-between p-3.5 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
              <FileText size={14} className="animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-[12px] uppercase tracking-wider flex items-center gap-1.5">
                SAP-Style Enterprise Report Engine
                <span className="text-[9px] font-normal px-1.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">v4.5 PRD</span>
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">Audit-Ready Ledger & Statement Compiler</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-lg transition"
            title="Close Preview Screen"
          >
            <X size={16} />
          </button>
        </div>

        {/* Workspace body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-950">
          
          {/* Left panel: Control settings */}
          <div className="w-full md:w-72 border-r border-slate-800 p-4 space-y-4 overflow-y-auto shrink-0 bg-slate-900/40">
            
            {/* Document Attributes Summary */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 space-y-2">
              <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Info size={10} className="text-blue-400" /> Report Registry Details
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Title:</span>
                  <span className="text-slate-200 font-bold truncate max-w-[140px]" title={title}>{title}</span>
                </div>
                {projectName && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Project:</span>
                    <span className="text-slate-200 font-bold truncate max-w-[140px]">{projectName}</span>
                  </div>
                )}
                {clientName && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Client:</span>
                    <span className="text-slate-200 font-semibold truncate max-w-[140px]">{clientName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Dataset Rows:</span>
                  <span className="text-slate-200 font-bold">{data.length} records</span>
                </div>
              </div>
            </div>

            {/* Print Settings block */}
            <div className="space-y-3">
              <div className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1 border-b border-slate-800 pb-1.5">
                <Settings size={11} className="text-blue-400" /> Layout & Print Setup
              </div>

              {/* Page orientation */}
              <div className="space-y-1">
                <label className="text-slate-400 font-bold text-[9px] uppercase tracking-wide">Orientation</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setOrientation('portrait')}
                    className={`p-2 rounded-md border text-center transition flex flex-col items-center gap-1 ${
                      orientation === 'portrait'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-400 font-bold'
                        : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="w-5 h-6 bg-current/10 border border-current rounded-xs shrink-0" />
                    <span>Portrait</span>
                  </button>
                  <button
                    onClick={() => setOrientation('landscape')}
                    className={`p-2 rounded-md border text-center transition flex flex-col items-center gap-1 ${
                      orientation === 'landscape'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-400 font-bold'
                        : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="w-6 h-5 bg-current/10 border border-current rounded-xs shrink-0" />
                    <span>Landscape</span>
                  </button>
                </div>
              </div>

              {/* Paper size */}
              <div className="space-y-1">
                <label className="text-slate-400 font-bold text-[9px] uppercase tracking-wide">Paper Size</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setPaperSize('a4')}
                    className={`py-1.5 px-2 rounded border text-center transition font-semibold ${
                      paperSize === 'a4'
                        ? 'bg-slate-800 border-blue-500 text-blue-400 font-bold'
                        : 'border-slate-800 bg-slate-900/40 hover:bg-slate-850 text-slate-400'
                    }`}
                  >
                    A4 (ISO 210x297)
                  </button>
                  <button
                    onClick={() => setPaperSize('letter')}
                    className={`py-1.5 px-2 rounded border text-center transition font-semibold ${
                      paperSize === 'letter'
                        ? 'bg-slate-800 border-blue-500 text-blue-400 font-bold'
                        : 'border-slate-800 bg-slate-900/40 hover:bg-slate-850 text-slate-400'
                    }`}
                  >
                    Letter (8.5" x 11")
                  </button>
                </div>
              </div>

              {/* Margin sizes */}
              <div className="space-y-1">
                <label className="text-slate-400 font-bold text-[9px] uppercase tracking-wide">Page Margins</label>
                <div className="grid grid-cols-3 gap-1">
                  {(['compact', 'normal', 'wide'] as const).map(size => (
                    <button
                      key={size}
                      onClick={() => setMarginSize(size)}
                      className={`py-1.5 rounded border text-center capitalize transition font-semibold ${
                        marginSize === size
                          ? 'bg-slate-800 border-blue-500 text-blue-400 font-bold'
                          : 'border-slate-800 bg-slate-900/40 hover:bg-slate-850 text-slate-400'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Confidentiality Watermark */}
              <label className="flex items-center gap-2 p-2 bg-slate-900/50 border border-slate-800 rounded-lg cursor-pointer hover:bg-slate-800/50 transition">
                <input
                  type="checkbox"
                  checked={useWatermark}
                  onChange={e => setUseWatermark(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex flex-col">
                  <span className="text-slate-200 font-bold">Add Confidential Watermark</span>
                  <span className="text-[9px] text-slate-500 font-medium">Adds diagonal background lettering</span>
                </div>
              </label>

            </div>

            {/* Compile Actions block */}
            <div className="pt-2 space-y-2">
              <div className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1 border-b border-slate-800 pb-1.5">
                <Sparkles size={11} className="text-emerald-400" /> Distribute & Export
              </div>

              <button
                onClick={handlePrint}
                className="w-full bg-blue-600 hover:bg-blue-500 text-slate-100 font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2 shadow-lg transition active:scale-95 text-[11px] uppercase tracking-wider"
              >
                <Printer size={13} /> Print Document
              </button>

              <button
                onClick={handleDownloadPDF}
                className="w-full bg-slate-800 hover:bg-slate-700 text-rose-400 font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2 border border-slate-750 transition text-[11px] uppercase tracking-wider"
              >
                <FileText size={13} /> Export PDF
              </button>

              <button
                onClick={handleExportExcel}
                className="w-full bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2 border border-slate-750 transition text-[11px] uppercase tracking-wider"
              >
                <Download size={13} /> Export Excel (XLSX)
              </button>
            </div>

          </div>

          {/* Right panel: Active Preview Frame */}
          <div className="flex-1 bg-slate-950 p-4 flex flex-col items-center justify-center relative">
            
            {/* Generating Loader */}
            {isGenerating && (
              <div className="absolute inset-0 bg-slate-950/80 z-20 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="animate-spin text-blue-500" size={24} />
                <span className="text-slate-300 font-bold tracking-wide uppercase">Compiling report layout...</span>
              </div>
            )}

            {/* PDF Live View Frame */}
            {previewUrl ? (
              <div className="w-full h-full border border-slate-800 rounded-lg overflow-hidden bg-slate-900 shadow-inner flex flex-col">
                <div className="bg-slate-900 p-2 border-b border-slate-800 flex justify-between items-center px-4">
                  <div className="flex items-center gap-2 text-slate-400 font-medium">
                    <Eye size={12} className="text-emerald-400" />
                    <span>Real-Time WYSIWYG Print Preview</span>
                  </div>
                  <div className="text-slate-500 text-[10px]">
                    Note: If iframe is blocked, use direct buttons to Print/Save
                  </div>
                </div>
                <div className="flex-1 bg-slate-850 p-2">
                  <iframe 
                    src={`${previewUrl}#toolbar=0&navpanes=0&view=FitH`} 
                    className="w-full h-full border-0 rounded bg-white" 
                    title="Enterprise Report Preview" 
                  />
                </div>
              </div>
            ) : (
              <div className="text-slate-400 text-center space-y-2">
                <RefreshCw className="animate-spin mx-auto text-slate-500" size={20} />
                <p className="font-bold">Awaiting Document compilation...</p>
              </div>
            )}

          </div>

        </div>
      </motion.div>
    </div>
  );
};
