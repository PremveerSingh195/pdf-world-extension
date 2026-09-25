import React, { useState } from 'react';
import { PDF_TOOLS, CATEGORIES } from '@/services/tools/pdfTools';
import { ToolCategory } from '@/types/tools';
import {
  Home,
  Workflow,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  Star,
  Settings,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';

export interface SidebarProps {
  currentToolId: string | null;
  onSelectTool: (id: string | null) => void;
  favorites: string[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentToolId,
  onSelectTool,
  favorites,
}) => {
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({
    workflow: false,
    organize: false,
    edit: false,
    handwriting: true,
    create: true,
    convert: true,
    security: true,
  });

  const toggleCategory = (catId: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-full shrink-0 select-none">
      {/* Home / Dashboard link */}
      <div className="p-3 border-b border-slate-100 dark:border-slate-800/80">
        <button
          onClick={() => onSelectTool(null)}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
            currentToolId === null
              ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/20'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Home className="w-4 h-4" />
          Dashboard & All Tools
        </button>
      </div>

      {/* Tool Categories List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {CATEGORIES.map((cat) => {
          const isCollapsed = collapsedCategories[cat.id];
          const tools = PDF_TOOLS.filter((t) => t.category === cat.id);

          return (
            <div key={cat.id} className="space-y-1">
              <button
                onClick={() => toggleCategory(cat.id)}
                className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                <span>{cat.name}</span>
                {isCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {!isCollapsed && (
                <div className="space-y-0.5 pl-1">
                  {tools.map((tool) => {
                    const isActive = currentToolId === tool.id;
                    const isFav = favorites.includes(tool.id);

                    return (
                      <button
                        key={tool.id}
                        onClick={() => onSelectTool(tool.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left group ${
                          isActive
                            ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 font-semibold'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        <span className="truncate">{tool.shortName || tool.name}</span>
                        {isFav && (
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0 opacity-80" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          Client-side local
        </span>
        <span className="font-mono">v1.0.0</span>
      </div>
    </aside>
  );
};
