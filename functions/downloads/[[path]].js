/**
 * Gate in front of /downloads/*.
 *
 * The four marketing PDFs are only served by /api/download, which asks for a
 * name and a work email first and then streams the bytes itself. Nothing is
 * signed and nothing needs configuring: a direct request for one of those
 * paths gets the page below instead of the file.
 *
 * Everything else under /downloads — the SalinBloc user manual and its 24
 * chapters, the quality reports — belongs to existing customers and is served
 * untouched.
 */
import { GATED } from '../api/download.js';

function wall() {
  const body = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<meta name="robots" content="noindex,nofollow"/>
<title>Document request | Hydrovolta</title>
<link rel="stylesheet" href="/css/site.css"/>
</head><body>
<section class="section" style="min-height:60vh">
  <div class="wrap" style="max-width:640px">
    <span class="ey">Document</span>
    <h1 style="font-size:1.8rem;margin:.5rem 0 1rem">This document is sent on request.</h1>
    <p class="lead">Ask for it from the page it sits on and it downloads immediately &mdash; we only
    need a name and a work email. Or email <a href="mailto:info@hydrovolta.com" style="color:var(--g)">info@hydrovolta.com</a>
    and we will send it over.</p>
    <div class="actions" style="margin-top:1.5rem">
      <a class="btn btn--gold" href="/systems">Systems &amp; brochure</a>
      <a class="btn btn--out" href="/technology">Technology &amp; datasheets</a>
    </div>
  </div>
</section>
</body></html>`;
  return new Response(body, {
    status: 403,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export async function onRequest(context) {
  const path = decodeURIComponent(new URL(context.request.url).pathname).replace(/^\/+/, '');
  if (Object.prototype.hasOwnProperty.call(GATED, path)) return wall();
  return context.next();               // manual, chapters, anything else
}
