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
    'ar/index.html': ('ar', 'irrigation'),
    'nl/irrigatie.html': ('nl', 'irrigation'),
    'pt/index.html': ('pt', 'irrigation'),
    'es/riego.html': ('es', 'irrigation'),
}

SWITCHER = re.compile(r'<div class="lang" id="lang-menu">.*?</div>\s*</div>', re.S)
ALTERNATE = re.compile(r'[ \t]*<link rel="alternate" hreflang="[^"]*" href="[^"]*"\s*/?>\n?')
CANONICAL = re.compile(r'(<link rel="canonical" href="[^"]*"\s*/?>)')

SVG = ('<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" '
       'stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/>'
       '<path d="M3 12h18M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18"/></svg>')


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
        rows.append('      <a href="%s" hreflang="%s" lang="%s">%s</a>'
                    % (href, code, code, L.LABEL[code]))
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
