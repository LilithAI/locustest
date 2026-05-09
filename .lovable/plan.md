## Goal
Restore the auth email setup so the custom templates appear again in **Cloud → Emails** and auth emails send correctly.

## What I found
- This does **not** look like a Cloudflare hosting issue.
- The project already has the auth email hook and all six auth templates in `supabase/functions/auth-email-hook/` and `supabase/functions/_shared/email-templates/`.
- I found the earlier note you remembered: the previous problem was a small scaffold mismatch where TanStack-style files were created in the wrong place and then removed.
- Right now, the likely breakage is backend wiring: `supabase/config.toml` only contains a config block for `ask-about-firm`, so the auth email hook is not fully represented in the current backend config.
- Your sender domain `one.lexleaks.com` is verified, so the missing template UI is not caused by DNS.

## Plan
1. Reconcile the auth email setup with the backend
   - Re-scaffold the auth email templates in overwrite mode if needed.
   - Ensure the auth email hook is correctly registered in the backend config.

2. Redeploy the auth email hook cleanly
   - Push the auth email hook again so the backend recognizes the current template set.
   - Avoid recreating the old wrong route structure.

3. Verify the setup from the backend side
   - Confirm the auth email hook is active.
   - Confirm the template preview/management entry appears again in **Cloud → Emails**.

4. Validate delivery behavior
   - Trigger a test auth email.
   - Check whether it logs as queued/sent and whether it reaches the inbox.

## Technical details
- Earlier fix to preserve: this project uses **Vite + React + backend functions**, not TanStack route-based email handlers.
- The auth email source files already exist, so this is more likely a registration/deployment mismatch than missing template code.
- The email domain is verified, so the remaining failure is likely in project-level email enablement or auth-hook registration.

## Expected result
- The **Customize auth emails** flow shows the branded templates again.
- Auth emails send through the existing branded setup instead of falling back or disappearing.