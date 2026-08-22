import React, { useState } from 'react';
import { FileText, Printer, Download, ChevronDown, FileSpreadsheet } from 'lucide-react';
import { ReportPreviewModal } from './ReportPreviewModal';
import {
  ReportSummaryBlock,
  ReportColumnConfig,
  exportToExcelEnterprise,
  generateReportFilename,
  EnterpriseReportDefinition,
} from '../lib/exportEngine';

export interface PDFExportModalProps {
  title: string;
  subtitle?: string;
  tcode?: string;
  reportNo?: string;
  headers: (string | ReportColumnConfig)[];
  data: (string | number | boolean | null | undefined)[][];
  totals?: (string | number | null | undefined)[];
  filename?: string;
  siteName?: string;
  projectName?: string;
  clientName?: string;
  financialYear?: string;
  dateRange?: string;
  appliedFilters?: { label: string; value: string }[];
  buttonLabel?: string;
  summaryBlocks?: ReportSummaryBlock[];
  signatures?: { title: string; subtitle?: string; name?: string }[];
  notes?: string[];
  customSheets?: {
    sheetName: string;
    headers: string[];
    data: (string | number)[][];
    totals?: (string | number)[];
  }[];
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  className?: string;
  showDropdown?: boolean;
}

export const PDFExportButton: React.FC<PDFExportModalProps> = ({
  title,
  subtitle,
  tcode,
  reportNo,
  headers,
  data,
  totals,
  filename,
  siteName,
  projectName,
  clientName,
  financialYear,
  dateRange,
  appliedFilters,
  buttonLabel = 'Export Report',
  summaryBlocks,
  signatures,
  notes,
  customSheets,
  variant = 'danger',
  className = '',
  showDropdown = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const effectiveProject = projectName || siteName;
  const cleanFilename = filename ? filename.replace(/\.(pdf|xlsx)$/i, '') : generateReportFilename(title, effectiveProject, 'pdf').replace(/\.pdf$/i, '');

  const handleDirectExcel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    const def: EnterpriseReportDefinition = {
      title,
      subtitle,
      tcode,
      reportNo,
      projectName: effectiveProject,
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
      filename: cleanFilename,
    };
    exportToExcelEnterprise(def, `${cleanFilename}.xlsx`);
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700';
      case 'success':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700';
      case 'secondary':
        return 'bg-slate-700 hover:bg-slate-600 text-white border-slate-600';
      case 'ghost':
        return 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/10';
      case 'danger':
      default:
        return 'bg-red-600 hover:bg-red-700 text-white border-red-700';
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`sap-btn font-bold flex items-center gap-1.5 px-3 py-1 text-xs rounded transition shadow-xs cursor-pointer border ${getVariantStyles()} ${className}`}
        title={`Export ${title} (PDF, Excel, Print)`}
      >
        <FileText size={13} />
        <span>{buttonLabel}</span>
        {showDropdown && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            className="pl-1 border-l border-white/20 hover:text-amber-200 transition"
          >
            <ChevronDown size={12} />
          </span>
        )}
      </button>

      {/* Optional Quick Dropdown Menu */}
      {showDropdown && isMenuOpen && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 py-1 text-[11px] font-sans">
          <button
            type="button"
            onClick={() => {
              setIsMenuOpen(false);
              setIsOpen(true);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-200 flex items-center gap-2"
          >
            <FileText size={12} className="text-rose-400" />
            <span>PDF Print & Preview</span>
          </button>
          <button
            type="button"
            onClick={handleDirectExcel}
            className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-200 flex items-center gap-2"
          >
            <FileSpreadsheet size={12} className="text-emerald-400" />
            <span>Quick Excel Export</span>
          </button>
        </div>
      )}

      {isOpen && (
        <ReportPreviewModal
          title={title}
          subtitle={subtitle}
          tcode={tcode}
          reportNo={reportNo}
          projectName={effectiveProject}
          clientName={clientName}
          financialYear={financialYear}
          dateRange={dateRange}
          appliedFilters={appliedFilters}
          headers={headers}
          data={data}
          totals={totals}
          summaryBlocks={summaryBlocks}
          signatures={signatures}
          notes={notes}
          customSheets={customSheets}
          filename={cleanFilename}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};
