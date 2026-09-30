import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

/**
 * Vite plugin to strip all patterns Chrome Web Store flags as
 * "remotely hosted code" in Manifest V3 extensions.
 *
 * Problematic patterns (from core-js bundled by xlsx/SheetJS):
 *   - Function('return this')()   → globalThis
 *   - eval('require')             → undefined
 *   - (0, eval)('this')           → globalThis
 */
function mv3SafePlugin() {
  return {
    name: 'mv3-safe-plugin',
    // Apply during the renderChunk phase so we catch already-bundled code
    renderChunk(code: string) {
      let modified = code;

      // 1. Replace Function(`return this`)() — core-js global detection
      //    Matches both Function('return this')() and Function("return this")()
      //    and template-literal variants Function(`return this`)()
      modified = modified.replace(
        /Function\s*\(\s*[`'"]\s*return\s+this\s*[`'"]\s*\)\s*\(\s*\)/g,
        'globalThis'
      );

      // 2. Replace (0, eval)('this') — another global detection pattern
      modified = modified.replace(
        /\(\s*0\s*,\s*eval\s*\)\s*\(\s*[`'"]\s*this\s*[`'"]\s*\)/g,
        'globalThis'
      );

      // 3. Replace eval("require") or eval('require') — Node.js detection
      modified = modified.replace(
        /eval\s*\(\s*[`'"]\s*require\s*[`'"]\s*\)/g,
        'undefined'
      );

      if (modified !== code) {
        return { code: modified, map: null };
      }
      return null;
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), mv3SafePlugin()],
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        app: resolve(import.meta.dirname, 'app.html'),
        popup: resolve(import.meta.dirname, 'popup.html'),
        background: resolve(import.meta.dirname, 'src/background/index.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') {
            return 'background.js';
          }
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
});
