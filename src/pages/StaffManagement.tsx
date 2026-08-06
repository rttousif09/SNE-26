import React, { useState } from 'react';
import { useAppContext } from '../store';
import { Staff } from '../types';
import { Plus, X, Edit, Trash2, Shield, FolderGit2, CheckSquare, Square, RefreshCw, Key, UserCheck, HelpCircle } from 'lucide-react';
import { ERPTable, ERPColumn, ERPRowAction } from '../components/ERPTable';

export default function StaffManagement() {
  const { staff, projects, addStaff, updateStaff, deleteStaff, user } = useAppContext();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    allowedModules: [] as string[],
    allowedProjects: [] as string[]
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ERP Columns for Staff Table
  const erpColumns: ERPColumn<Staff>[] = [
    { key: 'name', header: 'Staff Name', sortable: true, filterable: true },
    { key: 'username', header: 'User ID (Username)', sortable: true, filterable: true, render: (val) => (
      <span className="font-mono text-blue-700 font-bold">{val}</span>
    )},
    { key: 'password', header: 'Plaintext Password', sortable: true, filterable: true, render: (val) => (
      <span className="font-mono text-gray-900 tracking-wider">{val || '••••••••'}</span>
    )},
    { key: 'allowedModules', header: 'Permitted Modules', sortable: true, filterable: true, render: (_, st) => {
      const allowedCount = st.allowedModules ? st.allowedModules.length : 0;
      return allowedCount === MODULES_LIST.length ? (
        <span className="inline-block bg-orange-100 text-orange-900 px-1.5 py-0.5 rounded font-bold border border-orange-300">
          ALL MODULES (UNRESTRICTED)
        </span>
      ) : allowedCount === 0 ? (
        <span className="inline-block bg-red-100 text-red-900 px-1.5 py-0.5 rounded font-bold border border-red-300 text-[10px]">
          NO ACCESS GRANTED
        </span>
      ) : (
        <div className="flex flex-col gap-0.5">
          <span className="inline-block bg-blue-100 text-blue-900 px-1.5 py-0.5 rounded font-bold border border-blue-300 w-fit">
            {allowedCount} of {MODULES_LIST.length} permitted
          </span>
          <span className="text-[9px] text-gray-500 truncate max-w-sm">
            {st.allowedModules.map(mId => MODULES_LIST.find(m => m.id === mId)?.label || mId).join(', ')}
          </span>
        </div>
      );
    }},
    { key: 'allowedProjects', header: 'Assigned Projects', sortable: true, filterable: true, render: (_, st) => {
      const projectsLength = st.allowedProjects ? st.allowedProjects.length : 0;
      const matchingProjectNames = (st.allowedProjects || [])
        .map(pid => projects.find(p => p.id === pid)?.name || pid)
        .join(', ');
      return projectsLength === projects.length ? (
        <span className="inline-block bg-green-100 text-green-900 px-1.5 py-0.5 rounded font-bold border border-green-300">
          ALL PROJECTS (UNRESTRICTED)
        </span>
      ) : projectsLength === 0 ? (
        <span className="inline-block bg-yellow-100 text-yellow-950 px-1.5 py-0.5 rounded font-bold border border-yellow-300 text-[10px]">
          NO PROJECTS CHOSEN
        </span>
      ) : (
        <div className="flex flex-col gap-0.5">
          <span className="inline-block bg-green-50 text-green-800 px-1.5 py-0.5 rounded font-bold border border-green-200 w-fit">
            {projectsLength} active {projectsLength === 1 ? 'project' : 'projects'}
          </span>
          <span className="text-[9px] text-gray-500 truncate" title={matchingProjectNames}>
            {matchingProjectNames}
          </span>
        </div>
      );
    }},
    { key: 'createdDate', header: 'Credentials Created', sortable: true, filterable: true, render: (val) => (
      <span>{val ? new Date(val).toLocaleDateString() : 'N/A'}</span>
    )}
  ];

  // ERP Row Actions for Staff Table
  const erpRowActions: ERPRowAction<Staff>[] = [
    {
      label: 'Edit',
      icon: <Edit size={11} />,
      onClick: (row) => startEdit(row),
      tooltip: 'Edit credentials & permissions'
    },
    {
      label: 'Delete',
      icon: <Trash2 size={11} />,
      onClick: (row) => confirmDelete(row),
      tooltip: 'Revoke staff credentials / Delete',
      className: 'text-red-600 hover:bg-red-50'
    }
  ];

  // List of all accessible modules with labels
  const MODULES_LIST = [
    { id: 'dashboard', label: 'Dashboard Overview', group: 'General' },
    { id: 'approvals', label: 'Approvals Workflow', group: 'General' },
    
    { id: 'projects', label: 'Projects Catalog', group: 'Project Details' },
    { id: 'site-monthly-summary', label: 'Site Monthly Report', group: 'Project Details' },
    { id: 'daily-site-summary', label: 'AI Daily Site Summary', group: 'Project Details' },
    
    { id: 'workers', label: 'Workers Management', group: 'Worker Management' },
    { id: 'dlr', label: 'Daily Labour Report', group: 'Worker Management' },
    { id: 'worker-ledger', label: 'Worker Ledger & Holds', group: 'Worker Management' },
    
    { id: 'kharchi', label: 'Kharchi Ledger', group: 'Payroll & Payments' },
    { id: 'mess', label: 'Mess Management', group: 'Payroll & Payments' },
    { id: 'advance', label: 'Worker Advances Ledger', group: 'Payroll & Payments' },
    { id: 'worker-payment', label: 'Workers Net Payouts Ledger', group: 'Payroll & Payments' },
    
    { id: 'billing', label: 'Billing Management', group: 'Billing & Accounts' },
    { id: 'client-payment', label: 'Client Progress Payments', group: 'Billing & Accounts' },
    { id: 'expenses', label: 'Expenses Ledger', group: 'Billing & Accounts' },
    { id: 'expenses-summary', label: 'Expenses Summary Dashboard', group: 'Billing & Accounts' },
    { id: 'bill-tracking', label: 'Bill Tracking Workflow', group: 'Billing & Accounts' },
    { id: 'financial-year-archive', label: 'Financial Year Archive', group: 'Billing & Accounts' },
    
    { id: 'materials', label: 'Material & Inventory ERP', group: 'Material & Asset Management' },
    { id: 'assets', label: 'Equipment & Asset Register', group: 'Material & Asset Management' },
  ];

  const handleCancel = () => {
    setFormData({
      username: '',
      password: '',
      name: '',
      allowedModules: [],
      allowedProjects: []
    });
    setEditingId(null);
    setIsAdding(false);
    setErrorMsg(null);
  };

  const handleGeneratePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#_';
    let pass = '';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password: pass }));
  };

  const toggleModule = (modId: string) => {
    setFormData(prev => {
      const allowed = prev.allowedModules.includes(modId)
        ? prev.allowedModules.filter(id => id !== modId)
        : [...prev.allowedModules, modId];
      return { ...prev, allowedModules: allowed };
    });
  };

  const toggleProject = (projId: string) => {
    setFormData(prev => {
      const allowed = prev.allowedProjects.includes(projId)
        ? prev.allowedProjects.filter(id => id !== projId)
        : [...prev.allowedProjects, projId];
      return { ...prev, allowedProjects: allowed };
    });
  };

  const selectAllModules = () => {
    const allIds = MODULES_LIST.map(m => m.id);
    setFormData(prev => ({
      ...prev,
      allowedModules: prev.allowedModules.length === MODULES_LIST.length ? [] : allIds
    }));
  };

  const selectAllProjects = () => {
    const allIds = projects.map(p => p.id);
    setFormData(prev => ({
      ...prev,
      allowedProjects: prev.allowedProjects.length === projects.length ? [] : allIds
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const { username, password, name, allowedModules, allowedProjects } = formData;

    if (!username.trim() || !password.trim() || !name.trim()) {
      setErrorMsg('Error: Please fill in User ID, Password, and Employee Full Name.');
      return;
    }

    if (username.trim().toLowerCase() === 'rejatousifsne' || username.trim().toLowerCase() === 'saddamsne') {
      setErrorMsg('Error: Superuser logins (rejatousifsne, saddamsne) are locked and cannot be overridden or re-registered.');
      return;
    }

    // Check duplicate usernames for other staff members
    const duplicate = staff.find(st => st.username.toLowerCase() === username.trim().toLowerCase() && st.id !== editingId);
    if (duplicate) {
      setErrorMsg(`Error: User ID "${username.trim()}" is already taken by another staff member.`);
      return;
    }

    const payload = {
      username: username.trim(),
      password: password.trim(),
      name: name.trim(),
      allowedModules,
      allowedProjects
    };

    if (editingId) {
      updateStaff(editingId, payload);
    } else {
      const newId = 'st_' + Math.random().toString(36).substring(2, 9);
      addStaff({
        id: newId,
        ...payload
      });
    }

    handleCancel();
  };

  const startEdit = (st: Staff) => {
    setFormData({
      username: st.username,
      password: st.password || '',
      name: st.name,
      allowedModules: st.allowedModules || [],
      allowedProjects: st.allowedProjects || []
    });
    setEditingId(st.id);
    setIsAdding(true);
    setErrorMsg(null);
  };

  const confirmDelete = (st: Staff) => {
    if (window.confirm(`Are you absolutely sure you want to delete staff account: "${st.name}" (${st.username})?`)) {
      deleteStaff(st.id);
    }
  };

  // Filtered list of staff users
  const filteredStaff = staff.filter(st => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      st.name.toLowerCase().includes(query) ||
      st.username.toLowerCase().includes(query)
    );
  });

  // Group modules for cleaner visual grouping
  const groupedModules = MODULES_LIST.reduce((acc, current) => {
    const group = current.group;
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(current);
    return acc;
  }, {} as Record<string, typeof MODULES_LIST>);

  return (
    <div className="text-[11px] p-1">
      {/* Header Panel */}
      <div className="flex items-center justify-between mb-2 bg-[#eef2f6] border border-[#8c9ba8] p-1">
        <div className="flex items-center space-x-2">
          <button 
            type="button"
            onClick={isAdding ? handleCancel : () => setIsAdding(true)} 
            className="sap-btn flex items-center space-x-1"
          >
            {isAdding ? <X size={12} className="text-red-600"/> : <Plus size={12} className="text-green-600"/>}
            <span className="font-semibold">{isAdding ? 'Cancel' : 'Add Staff Account'}</span>
          </button>
          
          <div className="h-4 w-[1px] bg-gray-400 mx-1"></div>
          
          <div className="font-semibold text-gray-700 px-1 py-0.5">
            ERP Staff Management & Role-Based Access Control
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <span className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.5 rounded font-mono border border-blue-300">
            ADMIN ACCESS ONLY ({user?.name})
          </span>
        </div>
      </div>

      {isAdding ? (
        /* Form Card */
        <form onSubmit={handleSubmit} className="bg-[#fcfdfe] border border-[#8c9ba8] p-3 mb-3 shadow-sm rounded">
          <div className="bg-[#d9e4f1] border-b border-[#8c9ba8] -mx-3 -mt-3 p-1 px-3 mb-3 flex justify-between items-center">
            <span className="font-bold text-gray-800">
              {editingId ? 'Modify Staff Credentials & Permissions' : 'Configure New Staff Credentials'}
            </span>
            <button type="button" onClick={handleCancel} className="text-gray-500 hover:text-gray-800">
              <X size={14} />
            </button>
          </div>

          {errorMsg && (
            <div className="mb-2 p-1.5 bg-red-100 border border-red-400 text-red-700 rounded font-semibold text-xs">
              {errorMsg}
            </div>
          )}

          {/* Core Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-gray-700 font-bold mb-1">
                Employee Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Salim Sheikh"
                className="w-full bg-white border border-[#8c9ba8] p-1 px-2 focus:bg-[#fffbdd] focus:outline-none focus:border-blue-600 rounded"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">
                Requested User ID <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.username}
                  onChange={e => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="e.g. salimsne"
                  disabled={!!editingId}
                  className="w-full bg-white disabled:bg-gray-100 border border-[#8c9ba8] p-1 px-2 focus:bg-[#fffbdd] focus:outline-none focus:border-blue-600 rounded font-mono"
                  required
                />
              </div>
              <p className="text-[9px] text-gray-500 mt-0.5">Matches format saddamsne, lowercase characters, no spaces.</p>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">
                Assigned Password <span className="text-red-500">*</span>
              </label>
              <div className="flex space-x-1">
                <input
                  type="text"
                  value={formData.password}
                  onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Use strong phrase"
                  className="flex-1 bg-white border border-[#8c9ba8] p-1 px-2 focus:bg-[#fffbdd] focus:outline-none focus:border-blue-600 rounded font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-[#8c9ba8] px-2 rounded flex items-center space-x-1 transition-colors"
                  title="Generate safe password"
                >
                  <Key size={10} />
                  <span>Auto</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-2">
            {/* Permission checklist - Modules */}
            <div className="border border-[#8c9ba8] rounded p-2 bg-[#f8fafc]">
              <div className="flex items-center justify-between border-b border-[#8c9ba8] pb-1.5 mb-2">
                <span className="font-bold text-gray-800 flex items-center space-x-1">
                  <Shield size={12} className="text-blue-600" />
                  <span>1. Permitted Modules Access Control</span>
                </span>
                <button
                  type="button"
                  onClick={selectAllModules}
                  className="text-[10px] bg-blue-50 text-blue-700 border border-blue-300 px-1.5 py-0.5 hover:bg-blue-100 transition-colors uppercase rounded font-bold"
                >
                  {formData.allowedModules.length === MODULES_LIST.length ? 'Deselect All' : 'Select All Modules'}
                </button>
              </div>

              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                {Object.entries(groupedModules).map(([group, list]) => (
                  <div key={group} className="bg-white border border-gray-200 p-1.5 rounded">
                    <div className="font-bold text-[#0056b3] border-b border-gray-100 pb-0.5 mb-1.5 uppercase tracking-wider text-[9px]">
                      {group}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {list.map(mod => {
                        const isChecked = formData.allowedModules.includes(mod.id);
                        return (
                          <div 
                            key={mod.id} 
                            onClick={() => toggleModule(mod.id)}
                            className={`flex items-center space-x-1.5 p-1 rounded cursor-pointer border select-none transition-colors ${
                              isChecked 
                                ? 'bg-[#fffbdd] border-orange-300 text-orange-900 font-medium' 
                                : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700'
                            }`}
                          >
                            <span>{isChecked ? <CheckSquare size={11} className="text-orange-600" /> : <Square size={11} className="text-gray-400" />}</span>
                            <span className="truncate">{mod.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Permission checklist - Projects */}
            <div className="border border-[#8c9ba8] rounded p-2 bg-[#f8fafc]">
              <div className="flex items-center justify-between border-b border-[#8c9ba8] pb-1.5 mb-2">
                <span className="font-bold text-gray-800 flex items-center space-x-1">
                  <FolderGit2 size={12} className="text-[#0056b3]" />
                  <span>2. Permitted Projects & Sites Boundaries</span>
                </span>
                <button
                  type="button"
                  onClick={selectAllProjects}
                  className="text-[10px] bg-blue-50 text-blue-700 border border-blue-300 px-1.5 py-0.5 hover:bg-blue-100 transition-colors uppercase rounded font-bold"
                >
                  {formData.allowedProjects.length === projects.length ? 'Deselect All' : 'Select All Projects'}
                </button>
              </div>

              <div className="max-h-[300px] overflow-y-auto bg-white border border-gray-200 rounded p-1.5">
                {projects.length === 0 ? (
                  <div className="text-center text-gray-500 py-6">
                    No projects found! Create a project first under the Projects Catalog.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {projects.map(proj => {
                      const isChecked = formData.allowedProjects.includes(proj.id);
                      return (
                        <div 
                          key={proj.id} 
                          onClick={() => toggleProject(proj.id)}
                          className={`flex items-center space-x-1.5 p-1.5 rounded cursor-pointer border select-none transition-colors ${
                            isChecked 
                              ? 'bg-blue-50 border-blue-300 text-blue-900 font-medium' 
                              : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          <span>{isChecked ? <CheckSquare size={11} className="text-blue-600" /> : <Square size={11} className="text-gray-400" />}</span>
                          <div className="truncate">
                            <div className="font-semibold text-[10px]">{proj.name}</div>
                            {proj.clientName && <p className="text-[8px] text-gray-500 truncate mt-0.5">{proj.clientName}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end space-x-1 border-t border-gray-200 pt-3">
            <button
              type="button"
              onClick={handleCancel}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 border border-[#8c9ba8] rounded font-semibold transition-colors"
            >
              Discard Changes
            </button>
            <button
              type="submit"
              className="px-4 py-1 bg-[var(--btn-hover-top)] hover:bg-blue-700 text-white border border-blue-800 rounded font-semibold transition-colors"
            >
              {editingId ? 'Save Access Parameters' : 'Create Staff Account'}
            </button>
          </div>
        </form>
      ) : null}

      {/* Staff Grid/Table Panel */}
      <div className="bg-white border border-[#8c9ba8] rounded shadow-sm overflow-hidden p-2">
        <ERPTable
          id="staff-table"
          data={filteredStaff}
          columns={erpColumns}
          idKey="id"
          searchPlaceholder="Filter staff members..."
          rowActions={erpRowActions}
          exportFilename="active_staff_members"
        />
      </div>

      {/* Explanatory Help Ribbon */}
      <div className="mt-3 p-2 bg-[#fffbdd] border border-[#d4cb80]/50 rounded flex items-start space-x-2 text-gray-800 leading-relaxed shadow-sm">
        <HelpCircle size={14} className="text-orange-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-orange-800">Operational Guidance: </span>
          <span>
            Staff accounts configured here run strictly on their defined access profiles. 
            Once logged in, they are blocked from viewing unassigned projects and see custom-scoped Sidebars matching only their permitted modules. 
            Superuser admins retain unrestricted developer logs, ledger closing setups, and client profile actions.
          </span>
        </div>
      </div>
    </div>
  );
}
