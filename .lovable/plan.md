# Import Bar Q&A Batches into `bar_challenges`

You uploaded 8 JSON files covering all 8 question types (mcq, issue_spotter, speed_round, jurisdiction, document_review, brief_builder, ethics, client_counseling). I'll load them all into the `bar_challenges` table so they show up live in The Bar.

## Approach

1. **Read & validate** each batch file in `/tmp` against the Zod payload schemas in `src/lib/bar/types.ts` (catch any malformed payloads before insert).
2. **Compute `points_base`** per row using `BASE_POINTS_BY_TYPE × DIFFICULTY_MULTIPLIER` from `src/lib/bar/constants.ts` (e.g. easy mcq = 5, easy issue_spotter = 15, etc.). For speed_round, multiply per-question base × question count.
3. **Insert via a single SQL migration** (one `INSERT ... VALUES (...)` per row) into `public.bar_challenges` with:
   - `status = 'approved'` so they're immediately playable (no manual review queue step).
   - `created_by` = the existing admin user id (`22c16a7e-93b3-44f1-b1fc-2199a1937528`).
   - `approved_by` = same admin, `approved_at = now()`.
   - `source_id = NULL` (no `bar_sources` rows exist yet — these are seed challenges).
   - `source_citation` from each item's `citation` field.
   - `payload`, `title`, `prompt`, `explanation`, `area_of_law`, `difficulty`, `question_type` from JSON.
4. **Verify** with a follow-up `SELECT count(*) GROUP BY question_type` to confirm everything landed.

## Question to confirm

- Insert as **`approved`** (live immediately) — that's my default. If you'd rather they hit `pending_review` so you can spot-check via the admin Challenges tab first, say so and I'll switch the status.

Ready to run on approval.