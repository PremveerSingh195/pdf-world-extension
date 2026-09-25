import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCw,
  LayoutTemplate,
  Loader2,
  Check,
} from 'lucide-react';
import { pdfJsService } from '@/services/pdf/pdfJsService';

export interface PDFViewerProps {
  buffer: ArrayBuffer | null;
  selectedPages?: number[];
  onPageToggle?: (pageNum: number) => void;
  selectable?: boolean;
  className?: string;
  invertColors?: boolean;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  buffer,
  selectedPages = [],
  onPageToggle,
  selectable = false,
  className = '',
  invertColors = false,
}) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load PDF Document when buffer changes
  useEffect(() => {
    let isCancelled = false;
    if (!buffer) {
      setPdfDoc(null);
      setTotalPages(0);
      setThumbnails([]);
      return;
    }

    setLoading(true);
    pdfJsService
      .loadDocument(buffer)
      .then(async (doc) => {
        if (isCancelled) return;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setCurrentPage(1);
        setLoading(false);

        // Generate thumbnails asynchronously
        const thumbList: string[] = [];
        for (let i = 1; i <= Math.min(doc.numPages, 40); i++) {
          if (isCancelled) break;
          const url = await pdfJsService.renderPageToDataUrl(doc, i, 0.25, invertColors);
          thumbList.push(url);
        }
        if (!isCancelled) setThumbnails(thumbList);
      })
      .catch((err) => {
        console.error('Error loading PDF viewer document:', err);
        setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [buffer, invertColors]);

  // Render current page onto main canvas
  const renderCurrentPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || currentPage < 1 || currentPage > totalPages) return;

    try {
      const page = await pdfDoc.getPage(currentPage);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      const viewport = page.getViewport({ scale, rotation });
      const pixelRatio = window.devicePixelRatio || 1;

      canvas.width = viewport.width * pixelRatio;
      canvas.height = viewport.height * pixelRatio;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const renderContext = {
        canvasContext: context,
        viewport,
      };

      await page.render(renderContext).promise;

      if (invertColors) {
        const imgData = context.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          data[i] = 255 - data[i];
          data[i + 1] = 255 - data[i + 1];
          data[i + 2] = 255 - data[i + 2];
        }
        context.putImageData(imgData, 0, 0);
      }
    } catch (e) {
      console.warn('Page render error:', e);
    }
  }, [pdfDoc, currentPage, scale, rotation, invertColors, totalPages]);

  useEffect(() => {
    renderCurrentPage();
  }, [renderCurrentPage]);

  // Zoom handlers
  const handleZoomIn = () => setScale((prev) => Math.min(2.5, Math.round((prev + 0.15) * 100) / 100));
  const handleZoomOut = () => setScale((prev) => Math.max(0.4, Math.round((prev - 0.15) * 100) / 100));
  const handleFitWidth = () => {
    if (!containerRef.current || !canvasRef.current) return;
    const containerW = containerRef.current.clientWidth - (showThumbnails ? 200 : 40);
    setScale(Math.max(0.5, Math.min(2.0, (containerW - 60) / 595)));
  };
  const handleFitPage = () => setScale(0.85);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => console.warn(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((err) => console.warn(err));
      setIsFullscreen(false);
    }
  };

  if (!buffer) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-[600px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-900 text-white overflow-hidden shadow-xl ${className}`}
    >
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800/80 backdrop-blur-md gap-2 shrink-0">
        {/* Left: Thumbnail toggle & Page navigator */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowThumbnails((prev) => !prev)}
            className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
              showThumbnails
                ? 'bg-brand-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title="Toggle Page Thumbnails"
          >
            <LayoutTemplate className="w-4 h-4" />
            <span className="hidden sm:inline">Thumbnails</span>
          </button>

          <div className="flex items-center gap-1 bg-slate-900 rounded-lg px-2 py-1 border border-slate-800 text-xs">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-slate-200 px-1">
              {currentPage} / {totalPages || 1}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center: Zoom Controls */}
        <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-1 border border-slate-800 text-xs">
          <button
            onClick={handleZoomOut}
            className="p-1 rounded text-slate-400 hover:text-white"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="font-mono px-2 text-slate-300 min-w-[50px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1 rounded text-slate-400 hover:text-white"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="h-3 w-px bg-slate-800 mx-1" />
          <button
            onClick={handleFitWidth}
            className="px-2 py-0.5 rounded text-[11px] text-slate-400 hover:text-white"
            title="Fit Width"
          >
            Fit Width
          </button>
          <button
            onClick={handleFitPage}
            className="px-2 py-0.5 rounded text-[11px] text-slate-400 hover:text-white"
            title="Fit Page"
          >
            Fit Page
          </button>
        </div>

        {/* Right: Rotate & Fullscreen */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            title="Rotate View Clockwise"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Thumbnails Sidebar */}
        {showThumbnails && (
          <div className="w-44 border-r border-slate-800 bg-slate-950/60 overflow-y-auto p-3 flex flex-col gap-3 shrink-0">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
              const isSelected = selectedPages.includes(pageNum);
              const isCurrent = currentPage === pageNum;
              const thumbUrl = thumbnails[pageNum - 1];

              return (
                <div
                  key={pageNum}
                  onClick={() => {
                    setCurrentPage(pageNum);
                    if (selectable && onPageToggle) {
                      onPageToggle(pageNum);
                    }
                  }}
                  className={`group relative p-2 rounded-xl cursor-pointer border transition-all ${
                    isCurrent
                      ? 'border-brand-500 bg-brand-500/10'
                      : 'border-slate-800 bg-slate-900 hover:border-slate-700'
                  }`}
                >
                  <div className="aspect-[1/1.4] bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden relative">
                    {thumbUrl ? (
                      <img
                        src={thumbUrl}
                        alt={`Page ${pageNum}`}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
                    )}

                    {selectable && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onPageToggle) onPageToggle(pageNum);
                        }}
                        className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-brand-500 text-white'
                            : 'bg-black/60 text-transparent group-hover:text-white/60 border border-white/20'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                  <div className="mt-1.5 text-center text-[11px] font-mono text-slate-400">
                    Page {pageNum}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Center Canvas Viewport */}
        <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-slate-900/80 bg-grid-pattern">
          {loading ? (
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
              <span className="text-xs">Loading PDF document...</span>
            </div>
          ) : (
            <div className="shadow-2xl rounded-sm overflow-hidden bg-white">
              <canvas ref={canvasRef} className="block transition-all" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
