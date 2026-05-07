# Fix The Bar lag before continuing

## Goal
Make The Bar feel immediate again by removing the current click delay, cutting unnecessary work during route changes, and fixing the broken dashboard read that is forcing retries and fallback queries.

## What I found
- The lag is real: the live profile shows very slow initial rendering and a heavy client load.
- The Bar dashboard RPC is broken right now (`get_bar_dashboard` fails with `function row_to_jsonb(record) does not exist`).
- Because that RPC fails, the page retries, waits, then falls back to multiple direct table reads, which adds more latency and extra backend work.
- The app is also loading a very large number of scripts/resources on first load, which makes navigation feel sticky.
- The Bar browse page currently pulls up to 500 challenge rows at once and then filters client-side, which is more work than needed.

## Implementation plan
1. Fix the backend dashboard function
   - Patch the database function so it returns recent attempts correctly without the invalid `row_to_jsonb(record)` call.
   - Validate that `/the-bar` can load stats in one successful request instead of retry + fallback.

2. Remove avoidable client-side delay in The Bar flow
   - Stop The Bar pages from doing extra auth/session fetches when shared auth state already exists.
   - Remove or reduce unnecessary re-fetch triggers on route transitions/focus where they are causing redundant work.
   - Make The Bar route transitions rely on direct navigation instead of extra refresh behavior tied to `location.key`.

3. Reduce data and rendering cost on Browse/Challenge flows
   - Change Browse so it does not fetch and process hundreds of rows eagerly when the user only needs the first page.
   - Move filtering/sorting/pagination work closer to the query instead of loading a large client-side list.
   - Check challenge page load for duplicate queries before submission and trim any non-essential first-render work.

4. Cut background work that hurts responsiveness
   - Audit global idle prefetching and route warmups so they do not compete with the user’s immediate interactions.
   - Reduce unnecessary background imports/network work for the current session, especially around The Bar routes.

5. Verify with real measurements
   - Re-profile `/the-bar` and the “Take a Challenge” click path.
   - Confirm that the click response feels immediate and that the broken dashboard error is gone.

## Technical details
- Files likely involved:
  - `supabase/migrations/...get_bar_dashboard...sql`
  - `src/pages/TheBar.tsx`
  - `src/pages/TheBarBrowse.tsx`
  - `src/pages/TheBarChallenge.tsx`
  - `src/routes/__root.tsx`
  - `src/lib/prefetch.ts`
- Success criteria:
  - No `[TheBar] get_bar_dashboard failed` error
  - No retry/fallback path on normal dashboard load
  - Faster transition from `/the-bar` to `/the-bar/browse`
  - Lower network/JS work during first interaction