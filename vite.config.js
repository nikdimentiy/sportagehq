import { defineConfig } from 'vite';

export default defineConfig({
  base: '/sportagehq/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    open: true,
  },
});
