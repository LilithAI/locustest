# Solid fix plan for the routing/build breakage

## Goal
Eliminate the recurring router-related build failures and the `/tools/cv-analyser` bad experience by finishing the migration away from the legacy `react-router-dom` compatibility layer where it matters most.

## What I’ll change

1. **Replace the shim-based imports with native TanStack Router imports**
   - Start with the shared routing-heavy files that affect the whole app shell and error states:
     - `src/components/*` files like nav, footer, layout, admin nav
     - `src/hooks/useTrackPageViews.ts`
     - `src/pages/NotFound.tsx`
   - Then update page files that still import `react-router-dom`.
   - Keep behavior the same while switching imports/hooks/components to TanStack Router equivalents.

2. **Remove reliance on the `react-router-dom` alias for core app behavior**
   - Keep the app working even if TS/Vite alias resolution is picky.
   - This turns the current workaround into a proper migration instead of a brittle compatibility trick.

3. **Fix the bad `/tools/cv-analyser` experience**
   - Verify the generated route exists and the route file points correctly to the page component.
   - If the preview still falls through to Not Found, trace the affected navigation/useNavigate calls in `CvAnalyser` and nearby layout routes and update them to TanStack-safe navigation patterns.

4. **Harden TypeScript config only where needed**
   - Ensure the TypeScript config is aligned with the router setup.
   - Remove any config dependence that only exists to prop up the shim, if it becomes unnecessary after the migration.

5. **Validate the result against the actual failure modes**
   - Confirm the legacy import errors are gone.
   - Confirm `/tools/cv-analyser` resolves normally instead of showing Not Found.
   - Check the main shell routes still render.

## Technical notes
- Root issue: the project is mid-migration to TanStack Router but still imports `react-router-dom` in many files, relying on a Vite alias to `src/lib/rrd.tsx`.
- That alias is fragile in this TypeScript/project-reference setup, which is why the same class of failure can keep resurfacing.
- The durable fix is to reduce or eliminate shim usage in the app code, especially in shared/layout/navigation files.

## Expected outcome
- No more repeated `Cannot find module 'react-router-dom'` failures.
- A more stable router setup that matches the app’s actual stack.
- `/tools/cv-analyser` loads through the proper route path instead of dropping users onto a broken Not Found state.