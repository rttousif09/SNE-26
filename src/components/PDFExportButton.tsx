import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Download, Printer, X, Eye } from 'lucide-react';
import { exportToPDF, downloadPDF } from '../lib/pdfGenerator';
import { useAppContext } from '../store';

interface PDFExportModalProps {
  title: string;
  subtitle?: string;
  headers: string[];
  data: (string | number)[][];
  totals?: string[];
  filename?: string;
  siteName?: string;
  dateRange?: string;
  buttonLabel?: string;
}

export const PDFExportButton: React.FC<PDFExportModalProps> = ({
  title, subtitle, headers, data, totals, filename = 'Export.pdf',
  siteName, dateRange, buttonLabel = 'Export PDF'
}) => {
  const { user } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [useWatermark, setUseWatermark] = useState(false);

  const handleGenerate = () => {
    const url = exportToPDF({
      title, subtitle, headers, data, totals, filename,
      siteName, dateRange, userName: user?.name || user?.username || 'Admin',
      watermark: useWatermark
    });
    setPdfUrl(url as unknown as string);
    setIsOpen(true);
  };

  const handleDownload = () => {
    if (pdfUrl) {
      downloadPDF(pdfUrl, filename);
    }
  };

  const handlePrint = () => {
    if (pdfUrl) {
      const printWindow = window.open(pdfUrl, '_blank');
      printWindow?.addEventListener('load', () => {
        printWindow.print();
      });
    }
  };

  return (
    <>
      <div className="flex gap-1 items-center">
        <label className="flex items-center gap-1 text-[10px] text-gray-600 mr-2 cursor-pointer">
          <input type="checkbox" checked={useWatermark} onChange={e => setUseWatermark(e.target.checked)} className="rounded-sm border-gray-300" />
          Watermark
        </label>
        <button 
          onClick={handleGenerate}
          className="sap-btn bg-red-600 text-white font-bold flex items-center gap-1 px-2 py-1 hover:bg-red-700 transition"
        >
          <FileText size={12} /> {buttonLabel}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && pdfUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-3 border-b bg-slate-50 rounded-t-lg">
                <div className="flex items-center gap-2">
                  <FileText className="text-red-600" />
                  <h3 className="font-bold text-gray-800">PDF Preview: {title}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                        handleDownload();
                        setIsOpen(false);
                    }}
                    className="sap-btn bg-blue-600 text-white flex items-center gap-1"
                  >
                    <Download size={14} /> Download PDF
                  </button>
                  <button 
                    onClick={handlePrint}
                    className="sap-btn border border-gray-400 bg-white flex items-center gap-1"
                  >
                    <Printer size={14} /> Print
                  </button>
                  <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-slate-200 rounded">
                    <X size={18} className="text-gray-600" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 bg-gray-100 p-2 overflow-hidden">
                <iframe src={`${pdfUrl}#toolbar=0`} className="w-full h-full border-0 bg-white shadow-sm" title="PDF Preview" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
