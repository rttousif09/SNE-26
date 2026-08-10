import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface F4HelpProps {
  value: string;
  onChange: (value: string) => void;
  options: { id: string; [key: string]: any }[];
  displayKey: string; // The key to show in the input
  columns: { key: string; header: string }[];
  title?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const F4Help: React.FC<F4HelpProps> = ({
  value, onChange, options, displayKey, columns, title = "Search", placeholder = "", disabled = false, className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const selectedOption = options.find(o => String(o.id) === String(value));
  const displayValue = selectedOption ? selectedOption[displayKey] : "";

  const filteredOptions = options.filter(opt => 
    columns.some(col => String(opt[col.key]).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <>
      <div className={`relative flex items-center ${className}`}>
        <input 
          type="text" 
          className={`sap-input w-full pr-8 ${disabled ? 'bg-gray-100' : 'bg-white'}`}
          value={displayValue}
          readOnly
          placeholder={placeholder}
          onClick={() => !disabled && setIsOpen(true)}
        />
        <button 
          type="button"
          onClick={() => !disabled && setIsOpen(true)}
          className="absolute right-0 top-0 bottom-0 px-2 bg-gray-200 border-l border-[#8c9ba8] hover:bg-gray-300 flex items-center justify-center text-gray-600 rounded-r-sm"
          disabled={disabled}
        >
          <Search size={14} />
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white shadow-2xl rounded-sm w-full max-w-2xl max-h-[80vh] flex flex-col border-2 border-[#002f6c]"
            >
              <div className="bg-gradient-to-b from-[#d2dfed] to-[#b8ceea] border-b border-[#8c9ba8] p-2 flex justify-between items-center text-[#002f6c] font-bold text-xs">
                <span>{title}</span>
                <button onClick={() => setIsOpen(false)} className="hover:bg-red-500 hover:text-white p-1 rounded">
                  <X size={14} />
                </button>
              </div>
              
              <div className="p-3 bg-gray-50 border-b border-gray-300">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold">Find:</span>
                  <input 
                    type="text" 
                    className="sap-input flex-1" 
                    autoFocus
                    placeholder="Search..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-auto bg-white p-2">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr>
                      {columns.map(col => (
                        <th key={col.key} className="p-2 border border-gray-300 bg-gray-100 font-bold text-[#002f6c] sticky top-0">
                          {col.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOptions.length === 0 ? (
                      <tr>
                        <td colSpan={columns.length} className="p-4 text-center text-gray-500">No results found</td>
                      </tr>
                    ) : (
                      filteredOptions.map(opt => (
                        <tr 
                          key={opt.id} 
                          className="hover:bg-[#fffde7] cursor-pointer border-b border-gray-200"
                          onClick={() => {
                            onChange(opt.id);
                            setIsOpen(false);
                          }}
                        >
                          {columns.map(col => (
                            <td key={col.key} className="p-2 border-r border-gray-200 last:border-r-0">
                              {opt[col.key]}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
