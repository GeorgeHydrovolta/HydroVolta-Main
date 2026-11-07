# -*- coding: utf-8 -*-
"""Label English-only PDF downloads "(EN)" on every non-English page.

Run from the repository root:   python -I scripts/mark_en_downloads.py

The brochure, the datasheets and the case studies in /downloads/ exist in
English only. On a translated page the surrounding copy is in the visitor's
language, so a download button reads as though the document were too. The
marker says otherwise before the click, not after the download.

Idempotent: a label that already carries the marker is left alone, so this can
be re-run after each new language is built.

Where the marker goes:
  - a button or inline link  ->  at the end of its text, before any trailing
                                 arrow, so "Download the case study (EN) ->"
  - a card whose link wraps a heading  ->  at the end of the heading
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

MARKER = '&nbsp;(EN)'
ARROW = re.compile(r'(\s*(?:&rarr;|&larr;|→|←))\s*$')
OPEN = re.compile(r'<a\b[^>]*href="[^"]*\.pdf"[^>]*>')


def add(label):
    """Append the marker to one visible label, before a trailing arrow."""
    if '(EN)' in label:
        return label, False
    m = ARROW.search(label)
    if m:
        return label[:m.start()] + MARKER + m.group(1), True
    return label.rstrip() + MARKER, True


def mark(s, path):
    """Walk the PDF anchors back to front, so earlier offsets stay valid."""
    n = 0
    for m in reversed(list(OPEN.finditer(s))):
        start = m.end()
        end = s.find('</a>', start)
        assert end != -1, '%s: unclosed PDF anchor' % path
        inner = s[start:end]

        h = re.search(r'(<h[1-6]\b[^>]*>)(.*?)(</h[1-6]>)', inner, re.S)
        if h:
            new_label, did = add(h.group(2))
            if not did:
                continue
            new_inner = inner[:h.start()] + h.group(1) + new_label + h.group(3) + inner[h.end():]
        else:
            new_label, did = add(inner)
            if not did:
                continue
            new_inner = new_label
        s = s[:start] + new_inner + s[end:]
        n += 1
    return s, n


def main():
    files = []
    for code in L.CODES:
        if code == 'en':
            continue
        files += sorted(glob.glob(L.PREFIX[code].lstrip('/') + '/*.html'))

    total = 0
    for path in files:
        s = before = io.open(path, encoding='utf-8').read()
        s, n = mark(s, path)
        assert s.count('<a ') == before.count('<a '), path + ': anchor count changed'
        if s != before:
            io.open(path, 'w', encoding='utf-8', newline='').write(s)
            print('  %-46s %d download%s marked' % (path.replace('\\', '/'), n,
                                                    '' if n == 1 else 's'))
        total += n

    print('\n  %d PDF links marked across %d non-English pages' % (total, len(files)))
    left = []
    for path in files:
        s = io.open(path, encoding='utf-8').read()
        for m in OPEN.finditer(s):
            end = s.find('</a>', m.end())
            if '(EN)' not in s[m.end():end]:
                left.append(path)
    assert not left, 'unmarked PDF links remain: %s' % sorted(set(left))
    print('  every PDF link on a non-English page now carries the marker')


if __name__ == '__main__':
    main()
