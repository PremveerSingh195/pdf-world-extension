import { useState, useEffect } from 'react';
import { ThemeMode } from '@/types/storage';
import { chromeStorageService } from '@/services/storage/chromeStorageService';

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>('system');

  useEffect(() => {
    // Load initial theme from storage
    chromeStorageService.getAll().then((data) => {
      if (data.theme) {
        setThemeState(data.theme);
        applyTheme(data.theme);
      }
    });

    // Listen for system theme changes if set to system
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      chromeStorageService.getAll().then((data) => {
        if (data.theme === 'system') {
          applyTheme('system');
        }
      });
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, []);

  const applyTheme = (mode: ThemeMode) => {
    const isDark =
      mode === 'dark' ||
      (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const setTheme = async (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
    await chromeStorageService.setTheme(newTheme);
  };

  return { theme, setTheme };
}
