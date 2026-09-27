import React from 'react';
import { Check, Plus } from 'lucide-react';
export { SAPTabs as SapTabs } from './SAPTabs';
export { SAPTransactionHeader as SapTransactionHeader } from './SAPTransactionHeader';

/* 1. SapShell: Application Shell Container */
export interface SapShellProps {
  children: React.ReactNode;
  className?: string;
}

export const SapShell: React.FC<SapShellProps> = ({ children, className = '' }) => {
  return (
    <div className={`min-h-screen bg-[var(--sap-workspace)] text-[var(--sap-text)] font-sans text-[12px] flex flex-col ${className}`}>
      {children}
    </div>
  );
};

/* 2. SapToolbar: Classic Pale Enterprise Action Toolbar */
export interface SapToolbarProps {
  children: React.ReactNode;
  className?: string;
}

export const SapToolbar: React.FC<SapToolbarProps> = ({ children, className = '' }) => {
  return (
    <div className={`h-[27px] bg-[var(--sap-toolbar)] border-b border-[var(--sap-border)] px-2 flex items-center justify-between text-[12px] select-none ${className}`}>
      {children}
    </div>
  );
};

/* 3. SapCommandField: T-Code Command Input with Attached Execute Checkmark */
export interface SapCommandFieldProps {
  value: string;
  onChange: (val: string) => void;
  onExecute: () => void;
  placeholder?: string;
  hasError?: boolean;
  className?: string;
}

export const SapCommandField: React.FC<SapCommandFieldProps> = ({
  value,
  onChange,
  onExecute,
  placeholder = '',
  hasError = false,
  className = ''
}) => {
  return (
    <div className={`inline-flex items-center ${className}`}>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onExecute();
          }
        }}
        placeholder={placeholder}
        className={`h-[24px] w-28 px-1.5 text-[12px] font-mono uppercase bg-white border border-[#b7c2ca] rounded-none focus:bg-[#fffde7] focus:border-[#d97706] ${
          hasError ? 'border-red-500 bg-red-50 text-red-700' : 'text-[#303b44]'
        }`}
      />
      <button
        type="button"
        onClick={onExecute}
        className="h-[24px] w-[24px] bg-[#edf2f5] hover:bg-[#dcecf6] text-[#2d6f91] border border-[#b7c2ca] border-l-0 rounded-none flex items-center justify-center cursor-pointer font-bold"
        title="Execute (Enter)"
      >
        <Check size={11} />
      </button>
    </div>
  );
};

/* 4. SapSection: Classic SAP Group Heading with Divider Line (No Blue Banners) */
export interface SapSectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

export const SapSection: React.FC<SapSectionProps> = ({ 
  title, 
  subtitle, 
  children, 
  className = '',
  actions 
}) => {
  return (
    <div className={`mb-3 ${className}`}>
      <div className="sap-section-header">
        <span className="font-semibold text-[12px] text-[#35434d] tracking-normal whitespace-nowrap">
          {title}
        </span>
        {subtitle && (
          <span className="text-[11px] text-[#63717b] font-normal">
            ({subtitle})
          </span>
        )}
        {actions && (
          <div className="ml-auto flex items-center space-x-1 shrink-0">
            {actions}
          </div>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
};

/* 5. SapFieldGrid: Horizontal Aligned Field Grid */
export interface SapFieldGridProps {
  columns?: 1 | 2 | 3 | 4;
  children: React.ReactNode;
  className?: string;
}

export const SapFieldGrid: React.FC<SapFieldGridProps> = ({ columns = 2, children, className = '' }) => {
  const colClass = 
    columns === 1 ? 'grid-cols-1' :
    columns === 2 ? 'grid-cols-1 md:grid-cols-2' :
    columns === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
    'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';

  return (
    <div className={`grid ${colClass} gap-x-8 gap-y-1.5 text-[12px] ${className}`}>
      {children}
    </div>
  );
};

/* 6. SapField: Fixed-Width Label + Aligned Input Container */
export interface SapFieldProps {
  label: string;
  required?: boolean;
  labelWidth?: string;
  children: React.ReactNode;
  className?: string;
}

export const SapField: React.FC<SapFieldProps> = ({ 
  label, 
  required = false, 
  labelWidth = 'w-32', 
  children, 
  className = '' 
}) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <label className={`${labelWidth} shrink-0 text-right text-[12px] text-[#303b44] font-normal`}>
        {label}
        {required && <span className="text-red-600 ml-0.5 font-bold">*</span>}:
      </label>
      <div className="flex-1 min-w-0 flex items-center">
        {children}
      </div>
    </div>
  );
};

/* 7. SapLookupField: Input with Square Attached [+] Button */
export interface SapLookupFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onLookup?: () => void;
  lookupTitle?: string;
}

export const SapLookupField: React.FC<SapLookupFieldProps> = ({ 
  onLookup, 
  lookupTitle = "Add / Select (F4)", 
  className = '', 
  ...inputProps 
}) => {
  return (
    <div className="flex items-center w-full">
      <input 
        className={`sap-input flex-1 min-w-0 ${className}`} 
        {...inputProps} 
      />
      <button 
        type="button" 
        onClick={onLookup} 
        className="sap-lookup-btn"
        title={lookupTitle}
      >
        <Plus size={11} className="stroke-[2.5]" />
      </button>
    </div>
  );
};

/* 8. SapAlvTable: Classic SAP ALV / Dense Spreadsheet Table */
export interface SapAlvColumn<T = any> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (row: T, index: number) => React.ReactNode;
}

export interface SapAlvTableProps<T = any> {
  columns: SapAlvColumn<T>[];
  data: T[];
  selectedId?: string | null;
  onRowClick?: (row: T, index: number) => void;
  keyExtractor?: (row: T, index: number) => string;
  emptyMessage?: string;
  className?: string;
}

export function SapAlvTable<T = any>({
  columns,
  data,
  selectedId,
  onRowClick,
  keyExtractor = (_row, index) => String(index),
  emptyMessage = 'No records found.',
  className = ''
}: SapAlvTableProps<T>) {
  return (
    <div className={`overflow-x-auto border border-[#bcc8d0] bg-white ${className}`}>
      <table className="sap-alv-table w-full border-collapse">
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className={`px-2 py-1 text-[11.5px] font-semibold text-[#303b44] bg-[#e7edf1] border border-[#bcc8d0] select-none ${
                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-3 py-4 text-center text-[#63717b] italic bg-white"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, idx) => {
              const rowKey = keyExtractor(row, idx);
              const isSelected = selectedId === rowKey;
              return (
                <tr
                  key={rowKey}
                  onClick={() => onRowClick && onRowClick(row, idx)}
                  className={`border-b border-[#c4cdd3] transition-colors ${
                    isSelected
                      ? 'bg-[#dcecf6] font-semibold text-[#2d6f91]'
                      : 'hover:bg-[#eef6fb] text-[#303b44]'
                  } ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {columns.map(col => (
                    <td
                      key={col.key}
                      className={`px-2 py-1 border border-[#c4cdd3] text-[11.5px] ${
                        col.align === 'right' ? 'text-right font-mono' : col.align === 'center' ? 'text-center' : 'text-left'
                      }`}
                    >
                      {col.render ? col.render(row, idx) : (row as any)[col.key]}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

/* 9. SapActionBar: Bottom Action Bar (Flat, Right-Aligned Save | Cancel) */
export interface SapActionBarProps {
  onSave?: () => void;
  onCancel?: () => void;
  saveLabel?: string;
  cancelLabel?: string;
  isSaving?: boolean;
  statusText?: string;
  children?: React.ReactNode;
  className?: string;
}

export const SapActionBar: React.FC<SapActionBarProps> = ({
  onSave,
  onCancel,
  saveLabel = 'Save',
  cancelLabel = 'Cancel',
  isSaving = false,
  statusText,
  children,
  className = ''
}) => {
  return (
    <div className={`sap-action-bar select-none ${className}`}>
      {statusText && (
        <span className="text-[11px] text-[#63717b] mr-auto font-mono">
          {statusText}
        </span>
      )}
      {children}
      {onCancel && (
        <button 
          type="button" 
          onClick={onCancel} 
          className="sap-btn"
        >
          {cancelLabel}
        </button>
      )}
      {onSave && (
        <button 
          type="button" 
          onClick={onSave} 
          disabled={isSaving} 
          className="sap-btn sap-btn-save"
        >
          {isSaving ? 'Saving...' : saveLabel}
        </button>
      )}
    </div>
  );
};

/* 10. SapStatusBar: Small Bottom Status Message Bar */
export const SapStatusBar: React.FC<{ message?: string; type?: 'info' | 'success' | 'warning' | 'error' }> = ({ 
  message = 'Ready', 
  type = 'info' 
}) => {
  const dotColor = 
    type === 'success' ? 'bg-emerald-600' :
    type === 'error' ? 'bg-red-600' :
    type === 'warning' ? 'bg-amber-600' : 'bg-[#6ba6c8]';

  return (
    <div className="h-[22px] bg-[#edf3f7] border-t border-[#bcc8d0] px-3 flex items-center space-x-2 text-[11px] text-[#63717b] select-none">
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
      <span className="truncate">{message}</span>
    </div>
  );
};
