/* Gated downloads.
 *
 * Any link carrying data-gate opens a short form first. On submit the lead goes
 * to /api/download, which emails it to info@ and answers with a signed link
 * valid for 15 minutes; the file then downloads. Without JavaScript the link
 * still points at the file and the gate function serves an explanatory page.
 *
 * The attribution capture in site.js already writes utm_* and gclid into
 * sessionStorage under hv_attribution; this reads the same keys so a download
 * lead carries its source.
 */
(function () {
  'use strict';

  var links = document.querySelectorAll('a[data-gate]');
  if (!links.length || typeof window.fetch !== 'function') return;

  var dialog = null;

  function attribution() {
    try {
      return JSON.parse(sessionStorage.getItem('hv_attribution') || '{}') || {};
    } catch (e) {
      return {};
    }
  }

  function build() {
    var d = document.createElement('dialog');
    d.id = 'dl-gate';
    d.setAttribute('aria-labelledby', 'dl-gate-title');
    d.style.cssText = 'border:1px solid var(--b);border-radius:var(--rl);padding:0;max-width:430px;' +
      'width:calc(100% - 2rem);margin:auto;background:var(--w);color:var(--t);' +
      'box-shadow:0 24px 64px rgba(0,25,51,.25)';
    d.innerHTML =
      '<form method="dialog" id="dl-gate-form" style="padding:1.75rem 1.75rem 1.5rem">' +
        '<p class="ey" style="margin-bottom:.4rem">Document</p>' +
        '<h2 id="dl-gate-title" style="font-family:var(--fd);font-size:1.15rem;line-height:1.35;' +
          'margin-bottom:.35rem;color:var(--n1)">Where should we send it?</h2>' +
        '<p id="dl-gate-doc" style="font-size:.85rem;color:var(--m);margin-bottom:1.1rem"></p>' +
        '<label style="display:block;font-size:.78rem;font-weight:600;color:var(--m);' +
          'text-transform:uppercase;letter-spacing:.05em;margin-bottom:.3rem" for="dl-name">Name *</label>' +
        '<input id="dl-name" name="name" type="text" required autocomplete="name" ' +
          'style="width:100%;min-width:0;padding:.7rem .9rem;font:inherit;font-size:.92rem;' +
          'border:1px solid var(--b);border-radius:8px;margin-bottom:.85rem">' +
        '<label style="display:block;font-size:.78rem;font-weight:600;color:var(--m);' +
          'text-transform:uppercase;letter-spacing:.05em;margin-bottom:.3rem" for="dl-email">Work email *</label>' +
        '<input id="dl-email" name="email" type="email" required autocomplete="email" ' +
          'style="width:100%;min-width:0;padding:.7rem .9rem;font:inherit;font-size:.92rem;' +
          'border:1px solid var(--b);border-radius:8px;margin-bottom:.85rem">' +
        '<label style="display:block;font-size:.78rem;font-weight:600;color:var(--m);' +
          'text-transform:uppercase;letter-spacing:.05em;margin-bottom:.3rem" for="dl-org">Organisation</label>' +
        '<input id="dl-org" name="organisation" type="text" autocomplete="organization" ' +
          'style="width:100%;min-width:0;padding:.7rem .9rem;font:inherit;font-size:.92rem;' +
          'border:1px solid var(--b);border-radius:8px;margin-bottom:1rem">' +
        '<input type="text" name="company_website" tabindex="-1" autocomplete="off" aria-hidden="true" ' +
          'style="position:absolute;left:-9999px;width:1px;height:1px">' +
        '<p id="dl-gate-error" hidden style="font-size:.82rem;color:#a32d2d;background:#fcebeb;' +
          'border:1px solid #e24b4a;border-radius:8px;padding:.6rem .8rem;margin-bottom:.8rem"></p>' +
        '<div style="display:flex;gap:.6rem;flex-wrap:wrap">' +
          '<button type="submit" class="btn btn--gold btn--sm" id="dl-gate-send">Send me the document</button>' +
          '<button type="button" class="btn btn--out btn--sm" id="dl-gate-cancel">Cancel</button>' +
        '</div>' +
        '<p style="font-size:.74rem;color:var(--l);margin-top:.9rem">We use this to answer your ' +
          'enquiry. See our <a href="/privacy" style="color:var(--g)">privacy policy</a>.</p>' +
      '</form>';
    document.body.appendChild(d);
    d.querySelector('#dl-gate-cancel').addEventListener('click', function () { d.close(); });
    return d;
  }

  function open(link) {
    if (!dialog) dialog = build();
    var form = dialog.querySelector('#dl-gate-form');
    var err = dialog.querySelector('#dl-gate-error');
    var send = dialog.querySelector('#dl-gate-send');
    var path = link.getAttribute('href').replace(/^\//, '');

    dialog.querySelector('#dl-gate-doc').textContent =
      (link.getAttribute('data-gate') || 'This document') + ' — a PDF, sent straight to your browser.';
    err.hidden = true;
    send.disabled = false;
    send.textContent = 'Send me the document';

    form.onsubmit = function (e) {
      e.preventDefault();
      err.hidden = true;
      send.disabled = true;
      send.textContent = 'Sending…';

      var data = new FormData(form);
      data.append('file', path);
      data.append('page_path', location.pathname);
      var attr = attribution();
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'gclid'].forEach(function (k) {
        if (attr[k]) data.append(k, attr[k]);
      });

      fetch('/api/download', { method: 'POST', body: data, headers: { Accept: 'application/json' } })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (body) {
            if (!res.ok || !body.ok) {
              throw new Error(body.error || 'HTTP ' + res.status);
            }
            return body;
          });
        })
        .then(function (body) {
          try {
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({
              event: 'file_download',
              file_name: path,
              page_path: location.pathname
            });
          } catch (e) {}
          var a = document.createElement('a');
          a.href = body.url;
          a.setAttribute('download', '');
          document.body.appendChild(a);
          a.click();
          a.remove();
          dialog.close();
        })
        .catch(function (e) {
          if (window.console && console.error) { console.error('Download request failed:', e); }
          var why = (e && e.message ? String(e.message) : 'Something went wrong').replace(/\.$/, '');
          err.innerHTML = why +
            '. Email <a href="mailto:info@hydrovolta.com" style="color:#a32d2d;text-decoration:underline">' +
            'info@hydrovolta.com</a> and we will send it.';
          err.hidden = false;
          send.disabled = false;
          send.textContent = 'Send me the document';
        });
    };

    if (typeof dialog.showModal === 'function') { dialog.showModal(); } else { dialog.setAttribute('open', ''); }
    var first = dialog.querySelector('#dl-name');
    if (first) first.focus();
  }

  Array.prototype.forEach.call(links, function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      open(link);
    });
  });
})();
