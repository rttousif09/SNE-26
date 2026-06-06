import React from 'react';
import { AnimateModal } from './AnimatedERP';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, title, message, onConfirm, onCancel }) => {
  return (
    <AnimateModal isOpen={isOpen} onClose={onCancel} maxWidthClass="max-w-sm">
      <div className="p-4">
        <h3 className="font-bold text-[#0056b3] mb-2 border-b border-[#8c9ba8] pb-1">{title}</h3>
        <p className="mb-4 text-gray-700 text-[11px]">{message}</p>
        <div className="flex justify-end space-x-2">
          <button onClick={onCancel} className="sap-btn">Cancel</button>
          <button onClick={onConfirm} className="sap-btn bg-red-600 text-white border-red-700 hover:bg-red-700">Delete</button>
        </div>
      </div>
    </AnimateModal>
  );
};

