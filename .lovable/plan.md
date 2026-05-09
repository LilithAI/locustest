## first check for resend domain verification it is already doneGoal

Enable instant broadcast/auth email testing through Resend without waiting for `lexleaks.com` domain verification.

## Current state

- Resend connector is connected (`RESEND_API_KEY` available).
- `process-email-queue` already routes all sends through Resend.
- It reads an optional `RESEND_FROM` env var to override the `from` address.
- `RESEND_FROM` is **not** set yet, so sends use `noreply@lexleaks.com` — Resend will reject this until the domain is verified on their side.

## Plan

1. Add the `RESEND_FROM` secret with value `Locus <onboarding@resend.dev>`.
  - Resend's `onboarding@resend.dev` is a built-in test sender that requires no domain verification.
  - **Important Resend limitation**: while using `onboarding@resend.dev`, Resend only delivers to the email address that owns the Resend account. So broadcast tests should be sent to that account's email.
2. Trigger a test broadcast from `/admin/broadcasts` to your own Resend-account email.
3. Confirm `email_send_log` flips to `sent` and the email arrives.
4. Once `lexleaks.com` is verified in Resend (separate step at resend.com → Domains), simply delete the `RESEND_FROM` secret to switch back to `noreply@lexleaks.com` — no code changes needed.

## Expected result

- Broadcast and auth emails deliver immediately for end-to-end verification, before domain DNS is even touched.
- Easy switch-back to branded sender once domain is verified.