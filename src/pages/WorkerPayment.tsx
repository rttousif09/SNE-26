import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAppContext } from '../store';
import { Save, Edit, X, Trash2, Send, Lock, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { checkWorkerPaymentDuplicate, addOverrideLog } from '../lib/duplicateChecker';
import { DuplicateWarningModal } from '../components/DuplicateWarningModal';

export const WorkerPayment: React.FC = () => {
  const { 
    user, 
    workerPayments, 
    projects, 
    workers, 
    kharchis, 
    advances, 
    paymentSheetApprovals = [],
    workerLedger = [],
    addWorkerPayment, 
    updateWorkerPayment, 
    deleteWorkerPayment,
    addPaymentSheetApproval
  } = useAppContext();
  
  const isReadOnly = user?.username === 'saddamsne';
  const [selectedProject, setSelectedProject] = useState('');
  
  // Duplicate verification state
  const [dupModalOpen, setDupModalOpen] = useState(false);
  const [dupData, setDupData] = useState<any[]>([]);
  const [pendingSaveFn, setPendingSaveFn] = useState<((overrideReason?: string) => void) | null>(null);
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedCategory, setSelectedCategory] = useState('Monthly work');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitRemarks, setSubmitRemarks] = useState('');
  const [isSubmittingSheet, setIsSubmittingSheet] = useState(false);
  const [showSupplyModal, setShowSupplyModal] = useState(false);
  const [showSupplyReport, setShowSupplyReport] = useState(false);
  const [showPaymentSheetReport, setShowPaymentSheetReport] = useState(false);
  const [supplyEntry, setSupplyEntry] = useState({ description: '', hours: '', rate: '' });

  const [formData, setFormData] = useState({
    workerId: '', 
    month: selectedMonth, 
    workAmount: '', 
    workDays: '',
    ratePerDay: '',
    overtimeHours: '',
    allowance: '',
    manualKharchi: '',
    messDeduction: '', 
    level: '',
    supplyAmount: '',
    date: new Date().toISOString().split('T')[0],
    supplyDetails: [] as import('../types').SupplyDetail[],
    recoveryAmount: '',
    otherDeduction: '',
    otherDeductionDetails: '',
    paymentStatus: 'Pending'
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
      workDays: payment.workDays ? payment.workDays.toString() : '',
      ratePerDay: payment.ratePerDay ? payment.ratePerDay.toString() : '',
      overtimeHours: payment.overtimeHours ? payment.overtimeHours.toString() : '',
      allowance: payment.allowance ? payment.allowance.toString() : '',
      manualKharchi: payment.kharchiDeduction ? payment.kharchiDeduction.toString() : '',
      messDeduction: payment.messDeduction.toString(),
      level: payment.level || '',
      supplyAmount: (payment.supplyAmount || 0).toString(),
      date: payment.date,
      supplyDetails: payment.supplyDetails ? JSON.parse(payment.supplyDetails) : [],
      recoveryAmount: payment.recoveryAmount ? payment.recoveryAmount.toString() : '',
      otherDeduction: payment.otherDeduction ? payment.otherDeduction.toString() : '',
      otherDeductionDetails: payment.otherDeductionDetails || '',
      paymentStatus: payment.paymentStatus || 'Pending'
    });
    setEditingId(payment.id);
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({ 
      workerId: '', 
      month: selectedMonth, 
      workAmount: '', 
      workDays: '',
      ratePerDay: '',
      overtimeHours: '',
      allowance: '',
      manualKharchi: '',
      messDeduction: '', 
      level: '',
      supplyAmount: '',
      date: new Date().toISOString().split('T')[0],
      supplyDetails: [],
      recoveryAmount: '',
      otherDeduction: '',
      otherDeductionDetails: '',
      paymentStatus: 'Pending'
    });
  };

  const projectWorkers = useMemo(() => {
    if (!selectedProject) return [];
    return workers.filter(w => w.projectId === selectedProject);
  }, [selectedProject, workers]);

  // Filter payments by BOTH selected project and selected month
  const filteredPayments = useMemo(() => {
    if (!selectedProject || !selectedMonth) return [];
    return workerPayments.filter(p => 
      p.projectId === selectedProject && 
      p.month === selectedMonth && 
      (p.workCategory || 'Monthly work') === selectedCategory
    );
  }, [selectedProject, selectedMonth, selectedCategory, workerPayments]);

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

  // Calculate historical total outstanding advance for selected worker
  const workerOutstandingAdvance = useMemo(() => {
    if (!formData.workerId) return 0;
    const totalAdvancesGiven = advances
      .filter(a => a.workerId === formData.workerId)
      .reduce((sum, a) => sum + a.amount, 0);

    const totalRecovered = workerPayments
      .filter(p => p.workerId === formData.workerId && p.id !== editingId)
      .reduce((sum, p) => sum + (p.recoveryAmount || 0), 0);

    const manualBalanceContribution = workerLedger
      .filter(l => l.workerId === formData.workerId)
      .reduce((sum, l) => sum + l.debit - l.credit, 0);

    return Math.max(0, totalAdvancesGiven - totalRecovered + manualBalanceContribution);
  }, [formData.workerId, advances, workerPayments, workerLedger, editingId]);

  const calculatedValues = useMemo(() => {
    let finalWorkAmount = Number(formData.workAmount) || 0;
    let finalKharchi = autoCalculations.kharchi;

    if (selectedCategory === 'Monthly work') {
      const days = Number(formData.workDays) || 0;
      const rate = Number(formData.ratePerDay) || 0;
      const otHours = Number(formData.overtimeHours) || 0;
      const otRate = rate / 12;
      const allow = Number(formData.allowance) || 0;
      
      finalWorkAmount = (days * rate) + (otHours * otRate) + allow;
      // manual kharchi
      finalKharchi = Number(formData.manualKharchi) || 0;
    }

    const messDeduction = Number(formData.messDeduction) || 0;
    const supplyAmount = Number(formData.supplyAmount) || 0;
    const recoveryAmount = Number(formData.recoveryAmount) || 0;
    const otherDeductionAmount = Number(formData.otherDeduction) || 0;
    
    const netPayment = finalWorkAmount + supplyAmount - messDeduction - finalKharchi - autoCalculations.advance - recoveryAmount - otherDeductionAmount;
    
    return {
      workAmount: finalWorkAmount,
      kharchi: finalKharchi,
      recoveryAmount,
      otherDeduction: otherDeductionAmount,
      netPayment
    };
  }, [formData, autoCalculations, selectedCategory]);

  const netPayment = calculatedValues.netPayment;

  // Calculate table column aggregations (matching Excel style)
  const totals = useMemo(() => {
    return filteredPayments.reduce((acc, p) => {
      acc.gross += p.workAmount;
      acc.supply += p.supplyAmount || 0;
      acc.mess += p.messDeduction;
      acc.kharchi += p.kharchiDeduction;
      acc.advance += p.advanceDeduction;
      acc.recovery += p.recoveryAmount || 0;
      acc.otherDeduction += p.otherDeduction || 0;
      acc.net += p.netPayment;
      return acc;
    }, { gross: 0, supply: 0, mess: 0, kharchi: 0, advance: 0, recovery: 0, otherDeduction: 0, net: 0 });
  }, [filteredPayments]);

  const allSupplyWorksInfo = useMemo(() => {
    return filteredPayments.flatMap(payment => {
      try {
        const details = payment.supplyDetails ? JSON.parse(payment.supplyDetails) : [];
        return details.map((d: any) => ({
          ...d,
          workerName: workers.find(w => w.id === payment.workerId)?.name || 'Unknown',
          paymentId: payment.id,
        }));
      } catch (e) { return []; }
    });
  }, [filteredPayments, workers]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || isLocked) return;
    
    const paymentData = {
      projectId: selectedProject,
      workerId: formData.workerId,
      month: formData.month,
      workAmount: calculatedValues.workAmount,
      workDays: selectedCategory === 'Monthly work' ? Number(formData.workDays) || 0 : undefined,
      ratePerDay: selectedCategory === 'Monthly work' ? Number(formData.ratePerDay) || 0 : undefined,
      overtimeHours: selectedCategory === 'Monthly work' ? Number(formData.overtimeHours) || 0 : undefined,
      allowance: selectedCategory === 'Monthly work' ? Number(formData.allowance) || 0 : undefined,
      messDeduction: Number(formData.messDeduction),
      kharchiDeduction: calculatedValues.kharchi,
      advanceDeduction: autoCalculations.advance,
      netPayment: netPayment,
      date: formData.date,
      level: formData.level || undefined,
      workCategory: selectedCategory,
      supplyAmount: Number(formData.supplyAmount || 0),
      supplyDetails: formData.supplyDetails.length > 0 ? JSON.stringify(formData.supplyDetails) : undefined,
      recoveryAmount: Number(formData.recoveryAmount || 0),
      otherDeduction: Number(formData.otherDeduction || 0),
      otherDeductionDetails: formData.otherDeductionDetails,
      paymentStatus: (formData.paymentStatus || 'Pending') as 'Pending' | 'Paid'
    };

    const onProceedSave = (bypassCheck: boolean = false, overrideReason: string = '') => {
      if (editingId) {
        updateWorkerPayment(editingId, paymentData);
      } else {
        addWorkerPayment(paymentData);
      }
      
      if (bypassCheck && overrideReason) {
        addOverrideLog(
          user?.username || 'Unknown',
          'Worker Payment',
          `Worker: ${workers.find(w => w.id === formData.workerId)?.name || 'Unknown'} (ID: ${formData.workerId}), Period: ${formData.month}, Date: ${formData.date}, Net Amount: Rs ${netPayment.toLocaleString()}`,
          overrideReason
        );
      }
      handleCancel();
    };

    const countMatches = checkWorkerPaymentDuplicate(
      workerPayments,
      {
         workerId: formData.workerId,
         month: formData.month,
         date: formData.date,
         amount: netPayment
      },
      editingId || undefined
    );

    if (countMatches.length > 0) {
      setDupData(countMatches);
      setPendingSaveFn(() => (reason?: string) => onProceedSave(true, reason || 'No details'));
      setDupModalOpen(true);
      return;
    }

    onProceedSave();
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

  const handleAddSupplyWork = () => {
    if (!supplyEntry.description || !supplyEntry.hours || !supplyEntry.rate) return;
    const hours = Number(supplyEntry.hours) || 0;
    const rate = Number(supplyEntry.rate) || 0;
    const total = hours * rate;
    
    setFormData(prev => {
      const newDetails = [...prev.supplyDetails, { id: crypto.randomUUID(), description: supplyEntry.description, hours, rate, total }];
      const newSupplyAmount = newDetails.reduce((sum, d) => sum + d.total, 0);
      return { ...prev, supplyDetails: newDetails, supplyAmount: newSupplyAmount.toString() };
    });
    setSupplyEntry({ description: '', hours: '', rate: '' });
  };

  const handleRemoveSupplyWork = (id: string) => {
    setFormData(prev => {
      const newDetails = prev.supplyDetails.filter(d => d.id !== id);
      const newSupplyAmount = newDetails.reduce((sum, d) => sum + d.total, 0);
      return { ...prev, supplyDetails: newDetails, supplyAmount: newSupplyAmount.toString() };
    });
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
          <>
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
            
            <div className="flex items-center space-x-2">
              <label className="font-bold text-gray-700">Work Category:</label>
              <select 
                className="sap-input w-40 font-semibold" 
                value={selectedCategory} 
                onChange={e => {
                  setSelectedCategory(e.target.value);
                  handleCancel();
                }}
              >
                <option value="Monthly work">Monthly work</option>
                <option value="Contract work">Contract work</option>
              </select>
            </div>
          </>
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

            {selectedCategory === 'Monthly work' && (
              <div className="grid grid-cols-4 gap-3 bg-blue-50/50 p-2 border border-blue-100 rounded-sm mb-3 mt-1">
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-gray-700">Work Days:</label>
                  <input
                    required
                    type="number"
                    step="any"
                    className="sap-input font-bold"
                    value={formData.workDays}
                    onChange={e => setFormData({...formData, workDays: e.target.value})}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-gray-700">Rate / Day (INR):</label>
                  <input
                    required
                    type="number"
                    step="any"
                    className="sap-input font-bold"
                    value={formData.ratePerDay}
                    onChange={e => setFormData({...formData, ratePerDay: e.target.value})}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-gray-700">OT (Hours):</label>
                  <input
                    type="number"
                    step="any"
                    className="sap-input font-bold"
                    value={formData.overtimeHours}
                    onChange={e => setFormData({...formData, overtimeHours: e.target.value})}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-gray-700">Allowance (INR):</label>
                  <input
                    type="number"
                    step="any"
                    className="sap-input font-bold text-green-700"
                    value={formData.allowance}
                    onChange={e => setFormData({...formData, allowance: e.target.value})}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {selectedCategory === 'Contract work' && (
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
              )}
              {selectedCategory === 'Monthly work' && (
                <div className="flex flex-col">
                  <label className="font-semibold text-gray-600 mb-1">Manual Kharchi (INR):</label>
                  <input 
                    type="number" 
                    step="any"
                    className="sap-input font-bold text-red-650" 
                    placeholder="Manual deduction"
                    value={formData.manualKharchi} 
                    onChange={e => setFormData({...formData, manualKharchi: e.target.value})} 
                  />
                </div>
              )}

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
                <div className="flex flex-row space-x-2">
                  <input 
                    type="number" 
                    step="any"
                    readOnly
                    className="sap-input font-bold text-green-700 flex-1 bg-gray-50" 
                    placeholder="₹ Supply amount"
                    value={formData.supplyAmount} 
                  />
                  <button type="button" onClick={() => setShowSupplyModal(true)} className="sap-btn bg-gray-800 hover:bg-gray-900 border-gray-900 text-white flex items-center space-x-1 px-3">
                    <span className="text-white">+ Details</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-amber-50/30 p-2 border border-amber-200 rounded-sm">
              <div className="flex flex-col">
                <label className="font-semibold text-gray-700 mb-1 flex justify-between items-center">
                  <span>Recovery Amount from Outstanding Advance (INR):</span>
                  {formData.workerId && (
                    <span className="font-mono text-[9px] text-amber-800 font-bold bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">
                      O/S Advance: ₹{workerOutstandingAdvance.toLocaleString('en-IN')}
                    </span>
                  )}
                </label>
                <input 
                  type="number" 
                  step="any"
                  className="sap-input font-bold text-red-650 bg-amber-50/50" 
                  placeholder="E.g. 1000, 2000"
                  value={formData.recoveryAmount} 
                  onChange={e => setFormData({...formData, recoveryAmount: e.target.value})} 
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col">
                  <label className="font-semibold text-gray-700 mb-1">Other Deduction (INR):</label>
                  <input 
                    type="number" 
                    step="any"
                    className="sap-input text-red-650"
                    placeholder="E.g. 500"
                    value={formData.otherDeduction}
                    onChange={e => setFormData({...formData, otherDeduction: e.target.value})}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="font-semibold text-gray-700 mb-1">Other Deduction Details:</label>
                  <input 
                    type="text" 
                    className="sap-input"
                    placeholder="Reason..."
                    value={formData.otherDeductionDetails}
                    onChange={e => setFormData({...formData, otherDeductionDetails: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex flex-col">
                <label className="font-semibold text-gray-700 mb-1">Payment Status:</label>
                <select 
                  className="sap-input font-bold text-blue-700"
                  value={formData.paymentStatus}
                  onChange={e => setFormData({...formData, paymentStatus: e.target.value})}
                >
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>
            </div>

            {/* Calculations Workspace */}
            <div className="grid gap-3 p-2.5 border border-[#8c9ba8] rounded-sm bg-[#eef2f6] grid-cols-4 md:grid-cols-5">
              {selectedCategory === 'Monthly work' ? (
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 uppercase tracking-tight font-bold">Clc. Gross Wage</span>
                  <span className="font-mono font-bold text-gray-800 text-xs mt-0.5">₹{calculatedValues.workAmount.toLocaleString('en-IN')}</span>
                </div>
              ) : (
                <div className="hidden"></div>
              )}
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-500 uppercase tracking-tight font-bold">Pocket-Money (Kharchi)</span>
                <span className="font-mono font-bold text-red-650 text-xs mt-0.5">₹{calculatedValues.kharchi.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-500 uppercase tracking-tight font-bold">Capital Advance (Month)</span>
                <span className="font-mono font-bold text-red-650 text-xs mt-0.5">₹{autoCalculations.advance.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-amber-805 uppercase tracking-tight font-bold">Advance Recovery (Ded.)</span>
                <span className="font-mono font-bold text-red-750 text-xs mt-0.5">₹{calculatedValues.recoveryAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-amber-805 uppercase tracking-tight font-bold">Other Ded.</span>
                <span className="font-mono font-bold text-red-750 text-xs mt-0.5">₹{calculatedValues.otherDeduction.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex flex-col justify-center bg-[#cce5ff] px-2 py-1.5 border border-[#99ccff] rounded-sm col-span-1">
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
              Wage Ledger Table: {selectedMonth} | {selectedCategory}
            </span>

            <div className="flex space-x-2 items-center">
              {filteredPayments.length > 0 && (
                <>
                  <button
                    onClick={() => setShowPaymentSheetReport(true)}
                    className="sap-btn bg-[#f8f9fa] border-gray-300 text-gray-800 hover:bg-gray-100 font-bold flex items-center space-x-1 py-1"
                  >
                    <span>Print Sheet</span>
                  </button>
                  <button
                    onClick={() => setShowSupplyReport(true)}
                    className="sap-btn bg-[#f8f9fa] border-gray-300 text-gray-800 hover:bg-gray-100 font-bold flex items-center space-x-1 py-1"
                  >
                    <span>Supply Work Report</span>
                  </button>
                </>
              )}

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
                <th className="border border-[#8c9ba8] px-2 py-1 text-right font-normal text-amber-800 bg-amber-50 w-24">Recovery (Adv)</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-right font-normal text-red-700 bg-red-50 w-20">Other Ded.</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-right font-bold text-green-700 bg-green-50 w-28">Net Payable</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-center font-normal w-16 bg-gray-50">Status</th>
                {!isLocked && <th className="border border-[#8c9ba8] px-2 py-1 text-center font-normal w-16">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((payment, idx) => {
                const worker = getWorkerDetails(payment.workerId);
                const isPending = currentApproval?.status === 'Pending';
                return (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={isPending ? { opacity: 1, y: 0, backgroundColor: ['#ffffff', '#fff8e1', '#ffffff'] } : { opacity: 1, y: 0, backgroundColor: '#ffffff' }} 
                    transition={isPending ? { backgroundColor: { repeat: Infinity, duration: 2.5, ease: "easeInOut" }, default: { duration: 0.2 } } : { duration: 0.2 }} 
                    key={payment.id} 
                    className="hover:bg-[#e6f2ff] cursor-default font-mono"
                    title={payment.otherDeductionDetails ? `Other Ded: ${payment.otherDeductionDetails}` : undefined}
                  >
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
                    <td className="border border-[#8c9ba8] px-2 py-1 text-right text-amber-800 bg-amber-50/15">₹{(payment.recoveryAmount || 0).toLocaleString('en-IN')}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1 text-right text-red-700 bg-red-50/30">₹{(payment.otherDeduction || 0).toLocaleString('en-IN')}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1 text-right font-bold text-green-750 bg-green-50/50">
                      ₹{payment.netPayment.toLocaleString('en-IN')}
                    </td>
                    <td className="border border-[#8c9ba8] px-2 py-1 text-center">
                      <span className={`px-1.5 py-0.5 rounded-sm font-sans font-bold text-[9px] uppercase tracking-wider ${
                        payment.paymentStatus === 'Paid' 
                          ? 'bg-green-100 text-green-800 border border-green-200' 
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {payment.paymentStatus || 'Pending'}
                      </span>
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
                  </motion.tr>
                );
              })}
              
              {/* Total Aggregate Sum Row (Excel structure matching) */}
              {filteredPayments.length > 0 && (
                <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="bg-gray-100 font-mono font-bold text-gray-900 border-t-2 border-[#8c9ba8]">
                  <td colSpan={5} className="border border-[#8c9ba8] px-2 py-1 text-right font-sans uppercase text-[10px]">
                    Total Month Summary:
                  </td>
                  <td className="border border-[#8c9ba8] px-2 py-1 text-right">
                    ₹{totals.gross.toLocaleString('en-IN')}
                  </td>
                  <td className="border border-[#8c9ba8] px-2 py-1 text-right text-green-700">
                    ₹{(totals.supply || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="border border-[#8c9ba8] px-2 py-1 text-right text-red-650">
                    ₹{totals.mess.toLocaleString('en-IN')}
                  </td>
                  <td className="border border-[#8c9ba8] px-2 py-1 text-right text-red-650">
                    ₹{totals.kharchi.toLocaleString('en-IN')}
                  </td>
                  <td className="border border-[#8c9ba8] px-2 py-1 text-right text-red-650">
                    ₹{totals.advance.toLocaleString('en-IN')}
                  </td>
                  <td className="border border-[#8c9ba8] px-2 py-1 text-right text-amber-800 bg-amber-50/20 font-bold">
                    ₹{totals.recovery.toLocaleString('en-IN')}
                  </td>
                  <td className="border border-[#8c9ba8] px-2 py-1 text-right text-red-700 font-bold">
                    ₹{totals.otherDeduction.toLocaleString('en-IN')}
                  </td>
                  <td className="border border-[#8c9ba8] px-2 py-1 text-right font-black text-green-800 bg-green-100/70 text-[11px]">
                    ₹{totals.net.toLocaleString('en-IN')}
                  </td>
                  <td className="border border-[#8c9ba8] px-2 py-1"></td>
                  {!isLocked && <td className="border border-[#8c9ba8] px-2 py-1"></td>}
                </motion.tr>
              )}

              {filteredPayments.length === 0 && (
                <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  <td colSpan={isLocked ? 13 : 14} className="border border-[#8c9ba8] px-2 py-4 text-center text-gray-400 font-sans">
                    No payment records found for {selectedMonth} in this project. Use controls above to record new wage ledgers.
                  </td>
                </motion.tr>
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

      {/* Supply Work Details Modal */}
      {showSupplyModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#eef2f6] px-4 py-3 border-b flex justify-between items-center">
              <h3 className="font-bold text-gray-800 text-sm">Add Supply Work Details</h3>
              <button 
                onClick={() => setShowSupplyModal(false)}
                className="text-gray-500 hover:text-gray-800"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-4 space-y-4 overflow-y-auto bg-gray-50 flex-1">
              {/* Add form */}
              <div className="grid grid-cols-12 gap-3 bg-white p-3 rounded border border-gray-200">
                <div className="col-span-12 sm:col-span-5 flex flex-col space-y-1">
                  <label className="text-xs font-semibold text-gray-600">Work Description</label>
                  <input
                    type="text"
                    className="sap-input font-medium"
                    placeholder="E.g. Cleaning, Extra Shift..."
                    value={supplyEntry.description}
                    onChange={e => setSupplyEntry(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="col-span-4 sm:col-span-2 flex flex-col space-y-1">
                  <label className="text-xs font-semibold text-gray-600">Hours</label>
                  <input
                    type="number"
                    step="any"
                    className="sap-input font-mono font-medium"
                    placeholder="Hrs"
                    value={supplyEntry.hours}
                    onChange={e => setSupplyEntry(prev => ({ ...prev, hours: e.target.value }))}
                  />
                </div>
                <div className="col-span-4 sm:col-span-2 flex flex-col space-y-1">
                  <label className="text-xs font-semibold text-gray-600">Rate / Hr</label>
                  <input
                    type="number"
                    step="any"
                    className="sap-input font-mono font-bold text-green-700"
                    placeholder="₹ Rate"
                    value={supplyEntry.rate}
                    onChange={e => setSupplyEntry(prev => ({ ...prev, rate: e.target.value }))}
                  />
                </div>
                <div className="col-span-4 sm:col-span-3 flex items-end">
                  <button 
                    onClick={handleAddSupplyWork}
                    disabled={!supplyEntry.description || !supplyEntry.hours || !supplyEntry.rate}
                    className="sap-btn w-full disabled:opacity-50"
                  >
                    + Add Entry
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="bg-white border rounded overflow-hidden">
                <table className="w-full border-collapse text-xs">
                  <thead className="bg-[#f4f7f9] text-gray-600">
                    <tr>
                      <th className="border-b px-3 py-2 text-left font-medium">Description</th>
                      <th className="border-b px-3 py-2 text-right font-medium">Hours</th>
                      <th className="border-b px-3 py-2 text-right font-medium">Rate/Hr</th>
                      <th className="border-b px-3 py-2 text-right font-medium">Total</th>
                      <th className="border-b px-3 py-2 text-center w-12 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.supplyDetails.map((detail, idx) => (
                      <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} key={detail.id} className="hover:bg-gray-50 group border-b">
                        <td className="px-3 py-2 font-semibold text-gray-800">{detail.description}</td>
                        <td className="px-3 py-2 text-right font-mono">{detail.hours}</td>
                        <td className="px-3 py-2 text-right font-mono text-green-700">₹{detail.rate.toLocaleString('en-IN')}</td>
                        <td className="px-3 py-2 text-right font-bold text-gray-800">
                          ₹{detail.total.toLocaleString('en-IN')}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button 
                            onClick={() => handleRemoveSupplyWork(detail.id)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                    {formData.supplyDetails.length === 0 && (
                      <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                        <td colSpan={5} className="px-3 py-6 text-center text-gray-400 italic">
                          No supply work entries added yet.
                        </td>
                      </motion.tr>
                    )}
                  </tbody>
                  {formData.supplyDetails.length > 0 && (
                    <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                      <tr>
                        <td colSpan={3} className="px-3 py-2 text-right font-bold text-gray-600">Total Supply Amount:</td>
                        <td className="px-3 py-2 text-right font-black text-green-700">₹{Number(formData.supplyAmount).toLocaleString('en-IN')}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
            
            <div className="bg-white p-3 border-t flex justify-end">
              <button 
                onClick={() => setShowSupplyModal(false)}
                className="sap-btn bg-gray-800 text-white hover:bg-gray-900 px-6"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Sheet General Report Modal */}
      {showPaymentSheetReport && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-4 sm:p-8 min-h-screen">
            <div className="flex justify-between items-start mb-6 print:hidden">
              <div>
                <h2 className="text-xl font-bold text-[#002f6c] uppercase tracking-wider">Wage Ledger Report</h2>
                <p className="text-sm font-semibold text-gray-600">Month: {selectedMonth} | {selectedCategory}</p>
              </div>
              <div className="flex space-x-2">
                <button onClick={() => window.print()} className="sap-btn bg-gray-800 hover:bg-gray-900 border-gray-900 text-white flex items-center space-x-1 px-4 py-1.5">
                  <span>Print Excel Report</span>
                </button>
                <button onClick={() => setShowPaymentSheetReport(false)} className="sap-btn border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center px-4 py-1.5">
                  <span>Close</span>
                </button>
              </div>
            </div>

            {/* Print Header */}
            <div className="hidden print:block mb-6 text-center">
              <h1 className="text-2xl font-black uppercase border-b-2 border-black pb-2 mb-2">Wage Ledger Report ({selectedCategory})</h1>
              <div className="flex justify-between text-sm font-bold">
                <span>Month: {selectedMonth}</span>
                <span>Project: {projects.find(p => p.id === selectedProject)?.name}</span>
              </div>
            </div>

            <div className="border border-black print:border-gray-800 bg-white shadow-sm print:shadow-none">
              <table className="w-full border-collapse text-[10px] print:text-[10px]">
                <thead className="bg-[#eef2f6] print:bg-gray-100 font-bold border-b-2 border-black text-gray-900">
                  <tr>
                    <th className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-left w-10 text-center">Sr No</th>
                    <th className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-left w-14">ID No</th>
                    <th className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-left">Worker Name</th>
                    <th className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-left w-24">Work Area / Location</th>
                    <th className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-left w-14">Month</th>
                    <th className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-right w-20">Gross wages</th>
                    <th className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-right w-16">Supply Amt</th>
                    <th className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-right text-red-600 w-16">Mess Ded.</th>
                    <th className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-right text-red-600 w-16">Kharchi Ded.</th>
                    <th className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-right text-red-600 w-16">Advance Ded.</th>
                    <th className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-right text-green-700 w-24">Net Payable</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment, idx) => {
                    const worker = getWorkerDetails(payment.workerId);
                    return (
                      <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} key={payment.id} className="hover:bg-gray-50 border-b print:border-gray-800 font-mono">
                        <td className="border border-gray-300 print:border-gray-800 px-2 py-1.5 text-gray-700 font-bold text-center">{worker.srNo || '-'}</td>
                        <td className="border border-gray-300 print:border-gray-800 px-2 py-1.5 text-gray-700 font-bold">{worker.idNo}</td>
                        <td className="border border-gray-300 print:border-gray-800 px-2 py-1.5 font-sans font-semibold text-gray-900">{worker.name}</td>
                        <td className="border border-gray-300 print:border-gray-800 px-2 py-1.5 font-sans text-gray-800">{payment.level || <span className="text-gray-400 italic">None</span>}</td>
                        <td className="border border-gray-300 print:border-gray-800 px-2 py-1.5">{payment.month}</td>
                        <td className="border border-gray-300 print:border-gray-800 px-2 py-1.5 text-right font-medium">₹{payment.workAmount.toLocaleString('en-IN')}</td>
                        <td className="border border-gray-300 print:border-gray-800 px-2 py-1.5 text-right text-green-800 font-semibold">₹{(payment.supplyAmount || 0).toLocaleString('en-IN')}</td>
                        <td className="border border-gray-300 print:border-gray-800 px-2 py-1.5 text-right text-red-700">₹{payment.messDeduction.toLocaleString('en-IN')}</td>
                        <td className="border border-gray-300 print:border-gray-800 px-2 py-1.5 text-right text-red-700">₹{payment.kharchiDeduction.toLocaleString('en-IN')}</td>
                        <td className="border border-gray-300 print:border-gray-800 px-2 py-1.5 text-right text-red-700">₹{payment.advanceDeduction.toLocaleString('en-IN')}</td>
                        <td className="border border-gray-300 print:border-gray-800 px-2 py-1.5 text-right font-bold text-green-900">
                          ₹{payment.netPayment.toLocaleString('en-IN')}
                        </td>
                      </motion.tr>
                    );
                  })}
                  {filteredPayments.length === 0 && (
                    <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                      <td colSpan={11} className="border border-gray-300 print:border-gray-800 px-2 py-6 text-center text-gray-500 italic">
                        No payment records found for {selectedMonth}.
                      </td>
                    </motion.tr>
                  )}
                </tbody>
                {filteredPayments.length > 0 && (
                  <tfoot className="bg-gray-100 font-bold border-t-2 border-black">
                    <tr>
                      <td colSpan={5} className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-right uppercase text-[10px]">
                        Total Month Summary:
                      </td>
                      <td className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-right">
                        ₹{totals.gross.toLocaleString('en-IN')}
                      </td>
                      <td className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-right text-green-700">
                        ₹{(totals.supply || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-right text-red-700">
                        ₹{totals.mess.toLocaleString('en-IN')}
                      </td>
                      <td className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-right text-red-700">
                        ₹{totals.kharchi.toLocaleString('en-IN')}
                      </td>
                      <td className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-right text-red-700">
                        ₹{totals.advance.toLocaleString('en-IN')}
                      </td>
                      <td className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-right font-black text-[11px] text-green-900 print:text-black bg-gray-200 print:bg-transparent">
                        ₹{totals.net.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
              <div className="print-signature-section">
                <div className="print-signature-box">
                  <div className="print-signature-title">Approved by Director</div>
                  <div className="print-signature-date">Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Supply Work General Report Modal */}
      {showSupplyReport && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-4 sm:p-8 min-h-screen">
            <div className="flex justify-between items-start mb-6 print:hidden">
              <div>
                <h2 className="text-xl font-bold text-[#002f6c] uppercase tracking-wider">Project Supply Work Report</h2>
                <p className="text-sm font-semibold text-gray-600">Month: {selectedMonth}</p>
              </div>
              <div className="flex space-x-2">
                <button onClick={() => window.print()} className="sap-btn bg-gray-800 hover:bg-gray-900 border-gray-900 text-white flex items-center space-x-1 px-4 py-1.5">
                  <span>Print Excel Report</span>
                </button>
                <button onClick={() => setShowSupplyReport(false)} className="sap-btn border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center px-4 py-1.5">
                  <span>Close</span>
                </button>
              </div>
            </div>

            {/* Print Header */}
            <div className="hidden print:block mb-6 text-center">
              <h1 className="text-2xl font-black uppercase border-b-2 border-black pb-2 mb-2">Supply Work Details Report ({selectedCategory})</h1>
              <div className="flex justify-between text-sm font-bold">
                <span>Month: {selectedMonth}</span>
                <span>Project: {projects.find(p => p.id === selectedProject)?.name}</span>
              </div>
            </div>

            <div className="border border-black print:border-gray-800 bg-white shadow-sm print:shadow-none">
              <table className="w-full border-collapse text-xs print:text-[10px]">
                <thead className="bg-[#eef2f6] print:bg-gray-100 font-bold border-b-2 border-black text-gray-900">
                  <tr>
                    <th className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-left w-10 text-center">Sr</th>
                    <th className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-left w-48">Worker Name</th>
                    <th className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-left">Description of Work</th>
                    <th className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-right w-20">Hours</th>
                    <th className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-right w-24">Rate/Hr</th>
                    <th className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-right w-24">Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {allSupplyWorksInfo.map((work, idx) => (
                    <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} key={`${work.paymentId}-${work.id}`} className="hover:bg-gray-50">
                      <td className="border border-gray-300 print:border-gray-800 px-2 py-1 text-center font-mono text-gray-500">{idx + 1}</td>
                      <td className="border border-gray-300 print:border-gray-800 px-2 py-1 font-semibold">{work.workerName}</td>
                      <td className="border border-gray-300 print:border-gray-800 px-2 py-1">{work.description}</td>
                      <td className="border border-gray-300 print:border-gray-800 px-2 py-1 text-right font-mono">{work.hours}</td>
                      <td className="border border-gray-300 print:border-gray-800 px-2 py-1 text-right font-mono">₹{work.rate.toLocaleString('en-IN')}</td>
                      <td className="border border-gray-300 print:border-gray-800 px-2 py-1 text-right font-bold text-gray-900">
                        ₹{work.total.toLocaleString('en-IN')}
                      </td>
                    </motion.tr>
                  ))}
                  {allSupplyWorksInfo.length === 0 && (
                    <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                      <td colSpan={6} className="border border-gray-300 px-2 py-6 text-center text-gray-500 italic">
                        No supply work records found in {selectedMonth}.
                      </td>
                    </motion.tr>
                  )}
                </tbody>
                {allSupplyWorksInfo.length > 0 && (
                  <tfoot className="bg-gray-100 font-bold border-t-2 border-black">
                    <tr>
                      <td colSpan={3} className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-right uppercase text-[10px]">Grand Total Supply Amount:</td>
                      <td className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-right font-mono text-[11px]">{allSupplyWorksInfo.reduce((a, b) => a + b.hours, 0)} hr</td>
                      <td className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-right bg-gray-200"></td>
                      <td className="border border-gray-400 print:border-gray-800 px-2 py-1.5 text-right font-black text-[13px] text-green-800 print:text-black">
                        ₹{allSupplyWorksInfo.reduce((a, b) => a + b.total, 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
              <div className="print-signature-section">
                <div className="print-signature-box">
                  <div className="print-signature-title">Approved by Director</div>
                  <div className="print-signature-date">Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Verification Warning Modal */}
      <DuplicateWarningModal
        isOpen={dupModalOpen}
        moduleName="Worker Payment"
        warningText="Warning: A payment record for this worker may already exist. Please review before saving."
        duplicates={dupData}
        currentUser={user}
        onCancel={() => {
          setDupModalOpen(false);
          setPendingSaveFn(null);
        }}
        onSaveAnyway={(reason) => {
          setDupModalOpen(false);
          if (pendingSaveFn) {
            pendingSaveFn(reason);
            setPendingSaveFn(null);
          }
        }}
        onViewExisting={(record) => {
          setDupModalOpen(false);
          setEditingId(record.id);
          // Load that record's data into formData
          setFormData({
            workerId: record.workerId,
            month: record.month,
            workAmount: String(record.workAmount || ''),
            workDays: String(record.workDays || ''),
            ratePerDay: String(record.ratePerDay || ''),
            overtimeHours: String(record.overtimeHours || ''),
            allowance: String(record.allowance || ''),
            manualKharchi: '',
            messDeduction: String(record.messDeduction || ''),
            level: record.level || '',
            supplyAmount: String(record.supplyAmount || ''),
            date: record.date || new Date().toISOString().split('T')[0],
            supplyDetails: record.supplyDetails ? JSON.parse(record.supplyDetails) : [],
            recoveryAmount: String(record.recoveryAmount || ''),
            otherDeduction: String(record.otherDeduction || ''),
            otherDeductionDetails: record.otherDeductionDetails || '',
            paymentStatus: record.paymentStatus || 'Pending'
          });
        }}
      />
    </div>
  );
};
