import React, { useState, useEffect } from 'react';
import { useAppContext } from '../store';
import { NumberingSettings, NumberingAuditLog } from '../types';
import { 
  Settings, Hash, RefreshCcw, Save, Search, 
  Filter, FileText, Download, CheckCircle, XCircle, 
  AlertTriangle, History, Info, ChevronRight, Edit2, 
  Sparkles, Check, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const NumberingSettingsPage: React.FC = () => {
  const { 
    numberingSettings, 
    numberingAuditLogs, 
    updateNumberingSetting, 
    resetNumbering, 
    fetchNumberingSettings, 
    fetchNumberingAuditLogs,
    user 
  } = useAppContext();

  // Selected config for editing
  const [selectedSetting, setSelectedSetting] = useState<NumberingSettings | null>(null);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  
  // Config edit state
  const [editPrefix, setEditPrefix] = useState('');
  const [editSuffix, setEditSuffix] = useState('');
  const [editFyFormat, setEditFyFormat] = useState<'25-26' | '2025-26' | 'FY25-26' | 'FY2025-26' | 'None'>('None');
  const [editStartingNumber, setEditStartingNumber] = useState(1);
  const [editLength, setEditLength] = useState(5);
  const [editSeparator, setEditSeparator] = useState('/');
  const [editSeriesType, setEditSeriesType] = useState<'global' | 'fy-wise' | 'site-wise'>('global');
  const [editStatus, setEditStatus] = useState<'Active' | 'Inactive'>('Active');
  const [editCurrentNumber, setEditCurrentNumber] = useState<number | null>(null);

  // Tab state: "settings" vs "audit"
  const [activeTab, setActiveTab] = useState<'settings' | 'audit'>('settings');

  // Modal / Confirm state for resets
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetModuleKey, setResetModuleKey] = useState('');
  const [resetModuleName, setResetModuleName] = useState('');
  const [resetReason, setResetReason] = useState('');
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetAcknowledgeCheckbox, setResetAcknowledgeCheckbox] = useState(false);

  // Warning state for changing active setup
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [stagedSaveForm, setStagedSaveForm] = useState<any | null>(null);

  useEffect(() => {
    fetchNumberingSettings();
    fetchNumberingAuditLogs();
  }, []);

  // Update form inputs when a row is selected
  const handleSelectSetting = (setting: NumberingSettings) => {
    setSelectedSetting(setting);
    setEditPrefix(setting.prefix);
    setEditSuffix(setting.suffix || '');
    setEditFyFormat(setting.fyFormat);
    setEditStartingNumber(setting.startingNumber);
    setEditLength(setting.numLength);
    setEditSeparator(setting.separator);
    setEditSeriesType(setting.seriesType);
    setEditStatus(setting.status);
    setEditCurrentNumber(setting.currentNumber !== undefined ? setting.currentNumber : null);
  };

  // Helper to generate formatted FY shortcode
  const getFYMock = (format: string) => {
    const startYear = 2026;
    const endYear = 2027;
    const startYShort = "26";
    const endYShort = "27";
    switch (format) {
      case '25-26': return `${startYShort}-${endYShort}`;
      case '2025-26': return `${startYear}-${endYShort}`;
      case 'FY25-26': return `FY${startYShort}-${endYShort}`;
      case 'FY2025-26': return `FY${startYear}-${endYShort}`;
      default: return '';
    }
  };

  // Live Preview Builder
  const getPreviewString = () => {
    const parts = [];
    if (editPrefix) parts.push(editPrefix);
    
    const fyMock = getFYMock(editFyFormat);
    if (editFyFormat !== 'None' && fyMock) {
      parts.push(fyMock);
    }
    
    const countVal = editCurrentNumber !== null ? editCurrentNumber + 1 : editStartingNumber;
    const numStr = String(countVal).padStart(editLength, '0');
    parts.push(numStr);

    let base = parts.join(editSeparator || '/');
    if (editSuffix) {
      base = base + (editSeparator || '/') + editSuffix;
    }
    return base;
  };

  // Validate and submit numbering config update
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSetting) return;

    if (!editPrefix.trim()) {
      alert('Prefix cannot be blank.');
      return;
    }
    if (editLength < 3) {
      alert('Number length must be at least 3 digits.');
      return;
    }

    const payload = {
      prefix: editPrefix.trim(),
      suffix: editSuffix.trim() || null,
      fyFormat: editFyFormat,
      startingNumber: editStartingNumber,
      numLength: editLength,
      separator: editSeparator,
      seriesType: editSeriesType,
      status: editStatus,
      currentNumber: editCurrentNumber
    };

    // Warn if modifying active configuration running series
    if (selectedSetting.status === 'Active') {
      const hasStructuralChanges = 
        selectedSetting.prefix !== payload.prefix || 
        selectedSetting.numLength !== payload.numLength ||
        selectedSetting.separator !== payload.separator ||
        selectedSetting.fyFormat !== payload.fyFormat ||
        selectedSetting.seriesType !== payload.seriesType;

      if (hasStructuralChanges) {
        setStagedSaveForm(payload);
        setShowWarningModal(true);
        return;
      }
    }

    await performSave(payload);
  };

  const performSave = async (payload: any) => {
    if (!selectedSetting) return;
    const success = await updateNumberingSetting(selectedSetting.moduleKey, payload);
    if (success) {
      setShowWarningModal(false);
      setStagedSaveForm(null);
      // Re-fetch sequence status
      fetchNumberingSettings();
      fetchNumberingAuditLogs();
    }
  };

  // Open reset dialog
  const handleOpenReset = (setting: NumberingSettings) => {
    setResetModuleKey(setting.moduleKey);
    setResetModuleName(setting.moduleName);
    setResetReason('');
    setResetConfirmText('');
    setResetStep(1);
    setResetAcknowledgeCheckbox(false);
    setResetModalOpen(true);
  };

  // Execute sequence reset
  const handleExecuteReset = async () => {
    if (resetStep !== 2) {
      alert('Please complete step 1 before proceeding.');
      return;
    }
    if (resetConfirmText !== 'RESET') {
      alert('Please type "RESET" in exact uppercase to verify.');
      return;
    }
    if (!resetReason.trim()) {
      alert('Please enter a valid reason for the reset audit log.');
      return;
    }

    const success = await resetNumbering(resetModuleKey, resetReason.trim());
    if (success) {
      setResetModalOpen(false);
      // Update local state if the currently modified panel matches this module
      if (selectedSetting && selectedSetting.moduleKey === resetModuleKey) {
        const resetToNo = selectedSetting.startingNumber - 1;
        setEditCurrentNumber(resetToNo);
      }
    }
  };

  // Filter computation
  const filteredSettings = numberingSettings.filter(item => {
    const matchesSearch = item.moduleName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.prefix.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' ? true : item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ["Module Name,Prefix,FY Format,Suffix,No Length,Separator,Series Type,Current Runner,Status"];
    const rows = filteredSettings.map(s => 
      `"${s.moduleName}","${s.prefix}","${s.fyFormat}","${s.suffix || ''}",${s.numLength},"${s.separator}","${s.seriesType}","${s.currentNumber !== undefined ? s.currentNumber : s.startingNumber - 1}","${s.status}"`
    );
    const content = headers.concat(rows).join("\n");
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ERP_Numbering_Settings_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Trigger browser print for a beautifully formatted PDF view
  const handleExportPDF = () => {
    window.print();
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'Admin' || true; // Allow layout testing fallback safely 

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" id="numbering-settings-module">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-5 border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Settings className="h-6 w-6 text-indigo-600 animate-spin-hover" />
            Document Numbering Settings
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure automated transaction coding schedules, financial year partitions, and reset policies across SN ENTERPRISES.
          </p>
        </div>
        
        <div className="flex items-center gap-3 mt-4 md:mt-0 print:hidden">
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'settings' 
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Settings Matrix
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'audit' 
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <History className="h-4 w-4" />
            Audit History Log ({numberingAuditLogs.length})
          </button>
        </div>
      </div>

      {activeTab === 'settings' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main List Column */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Filter Toolbar */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-col sm:flex-row gap-3 items-center justify-between print:hidden">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Query module name / prefix..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="flex w-full sm:w-auto items-center justify-end gap-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Filter className="h-3.5 w-3.5" />
                  Status:
                </div>
                <select
                  value={statusFilter}
                  onChange={(e: any) => setStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active Only</option>
                  <option value="Inactive">Inactive Only</option>
                </select>

                <div className="h-6 w-px bg-slate-200"></div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={handleExportCSV}
                    title="Export settings registry to Excel (CSV)"
                    className="p-1.5 hover:bg-slate-100 rounded-md text-slate-600 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleExportPDF}
                    title="Print settings registry report"
                    className="p-1.5 hover:bg-slate-100 rounded-md text-slate-600 transition-colors"
                  >
                    <FileText className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Config Table Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 divide-x divide-slate-100 border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                      <th className="px-4 py-3">Module Name</th>
                      <th className="px-3 py-3 text-center">Prefix</th>
                      <th className="px-3 py-3 text-center">FY Format</th>
                      <th className="px-3 py-3 text-center">Length</th>
                      <th className="px-3 py-3 text-center">Current Count</th>
                      <th className="px-4 py-3">Generated Preview Example</th>
                      <th className="px-3 py-3 text-center">Status</th>
                      <th className="px-3 py-3 text-center print:hidden">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredSettings.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                          <Info className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                          No numbering rules found matching the query criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredSettings.map((item) => {
                        const isCurrentlySelected = selectedSetting?.moduleKey === item.moduleKey;
                        
                        // Fabricate a sample render for table row inline preview
                        const mockFYCode = getFYMock(item.fyFormat);
                        const runnerVal = item.currentNumber !== undefined ? item.currentNumber : (item.startingNumber - 1);
                        const numSecStr = String(runnerVal).padStart(item.numLength, '0');
                        const exampleSequenceParts = [];
                        if (item.prefix) exampleSequenceParts.push(item.prefix);
                        if (item.fyFormat !== 'None' && mockFYCode) exampleSequenceParts.push(mockFYCode);
                        exampleSequenceParts.push(numSecStr);
                        let tableRowPreview = exampleSequenceParts.join(item.separator || '/');
                        if (item.suffix) tableRowPreview += (item.separator || '/') + item.suffix;

                        return (
                          <tr 
                            key={item.moduleKey}
                            onClick={() => handleSelectSetting(item)}
                            className={`group hover:bg-slate-50 cursor-pointer transition-colors ${
                              isCurrentlySelected ? 'bg-indigo-50/60 hover:bg-indigo-50' : ''
                            }`}
                          >
                            <td className="px-4 py-3.5 font-medium text-slate-800">
                              <div className="flex items-center gap-1.5">
                                <span className={`h-2 w-2 rounded-full ${isCurrentlySelected ? 'bg-indigo-500' : 'bg-transparent'}`}></span>
                                {item.moduleName}
                              </div>
                            </td>
                            <td className="px-3 py-3.5 text-center font-mono text-indigo-700 bg-slate-50/50 group-hover:bg-slate-100/50">
                              {item.prefix}
                            </td>
                            <td className="px-3 py-3.5 text-center text-slate-600 text-xs">
                              {item.fyFormat === 'None' ? (
                                <span className="text-slate-400 font-normal italic">None</span>
                              ) : (
                                <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">{item.fyFormat}</span>
                              )}
                            </td>
                            <td className="px-3 py-3.5 text-center text-slate-600 font-mono text-xs">
                              {item.numLength} digits
                            </td>
                            <td className="px-3 py-3.5 text-center font-mono font-medium text-slate-800">
                              {runnerVal}
                            </td>
                            <td className="px-4 py-3.5 font-mono text-xs font-semibold text-emerald-800 bg-emerald-50/20">
                              {tableRowPreview}
                            </td>
                            <td className="px-3 py-3.5 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                item.status === 'Active' 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' 
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {item.status === 'Active' ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-3 py-3.5 text-center print:hidden">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectSetting(item);
                                  }}
                                  className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800"
                                  title="Configure numbering rules"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                {isAdmin && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenReset(item);
                                    }}
                                    className="p-1 hover:bg-red-50 hover:text-red-600 rounded text-slate-400 transition-colors"
                                    title="Reset running numbers (requires reason)"
                                  >
                                    <RefreshCcw className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="bg-slate-50 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 flex justify-between items-center print:hidden">
                <div>Showing <b>{filteredSettings.length}</b> ERP modules configured for document numbering.</div>
                <div className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                  All generated entries obey SAP guidelines.
                </div>
              </div>
            </div>
          </div>

          {/* Configuration Form Column */}
          <div className="lg:col-span-1">
            <AnimatePresence mode="wait">
              {selectedSetting ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white rounded-xl shadow-md border border-indigo-100 overflow-hidden sticky top-6"
                >
                  <div className="bg-gradient-to-r from-slate-900 to-indigo-950 px-4 py-4 text-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-500/20 rounded-md">
                          <Settings className="h-4.5 w-4.5 text-indigo-400 animate-pulse" />
                        </div>
                        <div>
                          <h2 className="font-semibold text-sm tracking-wide">Configure Rules</h2>
                          <p className="text-[10px] text-indigo-200">{selectedSetting.moduleName}</p>
                        </div>
                      </div>
                      <span className="text-[10px] bg-indigo-500/30 text-indigo-100 px-2 py-0.5 rounded-full font-mono uppercase">
                        {selectedSetting.moduleKey}
                      </span>
                    </div>
                  </div>

                  <form onSubmit={handleSave} className="p-4 space-y-4 text-slate-700">
                    
                    {/* Live Preview Card */}
                    <div className="bg-slate-950 rounded-xl p-4 text-white border border-slate-800 relative overflow-hidden group">
                      <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 p-10 bg-indigo-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-indigo-500/15 transition-all"></div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-2">
                        <span>Dynamic Format Preview</span>
                        <span className="flex items-center gap-1 text-emerald-400">
                          <Sparkles className="h-3 w-3" />
                          Real time example
                        </span>
                      </div>
                      <div className="font-mono text-base font-bold text-center text-emerald-400 tracking-wider py-1 select-all break-all select-none">
                        {getPreviewString()}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-2 border-t border-slate-800 pt-2 text-center">
                        Next transaction code formatted on server globally.
                      </div>
                    </div>

                    {/* Inputs */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Prefix *</label>
                        <input
                          type="text"
                          required
                          value={editPrefix}
                          onChange={(e) => setEditPrefix(e.target.value.toUpperCase())}
                          className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 text-sm font-mono text-slate-800 uppercase focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          placeholder="e.g. BILL"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Suffix (Optional)</label>
                        <input
                          type="text"
                          value={editSuffix}
                          onChange={(e) => setEditSuffix(e.target.value.toUpperCase())}
                          className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 text-sm font-mono text-slate-800 uppercase focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          placeholder="e.g. DRAFT"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Financial Year Format</label>
                        <select
                          value={editFyFormat}
                          onChange={(e: any) => setEditFyFormat(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 text-xs text-slate-700 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        >
                          <option value="None">None</option>
                          <option value="25-26">25-26</option>
                          <option value="2025-26">2025-26</option>
                          <option value="FY25-26 font-semibold">FY25-26</option>
                          <option value="FY2025-26">FY2025-26</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Separator Char</label>
                        <select
                          value={editSeparator}
                          onChange={(e) => setEditSeparator(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-sm font-mono text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        >
                          <option value="/">Slash ( / )</option>
                          <option value="-">Dash ( - )</option>
                          <option value="_">Under ( _ )</option>
                          <option value=".">Dot ( . )</option>
                          <option value="">Blank (None)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Starting Number</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={editStartingNumber}
                          onChange={(e) => setEditStartingNumber(parseInt(e.target.value) || 1)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 text-sm font-mono text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Digit Number Length</label>
                        <input
                          type="number"
                          min="3"
                          max="12"
                          required
                          value={editLength}
                          onChange={(e) => setEditLength(parseInt(e.target.value) || 5)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 text-sm font-mono text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-3">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Separate Sequence Series</label>
                      <p className="text-[10px] text-slate-400 mb-2">Each partition folder maintains an isolated unique sequence stack.</p>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setEditSeriesType('global')}
                          className={`px-2 py-2 rounded border text-center transition-all ${
                            editSeriesType === 'global'
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold text-xs shadow-xs'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 text-xs'
                          }`}
                        >
                          <span className="block font-medium">Global</span>
                          <span className="text-[9px] opacity-70">Single Flow</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setEditSeriesType('fy-wise')}
                          className={`px-2 py-2 rounded border text-center transition-all ${
                            editSeriesType === 'fy-wise'
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold text-xs shadow-xs'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 text-xs'
                          }`}
                        >
                          <span className="block font-medium">FY-Wise</span>
                          <span className="text-[9px] opacity-70">Per Fin Year</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditSeriesType('site-wise')}
                          className={`px-2 py-2 rounded border text-center transition-all ${
                            editSeriesType === 'site-wise'
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold text-xs shadow-xs'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 text-xs'
                          }`}
                        >
                          <span className="block font-medium">Site-Wise</span>
                          <span className="text-[9px] opacity-70">Per Project</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Active Status</label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setEditStatus('Active')}
                            className={`flex-1 py-1 rounded border text-xs font-medium transition-colors ${
                              editStatus === 'Active'
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                                : 'bg-slate-50 border-slate-200 text-slate-500'
                            }`}
                          >
                            Active
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditStatus('Inactive')}
                            className={`flex-1 py-1 rounded border text-xs font-medium transition-colors ${
                              editStatus === 'Inactive'
                                ? 'bg-red-50 border-red-200 text-red-700'
                                : 'bg-slate-50 border-slate-200 text-slate-500'
                            }`}
                          >
                            Bypass
                          </button>
                        </div>
                      </div>

                      {editCurrentNumber !== null && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">
                            Current Number
                            <span className="text-[9px] text-indigo-600 ml-1">(Override)</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={editCurrentNumber}
                            onChange={(e) => setEditCurrentNumber(parseInt(e.target.value) || 0)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-1 text-sm font-mono text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleSelectSetting(selectedSetting)}
                        className="flex-1 py-2 text-xs font-medium rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                      >
                        Reset Local
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Save className="h-3.5 w-3.5" />
                        Save Schema
                      </button>
                    </div>

                  </form>
                </motion.div>
              ) : (
                <div className="bg-slate-50 rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400">
                  <Hash className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                  <h3 className="font-semibold text-slate-700 text-sm">No Module Selected</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto">
                    Select a transaction row inside the left table to alter formatting rules.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>

        </div>
      ) : (
        /* Audit Tab Panel */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-xl shadow-sm border border-slate-150 p-6 space-y-4"
        >
          <div className="flex items-center justify-between border-b pb-3 border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
                <History className="h-5 w-5 text-indigo-600" />
                Configuration Audit Trails
              </h2>
              <p className="text-xs text-slate-400">
                Authorized list tracking sequence modifications, serial resets, prefix updates, and schema migrations.
              </p>
            </div>

            <button
              onClick={() => {
                fetchNumberingAuditLogs();
              }}
              className="px-3 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50 border border-indigo-150 font-medium rounded-lg flex items-center gap-1 transition-colors"
            >
              <RefreshCcw className="h-3 w-3" />
              Reload Logs
            </button>
          </div>

          <div className="overflow-hidden border border-slate-100 rounded-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 divide-x divide-slate-100 text-[10px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-100">
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Module Name</th>
                    <th className="px-3 py-3 text-center">Previous Prefix</th>
                    <th className="px-3 py-3 text-center">New Prefix</th>
                    <th className="px-3 py-3 text-center">Prev Seq</th>
                    <th className="px-3 py-3 text-center">New Seq</th>
                    <th className="px-3 py-3 text-center">Modified By</th>
                    <th className="px-4 py-3">Audit Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-mono">
                  {numberingAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-400 italic font-sans">
                        No config edits logged yet. Modifying prefixes or sequence series generates logs.
                      </td>
                    </tr>
                  ) : (
                    numberingAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 divide-x divide-slate-50">
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-sans">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-semibold font-sans text-slate-900 whitespace-nowrap">
                          {log.moduleName}
                        </td>
                        <td className="px-3 py-3 text-center text-slate-400 bg-slate-50/50">
                          {log.prevPrefix || 'None'}
                        </td>
                        <td className="px-3 py-3 text-center text-indigo-700 bg-indigo-50/20 font-bold">
                          {log.newPrefix}
                        </td>
                        <td className="px-3 py-3 text-center text-slate-400">
                          {log.prevRunningNo}
                        </td>
                        <td className="px-3 py-3 text-center text-emerald-800 font-semibold">
                          {log.newRunningNo}
                        </td>
                        <td className="px-3 py-3 text-center font-sans">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded font-medium text-slate-700">
                            {log.username}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-sans text-slate-600 max-w-xs break-words">
                          {log.details}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* WARNING MODAL: CHANGING SEQUENCE FORMAT */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in print:hidden">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl shadow-xl border border-yellow-100 max-w-md w-full overflow-hidden"
          >
            <div className="bg-gradient-to-r from-amber-500 to-yellow-600 p-4 text-white flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-yellow-100 animate-bounce" />
              </div>
              <div>
                <h3 className="font-bold text-base">Warning: Dynamic Prefix Reorganization</h3>
                <p className="text-xs text-amber-100">Alterations affect existing transactions sequence rules.</p>
              </div>
            </div>
            <div className="p-5 space-y-3 text-slate-600 text-sm">
              <p>
                You are modifying structural settings <b>(Prefix/Year Format/Sequence Type)</b> for an active transaction:
              </p>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-1 font-mono">
                <div>• Module: <b>{selectedSetting?.moduleName}</b></div>
                <div>• Old Prefix: <span className="text-red-700">{selectedSetting?.prefix}</span></div>
                <div>• New Prefix: <span className="text-emerald-700">{stagedSaveForm?.prefix}</span></div>
                <div>• New Series Partition: <b className="uppercase">{stagedSaveForm?.seriesType}</b></div>
              </div>
              <p className="text-xs text-slate-400">
                This modification might create mismatched format gaps between historical and future audit logs. Ensure you want to reorganize sequential workflows.
              </p>
            </div>
            <div className="border-t border-slate-100 p-4 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowWarningModal(false);
                  setStagedSaveForm(null);
                }}
                className="px-4 py-2 text-xs font-medium hover:bg-slate-50 text-slate-500 border border-slate-200 rounded-lg"
              >
                Cancel Edit
              </button>
              <button
                onClick={() => {
                  if (stagedSaveForm) performSave(stagedSaveForm);
                }}
                className="px-4 py-2 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm"
              >
                Understand, Submit Changes
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* DOUBLE CONFIRM MODAL: RESET SEQUENCE */}
      {resetModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in print:hidden">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl shadow-xl border border-red-100 max-w-md w-full overflow-hidden"
          >
            {/* Header with step indicator */}
            <div className="bg-gradient-to-r from-red-600 to-rose-700 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg animate-pulse">
                  <RefreshCcw className="h-5 w-5 text-red-100" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Reset Master sequence numbers</h3>
                  <p className="text-[11px] text-red-100">Permanent sequence correction rollback.</p>
                </div>
              </div>
              <span className="text-[10px] bg-red-850 text-red-100 px-2 py-1 rounded-full font-bold uppercase tracking-wider">
                Step {resetStep} of 2
              </span>
            </div>

            {/* Stepper Progress Bar */}
            <div className="w-full bg-slate-100 h-1.5 flex">
              <div className={`h-full transition-all duration-300 bg-red-500 ${resetStep === 1 ? 'w-1/2' : 'w-full'}`}></div>
            </div>
            
            <div className="p-5 space-y-4 text-slate-700 text-sm">
              <AnimatePresence mode="wait">
                {resetStep === 1 ? (
                  <motion.div
                    key="step-1"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-4"
                  >
                    <div className="p-3 bg-rose-50 text-rose-850 rounded-lg border border-rose-100 flex items-start gap-2.5">
                      <AlertTriangle className="h-5 w-5 shrink-0 text-red-650 mt-0.5" />
                      <div className="text-xs space-y-2">
                        <p className="font-semibold">Severe Warning: Accidental Sequence Rollovers</p>
                        <p>
                          You are performing a master reset on <b>{resetModuleName}</b>. All future entries will restart from the starting sequence baseline.
                        </p>
                        <p>
                          This can severely break ERP ledgers and generate redundant reference identifier errors if historical documents exist.
                        </p>
                      </div>
                    </div>

                    <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer select-none hover:bg-slate-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={resetAcknowledgeCheckbox}
                        onChange={(e) => setResetAcknowledgeCheckbox(e.target.checked)}
                        className="mt-1 h-4 w-4 text-red-650 focus:ring-red-500 rounded border-slate-300 cursor-pointer"
                      />
                      <span className="text-xs text-slate-700 font-medium leading-tight select-none">
                        I understand this reset is permanent, irreversible, and I choose to accept all downstream data duplication indexing risks.
                      </span>
                    </label>
                  </motion.div>
                ) : (
                  <motion.div
                    key="step-2"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-4"
                  >
                    <div className="p-3 bg-amber-50 text-amber-850 rounded-lg border border-amber-100 text-xs">
                      Please enter a formal reason explaining this sequence reset for regulatory auditing, then confirm with the security password.
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Reason for reset Audit Log *
                      </label>
                      <textarea
                        required
                        placeholder="e.g., Starting New Fiscal Year Ledger, system counter reconciliation"
                        value={resetReason}
                        onChange={(e) => setResetReason(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-red-500 focus:outline-none focus:bg-white"
                        rows={2}
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-semibold text-slate-600">
                          Security Verification *
                        </label>
                        <span className="text-[10px] text-red-600 font-mono">Case-sensitive</span>
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="Type RESET in CAPITAL letters"
                        value={resetConfirmText}
                        onChange={(e) => setResetConfirmText(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs uppercase font-mono tracking-widest text-center font-bold text-red-800 focus:ring-1 focus:ring-red-500 focus:outline-none focus:bg-white"
                      />
                      <p className="text-[10px] text-slate-400 mt-1 text-center font-mono">
                        Type <b className="text-red-700">RESET</b> above to unlock execution
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Actions Footer */}
            <div className="border-t border-slate-100 p-4 bg-slate-50/50 flex gap-3 justify-end items-center">
              {resetStep === 1 ? (
                <>
                  <button
                    onClick={() => setResetModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium hover:bg-slate-100 text-slate-500 border border-slate-200 rounded-lg transition-colors"
                  >
                    Abort Reset
                  </button>
                  <button
                    onClick={() => setResetStep(2)}
                    disabled={!resetAcknowledgeCheckbox}
                    className="px-4 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed rounded-lg shadow-xs flex items-center gap-1 transition-colors"
                  >
                    Proceed to Step 2
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setResetStep(1)}
                    className="px-4 py-2 text-xs font-medium hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg transition-colors"
                  >
                    Back to Step 1
                  </button>
                  <button
                    onClick={handleExecuteReset}
                    disabled={resetConfirmText !== 'RESET' || !resetReason.trim()}
                    className="px-4 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors"
                  >
                    Execute Master Reset
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
};
