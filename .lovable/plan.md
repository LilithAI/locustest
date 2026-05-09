## Goal
Move all outbound email (auth + broadcasts + transactional) off Lovable Emails and onto **Resend**, since the Lovable Emails project toggle keeps disabling itself.

## Why Resend
- Free tier: 3,000 emails/month, 100/day — plenty for current usage.
- Available as a Lovable connector → no manual API key handling in code, key is stored securely and injected at the gateway.
- Works on Cloudflare Pages (pure HTTPS calls, no nameserver delegation needed).
- Keeps all existing React Email templates (`supabase/functions/_shared/email-templates/*` and `_shared/transactional-email-templates/*`) unchanged — only the *send* call changes.

## DNS housekeeping (important)
Lovable currently delegates `notify.lexleaks.com` to its nameservers. Before Resend can verify a sender domain, we need to decide:
- **Option A — same subdomain `notify.lexleaks.com`**: remove Lovable's NS records at your DNS provider first, wait for propagation, then verify in Resend.
- **Option B — different subdomain (e.g. `mail.lexleaks.com` or root `lexleaks.com`)**: no conflict, both can coexist; faster to set up.

Option B is recommended — quicker, and we can leave the Lovable subdomain alone.

## Plan

1. **Connect Resend** via Lovable connector (you click "Connect", paste Resend API key once).
2. **Verify a sender domain in Resend** (`mail.lexleaks.com` recommended) — add the SPF/DKIM TXT records Resend gives you at your DNS provider.
3. **Rewrite `process-email-queue`** edge function to send via Resend gateway instead of Lovable Email API. The pgmq queue, retry logic, suppression checks, and `email_send_log` all stay — only the actual HTTP call to send the email changes.
4. **Update `auth-email-hook`**: keep enqueuing to `auth_emails` queue (no change), the new dispatcher will deliver via Resend.
5. **Update `send-broadcast`**: same — enqueue to queue, dispatcher sends via Resend. Remove direct Lovable Email API calls.
6. **Update sender constants** (`FROM_DOMAIN`, `SENDER_DOMAIN`) in all email-sending functions to the Resend-verified domain.
7. **Test**: trigger a password reset and a broadcast; confirm rows in `email_send_log` go from `pending` → `sent`, and emails arrive.
8. **(Optional) Disable Lovable Emails** at the project level once Resend is confirmed working.

## Technical details
- Resend send call (used inside `process-email-queue`):
  ```
  POST https://connector-gateway.lovable.dev/resend/emails
  Authorization: Bearer ${LOVABLE_API_KEY}
  X-Connection-Api-Key: ${RESEND_API_KEY}
  body: { from, to, subject, html, text, headers: { 'List-Unsubscribe': ... } }
  ```
- All existing rate-limit / DLQ / TTL logic in the dispatcher is preserved — we just swap the fetch target.
- No frontend changes; users see no difference except emails actually arrive.

## Expected result
- Auth emails (signup/recovery/magic link) deliver reliably.
- Broadcasts from `/admin/broadcasts` deliver reliably.
- `email_send_log` shows `sent` instead of `dlq`.
- No more dependency on the flaky Lovable Emails project toggle.
