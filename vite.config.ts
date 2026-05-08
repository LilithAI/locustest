import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import mdx from "@mdx-js/rollup";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import path from "path";
import { writeFileSync, mkdirSync, readFileSync } from "fs";
import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";

const BUILD_VERSION = Date.now().toString();

// Writes /version.json into the build output so the running app can poll it
// to detect new deployments and prompt users to refresh.
function writeVersionJsonPlugin(): Plugin {
  return {
    name: "write-version-json",
    apply: "build",
    closeBundle() {
      try {
        const outDir = path.resolve(__dirname, "dist");
        mkdirSync(outDir, { recursive: true });
        writeFileSync(
          path.join(outDir, "version.json"),
          JSON.stringify({ version: BUILD_VERSION }),
          "utf-8"
        );
      } catch (e) {
        console.warn("[write-version-json] failed:", e);
      }
    },
  };
}

// Emits dist/404.html as a copy of index.html so Cloudflare Pages' secondary
// fallback (404.html) also serves the SPA shell for unmatched routes.
function spaFallbackPlugin(): Plugin {
  return {
    name: "spa-fallback",
    apply: "build",
    closeBundle() {
      try {
        const outDir = path.resolve(__dirname, "dist");
        const src = path.join(outDir, "index.html");
        const dest = path.join(outDir, "404.html");
        const html = readFileSync(src, "utf-8");
        writeFileSync(dest, html, "utf-8");
        console.log("[spa-fallback] dist/404.html written");
      } catch (e) {
        console.warn("[spa-fallback] failed:", e);
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  define: {
    __BUILD_VERSION__: JSON.stringify(BUILD_VERSION),
  },
  plugins: [
    { enforce: "pre" as const, ...mdx({ jsxRuntime: "automatic", development: false, providerImportSource: "@mdx-js/react", remarkPlugins: [remarkGfm], rehypePlugins: [rehypeSlug] }) } as Plugin,
    react(),
    mode === "development" && componentTagger(),
    writeVersionJsonPlugin(),
    // Bundle size report. Enabled with `bun run build --mode analyze`.
    // Writes dist/stats.html — open it locally to inspect chunk sizes.
    mode === "analyze" &&
      (visualizer({
        filename: "dist/stats.html",
        gzipSize: true,
        brotliSize: true,
        template: "treemap",
      }) as Plugin),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "react": path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
    },
  },
  build: {
    minify: "esbuild",
    cssMinify: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        // Split heavy/stable vendor code into its own long-cacheable chunks
        // so the home page's main bundle stays small and repeat visitors only
        // re-download app code on each deploy.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/react-router") ||
            id.includes("/scheduler/")
          ) {
            return "react-vendor";
          }
          if (id.includes("framer-motion")) return "framer";
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("@tanstack/react-query")) return "query";
          if (id.includes("lucide-react")) return "icons";
          return undefined;
        },
      },
    },
  },
}));
