import React, { useRef, useState } from 'react';
import { UploadCloud, FileText } from 'lucide-react';
import { Button } from './Button';

export interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  multiple?: boolean;
  acceptedFileTypes?: string[];
  title?: string;
  subtitle?: string;
  className?: string;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  onFilesSelected,
  multiple = false,
  acceptedFileTypes = ['.pdf'],
  title = 'Drop PDF here',
  subtitle = 'or browse from your computer',
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      const filtered = filterValidFiles(droppedFiles, acceptedFileTypes);
      if (filtered.length > 0) {
        onFilesSelected(multiple ? filtered : [filtered[0]]);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      const filtered = filterValidFiles(selectedFiles, acceptedFileTypes);
      if (filtered.length > 0) {
        onFilesSelected(multiple ? filtered : [filtered[0]]);
      }
      // Reset input value so same file can be re-selected if needed
      e.target.value = '';
    }
  };

  const filterValidFiles = (files: File[], accepted: string[]): File[] => {
    if (accepted.length === 0 || accepted.includes('*')) return files;
    return files.filter((file) => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      return accepted.some((acc) => acc.toLowerCase() === ext || file.type.includes(acc.replace('.', '')));
    });
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`group relative flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/50 ${
        isDragging
          ? 'border-brand-500 bg-brand-50/40 dark:bg-brand-950/20 scale-[1.01]'
          : 'border-slate-300 dark:border-slate-700 hover:border-brand-400'
      } ${className}`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={acceptedFileTypes.join(',')}
        onChange={handleInputChange}
        className="hidden"
      />

      <div
        className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-200 group-hover:scale-110 shadow-sm ${
          isDragging
            ? 'bg-brand-500 text-white shadow-brand-500/30'
            : 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 border border-slate-200 dark:border-slate-700'
        }`}
      >
        <UploadCloud className="w-8 h-8" />
      </div>

      <h3 className="text-base md:text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">
        {title}
      </h3>
      <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mb-5 max-w-sm">
        {subtitle}
      </p>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="sm"
          variant="primary"
          icon={<FileText className="w-4 h-4" />}
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
        >
          {multiple ? 'Choose Files' : 'Select PDF File'}
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {acceptedFileTypes.map((type) => (
          <span
            key={type}
            className="text-[10px] uppercase font-mono font-medium px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
          >
            {type.replace('.', '')}
          </span>
        ))}
      </div>
    </div>
  );
};
