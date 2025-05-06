import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import eslint from 'vite-plugin-eslint';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ command, mode }) => {
  // Load env variables based on mode
  const env = loadEnv(mode, process.cwd(), '');

  // Determine if we're building for production
  const isProduction = mode === 'production';

  return {
    plugins: [
      react({
        // Improve production performance with babel optimizations
        babel: {
          plugins: isProduction
            ? [
                // Remove PropTypes in production for smaller bundle
                ['transform-react-remove-prop-types', { removeImport: true }],
              ]
            : [],
        },
      }),
      // Only use eslint in development
      !isProduction && eslint(),
      // Only add visualizer in analyze mode
      mode === 'analyze' &&
        visualizer({
          open: true,
          filename: 'dist/stats.html',
          gzipSize: true,
          brotliSize: true,
          template: 'treemap', // Use treemap for better visualization
        }),
    ].filter(Boolean), // Filter out false values

    build: {
      // Optimize build
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: isProduction,
          drop_debugger: isProduction,
          passes: 2, // Multiple passes for better optimization
        },
        // Further optimizations for production
        mangle: isProduction,
        format: {
          comments: false, // Remove comments
        },
      },
      // Generate source maps in dev mode
      sourcemap: !isProduction,
      // Split chunks for better caching
      rollupOptions: {
        output: {
          manualChunks: {
            // Core React libraries
            react: ['react', 'react-dom'],
            // Routing
            router: ['react-router-dom'],
            // Blockchain libraries
            blockchain: ['ethers', 'web3'],
            // UI libraries
            ui: [
              'framer-motion',
              '@fortawesome/react-fontawesome',
              '@fortawesome/free-solid-svg-icons',
            ],
            // Data management libraries
            data: ['@tanstack/react-query', 'lodash'],
            // Wallet connection libraries (removed wagmi)
            wallet: [],
          },
          // Ensure smaller chunks for better loading
          chunkFileNames: isProduction
            ? 'assets/[name]-[hash].js'
            : 'assets/[name].js',
          entryFileNames: isProduction
            ? 'assets/[name]-[hash].js'
            : 'assets/[name].js',
          assetFileNames: isProduction
            ? 'assets/[name]-[hash].[ext]'
            : 'assets/[name].[ext]',
        },
      },

      // Target modern browsers for better optimization
      target: 'es2020',

      // Improve chunk loading
      cssCodeSplit: true,
      assetsInlineLimit: 4096, // Inline small assets (< 4kb)
    },

    // Optimize dev server
    server: {
      port: 3000,
      open: true,
      cors: true,
      hmr: {
        overlay: true, // Show errors as overlay
      },
      proxy: {
        // Proxy XDC RPC endpoints to avoid CORS issues in development
        '/rpc/mainnet': {
          target: 'https://rpc.xinfin.network',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/rpc\/mainnet/, ''),
        },
        '/rpc/apothem': {
          target: 'https://rpc.apothem.network',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/rpc\/apothem/, ''),
        },
      },
    },

    // Optimize preview server
    preview: {
      port: 3000,
      open: true,
      cors: true,
    },

    // Improve resolve performance
    resolve: {
      // Add common extensions to avoid specifying them in imports
      extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json'],
    },

    // Apply environment variable replacements
    define: {
      // Ensure proper environment variable handling
      'process.env.NODE_ENV': JSON.stringify(mode),
      ...Object.fromEntries(
        Object.entries(env)
          .filter(([key]) => key.startsWith('VITE_'))
          .map(([key, value]) => [`process.env.${key}`, JSON.stringify(value)])
      ),
    },
  };
});
