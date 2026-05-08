import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import mdx from "@mdx-js/rollup";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import path from "path";
import { writeFileSync, mkdirSync } from "fs";
import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

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
          "utf-8",
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
    {
      enforce: "pre" as const,
      ...mdx({
        jsxRuntime: "automatic",
        development: false,
        providerImportSource: "@mdx-js/react",
        remarkPlugins: [remarkGfm],
        rehypePlugins: [rehypeSlug],
      }),
    } as Plugin,
    // TanStack Start: SPA mode — no SSR, no prerender. Provides the routing
    // shell Lovable hosting needs to serve any URL (fixes deep-link 404s)
    // while the existing react-router-dom app inside renders the actual UI.
    tanstackStart({
      spa: { enabled: true },
      router: { generatedRouteTree: "./src/routeTree.gen.ts" },
    }),
    react(),
    mode === "development" && componentTagger(),
    writeVersionJsonPlugin(),
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
    },
  },
  build: {
    minify: "esbuild",
    cssMinify: true,
    sourcemap: false,
    rollupOptions: {
      output: {
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
