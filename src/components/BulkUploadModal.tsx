import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Upload, X, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { AnimateModal, UploadProgressBar } from './AnimatedERP';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (data: any[]) => Promise<void>;
  expectedColumns: string[];
  entityName: string;
  sampleTemplateLink?: string;
}

export function BulkUploadModal({ isOpen, onClose, onUpload, expectedColumns, entityName }: BulkUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);


  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setErrors([]);
      
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            setErrors(results.errors.map(err => `Row ${err.row}: ${err.message}`));
            return;
          }
          
          const parsedData = results.data;
          if (parsedData.length === 0) {
            setErrors(["The CSV file is empty."]);
            return;
          }

          // Check for required columns
          const headers = Object.keys(parsedData[0] as object);
          const missingColumns = expectedColumns.filter(col => !headers.includes(col));
          
          if (missingColumns.length > 0) {
            setErrors([`Missing required columns: ${missingColumns.join(', ')}`]);
            setData([]);
            return;
          }

          setData(parsedData);
        },
        error: (error) => {
          setErrors([error.message]);
        }
      });
    }
  };

  const handleUpload = async () => {
    if (data.length === 0) return;
    setIsUploading(true);
    setUploadProgress(0);
    setErrors([]);
    
    let currentProg = 0;
    const interval = setInterval(() => {
      currentProg += Math.floor(Math.random() * 15) + 5;
      if (currentProg >= 100) {
        currentProg = 100;
        clearInterval(interval);
        setTimeout(async () => {
          try {
            await onUpload(data);
            onClose();
          } catch (err: any) {
            setErrors([err.message || "Failed to upload data"]);
            setIsUploading(false);
          }
        }, 300);
      }
      setUploadProgress(currentProg);
    }, 60);
  };

  const generateTemplate = () => {
    const csvContent = expectedColumns.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${entityName}_template.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AnimateModal isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-[500px]">
      <div className="flex flex-col">
        <div className="flex justify-between items-center p-3 border-b bg-[#f0f4f8]">
          <h2 className="font-bold text-[#002f6c] flex items-center text-xs">
            <Upload size={14} className="mr-2 animate-bounce" />
            Bulk Upload {entityName}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-red-500 transition-colors">
            <X size={16} />
          </button>
        </div>
        
        <div className="p-4 flex-1 overflow-auto">
          <div className="mb-4">
            <p className="text-[11px] text-gray-600 mb-2">
              Upload a CSV file containing multiple records. Please ensure your file matches the expected template.
            </p>
            <button 
              onClick={generateTemplate}
              className="text-[#0056b3] text-[11px] hover:underline flex items-center font-semibold"
            >
              <FileSpreadsheet size={12} className="mr-1" />
              Download Template CSV
            </button>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded p-6 text-center hover:bg-gray-50 transition w-full">
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileChange}
              disabled={isUploading}
            />
            {file ? (
              <div>
                <div className="text-[13px] font-bold text-green-700">{file.name}</div>
                <div className="text-[10px] text-gray-500 mt-1">{data.length} valid rows found</div>
                {!isUploading && (
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 text-[#0056b3] text-[11px] hover:underline"
                  >
                    Change File
                  </button>
                )}
              </div>
            ) : (
              <div>
                <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="sap-btn bg-gray-200 text-gray-800 hover:bg-gray-300"
                >
                  Select CSV File
                </button>
              </div>
            )}
          </div>

          {isUploading && (
            <div className="mt-4">
              <UploadProgressBar progress={uploadProgress} />
            </div>
          )}

          {errors.length > 0 && !isUploading && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
              <div className="flex items-center text-red-800 font-bold text-[11px] mb-1">
                <AlertTriangle size={12} className="mr-1" />
                Validation Errors
              </div>
              <ul className="text-[10px] text-red-700 list-disc pl-4 space-y-1 max-h-32 overflow-auto">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        <div className="p-3 border-t bg-gray-50 flex justify-end space-x-2">
          <button 
            type="button" 
            onClick={onClose}
            className="sap-btn bg-white border border-gray-300 hover:bg-gray-50"
            disabled={isUploading}
          >
            Cancel
          </button>
          <button 
            onClick={handleUpload}
            className="sap-btn bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 flex items-center"
            disabled={data.length === 0 || errors.length > 0 || isUploading}
          >
            {isUploading ? 'Uploading...' : `Upload ${data.length} Records`}
          </button>
        </div>
      </div>
    </AnimateModal>
  );
}
