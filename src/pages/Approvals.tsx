import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../store';
import { Plus, X, Save, Check, XCircle, Trash2, Bell, FileText, UserCheck, History } from 'lucide-react';

interface AlertNotification {
  id: string;
  workerName: string;
  projectName: string;
  amount: number;
  status: 'Approved' | 'Rejected';
}

export const Approvals: React.FC = () => {
  const { 
    user, 
    approvals, 
    advanceSheetApprovals = [],
    paymentSheetApprovals = [], 
    kharchiApprovals = [],
    expensesLedger = [],
    workers, 
    projects, 
    addApproval, 
    updateApproval, 
    deleteApproval,
    updateAdvanceSheetApproval,
    deleteAdvanceSheetApproval,
    updatePaymentSheetApproval,
    deletePaymentSheetApproval,
    updateKharchiApproval,
    deleteKharchiApproval,
    updateExpenseEntry
  } = useAppContext();
  
  const [activeTab, setActiveTab] = useState<'advances' | 'paymentSheets' | 'kharchiSheets' | 'advanceSheets' | 'expenses' | 'history'>('advances');
  const [isAdding, setIsAdding] = useState(false);
  const [noteModal, setNoteModal] = useState<{
    id: string;
    type: 'advance' | 'sheet' | 'kharchi' | 'advanceSheet' | 'expense';
    action: 'Approved' | 'Rejected';
    details: string;
    requestAmount?: number;
  } | null>(null);
  const [modalNotes, setModalNotes] = useState('');
  const [approvedAmount, setApprovedAmount] = useState<string>('');
  const [formData, setFormData] = useState({
    workerId: '',
    projectId: '',
    amount: '',
    remarks: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [notifications, setNotifications] = useState<AlertNotification[]>([]);
  const prevApprovalsRef = useRef<Record<string, 'Pending' | 'Approved' | 'Rejected'>>({});
  const prevSheetApprovalsRef = useRef<Record<string, 'Pending' | 'Approved' | 'Rejected'>>({});

  const isOwner = user?.username === 'saddamsne';

  // Helper names
  const getWorkerName = (id: string) => {
    const worker = workers.find(w => w.id === id);
    return worker ? worker.name : id;
  };

  const getProjectName = (id: string) => {
    const project = projects.find(p => p.id === id);
    return project ? project.name : id;
  };

  // Play notification audio alert
  const playNotificationSound = (type: 'Approved' | 'Rejected') => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      if (type === 'Approved') {
        const osc1 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc1.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        osc1.start();
        osc1.stop(ctx.currentTime + 0.1);
        
        setTimeout(() => {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.frequency.setValueAtTime(880, ctx.currentTime); // A5
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          gain2.gain.setValueAtTime(0.04, ctx.currentTime);
          osc2.start();
          osc2.stop(ctx.currentTime + 0.15);
        }, 110);
      } else {
        const osc1 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.frequency.setValueAtTime(349.23, ctx.currentTime); // F4
        osc1.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        osc1.start();
        osc1.stop(ctx.currentTime + 0.15);
        
        setTimeout(() => {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.frequency.setValueAtTime(293.66, ctx.currentTime); // D4
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          gain2.gain.setValueAtTime(0.04, ctx.currentTime);
          osc2.start();
          osc2.stop(ctx.currentTime + 0.2);
        }, 130);
      }
    } catch (err) {
      console.warn('Audio context blocked or not supported yet', err);
    }
  };

  // Monitor advances status changes to trigger visual toast pop-ups
  useEffect(() => {
    if (approvals.length > 0) {
      const hasPreviousRecord = Object.keys(prevApprovalsRef.current).length > 0;
      
      approvals.forEach(app => {
        const prevStatus = prevApprovalsRef.current[app.id];
        
        if (hasPreviousRecord && prevStatus === 'Pending' && (app.status === 'Approved' || app.status === 'Rejected')) {
          const wName = getWorkerName(app.workerId);
          const pName = getProjectName(app.projectId);
          
          const newNotif: AlertNotification = {
            id: `${app.id}-${Date.now()}`,
            workerName: wName,
            projectName: pName,
            amount: app.amount,
            status: app.status
          };
          
          setNotifications(prev => [newNotif, ...prev]);
          playNotificationSound(app.status);
          
          setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== newNotif.id));
          }, 10000);
        }
        prevApprovalsRef.current[app.id] = app.status;
      });
    }
  }, [approvals, workers, projects]);

  const prevKharchiApprovalsRef = useRef<Record<string, 'Pending' | 'Approved' | 'Rejected'>>({});

  // Monitor payment sheets status changes to trigger visual toast pop-ups
  useEffect(() => {
    if (paymentSheetApprovals.length > 0) {
      const hasPreviousRecord = Object.keys(prevSheetApprovalsRef.current).length > 0;
      
      paymentSheetApprovals.forEach(sheet => {
        const prevStatus = prevSheetApprovalsRef.current[sheet.id];
        
        if (hasPreviousRecord && prevStatus === 'Pending' && (sheet.status === 'Approved' || sheet.status === 'Rejected')) {
          const pName = getProjectName(sheet.projectId);
          
          const newNotif: AlertNotification = {
            id: `${sheet.id}-${Date.now()}`,
            workerName: `Payment Sheet`,
            projectName: `${pName} (${sheet.month})`,
            amount: sheet.totalAmount,
            status: sheet.status
          };
          
          setNotifications(prev => [newNotif, ...prev]);
          playNotificationSound(sheet.status);
          
          setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== newNotif.id));
          }, 10000);
        }
        prevSheetApprovalsRef.current[sheet.id] = sheet.status;
      });
    }
  }, [paymentSheetApprovals, projects]);

  useEffect(() => {
    if (kharchiApprovals.length > 0) {
      const hasPreviousRecord = Object.keys(prevKharchiApprovalsRef.current).length > 0;
      
      kharchiApprovals.forEach(sheet => {
        const prevStatus = prevKharchiApprovalsRef.current[sheet.id];
        
        if (hasPreviousRecord && prevStatus === 'Pending' && (sheet.status === 'Approved' || sheet.status === 'Rejected')) {
          const pName = getProjectName(sheet.projectId);
          
          const newNotif: AlertNotification = {
            id: `${sheet.id}-${Date.now()}`,
            workerName: `Kharchi`,
            projectName: `${pName} (${sheet.month})`,
            amount: sheet.totalAmount,
            status: sheet.status
          };
          
          setNotifications(prev => [newNotif, ...prev]);
          playNotificationSound(sheet.status);
          
          setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== newNotif.id));
          }, 10000);
        }
        prevKharchiApprovalsRef.current[sheet.id] = sheet.status;
      });
    }
  }, [kharchiApprovals, projects]);

  const handleCancel = () => {
    setIsAdding(false);
    setFormData({
      workerId: '',
      projectId: '',
      amount: '',
      remarks: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addApproval({
      workerId: formData.workerId,
      projectId: formData.projectId,
      amount: Number(formData.amount), // This seems default for requested amount currently
      requestAmount: Number(formData.amount),
      remarks: formData.remarks,
      date: formData.date
    });
    handleCancel();
  };

  const handleApprove = (id: string) => {
    updateApproval(id, { status: 'Approved' });
  };

  const handleReject = (id: string) => {
    updateApproval(id, { status: 'Rejected' });
  };

  const handleApproveSheet = (id: string) => {
    updatePaymentSheetApproval(id, { status: 'Approved' });
  };

  const handleRejectSheet = (id: string) => {
    updatePaymentSheetApproval(id, { status: 'Rejected' });
  };

  const handleApproveKharchi = (id: string) => {
    updateKharchiApproval(id, { status: 'Approved' });
  };

  const handleRejectKharchi = (id: string) => {
    updateKharchiApproval(id, { status: 'Rejected' });
  };

  const handleModalSubmit = () => {
    if (!noteModal) return;
    const { id, type, action } = noteModal;
    
    if (type === 'advance') {
      const finalAmount = approvedAmount ? Number(approvedAmount) : undefined;
      updateApproval(id, { 
        status: action, 
        approvalNotes: modalNotes,
        ...(finalAmount !== undefined && action === 'Approved' ? { approvedAmount: finalAmount, amount: finalAmount } : {})
      });
    } else if (type === 'sheet') {
      updatePaymentSheetApproval(id, { status: action, approvalNotes: modalNotes });
    } else if (type === 'kharchi') {
      updateKharchiApproval(id, { status: action, approvalNotes: modalNotes });
    } else if (type === 'advanceSheet') {
      updateAdvanceSheetApproval(id, { status: action, approvalNotes: modalNotes });
    } else if (type === 'expense') {
      updateExpenseEntry(id, { status: action, approvalNotes: modalNotes });
    }
    
    setNoteModal(null);
    setModalNotes('');
    setApprovedAmount('');
  };

  const historyLog = React.useMemo(() => {
    const logs: any[] = [];
    
    approvals.forEach(a => {
      if (a.status !== 'Pending') {
        const workerName = workers.find(w => w.id === a.workerId)?.name || 'Unknown';
        const projectName = getProjectName(a.projectId);
        logs.push({
          id: `adv-${a.id}`,
          type: 'Worker Advance',
          projectName,
          details: `Worker: ${workerName}`,
          amount: a.amount,
          date: a.date,
          status: a.status,
          remarks: a.remarks,
          approvalNotes: a.approvalNotes,
          actionBy: 'Director (saddamsne)'
        });
      }
    });

    paymentSheetApprovals.forEach(a => {
      if (a.status !== 'Pending') {
        const projectName = getProjectName(a.projectId);
        logs.push({
          id: `ps-${a.id}`,
          type: 'Payment Sheet',
          projectName,
          details: `Month: ${a.month}`,
          amount: a.totalAmount,
          date: a.date,
          status: a.status,
          remarks: a.remarks,
          approvalNotes: a.approvalNotes,
          actionBy: 'Director (saddamsne)'
        });
      }
    });

    kharchiApprovals.forEach(a => {
      if (a.status !== 'Pending') {
        const projectName = getProjectName(a.projectId);
        logs.push({
          id: `ks-${a.id}`,
          type: 'Kharchi Sheet',
          projectName,
          details: `Month: ${a.month}`,
          amount: a.totalAmount,
          date: a.date,
          status: a.status,
          remarks: a.remarks,
          approvalNotes: a.approvalNotes,
          actionBy: 'Director (saddamsne)'
        });
      }
    });

    advanceSheetApprovals.forEach(a => {
      if (a.status !== 'Pending') {
        const projectName = getProjectName(a.projectId);
        logs.push({
          id: `as-${a.id}`,
          type: 'Advance Sheet',
          projectName,
          details: `Month: ${a.month}`,
          amount: a.totalAmount,
          date: a.date,
          status: a.status as 'Approved'|'Rejected',
          remarks: a.remarks,
          approvalNotes: a.approvalNotes,
          actionBy: 'Director (saddamsne)'
        });
      }
    });

    expensesLedger.forEach(e => {
      if (e.status && e.status !== 'Draft' && e.status !== 'Submitted') {
        const projectName = getProjectName(e.projectId || '');
        logs.push({
          id: `ex-${e.id}`,
          type: 'Expense Sheet',
          projectName: projectName || 'General',
          details: e.description,
          amount: e.kharchi + e.mess + e.workerAdvance + e.tiffin + e.travel + e.machineryMaterial + e.workerPayment + e.stationery + e.others + e.crBalance,
          date: e.date,
          status: e.status as 'Approved'|'Rejected',
          remarks: `Bank: ${e.bank || ''}`,
          approvalNotes: e.approvalNotes,
          actionBy: 'Director (saddamsne)'
        });
      }
    });

    return logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [approvals, paymentSheetApprovals, kharchiApprovals, advanceSheetApprovals, expensesLedger, workers, projects]);

  // Filter pending counts
  const pendingAdvancesCount = approvals.filter(a => a.status === 'Pending').length;
  const pendingSheetsCount = paymentSheetApprovals.filter(s => s.status === 'Pending').length;
  const pendingKharchiCount = kharchiApprovals.filter(s => s.status === 'Pending').length;
  const pendingAdvanceSheetsCount = advanceSheetApprovals.filter(s => s.status === 'Pending').length;
  const pendingExpensesCount = expensesLedger.filter(s => s.status === 'Submitted').length;

  return (
    <div className="text-[11px] space-y-3">
      {/* Upper Mode bar */}
      <div className="flex items-center justify-between bg-[#eef2f6] border border-[#8c9ba8] p-1 shadow-sm">
        <div className="flex items-center space-x-1">
          {isOwner ? (
            <div className="text-[11px] font-bold px-1.5 text-[#002f6c] h-5 flex items-center bg-white border border-[#8c9ba8] rounded-sm">
              👑 Owner Saddam Hussain - Review Workspace
            </div>
          ) : (
            <div className="text-[11px] font-bold px-1.5 text-gray-700 h-5 flex items-center bg-white border border-[#8c9ba8] rounded-sm">
              💼 Managing Director Workspace
            </div>
          )}
        </div>
        <div className="font-semibold text-gray-700 pr-1">
          Workflow Approvals Engine
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex border-b border-[#8c9ba8] bg-[#f8f9fa]">
        <button
          onClick={() => setActiveTab('advances')}
          className={`px-4 py-2 border-t-2 border-x font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
            activeTab === 'advances'
              ? 'border-t-[#0056b3] border-x-[#8c9ba8] bg-white text-[#0056b3]'
              : 'border-t-transparent border-x-transparent bg-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <UserCheck size={14} className={activeTab === 'advances' ? 'text-[#0056b3]' : 'text-gray-500'} />
          <span>Worker Advances</span>
          {pendingAdvancesCount > 0 && (
            <span className="bg-red-650 text-white font-mono text-[9px] px-1 rounded-sm font-bold">
              {pendingAdvancesCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('paymentSheets')}
          className={`px-4 py-2 border-t-2 border-x font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
            activeTab === 'paymentSheets'
              ? 'border-t-[#0056b3] border-x-[#8c9ba8] bg-white text-[#0056b3]'
              : 'border-t-transparent border-x-transparent bg-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <FileText size={14} className={activeTab === 'paymentSheets' ? 'text-[#0056b3]' : 'text-gray-500'} />
          <span>Worker Monthly Payment Sheets</span>
          {pendingSheetsCount > 0 && (
            <span className="bg-red-650 text-white font-mono text-[9px] px-1 rounded-sm font-bold">
              {pendingSheetsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('kharchiSheets')}
          className={`px-4 py-2 border-t-2 border-x font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
            activeTab === 'kharchiSheets'
              ? 'border-t-[#0056b3] border-x-[#8c9ba8] bg-white text-[#0056b3]'
              : 'border-t-transparent border-x-transparent bg-transparent text-gray-600 hover:text-gray-900 border-l-0'
          }`}
        >
          <FileText size={14} className={activeTab === 'kharchiSheets' ? 'text-[#0056b3]' : 'text-gray-500'} />
          <span>Kharchi Sheets</span>
          {pendingKharchiCount > 0 && (
            <span className="bg-red-650 text-white font-mono text-[9px] px-1 rounded-sm font-bold">
              {pendingKharchiCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('advanceSheets')}
          className={`px-4 py-2 border-t-2 border-x font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
            activeTab === 'advanceSheets'
              ? 'border-t-[#0056b3] border-x-[#8c9ba8] bg-white text-[#0056b3]'
              : 'border-t-transparent border-x-transparent bg-transparent text-gray-600 hover:text-gray-900 border-l-0'
          }`}
        >
          <FileText size={14} className={activeTab === 'advanceSheets' ? 'text-[#0056b3]' : 'text-gray-500'} />
          <span>Advance Sheets</span>
          {pendingAdvanceSheetsCount > 0 && (
            <span className="bg-red-650 text-white font-mono text-[9px] px-1 rounded-sm font-bold">
              {pendingAdvanceSheetsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          className={`px-4 py-2 border-t-2 border-x font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
            activeTab === 'expenses'
              ? 'border-t-[#0056b3] border-x-[#8c9ba8] bg-white text-[#0056b3]'
              : 'border-t-transparent border-x-transparent bg-transparent text-gray-600 hover:text-gray-900 border-l-0'
          }`}
        >
          <FileText size={14} className={activeTab === 'expenses' ? 'text-[#0056b3]' : 'text-gray-500'} />
          <span>Expense Records</span>
          {pendingExpensesCount > 0 && (
            <span className="bg-red-650 text-white font-mono text-[9px] px-1 rounded-sm font-bold">
              {pendingExpensesCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 border-t-2 border-x font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'border-t-[#0056b3] border-x-[#8c9ba8] bg-white text-[#0056b3]'
              : 'border-t-transparent border-x-transparent bg-transparent text-gray-600 hover:text-gray-900 border-l-0'
          }`}
        >
          <History size={14} className={activeTab === 'history' ? 'text-[#0056b3]' : 'text-gray-500'} />
          <span>Approval History</span>
        </button>
      </div>

      {/* Tab 1 Content: Worker Advances */}
      {activeTab === 'advances' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            {!isOwner && (
              <button
                onClick={isAdding ? handleCancel : () => setIsAdding(true)}
                className="sap-btn flex items-center space-x-1"
              >
                {isAdding ? <X size={12} className="text-red-600"/> : <Plus size={12} className="text-green-600"/>}
                <span>{isAdding ? 'Cancel Request' : 'New Advance Request'}</span>
              </button>
            )}
            <div className="text-gray-500 font-mono text-[10px]">
              Showing {approvals.length} advance requests
            </div>
          </div>

          <AnimatePresence>
      {isAdding && !isOwner && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm"
          onClick={handleCancel}
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="sap-panel relative z-10 w-full max-w-max max-h-[95vh] overflow-y-auto p-4 shadow-[0_10px_40px_rgb(0,0,0,0.2)] bg-[#fcfdfe] rounded-md border-b-4 border-b-[#0056b3]"
        >
              <div className="font-extrabold mb-3 pb-1 border-b border-[#8c9ba8] text-[#0056b3] uppercase tracking-wider text-[10px] flex justify-between items-center">
                <span>Submit New Worker Advance Request (Owner Approval Required)</span>
                <button type="button" onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
                  <X size={12} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col">
                    <label className="font-semibold text-gray-600 mb-1">Worker:</label>
                    <select
                      required
                      className="sap-input"
                      value={formData.workerId}
                      onChange={e => setFormData({ ...formData, workerId: e.target.value })}
                    >
                      <option value="">-- Select Worker --</option>
                      {workers.map(w => (
                        <option key={w.id} value={w.id}>{w.name} ({w.workerId})</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <label className="font-semibold text-gray-600 mb-1">Project Site:</label>
                    <select
                      required
                      className="sap-input"
                      value={formData.projectId}
                      onChange={e => setFormData({ ...formData, projectId: e.target.value })}
                    >
                      <option value="">-- Choose Project --</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col">
                    <label className="font-semibold text-gray-600 mb-1">Required Amount (₹):</label>
                    <input
                      required
                      type="number"
                      className="sap-input font-bold"
                      placeholder="e.g. 5000"
                      value={formData.amount}
                      onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="font-semibold text-gray-600 mb-1">Submission Date:</label>
                    <input
                      required
                      type="date"
                      className="sap-input"
                      value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex flex-col">
                  <label className="font-semibold text-gray-600 mb-1">Remarks / Medical or Travel Reason:</label>
                  <input
                    type="text"
                    className="sap-input"
                    placeholder="Specify target necessity or clear reason for this advance"
                    value={formData.remarks}
                    onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-gray-250">
                  <button type="submit" className="sap-btn flex items-center space-x-1">
                    <Save size={12} className="text-[#0056b3]"/>
                    <span>Submit to Owner</span>
                  </button>
                  <button type="button" onClick={handleCancel} className="sap-btn flex items-center space-x-1">
                    <X size={12} className="text-red-600"/>
                    <span>Cancel</span>
                  </button>
                </div>
              </form>
            </motion.div>
            </div>
          )}
          </AnimatePresence>

          <table className="w-full border-collapse border border-[#8c9ba8] bg-white text-[11px]">
            <thead className="sap-header bg-[#eef2f6]">
              <tr>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal w-8">#</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Worker</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Project</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-right font-normal">Amount Requested</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Date</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Remarks</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-center font-normal w-24">Status</th>
                {isOwner && <th className="border border-[#8c9ba8] px-2 py-1 text-center font-normal w-32">Actions</th>}
                {!isOwner && <th className="border border-[#8c9ba8] px-2 py-1 text-center font-normal w-12">Delete</th>}
              </tr>
            </thead>
            <tbody>
              {approvals.map((app, idx) => {
                let statusBadge = '';
                if (app.status === 'Approved') {
                  statusBadge = 'bg-green-100 text-green-800 border-green-300';
                } else if (app.status === 'Rejected') {
                  statusBadge = 'bg-red-100 text-red-800 border-red-300';
                } else {
                  statusBadge = 'bg-yellow-100 text-yellow-800 border-yellow-300';
                }
                return (
                  <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} key={app.id} className="hover:bg-[#e6f2ff] cursor-default font-mono">
                    <td className="border border-[#8c9ba8] px-2 py-1 text-center text-gray-500 bg-[#eef2f6] font-mono">{idx + 1}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1 font-sans font-bold text-gray-800">{getWorkerName(app.workerId)}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1 font-sans">{getProjectName(app.projectId)}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1 text-right font-bold text-gray-950">₹{app.amount.toLocaleString('en-IN')}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1">{app.date}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1 font-sans text-gray-600">{app.remarks || '-'}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusBadge}`}>
                        {app.status || 'Pending'}
                      </span>
                    </td>
                    {isOwner && (
                      <td className="border border-[#8c9ba8] px-2 py-1 text-center font-sans">
                        {app.status === 'Pending' ? (
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => {
                                setNoteModal({
                                  id: app.id,
                                  type: 'advance',
                                  action: 'Approved',
                                  details: `Worker Advance: ${getWorkerName(app.workerId)} - Site: ${getProjectName(app.projectId)} - Amount: ₹${app.amount.toLocaleString('en-IN')}`,
                                  requestAmount: app.requestAmount || app.amount
                                });
                                setModalNotes('');
                                setApprovedAmount((app.requestAmount || app.amount).toString());
                              }}
                              className="px-1.5 py-0.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded flex items-center space-x-1 cursor-pointer text-[9px]"
                            >
                              <Check size={8} />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => {
                                setNoteModal({
                                  id: app.id,
                                  type: 'advance',
                                  action: 'Rejected',
                                  details: `Worker Advance: ${getWorkerName(app.workerId)} - Site: ${getProjectName(app.projectId)} - Amount: ₹${app.amount.toLocaleString('en-IN')}`
                                });
                                setModalNotes('');
                              }}
                              className="px-1.5 py-0.5 bg-red-650 hover:bg-red-700 text-white font-bold rounded flex items-center space-x-1 cursor-pointer text-[9px]"
                            >
                              <XCircle size={8} />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 font-medium text-[10px]">Decided</span>
                        )}
                      </td>
                    )}
                    {!isOwner && (
                      <td className="border border-[#8c9ba8] px-2 py-1 text-center">
                        <button
                          onClick={() => deleteApproval(app.id)}
                          className="text-red-500 hover:text-red-700 cursor-pointer"
                          title="Delete Request"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    )}
                  </motion.tr>
                );
              })}
              {approvals.length === 0 && (
                <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  <td colSpan={isOwner ? 8 : 8} className="border border-[#8c9ba8] px-2 py-4 text-center text-gray-400 font-sans">
                    No worker advance requests have been generated.
                  </td>
                </motion.tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2 Content: Worker Monthly Payment Sheets */}
      {activeTab === 'paymentSheets' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-[10px] font-semibold font-sans">
              Review and decision panel for Project Monthly Payment Sheets
            </span>
            <div className="text-gray-500 font-mono text-[10px]">
              Showing {paymentSheetApprovals.length} monthly sheets
            </div>
          </div>

          <table className="w-full border-collapse border border-[#8c9ba8] bg-white text-[11px]">
            <thead className="sap-header bg-[#eef2f6]">
              <tr>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal w-8">#</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Project Site</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Payment Month</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-right font-normal">Total Net Payment</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Date Submitted</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Remarks</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-center font-normal w-24">Status</th>
                {isOwner && <th className="border border-[#8c9ba8] px-2 py-1 text-center font-normal w-32">Actions</th>}
                {!isOwner && <th className="border border-[#8c9ba8] px-2 py-1 text-center font-normal w-12">Delete</th>}
              </tr>
            </thead>
            <tbody>
              {paymentSheetApprovals.map((sheet, idx) => {
                let statusBadge = '';
                if (sheet.status === 'Approved') {
                  statusBadge = 'bg-green-100 text-green-800 border-green-300';
                } else if (sheet.status === 'Rejected') {
                  statusBadge = 'bg-red-100 text-red-800 border-red-300';
                } else {
                  statusBadge = 'bg-yellow-100 text-yellow-800 border-yellow-300';
                }
                return (
                  <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} key={sheet.id} className="hover:bg-[#e6f2ff] cursor-default font-mono">
                    <td className="border border-[#8c9ba8] px-2 py-1 text-center text-gray-500 bg-[#eef2f6] font-mono">{idx + 1}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1 font-sans font-bold text-gray-800">{getProjectName(sheet.projectId)}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1 font-mono font-bold">{sheet.month}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1 text-right font-bold text-gray-950">₹{sheet.totalAmount.toLocaleString('en-IN')}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1">{sheet.date}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1 font-sans text-gray-600">{sheet.remarks || '-'}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusBadge}`}>
                        {sheet.status || 'Pending'}
                      </span>
                    </td>
                    {isOwner && (
                      <td className="border border-[#8c9ba8] px-2 py-1 text-center font-sans">
                        {sheet.status === 'Pending' ? (
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => {
                                setNoteModal({
                                  id: sheet.id,
                                  type: 'sheet',
                                  action: 'Approved',
                                  details: `Payment Sheet: ${getProjectName(sheet.projectId)} - Month: ${sheet.month} - Amount: ₹${sheet.totalAmount.toLocaleString('en-IN')}`
                                });
                                setModalNotes('');
                              }}
                              className="px-1.5 py-0.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded flex items-center space-x-1 cursor-pointer text-[9px]"
                            >
                              <Check size={8} />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => {
                                setNoteModal({
                                  id: sheet.id,
                                  type: 'sheet',
                                  action: 'Rejected',
                                  details: `Payment Sheet: ${getProjectName(sheet.projectId)} - Month: ${sheet.month} - Amount: ₹${sheet.totalAmount.toLocaleString('en-IN')}`
                                });
                                setModalNotes('');
                              }}
                              className="px-1.5 py-0.5 bg-red-650 hover:bg-red-700 text-white font-bold rounded flex items-center space-x-1 cursor-pointer text-[9px]"
                            >
                              <XCircle size={8} />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 font-medium text-[10px]">Decided</span>
                        )}
                      </td>
                    )}
                    {!isOwner && (
                      <td className="border border-[#8c9ba8] px-2 py-1 text-center">
                        {sheet.status === 'Pending' ? (
                          <button
                            onClick={() => deletePaymentSheetApproval(sheet.id)}
                            className="text-red-500 hover:text-red-700 cursor-pointer"
                            title="Delete Request"
                          >
                            <Trash2 size={12} />
                          </button>
                        ) : (
                          <span className="text-gray-400 font-medium">-</span>
                        )}
                      </td>
                    )}
                  </motion.tr>
                );
              })}
              {paymentSheetApprovals.length === 0 && (
                <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  <td colSpan={isOwner ? 8 : 9} className="border border-[#8c9ba8] px-2 py-4 text-center text-gray-400 font-sans">
                    No worker monthly payment sheets have been submitted for approval yet.
                  </td>
                </motion.tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3 Content: Kharchi Sheets */}
      {activeTab === 'kharchiSheets' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-[10px] font-semibold font-sans">
              Review and decision panel for Project Kharchi Sheets
            </span>
            <div className="text-gray-500 font-mono text-[10px]">
              Showing {kharchiApprovals.length} monthly kharchi sheets
            </div>
          </div>

          <table className="w-full border-collapse border border-[#8c9ba8] bg-white text-[11px]">
            <thead className="sap-header bg-[#eef2f6]">
              <tr>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal w-8">#</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Project Site</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Kharchi Month</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-right font-normal">Total Kharchi</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Date Submitted</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Remarks</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-center font-normal w-24">Status</th>
                {isOwner && <th className="border border-[#8c9ba8] px-2 py-1 text-center font-normal w-32">Actions</th>}
                {!isOwner && <th className="border border-[#8c9ba8] px-2 py-1 text-center font-normal w-12">Delete</th>}
              </tr>
            </thead>
            <tbody>
              {kharchiApprovals.map((sheet, idx) => {
                let statusBadge = '';
                if (sheet.status === 'Approved') {
                  statusBadge = 'bg-green-100 text-green-800 border-green-300';
                } else if (sheet.status === 'Rejected') {
                  statusBadge = 'bg-red-100 text-red-800 border-red-300';
                } else {
                  statusBadge = 'bg-yellow-100 text-yellow-800 border-yellow-300';
                }
                return (
                  <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} key={sheet.id} className="hover:bg-[#e6f2ff] cursor-default font-mono">
                    <td className="border border-[#8c9ba8] px-2 py-1 text-center text-gray-500 bg-[#eef2f6] font-mono">{idx + 1}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1 font-sans font-bold text-gray-800">{getProjectName(sheet.projectId)}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1 font-mono font-bold">{sheet.month}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1 text-right font-bold text-gray-950">₹{sheet.totalAmount.toLocaleString('en-IN')}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1">{sheet.date}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1 font-sans text-gray-600">{sheet.remarks || '-'}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusBadge}`}>
                        {sheet.status || 'Pending'}
                      </span>
                    </td>
                    {isOwner && (
                      <td className="border border-[#8c9ba8] px-2 py-1 text-center font-sans">
                        {sheet.status === 'Pending' ? (
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => {
                                setNoteModal({
                                  id: sheet.id,
                                  type: 'kharchi',
                                  action: 'Approved',
                                  details: `Kharchi Sheet: ${getProjectName(sheet.projectId)} - Month: ${sheet.month} - Amount: ₹${sheet.totalAmount.toLocaleString('en-IN')}`
                                });
                                setModalNotes('');
                              }}
                              className="px-1.5 py-0.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded flex items-center space-x-1 cursor-pointer text-[9px]"
                            >
                              <Check size={8} />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => {
                                setNoteModal({
                                  id: sheet.id,
                                  type: 'kharchi',
                                  action: 'Rejected',
                                  details: `Kharchi Sheet: ${getProjectName(sheet.projectId)} - Month: ${sheet.month} - Amount: ₹${sheet.totalAmount.toLocaleString('en-IN')}`
                                });
                                setModalNotes('');
                              }}
                              className="px-1.5 py-0.5 bg-red-650 hover:bg-red-700 text-white font-bold rounded flex items-center space-x-1 cursor-pointer text-[9px]"
                            >
                              <XCircle size={8} />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 font-medium text-[10px]">Decided</span>
                        )}
                      </td>
                    )}
                    {!isOwner && (
                      <td className="border border-[#8c9ba8] px-2 py-1 text-center">
                        {sheet.status === 'Pending' ? (
                          <button
                            onClick={() => deleteKharchiApproval(sheet.id)}
                            className="text-red-500 hover:text-red-700 cursor-pointer"
                            title="Delete Request"
                          >
                            <Trash2 size={12} />
                          </button>
                        ) : (
                          <span className="text-gray-400 font-medium">-</span>
                        )}
                      </td>
                    )}
                  </motion.tr>
                );
              })}
              {kharchiApprovals.length === 0 && (
                <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  <td colSpan={isOwner ? 8 : 9} className="border border-[#8c9ba8] px-2 py-4 text-center text-gray-400 font-sans">
                    No kharchi sheets have been submitted for approval yet.
                  </td>
                </motion.tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'advanceSheets' && (
        <div className="space-y-3">
          <table className="w-full border-collapse border border-[#8c9ba8] bg-white text-[11px]">
            <thead className="sap-header bg-[#eef2f6]">
              <tr>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal w-12">Date</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal w-20">Type</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal w-32">Project</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal w-20">Month</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-right font-normal bg-gray-50 w-24">Total Amount (₹)</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Remarks</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Owner Note</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-center font-normal w-20 bg-gray-50">Status</th>
                {isOwner && <th className="border border-[#8c9ba8] px-2 py-1 text-center font-normal w-24">Decisions</th>}
                {!isOwner && <th className="border border-[#8c9ba8] px-2 py-1 text-center font-normal w-16">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {advanceSheetApprovals.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(sheet => (
                <motion.tr 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ duration: 0.2 }}
                  key={sheet.id}
                  className="hover:bg-[#e6f2ff] cursor-default font-mono"
                >
                  <td className="border border-[#8c9ba8] px-2 py-1">{sheet.date.split('-').reverse().join('-')}</td>
                  <td className="border border-[#8c9ba8] px-2 py-1 font-sans font-semibold text-gray-800 tracking-tight">Advance Sheet</td>
                  <td className="border border-[#8c9ba8] px-2 py-1 font-sans font-semibold text-gray-800">{getProjectName(sheet.projectId)}</td>
                  <td className="border border-[#8c9ba8] px-2 py-1">{sheet.month}</td>
                  <td className="border border-[#8c9ba8] px-2 py-1 text-right font-medium">₹{sheet.totalAmount.toLocaleString('en-IN')}</td>
                  <td className="border border-[#8c9ba8] px-2 py-1 font-sans text-gray-700 italic">{sheet.remarks || '-'}</td>
                  <td className="border border-[#8c9ba8] px-2 py-1 font-sans text-amber-700 font-medium italic">{sheet.approvalNotes || '-'}</td>
                  <td className="border border-[#8c9ba8] px-2 py-1 text-center">
                    <span className={`px-1.5 py-0.5 rounded-sm font-sans font-bold text-[9px] uppercase tracking-wider ${
                      sheet.status === 'Approved' ? 'bg-green-100 text-green-800 border-green-200' :
                      sheet.status === 'Rejected' ? 'bg-red-100 text-red-800 border-red-200' :
                      'bg-amber-100 text-amber-800 border-amber-200'
                    }`}>
                      {sheet.status}
                    </span>
                  </td>
                  {isOwner && (
                    <td className="border border-[#8c9ba8] px-1 py-1 text-center">
                      {sheet.status === 'Pending' ? (
                        <div className="flex justify-center space-x-1">
                          <button
                            onClick={() => {
                              setNoteModal({
                                id: sheet.id,
                                type: 'advanceSheet',
                                action: 'Approved',
                                details: `Advance Sheet: ${getProjectName(sheet.projectId)} - Month: ${sheet.month} - Amount: ₹${sheet.totalAmount.toLocaleString('en-IN')}`
                              });
                              setModalNotes('');
                            }}
                            className="px-1.5 py-0.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded flex items-center space-x-1 cursor-pointer text-[9px]"
                          >
                            <Check size={8} />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => {
                              setNoteModal({
                                id: sheet.id,
                                type: 'advanceSheet',
                                action: 'Rejected',
                                details: `Advance Sheet: ${getProjectName(sheet.projectId)} - Month: ${sheet.month} - Amount: ₹${sheet.totalAmount.toLocaleString('en-IN')}`
                              });
                              setModalNotes('');
                            }}
                            className="px-1.5 py-0.5 bg-red-650 hover:bg-red-700 text-white font-bold rounded flex items-center space-x-1 cursor-pointer text-[9px]"
                          >
                            <XCircle size={8} />
                            <span>Reject</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 font-medium text-[10px]">Decided</span>
                      )}
                    </td>
                  )}
                  {!isOwner && (
                    <td className="border border-[#8c9ba8] px-2 py-1 text-center">
                      {sheet.status === 'Pending' ? (
                        <button
                          onClick={() => deleteAdvanceSheetApproval(sheet.id)}
                          className="text-red-500 hover:text-red-700 cursor-pointer"
                          title="Delete Request"
                        >
                          <Trash2 size={12} />
                        </button>
                      ) : (
                        <span className="text-gray-400 font-medium">-</span>
                      )}
                    </td>
                  )}
                </motion.tr>
              ))}
              {advanceSheetApprovals.length === 0 && (
                <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  <td colSpan={isOwner ? 9 : 10} className="border border-[#8c9ba8] px-2 py-4 text-center text-gray-400 font-sans">
                    No advance sheets have been submitted for approval yet.
                  </td>
                </motion.tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="space-y-3">
          <table className="w-full border-collapse border border-[#8c9ba8] bg-white text-[11px]">
            <thead className="sap-header bg-[#eef2f6]">
              <tr>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal w-12">Date</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal w-20">Type</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal w-32">Project</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-right font-normal bg-gray-50 w-24">Total Amount (₹)</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Memo / Bank</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Owner Note</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-center font-normal w-20 bg-gray-50">Status</th>
                {isOwner && <th className="border border-[#8c9ba8] px-2 py-1 text-center font-normal w-24">Decisions</th>}
              </tr>
            </thead>
            <tbody>
              {expensesLedger.filter(e => e.status && e.status !== 'Draft').sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(exp => (
                <motion.tr 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ duration: 0.2 }}
                  key={exp.id}
                  className="hover:bg-[#e6f2ff] cursor-default font-mono"
                >
                  <td className="border border-[#8c9ba8] px-2 py-1">{exp.date.split('-').reverse().join('-')}</td>
                  <td className="border border-[#8c9ba8] px-2 py-1 font-sans font-semibold text-gray-800 tracking-tight">Expense Entry</td>
                  <td className="border border-[#8c9ba8] px-2 py-1 font-sans font-semibold text-gray-800">{getProjectName(exp.projectId)}</td>
                  <td className="border border-[#8c9ba8] px-2 py-1 text-right font-medium">₹{(exp.crBalance + exp.kharchi + exp.mess + exp.workerAdvance + exp.tiffin + exp.travel + exp.machineryMaterial + exp.workerPayment + exp.stationery + exp.others).toLocaleString('en-IN')}</td>
                  <td className="border border-[#8c9ba8] px-2 py-1 font-sans text-gray-700 italic">{`${exp.description} ${exp.bank ? `(${exp.bank})` : ''}`}</td>
                  <td className="border border-[#8c9ba8] px-2 py-1 font-sans text-amber-700 font-medium italic">{exp.approvalNotes || '-'}</td>
                  <td className="border border-[#8c9ba8] px-2 py-1 text-center">
                    <span className={`px-1.5 py-0.5 rounded-sm font-sans font-bold text-[9px] uppercase tracking-wider ${
                      exp.status === 'Approved' ? 'bg-green-100 text-green-800 border-green-200' :
                      exp.status === 'Rejected' ? 'bg-red-100 text-red-800 border-red-200' :
                      'bg-amber-100 text-amber-800 border-amber-200'
                    }`}>
                      {exp.status}
                    </span>
                  </td>
                  {isOwner && (
                    <td className="border border-[#8c9ba8] px-1 py-1 text-center">
                      {exp.status === 'Submitted' ? (
                        <div className="flex justify-center space-x-1">
                          <button
                            onClick={() => {
                              setNoteModal({
                                id: exp.id,
                                type: 'expense',
                                action: 'Approved',
                                details: `Expense: ${getProjectName(exp.projectId)} - Amount: ₹${(exp.crBalance + exp.kharchi + exp.mess + exp.workerAdvance + exp.tiffin + exp.travel + exp.machineryMaterial + exp.workerPayment + exp.stationery + exp.others).toLocaleString('en-IN')}`
                              });
                              setModalNotes('');
                            }}
                            className="px-1.5 py-0.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded flex items-center space-x-1 cursor-pointer text-[9px]"
                          >
                            <Check size={8} />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => {
                              setNoteModal({
                                id: exp.id,
                                type: 'expense',
                                action: 'Rejected',
                                details: `Expense: ${getProjectName(exp.projectId)} - Amount: ₹${(exp.crBalance + exp.kharchi + exp.mess + exp.workerAdvance + exp.tiffin + exp.travel + exp.machineryMaterial + exp.workerPayment + exp.stationery + exp.others).toLocaleString('en-IN')}`
                              });
                              setModalNotes('');
                            }}
                            className="px-1.5 py-0.5 bg-red-650 hover:bg-red-700 text-white font-bold rounded flex items-center space-x-1 cursor-pointer text-[9px]"
                          >
                            <XCircle size={8} />
                            <span>Reject</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 font-medium text-[10px]">Decided</span>
                      )}
                    </td>
                  )}
                </motion.tr>
              ))}
              {expensesLedger.filter(e => e.status && e.status !== 'Draft').length === 0 && (
                <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  <td colSpan={isOwner ? 8 : 7} className="border border-[#8c9ba8] px-2 py-4 text-center text-gray-400 font-sans">
                    No expense records have been submitted for approval yet.
                  </td>
                </motion.tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 4 Content: Approval History */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-[10px] font-semibold font-sans">
              Chronological log of past approvals and rejections
            </span>
            <div className="text-gray-500 font-mono text-[10px]">
              Showing {historyLog.length} historical action(s)
            </div>
          </div>

          <table className="w-full border-collapse border border-[#8c9ba8] bg-white text-[11px]">
            <thead className="sap-header bg-[#eef2f6]">
              <tr>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal w-8">#</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Date (Submitted)</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Type</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Project Site</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Details</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-right font-normal">Amount</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Remarks</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Approval Notes / Justification</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Action By</th>
                <th className="border border-[#8c9ba8] px-2 py-1 text-center font-normal w-24">Status</th>
              </tr>
            </thead>
            <tbody>
              {historyLog.map((log, idx) => {
                let statusBadge = '';
                if (log.status === 'Approved') {
                  statusBadge = 'bg-green-100 text-green-800 border-green-300';
                } else if (log.status === 'Rejected') {
                  statusBadge = 'bg-red-100 text-red-800 border-red-300';
                } else {
                  statusBadge = 'bg-yellow-100 text-yellow-800 border-yellow-300';
                }
                return (
                  <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} key={log.id} className="hover:bg-[#e6f2ff] cursor-default font-mono">
                    <td className="border border-[#8c9ba8] px-2 py-1 text-center text-gray-500 bg-[#eef2f6] font-mono">{idx + 1}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1">{log.date}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1 font-bold text-[#0056b3]">{log.type}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1 font-sans font-bold text-gray-800">{log.projectName}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1 font-mono text-gray-700">{log.details}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1 text-right font-bold text-gray-950">₹{log.amount.toLocaleString('en-IN')}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1 font-sans text-gray-600">{log.remarks || '-'}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1 font-sans text-emerald-800 italic font-semibold">{log.approvalNotes || '-'}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1 font-sans font-bold text-gray-800">{log.actionBy}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusBadge}`}>
                        {log.status}
                      </span>
                    </td>
                  </motion.tr>
                );
              })}
              {historyLog.length === 0 && (
                <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  <td colSpan={10} className="border border-[#8c9ba8] px-2 py-4 text-center text-gray-400 font-sans">
                    No approval history available.
                  </td>
                </motion.tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Approval Notes Input Modal */}
      <AnimatePresence>
        {noteModal && (
          <div className="fixed inset-0 bg-[#001730]/45 flex items-center justify-center p-4 z-[9999] backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border-2 border-[#8c9ba8] shadow-2xl max-w-md w-full rounded p-4 text-[11px]"
            >
              <div className="flex items-center justify-between border-b pb-2 mb-3 bg-[#eef2f6] p-1.5 border border-[#8c9ba8] rounded-sm">
                <span className="font-bold text-[#002f6c] uppercase tracking-wide">
                  {noteModal.action === 'Approved' ? '✅ Resolve: Approval Remarks' : '❌ Resolve: Rejection Justification'}
                </span>
                <button onClick={() => setNoteModal(null)} className="text-gray-400 hover:text-black cursor-pointer">
                  <X size={14} />
                </button>
              </div>

              <div className="mb-3 p-2 bg-yellow-50 text-yellow-850 border border-yellow-250 rounded font-semibold leading-relaxed font-mono text-[10px]">
                <p className="font-bold text-gray-700 font-sans text-[11px] mb-0.5">Target Transaction Detail:</p>
                {noteModal.details}
              </div>

              {noteModal.type === 'advance' && noteModal.action === 'Approved' && (
                <div className="mb-4">
                  <label className="block font-bold text-gray-700 mb-1">Approved Amount (Leave empty for requested amount):</label>
                  <input
                    type="number"
                    value={approvedAmount}
                    onChange={(e) => setApprovedAmount(e.target.value)}
                    placeholder={`Requested: ${noteModal.requestAmount || ''}`}
                    className="sap-input w-full"
                  />
                </div>
              )}

              <div className="space-y-1 mb-4">
                <label className="block font-bold text-gray-700">
                  {noteModal.action === 'Approved' ? 'Remarks / Detailed instructions (Optional):' : 'Rejection Justification Note / Explanation (Required) *'}
                </label>
                <textarea
                  className="sap-input w-full p-2 h-20 text-[11px] font-sans resize-none border border-slate-400"
                  placeholder={noteModal.action === 'Approved' ? 'Add any advice, adjustment details, or audit remarks...' : 'Please describe why this payment or advance was rejected...'}
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end space-x-2 border-t pt-3">
                <button 
                  onClick={() => setNoteModal(null)} 
                  className="px-3 py-1 bg-slate-200 hover:bg-slate-300 border border-gray-450 font-bold rounded text-gray-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleModalSubmit}
                  className={`px-3 py-1 font-bold text-white rounded cursor-pointer ${
                    noteModal.action === 'Approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-650 hover:bg-red-700'
                  }`}
                >
                  Confirm Resolution
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Alert Notifications (Toast pop-ups) */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col space-y-2 max-w-xs md:max-w-sm w-full pointer-events-none text-sans">
        {notifications.map(notif => (
          <div
            key={notif.id}
            className={`pointer-events-auto p-3 rounded shadow-xl border-2 flex flex-col space-y-1 transition-all duration-300 transform translate-x-0 bg-white ${
              notif.status === 'Approved'
                ? 'border-green-600 bg-green-50/95 text-green-900'
                : 'border-red-650 bg-red-50/95 text-red-900'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-1 font-bold uppercase tracking-wider text-[9px] text-gray-500">
              <span className="flex items-center space-x-1">
                <Bell size={10} className={notif.status === 'Approved' ? 'text-green-600' : 'text-red-650'} />
                <span>Approval Notification</span>
              </span>
              <button
                onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))}
                className="text-gray-400 hover:text-gray-800 focus:outline-none cursor-pointer"
              >
                <X size={10} />
              </button>
            </div>
            
            <div className="text-[10px] pt-1 leading-relaxed text-gray-800">
              Submission <span className="font-bold text-[#002f6c]">{notif.workerName}</span> ({notif.projectName}) of <span className="font-bold">₹{notif.amount.toLocaleString('en-IN')}</span> has been:
            </div>
            
            <div className="flex items-center justify-between pt-1">
              <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded border ${
                notif.status === 'Approved'
                  ? 'bg-green-600 text-white border-green-700'
                  : 'bg-red-600 text-white border-red-700'
              }`}>
                {notif.status}
              </span>
              <span className="text-[8px] text-gray-400 font-mono">Just now</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
