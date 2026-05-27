/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useAppContext } from './store';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Login } from './components/Login';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { Workers } from './pages/Workers';
import { Billing } from './pages/Billing';
import { ClientPayment } from './pages/ClientPayment';
import { Kharchi } from './pages/Kharchi';
import { Advance } from './pages/Advance';
import { WorkerPayment } from './pages/WorkerPayment';
import { Approvals } from './pages/Approvals';
import { Expenses } from './pages/Expenses';
import { ExpensesSummary } from './pages/ExpensesSummary';
import { Server, X, ChevronDown, ChevronUp, Download, Upload } from 'lucide-react';

function AppContent({ user, onLogout }: { user: { username: string; name: string } | null; onLogout: () => void }) {
  const erp = useAppContext();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [bottomTab, setBottomTab] = useState<'properties' | 'error-log' | 'backup'>('properties');
  const [isBottomMinimized, setIsBottomMinimized] = useState(false);
  const [backupFileError, setBackupFileError] = useState<string | null>(null);
  const [backupSuccess, setBackupSuccess] = useState<string | null>(null);

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
      case 'approvals': return <Approvals />;
      case 'expenses': return <Expenses />;
      case 'expenses-summary': return <ExpensesSummary />;
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
      case 'approvals': return 'Approvals Workflow';
      case 'expenses': return 'Expenses Ledger';
      case 'expenses-summary': return 'Expenses Summary Dashboard';
      default: return 'Overview';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--color-sap-bg)] text-[11px] font-sans overflow-hidden">
      <TopBar user={user} onLogout={onLogout} />
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
          <div className={`${isBottomMinimized ? 'h-[23px]' : 'h-32'} border-t border-[#8c9ba8] bg-white flex flex-col transition-all duration-150`}>
            <div className="flex items-end justify-between bg-[#eef2f6] px-1 border-b border-[#8c9ba8] select-none h-[22px]">
              <div className="flex items-end">
                <button
                  onClick={() => { setBottomTab('properties'); setIsBottomMinimized(false); }}
                  className={`flex items-center px-3 py-0.5 rounded-t-sm space-x-2 relative top-[1px] z-10 border border-[#8c9ba8] text-[10px] ${bottomTab === 'properties' && !isBottomMinimized ? 'bg-white border-b-transparent font-semibold text-[#0056b3]' : 'bg-[#d9e4f1] hover:bg-white cursor-pointer ml-0.5'}`}
                >
                  <span>Properties</span>
                </button>
                <button
                  onClick={() => { setBottomTab('error-log'); setIsBottomMinimized(false); }}
                  className={`flex items-center px-3 py-0.5 rounded-t-sm space-x-2 relative top-[1px] z-10 border border-[#8c9ba8] ml-1 text-[10px] ${bottomTab === 'error-log' && !isBottomMinimized ? 'bg-white border-b-transparent font-semibold text-[#0056b3]' : 'bg-[#d9e4f1] hover:bg-white cursor-pointer'}`}
                >
                  <span>Error Log</span>
                </button>
                <button
                  onClick={() => { setBottomTab('backup'); setIsBottomMinimized(false); }}
                  className={`flex items-center px-3 py-0.5 rounded-t-sm space-x-2 relative top-[1px] z-10 border border-[#8c9ba8] ml-1 text-[10px] ${bottomTab === 'backup' && !isBottomMinimized ? 'bg-white border-b-transparent font-semibold text-[#0056b3]' : 'bg-[#d9e4f1] hover:bg-white cursor-pointer'}`}
                >
                  <span className="font-bold text-green-700">DB Backup & Sync</span>
                </button>
              </div>
              <button
                onClick={() => setIsBottomMinimized(!isBottomMinimized)}
                className="p-0.5 hover:bg-gray-300 rounded cursor-pointer mr-1 mb-0.5"
                title={isBottomMinimized ? "Expand properties panel" : "Collapse properties panel"}
              >
                {isBottomMinimized ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>
            </div>
            
            {!isBottomMinimized && (
              <div className="flex-1 p-2 overflow-y-auto text-[11px] sap-panel">
                {bottomTab === 'properties' && (
                  <table className="w-full text-left border-collapse border border-[#8c9ba8]">
                    <thead className="sap-header">
                      <tr>
                        <th className="border border-[#8c9ba8] px-2 py-0.5 font-normal w-1/3">Property</th>
                        <th className="border border-[#8c9ba8] px-2 py-0.5 font-normal">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="hover:bg-[#e6f2ff] cursor-default">
                        <td className="border border-[#8c9ba8] px-2 py-0.5">Offline Storage Type</td>
                        <td className="border border-[#8c9ba8] px-2 py-0.5 font-mono text-green-700 font-bold">IndexedDB (Permanent Local)</td>
                      </tr>
                      <tr className="hover:bg-[#e6f2ff] cursor-default">
                        <td className="border border-[#8c9ba8] px-2 py-0.5">System Status</td>
                        <td className="border border-[#8c9ba8] px-2 py-0.5 flex items-center h-4">
                          <div className={`w-2 h-2 rounded-full mr-1.5 ${erp.isDbLoaded ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></div> 
                          {erp.isDbLoaded ? 'IndexedDB Sync Active (All services started)' : 'Connecting to database...'}
                        </td>
                      </tr>
                      <tr className="hover:bg-[#e6f2ff] cursor-default">
                        <td className="border border-[#8c9ba8] px-2 py-0.5">Current View</td>
                        <td className="border border-[#8c9ba8] px-2 py-0.5">{getTabName()}</td>
                      </tr>
                      <tr className="hover:bg-[#e6f2ff] cursor-default">
                        <td className="border border-[#8c9ba8] px-2 py-0.5">Last DB Update</td>
                        <td className="border border-[#8c9ba8] px-2 py-0.5 font-mono">{new Date().toLocaleTimeString()} (Auto-persistent)</td>
                      </tr>
                    </tbody>
                  </table>
                )}

                {bottomTab === 'error-log' && (
                  <div className="text-gray-500 italic p-1 border border-dashed border-[#8c9ba8]">
                    No database logs or sync errors recorded. Native IndexedDB instance healthy.
                  </div>
                )}

                {bottomTab === 'backup' && (
                  <div className="flex flex-col space-y-2 p-1">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => {
                          const backupData = {
                            projects: erp.projects,
                            workers: erp.workers,
                            billings: erp.billings,
                            clientPayments: erp.clientPayments,
                            kharchis: erp.kharchis,
                            advances: erp.advances,
                            workerPayments: erp.workerPayments
                          };
                          const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backupData, null, 2))}`;
                          const a = document.createElement('a');
                          a.setAttribute('href', jsonString);
                          a.setAttribute('download', `erp_sap_backup_${new Date().toISOString().split('T')[0]}.json`);
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                          setBackupSuccess('Data backup JSON file generated and downloaded successfully!');
                          setTimeout(() => setBackupSuccess(null), 4000);
                        }}
                        className="sap-btn flex items-center space-x-1 p-2 bg-[#eef2f6]"
                      >
                        <Download size={13} className="text-green-700 font-bold" />
                        <span className="font-semibold text-green-700">Export JSON Backup file</span>
                      </button>

                      <div className="flex items-center space-x-2 border border-[#8c9ba8] p-1.5 bg-gray-50 rounded-sm">
                        <Upload size={13} className="text-blue-700" />
                        <span className="font-semibold">Import JSON Backup:</span>
                        <input
                          type="file"
                          accept=".json"
                          onChange={(e) => {
                            const fileReader = new FileReader();
                            if (e.target.files && e.target.files[0]) {
                              fileReader.readAsText(e.target.files[0], "UTF-8");
                              fileReader.onload = async (readerEvent) => {
                                try {
                                  const backupObj = JSON.parse(readerEvent.target?.result as string);
                                  const imported = await erp.importBackup(backupObj);
                                  if (imported) {
                                    setBackupSuccess('IndexedDB & memory store imported & synced perfectly!');
                                    setBackupFileError(null);
                                    setTimeout(() => setBackupSuccess(null), 4500);
                                  } else {
                                    setBackupFileError('Backup import declined: Invalid data structure schema.');
                                  }
                                } catch (err) {
                                  setBackupFileError('Failed to parse selected JSON data file.');
                                }
                              };
                            }
                          }}
                          className="text-[10px] cursor-pointer text-gray-700"
                        />
                      </div>
                    </div>

                    {backupSuccess && (
                      <div className="p-1 px-2 border border-green-500 bg-green-50 text-green-800 rounded font-semibold animate-fade-in text-[10px]">
                        ✓ {backupSuccess}
                      </div>
                    )}
                    {backupFileError && (
                      <div className="p-1 px-2 border border-red-500 bg-red-50 text-red-800 rounded font-semibold animate-fade-in text-[10px]">
                        ⚠ {backupFileError}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Status Bar */}
      <div className="h-5 bg-[#d9e4f1] border-t border-[#8c9ba8] flex items-center px-2 text-[10px] text-gray-800 justify-between">
        <span>System: ERP_PRD Host: erp.local Instance: 00 Connected User: {user ? user.username : 'SYSTEM'}</span>
        <span className="text-gray-500 text-[9px] font-mono select-none">Client: SN ENTERPRISE</span>
      </div>
    </div>
  );
}

function AppWithAuth() {
  const { user, setUser } = useAppContext();

  const handleLoginSuccess = (usr: { username: string; name: string }) => {
    setUser(usr);
  };

  const handleLogout = () => {
    setUser(null);
  };

  return user ? (
    <AppContent user={user} onLogout={handleLogout} />
  ) : (
    <Login onLoginSuccess={handleLoginSuccess} />
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppWithAuth />
    </AppProvider>
  );
}

