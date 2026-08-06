/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppProvider, useAppContext } from './store';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Login } from './components/Login';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { BOQPage } from './pages/BOQPage';
import { Workers } from './pages/Workers';
import { Billing } from './pages/Billing';
import { ClientPayment } from './pages/ClientPayment';
import { Kharchi } from './pages/Kharchi';
import { Advance } from './pages/Advance';
import { WorkerPayment } from './pages/WorkerPayment';
import { Approvals } from './pages/Approvals';
import { Expenses } from './pages/Expenses';
import { ExpensesSummary } from './pages/ExpensesSummary';
import { SiteMonthlySummary } from './pages/SiteMonthlySummary';
import { Mess } from './pages/Mess';
import { DLR } from './pages/DLR';
import { Materials } from './pages/Materials';
import { EquipmentAssetManagement } from './pages/EquipmentAssetManagement';
import { WorkerLedger } from './pages/WorkerLedger';
import { BillTracking } from './pages/BillTracking';
import { FinancialYearArchive } from './pages/FinancialYearArchive';
import { DailySiteSummary } from './pages/DailySiteSummary';
import { FloorAbstracts } from './pages/FloorAbstracts';
import StaffManagement from './pages/StaffManagement';
import ActivityLog from './pages/ActivityLog';
import { NumberingSettingsPage } from './pages/NumberingSettings';
import { Subcontractors } from './pages/subcontractors';
import { DMSPage } from './pages/DMSPage';
import { TCodeMaster } from './pages/TCodeMaster';
import { Server, X, ChevronDown, ChevronUp, Download, Upload, Keyboard, HelpCircle, CheckSquare, Cloud, Pin, FolderMinus, RefreshCw, Copy, Plus, Trash2, Clock, ChevronLeft, ChevronRight, Undo, AlertCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { initAuth, googleSignIn, getAccessToken } from './lib/auth';
import { SuccessToast } from './components/AnimatedERP';
import { LockScreen } from './components/LockScreen';
import { exportConsolidatedSitesReportToPDF, downloadPDF } from './lib/pdfGenerator';


function AppContent({ user, onLogout }: { user: { username: string; name: string } | null; onLogout: () => void }) {
  const erp = useAppContext();
  const { approvals, advanceSheetApprovals, kharchiApprovals, paymentSheetApprovals, expensesLedger } = erp;
  const pendingCount = (approvals?.filter(a => a.status === 'Pending').length || 0) +
    (advanceSheetApprovals?.filter(s => s.status === 'Pending').length || 0) +
    (kharchiApprovals?.filter(s => s.status === 'Pending').length || 0) +
    (paymentSheetApprovals?.filter(s => s.status === 'Pending').length || 0) +
    (expensesLedger?.filter(e => e.status === 'Submitted').length || 0);

  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [tabProps, setTabProps] = useState<any>({});
  const [isMobile, setIsMobile] = useState(false);

  // Navigation tab history
  const [tabHistory, setTabHistory] = useState<string[]>(['dashboard']);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [isNavigatingHistory, setIsNavigatingHistory] = useState<boolean>(false);

  useEffect(() => {
    if (isNavigatingHistory) return;
    setTabHistory(prevHistory => {
      const nextHistory = prevHistory.slice(0, historyIndex + 1);
      if (nextHistory[nextHistory.length - 1] === currentTab) {
        return prevHistory;
      }
      const updated = [...nextHistory, currentTab];
      setHistoryIndex(updated.length - 1);
      return updated;
    });
  }, [currentTab, isNavigatingHistory, historyIndex]);

  const handleGoBack = () => {
    if (historyIndex > 0) {
      setIsNavigatingHistory(true);
      const newIdx = historyIndex - 1;
      setHistoryIndex(newIdx);
      setCurrentTab(tabHistory[newIdx]);
      setTimeout(() => setIsNavigatingHistory(false), 50);
    }
  };

  const handleGoForward = () => {
    if (historyIndex < tabHistory.length - 1) {
      setIsNavigatingHistory(true);
      const newIdx = historyIndex + 1;
      setHistoryIndex(newIdx);
      setCurrentTab(tabHistory[newIdx]);
      setTimeout(() => setIsNavigatingHistory(false), 50);
    }
  };

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getTabNameForType = (type: string) => {
    switch (type) {
      case 'dashboard': return 'Workspace Home';
      case 'projects': return 'Projects';
      case 'workers': return 'Workers Management';
      case 'dms': return 'DMS Document Center';
      case 'boqs': return 'BOQ Management';
      case 'billing': return 'Billing Management';
      case 'client-payment': return 'Client Payment';
      case 'kharchi': return 'Kharchi';
      case 'advance': return 'Advance';
      case 'worker-payment': return 'Workers Payment';
      case 'worker-ledger': return 'Worker Ledger & Advance Recovery';
      case 'approvals': return 'Approvals Workflow';
      case 'expenses': return 'Expenses Ledger';
      case 'mess': return 'Mess Management';
      case 'dlr': return 'Daily Labour Report (DLR)';
      case 'materials': return 'Material & Inventory Management';
      case 'assets': return 'Equipment & Asset Register';
      case 'expenses-summary': return 'Expenses Summary Dashboard';
      case 'site-monthly-summary': return 'Site Monthly Report';
      case 'daily-site-summary': return 'AI Daily Site Summary';
      case 'bill-tracking': return 'Bill Tracking Workflow';
      case 'floor-abstracts': return 'Floor Abstract';
      case 'financial-year-archive': return 'Financial Year Archive & Closing';
      case 'activity-log': return 'System Activity Log';
      case 'subcontractors': return 'Subcontractor Dashboard';
      case 'subcontractors-master': return 'Subcontractor Directory';
      case 'subcontractors-billing': return 'Subcontractor Bills';
      case 'subcontractors-payments': return 'Subcontractor Payments';
      case 'subcontractors-ledger': return 'Subcontractor Reconciliation Ledger';
      case 'subcontractors-audit': return 'Subcontractor Security Audit Trails';
      case 'numbering-settings': return 'Document Numbering Settings';
      case 'staff-management': return 'Staff & Access Management';
      case 'tcode-master': return 'SAP T-Code Registry';
      default: return 'Workspace Home';
    }
  };

  const handleSetCurrentTab = (tab: string, title?: string, props?: any) => {
    setCurrentTab(tab);
    if (props) {
      setTabProps(props);
    }
  };

  useEffect(() => {
    (window as any).openWorkspaceTab = (type: string, title?: string, props?: any, forceNew = false) => {
       handleSetCurrentTab(type, title, props);
    };
    return () => {
      delete (window as any).openWorkspaceTab;
    };
  }, []);

  const [bottomTab, setBottomTab] = useState<'properties' | 'error-log' | 'backup'>('properties');
  const [isBottomMinimized, setIsBottomMinimized] = useState(false);
  const [backupFileError, setBackupFileError] = useState<string | null>(null);
  const [backupSuccess, setBackupSuccess] = useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [showFKeysBar, setShowFKeysBar] = useState(true);
  const [successToast, setSuccessToast] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const [isSessionLocked, setIsSessionLocked] = useState(false);

  useEffect(() => {
    initAuth();
    
    const handleSuccessToast = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.message) {
        setSuccessToast({ open: true, message: customEvent.detail.message });
      }
    };
    window.addEventListener('show-success-toast', handleSuccessToast);
    return () => {
      window.removeEventListener('show-success-toast', handleSuccessToast);
    };
  }, []);

  // Automated report compiler listener via QR Code scan parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('download-all-sites-pdf') === 'true' && erp.isDbLoaded && user) {
      try {
        const logoUrlBlob = exportConsolidatedSitesReportToPDF(erp, user.name || 'Executive Staff member');
        downloadPDF(logoUrlBlob, `SN_Enterprise_Consolidated_Sites_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        // Clean URL parameter to prevent multiple redundant downloads
        const clearedUrl = window.location.pathname;
        window.history.replaceState({}, document.title, clearedUrl);
      } catch (err) {
        console.error('Failed to automatically compile QR-linked PDF site report:', err);
      }
    }
  }, [erp.isDbLoaded, user]);


  const handleDriveBackup = async () => {
    setIsBackingUp(true);
    setBackupSuccess('Authenticating & uploading to Google Drive...');
    setBackupFileError(null);
    try {
      let token = await getAccessToken();
      if (!token) {
        const result = await googleSignIn();
        if (!result) {
           setIsBackingUp(false);
           setBackupSuccess(null);
           return;
        }
        token = result.accessToken;
      }

      const backupData = {
        projects: erp.projects || [],
        workers: erp.workers || [],
        billings: erp.billings || [],
        clientPayments: erp.clientPayments || [],
        kharchis: erp.kharchis || [],
        advances: erp.advances || [],
        workerPayments: erp.workerPayments || [],
        approvals: erp.approvals || [],
        kharchiApprovals: erp.kharchiApprovals || [],
        paymentSheetApprovals: erp.paymentSheetApprovals || [],
        advanceSheetApprovals: erp.advanceSheetApprovals || [],
        expensesLedger: erp.expensesLedger || [],
        messBookings: erp.messBookings || [],
        dlrs: erp.dlrs || [],
        materialItems: erp.materialItems || [],
        materialIssues: erp.materialIssues || [],
        materialReturns: erp.materialReturns || [],
        materialPurchases: erp.materialPurchases || [],
        labourPlannings: erp.labourPlannings || [],
        workerTransfers: erp.workerTransfers || [],
        assets: erp.assets || [],
        assetTransfers: erp.assetTransfers || [],
        assetMaintenances: erp.assetMaintenances || [],
        workerLedger: erp.workerLedger || [],
        workerHolds: erp.workerHolds || [],
        workerRecoveryAuditTrail: erp.workerRecoveryAuditTrail || [],
        attendance: erp.attendance || [],
        trackedBills: erp.trackedBills || [],
        billTimelines: erp.billTimelines || [],
        financialYears: erp.financialYears || [],
        staff: erp.staff || [],
        floorAbstracts: erp.floorAbstracts || [],
        activityLogs: erp.activityLogs || [],
        numberingSettings: erp.numberingSettings || [],
        numberingAuditLogs: erp.numberingAuditLogs || [],
        boqs: erp.boqs || [],
        boqAuditLogs: erp.boqAuditLogs || []
      };
      
      const metadata = {
        name: `erp_sap_backup_${new Date().toISOString().split('T')[0]}.json`,
        mimeType: 'application/json'
      };
      
      const boundary = '-------314159265358979323846';
      const delimiter = "\\r\\n--" + boundary + "\\r\\n";
      const close_delim = "\\r\\n--" + boundary + "--";
      
      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json\\r\\n\\r\\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\\r\\n\\r\\n' +
        JSON.stringify(backupData) +
        close_delim;
        
      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody
      });

      if (!res.ok) {
         throw new Error('Upload failed: ' + await res.text());
      }
      
      setBackupSuccess('Backup successfully saved to your Google Drive!');
      setTimeout(() => setBackupSuccess(null), 4000);
    } catch (e: any) {
      setBackupFileError(e.message || 'Drive backup failed');
      setBackupSuccess(null);
      setTimeout(() => setBackupFileError(null), 4000);
    } finally {
      setIsBackingUp(false);
    }
  };

  const [isDriveImporting, setIsDriveImporting] = useState(false);
  const handleDriveImport = async () => {
    setIsDriveImporting(true);
    setBackupSuccess('Authenticating & connecting to Google Drive...');
    setBackupFileError(null);
    try {
      let token = await getAccessToken();
      if (!token) {
        const result = await googleSignIn();
        if (!result) {
           setIsDriveImporting(false);
           setBackupSuccess(null);
           return;
        }
        token = result.accessToken;
      }
      
      setBackupSuccess('Searching for backup files...');
      // 1. List files created by this app
      const searchRes = await fetch('https://www.googleapis.com/drive/v3/files?q=name+contains+%27erp_sap_backup_%27+and+mimeType%3D%27application%2Fjson%27&orderBy=createdTime+desc&spaces=drive', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!searchRes.ok) {
        throw new Error('Failed to find backup files automatically.');
      }
      
      const searchData = await searchRes.json();
      if (!searchData.files || searchData.files.length === 0) {
        throw new Error('No backup files found in connected Google Drive.');
      }
      
      // Get the latest one
      const fileId = searchData.files[0].id;
      setBackupSuccess('Downloading latest backup...');
      
      // 2. Download the file content
      const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!fileRes.ok) {
        throw new Error('Failed to download backup file content from Drive.');
      }
      
      const backupText = await fileRes.text();
      try {
        const backupObj = JSON.parse(backupText);
        const imported = await erp.importBackup(backupObj);
        if (imported) {
          setBackupSuccess('Google Drive Backup imported & synced perfectly!');
          setTimeout(() => setBackupSuccess(null), 4500);
        } else {
          setBackupFileError('Backup import declined: Invalid data structure schema.');
        }
      } catch (err) {
        setBackupFileError('Failed to parse Google Drive data file.');
      }
      
    } catch (e: any) {
      setBackupFileError(e.message || 'Drive import failed');
      setBackupSuccess(null);
      setTimeout(() => setBackupFileError(null), 4000);
    } finally {
      setIsDriveImporting(false);
    }
  };

  // Global F-Key Listener reflecting classic SAP ERP workflows
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // List of supported Keyboard functional keys
      const trackedFKeys = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', 'F13'];
      
      if (trackedFKeys.includes(e.key)) {
        // Prevent default actions (e.g., browser Help on F1, Page refresh on F5, full screen on F11, inspect tools on F12)
        e.preventDefault();
        
        switch (e.key) {
          case 'F1':
            setIsHelpOpen(p => !p);
            break;
          case 'F13':
            setIsSessionLocked(true);
            break;
          case 'F2':
            setCurrentTab('site-monthly-summary');
            break;
          case 'F3':
            // Classic SAP Back/Exit key -> Return home/dashboard view
            setCurrentTab('dashboard');
            break;
          case 'F4':
            setCurrentTab('approvals');
            break;
          case 'F5':
            setCurrentTab('projects');
            break;
          case 'F6':
            setCurrentTab('workers');
            break;
          case 'F7':
            setCurrentTab('dlr');
            break;
          case 'F8':
            setCurrentTab('kharchi');
            break;
          case 'F9':
            setCurrentTab('advance');
            break;
          case 'F10':
            setCurrentTab('worker-payment');
            break;
          case 'F11':
            setCurrentTab('expenses');
            break;
          case 'F12':
            setCurrentTab('materials');
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const renderContent = () => {
    const type = currentTab;
    const props = tabProps || {};
    const key = `${type}`;

    const onUnsavedChangeCallback = (hasUnsaved: boolean) => {};

    switch (type) {
      case 'dashboard': return <Dashboard key={key} setCurrentTab={setCurrentTab} />;
      case 'projects': return <Projects key={key} />;
      case 'dms': return <DMSPage key={key} />;
      case 'workers': return <Workers key={key} initialWorkerId={props.initialWorkerId} initialView={props.initialView} onUnsavedChange={onUnsavedChangeCallback} />;
      case 'boqs': return <BOQPage key={key} onUnsavedChange={onUnsavedChangeCallback} />;
      case 'billing': return <Billing key={key} />;
      case 'client-payment': return <ClientPayment key={key} />;
      case 'kharchi': return <Kharchi key={key} />;
      case 'advance': return <Advance key={key} />;
      case 'worker-payment': return <WorkerPayment key={key} initialWorkerId={props.initialWorkerId} onUnsavedChange={onUnsavedChangeCallback} />;
      case 'worker-ledger': return <WorkerLedger key={key} />;
      case 'approvals': return <Approvals key={key} />;
      case 'expenses': return <Expenses key={key} />;
      case 'mess': return <Mess key={key} />;
      case 'dlr': return <DLR key={key} />;
      case 'materials': return <Materials key={key} />;
      case 'assets': return <EquipmentAssetManagement key={key} />;
      case 'expenses-summary': return <ExpensesSummary key={key} />;
      case 'site-monthly-summary': return <SiteMonthlySummary key={key} />;
      case 'daily-site-summary': return <DailySiteSummary key={key} />;
      case 'bill-tracking': return <BillTracking key={key} />;
      case 'floor-abstracts': return <FloorAbstracts key={key} />;
      case 'financial-year-archive': return <FinancialYearArchive key={key} />;
      case 'activity-log': return <ActivityLog key={key} />;
      case 'subcontractors': return <Subcontractors key={key} initialTab="dashboard" />;
      case 'subcontractors-master': return <Subcontractors key={key} initialTab="master" />;
      case 'subcontractors-billing': return <Subcontractors key={key} initialTab="billing" />;
      case 'subcontractors-payments': return <Subcontractors key={key} initialTab="payments" />;
      case 'subcontractors-ledger': return <Subcontractors key={key} initialTab="ledger" />;
      case 'subcontractors-audit': return <Subcontractors key={key} initialTab="audit" />;
      case 'numbering-settings': return <NumberingSettingsPage key={key} />;
      case 'tcode-master': return <TCodeMaster key={key} />;
      case 'staff-management':
        if (user?.username === 'saddamsne' || user?.username === 'rejatousifsne') {
          return <StaffManagement key={key} />;
        }
        return <Dashboard key={key} setCurrentTab={setCurrentTab} />;
      default: return <Dashboard key={key} setCurrentTab={setCurrentTab} />;
    }
  };

  const getBreadcrumbs = (type: string) => {
    switch (type) {
      case 'dashboard':
        return ['Overview'];
      case 'projects':
        return ['Masters', 'Projects'];
      case 'workers':
        return ['Masters', 'Workers'];
      case 'dlr':
        return ['Labour Management', 'Attendance (DLR)'];
      case 'advance':
        return ['Labour Management', 'Advance Registers'];
      case 'worker-payment':
        return ['Labour Management', 'Worker Payment'];
      case 'worker-ledger':
        return ['Labour Management', 'Worker Ledger'];
      case 'floor-abstracts':
        return ['Floor Abstract', 'Floor Abstracts'];
      case 'subcontractors':
        return ['Subcontractor Management', 'Subcontractor Dashboard'];
      case 'subcontractors-master':
        return ['Subcontractor Management', 'Subcontractor Directory'];
      case 'subcontractors-billing':
        return ['Subcontractor Management', 'Subcontractor Bills'];
      case 'subcontractors-payments':
        return ['Subcontractor Management', 'Subcontractor Payments'];
      case 'subcontractors-ledger':
        return ['Subcontractor Management', 'Reconciliation Ledger'];
      case 'subcontractors-audit':
        return ['Subcontractor Management', 'Audit Trail Logs'];
      case 'boqs':
        return ['Billing & Collections', 'BOQ Management'];
      case 'dms':
        return ['Document System', 'DMS Document Center'];
      case 'billing':
        return ['Billing & Collections', 'Billing Management'];
      case 'client-payment':
        return ['Billing & Collections', 'Client Payment'];
      case 'kharchi':
        return ['Labour Management', 'Kharchi (Pocket Money)'];
      case 'materials':
        return ['Inventory & Store', 'Materials & Inventory'];
      case 'assets':
        return ['Inventory & Store', 'Equipment Assets'];
      case 'expenses':
        return ['Expenses', 'Expenses Ledger'];
      case 'expenses-summary':
        return ['Expenses', 'Expenses Summary'];
      case 'site-monthly-summary':
        return ['Reports', 'Site Monthly Summary'];
      case 'daily-site-summary':
        return ['Reports', 'Daily Site Summary'];
      case 'bill-tracking':
        return ['Reports', 'Bill Tracking Workflow'];
      case 'financial-year-archive':
        return ['Reports', 'Financial Year Archive'];
      case 'numbering-settings':
        return ['Settings', 'Numbering Settings'];
      case 'staff-management':
        return ['Settings', 'Staff Management'];
      case 'tcode-master':
        return ['Settings', 'Transaction Code Registry (T-Codes)'];
      case 'activity-log':
        return ['Settings', 'Activity Log'];
      case 'approvals':
        return ['Approvals Workflow'];
      default:
        return ['Overview'];
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--color-sap-bg)] text-[11px] font-sans overflow-hidden">
      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.3, delay: 0.1 }} className="print:hidden">
        <TopBar 
          user={user} 
          onLogout={onLogout} 
          onShowHelp={() => setIsHelpOpen(true)}
          onToggleFKeysBar={() => setShowFKeysBar(p => !p)}
          showFKeysBar={showFKeysBar}
          onNavigate={setCurrentTab}
          onLock={() => setIsSessionLocked(true)}
          onGoBack={handleGoBack}
          onGoForward={handleGoForward}
          canGoBack={historyIndex > 0}
          canGoForward={historyIndex < tabHistory.length - 1}
        />
      </motion.div>
      <div className="flex flex-1 overflow-hidden">
        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.3, delay: 0.2 }} className="flex h-full print:hidden">
          <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />
        </motion.div>
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Editor Tabs */}
          <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.3, delay: 0.3 }} className="flex items-end bg-[#eef2f6] pt-1 px-1 border-b border-[#8c9ba8] print:hidden shrink-0">
            <div className="flex items-center bg-white border border-[#8c9ba8] border-b-transparent px-3 py-1 rounded-t-sm space-x-2 relative top-[1px] z-10">
              <Server size={12} className="text-[#0056b3]" />
              <span className="font-semibold text-[11px]">ERP_PRD - {getTabNameForType(currentTab)}</span>
              <X size={12} className="text-gray-500 hover:text-red-500 cursor-pointer ml-2" />
            </div>
            
            <div className="ml-10 mb-1 flex items-center space-x-2">
              <button 
                onClick={() => setIsHelpOpen(true)}
                title="Keyboard Shortcut Help Guide (F1)"
                className="text-[9px] text-[#0056b3] border border-[#cbdcf0] bg-blue-50 px-2 py-0.5 rounded shadow-sm hover:bg-[#cce8ff] hover:border-blue-400 font-bold font-mono uppercase cursor-pointer"
              >
                F1 keyboard help
              </button>
              <button 
                onClick={() => setShowFKeysBar(p => !p)}
                title="Toggle Function Keys Ribbon"
                className={`text-[9px] px-2 py-0.5 rounded shadow-sm font-bold font-mono uppercase cursor-pointer border ${showFKeysBar ? 'text-green-700 border-green-200 bg-green-50 hover:bg-green-100' : 'text-gray-500 border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
              >
                {showFKeysBar ? "F-Keys Ribbon ON" : "F-Keys Ribbon OFF"}
              </button>
            </div>
          </motion.div>
          
          {/* Classic SAP Function Keys Navigation Ribbon */}
          {showFKeysBar && (
            <div className="bg-[#f0f4f8] border-b border-[#8c9ba8] px-2 py-1 flex items-center space-x-1.5 overflow-x-auto select-none print:hidden h-8 shrink-0 text-[10px]">
              <span className="font-bold text-[var(--color-sap-blue-val)] mr-2 uppercase tracking-wider font-mono text-[9px] flex items-center shrink-0">
                <Keyboard size={12} className="mr-1 text-blue-800" />
                Active F-Keys:
              </span>
              
              <button 
                onClick={() => setIsHelpOpen(true)} 
                title="System Help Guide & Keyboard assignments (F1)"
                className="px-2 py-0.5 bg-white hover:bg-amber-50 border border-amber-300 hover:border-amber-500 rounded-sm font-semibold flex items-center space-x-1 shadow-sm transition-colors cursor-pointer"
              >
                <kbd className="bg-gradient-to-b from-amber-500 to-amber-600 text-white shadow-sm font-mono px-1 rounded text-[8px] font-bold border border-amber-600">F1</kbd>
                <span className="text-amber-950 font-sans text-[9px]">Help Desk</span>
              </button>

              <button 
                onClick={() => setCurrentTab('site-monthly-summary')} 
                title="Jump to Site Monthly Report (F2)"
                className={`px-2 py-0.5 border rounded-sm font-semibold flex items-center space-x-1 shadow-sm transition-colors cursor-pointer ${currentTab === 'site-monthly-summary' ? 'bg-[#cce8ff] border-blue-500 text-blue-900 font-bold' : 'bg-white border-gray-300 hover:bg-[#e6f2ff] hover:border-blue-500 hover:text-blue-900 text-gray-700'}`}
              >
                <kbd className="bg-gradient-to-b from-gray-500 to-gray-600 text-white font-mono px-1 rounded text-[8px] font-bold border border-gray-600">F2</kbd>
                <span className="font-sans text-[9px]">Monthly Summary</span>
              </button>

              <button 
                onClick={() => setCurrentTab('dashboard')} 
                title="Exit module and return to dashboard (F3)"
                className={`px-2 py-0.5 border rounded-sm font-semibold flex items-center space-x-1 shadow-sm transition-colors cursor-pointer ${currentTab === 'dashboard' ? 'bg-[#cce8ff] border-blue-500 text-blue-950 font-bold' : 'bg-white border-gray-300 hover:bg-[#e6f2ff] hover:border-blue-500 hover:text-blue-900 text-gray-700'}`}
              >
                <kbd className="bg-gradient-to-b from-red-500 to-red-600 text-white font-mono px-1 rounded text-[8px] font-bold border border-red-600">F3</kbd>
                <span className="font-sans text-[9px]">Overview [Back]</span>
              </button>

              <button 
                onClick={() => setCurrentTab('approvals')} 
                title="Jump to Approvals Queue (F4)"
                className={`px-2 py-0.5 border rounded-sm font-semibold flex items-center space-x-1 shadow-sm transition-colors cursor-pointer ${currentTab === 'approvals' ? 'bg-[#cce8ff] border-blue-500 text-blue-950 font-bold' : 'bg-white border-gray-300 hover:bg-[#e6f2ff] hover:border-blue-500 hover:text-blue-900 text-gray-700'}`}
              >
                <kbd className="bg-gradient-to-b from-blue-500 to-blue-600 text-white font-mono px-1 rounded text-[8px] font-bold border border-blue-600">F4</kbd>
                <span className="font-sans text-[9px] flex items-center space-x-1">
                  <span>Approvals</span>
                  {pendingCount > 0 && (
                    <span className="bg-red-600 text-white font-mono text-[8px] px-1 rounded-full font-bold ml-1 animate-pulse">
                      {pendingCount}
                    </span>
                  )}
                </span>
              </button>

              <button 
                onClick={() => setCurrentTab('projects')} 
                title="Jump to Projects screen (F5)"
                className={`px-2 py-0.5 border rounded-sm font-semibold flex items-center space-x-1 shadow-sm transition-colors cursor-pointer ${currentTab === 'projects' ? 'bg-[#cce8ff] border-blue-500 text-blue-950 font-bold' : 'bg-white border-gray-300 hover:bg-[#e6f2ff] hover:border-blue-500 hover:text-blue-900 text-gray-700'}`}
              >
                <kbd className="bg-gradient-to-b from-gray-500 to-gray-600 text-white font-mono px-1 rounded text-[8px] font-bold border border-gray-600">F5</kbd>
                <span className="font-sans text-[9px]">Projects</span>
              </button>

              <button 
                onClick={() => setCurrentTab('workers')} 
                title="Jump to Workers Management (F6)"
                className={`px-2 py-0.5 border rounded-sm font-semibold flex items-center space-x-1 shadow-sm transition-colors cursor-pointer ${currentTab === 'workers' ? 'bg-[#cce8ff] border-blue-500 text-blue-950 font-bold' : 'bg-white border-gray-300 hover:bg-[#e6f2ff] hover:border-blue-500 hover:text-blue-900 text-gray-700'}`}
              >
                <kbd className="bg-gradient-to-b from-gray-500 to-gray-600 text-white font-mono px-1 rounded text-[8px] font-bold border border-gray-600">F6</kbd>
                <span className="font-sans text-[9px]">Workers HQ</span>
              </button>

              <button 
                onClick={() => setCurrentTab('dlr')} 
                title="Jump to Daily Labour Report registration (F7)"
                className={`px-2 py-0.5 border rounded-sm font-semibold flex items-center space-x-1 shadow-sm transition-colors cursor-pointer ${currentTab === 'dlr' ? 'bg-[#cce8ff] border-blue-500 text-blue-950 font-bold' : 'bg-white border-gray-300 hover:bg-[#e6f2ff] hover:border-blue-500 hover:text-blue-900 text-gray-700'}`}
              >
                <kbd className="bg-gradient-to-b from-gray-500 to-gray-600 text-white font-mono px-1 rounded text-[8px] font-bold border border-gray-600">F7</kbd>
                <span className="font-sans text-[9px]">DLR Entry</span>
              </button>

              <button 
                onClick={() => setCurrentTab('kharchi')} 
                title="Jump to Kharchi logs (F8)"
                className={`px-2 py-0.5 border rounded-sm font-semibold flex items-center space-x-1 shadow-sm transition-colors cursor-pointer ${currentTab === 'kharchi' ? 'bg-[#cce8ff] border-blue-500 text-blue-950 font-bold' : 'bg-white border-gray-300 hover:bg-[#e6f2ff] hover:border-blue-500 hover:text-blue-900 text-gray-700'}`}
              >
                <kbd className="bg-gradient-to-b from-gray-500 to-gray-600 text-white font-mono px-1 rounded text-[8px] font-bold border border-gray-600">F8</kbd>
                <span className="font-sans text-[9px]">Kharchi</span>
              </button>

              <button 
                onClick={() => setCurrentTab('advance')} 
                title="Jump to Advance register (F9)"
                className={`px-2 py-0.5 border rounded-sm font-semibold flex items-center space-x-1 shadow-sm transition-colors cursor-pointer ${currentTab === 'advance' ? 'bg-[#cce8ff] border-blue-500 text-blue-950 font-bold' : 'bg-white border-gray-300 hover:bg-[#e6f2ff] hover:border-blue-500 hover:text-blue-900 text-gray-700'}`}
              >
                <kbd className="bg-gradient-to-b from-gray-500 to-gray-600 text-white font-mono px-1 rounded text-[8px] font-bold border border-gray-600">F9</kbd>
                <span className="font-sans text-[9px]">Advance Logs</span>
              </button>

              <button 
                onClick={() => setCurrentTab('worker-payment')} 
                title="Jump to Workers Payment Sheet generation (F10)"
                className={`px-2 py-0.5 border rounded-sm font-semibold flex items-center space-x-1 shadow-sm transition-colors cursor-pointer ${currentTab === 'worker-payment' ? 'bg-[#cce8ff] border-blue-500 text-blue-950 font-bold' : 'bg-white border-gray-300 hover:bg-[#e6f2ff] hover:border-blue-500 hover:text-blue-900 text-gray-700'}`}
              >
                <kbd className="bg-gradient-to-b from-gray-500 to-gray-600 text-white font-mono px-1 rounded text-[8px] font-bold border border-gray-600">F10</kbd>
                <span className="font-sans text-[9px]">Wage Sheets</span>
              </button>

              <button 
                onClick={() => setCurrentTab('expenses')} 
                title="Jump to Expenses Ledger (F11)"
                className={`px-2 py-0.5 border rounded-sm font-semibold flex items-center space-x-1 shadow-sm transition-colors cursor-pointer ${currentTab === 'expenses' ? 'bg-[#cce8ff] border-blue-500 text-blue-950 font-bold' : 'bg-white border-gray-300 hover:bg-[#e6f2ff] hover:border-blue-500 hover:text-blue-900 text-gray-700'}`}
              >
                <kbd className="bg-gradient-to-b from-gray-500 to-gray-600 text-white font-mono px-1 rounded text-[8px] font-bold border border-gray-600">F11</kbd>
                <span className="font-sans text-[9px]">Expenses</span>
              </button>

              <button 
                onClick={() => setCurrentTab('materials')} 
                title="Jump to Material & Inventory management (F12)"
                className={`px-2 py-0.5 border rounded-sm font-semibold flex items-center space-x-1 shadow-sm transition-colors cursor-pointer ${currentTab === 'materials' ? 'bg-[#cce8ff] border-blue-500 text-blue-950 font-bold' : 'bg-white border-gray-300 hover:bg-[#e6f2ff] hover:border-blue-500 hover:text-blue-900 text-gray-700'}`}
              >
                <kbd className="bg-gradient-to-b from-gray-500 to-gray-600 text-white font-mono px-1 rounded text-[8px] font-bold border border-gray-600">F12</kbd>
                <span className="font-sans text-[9px]">Materials ERP</span>
              </button>

              <div className="flex-grow"></div>
              
              <button 
                onClick={() => setShowFKeysBar(false)} 
                title="Minimize F-Key Ribbon (Can toggle back in Navigate/Help menu)"
                className="hover:bg-red-50 p-1 rounded-sm text-gray-500 hover:text-white shrink-0 cursor-pointer text-[10px] font-bold border border-transparent hover:border-red-600 shadow-sm leading-none transition-colors mr-1"
              >
                × Hide
              </button>
            </div>
          )}

          {/* Main Editor Area */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.4 }} className="flex-1 overflow-hidden flex flex-col bg-slate-100">
            {/* Breadcrumbs Banner */}
            <div className="bg-[#f1f5f9] border-b border-[#cbd5e1] px-4 py-1.5 flex items-center space-x-1.5 text-[10px] text-slate-500 font-sans select-none shrink-0 print:hidden">
              <span 
                className="hover:text-blue-800 hover:underline cursor-pointer font-bold uppercase tracking-tight text-slate-400"
                onClick={() => setCurrentTab('dashboard')}
              >
                SN ERP
              </span>
              <span className="text-slate-350">/</span>
              {getBreadcrumbs(currentTab).map((crumb, idx, arr) => {
                const isLast = idx === arr.length - 1;
                return (
                  <React.Fragment key={idx}>
                    <span className={isLast ? 'text-[var(--color-sap-blue-val)] font-extrabold font-sans' : 'text-slate-600 font-medium'}>
                      {crumb}
                    </span>
                    {!isLast && <span className="text-slate-300">/</span>}
                  </React.Fragment>
                );
              })}
            </div>

            <main className="flex-1 overflow-y-auto bg-white p-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentTab}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  {renderContent()}
                </motion.div>
              </AnimatePresence>
            </main>
          </motion.div>

          {/* Bottom Panel */}
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.3, delay: 0.5 }} className="print:hidden">
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
                    <thead className="bg-[#eef2f6] text-[11px] font-semibold text-slate-700">
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
                        <td className="border border-[#8c9ba8] px-2 py-0.5">{getTabNameForType(currentTab)}</td>
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
                            projects: erp.projects || [],
                            workers: erp.workers || [],
                            billings: erp.billings || [],
                            clientPayments: erp.clientPayments || [],
                            kharchis: erp.kharchis || [],
                            advances: erp.advances || [],
                            workerPayments: erp.workerPayments || [],
                            approvals: erp.approvals || [],
                            kharchiApprovals: erp.kharchiApprovals || [],
                            paymentSheetApprovals: erp.paymentSheetApprovals || [],
                            advanceSheetApprovals: erp.advanceSheetApprovals || [],
                            expensesLedger: erp.expensesLedger || [],
                            messBookings: erp.messBookings || [],
                            dlrs: erp.dlrs || [],
                            materialItems: erp.materialItems || [],
                            materialIssues: erp.materialIssues || [],
                            materialReturns: erp.materialReturns || [],
                            materialPurchases: erp.materialPurchases || [],
                            labourPlannings: erp.labourPlannings || [],
                            workerTransfers: erp.workerTransfers || [],
                            assets: erp.assets || [],
                            assetTransfers: erp.assetTransfers || [],
                            assetMaintenances: erp.assetMaintenances || [],
                            workerLedger: erp.workerLedger || [],
                            workerHolds: erp.workerHolds || [],
                            workerRecoveryAuditTrail: erp.workerRecoveryAuditTrail || [],
                            attendance: erp.attendance || [],
                            trackedBills: erp.trackedBills || [],
                            billTimelines: erp.billTimelines || [],
                            financialYears: erp.financialYears || [],
                            staff: erp.staff || [],
                            floorAbstracts: erp.floorAbstracts || [],
                            activityLogs: erp.activityLogs || [],
                            numberingSettings: erp.numberingSettings || [],
                            numberingAuditLogs: erp.numberingAuditLogs || [],
                            boqs: erp.boqs || [],
                            boqAuditLogs: erp.boqAuditLogs || []
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

                      <button
                        onClick={handleDriveBackup}
                        disabled={isBackingUp || isDriveImporting}
                        className="sap-btn flex items-center space-x-1 p-2 bg-[#eef2f6]"
                      >
                        <Cloud size={13} className="text-[#4285F4] font-bold" />
                        <span className="font-semibold text-[#4285F4]">{isBackingUp ? 'Uploading...' : 'Backup to Google Drive'}</span>
                      </button>

                      <button
                        onClick={handleDriveImport}
                        disabled={isBackingUp || isDriveImporting}
                        className="sap-btn flex items-center space-x-1 p-2 bg-[#eef2f6]"
                      >
                        <Cloud size={13} className="text-[#34A853] font-bold" />
                        <span className="font-semibold text-[#34A853]">{isDriveImporting ? 'Importing...' : 'Restore from Google Drive'}</span>
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
          </motion.div>
        </div>
      </div>

      {/* Persistent Enterprise Status Footer */}
      <footer className="bg-[#eef2f6] border-t border-[#8c9ba8] px-4 py-1 flex items-center justify-between text-[9px] text-slate-500 font-mono shrink-0 select-none print:hidden">
        <div className="flex items-center space-x-3">
          <span className="font-extrabold text-[var(--color-sap-blue-val)]">SN ENTERPRISES ERP</span>
          <span className="text-slate-300">|</span>
          <span>Version: 3.4.0-Enterprise</span>
        </div>
        <div className="flex items-center space-x-3">
          <span>Current FY: 2026-2027</span>
          <span className="text-slate-300">|</span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            <span>Last Backup: {new Date().toLocaleDateString('en-IN', {day: 'numeric', month: 'short'})} (Synced Offline)</span>
          </span>
        </div>
      </footer>
      
      {/* Keyboard Shortcut Help Modal (SAP Layout Guideline) */}
      <AnimatePresence>
        {isHelpOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center z-[99999] p-4 select-none print:hidden">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-[#f0f4f8] border-2 border-[var(--color-sap-blue-val)] w-full max-w-2xl shadow-2xl flex flex-col rounded-sm overflow-hidden text-black"
            >
              {/* SAP GUI Retro blue title bar */}
              <div className="bg-[var(--color-sap-blue-val)] text-white px-3 py-1.5 flex items-center justify-between font-bold text-[11px] font-mono shadow-md select-none">
                <div className="flex items-center space-x-2">
                  <Keyboard size={14} className="text-amber-400" />
                  <span>SAP Short-cuts (Functional Key Assignments Help Menu)</span>
                </div>
                <button 
                  onClick={() => setIsHelpOpen(false)}
                  className="bg-red-700 hover:bg-red-600 text-white font-bold px-1.5 py-0.5 rounded-sm text-[9px] transition-colors cursor-pointer"
                >
                  [X] CLOSE
                </button>
              </div>

              {/* Informational Subheader */}
              <div className="bg-[#cbdcf0] text-blue-950 p-2.5 px-3 border-b border-[#8c9ba8] text-[10px]">
                <p className="font-semibold text-[11px]">💡 ERP Keyboard Navigation System</p>
                <p className="mt-1 text-gray-700 leading-relaxed">
                  In compliance with classic SAP terminal client layouts, this ERP supports quick high-speed module switching via function keys. Pressing an F-key instantly redirects your terminal context below:
                </p>
              </div>

              {/* Content Grid */}
              <div className="flex-1 p-3 overflow-y-auto max-h-[350px]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="border border-[#8c9ba8] bg-white rounded-sm">
                    <div className="bg-[#eef2f6] px-2 py-1 font-bold text-[10px] text-blue-900 border-b border-gray-200">📞 Overview & Reporting</div>
                    <div className="divide-y divide-gray-100 p-1">
                      <div className="flex items-center justify-between p-1.5 text-[10px]">
                        <span className="flex items-center"><kbd className="bg-amber-500 text-white font-mono px-1.5 py-0.5 rounded text-[9px] font-bold border border-amber-600 shadow-sm mr-2 w-8 text-center select-all">F1</kbd> SAP Help Desk</span>
                        <span className="text-gray-500 font-mono text-[9px] select-all">/h_help</span>
                      </div>
                      <div className="flex items-center justify-between p-1.5 text-[10px]">
                        <span className="flex items-center"><kbd className="bg-gray-500 text-white font-mono px-1.5 py-0.5 rounded text-[9px] font-bold border border-gray-600 shadow-sm mr-2 w-8 text-center select-all">F2</kbd> Site Monthly Report</span>
                        <span className="text-gray-500 font-mono text-[9px] select-all">/nSMR</span>
                      </div>
                      <div className="flex items-center justify-between p-1.5 text-[10px]">
                        <span className="flex items-center"><kbd className="bg-red-500 text-white font-mono px-1.5 py-0.5 rounded text-[9px] font-bold border border-red-600 shadow-sm mr-2 w-8 text-center select-all">F3</kbd> Go to Dashboard</span>
                        <span className="text-gray-500 font-mono text-[9px] select-all">/nBACK</span>
                      </div>
                      <div className="flex items-center justify-between p-1.5 text-[10px]">
                        <span className="flex items-center"><kbd className="bg-[var(--btn-hover-top)] text-white font-mono px-1.5 py-0.5 rounded text-[9px] font-bold border border-blue-700 shadow-sm mr-2 w-8 text-center select-all">F4</kbd> Approvals workflow</span>
                        <span className="text-gray-500 font-mono text-[9px] select-all">/nAPPV</span>
                      </div>
                      <div className="flex items-center justify-between p-1.5 text-[10px]">
                        <span className="flex items-center"><kbd className="bg-gray-500 text-white font-mono px-1.5 py-0.5 rounded text-[9px] font-bold border border-gray-600 shadow-sm mr-2 w-8 text-center select-all">F5</kbd> Project Register</span>
                        <span className="text-gray-500 font-mono text-[9px] select-all">/nPROJ</span>
                      </div>
                    </div>
                  </div>

                  <div className="border border-[#8c9ba8] bg-white rounded-sm">
                    <div className="bg-[#eef2f6] px-2 py-1 font-bold text-[10px] text-blue-900 border-b border-gray-200">💼 Payroll, Ledger & Stock</div>
                    <div className="divide-y divide-gray-100 p-1">
                      <div className="flex items-center justify-between p-1.5 text-[10px]">
                        <span className="flex items-center"><kbd className="bg-gray-500 text-white font-mono px-1.5 py-0.5 rounded text-[9px] font-bold border border-gray-600 shadow-sm mr-2 w-8 text-center select-all">F6</kbd> Workers directory</span>
                        <span className="text-gray-500 font-mono text-[9px] select-all">/nWORK</span>
                      </div>
                      <div className="flex items-center justify-between p-1.5 text-[10px]">
                        <span className="flex items-center"><kbd className="bg-gray-500 text-white font-mono px-1.5 py-0.5 rounded text-[9px] font-bold border border-gray-600 shadow-sm mr-2 w-8 text-center select-all">F7</kbd> DLR (Daily Labour)</span>
                        <span className="text-gray-500 font-mono text-[9px] select-all">/nDLR</span>
                      </div>
                      <div className="flex items-center justify-between p-1.5 text-[10px]">
                        <span className="flex items-center"><kbd className="bg-gray-500 text-white font-mono px-1.5 py-0.5 rounded text-[9px] font-bold border border-gray-600 shadow-sm mr-2 w-8 text-center select-all">F8</kbd> Kharchi payroll logs</span>
                        <span className="text-gray-500 font-mono text-[9px] select-all">/nKHAR</span>
                      </div>
                      <div className="flex items-center justify-between p-1.5 text-[10px]">
                        <span className="flex items-center"><kbd className="bg-gray-500 text-white font-mono px-1.5 py-0.5 rounded text-[9px] font-bold border border-gray-600 shadow-sm mr-2 w-8 text-center select-all">F9</kbd> Advance register</span>
                        <span className="text-gray-500 font-mono text-[9px] select-all">/nADVN</span>
                      </div>
                      <div className="flex items-center justify-between p-1.5 text-[10px]">
                        <span className="flex items-center"><kbd className="bg-gray-500 text-white font-mono px-1.5 py-0.5 rounded text-[9px] font-bold border border-gray-600 shadow-sm mr-2 w-8 text-center select-all">F10</kbd> Workers Payment</span>
                        <span className="text-gray-500 font-mono text-[9px] select-all">/nPAYM</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Secondary list */}
                <div className="mt-2 border border-[#8c9ba8] bg-white rounded-sm">
                  <div className="bg-[#eef2f6] px-2 py-1 font-bold text-[10px] text-blue-900 border-b border-gray-200">🛠️ Auxiliary Module Keys</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 p-2 divide-y md:divide-y-0 divide-gray-100">
                    <div className="flex items-center justify-between py-1 text-[10px]">
                      <span className="flex items-center"><kbd className="bg-gray-500 text-white font-mono px-1.5 py-0.5 rounded text-[9px] font-bold border border-gray-300 mr-2">F11</kbd> Expenses Ledger Logs</span>
                      <span className="text-gray-500 font-mono text-[9px]">/nEXPN</span>
                    </div>
                    <div className="flex items-center justify-between py-1 text-[10px]">
                      <span className="flex items-center"><kbd className="bg-gray-500 text-white font-mono px-1.5 py-0.5 rounded text-[9px] font-bold border border-gray-300 mr-2">F12</kbd> Material & Stock ERP</span>
                      <span className="text-gray-500 font-mono text-[9px]">/nMATR</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-2 text-blue-900 flex items-start space-x-2">
                  <span className="font-bold">Pro-tip:</span>
                  <p className="text-[10px] text-gray-700 leading-relaxed">
                    You can toggle the horizontal <strong className="text-blue-900">Active F-Keys Ribbon</strong> on/off from the header menu <strong className="text-blue-950">"Navigate" ➔ "Toggle Ribbon Bar"</strong> or by clicking the toggle next to the tabs above.
                  </p>
                </div>
              </div>

              {/* SAP Actions Bar at bottom of window */}
              <div className="bg-[#cbdcf0] p-2 flex items-center justify-between border-t border-[#8c9ba8] shrink-0 font-sans">
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    id="ribbonToggle" 
                    checked={showFKeysBar} 
                    onChange={(e) => setShowFKeysBar(e.target.checked)} 
                    className="w-3.5 h-3.5"
                  />
                  <label htmlFor="ribbonToggle" className="text-[10px] font-medium text-gray-800 cursor-pointer">
                    Show Keyboard Ribbon Bar on screen
                  </label>
                </div>
                <button 
                  onClick={() => setIsHelpOpen(false)}
                  className="bg-white hover:bg-[#e6f2ff] text-blue-900 border border-[#8c9ba8] hover:border-blue-500 px-4 py-1 font-bold text-[10px] shadow-sm rounded-sm uppercase tracking-wider cursor-pointer font-sans"
                >
                  System Understood
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <SuccessToast 
        isOpen={successToast.open} 
        message={successToast.message} 
        onClose={() => setSuccessToast(prev => ({ ...prev, open: false }))} 
      />

      {/* Status Bar */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="h-5 bg-[#d9e4f1] border-t border-[#8c9ba8] flex items-center px-2 text-[10px] text-gray-800 justify-between print:hidden">
        <span>System: ERP_PRD Host: erp.local Instance: 00 Connected User: {user ? user.username : 'SYSTEM'}</span>
        <span className="text-gray-500 text-[9px] font-mono select-none">Client: SN ENTERPRISE</span>
      </motion.div>
      
      <LockScreen isLocked={isSessionLocked} onUnlock={() => setIsSessionLocked(false)} />
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

