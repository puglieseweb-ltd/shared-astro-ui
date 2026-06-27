/**
 * In-Page Search — vanilla Ctrl+F search with highlighting
 *
 * Usage:
 *   PwebInPageSearch.init({ containerSelector: 'article' });
 *
 * Keyboard:
 *   Ctrl/Cmd+F  — open search bar
 *   Enter       — next match
 *   Shift+Enter — previous match
 *   Escape      — close
 */
(function () {
  'use strict';

  var HIGHLIGHT_CLASS = 'search-highlight';
  var CURRENT_CLASS = 'current';
  var state = {
    container: null,
    bar: null,
    input: null,
    countEl: null,
    marks: [],
    currentIndex: 0,
  };

  function clearHighlights() {
    if (!state.container) return;
    var marks = state.container.querySelectorAll('mark.' + HIGHLIGHT_CLASS);
    marks.forEach(function (mark) {
      var parent = mark.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(mark.textContent || ''), mark);
        parent.normalize();
      }
    });
    state.marks = [];
    state.currentIndex = 0;
    updateCount();
  }

  function highlightMatches(searchText) {
    clearHighlights();
    if (!state.container || !searchText || searchText.length < 2) return;

    var walker = document.createTreeWalker(state.container, NodeFilter.SHOW_TEXT, null);
    var textNodes = [];
    var node;
    var searchLower = searchText.toLowerCase();

    while ((node = walker.nextNode())) {
      if (node.nodeValue && node.nodeValue.toLowerCase().indexOf(searchLower) !== -1) {
        textNodes.push(node);
      }
    }

    var allMarks = [];
    for (var i = 0; i < textNodes.length; i++) {
      var textNode = textNodes[i];
      var text = textNode.nodeValue || '';
      var lower = text.toLowerCase();
      var parts = [];
      var lastIndex = 0;
      var idx = lower.indexOf(searchLower);

      while (idx !== -1) {
        if (idx > lastIndex) parts.push({ type: 'text', value: text.slice(lastIndex, idx) });
        parts.push({ type: 'match', value: text.slice(idx, idx + searchText.length) });
        lastIndex = idx + searchText.length;
        idx = lower.indexOf(searchLower, lastIndex);
      }
      if (lastIndex < text.length) parts.push({ type: 'text', value: text.slice(lastIndex) });
      if (parts.length <= 1) continue;

      var fragment = document.createDocumentFragment();
      for (var j = 0; j < parts.length; j++) {
        if (parts[j].type === 'text') {
          fragment.appendChild(document.createTextNode(parts[j].value));
        } else {
          var mark = document.createElement('mark');
          mark.className = HIGHLIGHT_CLASS;
          mark.textContent = parts[j].value;
          allMarks.push(mark);
          fragment.appendChild(mark);
        }
      }
      textNode.parentNode.replaceChild(fragment, textNode);
    }

    state.marks = allMarks;
    if (allMarks.length > 0) {
      state.currentIndex = 0;
      allMarks[0].classList.add(CURRENT_CLASS);
      allMarks[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    updateCount();
  }

  function navigateMatch(direction) {
    if (state.marks.length === 0) return;
    state.marks[state.currentIndex].classList.remove(CURRENT_CLASS);

    if (direction === 'next') {
      state.currentIndex = (state.currentIndex + 1) % state.marks.length;
    } else {
      state.currentIndex = (state.currentIndex - 1 + state.marks.length) % state.marks.length;
    }

    state.marks[state.currentIndex].classList.add(CURRENT_CLASS);
    state.marks[state.currentIndex].scrollIntoView({ block: 'center', behavior: 'smooth' });
    updateCount();
  }

  function updateCount() {
    if (!state.countEl) return;
    if (state.marks.length > 0) {
      state.countEl.textContent = (state.currentIndex + 1) + '/' + state.marks.length;
    } else {
      state.countEl.textContent = state.input && state.input.value.length >= 2 ? '0/0' : '';
    }
  }

  function open() {
    if (!state.bar) return;
    state.bar.classList.add('active');
    setTimeout(function () { state.input && state.input.focus(); }, 50);
  }

  function close() {
    if (!state.bar) return;
    state.bar.classList.remove('active');
    if (state.input) state.input.value = '';
    clearHighlights();
  }

  function createBar() {
    var bar = document.createElement('div');
    bar.className = 'in-page-search';
    bar.innerHTML =
      '<input type="text" placeholder="Find in page..." autocomplete="off">' +
      '<span class="in-page-search-count"></span>' +
      '<button class="ips-prev" title="Previous (Shift+Enter)">\u25B2</button>' +
      '<button class="ips-next" title="Next (Enter)">\u25BC</button>' +
      '<button class="ips-close" title="Close (Esc)">\u2715</button>';

    document.body.appendChild(bar);

    state.bar = bar;
    state.input = bar.querySelector('input');
    state.countEl = bar.querySelector('.in-page-search-count');

    var debounceTimer;
    state.input.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () {
        highlightMatches(state.input.value);
      }, 150);
    });

    state.input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        navigateMatch(e.shiftKey ? 'prev' : 'next');
      }
    });

    bar.querySelector('.ips-prev').addEventListener('click', function () { navigateMatch('prev'); });
    bar.querySelector('.ips-next').addEventListener('click', function () { navigateMatch('next'); });
    bar.querySelector('.ips-close').addEventListener('click', close);
  }

  function init(opts) {
    opts = opts || {};
    var containerSelector = opts.containerSelector || 'article';
    state.container = document.querySelector(containerSelector);
    if (!state.container) return;

    createBar();

    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        open();
      }
      if (e.key === 'Escape' && state.bar && state.bar.classList.contains('active')) {
        close();
      }
    });
  }

  function destroy() {
    clearHighlights();
    if (state.bar && state.bar.parentNode) {
      state.bar.parentNode.removeChild(state.bar);
    }
    state.bar = null;
    state.input = null;
    state.countEl = null;
    state.container = null;
    state.marks = [];
  }

  window.PwebInPageSearch = { init: init, destroy: destroy, open: open, close: close };
})();
