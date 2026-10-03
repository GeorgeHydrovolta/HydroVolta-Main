/* Hydrovolta site.js v2 */
(function(){

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
    document.querySelectorAll('.nav__links a[href]').forEach(function(a) {
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
    var KEYS  = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'gclid'];
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

    document.querySelectorAll('form').forEach(function(form) {
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
        '<p>This video is hosted on YouTube. Accept video cookies to play it here, or watch directly on YouTube.</p>' +
        '<div style="display:flex;gap:.75rem;flex-wrap:wrap;justify-content:center">' +
        '<button class="btn btn--gold btn--sm yt-accept-btn">Accept &amp; play</button>' +
        '<a href="' + wrap.getAttribute('data-src').replace('youtube-nocookie.com/embed','youtube.com/watch?v=').replace(/\?.*$/, '') + '" target="_blank" rel="noopener" class="btn btn--out btn--sm">Watch on YouTube</a>' +
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
    banner.setAttribute('aria-label', 'Cookie preferences');
    banner.innerHTML =
      '<div class="cookie-main">' +
        '<p>We use cookies for analytics, advertising measurement and embedded YouTube video. ' +
        'Necessary cookies are always on. See our <a href="/privacy">Privacy Policy</a>.</p>' +
        '<div class="cookie-actions">' +
          '<button class="btn btn--ghost btn--sm" id="cookie-accept">Accept all</button>' +
          '<button class="btn btn--ghost btn--sm" id="cookie-reject">Reject all</button>' +
          '<button class="btn btn--ghost btn--sm" id="cookie-settings" aria-expanded="false" aria-controls="cookie-panel">Settings</button>' +
        '</div>' +
      '</div>' +
      '<div class="cookie-panel" id="cookie-panel" hidden>' +
        '<label class="cookie-opt"><input type="checkbox" checked disabled> <span><strong>Necessary</strong> — required for the site to work. Always on.</span></label>' +
        '<label class="cookie-opt"><input type="checkbox" id="opt-analytics"' + (preset.analytics ? ' checked' : '') + '> <span><strong>Analytics</strong> — how the site is used, in aggregate.</span></label>' +
        '<label class="cookie-opt"><input type="checkbox" id="opt-marketing"' + (preset.marketing ? ' checked' : '') + '> <span><strong>Marketing</strong> — advertising measurement.</span></label>' +
        '<label class="cookie-opt"><input type="checkbox" id="opt-video"' + (preset.video ? ' checked' : '') + '> <span><strong>Video</strong> — play embedded YouTube video here.</span></label>' +
        '<div class="cookie-actions"><button class="btn btn--gold btn--sm" id="cookie-save">Save preferences</button></div>' +
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
