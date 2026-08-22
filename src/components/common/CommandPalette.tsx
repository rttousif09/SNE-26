import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Command, Building2, Users, Receipt, CreditCard, 
  Wallet, Package, FileText, Settings, ShieldCheck, Activity,
  ArrowRight, Star, Clock, Sparkles, X, PlusCircle, CheckCircle,
  GitFork, FolderOpen, Layers, BarChart3
} from 'lucide-react';
import { useAppContext } from '../../store';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tabId: string, title?: string, extraProps?: any) => void;
}

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Modules & T-Codes' | 'Projects' | 'Workers' | 'Subcontractors' | 'Quick Actions' | 'Reports';
  tcode?: string;
  icon: React.ReactNode;
  action: () => void;
  isFavorite?: boolean;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate
}) => {
  const { projects = [], workers = [], subcontractors = [], billings = [], user } = useAppContext() as any;
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Global hotkey listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K' || e.key === '/')) {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open
          (window as any).openCommandPalette && (window as any).openCommandPalette();
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Build command registry
  const allCommands: CommandItem[] = [
    // Quick Actions
    {
      id: 'qa-bill',
      title: 'Create New RA Bill',
      subtitle: 'Billing & Invoicing Workflow (BILL01)',
      category: 'Quick Actions',
      tcode: 'BILL01',
      icon: <Receipt size={14} className="text-blue-500" />,
      action: () => { onNavigate('billing'); onClose(); }
    },
    {
      id: 'qa-cpay',
      title: 'Record Client Payment',
      subtitle: 'Post Inward Receipt & Adjust TDS/Retention (CPAY01)',
      category: 'Quick Actions',
      tcode: 'CPAY01',
      icon: <CreditCard size={14} className="text-emerald-500" />,
      action: () => { onNavigate('client-payment'); onClose(); }
    },
    {
      id: 'qa-worker',
      title: 'Register New Worker / Labour',
      subtitle: 'Add KYC, skill trade, daily rate (WRK01)',
      category: 'Quick Actions',
      tcode: 'WRK01',
      icon: <Users size={14} className="text-purple-500" />,
      action: () => { onNavigate('workers'); onClose(); }
    },
    {
      id: 'qa-dlr',
      title: 'Daily Labour Attendance (DLR)',
      subtitle: 'Bulk attendance marking & overtime (DLR01)',
      category: 'Quick Actions',
      tcode: 'DLR01',
      icon: <Users size={14} className="text-teal-500" />,
      action: () => { onNavigate('dlr'); onClose(); }
    },
    {
      id: 'qa-kharchi',
      title: 'Disburse Worker Kharchi (Pocket Money)',
      subtitle: 'Weekly cash payout register (KHAR01)',
      category: 'Quick Actions',
      tcode: 'KHAR01',
      icon: <Wallet size={14} className="text-amber-500" />,
      action: () => { onNavigate('kharchi'); onClose(); }
    },
    {
      id: 'qa-advance',
      title: 'Issue Worker Advance',
      subtitle: 'Advance register & recovery schedule (ADV01)',
      category: 'Quick Actions',
      tcode: 'ADV01',
      icon: <Wallet size={14} className="text-blue-500" />,
      action: () => { onNavigate('advance'); onClose(); }
    },
    {
      id: 'qa-subcontractor-bill',
      title: 'Create Subcontractor RA Bill',
      subtitle: 'Subcontractor measurement and billing (SCB01)',
      category: 'Quick Actions',
      tcode: 'SCB01',
      icon: <FileText size={14} className="text-amber-600" />,
      action: () => { onNavigate('subcontractors-billing'); onClose(); }
    },
    {
      id: 'qa-exp',
      title: 'Record Site Expense',
      subtitle: 'Petty cash, materials, transport (EXP01)',
      category: 'Quick Actions',
      tcode: 'EXP01',
      icon: <Wallet size={14} className="text-rose-500" />,
      action: () => { onNavigate('expenses'); onClose(); }
    },
    {
      id: 'qa-apprv',
      title: 'Open Approval Center',
      subtitle: 'Review & post pending financial authorizations (APP01)',
      category: 'Quick Actions',
      tcode: 'APP01',
      icon: <ShieldCheck size={14} className="text-emerald-500" />,
      action: () => { onNavigate('approvals'); onClose(); }
    },
    {
      id: 'qa-df01',
      title: 'SAP Document Flow Visualizer',
      subtitle: 'Trace end-to-end linked ERP transactions (DF01)',
      category: 'Quick Actions',
      tcode: 'DF01',
      icon: <GitFork size={14} className="text-indigo-500" />,
      action: () => { onNavigate('document-flow'); onClose(); }
    },

    // Modules
    {
      id: 'mod-dash',
      title: 'Executive Dashboard & Overview',
      subtitle: 'KPIs, real-time alerts, project health',
      category: 'Modules & T-Codes',
      tcode: 'DASH01',
      icon: <Building2 size={14} className="text-blue-600" />,
      action: () => { onNavigate('dashboard'); onClose(); }
    },
    {
      id: 'mod-prj',
      title: 'Projects Master & 360° Cockpit',
      subtitle: 'Active site management, BOQs, client details',
      category: 'Modules & T-Codes',
      tcode: 'PRJ01',
      icon: <Building2 size={14} className="text-blue-600" />,
      action: () => { onNavigate('projects'); onClose(); }
    },
    {
      id: 'mod-floor',
      title: 'Floor Abstract & Measurements',
      subtitle: 'Item-wise floor execution records',
      category: 'Modules & T-Codes',
      tcode: 'FLR01',
      icon: <Layers size={14} className="text-indigo-600" />,
      action: () => { onNavigate('floor-abstracts'); onClose(); }
    },
    {
      id: 'mod-boq',
      title: 'BOQ Master & Rate Analysis',
      subtitle: 'Bill of quantities, scheduled line items',
      category: 'Modules & T-Codes',
      tcode: 'BOQ01',
      icon: <FileText size={14} className="text-teal-600" />,
      action: () => { onNavigate('boqs'); onClose(); }
    },
    {
      id: 'mod-mat',
      title: 'Materials & Inventory Store',
      subtitle: 'Stock balances, GRN, inward delivery challans',
      category: 'Modules & T-Codes',
      tcode: 'MAT01',
      icon: <Package size={14} className="text-amber-700" />,
      action: () => { onNavigate('materials'); onClose(); }
    },
    {
      id: 'mod-analytics',
      title: 'Graphs & Analytics (BI Studio)',
      subtitle: 'Cash flow velocity, profitability curves, margin drilldowns',
      category: 'Reports',
      tcode: 'BI01',
      icon: <BarChart3 size={14} className="text-purple-600" />,
      action: () => { onNavigate('analytics'); onClose(); }
    },
    {
      id: 'mod-dms',
      title: 'DMS Document Center',
      subtitle: 'Work orders, contracts, site photos, tax invoices',
      category: 'Modules & T-Codes',
      tcode: 'DMS01',
      icon: <FolderOpen size={14} className="text-blue-600" />,
      action: () => { onNavigate('dms'); onClose(); }
    },
    {
      id: 'mod-audit',
      title: 'System Activity & Audit Log',
      subtitle: 'Timestamped user audit trail & mutation logs',
      category: 'Modules & T-Codes',
      tcode: 'AUD01',
      icon: <Activity size={14} className="text-slate-600" />,
      action: () => { onNavigate('activity-log'); onClose(); }
    },

    // Dynamic Projects
    ...projects.map((p: any) => ({
      id: `prj-${p.id}`,
      title: p.name,
      subtitle: `Client: ${p.clientName || 'N/A'} • Status: ${p.status || 'Ongoing'} • Location: ${p.location || 'Site'}`,
      category: 'Projects' as const,
      tcode: p.projectCode || 'PRJ',
      icon: <Building2 size={14} className="text-blue-500" />,
      action: () => {
        onNavigate('projects', p.name, { selectedProjectId: p.id });
        onClose();
      }
    })),

    // Dynamic Workers
    ...workers.slice(0, 15).map((w: any) => ({
      id: `wrk-${w.id}`,
      title: w.name,
      subtitle: `Role: ${w.skill || w.trade || 'Worker'} • Phone: ${w.phone || 'N/A'} • Daily Rate: ₹${w.dailyRate || 0}`,
      category: 'Workers' as const,
      tcode: w.workerCode || 'WRK',
      icon: <Users size={14} className="text-teal-600" />,
      action: () => {
        onNavigate('workers', w.name, { selectedWorkerId: w.id });
        onClose();
      }
    })),

    // Dynamic Subcontractors
    ...subcontractors.map((s: any) => ({
      id: `sub-${s.id}`,
      title: s.name,
      subtitle: `Trade: ${s.trade || 'Subcontractor'} • GSTIN: ${s.gstin || 'N/A'} • Project: ${s.projectName || 'All Sites'}`,
      category: 'Subcontractors' as const,
      tcode: s.subcontractorCode || 'SC',
      icon: <Building2 size={14} className="text-amber-600" />,
      action: () => {
        onNavigate('subcontractors', s.name, { selectedSubId: s.id });
        onClose();
      }
    }))
  ];

  // Filter commands by search query
  const filteredCommands = allCommands.filter(cmd => {
    if (!query.trim()) return true;
    const q = query.toLowerCase().trim();
    return (
      cmd.title.toLowerCase().includes(q) ||
      (cmd.subtitle && cmd.subtitle.toLowerCase().includes(q)) ||
      (cmd.tcode && cmd.tcode.toLowerCase().includes(q)) ||
      cmd.category.toLowerCase().includes(q)
    );
  });

  // Group commands by category
  const categories = Array.from(new Set(filteredCommands.map(c => c.category)));

  // Key navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filteredCommands.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredCommands.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-[#1E2228] border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] font-sans"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Bar Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
          <Search size={18} className="text-slate-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search commands, T-Codes (e.g. BILL01, CPAY01), projects, workers..."
            className="w-full bg-transparent border-0 text-sm sm:text-base text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          <div className="flex items-center space-x-1.5 shrink-0 ml-2">
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded">
              ESC
            </kbd>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto flex-1 p-2 space-y-4 max-h-[420px] scrollbar-thin">
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Search size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm font-semibold">No commands or records found</p>
              <p className="text-xs text-slate-500 mt-0.5">Try searching with a T-Code like <span className="font-mono text-blue-500">BILL01</span> or project name.</p>
            </div>
          ) : (
            categories.map(cat => {
              const catItems = filteredCommands.filter(c => c.category === cat);
              return (
                <div key={cat} className="space-y-1">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {cat}
                  </div>
                  <div className="space-y-0.5">
                    {catItems.map(item => {
                      const globalIdx = filteredCommands.indexOf(item);
                      const isSelected = globalIdx === selectedIndex;

                      return (
                        <div
                          key={item.id}
                          onClick={item.action}
                          onMouseEnter={() => setSelectedIndex(globalIdx)}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className="p-1.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                              {item.icon}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className="font-semibold text-xs truncate">
                                  {item.title}
                                </span>
                                {item.tcode && (
                                  <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                    {item.tcode}
                                  </span>
                                )}
                              </div>
                              {item.subtitle && (
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                  {item.subtitle}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-1 shrink-0 ml-2">
                            {isSelected && (
                              <ArrowRight size={13} className="text-blue-600 dark:text-blue-400 animate-in fade-in" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1">
              <kbd className="px-1 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-mono text-[9px]">↑↓</kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center space-x-1">
              <kbd className="px-1 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-mono text-[9px]">↵</kbd>
              <span>Execute</span>
            </span>
            <span className="flex items-center space-x-1">
              <kbd className="px-1 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-mono text-[9px]">ESC</kbd>
              <span>Close</span>
            </span>
          </div>
          <span className="font-semibold text-blue-600 dark:text-blue-400 font-mono text-[10px]">
            SN ENTERPRISES ERP
          </span>
        </div>
      </div>
    </div>
  );
};
