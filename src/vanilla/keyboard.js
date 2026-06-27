/**
 * Keyboard Shortcuts — docs navigation and help overlay
 *
 * Usage:
 *   PwebKeyboard.init();
 *
 * Shortcuts:
 *   j / ArrowRight  — next page
 *   k / ArrowLeft   — previous page
 *   s               — toggle sidebar
 *   /               — focus search input
 *   ?               — show keyboard shortcuts help
 *   Escape          — close help overlay
 */
(function () {
  'use strict';

  var overlay;

  var SHORTCUTS = [
    { keys: 'j / \u2192', label: 'Next page' },
    { keys: 'k / \u2190', label: 'Previous page' },
    { keys: 's', label: 'Toggle sidebar' },
    { keys: '/', label: 'Focus search' },
    { keys: 'Ctrl+F', label: 'Find in page' },
    { keys: '?', label: 'Show shortcuts' },
    { keys: 'Esc', label: 'Close overlay' },
  ];

  function createHelpOverlay() {
    overlay = document.createElement('div');
    overlay.className = 'kbd-help-overlay';

    var panel = '<div class="kbd-help-panel"><h3>Keyboard Shortcuts</h3>';
    for (var i = 0; i < SHORTCUTS.length; i++) {
      var s = SHORTCUTS[i];
      var kbdParts = s.keys.split(' / ');
      var kbdHtml = kbdParts.map(function (k) { return '<kbd>' + k + '</kbd>'; }).join(' ');
      panel += '<div class="kbd-help-row"><span>' + s.label + '</span><span>' + kbdHtml + '</span></div>';
    }
    panel += '</div>';
    overlay.innerHTML = panel;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) hideHelp();
    });
  }

  function showHelp() {
    if (!overlay) createHelpOverlay();
    overlay.classList.add('active');
  }

  function hideHelp() {
    if (overlay) overlay.classList.remove('active');
  }

  function navigatePage(direction) {
    var selector = direction === 'next' ? '.page-nav .next' : '.page-nav .prev';
    var link = document.querySelector(selector);
    if (link && link.href) window.location.href = link.href;
  }

  function toggleSidebar() {
    var sidebar = document.querySelector('.sidebar');
    var main = document.querySelector('.main');
    if (!sidebar) return;

    var isMobile = window.innerWidth <= 768;
    if (isMobile) {
      sidebar.classList.toggle('open');
    } else {
      sidebar.classList.toggle('collapsed');
    }
  }

  function focusSearch() {
    var input = document.querySelector('#search-input') || document.querySelector('.header-search .search-input');
    if (input) {
      input.focus();
      input.select();
    }
  }

  function isInputFocused() {
    var el = document.activeElement;
    if (!el) return false;
    var tag = el.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
  }

  function handleKeyDown(e) {
    // Don't intercept when typing in form fields
    if (isInputFocused()) return;
    // Don't intercept when modifier keys are held (except for ? which needs shift)
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    switch (e.key) {
      case 'j':
      case 'ArrowRight':
        e.preventDefault();
        navigatePage('next');
        break;
      case 'k':
      case 'ArrowLeft':
        e.preventDefault();
        navigatePage('prev');
        break;
      case 's':
        e.preventDefault();
        toggleSidebar();
        break;
      case '/':
        e.preventDefault();
        focusSearch();
        break;
      case '?':
        e.preventDefault();
        showHelp();
        break;
      case 'Escape':
        hideHelp();
        break;
    }
  }

  function init() {
    document.addEventListener('keydown', handleKeyDown);
  }

  function destroy() {
    document.removeEventListener('keydown', handleKeyDown);
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
      overlay = null;
    }
  }

  window.PwebKeyboard = { init: init, destroy: destroy, showHelp: showHelp };
})();
