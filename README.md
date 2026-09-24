# Hydrovolta NV — Production Website

Static multi-page site. No framework, no build step. Cloudflare Pages
auto-deploys every push to `main` — a push is a publish, and there is no staging.

Pages are served without the `.html` suffix (`/about`, not `/about.html`), and
Cloudflare 308-redirects the suffixed form to the clean one.

For working notes, open work items and the site's conventions, see `CLAUDE.md`.

## Pages

| File | Live URL | Purpose |
|---|---|---|
| `index.html` | `/` | Homepage — leads with the nitrate problem |
| `groundwater.html` | `/groundwater` | High-recovery treatment for brackish and saline groundwater |
| `brine-valorization.html` | `/brine-valorization` | Chemical recovery from concentrated brine |
| `technology.html` | `/technology` | SonixED™ — the three integrated mechanisms |
| `systems.html` | `/systems` | SalinBloc™ containerised units and engineered skids |
| `applications.html` | `/applications` | Sector applications across six target markets |
| `projects.html` | `/projects` | Morocco (active), Perth (utility pilot), Brazil (LOI), Saudi (MOU) |
| `about.html` | `/about` | Company history, leadership, credentials, registry |
| `contact.html` | `/contact` | Engineering assessment intake form |
| `contact-us.html` | `/contact-us` | General contact details — retired from the sitemap, page still live |
| `privacy.html` | `/privacy` | Privacy policy |
| `calculator.html` | `/calculator` | Partner ED calculator — `noindex,nofollow` |
| `salinbloc-manual.html` | `/salinbloc-manual` | Customer manual portal — `noindex,follow` |
| `404.html` | *(any unmatched path)* | Error page — not linked, not in the sitemap |

11 pages are indexable.

`404.html` is not optional. Cloudflare Pages falls back to single-page-app
behaviour when no top-level `404.html` exists, serving the homepage with HTTP 200
for every unmatched URL. Removing it would recreate that.

## Config files

| File | Purpose |
|---|---|
| `sitemap.xml` | The 10 URLs intended for indexing |
| `robots.txt` | Points at the sitemap |
| `_redirects` | Legacy WordPress paths → 301 |
| `llms.txt` | Plain-text site summary for LLM consumers; keep in sync with site copy |

No `_headers`, `wrangler.toml` or `functions/` — do not add any of them without
asking; they change how the site is served.

## Assets

- `images/` — all page imagery. `images/candidates/` is an unused photo archive.
- `downloads/` — brochures, datasheets, the user manual and per-chapter PDFs.
- `Manual-pdf/` — LaTeX source for the manual.
- `pdfjs/` — vendored PDF.js viewer used by the manual page.
- `fonts/` — self-hosted woff2.

## Design system

- `css/site.css` — single stylesheet for every page. Archivo, Archivo Narrow and
  Plus Jakarta Sans; navy/gold tokens. The nav collapses to a hamburger at ≤900px.
- `js/site.js` — mobile nav, scroll reveal (`.rv`), hero slideshow, auto year,
  active-nav highlight, cookie banner.
- `js/manual.js` — manual page only.

There is no templating. The nav, topbar and footer are hand-copied into every
HTML file, so a change to any of them is a site-wide edit.

Internal links are root-relative and extension-less (`/about`, `/` for the
homepage). Writing `about.html` still works but costs a redirect on every click.

## Deployment

Push to `main`. Cloudflare Pages builds and deploys in roughly 30–60 seconds.
HTTPS is automatic. Nothing to upload by hand.
