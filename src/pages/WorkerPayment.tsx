import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../store';
import { Save, Edit, X, Trash2, Send, Lock, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

export const WorkerPayment: React.FC = () => {
  const { 
    user, 
    workerPayments, 
    projects, 
    workers, 
    kharchis, 
    advances, 
    paymentSheetApprovals = [],
    addWorkerPayment, 
    updateWorkerPayment, 
    deleteWorkerPayment,
    addPaymentSheetApproval
  } = useAppContext();
  
  const isReadOnly = user?.username === 'saddamsne';
  const [selectedProject, setSelectedProject] = useState('');
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitRemarks, setSubmitRemarks] = useState('');
  const [isSubmittingSheet, setIsSubmittingSheet] = useState(false);

  const [formData, setFormData] = useState({
    workerId: '', 
    month: selectedMonth, 
    workAmount: '', 
    messDeduction: '', 
    level: '',
    supplyAmount: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Keep month field updated with month selector unless editing a different month
  useEffect(() => {
    if (!editingId) {
      setFormData(prev => ({ ...prev, month: selectedMonth }));
    }
  }, [selectedMonth, editingId]);

  const handleEdit = (payment: any) => {
    setFormData({
      workerId: payment.workerId,
      month: payment.month,
      workAmount: payment.workAmount.toString(),
      messDeduction: payment.messDeduction.toString(),
      level: payment.level || '',
      supplyAmount: (payment.supplyAmount || 0).toString(),
      date: payment.date
    });
    setEditingId(payment.id);
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({ 
      workerId: '', 
      month: selectedMonth, 
      workAmount: '', 
      messDeduction: '', 
      level: '',
      supplyAmount: '',
      date: new Date().toISOString().split('T')[0] 
    });
  };

  const projectWorkers = useMemo(() => {
    if (!selectedProject) return [];
    return workers.filter(w => w.projectId === selectedProject);
  }, [selectedProject, workers]);

  // Filter payments by BOTH selected project and selected month
  const filteredPayments = useMemo(() => {
    if (!selectedProject || !selectedMonth) return [];
    return workerPayments.filter(p => p.projectId === selectedProject && p.month === selectedMonth);
  }, [selectedProject, selectedMonth, workerPayments]);

  // Find the approval status of this project for this specific month
  const currentApproval = useMemo(() => {
    if (!selectedProject || !selectedMonth) return null;
    return paymentSheetApprovals.find(
      psa => psa.projectId === selectedProject && psa.month === selectedMonth
    );
  }, [paymentSheetApprovals, selectedProject, selectedMonth]);

  // Is editing completely locked because of Pending/Approved status?
  const isLocked = useMemo(() => {
    if (isReadOnly) return true;
    if (!currentApproval) return false;
    return currentApproval.status === 'Pending' || currentApproval.status === 'Approved';
  }, [currentApproval, isReadOnly]);

  // Auto-calculate deductions based on selected worker and month
  const autoCalculations = useMemo(() => {
    if (!formData.workerId || !formData.month) return { kharchi: 0, advance: 0 };
    
    // Kharchi for the selected month
    const kharchiTotal = kharchis
      .filter(k => k.workerId === formData.workerId && k.date.startsWith(formData.month))
      .reduce((sum, k) => sum + k.amount, 0);
      
    // Advance for the selected month
    const advanceTotal = advances
      .filter(a => a.workerId === formData.workerId && a.date.startsWith(formData.month))
      .reduce((sum, a) => sum + a.amount, 0);
      
    return { kharchi: kharchiTotal, advance: advanceTotal };
  }, [formData.workerId, formData.month, kharchis, advances]);

  const netPayment = useMemo(() => {
    const workAmount = Number(formData.workAmount) || 0;
    const messDeduction = Number(formData.messDeduction) || 0;
    const supplyAmount = Number(formData.supplyAmount) || 0;
    return workAmount + supplyAmount - messDeduction - autoCalculations.kharchi - autoCalculations.advance;
  }, [formData.workAmount, formData.messDeduction, formData.supplyAmount, autoCalculations]);

  // Calculate table column aggregations (matching Excel style)
  const totals = useMemo(() => {
    return filteredPayments.reduce((acc, p) => {
      acc.gross += p.workAmount;
      acc.supply += p.supplyAmount || 0;
      acc.mess += p.messDeduction;
      acc.kharchi += p.kharchiDeduction;
      acc.advance += p.advanceDeduction;
      acc.net += p.netPayment;
      return acc;
    }, { gross: 0, supply: 0, mess: 0, kharchi: 0, advance: 0, net: 0 });
  }, [filteredPayments]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || isLocked) return;
    
    const paymentData = {
      projectId: selectedProject,
      workerId: formData.workerId,
      month: formData.month,
      workAmount: Number(formData.workAmount),
      messDeduction: Number(formData.messDeduction),
      kharchiDeduction: autoCalculations.kharchi,
      advanceDeduction: autoCalculations.advance,
      netPayment: netPayment,
      date: formData.date,
      level: formData.level || undefined,
      supplyAmount: Number(formData.supplyAmount || 0)
    };

    if (editingId) {
      updateWorkerPayment(editingId, paymentData);
    } else {
      addWorkerPayment(paymentData);
    }
    
    handleCancel();
  };

  const handleSendToApproval = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || filteredPayments.length === 0 || isLocked) return;

    addPaymentSheetApproval({
      projectId: selectedProject,
      month: selectedMonth,
      totalAmount: totals.net,
      remarks: submitRemarks || `Monthly payment sheet generated for ${selectedMonth}`,
      date: new Date().toISOString().split('T')[0]
    });

    setSubmitRemarks('');
    setIsSubmittingSheet(false);
  };

  const getWorkerDetails = (id: string) => {
    const worker = workers.find(w => w.id === id);
    return worker ? { name: worker.name, idNo: worker.workerId, srNo: worker.serialNo } : { name: 'Unknown', idNo: '-', srNo: '-' };
  };

  return (
    <div className="text-[11px] space-y-3">
      {/* Selector controls panel */}
      <div className="sap-panel p-2.5 flex flex-wrap items-center gap-4 bg-[#f8f9fa] border border-[#8c9ba8]">
        <div className="flex items-center space-x-2">
          <label className="font-bold text-gray-700">Project Site:</label>
          <select 
            className="sap-input w-48 font-semibold" 
            value={selectedProject} 
            onChange={e => setSelectedProject(e.target.value)}
          >
            <option value="">-- Choose Project --</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {selectedProject && (
          <div className="flex items-center space-x-2">
            <label className="font-bold text-gray-700">Wage Month:</label>
            <input 
              type="month" 
              className="sap-input w-36 font-semibold" 
              value={selectedMonth} 
              onChange={e => {
                setSelectedMonth(e.target.value);
                handleCancel();
              }}
            />
          </div>
        )}
      </div>

      {/* Lock and Approval Workflows Indicators */}
      {selectedProject && currentApproval && (
        <div className={`p-2.5 border-l-4 flex items-start space-x-2 rounded-sm ${
          currentApproval.status === 'Approved' 
            ? 'bg-green-50 border-l-green-600 border-green-200 text-green-900'
            : currentApproval.status === 'Rejected'
            ? 'bg-red-50 border-l-red-600 border-red-200 text-red-900'
            : 'bg-yellow-50 border-l-yellow-600 border-yellow-250 text-yellow-900'
        }`}>
          {currentApproval.status === 'Approved' ? (
            <CheckCircle2 className="text-green-600 shrink-0 mt-0.5" size={14} />
          ) : currentApproval.status === 'Rejected' ? (
            <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={14} />
          ) : (
            <Lock className="text-yellow-650 shrink-0 mt-0.5" size={14} />
          )}
          <div className="flex-1">
            <div className="font-bold text-[11px] flex items-center justify-between">
              <span>
                Monthly Payment Sheet Status: <strong className="uppercase">{currentApproval.status}</strong>
              </span>
              <span className="font-mono text-[9px] text-gray-500 font-normal">
                Submitted: {currentApproval.date}
              </span>
            </div>
            <p className="text-[10px] text-gray-700 font-sans mt-0.5 leading-relaxed">
              {currentApproval.status === 'Approved' 
                ? '🔒 This sheet has been Approved by Owner Saddam Hussain. All records are locked for audit compliance.'
                : currentApproval.status === 'Rejected'
                ? '⚠️ This monthly sheet was Rejected by the Owner. You can modify records below and resubmit for approval.'
                : '⏳ This sheet is currently Pending review by Saddam Hussain. All entry controls are locked until decision.'
              }
            </p>
            {currentApproval.remarks && (
              <div className="text-[10px] mt-1 italic font-sans text-gray-600">
                Owner Remarks: "{currentApproval.remarks}"
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment entry form (Hidden when locked) */}
      {selectedProject && !isLocked && (
        <div className="sap-panel p-2.5 border-l-4 border-l-[#0056b3]">
          <div className="font-bold mb-2.5 pb-1 border-b border-[#8c9ba8] text-[#0056b3] uppercase tracking-wider text-[10px]">
            {editingId ? 'Modify Recorded Payment Details' : 'Record Worker Wages & Deductions'}
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col">
                <label className="font-semibold text-gray-600 mb-1">Select Worker:</label>
                <select 
                  required 
                  className="sap-input" 
                  value={formData.workerId} 
                  onChange={e => setFormData({...formData, workerId: e.target.value})}
                >
                  <option value="">-- Choose Worker --</option>
                  {projectWorkers.map(w => <option key={w.id} value={w.id}>{w.name} ({w.workerId})</option>)}
                </select>
              </div>

              <div className="flex flex-col">
                <label className="font-semibold text-gray-600 mb-1 font-mono">Month:</label>
                <input 
                  required 
                  type="month" 
                  className="sap-input font-bold bg-[#f1f3f5]" 
                  value={formData.month} 
                  disabled
                />
              </div>

              <div className="flex flex-col">
                <label className="font-semibold text-gray-600 mb-1">Wage Issue Date:</label>
                <input 
                  required 
                  type="date" 
                  className="sap-input" 
                  value={formData.date} 
                  onChange={e => setFormData({...formData, date: e.target.value})} 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col">
                <label className="font-semibold text-gray-600 mb-1">Gross Work Amount (INR):</label>
                <input 
                  required 
                  type="number" 
                  step="any"
                  className="sap-input font-bold" 
                  placeholder="₹ Earned before savings/advances"
                  value={formData.workAmount} 
                  onChange={e => setFormData({...formData, workAmount: e.target.value})} 
                />
              </div>

              <div className="flex flex-col">
                <label className="font-semibold text-gray-600 mb-1">Mess Deduction (INR):</label>
                <input 
                  required 
                  type="number" 
                  step="any"
                  className="sap-input font-bold text-red-650" 
                  placeholder="Deducted mess cost sum"
                  value={formData.messDeduction} 
                  onChange={e => setFormData({...formData, messDeduction: e.target.value})} 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col">
                <label className="font-semibold text-gray-600 mb-1">Work Area / Location (Level):</label>
                <input 
                  type="text" 
                  className="sap-input font-semibold"
                  placeholder="e.g. Block A, Ground Floor, Level 1"
                  value={formData.level}
                  onChange={e => setFormData({...formData, level: e.target.value})}
                />
              </div>

              <div className="flex flex-col">
                <label className="font-semibold text-gray-600 mb-1">Supply Amount (INR):</label>
                <input 
                  type="number" 
                  step="any"
                  className="sap-input font-bold text-green-700" 
                  placeholder="₹ Supply amount to add to total amount"
                  value={formData.supplyAmount} 
                  onChange={e => setFormData({...formData, supplyAmount: e.target.value})} 
                />
              </div>
            </div>

            {/* Calculations Workspace */}
            <div className="grid grid-cols-3 gap-3 bg-[#eef2f6] p-2.5 border border-[#8c9ba8] rounded-sm">
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-500 uppercase tracking-tight">Month Kharchi (Deducted)</span>
                <span className="font-mono font-bold text-red-650 text-xs mt-0.5">₹{autoCalculations.kharchi.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-500 uppercase tracking-tight">Month Capital Advance</span>
                <span className="font-mono font-bold text-red-650 text-xs mt-0.5">₹{autoCalculations.advance.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex flex-col justify-center bg-[#cce5ff] px-2 py-1.5 border border-[#99ccff] rounded-sm">
                <span className="text-[9px] text-[#0056b3] uppercase font-bold tracking-tight">Calculated Net Payable</span>
                <span className="font-mono font-black text-[#0056b3] text-sm leading-none mt-0.5">₹{netPayment.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-1">
              <button type="submit" className="sap-btn flex items-center space-x-1">
                <Save size={12} className="text-[#0056b3]"/>
                <span>{editingId ? 'Update Ledger' : 'Record Wage Ledger'}</span>
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

      {selectedProject && (
        <div className="space-y-3">
          {/* Table Header Row with dynamic submission widget if MD is active and not submitted yet */}
          <div className="flex items-center justify-between pb-1 text-gray-800">
            <span className="text-[12px] font-bold text-[#002f6c] bg-[#eef2f6] px-2 py-0.5 border border-[#8c9ba8]">
              Wage Ledger Table: {selectedMonth}
            </span>

            {!isLocked && filteredPayments.length > 0 && (
              <div>
                {!isSubmittingSheet ? (
                  <button
                    onClick={() => setIsSubmittingSheet(true)}
                    className="sap-btn bg-green-700 hover:bg-green-800 text-white font-bold flex items-center space-x-1 py-1"
                  >
                    <Send size={11} className="text-white" />
                    <span>Submit {selectedMonth} Sheet to Owner</span>
                  </button>
                ) : (
                  <form onSubmit={handleSendToApproval} className="flex items-center space-x-2 bg-[#f8f9fa] border border-[#8c9ba8] p-1 shadow-sm rounded-sm">
                    <input
                      type="text"
                      className="sap-input w-48 py-0.5 px-1.5"
                      placeholder="Remarks / Note for owner..."
                      value={submitRemarks}
                      onChange={e => setSubmitRemarks(e.target.value)}
                    />
                    <button type="submit" className="sap-btn py-0.5 px-2 bg-green-700 text-white font-bold">
                      Confirm Submit
                    </button>
                    <button type="button" onClick={() => setIsSubmittingSheet(false)} className="sap-btn py-0.5 text-red-600">
                      Cancel
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          <table className="w-full border-collapse border border-[#8c9ba8] bg-white text-[11px]">
            <thead className="sap-header bg-[#eef2f6]">
              <tr>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal w-12">Sr No</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal w-16">ID No</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Worker Name</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal w-28">Work Area / Location</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal w-16">Month</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-right font-normal bg-gray-50 w-24">Gross wages</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-right font-normal bg-gray-50 w-20">Supply Amt</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-right font-normal text-red-600 bg-gray-50 w-20">Mess Ded.</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-right font-normal text-red-600 bg-gray-50 w-20">Kharchi Ded.</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-right font-normal text-red-600 bg-gray-50 w-20">Advance Ded.</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-right font-bold text-green-700 bg-green-50 w-28">Net Payable</th>
                {!isLocked && <th className="border border-[#8c9ba8] px-2 py-1 text-center font-normal w-16">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((payment) => {
                const worker = getWorkerDetails(payment.workerId);
                return (
                  <tr key={payment.id} className="hover:bg-[#e6f2ff] cursor-default font-mono">
                    <td className="border border-[#8c9ba8] px-2 py-1 text-gray-500 font-bold">{worker.srNo || '-'}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1 text-gray-500 font-bold">{worker.idNo}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1 font-sans font-semibold text-gray-800">{worker.name}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1 font-sans text-gray-700">{payment.level || <span className="text-gray-400 italic">None</span>}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1 font-mono">{payment.month}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1 text-right font-medium">₹{payment.workAmount.toLocaleString('en-IN')}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1 text-right text-green-700 font-semibold bg-green-50/25">₹{(payment.supplyAmount || 0).toLocaleString('en-IN')}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1 text-right text-red-600">₹{payment.messDeduction.toLocaleString('en-IN')}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1 text-right text-red-650">₹{payment.kharchiDeduction.toLocaleString('en-IN')}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1 text-right text-red-650">₹{payment.advanceDeduction.toLocaleString('en-IN')}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1 text-right font-bold text-green-750 bg-green-50/50">
                      ₹{payment.netPayment.toLocaleString('en-IN')}
                    </td>
                    {!isLocked && (
                      <td className="border border-[#8c9ba8] px-2 py-1 text-center font-sans">
                        <div className="flex items-center justify-center space-x-2">
                          <button onClick={() => handleEdit(payment)} className="text-blue-600 hover:text-blue-800" title="Edit">
                            <Edit size={12} />
                          </button>
                          <button onClick={() => setDeleteId(payment.id)} className="text-red-500 hover:text-red-700" title="Delete">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              
              {/* Total Aggregate Sum Row (Excel structure matching) */}
              {filteredPayments.length > 0 && (
                <tr className="bg-gray-100 font-mono font-bold text-gray-900 border-t-2 border-[#8c9ba8]">
                  <td colSpan={5} className="border border-[#8c9ba8] px-2 py-1 text-right font-sans uppercase text-[10px]">
                    Total Month Summary:
                  </td>
                  <td className="border border-[#8c9ba8] px-2 py-1 text-right">
                    ₹{totals.gross.toLocaleString('en-IN')}
                  </td>
                  <td className="border border-[#8c9ba8] px-2 py-1 text-right text-green-700">
                    ₹{(totals.supply || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="border border-[#8c9ba8] px-2 py-1 text-right text-red-600">
                    ₹{totals.mess.toLocaleString('en-IN')}
                  </td>
                  <td className="border border-[#8c9ba8] px-2 py-1 text-right text-red-650">
                    ₹{totals.kharchi.toLocaleString('en-IN')}
                  </td>
                  <td className="border border-[#8c9ba8] px-2 py-1 text-right text-red-650">
                    ₹{totals.advance.toLocaleString('en-IN')}
                  </td>
                  <td className="border border-[#8c9ba8] px-2 py-1 text-right font-black text-green-800 bg-green-100/70 text-[11px]">
                    ₹{totals.net.toLocaleString('en-IN')}
                  </td>
                  {!isLocked && <td className="border border-[#8c9ba8] px-2 py-1"></td>}
                </tr>
              )}

              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={isLocked ? 11 : 12} className="border border-[#8c9ba8] px-2 py-4 text-center text-gray-400 font-sans">
                    No payment records found for {selectedMonth} in this project. Use controls above to record new wage ledgers.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation modal */}
      <ConfirmModal
        isOpen={!!deleteId}
        title="Delete Worker Payment"
        message="Are you sure you want to delete this payment record? This action cannot be undone."
        onConfirm={() => {
          if (deleteId) deleteWorkerPayment(deleteId);
          setDeleteId(null);
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};
