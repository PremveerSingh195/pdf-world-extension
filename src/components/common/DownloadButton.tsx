import React from 'react';
import { Download, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Button } from './Button';
import { formatBytes } from '@/utils/fileUtils';

export interface DownloadButtonProps {
  onDownload: () => void;
  onReset: () => void;
  filename?: string;
  fileSize?: number;
  stats?: {
    originalSize?: number;
    newSize?: number;
    reductionPercent?: number;
    pageCount?: number;
  };
}

export const DownloadButton: React.FC<DownloadButtonProps> = ({
  onDownload,
  onReset,
  filename = 'Processed_Document.pdf',
  fileSize,
  stats,
}) => {
  return (
    <div className="w-full p-6 md:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-950/60 shadow-lg text-center animate-fade-in">
      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
        <CheckCircle2 className="w-8 h-8" />
      </div>

      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
        Ready for Download!
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-sm mx-auto truncate font-mono">
        {filename} {fileSize ? `(${formatBytes(fileSize)})` : ''}
      </p>

      {stats && (stats.reductionPercent !== undefined || stats.newSize !== undefined) && (
        <div className="mb-6 grid grid-cols-2 md:grid-cols-3 gap-3 max-w-md mx-auto">
          {stats.originalSize !== undefined && (
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="block text-[10px] uppercase font-semibold text-slate-400">Original</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {formatBytes(stats.originalSize)}
              </span>
            </div>
          )}
          {stats.newSize !== undefined && (
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="block text-[10px] uppercase font-semibold text-slate-400">New Size</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {formatBytes(stats.newSize)}
              </span>
            </div>
          )}
          {stats.reductionPercent !== undefined && (
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
              <span className="block text-[10px] uppercase font-semibold text-emerald-600">Saved</span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                -{stats.reductionPercent}%
              </span>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          size="lg"
          variant="primary"
          icon={<Download className="w-5 h-5" />}
          onClick={onDownload}
          className="bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500 shadow-emerald-500/25"
        >
          Download File
        </Button>
        <Button
          size="lg"
          variant="outline"
          icon={<RefreshCw className="w-4 h-4" />}
          onClick={onReset}
        >
          Process Another
        </Button>
      </div>
    </div>
  );
};
