## Why the dashboard is empty

`AdminDashboard` uses `useAdminAccess().hasScope(...)` to decide which tool tiles to render. With auth bypassed there's no logged-in user, so `scopes = []`, `isAdmin = false`, and every tile is filtered out → empty grid.

## Fix (two parts)

### 1. Make `useAdminAccess` pretend to be full admin while bypass is on

In `src/hooks/useAdminRole.ts`, add a top-level constant `ADMIN_BYPASS = true` (matches the temp banner in `AdminLayout`). When true, `useAdminAccess` returns:
- `ready: true`
- `isAdmin: true`
- `scopes: [all five ADMIN_SCOPES]`
- `hasScope: () => true`
- `hasAnyScope: true`

This makes every admin page render its full UI without a session. Skips the Supabase `user_roles` lookup entirely while bypass is on. RLS will still block actual writes from the unauthenticated browser, but the layout and tile listings will fill in.

### 2. Grant real `admin` role to `heyjeetttt@gmail.com` (via migration)

So when bypass is removed later, that account already has full access:

```sql
insert into public.user_roles (user_id, role)
select u.id, 'admin'::public.app_role
from auth.users u
where lower(u.email) = 'heyjeetttt@gmail.com'
on conflict (user_id, role) do nothing;
```

### 3. Update memory

Update `mem://constraints/admin-auth-bypass` to note the `ADMIN_BYPASS` constant in `useAdminRole.ts` must also be flipped back to `false` when re-locking admin.

## Out of scope
- No changes to RLS policies — the DB still requires a real admin session for writes. If a specific admin write fails in preview, deal with it then.
- No removal of the TEMP banner.
