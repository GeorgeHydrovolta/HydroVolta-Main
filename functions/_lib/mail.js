/**
 * Shared helpers for the Pages Functions. Files under functions/_lib are not
 * routed — the leading underscore keeps them off the URL space.
 */

export function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Same-origin guard. A browser always sends Origin on a cross-origin POST. */
export function wrongOrigin(request) {
  const origin = request.headers.get('Origin');
  return Boolean(origin) && origin !== new URL(request.url).origin;
}

/** "a@x.com, b@x.com" -> [{ email_address: { address } }, …] */
export function recipients(value, fallback) {
  return String(value || fallback)
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean)
    .map((address) => ({ email_address: { address } }));
}

export function base64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  // btoa takes a string; chunk it so a large file cannot blow the call stack.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export async function verifyTurnstile(token, ip, secret) {
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

/**
 * Hand a message to Zoho ZeptoMail. Returns { ok } or { ok: false, detail }.
 * The caller decides what to tell the browser; the token never leaves here.
 */
export async function sendMail(env, message) {
  if (!env.ZEPTOMAIL_TOKEN) return { ok: false, status: 503, detail: 'not configured' };
  const host = (env.ZEPTOMAIL_HOST || 'https://cpaas.zoho.com').replace(/\/$/, '');
  let res, body;
  try {
    res = await fetch(host + '/v1.1/email', {
      method: 'POST',
      headers: {
        'Authorization': 'Zoho-enczapikey ' + env.ZEPTOMAIL_TOKEN,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(message),
    });
    body = await res.json().catch(() => ({}));
  } catch (err) {
    return { ok: false, status: 502, detail: 'unreachable' };
  }
  if (!res.ok) {
    console.error('ZeptoMail rejected the message', res.status, JSON.stringify(body).slice(0, 500));
    return { ok: false, status: 502, detail: (body && (body.message || body.error)) || ('HTTP ' + res.status) };
  }
  return { ok: true };
}

/* ── signed download links ──────────────────────────────────────────────── */

function bytesToHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return bytesToHex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data)));
}

/** A link that lets one visitor fetch one file for a short while. */
export async function signDownload(secret, path, ttlSeconds) {
  const exp = Math.floor(Date.now() / 1000) + (ttlSeconds || 900);
  const sig = await hmac(secret, path + '|' + exp);
  return path + '?e=' + exp + '&t=' + sig;
}

export async function validDownload(secret, path, exp, sig) {
  if (!secret || !exp || !sig) return false;
  if (!/^\d+$/.test(String(exp))) return false;
  if (Number(exp) < Math.floor(Date.now() / 1000)) return false;
  const expected = await hmac(secret, path + '|' + exp);
  if (expected.length !== String(sig).length) return false;
  // constant-time-ish compare
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ String(sig).charCodeAt(i);
  return diff === 0;
}
