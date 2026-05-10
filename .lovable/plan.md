## Goal
Send one test email of each of the 9 transactional templates to **heyjeetttt@gmail.com** so you can review every template's design and content.

## Templates that will be sent
1. `welcome`
2. `profile-nudge`
3. `app-status`
4. `vacancy-digest`
5. `vacancy-instant`
6. `bar-digest`
7. `broadcast`
8. `app-recap`
9. `opportunity-digest`

## How
Call the deployed `send-transactional-email` edge function 9 times via `curl` using the service-role key, one call per template. Each call uses the template's built-in `previewData` (or sensible test data for templates that don't define it) so the email renders fully populated.

Each send is processed by the same queue + Resend pipeline that just confirmed working from `noreply@lexleaks.com`.

## Verification
After firing, check:
- `heyjeetttt@gmail.com` inbox (expect 9 emails within ~1 min)
- `email_send_log` filtered to recipient = `heyjeetttt@gmail.com` to confirm 9 `sent` rows

## Notes
- No code changes. Pure runtime invocation.
- If `heyjeetttt@gmail.com` is in `suppressed_emails` from earlier testing, I'll remove that row first so the sends aren't blocked.
- Templates that need dynamic data (broadcast, vacancy-digest, app-status, etc.) will get realistic sample payloads.
