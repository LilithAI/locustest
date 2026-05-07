## Goal
Strip Google sign-in completely from the codebase and disable it on the Lovable Cloud auth provider config, so we can re-enable it cleanly afterwards.

## Steps

1. **Disable Google in Lovable Cloud auth**
   - Call `configure_social_auth` with `disable_providers: ["google"]` and `providers: []` (or re-enable email so users aren't locked out — see question below).
   - This removes the managed Google OAuth registration on the backend.

2. **Remove Google UI from `src/pages/Auth.tsx`**
   - Delete the "Continue with Google" button, the Google SVG, and the `handleSocialLogin` function.
   - Remove the `import { lovable } from "@/integrations/lovable/index"` line.
   - Restore the legacy username/email + password form as the default visible flow (drop the `?legacy=1` gate) so users can still sign in.

3. **Remove the Lovable auth integration module**
   - Delete `src/integrations/lovable/index.ts` (and the folder if empty).
   - Uninstall the package: `bun remove @lovable.dev/cloud-auth-js`.

4. **Clean up PWA / service worker bits (if any)**
   - Confirm no `~oauth` denylist entries or stale OAuth helpers remain. (Quick grep — nothing to do unless found.)

5. **Verify build & login still works**
   - Build runs clean.
   - `/auth` shows username + password form, no Google button.
   - `/admin/login` (already username/email + password) is unaffected.

## After this
Once verified clean, you'll re-enable Google from the Lovable Cloud UI yourself, then ask me to wire it back into the frontend from scratch.

## Question before I execute
Right now `/auth` is **Google-only** for normal users (per project memory). Once Google is removed, normal users won't be able to sign in until we re-add it. Two options:
- **A.** Temporarily re-expose the username/password form on `/auth` so signups/logins keep working in the gap.
- **B.** Leave `/auth` empty/disabled — only admins can log in (via `/admin/login`) until Google is re-added.

I'll default to **A** unless you say otherwise.
