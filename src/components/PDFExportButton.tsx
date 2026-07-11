import React, { useState } from 'react';
import { FileText, Printer, Download } from 'lucide-react';
import { ReportPreviewModal } from './ReportPreviewModal';
import { ReportSummaryBlock } from '../lib/reportEngine';

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
  summaryBlocks?: ReportSummaryBlock[];
}

export const PDFExportButton: React.FC<PDFExportModalProps> = ({
  title, subtitle, headers, data, totals, filename = 'Export.pdf',
  siteName, dateRange, buttonLabel = 'Export Report', summaryBlocks
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="sap-btn bg-red-600 text-white font-bold flex items-center gap-1.5 px-3 py-1 hover:bg-red-700 transition"
      >
        <FileText size={12} /> {buttonLabel}
      </button>

      {isOpen && (
        <ReportPreviewModal
          title={title}
          subtitle={subtitle}
          projectName={siteName}
          clientName={undefined} // can be inferred from context if needed
          dateRange={dateRange}
          headers={headers}
          data={data}
          totals={totals}
          summaryBlocks={summaryBlocks}
          filename={filename.replace(/\.pdf$/i, '')}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
};
