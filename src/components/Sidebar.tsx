import React, { useState } from 'react';
import { 
  ChevronRight, ChevronDown, Folder, FolderOpen, FileText, 
  Users, HardHat, Building2, Receipt, CreditCard, Package,
  Layers, Wallet, ChevronLeft, Menu, Activity, Settings, Home,
  FileSpreadsheet, ShieldAlert, GitFork, BarChart3, Database,
  TrendingDown, Server
} from 'lucide-react';
import { useAppContext } from '../store';

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

  const pendingApprovalsCount = (approvals?.filter((a: any) => a.status === 'Pending').length || 0) +
    (advanceSheetApprovals?.filter((s: any) => s.status === 'Pending').length || 0) +
    (kharchiApprovals?.filter((s: any) => s.status === 'Pending').length || 0) +
    (paymentSheetApprovals?.filter((s: any) => s.status === 'Pending').length || 0) +
    (expensesLedger?.filter((e: any) => e.status === 'Submitted').length || 0);

  // Expandable group states
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'project-mgmt': false,
    'worker-mgmt': false,
    'attendance': false,
    'wft': true, // Keep open for quick access
    'worker-payment': false,
    'billing': false,
    'client-payments': false,
    'boq': false,
    'materials': false,
    'subcontractors': false,
    'reports': false,
    'admin': false,
  });

  const toggleGroup = (key: string) => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setExpandedGroups(prev => ({ ...prev, [key]: true }));
    } else {
      setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
    }
  };

  const isAdmin = user?.username === 'saddamsne' || user?.username === 'rejatousifsne';

  // Specific groups requested by the user
  const groupsConfig = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      isDirect: true,
      id: 'dashboard',
      tcode: 'DASH01',
      icon: <Home size={14} className="text-[#0A6ED1]" />
    },
    {
      key: 'project-mgmt',
      label: 'Project Management',
      icon: <Building2 size={14} className="text-[#5F6B75]" />,
      items: [
        { id: 'projects', label: 'Projects Master', tcode: 'PRJ01' }
      ]
    },
    {
      key: 'worker-mgmt',
      label: 'Worker Management',
      icon: <Users size={14} className="text-[#5F6B75]" />,
      items: [
        { id: 'workers', label: 'Worker Master', tcode: 'WRK01' }
      ]
    },
    {
      key: 'attendance',
      label: 'Site Reports & Attendance',
      icon: <HardHat size={14} className="text-[#5F6B75]" />,
      items: [
        { id: 'dpr', label: 'Daily Progress Report', tcode: 'DPR01' },
        { id: 'dlr', label: 'Daily Attendance (DLR)', tcode: 'DLR01' }
      ]
    },
    {
      key: 'wft',
      label: 'Worker Financial Transactions',
      icon: <Wallet size={14} className="text-[#0A6ED1]" />,
      items: [
        { id: 'advance', label: 'Worker Transactions (WFT01)', tcode: 'WFT01' },
        { id: 'kharchi', label: 'Worker Kharchi Ledger', tcode: 'KHAR01' },
        { id: 'worker-ledger', label: 'Worker Ledger & Recovery', tcode: 'WKL01' }
      ]
    },
    {
      key: 'worker-payment',
      label: 'Worker Payment',
      icon: <CreditCard size={14} className="text-[#5F6B75]" />,
      items: [
        { id: 'worker-payment', label: 'Worker Payment Settlement', tcode: 'PAY01' }
      ]
    },
    {
      key: 'billing',
      label: 'Billing & Tax',
      icon: <Receipt size={14} className="text-[#5F6B75]" />,
      items: [
        { id: 'billing', label: 'RA Billing Management', tcode: 'BIL01' },
        { id: 'gst-register', label: 'GST Payment & Filing Register', tcode: 'GST01' }
      ]
    },
    {
      key: 'client-payments',
      label: 'Client Payments',
      icon: <CreditCard size={14} className="text-[#5F6B75]" />,
      items: [
        { id: 'client-payment', label: 'Client Payments & Receipts', tcode: 'CPAY01' }
      ]
    },
    {
      key: 'boq',
      label: 'BOQ',
      icon: <FileSpreadsheet size={14} className="text-[#5F6B75]" />,
      items: [
        { id: 'boqs', label: 'BOQ Master', tcode: 'BOQ01' }
      ]
    },
    {
      key: 'materials',
      label: 'Materials',
      icon: <Package size={14} className="text-[#5F6B75]" />,
      items: [
        { id: 'materials', label: 'Materials & Store', tcode: 'MAT01' },
        { id: 'assets', label: 'Equipment & Asset Register', tcode: 'EQP01' }
      ]
    },
    {
      key: 'subcontractors',
      label: 'Subcontractors',
      icon: <Server size={14} className="text-[#5F6B75]" />,
      items: [
        { id: 'subcontractors', label: 'Cockpit & Dashboard', tcode: 'SC01' },
        { id: 'subcontractors-master', label: 'Subcontractor Directory', tcode: 'SCM01' },
        { id: 'subcontractors-billing', label: 'Subcontractor Bills', tcode: 'SCB01' },
        { id: 'subcontractors-payments', label: 'Subcontractor Payments', tcode: 'SCP01' },
        { id: 'subcontractors-ledger', label: 'Reconciliation Ledger', tcode: 'SCL01' },
        { id: 'subcontractors-audit', label: 'Audit Trail Logs', tcode: 'SCA01' }
      ]
    },
    {
      key: 'reports',
      label: 'Reports',
      icon: <BarChart3 size={14} className="text-[#5F6B75]" />,
      items: [
        { id: 'site-monthly-summary', label: 'Site Monthly Summary', tcode: 'REP01' },
        { id: 'analytics', label: 'Graphs & Analytics (BI)', tcode: 'BI01' },
        { id: 'daily-site-summary', label: 'Daily Site Summary (AI)', tcode: 'DSR01' },
        { id: 'bill-tracking', label: 'Bill Tracking Workflow', tcode: 'BTR01' },
        { id: 'floor-abstracts', label: 'Floor Abstracts', tcode: 'FLR01' },
        { id: 'financial-year-archive', label: 'Financial Year Archive', tcode: 'FYA01' },
        { id: 'document-flow', label: 'SAP Document Flow (DF01)', tcode: 'DF01' },
        { id: 'dms', label: 'DMS Document Center', tcode: 'DMS01' },
        { id: 'expenses', label: 'Site Expenses Ledger', tcode: 'EXP01' },
        { id: 'expenses-summary', label: 'Expenses Summary', tcode: 'EXPS01' },
        { id: 'mess', label: 'Site Mess Management', tcode: 'MESS01' }
      ]
    },
    {
      key: 'admin',
      label: 'Administration',
      icon: <Settings size={14} className="text-[#5F6B75]" />,
      items: [
        { id: 'approvals', label: 'Pending Approvals', tcode: 'APR01', badge: pendingApprovalsCount },
        ...(isAdmin ? [{ id: 'staff-management', label: 'Staff Access Control', tcode: 'STF01' }] : []),
        { id: 'numbering-settings', label: 'Document Numbering', tcode: 'NUM01' },
        { id: 'tcode-master', label: 'SAP T-Code Registry', tcode: 'TCD01' },
        { id: 'activity-log', label: 'System Audit Logs', tcode: 'AUD01' }
      ]
    }
  ];

  return (
    <aside 
      className={`bg-[#f4f7f8] border-r border-[#bcc8d0] flex flex-col h-full text-[12px] select-none transition-all duration-150 z-20 shrink-0 font-sans ${
        isCollapsed ? 'w-10' : 'w-64'
      }`}
      id="sap-enterprise-sidebar"
    >
      {/* Sidebar Header: SNE Easy Access Title */}
      <div className="bg-[#edf3f7] border-b border-[#bcc8d0] px-2.5 py-1.5 flex items-center justify-between shrink-0 h-[32px]">
        {!isCollapsed && (
          <span className="font-bold text-[11px] text-[#303b44] tracking-wide uppercase flex items-center space-x-1.5 truncate">
            <FolderOpen size={13} className="text-[#2d6f91]" />
            <span>SNE Easy Access</span>
          </span>
        )}
        <button 
          onClick={() => setIsCollapsed(prev => !prev)}
          className={`p-1 hover:bg-[#dcecf6] rounded-none text-[#303b44] flex items-center justify-center cursor-pointer ${
            isCollapsed ? 'mx-auto' : 'ml-auto'
          }`}
          title={isCollapsed ? "Expand Menu" : "Collapse Menu"}
        >
          {isCollapsed ? <Menu size={13} /> : <ChevronLeft size={13} />}
        </button>
      </div>

      {/* Navigation Groups List */}
      <div className="flex-1 overflow-y-auto p-1 space-y-0.5 scrollbar-thin">
        {groupsConfig.map(group => {
          if (group.isDirect) {
            const isActive = currentTab === group.id;
            return (
              <div
                key={group.key}
                onClick={() => setCurrentTab(group.id!)}
                className={`flex items-center px-2 py-1.5 rounded-none cursor-pointer transition ${
                  isActive 
                    ? 'bg-[#dcecf6] text-[#2d6f91] font-bold border border-[#bcc8d0]' 
                    : 'text-[#303b44] hover:bg-[#edf2f5]'
                }`}
                title={isCollapsed ? `${group.label} (${group.tcode})` : undefined}
              >
                <div className="shrink-0">{group.icon}</div>
                {!isCollapsed && (
                  <div className="ml-2 flex items-center justify-between flex-1 min-w-0">
                    <span className="truncate">{group.label}</span>
                    <span className="text-[10px] font-mono font-semibold text-[#63717b] bg-white border border-[#bcc8d0] px-1 rounded-none ml-1">
                      {group.tcode}
                    </span>
                  </div>
                )}
              </div>
            );
          }

          const isExpanded = expandedGroups[group.key];
          const hasActiveItem = group.items?.some(i => i.id === currentTab || (currentTab.startsWith('subcontractors') && i.id.startsWith('subcontractors')));

          return (
            <div key={group.key} className="space-y-0.5">
              {/* Group Header */}
              <div
                onClick={() => toggleGroup(group.key)}
                className={`flex items-center px-2 py-1.5 rounded-none cursor-pointer transition ${
                  hasActiveItem && !isExpanded
                    ? 'bg-[#dcecf6] text-[#2d6f91] font-bold'
                    : 'text-[#303b44] hover:bg-[#edf2f5]'
                }`}
                title={isCollapsed ? group.label : undefined}
              >
                <div className="shrink-0 flex items-center">
                  {!isCollapsed && (
                    <span className="mr-1 text-[#63717b]">
                      {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                    </span>
                  )}
                  {isExpanded ? (
                    <FolderOpen size={13} className="text-[#2d6f91]" />
                  ) : (
                    <Folder size={13} className="text-[#63717b]" />
                  )}
                </div>

                {!isCollapsed && (
                  <div className="ml-2 flex items-center justify-between flex-1 min-w-0">
                    <span className={`truncate ${hasActiveItem ? 'font-bold text-[#2d6f91]' : 'font-semibold text-[#303b44]'}`}>
                      {group.label}
                    </span>
                  </div>
                )}
              </div>

              {/* Group Children Items */}
              {!isCollapsed && isExpanded && group.items && (
                <div className="ml-3 pl-1.5 border-l border-[#bcc8d0] space-y-0.5">
                  {group.items.map(item => {
                    const isItemActive = currentTab === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setCurrentTab(item.id)}
                        className={`flex items-center justify-between px-2 py-1 rounded-none cursor-pointer transition text-[11px] ${
                          isItemActive 
                            ? 'bg-[#dcecf6] text-[#2d6f91] font-bold border-l-2 border-[#4d91ba]' 
                            : 'text-[#303b44] hover:bg-[#edf2f5]'
                        }`}
                      >
                        <div className="flex items-center space-x-1.5 min-w-0">
                          <FileText size={11} className={isItemActive ? 'text-[#2d6f91]' : 'text-[#8c9ba8]'} />
                          <span className="truncate">{item.label}</span>
                        </div>
                        <div className="flex items-center space-x-1 shrink-0 ml-1">
                          {item.badge && item.badge > 0 ? (
                            <span className="bg-rose-600 text-white font-mono text-[9px] font-bold px-1 rounded-none">
                              {item.badge}
                            </span>
                          ) : null}
                          <span className="text-[9px] font-mono text-[#63717b] bg-white border border-[#bcc8d0] px-1 rounded-none">
                            {item.tcode}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      {!isCollapsed && (
        <div className="bg-[#edf3f7] border-t border-[#bcc8d0] px-2 py-1 text-[10px] text-[#63717b] flex items-center justify-between shrink-0">
          <span className="font-mono">SYS: SNE_ERP</span>
          <span className="font-mono">CLNT: 100</span>
        </div>
      )}
    </aside>
  );
};
