import React, { useRef, useState, useEffect } from 'react';
import { AnnotationItem } from '@/types/pdf';
import { Trash2, Move, Type, CheckSquare, Highlighter, ShieldAlert, Fingerprint } from 'lucide-react';

export interface AnnotationCanvasProps {
  pageWidth: number;
  pageHeight: number;
  pageNumber: number;
  annotations: AnnotationItem[];
  onChange: (annotations: AnnotationItem[]) => void;
  activeTool: 'select' | 'text' | 'signature' | 'highlight' | 'checkbox' | 'redact' | 'thumbmark';
  signatureDataUrl?: string;
  className?: string;
}

export const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
  pageWidth,
  pageHeight,
  pageNumber,
  annotations,
  onChange,
  activeTool,
  signatureDataUrl,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const pageAnnotations = annotations.filter((a) => a.pageNumber === pageNumber);

  // Handle click on canvas to place items based on active tool
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || activeTool === 'select') return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);

    const newId = 'ann-' + Math.random().toString(36).substring(2, 9);
    let newItem: AnnotationItem | null = null;

    if (activeTool === 'text') {
      newItem = {
        id: newId,
        type: 'text',
        x,
        y,
        width: 140,
        height: 28,
        pageNumber,
        text: 'Enter text here',
        fontSize: 14,
        color: '#0f172a',
      };
    } else if (activeTool === 'highlight') {
      newItem = {
        id: newId,
        type: 'highlight',
        x,
        y,
        width: 120,
        height: 20,
        pageNumber,
      };
    } else if (activeTool === 'checkbox') {
      newItem = {
        id: newId,
        type: 'checkbox',
        x,
        y,
        width: 18,
        height: 18,
        pageNumber,
        checked: false,
      };
    } else if (activeTool === 'redact') {
      newItem = {
        id: newId,
        type: 'redaction',
        x,
        y,
        width: 140,
        height: 26,
        pageNumber,
        text: 'CONFIDENTIAL',
      };
    } else if (activeTool === 'signature' && signatureDataUrl) {
      newItem = {
        id: newId,
        type: 'signature',
        x,
        y,
        width: 130,
        height: 55,
        pageNumber,
        imageUrl: signatureDataUrl,
      };
    } else if (activeTool === 'thumbmark') {
      newItem = {
        id: newId,
        type: 'thumbmark',
        x,
        y,
        width: 48,
        height: 64,
        pageNumber,
        imageUrl: createThumbmarkDataUrl(),
        opacity: 0.85,
      };
    }

    if (newItem) {
      onChange([...annotations, newItem]);
      setSelectedId(newId);
    }
  };

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedId(id);
    const item = annotations.find((a) => a.id === id);
    if (!item || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setDraggingId(id);
    setDragOffset({
      x: mouseX - item.x,
      y: mouseY - item.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingId || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newX = Math.max(0, Math.min(pageWidth - 30, Math.round(mouseX - dragOffset.x)));
    const newY = Math.max(0, Math.min(pageHeight - 20, Math.round(mouseY - dragOffset.y)));

    onChange(
      annotations.map((a) => (a.id === draggingId ? { ...a, x: newX, y: newY } : a))
    );
  };

  const handleMouseUp = () => {
    setDraggingId(null);
  };

  const deleteAnnotation = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange(annotations.filter((a) => a.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const updateItemText = (id: string, text: string) => {
    onChange(annotations.map((a) => (a.id === id ? { ...a, text } : a)));
  };

  const toggleCheckbox = (id: string) => {
    onChange(
      annotations.map((a) => (a.id === id ? { ...a, checked: !a.checked } : a))
    );
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={() => setSelectedId(null)}
      onClick={handleCanvasClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{ width: `${pageWidth}px`, height: `${pageHeight}px` }}
      className={`absolute inset-0 select-none overflow-hidden ${
        activeTool !== 'select' ? 'cursor-crosshair' : 'cursor-default'
      } ${className}`}
    >
      {pageAnnotations.map((item) => {
        const isSelected = selectedId === item.id;

        return (
          <div
            key={item.id}
            onMouseDown={(e) => handleMouseDown(e, item.id)}
            style={{
              left: `${item.x}px`,
              top: `${item.y}px`,
              width: `${item.width}px`,
              height: `${item.height}px`,
            }}
            className={`absolute group cursor-move transition-shadow ${
              isSelected
                ? 'ring-2 ring-brand-500 ring-offset-1 z-20'
                : 'hover:ring-1 hover:ring-brand-400/60 z-10'
            }`}
          >
            {/* Delete button when selected */}
            {isSelected && (
              <button
                onClick={(e) => deleteAnnotation(item.id, e)}
                className="absolute -top-3.5 -right-3.5 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md hover:bg-red-700 z-30"
                title="Delete element"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}

            {/* Content per annotation type */}
            {item.type === 'text' && (
              <input
                type="text"
                value={item.text || ''}
                onChange={(e) => updateItemText(item.id, e.target.value)}
                style={{ fontSize: `${item.fontSize || 14}px`, color: item.color || '#000' }}
                className="w-full h-full bg-white/80 border border-slate-300 rounded px-1.5 focus:outline-none focus:bg-white text-xs"
              />
            )}

            {item.type === 'highlight' && (
              <div className="w-full h-full bg-yellow-300/50 border border-yellow-400/60 rounded" />
            )}

            {item.type === 'checkbox' && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCheckbox(item.id);
                }}
                className={`w-full h-full border-2 border-slate-800 rounded bg-white flex items-center justify-center cursor-pointer ${
                  item.checked ? 'text-emerald-600' : 'text-transparent'
                }`}
              >
                ✓
              </div>
            )}

            {item.type === 'redaction' && (
              <div className="w-full h-full bg-black text-white flex items-center justify-center text-[10px] font-mono font-bold tracking-wider rounded select-none">
                {item.text || 'REDACTED'}
              </div>
            )}

            {item.type === 'signature' && item.imageUrl && (
              <img
                src={item.imageUrl}
                alt="Signature"
                className="w-full h-full object-contain pointer-events-none"
              />
            )}

            {item.type === 'thumbmark' && item.imageUrl && (
              <img
                src={item.imageUrl}
                alt="Thumbmark"
                className="w-full h-full object-contain pointer-events-none opacity-85"
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

// Generates procedural realistic SVG fingerprint data URL
function createThumbmarkDataUrl(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" fill="none" stroke="#1e3a8a" stroke-width="2.5" stroke-linecap="round">
    <ellipse cx="50" cy="70" rx="35" ry="50" stroke-width="2" opacity="0.4"/>
    <path d="M50 25 C40 25 35 35 35 50 C35 80 65 80 65 110"/>
    <path d="M50 35 C42 35 38 45 38 60 C38 85 62 85 62 105"/>
    <path d="M50 45 C44 45 42 52 42 70 C42 90 58 90 58 100"/>
    <path d="M50 55 C46 55 45 60 45 75 C45 85 55 85 55 95"/>
    <path d="M30 45 C28 55 28 85 35 105"/>
    <path d="M70 45 C72 55 72 85 65 105"/>
    <path d="M25 65 C24 78 26 95 32 115"/>
    <path d="M75 65 C76 78 74 95 68 115"/>
  </svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
}
