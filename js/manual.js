/* Hydrovolta SalinBloc manual page logic */
(function () {
  // Chapter -> starting page map for downloads/SalinBloc-User-Manual.pdf.
  // IMPORTANT: when the real manual replaces the placeholder PDF, update these
  // page numbers to match its actual table of contents.
  var CHAPTERS = [
    { key: 'safety', label: 'Safety Instructions', page: 1 },
    { key: 'installation', label: 'Installation & Setup', page: 2 },
    { key: 'pump', label: 'Pump Unit', page: 3 },
    { key: 'filtration', label: 'Filtration Module', page: 4 },
    { key: 'electrical', label: 'Electrical Control Panel', page: 5 },
    { key: 'valorization', label: 'Brine Valorization Unit', page: 6 },
    { key: 'maintenance', label: 'Maintenance Schedule', page: 7 },
    { key: 'troubleshooting', label: 'Troubleshooting', page: 8 },
    { key: 'warranty', label: 'Warranty & Compliance', page: 9 }
  ];
  window.SALINBLOC_CHAPTERS = CHAPTERS;

  var iframe = document.getElementById('manual-frame');
  var viewerSection = document.getElementById('manual-viewer');
  if (!iframe || !viewerSection) return;

  var chapterPanel = document.getElementById('chapters-panel');
  var chapterToggle = document.getElementById('chapters-toggle');
  var zoomInBtn = document.getElementById('zoom-in');
  var zoomOutBtn = document.getElementById('zoom-out');
  var zoomLevel = document.getElementById('zoom-level');

  function buildChapterMarkup() {
    return CHAPTERS.map(function (ch, i) {
      return '<button type="button" class="chapter-item js-chapter-link" data-key="' + ch.key + '">' +
        '<span class="chapter-item__num">' + (i + 1) + '</span>' + ch.label + '</button>';
    }).join('');
  }

  if (chapterPanel) chapterPanel.innerHTML = buildChapterMarkup();

  function closeChapterPanel() {
    if (!chapterPanel) return;
    chapterPanel.classList.remove('open');
    if (chapterToggle) chapterToggle.setAttribute('aria-expanded', 'false');
  }

  if (chapterToggle && chapterPanel) {
    chapterToggle.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = chapterPanel.classList.toggle('open');
      chapterToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    document.addEventListener('click', function (e) {
      if (!chapterPanel.classList.contains('open')) return;
      if (chapterPanel.contains(e.target) || e.target === chapterToggle || chapterToggle.contains(e.target)) return;
      closeChapterPanel();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeChapterPanel();
    });
  }

  function getApp() {
    try {
      return iframe.contentWindow && iframe.contentWindow.PDFViewerApplication;
    } catch (e) {
      return null;
    }
  }

  function whenReady(cb) {
    var app = getApp();
    if (app && app.initializedPromise) {
      app.initializedPromise.then(cb);
    } else {
      // Viewer not yet loaded (or same-origin app not attached) — retry briefly.
      var tries = 0;
      var t = setInterval(function () {
        tries++;
        var a = getApp();
        if (a && a.initializedPromise) {
          clearInterval(t);
          a.initializedPromise.then(cb);
        } else if (tries > 100) {
          clearInterval(t);
        }
      }, 100);
    }
  }

  function goToChapter(key, opts) {
    var ch = CHAPTERS.filter(function (c) { return c.key === key; })[0];
    if (!ch) return;
    whenReady(function () {
      var app = getApp();
      if (app) app.page = ch.page;
    });
    if (!opts || opts.updateUrl !== false) {
      var url = new URL(window.location.href);
      url.searchParams.set('chapter', key);
      window.history.replaceState({}, '', url);
    }
    if (!opts || opts.scroll !== false) {
      viewerSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  document.addEventListener('click', function (e) {
    var link = e.target.closest('.js-chapter-link');
    if (link) {
      goToChapter(link.getAttribute('data-key'));
      closeChapterPanel();
    }
  });

  function updateZoomLabel() {
    var app = getApp();
    if (app && zoomLevel) {
      zoomLevel.textContent = Math.round((app.pdfViewer.currentScale || 1) * 100) + '%';
    }
  }

  if (zoomInBtn) zoomInBtn.addEventListener('click', function () {
    whenReady(function () { var app = getApp(); if (app) { app.zoomIn(); setTimeout(updateZoomLabel, 150); } });
  });
  if (zoomOutBtn) zoomOutBtn.addEventListener('click', function () {
    whenReady(function () { var app = getApp(); if (app) { app.zoomOut(); setTimeout(updateZoomLabel, 150); } });
  });

  whenReady(function () {
    updateZoomLabel();
    var app = getApp();
    if (app && app.eventBus) {
      app.eventBus.on('scalechanging', updateZoomLabel);
    }
    // Deep link: ?chapter=key jumps straight to that chapter on load.
    var params = new URLSearchParams(window.location.search);
    var chapterParam = params.get('chapter');
    if (chapterParam) {
      goToChapter(chapterParam, { updateUrl: false, scroll: true });
    }
  });

  // ── Serial number quality report lookup ──────────────────────
  var serialForm = document.getElementById('serial-form');
  var serialInput = document.getElementById('serial-input');
  var resultBox = document.getElementById('report-result');

  function sanitizeSerial(raw) {
    return raw.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  }

  function showResult(state, serial) {
    if (!resultBox) return;
    resultBox.classList.remove('report-result--found', 'report-result--notfound');
    resultBox.classList.add('show');
    if (state === 'found') {
      var pdfPath = 'downloads/quality-reports/' + serial + '.pdf';
      resultBox.classList.add('report-result--found');
      resultBox.innerHTML =
        '<h3>Quality report found for ' + serial + '</h3>' +
        '<p>This is the factory quality report for your specific SalinBloc unit.</p>' +
        '<div class="actions">' +
        '<a class="btn btn--gold btn--sm" href="' + pdfPath + '" download>Download report</a>' +
        '<a class="btn btn--out btn--sm" href="' + pdfPath + '" target="_blank" rel="noopener">View in new tab</a>' +
        '</div>';
    } else {
      resultBox.classList.add('report-result--notfound');
      resultBox.innerHTML =
        '<h3>No report found for ' + serial + '</h3>' +
        '<p>Double-check the serial number on your unit\'s nameplate, or ' +
        '<a href="contact.html">contact support</a> and we\'ll send it to you directly.</p>';
    }
  }

  if (serialForm) {
    serialForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var serial = sanitizeSerial(serialInput.value || '');
      if (!serial) return;
      var pdfPath = 'downloads/quality-reports/' + serial + '.pdf';
      fetch(pdfPath, { method: 'HEAD' })
        .then(function (res) { showResult(res.ok ? 'found' : 'notfound', serial); })
        .catch(function () { showResult('notfound', serial); });
    });
  }
})();
