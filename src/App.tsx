/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider } from './store';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { Workers } from './pages/Workers';
import { Billing } from './pages/Billing';
import { ClientPayment } from './pages/ClientPayment';
import { Kharchi } from './pages/Kharchi';
import { Advance } from './pages/Advance';
import { WorkerPayment } from './pages/WorkerPayment';
import { Server, X } from 'lucide-react';

function AppContent() {
  const [currentTab, setCurrentTab] = useState('dashboard');

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard': return <Dashboard />;
      case 'projects': return <Projects />;
      case 'workers': return <Workers />;
      case 'billing': return <Billing />;
      case 'client-payment': return <ClientPayment />;
      case 'kharchi': return <Kharchi />;
      case 'advance': return <Advance />;
      case 'worker-payment': return <WorkerPayment />;
      default: return <Dashboard />;
    }
  };

  const getTabName = () => {
    switch (currentTab) {
      case 'dashboard': return 'Overview';
      case 'projects': return 'Projects';
      case 'workers': return 'Workers Management';
      case 'billing': return 'Billing Management';
      case 'client-payment': return 'Client Payment';
      case 'kharchi': return 'Kharchi';
      case 'advance': return 'Advance';
      case 'worker-payment': return 'Workers Payment';
      default: return 'Overview';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--color-sap-bg)] text-[11px] font-sans overflow-hidden">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Editor Tabs */}
          <div className="flex items-end bg-[#eef2f6] pt-1 px-1 border-b border-[#8c9ba8]">
            <div className="flex items-center bg-white border border-[#8c9ba8] border-b-transparent px-3 py-1 rounded-t-sm space-x-2 relative top-[1px] z-10">
              <Server size={12} className="text-[#0056b3]" />
              <span className="font-semibold text-[11px]">ERP_PRD - {getTabName()}</span>
              <X size={12} className="text-gray-500 hover:text-red-500 cursor-pointer ml-2" />
            </div>
          </div>
          
          {/* Main Editor Area */}
          <main className="flex-1 overflow-y-auto bg-white p-2">
            {renderContent()}
          </main>

          {/* Bottom Panel */}
          <div className="h-48 border-t border-[#8c9ba8] bg-white flex flex-col">
            <div className="flex items-end bg-[#eef2f6] pt-1 px-1 border-b border-[#8c9ba8]">
              <div className="flex items-center bg-white border border-[#8c9ba8] border-b-transparent px-3 py-0.5 rounded-t-sm space-x-2 relative top-[1px] z-10">
                <span className="text-[11px]">Properties</span>
              </div>
              <div className="flex items-center bg-[#d9e4f1] border border-[#8c9ba8] border-b-transparent px-3 py-0.5 rounded-t-sm space-x-2 ml-1 cursor-pointer">
                <span className="text-[11px]">Error Log</span>
              </div>
            </div>
            <div className="flex-1 p-2 overflow-y-auto text-[11px] sap-panel">
              <table className="w-full text-left border-collapse border border-[#8c9ba8]">
                <thead className="sap-header">
                  <tr>
                    <th className="border border-[#8c9ba8] px-2 py-1 font-normal w-1/3">Property</th>
                    <th className="border border-[#8c9ba8] px-2 py-1 font-normal">Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="hover:bg-[#e6f2ff] cursor-default">
                    <td className="border border-[#8c9ba8] px-2 py-1">System Status</td>
                    <td className="border border-[#8c9ba8] px-2 py-1 flex items-center"><div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div> All services started</td>
                  </tr>
                  <tr className="hover:bg-[#e6f2ff] cursor-default">
                    <td className="border border-[#8c9ba8] px-2 py-1">Current View</td>
                    <td className="border border-[#8c9ba8] px-2 py-1">{getTabName()}</td>
                  </tr>
                  <tr className="hover:bg-[#e6f2ff] cursor-default">
                    <td className="border border-[#8c9ba8] px-2 py-1">Last Update</td>
                    <td className="border border-[#8c9ba8] px-2 py-1">{new Date().toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      {/* Status Bar */}
      <div className="h-5 bg-[#d9e4f1] border-t border-[#8c9ba8] flex items-center px-2 text-[10px] text-gray-800">
        <span>System: ERP_PRD Host: erp.local Instance: 00 Connected User: SYSTEM</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

