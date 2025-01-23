import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
      babel: {
        plugins: ['@babel/plugin-transform-runtime'],
        presets: ['@babel/preset-env']
      }
    }),
    tsconfigPaths()
  ],

  server: {
    port: 3000,
    strictPort: true,
    host: true,
    cors: true,
    hmr: {
      overlay: true
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },

  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
    target: 'esnext',
    chunkSizeWarningLimit: 1000,
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          chart: ['chart.js', 'react-chartjs-2'],
          ui: ['@mui/material', '@mui/icons-material'],
          utils: ['lodash', 'axios', 'date-fns']
        }
      }
    }
  },

  preview: {
    port: 3000,
    strictPort: true,
    host: true
  },

  resolve: {
    alias: {
      '@': '/src',
      '@components': '/src/components',
      '@pages': '/src/pages',
      '@services': '/src/services',
      '@utils': '/src/utils',
      '@hooks': '/src/hooks',
      '@store': '/src/store',
      '@styles': '/src/styles',
      '@assets': '/src/assets',
      '@interfaces': '/src/interfaces',
      '@config': '/src/config'
    }
  },

  css: {
    modules: {
      localsConvention: 'camelCase',
      scopeBehaviour: 'local',
      generateScopedName: '[name]__[local]___[hash:base64:5]'
    },
    preprocessorOptions: {
      scss: {
        additionalData: '@import "@styles/variables.css";',
        sourceMap: true
      }
    },
    postcss: {
      plugins: [require('autoprefixer'), require('cssnano')]
    }
  },

  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'chart.js',
      'react-chartjs-2',
      '@mui/material',
      '@mui/icons-material',
      'lodash',
      'axios',
      'date-fns'
    ],
    exclude: ['@fsouza/prettierd'],
    esbuildOptions: {
      target: 'esnext'
    }
  }
});