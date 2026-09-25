import React, { useState } from 'react';
import { PDFFile } from '@/types/pdf';
import { handwritingService, HandwritingOptions } from '@/services/conversion/handwritingService';
import { downloadService } from '@/services/download/downloadService';
import { FileDropzone } from '@/components/common/FileDropzone';
import { ProcessingProgress } from '@/components/common/ProcessingProgress';
import { DownloadButton } from '@/components/common/DownloadButton';
import { ErrorState } from '@/components/common/StateViews';
import { Button } from '@/components/common/Button';
import { Feather, Pen, ImagePlus } from 'lucide-react';

/* =========================================================================
   1. TEXT TO HANDWRITING
   ========================================================================= */
export const TextToHandwritingView: React.FC = () => {
  const [text, setText] = useState(
    'Dear Professor,\n\nPlease find attached my assignment notes for the weekly project.\n\nAll tasks and calculations have been completed according to the course rubric.\n\nSincerely,\nStudent'
  );
  const [fontStyle, setFontStyle] = useState<'cursive' | 'print' | 'casual'>('cursive');
  const [inkColor, setInkColor] = useState('#1e3a8a');
  const [paperStyle, setPaperStyle] = useState<'ruled' | 'grid' | 'blank'>('ruled');
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);

  const handleGenerate = () => {
    const opts: HandwritingOptions = {
      fontStyle,
      inkColor,
      paperStyle,
      fontSize: 13,
      lineSpacing: 28,
      margin: 45,
    };
    const res = handwritingService.textToHandwritingPdf(text, opts);
    setOutputBytes(res);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Pen className="w-6 h-6 text-brand-600" />
          Text to Handwriting
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Type or paste any text and convert it into realistic handwritten notebook pages.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Controls & Text Input */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Enter Document Text
            </label>
            <textarea
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 leading-relaxed"
              placeholder="Type your notes here..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Handwriting Style
              </label>
              <select
                value={fontStyle}
                onChange={(e) => setFontStyle(e.target.value as any)}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2"
              >
                <option value="cursive">Cursive Script</option>
                <option value="print">Standard Casual Print</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Paper Background
              </label>
              <select
                value={paperStyle}
                onChange={(e) => setPaperStyle(e.target.value as any)}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2"
              >
                <option value="ruled">Lined Notebook Paper</option>
                <option value="grid">Graph / Grid Paper</option>
                <option value="blank">Warm Plain Paper</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Ink Color
            </label>
            <div className="flex gap-2">
              {[
                { name: 'Royal Blue Ink', color: '#1e3a8a' },
                { name: 'Black Gel', color: '#09090b' },
                { name: 'Red Ballpoint', color: '#b91c1c' },
              ].map((c) => (
                <button
                  key={c.color}
                  type="button"
                  onClick={() => setInkColor(c.color)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${
                    inkColor === c.color
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-600'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <Button size="lg" variant="primary" onClick={handleGenerate} className="w-full">
              Generate Handwritten PDF
            </Button>
          </div>
        </div>

        {/* Live Notebook Preview Card */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#fefcf6] dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-md relative overflow-hidden bg-lined-paper min-h-[360px]">
          <div className="absolute top-0 bottom-0 left-12 w-0.5 bg-red-300 pointer-events-none" />
          <div
            className="pl-8 whitespace-pre-wrap text-sm leading-[28px]"
            style={{
              color: inkColor,
              fontFamily: fontStyle === 'cursive' ? 'cursive, Georgia, serif' : 'system-ui, sans-serif',
              fontStyle: fontStyle === 'cursive' ? 'italic' : 'normal',
            }}
          >
            {text || '(Type text on the left to see live handwriting simulation)'}
          </div>
        </div>
      </div>

      {outputBytes && (
        <DownloadButton
          filename="Handwritten_Document.pdf"
          fileSize={outputBytes.byteLength}
          onDownload={() => {
            const blob = new Blob([outputBytes as any], { type: 'application/pdf' });
            downloadService.downloadBlob(blob, 'Handwritten_Document.pdf');
          }}
          onReset={() => setOutputBytes(null)}
        />
      )}
    </div>
  );
};

/* =========================================================================
   2. PDF TO HANDWRITING
   ========================================================================= */
export const PDFToHandwritingView: React.FC = () => {
  const [file, setFile] = useState<PDFFile | null>(null);
  const [fontStyle, setFontStyle] = useState<'cursive' | 'print' | 'casual'>('cursive');
  const [inkColor, setInkColor] = useState('#1e3a8a');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buffer = await f.arrayBuffer();
    setFile({ id: 'pth', file: f, name: f.name, size: f.size, buffer });
    setOutputBytes(null);
  };

  const handleConvert = async () => {
    if (!file?.buffer) return;
    setProcessing(true);
    setProgress(0);
    try {
      const res = await handwritingService.pdfToHandwriting(
        file.buffer,
        {
          fontStyle,
          inkColor,
          paperStyle: 'ruled',
          fontSize: 13,
          lineSpacing: 28,
          margin: 45,
        },
        (pct, msg) => {
          setProgress(pct);
          setStatusText(msg);
        }
      );
      setOutputBytes(res);
    } catch (e: any) {
      setError(e?.message || 'Failed to convert PDF to handwriting.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Feather className="w-6 h-6 text-brand-600" />
          PDF to Handwriting
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Transform typed document pages into realistic handwriting script on ruled notebook paper.
        </p>
      </div>

      {!file ? (
        <FileDropzone onFilesSelected={handleFileSelected} title="Drop PDF to convert to handwriting" />
      ) : (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100 dark:border-slate-800">
            <span>Document: <strong>{file.name}</strong></span>
            <button onClick={() => setFile(null)} className="text-brand-600 hover:underline">Change</button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Script Font
              </label>
              <select
                value={fontStyle}
                onChange={(e) => setFontStyle(e.target.value as any)}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2"
              >
                <option value="cursive">Cursive Script</option>
                <option value="print">Casual Print</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ink Color
              </label>
              <select
                value={inkColor}
                onChange={(e) => setInkColor(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2"
              >
                <option value="#1e3a8a">Blue Ink</option>
                <option value="#09090b">Black Gel</option>
                <option value="#b91c1c">Red Ink</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button size="md" variant="primary" onClick={handleConvert} loading={processing}>
              Convert to Handwritten PDF
            </Button>
          </div>
        </div>
      )}

      {processing && <ProcessingProgress progress={progress} statusText={statusText} />}
      {error && <ErrorState message={error} />}
      {outputBytes && !processing && (
        <DownloadButton
          filename={`Handwritten_${file?.name || 'Document.pdf'}`}
          fileSize={outputBytes.byteLength}
          onDownload={() => {
            const blob = new Blob([outputBytes as any], { type: 'application/pdf' });
            downloadService.downloadBlob(blob, `Handwritten_${file?.name || 'Document.pdf'}`);
          }}
          onReset={() => setOutputBytes(null)}
        />
      )}
    </div>
  );
};

/* =========================================================================
   3. HANDWRITING TO PDF
   ========================================================================= */
export const HandwritingToPDFView: React.FC = () => {
  const [images, setImages] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = (files: File[]) => {
    setImages((prev) => [...prev, ...files]);
    setOutputBytes(null);
  };

  const handleConvert = async () => {
    if (images.length === 0) return;
    setProcessing(true);
    setProgress(0);

    try {
      const items = await Promise.all(
        images.map(async (file) => ({
          file,
          buffer: await file.arrayBuffer(),
        }))
      );
      const res = await handwritingService.imagesToPdf(items, (pct, msg) => {
        setProgress(pct);
        setStatusText(msg);
      });
      setOutputBytes(res);
    } catch (e: any) {
      setError(e?.message || 'Failed to convert handwriting photos to PDF.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <ImagePlus className="w-6 h-6 text-brand-600" />
          Handwriting to PDF
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Convert notebook photos, assignment scans, and handwritten snapshots into a clean PDF.
        </p>
      </div>

      <FileDropzone
        multiple
        acceptedFileTypes={['.jpg', '.jpeg', '.png', '.webp']}
        onFilesSelected={handleFiles}
        title="Drop handwriting photos here"
        subtitle="JPG, PNG, WEBP supported"
      />

      {images.length > 0 && !outputBytes && (
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-600 dark:text-slate-400">
            {images.length} {images.length === 1 ? 'photo' : 'photos'} ready to compile
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setImages([])}>
              Clear
            </Button>
            <Button size="md" variant="primary" onClick={handleConvert} loading={processing}>
              Create PDF ({images.length} Pages)
            </Button>
          </div>
        </div>
      )}

      {processing && <ProcessingProgress progress={progress} statusText={statusText} />}
      {error && <ErrorState message={error} />}
      {outputBytes && !processing && (
        <DownloadButton
          filename="Handwritten_Notes.pdf"
          fileSize={outputBytes.byteLength}
          onDownload={() => {
            const blob = new Blob([outputBytes as any], { type: 'application/pdf' });
            downloadService.downloadBlob(blob, 'Handwritten_Notes.pdf');
          }}
          onReset={() => setOutputBytes(null)}
        />
      )}
    </div>
  );
};
