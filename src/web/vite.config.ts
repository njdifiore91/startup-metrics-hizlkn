import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths()
  ],
  server: {
    port: 3000,
    strictPort: true,
    host: true,
    cors: true,
    hmr: {
      overlay: true,
      clientPort: 3000,
      protocol: 'ws',
    },
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
});
