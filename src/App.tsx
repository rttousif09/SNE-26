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
import { AnalyticsReports } from './pages/analytics';
import { DocumentFlowPage } from './pages/DocumentFlow';
import { DocumentFlowModal } from './components/DocumentFlowModal';
import { CommandPalette } from './components/common/CommandPalette';
import { AlertCenterModal } from './components/common/AlertCenterModal';
import { Project360Modal } from './components/common/Project360Modal';
import { Server, X, ChevronDown, ChevronUp, Download, Upload, Keyboard, HelpCircle, CheckSquare, Cloud, Pin, FolderMinus, RefreshCw, Copy, Plus, Trash2, Clock, ChevronLeft, ChevronRight, Undo, AlertCircle, Home, ArrowLeft } from 'lucide-react';
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  
  // Modals state
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isAlertCenterOpen, setIsAlertCenterOpen] = useState(false);
  const [project360State, setProject360State] = useState<{ isOpen: boolean; projectId?: string }>({ isOpen: false });
  const [docFlowModalState, setDocFlowModalState] = useState<{ isOpen: boolean; documentIdOrNo?: string }>({
    isOpen: false
  });

  // Expose global helpers
  useEffect(() => {
    (window as any).openDocumentFlow = (documentIdOrNo?: string) => {
      setDocFlowModalState({ isOpen: true, documentIdOrNo });
    };

    (window as any).openProject360 = (projectId?: string) => {
      setProject360State({ isOpen: true, projectId });
    };

    (window as any).openAlertCenter = () => {
      setIsAlertCenterOpen(true);
    };

    (window as any).openCommandPalette = () => {
      setIsCommandPaletteOpen(true);
    };

    (window as any).openWorkspaceTab = (tab: string, title?: string, props?: any) => {
      setCurrentTab(tab);
      if (props) {
        setTabProps(props);
      }
    };

    return () => {
      delete (window as any).openDocumentFlow;
      delete (window as any).openProject360;
      delete (window as any).openAlertCenter;
      delete (window as any).openCommandPalette;
      delete (window as any).openWorkspaceTab;
    };
  }, []);

  // Ctrl + K listener to trigger Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'k' || e.key === '/')) {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      case 'analytics': return 'Graphs & Analytics Reports (BI)';
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
      case 'analytics': return <AnalyticsReports key={key} initialReportType={props.initialReportType} onNavigate={setCurrentTab} />;
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
      case 'document-flow': 
        return <DocumentFlowPage key={key} initialDocumentIdOrNo={props.initialDocumentIdOrNo} initialPreset={props.initialPreset} initialProjectId={props.initialProjectId} />;
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
      case 'document-flow':
        return ['Document System', 'SAP Document Flow & Traceability (DF01)'];
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
      case 'analytics':
        return ['Reports', 'Graphs & Analytics (BI)'];
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
      <div className="print:hidden">
        <TopBar 
          user={user} 
          onLogout={onLogout} 
          onNavigate={setCurrentTab}
          onLock={() => setIsSessionLocked(true)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenAlertCenter={() => setIsAlertCenterOpen(true)}
          breadcrumbs={getBreadcrumbs(currentTab)}
        />
      </div>
      <div className="flex flex-1 overflow-hidden">
        {/* Permanent Collapsible Enterprise Sidebar */}
        <div className="flex h-full print:hidden shrink-0 z-20">
          <Sidebar 
            currentTab={currentTab} 
            setCurrentTab={setCurrentTab} 
            isCollapsed={isSidebarCollapsed}
            setIsCollapsed={setIsSidebarCollapsed}
          />
        </div>

        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          {/* Editor Tabs */}
          <div className="flex items-end justify-between bg-[#eef2f6] dark:bg-slate-900 pt-1 px-1 border-b border-[#8c9ba8] dark:border-slate-800 print:hidden shrink-0 h-[29px]">
            <div className="flex items-center space-x-1 h-full">
              <button
                onClick={() => setCurrentTab('dashboard')}
                title="SAP Easy Access: Home / Workspace Modules"
                className={`flex items-center px-3 h-[24px] rounded-t-[3px] space-x-1.5 border text-[11px] font-bold cursor-pointer transition-all relative top-[1px] z-10 ${
                  currentTab === 'dashboard'
                    ? 'bg-white dark:bg-[#1E2228] border-[#8c9ba8] dark:border-slate-700 border-b-white dark:border-b-[#1E2228] text-[#0056b3] dark:text-blue-400 shadow-xs'
                    : 'bg-gradient-to-b from-[#f0f4f9] to-[#d8e3ed] dark:from-slate-800 dark:to-slate-900 hover:from-white hover:to-[#e6f0fa] border-[#9cb0c2] dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className={`w-3.5 h-3.5 rounded-[2px] flex items-center justify-center ${currentTab === 'dashboard' ? 'bg-[#0056b3] text-white' : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                  <Home size={10} />
                </div>
                <span className="tracking-tight">Home (Easy Access)</span>
              </button>

              {currentTab !== 'dashboard' && (
                <div className="flex items-center h-[24px] bg-white dark:bg-[#1E2228] border border-[#8c9ba8] dark:border-slate-700 border-b-white dark:border-b-[#1E2228] px-3 rounded-t-[3px] space-x-2 relative top-[1px] z-10 shadow-xs">
                  <Server size={12} className="text-[#0056b3] dark:text-blue-400" />
                  <span className="font-semibold text-[11px] text-slate-900 dark:text-slate-100">{getTabNameForType(currentTab)}</span>
                  <button
                    onClick={() => setCurrentTab('dashboard')}
                    title="Close module and return to Home"
                    className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-0.5 rounded ml-1 cursor-pointer transition-colors flex items-center justify-center"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>
            
          {/* Main Editor Area */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.4 }} className="flex-1 overflow-hidden flex flex-col bg-slate-100">
            {/* Breadcrumbs Banner */}
            <div className="bg-[#f1f5f9] border-b border-[#cbd5e1] px-3 py-1 flex items-center justify-between text-[10px] text-slate-500 font-sans select-none shrink-0 print:hidden h-[28px]">
              <div className="flex items-center space-x-1.5 min-w-0">
                <button 
                  className="hover:text-blue-800 hover:underline cursor-pointer font-bold uppercase tracking-tight text-[#0056b3] flex items-center space-x-1"
                  onClick={() => setCurrentTab('dashboard')}
                  title="Go to Home (All Modules)"
                >
                  <Home size={11} />
                  <span>Home</span>
                </button>
                <span className="text-slate-350">/</span>
                {getBreadcrumbs(currentTab).map((crumb, idx, arr) => {
                  const isLast = idx === arr.length - 1;
                  return (
                    <React.Fragment key={idx}>
                      <span className={isLast ? 'text-[var(--color-sap-blue-val)] font-extrabold font-sans truncate' : 'text-slate-600 font-medium truncate'}>
                        {crumb}
                      </span>
                      {!isLast && <span className="text-slate-300">/</span>}
                    </React.Fragment>
                  );
                })}
              </div>

              {currentTab !== 'dashboard' && (
                <button
                  onClick={() => setCurrentTab('dashboard')}
                  className="flex items-center space-x-1.5 px-2 py-0.5 bg-gradient-to-b from-[#ffffff] to-[#e4ebf5] hover:bg-[#cce8ff] border border-[#8c9ba8] hover:border-[#0056b3] rounded-[2px] text-[#00386b] text-[9px] font-bold cursor-pointer shadow-2xs active:translate-y-[0.5px] transition-all shrink-0 ml-2"
                  title="Return to Home to select another module"
                >
                  <div className="w-3 h-3 bg-[#0056b3] text-white rounded-[2px] flex items-center justify-center">
                    <Home size={8} />
                  </div>
                  <span>Switch Module (Home)</span>
                </button>
              )}
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
      
      <SuccessToast 
        isOpen={successToast.open} 
        message={successToast.message} 
        onClose={() => setSuccessToast(prev => ({ ...prev, open: false }))} 
      />

      {/* SAP Document Flow & Business Flow Modal Inspector */}
      <DocumentFlowModal
        isOpen={docFlowModalState.isOpen}
        documentIdOrNo={docFlowModalState.documentIdOrNo}
        onClose={() => setDocFlowModalState({ isOpen: false })}
        onNavigateToTab={(tab, title, props) => {
          handleSetCurrentTab(tab, title, props);
          setDocFlowModalState({ isOpen: false });
        }}
      />

      {/* Global Enterprise Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={(tab, title, props) => {
          handleSetCurrentTab(tab, title, props);
          setIsCommandPaletteOpen(false);
        }}
      />

      {/* Real-time Exception & Alert Center */}
      <AlertCenterModal
        isOpen={isAlertCenterOpen}
        onClose={() => setIsAlertCenterOpen(false)}
        onNavigateTab={(tab, title, props) => {
          handleSetCurrentTab(tab, title, props);
          setIsAlertCenterOpen(false);
        }}
      />

      {/* Project 360-degree Cockpit Modal */}
      <Project360Modal
        isOpen={project360State.isOpen}
        projectId={project360State.projectId}
        onClose={() => setProject360State({ isOpen: false })}
        onNavigateTab={(tab, title, props) => {
          handleSetCurrentTab(tab, title, props);
          setProject360State({ isOpen: false });
        }}
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

