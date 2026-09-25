import React, { useState } from 'react';
import { PDFFile } from '@/types/pdf';
import { pdfLibService } from '@/services/pdf/pdfLibService';
import { downloadService } from '@/services/download/downloadService';
import { FileDropzone } from '@/components/common/FileDropzone';
import { FileList } from '@/components/common/FileList';
import { ProcessingProgress } from '@/components/common/ProcessingProgress';
import { DownloadButton } from '@/components/common/DownloadButton';
import { ErrorState } from '@/components/common/StateViews';
import { Button } from '@/components/common/Button';
import { Combine } from 'lucide-react';
import { pdfJsService } from '@/services/pdf/pdfJsService';

export const MergePDFView: React.FC = () => {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [mergedBytes, setMergedBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFilesSelected = async (newFiles: File[]) => {
    setError(null);
    const added: PDFFile[] = [];

    for (const f of newFiles) {
      try {
        const buffer = await f.arrayBuffer();
        let pageCount = 1;
        try {
          const doc = await pdfJsService.loadDocument(buffer);
          pageCount = doc.numPages;
        } catch {
          // fallback
        }

        added.push({
          id: Math.random().toString(36).substring(2, 9),
          file: f,
          name: f.name,
          size: f.size,
          pageCount,
          buffer,
        });
      } catch (e: any) {
        setError(`Failed reading ${f.name}`);
      }
    }

    setFiles((prev) => [...prev, ...added]);
  };

  const handleRemove = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const copy = [...files];
    const [moved] = copy.splice(index, 1);
    copy.splice(index - 1, 0, moved);
    setFiles(copy);
  };

  const handleMoveDown = (index: number) => {
    if (index === files.length - 1) return;
    const copy = [...files];
    const [moved] = copy.splice(index, 1);
    copy.splice(index + 1, 0, moved);
    setFiles(copy);
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      setError('Please add at least 2 PDF files to merge.');
      return;
    }
    setError(null);
    setProcessing(true);
    setProgress(0);

    try {
      const buffers = files.map((f) => f.buffer!);
      const result = await pdfLibService.mergePDFs(buffers, (pct, msg) => {
        setProgress(pct);
        setStatusText(msg);
      });
      setMergedBytes(result);
    } catch (err: any) {
      setError(err?.message || 'Error merging PDF documents.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Combine className="w-6 h-6 text-brand-600" />
          Merge PDFs
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Combine multiple PDF files into a single, perfectly unified document. Reorder as needed.
        </p>
      </div>

      <FileDropzone
        multiple
        onFilesSelected={handleFilesSelected}
        title="Drop PDF files here to merge"
        subtitle="or select multiple PDFs from your device"
      />

      <FileList
        files={files}
        onRemove={handleRemove}
        onMoveUp={handleMoveUp}
        onMoveDown={handleMoveDown}
      />

      {files.length > 0 && !mergedBytes && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-500">
            Total pages to merge: {files.reduce((acc, f) => acc + (f.pageCount || 0), 0)} pages
          </span>
          <Button
            size="lg"
            variant="primary"
            icon={<Combine className="w-5 h-5" />}
            loading={processing}
            disabled={files.length < 2}
            onClick={handleMerge}
          >
            Merge {files.length} PDFs
          </Button>
        </div>
      )}

      {processing && <ProcessingProgress progress={progress} statusText={statusText} />}
      {error && <ErrorState message={error} onRetry={handleMerge} />}

      {mergedBytes && !processing && (
        <DownloadButton
          filename="Merged_Document.pdf"
          fileSize={mergedBytes.byteLength}
          onDownload={() => {
            const blob = new Blob([mergedBytes as any], { type: 'application/pdf' });
            downloadService.downloadBlob(blob, 'Merged_Document.pdf');
          }}
          onReset={() => {
            setMergedBytes(null);
            setProgress(0);
          }}
        />
      )}
    </div>
  );
};
