import React, { useRef } from 'react';
import { Upload, FileText } from 'lucide-react';

interface FileUploadProps {
  onUpload: (file: File) => void;
  label?: string;
  subLabel?: string;
  compact?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
  onUpload, 
  label = "Upload Report", 
  subLabel = "CSV, XLSX supported",
  compact = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
      // Reset so same file can be selected again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div 
      className={`border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors cursor-pointer flex flex-col items-center justify-center text-center ${compact ? 'p-4' : 'p-8'}`}
      onClick={() => fileInputRef.current?.click()}
    >
      <input 
        type="file" 
        accept=".csv,.txt" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleChange}
      />
      {compact ? (
        <div className="flex items-center gap-2 text-gray-600">
           <Upload size={16} /> <span className="text-sm font-medium">{label}</span>
        </div>
      ) : (
        <>
          <div className="bg-orange-100 p-3 rounded-full mb-3 text-orange-600">
            <Upload size={24} />
          </div>
          <p className="font-semibold text-gray-700">{label}</p>
          <p className="text-xs text-gray-500 mt-1">{subLabel}</p>
        </>
      )}
    </div>
  );
};