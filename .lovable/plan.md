## You're right — let's just fix the code

You've spotted it correctly. Two things going on:

1. **`auth-email-hook`** (signup/password reset) is already correctly set to `lexleaks.com` ✅
2. **`send-transactional-email`** (broadcasts, vacancy alerts, digests) is hardcoded to `noreply@locus.legal` ❌ — that's why Resend rejects every transactional/broadcast send.

The `process-email-queue` already routes through Resend whenever `RESEND_API_KEY` is set (which it is). So the only thing wrong is the hardcoded domain in one file.

### What I'll change

In `supabase/functions/send-transactional-email/index.ts`:
- `SENDER_DOMAIN = "open.locus.legal"` → `"lexleaks.com"`
- `FROM_DOMAIN = "locus.legal"` → `"lexleaks.com"`

That's it. From-address becomes `locuslegal <noreply@lexleaks.com>`, which matches your verified Resend domain.

### About "maybe Lovable Mail was working weird because of this"

Partly yes — broadcasts/transactional emails were silently failing because of the wrong `from` domain, not because Lovable's queue was broken. But auth emails (signup, password reset) had a separate, deeper problem: in your earlier setup, Lovable Email's domain delegation never actually completed for `locus.legal`, which is why we switched to Resend in the first place. Resend + `lexleaks.com` (which IS verified) is the cleaner path now.

### After the fix

1. I redeploy `send-transactional-email`.
2. You send a test broadcast from `/admin/broadcasts`.
3. I check `email_send_log` — should flip to `sent` and the email arrives in your inbox (any inbox, not just yours, because `lexleaks.com` is properly verified).

No `RESEND_FROM` secret needed. No domain switch. Just a 2-line code fix.

Ready to implement?
