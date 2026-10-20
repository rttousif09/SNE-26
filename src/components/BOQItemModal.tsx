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
  existingItemNumbers?: string[];
  defaultSection?: string;
  defaultSubSection?: string;
}

export const BOQItemModal: React.FC<BOQItemModalProps> = ({
  isOpen,
  mode,
  initialItem,
  onClose,
  onSave,
  projectName,
  existingItemCodes = [],
  existingItemNumbers = [],
  defaultSection = '',
  defaultSubSection = ''
}) => {
  const [section, setSection] = useState('');
  const [subSection, setSubSection] = useState('');
  const [itemNumber, setItemNumber] = useState('');
  const [itemCode, setItemCode] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('cum');
  const [quantity, setQuantity] = useState<number>(0);
  const [rate, setRate] = useState<number>(0);
  const [category, setCategory] = useState<string>('Other');
  const [drawingRef, setDrawingRef] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{
    itemNumber?: boolean;
    itemCode?: boolean;
    description?: boolean;
    quantity?: boolean;
    rate?: boolean;
  }>({});

  const itemNumberRef = useRef<HTMLInputElement>(null);
  const itemCodeRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const rateRef = useRef<HTMLInputElement>(null);
  const errorBannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialItem && mode === 'edit') {
        setSection(initialItem.section || '');
        setSubSection(initialItem.subSection || '');
        setItemNumber(initialItem.itemNumber || '');
        setItemCode(initialItem.itemCode || '');
        setDescription(initialItem.description || '');
        setUnit(initialItem.unit || 'cum');
        setQuantity(initialItem.contractQuantity ?? initialItem.boqQuantity ?? 0);
        setRate(initialItem.unitRate ?? initialItem.boqRate ?? 0);
        setCategory(initialItem.category || 'Other');
        setDrawingRef(initialItem.drawingRef || '');
        setRemarks(initialItem.remarks || '');
      } else {
        setSection(defaultSection || '');
        setSubSection(defaultSubSection || '');
        setItemNumber('');
        setItemCode('');
        setDescription('');
        setUnit('cum');
        setQuantity(0);
        setRate(0);
        setCategory('Other');
        setDrawingRef('');
        setRemarks('');
      }
      setErrors({});
      setValidationError(null);
      setIsSaving(false);
    }
  }, [isOpen, initialItem, mode, defaultSection, defaultSubSection]);

  if (!isOpen) return null;

  const grossAmount = Math.round((Number(quantity || 0) * Number(rate || 0)) * 100) / 100;

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    let firstInvalidRef: React.RefObject<any> | null = null;
    let errorMsg = '';

    // Item Number validation (if provided, must be unique within BOQ)
    if (itemNumber.trim() && mode === 'add') {
      const isDuplicateNumber = existingItemNumbers.some(
        n => n.trim().toLowerCase() === itemNumber.trim().toLowerCase()
      );
      if (isDuplicateNumber) {
        newErrors.itemNumber = true;
        if (!firstInvalidRef) {
          firstInvalidRef = itemNumberRef;
          errorMsg = `BOQ Item Number "${itemNumber.trim()}" already exists in this BOQ. Please use a unique item number.`;
        }
      }
    }

    if (!itemCode.trim()) {
      newErrors.itemCode = true;
      if (!firstInvalidRef) {
        firstInvalidRef = itemCodeRef;
        errorMsg = 'BOQ Item Reference Code is required (e.g. CONC-01, EARTH-01).';
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
        errorMsg = 'Contract Quantity must be greater than zero.';
      }
    }

    if (rate <= 0 || isNaN(rate)) {
      newErrors.rate = true;
      if (!firstInvalidRef) {
        firstInvalidRef = rateRef;
        errorMsg = 'Contract Unit Rate must be greater than zero.';
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
        section: section.trim() || undefined,
        subSection: subSection.trim() || undefined,
        itemNumber: itemNumber.trim() || undefined,
        itemCode: itemCode.trim(),
        description: description.trim(), // Complete text preserved without truncation
        unit: unit.trim(),
        contractQuantity: Number(quantity),
        unitRate: Number(rate),
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
        approvedRevisedQuantity:
          initialItem?.approvedRevisedQuantity !== undefined
            ? initialItem.approvedRevisedQuantity
            : Number(quantity),
        approvedRevisedRate:
          initialItem?.approvedRevisedRate !== undefined
            ? initialItem.approvedRevisedRate
            : Number(rate),
        revisedAmount:
          initialItem?.revisedAmount !== undefined
            ? initialItem.revisedAmount
            : gross,
        executedQuantity: initialItem?.executedQuantity || 0,
        billedQuantity: initialItem?.billedQuantity || 0,
        balanceQuantity:
          (initialItem?.approvedRevisedQuantity ?? Number(quantity)) -
          (initialItem?.billedQuantity || 0),
        drawingRef: drawingRef.trim() || undefined,
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
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div
        className="sap-panel bg-[#f0f4f8] border-2 border-[#8c9ba8] w-full max-w-4xl rounded-xs shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-[11px] relative z-10 font-sans"
        role="dialog"
        aria-modal="true"
        aria-labelledby="boq-item-dialog-title"
      >
        {/* Pinned Classic SAP GUI Header */}
        <div className="px-4 py-2.5 bg-[#1e3a5f] text-white flex justify-between items-center border-b border-[#0f243d] flex-shrink-0 select-none">
          <div className="flex items-center space-x-2">
            <span
              className="text-xs font-bold tracking-wide flex items-center gap-1.5"
              id="boq-item-dialog-title"
            >
              <span>{mode === 'edit' ? '✏️ Edit BOQ Specification Item' : '📋 Add BOQ Specification Item'}</span>
              {initialItem?.itemCode && (
                <span className="bg-blue-900/80 text-blue-200 px-1.5 py-0.5 rounded-xs text-[10px] font-mono border border-blue-400/30">
                  {initialItem.itemCode}
                </span>
              )}
            </span>
            {projectName && (
              <span className="text-[10px] bg-blue-900/60 text-blue-100 px-2 py-0.5 rounded-xs border border-blue-400/20">
                {projectName}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="text-white/80 hover:text-white p-1 rounded-xs font-bold text-lg leading-none cursor-pointer transition-colors disabled:opacity-50"
            title="Close dialog (Esc)"
          >
            ×
          </button>
        </div>

        {/* Scrollable Form Body with min-height: 0 and overflow-y: auto */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-[#f8fafc]">
          {/* Validation Error Banner */}
          {validationError && (
            <div
              ref={errorBannerRef}
              className="bg-red-50 border border-red-300 text-red-800 px-3 py-2 rounded-xs text-xs flex items-center gap-2 animate-in fade-in"
            >
              <AlertCircle size={15} className="text-red-600 flex-shrink-0" />
              <span className="font-medium">{validationError}</span>
            </div>
          )}

          {/* Section & Hierarchy Group */}
          <div className="bg-white border border-[#cbd5e1] p-3 rounded-xs shadow-2xs space-y-2.5">
            <div className="text-[11px] font-bold text-slate-800 border-b border-slate-200 pb-1 uppercase tracking-wide flex items-center gap-1.5">
              <span>📁 Work Section & Item Hierarchy</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Section / Main Category
                </label>
                <input
                  type="text"
                  placeholder="e.g. Section 1 — Civil Works"
                  value={section}
                  onChange={e => setSection(e.target.value)}
                  className="w-full bg-white border border-[#8c9ba8] rounded-xs text-xs px-2 py-1 h-[28px] focus:outline-none focus:border-blue-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Sub-Section
                </label>
                <input
                  type="text"
                  placeholder="e.g. Section 1.1 — Earthwork"
                  value={subSection}
                  onChange={e => setSubSection(e.target.value)}
                  className="w-full bg-white border border-[#8c9ba8] rounded-xs text-xs px-2 py-1 h-[28px] focus:outline-none focus:border-blue-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Trade Category
                </label>
                <SAPSelect
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-white border border-[#8c9ba8] rounded-xs text-xs px-2 py-1 h-[28px] focus:outline-none focus:border-blue-700"
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  BOQ Item Number
                </label>
                <input
                  ref={itemNumberRef}
                  type="text"
                  placeholder="e.g. 1.1.01, 1.2.03, A-01"
                  value={itemNumber}
                  onChange={e => {
                    setItemNumber(e.target.value);
                    if (errors.itemNumber) setErrors(prev => ({ ...prev, itemNumber: false }));
                  }}
                  className={`w-full bg-white border ${
                    errors.itemNumber
                      ? 'border-red-500 ring-1 ring-red-400 bg-red-50/30'
                      : 'border-[#8c9ba8]'
                  } rounded-xs text-xs px-2 py-1 h-[28px] focus:outline-none focus:border-blue-700 font-mono`}
                />
                {errors.itemNumber && (
                  <p className="text-[10px] text-red-600 mt-0.5">Duplicate or invalid item number</p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Item Reference Code <span className="text-red-500">*</span>
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
                  } rounded-xs text-xs px-2 py-1 h-[28px] focus:outline-none focus:border-blue-700 font-mono font-bold`}
                  required
                />
                {errors.itemCode && (
                  <p className="text-[10px] text-red-600 mt-0.5">Item code is required & unique</p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Drawing / Specification Ref
                </label>
                <input
                  type="text"
                  placeholder="e.g. DWG-STR-101 Rev 2 / IS 456"
                  value={drawingRef}
                  onChange={e => setDrawingRef(e.target.value)}
                  className="w-full bg-white border border-[#8c9ba8] rounded-xs text-xs px-2 py-1 h-[28px] focus:outline-none focus:border-blue-700"
                />
              </div>
            </div>
          </div>

          {/* Work Description Group (Multiline textarea with word wrapping & internal scrolling) */}
          <div className="bg-white border border-[#cbd5e1] p-3 rounded-xs shadow-2xs space-y-1">
            <div className="flex justify-between items-center mb-0.5">
              <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wide">
                Work Description & Technical Specifications <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] font-mono text-slate-500">
                {description.length.toLocaleString('en-IN')} characters entered
              </span>
            </div>
            <textarea
              ref={descRef}
              rows={5}
              value={description}
              onChange={e => {
                setDescription(e.target.value);
                if (errors.description) setErrors(prev => ({ ...prev, description: false }));
                if (validationError) setValidationError(null);
              }}
              placeholder="Paste or enter full technical work description, scope of work, technical specifications, mix ratios, IS codes, tolerance limits, materials & labor provisions..."
              className={`w-full bg-white border ${
                errors.description
                  ? 'border-red-500 ring-1 ring-red-400 bg-red-50/30'
                  : 'border-[#8c9ba8]'
              } rounded-xs text-xs p-2 focus:outline-none focus:border-blue-700 font-sans resize-y min-h-[90px] max-h-44 overflow-y-auto break-words whitespace-pre-wrap leading-relaxed`}
              required
            />
            {errors.description && (
              <p className="text-[10px] text-red-600 mt-0.5">Work description is required</p>
            )}
            <p className="text-[10px] text-slate-400 italic">
              Long work descriptions scroll internally within this field. The complete description is preserved with full fidelity in SQLite.
            </p>
          </div>

          {/* Quantity, Rate & Calculations Group */}
          <div className="bg-white border border-[#cbd5e1] p-3 rounded-xs shadow-2xs space-y-2">
            <div className="text-[11px] font-bold text-slate-800 border-b border-slate-200 pb-1 uppercase tracking-wide flex items-center gap-1.5">
              <span>💰 Contract Quantities & Unit Rate</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Unit of Measurement <span className="text-red-500">*</span>
                </label>
                <SAPSelect
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                  className="w-full bg-white border border-[#8c9ba8] rounded-xs text-xs px-2 py-1 h-[28px] focus:outline-none focus:border-blue-700"
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
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Contract Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  ref={qtyRef}
                  type="number"
                  step="any"
                  placeholder="0.000"
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
                  } rounded-xs text-xs px-2 py-1 h-[28px] focus:outline-none focus:border-blue-700 font-mono font-bold text-right`}
                  min="0.001"
                  required
                />
                {errors.quantity && (
                  <p className="text-[10px] text-red-600 mt-0.5">Quantity must be &gt; 0</p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Contract Unit Rate (₹) <span className="text-red-500">*</span>
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
                  } rounded-xs text-xs px-2 py-1 h-[28px] focus:outline-none focus:border-blue-700 font-mono font-bold text-right`}
                  min="0.01"
                  required
                />
                {errors.rate && (
                  <p className="text-[10px] text-red-600 mt-0.5">Rate must be &gt; 0</p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Calculated Gross Amount (₹)
                </label>
                <div className="bg-[#f0f4f8] border border-[#8c9ba8] rounded-xs text-xs px-2 py-1 font-mono font-bold text-blue-950 flex items-center justify-end h-[28px]">
                  ₹{grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div className="bg-white border border-[#cbd5e1] p-3 rounded-xs shadow-2xs">
            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
              Item Remarks / Construction Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Rate includes materials, machinery, staging, testing, de-shuttering and labor charges"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="w-full bg-white border border-[#8c9ba8] rounded-xs text-xs px-2 py-1 h-[28px] focus:outline-none focus:border-blue-700"
            />
          </div>
        </div>

        {/* Pinned Persistent SAP GUI Footer */}
        <div className="px-4 py-2.5 bg-[#e5ebf0] border-t border-[#cbd5e1] flex justify-between items-center flex-shrink-0 select-none">
          <div className="text-[11px] text-slate-700">
            <span className="font-semibold">Calculated Total:</span>{' '}
            <span className="font-mono font-bold text-[#1e3a5f] text-xs">
              ₹{grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-slate-400 ml-2">|</span>
            <span className="text-slate-500 ml-2">
              Rate: ₹{Number(rate || 0).toLocaleString('en-IN')} / {unit}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold px-4 py-1 rounded-xs border border-[#8c9ba8] cursor-pointer transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={isSaving}
              className="bg-[#1e3a5f] hover:bg-[#152943] text-white text-xs font-bold px-5 py-1 rounded-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed border border-[#0f243d]"
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
