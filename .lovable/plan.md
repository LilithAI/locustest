**Fix Cloudflare peer-dep conflict properly**

1. In `package.json`, change `"@tanstack/react-start": "^1.167.64"` → `"@tanstack/react-start": "1.167.64"` (exact pin, no caret).
2. Run `bun install` to regenerate both `bun.lock` and `package-lock.json` with the pinned version.
3. Commit pushes to GitHub → Cloudflare auto-deploys with the new lockfiles.
4. Install will succeed because there's no longer a vite 5 ↔ vite 7 conflict.

Keep `.npmrc` as a safety net but stop relying on it as the fix.

If pinning to 1.167.64 still pulls 1.167.65 deps, fallback step: also bump `vite` to `^7.0.0` (and verify `@vitejs/plugin-react-swc` supports it — it does in `^3.10+`).