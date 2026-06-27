/**
 * PwebSearch — Vanilla JS hybrid search widget (keyword + semantic)
 *
 * Usage:
 *   <link rel="stylesheet" href="search.css">
 *   <script src="search.js" defer></script>
 *   <script>
 *     document.addEventListener('DOMContentLoaded', function() {
 *       PwebSearch.init({
 *         inputSelector: '#search-input',
 *         resultsSelector: '#search-results',
 *         navSelector: '.sidebar-nav',
 *         navDataUrl: '/repo/_assets/nav-data.json',
 *         searchApiUrl: 'https://api.puglieseweb.com/search',
 *         searchType: 'docs'
 *       });
 *     });
 *   </script>
 *
 * Backward-compatible: reads window.__navDataUrl / window.__searchApiUrl
 * if init() is not called explicitly.
 */
(function () {
  'use strict';

  var SEARCH_ICON_SVG = '<svg class="sr-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>';

  var _cfg = {};
  var _navData = [];
  var _abortCtrl = null;
  var _input = null;
  var _resultsBox = null;
  var _navEl = null;
  var _kwTimer = null;
  var _semTimer = null;
  var _activeIndex = -1;

  function esc(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c;
    });
  }

  function highlight(text, q) {
    if (!q) return esc(text);
    var re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
    return esc(text).replace(re, '<mark>$1</mark>');
  }

  function snippet(content, q) {
    if (!q || !content) return '';
    var lower = content.toLowerCase();
    var pos = lower.indexOf(q.toLowerCase());
    if (pos === -1) return '';
    var start = Math.max(0, pos - 40);
    var end = Math.min(content.length, pos + q.length + 80);
    var text = (start > 0 ? '\u2026' : '') + content.substring(start, end) + (end < content.length ? '\u2026' : '');
    return highlight(text, q);
  }

  function keywordSearch(q) {
    var terms = q.toLowerCase().split(/\s+/);
    var matches = [];
    for (var i = 0; i < _navData.length; i++) {
      var item = _navData[i];
      var titleLower = (item.title || '').toLowerCase();
      var pathLower = (item.path || '').toLowerCase();
      var snippetLower = (item.snippet || '').toLowerCase();
      var score = 0;
      for (var t = 0; t < terms.length; t++) {
        var term = terms[t];
        if (titleLower.indexOf(term) !== -1) score += 10;
        if (pathLower.indexOf(term) !== -1) score += 5;
        if (snippetLower.indexOf(term) !== -1) score += 1;
      }
      if (score > 0) matches.push({ item: item, score: score });
    }
    matches.sort(function (a, b) { return b.score - a.score; });
    return matches;
  }

  function semanticSearch(q, callback) {
    if (_abortCtrl) _abortCtrl.abort();
    if (!_cfg.searchApiUrl) { callback(null); return; }

    _abortCtrl = new AbortController();
    var typeParam = _cfg.searchType ? '&type=' + encodeURIComponent(_cfg.searchType) : '';
    var url = _cfg.searchApiUrl + '/articles?q=' + encodeURIComponent(q) + typeParam;

    fetch(url, { signal: _abortCtrl.signal })
      .then(function (r) { return r.json(); })
      .then(function (d) { callback(d.results || []); })
      .catch(function (e) {
        if (e.name !== 'AbortError') callback(null);
      });
  }

  function render(kwMatches, semResults, q) {
    var seen = {};
    var merged = [];

    // Keyword matches first
    for (var i = 0; i < Math.min(kwMatches.length, 50); i++) {
      var k = kwMatches[i].item;
      if (!seen[k.href]) {
        seen[k.href] = true;
        merged.push({ item: k, semantic: false });
      }
    }

    // Append semantic-only results
    if (semResults) {
      for (var j = 0; j < semResults.length; j++) {
        var s = semResults[j];
        var href = s.url || '';
        if (!seen[href]) {
          seen[href] = true;
          merged.push({
            item: { title: s.title || '', path: '', href: href, snippet: s.description || '' },
            semantic: true
          });
        }
      }
    }

    _activeIndex = -1;
    var html = '';

    if (merged.length === 0) {
      html = '<div class="sr-empty">' + SEARCH_ICON_SVG +
        'No results for \u201c' + esc(q) + '\u201d</div>';
    } else {
      html = '<div class="sr-count">' + merged.length + ' result' +
        (merged.length !== 1 ? 's' : '') + '</div>';

      for (var x = 0; x < merged.length; x++) {
        var m = merged[x].item;
        var sn = snippet(m.snippet || '', q);
        var semBadge = merged[x].semantic
          ? '<span class="sr-semantic-badge">semantic</span>'
          : '';
        html += '<a class="sr-item" href="' + esc(m.href) + '" data-idx="' + x + '">' +
          '<span class="sr-title">' + highlight(m.title || '', q) + semBadge + '</span>' +
          (m.path ? '<span class="sr-path">' + esc(m.path) + '</span>' : '') +
          (sn ? '<span class="sr-snippet">' + sn + '</span>' : '') +
          '</a>';
      }
    }

    _resultsBox.innerHTML = html;
    _resultsBox.classList.add('active');
    if (_navEl) _navEl.style.display = 'none';

    // Remove spinner if present
    var spinner = _resultsBox.querySelector('.search-spinner');
    if (spinner) spinner.remove();
  }

  function showSpinner() {
    var existing = _resultsBox.querySelector('.search-spinner');
    if (!existing) {
      // Only add spinner if results already shown (semantic follow-up)
      var spinner = document.createElement('div');
      spinner.className = 'search-spinner';
      _resultsBox.appendChild(spinner);
    }
  }

  function clearResults() {
    _resultsBox.classList.remove('active');
    _resultsBox.innerHTML = '';
    _activeIndex = -1;
    if (_navEl) _navEl.style.display = '';
  }

  function navigateResults(direction) {
    var items = _resultsBox.querySelectorAll('.sr-item');
    if (items.length === 0) return;

    // Remove current active
    if (_activeIndex >= 0 && _activeIndex < items.length) {
      items[_activeIndex].classList.remove('sr-active');
    }

    _activeIndex += direction;
    if (_activeIndex < 0) _activeIndex = items.length - 1;
    if (_activeIndex >= items.length) _activeIndex = 0;

    items[_activeIndex].classList.add('sr-active');
    items[_activeIndex].scrollIntoView({ block: 'nearest' });
  }

  function selectActive() {
    var items = _resultsBox.querySelectorAll('.sr-item');
    if (_activeIndex >= 0 && _activeIndex < items.length) {
      var href = items[_activeIndex].getAttribute('href');
      if (href) window.location.href = href;
    }
  }

  function onInput() {
    clearTimeout(_kwTimer);
    clearTimeout(_semTimer);
    var q = _input.value.trim();

    if (q.length < 2) {
      clearResults();
      return;
    }

    // Keyword search — fast
    _kwTimer = setTimeout(function () {
      var km = keywordSearch(q);
      render(km, null, q);

      // Semantic search — delayed
      _semTimer = setTimeout(function () {
        showSpinner();
        semanticSearch(q, function (sr) {
          if (sr !== null) render(keywordSearch(q), sr, q);
        });
      }, 400);
    }, 150);
  }

  function onKeydown(e) {
    if (e.key === 'Escape') {
      _input.value = '';
      clearResults();
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); navigateResults(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); navigateResults(-1); }
    else if (e.key === 'Enter' && _activeIndex >= 0) { e.preventDefault(); selectActive(); }
  }

  function init(options) {
    _cfg = options || {};

    // Backward-compatibility
    if (!_cfg.navDataUrl) _cfg.navDataUrl = window.__navDataUrl || '';
    if (!_cfg.searchApiUrl) _cfg.searchApiUrl = window.__searchApiUrl || '';
    if (!_cfg.searchType) _cfg.searchType = window.__searchType || 'docs';
    if (!_cfg.inputSelector) _cfg.inputSelector = '#search-input';
    if (!_cfg.resultsSelector) _cfg.resultsSelector = '#search-results';
    if (!_cfg.navSelector) _cfg.navSelector = '.sidebar-nav';

    _input = document.querySelector(_cfg.inputSelector);
    _resultsBox = document.querySelector(_cfg.resultsSelector);
    _navEl = document.querySelector(_cfg.navSelector);

    if (!_input || !_resultsBox) return;

    // Load nav data
    if (_cfg.navDataUrl) {
      fetch(_cfg.navDataUrl)
        .then(function (r) { return r.json(); })
        .then(function (d) { _navData = d || []; })
        .catch(function () { /* silently degrade */ });
    }

    _input.addEventListener('input', onInput);
    _input.addEventListener('keydown', onKeydown);
  }

  function search(query) {
    if (_input) {
      _input.value = query;
      onInput();
    }
  }

  function clear() {
    if (_input) {
      _input.value = '';
      clearResults();
    }
  }

  function destroy() {
    if (_input) {
      _input.removeEventListener('input', onInput);
      _input.removeEventListener('keydown', onKeydown);
    }
    clearResults();
    _navData = [];
  }

  // Auto-init for backward compatibility (existing pages with window.__navDataUrl)
  document.addEventListener('DOMContentLoaded', function () {
    if (!_input && (window.__navDataUrl || window.__searchApiUrl)) {
      init({});
    }
  });

  window.PwebSearch = {
    init: init,
    search: search,
    clear: clear,
    destroy: destroy
  };
})();
