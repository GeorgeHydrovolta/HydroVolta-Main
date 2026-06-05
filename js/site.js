/* Hydrovolta site.js v2 */
(function(){
  // Auto year
  document.querySelectorAll('[data-year]').forEach(el => {
    el.textContent = new Date().getFullYear();
  });

  // Mobile navigation
  const nav = document.querySelector('.nav');
  const btn = document.getElementById('menu-btn');
  const links = document.getElementById('nav-links');
  if (nav && btn && links) {
    btn.addEventListener('click', function() {
      const isOpen = links.classList.toggle('open');
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
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.rv').forEach(el => io.observe(el));
  // Fallback: reveal anything still hidden after 1.5s (handles edge cases)
  setTimeout(() => {
    document.querySelectorAll('.rv:not(.in)').forEach(el => el.classList.add('in'));
  }, 1500);

  // Hero slideshow
  const heroSlides = document.querySelectorAll('.hero__visual img');
  if (heroSlides.length > 1) {
    // Force-load all slides immediately (browsers may defer opacity:0 images)
    heroSlides.forEach(img => {
      if (img.dataset.src) { img.src = img.dataset.src; }
      img.style.willChange = 'opacity';
    });
    let cur = 0;
    setInterval(() => {
      const prev = cur;
      cur = (cur + 1) % heroSlides.length;
      // Remove active first, then add on next frame so CSS transition fires cleanly
      heroSlides[prev].classList.remove('active');
      requestAnimationFrame(() => {
        heroSlides[cur].classList.add('active');
      });
    }, 5000);
  }

  // Active nav link highlight — use canonical URL, reliable across all Cloudflare URL formats
  const canonical = document.querySelector('link[rel="canonical"]');
  const activePage = canonical
    ? canonical.href.replace(/\/$/, '').split('/').pop().replace(/\.html$/, '') || 'index'
    : window.location.pathname.replace(/\/$/, '').split('/').pop().replace(/\.html$/, '') || 'index';
  document.querySelectorAll('.nav__links a[href]').forEach(a => {
    const href = a.getAttribute('href').replace(/\.html$/, '');
    if (href === activePage) a.setAttribute('aria-current', 'page');
  });
})();
