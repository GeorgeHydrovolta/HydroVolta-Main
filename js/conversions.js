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
 * ──────────────────────────────────────────────────────────────────────────
 * PLACEHOLDERS — replace these four values and nothing else:
 */
var HV_IDS = {
  adsConversionId:    'AW-PLACEHOLDER',          // e.g. AW-123456789
  adsConversionLabel: 'PLACEHOLDER_LABEL',       // the bit after the slash
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
  var fired = {};

  window.hvTrackLead = function (detail) {
    detail = detail || {};
    // One submission, one set of conversions, however many handlers call us.
    var key = (detail.form_name || 'form') + '|' + (detail.submission_id || '');
    if (fired[key]) return;
    fired[key] = true;

    var c = consent();

    if (c.analytics) {
      try {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          event: 'generate_lead',
          form_name: detail.form_name || '',
          page_path: detail.page_path || location.pathname,
          language: detail.language || document.documentElement.lang || 'en',
          buyer_type: detail.buyer_type || '',
          country: detail.country || ''
        });
      } catch (e) {}
    }

    if (!c.marketing) return;

    // Google Ads — through the same gtag the consent shim already defines.
    if (configured(HV_IDS.adsConversionId) && configured(HV_IDS.adsConversionLabel)) {
      try {
        if (typeof gtag === 'function') {
          gtag('event', 'conversion', {
            send_to: HV_IDS.adsConversionId + '/' + HV_IDS.adsConversionLabel
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
