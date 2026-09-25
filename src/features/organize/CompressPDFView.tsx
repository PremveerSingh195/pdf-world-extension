import React, { useState } from 'react';
import { PDFFile } from '@/types/pdf';
import { compressionService, CompressionResult } from '@/services/compression/compressionService';
import { downloadService } from '@/services/download/downloadService';
import { FileDropzone } from '@/components/common/FileDropzone';
import { ProcessingProgress } from '@/components/common/ProcessingProgress';
import { DownloadButton } from '@/components/common/DownloadButton';
import { ErrorState } from '@/components/common/StateViews';
import { Button } from '@/components/common/Button';
import { Minimize2, Zap, Gauge, Sparkles } from 'lucide-react';
import { formatBytes } from '@/utils/fileUtils';

export const CompressPDFView: React.FC = () => {
  const [file, setFile] = useState<PDFFile | null>(null);
  const [level, setLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    setError(null);
    const f = files[0];
    const buffer = await f.arrayBuffer();
    setFile({
      id: 'compress-file',
      file: f,
      name: f.name,
      size: f.size,
      buffer,
    });
  };

  const handleCompress = async () => {
    if (!file || !file.buffer) return;
    setError(null);
    setProcessing(true);
    setProgress(0);

    try {
      const res = await compressionService.compressPDF(file.buffer, level, (pct, msg) => {
        setProgress(pct);
        setStatusText(msg);
      });
      setResult(res);
    } catch (err: any) {
      setError(err?.message || 'Compression failed.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Minimize2 className="w-6 h-6 text-brand-600" />
          Compress PDF
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Reduce PDF file size while maintaining excellent document clarity and readability.
        </p>
      </div>

      {!file ? (
        <FileDropzone
          onFilesSelected={handleFileSelected}
          title="Drop PDF to compress"
          subtitle="or select PDF from your computer"
        />
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{file.name}</p>
              <p className="text-[11px] text-slate-500">Current size: {formatBytes(file.size)}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setFile(null)}>
              Change
            </Button>
          </div>

          {/* Compression Level Selector */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Select Compression Level
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'low',
                  label: 'Low Compression',
                  desc: 'High quality, subtle size reduction',
                  icon: Sparkles,
                },
                {
                  id: 'medium',
                  label: 'Medium Compression',
                  desc: 'Recommended balance of quality and size',
                  icon: Gauge,
                },
                {
                  id: 'high',
                  label: 'High Compression',
                  desc: 'Maximum reduction, optimized DPI',
                  icon: Zap,
                },
              ].map((item) => {
                const isSelected = level === item.id;
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setLevel(item.id as any)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20 ring-1 ring-brand-500'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 mb-2 ${
                        isSelected ? 'text-brand-600' : 'text-slate-400'
                      }`}
                    />
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-0.5">
                      {item.label}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      {item.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              size="lg"
              variant="primary"
              icon={<Minimize2 className="w-4 h-4" />}
              loading={processing}
              onClick={handleCompress}
            >
              Compress PDF
            </Button>
          </div>
        </div>
      )}

      {processing && <ProcessingProgress progress={progress} statusText={statusText} />}
      {error && <ErrorState message={error} onRetry={handleCompress} />}

      {result && !processing && (
        <DownloadButton
          filename={`Compressed_${file?.name || 'Document.pdf'}`}
          fileSize={result.newSize}
          stats={{
            originalSize: result.originalSize,
            newSize: result.newSize,
            reductionPercent: result.reductionPercent,
          }}
          onDownload={() => {
            const blob = new Blob([result.data as any], { type: 'application/pdf' });
            downloadService.downloadBlob(blob, `Compressed_${file?.name || 'Document.pdf'}`);
          }}
          onReset={() => {
            setResult(null);
            setProgress(0);
          }}
        />
      )}
    </div>
  );
};
