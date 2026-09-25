import React, { useState, useEffect } from 'react';
import { PDFFile } from '@/types/pdf';
import { pdfJsService, ExtractedImage } from '@/services/pdf/pdfJsService';
import { docxService } from '@/services/conversion/docxService';
import { sheetService } from '@/services/conversion/sheetService';
import { pptxService } from '@/services/conversion/pptxService';
import { htmlService } from '@/services/conversion/htmlService';
import { audioService } from '@/services/conversion/audioService';
import { downloadService, DownloadItem } from '@/services/download/downloadService';
import { FileDropzone } from '@/components/common/FileDropzone';
import { ProcessingProgress } from '@/components/common/ProcessingProgress';
import { DownloadButton } from '@/components/common/DownloadButton';
import { ErrorState } from '@/components/common/StateViews';
import { Button } from '@/components/common/Button';
import {
  FileType,
  Image,
  Sheet,
  Tv,
  Globe,
  Volume2,
  Book,
  FileOutput,
  Camera,
  Archive,
  Download,
  Copy,
  Check,
  Play,
  Pause,
  Square,
} from 'lucide-react';

/* =========================================================================
   1. PDF TO WORD
   ========================================================================= */
export const PDFToWordView: React.FC = () => {
  const [file, setFile] = useState<PDFFile | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [wordBlob, setWordBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buffer = await f.arrayBuffer();
    setFile({ id: 'p2w', file: f, name: f.name, size: f.size, buffer });
    setWordBlob(null);
  };

  const handleConvert = async () => {
    if (!file?.buffer) return;
    setProcessing(true);
    setProgress(0);
    try {
      const blob = await docxService.pdfToDocx(file.buffer, (pct, msg) => {
        setProgress(pct);
        setStatusText(msg);
      });
      setWordBlob(blob);
    } catch (e: any) {
      setError(e?.message || 'Failed to convert PDF to Word document.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <FileType className="w-6 h-6 text-brand-600" />
          PDF to Word (.docx)
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Extract text and paragraphs into an editable Microsoft Word (.docx) document.
        </p>
      </div>

      {!file ? (
        <FileDropzone onFilesSelected={handleFile} title="Drop PDF to convert to Word" />
      ) : (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{file.name}</p>
            <p className="text-[11px] text-slate-500">Ready to export to .docx</p>
          </div>
          <Button size="md" variant="primary" onClick={handleConvert} loading={processing}>
            Convert to Word
          </Button>
        </div>
      )}

      {processing && <ProcessingProgress progress={progress} statusText={statusText} />}
      {error && <ErrorState message={error} />}
      {wordBlob && !processing && (
        <DownloadButton
          filename={`${file?.name.replace(/\.[^/.]+$/, '') || 'Document'}.docx`}
          fileSize={wordBlob.size}
          onDownload={() => {
            downloadService.downloadBlob(
              wordBlob,
              `${file?.name.replace(/\.[^/.]+$/, '') || 'Document'}.docx`
            );
          }}
          onReset={() => setWordBlob(null)}
        />
      )}
    </div>
  );
};

/* =========================================================================
   2. PDF TO JPG
   ========================================================================= */
export const PDFToJPGView: React.FC = () => {
  const [file, setFile] = useState<PDFFile | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [images, setImages] = useState<Array<{ name: string; blob: Blob; url: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buffer = await f.arrayBuffer();
    setFile({ id: 'p2j', file: f, name: f.name, size: f.size, buffer });
    setImages([]);
  };

  const handleConvert = async () => {
    if (!file?.buffer) return;
    setProcessing(true);
    setProgress(0);
    try {
      const doc = await pdfJsService.loadDocument(file.buffer);
      const total = doc.numPages;
      const converted: Array<{ name: string; blob: Blob; url: string }> = [];

      for (let i = 1; i <= total; i++) {
        setProgress(Math.round((i / total) * 100));
        setStatusText(`Rendering page ${i} of ${total} to high-definition JPG...`);
        const blob = await pdfJsService.renderPageToBlob(doc, i, 2.0, 0.92);
        const url = URL.createObjectURL(blob);
        converted.push({
          name: `page_${i}.jpg`,
          blob,
          url,
        });
      }
      setImages(converted);
    } catch (e: any) {
      setError(e?.message || 'Failed to render PDF pages to JPG.');
    } finally {
      setProcessing(false);
    }
  };

  const downloadAllZip = async () => {
    if (images.length === 0) return;
    await downloadService.downloadZip(
      images.map((im) => ({ filename: im.name, blob: im.blob })),
      `${file?.name.replace(/\.[^/.]+$/, '') || 'document'}_jpgs.zip`
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Image className="w-6 h-6 text-brand-600" />
          PDF to JPG
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Render each PDF page into high-definition JPEG images. Download individually or as ZIP.
        </p>
      </div>

      {!file ? (
        <FileDropzone onFilesSelected={handleFile} title="Drop PDF to convert to JPG" />
      ) : (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{file.name}</p>
            <p className="text-[11px] text-slate-500">Render all pages to JPG images</p>
          </div>
          <Button size="md" variant="primary" onClick={handleConvert} loading={processing}>
            Convert to Images
          </Button>
        </div>
      )}

      {processing && <ProcessingProgress progress={progress} statusText={statusText} />}
      {error && <ErrorState message={error} />}

      {images.length > 0 && !processing && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-950/60 shadow-sm">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {images.length} pages rendered successfully
            </span>
            <Button size="md" variant="primary" icon={<Archive className="w-4 h-4" />} onClick={downloadAllZip} className="bg-emerald-600 hover:bg-emerald-700">
              Download All as ZIP
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {images.map((im, idx) => (
              <div key={idx} className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
                <div className="aspect-[1/1.4] bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden flex items-center justify-center">
                  <img src={im.url} alt={im.name} className="w-full h-full object-contain" />
                </div>
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-mono text-slate-500">{im.name}</span>
                  <button
                    onClick={() => downloadService.downloadBlob(im.blob, im.name)}
                    className="p-1 rounded text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40"
                    title="Download page JPG"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   3. PDF TO EXCEL
   ========================================================================= */
export const PDFToExcelView: React.FC = () => {
  const [file, setFile] = useState<PDFFile | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [excelBlob, setExcelBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buffer = await f.arrayBuffer();
    setFile({ id: 'p2e', file: f, name: f.name, size: f.size, buffer });
    setExcelBlob(null);
  };

  const handleConvert = async () => {
    if (!file?.buffer) return;
    setProcessing(true);
    setProgress(0);
    try {
      const blob = await sheetService.pdfToExcel(file.buffer, (pct, msg) => {
        setProgress(pct);
        setStatusText(msg);
      });
      setExcelBlob(blob);
    } catch (e: any) {
      setError(e?.message || 'Failed to extract Excel tables from PDF.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Sheet className="w-6 h-6 text-brand-600" />
          PDF to Excel (.xlsx)
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Detect and pull tabular columns and spreadsheet rows from PDF into Microsoft Excel.
        </p>
      </div>

      {!file ? (
        <FileDropzone onFilesSelected={handleFile} title="Drop PDF table here" />
      ) : (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{file.name}</p>
            <p className="text-[11px] text-slate-500">Ready for Excel extraction</p>
          </div>
          <Button size="md" variant="primary" onClick={handleConvert} loading={processing}>
            Convert to Excel
          </Button>
        </div>
      )}

      {processing && <ProcessingProgress progress={progress} statusText={statusText} />}
      {error && <ErrorState message={error} />}
      {excelBlob && !processing && (
        <DownloadButton
          filename={`${file?.name.replace(/\.[^/.]+$/, '') || 'Spreadsheet'}.xlsx`}
          fileSize={excelBlob.size}
          onDownload={() => {
            downloadService.downloadBlob(
              excelBlob,
              `${file?.name.replace(/\.[^/.]+$/, '') || 'Spreadsheet'}.xlsx`
            );
          }}
          onReset={() => setExcelBlob(null)}
        />
      )}
    </div>
  );
};

/* =========================================================================
   4. PDF TO POWERPOINT
   ========================================================================= */
export const PDFToPPTView: React.FC = () => {
  const [file, setFile] = useState<PDFFile | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [pptxBlob, setPptxBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buffer = await f.arrayBuffer();
    setFile({ id: 'p2p', file: f, name: f.name, size: f.size, buffer });
    setPptxBlob(null);
  };

  const handleConvert = async () => {
    if (!file?.buffer) return;
    setProcessing(true);
    setProgress(0);
    try {
      const blob = await pptxService.pdfToPptx(file.buffer, (pct, msg) => {
        setProgress(pct);
        setStatusText(msg);
      });
      setPptxBlob(blob);
    } catch (e: any) {
      setError(e?.message || 'Failed to convert PDF to PowerPoint.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Tv className="w-6 h-6 text-brand-600" />
          PDF to PowerPoint (.pptx)
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Convert PDF pages into editable PowerPoint presentation slides (.pptx).
        </p>
      </div>

      {!file ? (
        <FileDropzone onFilesSelected={handleFile} title="Drop PDF presentation here" />
      ) : (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{file.name}</p>
            <p className="text-[11px] text-slate-500">Ready to build PPTX slides</p>
          </div>
          <Button size="md" variant="primary" onClick={handleConvert} loading={processing}>
            Convert to PowerPoint
          </Button>
        </div>
      )}

      {processing && <ProcessingProgress progress={progress} statusText={statusText} />}
      {error && <ErrorState message={error} />}
      {pptxBlob && !processing && (
        <DownloadButton
          filename={`${file?.name.replace(/\.[^/.]+$/, '') || 'Presentation'}.pptx`}
          fileSize={pptxBlob.size}
          onDownload={() => {
            downloadService.downloadBlob(
              pptxBlob,
              `${file?.name.replace(/\.[^/.]+$/, '') || 'Presentation'}.pptx`
            );
          }}
          onReset={() => setPptxBlob(null)}
        />
      )}
    </div>
  );
};

/* =========================================================================
   5. PDF TO HTML
   ========================================================================= */
export const PDFToHTMLView: React.FC = () => {
  const [file, setFile] = useState<PDFFile | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [htmlCode, setHtmlCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buffer = await f.arrayBuffer();
    setFile({ id: 'p2h', file: f, name: f.name, size: f.size, buffer });
    setHtmlCode(null);
  };

  const handleConvert = async () => {
    if (!file?.buffer) return;
    setProcessing(true);
    setProgress(0);
    try {
      const code = await htmlService.pdfToHtml(file.buffer, (pct, msg) => {
        setProgress(pct);
        setStatusText(msg);
      });
      setHtmlCode(code);
    } catch (e: any) {
      setError(e?.message || 'Failed to convert PDF to HTML.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Globe className="w-6 h-6 text-brand-600" />
          PDF to HTML
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Export PDF text structure into clean, responsive HTML web pages.
        </p>
      </div>

      {!file ? (
        <FileDropzone onFilesSelected={handleFile} title="Drop PDF to convert to HTML" />
      ) : (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{file.name}</p>
            <p className="text-[11px] text-slate-500">Ready to export web HTML</p>
          </div>
          <Button size="md" variant="primary" onClick={handleConvert} loading={processing}>
            Convert to HTML
          </Button>
        </div>
      )}

      {processing && <ProcessingProgress progress={progress} statusText={statusText} />}
      {error && <ErrorState message={error} />}
      {htmlCode && !processing && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={() => downloadService.downloadText(htmlCode, `${file?.name.replace(/\.[^/.]+$/, '') || 'page'}.html`)}
            >
              Download HTML File
            </Button>
          </div>
          <textarea
            rows={8}
            readOnly
            value={htmlCode}
            className="w-full font-mono text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3"
          />
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   6. PDF TO AUDIO (TTS)
   ========================================================================= */
export const PDFToAudioView: React.FC = () => {
  const [file, setFile] = useState<PDFFile | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [speaking, setSpeaking] = useState(false);
  const [rate, setRate] = useState(1.0);
  const [processing, setProcessing] = useState(false);

  const handleFile = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buffer = await f.arrayBuffer();
    setFile({ id: 'p2a', file: f, name: f.name, size: f.size, buffer });
    setProcessing(true);

    try {
      const doc = await pdfJsService.loadDocument(buffer);
      const text = await pdfJsService.extractText(doc);
      setExtractedText(text);
    } catch {
      //
    } finally {
      setProcessing(false);
    }
  };

  const playSpeech = () => {
    if (!extractedText) return;
    audioService.speak(extractedText, {
      rate,
      onEnd: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
    setSpeaking(true);
  };

  const stopSpeech = () => {
    audioService.stop();
    setSpeaking(false);
  };

  useEffect(() => {
    return () => {
      audioService.stop();
    };
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Volume2 className="w-6 h-6 text-brand-600" />
          PDF to Audio (Text-to-Speech)
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Listen to your document read aloud in high quality with natural browser speech synthesis.
        </p>
      </div>

      {!file ? (
        <FileDropzone onFilesSelected={handleFile} title="Drop PDF to listen to audio" />
      ) : (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{file.name}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Speed:</span>
              <select
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value))}
                className="text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-1"
              >
                <option value="0.8">0.8x</option>
                <option value="1.0">1.0x (Normal)</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 py-4">
            {!speaking ? (
              <Button size="lg" variant="primary" icon={<Play className="w-5 h-5 fill-white" />} onClick={playSpeech}>
                Play Audio
              </Button>
            ) : (
              <Button size="lg" variant="danger" icon={<Square className="w-5 h-5 fill-white" />} onClick={stopSpeech}>
                Stop Audio
              </Button>
            )}
          </div>

          <textarea
            rows={6}
            readOnly
            value={extractedText}
            className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 leading-relaxed text-slate-600 dark:text-slate-400"
          />
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   7. PDF TO EPUB
   ========================================================================= */
export const PDFToEPUBView: React.FC = () => {
  const [file, setFile] = useState<PDFFile | null>(null);
  const [epubBlob, setEpubBlob] = useState<Blob | null>(null);

  const handleConvert = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buffer = await f.arrayBuffer();
    setFile({ id: 'p2ep', file: f, name: f.name, size: f.size, buffer });

    const doc = await pdfJsService.loadDocument(buffer);
    const text = await pdfJsService.extractText(doc);

    // Simple EPUB container
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    zip.file('mimetype', 'application/epub+zip');
    zip.file(
      'META-INF/container.xml',
      `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`
    );
    zip.file('OEBPS/content.xhtml', `<html><body><h1>${f.name}</h1><p>${text.replace(/\n/g, '<br/>')}</p></body></html>`);

    const blob = await zip.generateAsync({ type: 'blob' });
    setEpubBlob(blob);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Book className="w-6 h-6 text-brand-600" />
          PDF to EPUB
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Convert PDF documents into standard EPUB ebook format for e-readers.
        </p>
      </div>

      {!file ? (
        <FileDropzone onFilesSelected={handleConvert} title="Drop PDF to convert to EPUB" />
      ) : null}

      {epubBlob && (
        <DownloadButton
          filename={`${file?.name.replace(/\.[^/.]+$/, '') || 'eBook'}.epub`}
          fileSize={epubBlob.size}
          onDownload={() => {
            downloadService.downloadBlob(epubBlob, `${file?.name.replace(/\.[^/.]+$/, '') || 'eBook'}.epub`);
          }}
          onReset={() => {
            setFile(null);
            setEpubBlob(null);
          }}
        />
      )}
    </div>
  );
};

/* =========================================================================
   8. EXTRACT TEXT
   ========================================================================= */
export const ExtractTextView: React.FC = () => {
  const [file, setFile] = useState<PDFFile | null>(null);
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleFile = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buffer = await f.arrayBuffer();
    setFile({ id: 'xt', file: f, name: f.name, size: f.size, buffer });
    setProcessing(true);

    try {
      const doc = await pdfJsService.loadDocument(buffer);
      const extracted = await pdfJsService.extractText(doc);
      setText(extracted);
    } catch {
      //
    } finally {
      setProcessing(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <FileOutput className="w-6 h-6 text-brand-600" />
          Extract Text
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Pull all raw or formatted text from PDF pages with 1 click. Copy or download as TXT.
        </p>
      </div>

      {!file ? (
        <FileDropzone onFilesSelected={handleFile} title="Drop PDF to extract text" />
      ) : (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Extracted Text ({text.length} characters)
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                icon={copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                onClick={copyToClipboard}
              >
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </Button>
              <Button
                size="sm"
                variant="primary"
                icon={<Download className="w-3.5 h-3.5" />}
                onClick={() => downloadService.downloadText(text, `${file.name.replace(/\.[^/.]+$/, '')}_text.txt`)}
              >
                Download TXT
              </Button>
            </div>
          </div>

          <textarea
            rows={12}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full font-mono text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 leading-relaxed"
          />
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   9. EXTRACT IMAGES FROM PDF
   ========================================================================= */
export const ExtractImagesView: React.FC = () => {
  const [file, setFile] = useState<PDFFile | null>(null);
  const [images, setImages] = useState<ExtractedImage[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');

  const handleFile = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buffer = await f.arrayBuffer();
    setFile({ id: 'xi', file: f, name: f.name, size: f.size, buffer });
    setProcessing(true);
    setProgress(0);

    try {
      const doc = await pdfJsService.loadDocument(buffer);
      const extracted = await pdfJsService.extractImages(doc, (pct, msg) => {
        setProgress(pct);
        setStatusText(msg);
      });
      setImages(extracted);
    } catch {
      //
    } finally {
      setProcessing(false);
    }
  };

  const downloadAll = async () => {
    if (images.length === 0) return;
    await downloadService.downloadZip(
      images.map((im) => ({ filename: im.name, blob: im.blob })),
      `${file?.name.replace(/\.[^/.]+$/, '') || 'document'}_extracted_images.zip`
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Camera className="w-6 h-6 text-brand-600" />
          Extract Images from PDF
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Detect and extract all embedded photos, diagrams, and illustrations inside the PDF.
        </p>
      </div>

      {!file ? (
        <FileDropzone onFilesSelected={handleFile} title="Drop PDF to scan for embedded images" />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{file.name}</p>
              <p className="text-[11px] text-slate-500">{images.length} images extracted</p>
            </div>
            {images.length > 0 && (
              <Button size="md" variant="primary" icon={<Archive className="w-4 h-4" />} onClick={downloadAll}>
                Download All Images (ZIP)
              </Button>
            )}
          </div>

          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {images.map((img, i) => (
                <div key={i} className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
                  <div className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden flex items-center justify-center">
                    <img src={URL.createObjectURL(img.blob)} alt={img.name} className="w-full h-full object-contain" />
                  </div>
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-mono text-slate-500 truncate">{img.name}</span>
                    <button
                      onClick={() => downloadService.downloadBlob(img.blob, img.name)}
                      className="p-1 rounded text-brand-600 hover:bg-brand-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {processing && <ProcessingProgress progress={progress} statusText={statusText} />}
    </div>
  );
};

/* =========================================================================
   10. PDF TO ZIP
   ========================================================================= */
export const PDFToZIPView: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);

  const handleZip = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    try {
      const items: DownloadItem[] = files.map((f) => ({
        filename: f.name,
        blob: f,
      }));
      await downloadService.downloadZip(items, 'PDF_Package.zip');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Archive className="w-6 h-6 text-brand-600" />
          PDF to ZIP Package
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Bundle multiple PDF files into a single compressed ZIP archive.
        </p>
      </div>

      <FileDropzone
        multiple
        onFilesSelected={(f) => setFiles((prev) => [...prev, ...f])}
        title="Drop PDFs to package into ZIP"
      />

      {files.length > 0 && (
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-600 dark:text-slate-400">
            {files.length} files selected
          </span>
          <Button size="md" variant="primary" onClick={handleZip} loading={processing}>
            Download ZIP Archive
          </Button>
        </div>
      )}
    </div>
  );
};
