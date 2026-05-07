## Problem

In the screenshot, the Lawctopus-imported vacancies show only **Apply on portal** — no **Draft application** button. That's because the current condition in `VacancyCard.tsx` is:

```ts
onApply && (vacancy.application_email || !vacancy.application_url)
```

These vacancies have an `application_url` (the Lawctopus fallback) but no `application_email`, so the Draft button is hidden. This contradicts the original intent ("both buttons should be here").

## Fix

### `src/components/vacancies/VacancyCard.tsx` (idle-state footer)

- Change the Draft application render condition to simply `onApply` — show it whenever an `onApply` handler is provided, regardless of whether `application_email` is set or not.
- Keep Apply on portal rendering unchanged (only when `vacancy.application_url` exists).
- Result: when both an email and a portal URL exist → both buttons. When only portal → both buttons (Draft will let user compose a generic email / use the existing draft flow). When only email → only Draft.

### Variant choice

- If `application_url` exists → Draft application uses `variant="outline"`, Apply on portal is the primary filled button (current behavior).
- If no `application_url` → Draft application uses `variant="default"` (current behavior).

### Out of scope

- No DB / schema changes.
- No changes to draft-email dialog logic — it already handles vacancies without an email by prompting for one or using a fallback.
- No changes to Applied / Follow-up / Closed states.
