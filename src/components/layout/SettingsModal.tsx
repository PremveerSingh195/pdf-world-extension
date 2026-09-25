import React from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { ThemeMode, UserPreferences } from '@/types/storage';
import { ShieldCheck, Palette, FileText, Download } from 'lucide-react';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeMode;
  onThemeChange: (t: ThemeMode) => void;
  preferences?: UserPreferences;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  theme,
  onThemeChange,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Settings & Privacy"
      description="Configure extension defaults and verify privacy status."
      maxWidth="md"
    >
      <div className="space-y-6">
        {/* Privacy Notice Banner */}
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
            <strong className="block font-semibold">100% Local Device Processing</strong>
            Your PDF documents never leave your computer. All rendering, compression, text extraction,
            and manipulation run strictly client-side inside this extension session.
          </div>
        </div>

        {/* Theme Settings */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Interface Theme
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'light', label: 'Light' },
              { id: 'dark', label: 'Dark' },
              { id: 'system', label: 'System' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onThemeChange(t.id as any)}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                  theme === t.id
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-600'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Compression Default */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Default Compression Level
          </label>
          <select className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2">
            <option value="medium">Medium (Recommended Balance)</option>
            <option value="low">Low (Fast stream Deflate)</option>
            <option value="high">High (Maximum size reduction)</option>
          </select>
        </div>

        {/* Watermark Default */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Default Watermark Stamp Text
          </label>
          <input
            type="text"
            defaultValue="CONFIDENTIAL"
            className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
          />
        </div>

        <div className="pt-2 flex justify-end">
          <Button variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
};
