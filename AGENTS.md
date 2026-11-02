# Repository conventions

- Product source is `src/server`, `src/shared`, and `public`. Tests and synthetic fixtures live in `tests`.
- Keep runtime dependency-free. Prettier is a development dependency only.
- Run `npm run check` before committing. CI uses synthetic fixtures and never logs into a real account.
- Authentication stays in backend RAM; preserve loopback/Host/Origin/CSRF checks, TTL and bounded request concurrency.
- Never commit `data/` contents, credentials, real-account snapshots, debug captures, or temporary artifacts.
- Preview state belongs to `public/js/preview/controller.js`; forms belong to `settings.js`; canvas rendering belongs to `renderer.js`; pure limits/layout belong to `src/shared/preview-config.mjs`.
- Update HTML docs for changes to setup, architecture, APIs or data contracts. `README.html` is the full HTML introduction; `README.md` is the GitHub entry point.
- Preserve third-party attribution and keep scope/limitations truthful, especially equipped weapons versus the entire bag.
- Prefer small, reviewable refactors. Preserve the existing behavior unless the user requests a change.
