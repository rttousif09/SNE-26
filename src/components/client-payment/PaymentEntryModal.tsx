import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Save, X } from 'lucide-react';

export const PaymentEntryModal = ({ bill, onClose, onSave }: { bill: any, onClose: () => void, onSave: (data: any) => void }) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amountReceived: '',
    paymentMode: 'NEFT',
    paymentReference: '',
    bankName: '',
    utrChequeNo: '',
    remarks: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="sap-panel relative z-10 w-full max-w-2xl bg-white rounded-sm shadow-2xl border-t-4 border-t-[#0056b3]">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-2 flex justify-between items-center">
          <div>
            <h2 className="text-[#002f6c] font-bold text-sm">Add Client Payment</h2>
            <p className="text-[10px] text-gray-500 font-mono mt-0.5">Bill: {bill?.billNo} | Site: {bill?.siteName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500"><X size={16} /></button>
        </div>
        <div className="p-4 grid grid-cols-2 gap-4 text-xs">
          <div className="col-span-2 bg-blue-50/50 border border-blue-100 p-2 rounded flex justify-between font-mono text-[10px]">
            <span>Net Receivable: <strong>{bill?.netReceivable.toLocaleString('en-IN')}</strong></span>
            <span className="text-orange-600">Outstanding: <strong>{bill?.outstanding.toLocaleString('en-IN')}</strong></span>
          </div>

          <div className="flex flex-col space-y-1">
            <label className="font-semibold text-gray-700">Payment Date <span className="text-red-500">*</span></label>
            <input required type="date" className="sap-input" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
          </div>

          <div className="flex flex-col space-y-1">
            <label className="font-semibold text-gray-700">Amount Received <span className="text-red-500">*</span></label>
            <input required type="number" step="any" max={bill?.outstanding + 10} className="sap-input font-mono" placeholder="Enter amount..." value={formData.amountReceived} onChange={e => setFormData({...formData, amountReceived: e.target.value})} />
          </div>

          <div className="flex flex-col space-y-1">
            <label className="font-semibold text-gray-700">Payment Mode</label>
            <select className="sap-input" value={formData.paymentMode} onChange={e => setFormData({...formData, paymentMode: e.target.value})}>
              <option value="NEFT">NEFT</option>
              <option value="RTGS">RTGS</option>
              <option value="IMPS">IMPS</option>
              <option value="Cheque">Cheque</option>
              <option value="Cash">Cash</option>
              <option value="Adjusted">Adjusted / Credit Note</option>
            </select>
          </div>

          <div className="flex flex-col space-y-1">
            <label className="font-semibold text-gray-700">Bank Name</label>
            <input type="text" className="sap-input" placeholder="e.g. HDFC Bank" value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} />
          </div>
          
          <div className="flex flex-col space-y-1">
            <label className="font-semibold text-gray-700">UTR / Cheque No.</label>
            <input type="text" className="sap-input font-mono uppercase" placeholder="e.g. HDFC000123..." value={formData.utrChequeNo} onChange={e => setFormData({...formData, utrChequeNo: e.target.value})} />
          </div>
          
          <div className="flex flex-col space-y-1">
            <label className="font-semibold text-gray-700">Payment Reference</label>
            <input type="text" className="sap-input" placeholder="Payment ref..." value={formData.paymentReference} onChange={e => setFormData({...formData, paymentReference: e.target.value})} />
          </div>

          <div className="col-span-2 flex flex-col space-y-1">
            <label className="font-semibold text-gray-700">Remarks</label>
            <input type="text" className="sap-input" placeholder="Any additional details..." value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} />
          </div>
        </div>
        <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 flex justify-end space-x-2">
          <button onClick={onClose} className="sap-btn bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 px-4">Cancel</button>
          <button onClick={handleSubmit} className="sap-btn bg-[#0056b3] text-white hover:bg-[#004494] px-4 flex items-center space-x-1">
            <Save size={14} />
            <span>Post Payment</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
