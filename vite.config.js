import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import eslint from "vite-plugin-eslint";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig(({ command, mode }) => {
  // Load env variables based on mode
  const env = loadEnv(mode, process.cwd(), "");
  
  return {
    plugins: [
      react(),
      eslint(),
      // Only add visualizer in analyze mode
      mode === "analyze" && visualizer({
        open: true,
        filename: "dist/stats.html",
        gzipSize: true,
        brotliSize: true,
      }),
    ],
    build: {
      // Optimize build
      minify: "terser",
      terserOptions: {
        compress: {
          drop_console: mode === "production",
          drop_debugger: mode === "production",
        },
      },
      // Generate source maps in dev mode
      sourcemap: mode !== "production",
      // Split chunks for better caching
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom"],
            router: ["react-router-dom"],
            ethers: ["ethers"],
            ui: ["framer-motion"],
            queries: ["@tanstack/react-query"],
          },
        },
      },
    },
    // Override .env values
    define: {
      // Add any needed global defines here
    },
    // Adjust server settings
    server: {
      port: 3000,
      open: true,
      cors: true,
    },
  };
});
