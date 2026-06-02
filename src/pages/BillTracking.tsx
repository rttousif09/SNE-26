import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../store';
import { 
  Plus, X, Save, Edit, Trash2, Calendar, FileText, 
  DollarSign, Clock, AlertTriangle, CheckSquare, 
  Search, Filter, History, Clipboard, TrendingUp, Users, ArrowRight
} from 'lucide-react';
import { TrackedBill, BillStatus, BillTimelineEntry } from '../types';

export const BillTracking: React.FC = () => {
  const { 
    user, 
    projects, 
    trackedBills, 
    billTimelines,
    addTrackedBill, 
    updateTrackedBill, 
    deleteTrackedBill, 
    addBillTimeline 
  } = useAppContext();

  const isReadOnly = user?.username === 'saddamsne';

  // State Management
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [selectedReportTab, setSelectedReportTab] = useState<'status' | 'outstanding' | 'client' | 'followup'>('status');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');

  // Form states
  const [formData, setFormData] = useState({
    billNo: '',
    billType: 'RA Bill' as 'RA Bill' | 'Final Bill' | 'Extra Item Bill',
    clientName: '',
    projectId: '',
    billingPeriod: '',
    billDate: '',
    billAmount: '',
    remarks: '',
    currentStatus: 'Draft' as BillStatus,
    amountCertified: '',
    amountReceived: '',
    lastPaymentDate: '',
    expectedPaymentDate: '',
  });

  // Timeline entry state (for registering transitions)
  const [transitionStatus, setTransitionStatus] = useState<BillStatus>('Submitted');
  const [transitionRemarks, setTransitionRemarks] = useState('');
  const [transitionAmountCertified, setTransitionAmountCertified] = useState('');
  const [transitionAmountReceived, setTransitionAmountReceived] = useState('');
  const [transitionExpectDate, setTransitionExpectDate] = useState('');

  // Helper selectors
  const getProjectName = (id: string) => projects.find(p => p.id === id)?.name || 'General Site';

  // Seed data if empty (for beautiful display out of the box)
  useEffect(() => {
    if (trackedBills.length === 0 && projects.length > 0) {
      // Seed Demo Bills to show immediate functionality
      const today = new Date().toISOString().slice(0, 10);
      const pastDate = (days: number) => {
        const d = new Date();
        d.setDate(d.getDate() - days);
        return d.toISOString().slice(0, 10);
      };
      const futureDate = (days: number) => {
        const d = new Date();
        d.setDate(d.getDate() + days);
        return d.toISOString().slice(0, 10);
      };

      const seedData = [
        {
          billNo: 'BILL-2026-001',
          billType: 'RA Bill' as const,
          clientName: 'Tata Group Housing',
          projectId: projects[0]?.id || 'general',
          billingPeriod: 'Jan 2026',
          billDate: pastDate(25),
          billAmount: 4500000,
          remarks: 'Initial foundation works RA bill',
          currentStatus: 'Certified' as BillStatus,
          statusUpdateDate: pastDate(15),
          updatedBy: 'Admin',
          amountCertified: 4200000,
          amountReceived: 0,
          outstandingAmount: 4200000,
          lastPaymentDate: '',
          expectedPaymentDate: pastDate(3), // Crossed / Overdue
        },
        {
          billNo: 'BILL-2026-002',
          billType: 'Extra Item Bill' as const,
          clientName: 'Tata Group Housing',
          projectId: projects[0]?.id || 'general',
          billingPeriod: 'Jan-Feb 2026',
          billDate: pastDate(20),
          billAmount: 750000,
          remarks: 'Additional electrical routing works',
          currentStatus: 'Under Review' as BillStatus,
          statusUpdateDate: pastDate(12), // Too long in review (> 7 days)
          updatedBy: 'Saddam',
          amountCertified: 0,
          amountReceived: 0,
          outstandingAmount: 750000,
          lastPaymentDate: '',
          expectedPaymentDate: '',
        },
        {
          billNo: 'BILL-2026-003',
          billType: 'RA Bill' as const,
          clientName: 'LNJ Bhilwara Group',
          projectId: projects[1]?.id || projects[0]?.id || 'general',
          billingPeriod: 'Feb 2026',
          billDate: pastDate(10),
          billAmount: 12000000,
          remarks: 'Superstructure slab completion RA 2',
          currentStatus: 'Partially Paid' as BillStatus,
          statusUpdateDate: pastDate(2),
          updatedBy: 'Saddam',
          amountCertified: 11500000,
          amountReceived: 5000000,
          outstandingAmount: 6500000,
          lastPaymentDate: pastDate(2),
          expectedPaymentDate: futureDate(15),
        },
        {
          billNo: 'BILL-2026-004',
          billType: 'Final Bill' as const,
          clientName: 'Rites Limited',
          projectId: projects[0]?.id || 'general',
          billingPeriod: 'Full Project Duration',
          billDate: pastDate(40),
          billAmount: 25000000,
          remarks: 'Handover final bill submission',
          currentStatus: 'Draft' as BillStatus,
          statusUpdateDate: pastDate(40),
          updatedBy: 'Admin',
          amountCertified: 0,
          amountReceived: 0,
          outstandingAmount: 25000000,
          lastPaymentDate: '',
          expectedPaymentDate: '',
        }
      ];

      seedData.forEach((bill, idx) => {
        addTrackedBill(bill).then(() => {
          // Add default timeline items
          const mockBillId = `seeded-${idx}`;
          addBillTimeline({
            billId: mockBillId,
            status: 'Draft',
            updateDate: bill.billDate,
            updatedBy: 'System Seed',
            remarks: 'Bill entry registered in system'
          });
          if (bill.currentStatus !== 'Draft') {
            addBillTimeline({
              billId: mockBillId,
              status: bill.currentStatus,
              updateDate: bill.statusUpdateDate,
              updatedBy: bill.updatedBy,
              remarks: 'Initial status setup'
            });
          }
        });
      });
    }
  }, [trackedBills, projects]);

  // Dashboard Aggregates
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    let totalCount = 0;
    let draftCount = 0;
    let submittedCount = 0;
    let certifiedCount = 0;
    let outstandingCount = 0;
    let overdueCount = 0;
    let totalOutstandingAmount = 0;

    trackedBills.forEach(b => {
      totalCount++;
      if (b.currentStatus === 'Draft') draftCount++;
      if (b.currentStatus === 'Submitted') submittedCount++;
      if (b.currentStatus === 'Certified') certifiedCount++;
      
      // Outstanding exists if not fully paid or closed, or has outstandingAmount > 0
      const isOutstanding = b.currentStatus !== 'Fully Paid' && b.currentStatus !== 'Closed';
      if (isOutstanding) {
        outstandingCount++;
        totalOutstandingAmount += b.outstandingAmount || b.billAmount;
      }

      // Overdue if expects payment has expected date crossed and is not fully paid/closed
      if (
        isOutstanding && 
        b.expectedPaymentDate && 
        b.expectedPaymentDate < todayStr && 
        b.currentStatus !== 'Draft' && 
        b.currentStatus !== 'Submitted' && 
        b.currentStatus !== 'Under Review'
      ) {
        overdueCount++;
      }
    });

    return {
      totalCount,
      draftCount,
      submittedCount,
      certifiedCount,
      outstandingCount,
      overdueCount,
      totalOutstandingAmount
    };
  }, [trackedBills]);

  // Alerts logic
  const alertsList = useMemo(() => {
    const list: { id: string; type: 'review' | 'overdue' | 'partial' | 'outstanding'; message: string; billNo: string; billId: string }[] = [];
    const todayStr = new Date().toISOString().slice(0, 10);

    trackedBills.forEach(b => {
      // 1. Bill remains under review too long (> 7 days)
      if (b.currentStatus === 'Under Review' && b.statusUpdateDate) {
        const diffTime = Math.abs(new Date(todayStr).getTime() - new Date(b.statusUpdateDate).getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 7) {
          list.push({
            id: `review-${b.id}`,
            type: 'review',
            message: `Bill in "Under Review" for ${diffDays} days, review delay limit exceeded.`,
            billNo: b.billNo,
            billId: b.id
          });
        }
      }

      // 2. Expected payment date crossed
      if (
        b.expectedPaymentDate && 
        b.expectedPaymentDate < todayStr && 
        b.currentStatus !== 'Fully Paid' && 
        b.currentStatus !== 'Closed' &&
        b.currentStatus !== 'Draft' &&
        b.currentStatus !== 'Submitted' &&
        b.currentStatus !== 'Under Review'
      ) {
        list.push({
          id: `overdue-${b.id}`,
          type: 'overdue',
          message: `Expected payment date (${b.expectedPaymentDate}) has crossed.`,
          billNo: b.billNo,
          billId: b.id
        });
      }

      // 3. Bill is partially paid
      if (b.currentStatus === 'Partially Paid') {
        list.push({
          id: `partial-${b.id}`,
          type: 'partial',
          message: `Bill of Rs ${b.billAmount.toLocaleString()} is partially paid (Outstanding: Rs ${b.outstandingAmount.toLocaleString()}).`,
          billNo: b.billNo,
          billId: b.id
        });
      }

      // 4. Outstanding amount exists while Certified/Expected
      if (b.outstandingAmount > 0 && (b.currentStatus === 'Certified' || b.currentStatus === 'Payment Expected')) {
        list.push({
          id: `outstanding-${b.id}`,
          type: 'outstanding',
          message: `Certified outstanding amount of Rs ${b.outstandingAmount.toLocaleString()} remains unpaid.`,
          billNo: b.billNo,
          billId: b.id
        });
      }
    });

    return list;
  }, [trackedBills]);

  // Filtering Logic
  const filteredBillsList = useMemo(() => {
    return trackedBills.filter(b => {
      const matchesSearch = 
        b.billNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.remarks || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = filterType === 'all' || b.billType === filterType;
      const matchesStatus = filterStatus === 'all' || b.currentStatus === filterStatus;
      const matchesProject = filterProject === 'all' || b.projectId === filterProject;

      return matchesSearch && matchesType && matchesStatus && matchesProject;
    });
  }, [trackedBills, searchQuery, filterType, filterStatus, filterProject]);

  // Clientwise aggregated report calculation
  const clientWiseTotals = useMemo(() => {
    const clientsMap: Record<string, { count: number; gross: number; certified: number; received: number; outstanding: number }> = {};
    
    trackedBills.forEach(b => {
      const client = b.clientName || 'Unknown';
      if (!clientsMap[client]) {
        clientsMap[client] = { count: 0, gross: 0, certified: 0, received: 0, outstanding: 0 };
      }
      clientsMap[client].count++;
      clientsMap[client].gross += b.billAmount || 0;
      clientsMap[client].certified += b.amountCertified || 0;
      clientsMap[client].received += b.amountReceived || 0;
      clientsMap[client].outstanding += b.outstandingAmount || 0;
    });

    return Object.entries(clientsMap).map(([client, totals]) => ({
      clientName: client,
      ...totals
    }));
  }, [trackedBills]);

  // History timeline filtered for selected bill
  const currentBillTimeline = useMemo(() => {
    if (!selectedBillId) return [];
    return billTimelines
      .filter(tl => tl.billId === selectedBillId)
      .sort((a, b) => new Date(b.updateDate).getTime() - new Date(a.updateDate).getTime());
  }, [billTimelines, selectedBillId]);

  // UI action handlers
  const handleEdit = (bill: TrackedBill) => {
    setFormData({
      billNo: bill.billNo,
      billType: bill.billType,
      clientName: bill.clientName,
      projectId: bill.projectId,
      billingPeriod: bill.billingPeriod,
      billDate: bill.billDate,
      billAmount: bill.billAmount.toString(),
      remarks: bill.remarks || '',
      currentStatus: bill.currentStatus,
      amountCertified: (bill.amountCertified || '').toString(),
      amountReceived: (bill.amountReceived || '').toString(),
      lastPaymentDate: bill.lastPaymentDate || '',
      expectedPaymentDate: bill.expectedPaymentDate || '',
    });
    setEditingId(bill.id);
    setIsAdding(true);
  };

  const handleCancelForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({
      billNo: '',
      billType: 'RA Bill',
      clientName: '',
      projectId: '',
      billingPeriod: '',
      billDate: '',
      billAmount: '',
      remarks: '',
      currentStatus: 'Draft',
      amountCertified: '',
      amountReceived: '',
      lastPaymentDate: '',
      expectedPaymentDate: '',
    });
  };

  const calculateOutstanding = (certified: number, received: number, billAmt: number) => {
    if (certified > 0) {
      return Math.max(0, certified - received);
    }
    return Math.max(0, billAmt - received);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const today = new Date().toISOString().slice(0, 10);
    const amt = parseFloat(formData.billAmount) || 0;
    const cert = parseFloat(formData.amountCertified) || 0;
    const rec = parseFloat(formData.amountReceived) || 0;
    const out = calculateOutstanding(cert, rec, amt);

    const billPayload: Omit<TrackedBill, 'id'> = {
      billNo: formData.billNo,
      billType: formData.billType,
      clientName: formData.clientName,
      projectId: formData.projectId,
      billingPeriod: formData.billingPeriod,
      billDate: formData.billDate,
      billAmount: amt,
      remarks: formData.remarks || undefined,
      currentStatus: formData.currentStatus,
      statusUpdateDate: today,
      updatedBy: user?.name || 'Administrator',
      amountCertified: cert,
      amountReceived: rec,
      outstandingAmount: out,
      lastPaymentDate: formData.lastPaymentDate || undefined,
      expectedPaymentDate: formData.expectedPaymentDate || undefined
    };

    if (editingId) {
      await updateTrackedBill(editingId, billPayload);
      // Log timeline event for modifications
      await addBillTimeline({
        billId: editingId,
        status: formData.currentStatus,
        updateDate: today,
        updatedBy: user?.name || 'Administrator',
        remarks: `Bill properties updated on manual edit. Remarks: ${formData.remarks || 'None'}`
      });
    } else {
      // Find a way to link the new bill's sequential DB ID
      // We generate temporary unique timelines.
      const tempId = 'bill_' + Math.random().toString(36).substr(2, 9);
      await addTrackedBill({ ...billPayload });
      await addBillTimeline({
        billId: tempId,
        status: formData.currentStatus,
        updateDate: today,
        updatedBy: user?.name || 'Administrator',
        remarks: `Draft bill tracking initialized. Current state: ${formData.currentStatus}`
      });
    }

    handleCancelForm();
  };

  const handleStateTransitionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBillId) return;

    const b = trackedBills.find(x => x.id === selectedBillId);
    if (!b) return;

    const today = new Date().toISOString().slice(0, 10);
    const cert = transitionAmountCertified !== '' ? parseFloat(transitionAmountCertified) : b.amountCertified;
    const rec = transitionAmountReceived !== '' ? parseFloat(transitionAmountReceived) : b.amountReceived;
    const out = calculateOutstanding(cert, rec, b.billAmount);

    const updatedProperties: Partial<TrackedBill> = {
      currentStatus: transitionStatus,
      statusUpdateDate: today,
      updatedBy: user?.name || 'Administrator',
      amountCertified: cert,
      amountReceived: rec,
      outstandingAmount: out,
      lastPaymentDate: transitionAmountReceived !== '' ? today : b.lastPaymentDate,
      expectedPaymentDate: transitionExpectDate !== '' ? transitionExpectDate : b.expectedPaymentDate
    };

    await updateTrackedBill(selectedBillId, updatedProperties);
    
    await addBillTimeline({
      billId: selectedBillId,
      status: transitionStatus,
      updateDate: today,
      updatedBy: user?.name || 'Administrator',
      remarks: transitionRemarks || `Transitioned to status: ${transitionStatus}`
    });

    // Reset transition form
    setTransitionRemarks('');
    setTransitionAmountCertified('');
    setTransitionAmountReceived('');
    setTransitionExpectDate('');
  };

  return (
    <div className="text-[11px] h-full flex flex-col p-1.5 overflow-y-auto">
      {/* 1. Header Control Bar */}
      <div className="flex items-center space-x-2 mb-2 bg-[#eef2f6] border border-[#8c9ba8] p-1 print:hidden">
        {!isReadOnly ? (
          <button 
            onClick={isAdding ? handleCancelForm : () => setIsAdding(true)} 
            className="sap-btn flex items-center space-x-1"
            id="btn_new_bill"
          >
            {isAdding ? <X size={12} className="text-red-600"/> : <Plus size={12} className="text-green-600"/>}
            <span>{isAdding ? 'Close Builder' : 'New Tracking Entry'}</span>
          </button>
        ) : (
          <div className="font-semibold text-[#002f6c] px-1 py-0.5">Construction ERP • Bill Tracking Directory (Read Only)</div>
        )}
        <div className="flex-1"></div>
        <div className="text-gray-500 text-[10px] font-semibold italic">Workflow: Draft ➔ Submitted ➔ Under Review ➔ Certified ➔ Payment Expected ➔ Partially Paid ➔ Fully Paid ➔ Closed</div>
      </div>

      {/* 2. Visual Aggregation Dashboard Indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-1.5 mb-2.5 print:mt-2">
        <div className="sap-panel p-2 flex flex-col justify-between bg-white shadow-xs">
          <span className="font-semibold text-gray-500 uppercase tracking-tight">Total Tracked</span>
          <span className="text-sm font-black text-gray-700 mt-1">{stats.totalCount} Bills</span>
        </div>
        <div className="sap-panel p-2 flex flex-col justify-between bg-emerald-50/45 border-l-3 border-l-blue-600">
          <span className="font-semibold text-[#0056b3] uppercase tracking-tight">Draft Stage</span>
          <span className="text-sm font-black text-blue-800 mt-1">{stats.draftCount}</span>
        </div>
        <div className="sap-panel p-2 flex flex-col justify-between bg-amber-50/50 border-l-3 border-l-orange-500">
          <span className="font-semibold text-amber-700 uppercase tracking-tight">Submitted / In-Review</span>
          <span className="text-sm font-black text-amber-800 mt-1">{stats.submittedCount} Active</span>
        </div>
        <div className="sap-panel p-2 flex flex-col justify-between bg-teal-50/50 border-l-3 border-l-teal-600">
          <span className="font-semibold text-teal-700 uppercase tracking-tight">Certified</span>
          <span className="text-sm font-black text-teal-800 mt-1">{stats.certifiedCount} Approved</span>
        </div>
        <div className="sap-panel p-2 flex flex-col justify-between bg-rose-50/50 border-l-3 border-l-red-600">
          <span className="font-semibold text-red-700 uppercase tracking-tight">Outstanding Bills</span>
          <span className="text-sm font-black text-red-800 mt-1">{stats.outstandingCount} Unresolved</span>
        </div>
        <div className="sap-panel p-2 flex flex-col justify-between bg-red-100/50 border-l-3 border-l-red-800">
          <span className="font-semibold text-red-900 uppercase tracking-tight">Overdue Payments</span>
          <span className="text-sm font-black text-red-900 mt-1">{stats.overdueCount} Alerts</span>
        </div>
        <div className="sap-panel p-2 flex flex-col justify-between bg-blue-100/40 border-l-3 border-l-blue-700 col-span-2 md:col-span-1">
          <span className="font-semibold text-[#003366] uppercase tracking-tight">Total Receivable</span>
          <span className="text-xs font-black text-blue-900 mt-1">Rs {stats.totalOutstandingAmount.toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* 3. Status Alerts Notification Corner */}
      {alertsList.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded p-1.5 mb-2.5 print:hidden">
          <div className="flex items-center space-x-1.5 font-bold text-red-800 mb-1">
            <AlertTriangle size={13} className="text-red-700 animate-pulse" />
            <span>Workflow Alerts ({alertsList.length})</span>
          </div>
          <div className="max-h-24 overflow-y-auto space-y-1">
            {alertsList.map(item => (
              <div 
                key={item.id} 
                onClick={() => setSelectedBillId(item.billId)}
                className="flex items-center justify-between text-[10px] bg-white p-1 hover:bg-red-100 rounded border border-red-100 cursor-pointer"
              >
                <div className="flex items-center space-x-1">
                  <span className="bg-red-600 text-white px-1 uppercase font-bold rounded">Alert</span>
                  <span className="font-black text-gray-700">{item.billNo}:</span>
                  <span className="text-gray-650">{item.message}</span>
                </div>
                <span className="text-blue-700 hover:underline font-semibold flex items-center gap-0.5">Focus Timeline <ArrowRight size={8} /></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Drawer Forms Sliding Layout */}
      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }}
            className="mb-3 bg-[#f8fafc] border border-[#8c9ba8] p-2.5 rounded shadow-sm print:hidden"
          >
            <div className="flex items-center justify-between pb-1.5 border-b border-[#8c9ba8] mb-2.5">
              <span className="font-black text-gray-800 text-xs flex items-center gap-1">
                <Clipboard size={12} className="text-[#0056b3]" />
                {editingId ? 'Modify Bill Tracking Parameters' : 'Create New Bill Tracking Workflow'}
              </span>
              <button onClick={handleCancelForm} className="text-gray-500 hover:text-red-500">
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <div>
                <label className="block text-gray-600 font-bold mb-0.5">Bill Number *</label>
                <input 
                  type="text" 
                  value={formData.billNo} 
                  onChange={e => setFormData({ ...formData, billNo: e.target.value })} 
                  className="sap-input w-full p-1" 
                  required 
                  placeholder="e.g. RA-B2-02"
                />
              </div>

              <div>
                <label className="block text-gray-600 font-bold mb-0.5">Bill Type *</label>
                <select 
                  value={formData.billType} 
                  onChange={e => setFormData({ ...formData, billType: e.target.value as any })} 
                  className="sap-input w-full p-1"
                >
                  <option value="RA Bill">RA Bill (Running Account)</option>
                  <option value="Final Bill">Final Bill</option>
                  <option value="Extra Item Bill">Extra Item Bill</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-600 font-bold mb-0.5">Client Name *</label>
                <input 
                  type="text" 
                  value={formData.clientName} 
                  onChange={e => setFormData({ ...formData, clientName: e.target.value })} 
                  className="sap-input w-full p-1" 
                  required 
                  placeholder="Tata Power, Rites, etc."
                />
              </div>

              <div>
                <label className="block text-gray-600 font-bold mb-0.5">Project / Site Name *</label>
                <select 
                  value={formData.projectId} 
                  onChange={e => setFormData({ ...formData, projectId: e.target.value })} 
                  className="sap-input w-full p-1" 
                  required
                >
                  <option value="">Select Project Site</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-600 font-bold mb-0.5">Billing Period *</label>
                <input 
                  type="text" 
                  value={formData.billingPeriod} 
                  onChange={e => setFormData({ ...formData, billingPeriod: e.target.value })} 
                  className="sap-input w-full p-1" 
                  required 
                  placeholder="e.g. Feb 2026"
                />
              </div>

              <div>
                <label className="block text-gray-600 font-bold mb-0.5">Bill Date *</label>
                <input 
                  type="date" 
                  value={formData.billDate} 
                  onChange={e => setFormData({ ...formData, billDate: e.target.value })} 
                  className="sap-input w-full p-1" 
                  required 
                />
              </div>

              <div>
                <label className="block text-gray-600 font-bold mb-0.5">Bill Amount (Rs) *</label>
                <input 
                  type="number" 
                  value={formData.billAmount} 
                  onChange={e => setFormData({ ...formData, billAmount: e.target.value })} 
                  className="sap-input w-full p-1" 
                  required 
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-gray-600 font-bold mb-0.5">Current Status</label>
                <select 
                  value={formData.currentStatus} 
                  onChange={e => setFormData({ ...formData, currentStatus: e.target.value as BillStatus })} 
                  className="sap-input w-full p-1"
                >
                  <option value="Draft">Draft</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Certified">Certified</option>
                  <option value="Payment Expected">Payment Expected</option>
                  <option value="Partially Paid">Partially Paid</option>
                  <option value="Fully Paid">Fully Paid</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-600 font-bold mb-0.5">Amount Certified (Rs)</label>
                <input 
                  type="number" 
                  value={formData.amountCertified} 
                  onChange={e => setFormData({ ...formData, amountCertified: e.target.value })} 
                  className="sap-input w-full p-1" 
                  min="0"
                  step="0.01"
                  placeholder="Set upon status transition"
                />
              </div>

              <div>
                <label className="block text-gray-600 font-bold mb-0.5">Amount Received (Rs)</label>
                <input 
                  type="number" 
                  value={formData.amountReceived} 
                  onChange={e => setFormData({ ...formData, amountReceived: e.target.value })} 
                  className="sap-input w-full p-1" 
                  min="0"
                  step="0.01"
                  placeholder="Payments total logged"
                />
              </div>

              <div>
                <label className="block text-gray-600 font-bold mb-0.5">Expected Payment Date</label>
                <input 
                  type="date" 
                  value={formData.expectedPaymentDate} 
                  onChange={e => setFormData({ ...formData, expectedPaymentDate: e.target.value })} 
                  className="sap-input w-full p-1" 
                />
              </div>

              <div>
                <label className="block text-gray-600 font-bold mb-0.5">Last Payment Date</label>
                <input 
                  type="date" 
                  value={formData.lastPaymentDate} 
                  onChange={e => setFormData({ ...formData, lastPaymentDate: e.target.value })} 
                  className="sap-input w-full p-1" 
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-gray-600 font-bold mb-0.5">Remarks / Work Nature Summary</label>
                <textarea 
                  value={formData.remarks} 
                  onChange={e => setFormData({ ...formData, remarks: e.target.value })} 
                  className="sap-input w-full p-1 h-12 resize-none" 
                  placeholder="Add scope details and notes..."
                />
              </div>

              <div className="md:col-span-4 flex justify-end space-x-1.5 pt-1.5 border-t border-[#e2e8f0]">
                <button 
                  type="button" 
                  onClick={handleCancelForm} 
                  className="sap-btn px-3 py-1 bg-white hover:bg-gray-50 flex items-center gap-1"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="sap-btn px-4 py-1 bg-blue-700 text-white hover:bg-blue-850 flex items-center gap-1 font-bold"
                >
                  <Save size={11} /> Save Bill Tracking Record
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Primary Workspace Split: Left Side Lists / Backlogs | Right Side Detail TIMELINE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
        
        {/* Left Side: Listing and Interactive Table */}
        <div className="lg:col-span-8 flex flex-col space-y-2">
          
          {/* SEARCH & FILTERS CONTROLS */}
          <div className="sap-panel p-2 bg-slate-50 flex flex-wrap gap-2 items-center justify-between print:hidden">
            <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
              <div className="relative w-full">
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by Bill No., Client, Remarks..."
                  className="sap-input w-full pl-6 pr-1.5 py-1"
                />
                <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <select 
                value={filterType} 
                onChange={e => setFilterType(e.target.value)} 
                className="sap-input px-1 py-0.5 bg-white text-gray-700 font-bold"
              >
                <option value="all">All Types</option>
                <option value="RA Bill">RA Bill</option>
                <option value="Final Bill">Final Bill</option>
                <option value="Extra Item Bill">Extra Item Bill</option>
              </select>

              <select 
                value={filterStatus} 
                onChange={e => setFilterStatus(e.target.value)} 
                className="sap-input px-1 py-0.5 bg-white text-gray-700 font-bold"
              >
                <option value="all">All States</option>
                <option value="Draft">Draft</option>
                <option value="Submitted">Submitted</option>
                <option value="Under Review">Under Review</option>
                <option value="Certified">Certified</option>
                <option value="Payment Expected">Payment Expected</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Fully Paid">Fully Paid</option>
                <option value="Closed">Closed</option>
              </select>

              <select 
                value={filterProject} 
                onChange={e => setFilterProject(e.target.value)} 
                className="sap-input px-1 py-0.5 bg-white text-gray-700 font-bold"
              >
                <option value="all">All Projects</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              {(searchQuery || filterType !== 'all' || filterStatus !== 'all' || filterProject !== 'all') && (
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    setFilterType('all');
                    setFilterStatus('all');
                    setFilterProject('all');
                  }}
                  className="sap-btn p-1 bg-white hover:bg-gray-100 font-semibold"
                >
                  Clear Filt.
                </button>
              )}
            </div>
          </div>

          {/* BILLS MAIN LIST DATA TABLE */}
          <div className="sap-panel bg-white overflow-hidden shadow-xs">
            <div className="bg-[#eef2f6] border-b border-[#8c9ba8] px-2.5 py-1.5 flex items-center justify-between">
              <span className="font-bold text-gray-700 flex items-center gap-1">
                <FileText size={12} className="text-blue-700" />
                Active Bill Tracking Register ({filteredBillsList.length} items)
              </span>
              <span className="text-[10px] text-gray-500 font-medium">Click on a row to reveal active workflow timeline & record payment milestones.</span>
            </div>

            <div className="overflow-x-auto max-h-[350px]">
              <table className="sap-table w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 select-none">
                    <th className="p-1 px-2 font-black text-gray-600">Bill Number</th>
                    <th className="p-1 font-black text-gray-600">Site Project</th>
                    <th className="p-1 font-black text-gray-600">Client / Period</th>
                    <th className="p-1 font-black text-gray-600 text-right">Bill Value</th>
                    <th className="p-1 font-black text-gray-600 text-right">Certified Amt</th>
                    <th className="p-1 font-black text-gray-600 text-right">Received Amt</th>
                    <th className="p-1 font-black text-gray-600 text-right">Outstanding</th>
                    <th className="p-1 font-black text-gray-600">Transit Status</th>
                    <th className="p-1 text-center font-black text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBillsList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-4 text-center text-gray-500 italic">
                        No bills matching current search/filter metrics. Expand workspace above to insert record.
                      </td>
                    </tr>
                  ) : (
                    filteredBillsList.map(b => {
                      const isSelected = selectedBillId === b.id;
                      return (
                        <tr 
                          key={b.id} 
                          onClick={() => setSelectedBillId(b.id)}
                          className={`hover:bg-[#f3f8fc] border-b border-gray-200 cursor-pointer transition-all duration-100 ${isSelected ? 'bg-blue-50/70 hover:bg-blue-50 font-medium' : ''}`}
                        >
                          <td className="p-1.5 px-2">
                            <div className="font-bold text-gray-800">{b.billNo}</div>
                            <span className="text-[9px] bg-sky-100 text-sky-800 font-bold px-1 rounded uppercase tracking-wider">{b.billType}</span>
                          </td>
                          <td className="p-1.5">
                            <div className="font-medium text-gray-700 max-w-[120px] truncate">{getProjectName(b.projectId)}</div>
                          </td>
                          <td className="p-1.5">
                            <div className="text-gray-600 font-semibold">{b.clientName}</div>
                            <div className="text-[9px] text-gray-400 font-light">{b.billingPeriod} | {b.billDate}</div>
                          </td>
                          <td className="p-1.5 text-right font-black text-gray-800">
                            Rs {b.billAmount.toLocaleString('en-IN')}
                          </td>
                          <td className="p-1.5 text-right font-semibold text-teal-800">
                            {b.amountCertified ? `Rs ${b.amountCertified.toLocaleString('en-IN')}` : '—'}
                          </td>
                          <td className="p-1.5 text-right font-semibold text-emerald-800">
                            {b.amountReceived ? `Rs ${b.amountReceived.toLocaleString('en-IN')}` : '—'}
                          </td>
                          <td className="p-1.5 text-right">
                            {b.outstandingAmount > 0 ? (
                              <span className="text-red-700 font-black">
                                Rs {b.outstandingAmount.toLocaleString('en-IN')}
                              </span>
                            ) : (
                              <span className="text-green-700 font-semibold px-1 py-0.5 bg-green-50 rounded">Paid Fully</span>
                            )}
                          </td>
                          <td className="p-1.5">
                            <span className={`inline-block px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase text-center min-w-[70px] ${
                              b.currentStatus === 'Draft' ? 'bg-gray-100 text-gray-600' :
                              b.currentStatus === 'Submitted' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                              b.currentStatus === 'Under Review' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                              b.currentStatus === 'Certified' ? 'bg-teal-50 text-teal-700 border border-teal-200' :
                              b.currentStatus === 'Payment Expected' ? 'bg-blue-50 text-blue-700 border border-blue-200 animate-pulse' :
                              b.currentStatus === 'Partially Paid' ? 'bg-yellow-100 text-yellow-850 border border-yellow-250' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {b.currentStatus}
                            </span>
                            {b.expectedPaymentDate && b.currentStatus !== 'Fully Paid' && b.currentStatus !== 'Closed' && (
                              <div className="text-[9px] text-gray-400 mt-0.5">Expect: {b.expectedPaymentDate}</div>
                            )}
                          </td>
                          <td className="p-1 text-center" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center space-x-1">
                              {!isReadOnly && (
                                <>
                                  <button 
                                    onClick={() => handleEdit(b)} 
                                    className="p-1 text-blue-650 hover:bg-blue-50 rounded transition-colors"
                                    title="Edit properties"
                                  >
                                    <Edit size={11} />
                                  </button>
                                  <button 
                                    onClick={async () => {
                                      if (confirm('Delete tracking entry for this bill? This removes the associated status progression timeline.')) {
                                        await deleteTrackedBill(b.id);
                                        if (selectedBillId === b.id) setSelectedBillId(null);
                                      }
                                    }} 
                                    className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Delete tracking"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </>
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
        </div>

        {/* Right Side: Active Bill Details & Progression Timeline */}
        <div className="lg:col-span-4 flex flex-col space-y-2.5">
          {selectedBillId ? (
            (() => {
              const currentBill = trackedBills.find(x => x.id === selectedBillId);
              if (!currentBill) return (
                <div className="sap-panel bg-white p-4 text-center italic text-gray-500">
                  Selected record not found or was deleted. Please choose another bill.
                </div>
              );

              return (
                <div className="sap-panel bg-white p-3 shadow-xs flex flex-col space-y-2.5">
                  <div className="border-b border-[#8c9ba8] pb-1.5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase">Active Tracker Detail</span>
                      <h4 className="text-xs font-black text-gray-800">{currentBill.billNo}</h4>
                    </div>
                    <button 
                      onClick={() => setSelectedBillId(null)}
                      className="text-gray-500 hover:bg-gray-100 p-0.5 rounded"
                    >
                      <X size={12} />
                    </button>
                  </div>

                  {/* Summary grid */}
                  <div className="grid grid-cols-2 gap-1.5 text-[10px] bg-slate-50/70 p-2 rounded border border-gray-250">
                    <div>
                      <span className="text-gray-400">Client:</span>
                      <div className="font-bold text-gray-700">{currentBill.clientName}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Project Area:</span>
                      <div className="font-bold text-gray-700">{getProjectName(currentBill.projectId)}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Bill Date:</span>
                      <div className="font-bold text-gray-700">{currentBill.billDate}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Billing Period:</span>
                      <div className="font-bold text-gray-750">{currentBill.billingPeriod}</div>
                    </div>
                    <div className="col-span-2 pt-1.5 border-t border-gray-200 mt-1">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-gray-400">Gross Value:</span>
                        <span className="font-black text-gray-800 text-xs">Rs {currentBill.billAmount.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-gray-400">Amount Certified:</span>
                        <span className="font-bold text-teal-800">Rs {currentBill.amountCertified ? currentBill.amountCertified.toLocaleString('en-IN') : '—'}</span>
                      </div>
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-gray-400">Amount Received:</span>
                        <span className="font-bold text-emerald-800">Rs {currentBill.amountReceived ? currentBill.amountReceived.toLocaleString('en-IN') : '—'}</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-solid border-gray-300 pt-1 mt-1 font-black">
                        <span className="text-red-700">Net Outstanding:</span>
                        <span className="text-red-800 text-xs text-right">Rs {currentBill.outstandingAmount.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Progressive Actions Gate */}
                  {!isReadOnly && (
                    <div className="bg-slate-50 border border-slate-300 p-2 rounded">
                      <div className="font-bold text-[#0056b3] flex items-center gap-1 mb-1.5 text-[10px]">
                        <TrendingUp size={11} />
                        Record Progression & Milestones
                      </div>
                      <form onSubmit={handleStateTransitionSubmit} className="space-y-1.5">
                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <label className="block text-[9px] text-gray-500 font-semibold mb-0.5">Set State To:</label>
                            <select 
                              value={transitionStatus}
                              onChange={e => setTransitionStatus(e.target.value as any)}
                              className="sap-input w-full p-0.5 py-1 text-[10px]"
                            >
                              <option value="Submitted">Submitted Stage</option>
                              <option value="Under Review">Under Review</option>
                              <option value="Certified">Certified Stage</option>
                              <option value="Payment Expected">Payment Expected</option>
                              <option value="Partially Paid">Partially Paid</option>
                              <option value="Fully Paid">Fully Paid</option>
                              <option value="Closed">Closed</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[9px] text-gray-500 font-semibold mb-0.5">Expected Pay Date:</label>
                            <input 
                              type="date" 
                              value={transitionExpectDate}
                              onChange={e => setTransitionExpectDate(e.target.value)}
                              className="sap-input w-full p-0.5 text-[10px]"
                            />
                          </div>
                        </div>

                        {/* Expandable options for specific stages */}
                        {(transitionStatus === 'Certified' || transitionStatus === 'Payment Expected' || transitionStatus === 'Partially Paid' || transitionStatus === 'Fully Paid') && (
                          <div className="grid grid-cols-2 gap-1 bg-white p-1.5 border border-slate-200 rounded">
                            <div>
                              <label className="block text-[8px] text-gray-500 font-semibold">Amt Certified (Rs):</label>
                              <input 
                                type="number" 
                                value={transitionAmountCertified}
                                onChange={e => setTransitionAmountCertified(e.target.value)}
                                className="sap-input w-full p-0.5 text-[10px]"
                                placeholder="e.g. 45000"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] text-gray-500 font-semibold">Amt Received (Rs):</label>
                              <input 
                                type="number" 
                                value={transitionAmountReceived}
                                onChange={e => setTransitionAmountReceived(e.target.value)}
                                className="sap-input w-full p-0.5 text-[10px]"
                                placeholder="Total payments accum."
                              />
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="block text-[9px] text-gray-500 font-semibold mb-0.5">Transition Log Remarks:</label>
                          <input 
                            type="text" 
                            placeholder="Add transition notes..."
                            value={transitionRemarks}
                            onChange={e => setTransitionRemarks(e.target.value)}
                            className="sap-input w-full p-1 text-[10px]"
                          />
                        </div>

                        <button 
                          type="submit"
                          className="sap-btn w-full p-1 bg-[#0056b3] text-white hover:bg-blue-800 text-[10px] font-black text-center"
                        >
                          Record State Change & Notify Ledger
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Graphical timeline */}
                  <div className="flex flex-col">
                    <div className="font-bold text-gray-700 text-[10px] flex items-center gap-1 mb-1.5">
                      <History size={11} className="text-gray-400" />
                      Status Progression Ledger
                    </div>
                    <div className="relative border-l border-[#8c9ba8] ml-2 pb-1.5 space-y-2.5">
                      {currentBillTimeline.length === 0 ? (
                        <div className="pl-3.5 text-gray-400 italic text-[10px]">No status events recorded. Bill initialized in Draft.</div>
                      ) : (
                        currentBillTimeline.map(tl => (
                          <div key={tl.id} className="relative pl-3.5 text-[10px] group">
                            {/* Dot */}
                            <div className="absolute -left-[4.5px] top-1 w-2 h-2 rounded-full border border-white bg-blue-700 group-hover:bg-blue-900 transition-colors" />
                            <div className="flex items-center space-x-1.5">
                              <span className="font-black text-gray-800 uppercase tracking-tight">{tl.status}</span>
                              <span className="text-[9px] text-gray-400 font-normal">{tl.updateDate}</span>
                              <span className="text-[9px] text-gray-400 italic bg-gray-100 px-0.5 rounded">by {tl.updatedBy}</span>
                            </div>
                            <p className="text-gray-650 leading-tight mt-0.5 font-medium">{tl.remarks || 'No logs registered for this milestone.'}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="sap-panel bg-[#f8fafc] border-dashed border-2 border-gray-300 p-6 text-center text-gray-500">
              <Clipboard size={18} className="text-gray-400 mx-auto mb-1.5 animate-bounce" />
              <div className="font-bold text-[11px] text-gray-700">No Target Bill Selected</div>
              <p className="text-[10px] text-gray-400 leading-tight mt-0.5">Please click on any bill row in the main register table on the left to inspect its timeline transitions and log payment milestones directly.</p>
            </div>
          )}
        </div>
      </div>

      {/* 6. Reports Section with dynamic breakdowns */}
      <h3 className="font-bold text-gray-700 text-xs mt-4 mb-1.5 pb-0.5 border-b border-[#8c9ba8] flex items-center justify-between">
        <span>ERP Financial Reporting & Analytical Outputs</span>
        <span className="text-[10px] text-gray-400">Direct query aggregation based on real-time database inputs.</span>
      </h3>
      
      <div className="sap-panel bg-white p-2.5 rounded shadow-xs mb-3">
        {/* Tab switcher */}
        <div className="flex border-b border-gray-200 mb-2 gap-1 select-none">
          <button 
            onClick={() => setSelectedReportTab('status')}
            className={`p-1 px-3 text-[10px] font-black -mb-[1px] border rounded-t-sm transition-all duration-100 ${
              selectedReportTab === 'status' 
                ? 'bg-slate-50 border-[#8c9ba8] border-b-transparent text-[#0056b3]' 
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Bill Status Report
          </button>
          <button 
            onClick={() => setSelectedReportTab('outstanding')}
            className={`p-1 px-3 text-[10px] font-black -mb-[1px] border rounded-t-sm transition-all duration-100 ${
              selectedReportTab === 'outstanding' 
                ? 'bg-slate-50 border-[#8c9ba8] border-b-transparent text-[#0056b3]' 
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Outstanding & Overdue Report
          </button>
          <button 
            onClick={() => setSelectedReportTab('client')}
            className={`p-1 px-3 text-[10px] font-black -mb-[1px] border rounded-t-sm transition-all duration-100 ${
              selectedReportTab === 'client' 
                ? 'bg-slate-50 border-[#8c9ba8] border-b-transparent text-[#0056b3]' 
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Client-wise Aggregate Ledger
          </button>
          <button 
            onClick={() => setSelectedReportTab('followup')}
            className={`p-1 px-3 text-[10px] font-black -mb-[1px] border rounded-t-sm transition-all duration-100 ${
              selectedReportTab === 'followup' 
                ? 'bg-slate-50 border-[#8c9ba8] border-b-transparent text-[#0056b3]' 
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Payment Follow-up Matrix
          </button>
        </div>

        {/* Tab content */}
        <div>
          {selectedReportTab === 'status' && (
            <div>
              <div className="flex items-center justify-between mb-1 text-[10px] text-gray-500">
                <span>Summary statement of all bills sorted by date.</span>
                <span className="font-bold text-gray-700">Group total: Rs {trackedBills.reduce((acc, b) => acc + (b.billAmount || 0), 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="overflow-x-auto max-h-48">
                <table className="sap-table w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="p-1">Bill Number</th>
                      <th className="p-1">Client Name</th>
                      <th className="p-1">Bill Date</th>
                      <th className="p-1">Bill Amount</th>
                      <th className="p-1">Certified Value</th>
                      <th className="p-1">Received Value</th>
                      <th className="p-1">Workflow Status</th>
                      <th className="p-1">Last Update Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trackedBills.map(b => (
                      <tr key={b.id} className="hover:bg-[#f9fbfd]">
                        <td className="p-1 font-bold">{b.billNo}</td>
                        <td className="p-1">{b.clientName}</td>
                        <td className="p-1">{b.billDate}</td>
                        <td className="p-1 font-semibold text-right">Rs {b.billAmount.toLocaleString('en-IN')}</td>
                        <td className="p-1 font-semibold text-teal-850 text-right">{b.amountCertified ? `Rs ${b.amountCertified.toLocaleString('en-IN')}` : '—'}</td>
                        <td className="p-1 font-semibold text-emerald-850 text-right">{b.amountReceived ? `Rs ${b.amountReceived.toLocaleString('en-IN')}` : '—'}</td>
                        <td className="p-1 font-medium">{b.currentStatus}</td>
                        <td className="p-1 text-gray-400">{b.statusUpdateDate || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedReportTab === 'outstanding' && (
            <div>
              <div className="flex items-center justify-between mb-1 text-[10px] text-gray-500">
                <span>Breakdown of all certified/expected bills with unpaid outstanding balance.</span>
                <span className="font-black text-red-700">Pending Receivables: Rs {stats.totalOutstandingAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="overflow-x-auto max-h-48">
                <table className="sap-table w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="p-1">Bill Number</th>
                      <th className="p-1">Client Name</th>
                      <th className="p-1">Billing Period</th>
                      <th className="p-1">Gross Amount</th>
                      <th className="p-1">Amount Certified</th>
                      <th className="p-1">Amount Received</th>
                      <th className="p-1">Unpaid Outstanding</th>
                      <th className="p-1">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trackedBills.filter(xb => xb.outstandingAmount > 0).map(b => (
                      <tr key={b.id} className="hover:bg-red-50/20 bg-red-50/5">
                        <td className="p-1 font-bold text-red-900">{b.billNo}</td>
                        <td className="p-1">{b.clientName}</td>
                        <td className="p-1">{b.billingPeriod}</td>
                        <td className="p-1 text-right">Rs {b.billAmount.toLocaleString('en-IN')}</td>
                        <td className="p-1 text-teal-800 text-right">{b.amountCertified ? `Rs ${b.amountCertified.toLocaleString('en-IN')}` : '—'}</td>
                        <td className="p-1 text-emerald-850 text-right">{b.amountReceived ? `Rs ${b.amountReceived.toLocaleString('en-IN')}` : '—'}</td>
                        <td className="p-1 font-black text-red-700 text-right">Rs {b.outstandingAmount.toLocaleString('en-IN')}</td>
                        <td className="p-1 uppercase font-black text-amber-700">{b.currentStatus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedReportTab === 'client' && (
            <div>
              <div className="mb-1 text-[10px] text-gray-500">Aggregated client metrics covering all logged bills. Grid aggregates amounts cleanly.</div>
              <div className="overflow-x-auto max-h-48">
                <table className="sap-table w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="p-1">Client Business Entity</th>
                      <th className="p-1 text-center">Invoiced Count</th>
                      <th className="p-1 text-right">Aggregate Invoiced value</th>
                      <th className="p-1 text-right">Aggregate Certified value</th>
                      <th className="p-1 text-right">Aggregate Received Milestone</th>
                      <th className="p-1 text-right">Aggregate Outstanding Asset</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientWiseTotals.map(tot => (
                      <tr key={tot.clientName} className="hover:bg-slate-50">
                        <td className="p-1 font-bold text-gray-850">{tot.clientName}</td>
                        <td className="p-1 text-center font-bold">{tot.count} Bills</td>
                        <td className="p-1 text-right font-semibold">Rs {tot.gross.toLocaleString('en-IN')}</td>
                        <td className="p-1 text-right text-teal-800">Rs {tot.certified.toLocaleString('en-IN')}</td>
                        <td className="p-1 text-right text-emerald-850">Rs {tot.received.toLocaleString('en-IN')}</td>
                        <td className="p-1 text-right font-black text-red-700">Rs {tot.outstanding.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedReportTab === 'followup' && (
            <div>
              <div className="mb-1 text-[10px] text-gray-500">Milestone matrix mapping expect dates, status tracking loops, and follow-up flags.</div>
              <div className="overflow-x-auto max-h-48">
                <table className="sap-table w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="p-1">Bill Number</th>
                      <th className="p-1">Client Partner</th>
                      <th className="p-1">Outstanding Balance</th>
                      <th className="p-1">Expected Payment Date</th>
                      <th className="p-1">Last Received Date</th>
                      <th className="p-1">Updated By</th>
                      <th className="p-1">Recent Remarks</th>
                      <th className="p-1">Workflow Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trackedBills.map(b => (
                      <tr key={b.id} className="hover:bg-[#fcfdfd]">
                        <td className="p-1 font-bold text-gray-800">{b.billNo}</td>
                        <td className="p-1">{b.clientName}</td>
                        <td className="p-1 text-right text-red-750 font-semibold">{b.outstandingAmount > 0 ? `Rs ${b.outstandingAmount.toLocaleString('en-IN')}` : 'Paid'}</td>
                        <td className="p-1 font-bold text-cyan-850">{b.expectedPaymentDate || 'Not Confirmed'}</td>
                        <td className="p-1 text-gray-500">{b.lastPaymentDate || '—'}</td>
                        <td className="p-1">{b.updatedBy}</td>
                        <td className="p-1 text-gray-600 truncate max-w-xs">{b.remarks || 'No notes saved.'}</td>
                        <td className="p-1 font-bold uppercase text-gray-750">{b.currentStatus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
