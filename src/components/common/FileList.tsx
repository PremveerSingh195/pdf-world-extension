import React from 'react';
import { FileText, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { PDFFile } from '@/types/pdf';
import { formatBytes } from '@/utils/fileUtils';

export interface FileListProps {
  files: PDFFile[];
  onRemove: (id: string) => void;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
}

export const FileList: React.FC<FileListProps> = ({
  files,
  onRemove,
  onMoveUp,
  onMoveDown,
}) => {
  if (files.length === 0) return null;

  return (
    <div className="space-y-2 w-full">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 px-1">
        <span>Files ({files.length})</span>
        {onMoveUp && <span>Reorder & Manage</span>}
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {files.map((file, idx) => (
          <div
            key={file.id}
            className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-700"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
              <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {file.name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-slate-400">
                    {formatBytes(file.size)}
                  </span>
                  {file.pageCount !== undefined && (
                    <>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {file.pageCount} {file.pageCount === 1 ? 'page' : 'pages'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {onMoveUp && onMoveDown && files.length > 1 && (
                <>
                  <button
                    disabled={idx === 0}
                    onClick={() => onMoveUp(idx)}
                    className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30 disabled:hover:text-slate-400"
                    title="Move up"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    disabled={idx === files.length - 1}
                    onClick={() => onMoveDown(idx)}
                    className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30 disabled:hover:text-slate-400"
                    title="Move down"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </>
              )}

              <button
                onClick={() => onRemove(file.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors ml-1"
                title="Remove file"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
