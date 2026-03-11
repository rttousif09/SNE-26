import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Database, Folder, FileText, Server } from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab }) => {
  const [expanded, setExpanded] = useState(true);
  const [catalogExpanded, setCatalogExpanded] = useState(true);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard Overview', icon: Server },
    { id: 'projects', label: 'Projects', icon: Folder },
    { id: 'workers', label: 'Workers Management', icon: Folder },
    { id: 'billing', label: 'Billing Management', icon: Folder },
    { id: 'client-payment', label: 'Client Payment', icon: Folder },
    { id: 'kharchi', label: 'Kharchi (Pocket Money)', icon: Folder },
    { id: 'advance', label: 'Advance', icon: Folder },
    { id: 'worker-payment', label: 'Workers Payment', icon: Folder },
  ];

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
        
        {expanded && (
          <div className="ml-4">
            <div className="flex items-center space-x-1 py-0.5 cursor-pointer hover:bg-[#e6f2ff]" onClick={() => setCatalogExpanded(!catalogExpanded)}>
              {catalogExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <Folder size={12} className="text-yellow-500 fill-yellow-200" />
              <span>Catalog</span>
            </div>
            
            {catalogExpanded && (
              <div className="ml-4">
                {navItems.map((item) => {
                  const isActive = currentTab === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setCurrentTab(item.id)}
                      className={`flex items-center space-x-1 py-0.5 cursor-pointer ${isActive ? 'bg-[#cce8ff] border border-[#99d1ff]' : 'hover:bg-[#e6f2ff] border border-transparent'}`}
                    >
                      <div className="w-3"></div>
                      <FileText size={12} className="text-[#0056b3]" />
                      <span>{item.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
            
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
        )}
      </div>
    </div>
  );
};
