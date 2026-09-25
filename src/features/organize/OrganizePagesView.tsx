import React, { useState } from 'react';
import { PageItem, PageGrid } from '@/components/organizer/PageGrid';
import { pdfLibService } from '@/services/pdf/pdfLibService';
import { pdfJsService } from '@/services/pdf/pdfJsService';
import { downloadService } from '@/services/download/downloadService';
import { FileDropzone } from '@/components/common/FileDropzone';
import { ProcessingProgress } from '@/components/common/ProcessingProgress';
import { DownloadButton } from '@/components/common/DownloadButton';
import { ErrorState } from '@/components/common/StateViews';
import { Button } from '@/components/common/Button';
import { LayoutGrid, Download, Loader2 } from 'lucide-react';

export const OrganizePagesView: React.FC = () => {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceBuffer, setSourceBuffer] = useState<ArrayBuffer | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loadingThumbnails, setLoadingThumbnails] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    setError(null);
    const f = files[0];
    setSourceFile(f);
    setLoadingThumbnails(true);

    try {
      const buffer = await f.arrayBuffer();
      setSourceBuffer(buffer);

      const doc = await pdfJsService.loadDocument(buffer);
      const total = doc.numPages;

      const pageItems: PageItem[] = [];
      for (let i = 1; i <= total; i++) {
        const thumbUrl = await pdfJsService.renderPageToDataUrl(doc, i, 0.3);
        pageItems.push({
          id: 'page-' + i,
          originalIndex: i - 1,
          pageNumber: i,
          rotation: 0,
          thumbnailUrl: thumbUrl,
        });
      }
      setPages(pageItems);
    } catch (e: any) {
      setError('Failed to render PDF page thumbnails.');
    } finally {
      setLoadingThumbnails(false);
    }
  };

  const handleSaveOrganized = async () => {
    if (!sourceBuffer || pages.length === 0) return;
    setError(null);
    setProcessing(true);
    setProgress(0);

    try {
      setStatusText('Reorganizing PDF pages...');
      setProgress(50);

      const configs = pages.map((p) => ({
        originalIndex: p.originalIndex,
        rotation: p.rotation,
      }));

      const result = await pdfLibService.organizePages(sourceBuffer, configs);
      setProgress(100);
      setOutputBytes(result);
    } catch (err: any) {
      setError(err?.message || 'Failed to save organized PDF.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <LayoutGrid className="w-6 h-6 text-brand-600" />
            Organize Pages
          </h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Drag to reorder, delete, duplicate, or rotate individual pages in real-time.
          </p>
        </div>

        {pages.length > 0 && !outputBytes && (
          <Button
            size="md"
            variant="primary"
            icon={<Download className="w-4 h-4" />}
            loading={processing}
            onClick={handleSaveOrganized}
          >
            Save & Export PDF
          </Button>
        )}
      </div>

      {!sourceFile ? (
        <FileDropzone
          onFilesSelected={handleFileSelected}
          title="Drop PDF here to organize pages"
          subtitle="or browse PDF from your device"
        />
      ) : loadingThumbnails ? (
        <div className="flex flex-col items-center justify-center p-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-3" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Rendering page thumbnails...
          </p>
          <p className="text-xs text-slate-400 mt-1">Please wait a moment</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Document: <strong>{sourceFile.name}</strong> ({pages.length} pages)
            </span>
            <button
              onClick={() => {
                setSourceFile(null);
                setPages([]);
                setOutputBytes(null);
              }}
              className="text-brand-600 hover:underline"
            >
              Choose another file
            </button>
          </div>

          <PageGrid pages={pages} onChange={setPages} />
        </div>
      )}

      {processing && <ProcessingProgress progress={progress} statusText={statusText} />}
      {error && <ErrorState message={error} onRetry={handleSaveOrganized} />}

      {outputBytes && !processing && (
        <DownloadButton
          filename={`Organized_${sourceFile?.name || 'Document.pdf'}`}
          fileSize={outputBytes.byteLength}
          onDownload={() => {
            const blob = new Blob([outputBytes as any], { type: 'application/pdf' });
            downloadService.downloadBlob(blob, `Organized_${sourceFile?.name || 'Document.pdf'}`);
          }}
          onReset={() => {
            setOutputBytes(null);
            setProgress(0);
          }}
        />
      )}
    </div>
  );
};
