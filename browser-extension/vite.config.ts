import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
//import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    react(),
    /* visualizer({
      open: true,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    }), */
    viteCompression({
      algorithm: 'brotliCompress',
    })
  ],
  build: {
    sourcemap: true,
    
  }
})
