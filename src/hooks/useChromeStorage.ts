import { useState, useEffect, useCallback } from 'react';
import { ExtensionStorageData } from '@/types/storage';
import { WorkflowPreset } from '@/types/workflow';
import { chromeStorageService } from '@/services/storage/chromeStorageService';

export function useChromeStorage() {
  const [data, setData] = useState<ExtensionStorageData | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const stored = await chromeStorageService.getAll();
      setData(stored);
    } catch (e) {
      console.warn('Storage fetch failed:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addRecent = async (toolId: string) => {
    const updated = await chromeStorageService.addRecentTool(toolId);
    setData((prev) => (prev ? { ...prev, recentTools: updated } : null));
  };

  const toggleFavorite = async (toolId: string) => {
    const updated = await chromeStorageService.toggleFavorite(toolId);
    setData((prev) => (prev ? { ...prev, favorites: updated } : null));
  };

  const saveWorkflow = async (preset: WorkflowPreset) => {
    const updated = await chromeStorageService.saveWorkflow(preset);
    setData((prev) => (prev ? { ...prev, savedWorkflows: updated } : null));
  };

  const deleteWorkflow = async (id: string) => {
    const updated = await chromeStorageService.deleteWorkflow(id);
    setData((prev) => (prev ? { ...prev, savedWorkflows: updated } : null));
  };

  return {
    storage: data,
    loading,
    refresh,
    addRecent,
    toggleFavorite,
    saveWorkflow,
    deleteWorkflow,
  };
}
