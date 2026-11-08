# -*- coding: utf-8 -*-
"""Rewrite the language switcher and the hreflang block in every HTML file
from the single list in languages.py.

Run from the repository root:   python -I scripts/build_lang_chrome.py

Before this script the switcher was hand-copied into 33 files, with the
unpublished languages commented out in each one, and hreflang existed on
exactly one page. Both are now generated, so a language is published by
editing languages.py and running this.

What it touches, and nothing else:
  - the <div class="lang" id="lang-menu"> ... </div></div> block
  - <link rel="alternate" hreflang="..."> tags, which it replaces wholesale

It does not change robots tags, sitemap.xml, or any page copy.
"""
import glob
import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
os.chdir(os.path.dirname(HERE))

import languages as L  # noqa: E402

ARIA = {
    'en': 'Choose language',
    'nl': 'Kies een taal',
    'fr': 'Choisir la langue',
    'es': 'Elegir idioma',
    'pt': 'Escolher idioma',
    'ar': 'اختر اللغة',
}

# Which language and which page family each file is. Files that are not a
# language version of anything (404, the gated tools) still carry the switcher,
# and point at each language's home.
SPECIAL = {
    '404.html': ('en', ''),
    'calculator.html': ('en', ''),
    'salinbloc-manual.html': ('en', ''),
    # ar/index.html was the irrigation landing page until step 3. It is the
    # Arabic homepage now, so it is identified normally - slug '' - and the
    # special case is gone. Leaving it here put hreflang on a noindex draft.

    'nl/irrigatie.html': ('nl', 'irrigation'),
    'pt/index.html': ('pt', 'irrigation'),
    'es/riego.html': ('es', 'irrigation'),
}

# Files this script must not touch.
#
# ar/irrigation.html is, for now, a deliberate byte-for-byte copy of /ar/ with
# a canonical pointing back at it, while the Egypt and Jordan Ads final URLs
# are switched over. Regenerating its switcher would make the two pages differ
# and would give a canonicalised duplicate its own hreflang set. Remove it from
# here at step 3, when /ar/irrigation becomes the real Arabic irrigation page.
# Step 3 is done: the Ads final URLs point at /ar/irrigation, /ar/ is the
# Arabic homepage, and the copy is a page in its own right. Nothing is
# pinned any more.
SKIP = set()

SWITCHER = re.compile(r'<div class="lang" id="lang-menu">.*?</div>\s*</div>', re.S)
ALTERNATE = re.compile(r'[ \t]*<link rel="alternate" hreflang="[^"]*" href="[^"]*"\s*/?>\n?')
CANONICAL = re.compile(r'(<link rel="canonical" href="[^"]*"\s*/?>)')

SVG = ('<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" '
       'stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/>'
       '<path d="M3 12h18M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18"/></svg>')

# ── flags ───────────────────────────────────────────────────────────────────
# Inline SVG, not emoji. Windows ships no regional-indicator glyphs, so
# "\U0001F1EC\U0001F1E7" renders as the letters GB in every browser on Windows
# - which is most of the B2B audience. These are a few hundred bytes each, need
# no request, and look the same everywhere.
#
# A flag is a country and these are languages, so none of this is exact. Each
# choice and its alternatives:
#
#   en  United Kingdom. The usual European convention; swap for the US flag if
#       the audience reads as more American.
#   nl  Netherlands. Hydrovolta is Belgian, but the Dutch tricolour is what
#       readers expect for "Nederlands"; the Belgian flag would read as French
#       to half the country.
#   fr  France.
#   es  Spain, civil flag - no coat of arms, which does not survive 18px.
#   ar  Saudi Arabia, chosen by George on 2026-11-07. It is the usual choice
#       for an Arabic language switcher. Two things follow from the shahada it
#       carries: keep the official 3:2 proportions, which this viewbox is, and
#       never crop, rotate or distort it. At 18px the inscription cannot be
#       legible, so it is drawn as a calligraphic band above the sword rather
#       than as fake Arabic letterforms.
#
# Viewbox is 60x40 for all five so they share one size and sit on one baseline.
FLAG = {
    'en': ('<rect width="60" height="40" fill="#012169"/>'
           '<path d="M0 0 60 40M60 0 0 40" stroke="#fff" stroke-width="8"/>'
           '<path d="M0 0 60 40M60 0 0 40" stroke="#C8102E" stroke-width="4"/>'
           '<path d="M30 0V40M0 20H60" stroke="#fff" stroke-width="13"/>'
           '<path d="M30 0V40M0 20H60" stroke="#C8102E" stroke-width="8"/>'),
    'nl': ('<rect width="60" height="40" fill="#21468B"/>'
           '<rect width="60" height="26.7" fill="#fff"/>'
           '<rect width="60" height="13.3" fill="#AE1C28"/>'),
    'fr': ('<rect width="60" height="40" fill="#ED2939"/>'
           '<rect width="40" height="40" fill="#fff"/>'
           '<rect width="20" height="40" fill="#002395"/>'),
    'es': ('<rect width="60" height="40" fill="#AA151B"/>'
           '<rect y="10" width="60" height="20" fill="#F1BF00"/>'),
    'pt': ('<rect width="60" height="40" fill="#DA291C"/>'
           '<rect width="24" height="40" fill="#046A38"/>'
           '<circle cx="24" cy="20" r="7" fill="none" stroke="#FFE900" stroke-width="2"/>'),
    'ar': ('<rect width="60" height="40" fill="#006C35"/>'
           '<path d="M11 16q3.5-4.5 7 0t7 0 7 0 7 0" fill="none" stroke="#fff" '
           'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'
           '<path d="M18 10.5V13M32 10.5V13M46 10.5V13" stroke="#fff" '
           'stroke-width="1.6" stroke-linecap="round"/>'
           '<path d="M14 27H43" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>'
           '<path d="M14 27l5.5-3v6Z" fill="#fff"/>'
           '<path d="M43 23.5V30.5" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>'
           '<path d="M43 27h5" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>'),
}


def flag(code):
    return ('<svg class="lang__flag" viewBox="0 0 60 40" width="18" height="12" '
            'aria-hidden="true" focusable="false">%s</svg>' % FLAG[code])


def identify(path):
    """(language, English slug) for a file path."""
    p = path.replace('\\', '/')
    if p in SPECIAL:
        return SPECIAL[p]
    if '/' in p:
        lang, name = p.split('/', 1)
        slug = '' if name == 'index.html' else name[:-len('.html')]
        assert lang in L.CODES, '%s: unknown language directory' % p
        return lang, slug
    slug = '' if p == 'index.html' else p[:-len('.html')]
    return 'en', slug


def switcher(lang, slug):
    rows = []
    for code in L.IN_MENU:
        href = L.menu_url(code, slug)
        assert href, 'no URL for %s on page %r' % (code, slug)
        # The label is wrapped so the Arabic one can be laid out right-to-left
        # without flipping the row: the flag stays in the same column for every
        # entry, which is what makes the list read as a list.
        rows.append('      <a href="%s" hreflang="%s" lang="%s">%s<span>%s</span></a>'
                    % (href, code, code, flag(code), L.LABEL[code]))
    return ('<div class="lang" id="lang-menu">\n'
            '      <button type="button" class="lang__btn" id="lang-btn" aria-expanded="false" '
            'aria-haspopup="true" aria-label="%s">\n'
            '        %s\n'
            '        <span>%s</span>\n'
            '      </button>\n'
            '      <div class="lang__list" id="lang-list" hidden>\n'
            '%s\n'
            '      </div>\n'
            '    </div>' % (ARIA[lang], SVG, lang.upper(), '\n'.join(rows)))


def alternates(slug):
    pairs = L.hreflangs(slug)
    if not pairs:
        return ''
    return ''.join('<link rel="alternate" hreflang="%s" href="https://hydrovolta.com%s"/>'
                   % (code, href) for code, href in pairs)


def main():
    files = sorted(glob.glob('*.html')) + sorted(glob.glob('*/*.html'))
    changed = switched = flagged = 0
    for path in files:
        if path.replace(os.sep, '/') in SKIP:
            continue
        lang, slug = identify(path)
        s = before = io.open(path, encoding='utf-8').read()

        # 1. the switcher
        blocks = SWITCHER.findall(s)
        assert len(blocks) == 1, '%s: %d switcher blocks' % (path, len(blocks))
        new = switcher(lang, slug)
        if blocks[0] != new:
            s = s.replace(blocks[0], new, 1)
            switched += 1

        # 2. hreflang: drop whatever is there, then add the generated set
        s = ALTERNATE.sub('', s)
        # A page that is not itself approved gets no hreflang at all: pointing
        # Google at a noindex draft as a language alternate is a contradiction.
        alts = alternates(slug) if L.approved(lang, slug) else ''
        if alts:
            m = CANONICAL.search(s)
            assert m, '%s: hreflang needed but no canonical to anchor it to' % path
            s = s.replace(m.group(1), m.group(1) + alts, 1)
            flagged += 1

        # post-conditions
        assert s.count('id="lang-menu"') == 1, path
        assert '<!-- publish Nederlands' not in s, path + ': stale menu comment'
        want = len(L.hreflangs(slug)) if L.approved(lang, slug) else 0
        assert s.count('<link rel="alternate"') == want, path

        if s != before:
            io.open(path, 'w', encoding='utf-8', newline='').write(s)
            changed += 1
            print('  %-46s %s  switcher=%s  hreflang=%d'
                  % (path.replace('\\', '/'), lang,
                     'rebuilt' if blocks[0] != new else 'same', s.count('<link rel="alternate"')))

    print('\n  %d files, %d changed, %d switchers rebuilt, %d pages with hreflang'
          % (len(files), changed, switched, flagged))
    print('  languages in the menu: ' + ', '.join(L.IN_MENU))
    print('  approved pages: %d' % len(L.APPROVED))


if __name__ == '__main__':
    main()
