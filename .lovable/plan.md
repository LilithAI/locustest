## Goal

Temporarily make `/admin/*` viewable in the preview without logging in, so editing the admin panel doesn't force re-login each time. Re-enable proper admin auth later when the user explicitly asks.

## Change

### `src/components/admin/AdminLayout.tsx`
- Bypass the `useAdminAccess` gate. Render `<AdminSubNav />` + `<Outlet />` immediately, without checking `ready` / `hasAnyScope`.
- Add a clearly visible `TEMP: admin auth bypassed for preview` warning banner at the top of the layout so it's obvious this is not production-ready.
- Leave the `useAdminAccess` import/hook removed (or commented) — keep the file otherwise intact so re-enabling is a one-line revert.

No other files change. RLS still protects the database, so unauthenticated visitors hitting admin pages will see empty data / API errors, not real admin powers.

## Memory

Save a project memory rule (`mem://constraints/admin-auth-bypass`) and add it to the Core index:

> **Admin auth is temporarily bypassed in `AdminLayout.tsx` for preview convenience.** Do NOT re-enable the `useAdminAccess` gate unless the user explicitly says "re-enable admin login" / "lock admin" / similar. When they do, restore the original `ready` / `hasAnyScope` check and remove the temp banner.

## Out of scope
- No DB / RLS changes.
- No changes to other auth flows or routes.
- No removal of `useAdminAccess` hook itself — only its use in `AdminLayout`.
