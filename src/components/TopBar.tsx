import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Building2, User, LogOut, ChevronDown, 
  Moon, Sun, Bell, Check, Search, Clock, QrCode, Download, Settings, GitFork, Shield,
  Lock, ArrowLeft, Save, Printer, RefreshCw, MoreHorizontal, FileSpreadsheet, Menu,
  Maximize2, Minimize2, CheckSquare
} from 'lucide-react';
import { SNLogo } from './SNLogo';
import { useAppContext } from '../store';
import { exportConsolidatedSitesReportToPDF, downloadPDF } from '../lib/pdfGenerator';
import { 
  getTCodeList, 
  addRecentTCode, 
  getRecentTCodes, 
  logTCodeExecution,
  DEFAULT_TCODES 
} from '../lib/tcodeService';

interface TopBarProps {
  user: { username: string; name: string; role?: string } | null;
  onLogout: () => void;
  onNavigate?: (tab: string, title?: string, props?: any) => void;
  onLock?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenAlertCenter?: () => void;
  breadcrumbs?: string[];
  currentTab?: string;
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  onGoBack?: () => void;
  canGoBack?: boolean;
}

const TCODE_MAPPING: Record<string, string> = {
  'WFT01': 'advance',
  'WRK01': 'workers',
  'WRK02': 'workers',
  'WRK03': 'worker-ledger',
  'WRK04': 'dlr',
  'WRK05': 'advance',
  'WRK06': 'worker-payment',
  'PAY01': 'worker-payment',
  'WKP01': 'worker-payment',
  'WKL01': 'worker-ledger',
  'KHAR01': 'kharchi',
  'ADV01': 'advance',
  'BIL01': 'billing',
  'BILL01': 'billing',
  'CPAY01': 'client-payment',
  'BOQ01': 'boqs',
  'PRJ01': 'projects',
  'DLR01': 'dlr',
  'MAT01': 'materials',
  'EQP01': 'assets',
  'SC01': 'subcontractors',
  'SCM01': 'subcontractors-master',
  'SCB01': 'subcontractors-billing',
  'SCP01': 'subcontractors-payments',
  'SCL01': 'subcontractors-ledger',
  'SCA01': 'subcontractors-audit',
  'EXP01': 'expenses',
  'EXPS01': 'expenses-summary',
  'REP01': 'site-monthly-summary',
  'RPT01': 'site-monthly-summary',
  'DSR01': 'daily-site-summary',
  'BTR01': 'bill-tracking',
  'FLR01': 'floor-abstracts',
  'FAB01': 'floor-abstracts',
  'FYA01': 'financial-year-archive',
  'BI01': 'analytics',
  'RPT06': 'analytics',
  'NUM01': 'numbering-settings',
  'SET02': 'numbering-settings',
  'TCD01': 'tcode-master',
  'SET06': 'tcode-master',
  'STF01': 'staff-management',
  'SET03': 'staff-management',
  'AUD01': 'activity-log',
  'APR01': 'approvals',
  'DF01': 'document-flow',
  'FB03': 'document-flow',
  'DMS01': 'dms',
  'DOC01': 'dms',
  'DASH01': 'dashboard',
  'MESS01': 'mess'
};

export function getTabTCodeDisplay(tab: string): { tcode: string; title: string } {
  switch (tab) {
    case 'advance': return { tcode: 'WFT01', title: 'Worker Financial Transactions' };
    case 'workers': return { tcode: 'WRK01', title: 'Worker Master' };
    case 'worker-payment': return { tcode: 'PAY01', title: 'Worker Payment' };
    case 'worker-ledger': return { tcode: 'WKL01', title: 'Worker Ledger & Recovery' };
    case 'kharchi': return { tcode: 'KHAR01', title: 'Weekly Kharchi (Pocket Money)' };
    case 'billing': return { tcode: 'BIL01', title: 'RA Billing' };
    case 'client-payment': return { tcode: 'CPAY01', title: 'Client Payments & Receipts' };
    case 'boqs': return { tcode: 'BOQ01', title: 'BOQ Master' };
    case 'projects': return { tcode: 'PRJ01', title: 'Project Management' };
    case 'dlr': return { tcode: 'DLR01', title: 'Daily Attendance (DLR)' };
    case 'materials': return { tcode: 'MAT01', title: 'Materials & Inventory Store' };
    case 'assets': return { tcode: 'EQP01', title: 'Equipment & Asset Register' };
    case 'subcontractors':
    case 'subcontractors-master':
    case 'subcontractors-billing':
    case 'subcontractors-payments':
    case 'subcontractors-ledger':
    case 'subcontractors-audit':
      return { tcode: 'SC01', title: 'Subcontractor Management' };
    case 'expenses': return { tcode: 'EXP01', title: 'Site Expenses Ledger' };
    case 'expenses-summary': return { tcode: 'EXPS01', title: 'Expenses Summary Analysis' };
    case 'site-monthly-summary': return { tcode: 'REP01', title: 'Site Monthly Summary' };
    case 'daily-site-summary': return { tcode: 'DSR01', title: 'Daily Site Summary (AI)' };
    case 'bill-tracking': return { tcode: 'BTR01', title: 'Bill Tracking Workflow' };
    case 'floor-abstracts': return { tcode: 'FLR01', title: 'Floor Abstracts' };
    case 'financial-year-archive': return { tcode: 'FYA01', title: 'Financial Year Archive' };
    case 'analytics': return { tcode: 'BI01', title: 'Graphs & Analytics (BI)' };
    case 'numbering-settings': return { tcode: 'NUM01', title: 'Document Numbering Settings' };
    case 'tcode-master': return { tcode: 'TCD01', title: 'SAP T-Code Registry' };
    case 'staff-management': return { tcode: 'STF01', title: 'Staff & Access Management' };
    case 'activity-log': return { tcode: 'AUD01', title: 'System Audit Logs' };
    case 'approvals': return { tcode: 'APR01', title: 'Pending Approvals' };
    case 'dms': return { tcode: 'DMS01', title: 'DMS Document Center' };
    case 'document-flow': return { tcode: 'DF01', title: 'SAP Document Flow' };
    case 'mess': return { tcode: 'MESS01', title: 'Site Mess Management' };
    case 'dashboard':
    default:
      return { tcode: 'DASH01', title: 'Dashboard Overview' };
  }
}

export const TopBar: React.FC<TopBarProps> = ({ 
  user, 
  onLogout, 
  onNavigate, 
  onLock,
  onOpenCommandPalette,
  onOpenAlertCenter,
  breadcrumbs = ['Overview'],
  currentTab = 'dashboard',
  onToggleSidebar,
  isSidebarCollapsed = false,
  onGoBack,
  canGoBack = false
}) => {
  const erpStore = useAppContext();
  const {
    projects = [],
    approvals = [],
    advanceSheetApprovals = [],
    kharchiApprovals = [],
    paymentSheetApprovals = [],
    expensesLedger = [],
    currentProjectId,
    setCurrentProjectId
  } = erpStore as any;

  const [tcodeInput, setTcodeInput] = useState<string>('');
  const [tcodeError, setTcodeError] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(currentProjectId || 'all');
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Modals
  const [showMyProfile, setShowMyProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  // Password change state
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passSuccess, setPassSuccess] = useState<string | null>(null);
  const [passError, setPassError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const tcodeInputRef = useRef<HTMLInputElement>(null);

  // Current screen T-Code info
  const screenInfo = useMemo(() => getTabTCodeDisplay(currentTab), [currentTab]);

  // Sync T-Code input with current screen
  useEffect(() => {
    setTcodeInput(screenInfo.tcode);
    setTcodeError(false);
  }, [screenInfo.tcode]);

  // Unread alerts calculation
  const unreadAlertCount = useMemo(() => {
    let count = 0;
    count += approvals.filter((a: any) => a.status === 'Pending').length;
    count += advanceSheetApprovals.filter((a: any) => a.status === 'Pending').length;
    count += kharchiApprovals.filter((a: any) => a.status === 'Pending').length;
    count += paymentSheetApprovals.filter((a: any) => a.status === 'Pending').length;
    count += expensesLedger.filter((e: any) => e.status === 'Submitted').length;
    return count;
  }, [approvals, advanceSheetApprovals, kharchiApprovals, paymentSheetApprovals, expensesLedger]);

  useEffect(() => {
    const isDark = localStorage.getItem('sap-dark-mode') === 'true';
    if (isDark) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
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

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExecuteTCode = (codeToRun?: string) => {
    const raw = (codeToRun || tcodeInput).trim();
    if (!raw) return;

    // Normalize: remove leading /n or /o or /
    let cleaned = raw.toUpperCase();
    if (cleaned.startsWith('/N') || cleaned.startsWith('/O')) {
      cleaned = cleaned.substring(2);
    } else if (cleaned.startsWith('/')) {
      cleaned = cleaned.substring(1);
    }
    cleaned = cleaned.trim();

    const targetTab = TCODE_MAPPING[cleaned];
    if (targetTab && onNavigate) {
      addRecentTCode(cleaned);
      logTCodeExecution(cleaned, user?.name || user?.username || 'User', 'Execute via T-Code toolbar');
      onNavigate(targetTab);
      setTcodeError(false);
    } else {
      // Check in DEFAULT_TCODES
      const matched = DEFAULT_TCODES.find(t => t.code.toUpperCase() === cleaned);
      if (matched && onNavigate) {
        addRecentTCode(cleaned);
        logTCodeExecution(cleaned, user?.name || user?.username || 'User', 'Execute via T-Code toolbar');
        onNavigate(matched.tab, matched.name, matched.props);
        setTcodeError(false);
      } else {
        setTcodeError(true);
        setTimeout(() => setTcodeError(false), 2500);
      }
    }
  };

  const handleTCodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleExecuteTCode();
    }
  };

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
    setPassSuccess("Password updated successfully!");
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
    setTimeout(() => {
      setShowChangePassword(false);
      setPassSuccess(null);
    }, 1500);
  };

  const handleDirectDownload = () => {
    try {
      const blobUrl = exportConsolidatedSitesReportToPDF(erpStore, user?.name || user?.username || 'Executive');
      downloadPDF(blobUrl, `SN_Enterprise_Consolidated_Sites_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) {
      console.error(e);
    }
  };

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

  const handleBackupDatabase = () => {
    try {
      const backupData = { ...erpStore };
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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleAction = (actionType: 'save' | 'print' | 'export' | 'refresh') => {
    if (actionType === 'save') {
      window.dispatchEvent(new CustomEvent('sap-action-save'));
    } else if (actionType === 'print') {
      window.dispatchEvent(new CustomEvent('sap-action-print'));
      window.print();
    } else if (actionType === 'export') {
      window.dispatchEvent(new CustomEvent('sap-action-export'));
    } else if (actionType === 'refresh') {
      window.dispatchEvent(new CustomEvent('sap-action-refresh'));
    }
  };

  const selectedProject = projects.find((p: any) => p.id === selectedProjectId);

  return (
    <header className="select-none font-sans z-30 shrink-0 border-b border-[#bcc8d0]">
      {/* 1. TOP ROW: Application Header (Pale SAP blue #b8d3e6, height 38px) */}
      <div className="bg-[#b8d3e6] text-[#303b44] h-[38px] px-3 flex items-center justify-between border-b border-[#bcc8d0] text-[12px]">
        {/* Left: ☰ | SN ENTERPRISE ERP | Current Screen Title */}
        <div className="flex items-center space-x-2.5 min-w-0 flex-1">
          <button
            onClick={onToggleSidebar}
            className="p-1 hover:bg-[#a6c5da] active:bg-[#93b5cc] rounded-none text-[#303b44] transition cursor-pointer flex items-center justify-center shrink-0 border border-[#a2bfd3]"
            title={isSidebarCollapsed ? "Expand Menu" : "Collapse Menu"}
          >
            <Menu size={15} />
          </button>

          <div 
            onClick={() => onNavigate && onNavigate('dashboard')}
            className="flex items-center space-x-1.5 cursor-pointer font-bold tracking-tight text-[#303b44] shrink-0"
            title="SN ENTERPRISE ERP - Return to Home"
          >
            <SNLogo size={17} className="text-[#2d6f91]" />
            <span className="font-bold text-[13px] tracking-wide">
              SN ENTERPRISE ERP
            </span>
          </div>

          <span className="text-[#9bb2c2] font-light hidden sm:inline">|</span>

          {/* Current Screen / Transaction Title (Flat, no oversized saturated badge) */}
          <div className="font-semibold text-[12px] text-[#303b44] truncate flex items-center space-x-1.5 min-w-0">
            <span className="bg-white/70 border border-[#9bb2c2] text-[#2d6f91] font-mono font-bold text-[11px] px-1.5 py-0.2 rounded-none shrink-0">
              {screenInfo.tcode}
            </span>
            <span className="truncate text-[#303b44] font-medium">{screenInfo.title}</span>
          </div>
        </div>

        {/* Right: User | Company | Window Controls */}
        <div className="flex items-center space-x-2 shrink-0 text-[12px]">
          {/* User Profile */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center space-x-1 px-2 py-0.5 bg-white/70 hover:bg-white border border-[#bcc8d0] rounded-none text-[#303b44] text-[11px] font-medium cursor-pointer transition"
              title="Current User Profile"
            >
              <User size={12} className="text-[#2d6f91]" />
              <span className="max-w-[110px] truncate">{user?.name || user?.username || 'User'}</span>
              <ChevronDown size={11} className="text-[#63717b]" />
            </button>

            {isOpen && (
              <div className="absolute right-0 mt-1 w-64 bg-white border border-[#bcc8d0] shadow-md rounded-none z-50 text-[#303b44] text-[12px]">
                <div className="bg-[#edf3f7] p-2.5 border-b border-[#bcc8d0] flex items-center space-x-2">
                  <div className="w-7 h-7 bg-[#2d6f91] text-white rounded-none flex items-center justify-center font-bold text-xs">
                    {(user?.name || 'U').charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold truncate">{user?.name}</div>
                    <div className="text-[10px] text-[#63717b] font-mono">@{user?.username}</div>
                  </div>
                </div>
                <div className="p-1 space-y-0.5">
                  <button
                    onClick={() => { setShowMyProfile(true); setIsOpen(false); }}
                    className="w-full text-left px-2 py-1.5 hover:bg-[#edf2f5] flex items-center space-x-2"
                  >
                    <User size={13} className="text-[#2d6f91]" />
                    <span>My Profile</span>
                  </button>
                  <button
                    onClick={() => { setShowChangePassword(true); setIsOpen(false); }}
                    className="w-full text-left px-2 py-1.5 hover:bg-[#edf2f5] flex items-center space-x-2"
                  >
                    <Shield size={13} className="text-amber-700" />
                    <span>Change Password</span>
                  </button>
                  <button
                    onClick={() => { onNavigate && onNavigate('activity-log'); setIsOpen(false); }}
                    className="w-full text-left px-2 py-1.5 hover:bg-[#edf2f5] flex items-center space-x-2"
                  >
                    <Clock size={13} className="text-[#2d6f91]" />
                    <span>System Audit Log</span>
                  </button>
                  <button
                    onClick={() => { handleBackupDatabase(); setIsOpen(false); }}
                    className="w-full text-left px-2 py-1.5 hover:bg-[#edf2f5] flex items-center space-x-2 text-emerald-800"
                  >
                    <Download size={13} />
                    <span>Backup Database (JSON)</span>
                  </button>
                  <div className="border-t border-[#bcc8d0] my-1 pt-1">
                    <button
                      onClick={() => { setIsOpen(false); onLogout(); }}
                      className="w-full text-left px-2 py-1.5 hover:bg-rose-50 text-rose-800 font-semibold flex items-center space-x-2"
                    >
                      <LogOut size={13} />
                      <span>Log Off ERP</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Company / Project Context */}
          <div className="relative" ref={projectDropdownRef}>
            <button
              onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
              className="flex items-center space-x-1 px-2 py-0.5 bg-white/70 hover:bg-white border border-[#bcc8d0] rounded-none text-[#303b44] text-[11px] font-medium cursor-pointer transition"
              title="Active Site Context"
            >
              <Building2 size={12} className="text-[#63717b]" />
              <span className="max-w-[130px] truncate hidden md:inline">
                {selectedProjectId === 'all' ? 'SN Enterprise (All)' : selectedProject?.name || 'Company'}
              </span>
              <ChevronDown size={11} className="text-[#63717b]" />
            </button>

            {isProjectDropdownOpen && (
              <div className="absolute right-0 mt-1 w-64 bg-white border border-[#bcc8d0] shadow-md rounded-none z-50 text-[#303b44] text-[12px]">
                <div className="bg-[#edf3f7] px-2.5 py-1 border-b border-[#bcc8d0] font-semibold text-[11px] uppercase text-[#63717b]">
                  Select Site Context
                </div>
                <div className="max-h-56 overflow-y-auto p-1 space-y-0.5">
                  <button
                    onClick={() => {
                      setSelectedProjectId('all');
                      if (setCurrentProjectId) setCurrentProjectId('');
                      setIsProjectDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2 py-1 rounded-none flex items-center justify-between text-[11px] ${selectedProjectId === 'all' ? 'bg-[#dcecf6] text-[#2d6f91] font-bold' : 'hover:bg-[#f7f9fa]'}`}
                  >
                    <span>SN Enterprise Pvt Ltd (All Sites)</span>
                    {selectedProjectId === 'all' && <Check size={12} />}
                  </button>
                  {projects.map((p: any) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedProjectId(p.id);
                        if (setCurrentProjectId) setCurrentProjectId(p.id);
                        setIsProjectDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2 py-1 rounded-none flex items-center justify-between text-[11px] ${selectedProjectId === p.id ? 'bg-[#dcecf6] text-[#2d6f91] font-bold' : 'hover:bg-[#f7f9fa]'}`}
                    >
                      <span className="truncate">{p.name}</span>
                      {selectedProjectId === p.id && <Check size={12} className="shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <span className="text-[#9bb2c2] font-light">|</span>

          {/* Minimize-style controls: ─ □ ✕ */}
          <div className="flex items-center space-x-0.5">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('sap-minimize-panel'))}
              className="w-5 h-5 flex items-center justify-center hover:bg-[#a6c5da] text-[#303b44] font-bold cursor-pointer"
              title="Minimize"
            >
              <span className="text-[11px] leading-none mb-1">─</span>
            </button>
            <button
              onClick={toggleFullscreen}
              className="w-5 h-5 flex items-center justify-center hover:bg-[#a6c5da] text-[#303b44] font-bold cursor-pointer"
              title={isFullscreen ? "Restore Screen" : "Maximize"}
            >
              <span className="text-[10px] leading-none">□</span>
            </button>
            <button
              onClick={onLogout}
              className="w-5 h-5 flex items-center justify-center hover:bg-rose-600 hover:text-white text-[#303b44] font-bold cursor-pointer"
              title="Close Application"
            >
              <span className="text-[10px] leading-none">✕</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. COMMAND / TRANSACTION TOOLBAR (Height 27px, #edf3f7) */}
      <div className="bg-[#edf3f7] text-[#303b44] h-[27px] px-2 flex items-center justify-between border-b border-[#bcc8d0] text-[12px]">
        {/* Left: T-Code command field + Action buttons */}
        <div className="flex items-center space-x-1.5">
          {/* SAP Command Field: [ PAY01________ ] [✓] */}
          <div className="flex items-center">
            <input
              ref={tcodeInputRef}
              type="text"
              value={tcodeInput}
              onChange={e => setTcodeInput(e.target.value)}
              onKeyDown={handleTCodeKeyDown}
              placeholder=""
              className={`h-[24px] w-24 sm:w-28 px-1.5 text-[12px] font-mono uppercase bg-white border border-[#b7c2ca] rounded-none transition ${
                tcodeError ? 'border-red-500 bg-red-50 text-red-700' : 'text-[#303b44] focus:bg-[#fffde7] focus:border-[#d97706]'
              }`}
              title="Enter Transaction Code (e.g. PAY01, WFT01, WRK01, BIL01)"
            />
            <button
              type="button"
              onClick={() => handleExecuteTCode()}
              className="h-[24px] w-[24px] bg-[#edf2f5] hover:bg-[#dcecf6] text-[#2d6f91] border border-[#b7c2ca] border-l-0 rounded-none flex items-center justify-center cursor-pointer font-bold"
              title="Execute (Enter)"
            >
              <Check size={11} />
            </button>
            {tcodeError && (
              <span className="text-[10px] text-red-600 font-bold ml-1">
                ?
              </span>
            )}
          </div>

          <span className="text-[#bcc8d0] mx-0.5">|</span>

          {/* Standard SAP Desktop Actions */}
          <div className="flex items-center space-x-1">
            <button
              onClick={onGoBack}
              disabled={!canGoBack}
              className="sap-btn disabled:opacity-40"
              title="Back (F3)"
            >
              <ArrowLeft size={11} />
              <span className="hidden sm:inline">Back</span>
            </button>

            <button
              onClick={() => handleAction('save')}
              className="sap-btn sap-btn-save"
              title="Save Record (Ctrl+S)"
            >
              <Save size={11} />
              <span>Save</span>
            </button>

            <button
              onClick={() => handleAction('print')}
              className="sap-btn"
              title="Print Current Screen (Ctrl+P)"
            >
              <Printer size={11} />
              <span className="hidden md:inline">Print</span>
            </button>

            <button
              onClick={() => handleAction('export')}
              className="sap-btn"
              title="Export Current Table"
            >
              <FileSpreadsheet size={11} className="text-emerald-700" />
              <span className="hidden md:inline">Export</span>
            </button>

            <button
              onClick={() => handleAction('refresh')}
              className="sap-btn"
              title="Refresh (F5)"
            >
              <RefreshCw size={11} />
              <span className="hidden md:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Right: Quick shortcuts & More */}
        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={() => onOpenAlertCenter && onOpenAlertCenter()}
            className="sap-btn relative"
            title="Exception & Approval Center"
          >
            <Bell size={11} className={unreadAlertCount > 0 ? "text-amber-700" : "text-[#63717b]"} />
            <span className="hidden lg:inline">Alerts</span>
            {unreadAlertCount > 0 && (
              <span className="bg-red-700 text-white font-mono text-[9px] font-bold px-1 rounded-none ml-0.5">
                {unreadAlertCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onOpenCommandPalette ? onOpenCommandPalette() : handleExecuteTCode()}
            className="sap-btn"
            title="Search Commands (Ctrl+K)"
          >
            <Search size={11} />
            <span className="hidden xl:inline">Find</span>
          </button>

          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className="sap-btn"
              title="More"
            >
              <MoreHorizontal size={12} />
              <span>More</span>
            </button>

            {isMoreMenuOpen && (
              <div className="absolute right-0 mt-1 w-52 bg-white border border-[#bcc8d0] shadow-md rounded-none z-50 text-[#303b44] text-[12px] p-1 space-y-0.5">
                <button
                  onClick={() => { onNavigate && onNavigate('document-flow'); setIsMoreMenuOpen(false); }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-[#F4F6F7] rounded-[2px] flex items-center space-x-2"
                >
                  <GitFork size={13} className="text-[#0A6ED1]" />
                  <span>Document Flow (DF01)</span>
                </button>
                <button
                  onClick={() => { toggleDarkMode(); setIsMoreMenuOpen(false); }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-[#F4F6F7] rounded-[2px] flex items-center space-x-2"
                >
                  {darkMode ? <Sun size={13} className="text-amber-500" /> : <Moon size={13} className="text-slate-600" />}
                  <span>{darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}</span>
                </button>
                <button
                  onClick={() => { onLock && onLock(); setIsMoreMenuOpen(false); }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-[#F4F6F7] rounded-[2px] flex items-center space-x-2"
                >
                  <Lock size={13} className="text-slate-600" />
                  <span>Lock Session</span>
                </button>
                <button
                  onClick={() => { handleDirectDownload(); setIsMoreMenuOpen(false); }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-[#F4F6F7] rounded-[2px] flex items-center space-x-2 text-[#0A6ED1]"
                >
                  <Download size={13} />
                  <span>Consolidated Sites PDF</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      {showMyProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 font-sans text-[#2F3B45]">
          <div className="w-full max-w-md bg-white border border-[#B8C3CC] rounded-[3px] shadow-2xl overflow-hidden">
            <div className="bg-[#B7D3E8] text-[#2F3B45] px-4 py-2.5 flex items-center justify-between border-b border-[#B8C3CC]">
              <h3 className="font-bold text-[13px]">User Profile & Authorization</h3>
              <button onClick={() => setShowMyProfile(false)} className="text-[#2F3B45] hover:text-red-700 font-bold">✕</button>
            </div>
            <div className="p-4 space-y-3 text-[12px]">
              <div className="flex items-center space-x-3 bg-[#F4F6F7] p-3 rounded-[2px] border border-[#B8C3CC]">
                <div className="w-12 h-12 bg-[#0A6ED1] rounded-[2px] flex items-center justify-center font-bold text-lg text-white">
                  {(user?.name || 'U').charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-[13px]">{user?.name}</h4>
                  <p className="text-[11px] text-[#5F6B75] font-mono">ID: @{user?.username}</p>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-[2px] mt-1 inline-block">
                    Authorization: Full Access Admin
                  </span>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between py-1 border-b border-[#B8C3CC]">
                  <span className="text-[#5F6B75]">Company:</span>
                  <span className="font-semibold">SN Enterprise Pvt Ltd</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#B8C3CC]">
                  <span className="text-[#5F6B75]">Platform:</span>
                  <span className="font-semibold">SAP Enterprise Desktop Edition</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#B8C3CC]">
                  <span className="text-[#5F6B75]">Fiscal Year:</span>
                  <span className="font-mono font-semibold">2026-2027</span>
                </div>
              </div>
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowMyProfile(false)}
                  className="sap-btn px-4 py-1"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 font-sans text-[#2F3B45]">
          <div className="w-full max-w-md bg-white border border-[#B8C3CC] rounded-[3px] shadow-2xl overflow-hidden">
            <div className="bg-[#B7D3E8] text-[#2F3B45] px-4 py-2.5 flex items-center justify-between border-b border-[#B8C3CC]">
              <h3 className="font-bold text-[13px]">Change ERP Password</h3>
              <button onClick={() => setShowChangePassword(false)} className="text-[#2F3B45] hover:text-red-700 font-bold">✕</button>
            </div>
            <form onSubmit={handlePasswordSubmit} className="p-4 space-y-3 text-[12px]">
              {passError && (
                <div className="p-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-[2px] text-[11px] font-semibold">
                  {passError}
                </div>
              )}
              {passSuccess && (
                <div className="p-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-[2px] text-[11px] font-semibold">
                  {passSuccess}
                </div>
              )}
              <div>
                <label className="block font-bold text-[#2F3B45] mb-1">Current Password:</label>
                <input
                  type="password"
                  value={currentPass}
                  onChange={e => setCurrentPass(e.target.value)}
                  className="sap-input w-full"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-[#2F3B45] mb-1">New Password:</label>
                <input
                  type="password"
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                  className="sap-input w-full"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-[#2F3B45] mb-1">Confirm New Password:</label>
                <input
                  type="password"
                  value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)}
                  className="sap-input w-full"
                  required
                />
              </div>
              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowChangePassword(false)}
                  className="sap-btn px-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="sap-btn sap-btn-primary px-4"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
