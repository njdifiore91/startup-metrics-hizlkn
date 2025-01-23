import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
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
  define: {
    'process.env': process.env,
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
  experimental: {
    renderBuiltUrl(filename: string, { hostType }) {
      if (hostType === 'html') {
        // Replace environment variables in HTML
        if (filename.includes('%VITE_GOOGLE_CLIENT_ID%')) {
          return process.env.VITE_GOOGLE_CLIENT_ID || '';
        }
      }
      return filename;
    },
  },
});
