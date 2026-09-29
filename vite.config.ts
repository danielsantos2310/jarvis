import { defineConfig } from 'vite';
export default defineConfig(({ mode }) => ({
  root: 'src/web',
  base: mode === 'demo' ? './' : '/',
  define: { __JARVIS_DEMO__: JSON.stringify(mode === 'demo') },
  esbuild: { jsx: 'automatic' },
  build: { outDir: mode === 'demo' ? '../../dist-demo' : '../../dist', emptyOutDir: true },
  plugins: mode === 'demo' ? [{ name: 'static-demo-policy', generateBundle() { this.emitFile({type:'asset', fileName:'.nojekyll', source:''}); }, transformIndexHtml(html: string) {
    return html.replace('<title>JARVIS · Local workspace</title>', '<title>JARVIS · Interactive preview</title><meta name="robots" content="noindex"/><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'self\'; style-src \'self\'; img-src \'self\' data:; font-src \'self\'; connect-src \'none\'; base-uri \'self\'; form-action \'none\'; object-src \'none\'"/>');
  } }] : [],
}));
