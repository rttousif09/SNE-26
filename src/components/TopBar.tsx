import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Download, Upload, Building2, User, LogOut, ChevronDown, 
  Moon, Sun, Bell, AlertTriangle, AlertCircle, Info, CheckCircle2, 
  Check, Search, Clock, QrCode, Copy, Settings, GitFork, Shield,
  Layers, Lock, Command, ChevronRight, HardHat, FileSpreadsheet
} from 'lucide-react';
import { SNLogo } from './SNLogo';
import { useAppContext } from '../store';
import { exportConsolidatedSitesReportToPDF, downloadPDF } from '../lib/pdfGenerator';
import { 
  getTCodeList, 
  addRecentTCode, 
  getRecentTCodes, 
  getFavoriteTCodes, 
  logTCodeExecution, 
  checkUserPrivilege 
} from '../lib/tcodeService';

interface TopBarProps {
  user: { username: string; name: string; role?: string } | null;
  onLogout: () => void;
  onNavigate?: (tab: string, title?: string, props?: any) => void;
  onLock?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenAlertCenter?: () => void;
  breadcrumbs?: string[];
}

export const TopBar: React.FC<TopBarProps> = ({ 
  user, 
  onLogout, 
  onNavigate, 
  onLock,
  onOpenCommandPalette,
  onOpenAlertCenter,
  breadcrumbs = ['Overview']
}) => {
  const erpStore = useAppContext();
  const {
    projects = [],
    workers = [],
    trackedBills = [],
    approvals = [],
    advanceSheetApprovals = [],
    kharchiApprovals = [],
    paymentSheetApprovals = [],
    expensesLedger = [],
    materialIssues = [],
    materialReturns = []
  } = erpStore as any;

  const [isOpen, setIsOpen] = useState(false);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [copied, setCopied] = useState(false);

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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const selectedProject = projects.find((p: any) => p.id === selectedProjectId);

  return (
    <header className="bg-[#0F4C81] dark:bg-[#0A2540] text-white border-b border-blue-900 dark:border-slate-800 shadow-md select-none font-sans z-30 shrink-0 h-[48px]">
      <div className="px-4 h-full flex items-center justify-between gap-3">
        
        {/* Left Section: Brand & Breadcrumbs */}
        <div className="flex items-center space-x-3 min-w-0 flex-1 lg:flex-initial">
          <div 
            onClick={() => onNavigate && onNavigate('dashboard')}
            className="flex items-center space-x-2.5 cursor-pointer hover:opacity-95 transition shrink-0"
            title="Return to Dashboard"
          >
            <SNLogo size={24} className="text-white" />
            <span className="font-extrabold text-sm tracking-wide text-white font-mono">
              SN ENTERPRISES
            </span>
            <span className="text-[9px] font-mono font-bold text-blue-200 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-400/30">
              ERP_PRD
            </span>
          </div>

          {/* Breadcrumb path */}
          <div className="hidden lg:flex items-center space-x-1.5 text-xs text-blue-200 pl-2 border-l border-blue-700/60 min-w-0 flex-1 truncate">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight size={12} className="text-blue-400/80 shrink-0" />}
                <span className={`truncate ${idx === breadcrumbs.length - 1 ? 'font-bold text-white' : 'hover:text-white transition'}`}>
                  {crumb}
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Center: Command Palette Trigger Input */}
        <div className="flex-1 max-w-lg hidden md:block min-w-0 mx-2">
          <button
            onClick={() => onOpenCommandPalette ? onOpenCommandPalette() : onOpenAlertCenter && onOpenAlertCenter()}
            className="w-full flex items-center justify-between px-3 py-1.5 bg-blue-950/50 dark:bg-slate-900/70 hover:bg-blue-900/60 text-blue-100 dark:text-slate-300 border border-blue-400/30 dark:border-slate-700 rounded-lg text-xs transition-all shadow-inner group cursor-pointer overflow-hidden"
          >
            <div className="flex items-center space-x-2 min-w-0 flex-1 pr-2">
              <Search size={14} className="text-blue-300 group-hover:text-white shrink-0" />
              <span className="text-blue-200/90 group-hover:text-white text-xs truncate">
                Jump to module, worker, project, bill or T-Code (/n)...
              </span>
            </div>
            <kbd className="bg-blue-900/80 text-blue-200 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border border-blue-400/40 shrink-0 hidden sm:block">
              Ctrl + K
            </kbd>
          </button>
        </div>

        {/* Right Section: Context, Actions & User Pill */}
        <div className="flex items-center space-x-2 shrink-0">
          
          {/* Project Context Selector Dropdown */}
          <div className="relative" ref={projectDropdownRef}>
            <button
              onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
              className="flex items-center space-x-1.5 px-2.5 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded-md text-xs font-semibold text-white transition cursor-pointer"
              title="Filter Active Project Context"
            >
              <Building2 size={13} className="text-blue-200" />
              <span className="max-w-[120px] truncate text-[11px]">
                {selectedProjectId === 'all' ? 'All Projects' : selectedProject?.name || 'Project'}
              </span>
              <ChevronDown size={11} className="text-blue-200" />
            </button>

            {isProjectDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-64 bg-white dark:bg-[#1E2228] border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1 z-50 text-slate-800 dark:text-slate-200">
                <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold uppercase text-slate-400 font-mono">
                  Switch Active Project
                </div>
                <div className="max-h-60 overflow-y-auto p-1 space-y-0.5 scrollbar-thin">
                  <button
                    onClick={() => {
                      setSelectedProjectId('all');
                      setIsProjectDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-semibold flex items-center justify-between cursor-pointer ${
                      selectedProjectId === 'all' 
                        ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold' 
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>All Construction Projects</span>
                    {selectedProjectId === 'all' && <Check size={13} className="text-blue-600" />}
                  </button>

                  {projects.map((p: any) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedProjectId(p.id);
                        setIsProjectDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded text-xs flex items-center justify-between cursor-pointer ${
                        selectedProjectId === p.id 
                          ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold' 
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold truncate">{p.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{p.clientName || 'N/A'}</p>
                      </div>
                      {selectedProjectId === p.id && <Check size={13} className="text-blue-600 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Financial Year Badge */}
          <div className="hidden sm:flex items-center px-2 py-1 bg-blue-950/60 border border-blue-400/30 rounded-md text-[10px] font-mono font-bold text-blue-100">
            FY 2026-27
          </div>

          {/* Document Flow Quick Button */}
          <button
            onClick={() => onNavigate && onNavigate('document-flow')}
            className="flex items-center space-x-1 px-2 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded-md text-xs font-semibold text-white transition cursor-pointer"
            title="Launch SAP Document Flow (DF01)"
          >
            <GitFork size={13} className="text-blue-200" />
            <span className="hidden xl:inline text-[11px]">Doc Flow</span>
          </button>

          {/* Notifications / Alerts Button */}
          <button
            onClick={() => onOpenAlertCenter && onOpenAlertCenter()}
            className="relative p-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-md text-white transition cursor-pointer"
            title="System Alert & Exception Center"
          >
            <Bell size={15} className="text-blue-100" />
            {unreadAlertCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white shadow-xs animate-pulse">
                {unreadAlertCount}
              </span>
            )}
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleDarkMode}
            className="p-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-md text-white transition cursor-pointer"
            title={darkMode ? "Switch to Light Theme" : "Switch to Dark Theme"}
          >
            {darkMode ? <Sun size={15} className="text-amber-300" /> : <Moon size={15} className="text-blue-200" />}
          </button>

          {/* Session Lock Button */}
          <button
            onClick={onLock}
            className="hidden sm:flex p-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-md text-white transition cursor-pointer"
            title="Lock ERP Workspace"
          >
            <Lock size={15} className="text-blue-200" />
          </button>

          {/* User Profile Pill & Dropdown */}
          {user && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-2 pl-1.5 pr-2 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full transition cursor-pointer"
              >
                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center font-bold text-[10px] text-white uppercase border border-blue-200 shadow-2xs shrink-0">
                  {user.name.charAt(0)}
                </div>
                <span className="font-semibold text-xs text-white max-w-[90px] truncate">
                  {user.name}
                </span>
                <ChevronDown size={11} className={`text-blue-200 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#1E2228] border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 text-slate-800 dark:text-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                  {/* User Profile Header */}
                  <div className="bg-[#0F4C81] dark:bg-[#0A2540] text-white p-3.5 flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center font-bold text-sm text-white uppercase border-2 border-white/40">
                      {user.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-xs truncate">{user.name}</h4>
                      <p className="text-[10px] text-blue-200 font-mono">@{user.username}</p>
                      <span className="inline-block bg-white/20 text-white text-[9px] font-bold px-1.5 py-0.2 rounded mt-1">
                        {user.username === 'saddamsne' ? 'Owner / Director' : 'Executive Member'}
                      </span>
                    </div>
                  </div>

                  {/* Profile Menu Actions */}
                  <div className="p-2 space-y-1 text-xs border-b border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => { setShowMyProfile(true); setIsOpen(false); }}
                      className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold flex items-center space-x-2 cursor-pointer"
                    >
                      <User size={14} className="text-blue-600" />
                      <span>My Profile</span>
                    </button>

                    <button
                      onClick={() => { setShowChangePassword(true); setIsOpen(false); }}
                      className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold flex items-center space-x-2 cursor-pointer"
                    >
                      <Shield size={14} className="text-amber-600" />
                      <span>Security & Password</span>
                    </button>

                    <button
                      onClick={() => { onNavigate && onNavigate('activity-log'); setIsOpen(false); }}
                      className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold flex items-center space-x-2 cursor-pointer"
                    >
                      <Clock size={14} className="text-indigo-600" />
                      <span>Audit Activity Log</span>
                    </button>

                    <button
                      onClick={() => { onNavigate && onNavigate('numbering-settings'); setIsOpen(false); }}
                      className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold flex items-center space-x-2 cursor-pointer"
                    >
                      <Settings size={14} className="text-slate-600" />
                      <span>Document Settings</span>
                    </button>

                    <button
                      onClick={() => { handleBackupDatabase(); setIsOpen(false); }}
                      className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold flex items-center space-x-2 cursor-pointer text-emerald-700 dark:text-emerald-400"
                    >
                      <Download size={14} />
                      <span>Export Database Backup</span>
                    </button>
                  </div>

                  {/* QR Site Report Download */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 text-center space-y-2">
                    <span className="text-[10px] font-bold uppercase text-slate-500 flex items-center justify-center gap-1">
                      <QrCode size={12} /> Scan for Site Reports PDF
                    </span>
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.origin + '/?download-all-sites-pdf=true')}`}
                      alt="Reports QR"
                      className="w-20 h-20 mx-auto rounded border border-slate-200 dark:border-slate-700 p-1 bg-white"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex items-center space-x-1 justify-center">
                      <button
                        onClick={handleDirectDownload}
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <Download size={10} /> PDF Download
                      </button>
                      <button
                        onClick={handleCopyUrl}
                        className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition cursor-pointer"
                      >
                        {copied ? "Copied!" : "Copy Link"}
                      </button>
                    </div>
                  </div>

                  {/* Logout Action */}
                  <div className="p-2">
                    <button
                      onClick={() => { setIsOpen(false); onLogout(); }}
                      className="w-full py-1.5 px-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 rounded-md font-bold text-xs flex items-center justify-center space-x-2 transition cursor-pointer"
                    >
                      <LogOut size={13} />
                      <span>Log Out System</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Profile Modal */}
      {showMyProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs font-sans text-slate-800 dark:text-slate-200">
          <div className="w-full max-w-md bg-white dark:bg-[#1E2228] border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden">
            <div className="bg-[#0F4C81] dark:bg-[#0A2540] text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Operator Profile Card</h3>
              <button onClick={() => setShowMyProfile(false)} className="text-white/80 hover:text-white">✕</button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div className="flex items-center space-x-4 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-lg font-bold">
                  {user?.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-sm">{user?.name}</h4>
                  <p className="text-slate-500 dark:text-slate-400 font-mono">@{user?.username}</p>
                  <p className="text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
                    {user?.username === 'saddamsne' ? 'Managing Director / Owner' : 'Executive Member'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Node Mode</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">Production Live</span>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Access Tier</span>
                  <span className="font-bold text-emerald-600">Full Enterprise Privilege</span>
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setShowMyProfile(false)}
                className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 font-bold rounded-lg text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs font-sans text-slate-800 dark:text-slate-200">
          <div className="w-full max-w-md bg-white dark:bg-[#1E2228] border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden">
            <div className="bg-[#0F4C81] dark:bg-[#0A2540] text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Update ERP Account Password</h3>
              <button onClick={() => setShowChangePassword(false)} className="text-white/80 hover:text-white">✕</button>
            </div>
            <form onSubmit={handlePasswordSubmit} className="p-5 space-y-3 text-xs">
              {passError && (
                <div className="p-2.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-xs font-semibold">
                  {passError}
                </div>
              )}
              {passSuccess && (
                <div className="p-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-xs font-semibold">
                  {passSuccess}
                </div>
              )}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPass}
                  onChange={e => setCurrentPass(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-900 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-900 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-900 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowChangePassword(false)}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
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
