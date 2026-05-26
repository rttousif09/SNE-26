import React, { useState, useMemo } from 'react';
import { useAppContext } from '../store';
import { Plus, X, Save, Edit, Trash2 } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

export const Billing: React.FC = () => {
  const { billings, projects, addBilling, updateBilling, deleteBilling } = useAppContext();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    srNo: '',
    projectId: '',
    billNo: '',
    workNature: '',
    amount: '',
    month: '',
    certifyDate: '',
    tds: '',
    tdsPercent: '',
    retention: '',
    retentionPercent: '',
    gst: '',
    gstPercent: ''
  });

  const getPercentStr = (val: number, total: number) => {
    if (total <= 0 || val <= 0) return '';
    const pct = (val / total) * 100;
    return parseFloat(pct.toFixed(2)).toString();
  };

  const handleEdit = (bill: any) => {
    const billAmt = bill.amount || 0;
    const tdsVal = bill.tds ?? 0;
    const retVal = bill.retention ?? 0;
    const gstVal = bill.gst ?? 0;

    setFormData({
      srNo: bill.srNo,
      projectId: bill.projectId,
      billNo: bill.billNo,
      workNature: bill.workNature,
      amount: billAmt.toString(),
      month: bill.month,
      certifyDate: bill.certifyDate,
      tds: tdsVal.toString(),
      tdsPercent: getPercentStr(tdsVal, billAmt),
      retention: retVal.toString(),
      retentionPercent: getPercentStr(retVal, billAmt),
      gst: gstVal.toString(),
      gstPercent: getPercentStr(gstVal, billAmt)
    });
    setEditingId(bill.id);
    setIsAdding(true);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({
      srNo: '',
      projectId: '',
      billNo: '',
      workNature: '',
      amount: '',
      month: '',
      certifyDate: '',
      tds: '',
      tdsPercent: '',
      retention: '',
      retentionPercent: '',
      gst: '',
      gstPercent: ''
    });
  };

  const handleAmountChange = (amtVal: string) => {
    const amt = parseFloat(amtVal) || 0;
    const tPct = parseFloat(formData.tdsPercent) || 0;
    const rPct = parseFloat(formData.retentionPercent) || 0;
    const gPct = parseFloat(formData.gstPercent) || 0;

    setFormData(prev => ({
      ...prev,
      amount: amtVal,
      tds: tPct > 0 ? parseFloat((amt * tPct / 100).toFixed(2)).toString() : prev.tds,
      retention: rPct > 0 ? parseFloat((amt * rPct / 100).toFixed(2)).toString() : prev.retention,
      gst: gPct > 0 ? parseFloat((amt * gPct / 100).toFixed(2)).toString() : prev.gst
    }));
  };

  const handleTdsPercentChange = (pctVal: string) => {
    const pct = parseFloat(pctVal) || 0;
    const amt = parseFloat(formData.amount) || 0;
    setFormData(prev => ({
      ...prev,
      tdsPercent: pctVal,
      tds: pctVal !== '' ? parseFloat((amt * pct / 100).toFixed(2)).toString() : ''
    }));
  };

  const handleTdsAmountChange = (amtVal: string) => {
    const amt = parseFloat(amtVal) || 0;
    const total = parseFloat(formData.amount) || 0;
    setFormData(prev => ({
      ...prev,
      tds: amtVal,
      tdsPercent: total > 0 && amtVal !== '' ? parseFloat(((amt / total) * 100).toFixed(2)).toString() : ''
    }));
  };

  const handleRetentionPercentChange = (pctVal: string) => {
    const pct = parseFloat(pctVal) || 0;
    const amt = parseFloat(formData.amount) || 0;
    setFormData(prev => ({
      ...prev,
      retentionPercent: pctVal,
      retention: pctVal !== '' ? parseFloat((amt * pct / 100).toFixed(2)).toString() : ''
    }));
  };

  const handleRetentionAmountChange = (amtVal: string) => {
    const amt = parseFloat(amtVal) || 0;
    const total = parseFloat(formData.amount) || 0;
    setFormData(prev => ({
      ...prev,
      retention: amtVal,
      retentionPercent: total > 0 && amtVal !== '' ? parseFloat(((amt / total) * 100).toFixed(2)).toString() : ''
    }));
  };

  const handleGstPercentChange = (pctVal: string) => {
    const pct = parseFloat(pctVal) || 0;
    const amt = parseFloat(formData.amount) || 0;
    setFormData(prev => ({
      ...prev,
      gstPercent: pctVal,
      gst: pctVal !== '' ? parseFloat((amt * pct / 100).toFixed(2)).toString() : ''
    }));
  };

  const handleGstAmountChange = (amtVal: string) => {
    const amt = parseFloat(amtVal) || 0;
    const total = parseFloat(formData.amount) || 0;
    setFormData(prev => ({
      ...prev,
      gst: amtVal,
      gstPercent: total > 0 && amtVal !== '' ? parseFloat(((amt / total) * 100).toFixed(2)).toString() : ''
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const billingData = {
      ...formData,
      amount: Number(formData.amount),
      tds: Number(formData.tds || 0),
      retention: Number(formData.retention || 0),
      gst: Number(formData.gst || 0)
    };
    if (editingId) {
      updateBilling(editingId, billingData);
    } else {
      addBilling(billingData);
    }
    handleCancel();
  };

  const getProjectName = (id: string) => projects.find(p => p.id === id)?.name || 'Unknown';

  const { totalMonthly, totalYearly, overallTotals } = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const currentYear = new Date().getFullYear().toString();
    
    let monthly = 0;
    let yearly = 0;
    
    let gross = 0;
    let tds = 0;
    let retention = 0;
    let gst = 0;
    let net = 0;
    
    billings.forEach(b => {
      if (b.month === currentMonth) monthly += b.amount;
      if (b.month.startsWith(currentYear)) yearly += b.amount;
      
      const bGross = b.amount || 0;
      const bTds = b.tds ?? 0;
      const bRetention = b.retention ?? 0;
      const bGst = b.gst ?? 0;
      
      gross += bGross;
      tds += bTds;
      retention += bRetention;
      gst += bGst;
      net += (bGross - bTds - bRetention + bGst);
    });
    
    return { 
      totalMonthly: monthly, 
      totalYearly: yearly,
      overallTotals: { gross, tds, retention, gst, net }
    };
  }, [billings]);

  return (
    <div className="text-[11px]">
      <div className="flex items-center space-x-2 mb-2 bg-[#eef2f6] border border-[#8c9ba8] p-1">
        <button onClick={isAdding ? handleCancel : () => setIsAdding(true)} className="sap-btn flex items-center space-x-1">
          {isAdding ? <X size={12} className="text-red-600"/> : <Plus size={12} className="text-green-600"/>}
          <span>{isAdding ? 'Cancel' : 'New Bill'}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 mb-4 bg-gray-50 p-2 border border-[#8c9ba8]">
        <div className="sap-panel p-2 flex flex-col bg-white">
          <span className="font-semibold text-gray-600 leading-tight">Current Month Billing</span>
          <span className="text-xs font-bold text-[#0056b3] mt-0.5">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalMonthly)}
          </span>
        </div>
        <div className="sap-panel p-2 flex flex-col bg-white">
          <span className="font-semibold text-gray-600 leading-tight">Current Year Billing</span>
          <span className="text-xs font-bold text-[#0056b3] mt-0.5">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalYearly)}
          </span>
        </div>
        <div className="sap-panel p-2 flex flex-col bg-white border-l-4 border-l-blue-500">
          <span className="font-semibold text-blue-900 leading-tight">Total Work Amount</span>
          <span className="text-xs font-bold text-blue-900 mt-0.5">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(overallTotals.gross)}
          </span>
        </div>
        <div className="sap-panel p-2 flex flex-col bg-red-50/45 border-l-4 border-l-red-500">
          <span className="font-semibold text-red-950 leading-tight">Total TDS Deducted</span>
          <span className="text-xs font-bold text-red-600 mt-0.5">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(overallTotals.tds)}
          </span>
        </div>
        <div className="sap-panel p-2 flex flex-col bg-orange-50/45 border-l-4 border-l-orange-400">
          <span className="font-semibold text-orange-950 leading-tight">Total Retention</span>
          <span className="text-xs font-bold text-orange-600 mt-0.5">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(overallTotals.retention)}
          </span>
        </div>
        <div className="sap-panel p-2 flex flex-col bg-green-50/45 border-l-4 border-l-green-500">
          <span className="font-semibold text-green-950 leading-tight">Total GST Amount</span>
          <span className="text-xs font-bold text-green-700 mt-0.5">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(overallTotals.gst)}
          </span>
        </div>
        <div className="sap-panel p-2 flex flex-col bg-green-50/70 border-l-4 border-l-teal-600 lg:col-span-1 col-span-2">
          <span className="font-semibold text-[#0056b3] leading-tight">Total Net Amount</span>
          <span className="text-xs font-bold text-[#0056b3] mt-0.5">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(overallTotals.net)}
          </span>
        </div>
      </div>

      {isAdding && (
        <div className="sap-panel p-2 mb-4">
          <div className="font-semibold mb-2 border-b border-[#8c9ba8] pb-1 text-[#0056b3]">
            {editingId ? 'Edit Bill Details' : 'New Bill Details'}
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-x-4 gap-y-2 max-w-2xl">
            <div className="flex items-center">
              <label className="w-32">Sr No:</label>
              <input required type="text" className="sap-input flex-1" value={formData.srNo} onChange={e => setFormData({...formData, srNo: e.target.value})} />
            </div>
            <div className="flex items-center">
              <label className="w-32">Project:</label>
              <select required className="sap-input flex-1" value={formData.projectId} onChange={e => setFormData({...formData, projectId: e.target.value})}>
                <option value="">Select Project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="flex items-center">
              <label className="w-32">Bill No:</label>
              <input required type="text" className="sap-input flex-1" value={formData.billNo} onChange={e => setFormData({...formData, billNo: e.target.value})} />
            </div>
            <div className="flex items-center">
              <label className="w-32">Work Nature:</label>
              <input required type="text" className="sap-input flex-1" value={formData.workNature} onChange={e => setFormData({...formData, workNature: e.target.value})} />
            </div>
            <div className="flex items-center">
              <label className="w-32">Billing Amount:</label>
              <input required type="number" step="any" className="sap-input flex-1" value={formData.amount} onChange={e => handleAmountChange(e.target.value)} />
            </div>
            <div className="flex items-center">
              <label className="w-32">TDS Deducted:</label>
              <div className="flex flex-1 items-center space-x-1">
                <div className="relative w-16">
                  <input
                    type="number"
                    step="any"
                    className="sap-input w-full pr-4 text-right"
                    value={formData.tdsPercent}
                    placeholder="%"
                    onChange={e => handleTdsPercentChange(e.target.value)}
                  />
                  <span className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-500 font-normal text-[9px] pointer-events-none">%</span>
                </div>
                <span className="text-gray-400 text-[10px]">or</span>
                <div className="relative flex-1">
                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-500 font-normal text-[9px] pointer-events-none">₹</span>
                  <input
                    type="number"
                    step="any"
                    className="sap-input w-full pl-4.5"
                    value={formData.tds}
                    placeholder="Amount"
                    onChange={e => handleTdsAmountChange(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center">
              <label className="w-32">Retention Money:</label>
              <div className="flex flex-1 items-center space-x-1">
                <div className="relative w-16">
                  <input
                    type="number"
                    step="any"
                    className="sap-input w-full pr-4 text-right"
                    value={formData.retentionPercent}
                    placeholder="%"
                    onChange={e => handleRetentionPercentChange(e.target.value)}
                  />
                  <span className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-500 font-normal text-[9px] pointer-events-none">%</span>
                </div>
                <span className="text-gray-400 text-[10px]">or</span>
                <div className="relative flex-1">
                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-500 font-normal text-[9px] pointer-events-none">₹</span>
                  <input
                    type="number"
                    step="any"
                    className="sap-input w-full pl-4.5"
                    value={formData.retention}
                    placeholder="Amount"
                    onChange={e => handleRetentionAmountChange(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center">
              <label className="w-32">GST Amount:</label>
              <div className="flex flex-1 items-center space-x-1">
                <div className="relative w-16">
                  <input
                    type="number"
                    step="any"
                    className="sap-input w-full pr-4 text-right"
                    value={formData.gstPercent}
                    placeholder="%"
                    onChange={e => handleGstPercentChange(e.target.value)}
                  />
                  <span className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-500 font-normal text-[9px] pointer-events-none">%</span>
                </div>
                <span className="text-gray-400 text-[10px]">or</span>
                <div className="relative flex-1">
                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-500 font-normal text-[9px] pointer-events-none">₹</span>
                  <input
                    type="number"
                    step="any"
                    className="sap-input w-full pl-4.5"
                    value={formData.gst}
                    placeholder="Amount"
                    onChange={e => handleGstAmountChange(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center">
              <label className="w-32">Billing Month:</label>
              <input required type="month" className="sap-input flex-1" value={formData.month} onChange={e => setFormData({...formData, month: e.target.value})} />
            </div>
            <div className="flex items-center">
              <label className="w-32">Bill Certify Date:</label>
              <input required type="date" className="sap-input flex-1" value={formData.certifyDate} onChange={e => setFormData({...formData, certifyDate: e.target.value})} />
            </div>
            <div className="col-span-2 flex justify-end pt-2 space-x-2">
              <button type="submit" className="sap-btn flex items-center space-x-1">
                <Save size={12} className="text-[#0056b3]"/>
                <span>{editingId ? 'Update' : 'Save'}</span>
              </button>
              {editingId && (
                <button type="button" onClick={handleCancel} className="sap-btn flex items-center space-x-1">
                  <X size={12} className="text-red-600"/>
                  <span>Cancel</span>
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      <table className="w-full border-collapse border border-[#8c9ba8] bg-white">
        <thead className="sap-header">
          <tr>
            <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Sr No</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Project</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Bill No</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Work Nature</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Month</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Certify Date</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-right font-normal">Gross Amount</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-right font-normal">TDS (-)</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-right font-normal">Retention (-)</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-right font-normal">GST (+)</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-right font-semibold bg-green-50">Net Amount</th>
            <th className="border border-[#8c9ba8] px-2 py-1 text-center font-normal w-12">Actions</th>
          </tr>
        </thead>
        <tbody>
          {billings.map((bill) => {
            const tdsVal = bill.tds ?? 0;
            const retVal = bill.retention ?? 0;
            const gstVal = bill.gst ?? 0;
            const netAmount = bill.amount - tdsVal - retVal + gstVal;

            return (
              <tr key={bill.id} className="hover:bg-[#e6f2ff] cursor-default">
                <td className="border border-[#8c9ba8] px-2 py-1">{bill.srNo}</td>
                <td className="border border-[#8c9ba8] px-2 py-1">{getProjectName(bill.projectId)}</td>
                <td className="border border-[#8c9ba8] px-2 py-1">{bill.billNo}</td>
                <td className="border border-[#8c9ba8] px-2 py-1">{bill.workNature}</td>
                <td className="border border-[#8c9ba8] px-2 py-1">{bill.month}</td>
                <td className="border border-[#8c9ba8] px-2 py-1">{bill.certifyDate}</td>
                <td className="border border-[#8c9ba8] px-2 py-1 text-right">
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(bill.amount)}
                </td>
                <td className="border border-[#8c9ba8] px-2 py-1 text-right text-red-600">
                  {tdsVal > 0 ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(tdsVal) : '—'}
                </td>
                <td className="border border-[#8c9ba8] px-2 py-1 text-right text-orange-600">
                  {retVal > 0 ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(retVal) : '—'}
                </td>
                <td className="border border-[#8c9ba8] px-2 py-1 text-right text-green-700">
                  {gstVal > 0 ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(gstVal) : '—'}
                </td>
                <td className="border border-[#8c9ba8] px-2 py-1 text-right font-semibold bg-green-50/50 text-[#0056b3]">
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(netAmount)}
                </td>
                <td className="border border-[#8c9ba8] px-2 py-1 text-center">
                  <button onClick={() => handleEdit(bill)} className="text-blue-600 hover:text-blue-800" title="Edit">
                    <Edit size={14} />
                  </button>
                  <button onClick={() => setDeleteId(bill.id)} className="text-red-600 hover:text-red-800 ml-2" title="Delete">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            );
          })}
          {billings.length === 0 && (
            <tr>
              <td colSpan={12} className="border border-[#8c9ba8] px-2 py-4 text-center text-gray-500">No bills found.</td>
            </tr>
          )}
        </tbody>
      </table>

      <ConfirmModal
        isOpen={!!deleteId}
        title="Delete Bill"
        message="Are you sure you want to delete this bill? This action cannot be undone."
        onConfirm={() => {
          if (deleteId) deleteBilling(deleteId);
          setDeleteId(null);
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};
