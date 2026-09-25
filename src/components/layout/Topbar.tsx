import React from 'react';
import { Search, Sun, Moon, Laptop, Settings, FileText, ChevronRight } from 'lucide-react';
import { ThemeMode } from '@/types/storage';
import { PDFTool } from '@/types/tools';

export interface TopbarProps {
  currentTool: PDFTool | null;
  onHomeClick: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  theme: ThemeMode;
  onThemeChange: (t: ThemeMode) => void;
  onOpenSettings: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  currentTool,
  onHomeClick,
  searchQuery,
  onSearchChange,
  theme,
  onThemeChange,
  onOpenSettings,
}) => {
  const nextTheme: Record<ThemeMode, ThemeMode> = {
    light: 'dark',
    dark: 'system',
    system: 'light',
  };

  const themeIcons = {
    light: <Sun className="w-4 h-4 text-amber-500" />,
    dark: <Moon className="w-4 h-4 text-indigo-400" />,
    system: <Laptop className="w-4 h-4 text-slate-400" />,
  };

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 md:px-6 flex items-center justify-between shrink-0 z-30 select-none">
      {/* Left: Logo & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onHomeClick}
          className="flex items-center gap-2.5 group text-left focus:outline-none"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-rose-500 text-white flex items-center justify-center shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">
                PDF Toolbox
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand-100 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400">
                PRO
              </span>
            </div>
          </div>
        </button>

        {currentTool && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 ml-2 pl-3 border-l border-slate-200 dark:border-slate-800">
            <button
              onClick={onHomeClick}
              className="hover:text-slate-700 dark:hover:text-slate-200"
            >
              Workspace
            </button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {currentTool.name}
            </span>
          </div>
        )}
      </div>

      {/* Center: Search Box */}
      <div className="max-w-md w-full mx-4 hidden md:block">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search PDF tools (e.g. merge, compress, sign, ocr)..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 pl-9 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Right: Theme Toggle & Settings */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onThemeChange(nextTheme[theme])}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={`Theme: ${theme}. Click to change`}
        >
          {themeIcons[theme]}
        </button>

        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300"
          title="Settings & Preferences"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
