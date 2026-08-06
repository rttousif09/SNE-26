import React, { useState } from 'react';
import { 
  ChevronRight, ChevronDown, Database, Folder, FolderOpen, FileText, 
  Server, ClipboardCheck, Users, Activity, Settings, Home, Layers, 
  Building2, Receipt, CreditCard, Package, TrendingDown, BarChart3,
  ChevronLeft, Menu, Lock
} from 'lucide-react';
import { useAppContext } from '../store';
import { motion, AnimatePresence } from 'motion/react';
import { ExpandableSection } from './AnimatedERP';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab }) => {
  const { approvals, advanceSheetApprovals, kharchiApprovals, paymentSheetApprovals, expensesLedger, user } = useAppContext();
  
  // Collapse state for the sidebar itself
  const [isCollapsed, setIsCollapsed] = useState(false);

  const pendingCount = (approvals?.filter(a => a.status === 'Pending').length || 0) +
    (advanceSheetApprovals?.filter(s => s.status === 'Pending').length || 0) +
    (kharchiApprovals?.filter(s => s.status === 'Pending').length || 0) +
    (paymentSheetApprovals?.filter(s => s.status === 'Pending').length || 0) +
    (expensesLedger?.filter(e => e.status === 'Submitted').length || 0);

  // States to track expansion of folders
  const [foldersExpanded, setFoldersExpanded] = useState<Record<string, boolean>>({
    masters: true,
    labour: true,
    floor: false,
    subcontractor: false,
    billing: false,
    inventory: false,
    expenses: false,
    reports: false,
    settings: false,
  });

  const toggleFolder = (key: string) => {
    if (isCollapsed) {
      // If collapsed, expand the sidebar first
      setIsCollapsed(false);
      setFoldersExpanded(prev => ({ ...prev, [key]: true }));
    } else {
      setFoldersExpanded(prev => ({ ...prev, [key]: !prev[key] }));
    }
  };

  const isModuleAllowed = (moduleId: string) => {
    if (user?.username === 'saddamsne' || user?.username === 'rejatousifsne') {
      return true;
    }
    if (moduleId === 'dashboard' || moduleId === 'activity-log') {
      return true;
    }
    if (user?.allowedModules) {
      return user.allowedModules.includes(moduleId);
    }
    return false;
  };

  const isAdmin = user?.username === 'saddamsne' || user?.username === 'rejatousifsne';

  // Folders definitions
  const foldersConfig = [
    {
      key: 'masters',
      label: 'Masters',
      icon: <Database size={14} className="text-[#0056b3]" />,
      items: [
        { id: 'projects', label: 'Projects', icon: <Building2 size={11} /> },
        { id: 'workers', label: 'Workers', icon: <Users size={11} /> },
        { id: 'subcontractors-master', label: 'Subcontractor Directory', icon: <ClipboardCheck size={11} /> }
      ]
    },
    {
      key: 'labour',
      label: 'Labour Management',
      icon: <Users size={14} className="text-teal-600" />,
      items: [
        { id: 'dlr', label: 'Attendance (DLR)', icon: <ClipboardCheck size={11} /> },
        { id: 'kharchi', label: 'Kharchi (Pocket Money)', icon: <FileText size={11} /> },
        { id: 'advance', label: 'Advance Registers', icon: <FileText size={11} /> },
        { id: 'worker-payment', label: 'Worker Payment', icon: <CreditCard size={11} /> },
        { id: 'worker-ledger', label: 'Worker Ledger', icon: <FileText size={11} /> }
      ]
    },
    {
      key: 'floor',
      label: 'Floor Abstract',
      icon: <Layers size={14} className="text-indigo-600" />,
      items: [
        { id: 'floor-abstracts', label: 'Floor Abstracts', icon: <FileText size={11} /> }
      ]
    },
    {
      key: 'subcontractor',
      label: 'Subcontractor Mgt',
      icon: <Building2 size={14} className="text-amber-600" />,
      items: [
        { id: 'subcontractors', label: 'Subcontractor Dashboard', icon: <Server size={11} /> },
        { id: 'subcontractors-master', label: 'Subcontractor Directory', icon: <Users size={11} /> },
        { id: 'subcontractors-billing', label: 'Subcontractor Bills', icon: <FileText size={11} /> },
        { id: 'subcontractors-payments', label: 'Subcontractor Payments', icon: <CreditCard size={11} /> },
        { id: 'subcontractors-ledger', label: 'Reconciliation Ledger', icon: <FileText size={11} /> },
        { id: 'subcontractors-audit', label: 'Audit Trail Logs', icon: <Activity size={11} /> }
      ]
    },
    {
      key: 'billing',
      label: 'Billing & Collections',
      icon: <Receipt size={14} className="text-green-600" />,
      items: [
        { id: 'boqs', label: 'BOQ Management', icon: <FileText size={11} /> },
        { id: 'billing', label: 'Billing Management', icon: <FileText size={11} /> },
        { id: 'client-payment', label: 'Client Payment', icon: <CreditCard size={11} /> }
      ]
    },
    {
      key: 'inventory',
      label: 'Inventory & Store',
      icon: <Package size={14} className="text-amber-700" />,
      items: [
        { id: 'materials', label: 'Materials & Inventory', icon: <Package size={11} /> },
        { id: 'assets', label: 'Equipment Assets', icon: <Server size={11} /> }
      ]
    },
    {
      key: 'expenses',
      label: 'Expenses',
      icon: <TrendingDown size={14} className="text-rose-600" />,
      items: [
        { id: 'expenses', label: 'Expenses Ledger', icon: <FileText size={11} /> },
        { id: 'expenses-summary', label: 'Expenses Summary', icon: <BarChart3 size={11} /> }
      ]
    },
    {
      key: 'dms',
      label: 'Document System',
      icon: <FolderOpen size={14} className="text-blue-600" />,
      items: [
        { id: 'dms', label: 'DMS Document Center', icon: <FileText size={11} /> }
      ]
    },
    {
      key: 'reports',
      label: 'Reports',
      icon: <BarChart3 size={14} className="text-blue-600" />,
      items: [
        { id: 'site-monthly-summary', label: 'Site Monthly Summary', icon: <FileText size={11} /> },
        { id: 'daily-site-summary', label: 'Daily Site Summary', icon: <ClipboardCheck size={11} /> },
        { id: 'bill-tracking', label: 'Bill Tracking Workflow', icon: <Activity size={11} /> },
        { id: 'financial-year-archive', label: 'Financial Year Archive', icon: <Layers size={11} /> }
      ]
    },
    {
      key: 'settings',
      label: 'Settings',
      icon: <Settings size={14} className="text-slate-600" />,
      items: [
        { id: 'numbering-settings', label: 'Numbering Settings', icon: <Settings size={11} /> },
        { id: 'tcode-master', label: 'SAP T-Code Registry', icon: <Settings size={11} /> },
        ...(isAdmin ? [{ id: 'staff-management', label: 'Staff Management', icon: <Users size={11} /> }] : []),
        { id: 'activity-log', label: 'Activity Log', icon: <Activity size={11} /> }
      ]
    }
  ];

  // Helper to check if a folder is active (contains active tab)
  const isFolderActive = (folderItems: { id: string }[]) => {
    return folderItems.some(item => {
      if (currentTab === item.id) return true;
      // Handle subcontractor sub-tab active matching
      if (currentTab.startsWith('subcontractors') && item.id.startsWith('subcontractors')) return true;
      return false;
    });
  };

  const handleItemClick = (itemId: string) => {
    setCurrentTab(itemId);
  };

  return (
    <div 
      className={`bg-[#f0f4f8] border-r border-[#8c9ba8] flex flex-col h-full text-[11px] select-none transition-all duration-300 ${
        isCollapsed ? 'w-12' : 'w-64'
      }`}
      id="sap-sidebar"
    >
      {/* Sidebar Header & Toggle */}
      <div className="bg-[#eef2f6] border-b border-[#8c9ba8] px-2 py-1.5 flex items-center justify-between shadow-xs">
        {!isCollapsed && (
          <span className="font-extrabold text-[10px] text-slate-700 tracking-wider uppercase flex items-center gap-1.5">
            <Server size={12} className="text-[#0056b3]" />
            <span>Navigation Catalog</span>
          </span>
        )}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 hover:bg-[#d9e4f1] rounded transition text-slate-600 flex items-center justify-center cursor-pointer ml-auto"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <Menu size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Folders & Navigation Content */}
      <div className="flex-1 overflow-y-auto p-1 space-y-1 scrollbar-thin">
        {/* Dashboard Direct Node */}
        <div
          onClick={() => handleItemClick('dashboard')}
          className={`group flex items-center py-1.5 px-2 rounded-sm cursor-pointer transition ${
            currentTab === 'dashboard' 
              ? 'bg-[#cce8ff] text-[var(--color-sap-blue-val)] font-bold border border-[#99d1ff]' 
              : 'hover:bg-[#e6f2ff] text-slate-700 hover:text-slate-900 border border-transparent'
          }`}
          title={isCollapsed ? "Dashboard" : ""}
        >
          <Home size={14} className={currentTab === 'dashboard' ? 'text-[#0056b3]' : 'text-slate-600'} />
          {!isCollapsed && (
            <span className="ml-2 font-bold tracking-tight">🏠 Dashboard Overview</span>
          )}
        </div>

        {/* Approvals Quick Access Node */}
        {isModuleAllowed('approvals') && (
          <div
            onClick={() => handleItemClick('approvals')}
            className={`group flex items-center py-1.5 px-2 rounded-sm cursor-pointer transition ${
              currentTab === 'approvals' 
                ? 'bg-[#cce8ff] text-[var(--color-sap-blue-val)] font-bold border border-[#99d1ff]' 
                : 'hover:bg-[#e6f2ff] text-slate-700 hover:text-slate-900 border border-transparent'
            }`}
            title={isCollapsed ? `Approvals (${pendingCount} Pending)` : ""}
          >
            <ClipboardCheck size={14} className={currentTab === 'approvals' ? 'text-amber-500' : 'text-slate-600'} />
            {!isCollapsed ? (
              <>
                <span className="ml-2 font-bold flex-1 tracking-tight">📝 Approvals Workflow</span>
                {pendingCount > 0 && (
                  <span className="bg-red-600 text-white font-mono text-[9px] px-1.5 py-0.2 rounded-sm font-bold animate-pulse">
                    {pendingCount}
                  </span>
                )}
              </>
            ) : (
              pendingCount > 0 && (
                <span className="absolute left-7 top-1/2 -translate-y-1/2 bg-red-600 text-white text-[8px] h-4 w-4 flex items-center justify-center rounded-full font-bold">
                  {pendingCount}
                </span>
              )
            )}
          </div>
        )}

        {/* Separator */}
        <div className="border-t border-[#8c9ba8]/20 my-1"></div>

        {/* Dynamic folders */}
        {foldersConfig.map((folder) => {
          const isFolderOpen = foldersExpanded[folder.key];
          const activeFolder = isFolderActive(folder.items);
          const allowedItems = folder.items.filter(item => isModuleAllowed(item.id));
          if (allowedItems.length === 0) return null;

          return (
            <div key={folder.key} className="space-y-0.5">
              {/* Folder Row Header */}
              <div 
                onClick={() => toggleFolder(folder.key)}
                className={`group flex items-center py-1.5 px-2 rounded-sm cursor-pointer transition ${
                  activeFolder && isCollapsed 
                    ? 'bg-[#cce8ff] text-[var(--color-sap-blue-val)] border border-[#99d1ff]' 
                    : 'hover:bg-[#e6f2ff] text-slate-700'
                }`}
                title={isCollapsed ? folder.label : ""}
              >
                <div className="flex items-center shrink-0">
                  {folder.icon}
                </div>
                
                {!isCollapsed && (
                  <>
                    <span className={`ml-2 font-semibold flex-1 ${activeFolder ? 'text-[var(--color-sap-blue-val)] font-bold' : ''}`}>
                      📂 {folder.label}
                    </span>
                    <div className="text-slate-400 group-hover:text-slate-600">
                      {isFolderOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                    </div>
                  </>
                )}
              </div>

              {/* Collapsible content (only shown when NOT collapsed) */}
              <AnimatePresence initial={false}>
                {!isCollapsed && isFolderOpen && (
                  <ExpandableSection isOpen={isFolderOpen}>
                    <div className="ml-4 pl-2 border-l border-slate-300 space-y-0.5 my-0.5">
                      {allowedItems.map((item) => {
                        // Check if item active. If subcontractor-master matches subcontractors, etc.
                        let isItemActive = currentTab === item.id;
                        if (item.id.startsWith('subcontractors') && currentTab.startsWith('subcontractors')) {
                          // Match subcontractor dashboard to subcontractors, etc.
                          if (item.id === 'subcontractors' && currentTab === 'subcontractors') isItemActive = true;
                          else if (item.id === currentTab) isItemActive = true;
                          else isItemActive = false;
                        }

                        return (
                          <div
                            key={item.id}
                            onClick={() => handleItemClick(item.id)}
                            className={`flex items-center space-x-2 py-1 px-2 rounded-sm cursor-pointer transition border ${
                              isItemActive 
                                ? 'bg-[#cce8ff] border-[#99d1ff] text-[var(--color-sap-blue-val)] font-bold' 
                                : 'hover:bg-[#e6f2ff] border-transparent text-slate-600 hover:text-slate-950'
                            }`}
                          >
                            <span className="shrink-0 text-slate-500 group-hover:text-[#0056b3]">
                              {item.icon}
                            </span>
                            <span className="truncate">{item.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </ExpandableSection>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Footer Branding in Sidebar */}
      {!isCollapsed && (
        <div className="p-2 border-t border-[#8c9ba8] bg-[#eef2f6] text-[9px] text-slate-500 font-mono text-center shrink-0">
          <p className="font-semibold text-slate-600 uppercase">SYS_ACTIVE_NODE</p>
          <p className="text-slate-400 mt-0.5">DB STATUS: SYNCED</p>
        </div>
      )}
    </div>
  );
};
