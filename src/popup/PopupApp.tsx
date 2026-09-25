import React, { useEffect, useState } from 'react';
import { useChromeStorage } from '@/hooks/useChromeStorage';
import { PDF_TOOLS } from '@/services/tools/pdfTools';
import { PDFTool } from '@/types/tools';
import {
  FileText,
  ExternalLink,
  Combine,
  Minimize2,
  Scissors,
  LayoutGrid,
  PenTool,
  Clock,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

export const PopupApp: React.FC = () => {
  const { storage } = useChromeStorage();

  const openApp = (toolId?: string) => {
    const targetUrl =
      typeof chrome !== 'undefined' && chrome.runtime?.getURL
        ? chrome.runtime.getURL('app.html') + (toolId ? `#/${toolId}` : '')
        : '/app.html' + (toolId ? `#/${toolId}` : '');

    if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
      chrome.tabs.create({ url: targetUrl });
    } else {
      window.open(targetUrl, '_blank');
    }
  };

  const recentTools: PDFTool[] = (storage?.recentTools || ['merge', 'compress', 'split'])
    .map((id) => PDF_TOOLS.find((t) => t.id === id))
    .filter(Boolean)
    .slice(0, 5) as PDFTool[];

  return (
    <div className="w-[360px] p-4 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col gap-4 font-sans select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-md shadow-brand-500/20">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">
              PDF Toolbox
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">All-in-One Local Workspace</p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
          <ShieldCheck className="w-3 h-3" />
          Offline
        </span>
      </div>

      {/* Primary Action Button */}
      <button
        onClick={() => openApp()}
        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-rose-600 hover:from-brand-700 hover:to-rose-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 transition-all active:scale-[0.98]"
      >
        <span>Open PDF Toolbox Workspace</span>
        <ExternalLink className="w-3.5 h-3.5" />
      </button>

      {/* Quick Launch Icons */}
      <div>
        <span className="block text-[10px] uppercase font-bold text-slate-400 mb-2">
          Quick Launch
        </span>
        <div className="grid grid-cols-4 gap-2">
          {[
            { id: 'merge', label: 'Merge', icon: Combine },
            { id: 'compress', label: 'Compress', icon: Minimize2 },
            { id: 'split', label: 'Split', icon: Scissors },
            { id: 'edit', label: 'Edit', icon: PenTool },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => openApp(item.id)}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500 hover:bg-brand-50/50 dark:hover:bg-brand-950/20 transition-all flex flex-col items-center justify-center gap-1.5 group"
              >
                <Icon className="w-4 h-4 text-brand-600 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Tools */}
      <div>
        <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-400 mb-2">
          <Clock className="w-3 h-3" />
          <span>Recently Used</span>
        </div>
        <div className="space-y-1">
          {recentTools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => openApp(tool.id)}
              className="w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
            >
              <span className="truncate">{tool.name}</span>
              <span className="text-[10px] text-brand-600 font-semibold font-mono">Launch →</span>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center text-[10px] text-slate-400">
        Private local document processing • Chrome MV3
      </div>
    </div>
  );
};
