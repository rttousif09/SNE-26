import React, { useState, useEffect, useMemo } from 'react';
import { SAPSelect } from '../../components/SAPSelect';
import { motion } from 'motion/react';
import { 
  Plus, Search, Edit, Trash2, Save, X, Upload, ShieldAlert,
  Building2, FileText, User, Calendar, FileKey, Receipt, DollarSign, Percent, ShieldCheck, Sparkles
} from 'lucide-react';
import { Project, Subcontractor, SubcontractorBill } from '../../types';
import { ERPTable, ERPColumn, ERPRowAction } from '../../components/ERPTable';

interface BillingComponentProps {
  user: any;
  projects: Project[];
  subcontractors: Subcontractor[];
  bills: SubcontractorBill[];
  numberingSettings: any[];
  previewNextNumber: (moduleKey: string, params: any) => Promise<any>;
  loadAllData: () => Promise<void>;
  setErrorMessage: (msg: string | null) => void;
  setLoading: (l: boolean) => void;
}

export const BillingComponent: React.FC<BillingComponentProps> = ({
  user,
  projects,
  subcontractors,
  bills,
  numberingSettings,
  previewNextNumber,
  loadAllData,
  setErrorMessage,
  setLoading
}) => {
  const [billingSearch, setBillingSearch] = useState<string>('');

  // ERP Columns for Subcontractor Work Billing Register
  const erpColumns: ERPColumn<SubcontractorBill>[] = [
    { key: 'billNo', header: 'Bill No', sortable: true, filterable: true, frozen: true, render: (val) => <span className="font-bold font-mono text-gray-900">{val}</span> },
    { key: 'billDate', header: 'Date', sortable: true, filterable: true, render: (val) => <span className="font-mono">{val}</span> },
    { key: 'projectName', header: 'Project', sortable: true, filterable: true, render: (val) => <span className="font-semibold text-gray-700">{val}</span> },
    { key: 'subcontractorName', header: 'Subcontractor Target', sortable: true, filterable: true, render: (_, row) => (
      <div>
        <span className="font-bold text-[var(--color-sap-blue-val)]">{row.subcontractorName}</span>
        <div className="text-[9px] text-gray-500">{row.subcontractorFirm || 'Personal'}</div>
      </div>
    )},
    { key: 'workDescription', header: 'Civil Works Particulars', sortable: true, filterable: true, render: (val) => (
      <span className="font-medium text-gray-800" title={val || ''}>{val || '-'}</span>
    )},
    { key: 'grossAmount', header: 'Gross Certified', sortable: true, filterable: true, render: (val) => (
      <span className="font-mono font-semibold">₹{val.toLocaleString()}</span>
    )},
    { key: 'deductions', header: 'Deductions (GST, Ret, TDS, Rec)', sortable: true, filterable: true, render: (_, row) => {
      const totalDeductions = row.retentionAmount + row.tdsAmount + row.recoveryAmount;
      const formattedDeductions = `Ret: ${row.retentionAmount.toLocaleString()} | TDS: ${row.tdsAmount.toLocaleString()} | Recovery: ${row.recoveryAmount.toLocaleString()}`;
      return (
        <div title={formattedDeductions}>
          <span className="font-mono font-medium">₹{totalDeductions.toLocaleString()}</span>
          <div className="text-[8px] text-gray-500 font-bold">{formattedDeductions}</div>
        </div>
      );
    }},
    { key: 'netPayableAmount', header: 'Net Accrued', sortable: true, filterable: true, render: (val) => (
      <span className="font-mono font-bold text-gray-950">₹{val.toLocaleString()}</span>
    )},
    { key: 'status', header: 'Status', sortable: true, filterable: true, render: (val) => (
      <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
        val === 'Draft' ? 'bg-gray-100 text-gray-800' :
        val === 'Approved' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
      }`}>
        {val}
      </span>
    )}
  ];

  // ERP Row Actions for Subcontractor Work Billing Register
  const erpRowActions: ERPRowAction<SubcontractorBill>[] = [
    {
      label: 'Edit',
      icon: <Edit size={11} />,
      onClick: (row) => handleEditBillClick(row),
      tooltip: 'Edit Bill Details',
      disabled: (row) => row.status === 'Posted & Locked'
    },
    {
      label: 'Delete',
      icon: <Trash2 size={11} />,
      onClick: (row) => handleDeleteBill(row.id, row.billNo),
      tooltip: 'Delete Bill',
      disabled: (row) => row.status === 'Posted & Locked',
      className: 'text-red-650 hover:bg-red-50'
    },
    {
      label: 'Reverse',
      icon: <X size={11} />,
      onClick: (row) => handleReversalBill(row.id, row.billNo),
      tooltip: 'Trigger a full reversal audit correction',
      disabled: (row) => row.status !== 'Posted & Locked' || row.workDescription?.includes("[REVERSED]"),
      className: 'text-rose-500 hover:bg-rose-50'
    }
  ];

  const [billingProjectFilter, setBillingProjectFilter] = useState<string>('all');
  const [billingStatusFilter, setBillingStatusFilter] = useState<string>('all');

  const [isEditingBill, setIsEditingBill] = useState<boolean>(false);
  const [editingBillId, setEditingBillId] = useState<string | null>(null);

  const [billForm, setBillForm] = useState({
    projectId: '',
    billNo: '',
    billDate: new Date().toISOString().split('T')[0],
    subcontractorId: '',
    workDescription: '',
    grossAmount: '',
    retentionAmount: '',
    tdsAmount: '',
    gstAmount: '',
    recoveryAmount: '',
    netPayableAmount: '',
    attachmentUpload: '',
    status: 'Draft' as 'Draft' | 'Approved' | 'Posted & Locked'
  });

  const [taxConfig, setTaxConfig] = useState({
    retentionRate: 5,
    tdsRate: 1,
    gstRate: 18
  });

  // Document base64 helper
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setBillForm(prev => ({ ...prev, [fieldName]: base64String }));
    };
    reader.readAsDataURL(file);
  };

  // Bill Number Code Generation Preview
  useEffect(() => {
    const billConfig = numberingSettings?.find((s: any) => s.moduleKey === 'subcontractor-billing');
    if (billConfig?.status === 'Active' && !editingBillId && isEditingBill && billForm.projectId) {
       previewNextNumber('subcontractor-billing', { projectId: billForm.projectId, dateStr: billForm.billDate }).then(res => {
         if (res && res.active && res.docNumber) {
           setBillForm(prev => ({ ...prev, billNo: res.docNumber }));
         }
       });
    }
  }, [billForm.projectId, billForm.billDate, editingBillId, isEditingBill]);

  // Auto Calculations for bills
  const recalculateDetails = (gross: number, retRate: number, tdsRate: number, gstRate: number, recovery: number) => {
    const retentionVal = Math.round((gross * retRate) / 100);
    const tdsVal = Math.round((gross * tdsRate) / 100);
    const gstVal = Math.round((gross * gstRate) / 100);
    const netVal = gross + gstVal - retentionVal - tdsVal - recovery;

    return {
      ret: retentionVal.toString(),
      tds: tdsVal.toString(),
      gst: gstVal.toString(),
      net: netVal.toString()
    };
  };

  const handleGrossOrRatesChange = (field: string, val: string) => {
    const gross = field === 'gross' ? parseFloat(val) || 0 : parseFloat(billForm.grossAmount) || 0;
    const rRate = field === 'retRate' ? parseFloat(val) || 0 : taxConfig.retentionRate;
    const tRate = field === 'tdsRate' ? parseFloat(val) || 0 : taxConfig.tdsRate;
    const gRate = field === 'gstRate' ? parseFloat(val) || 0 : taxConfig.gstRate;
    const recovery = field === 'recovery' ? parseFloat(val) || 0 : parseFloat(billForm.recoveryAmount) || 0;

    const computed = recalculateDetails(gross, rRate, tRate, gRate, recovery);
    
    if (field === 'retRate' || field === 'tdsRate' || field === 'gstRate') {
      setTaxConfig(prev => ({
        ...prev,
        retentionRate: field === 'retRate' ? rRate : prev.retentionRate,
        tdsRate: field === 'tdsRate' ? tRate : prev.tdsRate,
        gstRate: field === 'gstRate' ? gRate : prev.gstRate
      }));
    }

    setBillForm(prev => ({
      ...prev,
      grossAmount: field === 'gross' ? val : prev.grossAmount,
      recoveryAmount: field === 'recovery' ? val : prev.recoveryAmount,
      retentionAmount: computed.ret,
      tdsAmount: computed.tds,
      gstAmount: computed.gst,
      netPayableAmount: computed.net
    }));
  };

  // Bill Actions
  const handleSaveBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const { projectId, subcontractorId, billDate, grossAmount } = billForm;
    if (!projectId || !subcontractorId || !billDate || !grossAmount) {
      setErrorMessage("Project, Subcontractor, Date, and Gross Certified Amount are required.");
      return;
    }

    const payload = {
      ...billForm,
      grossAmount: parseFloat(billForm.grossAmount) || 0,
      retentionAmount: parseFloat(billForm.retentionAmount) || 0,
      tdsAmount: parseFloat(billForm.tdsAmount) || 0,
      gstAmount: parseFloat(billForm.gstAmount) || 0,
      recoveryAmount: parseFloat(billForm.recoveryAmount) || 0,
      netPayableAmount: parseFloat(billForm.netPayableAmount) || 0,
      username: user?.name || user?.username || 'Admin'
    };

    setLoading(true);
    try {
      const url = editingBillId ? `/api/subcontractor-bills/${editingBillId}` : '/api/subcontractor-bills';
      const method = editingBillId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to save work order bill.");
      }

      setIsEditingBill(false);
      setEditingBillId(null);
      loadAllData();
      
      const event = new CustomEvent('show-success-toast', { detail: { message: `Contractor bill submitted successfully.` } });
      window.dispatchEvent(event);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save bill.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditBillClick = (bill: SubcontractorBill) => {
    setEditingBillId(bill.id);
    setBillForm({
      projectId: bill.projectId,
      billNo: bill.billNo,
      billDate: bill.billDate,
      subcontractorId: bill.subcontractorId,
      workDescription: bill.workDescription || '',
      grossAmount: bill.grossAmount.toString(),
      retentionAmount: bill.retentionAmount.toString(),
      tdsAmount: bill.tdsAmount.toString(),
      gstAmount: bill.gstAmount.toString(),
      recoveryAmount: bill.recoveryAmount.toString(),
      netPayableAmount: bill.netPayableAmount.toString(),
      attachmentUpload: bill.attachmentUpload || '',
      status: bill.status
    });

    const grossVal = bill.grossAmount || 1;
    setTaxConfig({
      retentionRate: Math.round((bill.retentionAmount / grossVal) * 100),
      tdsRate: Math.round((bill.tdsAmount / grossVal) * 100),
      gstRate: Math.round((bill.gstAmount / grossVal) * 100)
    });

    setIsEditingBill(true);
  };

  const handleReversalBill = async (id: string, billNo: string) => {
    if (!window.confirm(`Execute reversal transaction for posted bill ${billNo}? This will instantiate an equal opposite entry in billing register.`)) return;
    setErrorMessage(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/subcontractor-bills/reversal/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user?.username || 'Admin' })
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to reversal entry.");
      }

      loadAllData();
      const event = new CustomEvent('show-success-toast', { detail: { message: `Reversal entry ${data.reversalBillNo} posted successfully.` } });
      window.dispatchEvent(event);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to reverse.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBill = async (id: string, billNo: string) => {
    if (!window.confirm(`Are you sure you want to delete bill ${billNo}? (Only permitted for Draft / Approved status)`)) return;
    setErrorMessage(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/subcontractor-bills/${id}?username=${encodeURIComponent(user?.username || 'Admin')}`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to delete bill.");
      }

      loadAllData();
      const event = new CustomEvent('show-success-toast', { detail: { message: "Bill deleted successfully." } });
      window.dispatchEvent(event);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to delete bill.");
    } finally {
      setLoading(false);
    }
  };

  // Filter bills list
  const filteredBills = useMemo(() => {
    return bills.filter(b => {
      const matchesProject = billingProjectFilter === 'all' || b.projectId === billingProjectFilter;
      const matchesStatus = billingStatusFilter === 'all' || b.status === billingStatusFilter;

      return matchesProject && matchesStatus;
    });
  }, [bills, billingProjectFilter, billingStatusFilter]);

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="bg-white p-3 border rounded shadow-sm flex flex-wrap gap-3 justify-between items-center text-[10px]">
        <div className="flex flex-wrap gap-2.5 items-center">
          <div>
            <span className="text-gray-400 font-bold mr-1 uppercase">Filter Project</span>
            <SAPSelect 
              value={billingProjectFilter}
              onChange={(e) => setBillingProjectFilter(e.target.value)}
              className="border border-gray-300 rounded p-0.5 text-[10px]"
            >
              <option value="all">All Projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </SAPSelect>
          </div>
          <div>
            <span className="text-gray-400 font-bold mr-1 uppercase">Bill Status</span>
            <SAPSelect 
              value={billingStatusFilter}
              onChange={(e) => setBillingStatusFilter(e.target.value)}
              className="border border-gray-300 rounded p-0.5 text-[10px]"
            >
              <option value="all">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Approved">Approved (Accrued to Ledger)</option>
              <option value="Posted & Locked">Posted & Locked (Accrued & Locked)</option>
            </SAPSelect>
          </div>
        </div>

        <button 
          onClick={() => {
            setEditingBillId(null);
            setBillForm({
              projectId: projects[0]?.id || '',
              billNo: '',
              billDate: new Date().toISOString().split('T')[0],
              subcontractorId: subcontractors[0]?.id || '',
              workDescription: '',
              grossAmount: '',
              retentionAmount: '',
              tdsAmount: '',
              gstAmount: '',
              recoveryAmount: '',
              netPayableAmount: '',
              attachmentUpload: '',
              status: 'Draft'
            });
            setTaxConfig({ retentionRate: 5, tdsRate: 1, gstRate: 18 });
            setIsEditingBill(true);
          }}
          className="bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold px-3 py-1.5 rounded flex items-center space-x-1 text-xs transition"
        >
          <Plus size={12} />
          <span>Record Certified Contractor Bill</span>
        </button>
      </div>

      {/* Billing Overlay Dialog */}
      {isEditingBill && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#f0f4f8] border-2 border-[#8c9ba8] w-full max-w-2xl rounded-xs shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="sap-title-banner">
              <span className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Receipt size={14} className="text-[#002f6c]" />
                <span>{editingBillId ? 'Edit Certified Contractor Bill (PB00)' : 'Create Gross Price Condition / Contractor Bill (PB00)'}</span>
              </span>
              <button type="button" onClick={() => setIsEditingBill(false)} className="text-[#002f6c] hover:bg-slate-300/50 p-0.5 rounded"><X size={16}/></button>
            </div>
            <form onSubmit={handleSaveBill} className="sap-form p-3 space-y-3 overflow-y-auto flex-1 text-[11px]">
              {/* Project and partner specs */}
              <div className="sap-fieldset">
                <div className="sap-fieldset-header">
                  <span>Variable Key / Partner Specifications</span>
                </div>
                <div className="sap-fieldset-body grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold uppercase mb-1 flex items-center gap-1">
                      <Building2 size={11} className="text-[#0056b3]" />
                      <span>Project *</span>
                    </label>
                    <SAPSelect 
                      value={billForm.projectId}
                      onChange={(e) => setBillForm({ ...billForm, projectId: e.target.value })}
                      className="w-full sap-input font-semibold"
                    >
                      <option value="" disabled>Select Site Location</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </SAPSelect>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold uppercase mb-1 flex items-center gap-1">
                      <User size={11} className="text-[#0056b3]" />
                      <span>Subcontractor *</span>
                    </label>
                    <SAPSelect 
                      value={billForm.subcontractorId}
                      onChange={(e) => setBillForm({ ...billForm, subcontractorId: e.target.value })}
                      className="w-full sap-input font-semibold"
                    >
                      <option value="" disabled>Select Master Partner</option>
                      {subcontractors.map(s => <option key={s.id} value={s.id}>{s.name} ({s.firmName || 'Personal'})</option>)}
                    </SAPSelect>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold uppercase mb-1 flex items-center gap-1">
                      <Calendar size={11} className="text-[#0056b3]" />
                      <span>Bill Date *</span>
                    </label>
                    <input 
                      type="date" 
                      value={billForm.billDate}
                      onChange={(e) => setBillForm({ ...billForm, billDate: e.target.value })}
                      className="w-full sap-input font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Work details & automatic numbering code override */}
              <div className="sap-fieldset">
                <div className="sap-fieldset-header">
                  <span>Condition Details & Document Attachment</span>
                </div>
                <div className="sap-fieldset-body space-y-2.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-700 font-bold uppercase mb-1 flex items-center gap-1">
                        <FileKey size={11} className="text-[#0056b3]" />
                        <span>Bill Reference Number</span>
                      </label>
                      <input 
                        type="text" 
                        placeholder="Auto-assigned unless overridden" 
                        value={billForm.billNo}
                        onChange={(e) => setBillForm({ ...billForm, billNo: e.target.value })}
                        className="w-full sap-input font-bold font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-bold uppercase mb-1 flex items-center gap-1">
                        <Upload size={11} className="text-[#0056b3]" />
                        <span>Hard Copy Bill Doc Scan</span>
                      </label>
                      <label className="sap-btn w-full justify-center text-center cursor-pointer py-1">
                        <Upload size={11} className="inline mr-1" />
                        {billForm.attachmentUpload ? "✓ Change Archived File" : "Select & Convert Attachment File"}
                        <input 
                          type="file" 
                          className="hidden" 
                          onChange={(e) => handleFileUpload(e, 'attachmentUpload')}
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold uppercase mb-1 flex items-center gap-1">
                      <FileText size={11} className="text-[#0056b3]" />
                      <span>Description of Certified Civil / Works</span>
                    </label>
                    <textarea 
                      rows={2}
                      placeholder="Detail block location, floor levels, specifications, item measurements..." 
                      value={billForm.workDescription}
                      onChange={(e) => setBillForm({ ...billForm, workDescription: e.target.value })}
                      className="w-full sap-input"
                    />
                  </div>
                </div>
              </div>

              {/* Interactive financial computation grid */}
              <div className="sap-fieldset">
                <div className="sap-fieldset-header">
                  <span className="flex items-center gap-1.5">
                    <Sparkles size={12} className="text-[#002f6c]" />
                    <span>Condition Supplements / Ledger Accrual Computations</span>
                  </span>
                </div>
                <div className="sap-fieldset-body">
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-gray-700 font-bold uppercase text-[9.5px] flex items-center gap-1 mb-1">
                        <DollarSign size={10} className="text-[#0056b3]" />
                        <span>1. Gross Certified *</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-2 top-1 font-bold text-gray-500">₹</span>
                        <input 
                          type="number" 
                          placeholder="0.00" 
                          value={billForm.grossAmount}
                          onChange={(e) => handleGrossOrRatesChange('gross', e.target.value)}
                          className="w-full sap-input py-1 pl-6 font-bold font-mono text-gray-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold uppercase text-[9.5px] flex items-center gap-1 mb-1">
                        <Percent size={10} className="text-[#0056b3]" />
                        <span>2. Retention Deduct</span>
                      </label>
                      <div className="flex space-x-1">
                        <SAPSelect 
                          value={taxConfig.retentionRate}
                          onChange={(e) => handleGrossOrRatesChange('retRate', e.target.value)}
                          className="sap-input font-mono"
                        >
                          <option value="0">0%</option>
                          <option value="2.5">2.5%</option>
                          <option value="5">5%</option>
                          <option value="10">10%</option>
                        </SAPSelect>
                        <input 
                          type="number" 
                          value={billForm.retentionAmount}
                          onChange={(e) => setBillForm({ ...billForm, retentionAmount: e.target.value })}
                          className="w-full sap-input font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold uppercase text-[9.5px] flex items-center gap-1 mb-1">
                        <Percent size={10} className="text-[#0056b3]" />
                        <span>3. TDS Reserve</span>
                      </label>
                      <div className="flex space-x-1">
                        <SAPSelect 
                          value={taxConfig.tdsRate}
                          onChange={(e) => handleGrossOrRatesChange('tdsRate', e.target.value)}
                          className="sap-input font-mono"
                        >
                          <option value="0">0%</option>
                          <option value="1">1%</option>
                          <option value="2">2%</option>
                          <option value="5">5%</option>
                        </SAPSelect>
                        <input 
                          type="number" 
                          value={billForm.tdsAmount}
                          onChange={(e) => setBillForm({ ...billForm, tdsAmount: e.target.value })}
                          className="w-full sap-input font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold uppercase text-[9.5px] flex items-center gap-1 mb-1">
                        <Percent size={10} className="text-[#0056b3]" />
                        <span>4. GST Accrual</span>
                      </label>
                      <div className="flex space-x-1">
                        <SAPSelect 
                          value={taxConfig.gstRate}
                          onChange={(e) => handleGrossOrRatesChange('gstRate', e.target.value)}
                          className="sap-input font-mono"
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                        </SAPSelect>
                        <input 
                          type="number" 
                          value={billForm.gstAmount}
                          onChange={(e) => setBillForm({ ...billForm, gstAmount: e.target.value })}
                          className="w-full sap-input font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold uppercase text-[9.5px] flex items-center gap-1 mb-1">
                        <Receipt size={10} className="text-[#0056b3]" />
                        <span>5. Recovery / Debits</span>
                      </label>
                      <input 
                        type="number" 
                        placeholder="For materials provided" 
                        value={billForm.recoveryAmount}
                        onChange={(e) => handleGrossOrRatesChange('recovery', e.target.value)}
                        className="w-full sap-input font-mono font-bold"
                      />
                    </div>

                    <div className="bg-[#002f6c] text-white p-2 rounded border border-[#001d45] flex flex-col justify-center">
                      <span className="text-[8px] uppercase font-bold text-amber-300 flex items-center gap-1">
                        <ShieldCheck size={10} className="text-amber-300 animate-pulse" />
                        <span>6. NET CLEARANCE AMOUNT</span>
                      </span>
                      <span className="text-sm font-extrabold font-mono text-white mt-0.5">₹{parseFloat(billForm.netPayableAmount || '0').toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold uppercase mb-1 flex items-center gap-1">
                    <ShieldCheck size={11} className="text-[#0056b3]" />
                    <span>Transition Status</span>
                  </label>
                  <SAPSelect 
                    value={billForm.status}
                    onChange={(e) => setBillForm({ ...billForm, status: e.target.value as any })}
                    className="w-full sap-input font-semibold"
                  >
                    <option value="Draft">Draft (Held back from books)</option>
                    <option value="Approved">Approved (Reflected in book balance)</option>
                    <option value="Posted & Locked">Posted & Locked (Accrued & Locked)</option>
                  </SAPSelect>
                </div>
                <div className="flex items-center text-rose-800 bg-rose-50 p-2 border border-rose-200 text-[9px] font-bold rounded-xs">
                  <ShieldAlert size={14} className="mr-1.5 flex-shrink-0 text-rose-600 animate-pulse" />
                  <span>WARNING: Setting status to 'Posted & Locked' blocks any further modifications on this record permanently.</span>
                </div>
              </div>

              <div className="bg-[#eef2f6] border-t border-[#8c9ba8] p-2.5 flex justify-end space-x-2 -mx-3 -mb-3 rounded-b-xs">
                <button 
                  type="button" 
                  onClick={() => setIsEditingBill(false)}
                  className="sap-btn"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="sap-btn sap-btn-amber"
                >
                  <Save size={12} />
                  <span>Save Contractor Bill</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Bills Listing Grid */}
      <div className="bg-white border rounded shadow-sm overflow-hidden p-2 text-[10px]">
        <ERPTable
          id="subcontractor-bills-table"
          data={filteredBills}
          columns={erpColumns}
          idKey="id"
          searchPlaceholder="Filter certified contractor bills..."
          rowActions={erpRowActions}
          exportFilename="subcontractor_bills"
        />
      </div>
    </div>
  );
};
