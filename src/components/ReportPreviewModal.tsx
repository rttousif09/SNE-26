import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  FileText,
  Download,
  Printer,
  Settings,
  Eye,
  Check,
  RefreshCw,
  Sparkles,
  Layout,
  Info,
  Shield,
  Layers,
  FileSpreadsheet,
  Maximize2,
  Minimize2,
  Sliders,
  CheckSquare,
  Square,
  ChevronDown,
} from 'lucide-react';
import {
  exportToPDFEnterprise,
  exportToExcelEnterprise,
  printReportBlob,
  downloadReportPDF,
  generateReportFilename,
  EnterpriseReportDefinition,
  ReportSummaryBlock,
  ReportColumnConfig,
  ReportOrientation,
  ReportPaperSize,
  ReportDensity,
} from '../lib/exportEngine';
import { useAppContext } from '../store';

export interface ReportPreviewModalProps {
  title: string;
  subtitle?: string;
  tcode?: string;
  reportNo?: string;
  projectName?: string;
  projectCode?: string;
  clientName?: string;
  financialYear?: string;
  dateRange?: string;
  appliedFilters?: { label: string; value: string }[];
  headers: (string | ReportColumnConfig)[];
  data: (string | number | boolean | null | undefined)[][];
  columnAlignments?: ('left' | 'center' | 'right')[];
  totals?: (string | number | null | undefined)[];
  summaryBlocks?: ReportSummaryBlock[];
  signatures?: { title: string; subtitle?: string; name?: string }[];
  notes?: string[];
  customSheets?: {
    sheetName: string;
    headers: string[];
    data: (string | number)[][];
    totals?: (string | number)[];
  }[];
  isOpen: boolean;
  onClose: () => void;
  filename?: string;
}

export const ReportPreviewModal: React.FC<ReportPreviewModalProps> = ({
  title,
  subtitle,
  tcode,
  reportNo,
  projectName,
  projectCode,
  clientName,
  financialYear,
  dateRange,
  appliedFilters,
  headers,
  data,
  totals,
  summaryBlocks,
  signatures,
  notes,
  customSheets,
  isOpen,
  onClose,
  filename = 'Enterprise_Report',
}) => {
  const { user } = useAppContext();

  // Active View Tab: PDF Preview vs Excel Data Grid
  const [activeTab, setActiveTab] = useState<'pdf' | 'excel'>('pdf');

  // Print & Layout Settings State
  const initialOrientation: ReportOrientation = useMemo(() => {
    return headers.length > 6 ? 'landscape' : 'portrait';
  }, [headers.length]);

  const [orientation, setOrientation] = useState<ReportOrientation>(initialOrientation);
  const [paperSize, setPaperSize] = useState<ReportPaperSize>('a4');
  const [density, setDensity] = useState<ReportDensity>('standard');
  const [showHeader, setShowHeader] = useState<boolean>(true);
  const [showFooter, setShowFooter] = useState<boolean>(true);
  const [showPageNumbers, setShowPageNumbers] = useState<boolean>(true);
  const [useWatermark, setUseWatermark] = useState<boolean>(false);
  const [watermarkText, setWatermarkText] = useState<string>('SN ENTERPRISES CONFIDENTIAL');

  // Preview Blob State
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  // Compile full report definition object
  const reportDefinition: EnterpriseReportDefinition = useMemo(() => {
    return {
      title,
      subtitle,
      tcode,
      reportNo,
      projectName,
      projectCode,
      clientName,
      financialYear,
      dateRange,
      appliedFilters,
      headers,
      data,
      totals,
      summaryBlocks,
      signatures,
      notes,
      customSheets,
      userName: user?.name || user?.username || 'Executive',
      orientation,
      paperSize,
      density,
      showHeader,
      showFooter,
      showPageNumbers,
      watermark: useWatermark ? watermarkText : false,
      filename,
    };
  }, [
    title,
    subtitle,
    tcode,
    reportNo,
    projectName,
    projectCode,
    clientName,
    financialYear,
    dateRange,
    appliedFilters,
    headers,
    data,
    totals,
    summaryBlocks,
    signatures,
    notes,
    customSheets,
    user,
    orientation,
    paperSize,
    density,
    showHeader,
    showFooter,
    showPageNumbers,
    useWatermark,
    watermarkText,
    filename,
  ]);

  // Generate preview blob when reportDefinition updates
  const generatePreview = () => {
    setIsGenerating(true);
    try {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      const newBlobUrl = exportToPDFEnterprise(reportDefinition);
      setPreviewUrl(newBlobUrl);
    } catch (err) {
      console.error('Failed to generate report PDF preview:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      generatePreview();
    }
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [
    isOpen,
    orientation,
    paperSize,
    density,
    showHeader,
    showFooter,
    showPageNumbers,
    useWatermark,
    watermarkText,
  ]);

  // Action Handlers
  const handlePrint = () => {
    if (previewUrl) {
      printReportBlob(previewUrl);
    } else {
      const directBlobUrl = exportToPDFEnterprise(reportDefinition);
      printReportBlob(directBlobUrl);
    }
  };

  const handleDownloadPDF = () => {
    if (previewUrl) {
      downloadReportPDF(previewUrl, title, projectName, `${filename.replace(/\.pdf$/i, '')}.pdf`);
    } else {
      const directBlobUrl = exportToPDFEnterprise(reportDefinition);
      downloadReportPDF(directBlobUrl, title, projectName, `${filename.replace(/\.pdf$/i, '')}.pdf`);
    }
  };

  const handleExportExcel = () => {
    exportToExcelEnterprise(reportDefinition, generateReportFilename(title, projectName, 'xlsx'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4 backdrop-blur-xs font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 10 }}
        className={`bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full flex flex-col overflow-hidden text-[11px] transition-all duration-200 ${
          isFullScreen ? 'h-[98vh] max-w-[99vw]' : 'h-[92vh] max-w-7xl'
        }`}
      >
        {/* Top Header Navigation Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-950 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-inner">
              <FileText size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-100 text-xs tracking-wider uppercase">
                  SN ENTERPRISES &bull; REPORT EXPORT ENGINE
                </h3>
                {tcode && (
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded">
                    T-CODE: {tcode}
                  </span>
                )}
                <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
                  PRD ENTERPRISE
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                Standardized Multi-Module PDF, Excel & Print Generation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex bg-slate-800/80 p-0.5 rounded-lg border border-slate-700">
              <button
                onClick={() => setActiveTab('pdf')}
                className={`px-3 py-1 rounded-md font-bold text-[10px] uppercase flex items-center gap-1.5 transition ${
                  activeTab === 'pdf'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye size={12} /> PDF Preview
              </button>
              <button
                onClick={() => setActiveTab('excel')}
                className={`px-3 py-1 rounded-md font-bold text-[10px] uppercase flex items-center gap-1.5 transition ${
                  activeTab === 'excel'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileSpreadsheet size={12} /> Data Table ({data.length})
              </button>
            </div>

            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-lg transition"
              title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
            >
              {isFullScreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition cursor-pointer"
              title="Close Preview Screen"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Workspace Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-950">
          {/* Left Control Sidebar */}
          <div className="w-full md:w-80 border-r border-slate-800 p-4 space-y-4 overflow-y-auto shrink-0 bg-slate-900/50">
            {/* Quick Report Metadata Info */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 space-y-2">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between border-b border-slate-800 pb-1">
                <span className="flex items-center gap-1">
                  <Info size={11} className="text-blue-400" /> Report Specification
                </span>
                <span className="text-blue-400 font-mono">{data.length} Rows</span>
              </div>
              <div className="space-y-1.5 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Title:</span>
                  <span className="text-slate-200 font-bold truncate max-w-[170px]" title={title}>
                    {title}
                  </span>
                </div>
                {projectName && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Project:</span>
                    <span className="text-slate-200 font-semibold truncate max-w-[170px]">
                      {projectName}
                    </span>
                  </div>
                )}
                {clientName && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Client:</span>
                    <span className="text-slate-200 font-medium truncate max-w-[170px]">
                      {clientName}
                    </span>
                  </div>
                )}
                {(dateRange || financialYear) && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Period / FY:</span>
                    <span className="text-slate-200 font-mono">
                      {dateRange || financialYear}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Layout, Formatting & Print Settings */}
            <div className="space-y-3">
              <div className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1 border-b border-slate-800 pb-1.5">
                <Sliders size={12} className="text-blue-400" /> Page & Layout Controls
              </div>

              {/* Orientation */}
              <div className="space-y-1">
                <label className="text-slate-400 font-bold text-[9px] uppercase tracking-wide">
                  Orientation
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setOrientation('portrait')}
                    className={`p-2 rounded-md border text-center transition flex flex-col items-center gap-1 ${
                      orientation === 'portrait'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-400 font-bold'
                        : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="w-5 h-6 bg-current/10 border border-current rounded-xs shrink-0" />
                    <span>Portrait (A4)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrientation('landscape')}
                    className={`p-2 rounded-md border text-center transition flex flex-col items-center gap-1 ${
                      orientation === 'landscape'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-400 font-bold'
                        : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="w-6 h-5 bg-current/10 border border-current rounded-xs shrink-0" />
                    <span>Landscape (A4)</span>
                  </button>
                </div>
              </div>

              {/* Paper Size & Density */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold text-[9px] uppercase tracking-wide">
                    Paper Size
                  </label>
                  <select
                    value={paperSize}
                    onChange={e => setPaperSize(e.target.value as ReportPaperSize)}
                    className="w-full bg-slate-900 border border-slate-750 rounded p-1.5 text-slate-200 font-medium focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="a4">A4 (210 × 297 mm)</option>
                    <option value="a3">A3 (297 × 420 mm)</option>
                    <option value="letter">Letter (8.5 × 11 in)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-bold text-[9px] uppercase tracking-wide">
                    Density / Scale
                  </label>
                  <select
                    value={density}
                    onChange={e => setDensity(e.target.value as ReportDensity)}
                    className="w-full bg-slate-900 border border-slate-750 rounded p-1.5 text-slate-200 font-medium focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="compact">Compact (High Density)</option>
                    <option value="standard">Standard (Balanced)</option>
                    <option value="comfortable">Comfortable (Spacious)</option>
                  </select>
                </div>
              </div>

              {/* Section Visibility Toggles */}
              <div className="space-y-1.5 pt-1">
                <label className="text-slate-400 font-bold text-[9px] uppercase tracking-wide">
                  Visual Elements
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowHeader(!showHeader)}
                    className={`py-1.5 px-2 rounded border text-left flex items-center justify-between text-[10px] transition ${
                      showHeader
                        ? 'border-blue-500/50 bg-blue-500/10 text-blue-300 font-bold'
                        : 'border-slate-800 bg-slate-900/40 text-slate-500'
                    }`}
                  >
                    <span>Company Header</span>
                    {showHeader ? <CheckSquare size={12} /> : <Square size={12} />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowFooter(!showFooter)}
                    className={`py-1.5 px-2 rounded border text-left flex items-center justify-between text-[10px] transition ${
                      showFooter
                        ? 'border-blue-500/50 bg-blue-500/10 text-blue-300 font-bold'
                        : 'border-slate-800 bg-slate-900/40 text-slate-500'
                    }`}
                  >
                    <span>Footer / Audit</span>
                    {showFooter ? <CheckSquare size={12} /> : <Square size={12} />}
                  </button>
                </div>
              </div>

              {/* Watermark Toggle */}
              <div className="space-y-1.5 bg-slate-900/50 border border-slate-800 rounded-lg p-2.5">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-1.5 text-slate-300 font-bold">
                    <Shield size={12} className="text-amber-400" />
                    <span>Confidential Watermark</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={useWatermark}
                    onChange={e => setUseWatermark(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500"
                  />
                </label>
                {useWatermark && (
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={e => setWatermarkText(e.target.value)}
                    placeholder="Watermark Text..."
                    className="w-full bg-slate-950 border border-slate-750 rounded px-2 py-1 text-slate-200 text-[10px] mt-1"
                  />
                )}
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="pt-2 space-y-2 border-t border-slate-800">
              <button
                type="button"
                onClick={handlePrint}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition active:scale-98 uppercase tracking-wider text-[11px] cursor-pointer"
              >
                <Printer size={14} /> Print Document
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  className="bg-slate-800 hover:bg-slate-700 text-rose-400 font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 border border-slate-700 transition active:scale-98 uppercase tracking-wider text-[10px] cursor-pointer"
                >
                  <FileText size={12} /> Save PDF
                </button>

                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 border border-slate-700 transition active:scale-98 uppercase tracking-wider text-[10px] cursor-pointer"
                >
                  <Download size={12} /> Excel (.xlsx)
                </button>
              </div>
            </div>
          </div>

          {/* Right Main Content Area */}
          <div className="flex-1 bg-slate-950 p-3 sm:p-4 flex flex-col relative overflow-hidden">
            {/* Loading Indicator */}
            {isGenerating && (
              <div className="absolute inset-0 bg-slate-950/80 z-30 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="animate-spin text-blue-500" size={28} />
                <span className="text-slate-200 font-bold uppercase tracking-widest text-xs">
                  Compiling High-Precision Vector Report...
                </span>
              </div>
            )}

            {activeTab === 'pdf' ? (
              // PDF Preview View
              previewUrl ? (
                <div className="w-full h-full border border-slate-800 rounded-lg overflow-hidden bg-slate-900 flex flex-col shadow-2xl">
                  <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex justify-between items-center text-slate-400">
                    <div className="flex items-center gap-2 font-medium">
                      <Eye size={13} className="text-emerald-400" />
                      <span>WYSIWYG Live Print Preview</span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Standard A4/A3 Vector Layout Engine
                    </div>
                  </div>
                  <div className="flex-1 bg-slate-850 p-2 overflow-hidden">
                    <iframe
                      src={`${previewUrl}#toolbar=0&navpanes=0&view=FitH`}
                      className="w-full h-full border-0 rounded bg-white"
                      title="Enterprise Report Preview"
                    />
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-2">
                  <RefreshCw className="animate-spin" size={24} />
                  <p className="font-bold">Rendering Document Preview...</p>
                </div>
              )
            ) : (
              // Excel Data Grid View
              <div className="w-full h-full border border-slate-800 rounded-lg overflow-hidden bg-slate-900 flex flex-col shadow-2xl">
                <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex justify-between items-center text-slate-400">
                  <div className="flex items-center gap-2 font-medium">
                    <FileSpreadsheet size={13} className="text-emerald-400" />
                    <span>Formatted Tabular Dataset ({data.length} records)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold flex items-center gap-1 transition"
                  >
                    <Download size={11} /> Download Spreadsheet (.xlsx)
                  </button>
                </div>

                <div className="flex-1 overflow-auto p-3 bg-slate-950 font-mono text-[10.5px]">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-slate-900 text-slate-300 border-b border-slate-750">
                        {headers.map((h, idx) => (
                          <th
                            key={idx}
                            className="px-3 py-2 font-bold border-r border-slate-800 text-slate-200"
                          >
                            {typeof h === 'string' ? h : h.header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {data.length === 0 ? (
                        <tr>
                          <td
                            colSpan={headers.length}
                            className="px-4 py-8 text-center text-slate-500 italic"
                          >
                            No records available to export.
                          </td>
                        </tr>
                      ) : (
                        data.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-900/60 transition">
                            {row.map((cell, cIdx) => (
                              <td
                                key={cIdx}
                                className="px-3 py-1.5 border-r border-slate-850 text-slate-300"
                              >
                                {cell === null || cell === undefined ? '-' : String(cell)}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                      {totals && totals.length > 0 && (
                        <tr className="bg-slate-900 font-bold border-t-2 border-slate-700 text-emerald-400">
                          {totals.map((t, idx) => (
                            <td key={idx} className="px-3 py-2 border-r border-slate-800">
                              {t === null || t === undefined ? '' : String(t)}
                            </td>
                          ))}
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
