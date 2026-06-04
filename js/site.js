/* Hydrovolta site.js v2 */
(function(){
  // Auto year
  document.querySelectorAll('[data-year]').forEach(el => {
    el.textContent = new Date().getFullYear();
  });

  // Mobile navigation
  const btn = document.getElementById('menu-btn');
  const links = document.getElementById('nav-links');
  if (btn && links) {
    btn.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      btn.setAttribute('aria-expanded', open);
    });
    document.addEventListener('click', e => {
      if (!btn.contains(e.target) && !links.contains(e.target)) {
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
    let cur = 0;
    setInterval(() => {
      heroSlides[cur].classList.remove('active');
      cur = (cur + 1) % heroSlides.length;
      heroSlides[cur].classList.add('active');
    }, 5000);
  }

  // Active nav link highlight
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav__links a[href]').forEach(a => {
    const href = a.getAttribute('href').split('/').pop();
    if (href === path) a.setAttribute('aria-current', 'page');
  });
})();
