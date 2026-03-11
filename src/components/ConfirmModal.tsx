import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white border border-[#8c9ba8] shadow-lg p-4 max-w-sm w-full text-[11px]">
        <h3 className="font-bold text-[#0056b3] mb-2 border-b border-[#8c9ba8] pb-1">{title}</h3>
        <p className="mb-4 text-gray-700">{message}</p>
        <div className="flex justify-end space-x-2">
          <button onClick={onCancel} className="sap-btn">Cancel</button>
          <button onClick={onConfirm} className="sap-btn bg-red-600 text-white border-red-700 hover:bg-red-700">Delete</button>
        </div>
      </div>
    </div>
  );
};
