import React from 'react';
import { 
  Building2, ChevronRight, Home, Download, Plus, Filter, 
  Printer, MoreVertical, RefreshCw, FileText, ArrowLeft 
} from 'lucide-react';
import { useAppContext } from '../../store';

export interface PageHeaderAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  title?: string;
}

export interface PageHeaderProps {
  title: string;
  tcode?: string;
  breadcrumbs?: string[];
  description?: string;
  projectContext?: string;
  showProjectSelector?: boolean;
  onSelectProject?: (projectId: string) => void;
  primaryAction?: PageHeaderAction;
  secondaryActions?: PageHeaderAction[];
  onBack?: () => void;
  onRefresh?: () => void;
  onExport?: () => void;
  onPrint?: () => void;
  onFilterToggle?: () => void;
  filterActiveCount?: number;
  children?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  tcode,
  breadcrumbs = [],
  description,
  projectContext,
  showProjectSelector = false,
  onSelectProject,
  primaryAction,
  secondaryActions = [],
  onBack,
  onRefresh,
  onExport,
  onPrint,
  onFilterToggle,
  filterActiveCount = 0,
  children,
  className = ''
}) => {
  const { projects = [], currentProjectId, setCurrentProjectId } = useAppContext() as any;
  const activeProject = projects.find((p: any) => p.id === currentProjectId) || projects[0];

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = e.target.value;
    if (setCurrentProjectId) {
      setCurrentProjectId(pId);
    }
    if (onSelectProject) {
      onSelectProject(pId);
    }
  };

  return (
    <div className={`bg-white dark:bg-[#1A1D21] border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 select-none ${className}`}>
      {/* Top row: Breadcrumb navigation */}
      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 mb-2">
        <div className="flex items-center space-x-1.5 overflow-x-auto min-w-0 font-medium">
          <button
            onClick={() => {
              if ((window as any).openWorkspaceTab) {
                (window as any).openWorkspaceTab('dashboard');
              }
            }}
            className="flex items-center space-x-1 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer shrink-0"
            title="Home"
          >
            <Home size={12} className="text-slate-500" />
            <span>Home</span>
          </button>

          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              <ChevronRight size={11} className="text-slate-300 dark:text-slate-600 shrink-0" />
              <span
                className={`${
                  idx === breadcrumbs.length - 1
                    ? 'font-bold text-slate-800 dark:text-slate-200 truncate'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors truncate'
                }`}
              >
                {crumb}
              </span>
            </React.Fragment>
          ))}
        </div>

        {/* Global Financial Year & Active Project Context Tag */}
        <div className="hidden sm:flex items-center space-x-2 shrink-0">
          {showProjectSelector && projects.length > 0 ? (
            <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md text-[10px]">
              <Building2 size={11} className="text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="font-semibold text-slate-500 dark:text-slate-400">Project:</span>
              <select
                value={currentProjectId || activeProject?.id}
                onChange={handleProjectChange}
                className="bg-transparent border-0 font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer text-[10px] p-0"
              >
                {projects.map((p: any) => (
                  <option key={p.id} value={p.id} className="dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                    {p.name} {p.projectCode ? `(${p.projectCode})` : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : activeProject ? (
            <div className="flex items-center space-x-1.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 px-2 py-0.5 rounded-md text-[10px] text-blue-800 dark:text-blue-300 font-medium">
              <Building2 size={11} className="text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="truncate max-w-[200px]">{projectContext || activeProject.name}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Middle row: Title, T-Code & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1 rounded-md text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              title="Go Back"
            >
              <ArrowLeft size={16} />
            </button>
          )}

          <div className="flex items-center space-x-2 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 truncate font-sans">
              {title}
            </h1>
            {tcode && (
              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                {tcode}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center flex-wrap gap-2 shrink-0">
          {onFilterToggle && (
            <button
              onClick={onFilterToggle}
              className={`flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold rounded-md border transition-colors cursor-pointer ${
                filterActiveCount > 0
                  ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
              title="Advanced Filters"
            >
              <Filter size={13} />
              <span>Filter</span>
              {filterActiveCount > 0 && (
                <span className="bg-blue-600 text-white rounded-full px-1.5 py-0.2 text-[9px] font-mono font-bold">
                  {filterActiveCount}
                </span>
              )}
            </button>
          )}

          {onExport && (
            <button
              onClick={onExport}
              className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-2xs"
              title="Export to Excel / CSV"
            >
              <Download size={13} className="text-slate-500" />
              <span>Export</span>
            </button>
          )}

          {onPrint && (
            <button
              onClick={onPrint}
              className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-2xs"
              title="Print Page / Report"
            >
              <Printer size={13} className="text-slate-500" />
              <span>Print</span>
            </button>
          )}

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-2xs"
              title="Refresh Data"
            >
              <RefreshCw size={13} />
            </button>
          )}

          {secondaryActions.map((action, idx) => (
            <button
              key={idx}
              onClick={action.onClick}
              disabled={action.disabled}
              className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
              title={action.title}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}

          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled}
              className="flex items-center space-x-1 px-3.5 py-1.5 text-xs font-bold rounded-md bg-[#0F4C81] hover:bg-[#00386b] dark:bg-[#0A6ED1] dark:hover:bg-[#085caf] text-white shadow-sm transition-all duration-150 cursor-pointer disabled:opacity-50 active:scale-[0.98]"
              title={primaryAction.title}
            >
              {primaryAction.icon || <Plus size={14} className="shrink-0" />}
              <span>{primaryAction.label}</span>
            </button>
          )}
        </div>
      </div>

      {/* Bottom row: Description & Custom Sub-header components */}
      {(description || children) && (
        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          {description && <p className="leading-relaxed">{description}</p>}
          {children}
        </div>
      )}
    </div>
  );
};
