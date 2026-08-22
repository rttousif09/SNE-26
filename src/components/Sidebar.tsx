import React, { useState } from 'react';
import { 
  ChevronRight, ChevronDown, Database, Folder, FolderOpen, FileText, 
  Server, ClipboardCheck, Users, Activity, Settings, Home, Layers, 
  Building2, Receipt, CreditCard, Package, TrendingDown, BarChart3,
  ChevronLeft, Menu, Lock, GitFork, Wallet, ShieldCheck, CheckSquare,
  Sparkles, SlidersHorizontal, Wrench, HardHat
} from 'lucide-react';
import { useAppContext } from '../store';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string, title?: string, props?: any) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentTab, 
  setCurrentTab,
  isCollapsed,
  setIsCollapsed
}) => {
  const { approvals, advanceSheetApprovals, kharchiApprovals, paymentSheetApprovals, expensesLedger, user } = useAppContext() as any;

  const pendingCount = (approvals?.filter((a: any) => a.status === 'Pending').length || 0) +
    (advanceSheetApprovals?.filter((s: any) => s.status === 'Pending').length || 0) +
    (kharchiApprovals?.filter((s: any) => s.status === 'Pending').length || 0) +
    (paymentSheetApprovals?.filter((s: any) => s.status === 'Pending').length || 0) +
    (expensesLedger?.filter((e: any) => e.status === 'Submitted').length || 0);

  // States to track expansion of folders
  const [foldersExpanded, setFoldersExpanded] = useState<Record<string, boolean>>({
    masters: true,
    labour: true,
    floor: false,
    subcontractor: false,
    billing: true,
    inventory: false,
    expenses: false,
    dms: false,
    reports: false,
    settings: false,
  });

  const toggleFolder = (key: string) => {
    if (isCollapsed) {
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
    return true; // Default allow for standard preview
  };

  const isAdmin = user?.username === 'saddamsne' || user?.username === 'rejatousifsne';

  // Folders definitions with T-Codes
  const foldersConfig = [
    {
      key: 'masters',
      label: 'Masters',
      icon: <Database size={15} className="text-blue-600 dark:text-blue-400" />,
      items: [
        { id: 'projects', label: 'Projects Master', tcode: 'PRJ01', icon: <Building2 size={13} /> },
        { id: 'workers', label: 'Workers Registry', tcode: 'WRK01', icon: <Users size={13} /> },
        { id: 'subcontractors-master', label: 'Subcontractor Directory', tcode: 'SCM01', icon: <Building2 size={13} /> }
      ]
    },
    {
      key: 'labour',
      label: 'Labour & Workforce',
      icon: <HardHat size={15} className="text-teal-600 dark:text-teal-400" />,
      items: [
        { id: 'dlr', label: 'Daily Attendance (DLR)', tcode: 'DLR01', icon: <ClipboardCheck size={13} /> },
        { id: 'kharchi', label: 'Kharchi (Pocket Money)', tcode: 'KHAR01', icon: <Wallet size={13} /> },
        { id: 'advance', label: 'Advance Registers', tcode: 'ADV01', icon: <FileText size={13} /> },
        { id: 'worker-payment', label: 'Worker Payment Settlement', tcode: 'WKP01', icon: <CreditCard size={13} /> },
        { id: 'worker-ledger', label: 'Worker Ledger & Recovery', tcode: 'WKL01', icon: <FileText size={13} /> }
      ]
    },
    {
      key: 'floor',
      label: 'Floor Abstract',
      icon: <Layers size={15} className="text-indigo-600 dark:text-indigo-400" />,
      items: [
        { id: 'floor-abstracts', label: 'Floor Abstracts', tcode: 'FLR01', icon: <FileText size={13} /> }
      ]
    },
    {
      key: 'subcontractor',
      label: 'Subcontractors',
      icon: <Building2 size={15} className="text-amber-600 dark:text-amber-400" />,
      items: [
        { id: 'subcontractors', label: 'Subcontractor Cockpit', tcode: 'SC01', icon: <Server size={13} /> },
        { id: 'subcontractors-master', label: 'Subcontractor Directory', tcode: 'SCM01', icon: <Users size={13} /> },
        { id: 'subcontractors-billing', label: 'Subcontractor Bills', tcode: 'SCB01', icon: <FileText size={13} /> },
        { id: 'subcontractors-payments', label: 'Subcontractor Payments', tcode: 'SCP01', icon: <CreditCard size={13} /> },
        { id: 'subcontractors-ledger', label: 'Reconciliation Ledger', tcode: 'SCL01', icon: <FileText size={13} /> },
        { id: 'subcontractors-audit', label: 'Audit Trail Logs', tcode: 'SCA01', icon: <Activity size={13} /> }
      ]
    },
    {
      key: 'billing',
      label: 'Billing & Inward',
      icon: <Receipt size={15} className="text-emerald-600 dark:text-emerald-400" />,
      items: [
        { id: 'boqs', label: 'BOQ Management', tcode: 'BOQ01', icon: <FileText size={13} /> },
        { id: 'billing', label: 'RA Billing Management', tcode: 'BILL01', icon: <Receipt size={13} /> },
        { id: 'client-payment', label: 'Client Payments (Receipts)', tcode: 'CPAY01', icon: <CreditCard size={13} /> }
      ]
    },
    {
      key: 'inventory',
      label: 'Materials & Assets',
      icon: <Package size={15} className="text-amber-700 dark:text-amber-400" />,
      items: [
        { id: 'materials', label: 'Materials & Inventory Store', tcode: 'MAT01', icon: <Package size={13} /> },
        { id: 'assets', label: 'Equipment & Asset Register', tcode: 'EQP01', icon: <Server size={13} /> }
      ]
    },
    {
      key: 'expenses',
      label: 'Expenses',
      icon: <TrendingDown size={15} className="text-rose-600 dark:text-rose-400" />,
      items: [
        { id: 'expenses', label: 'Site Expenses Ledger', tcode: 'EXP01', icon: <FileText size={13} /> },
        { id: 'expenses-summary', label: 'Expenses Summary Analysis', tcode: 'EXPS01', icon: <BarChart3 size={13} /> }
      ]
    },
    {
      key: 'dms',
      label: 'Document System',
      icon: <FolderOpen size={15} className="text-blue-600 dark:text-blue-400" />,
      items: [
        { id: 'document-flow', label: 'SAP Document Flow (DF01)', tcode: 'DF01', icon: <GitFork size={13} /> },
        { id: 'dms', label: 'DMS Document Center', tcode: 'DMS01', icon: <FileText size={13} /> }
      ]
    },
    {
      key: 'reports',
      label: 'Reports & BI Studio',
      icon: <BarChart3 size={15} className="text-purple-600 dark:text-purple-400" />,
      items: [
        { id: 'analytics', label: 'Graphs & Analytics (BI)', tcode: 'BI01', icon: <BarChart3 size={13} /> },
        { id: 'site-monthly-summary', label: 'Site Monthly Summary', tcode: 'REP01', icon: <FileText size={13} /> },
        { id: 'daily-site-summary', label: 'Daily Site Summary (AI)', tcode: 'DSR01', icon: <ClipboardCheck size={13} /> },
        { id: 'bill-tracking', label: 'Bill Tracking Workflow', tcode: 'BTR01', icon: <Activity size={13} /> },
        { id: 'financial-year-archive', label: 'Financial Year Archive', tcode: 'FYA01', icon: <Layers size={13} /> }
      ]
    },
    {
      key: 'settings',
      label: 'Settings & Admin',
      icon: <Settings size={15} className="text-slate-600 dark:text-slate-400" />,
      items: [
        { id: 'numbering-settings', label: 'Numbering Settings', tcode: 'NUM01', icon: <Settings size={13} /> },
        { id: 'tcode-master', label: 'SAP T-Code Registry', tcode: 'TCD01', icon: <Settings size={13} /> },
        ...(isAdmin ? [{ id: 'staff-management', label: 'Staff Access Control', tcode: 'STF01', icon: <Users size={13} /> }] : []),
        { id: 'activity-log', label: 'System Audit Logs', tcode: 'AUD01', icon: <Activity size={13} /> }
      ]
    }
  ];

  // Helper to check if a folder contains active tab
  const isFolderActive = (folderItems: { id: string }[]) => {
    return folderItems.some(item => {
      if (currentTab === item.id) return true;
      if (currentTab.startsWith('subcontractors') && item.id.startsWith('subcontractors')) return true;
      return false;
    });
  };

  const handleItemClick = (itemId: string) => {
    setCurrentTab(itemId);
  };

  return (
    <aside 
      className={`bg-[#F1F4F8] dark:bg-[#181B20] border-r border-slate-200 dark:border-slate-800 flex flex-col h-full text-xs select-none transition-all duration-300 z-20 shrink-0 font-sans ${
        isCollapsed ? 'w-14' : 'w-64'
      }`}
      id="enterprise-sidebar"
    >
      {/* Sidebar Header & Quick Toggle */}
      <div className="bg-[#E4ECF4] dark:bg-[#1E2228] border-b border-slate-200 dark:border-slate-800 px-3 py-2.5 flex items-center justify-between shadow-2xs shrink-0">
        {!isCollapsed && (
          <span className="font-bold text-[10px] text-slate-700 dark:text-slate-300 tracking-wider uppercase flex items-center space-x-1.5 font-mono truncate">
            <Server size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />
            <span>Modules Catalog</span>
          </span>
        )}
        <button 
          onClick={() => setIsCollapsed(prev => !prev)}
          className={`p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer ${
            isCollapsed ? 'mx-auto' : 'ml-auto'
          }`}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <Menu size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Folders & Navigation Content */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-1 scrollbar-thin">
        {/* Dashboard Node */}
        <div
          onClick={() => handleItemClick('dashboard')}
          className={`group flex items-center py-2 px-2.5 rounded-md cursor-pointer transition ${
            currentTab === 'dashboard' 
              ? 'bg-blue-600 text-white font-bold shadow-xs' 
              : 'hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
          title={isCollapsed ? "Dashboard (DASH01)" : ""}
        >
          <Home size={16} className={currentTab === 'dashboard' ? 'text-white' : 'text-blue-600 dark:text-blue-400 shrink-0'} />
          {!isCollapsed && (
            <div className="ml-2.5 flex items-center justify-between flex-1 min-w-0">
              <span className="font-bold text-xs truncate">Dashboard Overview</span>
              <span className={`font-mono text-[9px] px-1 py-0.2 rounded shrink-0 ${
                currentTab === 'dashboard' ? 'bg-blue-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
              }`}>
                DASH01
              </span>
            </div>
          )}
        </div>

        {/* Approvals Workflow Node with Pending Badge */}
        {isModuleAllowed('approvals') && (
          <div
            onClick={() => handleItemClick('approvals')}
            className={`group flex items-center py-2 px-2.5 rounded-md cursor-pointer transition ${
              currentTab === 'approvals' 
                ? 'bg-blue-600 text-white font-bold shadow-xs' 
                : 'hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
            title={isCollapsed ? `Approvals (${pendingCount} Pending)` : ""}
          >
            <ShieldCheck size={16} className={currentTab === 'approvals' ? 'text-white' : 'text-amber-500 shrink-0'} />
            {!isCollapsed ? (
              <div className="ml-2.5 flex items-center justify-between flex-1 min-w-0">
                <span className="font-bold text-xs truncate">Approvals Center</span>
                <div className="flex items-center space-x-1 shrink-0">
                  {pendingCount > 0 && (
                    <span className="bg-red-600 text-white font-mono text-[9px] px-1.5 py-0.2 rounded-full font-bold animate-pulse">
                      {pendingCount}
                    </span>
                  )}
                  <span className={`font-mono text-[9px] px-1 py-0.2 rounded ${
                    currentTab === 'approvals' ? 'bg-blue-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}>
                    APP01
                  </span>
                </div>
              </div>
            ) : (
              pendingCount > 0 && (
                <span className="absolute left-8 top-12 bg-red-600 text-white text-[8px] h-4 w-4 flex items-center justify-center rounded-full font-bold shadow-xs">
                  {pendingCount}
                </span>
              )
            )}
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-slate-200 dark:border-slate-800 my-1.5"></div>

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
                className={`group flex items-center py-1.5 px-2.5 rounded-md cursor-pointer transition ${
                  activeFolder && isCollapsed 
                    ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300' 
                    : 'hover:bg-slate-200/60 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                }`}
                title={isCollapsed ? folder.label : ""}
              >
                <div className="flex items-center shrink-0">
                  {folder.icon}
                </div>
                
                {!isCollapsed && (
                  <div className="ml-2.5 flex items-center justify-between flex-1 min-w-0">
                    <span className={`font-bold text-xs truncate ${activeFolder ? 'text-blue-700 dark:text-blue-300' : ''}`}>
                      {folder.label}
                    </span>
                    <div className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200">
                      {isFolderOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    </div>
                  </div>
                )}
              </div>

              {/* Sub-items dropdown */}
              <AnimatePresence initial={false}>
                {!isCollapsed && isFolderOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="ml-3.5 pl-2.5 border-l-2 border-slate-200 dark:border-slate-800 space-y-0.5 my-1">
                      {allowedItems.map((item) => {
                        let isItemActive = currentTab === item.id;
                        if (item.id.startsWith('subcontractors') && currentTab.startsWith('subcontractors')) {
                          if (item.id === 'subcontractors' && currentTab === 'subcontractors') isItemActive = true;
                          else if (item.id === currentTab) isItemActive = true;
                          else isItemActive = false;
                        }

                        return (
                          <div
                            key={item.id}
                            onClick={() => handleItemClick(item.id)}
                            className={`flex items-center justify-between py-1.5 px-2 rounded-md cursor-pointer transition text-xs ${
                              isItemActive 
                                ? 'bg-blue-600 text-white font-bold shadow-xs' 
                                : 'hover:bg-slate-200/80 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            <div className="flex items-center space-x-2 min-w-0">
                              <span className={`shrink-0 ${isItemActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'}`}>
                                {item.icon}
                              </span>
                              <span className="truncate">{item.label}</span>
                            </div>
                            
                            {item.tcode && (
                              <span className={`font-mono text-[8px] font-bold px-1 rounded shrink-0 ml-1 ${
                                isItemActive ? 'bg-blue-700 text-white' : 'bg-slate-200/80 dark:bg-slate-800 text-slate-400'
                              }`}>
                                {item.tcode}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Footer Branding in Sidebar */}
      {!isCollapsed && (
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-[#E4ECF4] dark:bg-[#1E2228] text-[10px] text-slate-500 dark:text-slate-400 shrink-0 font-mono">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-700 dark:text-slate-300 uppercase">SYS_PRD_NODE</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              ONLINE
            </span>
          </div>
          <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">SAP Fiori Inspired ERP</p>
        </div>
      )}
    </aside>
  );
};
