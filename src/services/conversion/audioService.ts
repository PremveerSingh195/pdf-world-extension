import { jsPDF } from 'jspdf';

export interface TTSState {
  speaking: boolean;
  paused: boolean;
  currentText: string;
}

export const audioService = {
  /**
   * Check Web Speech API SpeechSynthesis support
   */
  isTtsSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  },

  /**
   * Check Web Speech API SpeechRecognition support
   */
  isRecognitionSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
    );
  },

  /**
   * Get available browser voices
   */
  getVoices(): SpeechSynthesisVoice[] {
    if (!this.isTtsSupported()) return [];
    return window.speechSynthesis.getVoices();
  },

  /**
   * Play speech from text
   */
  speak(
    text: string,
    options?: {
      voice?: SpeechSynthesisVoice;
      rate?: number;
      pitch?: number;
      onEnd?: () => void;
      onError?: (e: any) => void;
    }
  ): SpeechSynthesisUtterance | null {
    if (!this.isTtsSupported()) return null;

    window.speechSynthesis.cancel(); // Stop any pending speech

    const utterance = new SpeechSynthesisUtterance(text);
    if (options?.voice) utterance.voice = options.voice;
    utterance.rate = options?.rate || 1.0;
    utterance.pitch = options?.pitch || 1.0;

    if (options?.onEnd) utterance.onend = options.onEnd;
    if (options?.onError) utterance.onerror = options.onError;

    window.speechSynthesis.speak(utterance);
    return utterance;
  },

  pause(): void {
    if (this.isTtsSupported()) window.speechSynthesis.pause();
  },

  resume(): void {
    if (this.isTtsSupported()) window.speechSynthesis.resume();
  },

  stop(): void {
    if (this.isTtsSupported()) window.speechSynthesis.cancel();
  },

  /**
   * Convert Audio Transcript / text notes into a clean PDF document
   */
  transcriptToPdf(
    transcript: string,
    metadata?: { title?: string; speaker?: string; date?: string }
  ): Uint8Array {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
    });

    const margin = 40;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const contentWidth = pageWidth - margin * 2;

    // Header
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.setTextColor(15, 23, 42);
    pdf.text(metadata?.title || 'Audio Transcript Document', margin, 50);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(100, 116, 139);
    const dateStr = metadata?.date || new Date().toLocaleString();
    const speakerStr = metadata?.speaker ? `Speaker: ${metadata.speaker}  •  ` : '';
    pdf.text(`${speakerStr}Recorded: ${dateStr}`, margin, 68);

    pdf.setDrawColor(226, 232, 240);
    pdf.line(margin, 78, pageWidth - margin, 78);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10.5);
    pdf.setTextColor(51, 65, 85);

    const lines = pdf.splitTextToSize(transcript || '(No transcript content recorded)', contentWidth);
    let curY = 100;

    for (let i = 0; i < lines.length; i++) {
      if (curY > pdf.internal.pageSize.getHeight() - margin) {
        pdf.addPage();
        curY = 50;
      }
      pdf.text(lines[i], margin, curY);
      curY += 16;
    }

    return new Uint8Array(pdf.output('arraybuffer'));
  },
};
