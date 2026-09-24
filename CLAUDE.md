# CLAUDE.md — Hydrovolta website

Working notes for Claude Code. Read this first every session.

Repo: `GeorgeHydrovolta/HydroVolta-Main` — this is the **live** hydrovolta.com.
A second repo (`josbrik/HydroVolta`) exists on the same machine and is **not** live; do not edit it.

Deployment: static site, no build step. Cloudflare Pages auto-deploys every push to `main`.
A push is a publish. There is no staging. Deploys take roughly 30–60 seconds.

Last full audit: 2026-09-23. Last updated: 2026-09-24 (after the internal-link rewrite).

---

## 1. Site structure

### Pages (14 HTML files in repo root)

Cloudflare Pages strips `.html`, so the canonical live path has no extension.

| File | Live URL | Purpose | Indexable |
|---|---|---|---|
| `index.html` | `/` | Homepage | yes |
| `groundwater.html` | `/groundwater` | Core business: high-recovery groundwater treatment | yes |
| `brine-valorization.html` | `/brine-valorization` | Chemical recovery from concentrate | yes |
| `technology.html` | `/technology` | SonixED™ deep-dive | yes |
| `systems.html` | `/systems` | SalinBloc™ containers + engineered skids | yes |
| `applications.html` | `/applications` | Six sector applications | yes |
| `projects.html` | `/projects` | Morocco, Perth, Brazil, Saudi | yes |
| `about.html` | `/about` | Company, leadership, credentials | yes |
| `contact.html` | `/contact` | Engineering-assessment intake form | yes |
| `contact-us.html` | `/contact-us` | General contact details | yes |
| `privacy.html` | `/privacy` | Privacy policy | yes |
| `calculator.html` | `/calculator` | Partner ED calculator | `noindex,nofollow` |
| `salinbloc-manual.html` | `/salinbloc-manual` | Customer manual portal | `noindex,follow` |
| `404.html` | *(served for any unmatched path)* | Error page | not linked, not in sitemap |

11 indexable pages. This matches the ~11 real pages Search Console reports.

A 15th file, `nitrate-removal.html`, exists in the working tree **untracked and
unpublished** pending figures — see work item 3. It carries the standard nav and
footer, so include it when doing a site-wide chrome edit, but do not commit it.

### Shared elements — there is no templating

Nav, topbar and footer are **hand-copied into all 14 files**. There are no includes,
no partials, no build step. Any nav or footer change is a 14-file edit — do it in
one scripted pass and verify all 14, or don't start.

- `css/site.css` — single stylesheet, all pages. Fonts: Archivo, Archivo Narrow,
  Plus Jakarta Sans (self-hosted woff2 in `fonts/`).
- `js/site.js` — behaviour only: mobile nav, scroll reveal (`.rv`), hero slideshow,
  auto year (`[data-year]`), active-nav highlight, cookie banner.
- `js/manual.js` — manual page only.
- **Main nav** (13 of 14 pages): Home · How it Works · Applications · Projects ·
  Systems · About · Get in Touch.
  `brine-valorization.html` is the exception — see open items.
- Topbar (all pages): "Active in Morocco & Perth · Pilot contracts open ·
  EIC Accelerator €2.2M awarded".
- Footer: link *targets* are the same everywhere, but the markup and link *labels*
  are **not** — there are 9 distinct footer variants. Ten pages use short labels
  ("Groundwater", "Technology", "Projects"); `index.html`,
  `brine-valorization.html` and `contact-us.html` use long ones
  ("Groundwater Desalination", "SonixED™ Technology", "Reference Projects").
  Do not assume the footers are identical — diff them before editing.

### Responsive breakpoints (`css/site.css`)

`900px` is the important one: the nav collapses to a hamburger at ≤900px, so the
desktop nav must fit from 901px up. Others: 1160, 1040, 820, 720, 600, 700.

### Config files

| File | Status |
|---|---|
| `404.html` | **present** — critical, see gotchas |
| `robots.txt` | present, correct, points at the sitemap |
| `sitemap.xml` | present, 11 URLs — exactly the 11 published indexable pages |
| `_redirects` | present, 11 legacy WordPress paths → 301 |
| `llms.txt` | present, accurate, kept in sync with site copy |
| `_headers` | absent |
| `wrangler.toml`, `functions/` | absent — do not create without asking |

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

Also respect the site's **maturity labels**. Perth is an *active pilot* /
*Utility Pilot Reference*, not a completed validation; Brazil is an LOI and Saudi
an MOU. Existing copy hedges deliberately ("in suitable applications", "in
selected cases") — keep those hedges when reusing a claim.

---

## 3. Gotchas learned the hard way

**`404.html` must use root-relative URLs.** It is served *at the URL the visitor
requested*, so relative paths resolve against that fake directory — from
`/wp-admin/`, `css/site.css` becomes `/wp-admin/css/site.css`. This shipped broken
once. Every other page sits at the root, so this is the only file with this
constraint. Test it from a nested path, never from the root.

**Never give `404.html` a canonical tag or `noindex`.** Self-canonicalising an
error page, or pointing it at the homepage, recreates the soft-404 signal the
file exists to remove. The 404 status is the signal Google acts on.

**The nav's active-link highlight is coupled to `data-page`.** `site.js` derives a
key from each nav `href` and compares it to `<body data-page="…">`. As of
2026-09-24 it strips a trailing `.html` *and* a leading `/`, falling back to
`index` when the result is empty:

```js
var href = a.getAttribute('href').replace(/\.html$/, '').replace(/^\//, '') || 'index';
```

So `/technology`, `technology.html` and `technology` all match. Any change to nav
href spelling must be checked against this line — a mismatch produces no error,
the highlight just silently stops appearing. It only runs in a browser, so curl
cannot detect the regression; load a page and check for `aria-current="page"`.

**`site.js` builds links of its own at runtime.** The cookie banner constructs its
own privacy-policy anchor in JS. A search of the HTML for link spellings will miss
it. Check `js/site.js` whenever link formats change.

**`git fetch` hangs in Claude Code sessions** — it waits on a credential prompt
that has nowhere to appear. Pushes work off cached credentials
(`GIT_TERMINAL_PROMPT=0 GIT_ASKPASS=echo git push`), but the remote-tracking ref
can be stale, so `git status` may misreport ahead/behind. Use
`git ls-remote origin refs/heads/main` to read the true remote state.

**Coordinate with GitHub Desktop.** George also commits and pushes from Desktop.
Twice a Desktop commit has swept up an uncommitted edit of Claude's, which
happened to work but left a commit message describing changes that landed in a
different commit. If Claude has edits in the working tree, re-read the git state
before committing. Ask George to mention Desktop pushes.

**`git commit -F` fails on long scratchpad paths** ("Filename too long"). Write
the message to `.git/cmsg.txt` instead and delete it afterwards.

**Verify rendered output, not just curl.** A page can return the right status and
the right HTML and still be visibly broken. Serve locally and check in the
browser, at desktop width, at 901px, and on mobile.

**`python -m http.server` is not a faithful preview and will mislead you.** It
serves `.webp` as `application/octet-stream`, which Chrome refuses to render, so
every image looks broken — this was diagnosed once by loading a known-good page
and seeing 11 of 12 images "fail". It also has no extension-less routing, so all
the site's root-relative links 404 locally. Use a preview server that sets the
correct MIME types, maps `/about` to `about.html`, and serves `404.html` for
unmatched paths. When a local result looks broken, test the same thing on an
existing page before believing it.

---

## 4. Open work items

### 1. SEO migration cleanup — **DONE** (2026-09-23)

The old site was WordPress on Rocket.net; Search Console showed ~1,950 ghost URLs
(`/wp-content/`, `/wp-admin/`, `/category/`, `/tag/`, `/page/`, …) against ~11 real pages.

**Root cause**: Cloudflare Pages looks for a top-level `404.html`; with none it
assumes a single-page app and serves the root document for *every* unmatched path.
The site had no `404.html`, so every non-existent URL returned **HTTP 200 with a
byte-identical copy of the homepage** — a soft 404 across an unbounded URL space.

**Fixed** by adding `404.html` (commits `d64e406`, `7496a97`). Verified live: 12
ghost paths → 404, 11 real pages → 200, legacy 301s intact.

**On 410**: `_redirects` **cannot** serve it — Cloudflare Pages supports only 301,
302, 303, 307, 308 and 200 there. A true 410 needs `functions/_middleware.js`,
which adds a serverless layer to a static site. Not done, and not needed: Google
deindexes 404 and 410 at nearly the same rate. **Ask before creating `functions/`.**

**Sitemap/robots**: were already correct.

Remaining: `/?p=123`-style URLs still return 200, which is *correct* — that is the
homepage with a query string, and its canonical consolidates it. Not fixable by
path rules.

### 2. Homepage headline — **DONE** (2026-09-24)

Was capability-led: *"Turn difficult groundwater into a reliable water supply at up
to 98% recovery."* Now leads with the problem (commits `8fe1c4e`, `facc71f`):

> **Nitrate above the limit. Minerals your water still needs.**

Lead paragraph: *"Reverse osmosis strips both. SonixED™ removes nitrate selectively
while retaining calcium and magnesium — so the output needs no remineralisation.
In active pilot with Perth Water Corporation across three utility sites, and a
project pipeline across four continents."*

Constraint card 01's heading was changed from "Nitrate above the limit. Minerals
still needed." (which the new H1 duplicated) to **"RO solves one problem and
creates another."** — which also makes cards 01/02/03 a parallel set.

The `<title>` tag was **deliberately left unchanged** so any search movement is
attributable to the H1 alone. Revisit separately.

The new lead dropped the brine valorization mention from the hero; it remains via
card 03 and two process-diagram hotspots.

### 3. Dedicated nitrate page — **DRAFTED, awaiting figures** (2026-09-24)

`nitrate-removal.html` exists in the working tree, **untracked and unpublished**.
It is deliberately not committed, not in `sitemap.xml`, not in `llms.txt` and not
in the nav, because it still carries 13 `[PLACEHOLDER]` markers. Publishing
placeholder text to a live site would be worse than not publishing.

URL chosen: `/nitrate-removal` rather than `/nitrate`, for the keyword match, and
consistent with the two-word `brine-valorization`.

Structure: hero → regulatory context (3 cards) → why RO is a poor fit (3 cards) →
mechanism, dark section (EDR / SEL / US) → performance comparison table → Perth →
fit / not-fit → CTA. Validated: tag balance, single H1, canonical, og/twitter,
standard nav and footer, no broken links, no overflow at desktop or mobile, table
fits its container and scrolls inside its wrapper on mobile.

**Regulatory claims verified against primary sources, not memory:**

- Drinking Water Directive (EU) 2020/2184 — nitrate 50 mg/l, nitrite 0.5 mg/l,
  Annex I Part B. In force since member-state transposition by 12 January 2023.
- WHO Guidelines for Drinking-water Quality — 50 mg/l as the nitrate ion, a
  short-term exposure guideline protecting bottle-fed infants against
  methaemoglobinaemia.
- Nitrates Directive 91/676/EEC — 50 mg/l to identify polluted groundwater and
  designate Nitrate Vulnerable Zones; 170 kg N/ha/yr manure cap inside an NVZ.

**The 13 figures George still owes**, all numeric:

- Comparison table: nitrate removal (both columns), calcium retained %,
  magnesium retained %, RO recovery range, energy kWh/m³ (both), feed TDS range.
- Perth: feed nitrate, product nitrate, feed TDS, recovery %, in operation since.

An interim option if the full set is slow: publish with the comparison table
trimmed to what is already verifiable, and add the rest later.

### 4. Perth reference more prominent on homepage — **PARTLY ADVANCED**

The new hero lead now names Perth above the fold ("In active pilot with Perth
Water Corporation across three utility sites"). Perth also appears in the topbar,
under constraint card 01, and as the second project card. Decide whether this is
enough or a dedicated treatment is still wanted.

### 5. Organization Schema.org — **ALREADY PRESENT**

`index.html` carries a valid JSON-LD `Organization` block with `PostalAddress`,
`ContactPoint`, `legalName`, `taxID` (BE0652996179), `foundingDate`, `logo` and
`sameAs`. No other page has structured data. Optional follow-ups: add
`streetAddress`/`postalCode`; consider `WebSite` and `Product` schema.

### Smaller defects — still open

Each of the four remaining needs George's judgement, not just an edit.

1. **`brine-valorization.html` has a stale 10-item nav** (Home · Groundwater ·
   Brine Valorization · Technology · Systems · Applications · Projects · About ·
   Contact · Get in Touch) while the other 13 pages have the 7-item nav.
   Normalising it means *removing* links — **ask first.**
2. **`/contact` and `/contact-us` are two indexable contact pages**, both in the
   sitemap. Cannibalisation risk. Consolidating changes a URL — **ask first.**
3. **`README.md` is stale** — describes a "BPED" technology absent from the site
   and names fonts the repo no longer uses. Needs George to say what is current.
4. **`images/candidates/` is 129 MB across 75 photos, of which only 3 are
   referenced.** Shipped on every deploy. Several unreferenced `.HEIC` files too
   (browsers cannot display HEIC). Deleting files George may still want.

Also **no `_headers` file** — no security headers, no cache-control on assets.
That is Cloudflare configuration, so **do not create it without asking.**

### Fixed since the audit

- **Internal `.html` links** — all 307 now point at the canonical extension-less
  URL (`79e845a`). No URL changed; the links simply pointed at the redirecting
  spelling. Removed ~307 308-hops per full crawl. Required the `site.js`
  highlight fix in the gotchas above.
- **Doubled word** on `brine-valorization.html` (`e9afdee`).
- **Address in `contact-us.html`'s meta description** — was "Römische Straat 18",
  now "Romeinse straat 18", matching the body (`e9afdee`). It appears in the
  search snippet.
- **`/privacy` added to `sitemap.xml`** (`e9afdee`). The sitemap now covers all
  11 published indexable pages exactly — verified against the filesystem.
- **`index.html` footer `<li>`** — the Privacy link was a bare `<a>` inside the
  `<ul>` with an orphan `</li>` (`d64e406`).
- **False regulatory claim** — the site said "EU Groundwater Directive compliance
  deadline December 2027 creates near-term procurement urgency" in three places
  (`applications.html`, `groundwater.html`, `llms.txt`). The directive was
  misnamed, the date did not correspond to a treatment obligation, and the
  framing pointed at a future deadline when the obligation is already binding.
  Replaced with the Drinking Water Directive's 50 mg/l parametric value, in force
  since January 2023 (`8a31eb1`). The correction is commercially stronger than
  what it replaced.

### Verified clean (as of 2026-09-23 audit)

- **No broken internal links** across all pages.
- **Canonicals** present and correct on all 11 indexable pages, matching the sitemap.
- **No carbon-capture or ocean positioning** in page copy or `llms.txt`. Only
  survivors are legacy redirect pairs in `_redirects`
  (`/carbon-capture-co2-valorisation`, `/co2-valorisation` → `/technology.html`),
  which are inbound old URLs rather than claims.
- **All files are valid UTF-8.**
- **og:image and Twitter card tags** on all public pages.

### Search Console baseline — captured 2026-09-24, report dated 2026-09-21

The report's "last update" was **2026-09-21**, two days *before* the 404 fix
deployed, so this is a clean before-picture with zero effect from the fix in it.
Compare future checks against this.

| Reason | Source | Pages |
|---|---|---|
| Not found (404) | Website | 1,098 |
| Alternate page with proper canonical tag | Website | 762 |
| Page with redirect | Website | 72 |
| Crawled – currently not indexed | Google systems | 19 |
| Blocked due to access forbidden (403) | Website | 2 |
| Duplicate without user-selected canonical | Website | 1 |
| Server error (5xx) | Website | 0 |
| Discovered – currently not indexed | Google systems | 0 |
| **Total not indexed** | | **1,954** |
| **Indexed** | | **11** |

- The ghost-URL population is **~1,950, not the ~3,000** originally estimated.
- **All 11 indexable pages are indexed.** Nothing real is missing from the index.
- The 762 "Alternate page with proper canonical tag" was the soft-404 bucket:
  ghost URLs were served the homepage HTML including its `rel=canonical` to `/`,
  so Google consolidated them to the homepage rather than indexing them as
  duplicates. That canonical was containing the damage.

**Expected trajectory — read this before concluding the fix failed.** As Google
re-crawls, the 762 migrate into "Not found (404)". So that row rises toward
~1,860 while "Alternate page" falls toward 0, and the headline "not indexed"
figure stays roughly **flat at ~1.95K for weeks**. That is the fix working.
Watch the split between those two rows, not the total. Google only drops a URL
from the report after 404ing it repeatedly over an extended period, so the total
declines much later.

**Do not run "Validate Fix" on the Not found (404) row.** Validation checks that
the reported condition is gone — but 404 is the intended outcome here.

Still to check:
- The **19 "Crawled – currently not indexed"** — confirm no page worth indexing
  is sitting in there. Probably all ghosts, since all 11 real pages are indexed.
- The **2 × 403** — not reproducible on the live site on 2026-09-24 (ten likely
  paths probed, all 404 or 200). Probably historical from the WordPress era, or
  Cloudflare bot-blocking. Low priority.

**"Page with redirect" (72) will grow**, because all 284 internal `.html` links
308-redirect to their extension-less form. That makes the `.html` link cleanup a
measurable crawl-budget issue rather than just tidiness.

### Waiting on George

- Whether to normalise `brine-valorization.html`'s nav (removes links).
- Whether Perth is now prominent enough on the homepage, or still wants a
  dedicated treatment.

---

## 5. Working rules

- **Never commit or push without showing George the diff and getting an explicit OK.**
  A push to `main` publishes to the live site immediately.
- **Never delete a page or change a URL path without asking.** SEO risk.
- **One task at a time.** Keep changes minimal and consistent with existing style.
- **Never add `noindex`.** (`calculator.html` and `salinbloc-manual.html` already
  have it, deliberately — leave those alone.)
- **Never touch Cloudflare configuration without asking.** Includes creating
  `functions/`, `_headers`, or anything in the Cloudflare dashboard.
- **Never invent numbers, client names or results.** Use `[PLACEHOLDER]`.
- **Ask when unsure instead of guessing.**
- **Verify on the live site after every push**, and say plainly when something
  shipped broken.

### House style

- Hand-written HTML, no framework, no build step. Match the surrounding markup.
- Files are minified-ish: long single lines. Edit with exact-string replacement and
  assert the match count is 1 before writing.
- Inline `style="…"` is used liberally — follow suit rather than adding new CSS
  classes for one-off tweaks.
- Typographic entities throughout: `&mdash;`, `&ndash;`, `&thinsp;`, `&rsquo;`,
  `&trade;`. Keep them.
- `SonixED&trade;` and `SalinBloc&trade;` on first prominent use.
- Voice: short declaratives, often two-part ("Active equipment. Operational data.").
  Impersonal, no hype, no exclamation marks.
- Sections use `class="section"`, `section--soft`, `section--dark`; reveal animation
  via `class="rv"` with `d1`/`d2`/`d3` delay modifiers.
- **Internal links are root-relative and extension-less**: `/about`, `/` for the
  homepage. Never `about.html` — Pages 308-redirects that spelling. Real file
  paths (`pdfjs/web/viewer.html`, `css/site.css`) are not page links; leave them.
- New pages need: `<body data-page="…">`, canonical, og + twitter tags, the standard
  nav, and the standard footer. Add them to `sitemap.xml` and `llms.txt` too.
