import React, { useState, useEffect } from 'react';
import { 
  getTCodeList, 
  saveTCodeList, 
  resetTCodeListToDefault, 
  getTCodeAuditTrail, 
  TCode, 
  TCodeAuditLog,
  DEFAULT_TCODES
} from '../lib/tcodeService';
import { 
  Settings, 
  Search, 
  Check, 
  X, 
  Plus, 
  RotateCcw, 
  Shield, 
  FileText, 
  ToggleLeft, 
  ToggleRight, 
  Edit3, 
  Save, 
  Trash2,
  Calendar,
  Layers,
  User,
  Info,
  Laptop
} from 'lucide-react';
import { motion } from 'motion/react';

import { useAppContext } from '../store';

interface TCodeMasterProps {
  user?: { username: string; name: string; role: string } | null;
}

export const TCodeMaster: React.FC<TCodeMasterProps> = ({ user: propUser }) => {
  const { user: contextUser } = useAppContext();
  const user = propUser || contextUser;
  
  const [tcodes, setTcodes] = useState<TCode[]>([]);
  const [logs, setLogs] = useState<TCodeAuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<'registry' | 'audit'>('registry');
  
  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [auditQuery, setAuditQuery] = useState('');

  // Editing States
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editModule, setEditModule] = useState('');
  const [editTab, setEditTab] = useState('');
  const [editRoles, setEditRoles] = useState<string[]>([]);

  // Create New T-Code States
  const [isAdding, setIsAdding] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newModule, setNewModule] = useState('Dashboard');
  const [newTab, setNewTab] = useState('dashboard');
  const [newRoles, setNewRoles] = useState<string[]>([]);
  const [addError, setAddError] = useState<string | null>(null);

  // Load Initial Data
  useEffect(() => {
    setTcodes(getTCodeList());
    setLogs(getTCodeAuditTrail());
  }, []);

  // Sync data with localStorage
  const refreshData = () => {
    setTcodes(getTCodeList());
    setLogs(getTCodeAuditTrail());
  };

  // Reset to Defaults
  const handleResetDefaults = () => {
    if (window.confirm("Are you sure you want to reset all Transaction Codes to SAP standard default configurations? Any custom T-Codes or role assignments will be restored.")) {
      const resetList = resetTCodeListToDefault();
      setTcodes(resetList);
      alert("Transaction Code master list reset successfully!");
    }
  };

  // Toggle Active/Inactive state
  const handleToggleActive = (code: string) => {
    const updated = tcodes.map(tc => {
      if (tc.code === code) {
        return { ...tc, isActive: !tc.isActive };
      }
      return tc;
    });
    setTcodes(updated);
    saveTCodeList(updated);
  };

  // Start Editing T-Code
  const handleStartEdit = (tc: TCode) => {
    setEditingCode(tc.code);
    setEditName(tc.name);
    setEditDescription(tc.description);
    setEditModule(tc.module);
    setEditTab(tc.tab);
    setEditRoles(tc.requiredRoles || []);
  };

  // Save Edits
  const handleSaveEdit = (code: string) => {
    if (!editName.trim()) {
      alert("Transaction name cannot be empty.");
      return;
    }
    const updated = tcodes.map(tc => {
      if (tc.code === code) {
        return {
          ...tc,
          name: editName,
          description: editDescription,
          module: editModule,
          tab: editTab,
          requiredRoles: editRoles.length > 0 ? editRoles : undefined
        };
      }
      return tc;
    });
    setTcodes(updated);
    saveTCodeList(updated);
    setEditingCode(null);
  };

  // Create New T-Code
  const handleCreateTCode = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    const formattedCode = newCode.trim().toUpperCase();
    if (!formattedCode) {
      setAddError("Transaction Code is required (e.g., ME21N).");
      return;
    }
    if (!/^[A-Z0-9]+$/.test(formattedCode)) {
      setAddError("Transaction Code must be alphanumeric only (no spaces, special chars).");
      return;
    }
    if (tcodes.some(tc => tc.code === formattedCode)) {
      setAddError(`Transaction Code '${formattedCode}' already exists in registry.`);
      return;
    }
    if (!newName.trim()) {
      setAddError("Transaction Name is required.");
      return;
    }
    if (!newTab.trim()) {
      setAddError("Target ERP Tab/Module is required.");
      return;
    }

    const item: TCode = {
      code: formattedCode,
      name: newName.trim(),
      description: newDescription.trim() || "Custom user-defined ERP transaction module",
      module: newModule,
      tab: newTab.trim(),
      isActive: true,
      requiredRoles: newRoles.length > 0 ? newRoles : undefined
    };

    const updated = [...tcodes, item];
    setTcodes(updated);
    saveTCodeList(updated);

    // Clear state
    setNewCode('');
    setNewName('');
    setNewDescription('');
    setNewRoles([]);
    setIsAdding(false);
  };

  // Toggle Role in Edit Form
  const toggleEditRole = (role: string) => {
    if (editRoles.includes(role)) {
      setEditRoles(editRoles.filter(r => r !== role));
    } else {
      setEditRoles([...editRoles, role]);
    }
  };

  // Toggle Role in Create Form
  const toggleCreateRole = (role: string) => {
    if (newRoles.includes(role)) {
      setNewRoles(newRoles.filter(r => r !== role));
    } else {
      setNewRoles([...newRoles, role]);
    }
  };

  // Delete Custom T-Code
  const handleDeleteTCode = (code: string) => {
    if (window.confirm(`Are you sure you want to permanently delete custom transaction code ${code}?`)) {
      const updated = tcodes.filter(tc => tc.code !== code);
      setTcodes(updated);
      saveTCodeList(updated);
    }
  };

  // Get distinct modules for filter select
  const modules = ['All', ...Array.from(new Set(tcodes.map(tc => tc.module)))];

  // Filtering Registry
  const filteredTcodes = tcodes.filter(tc => {
    const matchesSearch = tc.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          tc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          tc.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesModule = moduleFilter === 'All' || tc.module === moduleFilter;
    const matchesStatus = statusFilter === 'All' || 
                          (statusFilter === 'Active' && tc.isActive) || 
                          (statusFilter === 'Inactive' && !tc.isActive);
    return matchesSearch && matchesModule && matchesStatus;
  });

  // Filtering Audit Logs
  const filteredLogs = logs.filter(lg => {
    return lg.tcode.toLowerCase().includes(auditQuery.toLowerCase()) ||
           lg.name.toLowerCase().includes(auditQuery.toLowerCase()) ||
           lg.username.toLowerCase().includes(auditQuery.toLowerCase()) ||
           lg.actionPerformed.toLowerCase().includes(auditQuery.toLowerCase());
  });

  return (
    <div className="h-full flex flex-col font-sans text-xs text-black" id="tcode-master-page">
      
      {/* Header Controls Banner */}
      <div className="bg-[#cbdcf0] p-3 border border-[#8baac7] flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0">
        <div>
          <h2 className="text-[13px] font-bold text-blue-950 flex items-center space-x-2">
            <Settings size={15} className="text-[#002f6c]" />
            <span>SAP Transaction Code Master Control Panel (TCODE_CFG)</span>
          </h2>
          <p className="text-[10px] text-slate-700 mt-0.5">
            Configure system routing maps, assign custom role parameters, restrict modules, and review security audit trails.
          </p>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <button 
            type="button"
            onClick={handleResetDefaults}
            className="sap-btn bg-white hover:bg-gray-50 border-[#8c9ba8] flex items-center space-x-1 py-1 px-2.5 text-red-800"
          >
            <RotateCcw size={12} />
            <span>Reset SAP Standards</span>
          </button>
          <button 
            type="button"
            onClick={() => setIsAdding(!isAdding)}
            className="sap-btn bg-gradient-to-b from-[#fbf8e8] to-[#f4e2a1] text-black font-bold flex items-center space-x-1 py-1 px-3"
          >
            <Plus size={12} />
            <span>Register New Code</span>
          </button>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex border-b border-[#8baac7] bg-[#f0f4f8] shrink-0">
        <button
          onClick={() => setActiveTab('registry')}
          className={`px-4 py-2 font-bold text-[11px] border-r border-[#8baac7] transition-all flex items-center space-x-1.5 ${activeTab === 'registry' ? 'bg-white text-[#002f6c] border-t-2 border-t-[#0056b3]' : 'text-slate-600 hover:bg-white/50'}`}
        >
          <Layers size={13} />
          <span>Transaction Code Registry ({tcodes.length})</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('audit');
            setLogs(getTCodeAuditTrail());
          }}
          className={`px-4 py-2 font-bold text-[11px] border-r border-[#8baac7] transition-all flex items-center space-x-1.5 ${activeTab === 'audit' ? 'bg-white text-[#002f6c] border-t-2 border-t-[#0056b3]' : 'text-slate-600 hover:bg-white/50'}`}
        >
          <FileText size={13} />
          <span>Access & Execution Audit Trail ({logs.length})</span>
        </button>
      </div>

      {/* Form to Add New T-Code */}
      {isAdding && (
        <motion.form 
          initial={{ height: 0, opacity: 0 }} 
          animate={{ height: 'auto', opacity: 1 }} 
          onSubmit={handleCreateTCode}
          className="bg-[#fffde8] border-b border-[#8baac7] p-3 space-y-3 shrink-0"
        >
          <div className="bg-[#fcf3c7] p-1.5 border border-amber-300 font-bold text-[10px] text-amber-900 rounded-sm flex items-center space-x-1">
            <Info size={12} />
            <span>Registering a custom transaction code. Standard modules require valid route mappings inside the core terminal workspace.</span>
          </div>

          {addError && (
            <div className="p-1 px-2 border border-red-500 bg-red-50 text-red-800 font-bold text-[10px]">
              ⚠ {addError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block font-bold text-blue-900 mb-1">Transaction Code:*</label>
              <input 
                type="text" 
                required 
                placeholder="e.g. VEN01"
                className="sap-input w-full uppercase font-mono"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
              />
            </div>
            <div>
              <label className="block font-bold text-blue-900 mb-1">Transaction Name:*</label>
              <input 
                type="text" 
                required 
                placeholder="e.g. Vendor Directory"
                className="sap-input w-full"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div>
              <label className="block font-bold text-blue-900 mb-1">Target ERP Tab ID:*</label>
              <input 
                type="text" 
                required 
                placeholder="e.g. workers, billing, expenses"
                className="sap-input w-full font-mono text-[10px]"
                value={newTab}
                onChange={(e) => setNewTab(e.target.value)}
              />
            </div>
            <div>
              <label className="block font-bold text-blue-900 mb-1">Parent Module Group:*</label>
              <select 
                className="sap-input w-full"
                value={newModule}
                onChange={(e) => setNewModule(e.target.value)}
              >
                <option value="Dashboard">Dashboard</option>
                <option value="Project">Project</option>
                <option value="Worker">Worker</option>
                <option value="Floor Abstract">Floor Abstract</option>
                <option value="Billing">Billing</option>
                <option value="Client Payment">Client Payment</option>
                <option value="Subcontractor">Subcontractor</option>
                <option value="BOQ">BOQ</option>
                <option value="Material">Material</option>
                <option value="Expenses">Expenses</option>
                <option value="Document Management">Document Management</option>
                <option value="Reports">Reports</option>
                <option value="Approvals">Approvals</option>
                <option value="Settings">Settings</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-blue-900 mb-1">Full Functional Description / Scope Detail:</label>
            <input 
              type="text" 
              placeholder="Provide a helpful explanatory tooltip shown during command line search..."
              className="sap-input w-full"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
            />
          </div>

          <div className="border border-slate-200 p-2 bg-white rounded-sm">
            <span className="font-bold text-blue-900 block mb-1">Authorized Access Roles (Security Constraint):</span>
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-1.5 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={newRoles.includes('admin')} 
                  onChange={() => toggleCreateRole('admin')} 
                  className="rounded-sm border-slate-300"
                />
                <span className="font-semibold text-red-800">admin (Super Administration)</span>
              </label>
              <label className="flex items-center space-x-1.5 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={newRoles.includes('staff')} 
                  onChange={() => toggleCreateRole('staff')} 
                  className="rounded-sm border-slate-300"
                />
                <span className="font-semibold text-blue-800">staff (Standard Operations)</span>
              </label>
              <span className="text-gray-400 italic text-[10px]">(Leave both unchecked to allow universal access)</span>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <button 
              type="button" 
              onClick={() => setIsAdding(false)}
              className="sap-btn bg-white hover:bg-gray-100 px-3 py-1"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="sap-btn bg-[#002f6c] text-white hover:bg-blue-900 px-4 py-1 font-bold"
            >
              Submit Registration
            </button>
          </div>
        </motion.form>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col bg-white">
        
        {activeTab === 'registry' && (
          <div className="flex-1 flex flex-col overflow-hidden p-3 space-y-3">
            {/* Filter Panel */}
            <div className="bg-[#f0f4f8] border border-[#8baac7] p-2 flex flex-col md:flex-row items-center justify-between gap-3 shrink-0">
              <div className="flex flex-1 items-center space-x-2 w-full md:w-auto">
                <div className="relative flex-1 max-w-sm">
                  <Search size={12} className="absolute left-2.5 top-2.5 text-gray-500" />
                  <input 
                    type="text" 
                    placeholder="Search by T-Code, name or description..."
                    className="sap-input w-full pl-7.5 py-1.5 font-sans"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-slate-700">Module:</span>
                  <select 
                    className="sap-input py-1 px-2"
                    value={moduleFilter}
                    onChange={(e) => setModuleFilter(e.target.value)}
                  >
                    {modules.map(mod => (
                      <option key={mod} value={mod}>{mod}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-slate-700">Status:</span>
                  <select 
                    className="sap-input py-1 px-2"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="All">All Statuses</option>
                    <option value="Active">Active Only</option>
                    <option value="Inactive">Inactive Only</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Registry Table */}
            <div className="flex-1 overflow-auto border border-[#8baac7] bg-[#fdfdfd]">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead className="sap-header sticky top-0 z-10 shadow-sm">
                  <tr className="bg-[#eef2f6] text-[#002f6c] border-b border-[#8baac7]">
                    <th className="px-3 py-2 border-r border-[#8baac7] font-bold w-[90px] text-center">T-Code</th>
                    <th className="px-3 py-2 border-r border-[#8baac7] font-bold w-[120px]">Module Group</th>
                    <th className="px-3 py-2 border-r border-[#8baac7] font-bold w-[180px]">Transaction Name</th>
                    <th className="px-3 py-2 border-r border-[#8baac7] font-bold">Functional Description / Path mapping</th>
                    <th className="px-3 py-2 border-r border-[#8baac7] font-bold w-[130px] text-center">Allowed Roles</th>
                    <th className="px-3 py-2 border-r border-[#8baac7] font-bold w-[80px] text-center">Status</th>
                    <th className="px-3 py-2 font-bold w-[100px] text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredTcodes.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-400 italic">
                        No transactions found matching specified criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredTcodes.map(tc => {
                      const isEditing = editingCode === tc.code;
                      const isDefault = DEFAULT_TCODES.some(d => d.code === tc.code);

                      return (
                        <tr key={tc.code} className={`hover:bg-[#f2f7fc] ${!tc.isActive ? 'bg-gray-50 text-gray-400' : ''}`}>
                          {/* Code */}
                          <td className="px-3 py-1.5 border-r border-gray-200 text-center font-mono font-bold text-blue-900">
                            {tc.code}
                          </td>

                          {/* Module */}
                          <td className="px-3 py-1.5 border-r border-gray-200">
                            {isEditing ? (
                              <input 
                                type="text"
                                className="sap-input w-full py-0.5"
                                value={editModule}
                                onChange={(e) => setEditModule(e.target.value)}
                              />
                            ) : (
                              <span className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded-sm font-semibold text-[10px]">
                                {tc.module}
                              </span>
                            )}
                          </td>

                          {/* Name */}
                          <td className="px-3 py-1.5 border-r border-gray-200 font-bold">
                            {isEditing ? (
                              <input 
                                type="text"
                                className="sap-input w-full py-0.5 font-sans"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                              />
                            ) : (
                              tc.name
                            )}
                          </td>

                          {/* Description */}
                          <td className="px-3 py-1.5 border-r border-gray-200">
                            {isEditing ? (
                              <div className="space-y-1">
                                <input 
                                  type="text"
                                  className="sap-input w-full py-0.5 font-sans text-[10px]"
                                  placeholder="Description..."
                                  value={editDescription}
                                  onChange={(e) => setEditDescription(e.target.value)}
                                />
                                <div className="flex items-center space-x-1">
                                  <span className="text-[9px] text-gray-500 shrink-0">Tab Map:</span>
                                  <input 
                                    type="text"
                                    className="sap-input flex-1 py-0.5 font-mono text-[9px]"
                                    value={editTab}
                                    onChange={(e) => setEditTab(e.target.value)}
                                  />
                                </div>
                              </div>
                            ) : (
                              <div>
                                <p className="text-slate-800 font-medium">{tc.description}</p>
                                <p className="text-[9px] text-gray-400 font-mono mt-0.5">
                                  Mapping: <span className="text-[#0056b3] font-bold">{tc.tab}</span> 
                                  {tc.props && ` with parameters ${JSON.stringify(tc.props)}`}
                                </p>
                              </div>
                            )}
                          </td>

                          {/* Roles */}
                          <td className="px-3 py-1.5 border-r border-gray-200 text-center">
                            {isEditing ? (
                              <div className="flex flex-col space-y-1 text-left">
                                <label className="flex items-center space-x-1 cursor-pointer text-[10px]">
                                  <input 
                                    type="checkbox" 
                                    checked={editRoles.includes('admin')}
                                    onChange={() => toggleEditRole('admin')}
                                    className="rounded-sm"
                                  />
                                  <span className="text-red-800 font-bold">Admin</span>
                                </label>
                                <label className="flex items-center space-x-1 cursor-pointer text-[10px]">
                                  <input 
                                    type="checkbox" 
                                    checked={editRoles.includes('staff')}
                                    onChange={() => toggleEditRole('staff')}
                                    className="rounded-sm"
                                  />
                                  <span className="text-blue-800 font-bold">Staff</span>
                                </label>
                              </div>
                            ) : (
                              tc.requiredRoles && tc.requiredRoles.length > 0 ? (
                                <div className="flex flex-wrap gap-1 justify-center">
                                  {tc.requiredRoles.map(r => (
                                    <span key={r} className={`px-1 rounded-sm text-[9px] font-bold uppercase tracking-tight ${r === 'admin' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-blue-100 text-blue-800 border border-blue-200'}`}>
                                      {r}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-400 italic text-[10px]">Universal Access</span>
                              )
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-3 py-1.5 border-r border-gray-200 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleActive(tc.code)}
                              className="focus:outline-none cursor-pointer"
                              title={tc.isActive ? "Deactivate transaction" : "Activate transaction"}
                            >
                              {tc.isActive ? (
                                <span className="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-50 border border-emerald-300 rounded px-1.5 py-0.5 font-bold">
                                  <ToggleRight size={14} className="text-emerald-700" />
                                  <span>Active</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 text-gray-500 bg-gray-100 border border-gray-300 rounded px-1.5 py-0.5">
                                  <ToggleLeft size={14} className="text-gray-400" />
                                  <span>Inactive</span>
                                </span>
                              )}
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="px-3 py-1.5 text-center">
                            {isEditing ? (
                              <div className="flex items-center justify-center space-x-1">
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(tc.code)}
                                  className="p-1 hover:bg-emerald-50 text-emerald-700 rounded border border-emerald-300"
                                  title="Save Changes"
                                >
                                  <Check size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingCode(null)}
                                  className="p-1 hover:bg-gray-100 text-gray-500 rounded border border-gray-300"
                                  title="Cancel"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center space-x-1">
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(tc)}
                                  className="p-1 hover:bg-slate-100 text-slate-700 rounded border border-slate-300"
                                  title="Edit properties"
                                >
                                  <Edit3 size={11} />
                                </button>
                                {!isDefault && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTCode(tc.code)}
                                    className="p-1 hover:bg-red-50 text-red-700 rounded border border-red-200"
                                    title="Delete custom T-Code"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="flex-1 flex flex-col overflow-hidden p-3 space-y-3">
            {/* Audit Search */}
            <div className="bg-[#f0f4f8] border border-[#8baac7] p-2 flex flex-col md:flex-row items-center justify-between gap-3 shrink-0">
              <div className="relative flex-1 max-w-sm w-full">
                <Search size={12} className="absolute left-2.5 top-2.5 text-gray-500" />
                <input 
                  type="text" 
                  placeholder="Filter audit log by T-Code, user, or action..."
                  className="sap-input w-full pl-7.5 py-1.5 font-sans"
                  value={auditQuery}
                  onChange={(e) => setAuditQuery(e.target.value)}
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Are you sure you want to clear the local T-Code Execution Logs? This action cannot be reversed.")) {
                    localStorage.removeItem("sne_erp_tcodes_audit");
                    setLogs([]);
                  }
                }}
                className="sap-btn bg-white hover:bg-red-50 text-red-700 border-red-300 px-3 py-1 flex items-center space-x-1"
              >
                <Trash2 size={12} />
                <span>Clear Audit Trail Logs</span>
              </button>
            </div>

            {/* Audit Logs Table */}
            <div className="flex-1 overflow-auto border border-[#8baac7] bg-[#fdfdfd]">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead className="sap-header sticky top-0 z-10 shadow-sm">
                  <tr className="bg-[#eef2f6] text-[#002f6c] border-b border-[#8baac7]">
                    <th className="px-3 py-2 border-r border-[#8baac7] font-bold w-[150px]"><Calendar size={11} className="inline mr-1" />Executed At</th>
                    <th className="px-3 py-2 border-r border-[#8baac7] font-bold w-[90px] text-center">T-Code</th>
                    <th className="px-3 py-2 border-r border-[#8baac7] font-bold w-[160px]">Transaction Name</th>
                    <th className="px-3 py-2 border-r border-[#8baac7] font-bold w-[110px]"><User size={11} className="inline mr-1" />User Account</th>
                    <th className="px-3 py-2 border-r border-[#8baac7] font-bold">Action / Parameters Logged</th>
                    <th className="px-3 py-2 font-bold w-[220px]"><Laptop size={11} className="inline mr-1" />Terminal Device Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400 italic bg-white">
                        No execution records found in system audit trail logs.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map(lg => (
                      <tr key={lg.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 border-r border-gray-200 font-mono text-[10px] text-slate-600">
                          {new Date(lg.timestamp).toLocaleString('en-IN')}
                        </td>
                        <td className="px-3 py-2 border-r border-gray-200 text-center font-mono font-bold text-[#002f6c]">
                          {lg.tcode}
                        </td>
                        <td className="px-3 py-2 border-r border-gray-200 font-bold text-slate-800">
                          {lg.name}
                        </td>
                        <td className="px-3 py-2 border-r border-gray-200 font-semibold text-blue-900 font-mono">
                          {lg.username}
                        </td>
                        <td className="px-3 py-2 border-r border-gray-200 text-slate-700">
                          {lg.actionPerformed}
                        </td>
                        <td className="px-3 py-2 font-mono text-[9px] text-gray-400 truncate max-w-[220px]" title={lg.deviceInfo}>
                          {lg.deviceInfo}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
