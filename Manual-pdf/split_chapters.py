#!/usr/bin/env python3
"""Split the compiled SalinBloc manual PDF into one PDF per top-level chapter,
using the PDF's own bookmarks (written by hyperref) to find chapter boundaries."""
import re
import sys
from pathlib import Path

from pypdf import PdfReader, PdfWriter

SRC = Path(__file__).parent / "Salinbloc_Manual.pdf"
OUT_DIR = Path(__file__).parent / "chapters"


def slugify(title: str, index: int) -> str:
    title = re.sub(r"^[0-9A-Z]+(\.[0-9]+)*\s+", "", title)  # strip "3.2 " / "A " prefix
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return f"{index:02d}-{slug}.pdf"


def main():
    reader = PdfReader(SRC)
    chapters = []
    for item in reader.outline:
        if isinstance(item, list):
            continue  # skip nested (section-level) bookmarks
        page = reader.get_destination_page_number(item)
        chapters.append((item.title, page))

    if not chapters:
        sys.exit("No top-level bookmarks found in the PDF.")

    OUT_DIR.mkdir(exist_ok=True)
    total_pages = len(reader.pages)
    manifest = []

    for i, (title, start) in enumerate(chapters):
        end = chapters[i + 1][1] - 1 if i + 1 < len(chapters) else total_pages - 1
        writer = PdfWriter()
        for p in range(start, end + 1):
            writer.add_page(reader.pages[p])
        fname = slugify(title, i + 1)
        out_path = OUT_DIR / fname
        with open(out_path, "wb") as f:
            writer.write(f)
        manifest.append({"title": title, "file": fname, "pages": end - start + 1})
        print(f"{fname:55s} pages {start+1:>4}-{end+1:<4} ({end-start+1} pp)  {title}")

    import json
    with open(OUT_DIR / "manifest.json", "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"\nWrote {len(chapters)} chapter PDFs to {OUT_DIR}")


if __name__ == "__main__":
    main()
