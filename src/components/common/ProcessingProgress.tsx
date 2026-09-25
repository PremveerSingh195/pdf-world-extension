import React from 'react';

export interface ProcessingProgressProps {
  progress: number;
  statusText: string;
}

export const ProcessingProgress: React.FC<ProcessingProgressProps> = ({
  progress,
  statusText,
}) => {
  return (
    <div className="w-full p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {statusText || 'Processing PDF...'}
        </span>
        <span className="text-xs font-mono font-bold text-brand-600 dark:text-brand-400">
          {Math.round(progress)}%
        </span>
      </div>

      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
        <div
          className="bg-brand-600 h-2.5 rounded-full transition-all duration-300 ease-out shadow-sm"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>

      <div className="mt-3 flex items-center justify-center gap-1.5 text-slate-400 text-[11px]">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-500 animate-ping" />
        <span>Client-side local processing running</span>
      </div>
    </div>
  );
};
