import { defineConfig } from 'vite'; // v4.0.0
import react from '@vitejs/plugin-react'; // v4.0.0
import tsconfigPaths from 'vite-tsconfig-paths'; // v4.0.0
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';

export default defineConfig({
  plugins: [
    react({
      // Enable Fast Refresh for rapid development
      include: '**/*.{jsx,tsx}',
      jsxRuntime: 'automatic',
      // Configure Babel plugins for enhanced compatibility
      babel: {
        plugins: ['@babel/plugin-transform-runtime'],
        presets: ['@babel/preset-env'],
      },
    }),
    // Enable TypeScript path aliases from tsconfig.json
    tsconfigPaths(),
    // tsconfigPaths({
    //   extensions: ['.ts', '.tsx', '.js', '.jsx']
    // })
  ],

  // Development server configuration
  server: {
    port: 3000,
    strictPort: true,
    host: true,
    cors: true,
    hmr: {
      overlay: true,
    },
    // API proxy configuration for development
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },

  // Production build configuration
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
    target: 'esnext',
    chunkSizeWarningLimit: 1000,
    // Terser optimization options
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    // Chunk splitting strategy for optimal loading
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          chart: ['chart.js', 'react-chartjs-2'],
          ui: ['@mui/material', '@mui/icons-material'],
          utils: ['lodash', 'axios', 'date-fns'],
        },
      },
    },
  },

  // Preview server configuration
  preview: {
    port: 3000,
    strictPort: true,
    host: true,
  },

  // Path resolution configuration
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
      '@config': '/src/config',
    },
  },

  // CSS processing configuration
  css: {
    modules: {
      localsConvention: 'camelCase',
      scopeBehaviour: 'local',
      generateScopedName: '[name]__[local]___[hash:base64:5]',
    },
    preprocessorOptions: {
      scss: {
        additionalData: '@import "@styles/variables.css";',
        sourceMap: true,
      },
    },
    postcss: {
      plugins: [
        autoprefixer(),
        cssnano({
          preset: 'default',
        }),
      ],
    },
  },

  // Dependency optimization configuration
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
      'date-fns',
    ],
    exclude: ['@fsouza/prettierd'],
    esbuildOptions: {
      target: 'esnext',
    },
  },
});
