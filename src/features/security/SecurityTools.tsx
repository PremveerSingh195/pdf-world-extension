import React, { useState } from 'react';
import { PDFFile } from '@/types/pdf';
import { securityService } from '@/services/security/securityService';
import { pdfLibService } from '@/services/pdf/pdfLibService';
import { downloadService } from '@/services/download/downloadService';
import { FileDropzone } from '@/components/common/FileDropzone';
import { ProcessingProgress } from '@/components/common/ProcessingProgress';
import { DownloadButton } from '@/components/common/DownloadButton';
import { ErrorState } from '@/components/common/StateViews';
import { Button } from '@/components/common/Button';
import { Lock, Unlock, KeyRound, Info } from 'lucide-react';

/* =========================================================================
   1. ENCRYPT PDF
   ========================================================================= */
export const EncryptPDFView: React.FC = () => {
  const [file, setFile] = useState<PDFFile | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [processing, setProcessing] = useState(false);
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buffer = await f.arrayBuffer();
    setFile({ id: 'enc-f', file: f, name: f.name, size: f.size, buffer });
    setOutputBytes(null);
  };

  const handleEncrypt = async () => {
    if (!file?.buffer) return;
    if (!password) {
      setError('Please enter a password.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError(null);
    setProcessing(true);

    try {
      const res = await securityService.encrypt(file.buffer, password);
      setOutputBytes(res);
    } catch (e: any) {
      setError(e?.message || 'Encryption failed.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Lock className="w-6 h-6 text-brand-600" />
          Encrypt PDF
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Protect sensitive PDF files with password encryption and security markers.
        </p>
      </div>

      {!file ? (
        <FileDropzone onFilesSelected={handleFile} title="Drop PDF to password protect" />
      ) : (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100 dark:border-slate-800">
            <span>File: <strong>{file.name}</strong></span>
            <button onClick={() => setFile(null)} className="text-brand-600 hover:underline">Change</button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Choose Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
              placeholder="Enter strong password"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
              placeholder="Re-enter password"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button size="md" variant="primary" onClick={handleEncrypt} loading={processing}>
              Protect Document
            </Button>
          </div>
        </div>
      )}

      {error && <ErrorState message={error} />}
      {outputBytes && !processing && (
        <DownloadButton
          filename={`Protected_${file?.name || 'Document.pdf'}`}
          fileSize={outputBytes.byteLength}
          onDownload={() => {
            const blob = new Blob([outputBytes as any], { type: 'application/pdf' });
            downloadService.downloadBlob(blob, `Protected_${file?.name || 'Document.pdf'}`);
          }}
          onReset={() => setOutputBytes(null)}
        />
      )}
    </div>
  );
};

/* =========================================================================
   2. REMOVE PASSWORD / UNLOCK PDF
   ========================================================================= */
export const UnlockPDFView: React.FC = () => {
  const [file, setFile] = useState<PDFFile | null>(null);
  const [password, setPassword] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buffer = await f.arrayBuffer();
    setFile({ id: 'unl-f', file: f, name: f.name, size: f.size, buffer });
    setOutputBytes(null);
  };

  const handleUnlock = async () => {
    if (!file?.buffer) return;
    if (!password) {
      setError('Please provide the document password.');
      return;
    }
    setError(null);
    setProcessing(true);
    setProgress(0);

    try {
      const res = await securityService.unlock(file.buffer, password, (pct, msg) => {
        setProgress(pct);
        setStatusText(msg);
      });
      setOutputBytes(res);
    } catch (e: any) {
      setError(e?.message || 'Incorrect password or failed to decrypt document.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Unlock className="w-6 h-6 text-brand-600" />
          Unlock / Remove Password
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Enter the master password to decrypt and produce an unrestricted, unlocked copy of the PDF.
        </p>
      </div>

      {!file ? (
        <FileDropzone onFilesSelected={handleFile} title="Drop password-protected PDF here" />
      ) : (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100 dark:border-slate-800">
            <span>Document: <strong>{file.name}</strong></span>
            <button onClick={() => setFile(null)} className="text-brand-600 hover:underline">Change</button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Document Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
              placeholder="Enter password"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button size="md" variant="primary" onClick={handleUnlock} loading={processing}>
              Decrypt & Unlock PDF
            </Button>
          </div>
        </div>
      )}

      {processing && <ProcessingProgress progress={progress} statusText={statusText} />}
      {error && <ErrorState message={error} />}
      {outputBytes && !processing && (
        <DownloadButton
          filename={`Unlocked_${file?.name || 'Document.pdf'}`}
          fileSize={outputBytes.byteLength}
          onDownload={() => {
            const blob = new Blob([outputBytes as any], { type: 'application/pdf' });
            downloadService.downloadBlob(blob, `Unlocked_${file?.name || 'Document.pdf'}`);
          }}
          onReset={() => setOutputBytes(null)}
        />
      )}
    </div>
  );
};

export const RemovePasswordView = UnlockPDFView;

/* =========================================================================
   3. EDIT METADATA
   ========================================================================= */
export const EditMetadataView: React.FC = () => {
  const [file, setFile] = useState<PDFFile | null>(null);
  const [metadata, setMetadata] = useState<{
    title: string;
    author: string;
    subject: string;
    keywords: string;
    creator: string;
    producer: string;
  }>({
    title: '',
    author: '',
    subject: '',
    keywords: '',
    creator: '',
    producer: '',
  });
  const [processing, setProcessing] = useState(false);
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buffer = await f.arrayBuffer();
    setFile({ id: 'meta-f', file: f, name: f.name, size: f.size, buffer });
    setOutputBytes(null);

    try {
      const meta = await pdfLibService.getMetadata(buffer);
      setMetadata({
        title: meta.title || '',
        author: meta.author || '',
        subject: meta.subject || '',
        keywords: meta.keywords || '',
        creator: meta.creator || '',
        producer: meta.producer || '',
      });
    } catch {
      //
    }
  };

  const handleSave = async () => {
    if (!file?.buffer) return;
    setProcessing(true);
    try {
      const res = await pdfLibService.updateMetadata(file.buffer, {
        title: metadata.title,
        author: metadata.author,
        subject: metadata.subject,
        keywords: metadata.keywords.split(',').map((s) => s.trim()).filter(Boolean),
        creator: metadata.creator,
        producer: metadata.producer,
      });
      setOutputBytes(res);
    } catch (e: any) {
      setError(e?.message || 'Failed to update metadata.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Info className="w-6 h-6 text-brand-600" />
          Edit PDF Metadata
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Inspect, update, or clear Title, Author, Subject, Keywords, and Creator properties.
        </p>
      </div>

      {!file ? (
        <FileDropzone onFilesSelected={handleFile} title="Drop PDF to edit metadata" />
      ) : (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Title</label>
              <input
                type="text"
                value={metadata.title}
                onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Author</label>
              <input
                type="text"
                value={metadata.author}
                onChange={(e) => setMetadata({ ...metadata, author: e.target.value })}
                className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Subject</label>
              <input
                type="text"
                value={metadata.subject}
                onChange={(e) => setMetadata({ ...metadata, subject: e.target.value })}
                className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Keywords</label>
              <input
                type="text"
                value={metadata.keywords}
                onChange={(e) => setMetadata({ ...metadata, keywords: e.target.value })}
                placeholder="Comma separated"
                className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button size="md" variant="primary" onClick={handleSave} loading={processing}>
              Save Metadata
            </Button>
          </div>
        </div>
      )}

      {error && <ErrorState message={error} />}
      {outputBytes && !processing && (
        <DownloadButton
          filename={`Updated_${file?.name || 'Document.pdf'}`}
          fileSize={outputBytes.byteLength}
          onDownload={() => {
            const blob = new Blob([outputBytes as any], { type: 'application/pdf' });
            downloadService.downloadBlob(blob, `Updated_${file?.name || 'Document.pdf'}`);
          }}
          onReset={() => setOutputBytes(null)}
        />
      )}
    </div>
  );
};
