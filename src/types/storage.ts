import { WorkflowPreset } from './workflow';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface UserPreferences {
  theme: ThemeMode;
  defaultCompressionLevel: 'low' | 'medium' | 'high';
  defaultPageNumberFormat: 'n' | 'page_n' | 'page_n_of_total';
  defaultWatermarkText: string;
  defaultWatermarkOpacity: number;
  autoDownloadAfterProcess: boolean;
  clearFilesAfterDownload: boolean;
}

export interface ExtensionStorageData {
  theme: ThemeMode;
  preferences: UserPreferences;
  recentTools: string[];
  favorites: string[];
  savedWorkflows: WorkflowPreset[];
}
