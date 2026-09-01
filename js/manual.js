/* Hydrovolta SalinBloc manual page logic */
(function () {
  // Chapter -> starting page map for downloads/SalinBloc-User-Manual.pdf,
  // plus the standalone per-chapter PDF each row can be downloaded as.
  var CHAPTER_DIR = 'downloads/manual-chapters/';
  var CHAPTERS = [
    { key: 'about', label: 'About this manual', page: 8, file: '01-about-this-manual.pdf' },
    { key: 'safety', label: 'Safety', page: 14, file: '02-safety.pdf' },
    { key: 'overview', label: 'System overview', page: 24, file: '03-system-overview.pdf' },
    { key: 'install', label: 'Installation', page: 32, file: '04-installation.pdf' },
    { key: 'commissioning', label: 'Commissioning', page: 40, file: '05-commissioning.pdf' },
    { key: 'operation', label: 'Daily operation', page: 48, file: '06-daily-operation.pdf' },
    { key: 'maintenance', label: 'Maintenance & troubleshooting overview', page: 58, file: '07-maintenance-and-troubleshooting-overview.pdf' },
    { key: 'pretreatment', label: 'Pretreatment & Filtration Skid', page: 66, file: '08-pretreatment-and-filtration-skid.pdf' },
    { key: 'pumps', label: 'Feed & Process Pumps', page: 72, file: '09-feed-and-process-pumps.pdf' },
    { key: 'stacks', label: 'SonixED Stack Modules', page: 78, file: '10-sonixed-stack-modules.pdf' },
    { key: 'valves', label: 'Valves & Manifold', page: 84, file: '11-valves-and-manifold.pdf' },
    { key: 'dosing', label: 'Dosing System', page: 90, file: '12-dosing-system.pdf' },
    { key: 'sensors', label: 'Instrumentation & Sensors', page: 96, file: '13-instrumentation-and-sensors.pdf' },
    { key: 'cabinet', label: 'Control Cabinet, PLC & HMI', page: 102, file: '14-control-cabinet-plc-and-hmi.pdf' },
    { key: 'tanks', label: 'Tanks', page: 108, file: '15-tanks.pdf' },
    { key: 'telemetry', label: 'Telemetry & Remote Connectivity', page: 114, file: '16-telemetry-and-remote-connectivity.pdf' },
    { key: 'shutdown', label: 'Shutdown, Storage & Disposal', page: 120, file: '17-shutdown-storage-and-disposal.pdf' },
    { key: 'appparams', label: 'Appendix A: Parameter Tables', page: 126, file: '18-parameter-tables.pdf' },
    { key: 'appdrawings', label: 'Appendix B: Drawings', page: 130, file: '19-drawings.pdf' },
    { key: 'appcert', label: 'Appendix C: Certificates & Datasheets', page: 134, file: '20-certificates-and-datasheets.pdf' },
    { key: 'appglossary', label: 'Appendix D: Glossary', page: 140, file: '21-glossary.pdf' }
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
      var dl = ch.file
        ? '<a class="chapter-item__dl" href="' + CHAPTER_DIR + ch.file + '" download ' +
          'aria-label="Download ' + ch.label + ' as its own PDF" title="Download this chapter as its own PDF">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16"/></svg></a>'
        : '';
      return '<div class="chapter-item">' +
        '<button type="button" class="chapter-item__jump js-chapter-link" data-key="' + ch.key + '">' +
        '<span class="chapter-item__num">' + (i + 1) + '</span><span>' + ch.label + '</span></button>' +
        dl + '</div>';
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

  var downloadChapterBtn = document.getElementById('download-chapter-btn');

  function updateDownloadChapterBtn(ch) {
    if (!downloadChapterBtn) return;
    if (ch && ch.file) {
      downloadChapterBtn.href = CHAPTER_DIR + ch.file;
      downloadChapterBtn.textContent = 'Download this chapter (' + ch.label + ')';
      downloadChapterBtn.style.display = '';
    } else {
      downloadChapterBtn.style.display = 'none';
    }
  }

  function goToChapter(key, opts) {
    var ch = CHAPTERS.filter(function (c) { return c.key === key; })[0];
    if (!ch) return;
    whenReady(function () {
      var app = getApp();
      if (app) app.page = ch.page;
    });
    updateDownloadChapterBtn(ch);
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
