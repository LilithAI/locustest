## Final migration batch — close out the schema

We've replayed Batches 1–5 (~50 migrations). After auditing what's actually in the new database vs. the original schema, only **10 tables remain** (plus their RLS, indexes, triggers, and a few RPCs). One more migration batch finishes Phase 1.

### Tables to create in the final batch

Grouped by source migration so they can land as one atomic SQL file:

1. **Analytics** (`20260504153706`)
   - `analytics_events` — privacy-friendly pageview/event log
   - `analytics_salt` — daily rotating salt for visitor hashing
2. **Beta program** (`20260427171828`, `20260427173304`)
   - `beta_testers` — invited beta accounts
   - `beta_feedback` — structured feedback submissions
   - `beta_feedback_round` (if defined later as a column/enum/table — verify during write)
3. **Playbook progress** (`20260425043611`)
   - `profile_playbook_progress` — per-user lesson completion
4. **CV analyses** (`20260425073928`)
   - `cv_analyses` — AI CV review history
5. **Notifications & suppression** (`20260502213934`, `20260429032244_email_infra`)
   - `notification_log` — in-app notification history
   - `email_stream_unsubscribes` — per-stream unsubscribe state
   - `suppressed_emails` — global email suppression list

For each table: re-create exact column/enum definitions, enable RLS, re-apply original policies, indexes, and any triggers/RPCs defined alongside them.

Note: `bar_questions` / `bar_answers` are intentionally absent — they were dropped in `20260423093803` and again in batch 2 of the replay. Not a gap.

### After this batch

- Phase 1 complete: schema fully restored.
- Build errors in `src/integrations/supabase/types.ts` should clear once the migration applies (types regenerate automatically).
- Phase 2 (email infrastructure setup with `notify.locus.legal`) can begin — that requires you to add 2 NS records at your registrar.

### Technical details

- Single migration file, idempotent (`IF NOT EXISTS` where safe).
- RLS policies sourced verbatim from original migrations; re-verified against the `has_role` and `has_admin_scope` functions already in the new DB.
- Any `INSERT` seed data with hardcoded UUIDs will be commented out (same convention as earlier batches).
- No edge-function or app code changes in this step — purely DB.

### Approve to run

Say **"continue"** and I'll write + submit the final migration. Once it applies cleanly, Phase 1 is done and we move to Lovable Emails setup.