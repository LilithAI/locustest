## Next perf pass — finish what's left from the diagnostic

Two items remain from the lag investigation. Both are straightforward and isolated to non-business-logic code paths.

### 1. TheBarBrowse: stop pulling 500 rows on every visit

Today `TheBarBrowse.tsx` fetches up to 500 challenge rows + every attempt row for the user, then filters/sorts/paginates in JS. On a slow phone this is the heaviest page in the Bar flow.

Changes (all in `src/pages/TheBarBrowse.tsx`):
- Move filter (`type`, `area`, `diff`), sort, and pagination to the Supabase query using `.eq()` / `.order()` / `.range()`.
- Use `select(..., { count: "exact" })` to drive the pager instead of `filtered.length`.
- Keep the "hide already-attempted" behaviour, but switch from "fetch every attempt" to a server-side anti-join via a tiny RPC `bar_browse_challenges(p_type, p_area, p_diff, p_sort, p_offset, p_limit)` that returns `{ rows, total }` with attempted IDs excluded for the calling user (and no filter for guests).
- Fetch the daily-cap row in parallel, unchanged.
- Refetch only when filter/sort/page or `userId` changes — drop the implicit refetch on every mount.

Result: page load drops from ~500 rows to 30, and the JS filter/sort cost disappears.

### 2. Prefetch / background work audit

`src/lib/prefetch.ts` already gates on interaction + idle, but `COMMON_KEYS` still warms 5 chunks back-to-back with 800 ms gaps. On The Bar specifically, those chunks compete with the dashboard RPC and the click handlers feel sticky for the first ~5 s after first interaction.

Changes:
- Trim `COMMON_KEYS` to the 2 routes a Bar user actually hits next: `theBarBrowse`, `theBarHistory`. Drop `directory`, `playbook`, `resources`, `tools` from the auto-warm list — they're already prefetched on hover via `prefetchRoute`.
- Bump the inter-chunk delay from 800 ms → 2000 ms and only start after `requestIdleCallback` fires (already the case, but remove the 60 s fallback timer that fires even with zero interaction — it's the source of "random" lag spikes 60 s into a session).
- No change to `prefetchRoute` (hover/focus prefetch stays).

Result: fewer background chunk downloads competing with click handlers; no surprise prefetch storm at the 60 s mark.

### Out of scope (intentionally)

- No design/UI changes.
- No auth flow changes (already handled last turn).
- No new tables — only one read-only RPC.

### Files touched

- `supabase/migrations/<new>.sql` — add `bar_browse_challenges` RPC (SECURITY DEFINER, reads from `bar_challenges_student` view, excludes attempted IDs for the caller).
- `src/pages/TheBarBrowse.tsx` — switch to RPC + server-side paging.
- `src/lib/prefetch.ts` — trim `COMMON_KEYS`, raise delay, drop 60 s fallback.
