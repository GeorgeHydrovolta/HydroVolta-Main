/**
 * Assessment form endpoint — Cloudflare Pages Function.
 *
 * Replaces Formspree. The browser posts the form to this URL on hydrovolta.com,
 * so the submission never touches a third-party form service; this function
 * validates it and hands it to Zoho ZeptoMail, which delivers it to info@.
 *
 * Secrets (Cloudflare Pages → Settings → Environment variables, encrypted —
 * never in this repository):
 *   ZEPTOMAIL_TOKEN   Send Mail Token from the ZeptoMail Mail Agent
 *   TURNSTILE_SECRET  Cloudflare Turnstile secret key
 * Plain variables, with the defaults below if unset:
 *   MAIL_FROM         forms@hydrovolta.com   (must be on the verified domain)
 *   MAIL_TO           info@hydrovolta.com
 *   ZEPTOMAIL_HOST    https://api.zeptomail.eu   (EU data centre)
 *
 * Responds with the same JSON shape the front end already handles:
 *   { ok: true } | { error: "…" }
 */

const MAX_ATTACHMENT = 8 * 1024 * 1024;   // ZeptoMail caps the whole message at 15 MB
const MAX_FIELD = 2000;
const MAX_NOTES = 8000;

// Field: [label, required]. Anything not listed here is ignored, so a new
// hidden input cannot smuggle content into the email.
const FIELDS = {
  organisation:   ['Organisation', true],
  contact_person: ['Contact person', true],
  email:          ['Work email', true],
  country:        ['Country / region', true],
  project_stream: ['Project stream', false],
  water_source:   ['Water source', false],
  tds:            ['TDS / salinity', false],
  flow:           ['Target flow', false],
  contaminants:   ['Contaminants / target ions', false],
  target_output:  ['Target output', false],
  notes:          ['Project notes', false],
  form_name:      ['Form', false],
  page_path:      ['Page', false],
  utm_source:     ['utm_source', false],
  utm_medium:     ['utm_medium', false],
  utm_campaign:   ['utm_campaign', false],
  utm_term:       ['utm_term', false],
  gclid:          ['gclid', false],
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function base64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  // btoa takes a string; chunk it so a large file cannot blow the call stack.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

async function verifyTurnstile(token, ip, secret) {
  if (!secret) return { ok: true, skipped: true };   // not configured yet
  if (!token) return { ok: false, reason: 'captcha missing' };
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST', body,
  });
  const out = await res.json().catch(() => ({}));
  return { ok: out.success === true, reason: (out['error-codes'] || []).join(', ') };
}

export async function onRequestPost({ request, env }) {
  // Same-origin only. A browser always sends Origin on a cross-origin POST.
  const origin = request.headers.get('Origin');
  if (origin) {
    const here = new URL(request.url).origin;
    if (origin !== here) return json({ error: 'Cross-origin submissions are not accepted.' }, 403);
  }

  let form;
  try {
    form = await request.formData();
  } catch (err) {
    return json({ error: 'Could not read the form data.' }, 400);
  }

  // Honeypot: a real visitor never fills a hidden field.
  if ((form.get('company_website') || '').toString().trim() !== '') {
    return json({ ok: true });            // look successful, deliver nothing
  }

  const turnstile = await verifyTurnstile(
    (form.get('cf-turnstile-response') || '').toString(),
    request.headers.get('CF-Connecting-IP'),
    env.TURNSTILE_SECRET
  );
  if (!turnstile.ok) {
    return json({ error: 'Spam check failed. Please reload the page and try again.' }, 400);
  }

  const values = {};
  for (const [key, spec] of Object.entries(FIELDS)) {
    const raw = form.get(key);
    // multipart text fields arrive CRLF-normalised; keep one newline flavour so
    // the \n -> <br> pass below does not leave stray carriage returns.
    const value = raw == null ? '' : raw.toString().replace(/\r\n?/g, '\n').trim();
    const cap = key === 'notes' ? MAX_NOTES : MAX_FIELD;
    if (value.length > cap) {
      return json({ error: spec[0] + ' is too long.' }, 400);
    }
    if (spec[1] && !value) {
      return json({ error: spec[0] + ' is required.' }, 400);
    }
    values[key] = value;
  }
  if (!EMAIL_RE.test(values.email)) {
    return json({ error: 'That work email address does not look right.' }, 400);
  }

  const attachments = [];
  const file = form.get('attachment');
  if (file && typeof file === 'object' && typeof file.arrayBuffer === 'function' && file.size > 0) {
    if (file.size > MAX_ATTACHMENT) {
      return json({ error: 'That file is larger than 8 MB — email it to info@hydrovolta.com instead.' }, 413);
    }
    attachments.push({
      name: (file.name || 'analysis').slice(0, 150),
      mime_type: file.type || 'application/octet-stream',
      content: base64(await file.arrayBuffer()),
    });
  }

  const rows = Object.entries(FIELDS)
    .filter(([key]) => values[key])
    .map(([key, spec]) =>
      '<tr><td style="padding:6px 12px 6px 0;color:#4f6070;vertical-align:top;white-space:nowrap">' +
      esc(spec[0]) + '</td><td style="padding:6px 0;color:#0b1c2e">' +
      esc(values[key]).replace(/\n/g, '<br>') + '</td></tr>')
    .join('');

  const subject = 'Assessment request — ' + values.organisation + ' (' + values.country + ')';
  const payload = {
    from: { address: env.MAIL_FROM || 'forms@hydrovolta.com', name: 'Hydrovolta website' },
    to: [{ email_address: { address: env.MAIL_TO || 'info@hydrovolta.com', name: 'Hydrovolta' } }],
    reply_to: [{ address: values.email, name: values.contact_person }],
    subject: subject,
    htmlbody:
      '<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.6">' +
      '<p style="margin:0 0 14px">New assessment request from the website.</p>' +
      '<table style="border-collapse:collapse">' + rows + '</table>' +
      (attachments.length
        ? '<p style="margin:14px 0 0;color:#4f6070">Attachment: ' + esc(attachments[0].name) + '</p>'
        : '') +
      '</div>',
    textbody: Object.entries(FIELDS)
      .filter(([key]) => values[key])
      .map(([key, spec]) => spec[0] + ': ' + values[key]).join('\n'),
  };
  if (attachments.length) payload.attachments = attachments;

  if (!env.ZEPTOMAIL_TOKEN) {
    return json({ error: 'Mail delivery is not configured yet.' }, 503);
  }

  const host = (env.ZEPTOMAIL_HOST || 'https://api.zeptomail.eu').replace(/\/$/, '');
  let res, body;
  try {
    res = await fetch(host + '/v1.1/email', {
      method: 'POST',
      headers: {
        'Authorization': 'Zoho-enczapikey ' + env.ZEPTOMAIL_TOKEN,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    body = await res.json().catch(() => ({}));
  } catch (err) {
    return json({ error: 'Mail service unreachable.' }, 502);
  }

  if (!res.ok) {
    // Log for the Cloudflare tail; never echo the token or the raw provider body.
    console.error('ZeptoMail rejected the message', res.status, JSON.stringify(body).slice(0, 500));
    const detail = (body && (body.message || body.error)) || ('HTTP ' + res.status);
    return json({ error: 'Mail service error: ' + detail }, 502);
  }

  return json({ ok: true });
}

// Anything other than POST, including a browser visiting the URL. Pages routes
// POST to onRequestPost; this forwards it anyway so the behaviour does not
// depend on which handler the runtime prefers.
export async function onRequest(context) {
  if (context.request.method === 'POST') return onRequestPost(context);
  return json({ error: 'Method not allowed.' }, 405);
}
