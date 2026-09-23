# CLAUDE.md — Hydrovolta website

Working notes for Claude Code. Read this first every session.

Repo: `GeorgeHydrovolta/HydroVolta-Main` — this is the **live** hydrovolta.com.
A second repo (`josbrik/HydroVolta`) exists on the same machine and is **not** live; do not edit it.

Deployment: static site, no build step. Cloudflare Pages auto-deploys every push to `main`.
A push is a publish. There is no staging.

---

## 1. Site structure

### Pages (13 HTML files in repo root)

Cloudflare Pages strips `.html`, so the canonical live path has no extension.

| File | Live URL | Purpose | Indexable |
|---|---|---|---|
| `index.html` | `/` | Homepage | yes |
| `groundwater.html` | `/groundwater` | Core business: high-recovery groundwater treatment | yes |
| `brine-valorization.html` | `/brine-valorization` | Chemical recovery from concentrate | yes |
| `technology.html` | `/technology` | SonixED™ deep-dive | yes |
| `systems.html` | `/systems` | SalinBloc™ containers + engineered skids | yes |
| `applications.html` | `/applications` | Sector applications | yes |
| `projects.html` | `/projects` | Morocco, Perth, Brazil, Saudi | yes |
| `about.html` | `/about` | Company, leadership, credentials | yes |
| `contact.html` | `/contact` | Engineering-assessment intake form | yes |
| `contact-us.html` | `/contact-us` | General contact details | yes |
| `privacy.html` | `/privacy` | Privacy policy | yes |
| `calculator.html` | `/calculator` | Partner ED calculator | `noindex,nofollow` |
| `salinbloc-manual.html` | `/salinbloc-manual` | Customer manual portal | `noindex,follow` |

11 indexable pages. This matches the ~11 real pages Search Console reports.

### Shared elements — there is no templating

Nav, topbar and footer are **hand-copied into all 13 files**. There are no includes,
no partials, no build step. Any nav or footer change is a 13-file edit — do it in
one pass and verify all 13, or don't start.

- `css/site.css` — single stylesheet, all pages. Fonts: Archivo, Archivo Narrow,
  Plus Jakarta Sans (self-hosted woff2 in `fonts/`).
- `js/site.js` — behaviour only: mobile nav, scroll reveal (`.rv`), hero slideshow,
  auto year (`[data-year]`), active-nav highlight driven by `<body data-page="…">`.
- `js/manual.js` — manual page only.
- Main nav (12 of 13 pages): Home · How it Works · Projects · Systems · About · Get in Touch.
- Topbar (all pages): "Active in Morocco & Perth · Pilot contracts open · EIC Accelerator €2.2M awarded".
- Footer (all pages): 9 page links + LinkedIn + Facebook.

### Config files

| File | Status |
|---|---|
| `robots.txt` | present, correct, points at the sitemap |
| `sitemap.xml` | present, 10 URLs, all real, extension-less |
| `_redirects` | present, 11 legacy WordPress paths → 301 |
| `llms.txt` | present, accurate, kept in sync with site copy |
| `_headers` | **absent** |
| `404.html` | **absent — see work item 1** |
| `wrangler.toml`, `functions/` | absent |

### Other directories

`images/` (237 MB), `downloads/` (PDFs + manual chapters), `Manual-pdf/` (LaTeX source),
`pdfjs/` (vendored viewer), `fonts/`.

---

## 2. Company context

- **Product**: SonixED™ — electrodialysis reversal, plus ultrasound-assisted scaling
  control, plus selective membrane coating. **SalinBloc™** is the containerised system.
- **Positioning**: a complete modular groundwater treatment solution, including brine
  valorization.
- **Dropped**: carbon capture and ocean applications. No references to either should
  remain anywhere on the site.
- **Key reference**: Perth Water Corporation pilot (Australia). Also Morocco and Germany.
- **Messaging rule**: lead with the client's problem, not the technology.
  **Nitrate is the main entry-point problem.**

### Numbers discipline

Never invent figures, client names or results. If a number is needed and not
already on the site or supplied by George, write `[PLACEHOLDER]` and flag it.

---

## 3. Open work items

Status reflects the audit of 2026-09-23.

### 1. SEO migration cleanup — **NOT DONE (critical)**

The old site was WordPress on Rocket.net. Search Console shows ~3,000 ghost WordPress
URLs (`/wp-content/`, `/wp-admin/`, `/category/`, `/tag/`, `/page/`, …) against ~11 real pages.

**Diagnosis complete.** Live checks on 2026-09-23 returned:

```
/wp-content/uploads/2023/01/foo.jpg   200
/wp-admin/                            200
/wp-login.php                         200
/category/news/                       200
/tag/water/                           200
/page/2/                              200
/feed/                                200
/author/admin/                        200
/wp-json/                             200
/xmlrpc.php                           200
/some-random-nonexistent-page/        200
```

Every unknown URL returns **HTTP 200 with a byte-identical copy of the homepage**
(22,772 bytes). Not a redirect — a 200. This is a soft-404 across an unbounded URL
space and it is the direct cause of the ghost-URL problem.

**Root cause**: Cloudflare Pages looks for a top-level `404.html`. If none exists it
assumes a single-page app and serves the root document for every unmatched path.
This repo has no `404.html`, so the entire site is in SPA fallback mode.

**Fix options, in order — all still to be approved:**

- **(a) Add `404.html` to the repo root.** One new file, no Cloudflare dashboard
  change. Immediately turns all ~3,000 ghost URLs into real 404s, plus every future
  typo'd URL. This is the highest-value single change available and should go first.
- **(b) True 410 for known WordPress patterns.** `_redirects` **cannot** serve 410 —
  Cloudflare Pages supports only 301, 302, 303, 307, 308 and 200 in that file
  (verified against Cloudflare docs, 2026-09-23). The only in-repo way to return 410
  is **Pages Functions**: a `functions/_middleware.js` that matches the WordPress
  path patterns and returns `new Response(null, { status: 410 })`. This adds a
  serverless layer to a currently static site — **ask George before creating
  `functions/`.** Google treats 404 and 410 almost identically for deindexing;
  410 is marginally faster. Option (a) alone is likely sufficient.
- **(c)** Cloudflare dashboard Bulk Redirects — **do not touch without asking.**

**Sitemap/robots**: already correct. `sitemap.xml` lists 10 URLs, all real, no ghosts;
`robots.txt` points at it. Only gap: `/privacy` is indexable but missing from the sitemap.

### 2. Homepage headline — **NOT DONE**

Current H1 is capability-led: *"Turn difficult groundwater into a reliable water
supply at up to 98% recovery."* Needs rewriting to lead with the client's problem
(nitrate). **Three options to be proposed; do not apply without George's approval.**

### 3. Dedicated nitrate page — **NOT DONE**

No `nitrate.html` exists. Nitrate content is currently scattered across
`groundwater.html` and homepage card 01. New page to cover: EU Nitrates Directive
and WHO limit; why RO is a poor fit (strips the calcium and magnesium the output
still needs); how SonixED removes nitrate selectively; Perth as reference.
George supplies the figures — use `[PLACEHOLDER]` until then.

### 4. Perth reference more prominent on homepage — **PARTIAL**

Perth currently appears three times: the topbar strip, a small reference block under
homepage card 01 ("Perth Water Corporation · 3 utility sites · nitrate compliance ·
active pilot"), and as the **second** project card, after Morocco. Not yet
headline-level prominence.

### 5. Organization Schema.org — **DONE on homepage only**

`index.html` carries a valid JSON-LD `Organization` block with `PostalAddress`,
`ContactPoint`, `legalName`, `taxID` (BE0652996179), `foundingDate`, `logo` and
`sameAs`. No other page has structured data. Possible follow-ups: add `streetAddress`
and `postalCode`; consider `WebSite` and `Product` schema. Not urgent.

### Additional defects found in the audit (not yet assigned)

1. **272 internal links are written as `.html`**, and Pages 308-redirects each one to
   the extension-less URL. Every internal click and crawl path costs a redirect hop.
2. **`brine-valorization.html` carries a stale 11-link nav**; all other pages have 7.
3. **`/groundwater`, `/brine-valorization` and `/applications` are absent from the
   main nav** — reachable only via footer and in-body links.
4. **`/contact` and `/contact-us` are two separate indexable contact pages**, both in
   the sitemap. Cannibalisation risk. Consolidating means changing a URL — **ask first.**
5. **Typo**, `brine-valorization.html:149`: "the integrated integrated desalination".
6. **Address inconsistency**, `contact-us.html`: meta description says
   "Römische Straat 18"; body and everywhere else say "Romeinse straat 18".
   The German form is wrong and appears in search snippets.
7. **`/privacy` missing from `sitemap.xml`.**
8. **`README.md` is stale** — describes a "BPED" technology absent from the site and
   names fonts the repo no longer uses.
9. **`images/candidates/` is 129 MB across 75 photos, of which only 3 are referenced.**
   Shipped on every deploy. Several unreferenced `.HEIC` files too (browsers can't
   display HEIC).
10. **No `_headers` file** — no security headers, no cache-control on static assets.

### Verified clean

- **No broken internal links.** Every `href`/`src`/`poster` across all 13 pages
  resolves to a file that exists.
- **Canonicals** present and correct on all 11 indexable pages, matching the sitemap.
- **No carbon-capture or ocean positioning** remains in page copy or `llms.txt`.
  The only survivors are three legacy redirect pairs in `_redirects`
  (`/carbon-capture-co2-valorisation`, `/co2-valorisation` → `/technology.html`),
  which are inbound old URLs rather than claims.
- **All files are valid UTF-8.**
- **og:image and Twitter card tags** present on all 12 public pages.

---

## 4. Working rules

- **Never commit or push without showing George the diff and getting an explicit OK.**
  A push to `main` publishes to the live site immediately.
- **Never delete a page or change a URL path without asking.** SEO risk.
- **One task at a time.** Keep changes minimal and consistent with existing style.
- **Never add `noindex`.** (`calculator.html` and `salinbloc-manual.html` already have
  it, deliberately — leave those alone.)
- **Never touch Cloudflare configuration without asking.** This includes creating
  `functions/`, `_headers`, or anything in the Cloudflare dashboard.
- **Never invent numbers, client names or results.** Use `[PLACEHOLDER]`.
- **Ask when unsure instead of guessing.**

### House style

- Hand-written HTML, no framework, no build step. Match the surrounding markup.
- Inline `style="…"` is used liberally in existing pages — follow suit rather than
  adding new CSS classes for one-off tweaks.
- Typographic entities are used throughout: `&mdash;`, `&ndash;`, `&thinsp;`,
  `&rsquo;`, `&trade;`. Keep them.
- `SonixED&trade;` and `SalinBloc&trade;` on first prominent use.
- Sections use `class="section"`, `section--soft`, `section--dark`; reveal animation
  via `class="rv"` with `d1`/`d2`/`d3` delay modifiers.
- New pages need: `<body data-page="…">`, canonical, og + twitter tags, the standard
  nav, and the standard footer.
