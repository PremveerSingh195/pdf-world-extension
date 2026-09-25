import React, { useRef, useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { PenTool, Type, Upload, Eraser, Check } from 'lucide-react';

export interface SignaturePadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
}

export const SignaturePadModal: React.FC<SignaturePadModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [tab, setTab] = useState<'draw' | 'type' | 'upload'>('draw');
  const [typedName, setTypedName] = useState<string>('');
  const [fontStyle, setFontStyle] = useState<string>('cursive');
  const [inkColor, setInkColor] = useState<string>('#1e3a8a'); // Classic blue ink

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (isOpen && tab === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.strokeStyle = inkColor;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, [isOpen, tab, inkColor]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onSave(reader.result);
        onClose();
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (tab === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dataUrl = canvas.toDataURL('image/png');
      onSave(dataUrl);
      onClose();
    } else if (tab === 'type') {
      if (!typedName.trim()) return;
      // Render typed text to temporary canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 400;
      tempCanvas.height = 160;
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = inkColor;
        ctx.font = fontStyle === 'cursive' ? 'italic 38px cursive, Georgia' : '36px "Segoe Script", Brush Script MT, cursive';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(typedName, 200, 80);
      }
      onSave(tempCanvas.toDataURL('image/png'));
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Signature"
      description="Draw, type, or upload your personal signature to stamp onto documents."
      maxWidth="lg"
    >
      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-4">
        <button
          onClick={() => setTab('draw')}
          className={`flex items-center gap-2 py-2 px-4 text-xs font-semibold border-b-2 transition-colors ${
            tab === 'draw'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <PenTool className="w-3.5 h-3.5" />
          Draw
        </button>
        <button
          onClick={() => setTab('type')}
          className={`flex items-center gap-2 py-2 px-4 text-xs font-semibold border-b-2 transition-colors ${
            tab === 'type'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          Type
        </button>
        <button
          onClick={() => setTab('upload')}
          className={`flex items-center gap-2 py-2 px-4 text-xs font-semibold border-b-2 transition-colors ${
            tab === 'upload'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          Upload
        </button>
      </div>

      {/* Ink color selector */}
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-xs text-slate-500 font-medium">Ink Color:</span>
        <div className="flex items-center gap-2">
          {[
            { label: 'Blue', color: '#1e3a8a' },
            { label: 'Black', color: '#09090b' },
            { label: 'Red', color: '#dc2626' },
          ].map((c) => (
            <button
              key={c.color}
              type="button"
              onClick={() => setInkColor(c.color)}
              className={`w-6 h-6 rounded-full border-2 transition-transform ${
                inkColor === c.color ? 'scale-110 border-white ring-2 ring-brand-500' : 'border-transparent'
              }`}
              style={{ backgroundColor: c.color }}
              title={c.label}
            />
          ))}
        </div>
      </div>

      {/* Draw View */}
      {tab === 'draw' && (
        <div className="space-y-3">
          <div className="border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-950 relative">
            <canvas
              ref={canvasRef}
              width={480}
              height={180}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              className="w-full h-44 cursor-crosshair block touch-none"
            />
            {!hasDrawn && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs">
                Sign with your mouse, trackpad, or stylus here
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button size="sm" variant="ghost" icon={<Eraser className="w-3.5 h-3.5" />} onClick={clearCanvas}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Type View */}
      {tab === 'type' && (
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Type your name"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100"
          />

          <div className="p-6 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-center min-h-[120px] flex items-center justify-center">
            {typedName ? (
              <span
                style={{
                  color: inkColor,
                  fontFamily: fontStyle === 'cursive' ? 'cursive, Georgia' : '"Segoe Script", cursive',
                  fontSize: '32px',
                }}
              >
                {typedName}
              </span>
            ) : (
              <span className="text-xs text-slate-400">Signature preview will appear here</span>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFontStyle('cursive')}
              className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-semibold transition-colors ${
                fontStyle === 'cursive'
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-600'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              Cursive Script
            </button>
            <button
              onClick={() => setFontStyle('script')}
              className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-semibold transition-colors ${
                fontStyle === 'script'
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-600'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              Classic Calligraphy
            </button>
          </div>
        </div>
      )}

      {/* Upload View */}
      {tab === 'upload' && (
        <div className="p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-center bg-slate-50 dark:bg-slate-950">
          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
            Upload transparent PNG or JPG image of your signature
          </p>
          <label className="inline-flex">
            <span className="px-4 py-2 rounded-lg bg-brand-600 text-white text-xs font-medium cursor-pointer hover:bg-brand-700">
              Browse Image
            </span>
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      )}

      {/* Bottom actions */}
      <div className="mt-6 flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
        <Button variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        {tab !== 'upload' && (
          <Button
            variant="primary"
            size="sm"
            icon={<Check className="w-4 h-4" />}
            onClick={handleSave}
            disabled={tab === 'draw' ? !hasDrawn : !typedName.trim()}
          >
            Apply Signature
          </Button>
        )}
      </div>
    </Modal>
  );
};
