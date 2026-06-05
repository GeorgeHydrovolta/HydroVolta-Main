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
      var href = a.getAttribute('href').replace(/\.html$/, '');
      if (href === activePage) { a.setAttribute('aria-current', 'page'); }
    });
  }

  // ── COOKIE CONSENT ────────────────────────────────────
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

  function hideBanner(banner) {
    banner.classList.add('cookie-banner--hidden');
    setTimeout(function(){ banner.style.display = 'none'; }, 350);
  }

  function buildPlaceholders() {
    document.querySelectorAll('.yt-embed[data-src]').forEach(function(wrap) {
      wrap.className = 'yt-placeholder';
      wrap.innerHTML = '<div class="yt-placeholder-inner">' +
        '<p>This video is hosted on YouTube. Accept cookies to play it here, or watch directly on YouTube.</p>' +
        '<div style="display:flex;gap:.75rem;flex-wrap:wrap;justify-content:center">' +
        '<button class="btn btn--gold btn--sm yt-accept-btn">Accept &amp; play</button>' +
        '<a href="' + wrap.getAttribute('data-src').replace('youtube-nocookie.com/embed','youtube.com/watch?v=').replace(/\?.*$/, '') + '" target="_blank" rel="noopener" class="btn btn--out btn--sm">Watch on YouTube</a>' +
        '</div></div>';
    });
    document.querySelectorAll('.yt-accept-btn').forEach(function(b) {
      b.addEventListener('click', function() { acceptCookies(); });
    });
  }

  function acceptCookies() {
    localStorage.setItem('hv_consent', 'accepted');
    var banner = document.getElementById('cookie-banner');
    if (banner) hideBanner(banner);
    loadYouTube();
  }

  function declineCookies() {
    localStorage.setItem('hv_consent', 'declined');
    var banner = document.getElementById('cookie-banner');
    if (banner) hideBanner(banner);
    buildPlaceholders();
  }

  var consent = localStorage.getItem('hv_consent');
  if (consent === 'accepted') {
    loadYouTube();
  } else {
    if (consent !== 'declined') {
      // Inject banner
      var banner = document.createElement('div');
      banner.id = 'cookie-banner';
      banner.innerHTML =
        '<p>We embed YouTube videos on this site. YouTube may set cookies when you play a video. ' +
        'See our <a href="privacy.html">Privacy Policy</a> for details.</p>' +
        '<div class="cookie-actions">' +
        '<button class="btn btn--gold btn--sm" id="cookie-accept">Accept cookies</button>' +
        '<button class="btn btn--ghost btn--sm" id="cookie-decline">Essential only</button>' +
        '</div>';
      document.body.appendChild(banner);
      document.getElementById('cookie-accept').addEventListener('click', acceptCookies);
      document.getElementById('cookie-decline').addEventListener('click', declineCookies);
    }
    buildPlaceholders();
  }

})();
