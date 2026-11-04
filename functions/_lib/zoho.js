/**
 * Zoho CRM — create a Lead from a website enquiry.
 *
 * Credentials (Cloudflare Pages → Settings → Variables and secrets, encrypted):
 *   ZOHO_CLIENT_ID       from api-console.zoho.com, Self Client
 *   ZOHO_CLIENT_SECRET   same place
 *   ZOHO_REFRESH_TOKEN   exchanged once for the scopes below
 * Plain variables, defaults shown (this account is on the US data centre):
 *   ZOHO_ACCOUNTS_HOST   https://accounts.zoho.com
 *   ZOHO_API_HOST        https://www.zohoapis.com
 *
 * Scopes needed: ZohoCRM.modules.Leads.CREATE
 *                ZohoCRM.attachments.CREATE   (only for the water analysis)
 *
 * Nothing here may cost the visitor their submission: every failure returns
 * { ok: false, detail } and the caller still sends the email.
 */

const FIELDS = {
  // form field      -> Zoho API name (as created in Leads on 4 Nov 2026)
  project_stream: 'Project_Stream',
  buyer_type: 'Buyer_Type',
  tds: 'TDS',
  flow: 'Flow_m3_day',
  water_source: 'Water_Source',
  utm_source: 'UTM_Source',
  utm_medium: 'UTM_Medium',
  utm_campaign: 'UTM_Campaign',
  utm_content: 'UTM_Content',
  gclid: 'GCLID',
  landing_page: 'Landing_Page',
  language: 'Form_Language',
};

let cachedToken = null;   // per isolate; Zoho tokens last an hour

export function zohoConfigured(env) {
  return Boolean(env.ZOHO_CLIENT_ID && env.ZOHO_CLIENT_SECRET && env.ZOHO_REFRESH_TOKEN);
}

async function accessToken(env) {
  if (cachedToken && cachedToken.expires > Date.now() + 60000) return cachedToken.value;
  const host = (env.ZOHO_ACCOUNTS_HOST || 'https://accounts.zoho.com').replace(/\/$/, '');
  const body = new URLSearchParams({
    refresh_token: env.ZOHO_REFRESH_TOKEN,
    client_id: env.ZOHO_CLIENT_ID,
    client_secret: env.ZOHO_CLIENT_SECRET,
    grant_type: 'refresh_token',
  });
  const res = await fetch(host + '/oauth/v2/token', { method: 'POST', body: body });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) {
    throw new Error('token refresh failed: ' + (json.error || res.status));
  }
  cachedToken = {
    value: json.access_token,
    expires: Date.now() + ((json.expires_in || 3600) * 1000),
  };
  return cachedToken.value;
}

/**
 * values: the validated form fields. file: the uploaded File, or null.
 * Returns { ok, id } or { ok: false, detail }.
 */
export async function createLead(env, values, file) {
  if (!zohoConfigured(env)) return { ok: false, detail: 'not configured' };

  const record = {
    Company: values.organisation || 'Unknown',
    Last_Name: values.contact_person || values.organisation || 'Unknown',
    Email: values.email,
    Lead_Source: env.ZOHO_LEAD_SOURCE || 'Website',
  };
  if (values.phone) record.Phone = values.phone;
  if (values.country) record.Country = values.country;

  for (const [from, to] of Object.entries(FIELDS)) {
    if (values[from]) record[to] = values[from];
  }
  if (values.flow) {
    const n = parseFloat(values.flow);
    if (!isNaN(n)) record.Flow_m3_day = n; else delete record.Flow_m3_day;
  }

  record.Marketing_Consent = values.marketing_consent === 'yes';
  if (record.Marketing_Consent && values.marketing_consent_date) {
    record.Marketing_Consent_Date = values.marketing_consent_date;
  }

  // Contaminants, target output and notes share Description, as agreed.
  const description = [
    values.contaminants ? 'Contaminants / target ions: ' + values.contaminants : '',
    values.target_output ? 'Target output: ' + values.target_output : '',
    values.notes ? 'Notes: ' + values.notes : '',
    file ? 'Water analysis attached: ' + file.name : '',
  ].filter(Boolean).join('\n');
  if (description) record.Description = description;

  const api = (env.ZOHO_API_HOST || 'https://www.zohoapis.com').replace(/\/$/, '');
  let token;
  try {
    token = await accessToken(env);
  } catch (err) {
    return { ok: false, detail: err.message };
  }

  let res, json;
  try {
    res = await fetch(api + '/crm/v6/Leads', {
      method: 'POST',
      headers: {
        'Authorization': 'Zoho-oauthtoken ' + token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: [record], trigger: ['workflow'] }),
    });
    json = await res.json().catch(() => ({}));
  } catch (err) {
    return { ok: false, detail: 'unreachable' };
  }

  const first = json && json.data && json.data[0];
  if (!res.ok || !first || first.code !== 'SUCCESS') {
    const why = (first && (first.message || first.code)) || ('HTTP ' + res.status);
    console.error('Zoho CRM rejected the lead:', why, JSON.stringify(json).slice(0, 400));
    return { ok: false, detail: why };
  }

  const id = first.details && first.details.id;

  // The analysis rides along as an attachment; losing it must not fail the lead.
  if (file && id) {
    try {
      const form = new FormData();
      form.append('file', file, file.name || 'analysis');
      const up = await fetch(api + '/crm/v6/Leads/' + id + '/Attachments', {
        method: 'POST',
        headers: { 'Authorization': 'Zoho-oauthtoken ' + token },
        body: form,
      });
      if (!up.ok) {
        console.error('Zoho attachment failed for lead', id, up.status);
      }
    } catch (err) {
      console.error('Zoho attachment error for lead', id, err.message);
    }
  }

  return { ok: true, id: id };
}
