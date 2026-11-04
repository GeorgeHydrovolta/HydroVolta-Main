/**
 * Gate in front of /downloads/*.
 *
 * The four marketing PDFs are only served by /api/download, which asks for a
 * name and a work email first and then streams the bytes itself. Nothing is
 * signed and nothing needs configuring.
 *
 * A direct link to one of those paths — an old bookmark, an email signature, a
 * search result — is not a dead end: this page carries the same short form, so
 * the visitor still gets the document without having to find the page it sits
 * on.
 *
 * Everything else under /downloads — the SalinBloc user manual and its 24
 * chapters, the quality reports — belongs to existing customers and is served
 * untouched.
 */
import { GATED } from '../api/download.js';

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function wall(path, title) {
  const body = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<meta name="robots" content="noindex,nofollow"/>
<title>${esc(title)} | Hydrovolta</title>
<link rel="stylesheet" href="/css/site.css"/>
</head><body>
<section class="section" style="min-height:70vh">
  <div class="wrap" style="max-width:520px">
    <span class="ey">Document</span>
    <h1 style="font-size:1.6rem;margin:.5rem 0 .6rem">${esc(title)}</h1>
    <p class="lead" style="font-size:.95rem">Tell us where to send it and the download starts straight away.</p>

    <form id="req" style="margin-top:1.5rem;max-width:380px">
      <input type="hidden" name="file" value="${esc(path)}">
      <input type="text" name="company_website" tabindex="-1" autocomplete="off" aria-hidden="true"
             style="position:absolute;left:-9999px;width:1px;height:1px">
      <label for="n" style="display:block;font-family:var(--fd);font-size:.78rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--m);margin-bottom:.3rem">Name *</label>
      <input id="n" name="name" type="text" required autocomplete="name"
             style="width:100%;min-width:0;padding:.7rem .9rem;font:inherit;font-size:.92rem;border:1px solid var(--b);border-radius:8px;margin-bottom:.85rem">
      <label for="e" style="display:block;font-family:var(--fd);font-size:.78rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--m);margin-bottom:.3rem">Work email *</label>
      <input id="e" name="email" type="email" required autocomplete="email"
             style="width:100%;min-width:0;padding:.7rem .9rem;font:inherit;font-size:.92rem;border:1px solid var(--b);border-radius:8px;margin-bottom:.85rem">
      <label for="o" style="display:block;font-family:var(--fd);font-size:.78rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--m);margin-bottom:.3rem">Organisation</label>
      <input id="o" name="organisation" type="text" autocomplete="organization"
             style="width:100%;min-width:0;padding:.7rem .9rem;font:inherit;font-size:.92rem;border:1px solid var(--b);border-radius:8px;margin-bottom:1rem">
      <p id="err" hidden style="font-size:.82rem;color:#a32d2d;background:#fcebeb;border:1px solid #e24b4a;border-radius:8px;padding:.6rem .8rem;margin-bottom:.8rem"></p>
      <button type="submit" class="btn btn--gold" id="go">Send me the document</button>
      <p style="font-size:.74rem;color:var(--l);margin-top:.9rem">We use this to answer your enquiry.
      See our <a href="/privacy" style="color:var(--g)">privacy policy</a>.</p>
    </form>

    <p style="margin-top:1.75rem;font-size:.85rem;color:var(--m)">Prefer email? Write to
    <a href="mailto:info@hydrovolta.com" style="color:var(--g)">info@hydrovolta.com</a> and we will send it over.</p>
  </div>
</section>
<script>
(function () {
  var form = document.getElementById('req');
  var btn = document.getElementById('go');
  var err = document.getElementById('err');
  if (!form || typeof window.fetch !== 'function') return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    err.hidden = true;
    btn.disabled = true;
    btn.textContent = 'Sending\\u2026';
    var data = new FormData(form);
    data.append('page_path', location.pathname);
    fetch('/api/download', { method: 'POST', body: data })
      .then(function (res) {
        var type = res.headers.get('content-type') || '';
        if (!res.ok || type.indexOf('application/json') > -1) {
          return res.json().catch(function () { return {}; }).then(function (b) {
            throw new Error(b.error || 'HTTP ' + res.status);
          });
        }
        return res.blob();
      })
      .then(function (blob) {
        var href = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = href;
        a.setAttribute('download', ${JSON.stringify(path.split('/').pop())});
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(href); }, 30000);
        btn.textContent = 'Downloaded';
      })
      .catch(function (e) {
        var why = (e && e.message ? String(e.message) : 'Something went wrong').replace(/\\.$/, '');
        err.innerHTML = /info@hydrovolta\\.com/i.test(why) ? why
          : why + '. Email <a href="mailto:info@hydrovolta.com" style="color:#a32d2d;text-decoration:underline">info@hydrovolta.com</a> and we will send it.';
        err.hidden = false;
        btn.disabled = false;
        btn.textContent = 'Send me the document';
      });
  });
})();
</script>
</body></html>`;
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export async function onRequest(context) {
  const path = decodeURIComponent(new URL(context.request.url).pathname).replace(/^\/+/, '');
  if (Object.prototype.hasOwnProperty.call(GATED, path)) return wall(path, GATED[path]);
  return context.next();               // manual, chapters, anything else
}
