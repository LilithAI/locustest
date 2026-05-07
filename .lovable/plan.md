## Goal
Create a second admin login: username `Jeet`, password `Indrajeet`.

## Approach
Mirror the existing `admin` setup:
- Internal email: `jeet@locus.legal` (never shown in UI; only used because Supabase auth requires email)
- Username: `jeet` (lowercase, what users type at `/admin/login`)
- Password: `Indrajeet`
- Role: `admin` in `user_roles` (full admin scope, same as the existing `admin` user)

## Steps

1. **Create the auth user** via a one-off SQL call against `auth.admin_create_user` is not available through migrations, so use a small Supabase admin script instead — create the user with the service-role key, email `jeet@locus.legal`, password `Indrajeet`, `email_confirm: true`.
2. **Profile row** — `handle_new_user` trigger auto-creates a profile row with auto-generated username. Then update that profile to set `username = 'jeet'` and `display_name = 'Jeet'` so `get_email_by_username('jeet')` resolves correctly at login.
3. **Grant admin role** — insert `(user_id, 'admin')` into `public.user_roles`.
4. **Verify** — confirm `/admin/login` accepts `Jeet` / `Indrajeet` and lands on the admin dashboard.

## Notes / risks
- "Indrajeet" is 9 chars. If HIBP leaked-password protection is on, signup may reject it. The existing `admin` account uses `Admin2026!`, suggesting HIBP isn't blocking simple words — should be fine, but I'll fall back to disabling HIBP for this insert if it errors.
- All steps are reversible (delete user_roles row + auth user).

## What I need from you
Just confirm to proceed — no other choices needed.