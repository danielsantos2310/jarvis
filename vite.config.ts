import { defineConfig } from 'vite';
export default defineConfig({
  root: 'src/web',
  esbuild: { jsx: 'automatic' },
  build: { outDir: '../../dist', emptyOutDir: true },
});
