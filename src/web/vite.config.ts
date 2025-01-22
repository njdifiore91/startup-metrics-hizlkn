import { defineConfig, loadEnv } from 'vite'; // v4.0.0
import react from '@vitejs/plugin-react'; // v4.0.0
import tsconfigPaths from 'vite-tsconfig-paths'; // v4.0.0
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Load env file based on mode in the src/web directory
  const env = loadEnv(mode, path.resolve(__dirname), '');

  return {
    plugins: [
      react({
        jsxRuntime: 'classic',
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
        clientPort: 3000,
        protocol: 'ws',
      },
      watch: {
        usePolling: true,
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
      headers: {
        'Content-Security-Policy':
          "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: https:; connect-src 'self' https://accounts.google.com; frame-ancestors 'none'; form-action 'self'",
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
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
        '@': path.resolve(__dirname, './src'),
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
        '@segment/analytics-next',
      ],
      exclude: ['@fsouza/prettierd'],
      esbuildOptions: {
        target: 'esnext',
        jsx: 'transform',
      },
    },

    // Define globals and handle CommonJS modules
    define: {
      // Properly stringify all environment variables
      'process.env': Object.entries(env).reduce(
        (prev, [key, value]) => ({
          ...prev,
          [key]: JSON.stringify(value),
        }),
        {} as Record<string, string>
      ),
      'import.meta.env': Object.entries(env).reduce(
        (prev, [key, value]) => ({
          ...prev,
          [key]: JSON.stringify(value),
        }),
        {} as Record<string, string>
      ),
      global: 'globalThis',
      __WS_TOKEN__: JSON.stringify('development'),
    },

    // Ensure environment variables are properly handled
    envPrefix: 'VITE_',
    envDir: path.resolve(__dirname),
  };
});
