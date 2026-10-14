import { defineConfig } from 'vite';

export default defineConfig({
  // relative asset paths so the built site works from any folder or static host
  base: './',
  build: {
    // three.js alone is ~700 kB; that's expected for a 3D site
    chunkSizeWarningLimit: 1200,
  },
});
