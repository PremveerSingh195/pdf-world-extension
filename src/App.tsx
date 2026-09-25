import React, { useState, useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { useChromeStorage } from '@/hooks/useChromeStorage';
import { useToast } from '@/hooks/useToast';
import { Topbar } from '@/components/layout/Topbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { SettingsModal } from '@/components/layout/SettingsModal';
import { ToastContainer } from '@/components/common/ToastContainer';
import { DashboardView } from '@/features/dashboard/DashboardView';
import { ToolDispatcher } from '@/features/tools/ToolDispatcher';
import { PDF_TOOLS, getToolById } from '@/services/tools/pdfTools';

export const App: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { storage, addRecent } = useChromeStorage();
  const { toasts, removeToast } = useToast();

  const [currentToolId, setCurrentToolId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Sync route with window hash (e.g. #/merge or #/workflow)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '').trim();
      if (hash && getToolById(hash)) {
        setCurrentToolId(hash);
      } else if (!hash) {
        setCurrentToolId(null);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleSelectTool = (toolId: string | null) => {
    setCurrentToolId(toolId);
    if (toolId) {
      window.location.hash = `#/${toolId}`;
      addRecent(toolId);
    } else {
      window.location.hash = '';
    }
    setSearchQuery('');
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        searchInput?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const currentTool = currentToolId ? getToolById(currentToolId) || null : null;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Navigation Bar */}
      <Topbar
        currentTool={currentTool}
        onHomeClick={() => handleSelectTool(null)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        theme={theme}
        onThemeChange={setTheme}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Workspace with Sidebar */}
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          currentToolId={currentToolId}
          onSelectTool={handleSelectTool}
          favorites={storage?.favorites || []}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          {currentToolId ? (
            <div className="animate-fade-in">
              <ToolDispatcher toolId={currentToolId} />
            </div>
          ) : (
            <div className="animate-fade-in">
              <DashboardView
                onSelectTool={handleSelectTool}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            </div>
          )}
        </main>
      </div>

      {/* Global Modals & Notifications */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        onThemeChange={setTheme}
        preferences={storage?.preferences}
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};
