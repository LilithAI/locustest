## Goal
Ensure the "Generate description" button always produces a description that prominently includes the 5 essential facts a candidate needs, on top of the longer narrative.

## Required facts (must always appear)
1. Firm / organization name
2. Role + location
3. Eligibility (year / qualification)
4. Stipend + duration
5. Application deadline + how to apply

## Changes

### 1. `supabase/functions/generate-vacancy-description/index.ts`
Update `SYSTEM_PROMPT` so the model is required to start every description with a fixed **"## Quick facts"** block listing the 5 fields above as a bullet list, before the long-form sections. Rules:
- Each of the 5 bullets must always be present, in this exact order, with bold labels: `**Firm:**`, `**Role & location:**`, `**Eligibility:**`, `**Stipend & duration:**`, `**Deadline & how to apply:**`.
- If a value is genuinely missing from the source, write `Not specified` for that bullet — never invent.
- Then continue with the existing long-form sections (Role overview, Responsibilities, etc.).
- Keep overall length target ~800–1000 words; Quick facts block doesn't count toward narrative quality.

Also strengthen the user message so the model sees the 5 fields explicitly pulled from `ai_extracted` (firm_name, role, location, eligibility, qualification, stipend, duration, deadline, application_method/url) labeled clearly, so it can't miss them even if the JSON is messy.

### 2. No UI / DB changes
`ReviewQueuePanel.tsx` already shows the returned markdown in the description textarea — the new Quick facts block will simply appear at the top. No code change needed there.

## Out of scope
- Auto-filling the structured form fields (firm/role/deadline inputs) from generation — only the description body is updated. Can be a follow-up if you want.
- Regeneration history, streaming.