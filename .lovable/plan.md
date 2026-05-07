## Problem

Signing in at `/admin/login` with `admin` / `Admin2026!` succeeds in Supabase, but the page immediately shows **"This account does not have admin access."** and signs the user out.

Verified in DB: the `admin` user exists, has `role='admin'` in `user_roles`, and `get_email_by_username('admin')` resolves to `admin@locus.legal`. So credentials and roles are correct — the bug is purely client-side.

## Root cause

Race in `src/hooks/useAdminRole.ts` (`useAdminAccess`):

1. Before sign-in: `userId = null` → effect sets `scopes = []`, so `ready = true`.
2. User submits login. `AdminLogin.tsx` flips `justSignedIn = true`.
3. The post-login effect runs immediately. At that instant `ready` is still `true` and `scopes` is still `[]` (stale from the unauth state) because the new `userId` hasn't propagated through `useAuthSession` yet.
4. `hasAnyScope` is `false` → it signs the user out and shows the error toast — before the role fetch ever runs for the new user.

## Fix

Make `useAdminAccess` reset to a loading state whenever `userId` changes, so `ready` only becomes true once roles for the *current* user have actually been fetched.

In `src/hooks/useAdminRole.ts`, inside the effect:
- Call `setScopes(null)` at the start of the effect when `authReady && userId` (before kicking off the fetch). That way `ready` flips back to `false` while the new query is in flight, and the post-login effect in `AdminLogin` waits for the real result.
- Keep the `userId == null` branch setting `scopes = []` (genuine signed-out state).

No DB or route changes needed. No UI changes needed.

## Files touched

- `src/hooks/useAdminRole.ts` — small effect change to reset `scopes` to `null` on userId change before fetching.