## Goal

On `/opportunities` vacancy cards, when a vacancy has both an application email and an external portal URL, show **two buttons** side-by-side in the footer:

1. **Draft application** — opens the existing draft-email flow (current `onApply` behavior).
2. **Apply on portal** — opens `vacancy.application_url` in a new tab directly (no intermediate modal).

Currently the card shows only ONE button: either "Draft application" (email mode) OR "Apply on portal" (external_url mode), based on `application_mode`. The user wants both available whenever a portal URL exists.

## Changes (frontend only)

### `src/components/vacancies/VacancyCard.tsx`

In the idle-state footer block (lines ~305–325):

- Always render **Draft application** button when `onApply` is provided (calls `onApply(vacancy)` as today).
- Additionally render **Apply on portal** as an `<a target="_blank" rel="noopener noreferrer">` styled like a button, whenever `vacancy.application_url` is present. Clicking fires `track("vacancy_apply_clicked", { vacancy_id, mode: "portal" })` and navigates directly — no modal.
- Wrap the two buttons in a `flex gap-2 flex-wrap` container so they sit together on the right side of the footer.
- Keep the existing "Applied" / "Follow up" / "Followed up" / "Draft follow-up" states unchanged (single-button as today). Portal button only shows in `idle` state.
- Also keep the small "Portal" pill in the header so users still see the indicator.

### Edge cases

- Vacancy has only email (no `application_url`): show only **Draft application** (unchanged behavior).
- Vacancy has only portal URL (no email, `application_mode === "external_url"`): show only **Apply on portal** (matches today, but as a real link instead of going through `onApply`). Keep `onApply` path as fallback if no `application_url`.
- Vacancy is closed/archived: no buttons (unchanged).

### Out of scope

- No DB changes, no schema changes.
- No changes to other opportunity streams (CFP/moot/competition) — vacancy cards only.
- No changes to the draft-email dialog.
