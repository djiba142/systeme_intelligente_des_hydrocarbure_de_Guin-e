import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "ES2020",
    minify: "esbuild",
    cssCodeSplit: true,
    sourcemap: process.env.NODE_ENV !== "production" ? "inline" : false,
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks for better caching
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-query": ["@tanstack/react-query"],
        },
        chunkFileNames: "chunks/[name]-[hash].js",
        entryFileNames: "js/[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          const info = (assetInfo.name || '').split(".");
          const ext = info[info.length - 1];
          if (/png|jpe?g|gif|svg/.test(ext)) {
            return "images/[name]-[hash][extname]";
          } else if (/woff|woff2|eot|ttf|otf/.test(ext)) {
            return "fonts/[name]-[hash][extname]";
          }
          return "[name]-[hash][extname]";
        }
      }
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
  },
  // Optimizations for faster dev startup
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@supabase/supabase-js",
      "@tanstack/react-query",
      "lucide-react",
      "recharts",
      "zod",
      "react-hook-form",
      "@hookform/resolvers/zod",
    ],
    exclude: ["@tanstack/react-query-devtools"],
  },
});