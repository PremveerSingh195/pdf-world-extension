import React, { useState } from 'react';
import { PDFFile } from '@/types/pdf';
import { pdfLibService } from '@/services/pdf/pdfLibService';
import { downloadService, DownloadItem } from '@/services/download/downloadService';
import { FileDropzone } from '@/components/common/FileDropzone';
import { ProcessingProgress } from '@/components/common/ProcessingProgress';
import { DownloadButton } from '@/components/common/DownloadButton';
import { ErrorState } from '@/components/common/StateViews';
import { Button } from '@/components/common/Button';
import { Scissors, Archive, Download } from 'lucide-react';
import { pdfJsService } from '@/services/pdf/pdfJsService';
import { parsePageRanges } from '@/utils/fileUtils';

export const SplitPDFView: React.FC = () => {
  const [file, setFile] = useState<PDFFile | null>(null);
  const [splitMode, setSplitMode] = useState<'ranges' | 'all' | 'custom'>('ranges');
  const [rangeInput, setRangeInput] = useState('1-2, 3-4');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [splitResults, setSplitResults] = useState<Array<{ name: string; blob: Blob; pages: number[] }> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    setError(null);
    const f = files[0];
    try {
      const buffer = await f.arrayBuffer();
      const doc = await pdfJsService.loadDocument(buffer);
      const total = doc.numPages;

      setFile({
        id: 'split-file',
        file: f,
        name: f.name,
        size: f.size,
        pageCount: total,
        buffer,
      });

      // Provide sensible default ranges
      if (total >= 4) {
        setRangeInput(`1-2, 3-${total}`);
      } else if (total > 1) {
        setRangeInput(`1, 2-${total}`);
      } else {
        setRangeInput('1');
      }
    } catch (e: any) {
      setError('Could not load PDF document.');
    }
  };

  const handleSplit = async () => {
    if (!file || !file.buffer) return;
    setError(null);
    setProcessing(true);
    setProgress(0);

    try {
      let pageGroups: number[][] = [];
      const totalPages = file.pageCount || 1;

      if (splitMode === 'all') {
        // Each page into its own PDF
        pageGroups = Array.from({ length: totalPages }, (_, i) => [i + 1]);
      } else {
        // Parse range inputs like "1-3, 4-6"
        const chunks = rangeInput.split(',').map((s) => s.trim()).filter(Boolean);
        for (const chunk of chunks) {
          const parsed = parsePageRanges(chunk, totalPages);
          if (parsed.length > 0) pageGroups.push(parsed);
        }
      }

      if (pageGroups.length === 0) {
        throw new Error('Please enter valid page numbers or ranges to split.');
      }

      const results = await pdfLibService.splitPDF(file.buffer, pageGroups, (pct, msg) => {
        setProgress(pct);
        setStatusText(msg);
      });

      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const formatted = results.map((res, i) => {
        const pageLabel = res.pages.length === 1 ? `page_${res.pages[0]}` : `pages_${res.pages[0]}-${res.pages[res.pages.length - 1]}`;
        const filename = `${baseName}_part_${i + 1}_${pageLabel}.pdf`;
        return {
          name: filename,
          blob: new Blob([res.data as any], { type: 'application/pdf' }),
          pages: res.pages,
        };
      });

      setSplitResults(formatted);
    } catch (err: any) {
      setError(err?.message || 'Error splitting PDF document.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadZip = async () => {
    if (!splitResults || !file) return;
    const items: DownloadItem[] = splitResults.map((r) => ({
      filename: r.name,
      blob: r.blob,
    }));
    await downloadService.downloadZip(items, `${file.name.replace(/\.[^/.]+$/, '')}_split_bundle.zip`);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Scissors className="w-6 h-6 text-brand-600" />
          Split PDF
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Separate PDF pages into individual documents or custom chapter ranges. Download as single files or ZIP.
        </p>
      </div>

      {!file ? (
        <FileDropzone
          onFilesSelected={handleFileSelected}
          title="Drop PDF to split"
          subtitle="or select PDF from your device"
        />
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{file.name}</p>
              <p className="text-[11px] text-slate-500">{file.pageCount} total pages</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setFile(null)}>
              Change Document
            </Button>
          </div>

          {/* Split Mode Options */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Split Configuration
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSplitMode('ranges')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  splitMode === 'ranges'
                    ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20 text-brand-600'
                    : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="text-xs font-bold mb-1">Custom Ranges</div>
                <div className="text-[11px] text-slate-500">e.g. 1-3, 4-6, 7-10</div>
              </button>

              <button
                type="button"
                onClick={() => setSplitMode('all')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  splitMode === 'all'
                    ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20 text-brand-600'
                    : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="text-xs font-bold mb-1">Extract All Pages</div>
                <div className="text-[11px] text-slate-500">Separate every page into 1 PDF</div>
              </button>
            </div>

            {splitMode === 'ranges' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Page Ranges (comma separated)
                </label>
                <input
                  type="text"
                  value={rangeInput}
                  onChange={(e) => setRangeInput(e.target.value)}
                  placeholder="e.g. 1-2, 3-5, 6"
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Each comma creates a separate new PDF document containing those pages.
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                size="lg"
                variant="primary"
                icon={<Scissors className="w-4 h-4" />}
                loading={processing}
                onClick={handleSplit}
              >
                Split Document
              </Button>
            </div>
          </div>
        </div>
      )}

      {processing && <ProcessingProgress progress={progress} statusText={statusText} />}
      {error && <ErrorState message={error} onRetry={handleSplit} />}

      {/* Results View */}
      {splitResults && !processing && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-950/60 shadow-lg space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Split Completed! ({splitResults.length} files created)
              </h3>
              <p className="text-xs text-slate-500">Download individual PDFs or all as a ZIP archive.</p>
            </div>

            <Button
              size="md"
              variant="primary"
              icon={<Archive className="w-4 h-4" />}
              onClick={handleDownloadZip}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Download All (ZIP)
            </Button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto pr-1">
            {splitResults.map((item, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate font-mono">
                    {item.name}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Pages: {item.pages.join(', ')} • {(item.blob.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  icon={<Download className="w-3.5 h-3.5" />}
                  onClick={() => downloadService.downloadBlob(item.blob, item.name)}
                >
                  Download
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
