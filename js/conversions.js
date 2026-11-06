/* Lead conversion tracking — everything here waits for consent.
 *
 * One entry point: window.hvTrackLead(detail), called by a form once its
 * submission has actually succeeded. It fires, at most once per submission:
 *
 *   GA4 generate_lead        via the dataLayer, after ANALYTICS consent
 *   Google Ads conversion    after MARKETING consent
 *   LinkedIn conversion      after MARKETING consent
 *   Meta Pixel Lead          after MARKETING consent
 *
 * The LinkedIn and Meta base scripts are not in the page markup: they are
 * injected here, and only after marketing consent, so nothing reaches either
 * network for a visitor who declines. GA4 and Google Ads run through the
 * existing GTM container and Consent Mode v2.
 *
 * GOOGLE ADS NEEDS NO GTM TAG. An earlier version of this comment said it
 * needed two, on the reasoning that the repository contains no gtag.js. That
 * was wrong: it described the source, not the running page. The Google tag
 * AW-863150284 is installed inside container GTM-5XJF94PN, and it processes
 * gtag-style dataLayer pushes — which is how Consent Mode on this site has
 * always worked. Checked on the live site:
 *
 *   gtag('event','conversion',{send_to:'AW-863150284/clLsCMrQmrIdEMzBypsD',
 *                              transaction_id:'…'})
 *   -> googleadservices.com/pagead/conversion/863150284/
 *        label = clLsCMrQmrIdEMzBypsD
 *        oid   = the transaction_id
 *        gcs   = G111   (fires only once marketing consent is granted)
 *
 * The Google tag also sets the _gcl cookies, so a separate Conversion Linker
 * tag is not required either.
 *
 * A lead still pushes `hv_lead_submitted` to the dataLayer, as the single
 * signal anything else can read. Do not attach a Google Ads Conversion
 * Tracking tag to that event: the conversion is already sent from here, and
 * a second sender would double-count.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * PLACEHOLDERS — LinkedIn and Meta are still waiting on real values. Anything
 * containing PLACEHOLDER is treated as unset and skipped entirely.
 */
var HV_IDS = {
  adsConversionId:    'AW-863150284',            // Google Ads, 5 Nov 2026
  adsConversionLabel: 'clLsCMrQmrIdEMzBypsD',
  linkedinPartnerId:  'PLACEHOLDER_LI_PARTNER',  // e.g. 1234567
  linkedinConversionId: 'PLACEHOLDER_LI_CONV',   // numeric conversion id
  metaPixelId:        'PLACEHOLDER_META_PIXEL'   // e.g. 123456789012345
};
/* ────────────────────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  function configured(v) {
    return typeof v === 'string' && v && v.indexOf('PLACEHOLDER') === -1;
  }

  function consent() {
    try {
      var raw = localStorage.getItem('hv_consent');
      if (!raw) return { analytics: false, marketing: false };
      var c = JSON.parse(raw);
      return { analytics: !!c.analytics, marketing: !!c.marketing };
    } catch (e) {
      return { analytics: false, marketing: false };
    }
  }

  // ── base scripts, loaded only once marketing consent exists ──────────────
  var loaded = { li: false, meta: false };

  function loadLinkedIn() {
    if (loaded.li || !configured(HV_IDS.linkedinPartnerId)) return;
    loaded.li = true;
    window._linkedin_partner_id = HV_IDS.linkedinPartnerId;
    window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
    window._linkedin_data_partner_ids.push(HV_IDS.linkedinPartnerId);
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';
    document.head.appendChild(s);
  }

  function loadMeta() {
    if (loaded.meta || !configured(HV_IDS.metaPixelId)) return;
    loaded.meta = true;
    /* eslint-disable */
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq('init', HV_IDS.metaPixelId);
    window.fbq('track', 'PageView');
  }

  function applyMarketing() {
    if (!consent().marketing) return;
    loadLinkedIn();
    loadMeta();
  }

  // run on load, and again whenever the banner updates the choice
  applyMarketing();
  window.addEventListener('hv:consent', applyMarketing);
  document.addEventListener('DOMContentLoaded', applyMarketing);

  // ── the lead itself ──────────────────────────────────────────────────────
  // hvTrackLead is called by a form's success branch and nowhere else: after
  // the Pages Function has answered OK, which means Turnstile passed and the
  // enquiry was accepted. Never on a click, never on a validation error,
  // never on a failed submit.
  var fired = {};
  var FIRED_KEY = 'hv_lead_fired';

  /** A unique id per submission, used as the Google Ads transaction_id. */
  function newLeadId() {
    try {
      if (window.crypto && typeof crypto.randomUUID === 'function') {
        return 'hv-' + crypto.randomUUID();
      }
    } catch (e) {}
    return 'hv-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  /**
   * True if this form already reported a lead moments ago. The in-memory
   * guard covers two handlers in one page; the sessionStorage one covers a
   * back-button return or a bfcache restore, where the page object is new
   * but the submission is the same.
   */
  function duplicate(form) {
    if (fired[form]) return true;
    fired[form] = true;
    try {
      var map = JSON.parse(sessionStorage.getItem(FIRED_KEY) || '{}');
      var now = Date.now();
      if (map[form] && now - map[form] < 30000) return true;
      map[form] = now;
      sessionStorage.setItem(FIRED_KEY, JSON.stringify(map));
    } catch (e) {}       // private mode: the in-memory guard still applies
    return false;
  }

  window.hvTrackLead = function (detail) {
    detail = detail || {};
    var form = detail.form_name || 'form';
    if (duplicate(form)) return;

    var leadId = detail.lead_id || newLeadId();
    var lang = detail.language || document.documentElement.getAttribute('lang') || 'en';
    var path = detail.page_path || location.pathname;
    var c = consent();

    // The signal itself. No network traffic on its own, so it is pushed
    // whatever the consent choice; what reads it decides.
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'hv_lead_submitted',
        lead_id: leadId,
        form_language: lang,
        page_path: path,
        form_name: form
      });
    } catch (e) {}

    if (c.analytics) {
      try {
        window.dataLayer.push({
          event: 'generate_lead',
          lead_id: leadId,
          form_name: form,
          page_path: path,
          language: lang,
          buyer_type: detail.buyer_type || '',
          country: detail.country || ''
        });
      } catch (e) {}
    }

    if (!c.marketing) return;

    // Google Ads. The Google tag AW-863150284 is installed in the GTM
    // container and processes gtag-style dataLayer pushes - the same route
    // Consent Mode already uses - so this records the conversion without a
    // GTM tag of its own. Verified on the live site: the call produces
    // googleadservices.com/pagead/conversion/863150284/ with the label and
    // the transaction_id as oid.
    //
    // Do NOT also add a Google Ads Conversion Tracking tag in GTM triggered
    // by hv_lead_submitted: it would fire a second time. transaction_id
    // would collapse the pair at Google's end, but the honest arrangement is
    // one sender.
    if (configured(HV_IDS.adsConversionId) && configured(HV_IDS.adsConversionLabel)) {
      try {
        if (typeof window.gtag === 'function') {
          window.gtag('event', 'conversion', {
            send_to: HV_IDS.adsConversionId + '/' + HV_IDS.adsConversionLabel,
            transaction_id: leadId
          });
        }
      } catch (e) {}
    }

    loadLinkedIn();
    if (configured(HV_IDS.linkedinConversionId)) {
      try {
        if (typeof window.lintrk === 'function') {
          window.lintrk('track', { conversion_id: HV_IDS.linkedinConversionId });
        }
      } catch (e) {}
    }

    loadMeta();
    if (configured(HV_IDS.metaPixelId)) {
      try {
        if (typeof window.fbq === 'function') {
          window.fbq('track', 'Lead', {
            content_name: detail.form_name || '',
            content_category: detail.buyer_type || ''
          });
        }
      } catch (e) {}
    }
  };
})();
