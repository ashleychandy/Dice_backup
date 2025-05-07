import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
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
      // Bundle size visualization (only in production)
      isProduction && visualizer(),
    ].filter(Boolean),

    // Base path for serving static assets
    base: './',

    // Configure server
    server: {
      port: 3000,
      open: true,
      host: true,
    },

    // Configure build
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: !isProduction,
      minify: isProduction,
      chunkSizeWarningLimit: 1000,
    },

    // Optimize dependencies
    optimizeDeps: {
      include: ['react', 'react-dom', 'ethers'],
    },

    // Configure resolver
    resolve: {
      // Add alias for cleaner imports
      alias: {
        '@': '/src',
      },
    },
  };
});
