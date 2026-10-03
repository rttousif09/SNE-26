import React, { useState, useEffect } from 'react';
import { X, Printer, Download, FileSpreadsheet, ZoomIn, ZoomOut, CheckCircle2 } from 'lucide-react';
import { DPRReport } from '../../types/dpr';
import { generateDPRPDF, exportDPRExcel } from './DPRPDFGenerator';

interface DPRPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  dpr: DPRReport | null;
}

export const DPRPreviewModal: React.FC<DPRPreviewModalProps> = ({ isOpen, onClose, dpr }) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !dpr) {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
      return;
    }

    setLoading(true);
    try {
      const doc = generateDPRPDF(dpr);
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setLoading(false);
    }

    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [isOpen, dpr]);

  if (!isOpen || !dpr) return null;

  const handleDownload = () => {
    try {
      const doc = generateDPRPDF(dpr);
      const safeReportNo = (dpr.reportNo || 'DPR').replace(/[\/\\]/g, '_');
      doc.save(`SN_DPR01_${safeReportNo}_${dpr.date}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Error downloading PDF");
    }
  };

  const handlePrint = () => {
    if (pdfUrl) {
      const printWindow = window.open(pdfUrl);
      if (printWindow) {
        printWindow.focus();
        printWindow.print();
      } else {
        window.print();
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 backdrop-blur-xs">
      <div className="bg-[#f0f4f8] border-2 border-[#8c9ba8] w-full max-w-5xl rounded-sm shadow-2xl overflow-hidden flex flex-col h-[92vh] text-[11px] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header Toolbar */}
        <div className="bg-[var(--color-sap-blue-val,#0a6ed1)] text-white px-4 py-2 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center space-x-2">
            <span className="font-mono font-bold bg-white/20 px-1.5 py-0.5 rounded text-[10px]">DPR01</span>
            <h3 className="font-bold text-xs uppercase tracking-wider">
              Daily Progress Report Document Preview — {dpr.reportNo}
            </h3>
            <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-blue-100 font-semibold">
              {dpr.date} | {dpr.status}
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={handlePrint}
              className="px-2.5 py-1 bg-white hover:bg-gray-100 text-[#0a6ed1] font-bold rounded flex items-center space-x-1 transition shadow-xs"
              title="Print 2-page document"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              onClick={handleDownload}
              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded flex items-center space-x-1 transition shadow-xs"
              title="Download official PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>

            <button
              onClick={() => exportDPRExcel(dpr)}
              className="px-2.5 py-1 bg-[#1e7e34] hover:bg-[#155d27] text-white font-bold rounded flex items-center space-x-1 transition shadow-xs"
              title="Export all data to Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>

            <button
              onClick={onClose}
              className="text-white hover:text-gray-300 font-bold text-lg leading-none p-1 ml-2"
              aria-label="Close"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Viewport Frame */}
        <div className="flex-1 bg-gray-200 p-2 overflow-hidden flex items-center justify-center">
          {loading ? (
            <div className="text-center py-12 space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0a6ed1] mx-auto"></div>
              <p className="text-gray-600 font-semibold text-xs">Compiling professional 2-page DPR PDF...</p>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full bg-white rounded border border-gray-400 shadow-inner"
              title="DPR PDF Document"
            />
          ) : (
            <div className="text-center py-12 text-gray-500">
              Failed to generate PDF document preview.
            </div>
          )}
        </div>

        {/* Status / Sign-off Footer info */}
        <div className="bg-white border-t border-gray-300 px-4 py-1.5 flex flex-wrap items-center justify-between text-[10px] text-gray-600 shrink-0">
          <div>
            <span>Project: <strong className="text-gray-800">{dpr.projectName || dpr.projectId}</strong></span>
            <span className="mx-2">|</span>
            <span>Contractor: <strong className="text-gray-800">{dpr.contractorName}</strong></span>
            <span className="mx-2">|</span>
            <span>Client: <strong className="text-gray-800">{dpr.clientName || 'N/A'}</strong></span>
          </div>

          <div className="flex items-center space-x-3">
            <span>Prepared: <strong className="text-gray-800">{dpr.preparedBy || '-'}</strong></span>
            <span>Approved: <strong className="text-gray-800">{dpr.approvedBy || '-'}</strong></span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-800">
              {dpr.status}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
