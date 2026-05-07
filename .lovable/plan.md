## Goal

Add a dedicated admin login page with username + password, and seed an admin account (username `admin`, password `Admin2026!`). The public `/auth` page stays Google-only for normal users.

## 1. New page: `/admin/login`

New file `src/pages/AdminLogin.tsx`:
- Minimal centered form (matches existing `Auth.tsx` styling — `Locus` wordmark, dark bg, `Input`/`Label`/`Button` from shadcn).
- Fields: Username, Password.
- On submit: resolve username → email via existing `supabase.rpc('get_email_by_username', ...)`, then `supabase.auth.signInWithPassword({ email, password })`.
- After login: check `useAdminAccess().hasAnyScope`. If yes → `navigate('/admin')`. If not → sign out and toast "Not an admin account".
- Forgot password link uses `supabase.auth.resetPasswordForEmail`.
- Adds `usePageMeta({ title: "Admin Sign In", ... })` and `noindex` via meta hook.

Register the route in `src/App.tsx` (or wherever routes are wired — this project uses `react-router-dom`, will check `App.tsx`) as `/admin/login`, public (outside `AdminLayout`).

## 2. Seed the admin account

Migration that:
- Inserts a confirmed user into `auth.users` with email `admin@locus.legal`, encrypted password for `Admin2026!` (using `crypt(..., gen_salt('bf'))`), `email_confirmed_at = now()`, `raw_user_meta_data = {"display_name":"admin"}`.
- The existing `handle_new_user()` trigger will auto-create the `profiles` row with username `admin`.
- Inserts `('<new uid>', 'admin')` into `public.user_roles` so the account has the full `admin` scope.
- Idempotent: skip if a profile with username `admin` already exists.

Credentials after migration:
- Username: `admin`
- Password: `Admin2026!`
- (Internal email: `admin@locus.legal` — only used by Supabase auth, never shown.)

## 3. Restore admin auth gate

Per project memory, `AdminLayout.tsx` currently bypasses the admin check for preview. Since the user is now setting up real admin login, re-enable the gate so non-admins are redirected to `/admin/login` instead of `/auth`. Update the bypass memory accordingly.

## Out of scope

- No changes to `/auth` (Google sign-in stays as-is).
- No new admin invite UI — adding more admins later can be done via existing `grant_role` RPC from the admin console.

## Technical notes

- `auth.users` insert uses `crypt('Admin2026!', gen_salt('bf'))` for the password hash and sets `aud='authenticated'`, `role='authenticated'`, `instance_id='00000000-0000-0000-0000-000000000000'`, `email_confirmed_at=now()`.
- `AdminLogin` page deliberately avoids Google OAuth so a single-purpose admin entry exists.
- Username lookup uses the existing RPC; no new DB function needed.
