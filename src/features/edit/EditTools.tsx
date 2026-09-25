import React, { useState, useEffect } from 'react';
import { PDFFile } from '@/types/pdf';
import { pdfLibService } from '@/services/pdf/pdfLibService';
import { pdfJsService } from '@/services/pdf/pdfJsService';
import { downloadService } from '@/services/download/downloadService';
import { EditPDFView } from './EditPDFView';
import { FileDropzone } from '@/components/common/FileDropzone';
import { ProcessingProgress } from '@/components/common/ProcessingProgress';
import { DownloadButton } from '@/components/common/DownloadButton';
import { ErrorState } from '@/components/common/StateViews';
import { Button } from '@/components/common/Button';
import { parsePageRanges } from '@/utils/fileUtils';
import {
  Stamp,
  Binary,
  ListOrdered,
  AlignJustify,
  FileCheck,
  Moon,
  Fingerprint,
  CheckSquare,
  EyeOff,
} from 'lucide-react';

/* =========================================================================
   1. FILL PDF FORM
   ========================================================================= */
export const FillFormView: React.FC = () => {
  const [file, setFile] = useState<PDFFile | null>(null);
  const [fields, setFields] = useState<Array<{ name: string; type: string; value: any }>>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [processing, setProcessing] = useState(false);
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buffer = await f.arrayBuffer();
    setFile({ id: 'form-f', file: f, name: f.name, size: f.size, buffer });
    setOutputBytes(null);

    try {
      const detected = await pdfLibService.getFormFields(buffer);
      setFields(detected);
      const initial: Record<string, any> = {};
      detected.forEach((d) => (initial[d.name] = d.value));
      setFieldValues(initial);
      if (detected.length === 0) {
        setError('No interactive fillable AcroForm fields were detected in this document.');
      }
    } catch {
      setError('Could not inspect form fields.');
    }
  };

  const handleSave = async () => {
    if (!file?.buffer) return;
    setProcessing(true);
    try {
      const res = await pdfLibService.fillFormFields(file.buffer, fieldValues);
      setOutputBytes(res);
    } catch (e: any) {
      setError(e?.message || 'Failed to fill PDF form.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <CheckSquare className="w-6 h-6 text-brand-600" />
          Fill PDF Form
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Detect and fill interactive form fields, checkboxes, and text inputs directly.
        </p>
      </div>

      {!file ? (
        <FileDropzone onFilesSelected={handleFileSelected} title="Drop fillable PDF form here" />
      ) : (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100 dark:border-slate-800">
            <span>Document: <strong>{file.name}</strong></span>
            <button onClick={() => setFile(null)} className="text-brand-600 hover:underline">Change</button>
          </div>

          {fields.length > 0 && (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {fields.map((f) => (
                <div key={f.name}>
                  {f.type === 'checkbox' ? (
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!fieldValues[f.name]}
                        onChange={(e) => setFieldValues({ ...fieldValues, [f.name]: e.target.checked })}
                        className="rounded text-brand-600"
                      />
                      {f.name}
                    </label>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        {f.name}
                      </label>
                      <input
                        type="text"
                        value={fieldValues[f.name] || ''}
                        onChange={(e) => setFieldValues({ ...fieldValues, [f.name]: e.target.value })}
                        className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {fields.length > 0 && (
            <div className="flex justify-end pt-2">
              <Button size="md" variant="primary" onClick={handleSave} loading={processing}>
                Save Filled Form
              </Button>
            </div>
          )}
        </div>
      )}

      {error && <ErrorState message={error} />}
      {outputBytes && !processing && (
        <DownloadButton
          filename={`Filled_${file?.name || 'Form.pdf'}`}
          fileSize={outputBytes.byteLength}
          onDownload={() => {
            const blob = new Blob([outputBytes as any], { type: 'application/pdf' });
            downloadService.downloadBlob(blob, `Filled_${file?.name || 'Form.pdf'}`);
          }}
          onReset={() => setOutputBytes(null)}
        />
      )}
    </div>
  );
};

/* =========================================================================
   2. REDACT PDF
   ========================================================================= */
export const RedactPDFView: React.FC = () => {
  const [file, setFile] = useState<PDFFile | null>(null);
  const [redactionText, setRedactionText] = useState('CONFIDENTIAL');
  const [targetPages, setTargetPages] = useState('1');
  const [processing, setProcessing] = useState(false);
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buffer = await f.arrayBuffer();
    setFile({ id: 'redact-f', file: f, name: f.name, size: f.size, buffer });
    setOutputBytes(null);
  };

  const handleRedact = async () => {
    if (!file?.buffer) return;
    setProcessing(true);
    try {
      const pages = parsePageRanges(targetPages);
      const boxes = pages.map((p) => ({
        pageNumber: p,
        x: 60,
        y: 120,
        width: 320,
        height: 35,
        label: redactionText,
      }));

      const res = await pdfLibService.redactPDF(file.buffer, boxes);
      setOutputBytes(res);
    } catch (e: any) {
      setError(e?.message || 'Failed to redact PDF.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <EyeOff className="w-6 h-6 text-brand-600" />
          Redact PDF
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Permanently black out and sanitize confidential content from resulting PDF pages.
        </p>
      </div>

      {!file ? (
        <FileDropzone onFilesSelected={handleFileSelected} title="Drop PDF to redact" />
      ) : (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Redaction Label / Reason
            </label>
            <input
              type="text"
              value={redactionText}
              onChange={(e) => setRedactionText(e.target.value)}
              className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Pages to Apply Redaction (e.g. 1, 2-3)
            </label>
            <input
              type="text"
              value={targetPages}
              onChange={(e) => setTargetPages(e.target.value)}
              className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button size="md" variant="primary" onClick={handleRedact} loading={processing}>
              Apply Redactions
            </Button>
          </div>
        </div>
      )}

      {error && <ErrorState message={error} />}
      {outputBytes && !processing && (
        <DownloadButton
          filename={`Redacted_${file?.name || 'Document.pdf'}`}
          fileSize={outputBytes.byteLength}
          onDownload={() => {
            const blob = new Blob([outputBytes as any], { type: 'application/pdf' });
            downloadService.downloadBlob(blob, `Redacted_${file?.name || 'Document.pdf'}`);
          }}
          onReset={() => setOutputBytes(null)}
        />
      )}
    </div>
  );
};

/* =========================================================================
   3. ADD WATERMARK
   ========================================================================= */
export const WatermarkView: React.FC = () => {
  const [file, setFile] = useState<PDFFile | null>(null);
  const [text, setText] = useState('CONFIDENTIAL');
  const [opacity, setOpacity] = useState('0.25');
  const [rotation, setRotation] = useState('45');
  const [color, setColor] = useState('#ef4444');
  const [fontSize, setFontSize] = useState('48');
  const [processing, setProcessing] = useState(false);
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buffer = await f.arrayBuffer();
    setFile({ id: 'wm-f', file: f, name: f.name, size: f.size, buffer });
    setOutputBytes(null);
  };

  const handleApply = async () => {
    if (!file?.buffer) return;
    setProcessing(true);
    try {
      const res = await pdfLibService.addWatermark(file.buffer, {
        text,
        opacity: parseFloat(opacity),
        rotation: parseInt(rotation, 10),
        fontSize: parseInt(fontSize, 10),
        color,
      });
      setOutputBytes(res);
    } catch (e: any) {
      setError(e?.message || 'Failed to add watermark.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Stamp className="w-6 h-6 text-brand-600" />
          Add Watermark
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Apply customized text or stamp watermarks across all document pages.
        </p>
      </div>

      {!file ? (
        <FileDropzone onFilesSelected={handleFileSelected} title="Drop PDF to add watermark" />
      ) : (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Watermark Text
            </label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Opacity ({opacity})
              </label>
              <input
                type="range"
                min="0.05"
                max="0.9"
                step="0.05"
                value={opacity}
                onChange={(e) => setOpacity(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Rotation ({rotation}°)
              </label>
              <input
                type="range"
                min="0"
                max="90"
                step="15"
                value={rotation}
                onChange={(e) => setRotation(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Font Size ({fontSize} pt)
              </label>
              <input
                type="number"
                min="12"
                max="120"
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Watermark Color
              </label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer p-0.5"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button size="md" variant="primary" onClick={handleApply} loading={processing}>
              Apply Watermark
            </Button>
          </div>
        </div>
      )}

      {error && <ErrorState message={error} />}
      {outputBytes && !processing && (
        <DownloadButton
          filename={`Watermarked_${file?.name || 'Document.pdf'}`}
          fileSize={outputBytes.byteLength}
          onDownload={() => {
            const blob = new Blob([outputBytes as any], { type: 'application/pdf' });
            downloadService.downloadBlob(blob, `Watermarked_${file?.name || 'Document.pdf'}`);
          }}
          onReset={() => setOutputBytes(null)}
        />
      )}
    </div>
  );
};

/* =========================================================================
   4. ADD PAGE NUMBERS
   ========================================================================= */
export const PageNumbersView: React.FC = () => {
  const [file, setFile] = useState<PDFFile | null>(null);
  const [position, setPosition] = useState<any>('bottom-right');
  const [format, setFormat] = useState<any>('page_n_of_total');
  const [startNumber, setStartNumber] = useState('1');
  const [processing, setProcessing] = useState(false);
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buffer = await f.arrayBuffer();
    setFile({ id: 'pn-f', file: f, name: f.name, size: f.size, buffer });
    setOutputBytes(null);
  };

  const handleApply = async () => {
    if (!file?.buffer) return;
    setProcessing(true);
    try {
      const res = await pdfLibService.addPageNumbers(file.buffer, {
        position,
        format,
        startNumber: parseInt(startNumber, 10) || 1,
      });
      setOutputBytes(res);
    } catch (e: any) {
      setError(e?.message || 'Failed to add page numbers.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Binary className="w-6 h-6 text-brand-600" />
          Add Page Numbers
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Stamp automated page numbers with customizable placement and numbering formats.
        </p>
      </div>

      {!file ? (
        <FileDropzone onFilesSelected={handleFileSelected} title="Drop PDF to add page numbers" />
      ) : (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Position
              </label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
              >
                <option value="bottom-right">Bottom Right</option>
                <option value="bottom-center">Bottom Center</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="top-right">Top Right</option>
                <option value="top-center">Top Center</option>
                <option value="top-left">Top Left</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
              >
                <option value="page_n_of_total">Page 1 of 10</option>
                <option value="page_n">Page 1</option>
                <option value="n">1</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Start Number
            </label>
            <input
              type="number"
              min="1"
              value={startNumber}
              onChange={(e) => setStartNumber(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button size="md" variant="primary" onClick={handleApply} loading={processing}>
              Add Numbers
            </Button>
          </div>
        </div>
      )}

      {error && <ErrorState message={error} />}
      {outputBytes && !processing && (
        <DownloadButton
          filename={`Numbered_${file?.name || 'Document.pdf'}`}
          fileSize={outputBytes.byteLength}
          onDownload={() => {
            const blob = new Blob([outputBytes as any], { type: 'application/pdf' });
            downloadService.downloadBlob(blob, `Numbered_${file?.name || 'Document.pdf'}`);
          }}
          onReset={() => setOutputBytes(null)}
        />
      )}
    </div>
  );
};

/* =========================================================================
   5. BATES NUMBERING
   ========================================================================= */
export const BatesNumberingView: React.FC = () => {
  const [file, setFile] = useState<PDFFile | null>(null);
  const [prefix, setPrefix] = useState('CASE-');
  const [startNumber, setStartNumber] = useState('1');
  const [digits, setDigits] = useState('6');
  const [position, setPosition] = useState('top-right');
  const [processing, setProcessing] = useState(false);
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buffer = await f.arrayBuffer();
    setFile({ id: 'bates-f', file: f, name: f.name, size: f.size, buffer });
    setOutputBytes(null);
  };

  const handleApply = async () => {
    if (!file?.buffer) return;
    setProcessing(true);
    try {
      const res = await pdfLibService.addBatesNumbering(file.buffer, {
        prefix,
        startNumber: parseInt(startNumber, 10) || 1,
        digits: parseInt(digits, 10) || 6,
        position,
      });
      setOutputBytes(res);
    } catch (e: any) {
      setError(e?.message || 'Failed to add Bates numbering.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <ListOrdered className="w-6 h-6 text-brand-600" />
          Bates Numbering
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Legal document indexing with customized prefix, digit padding, and increments.
        </p>
      </div>

      {!file ? (
        <FileDropzone onFilesSelected={handleFileSelected} title="Drop PDF for Bates stamping" />
      ) : (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Prefix
              </label>
              <input
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                placeholder="e.g. CASE-, DOC-"
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Digit Padding
              </label>
              <input
                type="number"
                min="3"
                max="10"
                value={digits}
                onChange={(e) => setDigits(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
              />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 text-center font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
            Preview: {prefix}{String(startNumber).padStart(parseInt(digits, 10) || 6, '0')}
          </div>

          <div className="flex justify-end pt-2">
            <Button size="md" variant="primary" onClick={handleApply} loading={processing}>
              Apply Bates Index
            </Button>
          </div>
        </div>
      )}

      {error && <ErrorState message={error} />}
      {outputBytes && !processing && (
        <DownloadButton
          filename={`Bates_${file?.name || 'Document.pdf'}`}
          fileSize={outputBytes.byteLength}
          onDownload={() => {
            const blob = new Blob([outputBytes as any], { type: 'application/pdf' });
            downloadService.downloadBlob(blob, `Bates_${file?.name || 'Document.pdf'}`);
          }}
          onReset={() => setOutputBytes(null)}
        />
      )}
    </div>
  );
};

/* =========================================================================
   6. HEADERS & FOOTERS
   ========================================================================= */
export const HeadersFootersView: React.FC = () => {
  const [file, setFile] = useState<PDFFile | null>(null);
  const [headerLeft, setHeaderLeft] = useState('{filename}');
  const [headerRight, setHeaderRight] = useState('{date}');
  const [footerCenter, setFooterCenter] = useState('Page {page} of {total}');
  const [processing, setProcessing] = useState(false);
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buffer = await f.arrayBuffer();
    setFile({ id: 'hf-f', file: f, name: f.name, size: f.size, buffer });
    setOutputBytes(null);
  };

  const handleApply = async () => {
    if (!file?.buffer) return;
    setProcessing(true);
    try {
      const res = await pdfLibService.addHeadersFooters(file.buffer, {
        headerLeft,
        headerRight,
        footerCenter,
        filename: file.name,
      });
      setOutputBytes(res);
    } catch (e: any) {
      setError(e?.message || 'Failed to add headers/footers.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <AlignJustify className="w-6 h-6 text-brand-600" />
          Headers & Footers
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Add dynamic header and footer text with page numbers, date, filename, and margins.
        </p>
      </div>

      {!file ? (
        <FileDropzone onFilesSelected={handleFileSelected} title="Drop PDF for headers & footers" />
      ) : (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Header Left
              </label>
              <input
                type="text"
                value={headerLeft}
                onChange={(e) => setHeaderLeft(e.target.value)}
                className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Header Right
              </label>
              <input
                type="text"
                value={headerRight}
                onChange={(e) => setHeaderRight(e.target.value)}
                className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Footer Center
            </label>
            <input
              type="text"
              value={footerCenter}
              onChange={(e) => setFooterCenter(e.target.value)}
              className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
            />
          </div>

          <p className="text-[11px] text-slate-400">
            Variables supported: {'{page}'}, {'{total}'}, {'{date}'}, {'{filename}'}
          </p>

          <div className="flex justify-end pt-2">
            <Button size="md" variant="primary" onClick={handleApply} loading={processing}>
              Apply Headers & Footers
            </Button>
          </div>
        </div>
      )}

      {error && <ErrorState message={error} />}
      {outputBytes && !processing && (
        <DownloadButton
          filename={`Headers_${file?.name || 'Document.pdf'}`}
          fileSize={outputBytes.byteLength}
          onDownload={() => {
            const blob = new Blob([outputBytes as any], { type: 'application/pdf' });
            downloadService.downloadBlob(blob, `Headers_${file?.name || 'Document.pdf'}`);
          }}
          onReset={() => setOutputBytes(null)}
        />
      )}
    </div>
  );
};

/* =========================================================================
   7. FLATTEN PDF
   ========================================================================= */
export const FlattenPDFView: React.FC = () => {
  const [file, setFile] = useState<PDFFile | null>(null);
  const [processing, setProcessing] = useState(false);
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buffer = await f.arrayBuffer();
    setFile({ id: 'flat-f', file: f, name: f.name, size: f.size, buffer });
    setOutputBytes(null);
  };

  const handleFlatten = async () => {
    if (!file?.buffer) return;
    setProcessing(true);
    try {
      const res = await pdfLibService.flattenPDF(file.buffer);
      setOutputBytes(res);
    } catch (e: any) {
      setError(e?.message || 'Failed to flatten PDF.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <FileCheck className="w-6 h-6 text-brand-600" />
          Flatten PDF
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Lock form fields, drawings, and annotations into permanent non-editable page content.
        </p>
      </div>

      {!file ? (
        <FileDropzone onFilesSelected={handleFileSelected} title="Drop PDF to flatten" />
      ) : (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Flattening permanently converts interactive form controls and comments into normal graphics on <strong>{file.name}</strong>.
          </p>
          <div className="flex justify-end pt-2">
            <Button size="md" variant="primary" onClick={handleFlatten} loading={processing}>
              Flatten All Annotations
            </Button>
          </div>
        </div>
      )}

      {error && <ErrorState message={error} />}
      {outputBytes && !processing && (
        <DownloadButton
          filename={`Flattened_${file?.name || 'Document.pdf'}`}
          fileSize={outputBytes.byteLength}
          onDownload={() => {
            const blob = new Blob([outputBytes as any], { type: 'application/pdf' });
            downloadService.downloadBlob(blob, `Flattened_${file?.name || 'Document.pdf'}`);
          }}
          onReset={() => setOutputBytes(null)}
        />
      )}
    </div>
  );
};

/* =========================================================================
   8. INVERT PDF COLOURS
   ========================================================================= */
export const InvertColoursView: React.FC = () => {
  const [file, setFile] = useState<PDFFile | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buffer = await f.arrayBuffer();
    setFile({ id: 'inv-f', file: f, name: f.name, size: f.size, buffer });
    setOutputBytes(null);
  };

  const handleInvert = async () => {
    if (!file?.buffer) return;
    setProcessing(true);
    setProgress(10);
    setStatusText('Inverting page color palette to high-contrast dark mode...');

    try {
      const doc = await pdfJsService.loadDocument(file.buffer);
      const total = doc.numPages;
      const { PDFDocument } = await import('pdf-lib');
      const outDoc = await PDFDocument.create();

      for (let i = 1; i <= total; i++) {
        setProgress(Math.round(10 + (i / total) * 80));
        setStatusText(`Inverting page ${i} of ${total}...`);
        const pageBlob = await pdfJsService.renderPageToBlob(doc, i, 1.5, 0.9, true);
        const imgBuffer = await pageBlob.arrayBuffer();
        const img = await outDoc.embedJpg(imgBuffer);
        const p = outDoc.addPage([img.width, img.height]);
        p.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      }

      const res = await outDoc.save();
      setOutputBytes(res);
    } catch (e: any) {
      setError(e?.message || 'Failed to invert PDF colours.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Moon className="w-6 h-6 text-brand-600" />
          Invert PDF Colours
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Convert light document pages into high-contrast dark mode (white to black, black to white).
        </p>
      </div>

      {!file ? (
        <FileDropzone onFilesSelected={handleFileSelected} title="Drop PDF to invert colours" />
      ) : (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex justify-end pt-2">
            <Button size="md" variant="primary" onClick={handleInvert} loading={processing}>
              Invert Document Colours
            </Button>
          </div>
        </div>
      )}

      {processing && <ProcessingProgress progress={progress} statusText={statusText} />}
      {error && <ErrorState message={error} />}
      {outputBytes && !processing && (
        <DownloadButton
          filename={`Inverted_${file?.name || 'Document.pdf'}`}
          fileSize={outputBytes.byteLength}
          onDownload={() => {
            const blob = new Blob([outputBytes as any], { type: 'application/pdf' });
            downloadService.downloadBlob(blob, `Inverted_${file?.name || 'Document.pdf'}`);
          }}
          onReset={() => setOutputBytes(null)}
        />
      )}
    </div>
  );
};

/* =========================================================================
   9. THUMBMARK MAKER
   ========================================================================= */
export const ThumbmarkMakerView: React.FC = () => {
  return <EditPDFView />;
};
