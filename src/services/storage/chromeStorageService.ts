import { ExtensionStorageData, ThemeMode, UserPreferences } from '@/types/storage';
import { WorkflowPreset } from '@/types/workflow';

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  defaultCompressionLevel: 'medium',
  defaultPageNumberFormat: 'page_n_of_total',
  defaultWatermarkText: 'CONFIDENTIAL',
  defaultWatermarkOpacity: 0.3,
  autoDownloadAfterProcess: false,
  clearFilesAfterDownload: false,
};

const DEFAULT_STORAGE: ExtensionStorageData = {
  theme: 'system',
  preferences: DEFAULT_PREFERENCES,
  recentTools: ['merge', 'split', 'compress', 'organize', 'edit', 'sign'],
  favorites: ['merge', 'split', 'compress', 'sign', 'workflow'],
  savedWorkflows: [
    {
      id: 'default-clean-protect',
      name: 'Clean & Watermark Standard',
      description: 'Remove metadata, add CONFIDENTIAL watermark, and add page numbers',
      createdAt: Date.now(),
      nodes: [
        {
          id: 'node-1',
          type: 'watermark',
          title: 'Add Watermark',
          description: 'Stamp CONFIDENTIAL watermark across all pages',
          config: { text: 'CONFIDENTIAL', opacity: 0.25, rotation: 45, color: '#ef4444' },
          enabled: true,
        },
        {
          id: 'node-2',
          type: 'pageNumbers',
          title: 'Add Page Numbers',
          description: 'Bottom right page numbers',
          config: { position: 'bottom-right', format: 'page_n_of_total' },
          enabled: true,
        },
        {
          id: 'node-3',
          type: 'compress',
          title: 'Compress Document',
          description: 'Optimize PDF file size',
          config: { level: 'medium' },
          enabled: true,
        },
      ],
    },
  ],
};

const isChromeStorageAvailable = (): boolean => {
  return typeof chrome !== 'undefined' && !!chrome.storage && !!chrome.storage.local;
};

export const chromeStorageService = {
  async getAll(): Promise<ExtensionStorageData> {
    if (isChromeStorageAvailable()) {
      return new Promise((resolve) => {
        chrome.storage.local.get(null, (rawItems: Record<string, any>) => {
          const items = rawItems || {};
          resolve({
            theme: items.theme || DEFAULT_STORAGE.theme,
            preferences: { ...DEFAULT_PREFERENCES, ...(items.preferences || {}) },
            recentTools: items.recentTools || DEFAULT_STORAGE.recentTools,
            favorites: items.favorites || DEFAULT_STORAGE.favorites,
            savedWorkflows: items.savedWorkflows || DEFAULT_STORAGE.savedWorkflows,
          });
        });
      });
    }

    // LocalStorage fallback for preview/development
    try {
      const stored = localStorage.getItem('pdf_toolbox_storage');
      if (stored) {
        return { ...DEFAULT_STORAGE, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Storage read fallback error:', e);
    }
    return DEFAULT_STORAGE;
  },

  async set<K extends keyof ExtensionStorageData>(key: K, value: ExtensionStorageData[K]): Promise<void> {
    if (isChromeStorageAvailable()) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: value }, () => resolve());
      });
    }

    // LocalStorage fallback
    try {
      const all = await this.getAll();
      all[key] = value;
      localStorage.setItem('pdf_toolbox_storage', JSON.stringify(all));
    } catch (e) {
      console.warn('Storage write fallback error:', e);
    }
  },

  async addRecentTool(toolId: string): Promise<string[]> {
    const all = await this.getAll();
    const filtered = all.recentTools.filter((id) => id !== toolId);
    const updated = [toolId, ...filtered].slice(0, 10);
    await this.set('recentTools', updated);
    return updated;
  },

  async toggleFavorite(toolId: string): Promise<string[]> {
    const all = await this.getAll();
    const exists = all.favorites.includes(toolId);
    const updated = exists ? all.favorites.filter((id) => id !== toolId) : [...all.favorites, toolId];
    await this.set('favorites', updated);
    return updated;
  },

  async saveWorkflow(workflow: WorkflowPreset): Promise<WorkflowPreset[]> {
    const all = await this.getAll();
    const existingIndex = all.savedWorkflows.findIndex((w) => w.id === workflow.id);
    let updated: WorkflowPreset[];
    if (existingIndex >= 0) {
      updated = [...all.savedWorkflows];
      updated[existingIndex] = workflow;
    } else {
      updated = [workflow, ...all.savedWorkflows];
    }
    await this.set('savedWorkflows', updated);
    return updated;
  },

  async deleteWorkflow(workflowId: string): Promise<WorkflowPreset[]> {
    const all = await this.getAll();
    const updated = all.savedWorkflows.filter((w) => w.id !== workflowId);
    await this.set('savedWorkflows', updated);
    return updated;
  },

  async setTheme(theme: ThemeMode): Promise<void> {
    await this.set('theme', theme);
  },
};
