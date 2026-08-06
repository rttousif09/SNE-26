import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Download, Upload, Save, FolderOpen, File, ArrowLeft, ArrowRight, Building2, User, LogOut, ChevronDown, Printer, Moon, Sun, Bell, AlertTriangle, AlertCircle, Info, CheckCircle2, Check, Search, Trash2, Clock, QrCode, Copy, Settings, Star, ShieldAlert } from 'lucide-react';
import { SNLogo } from './SNLogo';
import { useAppContext } from '../store';
import { exportConsolidatedSitesReportToPDF, downloadPDF } from '../lib/pdfGenerator';
import { 
  getTCodeList, 
  addRecentTCode, 
  removeRecentTCode, 
  getRecentTCodes, 
  getFavoriteTCodes, 
  toggleFavoriteTCode, 
  logTCodeExecution, 
  checkUserPrivilege, 
  TCode 
} from '../lib/tcodeService';

interface TopBarProps {
  user: { username: string; name: string; role?: string } | null;
  onLogout: () => void;
  onShowHelp?: () => void;
  onToggleFKeysBar?: () => void;
  showFKeysBar?: boolean;
  onNavigate?: (tab: string) => void;
  onLock?: () => void;
  onGoBack?: () => void;
  onGoForward?: () => void;
  canGoBack?: boolean;
  canGoForward?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({ 
  user, 
  onLogout, 
  onShowHelp, 
  onToggleFKeysBar, 
  showFKeysBar = true, 
  onNavigate, 
  onLock,
  onGoBack,
  onGoForward,
  canGoBack = false,
  canGoForward = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isMsgOpen, setIsMsgOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);
  const msgDropdownRef = useRef<HTMLDivElement>(null);
  const themeDropdownRef = useRef<HTMLDivElement>(null);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState<boolean>(false);
  const [copied, setCopied] = useState(false);

  // Database Backup Import/Export Refs & Handlers
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBackupDatabase = () => {
    try {
      const backupData = {
        projects: erpStore.projects,
        workers: erpStore.workers,
        billings: erpStore.billings,
        clientPayments: erpStore.clientPayments,
        kharchis: erpStore.kharchis,
        advances: erpStore.advances,
        workerPayments: erpStore.workerPayments,
        approvals: erpStore.approvals,
        kharchiApprovals: erpStore.kharchiApprovals,
        paymentSheetApprovals: erpStore.paymentSheetApprovals,
        advanceSheetApprovals: erpStore.advanceSheetApprovals,
        expensesLedger: erpStore.expensesLedger,
        messBookings: erpStore.messBookings,
        dlrs: erpStore.dlrs,
        materialItems: erpStore.materialItems,
        materialIssues: erpStore.materialIssues,
        materialReturns: erpStore.materialReturns,
        materialPurchases: erpStore.materialPurchases,
        labourPlannings: erpStore.labourPlannings,
        workerTransfers: erpStore.workerTransfers,
        assets: erpStore.assets,
        assetTransfers: erpStore.assetTransfers,
        assetMaintenances: erpStore.assetMaintenances,
        workerLedger: erpStore.workerLedger,
        workerHolds: erpStore.workerHolds,
        workerRecoveryAuditTrail: erpStore.workerRecoveryAuditTrail,
        attendance: erpStore.attendance,
        trackedBills: erpStore.trackedBills,
        billTimelines: erpStore.billTimelines,
        financialYears: erpStore.financialYears,
        staff: erpStore.staff,
        floorAbstracts: erpStore.floorAbstracts,
        activityLogs: erpStore.activityLogs,
        numberingSettings: erpStore.numberingSettings,
        numberingAuditLogs: erpStore.numberingAuditLogs,
        boqs: erpStore.boqs,
        boqAuditLogs: erpStore.boqAuditLogs
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `SN_Enterprise_ERP_Backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      
      window.dispatchEvent(new CustomEvent('show-success-toast', { 
        detail: { message: "Database Backup saved successfully (JSON)!" } 
      }));
    } catch (e) {
      console.error(e);
      alert("Error generating backup: " + e);
    }
  };

  const handleImportBackupClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      
      const success = await erpStore.importBackup(parsed);
      if (success) {
        window.dispatchEvent(new CustomEvent('show-success-toast', { 
          detail: { message: "Database Backup imported successfully!" } 
        }));
        setTimeout(() => window.location.reload(), 1500);
      } else {
        alert("Failed to import database. Please verify JSON schema.");
      }
    } catch (err) {
      console.error(err);
      alert("Error parsing backup JSON file. Ensure file is a valid JSON backup.");
    }
  };

  const [showMyProfile, setShowMyProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  // Change Password state
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passSuccess, setPassSuccess] = useState<string | null>(null);
  const [passError, setPassError] = useState<string | null>(null);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(null);
    if (!currentPass || !newPass || !confirmPass) {
      setPassError("All fields are required.");
      return;
    }
    if (newPass !== confirmPass) {
      setPassError("New passwords do not match.");
      return;
    }
    setPassSuccess("System Password updated successfully in cache registry!");
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
    setTimeout(() => {
      setShowChangePassword(false);
      setPassSuccess(null);
    }, 1500);
  };

  const erpStore = useAppContext();
  const {
    projects,
    workers,
    trackedBills,
    approvals,
    advanceSheetApprovals,
    kharchiApprovals,
    paymentSheetApprovals,
    expensesLedger,
    materialIssues,
    materialReturns
  } = erpStore;

  const handleCopyUrl = async () => {
    try {
      const downloadUrl = `${window.location.origin}/?download-all-sites-pdf=true`;
      await navigator.clipboard.writeText(downloadUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDirectDownload = () => {
    try {
      const blobUrl = exportConsolidatedSitesReportToPDF(erpStore, user?.name || user?.username || 'Executive');
      downloadPDF(blobUrl, `SN_Enterprise_Consolidated_Sites_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) {
      console.error(e);
    }
  };

  const [command, setCommand] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // SAP T-Code System States
  const [favorites, setFavorites] = useState<string[]>(() => getFavoriteTCodes());
  const [recents, setRecents] = useState<string[]>(() => getRecentTCodes());
  const [unauthorizedTCode, setUnauthorizedTCode] = useState<string | null>(null);
  const [invalidTCode, setInvalidTCode] = useState<string | null>(null);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number>(0);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [tempTypedCommand, setTempTypedCommand] = useState<string>('');

  const [commandHistory, setCommandHistory] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('sap-command-history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const addToHistory = (cmdText: string) => {
    if (!cmdText || !cmdText.trim()) return;
    const cleanCmd = cmdText.trim();
    setCommandHistory(prev => {
      const filtered = prev.filter(c => c.toLowerCase() !== cleanCmd.toLowerCase());
      const updated = [cleanCmd, ...filtered].slice(0, 10);
      localStorage.setItem('sap-command-history', JSON.stringify(updated));
      return updated;
    });
  };

  const clearHistory = () => {
    localStorage.removeItem('sap-command-history');
    setCommandHistory([]);
    setHistoryIndex(-1);
  };

  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      // Focus command field on Ctrl+K, Ctrl+/, Cmd+K, or F11
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'k' || e.key === '/')) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsSearchFocused(true);
      } else if (e.key === 'F11') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsSearchFocused(true);
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => {
      window.removeEventListener('keydown', handleShortcut);
    };
  }, []);

  // Compute unified autocomplete suggestions (T-Codes + Live Records)
  const suggestions = useMemo(() => {
    const q = command.trim().toLowerCase();
    const tcodes = getTCodeList().filter(t => t.isActive);

    if (!q) return [];

    let searchVal = q;
    if (q.startsWith('/n')) {
      searchVal = q.slice(2).trim();
    }

    if (!searchVal) {
      // Just "/n" typed, list all active T-Codes
      return tcodes.map(t => ({
        type: 'tcode' as const,
        code: t.code,
        name: t.name,
        description: t.description,
        tab: t.tab,
        props: t.props
      }));
    }

    const matches: {
      type: 'tcode' | 'project' | 'worker' | 'bill';
      code?: string;
      name: string;
      description?: string;
      tab?: string;
      props?: any;
      recordId?: string;
    }[] = [];

    // Match T-Codes
    tcodes.forEach(t => {
      if (
        t.code.toLowerCase().includes(searchVal) ||
        t.name.toLowerCase().includes(searchVal) ||
        t.description.toLowerCase().includes(searchVal) ||
        t.module.toLowerCase().includes(searchVal)
      ) {
        matches.push({
          type: 'tcode',
          code: t.code,
          name: t.name,
          description: t.description,
          tab: t.tab,
          props: t.props
        });
      }
    });

    // Match Projects
    (projects || []).forEach(p => {
      if (p.name.toLowerCase().includes(searchVal) || (p.clientName || '').toLowerCase().includes(searchVal)) {
        matches.push({
          type: 'project',
          recordId: p.id,
          name: p.name,
          description: `Project: ${p.name} (Client: ${p.clientName || 'N/A'})`,
          tab: 'projects',
          props: { searchQuery: p.name }
        });
      }
    });

    // Match Workers
    (workers || []).forEach(w => {
      if (w.name.toLowerCase().includes(searchVal) || w.workerId.toLowerCase().includes(searchVal)) {
        matches.push({
          type: 'worker',
          recordId: w.id,
          name: w.name,
          description: `Worker: ${w.name} (${w.designation || 'Labour'}) - ID: ${w.workerId}`,
          tab: 'workers',
          props: { initialWorkerId: w.id, initialView: 'list' }
        });
      }
    });

    // Match Bills
    (trackedBills || []).forEach(b => {
      if (b.billNo.toLowerCase().includes(searchVal) || b.clientName.toLowerCase().includes(searchVal)) {
        matches.push({
          type: 'bill',
          recordId: b.id,
          name: `Bill: #${b.billNo}`,
          description: `RA Bill Amount: ₹${b.billAmount || 0} - Status: ${b.currentStatus}`,
          tab: 'bill-tracking',
          props: { searchQuery: b.billNo }
        });
      }
    });

    return matches.slice(0, 15);
  }, [command, projects, workers, trackedBills]);

  // Execute T-Code directly with privilege check and audit trail logging
  const handleExecuteTCodeDirect = (code: string) => {
    const tcodes = getTCodeList();
    const matched = tcodes.find(t => t.code.toUpperCase() === code.toUpperCase());
    if (!matched) return;

    const userRole = user?.role || (user?.username === 'saddamsne' || user?.username === 'rejatousifsne' ? 'admin' : 'staff');
    if (!checkUserPrivilege(matched, userRole)) {
      setUnauthorizedTCode(matched.code);
      setIsSearchFocused(false);
      return;
    }

    // Add to recents
    addRecentTCode(matched.code);
    setRecents(getRecentTCodes());

    // Log Execution Audit Trail
    logTCodeExecution(matched.code, user?.username || 'Guest', 'Executed Transaction Code via Global Command Bar');

    // Route tab
    if ((window as any).openWorkspaceTab) {
      (window as any).openWorkspaceTab(matched.tab, matched.name, matched.props);
    } else if (onNavigate) {
      onNavigate(matched.tab);
    }

    setCommand('');
    setIsSearchFocused(false);
    setHistoryIndex(-1);
    setSelectedSuggestionIndex(0);
  };

  // Main input Enter / submit router
  const handleExecute = () => {
    const raw = command.trim();
    if (!raw) return;

    addToHistory(raw);

    // Check for exact match T-Code first
    let targetCode = raw.toUpperCase();
    let isExplicitTCode = false;
    if (targetCode.startsWith('/N')) {
      targetCode = targetCode.slice(2).trim();
      isExplicitTCode = true;
    }

    const tcodes = getTCodeList();
    const matched = tcodes.find(t => t.code.toUpperCase() === targetCode);
    if (matched) {
      handleExecuteTCodeDirect(matched.code);
      return;
    }

    // If they explicitly used "/n" prefix or entered something matching the T-Code pattern (e.g. 3-8 letters followed by 2 numbers) but no match was found
    const tcodePattern = /^[A-Z]{3,8}\d{2}$/;
    const isPatternTCode = tcodePattern.test(targetCode);

    if (isExplicitTCode || isPatternTCode) {
      setInvalidTCode(targetCode || 'Unknown');
      setIsSearchFocused(false);
      return;
    }

    // If suggestions are active and a highlighted suggestion is active
    if (suggestions.length > 0) {
      const selected = suggestions[selectedSuggestionIndex] || suggestions[0];
      if (selected.type === 'tcode' && selected.code) {
        handleExecuteTCodeDirect(selected.code);
      } else {
        if ((window as any).openWorkspaceTab) {
          (window as any).openWorkspaceTab(selected.tab, selected.name, selected.props);
        } else if (onNavigate && selected.tab) {
          onNavigate(selected.tab);
        }
        setCommand('');
        setIsSearchFocused(false);
      }
      return;
    }

    // Fallback general search
    const q = raw.toLowerCase();
    const matchedProj = (projects || []).find(p => p.name.toLowerCase().includes(q));
    if (matchedProj) {
      if ((window as any).openWorkspaceTab) {
        (window as any).openWorkspaceTab('projects', matchedProj.name, { searchQuery: matchedProj.name });
      } else if (onNavigate) {
        onNavigate('projects');
      }
    } else {
      if (onNavigate) onNavigate('dashboard');
    }

    setCommand('');
    setIsSearchFocused(false);
  };

  // Notification generation logic
  const notifications = useMemo(() => {
    const list: { id: string; type: 'warning' | 'info' | 'alert'; message: string; date: string }[] = [];

    // 1. Pending Approvals
    let pendingCount = 0;
    pendingCount += approvals.filter(a => a.status === 'Pending').length;
    pendingCount += advanceSheetApprovals.filter(a => a.status === 'Pending').length;
    pendingCount += kharchiApprovals.filter(a => a.status === 'Pending').length;
    pendingCount += paymentSheetApprovals.filter(a => a.status === 'Pending').length;
    pendingCount += expensesLedger.filter(e => e.status === 'Submitted').length;

    if (pendingCount > 0) {
      list.push({
        id: 'pending-approvals',
        type: 'alert',
        message: `${pendingCount} item(s) pending your approval in workflow engine.`,
        date: new Date().toISOString()
      });
    }

    // 2. Upcoming Bill Deadlines
    const today = new Date();
    trackedBills.forEach(b => {
      if (b.expectedPaymentDate && b.currentStatus !== 'Fully Paid' && b.currentStatus !== 'Closed') {
        const expectedDate = new Date(b.expectedPaymentDate);
        const timeDiff = expectedDate.getTime() - today.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        if (daysDiff >= 0 && daysDiff <= 5) {
          list.push({
            id: `bill-dl-${b.id}`,
            type: 'warning',
            message: `Bill ${b.billNo} payment expected in ${daysDiff} day(s).`,
            date: b.expectedPaymentDate
          });
        }
      }
    });

    // 3. Low Material Stock
    const reconciliationBalances = (() => {
      const balances: { [key: string]: { itemId: string; received: number; returned: number; balance: number } } = {};
      materialIssues.forEach(m => {
        if (!balances[m.itemId]) balances[m.itemId] = { itemId: m.itemId, received: 0, returned: 0, balance: 0 };
        balances[m.itemId].received += Number(m.qty || 0);
      });
      materialReturns.forEach(r => {
        if (!balances[r.itemId]) balances[r.itemId] = { itemId: r.itemId, received: 0, returned: 0, balance: 0 };
        balances[r.itemId].returned += Number(r.qty || 0);
      });
      return Object.values(balances).map(b => ({
        ...b,
        balance: Math.max(0, b.received - b.returned)
      }));
    })();

    let lowStockCount = 0;
    reconciliationBalances.forEach(stock => {
      if (stock.balance < 10) {
         lowStockCount++;
      }
    });
    
    if (lowStockCount > 0) {
      list.push({
        id: 'low-stock',
        type: 'warning',
        message: `${lowStockCount} material item(s) are running critically low on stock (balance < 10).`,
        date: new Date().toISOString()
      });
    }

    return list.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [
    trackedBills,
    approvals, advanceSheetApprovals, kharchiApprovals, paymentSheetApprovals, expensesLedger,
    materialIssues, materialReturns
  ]);

  const unreadCount = notifications.length;

  useEffect(() => {
    const isDark = localStorage.getItem('sap-dark-mode') === 'true';
    if (isDark) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
    
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && typeof customEvent.detail.darkMode === 'boolean') {
        setDarkMode(customEvent.detail.darkMode);
      }
    };
    
    window.addEventListener('theme-changed', handleThemeChange);
    return () => {
      window.removeEventListener('theme-changed', handleThemeChange);
    };
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('sap-dark-mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('sap-dark-mode', 'false');
    }
    window.dispatchEvent(new CustomEvent('theme-changed', { detail: { darkMode: newDarkMode } }));
  };

  // Close dropdowns if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (msgDropdownRef.current && !msgDropdownRef.current.contains(event.target as Node)) {
        setIsMsgOpen(false);
      }
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target as Node)) {
        setIsThemeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="flex flex-col bg-[#eef2f6] border-b border-[#8c9ba8] select-none text-[11px]">
      {/* Brand & Profile Section */}
      <div className="bg-[var(--color-sap-blue-val)] text-white px-3 py-1 flex items-center justify-between border-b border-[#8c9ba8] shadow-sm">
        <div className="flex items-center space-x-2">
          <SNLogo size={22} className="text-white hover:scale-105 transition-transform" />
          <span className="font-mono text-xs font-black uppercase tracking-widest text-white">SN ENTERPRISES ERP</span>
          <span className="text-[9px] text-blue-200 bg-[#001f4d] px-1.5 py-0.5 rounded border border-blue-900 font-mono">ERP_PRD</span>
        </div>
        
        {/* Notifications and Profile */}
        <div className="flex items-center space-x-3">
          {/* Theme Selector Dropdown */}
          <div className="relative" ref={themeDropdownRef}>
            <button
              onClick={() => setIsThemeDropdownOpen(!isThemeDropdownOpen)}
              title="Change Workspace Theme"
              className="flex items-center space-x-1.5 p-1.5 hover:bg-[#001f4d] rounded transition duration-150 text-white focus:outline-none cursor-pointer border border-[#8c9ba8]/20 bg-[var(--color-sap-blue-val)]"
            >
              {darkMode ? (
                <Moon size={13} className="text-blue-300" />
              ) : (
                <Sun size={13} className="text-amber-400" />
              )}
              <span className="font-mono text-[9px] uppercase tracking-wider font-bold">Theme</span>
              <ChevronDown size={10} className={`transform transition-transform text-blue-200 ${isThemeDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isThemeDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-[#8c9ba8] shadow-2xl rounded-sm z-50 animate-fade-in text-slate-800 p-2 divide-y divide-gray-100 flex flex-col">
                <div className="pb-1.5 mb-1.5">
                  <span className="font-bold text-[9px] uppercase tracking-wide text-gray-500 block">Workspace Display Theme</span>
                  <span className="text-[8px] text-gray-400">Calibrate screen brightness for optimal task efficiency</span>
                </div>
                
                <div className="space-y-1.5 pt-1.5">
                  {/* SAP-Inspired Blue Option */}
                  <button
                    onClick={() => {
                      if (darkMode) toggleDarkMode();
                      setIsThemeDropdownOpen(false);
                    }}
                    className={`w-full text-left p-2 rounded-sm transition-all duration-150 flex items-start space-x-2.5 border ${
                      !darkMode 
                        ? 'bg-blue-50/70 border-blue-300 shadow-sm ring-1 ring-blue-100' 
                        : 'bg-white border-gray-100 hover:bg-slate-50 hover:border-gray-300'
                    }`}
                  >
                    <div className="w-4 h-4 bg-[var(--btn-hover-top)] rounded-full border border-blue-400 mt-0.5 shrink-0 flex items-center justify-center">
                      {!darkMode && <Check size={10} className="text-white font-bold" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[10px] text-slate-950 uppercase tracking-tight">SAP Blue (Light)</span>
                        <span className="bg-[#e6f2ff] text-[#0056b3] font-mono text-[7px] font-bold px-1 rounded uppercase border border-blue-200">Default</span>
                      </div>
                      <p className="text-[9px] text-slate-500 mt-0.5 leading-normal">
                        Classic light interface. Recommended for high-brightness standard offices and daytime workflows.
                      </p>
                    </div>
                  </button>

                  {/* High-Contrast Dark Mode Option */}
                  <button
                    onClick={() => {
                      if (!darkMode) toggleDarkMode();
                      setIsThemeDropdownOpen(false);
                    }}
                    className={`w-full text-left p-2 rounded-sm transition-all duration-150 flex items-start space-x-2.5 border ${
                      darkMode 
                        ? 'bg-blue-950/25 border-blue-800 shadow-sm ring-1 ring-blue-900/35' 
                        : 'bg-white border-gray-100 hover:bg-slate-50 hover:border-gray-300'
                    }`}
                  >
                    <div className="w-4 h-4 bg-[#1c1e21] rounded-full border border-gray-600 mt-0.5 shrink-0 flex items-center justify-center">
                      {darkMode && <Check size={10} className="text-[#5da5e1] font-bold" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[10px] text-slate-950 uppercase tracking-tight">High-Contrast Dark</span>
                        <span className="bg-slate-900 text-amber-400 font-mono text-[7px] font-bold px-1 rounded uppercase border border-slate-700">Eye-Care</span>
                      </div>
                      <p className="text-[9px] text-slate-500 mt-0.5 leading-normal">
                        Specifically calibrated with reduced eye-strain luminance. Perfect for long-duration, high-intensity data entry.
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="relative" ref={msgDropdownRef}>
            <button
              onClick={() => setIsMsgOpen(!isMsgOpen)}
              className="relative flex items-center justify-center p-1.5 hover:bg-[#001f4d] rounded transition duration-150 text-white focus:outline-none cursor-pointer"
              title="System message inbox"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-200"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              <span className="absolute top-0.5 right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-duration-1000"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
            </button>

            {isMsgOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-[#8c9ba8] shadow-2xl rounded-sm z-50 animate-fade-in divide-y divide-gray-100 flex flex-col text-slate-800">
                <div className="bg-gradient-to-r from-[#0056b3] to-[#002f6c] text-white px-3 py-1.5 flex items-center justify-between select-none">
                  <span className="font-bold text-[9px] uppercase tracking-wide">System Messages Inbox</span>
                </div>
                <div className="p-4 text-center text-gray-500 flex flex-col items-center select-none py-6">
                  <span className="font-semibold text-[10px] text-gray-700">No new messages</span>
                  <span className="text-[9px] text-gray-400 mt-0.5 uppercase font-mono">channels monitored live</span>
                </div>
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="relative" ref={notifDropdownRef}>
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative flex items-center justify-center p-1.5 hover:bg-[#001f4d] rounded transition duration-150 text-white focus:outline-none"
            >
              <Bell size={16} className="text-blue-200" />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-[var(--color-sap-blue-val)] text-[7px] items-center justify-center font-bold text-white leading-none shadow shadow-red-900/50">
                    {unreadCount}
                  </span>
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-[#8c9ba8] shadow-2xl rounded-sm z-50 animate-fade-in divide-y divide-gray-100 flex flex-col max-h-[85vh]">
                <div className="bg-gradient-to-r from-[#0056b3] to-[#002f6c] text-white px-3 py-2 flex items-center justify-between select-none shrink-0">
                  <span className="font-bold text-[10px] uppercase tracking-wide flex items-center">
                    <Bell size={12} className="mr-1.5" /> System Alerts & Notifications
                  </span>
                  {unreadCount > 0 && (
                    <span className="bg-blue-800 text-blue-100 text-[9px] px-1.5 py-0.5 rounded font-mono border border-blue-600">
                      {unreadCount} New
                    </span>
                  )}
                </div>
                
                <div className="overflow-y-auto w-full text-black">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-500 flex flex-col items-center">
                      <CheckCircle2 size={32} className="text-gray-300 mb-2" />
                      <span className="font-semibold text-xs">All clear</span>
                      <span className="text-[10px] mt-0.5">No pending alerts dynamically detected.</span>
                    </div>
                  ) : (
                    <ul className="w-full">
                      {notifications.map(notif => (
                        <li key={notif.id} className="p-3 hover:bg-[#f5f8fb] transition-colors group border-b border-gray-100 last:border-b-0 cursor-default">
                          <div className="flex items-start space-x-2.5">
                            <div className="shrink-0 mt-0.5">
                              {notif.type === 'alert' && <AlertTriangle size={14} className="text-red-500" />}
                              {notif.type === 'warning' && <AlertCircle size={14} className="text-amber-500" />}
                              {notif.type === 'info' && <Info size={14} className="text-blue-500" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] text-gray-800 font-medium leading-snug">{notif.message}</p>
                              <p className="text-[9px] text-gray-400 mt-1 font-mono uppercase">
                                {new Date(notif.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                              </p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                
                <div className="bg-gray-50 p-2 text-center border-t border-gray-200 shrink-0">
                  <span className="text-[9px] text-gray-400 uppercase font-mono tracking-wider">Automated Intelligence</span>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => onLock && onLock()}
            className="flex items-center space-x-1 hover:bg-[#001f4d] px-2 py-1 rounded transition duration-150 cursor-pointer text-white mx-1"
            title="Lock Session (F13)"
          >
            <div className="flex items-center space-x-1 opacity-90 border border-blue-400/50 bg-blue-900/20 px-1.5 py-0.5 rounded-sm hover:opacity-100 hover:border-blue-400">
               <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
               <span className="font-semibold text-[10px] hidden lg:inline">Lock</span>
            </div>
          </button>

        {/* Profile Card / Dropdown Menu */}
        {user && (
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center space-x-1.5 hover:bg-[#001f4d] px-2 py-1 rounded transition duration-150 cursor-pointer text-white"
            >
              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center font-mono text-[9px] font-bold text-white uppercase border border-blue-300 shadow-sm shrink-0">
                {user.name.charAt(0)}
              </div>
              <span className="font-semibold text-[10px] hover:underline text-white select-none pr-0.5">{user.name}</span>
              <ChevronDown size={11} className={`transform transition-transform text-blue-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
              <div className="absolute right-0 mt-1.5 w-60 bg-[#eef2f6] border border-[#8c9ba8] shadow-2xl rounded-sm z-50 text-gray-800 animate-fade-in">
                <div className="bg-gradient-to-r from-[#0056b3] to-[#002f6c] text-white px-2 py-1 flex items-center select-none">
                  <span className="font-bold text-[9px] uppercase tracking-wide">System Access Profile</span>
                </div>
                <div className="p-3 bg-white border border-[#8c9ba8] border-t-0 text-[10px] space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-[var(--btn-hover-top)] text-white rounded-full flex items-center justify-center font-mono text-xs font-semibold uppercase shrink-0">
                      {user.name.split(' ').map((n: any) => n.charAt(0)).join('')}
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[8px] uppercase">User Full Name</span>
                      <span className="font-bold text-gray-900 text-[11px]">{user.name}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[8px] uppercase">User Access ID</span>
                    <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-800 text-[10px] font-semibold border border-gray-200 inline-block">{user.username}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[8px] uppercase">Access Role</span>
                    <span className="text-gray-700 font-semibold text-[10px]">
                      {user.username === 'saddamsne' ? 'Owner' : 'Managing Director'}
                    </span>
                  </div>

                  {/* Profile & Password Menu Actions */}
                  <div className="border-t border-gray-200 pt-2 pb-1 space-y-1">
                    <button 
                      onClick={() => { setShowMyProfile(true); setIsOpen(false); }}
                      className="w-full text-left py-1 px-1.5 hover:bg-slate-100 rounded text-slate-700 font-semibold flex items-center space-x-1.5 cursor-pointer text-[10px]"
                    >
                      <User size={12} className="text-[#0056b3]" />
                      <span>My Profile Detail</span>
                    </button>
                    <button 
                      onClick={() => { setShowChangePassword(true); setIsOpen(false); }}
                      className="w-full text-left py-1 px-1.5 hover:bg-slate-100 rounded text-slate-700 font-semibold flex items-center space-x-1.5 cursor-pointer text-[10px]"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                      <span>Change Password</span>
                    </button>
                    <button 
                      onClick={() => { onNavigate && onNavigate('activity-log'); setIsOpen(false); }}
                      className="w-full text-left py-1 px-1.5 hover:bg-slate-100 rounded text-slate-700 font-semibold flex items-center space-x-1.5 cursor-pointer text-[10px]"
                    >
                      <Clock size={12} className="text-indigo-600" />
                      <span>System Activity Log</span>
                    </button>
                    <button 
                      onClick={() => { onNavigate && onNavigate('numbering-settings'); setIsOpen(false); }}
                      className="w-full text-left py-1 px-1.5 hover:bg-slate-100 rounded text-slate-700 font-semibold flex items-center space-x-1.5 cursor-pointer text-[10px]"
                    >
                      <Settings size={12} className="text-slate-600" />
                      <span>Document Settings</span>
                    </button>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[8px] uppercase">Connection Status</span>
                    <span className="text-green-700 font-bold flex items-center mt-0.5 text-[10px]">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block mr-1 animate-pulse"></span>
                      Authenticated Mode
                    </span>
                  </div>

                  {/* QR Code Section */}
                  <div className="pt-2 border-t border-gray-150 flex flex-col items-center space-y-1.5">
                    <div className="flex items-center space-x-1 text-[var(--color-sap-blue-val)] font-bold text-[8px] uppercase tracking-wide">
                      <QrCode size={11} className="text-[#0056b3]" />
                      <span>Scan for Sites Report PDF</span>
                    </div>
                    
                    <div className="bg-white p-1.5 rounded border border-gray-300 shadow-sm relative group cursor-pointer" title="Scan with mobile to download consolidated reports PDF">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.origin + '/?download-all-sites-pdf=true')}`}
                        alt="ERP Reports QR Code"
                        className="w-24 h-24 select-all"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    
                    <div className="flex items-center space-x-1.5 w-full">
                      <button
                        onClick={handleDirectDownload}
                        title="Compile and download all site reports now (PDF)"
                        className="sap-btn flex-1 py-1 px-1.5 text-[9px] text-[var(--color-sap-blue-val)] hover:text-[#001f4d] font-bold uppercase hover:bg-blue-50 border-blue-450 transition flex items-center justify-center space-x-1 h-6 cursor-pointer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        <span>Download</span>
                      </button>
                      <button
                        onClick={handleCopyUrl}
                        title={copied ? "Copied download URL to clipboard!" : "Copy URL to clipboard"}
                        className={`sap-btn px-2 text-[9px] font-bold uppercase transition flex items-center justify-center space-x-1 h-6 cursor-pointer border ${copied ? 'bg-green-700 hover:bg-green-800 text-white border-green-700' : 'text-gray-700 hover:bg-gray-100 border-gray-400'}`}
                      >
                        {copied ? (
                          <span>Copied!</span>
                        ) : (
                          <>
                            <Copy size={9} />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-150 flex items-center">
                    <button 
                      onClick={() => {
                        setIsOpen(false);
                        onLogout();
                      }}
                      className="sap-btn flex items-center space-x-1.5 text-xs text-red-700 font-bold w-full uppercase py-1 px-3 justify-center text-center bg-red-50 hover:bg-red-100 border-red-300 leading-none"
                    >
                      <LogOut size={11} className="text-red-700 shrink-0" />
                      <span>Log Out System</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* SAP Profile Details Modals */}
      {showMyProfile && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center z-[99999] p-4 select-none animate-fade-in text-slate-800">
          <div className="sap-panel bg-white w-full max-w-sm rounded p-4 shadow-2xl border-b-4 border-b-[#0056b3]">
            <div className="font-extrabold pb-2 mb-3 border-b border-gray-200 text-[var(--color-sap-blue-val)] text-xs uppercase tracking-wider flex justify-between items-center">
              <span>My ERP Profile Detail</span>
              <button onClick={() => setShowMyProfile(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer text-xs">✕</button>
            </div>
            <div className="space-y-2.5 text-[11px]">
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500 font-bold uppercase text-[9px]">Account Username</span>
                <span className="font-mono font-bold text-slate-900">{user?.username}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500 font-bold uppercase text-[9px]">Full Access Name</span>
                <span className="font-semibold text-slate-900">{user?.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500 font-bold uppercase text-[9px]">Access Privilege Role</span>
                <span className="font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                  {user?.username === 'saddamsne' ? 'Owner / Superadmin' : 'Executive Director'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500 font-bold uppercase text-[9px]">Registered Domain</span>
                <span className="text-slate-700 font-mono">snenterprises.co.in</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500 font-bold uppercase text-[9px]">Session Status</span>
                <span className="text-green-700 font-bold flex items-center">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block mr-1 animate-pulse"></span>
                  Active Secure Session
                </span>
              </div>
            </div>
            <div className="mt-4 pt-2 border-t border-gray-200 flex justify-end">
              <button onClick={() => setShowMyProfile(false)} className="sap-btn bg-slate-100 text-slate-700">Close Profile</button>
            </div>
          </div>
        </div>
      )}

      {showChangePassword && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center z-[99999] p-4 select-none animate-fade-in text-slate-800">
          <div className="sap-panel bg-white w-full max-w-sm rounded p-4 shadow-2xl border-b-4 border-b-amber-500">
            <div className="font-extrabold pb-2 mb-3 border-b border-gray-200 text-[var(--color-sap-blue-val)] text-xs uppercase tracking-wider flex justify-between items-center">
              <span>Change Account Password</span>
              <button onClick={() => { setShowChangePassword(false); setPassError(null); setPassSuccess(null); }} className="text-gray-400 hover:text-gray-600 cursor-pointer text-xs">✕</button>
            </div>
            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              <div>
                <label className="block text-[9px] text-gray-500 uppercase font-bold mb-1">Current Password</label>
                <input required type="password" value={currentPass} onChange={e => setCurrentPass(e.target.value)} className="sap-input w-full" placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-[9px] text-gray-500 uppercase font-bold mb-1">New Password</label>
                <input required type="password" value={newPass} onChange={e => setNewPass(e.target.value)} className="sap-input w-full" placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-[9px] text-gray-500 uppercase font-bold mb-1">Confirm New Password</label>
                <input required type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} className="sap-input w-full" placeholder="••••••••" />
              </div>
              {passError && <p className="text-[10px] text-red-600 font-bold">{passError}</p>}
              {passSuccess && <p className="text-[10px] text-green-700 font-bold">{passSuccess}</p>}
              <div className="pt-2 border-t border-gray-150 flex justify-end gap-2">
                <button type="button" onClick={() => { setShowChangePassword(false); setPassError(null); setPassSuccess(null); }} className="sap-btn bg-slate-50 text-slate-600">Cancel</button>
                <button type="submit" className="sap-btn bg-amber-500 text-slate-900 hover:bg-amber-600 font-bold">Update Password</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Menu Bar */}
      <div className="flex items-center px-2 py-0.5 text-[11px] space-x-3 select-none">
        <span className="hover:bg-[#d9e4f1] hover:border-[#8c9ba8] border border-transparent px-1 cursor-default">File</span>
        <span className="hover:bg-[#d9e4f1] hover:border-[#8c9ba8] border border-transparent px-1 cursor-default">Edit</span>
        <div className="relative group">
          <span className="hover:bg-[#d9e4f1] hover:border-[#8c9ba8] border border-transparent px-1 cursor-pointer">Navigate</span>
          <div className="absolute left-0 mt-0.5 w-[220px] bg-[#f5f8fb] border border-[#8c9ba8] shadow-2xl hidden group-hover:block z-[9999] text-black">
            <div className="bg-[var(--color-sap-blue-val)] text-white font-semibold text-[8px] px-2 py-0.5 select-none uppercase font-mono">F-Key Quick Jump</div>
            <div className="max-h-80 overflow-y-auto cursor-pointer">
              <button onClick={onShowHelp} className="w-full text-left px-2 py-1.5 hover:bg-blue-600 hover:text-white text-[10px] flex items-center justify-between">
                <span>F1: Show Keyboard Help</span>
                <span className="bg-gray-200 text-gray-800 rounded px-1 text-[8px] font-mono select-none">F1</span>
              </button>
              <div className="border-t border-gray-200"></div>
              <button onClick={onToggleFKeysBar} className="w-full text-left px-2 py-1.5 hover:bg-blue-600 hover:text-white text-[10px] flex items-center justify-between">
                <span>{showFKeysBar ? "Hide Shortcut Ribbon" : "Show Shortcut Ribbon"}</span>
                <span className="text-gray-400 text-[8px]">Ctrl/Alt</span>
              </button>
            </div>
          </div>
        </div>
        <span className="hover:bg-[#d9e4f1] hover:border-[#8c9ba8] border border-transparent px-1 cursor-default">Project</span>
        <span className="hover:bg-[#d9e4f1] hover:border-[#8c9ba8] border border-transparent px-1 cursor-default">Window</span>
        <div className="relative group">
          <span className="hover:bg-[#d9e4f1] hover:border-[#8c9ba8] border border-transparent px-1 cursor-pointer font-semibold text-[#0056b3]">Help</span>
          <div className="absolute left-0 mt-0.5 w-[200px] bg-[#f5f8fb] border border-[#8c9ba8] shadow-2xl hidden group-hover:block z-[9999] text-black">
            <div className="bg-[var(--color-sap-blue-val)] text-white font-semibold text-[8px] px-2 py-0.5 select-none uppercase font-mono">System Guides</div>
            <button onClick={onShowHelp} className="w-full text-left px-2 py-1.5 hover:bg-blue-600 hover:text-white text-[10px] flex items-center justify-between">
              <span>F1 Keyboard Guidelines</span>
              <span className="bg-gray-200 text-gray-800 rounded px-1 text-[8px] font-mono select-none">F1</span>
            </button>
            <button onClick={onToggleFKeysBar} className="w-full text-left px-2 py-1.5 hover:bg-blue-600 hover:text-white text-[10px] flex items-center justify-between">
              <span>Toggle Ribbon Bar</span>
              <span className="text-gray-400 text-[8px]">Ribbon</span>
            </button>
          </div>
        </div>
      </div>
      {/* Tool Bar */}
      <div className="flex items-center px-1 py-1 space-x-1.5 border-t border-white">
        {/* SAP Command Field */}
        <div className="flex items-center space-x-0.5 border-r border-[#8c9ba8] pr-1.5 mr-1 select-none shrink-0">
          {/* Circular Enter green tick button */}
          <button 
            type="button"
            onClick={() => handleExecute()}
            title="Execute Command / Search (Enter)"
            className="w-5 h-5 flex items-center justify-center bg-white border border-[#8c9ba8] hover:bg-[#cce8ff] hover:border-[#0056b3] rounded-full cursor-pointer text-green-700 shadow-sm transition-colors duration-100 shrink-0"
          >
            <Check size={11} strokeWidth={3} />
          </button>
          
          <div className="relative" ref={searchDropdownRef}>
            <div className="flex items-center">
              <input 
                type="text"
                ref={inputRef}
                value={command}
                onChange={(e) => {
                  const val = e.target.value;
                  setCommand(val);
                  setTempTypedCommand(val);
                  setHistoryIndex(-1);
                  setSelectedSuggestionIndex(0);
                }}
                onFocus={() => {
                  setIsSearchFocused(true);
                  setFavorites(getFavoriteTCodes());
                  setRecents(getRecentTCodes());
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleExecute();
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (command.trim()) {
                      if (suggestions.length > 0) {
                        setSelectedSuggestionIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
                      }
                    } else if (commandHistory.length > 0) {
                      const nextIdx = historyIndex + 1;
                      if (nextIdx < commandHistory.length) {
                        setHistoryIndex(nextIdx);
                        setCommand(commandHistory[nextIdx]);
                      }
                    }
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (command.trim()) {
                      if (suggestions.length > 0) {
                        setSelectedSuggestionIndex(prev => (prev + 1) % suggestions.length);
                      }
                    } else {
                      const nextIdx = historyIndex - 1;
                      if (nextIdx >= 0) {
                        setHistoryIndex(nextIdx);
                        setCommand(commandHistory[nextIdx]);
                      } else if (nextIdx === -1) {
                        setHistoryIndex(-1);
                        setCommand(tempTypedCommand);
                      }
                    }
                  } else if (e.key === 'Escape') {
                    setIsSearchFocused(false);
                  }
                }}
                placeholder="Command or Search... [Ctrl+K]"
                className="w-48 bg-white border border-[#8c9ba8] text-black px-1.5 py-[2px] text-[10px] uppercase font-mono placeholder:normal-case focus:outline-none focus:border-[#0056b3] focus:ring-[1px] focus:ring-[#0056b3]"
              />
              <button 
                type="button"
                onClick={() => {
                  setIsSearchFocused(prev => !prev);
                  if (!isSearchFocused) {
                    setTimeout(() => inputRef.current?.focus(), 10);
                  }
                }}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black focus:outline-none cursor-pointer"
              >
                <ChevronDown size={10} />
              </button>
            </div>

            {/* Fiori-styled Suggestions Popover */}
            {isSearchFocused && (
              <div className="absolute left-0 mt-1.5 w-[420px] bg-[#f5f8fb] border-2 border-[var(--color-sap-blue-val)] shadow-[0_15px_30px_rgba(0,0,0,0.3)] rounded-sm z-[99999] text-black animate-fade-in divide-y divide-gray-200">
                {/* SAP style status line */}
                <div className="bg-[var(--color-sap-blue-val)] text-white px-2 py-0.5 flex items-center justify-between text-[8px] font-bold uppercase font-mono tracking-wider">
                  <div className="flex items-center space-x-1">
                    <Search size={10} className="text-amber-400" />
                    <span>SAP ERP Enterprise Command Hub (Client: 100)</span>
                  </div>
                  <span className="text-blue-200 font-mono">SYS_PROD</span>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-gray-150 bg-white">
                  {/* Empty Command Input Mode - show Favorites and Recents */}
                  {!command.trim() && (
                    <div className="p-0 select-none animate-fade-in">
                      {/* Favorites Segment */}
                      <div className="bg-amber-50/50 p-2 border-b border-gray-100">
                        <div className="flex items-center justify-between text-[8px] uppercase font-mono font-bold text-amber-800 px-1 border-b border-amber-200 mb-1.5 pb-0.5">
                          <span className="flex items-center space-x-1">
                            <Star size={10} className="fill-amber-400 text-amber-500" />
                            <span>⭐ Pinned Favorites (DASHBOARD WIDGETS)</span>
                          </span>
                        </div>
                        {favorites.length === 0 ? (
                          <p className="text-[9px] text-gray-400 italic px-1">No favorited transactions. Type a T-Code and click the star icon to pin.</p>
                        ) : (
                          <div className="grid grid-cols-1 gap-1 max-h-32 overflow-y-auto">
                            {favorites.map(favCode => {
                              const tcodeObj = getTCodeList().find(t => t.code === favCode);
                              if (!tcodeObj) return null;
                              return (
                                <div key={favCode} className="flex items-center justify-between hover:bg-amber-50 p-1 rounded border border-amber-100/40 text-[9px]">
                                  <button
                                    onClick={() => handleExecuteTCodeDirect(favCode)}
                                    className="text-left font-mono truncate text-[#0056b3] hover:text-blue-900 flex-1 flex items-center space-x-2"
                                  >
                                    <span className="font-bold bg-amber-100 px-1 text-[8px] rounded">{favCode}</span>
                                    <span className="font-sans font-medium text-gray-800">{tcodeObj.name}</span>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleFavoriteTCode(favCode);
                                      setFavorites(getFavoriteTCodes());
                                    }}
                                    title="Unpin Favorite"
                                    className="p-0.5 hover:bg-amber-200 rounded text-amber-600"
                                  >
                                    <Star size={10} className="fill-amber-400 text-amber-500" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Recents Segment */}
                      <div className="bg-slate-50 p-2">
                        <div className="flex items-center justify-between text-[8px] uppercase font-mono font-bold text-slate-700 px-1 border-b border-slate-200 mb-1.5 pb-0.5">
                          <span className="flex items-center space-x-1">
                            <Clock size={10} className="text-slate-500" />
                            <span>⌛ Recently Executed Transactions</span>
                          </span>
                          {recents.length > 0 && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                localStorage.removeItem('sap-tcode-recents');
                                setRecents([]);
                              }}
                              className="text-red-600 hover:text-red-800 text-[8px] flex items-center space-x-0.5 uppercase tracking-wide font-bold focus:outline-none cursor-pointer"
                            >
                              <Trash2 size={8} />
                              <span>Clear</span>
                            </button>
                          )}
                        </div>
                        {recents.length === 0 ? (
                          <p className="text-[9px] text-gray-400 italic px-1">No recently used transactions. Execute a T-Code to view your history.</p>
                        ) : (
                          <div className="grid grid-cols-1 gap-1 max-h-36 overflow-y-auto">
                            {recents.map(recCode => {
                              const tcodeObj = getTCodeList().find(t => t.code === recCode);
                              if (!tcodeObj) return null;
                              const isFav = favorites.includes(recCode);
                              return (
                                <div key={recCode} className="flex items-center justify-between hover:bg-slate-200 p-1 rounded border border-gray-100 text-[9px]">
                                  <button
                                    onClick={() => handleExecuteTCodeDirect(recCode)}
                                    className="text-left font-mono truncate text-[#0056b3] hover:text-blue-900 flex-1 flex items-center space-x-2"
                                  >
                                    <span className="font-bold bg-gray-200 px-1 text-[8px] rounded">{recCode}</span>
                                    <span className="font-sans font-medium text-gray-800">{tcodeObj.name}</span>
                                  </button>
                                  <div className="flex items-center space-x-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFavoriteTCode(recCode);
                                        setFavorites(getFavoriteTCodes());
                                      }}
                                      title={isFav ? "Unpin Favorite" : "Pin Favorite"}
                                      className="p-0.5 hover:bg-amber-100 rounded text-amber-500"
                                    >
                                      <Star size={10} className={isFav ? "fill-amber-400 text-amber-500" : "text-gray-400"} />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeRecentTCode(recCode);
                                        setRecents(getRecentTCodes());
                                      }}
                                      title="Remove from history"
                                      className="p-0.5 hover:bg-red-100 hover:text-red-600 rounded text-gray-400"
                                    >
                                      <Trash2 size={9} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Active Autocomplete suggestions */}
                  {command.trim() && (
                    <div className="p-0 animate-fade-in">
                      <div className="bg-[#eef2f6] text-blue-900 font-bold font-mono text-[8px] px-2 py-1 uppercase tracking-wider border-b border-blue-200 flex justify-between items-center select-none">
                        <span>🔍 Smart Matches & Navigation shortcuts</span>
                        <span className="text-gray-400 lowercase normal-case font-normal text-[8px]">Use arrow keys ⇅ & Enter</span>
                      </div>
                      
                      {suggestions.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-[10px] select-none">
                          <p>⚠️ No matching T-Codes or ERP Records found.</p>
                          <p className="text-[9px] text-gray-400 mt-1">Press Enter to search site projects for "{command}".</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {suggestions.map((sug, idx) => {
                            const isSelected = selectedSuggestionIndex === idx;
                            const isFav = sug.type === 'tcode' && favorites.includes(sug.code || '');
                            return (
                              <div
                                key={idx}
                                onMouseEnter={() => setSelectedSuggestionIndex(idx)}
                                onClick={() => {
                                  if (sug.type === 'tcode' && sug.code) {
                                    handleExecuteTCodeDirect(sug.code);
                                  } else {
                                    if ((window as any).openWorkspaceTab) {
                                      (window as any).openWorkspaceTab(sug.tab, sug.name, sug.props);
                                    } else if (onNavigate && sug.tab) {
                                      onNavigate(sug.tab);
                                    }
                                    setCommand('');
                                    setIsSearchFocused(false);
                                  }
                                }}
                                className={`p-2 transition-colors duration-100 flex items-center justify-between cursor-pointer text-left text-[10px] ${
                                  isSelected ? 'bg-[#e5f1ff] border-l-4 border-[#0056b3]' : 'hover:bg-gray-50'
                                }`}
                              >
                                <div className="flex-1 pr-4 min-w-0">
                                  <div className="flex items-center space-x-2">
                                    {sug.type === 'tcode' ? (
                                      <span className="bg-blue-100 text-blue-800 font-mono font-bold text-[8px] px-1 py-0.5 rounded shrink-0">
                                        {sug.code}
                                      </span>
                                    ) : (
                                      <span className="bg-emerald-100 text-emerald-800 font-mono font-bold text-[8px] px-1 py-0.5 rounded shrink-0 uppercase">
                                        {sug.type}
                                      </span>
                                    )}
                                    <span className="font-bold text-gray-900 truncate">{sug.name}</span>
                                  </div>
                                  <p className="text-[9px] text-gray-500 truncate mt-0.5">{sug.description}</p>
                                </div>

                                {sug.type === 'tcode' && sug.code && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleFavoriteTCode(sug.code || '');
                                      setFavorites(getFavoriteTCodes());
                                    }}
                                    className="p-1 hover:bg-amber-100 rounded text-amber-500 shrink-0"
                                    title={isFav ? "Unpin Favorite" : "Pin Favorite"}
                                  >
                                    <Star size={11} className={isFav ? "fill-amber-400 text-amber-500" : "text-gray-300"} />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-1 border-r border-[#8c9ba8] pr-1 mr-1">
          {/* File input for JSON backup import */}
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".json" 
            onChange={handleFileChange} 
          />
          <button 
            title="Go to Projects screen (Quick Add)" 
            onClick={() => onNavigate && onNavigate('projects')}
            className="p-1 hover:bg-[#d9e4f1] hover:border-[#8c9ba8] border border-transparent rounded-sm cursor-pointer"
          >
            <File size={14} className="text-[#0056b3]" />
          </button>
          <button 
            title="Open DMS Document Center" 
            onClick={() => onNavigate && onNavigate('dms')}
            className="p-1 hover:bg-[#d9e4f1] hover:border-[#8c9ba8] border border-transparent rounded-sm cursor-pointer"
          >
            <FolderOpen size={14} className="text-yellow-500" />
          </button>
          <button 
            title="Download Complete Database Backup (JSON)" 
            onClick={handleBackupDatabase}
            className="p-1 hover:bg-[#d9e4f1] hover:border-[#8c9ba8] border border-transparent rounded-sm cursor-pointer"
          >
            <Save size={14} className="text-[#0056b3]" />
          </button>
        </div>
        <div className="flex items-center space-x-1 border-r border-[#8c9ba8] pr-1 mr-1">
          <button 
            title="Go Back in Tab History" 
            onClick={onGoBack}
            disabled={!canGoBack}
            className={`p-1 border border-transparent rounded-sm ${canGoBack ? 'hover:bg-[#d9e4f1] hover:border-[#8c9ba8] cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
          >
            <ArrowLeft size={14} className="text-green-700" />
          </button>
          <button 
            title="Go Forward in Tab History" 
            onClick={onGoForward}
            disabled={!canGoForward}
            className={`p-1 border border-transparent rounded-sm ${canGoForward ? 'hover:bg-[#d9e4f1] hover:border-[#8c9ba8] cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
          >
            <ArrowRight size={14} className="text-green-700" />
          </button>
          <button 
            title="Print view" 
            onClick={() => window.print()} 
            className="p-1 hover:bg-[#d9e4f1] hover:border-[#8c9ba8] border border-transparent rounded-sm cursor-pointer"
          >
            <Printer size={14} className="text-gray-700" />
          </button>
          <button 
            title={darkMode ? "Switch to Default SAP Blue Theme" : "Switch to High-Contrast Dark Theme (Optimized for Long-Duration Data Entry)"} 
            onClick={toggleDarkMode} 
            className="p-1 hover:bg-[#d9e4f1] hover:border-[#8c9ba8] border border-transparent rounded-sm cursor-pointer"
          >
            {darkMode ? <Sun size={14} className="text-amber-500" /> : <Moon size={14} className="text-gray-700" />}
          </button>
        </div>
        <div className="flex items-center space-x-1">
          <button 
            title="Import Database JSON Backup" 
            onClick={handleImportBackupClick}
            className="p-1 hover:bg-[#d9e4f1] hover:border-[#8c9ba8] border border-transparent rounded-sm cursor-pointer flex items-center gap-1 px-1.5"
          >
            <Upload size={14} className="text-blue-600" />
            <span className="font-mono text-[9px] font-bold text-blue-700 uppercase tracking-tight">Import</span>
          </button>
          <button 
            title="Download Consolidated Sites PDF Report" 
            onClick={handleDirectDownload}
            className="p-1 hover:bg-[#d9e4f1] hover:border-[#8c9ba8] border border-transparent rounded-sm cursor-pointer flex items-center gap-1 px-1.5"
          >
            <Download size={14} className="text-green-600" />
            <span className="font-mono text-[9px] font-bold text-green-700 uppercase tracking-tight">Export PDF</span>
          </button>
        </div>
      </div>
      
      {unauthorizedTCode && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[999999] backdrop-blur-sm">
          <div className="bg-white border-2 border-red-600 rounded-lg shadow-2xl w-[450px] overflow-hidden">
            {/* Title Bar */}
            <div className="bg-red-600 text-white px-4 py-2.5 flex items-center space-x-2 font-mono font-bold text-xs tracking-wide">
              <ShieldAlert size={14} />
              <span>SAP System - Access Authorization Check Failed</span>
            </div>
            
            {/* Content */}
            <div className="p-5 font-sans">
              <div className="flex items-start space-x-3">
                <AlertTriangle size={36} className="text-red-500 shrink-0 mt-0.5" />
                <div className="text-black">
                  <h4 className="font-bold text-gray-900 text-xs">No authorization for transaction {unauthorizedTCode}</h4>
                  <p className="text-[11px] text-gray-600 mt-2 leading-relaxed">
                    You do not have the required structural roles or profile privileges to execute this transaction code in client <span className="font-mono bg-gray-100 px-1 py-0.5 rounded text-gray-800">SN_ERP_CLNT_100</span>.
                  </p>
                  <p className="text-[10px] text-gray-500 mt-3 font-mono">
                    Role Required: ADMIN / EXECUTIVE MANAGER<br />
                    Audit Log registered under user: {user?.username || 'Guest'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="bg-gray-50 px-4 py-3 flex justify-end space-x-2 border-t border-gray-200">
              <button
                onClick={() => setUnauthorizedTCode(null)}
                className="px-4 py-1 bg-[var(--color-sap-blue-val)] text-white hover:bg-blue-800 border border-[var(--color-sap-blue-val)] text-[10px] font-semibold rounded shadow-sm focus:outline-none transition duration-150 cursor-pointer"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}

      {invalidTCode && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[999999] backdrop-blur-sm">
          <div className="bg-white border-2 border-amber-600 rounded-lg shadow-2xl w-[450px] overflow-hidden">
            {/* Title Bar */}
            <div className="bg-amber-600 text-white px-4 py-2.5 flex items-center space-x-2 font-mono font-bold text-xs tracking-wide">
              <AlertCircle size={14} />
              <span>SAP System - Invalid Transaction Code</span>
            </div>
            
            {/* Content */}
            <div className="p-5 font-sans">
              <div className="flex items-start space-x-3">
                <AlertTriangle size={36} className="text-amber-500 shrink-0 mt-0.5" />
                <div className="text-black">
                  <h4 className="font-bold text-gray-900 text-xs">Transaction code {invalidTCode} does not exist</h4>
                  <p className="text-[11px] text-gray-600 mt-2 leading-relaxed">
                    The transaction code you entered is not registered in the active T-Code directory of client <span className="font-mono bg-gray-100 px-1 py-0.5 rounded text-gray-800">SN_ERP_CLNT_100</span>.
                  </p>
                  <p className="text-[11px] text-gray-600 mt-2 leading-relaxed">
                    Please verify the syntax or check the <span className="font-semibold text-[var(--color-sap-blue-val)]">SAP T-Code Registry</span> in Settings to view the list of all available commands.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="bg-gray-50 px-4 py-3 flex justify-end space-x-2 border-t border-gray-200">
              <button
                onClick={() => setInvalidTCode(null)}
                className="px-4 py-1 bg-[var(--color-sap-blue-val)] text-white hover:bg-blue-800 border border-[var(--color-sap-blue-val)] text-[10px] font-semibold rounded shadow-sm focus:outline-none transition duration-150 cursor-pointer"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
