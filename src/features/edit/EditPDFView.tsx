import React, { useState, useEffect, useRef } from 'react';
import { PDFFile, AnnotationItem } from '@/types/pdf';
import { pdfJsService } from '@/services/pdf/pdfJsService';
import { pdfLibService } from '@/services/pdf/pdfLibService';
import { downloadService } from '@/services/download/downloadService';
import { FileDropzone } from '@/components/common/FileDropzone';
import { ProcessingProgress } from '@/components/common/ProcessingProgress';
import { DownloadButton } from '@/components/common/DownloadButton';
import { ErrorState } from '@/components/common/StateViews';
import { Button } from '@/components/common/Button';
import { AnnotationCanvas } from '@/components/editor/AnnotationCanvas';
import { SignaturePadModal } from '@/components/editor/SignaturePadModal';
import {
  PenTool,
  Type,
  FileSignature,
  Highlighter,
  CheckSquare,
  Calendar,
  Save,
  ChevronLeft,
  ChevronRight,
  Fingerprint,
  EyeOff,
  Move,
  Loader2,
} from 'lucide-react';

export const EditPDFView: React.FC = () => {
  const [file, setFile] = useState<PDFFile | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [activeTool, setActiveTool] = useState<
    'select' | 'text' | 'signature' | 'highlight' | 'checkbox' | 'redact' | 'thumbmark'
  >('select');

  const [annotations, setAnnotations] = useState<AnnotationItem[]>([]);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | undefined>(undefined);
  const [isSigModalOpen, setIsSigModalOpen] = useState(false);

  const [pageDims, setPageDims] = useState<{ width: number; height: number }>({ width: 595, height: 842 });
  const [canvasLoading, setCanvasLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    setError(null);
    const f = files[0];
    const buffer = await f.arrayBuffer();
    setFile({ id: 'edit-f', file: f, name: f.name, size: f.size, buffer });

    try {
      const doc = await pdfJsService.loadDocument(buffer);
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
      setCurrentPage(1);
    } catch {
      setError('Could not load PDF in editor.');
    }
  };

  // Render current page background on canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    setCanvasLoading(true);

    pdfDoc.getPage(currentPage).then((page: any) => {
      const viewport = page.getViewport({ scale: 1.0 });
      setPageDims({ width: viewport.width, height: viewport.height });

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      page.render({ canvasContext: ctx, viewport }).promise.then(() => {
        setCanvasLoading(false);
      });
    });
  }, [pdfDoc, currentPage]);

  const handleSaveDocument = async () => {
    if (!file?.buffer) return;
    setProcessing(true);
    setProgress(50);
    setStatusText('Applying annotations and baking elements into PDF...');

    try {
      const res = await pdfLibService.editPDFWithAnnotations(file.buffer, annotations);
      setProgress(100);
      setOutputBytes(res);
    } catch (e: any) {
      setError(e?.message || 'Error saving edited PDF.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <PenTool className="w-6 h-6 text-brand-600" />
            Edit PDF & Add Signature
          </h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Add text, signatures, images, checkboxes, dates, and highlights directly onto any page.
          </p>
        </div>

        {file && !outputBytes && (
          <Button
            size="md"
            variant="primary"
            icon={<Save className="w-4 h-4" />}
            loading={processing}
            onClick={handleSaveDocument}
          >
            Save PDF
          </Button>
        )}
      </div>

      {!file ? (
        <FileDropzone onFilesSelected={handleFileSelected} title="Drop PDF to edit & annotate" />
      ) : (
        <div className="space-y-4">
          {/* Editor Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            {/* Tool selectors */}
            <div className="flex items-center gap-1 flex-wrap">
              {[
                { id: 'select', label: 'Select / Move', icon: Move },
                { id: 'text', label: 'Add Text', icon: Type },
                { id: 'signature', label: 'Signature', icon: FileSignature },
                { id: 'highlight', label: 'Highlight', icon: Highlighter },
                { id: 'checkbox', label: 'Checkbox', icon: CheckSquare },
                { id: 'redact', label: 'Redact Area', icon: EyeOff },
                { id: 'thumbmark', label: 'Thumbprint', icon: Fingerprint },
              ].map((tool) => {
                const isSelected = activeTool === tool.id;
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.id}
                    onClick={() => {
                      if (tool.id === 'signature' && !signatureDataUrl) {
                        setIsSigModalOpen(true);
                      }
                      setActiveTool(tool.id as any);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      isSelected
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tool.label}
                  </button>
                );
              })}
            </div>

            {/* Page navigation */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg px-2 py-1 text-xs">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="p-1 rounded text-slate-500 hover:text-slate-900 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono text-slate-700 dark:text-slate-300">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="p-1 rounded text-slate-500 hover:text-slate-900 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Interactive Page Canvas Viewport */}
          <div className="relative overflow-auto p-8 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex justify-center min-h-[600px] bg-grid-pattern">
            {canvasLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-slate-950/70 z-30">
                <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
              </div>
            )}

            <div
              className="relative shadow-2xl rounded-sm bg-white"
              style={{ width: `${pageDims.width}px`, height: `${pageDims.height}px` }}
            >
              <canvas ref={canvasRef} className="block" />
              <AnnotationCanvas
                pageWidth={pageDims.width}
                pageHeight={pageDims.height}
                pageNumber={currentPage}
                annotations={annotations}
                onChange={setAnnotations}
                activeTool={activeTool}
                signatureDataUrl={signatureDataUrl}
              />
            </div>
          </div>
        </div>
      )}

      {/* Signature Modal */}
      <SignaturePadModal
        isOpen={isSigModalOpen}
        onClose={() => setIsSigModalOpen(false)}
        onSave={(dataUrl) => {
          setSignatureDataUrl(dataUrl);
          setActiveTool('signature');
        }}
      />

      {processing && <ProcessingProgress progress={progress} statusText={statusText} />}
      {error && <ErrorState message={error} />}

      {outputBytes && !processing && (
        <DownloadButton
          filename={`Edited_${file?.name || 'Document.pdf'}`}
          fileSize={outputBytes.byteLength}
          onDownload={() => {
            const blob = new Blob([outputBytes as any], { type: 'application/pdf' });
            downloadService.downloadBlob(blob, `Edited_${file?.name || 'Document.pdf'}`);
          }}
          onReset={() => setOutputBytes(null)}
        />
      )}
    </div>
  );
};

export const SignPDFView: React.FC = () => {
  return <EditPDFView />;
};
