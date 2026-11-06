# -*- coding: utf-8 -*-
"""The one language list for hydrovolta.com.

Everything about languages is decided here: which languages exist, which are
visible in the language switcher, which pages exist in each language, and which
of those are approved for search engines. `build_lang_chrome.py` reads this file
and rewrites the switcher and the hreflang block in every HTML file, so the
switcher and the hreflang tags cannot drift apart or drift from reality.

This is not a build step. Nothing runs on deploy. It is a maintenance script:
edit this file, run the builder, commit what it changed.

Two separate gates, deliberately:

  IN_MENU   a language appears in the switcher, so visitors can reach it.
  APPROVED  a page has been read by a native speaker. Only approved pages
            drop `noindex`, enter `sitemap.xml`, and take part in hreflang.

They are separate because a draft translation should be reachable by a visitor
who asks for it while still being invisible to Google. French is in that state
today: in the menu, not yet approved.

To publish a language: add its code to IN_MENU, add its pages to APPROVED,
run build_lang_chrome.py, then run the sitemap and noindex pass.
"""

# ─── the languages, in the order the switcher shows them ────────────────────
# code, label as the switcher prints it, text direction, og:locale, URL prefix
LANGUAGES = [
    ('en', 'English',    'ltr', 'en_US', ''),
    ('nl', 'Nederlands', 'ltr', 'nl_NL', '/nl'),
    ('fr', 'Français',   'ltr', 'fr_FR', '/fr'),
    ('es', 'Español',    'ltr', 'es_ES', '/es'),
    ('pt', 'Português',  'ltr', 'pt_PT', '/pt'),
    ('ar', 'العربية', 'rtl', 'ar', '/ar'),
]

DIR = {c: d for c, _, d, _, _ in LANGUAGES}
LABEL = {c: l for c, l, _, _, _ in LANGUAGES}
LOCALE = {c: o for c, _, _, o, _ in LANGUAGES}
PREFIX = {c: p for c, _, _, _, p in LANGUAGES}
CODES = [c for c, _, _, _, _ in LANGUAGES]

# ─── which languages the switcher offers ────────────────────────────────────
# Today's live state. nl, es and pt have only an ad landing page, which is not
# a language version of the site, so they are not offered.
# Dutch and Spanish are built and complete but stay out until George has had
# them read: his rule is that a language appears here only once its pages are
# approved. Adding 'nl' or 'es' is the single edit that publishes one.
IN_MENU = ['en', 'fr', 'ar']

# ─── which pages exist, per language ────────────────────────────────────────
# Keyed by the English slug, because that is what identifies a page across
# languages. '' is the home page. The value is the path under the language
# prefix; '' means the prefix itself.
EN_PAGES = ['', 'groundwater', 'irrigation', 'nitrate-removal',
            'electrodialysis-vs-reverse-osmosis', 'brine-valorization',
            'technology', 'systems', 'applications', 'projects', 'about',
            'contact', 'privacy']

# Pages that exist but are deliberately not indexable and not translated.
EN_UNLISTED = ['calculator', 'salinbloc-manual']

PAGES = {
    'en': {s: s for s in EN_PAGES},
    'fr': {s: s for s in EN_PAGES},
    # Dutch is a full mirror as of 2026-11-06. Its irrigation page is the
    # former ad landing page, moved from /nl/ to /nl/irrigatie, so Dutch has
    # one irrigation page rather than a landing page and a mirror.
    'nl': dict({s: s for s in EN_PAGES if s != 'irrigation'}, irrigation='irrigatie'),
    # Spanish is a full mirror as of 2026-11-06. It needed no URL move: its
    # ad landing page already sat at /es/riego rather than at /es/, so the
    # language root was free and /es/riego is the Spanish irrigation page.
    'es': dict({s: s for s in EN_PAGES if s != 'irrigation'}, irrigation='riego'),
    # Still only an ad landing page, sitting at the language root.
    'ar': {'irrigation': ''},
    'pt': {'irrigation': ''},
}

# ─── which pages are approved: indexable, in the sitemap, in hreflang ───────
# 'lang:slug'. English is approved throughout. /ar/ is approved and indexed
# today. Everything else is a draft awaiting a native reader - including
# nl:irrigation, which was already a noindex draft before it was moved to
# /nl/irrigatie, despite being a live ad destination.
APPROVED = set(['en:' + s for s in EN_PAGES]) | {'ar:irrigation'}


def exists(lang, slug):
    return slug in PAGES.get(lang, {})


def url(lang, slug):
    """The site-root-relative URL of a page, or None if it does not exist."""
    if not exists(lang, slug):
        return None
    tail = PAGES[lang][slug]
    pre = PREFIX[lang]
    if tail == '':
        return (pre + '/') if pre else '/'
    return (pre + '/' + tail) if pre else '/' + tail


def menu_url(lang, slug):
    """Where the switcher's entry for `lang` points, from a page whose English
    slug is `slug`. Falls back to that language's home when the counterpart
    does not exist, which is better than a 404."""
    return url(lang, slug) or url(lang, 'irrigation') or url(lang, '')


def approved(lang, slug):
    return ('%s:%s' % (lang, slug)) in APPROVED


def hreflangs(slug):
    """The hreflang set for one page family: only approved versions, and only
    when more than one language is approved. A lone language needs no hreflang.
    x-default is English, the language a visitor gets with no preference."""
    pairs = [(c, url(c, slug)) for c in CODES if exists(c, slug) and approved(c, slug)]
    if len(pairs) < 2:
        return []
    out = list(pairs)
    if approved('en', slug):
        out.append(('x-default', url('en', slug)))
    return out
