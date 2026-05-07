import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import mdx from "@mdx-js/rollup";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import path from "path";
import { writeFileSync, mkdirSync } from "fs";
import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

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
    // TanStack Router file-based routing. Generates src/routeTree.gen.ts from
    // files under src/routes/. This is what Lovable's preview route picker
    // scans to populate the URL dropdown.
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "src/routes",
      generatedRouteTree: "src/routeTree.gen.ts",
    }) as Plugin,
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
      // Drop-in shim — every existing `from "react-router-dom"` import is
      // routed through src/lib/rrd.tsx, which adapts the API to TanStack
      // Router. Keeps the migration to a small, controlled diff.
      "react-router-dom": path.resolve(__dirname, "./src/lib/rrd.tsx"),
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
            id.includes("/@tanstack/react-router") ||
            id.includes("/@tanstack/router-core") ||
            id.includes("/@tanstack/history") ||
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
