import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Save, X, Landmark, Percent, Ban, HelpCircle, FileClock, Building2, Tag, Calendar, DollarSign, Link, CreditCard, Wallet, Notebook } from 'lucide-react';
import { Project, Billing } from '../../types';

interface RecordPaymentModalProps {
  isOpen: boolean;
  projects: Project[];
  billings: Billing[];
  onClose: () => void;
  onSave: (paymentData: any) => void;
}

export const RecordPaymentModal = ({
  isOpen,
  projects,
  billings,
  onClose,
  onSave,
}: RecordPaymentModalProps) => {
  const [formData, setFormData] = useState({
    projectId: '',
    date: new Date().toISOString().split('T')[0],
    amountReceived: '',
    category: 'RA Bill payment', // 'Advance', 'RA Bill payment', 'GST', 'Retention', 'Others'
    billId: '',
    paymentMode: 'NEFT',
    paymentReference: '',
    bankName: '',
    utrChequeNo: '',
    remarks: '',
  });

  // Filter bills for the selected project
  const projectBills = useMemo(() => {
    if (!formData.projectId) return [];
    return billings.filter((b) => b.projectId === formData.projectId);
  }, [formData.projectId, billings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.projectId) {
      alert('Please select a project');
      return;
    }
    if (!formData.amountReceived || Number(formData.amountReceived) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    // Map categories to isRetentionPayment or save with category
    const isRetention = formData.category === 'Retention' ? 1 : 0;

    onSave({
      projectId: formData.projectId,
      amountReceived: Number(formData.amountReceived),
      date: formData.date,
      remarks: formData.remarks || `Posted under Category: ${formData.category}`,
      status: 'Received',
      billId: formData.billId || null,
      paymentMode: formData.paymentMode,
      bankName: formData.bankName,
      utrChequeNo: formData.utrChequeNo,
      paymentReference: formData.paymentReference,
      isRetentionPayment: isRetention,
      category: formData.category,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="sap-panel relative z-10 w-full max-w-2xl bg-white rounded-sm shadow-2xl border-t-4 border-t-[#0056b3]"
      >
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5 flex justify-between items-center">
          <div>
            <h2 className="text-[#002f6c] font-bold text-sm flex items-center space-x-1.5">
              <Landmark size={14} className="text-[#0056b3]" />
              <span>Record Client Payment</span>
            </h2>
            <p className="text-[10px] text-gray-500 font-mono mt-0.5">
              Log payments corresponding to projects and specific collection heads
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-4 grid grid-cols-2 gap-3 text-xs">
            {/* Project Selection */}
            <div className="flex flex-col space-y-1 col-span-2">
              <label className="font-semibold text-gray-700 flex items-center gap-1">
                <Building2 size={11} className="text-blue-500" />
                <span>Project / Site <span className="text-red-500">*</span></span>
              </label>
              <select
                required
                className="sap-input font-bold text-[#002f6c]"
                value={formData.projectId}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value, billId: '' })}
              >
                <option value="">-- Choose Project --</option>
                {projects.map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    {proj.name} ({proj.clientName || 'No Client'})
                  </option>
                ))}
              </select>
            </div>

            {/* Category Selection */}
            <div className="flex flex-col space-y-1">
              <label className="font-semibold text-gray-700 flex items-center gap-1">
                <Tag size={11} className="text-blue-500" />
                <span>Category <span className="text-red-500">*</span></span>
              </label>
              <select
                required
                className="sap-input font-semibold"
                value={formData.category}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({
                    ...formData,
                    category: val,
                    billId: val === 'Advance' || val === 'Others' ? '' : formData.billId,
                  });
                }}
              >
                <option value="RA Bill payment">RA Bill Payment</option>
                <option value="Advance">Advance</option>
                <option value="GST">GST Payment</option>
                <option value="Retention">Retention Release</option>
                <option value="Others">Others</option>
              </select>
            </div>

            {/* Payment Date */}
            <div className="flex flex-col space-y-1">
              <label className="font-semibold text-gray-700 flex items-center gap-1">
                <Calendar size={11} className="text-blue-500" />
                <span>Payment Date <span className="text-red-500">*</span></span>
              </label>
              <input
                required
                type="date"
                className="sap-input"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            {/* Amount Received */}
            <div className="flex flex-col space-y-1">
              <label className="font-semibold text-gray-700 flex items-center gap-1">
                <DollarSign size={11} className="text-blue-500" />
                <span>Amount Received <span className="text-red-500">*</span></span>
              </label>
              <input
                required
                type="number"
                step="any"
                min="0.01"
                className="sap-input font-mono"
                placeholder="Enter amount (INR)"
                value={formData.amountReceived}
                onChange={(e) => setFormData({ ...formData, amountReceived: e.target.value })}
              />
            </div>

            {/* Associate with specific bill when suitable */}
            {['RA Bill payment', 'GST', 'Retention'].includes(formData.category) && (
              <div className="flex flex-col space-y-1">
                <label className="font-semibold text-gray-700 flex items-center gap-1">
                  <Link size={11} className="text-blue-500" />
                  <span>Link Bill (Optional)</span>
                </label>
                <select
                  disabled={!formData.projectId}
                  className="sap-input"
                  value={formData.billId}
                  onChange={(e) => setFormData({ ...formData, billId: e.target.value })}
                >
                  <option value="">-- No Association (Unallocated) --</option>
                  {projectBills.map((bill) => (
                    <option key={bill.id} value={bill.id}>
                      {bill.billNo} - Val: ₹{(bill.amount || 0).toLocaleString('en-IN')} ({bill.month})
                    </option>
                  ))}
                </select>
                {!formData.projectId && (
                  <span className="text-[9px] text-gray-400">Select a project first to load bills</span>
                )}
              </div>
            )}

            {/* Payment Mode */}
            <div className="flex flex-col space-y-1">
              <label className="font-semibold text-gray-700 flex items-center gap-1">
                <Wallet size={11} className="text-blue-500" />
                <span>Payment Mode</span>
              </label>
              <select
                className="sap-input"
                value={formData.paymentMode}
                onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
              >
                <option value="NEFT">NEFT</option>
                <option value="RTGS">RTGS</option>
                <option value="IMPS">IMPS</option>
                <option value="Cheque">Cheque</option>
                <option value="Cash">Cash</option>
                <option value="Adjusted">Adjusted / Credit Note</option>
              </select>
            </div>

            {/* Bank Name */}
            <div className="flex flex-col space-y-1">
              <label className="font-semibold text-gray-700 flex items-center gap-1">
                <Building2 size={11} className="text-blue-500" />
                <span>Bank Name</span>
              </label>
              <input
                type="text"
                className="sap-input"
                placeholder="e.g. HDFC Bank, SBI"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
              />
            </div>

            {/* UTR / Cheque No. */}
            <div className="flex flex-col space-y-1">
              <label className="font-semibold text-gray-700 flex items-center gap-1">
                <CreditCard size={11} className="text-blue-500" />
                <span>UTR / Cheque No.</span>
              </label>
              <input
                type="text"
                className="sap-input font-mono uppercase"
                placeholder="e.g. UTIB001923..."
                value={formData.utrChequeNo}
                onChange={(e) => setFormData({ ...formData, utrChequeNo: e.target.value })}
              />
            </div>

            {/* Payment Reference */}
            <div className="flex flex-col space-y-1">
              <label className="font-semibold text-gray-700 flex items-center gap-1">
                <Notebook size={11} className="text-blue-500" />
                <span>Payment Reference / Advice No</span>
              </label>
              <input
                type="text"
                className="sap-input"
                placeholder="e.g. advice copy ref..."
                value={formData.paymentReference}
                onChange={(e) => setFormData({ ...formData, paymentReference: e.target.value })}
              />
            </div>

            {/* Remarks */}
            <div className="col-span-2 flex flex-col space-y-1">
              <label className="font-semibold text-gray-700 flex items-center gap-1">
                <Notebook size={11} className="text-blue-500" />
                <span>Remarks</span>
              </label>
              <input
                type="text"
                className="sap-input"
                placeholder="Any special remarks or auto-adjust criteria details..."
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              />
            </div>
          </div>

          {/* Footer controls */}
          <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="sap-btn bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 px-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="sap-btn bg-[#0056b3] text-white hover:bg-[#004494] px-4 flex items-center space-x-1"
            >
              <Save size={14} />
              <span>Record Payment</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
