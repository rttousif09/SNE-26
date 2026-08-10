import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Check, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface OptionItem {
  value: string | number;
  label: string;
  code: string;
  description: string;
  disabled?: boolean;
  isGroupLabel?: boolean;
}

// Helper to recursively parse options from React children
export function extractOptionsFromChildren(children: React.ReactNode): OptionItem[] {
  const items: OptionItem[] = [];

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;

    const element = child as React.ReactElement<any>;

    if (element.type === 'option') {
      const props = element.props || {};
      const val = props.value !== undefined ? props.value : props.children;
      const rawLabel = typeof props.children === 'string' 
        ? props.children 
        : String(props.children || val || '');

      // Check if label contains code in parenthesis, e.g. "John Doe (EMP001)" or "EMP001 - John Doe"
      let code = String(val);
      let description = rawLabel;

      const parenMatch = rawLabel.match(/^(.*?)\s*\((.*?)\)$/);
      const dashMatch = rawLabel.match(/^(.*?)\s*[-:]\s*(.*)$/);

      if (parenMatch) {
        description = parenMatch[1].trim();
        code = parenMatch[2].trim();
      } else if (dashMatch && dashMatch[1].length <= 12) {
        code = dashMatch[1].trim();
        description = dashMatch[2].trim();
      }

      items.push({
        value: val,
        label: rawLabel,
        code: code,
        description: description,
        disabled: props.disabled,
      });
    } else if (element.type === React.Fragment) {
      items.push(...extractOptionsFromChildren(element.props?.children));
    } else if (element.type === 'optgroup') {
      const props = element.props || {};
      items.push({
        value: '',
        label: props.label || 'Group',
        code: '',
        description: props.label || 'Group',
        disabled: true,
        isGroupLabel: true,
      });
      items.push(...extractOptionsFromChildren(props.children));
    } else {
      items.push(...extractOptionsFromChildren(element.props?.children));
    }
  });

  return items;
}

interface SAPSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  labelTitle?: string;
  placeholder?: string;
}

export const SAPSelect: React.FC<SAPSelectProps> = ({
  children,
  value,
  onChange,
  className = '',
  disabled,
  required,
  name,
  id,
  placeholder,
  labelTitle,
  ...rest
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const options = useMemo(() => extractOptionsFromChildren(children), [children]);

  // Exclude empty default select options from table count if they are just placeholders
  const selectableOptions = useMemo(() => {
    return options.filter((o) => !o.isGroupLabel);
  }, [options]);

  const selectedOption = useMemo(() => {
    return options.find((o) => String(o.value) === String(value));
  }, [options, value]);

  // Filter options based on search input
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return selectableOptions;
    const term = searchTerm.toLowerCase();
    return selectableOptions.filter(
      (o) =>
        String(o.value).toLowerCase().includes(term) ||
        o.label.toLowerCase().includes(term) ||
        o.code.toLowerCase().includes(term) ||
        o.description.toLowerCase().includes(term)
    );
  }, [selectableOptions, searchTerm]);

  // Focus search input on modal open
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleSelect = (opt: OptionItem) => {
    if (opt.disabled || opt.isGroupLabel) return;
    if (onChange) {
      const syntheticEvent = {
        target: { value: opt.value, name, id },
        currentTarget: { value: opt.value, name, id },
      } as unknown as React.ChangeEvent<HTMLSelectElement>;
      onChange(syntheticEvent);
    }
    setIsOpen(false);
  };

  const modalTitle = labelTitle || name || 'Select Item / Value Help';

  return (
    <div className={`relative inline-flex items-center w-full min-w-[120px]`} ref={containerRef}>
      {/* Hidden standard select for native form compatibility */}
      <select
        className="sr-only"
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        name={name}
        id={id}
        tabIndex={-1}
        {...rest}
      >
        {children}
      </select>

      {/* Visible SAP GUI Field Container */}
      <div
        className={`sap-input w-full flex items-center justify-between cursor-pointer select-none py-0.5 px-1.5 min-h-[24px] border border-[#8c9ba8] rounded-xs transition-colors ${
          disabled
            ? 'bg-[#eef2f6] text-[#475569] cursor-not-allowed opacity-80'
            : 'bg-white hover:border-[#0056b3]'
        } ${className}`}
        onClick={() => !disabled && setIsOpen(true)}
      >
        <span className={`truncate text-[11px] font-sans ${selectedOption && selectedOption.value !== '' ? 'text-gray-900 font-medium' : 'text-gray-500 italic'}`}>
          {selectedOption ? selectedOption.label : (placeholder || '-- Select --')}
        </span>
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) setIsOpen(true);
          }}
          className="ml-1 px-1 py-0.5 bg-gradient-to-b from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 border-l border-[#8c9ba8] text-gray-700 flex items-center justify-center rounded-r-xs shrink-0"
          title="F4 Value Help"
        >
          <Search size={11} className="text-[#002f6c]" />
        </button>
      </div>

      {/* Authentic SAP GUI F4 Search Help Pop-up Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-[1px] p-4 select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -8 }}
              transition={{ duration: 0.15 }}
              className="bg-[#f0f4f8] border-2 border-[#002f6c] shadow-2xl rounded-xs w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden text-[11px] font-sans"
            >
              {/* SAP GUI Top Dialog Title Banner */}
              <div className="bg-gradient-to-b from-[#d2dfed] via-[#c8d7e6] to-[#b8ceea] border-b border-[#8c9ba8] px-3 py-1.5 flex items-center justify-between text-[#002f6c] font-bold text-xs shadow-xs">
                <div className="flex items-center space-x-2 truncate">
                  <span className="bg-[#002f6c] text-white text-[9px] px-1 py-0.2 rounded-xs font-mono font-semibold">
                    F4 Help
                  </span>
                  <span className="truncate">{modalTitle}</span>
                  <span className="text-[10px] text-[#003b82] font-normal border-l border-[#8c9ba8] pl-2">
                    {selectableOptions.length} Entries Found
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-[#002f6c] hover:bg-red-600 hover:text-white p-0.5 rounded-xs transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Restrictions / Search Filter Bar */}
              <div className="bg-gradient-to-b from-[#f4f7fa] to-[#e8eef4] border-b border-[#8c9ba8] p-2 flex flex-col space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-bold text-[#002f6c] uppercase tracking-wider flex items-center gap-1">
                    <Filter size={11} /> Restrictions / Find:
                  </span>
                  <div className="relative flex-1">
                    <input
                      ref={searchInputRef}
                      type="text"
                      className="sap-input w-full pl-6 pr-2 py-1 text-[11px] bg-white border border-[#8c9ba8] focus:bg-[#fffde7] focus:border-[#d97706] rounded-xs shadow-inner"
                      placeholder="Type to filter list..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setIsOpen(false);
                        if (e.key === 'Enter' && filteredOptions.length > 0) {
                          handleSelect(filteredOptions[0]);
                        }
                      }}
                    />
                    <Search
                      size={12}
                      className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-500"
                    />
                  </div>
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="text-xs text-gray-500 hover:text-gray-800 px-1 font-semibold"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Table / List Area */}
              <div className="flex-1 overflow-auto bg-white p-1">
                <table className="w-full text-left border-collapse border border-[#cbd5e1]">
                  <thead>
                    <tr className="bg-gradient-to-b from-[#e2e8f0] to-[#cbd5e1] text-[#002f6c] font-bold border-b border-[#8c9ba8] sticky top-0 z-10 text-[10px] uppercase">
                      <th className="p-1.5 border-r border-[#cbd5e1] w-12 text-center">#</th>
                      <th className="p-1.5 border-r border-[#cbd5e1] w-28">Key / Code</th>
                      <th className="p-1.5">Description / Name</th>
                      <th className="p-1.5 w-12 text-center">Select</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOptions.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-gray-500 italic">
                          No matching records found for "{searchTerm}"
                        </td>
                      </tr>
                    ) : (
                      filteredOptions.map((opt, idx) => {
                        const isSelected = String(opt.value) === String(value);
                        return (
                          <tr
                            key={idx}
                            onMouseEnter={() => setHoveredIdx(idx)}
                            onMouseLeave={() => setHoveredIdx(null)}
                            onClick={() => handleSelect(opt)}
                            className={`cursor-pointer border-b border-gray-200 transition-colors ${
                              isSelected
                                ? 'bg-[#d2dfed] font-bold text-[#002f6c] border-l-4 border-l-[#0056b3]'
                                : hoveredIdx === idx
                                ? 'bg-[#fffde7] text-gray-900 border-l-4 border-l-[#d97706]'
                                : idx % 2 === 0
                                ? 'bg-white'
                                : 'bg-[#f8fafc]'
                            }`}
                          >
                            <td className="p-1.5 border-r border-gray-200 text-center text-gray-500 font-mono text-[10px]">
                              {idx + 1}
                            </td>
                            <td className="p-1.5 border-r border-gray-200 font-mono font-semibold text-gray-700 truncate max-w-[110px]">
                              {opt.code || opt.value || '-'}
                            </td>
                            <td className="p-1.5 font-medium text-gray-900 truncate">
                              {opt.description || opt.label}
                            </td>
                            <td className="p-1.5 text-center">
                              {isSelected ? (
                                <span className="inline-flex items-center justify-center bg-[#0056b3] text-white rounded-full p-0.5">
                                  <Check size={10} />
                                </span>
                              ) : (
                                <span className="text-[10px] text-[#0056b3] hover:underline font-bold">
                                  Choose
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* SAP GUI Footer Status */}
              <div className="bg-gradient-to-b from-[#e2e8f0] to-[#cbd5e1] border-t border-[#8c9ba8] px-3 py-1.5 flex items-center justify-between text-[10px] text-gray-700">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-[#002f6c]">
                    Showing {filteredOptions.length} of {selectableOptions.length} entries
                  </span>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="sap-btn bg-white border border-gray-400 text-gray-700 px-3 py-0.5 hover:bg-gray-100 rounded-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
