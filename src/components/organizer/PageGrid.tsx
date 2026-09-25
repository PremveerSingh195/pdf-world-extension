import React, { useState } from 'react';
import {
  RotateCw,
  Trash2,
  Copy,
  CheckSquare,
  Square,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/common/Button';

export interface PageItem {
  id: string;
  originalIndex: number; // 0-indexed
  pageNumber: number; // Display number
  rotation: number; // In degrees: 0, 90, 180, 270
  thumbnailUrl?: string;
}

export interface PageGridProps {
  pages: PageItem[];
  onChange: (updatedPages: PageItem[]) => void;
}

export const PageGrid: React.FC<PageGridProps> = ({ pages, onChange }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === pages.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pages.map((p) => p.id));
    }
  };

  const rotatePage = (id: string, degreesToAdd = 90) => {
    onChange(
      pages.map((p) =>
        p.id === id ? { ...p, rotation: (p.rotation + degreesToAdd) % 360 } : p
      )
    );
  };

  const rotateSelected = (degreesToAdd = 90) => {
    if (selectedIds.length === 0) return;
    const set = new Set(selectedIds);
    onChange(
      pages.map((p) =>
        set.has(p.id) ? { ...p, rotation: (p.rotation + degreesToAdd) % 360 } : p
      )
    );
  };

  const deletePage = (id: string) => {
    if (pages.length <= 1) return;
    onChange(pages.filter((p) => p.id !== id));
    setSelectedIds((prev) => prev.filter((i) => i !== id));
  };

  const deleteSelected = () => {
    if (selectedIds.length === 0 || selectedIds.length >= pages.length) return;
    const set = new Set(selectedIds);
    onChange(pages.filter((p) => !set.has(p.id)));
    setSelectedIds([]);
  };

  const duplicatePage = (id: string) => {
    const idx = pages.findIndex((p) => p.id === id);
    if (idx === -1) return;
    const target = pages[idx];
    const copy: PageItem = {
      ...target,
      id: 'page-' + Math.random().toString(36).substring(2, 9),
    };
    const newPages = [...pages];
    newPages.splice(idx + 1, 0, copy);
    onChange(newPages);
  };

  const duplicateSelected = () => {
    if (selectedIds.length === 0) return;
    const set = new Set(selectedIds);
    const newPages: PageItem[] = [];
    for (const p of pages) {
      newPages.push(p);
      if (set.has(p.id)) {
        newPages.push({
          ...p,
          id: 'page-' + Math.random().toString(36).substring(2, 9),
        });
      }
    }
    onChange(newPages);
  };

  const movePage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= pages.length) return;
    const updated = [...pages];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            icon={
              selectedIds.length === pages.length && pages.length > 0 ? (
                <CheckSquare className="w-3.5 h-3.5 text-brand-600" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )
            }
            onClick={selectAll}
          >
            {selectedIds.length === pages.length ? 'Deselect All' : 'Select All'}
          </Button>

          <span className="text-xs text-slate-500 font-medium ml-1">
            {selectedIds.length} of {pages.length} selected
          </span>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-1.5 animate-fade-in">
            <Button
              size="sm"
              variant="outline"
              icon={<RotateCw className="w-3.5 h-3.5" />}
              onClick={() => rotateSelected(90)}
            >
              Rotate (90°)
            </Button>
            <Button
              size="sm"
              variant="outline"
              icon={<Copy className="w-3.5 h-3.5" />}
              onClick={duplicateSelected}
            >
              Duplicate
            </Button>
            <Button
              size="sm"
              variant="danger"
              icon={<Trash2 className="w-3.5 h-3.5" />}
              onClick={deleteSelected}
              disabled={selectedIds.length >= pages.length}
            >
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Pages Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {pages.map((page, idx) => {
          const isSelected = selectedIds.includes(page.id);

          return (
            <div
              key={page.id}
              draggable
              onDragStart={() => setDraggedIndex(idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (draggedIndex !== null && draggedIndex !== idx) {
                  movePage(draggedIndex, idx);
                  setDraggedIndex(null);
                }
              }}
              className={`group relative rounded-xl border bg-white dark:bg-slate-900 p-2 shadow-sm transition-all duration-150 cursor-grab active:cursor-grabbing ${
                isSelected
                  ? 'border-brand-500 ring-2 ring-brand-500/20 shadow-md'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Select Checkbox badge */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelect(page.id);
                }}
                className={`absolute top-3 left-3 z-10 w-5 h-5 rounded flex items-center justify-center transition-colors shadow-sm ${
                  isSelected
                    ? 'bg-brand-600 text-white'
                    : 'bg-white/80 dark:bg-slate-900/80 text-slate-400 group-hover:text-slate-700 border border-slate-300 dark:border-slate-600'
                }`}
              >
                {isSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
              </button>

              {/* Page Thumbnail Image */}
              <div className="aspect-[1/1.4] bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden flex items-center justify-center relative mb-2">
                {page.thumbnailUrl ? (
                  <img
                    src={page.thumbnailUrl}
                    alt={`Page ${idx + 1}`}
                    style={{ transform: `rotate(${page.rotation}deg)` }}
                    className="w-full h-full object-contain transition-transform duration-200"
                  />
                ) : (
                  <div className="text-xs text-slate-400 font-mono">Page {idx + 1}</div>
                )}

                {/* Hover action overlay */}
                <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 backdrop-blur-[1px]">
                  <button
                    type="button"
                    onClick={() => rotatePage(page.id, 90)}
                    className="p-1.5 rounded-lg bg-white/90 text-slate-800 hover:bg-white shadow"
                    title="Rotate 90°"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => duplicatePage(page.id)}
                    className="p-1.5 rounded-lg bg-white/90 text-slate-800 hover:bg-white shadow"
                    title="Duplicate Page"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={pages.length <= 1}
                    onClick={() => deletePage(page.id)}
                    className="p-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 shadow disabled:opacity-40"
                    title="Delete Page"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Page Number & Movement arrows */}
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-400">
                  #{idx + 1}
                </span>

                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => movePage(idx, idx - 1)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-20"
                    title="Move left"
                  >
                    <ArrowLeft className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === pages.length - 1}
                    onClick={() => movePage(idx, idx + 1)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-20"
                    title="Move right"
                  >
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
