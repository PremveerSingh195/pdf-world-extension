import React from 'react';
import { PDF_TOOLS, CATEGORIES } from '@/services/tools/pdfTools';
import { PDFTool, ToolCategory } from '@/types/tools';
import { useChromeStorage } from '@/hooks/useChromeStorage';
import { FileDropzone } from '@/components/common/FileDropzone';
import {
  Sparkles,
  Star,
  Clock,
  ArrowRight,
  Combine,
  Scissors,
  Minimize2,
  LayoutGrid,
  PenTool,
  FileSignature,
  Workflow,
  Search,
} from 'lucide-react';

export interface DashboardViewProps {
  onSelectTool: (toolId: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onSelectTool,
  searchQuery,
  onSearchChange,
}) => {
  const { storage, toggleFavorite } = useChromeStorage();

  const handleDropFile = (files: File[]) => {
    if (files.length > 0) {
      // Default to Organize or Merge if multiple
      if (files.length > 1) {
        onSelectTool('merge');
      } else {
        onSelectTool('organize');
      }
    }
  };

  const recentToolItems: PDFTool[] = (storage?.recentTools || [])
    .map((id) => PDF_TOOLS.find((t) => t.id === id))
    .filter(Boolean) as PDFTool[];

  const favoriteToolItems: PDFTool[] = (storage?.favorites || [])
    .map((id) => PDF_TOOLS.find((t) => t.id === id))
    .filter(Boolean) as PDFTool[];

  const filteredTools = searchQuery.trim()
    ? PDF_TOOLS.filter(
        (t) =>
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-12">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-rose-900 p-8 md:p-12 text-white shadow-2xl shadow-brand-500/20">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide uppercase mb-4 text-brand-100 border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-brand-200" />
            100% Client-Side Private Workspace
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Every PDF Tool You Need. In One Place.
          </h1>
          <p className="mt-3 text-sm md:text-base text-brand-100/90 leading-relaxed">
            Merge, split, compress, edit, annotate, convert, sign, and build automated workflows
            directly in your browser with lightning speed and complete privacy.
          </p>
        </div>

        {/* Quick Popular Actions */}
        <div className="relative z-10 mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { id: 'merge', label: 'Merge PDF', icon: Combine },
            { id: 'compress', label: 'Compress', icon: Minimize2 },
            { id: 'split', label: 'Split PDF', icon: Scissors },
            { id: 'organize', label: 'Organize', icon: LayoutGrid },
            { id: 'edit', label: 'Edit PDF', icon: PenTool },
            { id: 'sign', label: 'Sign PDF', icon: FileSignature },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTool(item.id)}
                className="flex items-center gap-2 p-3 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white transition-all text-xs font-semibold group shadow-sm active:scale-95"
              >
                <Icon className="w-4 h-4 text-brand-200 group-hover:scale-110 transition-transform" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Background decorative circles */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-white/5 blur-3xl pointer-events-none" />
      </div>

      {/* Prominent Dropzone */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <FileDropzone
          multiple
          onFilesSelected={handleDropFile}
          title="Drop any PDF files here"
          subtitle="Drag & drop documents to quickly launch workspace tools"
        />
      </div>

      {/* Search results if query active */}
      {searchQuery.trim() && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Search className="w-4 h-4 text-brand-600" />
              Search Results for "{searchQuery}" ({filteredTools.length})
            </h3>
            <button
              onClick={() => onSearchChange('')}
              className="text-xs text-brand-600 hover:underline"
            >
              Clear search
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredTools.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                isFavorite={storage?.favorites.includes(tool.id) || false}
                onSelect={() => onSelectTool(tool.id)}
                onToggleFavorite={() => toggleFavorite(tool.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Favorites Section */}
      {favoriteToolItems.length > 0 && !searchQuery.trim() && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              Favorite Tools
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {favoriteToolItems.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                isFavorite={true}
                onSelect={() => onSelectTool(tool.id)}
                onToggleFavorite={() => toggleFavorite(tool.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recent Tools Section */}
      {recentToolItems.length > 0 && !searchQuery.trim() && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-brand-600" />
              Recently Used
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {recentToolItems.slice(0, 6).map((tool) => (
              <button
                key={tool.id}
                onClick={() => onSelectTool(tool.id)}
                className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-brand-500 dark:hover:border-brand-500 hover:shadow-md transition-all text-left flex flex-col justify-between group h-28"
              >
                <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold">
                  {tool.category}
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-brand-600 transition-colors line-clamp-2">
                    {tool.name}
                  </h4>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Categories & Full Tool Grid */}
      {!searchQuery.trim() && (
        <div className="space-y-8 pt-4">
          {CATEGORIES.map((cat) => {
            const categoryTools = PDF_TOOLS.filter((t) => t.category === cat.id);

            return (
              <div key={cat.id} className="space-y-4">
                <div className="border-b border-slate-200 dark:border-slate-800 pb-2 flex items-baseline justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                      {cat.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{cat.description}</p>
                  </div>
                  <span className="text-xs font-mono font-medium text-slate-400">
                    {categoryTools.length} {categoryTools.length === 1 ? 'tool' : 'tools'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {categoryTools.map((tool) => (
                    <ToolCard
                      key={tool.id}
                      tool={tool}
                      isFavorite={storage?.favorites.includes(tool.id) || false}
                      onSelect={() => onSelectTool(tool.id)}
                      onToggleFavorite={() => toggleFavorite(tool.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface ToolCardProps {
  tool: PDFTool;
  isFavorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
}

const ToolCard: React.FC<ToolCardProps> = ({
  tool,
  isFavorite,
  onSelect,
  onToggleFavorite,
}) => {
  return (
    <div
      onClick={onSelect}
      className="group relative p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-brand-500/80 dark:hover:border-brand-500/80 hover:shadow-lg hover:shadow-brand-500/5 transition-all duration-200 cursor-pointer flex flex-col justify-between"
    >
      <div>
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-brand-50 dark:group-hover:bg-brand-950/40 transition-transform">
            <Combine className="w-5 h-5" />
          </div>

          <div className="flex items-center gap-1.5">
            {tool.badge && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-900">
                {tool.badge}
              </span>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              className="p-1 rounded text-slate-300 hover:text-amber-500 transition-colors"
              title="Favorite"
            >
              <Star
                className={`w-4 h-4 ${
                  isFavorite ? 'text-amber-500 fill-amber-500' : 'text-slate-300 dark:text-slate-600'
                }`}
              />
            </button>
          </div>
        </div>

        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-brand-600 transition-colors">
          {tool.name}
        </h4>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
          {tool.description}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold text-brand-600 dark:text-brand-400 opacity-80 group-hover:opacity-100">
        <span>Open tool</span>
        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );
};
