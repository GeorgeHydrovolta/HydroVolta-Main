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

})();
