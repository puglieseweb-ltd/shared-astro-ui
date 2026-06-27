/**
 * PwebSidebar — Sidebar navigation interactions
 *
 * Features:
 * - Active link highlighting based on current path
 * - Section expand/collapse with session persistence
 * - Expand-all / Collapse-all toolbar buttons
 * - Mobile hamburger toggle
 * - Dark mode toggle with localStorage persistence
 */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var loc = window.location.pathname.replace(/\/$/, '');

    // ── Active link detection ─────────────────────────────────
    var navLinks = document.querySelectorAll('.sidebar-nav .nav-link');
    for (var i = 0; i < navLinks.length; i++) {
      var href = (navLinks[i].getAttribute('href') || '').replace(/\/$/, '');
      if (href === loc) {
        navLinks[i].classList.add('active');
        // Auto-expand parent sections
        var parent = navLinks[i].parentElement;
        while (parent) {
          if (parent.classList && parent.classList.contains('nav-section')) {
            parent.classList.add('open');
          }
          parent = parent.parentElement;
        }
      }
    }

    // ── Section expand/collapse ───────────────────────────────
    var STORAGE_KEY = 'pweb-docs-sections';

    function saveSectionState() {
      var state = {};
      var sections = document.querySelectorAll('.sidebar-nav .nav-section');
      for (var i = 0; i < sections.length; i++) {
        var title = sections[i].querySelector('.nav-section-title');
        if (title) {
          var key = title.textContent.trim();
          state[key] = sections[i].classList.contains('open');
        }
      }
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
    }

    function restoreSectionState() {
      var saved;
      try { saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY)); } catch (e) { return; }
      if (!saved) return;
      var sections = document.querySelectorAll('.sidebar-nav .nav-section');
      for (var i = 0; i < sections.length; i++) {
        var title = sections[i].querySelector('.nav-section-title');
        if (title) {
          var key = title.textContent.trim();
          if (saved[key] === true) sections[i].classList.add('open');
          else if (saved[key] === false) sections[i].classList.remove('open');
        }
      }
    }

    restoreSectionState();

    var sectionTitles = document.querySelectorAll('.nav-section-title');
    for (var j = 0; j < sectionTitles.length; j++) {
      sectionTitles[j].addEventListener('click', function () {
        this.parentElement.classList.toggle('open');
        saveSectionState();
      });
    }

    // ── Expand/Collapse all ───────────────────────────────────
    var expandBtn = document.getElementById('expand-all');
    var collapseBtn = document.getElementById('collapse-all');

    function setAllSections(open) {
      var sections = document.querySelectorAll('.sidebar-nav .nav-section');
      for (var i = 0; i < sections.length; i++) {
        if (open) sections[i].classList.add('open');
        else sections[i].classList.remove('open');
      }
      saveSectionState();
    }

    if (expandBtn) expandBtn.addEventListener('click', function () { setAllSections(true); });
    if (collapseBtn) collapseBtn.addEventListener('click', function () { setAllSections(false); });

    // ── Mobile hamburger toggle ───────────────────────────────
    var toggle = document.querySelector('.menu-toggle');
    var sidebar = document.querySelector('.sidebar');

    if (toggle && sidebar) {
      toggle.addEventListener('click', function () {
        sidebar.classList.toggle('open');
        toggle.textContent = sidebar.classList.contains('open') ? '\u2715' : '\u2630';
      });
    }

    // ── Dark mode toggle ──────────────────────────────────────
    var DARK_KEY = 'pweb-docs-dark';
    var darkBtn = document.querySelector('.dark-toggle');

    function applyDarkMode(dark) {
      if (dark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      try { localStorage.setItem(DARK_KEY, dark ? '1' : '0'); } catch (e) { /* ignore */ }
    }

    // Restore dark mode preference
    var savedDark;
    try { savedDark = localStorage.getItem(DARK_KEY); } catch (e) { /* ignore */ }
    if (savedDark === '1') {
      applyDarkMode(true);
    } else if (savedDark === null && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      applyDarkMode(true);
    }

    if (darkBtn) {
      darkBtn.addEventListener('click', function () {
        var isDark = document.documentElement.classList.contains('dark');
        applyDarkMode(!isDark);
      });
    }
  });
})();
