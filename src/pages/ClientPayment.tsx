import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../store';
import { FileSpreadsheet, Plus, ArrowUpRight, Search, Upload, Landmark, Percent, ShieldQuestion, CalendarDays } from 'lucide-react';
import { Dashboard } from '../components/client-payment/Dashboard';
import { PaymentRegister } from '../components/client-payment/PaymentRegister';
import { PaymentEntryModal } from '../components/client-payment/PaymentEntryModal';
import { RetentionRegister } from '../components/client-payment/RetentionRegister';
import { GSTTDSRegister } from '../components/client-payment/GSTTDSRegister';
import { RecordPaymentModal } from '../components/client-payment/RecordPaymentModal';
import { BulkUploadModal } from '../components/BulkUploadModal';

export const ClientPayment = () => {
  const { user, projects, billings, clientPayments, addClientPayment } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSite, setSelectedSite] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [recordPaymentModalOpen, setRecordPaymentModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'AR' | 'Retention' | 'GST-TDS'>('AR');

  // Compute unified data
  const data = useMemo(() => {
    return billings.map(b => {
      const proj = projects.find(p => p.id === b.projectId);
      const gross = b.amount || 0;
      const gst = b.gst || 0;
      const tds = b.tds || 0;
      const retention = b.retention || 0;
      
      // As per requirement:
      // Gross Amount = Work Value Only
      // Net Receivable = Gross Amount + GST - TDS - Retention
      const netReceivable = gross + gst - tds - retention;
      
      // All payments against this bill
      const billPayments = clientPayments.filter(cp => cp.billId === b.id && cp.isRetentionPayment !== 1 && cp.status !== 'Bounced');
      const totalPaid = billPayments.reduce((sum, cp) => sum + (cp.amountReceived || 0), 0);
      
      const outstanding = netReceivable - totalPaid;
      
      let status = 'Outstanding';
      if (outstanding <= 0) status = 'Fully Paid';
      else if (totalPaid > 0) status = 'Partially Paid';

      return {
        id: b.id,
        billNo: b.billNo,
        date: b.certifyDate || b.month,
        projectId: b.projectId,
        siteName: proj?.name || 'Unknown',
        clientName: proj?.clientName || 'Unknown Client',
        billType: b.billType || 'RA Bill',
        gross,
        gst,
        tds,
        retention,
        netReceivable,
        totalPaid,
        outstanding,
        status,
        payments: billPayments
      };
    });
  }, [billings, projects, clientPayments]);

  const filteredData = useMemo(() => {
    let fd = data;
    if (selectedSite !== 'all') {
      fd = fd.filter(d => d.projectId === selectedSite);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      fd = fd.filter(d => 
        d.billNo.toLowerCase().includes(q) || 
        d.siteName.toLowerCase().includes(q) || 
        d.clientName.toLowerCase().includes(q)
      );
    }
    return fd;
  }, [data, selectedSite, searchQuery]);

  const metrics = useMemo(() => {
    const totalGross = filteredData.reduce((acc, d) => acc + d.gross, 0);
    const totalGST = filteredData.reduce((acc, d) => acc + d.gst, 0);
    const totalTDS = filteredData.reduce((acc, d) => acc + d.tds, 0);
    const totalRetentionHeld = filteredData.reduce((acc, d) => acc + d.retention, 0);
    const netReceivable = filteredData.reduce((acc, d) => acc + d.netReceivable, 0);
    const totalPayments = filteredData.reduce((acc, d) => acc + d.totalPaid, 0);
    const outstandingBalance = filteredData.reduce((acc, d) => acc + d.outstanding, 0);
    const overdueAmount = filteredData.filter(d => d.outstanding > 0).reduce((acc, d) => acc + d.outstanding, 0); // Simplified logic
    
    // retention logic
    const retentionPayments = clientPayments.filter(cp => cp.isRetentionPayment === 1 && cp.status !== 'Bounced');
    const retentionReceived = retentionPayments.reduce((sum, cp) => sum + (cp.amountReceived || 0), 0);
    const retentionOutstanding = totalRetentionHeld - retentionReceived;
    
    return {
      totalGross, totalGST, totalTDS, totalRetentionHeld, netReceivable, totalPayments, outstandingBalance, overdueAmount, retentionReceived, retentionOutstanding
    };
  }, [filteredData, clientPayments]);

  const handleAddPayment = (billId: string) => {
    const bill = filteredData.find(d => d.id === billId);
    if (bill) {
      setSelectedBill(bill);
      setModalOpen(true);
    }
  };

  const savePayment = (formData: any) => {
    addClientPayment({
      projectId: selectedBill.projectId,
      amountReceived: Number(formData.amountReceived),
      date: formData.date,
      remarks: formData.remarks,
      status: 'Received',
      billId: selectedBill.id,
      paymentMode: formData.paymentMode,
      bankName: formData.bankName,
      utrChequeNo: formData.utrChequeNo,
      paymentReference: formData.paymentReference,
      isRetentionPayment: 0
    });
    setModalOpen(false);
  };

  const handleRecordPayment = () => {
    setRecordPaymentModalOpen(true);
  };

  const saveGeneralPayment = (paymentData: any) => {
    addClientPayment(paymentData);
    setRecordPaymentModalOpen(false);
  };

  return (
    <div className="space-y-4 text-[11px]">
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-[#eef2f6] border border-[#8c9ba8] p-1.5 gap-2 shadow-sm">
        <div className="flex items-center space-x-1">
          <span className="font-bold text-[#0056b3] uppercase tracking-wider text-xs ml-1 flex items-center space-x-1">
             <Landmark size={14} />
             <span>Accounts Receivable & Client Collection</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center space-x-1.5 justify-end">
          <button onClick={handleRecordPayment} className="sap-btn flex items-center space-x-1 bg-[#0056b3] text-white hover:bg-[#004494] transition shadow-sm font-semibold">
             <Plus size={12} />
             <span>Add Record Payment</span>
          </button>
          <button onClick={() => setIsExcelImportOpen(true)} className="sap-btn flex items-center space-x-1 bg-green-50 text-green-700 border-green-300 hover:bg-green-100 transition font-semibold">
            <FileSpreadsheet size={12} className="text-green-600" />
            <span>Import Excel</span>
          </button>
          <button className="sap-btn flex items-center space-x-1 bg-[#107c41]/10 text-[#107c41] border-[#107c41]/50 hover:bg-[#107c41] hover:text-white transition font-semibold">
            <FileSpreadsheet size={12} />
            <span>Export AR Report</span>
          </button>

          <div className="h-4 w-px bg-gray-400 mx-1 hidden md:block"></div>

          <span className="font-bold text-gray-700">Site:</span>
          <select value={selectedSite} onChange={e => setSelectedSite(e.target.value)} className="sap-input font-bold text-[#002f6c] min-w-[150px] py-0.5">
            <option value="all">— All Accounts —</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          <div className="relative">
             <Search size={12} className="absolute left-1.5 top-1.5 text-gray-400" />
             <input type="text" className="sap-input pl-5 w-40" placeholder="Search bills..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
        </div>
      </div>

      <Dashboard metrics={metrics} />

      <div className="flex items-center space-x-1 border-b border-[#bcc5cf] pb-0 pt-2 font-semibold text-[11px]">
        <button onClick={() => setActiveTab('AR')} className={`px-4 py-1.5 border border-transparent rounded-t-sm ${activeTab === 'AR' ? 'bg-white border-[#bcc5cf] border-b-white text-[#0056b3] -mb-px shadow-[0_-2px_4px_rgba(0,0,0,0.05)]' : 'text-gray-600 hover:bg-gray-100'}`}>
          <div className="flex items-center space-x-1"><Landmark size={12}/><span>Accounts Receivable Ledger</span></div>
        </button>
        <button onClick={() => setActiveTab('Retention')} className={`px-4 py-1.5 border border-transparent rounded-t-sm ${activeTab === 'Retention' ? 'bg-white border-[#bcc5cf] border-b-white text-orange-700 -mb-px shadow-[0_-2px_4px_rgba(0,0,0,0.05)]' : 'text-gray-600 hover:bg-gray-100'}`}>
          <div className="flex items-center space-x-1"><ShieldQuestion size={12}/><span>Retention Tracker</span></div>
        </button>
        <button onClick={() => setActiveTab('GST-TDS')} className={`px-4 py-1.5 border border-transparent rounded-t-sm ${activeTab === 'GST-TDS' ? 'bg-white border-[#bcc5cf] border-b-white text-purple-700 -mb-px shadow-[0_-2px_4px_rgba(0,0,0,0.05)]' : 'text-gray-600 hover:bg-gray-100'}`}>
          <div className="flex items-center space-x-1"><Percent size={12}/><span>GST & TDS Tracker</span></div>
        </button>
      </div>

      <div className="-mt-0">
        {activeTab === 'AR' && <PaymentRegister data={filteredData} onAddPayment={handleAddPayment} onViewHistory={(id) => alert('View History ' + id)} />}
        {activeTab === 'Retention' && <RetentionRegister data={filteredData} onAddRetentionPayment={() => {}} />}
        {activeTab === 'GST-TDS' && <GSTTDSRegister data={filteredData} />}
      </div>

      <AnimatePresence>
        {modalOpen && selectedBill && (
          <PaymentEntryModal bill={selectedBill} onClose={() => setModalOpen(false)} onSave={savePayment} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {recordPaymentModalOpen && (
          <RecordPaymentModal isOpen={recordPaymentModalOpen} projects={projects} billings={billings} onClose={() => setRecordPaymentModalOpen(false)} onSave={saveGeneralPayment} />
        )}
      </AnimatePresence>

      <BulkUploadModal
        isOpen={isExcelImportOpen}
        onClose={() => setIsExcelImportOpen(false)}
        expectedColumns={['projectId', 'amountReceived', 'date', 'remarks', 'paymentReference', 'paymentMode', 'bankName', 'utrChequeNo']}
        entityName="Client Payments"
        projectsContext={projects}
        onUpload={async (data) => {
          for (const item of data) {
            if (!item.projectId || !item.amountReceived) continue;
            await addClientPayment({
              projectId: item.projectId,
              amountReceived: Number(item.amountReceived) || 0,
              date: item.date || new Date().toISOString().split('T')[0],
              remarks: item.remarks || '',
              paymentReference: item.paymentReference || '',
              paymentMode: item.paymentMode || 'Bank Transfer',
              bankName: item.bankName || '',
              utrChequeNo: item.utrChequeNo || ''
            });
          }
        }}
      />

    </div>
  );
};
