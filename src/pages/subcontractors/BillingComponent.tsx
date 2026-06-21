import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, Search, Edit, Trash2, Save, X, Upload, ShieldAlert 
} from 'lucide-react';
import { Project, Subcontractor, SubcontractorBill } from '../../types';

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
      const query = billingSearch.toLowerCase();
      const matchesSearch = (
        b.billNo.toLowerCase().includes(query) ||
        (b.workDescription || '').toLowerCase().includes(query) ||
        (b.subcontractorName || '').toLowerCase().includes(query) ||
        (b.subcontractorFirm || '').toLowerCase().includes(query)
      );

      const matchesProject = billingProjectFilter === 'all' || b.projectId === billingProjectFilter;
      const matchesStatus = billingStatusFilter === 'all' || b.status === billingStatusFilter;

      return matchesSearch && matchesProject && matchesStatus;
    });
  }, [bills, billingSearch, billingProjectFilter, billingStatusFilter]);

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="bg-white p-3 border rounded shadow-sm flex flex-wrap gap-3 justify-between items-center text-[10px]">
        <div className="flex flex-wrap gap-2.5 items-center">
          <div className="flex items-center space-x-1.5 border-b border-gray-300">
            <Search size={12} className="text-gray-400" />
            <input 
              type="text" 
              placeholder="Search Bill No, Contractor..." 
              value={billingSearch}
              onChange={(e) => setBillingSearch(e.target.value)}
              className="bg-transparent outline-none p-0.5 text-xs font-semibold"
            />
          </div>
          <div>
            <span className="text-gray-400 font-bold mr-1 uppercase">Filter Project</span>
            <select 
              value={billingProjectFilter}
              onChange={(e) => setBillingProjectFilter(e.target.value)}
              className="border border-gray-300 rounded p-0.5 text-[10px]"
            >
              <option value="all">All Projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <span className="text-gray-400 font-bold mr-1 uppercase">Bill Status</span>
            <select 
              value={billingStatusFilter}
              onChange={(e) => setBillingStatusFilter(e.target.value)}
              className="border border-gray-300 rounded p-0.5 text-[10px]"
            >
              <option value="all">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Approved">Approved (Accrued to Ledger)</option>
              <option value="Posted & Locked">Posted & Locked (Accrued & Locked)</option>
            </select>
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
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white border-2 border-gray-300 w-full max-w-2xl rounded shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#1f2937] text-white px-4 py-2.5 flex items-center justify-between border-b border-[#374151]">
              <span className="font-bold text-xs uppercase tracking-widest">{editingBillId ? 'Edit Certified Contractor Bill' : 'Record Certified Contractor Bill'}</span>
              <button type="button" onClick={() => setIsEditingBill(false)} className="text-gray-400 hover:text-white"><X size={16}/></button>
            </div>
            <form onSubmit={handleSaveBill} className="p-4 space-y-4 overflow-y-auto flex-1 text-[10px]">
              {/* Project and partner specs */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-500 font-bold uppercase mb-0.5">Project *</label>
                  <select 
                    value={billForm.projectId}
                    onChange={(e) => setBillForm({ ...billForm, projectId: e.target.value })}
                    className="w-full bg-white border border-gray-300 p-1 rounded font-semibold outline-none focus:border-amber-500 text-[10px]"
                  >
                    <option value="" disabled>Select Site Location</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-500 font-bold uppercase mb-0.5">Subcontractor *</label>
                  <select 
                    value={billForm.subcontractorId}
                    onChange={(e) => setBillForm({ ...billForm, subcontractorId: e.target.value })}
                    className="w-full bg-white border border-gray-300 p-1 rounded font-semibold outline-none focus:border-amber-500 text-[10px]"
                  >
                    <option value="" disabled>Select Master Partner</option>
                    {subcontractors.map(s => <option key={s.id} value={s.id}>{s.name} ({s.firmName || 'Personal'})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-500 font-bold uppercase mb-0.5">Bill Date *</label>
                  <input 
                    type="date" 
                    value={billForm.billDate}
                    onChange={(e) => setBillForm({ ...billForm, billDate: e.target.value })}
                    className="w-full bg-white border border-gray-300 p-1 rounded font-mono outline-none focus:border-amber-500 text-[10px]"
                  />
                </div>
              </div>

              {/* Work details & automatic numbering code override */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-500 font-bold uppercase mb-0.5">Bill Reference Number</label>
                  <input 
                    type="text" 
                    placeholder="Auto-assigned unless overridden" 
                    value={billForm.billNo}
                    onChange={(e) => setBillForm({ ...billForm, billNo: e.target.value })}
                    className="w-full bg-[#f3f4f6] border border-gray-300 p-1 rounded font-bold font-mono outline-none text-gray-800 focus:border-amber-500 text-[10px]"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 font-bold uppercase mb-0.5">Hard Copy Bill Doc Scan</label>
                  <label className="bg-gray-100 hover:bg-gray-200 border border-gray-300 text-center text-gray-600 font-semibold p-1 rounded block cursor-pointer transition text-[10px] py-[4px]">
                    <Upload size={10} className="inline mr-1" />
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
                <label className="block text-gray-500 font-bold uppercase mb-0.5">Description of Certified Civil / Works</label>
                <textarea 
                  rows={2}
                  placeholder="Detail block location, floor levels, specifications, item measurements..." 
                  value={billForm.workDescription}
                  onChange={(e) => setBillForm({ ...billForm, workDescription: e.target.value })}
                  className="w-full bg-white border border-gray-300 p-1 rounded outline-none focus:border-amber-500 text-[10px]"
                />
              </div>

              {/* Interactive financial computation grid */}
              <div className="border border-amber-300 bg-amber-50/10 p-3 rounded space-y-2">
                <h4 className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-2 border-b border-amber-200 pb-1">Ledger Accrual Computations</h4>
                
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-gray-500 font-bold uppercase text-[9px]">1. Gross Certified *</label>
                    <div className="relative">
                      <span className="absolute left-1.5 top-1 font-bold text-gray-400">₹</span>
                      <input 
                        type="number" 
                        placeholder="0.00" 
                        value={billForm.grossAmount}
                        onChange={(e) => handleGrossOrRatesChange('gross', e.target.value)}
                        className="w-full bg-white border border-gray-300 py-1 pl-5 pr-1 rounded font-bold font-mono outline-none text-gray-800 focus:border-amber-500 text-[10px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-500 font-bold uppercase text-[9px]">2. Retention Deduct (5%)</label>
                    <div className="flex space-x-1">
                      <select 
                        value={taxConfig.retentionRate}
                        onChange={(e) => handleGrossOrRatesChange('retRate', e.target.value)}
                        className="bg-white border rounded font-mono p-0.5 text-[10.5px]"
                      >
                        <option value="0">0%</option>
                        <option value="2.5">2.5%</option>
                        <option value="5">5%</option>
                        <option value="10">10%</option>
                      </select>
                      <input 
                        type="number" 
                        value={billForm.retentionAmount}
                        onChange={(e) => setBillForm({ ...billForm, retentionAmount: e.target.value })}
                        className="w-full bg-gray-50 border p-1 rounded font-mono font-bold text-[10px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-500 font-bold uppercase text-[9px]">3. TDS Reserve (1%)</label>
                    <div className="flex space-x-1">
                      <select 
                        value={taxConfig.tdsRate}
                        onChange={(e) => handleGrossOrRatesChange('tdsRate', e.target.value)}
                        className="bg-white border rounded font-mono p-0.5 text-[10.5px]"
                      >
                        <option value="0">0%</option>
                        <option value="1">1%</option>
                        <option value="2">2%</option>
                        <option value="5">5%</option>
                      </select>
                      <input 
                        type="number" 
                        value={billForm.tdsAmount}
                        onChange={(e) => setBillForm({ ...billForm, tdsAmount: e.target.value })}
                        className="w-full bg-gray-50 border p-1 rounded font-mono font-bold text-[10px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-500 font-bold uppercase text-[9px]">4. GST Accrual (18%)</label>
                    <div className="flex space-x-1">
                      <select 
                        value={taxConfig.gstRate}
                        onChange={(e) => handleGrossOrRatesChange('gstRate', e.target.value)}
                        className="bg-white border rounded font-mono p-0.5 text-[10.5px]"
                      >
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                      </select>
                      <input 
                        type="number" 
                        value={billForm.gstAmount}
                        onChange={(e) => setBillForm({ ...billForm, gstAmount: e.target.value })}
                        className="w-full bg-gray-50 border p-1 rounded font-mono font-bold text-[10px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-500 font-bold uppercase text-[9px]">5. Recovery / Debits</label>
                    <input 
                      type="number" 
                      placeholder="For materials provided" 
                      value={billForm.recoveryAmount}
                      onChange={(e) => handleGrossOrRatesChange('recovery', e.target.value)}
                      className="w-full bg-white border border-gray-300 p-1 rounded font-mono font-bold outline-none focus:border-amber-500 text-[10px]"
                    />
                  </div>

                  <div className="bg-[#1e293b] text-white p-2.5 rounded border border-gray-800 flex flex-col justify-center">
                    <span className="text-[8px] uppercase font-bold text-amber-400">6. NET CONTRACTOR CLEARANCE</span>
                    <span className="text-sm font-extrabold font-mono text-white mt-0.5">₹{parseFloat(billForm.netPayableAmount || '0').toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-500 font-bold uppercase mb-0.5">Transition Status</label>
                  <select 
                    value={billForm.status}
                    onChange={(e) => setBillForm({ ...billForm, status: e.target.value as any })}
                    className="w-full bg-white border border-gray-300 p-1 rounded font-semibold outline-none focus:border-amber-500 text-[10px]"
                  >
                    <option value="Draft">Draft (Held back from books)</option>
                    <option value="Approved">Approved (Reflected in book balance)</option>
                    <option value="Posted & Locked">Posted & Locked (Accrued & Locked)</option>
                  </select>
                </div>
                <div className="flex items-end text-rose-800 bg-rose-50 p-2 border border-rose-100 text-[8.5px] font-bold">
                  <ShieldAlert size={14} className="mr-1.5 flex-shrink-0 text-rose-500 animate-pulse" />
                  <span>WARNING: Setting status to 'Posted & Locked' blocks any further modifications on this record permanently.</span>
                </div>
              </div>

              <div className="bg-[#f9fafb] border-t p-2 flex justify-end space-x-2">
                <button 
                  type="button" 
                  onClick={() => setIsEditingBill(false)}
                  className="border border-[#d1d5db] text-gray-700 bg-white hover:bg-gray-50 px-3 py-1.5 rounded font-bold text-xs"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold px-4 py-1.5 rounded flex items-center space-x-1 text-xs"
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
      <div className="bg-white border rounded shadow-sm overflow-x-auto text-[10px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#f3f4f6] text-gray-600 uppercase font-bold border-b border-gray-300">
              <th className="p-2">Bill No</th>
              <th className="p-2">Date</th>
              <th className="p-2">Project</th>
              <th className="p-2">Subcontractor Target</th>
              <th className="p-2">Civil Works Particulars</th>
              <th className="p-2 text-right">Gross Certified</th>
              <th className="p-2 text-right">Deductions (GST, Ret, TDS, Rec)</th>
              <th className="p-2 text-right">Net Accrued</th>
              <th className="p-2 text-center">Status</th>
              <th className="p-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredBills.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-4 text-center text-gray-400">No subcontractor bills logged under active parameters.</td>
              </tr>
            ) : (
              filteredBills.map(b => {
                const totalDeductions = b.retentionAmount + b.tdsAmount + b.recoveryAmount;
                const formattedDeductions = `Ret: ${b.retentionAmount.toLocaleString()} | TDS: ${b.tdsAmount.toLocaleString()} | Recovery: ${b.recoveryAmount.toLocaleString()}`;
                return (
                  <tr key={b.id} className="hover:bg-gray-50 transition">
                    <td className="p-2 font-bold font-mono text-gray-900">{b.billNo}</td>
                    <td className="p-2 font-mono">{b.billDate}</td>
                    <td className="p-2 font-semibold text-gray-700">{b.projectName}</td>
                    <td className="p-2">
                      <span className="font-bold text-[#002f6c]">{b.subcontractorName}</span>
                      <div className="text-[9px] text-gray-500">{b.subcontractorFirm || 'Personal'}</div>
                    </td>
                    <td className="p-2 font-medium text-gray-850 max-w-[200px] truncate" title={b.workDescription || ''}>{b.workDescription || '-'}</td>
                    <td className="p-2 text-right font-mono font-semibold">₹{b.grossAmount.toLocaleString()}</td>
                    <td className="p-2 text-right font-mono" title={formattedDeductions}>
                      <span>₹{totalDeductions.toLocaleString()}</span>
                      <div className="text-[8px] text-gray-500 font-bold">{formattedDeductions}</div>
                    </td>
                    <td className="p-2 text-right font-mono font-bold text-gray-950">₹{b.netPayableAmount.toLocaleString()}</td>
                    <td className="p-2 text-center">
                      <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded ${
                        b.status === 'Draft' ? 'bg-gray-100 text-gray-800' :
                        b.status === 'Approved' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="p-2 text-center">
                      <div className="flex justify-center items-center space-x-1">
                        {b.status !== 'Posted & Locked' ? (
                          <>
                            <button 
                              onClick={() => handleEditBillClick(b)}
                              className="p-1 hover:bg-gray-200 text-blue-600 rounded"
                              title="Edit Bill Details"
                            >
                              <Edit size={11} />
                            </button>
                            <button 
                              onClick={() => handleDeleteBill(b.id, b.billNo)}
                              className="p-1 hover:bg-gray-200 text-red-650 rounded"
                              title="Delete Bill"
                            >
                              <Trash2 size={11} />
                            </button>
                          </>
                        ) : (
                          <button 
                            onClick={() => handleReversalBill(b.id, b.billNo)}
                            className="px-1.5 py-0.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded flex items-center space-x-1 hover:scale-105 transition"
                            title="Trigger a full reversal audit correction"
                            disabled={b.workDescription?.includes("[REVERSED]")}
                          >
                            <span>Reverse</span>
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
    </div>
  );
};
