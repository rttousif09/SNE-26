import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Play, Square, Pause, Save, FolderOpen, File, ArrowLeft, ArrowRight, Building2, User, LogOut, ChevronDown, Printer, Moon, Sun, Bell, AlertTriangle, AlertCircle, Info, CheckCircle2, Check, Search, Trash2, Clock } from 'lucide-react';
import { SNLogo } from './SNLogo';
import { useAppContext } from '../store';

interface TopBarProps {
  user: { username: string; name: string } | null;
  onLogout: () => void;
  onShowHelp?: () => void;
  onToggleFKeysBar?: () => void;
  showFKeysBar?: boolean;
  onNavigate?: (tab: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({ user, onLogout, onShowHelp, onToggleFKeysBar, showFKeysBar = true, onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);
  const [darkMode, setDarkMode] = useState<boolean>(false);

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
  } = useAppContext();

  const [command, setCommand] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [commandHistory, setCommandHistory] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('sap-command-history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [tempTypedCommand, setTempTypedCommand] = useState<string>('');

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
      // Focus command field on Ctrl+K, Cmd+K, or F11
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
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

  // Compute matching results across projects, workers, bills
  const searchResults = useMemo(() => {
    if (!command.trim()) return { projects: [], workers: [], bills: [], restrictTab: '' };

    let lookupQuery = command.trim();
    let restrictTab = '';

    // Handle SAP command /n prefix
    if (lookupQuery.startsWith('/n')) {
      const parts = lookupQuery.slice(2).trim().split(/\s+/);
      const mod = parts[0]?.toLowerCase() || '';
      if (mod) {
        if (mod.startsWith('proj')) restrictTab = 'projects';
        else if (mod.startsWith('work')) restrictTab = 'workers';
        else if (mod.startsWith('bill') || mod === 'billing') restrictTab = 'bill-tracking';
        else if (mod.startsWith('dash') || mod === 'home') restrictTab = 'dashboard';
        else if (mod.startsWith('appv') || mod === 'approv') restrictTab = 'approvals';
        else if (mod.startsWith('exp')) restrictTab = 'expenses';
        else if (mod === 'dlr') restrictTab = 'dlr';
        else if (mod.startsWith('mat')) restrictTab = 'materials';
        
        lookupQuery = parts.slice(1).join(' ').trim();
      }
    }

    if (!lookupQuery) {
      if (restrictTab === 'projects') {
        return { projects: (projects || []).slice(0, 5), workers: [], bills: [], restrictTab };
      }
      if (restrictTab === 'workers') {
        return { projects: [], workers: (workers || []).slice(0, 5), bills: [], restrictTab };
      }
      if (restrictTab === 'bill-tracking') {
        return { projects: [], workers: [], bills: (trackedBills || []).slice(0, 5), restrictTab };
      }
      return { projects: [], workers: [], bills: [], restrictTab };
    }

    const q = lookupQuery.toLowerCase();

    const matchedProjects = (projects || []).filter(p => 
      p.name.toLowerCase().includes(q) || 
      (p.clientName || '').toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q)
    ).slice(0, 5);

    const matchedWorkers = (workers || []).filter(w => 
      w.name.toLowerCase().includes(q) || 
      w.workerId.toLowerCase().includes(q) || 
      w.designation.toLowerCase().includes(q)
    ).slice(0, 5);

    const matchedBills = (trackedBills || []).filter(b => 
      b.billNo.toLowerCase().includes(q) || 
      b.clientName.toLowerCase().includes(q) || 
      (b.remarks || '').toLowerCase().includes(q)
    ).slice(0, 5);

    return {
      projects: restrictTab && restrictTab !== 'projects' ? [] : matchedProjects,
      workers: restrictTab && restrictTab !== 'workers' ? [] : matchedWorkers,
      bills: restrictTab && restrictTab !== 'bill-tracking' ? [] : matchedBills,
      restrictTab
    };
  }, [command, projects, workers, trackedBills]);

  const handleExecute = (targetTab?: string, searchQueryToApply?: string) => {
    if (targetTab && searchQueryToApply !== undefined) {
      if (searchQueryToApply) {
        addToHistory(`/n ${targetTab} ${searchQueryToApply}`);
      } else {
        addToHistory(`/n ${targetTab}`);
      }

      (window as any).__pendingGlobalSearch = { tab: targetTab, query: searchQueryToApply };
      if (onNavigate) {
        onNavigate(targetTab);
      }
      window.dispatchEvent(new CustomEvent('apply-global-search', { 
        detail: { tab: targetTab, query: searchQueryToApply } 
      }));
      setIsSearchFocused(false);
      setCommand('');
      setHistoryIndex(-1);
      return;
    }

    const raw = command.trim();
    if (!raw) return;

    addToHistory(raw);

    if (raw.startsWith('/n')) {
      const parts = raw.slice(2).trim().split(/\s+/);
      const mod = parts[0]?.toLowerCase() || '';
      const filterTerm = parts.slice(1).join(' ').trim();

      if (mod) {
        let dest = '';
        if (mod.startsWith('proj')) dest = 'projects';
        else if (mod.startsWith('work')) dest = 'workers';
        else if (mod.startsWith('bill') || mod === 'billing') dest = 'bill-tracking';
        else if (mod.startsWith('dash') || mod === 'home') dest = 'dashboard';
        else if (mod.startsWith('appv') || mod === 'approv') dest = 'approvals';
        else if (mod.startsWith('exp')) dest = 'expenses';
        else if (mod === 'dlr') dest = 'dlr';
        else if (mod.startsWith('mat')) dest = 'materials';

        if (dest) {
          (window as any).__pendingGlobalSearch = { tab: dest, query: filterTerm };
          if (onNavigate) {
            onNavigate(dest);
          }
          window.dispatchEvent(new CustomEvent('apply-global-search', { 
            detail: { tab: dest, query: filterTerm } 
          }));
          setIsSearchFocused(false);
          setCommand('');
          setHistoryIndex(-1);
          return;
        }
      }
    } else if (raw === '/h' || raw === '/help') {
      if (onShowHelp) onShowHelp();
      setCommand('');
      setIsSearchFocused(false);
      setHistoryIndex(-1);
      return;
    }

    // Default search fallback
    const { projects: pList, workers: wList, bills: bList } = searchResults;
    if (pList.length > 0) {
      handleExecute('projects', pList[0].name);
    } else if (wList.length > 0) {
      handleExecute('workers', wList[0].name);
    } else if (bList.length > 0) {
      handleExecute('bill-tracking', bList[0].billNo);
    } else {
      // Just search "projects" by default
      handleExecute('projects', raw);
    }
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
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
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
      <div className="bg-[#002f6c] text-white px-3 py-1 flex items-center justify-between border-b border-[#8c9ba8] shadow-sm">
        <div className="flex items-center space-x-2">
          <SNLogo size={22} className="text-white hover:scale-105 transition-transform" />
          <span className="font-mono text-xs font-black uppercase tracking-widest text-white">SN ENTERPRISE</span>
          <span className="text-[9px] text-blue-200 bg-[#001f4d] px-1.5 py-0.5 rounded border border-blue-900 font-mono">ERP_PRD</span>
        </div>
        
        {/* Notifications and Profile */}
        <div className="flex items-center space-x-3">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleDarkMode}
            title={darkMode ? "Switch to SAP Light Mode" : "Switch to Dark Mode"}
            className="flex items-center justify-center p-1.5 hover:bg-[#001f4d] rounded transition duration-150 text-white focus:outline-none cursor-pointer"
          >
            {darkMode ? (
              <Sun size={15} className="text-amber-400" />
            ) : (
              <Moon size={15} className="text-blue-100" />
            )}
          </button>

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
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-[#002f6c] text-[7px] items-center justify-center font-bold text-white leading-none shadow shadow-red-900/50">
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
              <div className="absolute right-0 mt-1.5 w-52 bg-[#eef2f6] border border-[#8c9ba8] shadow-2xl rounded-sm z-50 text-gray-800 animate-fade-in">
                <div className="bg-gradient-to-r from-[#0056b3] to-[#002f6c] text-white px-2 py-1 flex items-center select-none">
                  <span className="font-bold text-[9px] uppercase tracking-wide">System Access Profile</span>
                </div>
                <div className="p-3 bg-white border border-[#8c9ba8] border-t-0 text-[10px] space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-[#0056b3] text-white rounded-full flex items-center justify-center font-mono text-xs font-semibold uppercase shrink-0">
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
                    <span className="text-gray-700 font-semibold">
                      {user.username === 'saddamsne' ? 'Owner' : 'Managing Director'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[8px] uppercase">Connection Status</span>
                    <span className="text-green-700 font-bold flex items-center mt-0.5 text-[10px]">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block mr-1 animate-pulse"></span>
                      Authenticated Mode
                    </span>
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

      {/* Menu Bar */}
      <div className="flex items-center px-2 py-0.5 text-[11px] space-x-3 select-none">
        <span className="hover:bg-[#d9e4f1] hover:border-[#8c9ba8] border border-transparent px-1 cursor-default">File</span>
        <span className="hover:bg-[#d9e4f1] hover:border-[#8c9ba8] border border-transparent px-1 cursor-default">Edit</span>
        <div className="relative group">
          <span className="hover:bg-[#d9e4f1] hover:border-[#8c9ba8] border border-transparent px-1 cursor-pointer">Navigate</span>
          <div className="absolute left-0 mt-0.5 w-[220px] bg-[#f5f8fb] border border-[#8c9ba8] shadow-2xl hidden group-hover:block z-[9999] text-black">
            <div className="bg-[#002f6c] text-white font-semibold text-[8px] px-2 py-0.5 select-none uppercase font-mono">F-Key Quick Jump</div>
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
            <div className="bg-[#002f6c] text-white font-semibold text-[8px] px-2 py-0.5 select-none uppercase font-mono">System Guides</div>
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
                }}
                onFocus={() => setIsSearchFocused(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleExecute();
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (commandHistory.length === 0) return;
                    const nextIdx = historyIndex + 1;
                    if (nextIdx < commandHistory.length) {
                      setHistoryIndex(nextIdx);
                      setCommand(commandHistory[nextIdx]);
                    }
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    const nextIdx = historyIndex - 1;
                    if (nextIdx >= 0) {
                      setHistoryIndex(nextIdx);
                      setCommand(commandHistory[nextIdx]);
                    } else if (nextIdx === -1) {
                      setHistoryIndex(-1);
                      setCommand(tempTypedCommand);
                    }
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

            {/* Suggestions Popover */}
            {isSearchFocused && (
              <div className="absolute left-0 mt-1.5 w-[380px] bg-[#f5f8fb] border-2 border-[#002f6c] shadow-[0_15px_30px_rgba(0,0,0,0.3)] rounded-sm z-[99999] text-black animate-fade-in divide-y divide-gray-200">
                {/* SAP style status line */}
                <div className="bg-[#002f6c] text-white px-2 py-0.5 flex items-center justify-between text-[8px] font-bold uppercase font-mono tracking-wider">
                  <div className="flex items-center space-x-1">
                    <Search size={10} className="text-amber-400" />
                    <span>SAP ERP Enterprise Search Engine</span>
                  </div>
                  <span className="text-blue-200 font-mono">SYS_DEV</span>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-gray-150 bg-white">
                  {/* Command shortcuts */}
                  {(!command || command.startsWith('/')) && (
                    <div className="bg-[#eef2f6] p-1.5">
                      <div className="text-[8px] uppercase font-mono font-bold text-blue-900 px-1 border-b border-blue-200 mb-1 pb-0.5">📟 Transaction Commands</div>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px]">
                        <button 
                          onClick={() => { setCommand('/n projects'); handleExecute('projects', ''); }}
                          className="text-left hover:bg-blue-600 hover:text-white px-1.5 py-0.5 rounded font-mono truncate"
                        >
                          <span className="font-bold text-[#0056b3] hover:text-inherit">/n projects</span> <span className="text-[8px] text-gray-500 hover:text-inherit">(Goto Projects)</span>
                        </button>
                        <button 
                          onClick={() => { setCommand('/n workers'); handleExecute('workers', ''); }}
                          className="text-left hover:bg-blue-600 hover:text-white px-1.5 py-0.5 rounded font-mono truncate"
                        >
                          <span className="font-bold text-[#0056b3] hover:text-inherit">/n workers</span> <span className="text-[8px] text-gray-500 hover:text-inherit">(Goto Workers)</span>
                        </button>
                        <button 
                          onClick={() => { setCommand('/n bills'); handleExecute('bill-tracking', ''); }}
                          className="text-left hover:bg-blue-600 hover:text-white px-1.5 py-0.5 rounded font-mono truncate"
                        >
                          <span className="font-bold text-[#0056b3] hover:text-inherit">/n bills</span> <span className="text-[8px] text-gray-500 hover:text-inherit">(Goto Bill Tracker)</span>
                        </button>
                        <button 
                          onClick={() => { setCommand('/n help'); handleExecute(); }}
                          className="text-left hover:bg-blue-600 hover:text-white px-1.5 py-0.5 rounded font-mono truncate"
                        >
                          <span className="font-bold text-[#0056b3] hover:text-inherit">/n help</span> <span className="text-[8px] text-gray-500 hover:text-inherit">(Show keyboard help)</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Recent History Segment */}
                  {commandHistory.length > 0 && !command.trim() && (
                    <div className="bg-slate-50 p-1.5 font-sans">
                      <div className="flex items-center justify-between text-[8px] uppercase font-mono font-bold text-slate-700 px-1 border-b border-slate-200 mb-1 pb-0.5">
                        <span className="flex items-center space-x-1">
                          <Clock size={9} className="text-slate-500" />
                          <span>⌛ Recent Command History</span>
                        </span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); clearHistory(); }}
                          className="text-red-600 hover:text-red-800 text-[8px] flex items-center space-x-0.5 uppercase tracking-wide font-bold focus:outline-none cursor-pointer"
                          title="Clear Command History"
                        >
                          <Trash2 size={8} />
                          <span>Clear</span>
                        </button>
                      </div>
                      <div className="max-h-32 overflow-y-auto space-y-0.5 bg-gray-50 p-1 rounded-sm border border-gray-200">
                        {commandHistory.map((hist, idx) => (
                          <div key={idx} className="flex items-center justify-between hover:bg-slate-200 rounded px-1 py-0.5 text-[9px] group/item">
                            <button
                              onClick={() => { setCommand(hist); setTempTypedCommand(hist); }}
                              className="text-left font-mono truncate text-[#0056b3] hover:text-blue-900 flex-1 pr-1.5"
                              title="Click to load command"
                            >
                              {hist}
                            </button>
                            <button 
                              onClick={() => {
                                setCommand(hist);
                                // Execute immediately
                                setTimeout(() => {
                                  const parts = hist.trim().split(/\s+/);
                                  if (hist.startsWith('/n')) {
                                    const mod = parts[0]?.slice(2).toLowerCase() || '';
                                    const filterTerm = parts.slice(1).join(' ').trim();
                                    let dest = '';
                                    if (mod.startsWith('proj')) dest = 'projects';
                                    else if (mod.startsWith('work')) dest = 'workers';
                                    else if (mod.startsWith('bill') || mod === 'billing') dest = 'bill-tracking';
                                    else if (mod.startsWith('dash') || mod === 'home') dest = 'dashboard';
                                    else if (mod.startsWith('appv') || mod === 'approv') dest = 'approvals';
                                    else if (mod.startsWith('exp')) dest = 'expenses';
                                    else if (mod === 'dlr') dest = 'dlr';
                                    else if (mod.startsWith('mat')) dest = 'materials';
                                    
                                    if (dest) {
                                      handleExecute(dest, filterTerm);
                                      return;
                                    }
                                  }
                                  handleExecute(undefined, hist);
                                }, 50);
                              }}
                              className="text-[8px] bg-[#eef2f6] border border-gray-300 hover:bg-[#0056b3] hover:text-white px-1 rounded shrink-0 text-slate-600 font-mono scale-95 cursor-pointer uppercase font-bold"
                              title="Execute immediately"
                            >
                              Run
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty state overview */}
                  {!command.trim() && (
                    <div className="p-3 text-center text-gray-500 select-none text-[10px]">
                      <p className="font-semibold text-gray-700">🔍 Global SAP Command Line & Search</p>
                      <p className="text-[9px] mt-1 text-gray-400">Type a project name, worker name, designation, or bill number. Use `/n [tab_command]` to switch modules instantly.</p>
                      <p className="text-[8px] text-slate-400 mt-1.5 font-mono">Shortcuts: Arrow Up/Down to cycle history. Ctrl+K to focus.</p>
                    </div>
                  )}

                  {command.trim() && (
                    <>
                      {/* Projects */}
                      {searchResults.projects.length > 0 && (
                        <div>
                          <div className="bg-amber-50 text-amber-900 border-b border-amber-200 font-bold font-mono text-[8px] px-2 py-0.5 uppercase tracking-wider">📁 Matching Sites / Projects ({searchResults.projects.length})</div>
                          <div className="p-0.5 divide-y divide-gray-100">
                            {searchResults.projects.map((proj) => (
                              <button
                                key={proj.id}
                                onClick={() => handleExecute('projects', proj.name)}
                                className="w-full text-left p-1.5 hover:bg-blue-600 hover:text-white transition-colors block text-[10px]"
                              >
                                <div className="font-bold text-[10px] text-[#002f6c] hover:text-inherit truncate">{proj.name}</div>
                                <div className="text-[9px] text-gray-500 hover:text-inherit flex justify-between">
                                  <span>Client: {proj.clientName || 'N/A'}</span>
                                  <span>Start: {proj.startDate}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Workers */}
                      {searchResults.workers.length > 0 && (
                        <div>
                          <div className="bg-teal-50 text-teal-900 border-b border-teal-200 font-bold font-mono text-[8px] px-2 py-0.5 uppercase tracking-wider">👷 Workers HQ Matches ({searchResults.workers.length})</div>
                          <div className="p-0.5 divide-y divide-gray-100">
                            {searchResults.workers.map((worker) => {
                              const projName = projects.find(p => p.id === worker.projectId)?.name || 'Unassigned';
                              return (
                                <button
                                  key={worker.id}
                                  onClick={() => handleExecute('workers', worker.name)}
                                  className="w-full text-left p-1.5 hover:bg-blue-600 hover:text-white transition-colors block text-[10px]"
                                >
                                  <div className="font-bold text-[10px] text-[#002f6c] hover:text-inherit truncate">{worker.name} ({worker.workerId})</div>
                                  <div className="text-[9px] text-gray-500 hover:text-inherit flex justify-between">
                                    <span>Role: {worker.designation}</span>
                                    <span className="truncate max-w-[150px]">Site: {projName}</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Tracked Bills */}
                      {searchResults.bills.length > 0 && (
                        <div>
                          <div className="bg-blue-50 text-blue-900 border-b border-blue-200 font-bold font-mono text-[8px] px-2 py-0.5 uppercase tracking-wider">📄 Bill Tracking Matches ({searchResults.bills.length})</div>
                          <div className="p-0.5 divide-y divide-gray-100">
                            {searchResults.bills.map((bill) => {
                              const projName = projects.find(p => p.id === bill.projectId)?.name || 'Unassigned';
                              return (
                                <button
                                  key={bill.id}
                                  onClick={() => handleExecute('bill-tracking', bill.billNo)}
                                  className="w-full text-left p-1.5 hover:bg-blue-600 hover:text-white transition-colors block text-[10px]"
                                >
                                  <div className="font-bold text-[10px] text-[#002f6c] hover:text-inherit truncate">Bill #{bill.billNo} ({bill.billType})</div>
                                  <div className="text-[9px] text-gray-500 hover:text-inherit flex justify-between">
                                    <span>Amt: ₹{(bill.billAmount || 0).toLocaleString('en-IN')}</span>
                                    <span>Status: {bill.currentStatus}</span>
                                  </div>
                                  <div className="text-[8px] text-gray-400 font-mono hover:text-inherit italic max-w-full truncate">Site: {projName}</div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* No matches */}
                      {searchResults.projects.length === 0 && searchResults.workers.length === 0 && searchResults.bills.length === 0 && (
                        <div className="p-4 text-center text-gray-500 select-none text-[10px]">
                          <p>⚠️ No matching records found.</p>
                          <p className="text-[9px] text-gray-400 mt-1">Press Enter to run default raw search on Projects page.</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-1 border-r border-[#8c9ba8] pr-1 mr-1">
          <button className="p-1 hover:bg-[#d9e4f1] hover:border-[#8c9ba8] border border-transparent rounded-sm"><File size={14} className="text-[#0056b3]" /></button>
          <button className="p-1 hover:bg-[#d9e4f1] hover:border-[#8c9ba8] border border-transparent rounded-sm"><FolderOpen size={14} className="text-yellow-500" /></button>
          <button className="p-1 hover:bg-[#d9e4f1] hover:border-[#8c9ba8] border border-transparent rounded-sm"><Save size={14} className="text-[#0056b3]" /></button>
        </div>
        <div className="flex items-center space-x-1 border-r border-[#8c9ba8] pr-1 mr-1">
          <button className="p-1 hover:bg-[#d9e4f1] hover:border-[#8c9ba8] border border-transparent rounded-sm"><ArrowLeft size={14} className="text-green-700" /></button>
          <button className="p-1 hover:bg-[#d9e4f1] hover:border-[#8c9ba8] border border-transparent rounded-sm"><ArrowRight size={14} className="text-green-700" /></button>
          <button title="Print view" onClick={() => window.print()} className="p-1 hover:bg-[#d9e4f1] hover:border-[#8c9ba8] border border-transparent rounded-sm"><Printer size={14} className="text-gray-700" /></button>
          <button title="Toggle Dark Mode" onClick={toggleDarkMode} className="p-1 hover:bg-[#d9e4f1] hover:border-[#8c9ba8] border border-transparent rounded-sm">
            {darkMode ? <Sun size={14} className="text-amber-500" /> : <Moon size={14} className="text-gray-700" />}
          </button>
        </div>
        <div className="flex items-center space-x-1">
          <button className="p-1 hover:bg-[#d9e4f1] hover:border-[#8c9ba8] border border-transparent rounded-sm"><Play size={14} className="text-green-600" /></button>
          <button className="p-1 hover:bg-[#d9e4f1] hover:border-[#8c9ba8] border border-transparent rounded-sm"><Pause size={14} className="text-yellow-600" /></button>
          <button className="p-1 hover:bg-[#d9e4f1] hover:border-[#8c9ba8] border border-transparent rounded-sm"><Square size={14} className="text-red-600" /></button>
        </div>
      </div>
    </div>
  );
};
