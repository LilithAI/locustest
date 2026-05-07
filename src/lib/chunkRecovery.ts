/**
 * Detect and recover from stale lazy-chunk loads after a deploy.
 *
 * After a publish, the cached HTML may still reference old hashed chunk
 * filenames that no longer exist. The dynamic import then 404s, React's
 * Suspense rethrows, and the user is stuck on a blank/"Not Found" screen.
 *
 * `isChunkLoadError` matches the known cross-browser error shapes.
 * `reloadOnce` does a single hard reload with a cache-busting `?v=` param,
 * gated by sessionStorage so we never loop if the chunk is genuinely broken.
 */

const RELOAD_FLAG = "locus_chunk_reload_v1";

const PATTERNS = [
  /ChunkLoadError/i,
  /Loading chunk [\d]+ failed/i,
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /Importing a module script failed/i,
  /Loading CSS chunk [\d]+ failed/i,
];

export function isChunkLoadError(err: unknown): boolean {
  if (!err) return false;
  const e = err as { name?: string; message?: string };
  const msg = `${e?.name ?? ""} ${e?.message ?? ""}`;
  return PATTERNS.some((re) => re.test(msg));
}

/**
 * Hard-reload once per session with a cache-busting query param. Returns
 * true if a reload was triggered, false if it was suppressed (loop guard,
 * SSR, etc).
 */
export function reloadOnce(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (sessionStorage.getItem(RELOAD_FLAG)) return false;
    sessionStorage.setItem(RELOAD_FLAG, "1");
  } catch {
    // sessionStorage unavailable — skip recovery to avoid reload loops.
    return false;
  }
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("v", Date.now().toString());
    window.location.replace(url.toString());
  } catch {
    window.location.reload();
  }
  return true;
}

export function tryRecoverFromChunkError(err: unknown): boolean {
  if (!isChunkLoadError(err)) return false;
  return reloadOnce();
}
