/* Hydrovolta site.js v2 */
(function(){

  // ── Interface strings ───────────────────────────────────────────────────
  // The cookie banner and the YouTube placeholder are built here, not in the
  // page markup, so a translated page would otherwise show English controls.
  // A grep of the HTML will not find these. Keyed off <html lang>, English
  // for any language not listed.
  var STRINGS = {
    en: {
      cookieAria:   'Cookie preferences',
      cookieIntro:  'We use cookies for analytics, advertising measurement and embedded YouTube video. ' +
                    'Necessary cookies are always on. See our <a href="/privacy">Privacy Policy</a>.',
      acceptAll:    'Accept all',
      rejectAll:    'Reject all',
      settings:     'Settings',
      savePrefs:    'Save preferences',
      optNecessary: '<strong>Necessary</strong> — required for the site to work. Always on.',
      optAnalytics: '<strong>Analytics</strong> — how the site is used, in aggregate.',
      optMarketing: '<strong>Marketing</strong> — advertising measurement.',
      optVideo:     '<strong>Video</strong> — play embedded YouTube video here.',
      ytNotice:     'This video is hosted on YouTube. Accept video cookies to play it here, or watch directly on YouTube.',
      ytAccept:     'Accept &amp; play',
      ytWatch:      'Watch on YouTube'
    },
    fr: {
      cookieAria:   'Préférences de cookies',
      cookieIntro:  "Nous utilisons des cookies pour la mesure d'audience, la mesure publicitaire et les vidéos " +
                    'YouTube intégrées. Les cookies nécessaires sont toujours actifs. Consultez notre ' +
                    '<a href="/privacy">politique de confidentialité</a>.',
      acceptAll:    'Tout accepter',
      rejectAll:    'Tout refuser',
      settings:     'Paramètres',
      savePrefs:    'Enregistrer mes préférences',
      optNecessary: '<strong>Nécessaires</strong> — indispensables au fonctionnement du site. Toujours actifs.',
      optAnalytics: "<strong>Mesure d'audience</strong> — l'usage du site, de façon agrégée.",
      optMarketing: '<strong>Marketing</strong> — mesure publicitaire.',
      optVideo:     '<strong>Vidéo</strong> — lire ici les vidéos YouTube intégrées.',
      ytNotice:     'Cette vidéo est hébergée sur YouTube. Acceptez les cookies vidéo pour la lire ici, ou regardez-la directement sur YouTube.',
      ytAccept:     'Accepter et lire',
      ytWatch:      'Voir sur YouTube'
    },
    ar: {
      cookieAria:   'تفضيلات ملفات تعريف الارتباط',
      cookieIntro:  'نستخدم ملفات تعريف الارتباط لقياس الأداء وقياس الإعلانات وتشغيل فيديوهات YouTube المضمّنة. ' +
                    'الملفات الضرورية مفعّلة دائمًا. اطّلع على <a href="/privacy">سياسة الخصوصية</a>.',
      acceptAll:    'قبول الكل',
      rejectAll:    'رفض الكل',
      settings:     'الإعدادات',
      savePrefs:    'حفظ التفضيلات',
      optNecessary: '<strong>ضرورية</strong> — لازمة لعمل الموقع. مفعّلة دائمًا.',
      optAnalytics: '<strong>قياس الأداء</strong> — كيفية استخدام الموقع، بشكل مجمّع.',
      optMarketing: '<strong>التسويق</strong> — قياس الإعلانات.',
      optVideo:     '<strong>الفيديو</strong> — تشغيل فيديوهات YouTube المضمّنة هنا.',
      ytNotice:     'هذا الفيديو مستضاف على YouTube. اقبل ملفات تعريف الارتباط الخاصة بالفيديو لتشغيله هنا، أو شاهده مباشرة على YouTube.',
      ytAccept:     'قبول وتشغيل',
      ytWatch:      'مشاهدة على YouTube'
    }
  };
  var T = STRINGS[(document.documentElement.getAttribute('lang') || 'en').slice(0, 2).toLowerCase()] || STRINGS.en;

  // Auto year
  document.querySelectorAll('[data-year]').forEach(function(el){
    el.textContent = new Date().getFullYear();
  });

  // Mobile navigation
  var nav = document.querySelector('.nav');
  var btn = document.getElementById('menu-btn');
  var links = document.getElementById('nav-links');
  if (nav && btn && links) {
    btn.addEventListener('click', function() {
      var isOpen = links.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(isOpen));
    });
    document.addEventListener('click', function(e) {
      if (!nav.contains(e.target)) {
        links.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Scroll reveal
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.rv').forEach(function(el){ io.observe(el); });
  } else {
    document.querySelectorAll('.rv').forEach(function(el){ el.classList.add('in'); });
  }
  setTimeout(function() {
    document.querySelectorAll('.rv:not(.in)').forEach(function(el){ el.classList.add('in'); });
  }, 1500);

  // Hero slideshow
  var heroSlides = document.querySelectorAll('.hero__visual img');
  if (heroSlides.length > 1) {
    heroSlides.forEach(function(img) {
      img.style.willChange = 'opacity';
    });
    var cur = 0;
    setInterval(function() {
      var prev = cur;
      cur = (cur + 1) % heroSlides.length;
      heroSlides[prev].classList.remove('active');
      requestAnimationFrame(function() {
        heroSlides[cur].classList.add('active');
      });
    }, 5000);
  }

  // Active nav link highlight
  var activePage = document.body.getAttribute('data-page');
  if (activePage) {
    // Skip the language list: its links point at pages, not nav sections.
    document.querySelectorAll('.nav__links a[href]:not(.lang__list a)').forEach(function(a) {
      var href = a.getAttribute('href').replace(/\.html$/, '').replace(/^\//, '') || 'index';
      if (href === activePage) { a.setAttribute('aria-current', 'page'); }
    });
  }

  // ── CAMPAIGN ATTRIBUTION ──────────────────────────────
  // Capture ad parameters once, carry them for the whole session, and submit
  // them with every form so each lead in the CRM arrives with its source.
  // Last click wins: a fresh gclid or utm_* on the URL overwrites the stored one,
  // matching how Google Ads attributes a conversion.
  (function() {
    var KEYS  = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid'];
    var STORE = 'hv_attribution';
    var stored = {};

    try { stored = JSON.parse(sessionStorage.getItem(STORE) || '{}') || {}; } catch (e) { stored = {}; }

    var params = null;
    try { params = new URLSearchParams(window.location.search); } catch (e) {}

    if (params) {
      var changed = false;
      KEYS.forEach(function(k) {
        var v = params.get(k);
        if (v) { stored[k] = v; changed = true; }
      });
      if (changed) {
        try { sessionStorage.setItem(STORE, JSON.stringify(stored)); } catch (e) {}
      }
    }

    // The first page of the session is the landing page; the page's own lang
    // attribute tells the CRM which language the enquiry came in.
    try {
      if (!stored.landing_page) {
        stored.landing_page = location.pathname;
        sessionStorage.setItem(STORE, JSON.stringify(stored));
      }
    } catch (e) {}

    var EXTRA = {
      // Zoho's Landing_Page is a URL field, so send an absolute URL, not a path
      landing_page: location.origin + (stored.landing_page || location.pathname),
      language: document.documentElement.getAttribute('lang') || 'en'
    };

    document.querySelectorAll('form').forEach(function(form) {
      Object.keys(EXTRA).forEach(function(k) {
        if (form.querySelector('[name="' + k + '"]')) return;
        var hidden = document.createElement('input');
        hidden.type = 'hidden';
        hidden.name = k;
        hidden.value = EXTRA[k];
        form.appendChild(hidden);
      });
      // Stamp the consent the moment the box is ticked. Doing it on submit
      // is too late: the page's own handler builds the payload first.
      var box = form.querySelector('[name="marketing_consent"]');
      if (box) {
        box.addEventListener('change', function () {
          var when = form.querySelector('[name="marketing_consent_date"]');
          if (box.checked) {
            if (!when) {
              when = document.createElement('input');
              when.type = 'hidden';
              when.name = 'marketing_consent_date';
              form.appendChild(when);
            }
            when.value = new Date().toISOString();
          } else if (when) {
            when.remove();
          }
        });
      }

      KEYS.forEach(function(k) {
        if (!stored[k]) return;
        if (form.querySelector('[name="' + k + '"]')) return;
        var input = document.createElement('input');
        input.type  = 'hidden';
        input.name  = k;
        input.value = stored[k];
        form.appendChild(input);
      });
    });
  })();

  // ── LANGUAGE MENU ─────────────────────────────────────
  // Only approved languages are rendered; the rest sit commented out in the
  // markup. If English is the only one, the control has nothing to offer.
  (function () {
    var wrap = document.getElementById('lang-menu');
    var btn  = document.getElementById('lang-btn');
    var list = document.getElementById('lang-list');
    if (!wrap || !btn || !list) return;
    // Mark the language being read, so opening the menu always shows
    // something true even while English is the only approved page.
    var here = (document.documentElement.getAttribute('lang') || 'en').toLowerCase();
    // The chip is written as EN in the markup of every page. On a translated
    // page that is simply wrong, so it follows <html lang> instead.
    var chip = btn.querySelector('span');
    if (chip) { chip.textContent = here.slice(0, 2).toUpperCase(); }
    var links = list.querySelectorAll('a');
    Array.prototype.forEach.call(links, function (a) {
      if ((a.getAttribute('hreflang') || '').toLowerCase() !== here) return;
      a.setAttribute('aria-current', 'true');
      a.style.fontWeight = '600';
      if (a.textContent.indexOf('✓') === -1) { a.textContent = a.textContent + ' ✓'; }
    });

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = !list.hidden;
      list.hidden = open;
      btn.setAttribute('aria-expanded', String(!open));
    });
    document.addEventListener('click', function () {
      if (!list.hidden) { list.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !list.hidden) { list.hidden = true; btn.setAttribute('aria-expanded', 'false'); btn.focus(); }
    });
  })();

  // ── COOKIE CONSENT ────────────────────────────────────
  // Four categories: necessary, analytics, marketing, video.
  // Stored in localStorage under 'hv_consent'. Version 2 is a JSON object;
  // version 1 was the bare string 'accepted' / 'declined', which only ever
  // covered the YouTube embeds. A v1 value is honoured for video and the
  // visitor is asked again about the categories that did not exist then.
  var STORE = 'hv_consent';

  function loadYouTube() {
    document.querySelectorAll('.yt-embed[data-src]').forEach(function(wrap) {
      var src = wrap.getAttribute('data-src');
      var iframe = document.createElement('iframe');
      iframe.src = src;
      iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:0';
      iframe.setAttribute('allow', 'accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture');
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('loading', 'lazy');
      wrap.innerHTML = '';
      wrap.appendChild(iframe);
    });
  }

  function buildPlaceholders() {
    document.querySelectorAll('.yt-embed[data-src]').forEach(function(wrap) {
      wrap.className = 'yt-placeholder';
      wrap.innerHTML = '<div class="yt-placeholder-inner">' +
        '<p>' + T.ytNotice + '</p>' +
        '<div style="display:flex;gap:.75rem;flex-wrap:wrap;justify-content:center">' +
        '<button class="btn btn--gold btn--sm yt-accept-btn">' + T.ytAccept + '</button>' +
        '<a href="' + wrap.getAttribute('data-src').replace('youtube-nocookie.com/embed','youtube.com/watch?v=').replace(/\?.*$/, '') + '" target="_blank" rel="noopener" class="btn btn--out btn--sm">' + T.ytWatch + '</a>' +
        '</div></div>';
    });
    document.querySelectorAll('.yt-accept-btn').forEach(function(b) {
      b.addEventListener('click', function() {
        var c = readConsent() || { analytics: false, marketing: false, video: false };
        c.video = true;
        commit(c);
      });
    });
  }

  // Returns null when no usable choice is stored, so the banner is shown.
  // A v1 string resolves its video setting but still returns null, because the
  // visitor was never asked about analytics or marketing.
  function readConsent() {
    var raw = null;
    try { raw = localStorage.getItem(STORE); } catch (e) { return null; }
    if (!raw) return null;
    if (raw === 'accepted' || raw === 'declined') return null;
    try {
      var o = JSON.parse(raw);
      if (o && o.v === 2) return o;
    } catch (e) {}
    return null;
  }

  function legacyVideoChoice() {
    try { return localStorage.getItem(STORE) === 'accepted'; } catch (e) { return false; }
  }

  function saveConsent(c) {
    try {
      localStorage.setItem(STORE, JSON.stringify({
        v: 2,
        necessary: true,
        analytics: !!c.analytics,
        marketing: !!c.marketing,
        video: !!c.video,
        ts: Date.now()
      }));
    } catch (e) {}
  }

  // Push the choice to Google Consent Mode and act on the video category.
  function applyConsent(c) {
    try {
      if (typeof gtag === 'function') {
        gtag('consent', 'update', {
          'analytics_storage':  c.analytics ? 'granted' : 'denied',
          'ad_storage':         c.marketing ? 'granted' : 'denied',
          'ad_user_data':       c.marketing ? 'granted' : 'denied',
          'ad_personalization': c.marketing ? 'granted' : 'denied'
        });
      }
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'consent_update',
        consent_analytics: !!c.analytics,
        consent_marketing: !!c.marketing,
        consent_video: !!c.video
      });
    } catch (e) {}
    // let the conversion layer pick up a fresh marketing choice
    try { window.dispatchEvent(new CustomEvent('hv:consent', { detail: c })); } catch (e) {}
    if (c.video) { loadYouTube(); } else { buildPlaceholders(); }
  }

  function commit(c) {
    saveConsent(c);
    applyConsent(c);
    var banner = document.getElementById('cookie-banner');
    if (banner) hideBanner(banner);
  }

  // The banner is fixed to the bottom, so reserve exactly its height at the
  // foot of the page. Without this it can sit over the submit button of a form
  // on a small screen.
  function reserveSpace(banner) {
    if (!banner) return;
    var h = banner.offsetHeight;
    document.body.style.paddingBottom = h + 'px';
  }

  function releaseSpace() {
    document.body.style.paddingBottom = '';
  }

  function hideBanner(banner) {
    banner.classList.add('cookie-banner--hidden');
    releaseSpace();
    setTimeout(function() { banner.style.display = 'none'; }, 350);
  }

  function buildBanner(preset) {
    var banner = document.createElement('div');
    banner.id = 'cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-live', 'polite');
    banner.setAttribute('aria-label', T.cookieAria);
    banner.innerHTML =
      '<div class="cookie-main">' +
        '<p>' + T.cookieIntro + '</p>' +
        '<div class="cookie-actions">' +
          '<button class="btn btn--ghost btn--sm" id="cookie-accept">' + T.acceptAll + '</button>' +
          '<button class="btn btn--ghost btn--sm" id="cookie-reject">' + T.rejectAll + '</button>' +
          '<button class="btn btn--ghost btn--sm" id="cookie-settings" aria-expanded="false" aria-controls="cookie-panel">' + T.settings + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="cookie-panel" id="cookie-panel" hidden>' +
        '<label class="cookie-opt"><input type="checkbox" checked disabled> <span>' + T.optNecessary + '</span></label>' +
        '<label class="cookie-opt"><input type="checkbox" id="opt-analytics"' + (preset.analytics ? ' checked' : '') + '> <span>' + T.optAnalytics + '</span></label>' +
        '<label class="cookie-opt"><input type="checkbox" id="opt-marketing"' + (preset.marketing ? ' checked' : '') + '> <span>' + T.optMarketing + '</span></label>' +
        '<label class="cookie-opt"><input type="checkbox" id="opt-video"' + (preset.video ? ' checked' : '') + '> <span>' + T.optVideo + '</span></label>' +
        '<div class="cookie-actions"><button class="btn btn--gold btn--sm" id="cookie-save">' + T.savePrefs + '</button></div>' +
      '</div>';
    document.body.appendChild(banner);

    document.getElementById('cookie-accept').addEventListener('click', function() {
      commit({ analytics: true, marketing: true, video: true });
    });
    document.getElementById('cookie-reject').addEventListener('click', function() {
      commit({ analytics: false, marketing: false, video: false });
    });
    document.getElementById('cookie-settings').addEventListener('click', function() {
      var panel = document.getElementById('cookie-panel');
      var open = panel.hasAttribute('hidden');
      if (open) { panel.removeAttribute('hidden'); } else { panel.setAttribute('hidden', ''); }
      this.setAttribute('aria-expanded', String(open));
      reserveSpace(banner);
    });
    document.getElementById('cookie-save').addEventListener('click', function() {
      commit({
        analytics: document.getElementById('opt-analytics').checked,
        marketing: document.getElementById('opt-marketing').checked,
        video:     document.getElementById('opt-video').checked
      });
    });

    reserveSpace(banner);
    window.addEventListener('resize', function() { reserveSpace(banner); });
  }

  var stored = readConsent();
  if (stored) {
    applyConsent(stored);
  } else {
    // No v2 choice yet. Carry a v1 'accepted' through as the video default,
    // then ask about the categories that did not exist when it was given.
    buildBanner({ analytics: false, marketing: false, video: legacyVideoChoice() });
    buildPlaceholders();
  }

})();
