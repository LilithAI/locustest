## What's wrong

Two real bugs in the admin login, plus one piece of good news from the logs:

1. **"Username not found"** — `get_email_by_username` looks up `profiles.display_name`, not `username`. So:
   - `Jeet` (capital J) → matches `display_name = 'Jeet'` ✅
   - `jeet` (lowercase) → also matches (case-insensitive) ✅
   - `jeet@locus.legal` → no display_name equals that → "Username not found" ❌
   - This also means there's a latent bug for any user whose `username` and `display_name` differ.

2. **"This account does not have admin access"** — the auth log confirms `jeet@locus.legal` (user `9c9bd0b2…`) signed in successfully at 13:27:43, and the DB confirms that user has the `admin` role. So the sign-in worked — the failure was the post-login role check running before `user_roles` finished loading (a race). The hook does reset `scopes` to `null` on user change, but the `justSignedIn` effect can fire on the same tick that `ready` is briefly true with the previous user's empty scopes.

## Fix

### 1. Backend: make `get_email_by_username` actually use the username (and accept email too)

Replace the function with one that:
- If input contains `@`, look it up directly in `auth.users.email` (case-insensitive).
- Otherwise, match `profiles.username` first, then fall back to `profiles.display_name` (case-insensitive) for backward compatibility.

This unblocks `jeet`, `Jeet`, and `jeet@locus.legal` — and fixes the same bug for `admin` and any future seeded user.

### 2. Frontend: `src/pages/AdminLogin.tsx`

- Relabel the field to **"Username or email"**.
- After `signInWithPassword` succeeds, do an explicit one-shot check against `user_roles` for the returned `user.id` instead of waiting for `useAdminAccess` to settle. Only navigate (or sign out + show "no admin access") based on that direct query. This removes the race entirely.
- Keep the `useAdminAccess` hook untouched — it's still used by `AdminLayout`.

### 3. Memory update

Update `mem://index.md` so the Core line says admin login accepts username **or email**.

## Out of scope

- No changes to `AdminLayout`, role-grant flow, or other admin pages.
- No changes to public `/auth` (still Google-only).
- No new tables or RLS changes.

## Verification

- Sign in as `jeet` → lands on `/admin`.
- Sign in as `Jeet` → lands on `/admin`.
- Sign in as `jeet@locus.legal` → lands on `/admin`.
- Sign in as `admin` / `Admin2026!` → lands on `/admin`.
- Sign in as a non-admin account → toast "This account does not have admin access." and signed out.
