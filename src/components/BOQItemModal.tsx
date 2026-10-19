import React, { useState, useEffect, useRef } from 'react';
import { BOQItem } from '../types';
import { SAPSelect } from './SAPSelect';
import { Save, X, AlertCircle } from 'lucide-react';

export interface BOQItemModalProps {
  isOpen: boolean;
  mode: 'add' | 'edit';
  initialItem?: BOQItem | null;
  onClose: () => void;
  onSave: (item: BOQItem) => Promise<void> | void;
  projectName?: string;
  existingItemCodes?: string[];
}

export const BOQItemModal: React.FC<BOQItemModalProps> = ({
  isOpen,
  mode,
  initialItem,
  onClose,
  onSave,
  projectName,
  existingItemCodes = []
}) => {
  const [itemCode, setItemCode] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('cum');
  const [quantity, setQuantity] = useState<number>(0);
  const [rate, setRate] = useState<number>(0);
  const [category, setCategory] = useState<string>('Other');
  const [remarks, setRemarks] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{
    itemCode?: boolean;
    description?: boolean;
    quantity?: boolean;
    rate?: boolean;
  }>({});

  const itemCodeRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const rateRef = useRef<HTMLInputElement>(null);
  const errorBannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialItem && mode === 'edit') {
        setItemCode(initialItem.itemCode || '');
        setDescription(initialItem.description || '');
        setUnit(initialItem.unit || 'cum');
        setQuantity(initialItem.boqQuantity || 0);
        setRate(initialItem.boqRate || 0);
        setCategory(initialItem.category || 'Other');
        setRemarks(initialItem.remarks || '');
      } else {
        setItemCode('');
        setDescription('');
        setUnit('cum');
        setQuantity(0);
        setRate(0);
        setCategory('Other');
        setRemarks('');
      }
      setErrors({});
      setValidationError(null);
      setIsSaving(false);
    }
  }, [isOpen, initialItem, mode]);

  if (!isOpen) return null;

  const grossAmount = Math.round((Number(quantity || 0) * Number(rate || 0)) * 100) / 100;

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    let firstInvalidRef: React.RefObject<any> | null = null;
    let errorMsg = '';

    if (!itemCode.trim()) {
      newErrors.itemCode = true;
      if (!firstInvalidRef) {
        firstInvalidRef = itemCodeRef;
        errorMsg = 'BOQ Item Code is required.';
      }
    } else if (
      mode === 'add' &&
      existingItemCodes.some(
        c => c.trim().toLowerCase() === itemCode.trim().toLowerCase()
      )
    ) {
      newErrors.itemCode = true;
      if (!firstInvalidRef) {
        firstInvalidRef = itemCodeRef;
        errorMsg = `Item code "${itemCode.trim()}" already exists in this BOQ. Please use a unique item code.`;
      }
    }

    if (!description.trim()) {
      newErrors.description = true;
      if (!firstInvalidRef) {
        firstInvalidRef = descRef;
        errorMsg = 'Work Description is required.';
      }
    }

    if (quantity <= 0 || isNaN(quantity)) {
      newErrors.quantity = true;
      if (!firstInvalidRef) {
        firstInvalidRef = qtyRef;
        errorMsg = 'BOQ Quantity must be greater than zero.';
      }
    }

    if (rate <= 0 || isNaN(rate)) {
      newErrors.rate = true;
      if (!firstInvalidRef) {
        firstInvalidRef = rateRef;
        errorMsg = 'Contract Rate must be greater than zero.';
      }
    }

    setErrors(newErrors);
    setValidationError(errorMsg);

    if (firstInvalidRef && firstInvalidRef.current) {
      firstInvalidRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstInvalidRef.current.focus();
      return false;
    }

    return true;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSaving) return;

    if (!validate()) return;

    try {
      setIsSaving(true);
      const gross = parseFloat((Number(quantity) * Number(rate)).toFixed(2));
      const itemToSave: BOQItem = {
        id:
          initialItem?.id ||
          'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        itemCode: itemCode.trim(),
        description: description.trim(), // Complete text preserved with no truncation
        unit: unit.trim(),
        originalQuantity:
          initialItem && initialItem.originalQuantity !== undefined
            ? initialItem.originalQuantity
            : Number(quantity),
        originalRate:
          initialItem && initialItem.originalRate !== undefined
            ? initialItem.originalRate
            : Number(rate),
        boqQuantity: Number(quantity),
        boqRate: Number(rate),
        boqAmount: gross,
        executedQuantity: initialItem?.executedQuantity || 0,
        billedQuantity: initialItem?.billedQuantity || 0,
        remarks: remarks.trim() || undefined,
        category: (category as any) || 'Other',
        floors: initialItem?.floors || [],
        billingHistory: initialItem?.billingHistory || [],
        revisionsHistory: initialItem?.revisionsHistory || [],
        variations: initialItem?.variations || []
      };

      await onSave(itemToSave);
      onClose();
    } catch (err: any) {
      console.error('Failed to save BOQ item:', err);
      setValidationError(err?.message || 'Failed to save BOQ item. Please try again.');
      if (errorBannerRef.current) {
        errorBannerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        className="sap-panel bg-[#f0f4f8] border-2 border-[#8c9ba8] w-full max-w-3xl rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-[11px] relative z-10 font-sans"
        role="dialog"
        aria-modal="true"
        aria-labelledby="boq-item-dialog-title"
      >
        {/* Pinned Header */}
        <div className="px-5 py-3.5 bg-[#1e3a5f] text-white flex justify-between items-center border-b border-[#0f243d] flex-shrink-0 select-none">
          <div className="flex items-center space-x-2">
            <span
              className="text-xs font-bold tracking-wide flex items-center gap-1.5"
              id="boq-item-dialog-title"
            >
              <span>{mode === 'edit' ? '✏️ Edit BOQ Item' : '📋 Add BOQ Item'}</span>
              {initialItem?.itemCode && (
                <span className="bg-blue-900/80 text-blue-200 px-2 py-0.5 rounded text-[10px] font-mono border border-blue-400/30">
                  {initialItem.itemCode}
                </span>
              )}
            </span>
            {projectName && (
              <span className="text-[10px] bg-blue-900/60 text-blue-100 px-2 py-0.5 rounded border border-blue-400/20">
                {projectName}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="text-white/80 hover:text-white p-1 rounded font-bold text-lg leading-none cursor-pointer transition-colors disabled:opacity-50"
            title="Close dialog (Esc)"
          >
            ×
          </button>
        </div>

        {/* Scrollable Form Body with min-height: 0 and overflow-y: auto */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4 bg-white/70">
          {/* Validation Error Banner */}
          {validationError && (
            <div
              ref={errorBannerRef}
              className="bg-red-50 border border-red-300 text-red-800 px-3 py-2 rounded text-xs flex items-center gap-2 animate-in fade-in"
            >
              <AlertCircle size={15} className="text-red-600 flex-shrink-0" />
              <span className="font-medium">{validationError}</span>
            </div>
          )}

          {/* Grid: Item Code & Trade Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                BOQ Item Code <span className="text-red-500">*</span>
              </label>
              <input
                ref={itemCodeRef}
                type="text"
                placeholder="e.g. CONC-01, EARTH-02, REINF-01"
                value={itemCode}
                onChange={e => {
                  setItemCode(e.target.value);
                  if (errors.itemCode) setErrors(prev => ({ ...prev, itemCode: false }));
                  if (validationError) setValidationError(null);
                }}
                className={`w-full bg-white border ${
                  errors.itemCode
                    ? 'border-red-500 ring-1 ring-red-400 bg-red-50/30'
                    : 'border-[#8c9ba8]'
                } rounded text-xs px-2.5 py-1.5 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-mono`}
                required
              />
              {errors.itemCode && (
                <p className="text-[10px] text-red-600 mt-0.5">Item code is required</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Trade Category
              </label>
              <SAPSelect
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-white border border-[#8c9ba8] rounded text-xs px-2.5 py-1.5 focus:outline-none focus:border-blue-600"
              >
                <option value="Other">Other / General</option>
                <option value="Concreting">Concreting</option>
                <option value="Reinforcement">Reinforcement</option>
                <option value="Shuttering">Shuttering</option>
                <option value="Excavation">Excavation</option>
                <option value="Masonry">Masonry</option>
                <option value="Plastering">Plastering</option>
                <option value="Flooring">Flooring</option>
              </SAPSelect>
            </div>
          </div>

          {/* Work Description (Multiline textarea with word wrapping & internal scrolling) */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-semibold text-slate-700">
                Work Description / Scope Specifications <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] font-mono text-slate-500">
                {description.length.toLocaleString('en-IN')} characters
              </span>
            </div>
            <textarea
              ref={descRef}
              rows={6}
              value={description}
              onChange={e => {
                setDescription(e.target.value);
                if (errors.description) setErrors(prev => ({ ...prev, description: false }));
                if (validationError) setValidationError(null);
              }}
              placeholder="Paste or enter full technical work description, scope of work, technical specifications, mix ratios, IS codes, tolerance limits..."
              className={`w-full bg-white border ${
                errors.description
                  ? 'border-red-500 ring-1 ring-red-400 bg-red-50/30'
                  : 'border-[#8c9ba8]'
              } rounded-sm text-xs p-2.5 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-sans resize-y min-h-[110px] max-h-48 overflow-y-auto break-words whitespace-pre-wrap leading-relaxed shadow-2xs`}
              required
            />
            {errors.description && (
              <p className="text-[10px] text-red-600 mt-0.5">Work description is required</p>
            )}
            <p className="text-[10px] text-slate-500">
              Long work descriptions scroll inside this textarea with automatic word-wrapping, preserving the modal layout. The complete text is stored without truncation in SQLite.
            </p>
          </div>

          {/* Grid: Unit, Quantity, Rate, Calculated Gross Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Unit of Measurement <span className="text-red-500">*</span>
              </label>
              <SAPSelect
                value={unit}
                onChange={e => setUnit(e.target.value)}
                className="w-full bg-white border border-[#8c9ba8] rounded text-xs px-2.5 py-1.5 focus:outline-none focus:border-blue-600"
              >
                <option value="cum">cum (Cubic Meter)</option>
                <option value="sqm">sqm (Square Meter)</option>
                <option value="rm">rm (Running Meter)</option>
                <option value="kg">kg (Kilogram)</option>
                <option value="mt">mt (Metric Ton)</option>
                <option value="nos">nos (Numbers)</option>
                <option value="Sq.ft">Sq.ft (Square Feet)</option>
                <option value="Cu.ft">Cu.ft (Cubic Feet)</option>
                <option value="Rft">Rft (Running Feet)</option>
                <option value="Lumpsum">Lumpsum (LS)</option>
                <option value="Bags">Bags</option>
                <option value="Ltr">Ltr (Liter)</option>
                <option value="Pcs">Pcs (Pieces)</option>
                <option value="Brass">Brass</option>
                <option value="Trips">Trips</option>
                <option value="Days">Days</option>
                <option value="Months">Months</option>
              </SAPSelect>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                BOQ Quantity <span className="text-red-500">*</span>
              </label>
              <input
                ref={qtyRef}
                type="number"
                step="any"
                placeholder="0.00"
                value={quantity || ''}
                onChange={e => {
                  setQuantity(Number(e.target.value));
                  if (errors.quantity) setErrors(prev => ({ ...prev, quantity: false }));
                  if (validationError) setValidationError(null);
                }}
                className={`w-full bg-white border ${
                  errors.quantity
                    ? 'border-red-500 ring-1 ring-red-400 bg-red-50/30'
                    : 'border-[#8c9ba8]'
                } rounded text-xs px-2.5 py-1.5 focus:outline-none focus:border-blue-600 font-mono font-bold`}
                min="0.001"
                required
              />
              {errors.quantity && (
                <p className="text-[10px] text-red-600 mt-0.5">Quantity must be &gt; 0</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contract Rate (₹) <span className="text-red-500">*</span>
              </label>
              <input
                ref={rateRef}
                type="number"
                step="any"
                placeholder="0.00"
                value={rate || ''}
                onChange={e => {
                  setRate(Number(e.target.value));
                  if (errors.rate) setErrors(prev => ({ ...prev, rate: false }));
                  if (validationError) setValidationError(null);
                }}
                className={`w-full bg-white border ${
                  errors.rate
                    ? 'border-red-500 ring-1 ring-red-400 bg-red-50/30'
                    : 'border-[#8c9ba8]'
                } rounded text-xs px-2.5 py-1.5 focus:outline-none focus:border-blue-600 font-mono font-bold`}
                min="0.01"
                required
              />
              {errors.rate && (
                <p className="text-[10px] text-red-600 mt-0.5">Rate must be &gt; 0</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Calculated Gross Amount
              </label>
              <div className="bg-white border border-slate-300 rounded text-xs px-2.5 py-1.5 font-mono font-bold text-slate-900 flex items-center h-[31px]">
                ₹{grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Item Remarks / Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Rate includes supply of materials, equipment, shuttering, de-shuttering and labor"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="w-full bg-white border border-[#8c9ba8] rounded text-xs px-2.5 py-1.5 focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>

        {/* Pinned Persistent Footer with Save and Cancel buttons */}
        <div className="px-5 py-3 bg-[#f8fafc] border-t border-slate-200 flex justify-between items-center flex-shrink-0 select-none">
          <div className="text-[11px] text-slate-600">
            <span className="font-semibold text-slate-700">Gross Total:</span>{' '}
            <span className="font-mono font-bold text-blue-900">
              ₹{grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold px-4 py-1.5 rounded border border-slate-300 cursor-pointer transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={isSaving}
              className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold px-5 py-1.5 rounded flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={13} />
                  <span>{mode === 'edit' ? 'Save Item Changes' : 'Save BOQ Item'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
