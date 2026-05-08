/**
 * Detect and recover from stale lazy-chunk loads after a deploy.
 *
 * After a publish, the cached HTML may still reference old hashed chunk
 * filenames that no longer exist. The dynamic import then 404s, React's
 * Suspense rethrows, and the user is stuck on a blank/"Not Found" screen.
 *
 * Recovery: cache-busting hard reload, capped at MAX_RELOADS per session
 * to avoid infinite loops if the chunk is genuinely broken.
 */

const RELOAD_COUNT_KEY = "locus_chunk_reload_count_v1";
const MAX_RELOADS = 2;

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

export function getReloadAttempts(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = sessionStorage.getItem(RELOAD_COUNT_KEY);
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export function resetReloadAttempts(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(RELOAD_COUNT_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Hard-reload with a cache-busting query param, capped at MAX_RELOADS per
 * session. Returns true if a reload was triggered, false if suppressed
 * (limit reached, SSR, etc).
 */
export function reloadOnce(): boolean {
  if (typeof window === "undefined") return false;
  const attempts = getReloadAttempts();
  if (attempts >= MAX_RELOADS) return false;
  try {
    sessionStorage.setItem(RELOAD_COUNT_KEY, String(attempts + 1));
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
