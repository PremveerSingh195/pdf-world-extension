import JSZip from 'jszip';

export interface DownloadItem {
  blob: Blob;
  filename: string;
}

export const downloadService = {
  /**
   * Download a single Blob as a file
   */
  downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);

    if (typeof chrome !== 'undefined' && chrome.downloads && chrome.downloads.download) {
      chrome.downloads.download(
        {
          url,
          filename,
          saveAs: false,
        },
        () => {
          setTimeout(() => URL.revokeObjectURL(url), 10000);
        }
      );
      return;
    }

    // Standard browser fallback
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  },

  /**
   * Package multiple items into a ZIP and download
   */
  async downloadZip(items: DownloadItem[], zipFilename: string): Promise<void> {
    const zip = new JSZip();
    for (const item of items) {
      zip.file(item.filename, item.blob);
    }
    const content = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });
    this.downloadBlob(content, zipFilename);
  },

  /**
   * Download string text as file
   */
  downloadText(text: string, filename: string): void {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    this.downloadBlob(blob, filename);
  },
};
