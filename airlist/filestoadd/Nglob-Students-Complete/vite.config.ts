import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [solid({ ssr: true })],
  base: './',
  build: {
    target: 'es2022',
    outDir: 'preview',
    cssCodeSplit: false,
    // One browser bundle also works when OPEN_PREVIEW.html is opened from disk.
    // The server build keeps ESM exports for prerendering.
    rollupOptions: isSsrBuild ? undefined : {
      output: { format: 'iife' },
    },
  },
}));
