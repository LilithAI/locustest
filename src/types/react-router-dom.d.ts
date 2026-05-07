/**
 * Ambient module declaration for `react-router-dom`.
 *
 * The package is NOT installed — at runtime, Vite's `resolve.alias` in
 * vite.config.ts rewrites every `from "react-router-dom"` import to
 * `src/lib/rrd.tsx`, our TanStack Router compatibility shim.
 *
 * This file exists so the TypeScript compiler always resolves the module
 * regardless of which tsconfig is in effect (project references, editor vs.
 * build, etc.). Without it, we have to keep the `paths` mapping in sync
 * across multiple tsconfigs, which has broken the build twice already.
 *
 * Re-exporting `*` from the shim keeps types accurate.
 */
declare module "react-router-dom" {
  export * from "@/lib/rrd";
}
