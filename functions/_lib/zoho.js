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
 *   ZOHO_LEAD_SOURCE     Website
 *
 * Scopes: ZohoCRM.modules.Leads.CREATE, ZohoCRM.settings.fields.READ,
 *         ZohoCRM.attachments.CREATE (only for the water analysis)
 *
 * The record is shaped to the CRM as it actually is, not as we assume it to
 * be: field metadata is read first, anything the module does not have is left
 * out and written into Description instead, and a picklist value the field
 * does not allow is dropped the same way. A field created later starts being
 * populated on its own, with no deploy.
 *
 * Nothing here may cost the visitor their submission: every failure returns
 * { ok: false, detail } and the caller still sends the email.
 */

const FIELDS = {
  // form field      -> Zoho API name, as agreed on 4 Nov 2026
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
  marketing_consent: 'Marketing_Consent',
  marketing_consent_date: 'Marketing_Consent_Date',
};

// Labels used when a value has to fall back into Description.
const LABELS = {
  Project_Stream: 'Project stream', Buyer_Type: 'Buyer type', TDS: 'TDS',
  Flow_m3_day: 'Flow (m3/day)', Water_Source: 'Water source',
  UTM_Source: 'utm_source', UTM_Medium: 'utm_medium', UTM_Campaign: 'utm_campaign',
  UTM_Content: 'utm_content', GCLID: 'gclid', Landing_Page: 'Landing page',
  Form_Language: 'Language', Marketing_Consent: 'Marketing consent',
  Marketing_Consent_Date: 'Marketing consent date', Lead_Source: 'Lead source',
};

let cachedToken = null;    // per isolate; Zoho tokens last an hour
let cachedFields = null;   // per isolate; module metadata changes rarely

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
  cachedToken = { value: json.access_token, expires: Date.now() + ((json.expires_in || 3600) * 1000) };
  return cachedToken.value;
}

/** api_name -> { type, values } for the Leads module, or null if unreadable. */
async function moduleFields(api, token) {
  if (cachedFields && cachedFields.expires > Date.now()) return cachedFields.value;
  try {
    const res = await fetch(api + '/crm/v6/settings/fields?module=Leads', {
      headers: { 'Authorization': 'Zoho-oauthtoken ' + token },
    });
    if (!res.ok) return null;
    const json = await res.json().catch(() => ({}));
    const map = {};
    for (const f of (json.fields || [])) {
      map[f.api_name] = {
        type: f.data_type,
        values: (f.pick_list_values || []).map((v) => v.actual_value),
      };
    }
    cachedFields = { value: map, expires: Date.now() + 600000 };   // 10 minutes
    return map;
  } catch (err) {
    return null;
  }
}

export async function createLead(env, values, file) {
  if (!zohoConfigured(env)) return { ok: false, detail: 'not configured' };

  const api = (env.ZOHO_API_HOST || 'https://www.zohoapis.com').replace(/\/$/, '');
  let token;
  try {
    token = await accessToken(env);
  } catch (err) {
    return { ok: false, detail: err.message };
  }

  const known = await moduleFields(api, token);
  const overflow = [];     // anything the CRM cannot hold as its own field

  function accepts(name, value) {
    if (!known) return true;                       // metadata unreadable: try anyway
    const f = known[name];
    if (!f) return false;                          // field does not exist
    if (f.type === 'picklist' && f.values.length && f.values.indexOf(String(value)) === -1) {
      return false;                                // value not in the list
    }
    return true;
  }

  function put(record, name, value) {
    if (value === '' || value === undefined || value === null) return;
    if (accepts(name, value)) { record[name] = value; return; }
    overflow.push((LABELS[name] || name) + ': ' + value);
  }

  const record = {
    Company: values.organisation || 'Unknown',
    Last_Name: values.contact_person || values.organisation || 'Unknown',
    Email: values.email,
  };
  put(record, 'Lead_Source', env.ZOHO_LEAD_SOURCE || 'Website');
  put(record, 'Phone', values.phone);
  put(record, 'Country', values.country);

  for (const [from, to] of Object.entries(FIELDS)) {
    let v = values[from];
    if (!v) continue;
    if (to === 'Flow_m3_day') {
      const n = parseFloat(v);
      if (isNaN(n)) continue;
      v = n;
    }
    if (to === 'Marketing_Consent') v = values.marketing_consent === 'yes';
    put(record, to, v);
  }

  const description = [
    values.contaminants ? 'Contaminants / target ions: ' + values.contaminants : '',
    values.target_output ? 'Target output: ' + values.target_output : '',
    values.notes ? 'Notes: ' + values.notes : '',
    file ? 'Water analysis attached: ' + file.name : '',
    overflow.length ? '\n--- fields not yet in the CRM ---\n' + overflow.join('\n') : '',
  ].filter(Boolean).join('\n');
  if (description) record.Description = description;

  async function post(body) {
    const res = await fetch(api + '/crm/v6/Leads', {
      method: 'POST',
      headers: { 'Authorization': 'Zoho-oauthtoken ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [body], trigger: ['workflow'] }),
    });
    const json = await res.json().catch(() => ({}));
    const first = json && json.data && json.data[0];
    return { res: res, json: json, first: first };
  }

  let out;
  try {
    out = await post(record);
  } catch (err) {
    return { ok: false, detail: 'unreachable' };
  }

  // Last resort: a lead with the essentials beats no lead at all.
  if (!out.res.ok || !out.first || out.first.code !== 'SUCCESS') {
    const why = (out.first && (out.first.message || out.first.code)) || ('HTTP ' + out.res.status);
    console.error('Zoho rejected the full record:', why, JSON.stringify(out.json).slice(0, 300));
    const minimal = {
      Company: record.Company,
      Last_Name: record.Last_Name,
      Email: record.Email,
      Description: [description, 'Full record was rejected by the CRM: ' + why]
        .filter(Boolean).join('\n'),
    };
    try {
      out = await post(minimal);
    } catch (err) {
      return { ok: false, detail: why };
    }
    if (!out.res.ok || !out.first || out.first.code !== 'SUCCESS') {
      const why2 = (out.first && (out.first.message || out.first.code)) || ('HTTP ' + out.res.status);
      console.error('Zoho rejected the minimal record too:', why2);
      return { ok: false, detail: why2 };
    }
    console.error('Zoho accepted a reduced lead; fields missing from the module:', overflow.length);
  }

  const id = out.first.details && out.first.details.id;

  if (file && id) {
    try {
      const form = new FormData();
      form.append('file', file, file.name || 'analysis');
      const up = await fetch(api + '/crm/v6/Leads/' + id + '/Attachments', {
        method: 'POST',
        headers: { 'Authorization': 'Zoho-oauthtoken ' + token },
        body: form,
      });
      if (!up.ok) console.error('Zoho attachment failed for lead', id, up.status);
    } catch (err) {
      console.error('Zoho attachment error for lead', id, err.message);
    }
  }

  return { ok: true, id: id, degraded: overflow.length > 0 };
}
