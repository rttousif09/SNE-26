import React, { useEffect } from 'react';
import { 
  Plus, Save, Edit, Trash2, Copy, Printer, 
  FileSpreadsheet, RefreshCw, History, MoreHorizontal 
} from 'lucide-react';

export interface SAPTransactionHeaderProps {
  tcode: string;
  title: string;
  subtitle?: string;
  onNew?: () => void;
  onSave?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
  onPrint?: () => void;
  onExport?: () => void;
  onRefresh?: () => void;
  onHistory?: () => void;
  isSaving?: boolean;
  canSave?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  children?: React.ReactNode;
}

export const SAPTransactionHeader: React.FC<SAPTransactionHeaderProps> = ({
  tcode,
  title,
  subtitle,
  onNew,
  onSave,
  onEdit,
  onDelete,
  onCopy,
  onPrint,
  onExport,
  onRefresh,
  onHistory,
  isSaving = false,
  canSave = true,
  canEdit = true,
  canDelete = true,
  children
}) => {
  // Listen for global TopBar actions
  useEffect(() => {
    const handleGlobalSave = () => {
      if (onSave && canSave) onSave();
    };
    const handleGlobalPrint = () => {
      if (onPrint) onPrint();
      else window.print();
    };
    const handleGlobalExport = () => {
      if (onExport) onExport();
    };
    const handleGlobalRefresh = () => {
      if (onRefresh) onRefresh();
    };

    window.addEventListener('sap-action-save', handleGlobalSave);
    window.addEventListener('sap-action-print', handleGlobalPrint);
    window.addEventListener('sap-action-export', handleGlobalExport);
    window.addEventListener('sap-action-refresh', handleGlobalRefresh);

    return () => {
      window.removeEventListener('sap-action-save', handleGlobalSave);
      window.removeEventListener('sap-action-print', handleGlobalPrint);
      window.removeEventListener('sap-action-export', handleGlobalExport);
      window.removeEventListener('sap-action-refresh', handleGlobalRefresh);
    };
  }, [onSave, onPrint, onExport, onRefresh, canSave]);

  return (
    <div className="bg-[#f7f9fa] border-b border-[#bcc8d0] select-none shrink-0 mb-1.5">
      {/* Title Bar: Flat, pale, 14px, #303b44 */}
      <div className="px-2.5 py-1 flex flex-wrap items-center justify-between gap-1.5 border-b border-[#bcc8d0]/70 bg-[#edf3f7]">
        <div className="flex items-center space-x-2 min-w-0">
          <span className="font-mono font-bold text-[12px] text-[#2d6f91] bg-white border border-[#bcc8d0] px-1.5 py-0.5 rounded-none">
            {tcode}
          </span>
          <span className="text-[#bcc8d0]">|</span>
          <h1 className="text-[13px] font-bold text-[#303b44] tracking-tight truncate">
            {tcode} – {title}
          </h1>
          {subtitle && (
            <span className="text-[11px] text-[#63717b] hidden lg:inline font-normal truncate">
              ({subtitle})
            </span>
          )}
        </div>

        {/* Optional Right Action Controls / Filters */}
        {children && (
          <div className="flex items-center space-x-1.5 shrink-0">
            {children}
          </div>
        )}
      </div>

      {/* SAP Compact Action Toolbar: 27px height */}
      <div className="px-2 py-0.5 bg-[#f7f9fa] flex flex-wrap items-center justify-between gap-1 text-[12px]">
        <div className="flex items-center flex-wrap gap-1">
          {onNew && (
            <button
              type="button"
              onClick={onNew}
              className="sap-btn"
              title="New Record (Ctrl+N)"
            >
              <Plus size={11} className="text-emerald-700" />
              <span>New</span>
            </button>
          )}

          {onSave && (
            <button
              type="button"
              onClick={onSave}
              disabled={!canSave || isSaving}
              className="sap-btn sap-btn-save"
              title="Save Record (Ctrl+S)"
            >
              <Save size={11} />
              <span>{isSaving ? 'Saving...' : 'Save'}</span>
            </button>
          )}

          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              disabled={!canEdit}
              className="sap-btn"
              title="Edit Selected"
            >
              <Edit size={11} />
              <span>Edit</span>
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={!canDelete}
              className="sap-btn hover:text-red-700"
              title="Delete Selected"
            >
              <Trash2 size={11} className="text-red-600" />
              <span>Delete</span>
            </button>
          )}

          {onCopy && (
            <button
              type="button"
              onClick={onCopy}
              className="sap-btn"
              title="Copy / Duplicate"
            >
              <Copy size={11} />
              <span className="hidden sm:inline">Copy</span>
            </button>
          )}

          <span className="text-[#bcc8d0] mx-0.5 hidden sm:inline">|</span>

          {onPrint && (
            <button
              type="button"
              onClick={onPrint}
              className="sap-btn"
              title="Print Screen / Report"
            >
              <Printer size={11} />
              <span className="hidden sm:inline">Print</span>
            </button>
          )}

          {onExport && (
            <button
              type="button"
              onClick={onExport}
              className="sap-btn"
              title="Export to Spreadsheet"
            >
              <FileSpreadsheet size={11} className="text-emerald-700" />
              <span className="hidden sm:inline">Export</span>
            </button>
          )}

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="sap-btn"
              title="Refresh Data (F5)"
            >
              <RefreshCw size={11} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          )}

          {onHistory && (
            <button
              type="button"
              onClick={onHistory}
              className="sap-btn"
              title="Audit / History Log"
            >
              <History size={11} />
              <span className="hidden sm:inline">History</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
