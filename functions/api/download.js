/**
 * Gated download — Cloudflare Pages Function.
 *
 * A visitor gives a name and a work email, this records the lead by emailing
 * it to info@, and answers with a short-lived signed link to the file. The
 * link is what functions/downloads/[[path]].js checks before serving.
 *
 * Only the marketing PDFs are gated. The SalinBloc manual and its chapters
 * belong to existing customers and stay open.
 */
import {
  json, esc, EMAIL_RE, wrongOrigin, recipients, verifyTurnstile, sendMail, signDownload,
} from '../_lib/mail.js';

// path -> the human name used in the notification
export const GATED = {
  'downloads/SalinBloc-Brochure.pdf': 'SalinBloc brochure',
  'downloads/SonixED-Skid-Datasheet-2025.pdf': 'SonixED skid datasheet',
  'downloads/SonixED-Case-Study-Industrial-2023.pdf': 'Industrial cooling-water case study',
  'downloads/SonixED-Nitrate-Removal-2024.pdf': 'Nitrate removal paper',
};

const MAX_FIELD = 200;

export async function onRequestPost({ request, env }) {
  if (wrongOrigin(request)) {
    return json({ error: 'Cross-origin requests are not accepted.' }, 403);
  }

  let form;
  try {
    form = await request.formData();
  } catch (err) {
    return json({ error: 'Could not read the form data.' }, 400);
  }

  if ((form.get('company_website') || '').toString().trim() !== '') {
    return json({ error: 'Please try again.' }, 400);   // honeypot: no link handed out
  }

  const turnstile = await verifyTurnstile(
    (form.get('cf-turnstile-response') || '').toString(),
    request.headers.get('CF-Connecting-IP'),
    env.TURNSTILE_SECRET
  );
  if (!turnstile.ok) {
    return json({ error: 'Spam check failed. Please reload the page and try again.' }, 400);
  }

  const file = (form.get('file') || '').toString().replace(/^\/+/, '');
  if (!Object.prototype.hasOwnProperty.call(GATED, file)) {
    return json({ error: 'Unknown file.' }, 404);
  }

  const name = (form.get('name') || '').toString().replace(/\r\n?/g, ' ').trim();
  const email = (form.get('email') || '').toString().trim();
  const organisation = (form.get('organisation') || '').toString().trim();
  if (!name) return json({ error: 'Please add your name.' }, 400);
  if (!EMAIL_RE.test(email)) return json({ error: 'That email address does not look right.' }, 400);
  if (name.length > MAX_FIELD || email.length > MAX_FIELD || organisation.length > MAX_FIELD) {
    return json({ error: 'That is longer than we can accept.' }, 400);
  }

  const title = GATED[file];
  const page = (form.get('page_path') || '').toString().slice(0, 200);
  const rows = [
    ['Document', title],
    ['Name', name],
    ['Email', email],
    ['Organisation', organisation],
    ['Requested from', page],
  ].filter(([, v]) => v);

  const sent = await sendMail(env, {
    from: { address: env.MAIL_FROM || 'forms@hydrovolta.com', name: 'Hydrovolta website' },
    to: recipients(env.DOWNLOAD_MAIL_TO, 'info@hydrovolta.com'),
    reply_to: [{ address: email, name: name }],
    subject: 'Document download — ' + title + (organisation ? ' (' + organisation + ')' : ''),
    htmlbody:
      '<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.6">' +
      '<p style="margin:0 0 14px">Someone downloaded a document from the website.</p>' +
      '<table style="border-collapse:collapse">' +
      rows.map(([k, v]) =>
        '<tr><td style="padding:6px 12px 6px 0;color:#4f6070;white-space:nowrap">' + esc(k) +
        '</td><td style="padding:6px 0;color:#0b1c2e">' + esc(v) + '</td></tr>').join('') +
      '</table></div>',
    textbody: rows.map(([k, v]) => k + ': ' + v).join('\n'),
  });

  // A broken or unconfigured mailer must never cost the visitor their
  // document. Hand the file over and make the lost lead loud in the logs.
  if (!sent.ok) {
    console.error('DOWNLOAD LEAD NOT EMAILED (' + sent.detail + '):',
      JSON.stringify({ name: name, email: email, organisation: organisation, file: file, page: page }));
  }

  const key = env.DOWNLOAD_SECRET || env.ZEPTOMAIL_TOKEN;
  // With no key configured the gate serves files unsigned, so send the plain path.
  const url = key ? await signDownload(key, '/' + file, 900) : '/' + file;
  return json({ ok: true, url: url, title: title });
}

export async function onRequest(context) {
  if (context.request.method === 'POST') return onRequestPost(context);
  return json({ error: 'Method not allowed.' }, 405);
}
