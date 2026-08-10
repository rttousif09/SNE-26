import React, { useState, useMemo } from 'react';
import { SAPSelect } from './SAPSelect';
import { useAppContext } from '../store';
import { Plus, X, Save, Edit, Trash2, Search, ArrowRight, Calendar, User, Briefcase, ChevronRight, AlertTriangle, FileText, CheckCircle2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const LabourRequirementPlanning: React.FC = () => {
  const { 
    user,
    projects = [], 
    workers = [], 
    labourPlannings = [], 
    workerTransfers = [], 
    addLabourPlanning, 
    updateLabourPlanning, 
    deleteLabourPlanning, 
    addWorkerTransfer 
  } = useAppContext();

  const isReadOnly = user?.username === 'saddamsne';

  // Sub-tabs
  const [subTab, setSubTab] = useState<'requirements' | 'dashboard' | 'reports' | 'transfers'>('requirements');
  
  // Requirement Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const initialForm = {
    projectId: '',
    tower: '',
    floor: '',
    activityName: '',
    requiredDate: new Date().toISOString().substring(0, 10),
    requiredCompletionDate: new Date().toISOString().substring(0, 10),
    remarks: '',
    carpenterReq: 0,
    helperReq: 0,
    barBenderReq: 0,
    steelFixerReq: 0,
    masonReq: 0,
    concreteWorkerReq: 0,
    supervisorReq: 0,
    foremanReq: 0,
    otherReq: 0,
    shift: 'Day' as 'Day' | 'Night'
  };
  
  const [formData, setFormData] = useState(initialForm);

  // Filters
  const [filterProject, setFilterProject] = useState('all');
  const [filterActivity, setFilterActivity] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Transfer Wizard States
  const [transferWorkerId, setTransferWorkerId] = useState('');
  const [transferToProjectId, setTransferToProjectId] = useState('');
  const [transferRemarks, setTransferRemarks] = useState('');
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);

  // Report States
  const [reportType, setReportType] = useState<'requirement' | 'availability' | 'shortage' | 'sitewise'>('requirement');

  // Designation category helper
  const getCategory = (designation: string): string => {
    const norm = (designation || "").toLowerCase();
    if (norm.includes("helper")) return "Helper";
    if (norm.includes("carpenter")) return "Carpenter";
    if (norm.includes("bar bender") || norm.includes("bender")) return "Bar Bender";
    if (norm.includes("steel fixer") || norm.includes("fitter") || norm.includes("fixer")) return "Steel Fixer";
    if (norm.includes("mason")) return "Mason";
    if (norm.includes("concrete") || norm.includes("cement")) return "Concrete Worker";
    if (norm.includes("supervisor") || norm.includes("engineer")) return "Supervisor";
    if (norm.includes("foreman")) return "Foreman";
    return "Other";
  };

  // Site manpower mapping
  const siteManpower = useMemo(() => {
    const res: Record<string, Record<string, number>> = {};
    projects.forEach(p => {
      res[p.id] = {
        Carpenter: 0, Helper: 0, "Bar Bender": 0, "Steel Fixer": 0, Mason: 0,
        "Concrete Worker": 0, Supervisor: 0, Foreman: 0, Other: 0
      };
    });
    // Add General/Unassigned
    res["unassigned"] = {
      Carpenter: 0, Helper: 0, "Bar Bender": 0, "Steel Fixer": 0, Mason: 0,
      "Concrete Worker": 0, Supervisor: 0, Foreman: 0, Other: 0
    };
    workers.forEach(w => {
      const pid = w.projectId || "unassigned";
      if (!res[pid]) {
        res[pid] = {
          Carpenter: 0, Helper: 0, "Bar Bender": 0, "Steel Fixer": 0, Mason: 0,
          "Concrete Worker": 0, Supervisor: 0, Foreman: 0, Other: 0
        };
      }
      const cat = getCategory(w.designation);
      if (cat in res[pid]) {
        res[pid][cat]++;
      } else {
        res[pid]["Other"]++;
      }
    });
    return res;
  }, [projects, workers]);

  // Overall Statistics computed from all active requirements
  const overallStats = useMemo(() => {
    let reqSum = 0;
    let availSum = 0;
    let shortageSum = 0;
    let excessSum = 0;
    let overdueCount = 0;
    const today = new Date().toISOString().substring(0, 10);

    (labourPlannings || []).forEach(p => {
      const liveCounts = siteManpower[p.projectId] || {
        Carpenter: 0, Helper: 0, "Bar Bender": 0, "Steel Fixer": 0, Mason: 0,
        "Concrete Worker": 0, Supervisor: 0, Foreman: 0, Other: 0
      };

      const categories = [
        { req: p.carpenterReq, avail: liveCounts.Carpenter },
        { req: p.helperReq, avail: liveCounts.Helper },
        { req: p.barBenderReq, avail: liveCounts["Bar Bender"] },
        { req: p.steelFixerReq, avail: liveCounts["Steel Fixer"] },
        { req: p.masonReq, avail: liveCounts.Mason },
        { req: p.concreteWorkerReq, avail: liveCounts["Concrete Worker"] },
        { req: p.supervisorReq, avail: liveCounts.Supervisor },
        { req: p.foremanReq, avail: liveCounts.Foreman },
        { req: p.otherReq, avail: liveCounts.Other }
      ];

      categories.forEach(c => {
        const r = c.req || 0;
        const a = c.avail || 0;
        reqSum += r;
        availSum += a;
        if (r > a) {
          shortageSum += (r - a);
        } else if (a > r) {
          excessSum += (a - r);
        }
      });

      if (p.requiredDate < today) {
        overdueCount++;
      }
    });

    return { reqSum, availSum, shortageSum, excessSum, overdueCount };
  }, [labourPlannings, siteManpower]);

  // Handle Planning Filter list
  const filteredPlannings = useMemo(() => {
    let list = labourPlannings || [];
    
    if (filterProject !== 'all') {
      list = list.filter(p => p.projectId === filterProject);
    }
    if (filterActivity.trim()) {
      const act = filterActivity.toLowerCase().trim();
      list = list.filter(p => (p.activityName || '').toLowerCase().includes(act));
    }
    if (filterStartDate) {
      list = list.filter(p => p.requiredDate >= filterStartDate);
    }
    if (filterEndDate) {
      list = list.filter(p => p.requiredCompletionDate <= filterEndDate);
    }
    if (filterCategory !== 'all') {
      const key = `${filterCategory.charAt(0).toLowerCase() + filterCategory.slice(1).replace(' ', '')}Req`;
      list = list.filter(p => (Number((p as any)[key]) || 0) > 0);
    }
    
    return list;
  }, [labourPlannings, filterProject, filterActivity, filterCategory, filterStartDate, filterEndDate]);

  // Form Management Actions
  const handleEditClick = (plan: any) => {
    setFormData({
      projectId: plan.projectId,
      tower: plan.tower || '',
      floor: plan.floor || '',
      activityName: plan.activityName,
      requiredDate: plan.requiredDate,
      requiredCompletionDate: plan.requiredCompletionDate,
      remarks: plan.remarks || '',
      carpenterReq: plan.carpenterReq || 0,
      helperReq: plan.helperReq || 0,
      barBenderReq: plan.barBenderReq || 0,
      steelFixerReq: plan.steelFixerReq || 0,
      masonReq: plan.masonReq || 0,
      concreteWorkerReq: plan.concreteWorkerReq || 0,
      supervisorReq: plan.supervisorReq || 0,
      foremanReq: plan.foremanReq || 0,
      otherReq: plan.otherReq || 0,
      shift: plan.shift || 'Day'
    });
    setEditingId(plan.id);
    setIsFormOpen(true);
  };

  const handleCreateOrUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.projectId || !formData.activityName) {
      alert("Please fill in Project and Activity fields.");
      return;
    }

    const submission = {
      projectId: formData.projectId,
      tower: formData.tower || null,
      floor: formData.floor || null,
      activityName: formData.activityName,
      requiredDate: formData.requiredDate,
      requiredCompletionDate: formData.requiredCompletionDate,
      remarks: formData.remarks || '',
      carpenterReq: Number(formData.carpenterReq) || 0,
      helperReq: Number(formData.helperReq) || 0,
      barBenderReq: Number(formData.barBenderReq) || 0,
      steelFixerReq: Number(formData.steelFixerReq) || 0,
      masonReq: Number(formData.masonReq) || 0,
      concreteWorkerReq: Number(formData.concreteWorkerReq) || 0,
      supervisorReq: Number(formData.supervisorReq) || 0,
      foremanReq: Number(formData.foremanReq) || 0,
      otherReq: Number(formData.otherReq) || 0,
      shift: formData.shift || 'Day'
    };

    if (editingId) {
      updateLabourPlanning(editingId, submission);
    } else {
      addLabourPlanning(submission);
    }

    setFormData(initialForm);
    setIsFormOpen(false);
    setEditingId(null);
  };

  // Worker Transfer mobilization action
  const handlePerformTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferWorkerId || !transferToProjectId) {
      alert("Please select a Worker and a Destination Project.");
      return;
    }

    const workerObj = workers.find(w => w.id === transferWorkerId);
    if (!workerObj) return;

    if (workerObj.projectId === transferToProjectId) {
      alert("The worker is already deployed at that project site.");
      return;
    }

    const fromProjectName = projects.find(p => p.id === workerObj.projectId)?.name || 'General Pool';
    const toProjectName = projects.find(p => p.id === transferToProjectId)?.name || 'Unknown Site';

    // Persist transfer record
    addWorkerTransfer({
      workerId: transferWorkerId,
      fromProjectId: workerObj.projectId || 'unassigned',
      toProjectId: transferToProjectId,
      transferDate: new Date().toISOString().substring(0, 10),
      remarks: transferRemarks || `Mobilized for task requirement fulfillment`
    });

    setTransferSuccess(`Successfully mobilized ${workerObj.name} from "${fromProjectName}" to "${toProjectName}"!`);
    setTransferWorkerId('');
    setTransferRemarks('');
    
    setTimeout(() => {
      setTransferSuccess(null);
    }, 4500);
  };

  // Helpers
  const getProjectName = (id: string) => projects.find(p => p.id === id)?.name || 'General / Unassigned';

  const categoryLabels = ["Carpenter", "Helper", "Bar Bender", "Steel Fixer", "Mason", "Concrete Worker", "Supervisor", "Foreman", "Other"];

  return (
    <div className="flex-1 flex flex-col space-y-3 pt-1 select-none">
      
      {/* 1. Planning Analytics Summary KPIs Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 print:hidden select-none">
        <div className="bg-[#f0f4f8] border border-[#bcc5cf] p-2 flex flex-col justify-between rounded-xs">
          <span className="text-gray-500 font-bold uppercase text-[8.5px] tracking-wide">REQUIRED MANPOWER</span>
          <span className="text-sm font-extrabold text-[#0a3563] font-mono mt-1">{overallStats.reqSum} <span className="text-[9px] font-normal font-sans text-gray-500">Personnel</span></span>
        </div>
        <div className="bg-[#f0f4f8] border border-[#bcc5cf] p-2 flex flex-col justify-between rounded-xs">
          <span className="text-gray-500 font-bold uppercase text-[8.5px] tracking-wide">DEPLOYED ACTIVE</span>
          <span className="text-sm font-extrabold text-teal-800 font-mono mt-1">{overallStats.availSum} <span className="text-[9px] font-normal font-sans text-gray-500">Personnel</span></span>
        </div>
        <div className="bg-red-50 border border-red-200 p-2 flex flex-col justify-between rounded-xs">
          <span className="text-red-650 font-bold uppercase text-[8.5px] tracking-wide">DEFICIT shortage</span>
          <span className={`text-sm font-extrabold font-mono mt-1 ${overallStats.shortageSum > 0 ? 'text-red-700' : 'text-gray-500'}`}>{overallStats.shortageSum} <span className="text-[9px] font-normal font-sans text-red-500">Deficits</span></span>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 p-2 flex flex-col justify-between rounded-xs">
          <span className="text-emerald-700 font-bold uppercase text-[8.5px] tracking-wide">SURPLUS EXCESS</span>
          <span className="text-sm font-extrabold text-emerald-800 font-mono mt-1">{overallStats.excessSum}</span>
        </div>
        <div className="bg-amber-50 border border-amber-200 p-2 flex flex-col justify-between rounded-xs col-span-2 lg:col-span-1">
          <span className="text-amber-800 font-bold uppercase text-[8.5px] tracking-wide">OVERDUE SCHEDULES</span>
          <span className={`text-sm font-extrabold font-mono mt-1 ${overallStats.overdueCount > 0 ? 'text-amber-700 font-black' : 'text-gray-500'}`}>{overallStats.overdueCount}</span>
        </div>
      </div>

      {/* Overview notices if any major deficits exist */}
      {overallStats.shortageSum > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-2 text-[10px] leading-tight flex items-center space-x-2 select-none print:hidden">
          <AlertTriangle size={14} className="text-red-600 flex-shrink-0" />
          <span>
            <strong>Attention Shortage Alerts:</strong> Major manpower shortage is active at pending activity sites ({overallStats.shortageSum} deficient workers). Click the <strong>⚡ Worker Mobilization Portal</strong> tab to deploy personnel immediately.
          </span>
        </div>
      )}

      {/* 2. Workbook Subtab Selectors and controls */}
      <div className="flex items-center justify-between border-b border-[#8c9ba8] bg-[#f0f4f8] p-1 pb-0 select-none print:hidden">
        <div className="flex space-x-1">
          <button
            onClick={() => setSubTab('requirements')}
            className={`px-3 py-1 text-[10.5px] font-bold rounded-t-sm border border-b-transparent transition-all flex items-center space-x-1 ${subTab === 'requirements' ? 'bg-white border-[#8c9ba8] text-[#0056b3]' : 'bg-[#e3ecf5] text-gray-600 hover:bg-white border-transparent cursor-pointer'}`}
          >
            <span>📅 Live Requirements List</span>
          </button>
          <button
            onClick={() => setSubTab('dashboard')}
            className={`px-3 py-1 text-[10.5px] font-bold rounded-t-sm border border-b-transparent transition-all flex items-center space-x-1 ${subTab === 'dashboard' ? 'bg-white border-[#8c9ba8] text-[#0056b3]' : 'bg-[#e3ecf5] text-gray-600 hover:bg-white border-transparent cursor-pointer'}`}
          >
            <span>📊 Allocation Grid Radar</span>
          </button>
          <button
            onClick={() => setSubTab('reports')}
            className={`px-3 py-1 text-[10.5px] font-bold rounded-t-sm border border-b-transparent transition-all flex items-center space-x-1 ${subTab === 'reports' ? 'bg-white border-[#8c9ba8] text-[#0056b3]' : 'bg-[#e3ecf5] text-gray-600 hover:bg-white border-transparent cursor-pointer'}`}
          >
            <span>📰 Printable Audit Reports</span>
          </button>
          <button
            onClick={() => setSubTab('transfers')}
            className={`px-3 py-1 text-[10.5px] font-bold rounded-t-sm border border-b-transparent transition-all flex items-center space-x-1 ${subTab === 'transfers' ? 'bg-white border-[#8c9ba8] text-[#0056b3]' : 'bg-[#e3ecf5] text-gray-600 hover:bg-white border-transparent cursor-pointer'}`}
          >
            <span>⚡ Worker Mobilization Portal</span>
          </button>
        </div>

        {subTab === 'requirements' && !isReadOnly && (
          <button
            onClick={() => {
              setFormData(initialForm);
              setEditingId(null);
              setIsFormOpen(!isFormOpen);
            }}
            className="sap-btn bg-emerald-700 text-white border-emerald-800 hover:bg-emerald-800 px-2 py-0.5 text-[10px] flex items-center space-x-1 cursor-pointer mb-1 mr-1"
          >
            {isFormOpen ? <X size={10} /> : <Plus size={10} />}
            <span>{isFormOpen ? 'Cancel Entry' : 'Schedule New Requirement'}</span>
          </button>
        )}
      </div>

      {/* 3. Live Requirements Tab Pane */}
      {subTab === 'requirements' && (
        <div className="flex-1 flex flex-col space-y-2">
          
          {/* New Requirement Form Slide-down Block */}
          {isFormOpen && (
            <motion.form 
              initial={{ height: 0, opacity: 0 }} 
              animate={{ height: 'auto', opacity: 1 }} 
              className="bg-white border border-[#8c9ba8] p-3 shadow-xs space-y-3 prose-xs text-[11px] font-sans print:hidden"
              onSubmit={handleCreateOrUpdate}
            >
              <div className="sap-header p-1 font-bold text-[var(--color-sap-blue-val)] bg-slate-150 border-[#8c9ba8] border-b text-[10.5px]">
                {editingId ? 'Modify Manpower Schedules Form' : 'Register New Project Site Labour Requirement Program'}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <div className="flex flex-col">
                  <label className="font-semibold mb-0.5">Project / Site Name *</label>
                  <SAPSelect
                    className="sap-input text-[11px] p-1 border font-sans"
                    value={formData.projectId}
                    onChange={e => setFormData({ ...formData, projectId: e.target.value })}
                    required
                  >
                    <option value="">-- Choose Project site --</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </SAPSelect>
                </div>
                <div className="flex flex-col">
                  <label className="font-semibold mb-0.5">Tower Name (Optional)</label>
                  <input
                    type="text"
                    className="sap-input text-[11px]"
                    placeholder="e.g. Tower B"
                    value={formData.tower}
                    onChange={e => setFormData({ ...formData, tower: e.target.value })}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="font-semibold mb-0.5">Floor Rank (Optional)</label>
                  <input
                    type="text"
                    className="sap-input text-[11px]"
                    placeholder="e.g. 18th Floor"
                    value={formData.floor}
                    onChange={e => setFormData({ ...formData, floor: e.target.value })}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="font-semibold mb-0.5">Activity Description *</label>
                  <input
                    type="text"
                    className="sap-input text-[11px]"
                    placeholder="e.g. Columns Concrete Plastering"
                    value={formData.activityName}
                    onChange={e => setFormData({ ...formData, activityName: e.target.value })}
                    required
                  />
                </div>

                <div className="flex flex-col">
                  <label className="font-semibold mb-0.5">Required Date *</label>
                  <input
                    type="date"
                    className="sap-input text-[11px]"
                    value={formData.requiredDate}
                    onChange={e => setFormData({ ...formData, requiredDate: e.target.value })}
                    required
                  />
                </div>
                <div className="flex flex-col">
                  <label className="font-semibold mb-0.5">Completion Target *</label>
                  <input
                    type="date"
                    className="sap-input text-[11px]"
                    value={formData.requiredCompletionDate}
                    onChange={e => setFormData({ ...formData, requiredCompletionDate: e.target.value })}
                    required
                  />
                </div>
                <div className="flex flex-col">
                  <label className="font-semibold mb-0.5">Shift Assignment *</label>
                  <SAPSelect
                    className="sap-input text-[11px]"
                    value={formData.shift}
                    onChange={e => setFormData({ ...formData, shift: e.target.value as 'Day' | 'Night' })}
                    required
                  >
                    <option value="Day">☀️ Day Shift</option>
                    <option value="Night">🌙 Night Shift</option>
                  </SAPSelect>
                </div>
                <div className="flex flex-col">
                  <label className="font-semibold mb-0.5">Core Assignment Remarks</label>
                  <input
                    type="text"
                    className="sap-input text-[11px]"
                    placeholder="Justification remarks context..."
                    value={formData.remarks}
                    onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                  />
                </div>
              </div>

              {/* Requirement entry of workers category counts */}
              <div className="border border-[#bcc5cf] p-2 bg-slate-50/50">
                <span className="font-bold text-gray-700 block mb-2 text-[9px] uppercase">Requirement Allocation values per Labour Category:</span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { label: 'Carpenter', key: 'carpenterReq' },
                    { label: 'Helper', key: 'helperReq' },
                    { label: 'Bar Bender', key: 'barBenderReq' },
                    { label: 'Steel Fixer', key: 'steelFixerReq' },
                    { label: 'Mason', key: 'masonReq' },
                    { label: 'Concrete Worker', key: 'concreteWorkerReq' },
                    { label: 'Supervisor', key: 'supervisorReq' },
                    { label: 'Foreman', key: 'foremanReq' },
                    { label: 'Other', key: 'otherReq' },
                  ].map(c => (
                    <div key={c.key} className="flex flex-col bg-white border p-1 border-slate-200">
                      <span className="text-[9px] text-gray-500 font-semibold">{c.label} count:</span>
                      <input
                        type="number"
                        min="0"
                        className="sap-input font-bold p-0.5 text-center text-xs text-[#0a3563] mt-0.5"
                        value={(formData as any)[c.key]}
                        onChange={e => setFormData({ ...formData, [c.key]: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-1 pt-1 border-t border-dashed border-gray-300">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="sap-btn-secondary px-3 py-1 flex items-center space-x-1"
                >
                  <X size={10} />
                  <span>Aborts</span>
                </button>
                <button
                  type="submit"
                  className="sap-btn bg-[#0a3563] text-white border-[#082a50] hover:bg-[#082a50] px-4 py-1 flex items-center space-x-1"
                >
                  <Save size={10} />
                  <span>{editingId ? 'Apply Amendments' : 'Publish Requirement Program'}</span>
                </button>
              </div>
            </motion.form>
          )}

          {/* Filtering Header Panel */}
          <div className="bg-[#f0f4f8] border border-[#bcc5cf] p-1.5 flex flex-wrap items-center gap-2 text-[10.5px] print:hidden">
            <span className="font-bold text-gray-600 block sm:inline">Filters:</span>
            <SAPSelect
              className="sap-input text-[10.5px] py-0.5"
              value={filterProject}
              onChange={e => setFilterProject(e.target.value)}
            >
              <option value="all">All Site Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </SAPSelect>
            <input
              type="text"
              placeholder="Filter by Activity..."
              className="sap-input text-[10.5px] py-0.5 w-36"
              value={filterActivity}
              onChange={e => setFilterActivity(e.target.value)}
            />
            <SAPSelect
              className="sap-input text-[10.5px] py-0.5"
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
            >
              <option value="all">All Specialties</option>
              {categoryLabels.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </SAPSelect>
            <div className="flex items-center space-x-1">
              <span>Timeline:</span>
              <input
                type="date"
                className="sap-input text-[10.5px] py-0.5"
                value={filterStartDate}
                onChange={e => setFilterStartDate(e.target.value)}
              />
              <span>→</span>
              <input
                type="date"
                className="sap-input text-[10.5px] py-0.5"
                value={filterEndDate}
                onChange={e => setFilterEndDate(e.target.value)}
              />
            </div>
            {(filterProject !== 'all' || filterActivity || filterCategory !== 'all' || filterStartDate || filterEndDate) && (
              <button
                onClick={() => {
                  setFilterProject('all');
                  setFilterActivity('');
                  setFilterCategory('all');
                  setFilterStartDate('');
                  setFilterEndDate('');
                }}
                className="text-red-650 font-bold hover:underline"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Live active requirements list */}
          <div className="border border-[#bcc5cf] bg-white overflow-hidden select-none">
            <table className="w-full border-collapse border border-[#bcc5cf] text-[11px] font-sans">
              <thead className="sap-header text-gray-800">
                <tr>
                  <th className="border border-[#bcc5cf] p-1 px-2 text-left font-semibold">Requirement activity Details</th>
                  <th className="border border-[#bcc5cf] p-1 text-center font-semibold w-24">Timeline Dates</th>
                  <th className="border border-[#bcc5cf] p-1 text-left font-semibold">Specialists manpower Deficit Ledgers</th>
                  <th className="border border-[#bcc5cf] p-1 text-center font-semibold w-16">Aggregates</th>
                  <th className="border border-[#bcc5cf] p-1 text-center font-semibold w-24 print:hidden">Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#bcc5cf]">
                {filteredPlannings.map(p => {
                  const liveCounts = siteManpower[p.projectId] || { Carpenter: 0, Helper: 0, "Bar Bender": 0, "Steel Fixer": 0, Mason: 0, "Concrete Worker": 0, Supervisor: 0, Foreman: 0, Other: 0 };
                  
                  // Compute shortages
                  const lines: { cat: string; req: number; avail: number }[] = [
                    { cat: 'Carpenter', req: p.carpenterReq, avail: liveCounts.Carpenter },
                    { cat: 'Helper', req: p.helperReq, avail: liveCounts.Helper },
                    { cat: 'Bar Bender', req: p.barBenderReq, avail: liveCounts["Bar Bender"] },
                    { cat: 'Steel Fixer', req: p.steelFixerReq, avail: liveCounts["Steel Fixer"] },
                    { cat: 'Mason', req: p.masonReq, avail: liveCounts.Mason },
                    { cat: 'Concrete Worker', req: p.concreteWorkerReq, avail: liveCounts["Concrete Worker"] },
                    { cat: 'Supervisor', req: p.supervisorReq, avail: liveCounts.Supervisor },
                    { cat: 'Foreman', req: p.foremanReq, avail: liveCounts.Foreman },
                    { cat: 'Other', req: p.otherReq, avail: liveCounts.Other },
                  ].filter(l => (l.req || 0) > 0);

                  const sumReq = lines.reduce((s, x) => s + (x.req || 0), 0);
                  const sumAvail = lines.reduce((s, x) => s + (x.avail || 0), 0);
                  const sumShortage = lines.reduce((s, x) => s + Math.max(0, x.req - x.avail), 0);

                  const isDeficit = sumShortage > 0;
                  const isTaskOverdue = p.requiredDate < new Date().toISOString().substring(0, 10);

                  return (
                    <tr key={p.id} className="hover:bg-[#e6f2ff] divide-x divide-[#bcc5cf]">
                      <td className="p-2 py-1.5 align-top">
                        <div className="flex items-center space-x-1.5 font-bold text-slate-800">
                          <span>{p.activityName}</span>
                          {p.shift === 'Night' ? (
                            <span className="text-[8px] bg-indigo-950 text-indigo-200 border border-indigo-700 rounded px-1 flex items-center font-mono">
                              🌙 NIGHT
                            </span>
                          ) : (
                            <span className="text-[8px] bg-amber-50 text-amber-700 border border-amber-200 rounded px-1 flex items-center font-mono">
                              ☀️ DAY
                            </span>
                          )}
                          {isTaskOverdue && (
                            <span className="text-[8px] bg-red-100 text-red-700 border border-red-300 rounded px-1 flex items-center uppercase font-mono">
                              <AlertTriangle size={8} className="mr-0.5" /> OVERDUE Target
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5">
                          Project: <strong className="text-gray-700">{getProjectName(p.projectId)}</strong> {p.tower ? `| ${p.tower}` : ''} {p.floor ? `| ${p.floor}` : ''}
                        </div>
                        {p.remarks && (
                          <div className="text-[9.5px] text-slate-500 italic mt-1 font-mono">
                            Remarks: {p.remarks}
                          </div>
                        )}
                      </td>
                      <td className="p-2 py-1.5 align-top text-center font-mono font-medium whitespace-nowrap text-gray-600">
                        <div className="text-[10px] text-blue-900 font-bold">{p.requiredDate}</div>
                        <div className="text-[9px] text-slate-400 mt-1">Completion target:</div>
                        <div className="text-[9.5px] font-bold text-gray-500">{p.requiredCompletionDate}</div>
                      </td>
                      <td className="p-2 py-1.5 align-top">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {lines.map(l => {
                            const shortage = Math.max(0, l.req - l.avail);
                            const excess = Math.max(0, l.avail - l.req);
                            return (
                              <div key={l.cat} className="flex justify-between items-center bg-slate-50 border p-1 text-[10px]">
                                <span className="font-semibold text-gray-600">{l.cat}:</span>
                                <div className="space-x-1 flex items-center font-mono">
                                  <span className="text-gray-400">{l.avail} deployed /</span>
                                  <span className="text-[#0a3563] font-extrabold">{l.req} req</span>
                                  {shortage > 0 ? (
                                    <span className="bg-red-100 text-red-700 font-extrabold px-1 text-[9px] rounded-sm">- {shortage} deficit</span>
                                  ) : (
                                    <span className="bg-emerald-100 text-emerald-800 font-extrabold px-1 text-[9px] rounded-sm">Met</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className="p-2 py-1.5 text-center align-top font-mono">
                        <div className="text-[10.5px] font-bold text-[#0a3563]">{sumReq} req</div>
                        <div className="text-[9px] text-teal-800 mt-1 font-semibold">{sumAvail} active</div>
                        {isDeficit ? (
                          <div className="text-[9.5px] bg-red-100 text-red-700 font-extrabold rounded mt-1 border border-red-200">
                            -{sumShortage} Deficit
                          </div>
                        ) : (
                          <div className="text-[9.5px] bg-emerald-100 text-emerald-800 font-bold rounded mt-1 border border-emerald-200">
                            Met
                          </div>
                        )}
                      </td>
                      <td className="p-2 py-1.5 align-middle text-center print:hidden">
                        <div className="flex flex-col space-y-1 items-stretch max-w-24 mx-auto">
                          {isDeficit && (
                            <button
                              onClick={() => {
                                setTransferToProjectId(p.projectId);
                                setSubTab('transfers');
                              }}
                              className="bg-amber-600 hover:bg-amber-700 text-white rounded p-0.5 text-[9px] font-extrabold border border-amber-700 text-center flex items-center justify-center space-x-1 cursor-pointer"
                            >
                              <span>⚡ Fulfill Deficit</span>
                            </button>
                          )}
                          {!isReadOnly && (
                            <div className="flex space-x-1">
                              <button
                                onClick={() => handleEditClick(p)}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 border border-slate-350 text-gray-700 rounded p-0.5 text-[9.5px] flex items-center justify-center cursor-pointer"
                                title="Edit Requirement"
                              >
                                <Edit size={9} />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm("Are you sure you want to permanently erase this manpower requirements schedule?")) {
                                    deleteLabourPlanning(p.id);
                                  }
                                }}
                                className="flex-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded p-0.5 text-[9.5px] flex items-center justify-center cursor-pointer"
                                title="Delete Plan"
                              >
                                <Trash2 size={9} />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredPlannings.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400 italic">
                      No matching registered manpower planning activities found. Modify filters or schedule a new program.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Live Allocation Radar Tab Pane */}
      {subTab === 'dashboard' && (
        <div className="flex-1 flex flex-col space-y-3">
          <div className="sap-header p-1.5 font-bold text-[var(--color-sap-blue-val)] bg-slate-150 border-[#8c9ba8] border-b text-[10.5px]">
            SITE-WISE LABOUR RADAR METRICS (Category Breakdowns)
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {projects.map(p => {
              const liveCounts = siteManpower[p.id] || { Carpenter: 0, Helper: 0, "Bar Bender": 0, "Steel Fixer": 0, Mason: 0, "Concrete Worker": 0, Supervisor: 0, Foreman: 0, Other: 0 };
              
              // Sum commitments
              let projReq = 0;
              (labourPlannings || []).filter(plan => plan.projectId === p.id).forEach(plan => {
                projReq += (plan.carpenterReq || 0) + (plan.helperReq || 0) + (plan.barBenderReq || 0) + (plan.steelFixerReq || 0) + (plan.masonReq || 0) + (plan.concreteWorkerReq || 0) + (plan.supervisorReq || 0) + (plan.foremanReq || 0) + (plan.otherReq || 0);
              });

              const projAvail = workers.filter(w => w.projectId === p.id).length;
              const hasDeficits = projReq > projAvail;

              return (
                <div key={p.id} className="bg-white border border-[#bcc5cf] p-2.5 space-y-2 rounded-xs flex flex-col justify-between shadow-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-extrabold text-[12px] text-[#0a3563] tracking-tight">{p.name}</h4>
                      <span className="text-[9.5px] text-gray-500 font-mono">ID: {p.id}</span>
                    </div>
                    <span className={`text-[9.5px] font-bold font-mono px-1 border border-current rounded-sm ${hasDeficits ? 'text-red-700 bg-red-50/50' : 'text-emerald-700 bg-emerald-50/50'}`}>
                      {hasDeficits ? '⚠️ DEFICITS DETECTED' : '✓ HEALTHY ALLOCATION'}
                    </span>
                  </div>

                  <div className="p-1 border border-slate-200 bg-slate-50/50 font-mono grid grid-cols-3 text-center gap-1">
                    <div className="border-r border-slate-200">
                      <span className="text-[8px] text-gray-400 block uppercase font-sans">Required Commitments</span>
                      <span className="text-[12px] font-bold text-[#0a3563]">{projReq}</span>
                    </div>
                    <div className="border-r border-slate-200">
                      <span className="text-[8px] text-gray-400 block uppercase font-sans">Active Deployed</span>
                      <span className="text-[12px] font-bold text-teal-800">{projAvail}</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-gray-400 block uppercase font-sans">Shortfalls</span>
                      <span className={`text-[12px] font-bold ${projReq > projAvail ? 'text-red-600 font-extrabold' : 'text-gray-500'}`}>
                        {projReq > projAvail ? `-${projReq - projAvail}` : '0'}
                      </span>
                    </div>
                  </div>

                  {/* Deeper Category Specific Breakdowns */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-gray-700 uppercase block border-b border-dashed border-gray-200 pb-0.5">Specialists Allocation:</span>
                    <div className="grid grid-cols-3 gap-1">
                      {categoryLabels.map(cat => {
                        const countAvail = liveCounts[cat] || 0;
                        
                        // Calculate category required
                        let countReq = 0;
                        const key = `${cat.charAt(0).toLowerCase() + cat.slice(1).replace(' ', '')}Req`;
                        (labourPlannings || []).filter(plan => plan.projectId === p.id).forEach(plan => {
                          countReq += (plan as any)[key] || 0;
                        });

                        return (
                          <div key={cat} className="p-1 border bg-slate-50 flex flex-col justify-center text-center text-[9px]">
                            <span className="text-gray-500 font-semibold truncate leading-tight">{cat}</span>
                            <div className="font-mono mt-0.5 flex justify-center space-x-1">
                              <span className="font-bold text-gray-900">{countAvail}</span>
                              <span className="text-slate-300">/</span>
                              <span className="text-blue-900 font-bold">{countReq}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-1.5 flex justify-end">
                    <button
                      onClick={() => {
                        setTransferToProjectId(p.id);
                        setSubTab('transfers');
                      }}
                      className="bg-[var(--btn-hover-top)] text-white border border-[#004085] hover:bg-[#004085] px-2.5 py-1 text-[9.5px] font-bold rounded-xs flex items-center space-x-1 cursor-pointer"
                    >
                      <span>⚡ Mobilize Support here</span>
                      <ArrowRight size={10} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Printable Reports Tab Pane */}
      {subTab === 'reports' && (
        <div className="flex-1 flex flex-col space-y-3">
          
          {/* report switcher header */}
          <div className="bg-[#f0f4f8] border border-[#bcc5cf] p-1.5 flex flex-wrap items-center justify-between gap-2 text-[10.5px] print:hidden">
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-gray-700">Audit Report Type:</span>
              <SAPSelect
                className="sap-input text-[10.5px] py-0.5"
                value={reportType}
                onChange={e => setReportType(e.target.value as any)}
              >
                <option value="requirement">Manpower Requirements Log (General Program)</option>
                <option value="availability">Active Availability Site Census Report</option>
                <option value="shortage">High Deficiency Shortfall analysis Report</option>
                <option value="sitewise">Site-wise Matrix Census ledger</option>
              </SAPSelect>
            </div>
            
            <button
              onClick={() => window.print()}
              className="bg-slate-700 border border-slate-800 text-white hover:bg-slate-800 px-3 py-0.5 text-[10.5px] flex items-center space-x-1 cursor-pointer"
            >
              <span>🖨️ Print Document</span>
            </button>
          </div>

          <div className="bg-white border border-[#8c9ba8] p-4 font-sans select-none print:border-none print:shadow-none">
            
            {/* Header Document template */}
            <div className="border-b-2 border-slate-900 pb-3 mb-4 flex justify-between items-end">
              <div>
                <h3 className="text-[16px] font-black tracking-tight text-slate-900 uppercase">SNE CONSTRUCTION ERP RADAR</h3>
                <span className="text-[9.5px] text-gray-500 font-mono">REGISTERS & LOGISTICS OFFICE accounts</span>
              </div>
              <div className="text-right text-[10px] font-mono">
                <div>DOCUMENT TYPE: <strong>{reportType.toUpperCase()} STATEMENT</strong></div>
                <div>GENERATED: {new Date().toLocaleString()}</div>
              </div>
            </div>

            {/* A: Requirements log report */}
            {reportType === 'requirement' && (
              <div className="space-y-2">
                <span className="font-bold block text-medium text-[var(--color-sap-blue-val)] border-b text-[12px] pb-1">CHRONOLOGICAL MANPOWER REQUIREMENTS LEDGER</span>
                <table className="w-full border-collapse border border-slate-900 text-[10px]">
                  <thead className="bg-slate-100 text-slate-800 font-mono font-bold">
                    <tr className="divide-x divide-slate-400">
                      <th className="border border-slate-900 p-1 text-left">Activity Details</th>
                      <th className="border border-slate-900 p-1 text-center w-20">Shift</th>
                      <th className="border border-slate-900 p-1 text-center w-24">Required Date</th>
                      <th className="border border-slate-900 p-1 text-center w-24">Target Date</th>
                      <th className="border border-slate-900 p-1 text-right w-24">Required Workers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {labourPlannings.map(p => {
                      const totalC = (p.carpenterReq || 0) + (p.helperReq || 0) + (p.barBenderReq || 0) + (p.steelFixerReq || 0) + (p.masonReq || 0) + (p.concreteWorkerReq || 0) + (p.supervisorReq || 0) + (p.foremanReq || 0) + (p.otherReq || 0);
                      return (
                        <tr key={p.id} className="border border-slate-900 text-[10px] hover:bg-slate-50">
                          <td className="p-1 px-2 border border-slate-900">
                            <strong>{p.activityName}</strong> <span className="text-gray-500">at {getProjectName(p.projectId)}</span>
                          </td>
                          <td className="p-1 border border-slate-900 text-center font-bold">
                            {p.shift === 'Night' ? '🌙 Night' : '☀️ Day'}
                          </td>
                          <td className="p-1 border border-slate-900 text-center font-mono">{p.requiredDate}</td>
                          <td className="p-1 border border-slate-900 text-center font-mono">{p.requiredCompletionDate}</td>
                          <td className="p-1 border border-slate-900 text-right font-mono font-semibold">{totalC}</td>
                        </tr>
                      );
                    })}
                    {labourPlannings.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-4 text-center italic text-gray-500">No requirements recorded.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* B: Availability Census report */}
            {reportType === 'availability' && (
              <div className="space-y-2">
                <span className="font-bold block text-medium text-[var(--color-sap-blue-val)] border-b text-[12px] pb-1">SITE-WISE LABOUR AVAILABILITY & STOCK MATRIX</span>
                <table className="w-full border-collapse border border-slate-900 text-[10px]">
                  <thead className="bg-slate-100 text-slate-800 font-mono font-bold">
                    <tr className="divide-x divide-slate-400">
                      <th className="border border-slate-900 p-1 text-left">Project Name</th>
                      {categoryLabels.map(cat => (
                        <th key={cat} className="border border-slate-900 p-1 text-center">{cat}</th>
                      ))}
                      <th className="border border-slate-900 p-1 text-right">Aggregate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map(p => {
                      const liveCounts = siteManpower[p.id] || { Carpenter: 0, Helper: 0, "Bar Bender": 0, "Steel Fixer": 0, Mason: 0, "Concrete Worker": 0, Supervisor: 0, Foreman: 0, Other: 0 };
                      const sumVal = Object.values(liveCounts).reduce((s, x) => s + x, 0);
                      return (
                        <tr key={p.id} className="border border-slate-900 text-[10px] hover:bg-slate-50">
                          <td className="p-1 px-2 border border-slate-900 font-semibold">{p.name}</td>
                          {categoryLabels.map(cat => (
                            <td key={cat} className="p-1 border border-slate-900 text-center font-mono">{liveCounts[cat] || 0}</td>
                          ))}
                          <td className="p-1 border border-slate-900 text-right font-mono font-extrabold text-[#0a3563]">{sumVal}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* C: Shortage Audit report */}
            {reportType === 'shortage' && (
              <div className="space-y-4">
                <span className="font-bold block text-medium text-red-700 border-b text-[12px] pb-1">HIGH MANPOWER DEFICITS AUDIT LEDGER</span>
                <table className="w-full border-collapse border border-slate-900 text-[10px]">
                  <thead className="bg-[#fff3f3] text-[#721c24] font-mono font-bold">
                    <tr className="divide-x divide-slate-400 border border-slate-900">
                      <th className="p-1.5 text-left border border-slate-900">Project / Site Name</th>
                      <th className="p-1.5 text-left border border-slate-900">Programmed Activity</th>
                      <th className="p-1.5 text-center border border-slate-900 w-24">Req Date</th>
                      <th className="p-1.5 text-left border border-slate-900">Unfulfilled Specialties shortages</th>
                      <th className="p-1.5 text-right border border-slate-900 w-24">Deficit Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-400">
                    {labourPlannings.map(p => {
                      const liveCounts = siteManpower[p.projectId] || { Carpenter: 0, Helper: 0, "Bar Bender": 0, "Steel Fixer": 0, Mason: 0, "Concrete Worker": 0, Supervisor: 0, Foreman: 0, Other: 0 };
                      
                      const lines = [
                        { cat: 'Carpenter', req: p.carpenterReq, avail: liveCounts.Carpenter },
                        { cat: 'Helper', req: p.helperReq, avail: liveCounts.Helper },
                        { cat: 'Bar Bender', req: p.barBenderReq, avail: liveCounts["Bar Bender"] },
                        { cat: 'Steel Fixer', req: p.steelFixerReq, avail: liveCounts["Steel Fixer"] },
                        { cat: 'Mason', req: p.masonReq, avail: liveCounts.Mason },
                        { cat: 'Concrete Worker', req: p.concreteWorkerReq, avail: liveCounts["Concrete Worker"] },
                        { cat: 'Supervisor', req: p.supervisorReq, avail: liveCounts.Supervisor },
                        { cat: 'Foreman', req: p.foremanReq, avail: liveCounts.Foreman },
                        { cat: 'Other', req: p.otherReq, avail: liveCounts.Other },
                      ].filter(l => (l.req || 0) > (l.avail || 0));

                      const sumDeficit = lines.reduce((s, x) => s + (x.req - x.avail), 0);

                      if (sumDeficit === 0) return null;

                      return (
                        <tr key={p.id} className="text-[10px] hover:bg-red-50/10">
                          <td className="p-1.5 border border-slate-900 font-semibold">{getProjectName(p.projectId)}</td>
                          <td className="p-1.5 border border-slate-900 font-medium text-gray-700">{p.activityName}</td>
                          <td className="p-1.5 border border-slate-900 text-center font-mono text-gray-500">{p.requiredDate}</td>
                          <td className="p-1.5 border border-slate-900">
                            <div className="flex flex-wrap gap-1">
                              {lines.map(l => (
                                <span key={l.cat} className="p-0.5 bg-red-50 border border-red-200 text-red-700 font-bold text-[8.5px] rounded-xs font-mono uppercase">
                                  {l.cat}: Short {l.req - l.avail}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-1.5 border border-slate-900 text-right font-mono font-black text-red-700">-{sumDeficit}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* D: Site-wise manpower matrix */}
            {reportType === 'sitewise' && (
              <div className="space-y-2">
                <span className="font-bold block text-medium text-[var(--color-sap-blue-val)] border-b text-[12px] pb-1">SITE-WISE MANPOWER REGISTER STATEMENT</span>
                <table className="w-full border-collapse border border-slate-900 text-[10px]">
                  <thead className="bg-slate-100 font-mono font-bold">
                    <tr>
                      <th className="border border-slate-900 p-1 text-left">Worker Profile Details</th>
                      <th className="border border-slate-900 p-1 text-left">Assigned Site / Project Location</th>
                      <th className="border border-slate-900 p-1 text-left">Normalized Designation Rank</th>
                      <th className="border border-slate-900 p-1 text-center w-28">Joining date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workers.map(w => (
                      <tr key={w.id} className="border border-slate-900 text-[10px] hover:bg-slate-50">
                        <td className="p-1 px-2 border border-slate-900">
                          <strong>{w.name}</strong> <span className="text-gray-500 font-mono text-[9px]">(ID: {w.workerId})</span>
                        </td>
                        <td className="p-1 border border-slate-900 font-semibold text-slate-800">{getProjectName(w.projectId)}</td>
                        <td className="p-1 border border-slate-900">{w.designation} <span className="text-gray-400">({getCategory(w.designation)})</span></td>
                        <td className="p-1 border border-slate-900 text-center font-mono">{w.joiningDate || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Print Signatures segment */}
            <div className="mt-8 pt-4 border-t border-dashed border-gray-400 flex justify-between select-none">
              <div className="text-center w-40 border-t border-slate-300 pt-1 text-[9.5px]">PREPARED BY RESOURCE CLERK</div>
              <div className="text-center w-40 border-t border-slate-300 pt-1 text-[9.5px]">VERIFIED REGISTERS MANAGER</div>
              <div className="text-center w-40 border-t border-slate-300 pt-1 text-[9.5px]">MANAGING DIRECTOR'S OFFICERS</div>
            </div>

          </div>
        </div>
      )}

      {/* 6. Mobilization Portal & Transfer Records Tab Pane */}
      {subTab === 'transfers' && (
        <div className="flex-1 flex flex-col space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            
            {/* Mobilization wizard */}
            <div className="bg-white border border-[#abc0d5] p-3 shadow-xs space-y-3 prose-xs text-[11px] font-sans h-fit rounded-xs">
              <div className="sap-header p-1 font-bold text-[var(--color-sap-blue-val)] bg-slate-150 border-[#8c9ba8] border-b text-[10.5px]">
                ⚡ INSTANT MOBILIZATION COMMAND WIZARD
              </div>

              {transferSuccess && (
                <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-2 font-bold rounded-sm text-[10px] leading-snug flex items-center space-x-2">
                  <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
                  <span>{transferSuccess}</span>
                </div>
              )}

              <form className="space-y-3" onSubmit={handlePerformTransfer}>
                <div className="flex flex-col">
                  <label className="font-semibold mb-0.5">1. Select Worker to Mobilize *</label>
                  <SAPSelect
                    className="sap-input text-[11px] p-1 border font-sans"
                    value={transferWorkerId}
                    onChange={e => setTransferWorkerId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Worker --</option>
                    {workers.map(w => {
                      const projName = getProjectName(w.projectId);
                      return (
                        <option key={w.id} value={w.id}>
                          {w.name} ({getCategory(w.designation)} @ {projName})
                        </option>
                      );
                    })}
                  </SAPSelect>
                </div>

                <div className="flex flex-col">
                  <label className="font-semibold mb-0.5">2. Target Destination Project *</label>
                  <SAPSelect
                    className="sap-input text-[11px] p-1 border font-sans"
                    value={transferToProjectId}
                    onChange={e => setTransferToProjectId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Target Project site --</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </SAPSelect>
                </div>

                <div className="flex flex-col">
                  <label className="font-semibold mb-0.5">3. Mobilization Remarks *</label>
                  <input
                    type="text"
                    className="sap-input text-[11px]"
                    placeholder="e.g. Urgent mortar activity support..."
                    value={transferRemarks}
                    onChange={e => setTransferRemarks(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isReadOnly}
                  className="w-full bg-[#0a3563] text-white hover:bg-[#082a50] disabled:bg-gray-400 font-extrabold uppercase py-1.5 text-[10px] rounded border border-[#082a50] flex items-center justify-center space-x-2 shadow-sm cursor-pointer"
                >
                  <RefreshCw size={11} className="animate-pulse" />
                  <span>MOBILIZE TEAM MEMBER NOW</span>
                </button>
              </form>
            </div>

            {/* Transfer Activity log */}
            <div className="bg-white border border-[#bcc5cf] p-2.5 md:col-span-2 space-y-3 rounded-xs flex flex-col">
              <div className="sap-header p-1 font-bold text-[var(--color-sap-blue-val)] bg-slate-150 border-[#bcc5cf] border-b text-[10px] uppercase">
                📋 MOBILIZATION LEDGER HISTORY LOG
              </div>

              <div className="flex-1 overflow-y-auto max-h-96">
                <table className="w-full border-collapse border border-[#bcc5cf] text-[10px]">
                  <thead className="sap-header text-gray-800">
                    <tr>
                      <th className="border border-[#bcc5cf] p-1 text-left">Mobilized Personnel Name</th>
                      <th className="border border-[#bcc5cf] p-1 text-left">From Site Source</th>
                      <th className="border border-[#bcc5cf] p-1 text-left">To Site Destination</th>
                      <th className="border border-[#bcc5cf] p-1 text-center w-20">Mobilized Date</th>
                      <th className="border border-[#bcc5cf] p-1 text-left">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#bcc5cf]">
                    {(workerTransfers || []).slice().reverse().map(t => {
                      const workerName = workers.find(w => w.id === t.workerId)?.name || 'Unknown Worker';
                      return (
                        <tr key={t.id} className="hover:bg-slate-50 border-b border-[#bcc5cf]">
                          <td className="p-1 px-2 font-bold text-slate-800">{workerName}</td>
                          <td className="p-1 text-gray-500 font-semibold">{getProjectName(t.fromProjectId)}</td>
                          <td className="p-1 text-blue-900 font-semibold flex items-center space-x-1">
                            <span className="text-gray-400">→</span> <span>{getProjectName(t.toProjectId)}</span>
                          </td>
                          <td className="p-1 text-center font-mono text-gray-400">{t.transferDate}</td>
                          <td className="p-1 italic text-slate-500 max-w-44 truncate" title={t.remarks}>{t.remarks || '—'}</td>
                        </tr>
                      );
                    })}
                    {(workerTransfers || []).length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-400 italic">No past mobilizations logged.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
