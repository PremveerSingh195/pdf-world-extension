import React, { useState } from 'react';
import { PDFFile } from '@/types/pdf';
import { pdfLibService } from '@/services/pdf/pdfLibService';
import { pdfJsService, BookmarkItem } from '@/services/pdf/pdfJsService';
import { downloadService, DownloadItem } from '@/services/download/downloadService';
import { FileDropzone } from '@/components/common/FileDropzone';
import { FileList } from '@/components/common/FileList';
import { ProcessingProgress } from '@/components/common/ProcessingProgress';
import { DownloadButton } from '@/components/common/DownloadButton';
import { ErrorState } from '@/components/common/StateViews';
import { Button } from '@/components/common/Button';
import { parsePageRanges } from '@/utils/fileUtils';
import {
  Shuffle,
  FileSearch,
  Bookmark,
  Columns,
  HardDrive,
  RotateCw,
  FlipHorizontal,
  Grid,
  Crop,
  Archive,
} from 'lucide-react';

/* =========================================================================
   1. ALTERNATE & MIX PDF
   ========================================================================= */
export const AlternateMixView: React.FC = () => {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [reverseDoc2, setReverseDoc2] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFilesSelected = async (newFiles: File[]) => {
    const added: PDFFile[] = [];
    for (const f of newFiles) {
      const buffer = await f.arrayBuffer();
      added.push({
        id: Math.random().toString(36).substring(2, 9),
        file: f,
        name: f.name,
        size: f.size,
        buffer,
      });
    }
    setFiles((prev) => [...prev, ...added]);
  };

  const handleMix = async () => {
    if (files.length < 2) {
      setError('Please add at least 2 PDF documents to interleave.');
      return;
    }
    setError(null);
    setProcessing(true);
    setProgress(0);

    try {
      const buffers = files.map((f) => f.buffer!);
      const result = await pdfLibService.alternateMixPDFs(
        buffers,
        'alternate',
        reverseDoc2,
        (pct, msg) => {
          setProgress(pct);
          setStatusText(msg);
        }
      );
      setOutputBytes(result);
    } catch (e: any) {
      setError(e?.message || 'Failed to mix PDF documents.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Shuffle className="w-6 h-6 text-brand-600" />
          Alternate & Mix PDF
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Combine two or more PDFs by alternating their pages (A1, B1, A2, B2, A3, B3...).
        </p>
      </div>

      <FileDropzone
        multiple
        onFilesSelected={handleFilesSelected}
        title="Drop 2 or more PDFs to mix"
        subtitle="e.g. front pages and back pages scans"
      />

      <FileList
        files={files}
        onRemove={(id) => setFiles(files.filter((f) => f.id !== id))}
        onMoveUp={(idx) => {
          if (idx === 0) return;
          const copy = [...files];
          const [m] = copy.splice(idx, 1);
          copy.splice(idx - 1, 0, m);
          setFiles(copy);
        }}
        onMoveDown={(idx) => {
          if (idx === files.length - 1) return;
          const copy = [...files];
          const [m] = copy.splice(idx, 1);
          copy.splice(idx + 1, 0, m);
          setFiles(copy);
        }}
      />

      {files.length >= 2 && !outputBytes && (
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={reverseDoc2}
              onChange={(e) => setReverseDoc2(e.target.checked)}
              className="rounded text-brand-600 focus:ring-brand-500"
            />
            Reverse order of 2nd document (useful for duplex scanner feeds)
          </label>

          <Button size="md" variant="primary" loading={processing} onClick={handleMix}>
            Mix Pages
          </Button>
        </div>
      )}

      {processing && <ProcessingProgress progress={progress} statusText={statusText} />}
      {error && <ErrorState message={error} onRetry={handleMix} />}
      {outputBytes && !processing && (
        <DownloadButton
          filename="Mixed_Document.pdf"
          fileSize={outputBytes.byteLength}
          onDownload={() => {
            const blob = new Blob([outputBytes as any], { type: 'application/pdf' });
            downloadService.downloadBlob(blob, 'Mixed_Document.pdf');
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

/* =========================================================================
   2. SPLIT PDF BY TEXT
   ========================================================================= */
export const SplitByTextView: React.FC = () => {
  const [file, setFile] = useState<PDFFile | null>(null);
  const [query, setQuery] = useState('Invoice');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [exactMatch, setExactMatch] = useState(false);
  const [matchingPages, setMatchingPages] = useState<number[] | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [results, setResults] = useState<DownloadItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buffer = await f.arrayBuffer();
    setFile({ id: 'sbt', file: f, name: f.name, size: f.size, buffer });
    setMatchingPages(null);
    setResults(null);
  };

  const handleScanMatches = async () => {
    if (!file?.buffer || !query.trim()) return;
    setError(null);
    setProcessing(true);
    setProgress(30);
    setStatusText('Scanning document pages for text occurrences...');

    try {
      const doc = await pdfJsService.loadDocument(file.buffer);
      const matches = await pdfJsService.findPagesContainingText(
        doc,
        query,
        caseSensitive,
        exactMatch
      );
      setMatchingPages(matches);
      setProgress(100);
      if (matches.length === 0) {
        setError(`No pages contained the text "${query}". Try adjusting keywords or case sensitivity.`);
      }
    } catch (e: any) {
      setError(e?.message || 'Error searching document text.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSplitByMatches = async () => {
    if (!file?.buffer || !matchingPages || matchingPages.length === 0) return;
    setProcessing(true);
    setProgress(0);

    try {
      const doc = await pdfJsService.loadDocument(file.buffer);
      const totalPages = doc.numPages;

      // Group ranges around matching pages
      const ranges: number[][] = [];
      if (matchingPages[0] > 1) {
        const prePages: number[] = [];
        for (let p = 1; p < matchingPages[0]; p++) prePages.push(p);
        ranges.push(prePages);
      }
      for (let i = 0; i < matchingPages.length; i++) {
        const start = matchingPages[i];
        const nextMatch = matchingPages[i + 1];
        const end = nextMatch ? nextMatch - 1 : totalPages;
        const pageList: number[] = [];
        for (let p = start; p <= end; p++) pageList.push(p);
        if (pageList.length > 0) ranges.push(pageList);
      }

      const splitData = await pdfLibService.splitPDF(file.buffer, ranges, (pct, msg) => {
        setProgress(pct);
        setStatusText(msg);
      });

      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const downloadItems: DownloadItem[] = splitData.map((d, i) => ({
        filename: `${baseName}_part_${i + 1}_pages_${d.pages[0]}-${d.pages[d.pages.length - 1]}.pdf`,
        blob: new Blob([d.data as any], { type: 'application/pdf' }),
      }));
      setResults(downloadItems);
    } catch (e: any) {
      setError(e?.message || 'Error splitting by text matches.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <FileSearch className="w-6 h-6 text-brand-600" />
          Split PDF by Text
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Detect text keywords or invoice numbers and automatically split the document where they appear.
        </p>
      </div>

      {!file ? (
        <FileDropzone onFilesSelected={handleFileSelected} title="Drop PDF to split by text" />
      ) : (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100 dark:border-slate-800">
            <span>File: <strong>{file.name}</strong></span>
            <button onClick={() => setFile(null)} className="text-brand-600 hover:underline">Change</button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Split Trigger Text / Keyword
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Invoice Number, Statement, Chapter"
                className="flex-1 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
              />
              <Button size="md" variant="primary" onClick={handleScanMatches} loading={processing}>
                Find Matching Pages
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-1">
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={caseSensitive}
                onChange={(e) => setCaseSensitive(e.target.checked)}
                className="rounded text-brand-600"
              />
              Case sensitive
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={exactMatch}
                onChange={(e) => setExactMatch(e.target.checked)}
                className="rounded text-brand-600"
              />
              Exact phrase match
            </label>
          </div>

          {matchingPages !== null && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Found {matchingPages.length} matching {matchingPages.length === 1 ? 'page' : 'pages'}:
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {matchingPages.map((p) => (
                  <span key={p} className="px-2 py-0.5 rounded bg-brand-100 dark:bg-brand-950/60 text-brand-600 text-xs font-mono">
                    Page {p}
                  </span>
                ))}
              </div>
              {matchingPages.length > 0 && (
                <div className="mt-4 flex justify-end">
                  <Button size="md" variant="primary" onClick={handleSplitByMatches} loading={processing}>
                    Split into {matchingPages.length} Files
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {processing && <ProcessingProgress progress={progress} statusText={statusText} />}
      {error && <ErrorState message={error} />}

      {results && !processing && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-950/60 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Split Complete ({results.length} files)
            </h3>
            <Button
              size="md"
              variant="primary"
              icon={<Archive className="w-4 h-4" />}
              onClick={() => downloadService.downloadZip(results, `${file?.name || 'document'}_split_text.zip`)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Download All as ZIP
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   3. SPLIT PDF BY BOOKMARKS
   ========================================================================= */
export const SplitByBookmarksView: React.FC = () => {
  const [file, setFile] = useState<PDFFile | null>(null);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [results, setResults] = useState<DownloadItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    setError(null);
    const f = files[0];
    const buffer = await f.arrayBuffer();
    setFile({ id: 'sbb', file: f, name: f.name, size: f.size, buffer });

    try {
      const doc = await pdfJsService.loadDocument(buffer);
      const outline = await pdfJsService.extractOutline(doc);
      setBookmarks(outline);
      if (outline.length === 0) {
        setError('This document does not contain outline bookmarks or chapter metadata.');
      }
    } catch {
      setError('Could not read bookmarks from PDF.');
    }
  };

  const handleSplitBookmarks = async () => {
    if (!file?.buffer || bookmarks.length === 0) return;
    setProcessing(true);
    setProgress(0);

    try {
      const doc = await pdfJsService.loadDocument(file.buffer);
      const totalPages = doc.numPages;

      // Sort and group bookmarks with distinct start pages
      const sortedBookmarks = [...bookmarks]
        .filter((b) => b.pageNumber >= 1 && b.pageNumber <= totalPages)
        .sort((a, b) => a.pageNumber - b.pageNumber);

      const uniqueBookmarks: { title: string; startPage: number }[] = [];
      for (const bm of sortedBookmarks) {
        const last = uniqueBookmarks[uniqueBookmarks.length - 1];
        if (!last || last.startPage !== bm.pageNumber) {
          uniqueBookmarks.push({ title: bm.title, startPage: bm.pageNumber });
        }
      }

      if (uniqueBookmarks.length > 0 && uniqueBookmarks[0].startPage > 1) {
        uniqueBookmarks.unshift({ title: 'Frontmatter', startPage: 1 });
      }

      const ranges: number[][] = [];
      const partTitles: string[] = [];

      for (let i = 0; i < uniqueBookmarks.length; i++) {
        const start = uniqueBookmarks[i].startPage;
        const end = i + 1 < uniqueBookmarks.length ? uniqueBookmarks[i + 1].startPage - 1 : totalPages;
        if (end >= start) {
          const list: number[] = [];
          for (let p = start; p <= end; p++) list.push(p);
          ranges.push(list);
          partTitles.push(uniqueBookmarks[i].title);
        }
      }

      const splitData = await pdfLibService.splitPDF(file.buffer, ranges, (pct, msg) => {
        setProgress(pct);
        setStatusText(msg);
      });

      const downloadItems: DownloadItem[] = splitData.map((d, i) => {
        const titleSafe = (partTitles[i] || `Chapter_${i + 1}`).replace(/[^a-zA-Z0-9_-]/g, '_');
        return {
          filename: `${titleSafe}.pdf`,
          blob: new Blob([d.data as any], { type: 'application/pdf' }),
        };
      });
      setResults(downloadItems);
    } catch (e: any) {
      setError(e?.message || 'Failed to split by bookmarks.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Bookmark className="w-6 h-6 text-brand-600" />
          Split PDF by Bookmarks
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Detect document chapters from PDF bookmarks and generate separate PDFs for each chapter.
        </p>
      </div>

      {!file ? (
        <FileDropzone onFilesSelected={handleFileSelected} title="Drop PDF with bookmarks here" />
      ) : (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100 dark:border-slate-800">
            <span>Document: <strong>{file.name}</strong></span>
            <button onClick={() => setFile(null)} className="text-brand-600 hover:underline">Change</button>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Detected Bookmarks ({bookmarks.length}):
            </h4>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {bookmarks.map((bm, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs">
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate">{bm.title}</span>
                  <span className="text-slate-400 font-mono">Page {bm.pageNumber}</span>
                </div>
              ))}
            </div>
          </div>

          {bookmarks.length > 0 && (
            <div className="flex justify-end pt-2">
              <Button size="md" variant="primary" onClick={handleSplitBookmarks} loading={processing}>
                Split into {bookmarks.length} Chapters
              </Button>
            </div>
          )}
        </div>
      )}

      {processing && <ProcessingProgress progress={progress} statusText={statusText} />}
      {error && <ErrorState message={error} />}

      {results && !processing && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-950/60 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Bookmarks Extracted ({results.length} files)
            </h3>
            <p className="text-xs text-slate-500">All chapter PDFs ready for download.</p>
          </div>
          <Button
            size="md"
            variant="primary"
            icon={<Archive className="w-4 h-4" />}
            onClick={() => downloadService.downloadZip(results, `${file?.name || 'document'}_chapters.zip`)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Download ZIP
          </Button>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   4. SPLIT PDF IN HALF
   ========================================================================= */
export const SplitInHalfView: React.FC = () => {
  const [file, setFile] = useState<PDFFile | null>(null);
  const [direction, setDirection] = useState<'vertical' | 'horizontal'>('vertical');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [results, setResults] = useState<{ part1: Uint8Array; part2: Uint8Array } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buffer = await f.arrayBuffer();
    setFile({ id: 'sih', file: f, name: f.name, size: f.size, buffer });
    setResults(null);
  };

  const handleSplit = async () => {
    if (!file?.buffer) return;
    setProcessing(true);
    setProgress(50);
    setStatusText('Splitting dual-page scans in half...');

    try {
      const parts = await pdfLibService.splitPDFInHalf(file.buffer, direction);
      setProgress(100);
      setResults(parts);
    } catch (e: any) {
      setError(e?.message || 'Failed to split pages in half.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Columns className="w-6 h-6 text-brand-600" />
          Split PDF in Half
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Cut double-page book or magazine scans into two separate individual pages.
        </p>
      </div>

      {!file ? (
        <FileDropzone onFilesSelected={handleFileSelected} title="Drop double-page PDF here" />
      ) : (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDirection('vertical')}
              className={`p-4 rounded-xl border text-center transition-all ${
                direction === 'vertical'
                  ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20 text-brand-600 font-bold'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600'
              }`}
            >
              <div className="text-xs">Vertical Cut (Left & Right)</div>
              <div className="text-[11px] font-normal text-slate-400 mt-0.5">Dual-page book scans</div>
            </button>
            <button
              type="button"
              onClick={() => setDirection('horizontal')}
              className={`p-4 rounded-xl border text-center transition-all ${
                direction === 'horizontal'
                  ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20 text-brand-600 font-bold'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600'
              }`}
            >
              <div className="text-xs">Horizontal Cut (Top & Bottom)</div>
              <div className="text-[11px] font-normal text-slate-400 mt-0.5">Calendar or landscape cuts</div>
            </button>
          </div>

          <div className="flex justify-end pt-2">
            <Button size="md" variant="primary" onClick={handleSplit} loading={processing}>
              Split Pages in Half
            </Button>
          </div>
        </div>
      )}

      {processing && <ProcessingProgress progress={progress} statusText={statusText} />}
      {error && <ErrorState message={error} />}

      {results && !processing && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-950/60 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Split in Half Succeeded
            </h3>
            <p className="text-xs text-slate-500">2 halves generated.</p>
          </div>
          <Button
            size="md"
            variant="primary"
            icon={<Archive className="w-4 h-4" />}
            onClick={() =>
              downloadService.downloadZip(
                [
                  { filename: 'Half_1.pdf', blob: new Blob([results.part1 as any], { type: 'application/pdf' }) },
                  { filename: 'Half_2.pdf', blob: new Blob([results.part2 as any], { type: 'application/pdf' }) },
                ],
                'split_halves.zip'
              )
            }
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Download Halves (ZIP)
          </Button>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   5. SPLIT PDF BY SIZE
   ========================================================================= */
export const SplitBySizeView: React.FC = () => {
  const [file, setFile] = useState<PDFFile | null>(null);
  const [maxSizeMB, setMaxSizeMB] = useState('5');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [results, setResults] = useState<Array<{ name: string; data: Uint8Array }> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buffer = await f.arrayBuffer();
    setFile({ id: 'sbs', file: f, name: f.name, size: f.size, buffer });
    setResults(null);
  };

  const handleSplitBySize = async () => {
    if (!file?.buffer) return;
    const mb = parseFloat(maxSizeMB);
    if (isNaN(mb) || mb <= 0) {
      setError('Please enter a valid positive size in MB.');
      return;
    }
    const maxBytes = mb * 1024 * 1024;
    setProcessing(true);
    setProgress(0);

    try {
      const parts = await pdfLibService.splitPDFBySize(file.buffer, maxBytes, (pct, msg) => {
        setProgress(pct);
        setStatusText(msg);
      });
      setResults(parts);
    } catch (e: any) {
      setError(e?.message || 'Error splitting by size.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <HardDrive className="w-6 h-6 text-brand-600" />
          Split PDF by Size
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Automatically partition large documents into smaller files under a target MB limit.
        </p>
      </div>

      {!file ? (
        <FileDropzone onFilesSelected={handleFileSelected} title="Drop PDF to split by size" />
      ) : (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Maximum Size Per Output File (MB)
            </label>
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={maxSizeMB}
              onChange={(e) => setMaxSizeMB(e.target.value)}
              className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button size="md" variant="primary" onClick={handleSplitBySize} loading={processing}>
              Split Document
            </Button>
          </div>
        </div>
      )}

      {processing && <ProcessingProgress progress={progress} statusText={statusText} />}
      {error && <ErrorState message={error} />}

      {results && !processing && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-950/60 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Split into {results.length} files
            </h3>
            <p className="text-xs text-slate-500">Each under ~{maxSizeMB} MB.</p>
          </div>
          <Button
            size="md"
            variant="primary"
            icon={<Archive className="w-4 h-4" />}
            onClick={() =>
              downloadService.downloadZip(
                results.map((r) => ({
                  filename: r.name,
                  blob: new Blob([r.data as any], { type: 'application/pdf' }),
                })),
                'split_by_size.zip'
              )
            }
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Download ZIP
          </Button>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   6. ROTATE PDF
   ========================================================================= */
export const RotatePDFView: React.FC = () => {
  const [file, setFile] = useState<PDFFile | null>(null);
  const [degrees, setDegrees] = useState<number>(90);
  const [pageScope, setPageScope] = useState<'all' | 'custom'>('all');
  const [pageRange, setPageRange] = useState('');
  const [processing, setProcessing] = useState(false);
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buffer = await f.arrayBuffer();
    setFile({ id: 'rot', file: f, name: f.name, size: f.size, buffer });
    setOutputBytes(null);
  };

  const handleRotate = async () => {
    if (!file?.buffer) return;
    setProcessing(true);

    try {
      const targetPages = pageScope === 'custom' && pageRange ? parsePageRanges(pageRange) : undefined;
      const res = await pdfLibService.rotatePDF(file.buffer, degrees, targetPages);
      setOutputBytes(res);
    } catch (e: any) {
      setError(e?.message || 'Failed to rotate PDF.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <RotateCw className="w-6 h-6 text-brand-600" />
          Rotate PDF
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Rotate all or specific PDF pages clockwise by 90°, 180°, or 270°.
        </p>
      </div>

      {!file ? (
        <FileDropzone onFilesSelected={handleFileSelected} title="Drop PDF to rotate" />
      ) : (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[90, 180, 270].map((deg) => (
              <button
                key={deg}
                type="button"
                onClick={() => setDegrees(deg)}
                className={`p-3 rounded-xl border text-center transition-all ${
                  degrees === deg
                    ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20 text-brand-600 font-bold'
                    : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {deg}°
              </button>
            ))}
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
              <input
                type="radio"
                name="rot-scope"
                checked={pageScope === 'all'}
                onChange={() => setPageScope('all')}
                className="text-brand-600"
              />
              All pages
            </label>
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
              <input
                type="radio"
                name="rot-scope"
                checked={pageScope === 'custom'}
                onChange={() => setPageScope('custom')}
                className="text-brand-600"
              />
              Selected pages
            </label>
          </div>

          {pageScope === 'custom' && (
            <input
              type="text"
              placeholder="e.g. 1-3, 5"
              value={pageRange}
              onChange={(e) => setPageRange(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
            />
          )}

          <div className="flex justify-end pt-2">
            <Button size="md" variant="primary" onClick={handleRotate} loading={processing}>
              Rotate Pages
            </Button>
          </div>
        </div>
      )}

      {error && <ErrorState message={error} />}
      {outputBytes && !processing && (
        <DownloadButton
          filename={`Rotated_${file?.name || 'Document.pdf'}`}
          fileSize={outputBytes.byteLength}
          onDownload={() => {
            const blob = new Blob([outputBytes as any], { type: 'application/pdf' });
            downloadService.downloadBlob(blob, `Rotated_${file?.name || 'Document.pdf'}`);
          }}
          onReset={() => setOutputBytes(null)}
        />
      )}
    </div>
  );
};

/* =========================================================================
   7. FLIP PDF
   ========================================================================= */
export const FlipPDFView: React.FC = () => {
  const [file, setFile] = useState<PDFFile | null>(null);
  const [direction, setDirection] = useState<'horizontal' | 'vertical'>('horizontal');
  const [processing, setProcessing] = useState(false);
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buffer = await f.arrayBuffer();
    setFile({ id: 'flip', file: f, name: f.name, size: f.size, buffer });
    setOutputBytes(null);
  };

  const handleFlip = async () => {
    if (!file?.buffer) return;
    setProcessing(true);
    try {
      const res = await pdfLibService.flipPDF(file.buffer, direction);
      setOutputBytes(res);
    } catch (e: any) {
      setError(e?.message || 'Failed to flip PDF.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <FlipHorizontal className="w-6 h-6 text-brand-600" />
          Flip PDF
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Mirror PDF pages horizontally or vertically.
        </p>
      </div>

      {!file ? (
        <FileDropzone onFilesSelected={handleFileSelected} title="Drop PDF to mirror / flip" />
      ) : (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDirection('horizontal')}
              className={`p-4 rounded-xl border text-center transition-all ${
                direction === 'horizontal'
                  ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20 text-brand-600 font-bold'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600'
              }`}
            >
              Horizontal Mirror
            </button>
            <button
              type="button"
              onClick={() => setDirection('vertical')}
              className={`p-4 rounded-xl border text-center transition-all ${
                direction === 'vertical'
                  ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20 text-brand-600 font-bold'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600'
              }`}
            >
              Vertical Flip
            </button>
          </div>

          <div className="flex justify-end pt-2">
            <Button size="md" variant="primary" onClick={handleFlip} loading={processing}>
              Flip PDF
            </Button>
          </div>
        </div>
      )}

      {error && <ErrorState message={error} />}
      {outputBytes && !processing && (
        <DownloadButton
          filename={`Flipped_${file?.name || 'Document.pdf'}`}
          fileSize={outputBytes.byteLength}
          onDownload={() => {
            const blob = new Blob([outputBytes as any], { type: 'application/pdf' });
            downloadService.downloadBlob(blob, `Flipped_${file?.name || 'Document.pdf'}`);
          }}
          onReset={() => setOutputBytes(null)}
        />
      )}
    </div>
  );
};

/* =========================================================================
   8. MULTIPLE PAGES PER SHEET (N-UP)
   ========================================================================= */
export const NUpPDFView: React.FC = () => {
  const [file, setFile] = useState<PDFFile | null>(null);
  const [pagesPerSheet, setPagesPerSheet] = useState<2 | 4 | 6 | 8>(2);
  const [landscape, setLandscape] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buffer = await f.arrayBuffer();
    setFile({ id: 'nup', file: f, name: f.name, size: f.size, buffer });
    setOutputBytes(null);
  };

  const handleNUp = async () => {
    if (!file?.buffer) return;
    setProcessing(true);
    try {
      const res = await pdfLibService.nUpPDF(file.buffer, pagesPerSheet, landscape);
      setOutputBytes(res);
    } catch (e: any) {
      setError(e?.message || 'Failed to generate N-up layout.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Grid className="w-6 h-6 text-brand-600" />
          Multiple Pages Per Sheet (N-Up)
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Print layout: place 2, 4, 6, or 8 pages per sheet with border grid.
        </p>
      </div>

      {!file ? (
        <FileDropzone onFilesSelected={handleFileSelected} title="Drop PDF for N-up printing" />
      ) : (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {[2, 4, 6, 8].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPagesPerSheet(n as any)}
                className={`p-3 rounded-xl border text-center transition-all ${
                  pagesPerSheet === n
                    ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20 text-brand-600 font-bold'
                    : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {n} Up
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={landscape}
              onChange={(e) => setLandscape(e.target.checked)}
              className="rounded text-brand-600"
            />
            Landscape orientation (recommended)
          </label>

          <div className="flex justify-end pt-2">
            <Button size="md" variant="primary" onClick={handleNUp} loading={processing}>
              Create {pagesPerSheet}-Up PDF
            </Button>
          </div>
        </div>
      )}

      {error && <ErrorState message={error} />}
      {outputBytes && !processing && (
        <DownloadButton
          filename={`NUp_${pagesPerSheet}_${file?.name || 'Document.pdf'}`}
          fileSize={outputBytes.byteLength}
          onDownload={() => {
            const blob = new Blob([outputBytes as any], { type: 'application/pdf' });
            downloadService.downloadBlob(blob, `NUp_${pagesPerSheet}_${file?.name || 'Document.pdf'}`);
          }}
          onReset={() => setOutputBytes(null)}
        />
      )}
    </div>
  );
};

/* =========================================================================
   9. CROP & RESIZE
   ========================================================================= */
export const CropResizeView: React.FC = () => {
  const [file, setFile] = useState<PDFFile | null>(null);
  const [margin, setMargin] = useState('30');
  const [standardSize, setStandardSize] = useState<'A4' | 'Letter' | 'A3' | 'Legal' | 'Custom'>('A4');
  const [processing, setProcessing] = useState(false);
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buffer = await f.arrayBuffer();
    setFile({ id: 'cr', file: f, name: f.name, size: f.size, buffer });
    setOutputBytes(null);
  };

  const handleCrop = async () => {
    if (!file?.buffer) return;
    const m = parseInt(margin, 10) || 0;
    setProcessing(true);
    try {
      const res = await pdfLibService.cropAndResizePDF(
        file.buffer,
        { top: m, bottom: m, left: m, right: m },
        standardSize
      );
      setOutputBytes(res);
    } catch (e: any) {
      setError(e?.message || 'Failed to crop and resize PDF.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Crop className="w-6 h-6 text-brand-600" />
          Crop & Resize PDF
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Trim borders and margins or standardize page dimensions to A4, Letter, A3, or Legal.
        </p>
      </div>

      {!file ? (
        <FileDropzone onFilesSelected={handleFileSelected} title="Drop PDF to crop or resize" />
      ) : (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Crop Margin (Points / px off all edges)
            </label>
            <input
              type="number"
              min="0"
              max="200"
              value={margin}
              onChange={(e) => setMargin(e.target.value)}
              className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Standard Target Dimensions
            </label>
            <select
              value={standardSize}
              onChange={(e) => setStandardSize(e.target.value as any)}
              className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
            >
              <option value="A4">A4 (595 × 842 pt)</option>
              <option value="Letter">US Letter (612 × 792 pt)</option>
              <option value="A3">A3 (842 × 1191 pt)</option>
              <option value="Legal">US Legal (612 × 1008 pt)</option>
              <option value="Custom">Preserve Aspect / Margin Only</option>
            </select>
          </div>

          <div className="flex justify-end pt-2">
            <Button size="md" variant="primary" onClick={handleCrop} loading={processing}>
              Apply Crop & Resize
            </Button>
          </div>
        </div>
      )}

      {error && <ErrorState message={error} />}
      {outputBytes && !processing && (
        <DownloadButton
          filename={`Cropped_${file?.name || 'Document.pdf'}`}
          fileSize={outputBytes.byteLength}
          onDownload={() => {
            const blob = new Blob([outputBytes as any], { type: 'application/pdf' });
            downloadService.downloadBlob(blob, `Cropped_${file?.name || 'Document.pdf'}`);
          }}
          onReset={() => setOutputBytes(null)}
        />
      )}
    </div>
  );
};
