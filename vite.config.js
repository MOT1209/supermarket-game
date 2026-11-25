import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { port: 5173, open: true },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Keep the heavy 3D engine in its own cacheable chunk.
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
        }
      }
    }
  }
});
