import React, { useState, useEffect, useMemo } from 'react';
import { 
  Save, ArrowLeft, Send, CheckCircle2, Lock, Unlock, Printer, 
  Download, FileSpreadsheet, Eye, Plus, Trash2, RefreshCw, 
  Upload, Image, AlertTriangle, ShieldAlert, History, HelpCircle
} from 'lucide-react';
import { 
  DPRReport, DPRManpowerItem, DPRPlantMachineryItem, DPRWorkExecutedItem,
  DPRMaterialReceivedItem, DPRConcreteItem, DPRSafetyItem, DPRHindranceItem,
  DPRInstructionItem, DPRTomorrowPlanItem, DPRPhotoItem, DPRStatus
} from '../../types/dpr';
import { SAPSelect } from '../SAPSelect';
import { generateDPRPDF, exportDPRExcel } from './DPRPDFGenerator';

interface DPREditorProps {
  report: DPRReport;
  projects: any[];
  currentUser?: { username: string; name?: string; role?: string } | null;
  onSave: (data: DPRReport, bypassLock?: boolean, overrideReason?: string) => Promise<void>;
  onWorkflowChange: (targetStatus: DPRStatus | 'Unlocked', reason?: string) => Promise<void>;
  onBack: () => void;
  onPreviewPDF: () => void;
  onOpenAudit: () => void;
}

export const DPREditor: React.FC<DPREditorProps> = ({
  report,
  projects,
  currentUser,
  onSave,
  onWorkflowChange,
  onBack,
  onPreviewPDF,
  onOpenAudit
}) => {
  // Form State
  const [formData, setFormData] = useState<DPRReport>(report);
  const [activeTab, setActiveTab] = useState<'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'photos'>('A');
  const [isSaving, setIsSaving] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [autofillLoading, setAutofillLoading] = useState(false);

  // Sync when report changes
  useEffect(() => {
    setFormData(report);
  }, [report]);

  const isLockedOrApproved = formData.status === 'Approved' || formData.status === 'Locked';

  // Handle Project Selection & Auto Client Name
  const handleProjectChange = (projId: string) => {
    const proj = projects.find(p => p.id === projId);
    setFormData(prev => ({
      ...prev,
      projectId: projId,
      projectName: proj?.name || projId,
      projectCode: proj?.projectCode || proj?.code || `PRJ-${projId.toUpperCase().substring(0, 6)}`,
      clientName: proj?.clientName || prev.clientName || 'Project Client'
    }));
  };

  // Autofill from real ERP modules (Attendance/Workers, Equipment Assets, Material Purchases)
  const handleAutofillFromERP = async () => {
    if (!formData.projectId || formData.projectId === 'All') {
      alert("Please select a valid Project first.");
      return;
    }
    setAutofillLoading(true);
    try {
      const res = await fetch(`/api/dpr/autofill/${formData.projectId}?date=${formData.date}`);
      if (res.ok) {
        const json = await res.json();
        setFormData(prev => ({
          ...prev,
          manpower: (json.manpower && json.manpower.length > 0) ? json.manpower : prev.manpower,
          plantMachinery: (json.plantMachinery && json.plantMachinery.length > 0) ? json.plantMachinery : prev.plantMachinery,
          materialReceived: (json.materials && json.materials.length > 0) ? json.materials : prev.materialReceived
        }));
        alert("ERP modules queried: Manpower, Plant & Material data synchronized successfully!");
      }
    } catch (err) {
      console.error(err);
      alert("Error querying ERP modules for autofill.");
    } finally {
      setAutofillLoading(false);
    }
  };

  // Section A: Manpower Handlers
  const addManpowerRow = () => {
    setFormData(prev => ({
      ...prev,
      manpower: [
        ...prev.manpower,
        {
          sNo: prev.manpower.length + 1,
          trade: 'General Mason',
          skilled: 2,
          semiSkilled: 1,
          unskilled: 2,
          total: 5,
          agency: 'SN Enterprises',
          remarks: ''
        }
      ]
    }));
  };

  const updateManpowerRow = (idx: number, field: keyof DPRManpowerItem, val: any) => {
    setFormData(prev => {
      const updated = [...prev.manpower];
      const item = { ...updated[idx], [field]: val };
      item.total = Number(item.skilled || 0) + Number(item.semiSkilled || 0) + Number(item.unskilled || 0);
      updated[idx] = item;
      return { ...prev, manpower: updated };
    });
  };

  const removeManpowerRow = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      manpower: prev.manpower.filter((_, i) => i !== idx).map((m, i) => ({ ...m, sNo: i + 1 }))
    }));
  };

  // Section B: Plant Handlers
  const addPlantRow = () => {
    setFormData(prev => ({
      ...prev,
      plantMachinery: [
        ...prev.plantMachinery,
        {
          sNo: prev.plantMachinery.length + 1,
          equipment: 'Excavator / JCB',
          nos: 1,
          hoursRun: 8,
          idleHours: 1,
          fuelLtr: 20,
          remarks: 'Operational',
          ownedOrHired: 'Owned'
        }
      ]
    }));
  };

  const updatePlantRow = (idx: number, field: keyof DPRPlantMachineryItem, val: any) => {
    setFormData(prev => {
      const updated = [...prev.plantMachinery];
      updated[idx] = { ...updated[idx], [field]: val };
      return { ...prev, plantMachinery: updated };
    });
  };

  const removePlantRow = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      plantMachinery: prev.plantMachinery.filter((_, i) => i !== idx).map((p, i) => ({ ...p, sNo: i + 1 }))
    }));
  };

  // Section C: Work Executed Handlers
  const addWorkRow = () => {
    setFormData(prev => ({
      ...prev,
      workExecuted: [
        ...prev.workExecuted,
        {
          sNo: prev.workExecuted.length + 1,
          location: 'Floor 1, Grid A-D',
          activity: 'Column Concreting',
          unit: 'cum',
          quantity: 12.5,
          cumulative: 45.0,
          drawingRef: 'DWG-C-101',
          remarks: 'As per approved RFI'
        }
      ]
    }));
  };

  const updateWorkRow = (idx: number, field: keyof DPRWorkExecutedItem, val: any) => {
    setFormData(prev => {
      const updated = [...prev.workExecuted];
      updated[idx] = { ...updated[idx], [field]: val };
      return { ...prev, workExecuted: updated };
    });
  };

  const removeWorkRow = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      workExecuted: prev.workExecuted.filter((_, i) => i !== idx).map((w, i) => ({ ...w, sNo: i + 1 }))
    }));
  };

  // Section D: Material Received Handlers
  const addMaterialRow = () => {
    setFormData(prev => ({
      ...prev,
      materialReceived: [
        ...prev.materialReceived,
        {
          sNo: prev.materialReceived.length + 1,
          material: 'OPC 53 Grade Cement',
          unit: 'Bags',
          quantity: 200,
          challanNo: 'CH-49021',
          supplier: 'UltraTech Cement',
          testCertificateReceived: 'Yes',
          remarks: 'Stored in covered shed'
        }
      ]
    }));
  };

  const updateMaterialRow = (idx: number, field: keyof DPRMaterialReceivedItem, val: any) => {
    setFormData(prev => {
      const updated = [...prev.materialReceived];
      updated[idx] = { ...updated[idx], [field]: val };
      return { ...prev, materialReceived: updated };
    });
  };

  const removeMaterialRow = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      materialReceived: prev.materialReceived.filter((_, i) => i !== idx).map((m, i) => ({ ...m, sNo: i + 1 }))
    }));
  };

  // Section E: Concrete Handlers
  const addConcreteRow = () => {
    setFormData(prev => ({
      ...prev,
      concrete: [
        ...prev.concrete,
        {
          sNo: prev.concrete.length + 1,
          memberLocation: 'Columns C1-C8 (Ground Floor)',
          grade: 'M25',
          volume: 14.5,
          slump: 110,
          cubesCast: 6,
          startFinishTime: '10:00 AM - 02:30 PM',
          remarks: 'Vibrated thoroughly'
        }
      ]
    }));
  };

  const updateConcreteRow = (idx: number, field: keyof DPRConcreteItem, val: any) => {
    setFormData(prev => {
      const updated = [...prev.concrete];
      updated[idx] = { ...updated[idx], [field]: val };
      return { ...prev, concrete: updated };
    });
  };

  const removeConcreteRow = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      concrete: prev.concrete.filter((_, i) => i !== idx).map((c, i) => ({ ...c, sNo: i + 1 }))
    }));
  };

  // Section F: Safety Handlers
  const addSafetyRow = () => {
    setFormData(prev => ({
      ...prev,
      safety: [
        ...prev.safety,
        {
          id: `saf-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          time: '08:30 AM',
          category: 'Toolbox Talk',
          observation: 'Conducted briefing on safe scaffolding erection & fall arrestor usage.',
          actionTaken: 'Attendance signed by all 24 workmen.',
          responsiblePerson: 'Safety Officer',
          status: 'Closed'
        }
      ]
    }));
  };

  const updateSafetyRow = (idx: number, field: keyof DPRSafetyItem, val: any) => {
    setFormData(prev => {
      const updated = [...prev.safety];
      updated[idx] = { ...updated[idx], [field]: val };
      return { ...prev, safety: updated };
    });
  };

  const removeSafetyRow = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      safety: prev.safety.filter((_, i) => i !== idx)
    }));
  };

  // Section G: Hindrances Handlers
  const addHindranceRow = () => {
    setFormData(prev => ({
      ...prev,
      hindrances: [
        ...prev.hindrances,
        {
          id: `hin-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          time: '11:00 AM',
          issue: 'Temporary power shutdown from municipal feeder',
          location: 'Main Batching / Mixer Yard',
          timeLost: '1.5 hrs',
          manpowerAffected: 8,
          actionTaken: 'Switched to 125 kVA backup DG set',
          personInformed: 'Client Resident Engineer',
          timeInformed: '11:15 AM',
          status: 'Resolved',
          rfiRef: 'RFI-POW-03'
        }
      ]
    }));
  };

  const updateHindranceRow = (idx: number, field: keyof DPRHindranceItem, val: any) => {
    setFormData(prev => {
      const updated = [...prev.hindrances];
      updated[idx] = { ...updated[idx], [field]: val };
      return { ...prev, hindrances: updated };
    });
  };

  const removeHindranceRow = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      hindrances: prev.hindrances.filter((_, i) => i !== idx)
    }));
  };

  // Section H: Instructions Handlers
  const addInstructionRow = () => {
    setFormData(prev => ({
      ...prev,
      instructions: [
        ...prev.instructions,
        {
          id: `ins-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          dateTime: `${formData.date} 14:00`,
          from: 'Client Consultant / PMC',
          instruction: 'Ensure 14 days water ponding curing for freshly cast slab panel S3.',
          location: 'Tower A 2nd Floor',
          actionRequired: 'Ponding bunds to be formed with mortar today evening.',
          responsiblePerson: 'Site Incharge',
          dueDate: formData.date,
          status: 'Complied'
        }
      ]
    }));
  };

  const updateInstructionRow = (idx: number, field: keyof DPRInstructionItem, val: any) => {
    setFormData(prev => {
      const updated = [...prev.instructions];
      updated[idx] = { ...updated[idx], [field]: val };
      return { ...prev, instructions: updated };
    });
  };

  const removeInstructionRow = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      instructions: prev.instructions.filter((_, i) => i !== idx)
    }));
  };

  // Section I: Tomorrow Plan Handlers
  const addTomorrowRow = () => {
    setFormData(prev => ({
      ...prev,
      tomorrowPlan: [
        ...prev.tomorrowPlan,
        {
          sNo: prev.tomorrowPlan.length + 1,
          location: 'Tower B Ground Floor',
          plannedActivity: 'Shuttering & staging for beam bottoms',
          unit: 'sqm',
          plannedQuantity: 65,
          drawingRef: 'DWG-ST-201',
          remarks: 'Plywood & props staged'
        }
      ]
    }));
  };

  const updateTomorrowRow = (idx: number, field: keyof DPRTomorrowPlanItem, val: any) => {
    setFormData(prev => {
      const updated = [...prev.tomorrowPlan];
      updated[idx] = { ...updated[idx], [field]: val };
      return { ...prev, tomorrowPlan: updated };
    });
  };

  const removeTomorrowRow = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      tomorrowPlan: prev.tomorrowPlan.filter((_, i) => i !== idx).map((t, i) => ({ ...t, sNo: i + 1 }))
    }));
  };

  // Photo Upload Handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const dataUrl = uploadEvent.target?.result as string;
        setFormData(prev => ({
          ...prev,
          photos: [
            ...(prev.photos || []),
            {
              id: `pho-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
              caption: file.name.replace(/\.[^/.]+$/, ""),
              location: 'Site Location',
              dateTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              dataUrl
            }
          ]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      photos: (prev.photos || []).filter((_, i) => i !== idx)
    }));
  };

  // Handle Save
  const handleSaveClick = async () => {
    if (isLockedOrApproved) {
      setShowOverrideModal(true);
      return;
    }
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmOverrideSave = async () => {
    if (!overrideReason.trim()) {
      alert("Please provide an authorized override reason.");
      return;
    }
    setIsSaving(true);
    try {
      await onSave(formData, true, overrideReason);
      setShowOverrideModal(false);
      setOverrideReason('');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-2 text-[11px] pb-12 font-sans text-gray-800">

      {/* SAP Action Strip Toolbar */}
      <div className="bg-white border border-gray-300 rounded px-3 py-1.5 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-1.5">
          <button
            onClick={onBack}
            className="px-2.5 py-1 border border-gray-300 rounded bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold flex items-center space-x-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Register</span>
          </button>

          <button
            onClick={handleSaveClick}
            disabled={isSaving}
            className="px-3 py-1 bg-[#0a6ed1] hover:bg-[#0854a0] text-white rounded font-bold flex items-center space-x-1 shadow-xs transition"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? "Saving..." : (isLockedOrApproved ? "Override & Save" : "Save Changes")}</span>
          </button>

          <button
            onClick={onPreviewPDF}
            className="px-2.5 py-1 bg-white border border-gray-300 hover:bg-blue-50 text-[#0a6ed1] rounded font-bold flex items-center space-x-1 shadow-xs"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>PDF Preview</span>
          </button>

          <button
            onClick={() => {
              const doc = generateDPRPDF(formData);
              const safeReportNo = (formData.reportNo || 'DPR').replace(/[\/\\]/g, '_');
              doc.save(`SN_DPR01_${safeReportNo}_${formData.date}.pdf`);
            }}
            className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold flex items-center space-x-1 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>

          <button
            onClick={() => exportDPRExcel(formData)}
            className="px-2.5 py-1 bg-[#1e7e34] hover:bg-[#155d27] text-white rounded font-bold flex items-center space-x-1 shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={onOpenAudit}
            className="px-2 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50 text-gray-700 flex items-center space-x-1"
          >
            <History className="w-3.5 h-3.5 text-gray-500" />
            <span>Audit Trail</span>
          </button>
        </div>

        {/* Workflow Action Buttons */}
        <div className="flex items-center space-x-1">
          <span className="text-[10px] uppercase font-bold text-gray-400 mr-1">Workflow:</span>
          
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold mr-2 ${
            formData.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
            formData.status === 'Locked' ? 'bg-gray-800 text-white' :
            formData.status === 'Reviewed' ? 'bg-indigo-100 text-indigo-800 border border-indigo-300' :
            formData.status === 'Submitted' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
            'bg-amber-100 text-amber-800 border border-amber-300'
          }`}>
            {formData.status === 'Locked' && <Lock className="w-2.5 h-2.5 inline mr-1" />}
            {formData.status}
          </span>

          {formData.status === 'Draft' && (
            <button
              onClick={() => onWorkflowChange('Submitted')}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded flex items-center space-x-1"
            >
              <Send className="w-3 h-3" />
              <span>Submit for Review</span>
            </button>
          )}

          {formData.status === 'Submitted' && (
            <div className="flex space-x-1">
              <button
                onClick={() => onWorkflowChange('Reviewed')}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded flex items-center space-x-1"
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Mark Reviewed</span>
              </button>
              <button
                onClick={() => onWorkflowChange('Draft', 'Returned to draft by reviewer')}
                className="px-2 py-1 border border-gray-300 text-gray-700 rounded hover:bg-gray-100"
              >
                Return to Draft
              </button>
            </div>
          )}

          {formData.status === 'Reviewed' && (
            <div className="flex space-x-1">
              <button
                onClick={() => onWorkflowChange('Approved')}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded flex items-center space-x-1"
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Approve DPR</span>
              </button>
              <button
                onClick={() => onWorkflowChange('Locked')}
                className="px-2 py-1 bg-gray-800 hover:bg-black text-white font-bold rounded flex items-center space-x-1"
              >
                <Lock className="w-3 h-3" />
                <span>Lock DPR</span>
              </button>
            </div>
          )}

          {formData.status === 'Approved' && (
            <button
              onClick={() => onWorkflowChange('Locked')}
              className="px-2.5 py-1 bg-gray-800 hover:bg-black text-white font-bold rounded flex items-center space-x-1"
            >
              <Lock className="w-3 h-3" />
              <span>Lock DPR</span>
            </button>
          )}

          {formData.status === 'Locked' && (
            <button
              onClick={() => {
                const reason = prompt("Enter administrative reason to UNLOCK this Daily Progress Report:");
                if (reason) onWorkflowChange('Unlocked', reason);
              }}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded flex items-center space-x-1"
            >
              <Unlock className="w-3 h-3" />
              <span>Unlock Report</span>
            </button>
          )}
        </div>
      </div>

      {/* Lock Notice Banner */}
      {isLockedOrApproved && (
        <div className="bg-amber-50 border border-amber-300 rounded p-2 text-amber-900 flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Governance Lock Active:</strong> This Daily Progress Report is officially <strong>{formData.status}</strong>.
              Direct modifications are locked to guarantee regulatory and contract compliance. Saving will require an authorized override reason.
            </span>
          </div>
          <button
            onClick={() => setShowOverrideModal(true)}
            className="px-2 py-0.5 bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold rounded border border-amber-400 text-[10px]"
          >
            Authorize Edit
          </button>
        </div>
      )}

      {/* DPR Header Fields Panel */}
      <div className="bg-white border border-gray-300 rounded p-3 shadow-xs space-y-2">
        <div className="flex items-center justify-between border-b border-gray-200 pb-1.5">
          <div className="flex items-center space-x-2">
            <span className="font-mono font-bold text-xs text-[#0a6ed1] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {formData.reportNo}
            </span>
            <h2 className="font-bold text-xs uppercase tracking-wide text-gray-800">
              Daily Progress Report Header Master
            </h2>
          </div>

          <button
            type="button"
            onClick={handleAutofillFromERP}
            disabled={autofillLoading || isLockedOrApproved}
            className="px-2.5 py-1 bg-blue-50 border border-blue-300 hover:bg-blue-100 text-[#0a6ed1] font-bold rounded flex items-center space-x-1.5 text-[10.5px] disabled:opacity-50"
            title="Auto-fetch manpower from DLR attendance, plant assets, and inward material deliveries"
          >
            <RefreshCw className={`w-3 h-3 ${autofillLoading ? 'animate-spin' : ''}`} />
            <span>{autofillLoading ? "Fetching..." : "Autofill from ERP Modules"}</span>
          </button>
        </div>

        {/* Dense Header Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
          <div>
            <label className="block text-[9.5px] uppercase font-bold text-gray-500 mb-0.5">Project *</label>
            <SAPSelect
              value={formData.projectId}
              onChange={e => handleProjectChange(e.target.value)}
              disabled={isLockedOrApproved}
              className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-[11px] font-semibold"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </SAPSelect>
          </div>

          <div>
            <label className="block text-[9.5px] uppercase font-bold text-gray-500 mb-0.5">Project Code</label>
            <input
              type="text"
              value={formData.projectCode || ''}
              onChange={e => setFormData({ ...formData, projectCode: e.target.value })}
              disabled={isLockedOrApproved}
              className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-[11px] font-mono"
              placeholder="e.g. PRJ-S3ECO"
            />
          </div>

          <div>
            <label className="block text-[9.5px] uppercase font-bold text-gray-500 mb-0.5">Client</label>
            <input
              type="text"
              value={formData.clientName || ''}
              onChange={e => setFormData({ ...formData, clientName: e.target.value })}
              disabled={isLockedOrApproved}
              className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-[11px]"
              placeholder="e.g. S3 Developers Ltd."
            />
          </div>

          <div>
            <label className="block text-[9.5px] uppercase font-bold text-gray-500 mb-0.5">Contractor</label>
            <input
              type="text"
              value={formData.contractorName || 'SN ENTERPRISES'}
              onChange={e => setFormData({ ...formData, contractorName: e.target.value })}
              disabled={isLockedOrApproved}
              className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-[11px] font-semibold"
            />
          </div>

          <div>
            <label className="block text-[9.5px] uppercase font-bold text-gray-500 mb-0.5">Report Date *</label>
            <input
              type="date"
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })}
              disabled={isLockedOrApproved}
              className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-[11px] font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-[9.5px] uppercase font-bold text-gray-500 mb-0.5">Weather</label>
            <SAPSelect
              value={formData.weather || 'Sunny'}
              onChange={e => setFormData({ ...formData, weather: e.target.value })}
              disabled={isLockedOrApproved}
              className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-[11px]"
            >
              <option value="Sunny">Sunny / Clear</option>
              <option value="Cloudy">Cloudy / Overcast</option>
              <option value="Rainy">Rainy / Light Showers</option>
              <option value="Heavy Rain">Heavy Rain (Work Stoppage)</option>
              <option value="Windy">Windy / Dust Storm</option>
              <option value="Extreme Heat">Extreme Heat</option>
            </SAPSelect>
          </div>

          <div>
            <label className="block text-[9.5px] uppercase font-bold text-gray-500 mb-0.5">Working Hours</label>
            <input
              type="text"
              value={formData.workingHours || '08:00 AM - 06:00 PM (10 hrs)'}
              onChange={e => setFormData({ ...formData, workingHours: e.target.value })}
              disabled={isLockedOrApproved}
              className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-[11px]"
              placeholder="e.g. 08:00 AM - 06:00 PM (10 hrs)"
            />
          </div>

          <div>
            <label className="block text-[9.5px] uppercase font-bold text-gray-500 mb-0.5">Prepared By (Site Engineer)</label>
            <input
              type="text"
              value={formData.preparedBy || ''}
              onChange={e => setFormData({ ...formData, preparedBy: e.target.value })}
              disabled={isLockedOrApproved}
              className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-[11px]"
              placeholder="Name of Site Incharge / Engineer"
            />
          </div>
        </div>
      </div>

      {/* Sections Workspace with Tab strip */}
      <div className="bg-white border border-gray-300 rounded shadow-xs overflow-hidden">
        
        {/* Navigation Tabs (ALV Style) */}
        <div className="flex border-b border-gray-200 bg-[#f0f4f8] overflow-x-auto text-[11px] font-bold">
          {[
            { id: 'A', label: 'A. Manpower Deployed', count: formData.manpower?.length },
            { id: 'B', label: 'B. Plant & Machinery', count: formData.plantMachinery?.length },
            { id: 'C', label: 'C. Work Executed Today', count: formData.workExecuted?.length },
            { id: 'D', label: 'D. Material Received', count: formData.materialReceived?.length },
            { id: 'E', label: 'E. Concrete Poured', count: formData.concrete?.length },
            { id: 'F', label: 'F. Safety & Toolbox', count: formData.safety?.length },
            { id: 'G', label: 'G. Delays & Hindrances', count: formData.hindrances?.length },
            { id: 'H', label: 'H. Instructions Received', count: formData.instructions?.length },
            { id: 'I', label: "I. Tomorrow's Plan", count: formData.tomorrowPlan?.length },
            { id: 'photos', label: 'Site Photographs', count: formData.photos?.length || 0 }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-2 border-b-2 whitespace-nowrap transition-colors flex items-center space-x-1.5 ${
                activeTab === tab.id
                  ? 'border-[#0a6ed1] text-[#0a6ed1] bg-white'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100/60'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${
                  activeTab === tab.id ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Viewport */}
        <div className="p-3">

          {/* SECTION A: MANPOWER DEPLOYED */}
          {activeTab === 'A' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-xs">A. Manpower Deployed Today</h3>
                  <p className="text-[10px] text-gray-500">Record all trade categories, skilled, semi-skilled, and agency allocations.</p>
                </div>
                {!isLockedOrApproved && (
                  <button
                    onClick={addManpowerRow}
                    className="px-2 py-0.5 bg-[#0a6ed1] hover:bg-[#0854a0] text-white rounded font-bold text-[10.5px] flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Trade Row</span>
                  </button>
                )}
              </div>

              <div className="border border-gray-300 rounded overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#eef2f6] text-[#0a6ed1] font-bold border-b border-gray-300 text-[10px]">
                      <th className="p-1.5 border-r border-gray-300 w-10 text-center">S.No</th>
                      <th className="p-1.5 border-r border-gray-300 w-52">Trade / Category *</th>
                      <th className="p-1.5 border-r border-gray-300 w-24 text-right">Skilled</th>
                      <th className="p-1.5 border-r border-gray-300 w-24 text-right">Semi-skilled</th>
                      <th className="p-1.5 border-r border-gray-300 w-24 text-right">Unskilled</th>
                      <th className="p-1.5 border-r border-gray-300 w-24 text-right bg-blue-50/50">Total</th>
                      <th className="p-1.5 border-r border-gray-300 w-52">Sub-contractor / Agency</th>
                      <th className="p-1.5 border-r border-gray-300">Remarks</th>
                      {!isLockedOrApproved && <th className="p-1.5 w-10 text-center">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {formData.manpower?.map((m, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="p-1 border-r border-gray-200 text-center font-mono text-gray-500">{idx + 1}</td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="text"
                            value={m.trade}
                            disabled={isLockedOrApproved}
                            onChange={e => updateManpowerRow(idx, 'trade', e.target.value)}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-[11px]"
                            placeholder="e.g. Mason / Carpenter"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="number"
                            min="0"
                            value={m.skilled}
                            disabled={isLockedOrApproved}
                            onChange={e => updateManpowerRow(idx, 'skilled', Number(e.target.value))}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-right font-mono text-[11px]"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="number"
                            min="0"
                            value={m.semiSkilled}
                            disabled={isLockedOrApproved}
                            onChange={e => updateManpowerRow(idx, 'semiSkilled', Number(e.target.value))}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-right font-mono text-[11px]"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="number"
                            min="0"
                            value={m.unskilled}
                            disabled={isLockedOrApproved}
                            onChange={e => updateManpowerRow(idx, 'unskilled', Number(e.target.value))}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-right font-mono text-[11px]"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200 text-right font-mono font-bold text-gray-800 bg-blue-50/30 px-2">
                          {Number(m.skilled || 0) + Number(m.semiSkilled || 0) + Number(m.unskilled || 0)}
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="text"
                            value={m.agency}
                            disabled={isLockedOrApproved}
                            onChange={e => updateManpowerRow(idx, 'agency', e.target.value)}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-[11px]"
                            placeholder="e.g. SN Enterprises"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="text"
                            value={m.remarks || ''}
                            disabled={isLockedOrApproved}
                            onChange={e => updateManpowerRow(idx, 'remarks', e.target.value)}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-[11px]"
                          />
                        </td>
                        {!isLockedOrApproved && (
                          <td className="p-1 text-center">
                            <button
                              onClick={() => removeManpowerRow(idx)}
                              className="text-rose-500 hover:text-rose-700 p-0.5"
                              title="Delete row"
                            >
                              <Trash2 className="w-3.5 h-3.5 mx-auto" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#f0f4f8] font-bold text-[10.5px] border-t border-gray-300">
                      <td colSpan={2} className="p-1.5 text-right uppercase border-r border-gray-300">Grand Total:</td>
                      <td className="p-1.5 text-right font-mono border-r border-gray-300">
                        {formData.manpower?.reduce((s, m) => s + Number(m.skilled || 0), 0) || 0}
                      </td>
                      <td className="p-1.5 text-right font-mono border-r border-gray-300">
                        {formData.manpower?.reduce((s, m) => s + Number(m.semiSkilled || 0), 0) || 0}
                      </td>
                      <td className="p-1.5 text-right font-mono border-r border-gray-300">
                        {formData.manpower?.reduce((s, m) => s + Number(m.unskilled || 0), 0) || 0}
                      </td>
                      <td className="p-1.5 text-right font-mono text-blue-900 font-black border-r border-gray-300 bg-blue-100/60">
                        {formData.manpower?.reduce((s, m) => s + Number(m.skilled || 0) + Number(m.semiSkilled || 0) + Number(m.unskilled || 0), 0) || 0}
                      </td>
                      <td colSpan={isLockedOrApproved ? 2 : 3} className="p-1.5 text-gray-500 font-normal">
                        Total workmen mobilized across site.
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* SECTION B: PLANT & MACHINERY */}
          {activeTab === 'B' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-xs">B. Plant & Machinery Deployed</h3>
                  <p className="text-[10px] text-gray-500">Track hours run, idle hours, fuel consumption, and operational state.</p>
                </div>
                {!isLockedOrApproved && (
                  <button
                    onClick={addPlantRow}
                    className="px-2 py-0.5 bg-[#0a6ed1] hover:bg-[#0854a0] text-white rounded font-bold text-[10.5px] flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Equipment</span>
                  </button>
                )}
              </div>

              <div className="border border-gray-300 rounded overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#eef2f6] text-[#0a6ed1] font-bold border-b border-gray-300 text-[10px]">
                      <th className="p-1.5 border-r border-gray-300 w-10 text-center">S.No</th>
                      <th className="p-1.5 border-r border-gray-300 w-56">Equipment *</th>
                      <th className="p-1.5 border-r border-gray-300 w-16 text-center">Nos</th>
                      <th className="p-1.5 border-r border-gray-300 w-24 text-right">Hours Run</th>
                      <th className="p-1.5 border-r border-gray-300 w-24 text-right">Idle Hours</th>
                      <th className="p-1.5 border-r border-gray-300 w-24 text-right">Fuel (Ltr)</th>
                      <th className="p-1.5 border-r border-gray-300">Breakdown / Remarks</th>
                      <th className="p-1.5 border-r border-gray-300 w-28">Owned / Hired</th>
                      {!isLockedOrApproved && <th className="p-1.5 w-10 text-center">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {formData.plantMachinery?.map((p, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="p-1 border-r border-gray-200 text-center font-mono text-gray-500">{idx + 1}</td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="text"
                            value={p.equipment}
                            disabled={isLockedOrApproved}
                            onChange={e => updatePlantRow(idx, 'equipment', e.target.value)}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-[11px]"
                            placeholder="e.g. Tower Crane / Batching Plant"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="number"
                            min="1"
                            value={p.nos}
                            disabled={isLockedOrApproved}
                            onChange={e => updatePlantRow(idx, 'nos', Number(e.target.value))}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-center font-mono text-[11px]"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="number"
                            step="0.5"
                            value={p.hoursRun}
                            disabled={isLockedOrApproved}
                            onChange={e => updatePlantRow(idx, 'hoursRun', Number(e.target.value))}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-right font-mono text-[11px]"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="number"
                            step="0.5"
                            value={p.idleHours}
                            disabled={isLockedOrApproved}
                            onChange={e => updatePlantRow(idx, 'idleHours', Number(e.target.value))}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-right font-mono text-[11px]"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="number"
                            step="0.1"
                            value={p.fuelLtr}
                            disabled={isLockedOrApproved}
                            onChange={e => updatePlantRow(idx, 'fuelLtr', Number(e.target.value))}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-right font-mono text-[11px]"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="text"
                            value={p.remarks || ''}
                            disabled={isLockedOrApproved}
                            onChange={e => updatePlantRow(idx, 'remarks', e.target.value)}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-[11px]"
                            placeholder="Operational notes / breakdown"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <SAPSelect
                            value={p.ownedOrHired}
                            disabled={isLockedOrApproved}
                            onChange={e => updatePlantRow(idx, 'ownedOrHired', e.target.value as any)}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-[11px]"
                          >
                            <option value="Owned">Owned</option>
                            <option value="Hired">Hired / Rented</option>
                          </SAPSelect>
                        </td>
                        {!isLockedOrApproved && (
                          <td className="p-1 text-center">
                            <button
                              onClick={() => removePlantRow(idx)}
                              className="text-rose-500 hover:text-rose-700 p-0.5"
                            >
                              <Trash2 className="w-3.5 h-3.5 mx-auto" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION C: WORK EXECUTED TODAY */}
          {activeTab === 'C' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-xs">C. Work Executed Today</h3>
                  <p className="text-[10px] text-gray-500">Document physical construction quantities, location grids, and cumulative figures.</p>
                </div>
                {!isLockedOrApproved && (
                  <button
                    onClick={addWorkRow}
                    className="px-2 py-0.5 bg-[#0a6ed1] hover:bg-[#0854a0] text-white rounded font-bold text-[10.5px] flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Executed Work</span>
                  </button>
                )}
              </div>

              <div className="border border-gray-300 rounded overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#eef2f6] text-[#0a6ed1] font-bold border-b border-gray-300 text-[10px]">
                      <th className="p-1.5 border-r border-gray-300 w-10 text-center">S.No</th>
                      <th className="p-1.5 border-r border-gray-300 w-44">Location / Grid / Floor *</th>
                      <th className="p-1.5 border-r border-gray-300 w-52">Activity Description *</th>
                      <th className="p-1.5 border-r border-gray-300 w-16 text-center">Unit</th>
                      <th className="p-1.5 border-r border-gray-300 w-24 text-right">Today Qty</th>
                      <th className="p-1.5 border-r border-gray-300 w-24 text-right">Cumulative</th>
                      <th className="p-1.5 border-r border-gray-300 w-36">Drawing Reference</th>
                      <th className="p-1.5 border-r border-gray-300">Remarks</th>
                      {!isLockedOrApproved && <th className="p-1.5 w-10 text-center">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {formData.workExecuted?.map((w, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="p-1 border-r border-gray-200 text-center font-mono text-gray-500">{idx + 1}</td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="text"
                            value={w.location}
                            disabled={isLockedOrApproved}
                            onChange={e => updateWorkRow(idx, 'location', e.target.value)}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-[11px]"
                            placeholder="e.g. Tower A - 3rd Floor Slab"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="text"
                            value={w.activity}
                            disabled={isLockedOrApproved}
                            onChange={e => updateWorkRow(idx, 'activity', e.target.value)}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-[11px]"
                            placeholder="e.g. Rebar tying & shuttering"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="text"
                            value={w.unit}
                            disabled={isLockedOrApproved}
                            onChange={e => updateWorkRow(idx, 'unit', e.target.value)}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-center font-mono text-[11px]"
                            placeholder="sqm / cum / MT"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="number"
                            step="any"
                            value={w.quantity}
                            disabled={isLockedOrApproved}
                            onChange={e => updateWorkRow(idx, 'quantity', Number(e.target.value))}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-right font-mono font-bold text-[11px]"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="number"
                            step="any"
                            value={w.cumulative}
                            disabled={isLockedOrApproved}
                            onChange={e => updateWorkRow(idx, 'cumulative', Number(e.target.value))}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-right font-mono text-[11px]"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="text"
                            value={w.drawingRef || ''}
                            disabled={isLockedOrApproved}
                            onChange={e => updateWorkRow(idx, 'drawingRef', e.target.value)}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-[11px]"
                            placeholder="DWG-STR-302"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="text"
                            value={w.remarks || ''}
                            disabled={isLockedOrApproved}
                            onChange={e => updateWorkRow(idx, 'remarks', e.target.value)}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-[11px]"
                          />
                        </td>
                        {!isLockedOrApproved && (
                          <td className="p-1 text-center">
                            <button
                              onClick={() => removeWorkRow(idx)}
                              className="text-rose-500 hover:text-rose-700 p-0.5"
                            >
                              <Trash2 className="w-3.5 h-3.5 mx-auto" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION D: MATERIAL RECEIVED TODAY */}
          {activeTab === 'D' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-xs">D. Material Received Today</h3>
                  <p className="text-[10px] text-gray-500">Record all site inward deliveries, delivery challans, and mill test certificates.</p>
                </div>
                {!isLockedOrApproved && (
                  <button
                    onClick={addMaterialRow}
                    className="px-2 py-0.5 bg-[#0a6ed1] hover:bg-[#0854a0] text-white rounded font-bold text-[10.5px] flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Delivery</span>
                  </button>
                )}
              </div>

              <div className="border border-gray-300 rounded overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#eef2f6] text-[#0a6ed1] font-bold border-b border-gray-300 text-[10px]">
                      <th className="p-1.5 border-r border-gray-300 w-10 text-center">S.No</th>
                      <th className="p-1.5 border-r border-gray-300 w-52">Material Description *</th>
                      <th className="p-1.5 border-r border-gray-300 w-16 text-center">Unit</th>
                      <th className="p-1.5 border-r border-gray-300 w-24 text-right">Quantity</th>
                      <th className="p-1.5 border-r border-gray-300 w-32">Challan / Inv No.</th>
                      <th className="p-1.5 border-r border-gray-300 w-44">Supplier</th>
                      <th className="p-1.5 border-r border-gray-300 w-28 text-center">Test Cert. Recd?</th>
                      <th className="p-1.5 border-r border-gray-300">Remarks</th>
                      {!isLockedOrApproved && <th className="p-1.5 w-10 text-center">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {formData.materialReceived?.map((m, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="p-1 border-r border-gray-200 text-center font-mono text-gray-500">{idx + 1}</td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="text"
                            value={m.material}
                            disabled={isLockedOrApproved}
                            onChange={e => updateMaterialRow(idx, 'material', e.target.value)}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-[11px]"
                            placeholder="e.g. TMT Steel 16mm Fe500D"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="text"
                            value={m.unit}
                            disabled={isLockedOrApproved}
                            onChange={e => updateMaterialRow(idx, 'unit', e.target.value)}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-center font-mono text-[11px]"
                            placeholder="MT / Bags / Brass"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="number"
                            step="any"
                            value={m.quantity}
                            disabled={isLockedOrApproved}
                            onChange={e => updateMaterialRow(idx, 'quantity', Number(e.target.value))}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-right font-mono font-bold text-[11px]"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="text"
                            value={m.challanNo}
                            disabled={isLockedOrApproved}
                            onChange={e => updateMaterialRow(idx, 'challanNo', e.target.value)}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-[11px] font-mono"
                            placeholder="CH-10928"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="text"
                            value={m.supplier}
                            disabled={isLockedOrApproved}
                            onChange={e => updateMaterialRow(idx, 'supplier', e.target.value)}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-[11px]"
                            placeholder="Vendor Name"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <SAPSelect
                            value={m.testCertificateReceived}
                            disabled={isLockedOrApproved}
                            onChange={e => updateMaterialRow(idx, 'testCertificateReceived', e.target.value as any)}
                            className="w-full border border-gray-200 rounded px-1 py-0.5 text-[11px]"
                          >
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                            <option value="NA">NA</option>
                          </SAPSelect>
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="text"
                            value={m.remarks || ''}
                            disabled={isLockedOrApproved}
                            onChange={e => updateMaterialRow(idx, 'remarks', e.target.value)}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-[11px]"
                          />
                        </td>
                        {!isLockedOrApproved && (
                          <td className="p-1 text-center">
                            <button
                              onClick={() => removeMaterialRow(idx)}
                              className="text-rose-500 hover:text-rose-700 p-0.5"
                            >
                              <Trash2 className="w-3.5 h-3.5 mx-auto" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION E: CONCRETE POURED TODAY */}
          {activeTab === 'E' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-xs">E. Concrete Poured Today</h3>
                  <p className="text-[10px] text-gray-500">Record mix design grade, cubic meters poured, slump tests, and test cube samples cast.</p>
                </div>
                {!isLockedOrApproved && (
                  <button
                    onClick={addConcreteRow}
                    className="px-2 py-0.5 bg-[#0a6ed1] hover:bg-[#0854a0] text-white rounded font-bold text-[10.5px] flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Pouring Record</span>
                  </button>
                )}
              </div>

              <div className="border border-gray-300 rounded overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#eef2f6] text-[#0a6ed1] font-bold border-b border-gray-300 text-[10px]">
                      <th className="p-1.5 border-r border-gray-300 w-10 text-center">S.No</th>
                      <th className="p-1.5 border-r border-gray-300 w-52">Member / Location *</th>
                      <th className="p-1.5 border-r border-gray-300 w-24">Grade</th>
                      <th className="p-1.5 border-r border-gray-300 w-28 text-right bg-blue-50/50">Volume (cum) *</th>
                      <th className="p-1.5 border-r border-gray-300 w-24 text-right">Slump (mm)</th>
                      <th className="p-1.5 border-r border-gray-300 w-24 text-right">Cubes Cast</th>
                      <th className="p-1.5 border-r border-gray-300 w-40">Start & Finish Time</th>
                      <th className="p-1.5 border-r border-gray-300">Remarks</th>
                      {!isLockedOrApproved && <th className="p-1.5 w-10 text-center">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {formData.concrete?.map((c, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="p-1 border-r border-gray-200 text-center font-mono text-gray-500">{idx + 1}</td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="text"
                            value={c.memberLocation}
                            disabled={isLockedOrApproved}
                            onChange={e => updateConcreteRow(idx, 'memberLocation', e.target.value)}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-[11px]"
                            placeholder="e.g. Raft slab Grid C2-F8"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="text"
                            value={c.grade}
                            disabled={isLockedOrApproved}
                            onChange={e => updateConcreteRow(idx, 'grade', e.target.value)}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-center font-mono font-bold text-[11px]"
                            placeholder="M25 / M30 / M40"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200 bg-blue-50/20">
                          <input
                            type="number"
                            step="any"
                            value={c.volume}
                            disabled={isLockedOrApproved}
                            onChange={e => updateConcreteRow(idx, 'volume', Number(e.target.value))}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-right font-mono font-bold text-[11px]"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="number"
                            value={c.slump}
                            disabled={isLockedOrApproved}
                            onChange={e => updateConcreteRow(idx, 'slump', Number(e.target.value))}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-right font-mono text-[11px]"
                            placeholder="120"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="number"
                            value={c.cubesCast}
                            disabled={isLockedOrApproved}
                            onChange={e => updateConcreteRow(idx, 'cubesCast', Number(e.target.value))}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-right font-mono text-[11px]"
                            placeholder="6"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="text"
                            value={c.startFinishTime || ''}
                            disabled={isLockedOrApproved}
                            onChange={e => updateConcreteRow(idx, 'startFinishTime', e.target.value)}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-[11px]"
                            placeholder="11:00 AM - 04:30 PM"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="text"
                            value={c.remarks || ''}
                            disabled={isLockedOrApproved}
                            onChange={e => updateConcreteRow(idx, 'remarks', e.target.value)}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-[11px]"
                          />
                        </td>
                        {!isLockedOrApproved && (
                          <td className="p-1 text-center">
                            <button
                              onClick={() => removeConcreteRow(idx)}
                              className="text-rose-500 hover:text-rose-700 p-0.5"
                            >
                              <Trash2 className="w-3.5 h-3.5 mx-auto" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#f0f4f8] font-bold text-[10.5px] border-t border-gray-300">
                      <td colSpan={3} className="p-1.5 text-right uppercase border-r border-gray-300">Total Concrete Volume:</td>
                      <td className="p-1.5 text-right font-mono text-indigo-900 font-black border-r border-gray-300 bg-indigo-50">
                        {(formData.concrete?.reduce((s, c) => s + Number(c.volume || 0), 0) || 0).toFixed(2)} m³
                      </td>
                      <td colSpan={isLockedOrApproved ? 4 : 5} className="p-1.5 text-gray-500 font-normal">
                        Total concrete poured across all members today.
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* SECTION F: SAFETY OBSERVATIONS & TOOLBOX TALK */}
          {activeTab === 'F' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-xs">F. Safety Observations, Incidents and Toolbox Talk</h3>
                  <p className="text-[10px] text-gray-500">Record morning safety meetings, PPE adherence, hazard rectification, and incident details.</p>
                </div>
                {!isLockedOrApproved && (
                  <button
                    onClick={addSafetyRow}
                    className="px-2 py-0.5 bg-[#0a6ed1] hover:bg-[#0854a0] text-white rounded font-bold text-[10.5px] flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Safety Entry</span>
                  </button>
                )}
              </div>

              <div className="border border-gray-300 rounded overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#eef2f6] text-[#0a6ed1] font-bold border-b border-gray-300 text-[10px]">
                      <th className="p-1.5 border-r border-gray-300 w-24">Time</th>
                      <th className="p-1.5 border-r border-gray-300 w-36">Category</th>
                      <th className="p-1.5 border-r border-gray-300">Observation / Incident *</th>
                      <th className="p-1.5 border-r border-gray-300">Action Taken</th>
                      <th className="p-1.5 border-r border-gray-300 w-36">Responsible Person</th>
                      <th className="p-1.5 border-r border-gray-300 w-28 text-center">Status</th>
                      {!isLockedOrApproved && <th className="p-1.5 w-10 text-center">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {formData.safety?.map((s, idx) => (
                      <tr key={s.id || idx} className="hover:bg-gray-50">
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="text"
                            value={s.time}
                            disabled={isLockedOrApproved}
                            onChange={e => updateSafetyRow(idx, 'time', e.target.value)}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-center font-mono text-[11px]"
                            placeholder="08:15 AM"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <SAPSelect
                            value={s.category}
                            disabled={isLockedOrApproved}
                            onChange={e => updateSafetyRow(idx, 'category', e.target.value as any)}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-[11px] font-semibold"
                          >
                            <option value="Toolbox Talk">Toolbox Talk</option>
                            <option value="PPE Compliance">PPE Compliance</option>
                            <option value="Unsafe Condition">Unsafe Condition</option>
                            <option value="Unsafe Act">Unsafe Act</option>
                            <option value="Near Miss">Near Miss</option>
                            <option value="First Aid">First Aid</option>
                            <option value="Incident">Incident</option>
                            <option value="Good Practice">Good Practice</option>
                          </SAPSelect>
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="text"
                            value={s.observation}
                            disabled={isLockedOrApproved}
                            onChange={e => updateSafetyRow(idx, 'observation', e.target.value)}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-[11px]"
                            placeholder="Detailed description"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="text"
                            value={s.actionTaken}
                            disabled={isLockedOrApproved}
                            onChange={e => updateSafetyRow(idx, 'actionTaken', e.target.value)}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-[11px]"
                            placeholder="Remedial action taken"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="text"
                            value={s.responsiblePerson}
                            disabled={isLockedOrApproved}
                            onChange={e => updateSafetyRow(idx, 'responsiblePerson', e.target.value)}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-[11px]"
                            placeholder="Officer name"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <SAPSelect
                            value={s.status}
                            disabled={isLockedOrApproved}
                            onChange={e => updateSafetyRow(idx, 'status', e.target.value as any)}
                            className="w-full border border-gray-200 rounded px-1 py-0.5 text-[11px]"
                          >
                            <option value="Open">Open</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Rectified">Rectified</option>
                            <option value="Closed">Closed</option>
                          </SAPSelect>
                        </td>
                        {!isLockedOrApproved && (
                          <td className="p-1 text-center">
                            <button
                              onClick={() => removeSafetyRow(idx)}
                              className="text-rose-500 hover:text-rose-700 p-0.5"
                            >
                              <Trash2 className="w-3.5 h-3.5 mx-auto" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION G: DELAYS, HINDRANCES & ISSUES */}
          {activeTab === 'G' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-xs">G. Delays, Hindrances and Issues Requiring Decision</h3>
                  <p className="text-[10px] text-gray-500">Record contract hindrances, drawing hold-ups, site access blocks, and time loss for claims.</p>
                </div>
                {!isLockedOrApproved && (
                  <button
                    onClick={addHindranceRow}
                    className="px-2 py-0.5 bg-[#0a6ed1] hover:bg-[#0854a0] text-white rounded font-bold text-[10.5px] flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Hindrance</span>
                  </button>
                )}
              </div>

              <div className="border border-gray-300 rounded overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#eef2f6] text-[#0a6ed1] font-bold border-b border-gray-300 text-[10px]">
                      <th className="p-1.5 border-r border-gray-300 w-20">Time</th>
                      <th className="p-1.5 border-r border-gray-300 w-44">Issue / Hindrance *</th>
                      <th className="p-1.5 border-r border-gray-300 w-32">Location</th>
                      <th className="p-1.5 border-r border-gray-300 w-20 text-center">Time Lost</th>
                      <th className="p-1.5 border-r border-gray-300 w-16 text-center">Men Aff.</th>
                      <th className="p-1.5 border-r border-gray-300">Action Taken</th>
                      <th className="p-1.5 border-r border-gray-300 w-36">Person & Time Informed</th>
                      <th className="p-1.5 border-r border-gray-300 w-24 text-center">Status</th>
                      <th className="p-1.5 border-r border-gray-300 w-24">RFI / Ref</th>
                      {!isLockedOrApproved && <th className="p-1.5 w-10 text-center">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {formData.hindrances?.map((h, idx) => (
                      <tr key={h.id || idx} className="hover:bg-gray-50">
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="text"
                            value={h.time}
                            disabled={isLockedOrApproved}
                            onChange={e => updateHindranceRow(idx, 'time', e.target.value)}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-center font-mono text-[11px]"
                            placeholder="10:30 AM"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="text"
                            value={h.issue}
                            disabled={isLockedOrApproved}
                            onChange={e => updateHindranceRow(idx, 'issue', e.target.value)}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-[11px]"
                            placeholder="e.g. Drawing revision pending"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="text"
                            value={h.location}
                            disabled={isLockedOrApproved}
                            onChange={e => updateHindranceRow(idx, 'location', e.target.value)}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-[11px]"
                            placeholder="Grid D5"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="text"
                            value={h.timeLost}
                            disabled={isLockedOrApproved}
                            onChange={e => updateHindranceRow(idx, 'timeLost', e.target.value)}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-center font-mono text-[11px]"
                            placeholder="2 hrs"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="number"
                            value={h.manpowerAffected}
                            disabled={isLockedOrApproved}
                            onChange={e => updateHindranceRow(idx, 'manpowerAffected', Number(e.target.value))}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-center font-mono text-[11px]"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="text"
                            value={h.actionTaken}
                            disabled={isLockedOrApproved}
                            onChange={e => updateHindranceRow(idx, 'actionTaken', e.target.value)}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-[11px]"
                            placeholder="Mitigation action"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="text"
                            value={`${h.personInformed || ''}${h.timeInformed ? ' @ ' + h.timeInformed : ''}`}
                            disabled={isLockedOrApproved}
                            onChange={e => {
                              const val = e.target.value;
                              updateHindranceRow(idx, 'personInformed', val);
                            }}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-[11px]"
                            placeholder="PMC Engineer @ 11:30"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <SAPSelect
                            value={h.status}
                            disabled={isLockedOrApproved}
                            onChange={e => updateHindranceRow(idx, 'status', e.target.value as any)}
                            className="w-full border border-gray-200 rounded px-1 py-0.5 text-[11px]"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Under Review">Under Review</option>
                            <option value="Resolved">Resolved</option>
                            <option value="Escalated">Escalated</option>
                          </SAPSelect>
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="text"
                            value={h.rfiRef || ''}
                            disabled={isLockedOrApproved}
                            onChange={e => updateHindranceRow(idx, 'rfiRef', e.target.value)}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-[11px]"
                            placeholder="RFI-049"
                          />
                        </td>
                        {!isLockedOrApproved && (
                          <td className="p-1 text-center">
                            <button
                              onClick={() => removeHindranceRow(idx)}
                              className="text-rose-500 hover:text-rose-700 p-0.5"
                            >
                              <Trash2 className="w-3.5 h-3.5 mx-auto" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION H: INSTRUCTIONS RECEIVED */}
          {activeTab === 'H' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-xs">H. Instructions Received from Client / Consultant</h3>
                  <p className="text-[10px] text-gray-500">Record site orders, inspection notes, quality directives, and responsible assignees.</p>
                </div>
                {!isLockedOrApproved && (
                  <button
                    onClick={addInstructionRow}
                    className="px-2 py-0.5 bg-[#0a6ed1] hover:bg-[#0854a0] text-white rounded font-bold text-[10.5px] flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Instruction</span>
                  </button>
                )}
              </div>

              <div className="border border-gray-300 rounded overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#eef2f6] text-[#0a6ed1] font-bold border-b border-gray-300 text-[10px]">
                      <th className="p-1.5 border-r border-gray-300 w-28">Date / Time</th>
                      <th className="p-1.5 border-r border-gray-300 w-36">From (Client / PMC)</th>
                      <th className="p-1.5 border-r border-gray-300">Instruction Details *</th>
                      <th className="p-1.5 border-r border-gray-300 w-32">Location</th>
                      <th className="p-1.5 border-r border-gray-300">Action Required</th>
                      <th className="p-1.5 border-r border-gray-300 w-32">Resp. Person</th>
                      <th className="p-1.5 border-r border-gray-300 w-24">Due Date</th>
                      <th className="p-1.5 border-r border-gray-300 w-24 text-center">Status</th>
                      {!isLockedOrApproved && <th className="p-1.5 w-10 text-center">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {formData.instructions?.map((ins, idx) => (
                      <tr key={ins.id || idx} className="hover:bg-gray-50">
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="text"
                            value={ins.dateTime}
                            disabled={isLockedOrApproved}
                            onChange={e => updateInstructionRow(idx, 'dateTime', e.target.value)}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 font-mono text-[11px]"
                            placeholder="2026-09-29 11:00"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="text"
                            value={ins.from}
                            disabled={isLockedOrApproved}
                            onChange={e => updateInstructionRow(idx, 'from', e.target.value)}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-[11px]"
                            placeholder="Consultant Lead"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="text"
                            value={ins.instruction}
                            disabled={isLockedOrApproved}
                            onChange={e => updateInstructionRow(idx, 'instruction', e.target.value)}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-[11px]"
                            placeholder="Instruction description"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="text"
                            value={ins.location}
                            disabled={isLockedOrApproved}
                            onChange={e => updateInstructionRow(idx, 'location', e.target.value)}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-[11px]"
                            placeholder="Location / Area"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="text"
                            value={ins.actionRequired}
                            disabled={isLockedOrApproved}
                            onChange={e => updateInstructionRow(idx, 'actionRequired', e.target.value)}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-[11px]"
                            placeholder="Required steps"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="text"
                            value={ins.responsiblePerson}
                            disabled={isLockedOrApproved}
                            onChange={e => updateInstructionRow(idx, 'responsiblePerson', e.target.value)}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-[11px]"
                            placeholder="Assignee name"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="date"
                            value={ins.dueDate}
                            disabled={isLockedOrApproved}
                            onChange={e => updateInstructionRow(idx, 'dueDate', e.target.value)}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 font-mono text-[11px]"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <SAPSelect
                            value={ins.status}
                            disabled={isLockedOrApproved}
                            onChange={e => updateInstructionRow(idx, 'status', e.target.value as any)}
                            className="w-full border border-gray-200 rounded px-1 py-0.5 text-[11px]"
                          >
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Complied">Complied</option>
                            <option value="Closed">Closed</option>
                          </SAPSelect>
                        </td>
                        {!isLockedOrApproved && (
                          <td className="p-1 text-center">
                            <button
                              onClick={() => removeInstructionRow(idx)}
                              className="text-rose-500 hover:text-rose-700 p-0.5"
                            >
                              <Trash2 className="w-3.5 h-3.5 mx-auto" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION I: PLANNED WORK FOR TOMORROW */}
          {activeTab === 'I' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-xs">I. Planned Work for Tomorrow</h3>
                  <p className="text-[10px] text-gray-500">Target activities, planned quantities, drawing references, and site prerequisites.</p>
                </div>
                {!isLockedOrApproved && (
                  <button
                    onClick={addTomorrowRow}
                    className="px-2 py-0.5 bg-[#0a6ed1] hover:bg-[#0854a0] text-white rounded font-bold text-[10.5px] flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Tomorrow Activity</span>
                  </button>
                )}
              </div>

              <div className="border border-gray-300 rounded overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#eef2f6] text-[#0a6ed1] font-bold border-b border-gray-300 text-[10px]">
                      <th className="p-1.5 border-r border-gray-300 w-10 text-center">S.No</th>
                      <th className="p-1.5 border-r border-gray-300 w-44">Location / Area *</th>
                      <th className="p-1.5 border-r border-gray-300 w-52">Planned Activity *</th>
                      <th className="p-1.5 border-r border-gray-300 w-16 text-center">Unit</th>
                      <th className="p-1.5 border-r border-gray-300 w-24 text-right">Planned Qty</th>
                      <th className="p-1.5 border-r border-gray-300 w-36">Drawing Reference</th>
                      <th className="p-1.5 border-r border-gray-300">Remarks / Prerequisites</th>
                      {!isLockedOrApproved && <th className="p-1.5 w-10 text-center">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {formData.tomorrowPlan?.map((t, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="p-1 border-r border-gray-200 text-center font-mono text-gray-500">{idx + 1}</td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="text"
                            value={t.location}
                            disabled={isLockedOrApproved}
                            onChange={e => updateTomorrowRow(idx, 'location', e.target.value)}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-[11px]"
                            placeholder="Location / Zone"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="text"
                            value={t.plannedActivity}
                            disabled={isLockedOrApproved}
                            onChange={e => updateTomorrowRow(idx, 'plannedActivity', e.target.value)}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-[11px]"
                            placeholder="Activity description"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="text"
                            value={t.unit}
                            disabled={isLockedOrApproved}
                            onChange={e => updateTomorrowRow(idx, 'unit', e.target.value)}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-center font-mono text-[11px]"
                            placeholder="sqm / cum / MT"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="number"
                            step="any"
                            value={t.plannedQuantity}
                            disabled={isLockedOrApproved}
                            onChange={e => updateTomorrowRow(idx, 'plannedQuantity', Number(e.target.value))}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-right font-mono font-bold text-[11px]"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="text"
                            value={t.drawingRef || ''}
                            disabled={isLockedOrApproved}
                            onChange={e => updateTomorrowRow(idx, 'drawingRef', e.target.value)}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-[11px]"
                            placeholder="Drawing no"
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            type="text"
                            value={t.remarks || ''}
                            disabled={isLockedOrApproved}
                            onChange={e => updateTomorrowRow(idx, 'remarks', e.target.value)}
                            className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-[11px]"
                          />
                        </td>
                        {!isLockedOrApproved && (
                          <td className="p-1 text-center">
                            <button
                              onClick={() => removeTomorrowRow(idx)}
                              className="text-rose-500 hover:text-rose-700 p-0.5"
                            >
                              <Trash2 className="w-3.5 h-3.5 mx-auto" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION PHOTOS: SITE PHOTOGRAPHS */}
          {activeTab === 'photos' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-xs">Site Progress Photographs (Annexure)</h3>
                  <p className="text-[10px] text-gray-500">Attach site photographs with timestamp, location tags, and technical captions.</p>
                </div>
                {!isLockedOrApproved && (
                  <label className="px-3 py-1 bg-[#0a6ed1] hover:bg-[#0854a0] text-white rounded font-bold text-[10.5px] flex items-center space-x-1.5 cursor-pointer shadow-xs">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Site Photos</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {(!formData.photos || formData.photos.length === 0) ? (
                <div className="border border-dashed border-gray-300 rounded p-8 text-center bg-gray-50 space-y-2">
                  <Image className="w-8 h-8 text-gray-400 mx-auto" />
                  <p className="text-gray-500 font-semibold text-xs">No site photos attached yet.</p>
                  <p className="text-gray-400 text-[10px]">Click 'Upload Site Photos' above to attach progress photos for the client report.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {formData.photos.map((photo, idx) => (
                    <div key={photo.id || idx} className="border border-gray-300 rounded overflow-hidden bg-white shadow-xs">
                      <div className="h-44 bg-gray-100 flex items-center justify-center overflow-hidden">
                        <img
                          src={photo.dataUrl}
                          alt={photo.caption}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-2 space-y-1.5 bg-[#f8f9fa] border-t border-gray-200">
                        <div>
                          <label className="text-[9px] uppercase font-bold text-gray-500 block">Caption</label>
                          <input
                            type="text"
                            value={photo.caption}
                            disabled={isLockedOrApproved}
                            onChange={e => {
                              const updated = [...(formData.photos || [])];
                              updated[idx] = { ...updated[idx], caption: e.target.value };
                              setFormData({ ...formData, photos: updated });
                            }}
                            className="w-full border border-gray-300 rounded px-1.5 py-0.5 text-[10.5px] font-semibold"
                            placeholder="e.g. 3rd Floor Slab Casting in Progress"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <label className="text-[9px] uppercase font-bold text-gray-500 block">Location</label>
                            <input
                              type="text"
                              value={photo.location}
                              disabled={isLockedOrApproved}
                              onChange={e => {
                                const updated = [...(formData.photos || [])];
                                updated[idx] = { ...updated[idx], location: e.target.value };
                                setFormData({ ...formData, photos: updated });
                              }}
                              className="w-full border border-gray-300 rounded px-1.5 py-0.5 text-[10px]"
                              placeholder="Grid B2"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] uppercase font-bold text-gray-500 block">Time</label>
                            <input
                              type="text"
                              value={photo.dateTime}
                              disabled={isLockedOrApproved}
                              onChange={e => {
                                const updated = [...(formData.photos || [])];
                                updated[idx] = { ...updated[idx], dateTime: e.target.value };
                                setFormData({ ...formData, photos: updated });
                              }}
                              className="w-full border border-gray-300 rounded px-1.5 py-0.5 text-[10px] font-mono"
                            />
                          </div>
                        </div>
                        {!isLockedOrApproved && (
                          <div className="flex justify-end pt-1">
                            <button
                              onClick={() => removePhoto(idx)}
                              className="text-rose-600 hover:text-rose-800 text-[10px] font-bold flex items-center space-x-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Remove</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Override Reason Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 backdrop-blur-xs">
          <div className="bg-[#f0f4f8] border-2 border-amber-600 w-full max-w-md rounded-sm shadow-2xl overflow-hidden p-4 space-y-3">
            <div className="flex items-center space-x-2 text-amber-800 font-bold text-xs uppercase">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Administrative Override Authorization</span>
            </div>
            <p className="text-[11px] text-gray-700">
              DPR <strong>{formData.reportNo}</strong> has been {formData.status}. To safeguard audit trail integrity, any post-approval modification requires a mandatory justification.
            </p>
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-600 mb-1">
                Reason for Post-Approval Modification *
              </label>
              <textarea
                value={overrideReason}
                onChange={e => setOverrideReason(e.target.value)}
                placeholder="State the technical reason, revised measurement sheet reference, or PMC consultation notes..."
                rows={3}
                className="w-full bg-white border border-gray-300 rounded p-2 text-[11px] focus:outline-none focus:border-amber-600"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-1">
              <button
                onClick={() => setShowOverrideModal(false)}
                className="px-3 py-1 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded font-semibold text-[11px]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmOverrideSave}
                disabled={isSaving || !overrideReason.trim()}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-[11px] disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Confirm & Save Override"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
