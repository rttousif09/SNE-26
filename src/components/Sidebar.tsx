import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Database, Folder, FileText, Server, ClipboardCheck, Users, Activity, Settings } from 'lucide-react';
import { useAppContext } from '../store';
import { motion, AnimatePresence } from 'motion/react';
import { ExpandableSection } from './AnimatedERP';


interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab }) => {
  const [expanded, setExpanded] = useState(true);
  const [catalogExpanded, setCatalogExpanded] = useState(true);
  const { approvals, advanceSheetApprovals, kharchiApprovals, paymentSheetApprovals, expensesLedger, user } = useAppContext();

  const pendingCount = (approvals?.filter(a => a.status === 'Pending').length || 0) +
    (advanceSheetApprovals?.filter(s => s.status === 'Pending').length || 0) +
    (kharchiApprovals?.filter(s => s.status === 'Pending').length || 0) +
    (paymentSheetApprovals?.filter(s => s.status === 'Pending').length || 0) +
    (expensesLedger?.filter(e => e.status === 'Submitted').length || 0);

  // States to track expansion of each defined folder
  const [foldersExpanded, setFoldersExpanded] = useState<Record<string, boolean>>({
    projectDetails: true,
    workerManagement: true,
    payrollLabour: true,
    billingAccounts: true,
    materialInventory: true,
    systemAdmin: true,
  });

  const toggleFolder = (key: string) => {
    setFoldersExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const folders = [
    {
      key: 'projectDetails',
      label: 'a) Project Details',
      items: [
        { id: 'projects', label: '1) Projects' },
        { id: 'site-monthly-summary', label: '2) Site Monthly Report' },
        { id: 'daily-site-summary', label: '3) AI Daily Site Summary' }
      ]
    },
    {
      key: 'workerManagement',
      label: 'b) Worker Management',
      items: [
        { id: 'workers', label: '1) Workers Management' },
        { id: 'dlr', label: '2) DLR' },
        { id: 'worker-ledger', label: '3) Worker Ledger & Holds' },
        { id: 'floor-abstracts', label: '4) Floor Abstract' }
      ]
    },
    {
      key: 'payrollLabour',
      label: 'c) Payroll and Labour Payments',
      items: [
        { id: 'kharchi', label: '1) Kharchi' },
        { id: 'mess', label: '2) Mess' },
        { id: 'advance', label: '3) Advance' },
        { id: 'worker-payment', label: '4) Workers payment' }
      ]
    },
    {
      key: 'billingAccounts',
      label: 'd) Billing & Accounts',
      items: [
        { id: 'billing', label: '1) Billing Management' },
        { id: 'client-payment', label: '2) Client Payment' },
        { id: 'expenses', label: '3) Expenses Ledger' },
        { id: 'expenses-summary', label: '4) Expenses Summary Dashboard' },
        { id: 'bill-tracking', label: '5) Bill Tracking Workflow' },
        { id: 'financial-year-archive', label: '6) FY Archive & Closing' },
        { id: 'subcontractors', label: '7) Subcontractor Management' }
      ]
    },
    {
      key: 'materialInventory',
      label: 'e) Material & Inventory',
      items: [
        { id: 'materials', label: '1) Material & Inventory ERP' },
        { id: 'assets', label: '2) Equipment & Asset Register' }
      ]
    }
  ];

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

  return (
    <div className="w-64 bg-white border-r border-[#8c9ba8] flex flex-col h-full text-[11px] select-none">
      <div className="bg-[#eef2f6] border-b border-[#8c9ba8] px-2 py-1 flex items-center space-x-1">
        <span className="font-semibold">Systems</span>
        <div className="flex-1"></div>
        <div className="flex space-x-1">
          <div className="w-3 h-3 border border-gray-400 bg-white"></div>
          <div className="w-3 h-3 border border-gray-400 bg-white"></div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-1">
        {/* Tree Node 1 */}
        <div className="flex items-center space-x-1 py-0.5 cursor-pointer hover:bg-[#e6f2ff]" onClick={() => setExpanded(!expanded)}>
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          <Database size={12} className="text-[#0056b3]" />
          <span className="font-medium">ERP_PRD (SYSTEM)</span>
        </div>
        
        <AnimatePresence initial={false}>
          {expanded && (
            <ExpandableSection isOpen={expanded}>
              <div className="ml-4">
                <div className="flex items-center space-x-1 py-0.5 cursor-pointer hover:bg-[#e6f2ff]" onClick={() => setCatalogExpanded(!catalogExpanded)}>
                  {catalogExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <Folder size={12} className="text-yellow-500 fill-yellow-200" />
                  <span>Catalog</span>
                </div>
                
                <AnimatePresence initial={false}>
                  {catalogExpanded && (
                    <ExpandableSection isOpen={catalogExpanded}>
                      <div className="ml-4 space-y-1">
                        {/* 1. Dashboard Overview at Root of Catalog */}
                        <div
                          onClick={() => setCurrentTab('dashboard')}
                          className={`flex items-center space-x-1 py-0.5 cursor-pointer ${currentTab === 'dashboard' ? 'bg-[#cce8ff] border border-[#99d1ff]' : 'hover:bg-[#e6f2ff] border border-transparent'}`}
                        >
                          <div className="w-3"></div>
                          <Server size={12} className="text-[#0056b3]" />
                          <span className="font-semibold text-[#002f6c]">Dashboard Overview</span>
                        </div>

                        {/* 2. Approvals Workflow at Root of Catalog */}
                        {isModuleAllowed('approvals') && (
                          <div
                            onClick={() => setCurrentTab('approvals')}
                            className={`flex items-center space-x-1 py-0.5 pr-2 cursor-pointer ${currentTab === 'approvals' ? 'bg-[#cce8ff] border border-[#99d1ff]' : 'hover:bg-[#e6f2ff] border border-transparent'}`}
                          >
                            <div className="w-3"></div>
                            <ClipboardCheck size={12} className="text-[#0056b3]" />
                            <span className="font-semibold text-[#002f6c] flex-1">Approvals Workflow</span>
                            {pendingCount > 0 && (
                              <span className="bg-red-650 text-white font-mono text-[9px] px-1.5 py-0.2 rounded-sm font-bold animate-pulse" title={`${pendingCount} requests pending approval`}>
                                {pendingCount}
                              </span>
                            )}
                          </div>
                        )}

                        {/* 3. System Activity Log at Root of Catalog */}
                        {isModuleAllowed('activity-log') && (
                          <div
                            onClick={() => setCurrentTab('activity-log')}
                            className={`flex items-center space-x-1 py-0.5 pr-2 cursor-pointer ${currentTab === 'activity-log' ? 'bg-[#cce8ff] border border-[#99d1ff]' : 'hover:bg-[#e6f2ff] border border-transparent'}`}
                          >
                            <div className="w-3"></div>
                            <Activity size={12} className="text-[#0056b3]" />
                            <span className="font-semibold text-[#002f6c] flex-1">System Activity Log</span>
                          </div>
                        )}

                        {/* Collapsible Folders */}
                        {folders.map((folder) => {
                          const isFolderOpen = foldersExpanded[folder.key];
                          const allowedItems = folder.items.filter(item => isModuleAllowed(item.id));
                          if (allowedItems.length === 0) return null;
                          return (
                            <div key={folder.key} className="space-y-0.5">
                              <div 
                                onClick={() => toggleFolder(folder.key)}
                                className="flex items-center space-x-1 py-0.5 cursor-pointer hover:bg-[#e6f2ff] font-medium text-gray-700 hover:text-gray-900"
                              >
                                <div className="w-3 flex justify-center">
                                  {isFolderOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                                </div>
                                <Folder size={11} className="text-amber-500 fill-amber-150" />
                                <span>{folder.label}</span>
                              </div>

                              <AnimatePresence initial={false}>
                                {isFolderOpen && (
                                  <ExpandableSection isOpen={isFolderOpen}>
                                    <div className="ml-3 border-l border-gray-300 pl-1.5 space-y-0.5">
                                      {allowedItems.map((item) => {
                                        const isActive = currentTab === item.id;
                                        return (
                                          <div
                                            key={item.id}
                                            onClick={() => setCurrentTab(item.id)}
                                            className={`flex items-center space-x-1 py-0.5 cursor-pointer ${isActive ? 'bg-[#cce8ff] border border-[#99d1ff]' : 'hover:bg-[#e6f2ff] border border-transparent'}`}
                                          >
                                            <FileText size={11} className="text-[#0056b3]" />
                                            <span>{item.label}</span>
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

                        {/* System Admin Tools */}
                        {isAdmin && (
                          <div className="space-y-0.5">
                            <div 
                              onClick={() => toggleFolder('systemAdmin')}
                              className="flex items-center space-x-1 py-0.5 cursor-pointer hover:bg-[#e6f2ff] font-medium text-gray-700 hover:text-blue-900"
                            >
                              <div className="w-3 flex justify-center">
                                {foldersExpanded.systemAdmin ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                              </div>
                              <Folder size={11} className="text-blue-700 fill-blue-100" />
                              <span className="font-bold text-blue-900">f) System Administration</span>
                            </div>

                            <AnimatePresence initial={false}>
                              {foldersExpanded.systemAdmin && (
                                <ExpandableSection isOpen={foldersExpanded.systemAdmin}>
                                  <div className="ml-3 border-l border-blue-400 pl-1.5 space-y-0.5">
                                    <div
                                      onClick={() => setCurrentTab('staff-management')}
                                      className={`flex items-center space-x-1 py-0.5 cursor-pointer ${currentTab === 'staff-management' ? 'bg-[#cce8ff] border border-[#99d1ff]' : 'hover:bg-[#e6f2ff] border border-transparent'}`}
                                    >
                                      <Users size={11} className="text-blue-700" />
                                      <span className="font-semibold text-blue-950">Add & Manage Staff</span>
                                    </div>
                                    <div
                                      onClick={() => setCurrentTab('numbering-settings')}
                                      className={`flex items-center space-x-1 py-0.5 cursor-pointer ${currentTab === 'numbering-settings' ? 'bg-[#cce8ff] border border-[#99d1ff]' : 'hover:bg-[#e6f2ff] border border-transparent'}`}
                                    >
                                      <Settings size={11} className="text-blue-700" />
                                      <span className="font-semibold text-blue-950">Numbering Settings</span>
                                    </div>
                                  </div>
                                </ExpandableSection>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>
                    </ExpandableSection>
                  )}
                </AnimatePresence>
                
                <div className="flex items-center space-x-1 py-0.5 cursor-pointer hover:bg-[#e6f2ff]">
                  <ChevronRight size={12} />
                  <Folder size={12} className="text-yellow-500 fill-yellow-200" />
                  <span>Provisioning</span>
                </div>
                <div className="flex items-center space-x-1 py-0.5 cursor-pointer hover:bg-[#e6f2ff]">
                  <ChevronRight size={12} />
                  <Folder size={12} className="text-yellow-500 fill-yellow-200" />
                  <span>Security</span>
                </div>
              </div>
            </ExpandableSection>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
