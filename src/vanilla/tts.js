/**
 * PwebTTS — Vanilla JS Text-to-Speech widget
 *
 * Usage:
 *   <link rel="stylesheet" href="tts.css">
 *   <script src="tts.js" defer></script>
 *   <script>
 *     document.addEventListener('DOMContentLoaded', function() {
 *       PwebTTS.init({ contentSelector: 'article' });
 *     });
 *   </script>
 *
 * Theming: set --tts-accent on :root or any ancestor.
 */
(function () {
  'use strict';

  var READABLE_TAGS = ['P', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'TD', 'TH'];
  var PLAY_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14l11-7-11-7z"/></svg>';
  var PAUSE_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>';
  var STOP_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';
  var GEAR_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/></svg>';

  var SPEEDS = [0.75, 1, 1.25, 1.5, 2];

  // ── Instance state ──────────────────────────────────────────
  var _opts = {};
  var _state = 'idle'; // idle | playing | paused
  var _rate = 1;
  var _voices = [];
  var _selectedVoiceURI = '';
  var _progress = 0;
  var _chunks = [];
  var _chunkIndex = 0;
  var _cancelling = false;
  var _showSettings = false;
  var _controlsEl = null;
  var _hoverCleanups = [];

  // ── DOM refs ────────────────────────────────────────────────
  var _mainBtn = null;
  var _labelEl = null;
  var _progressBar = null;
  var _progressFill = null;
  var _stopBtn = null;
  var _settingsPanel = null;
  var _speedBtns = [];
  var _voiceSelect = null;

  // ── Helpers ─────────────────────────────────────────────────

  function getReadableElements() {
    var container = document.querySelector(_opts.contentSelector);
    if (!container) return [];
    var elements = [];
    var walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, {
      acceptNode: function (node) {
        return READABLE_TAGS.indexOf(node.tagName) !== -1
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP;
      }
    });
    var node;
    while ((node = walker.nextNode())) {
      var text = node.textContent && node.textContent.trim();
      if (text && text.length > 0) elements.push(node);
    }
    return elements;
  }

  function extractChunks() {
    return getReadableElements().map(function (el) {
      return { text: el.textContent.trim(), element: el };
    });
  }

  function clearHighlight() {
    var els = document.querySelectorAll('.tts-highlight');
    for (var i = 0; i < els.length; i++) els[i].classList.remove('tts-highlight');
    els = document.querySelectorAll('.tts-playing');
    for (var j = 0; j < els.length; j++) els[j].classList.remove('tts-playing');
  }

  function highlightChunk(index, playing) {
    clearHighlight();
    if (index >= 0 && index < _chunks.length) {
      var el = _chunks[index].element;
      el.classList.add('tts-highlight');
      if (playing !== false) el.classList.add('tts-playing');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function updateUI() {
    if (!_controlsEl) return;

    // Main button icon
    _mainBtn.innerHTML = _state === 'playing'
      ? PAUSE_SVG
      : '<span class="play-icon">' + PLAY_SVG + '</span>';
    _mainBtn.setAttribute('aria-label', _state === 'playing' ? 'Pause' : (_state === 'paused' ? 'Resume' : 'Listen'));

    // Label
    var labels = _opts.labels || {};
    var label = '';
    if (_state === 'idle' && _progress === 0) label = labels.idle || 'Listen to this article';
    else if (_state === 'idle' && _progress >= 100) label = labels.finished || 'Finished';
    else if (_state === 'playing') label = labels.playing || 'Playing\u2026';
    else if (_state === 'paused') label = labels.paused || 'Paused';
    _labelEl.textContent = label;

    // Stop button visibility
    _stopBtn.style.display = _state === 'idle' ? 'none' : '';

    // Progress bar visibility
    var showProgress = _state !== 'idle' || _progress >= 100;
    _progressBar.style.display = showProgress ? '' : 'none';
    _progressFill.style.width = _progress + '%';

    // Speed buttons
    for (var i = 0; i < _speedBtns.length; i++) {
      var s = parseFloat(_speedBtns[i].dataset.speed);
      _speedBtns[i].className = 'tts-speed-btn' + (s === _rate ? ' active' : '');
    }

    // Settings panel
    _settingsPanel.className = 'tts-settings' + (_showSettings ? ' open' : '');
  }

  // ── Speech ──────────────────────────────────────────────────

  function speakChunk(index) {
    if (index >= _chunks.length) {
      clearHighlight();
      _state = 'idle';
      _progress = 100;
      _chunkIndex = 0;
      updateUI();
      return;
    }

    _chunkIndex = index;
    _progress = Math.round((index / _chunks.length) * 100);
    highlightChunk(index);
    updateUI();

    var utterance = new SpeechSynthesisUtterance(_chunks[index].text);
    utterance.rate = _rate;

    var allVoices = speechSynthesis.getVoices();
    for (var i = 0; i < allVoices.length; i++) {
      if (allVoices[i].voiceURI === _selectedVoiceURI) {
        utterance.voice = allVoices[i];
        break;
      }
    }

    utterance.onend = function () {
      if (!_cancelling) speakChunk(index + 1);
    };

    utterance.onerror = function (e) {
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        clearHighlight();
        _state = 'idle';
        updateUI();
      }
    };

    _cancelling = false;
    speechSynthesis.speak(utterance);
  }

  // ── Public API ──────────────────────────────────────────────

  function init(options) {
    if (!window.speechSynthesis) return;
    _opts = options || {};
    _opts.contentSelector = _opts.contentSelector || 'article';

    loadVoices();
    speechSynthesis.addEventListener('voiceschanged', loadVoices);
    renderControls();
    setupHoverButtons();
  }

  function loadVoices() {
    var available = speechSynthesis.getVoices();
    var english = [];
    for (var i = 0; i < available.length; i++) {
      if (available[i].lang.indexOf('en') === 0) english.push(available[i]);
    }
    english.sort(function (a, b) {
      if (a.localService !== b.localService) return a.localService ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
    _voices = english;
    if (_voices.length > 0 && !_selectedVoiceURI) {
      _selectedVoiceURI = _voices[0].voiceURI;
    }
    if (_voiceSelect) renderVoiceOptions();
  }

  function renderVoiceOptions() {
    if (!_voiceSelect) return;
    _voiceSelect.innerHTML = '';
    for (var i = 0; i < _voices.length; i++) {
      var opt = document.createElement('option');
      opt.value = _voices[i].voiceURI;
      opt.textContent = _voices[i].name + (_voices[i].localService ? '' : ' (HD)');
      _voiceSelect.appendChild(opt);
    }
    _voiceSelect.value = _selectedVoiceURI;
    // Show/hide voice row based on voice count
    var voiceRow = _voiceSelect.closest('.tts-setting-row');
    if (voiceRow) voiceRow.style.display = _voices.length > 1 ? '' : 'none';
  }

  function renderControls() {
    var target = _opts.containerSelector
      ? document.querySelector(_opts.containerSelector)
      : document.querySelector(_opts.contentSelector);
    if (!target) return;

    var el = document.createElement('div');
    el.className = 'tts-controls';
    el.innerHTML =
      '<div class="tts-header">' +
        '<button class="tts-main-btn" aria-label="Listen"><span class="play-icon">' + PLAY_SVG + '</span></button>' +
        '<div class="tts-info">' +
          '<div class="tts-status-row">' +
            '<span class="tts-label"></span>' +
            '<div class="tts-actions">' +
              '<button class="tts-icon-btn tts-stop-btn" aria-label="Stop" style="display:none">' + STOP_SVG + '</button>' +
              '<button class="tts-icon-btn tts-gear-btn" aria-label="Settings">' + GEAR_SVG + '</button>' +
            '</div>' +
          '</div>' +
          '<div class="tts-progress" aria-label="Seek" style="display:none">' +
            '<div class="tts-progress-fill"></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="tts-settings">' +
        '<div class="tts-setting-row">' +
          '<span class="tts-setting-label">Speed</span>' +
          '<div class="tts-speeds">' +
            SPEEDS.map(function (s) { return '<button class="tts-speed-btn" data-speed="' + s + '">' + s + 'x</button>'; }).join('') +
          '</div>' +
        '</div>' +
        '<div class="tts-setting-row">' +
          '<span class="tts-setting-label">Voice</span>' +
          '<select class="tts-voice-select"></select>' +
        '</div>' +
      '</div>';

    if (_opts.containerSelector) {
      target.appendChild(el);
    } else {
      target.parentNode.insertBefore(el, target);
    }

    _controlsEl = el;
    _mainBtn = el.querySelector('.tts-main-btn');
    _labelEl = el.querySelector('.tts-label');
    _progressBar = el.querySelector('.tts-progress');
    _progressFill = el.querySelector('.tts-progress-fill');
    _stopBtn = el.querySelector('.tts-stop-btn');
    _settingsPanel = el.querySelector('.tts-settings');
    _voiceSelect = el.querySelector('.tts-voice-select');
    _speedBtns = el.querySelectorAll('.tts-speed-btn');

    renderVoiceOptions();

    // Event listeners
    _mainBtn.addEventListener('click', function () {
      if (_state === 'playing') handlePause();
      else handlePlay();
    });

    _stopBtn.addEventListener('click', handleStop);

    el.querySelector('.tts-gear-btn').addEventListener('click', function () {
      _showSettings = !_showSettings;
      updateUI();
    });

    _progressBar.addEventListener('click', function (e) {
      var rect = _progressBar.getBoundingClientRect();
      var pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      if (_chunks.length === 0) return;
      var targetIndex = Math.min(Math.floor(pct * _chunks.length), _chunks.length - 1);
      _cancelling = true;
      speechSynthesis.cancel();
      _chunkIndex = targetIndex;
      _progress = Math.round((targetIndex / _chunks.length) * 100);
      highlightChunk(targetIndex);
      if (_state === 'playing' || _state === 'paused') {
        _state = 'playing';
        speakChunk(targetIndex);
      }
      updateUI();
    });

    for (var i = 0; i < _speedBtns.length; i++) {
      _speedBtns[i].addEventListener('click', function () {
        var newRate = parseFloat(this.dataset.speed);
        _rate = newRate;
        if (_state === 'playing') {
          _cancelling = true;
          speechSynthesis.cancel();
          speakChunk(_chunkIndex);
        }
        updateUI();
      });
    }

    _voiceSelect.addEventListener('change', function () {
      _selectedVoiceURI = this.value;
      if (_state === 'playing') {
        _cancelling = true;
        speechSynthesis.cancel();
        speakChunk(_chunkIndex);
      }
    });

    updateUI();
  }

  function setupHoverButtons() {
    var elements = getReadableElements();
    _hoverCleanups = [];

    for (var i = 0; i < elements.length; i++) {
      (function (el) {
        var htmlEl = el;
        htmlEl.classList.add('tts-hoverable');

        var playBtn = document.createElement('button');
        playBtn.className = 'tts-hover-btn tts-hover-play';
        playBtn.setAttribute('aria-label', 'Play from here');
        playBtn.innerHTML = PLAY_SVG;

        playBtn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          if (_state === 'paused') {
            handlePlay();
          } else {
            startFromElement(el);
          }
        });

        var pauseBtn = document.createElement('button');
        pauseBtn.className = 'tts-hover-btn tts-hover-pause';
        pauseBtn.setAttribute('aria-label', 'Pause');
        pauseBtn.innerHTML = PAUSE_SVG;

        pauseBtn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          handlePause();
        });

        htmlEl.appendChild(playBtn);
        htmlEl.appendChild(pauseBtn);

        _hoverCleanups.push(function () {
          htmlEl.classList.remove('tts-hoverable');
          playBtn.remove();
          pauseBtn.remove();
        });
      })(elements[i]);
    }
  }

  function handlePlay() {
    if (_state === 'paused') {
      speechSynthesis.resume();
      _state = 'playing';
      if (_chunkIndex >= 0 && _chunkIndex < _chunks.length) {
        _chunks[_chunkIndex].element.classList.add('tts-playing');
      }
      updateUI();
      return;
    }

    var chunks = extractChunks();
    if (chunks.length === 0) return;

    _chunks = chunks;
    _cancelling = true;
    speechSynthesis.cancel();
    _state = 'playing';
    _showSettings = _showSettings; // keep current
    speakChunk(0);
  }

  function handlePause() {
    speechSynthesis.pause();
    _state = 'paused';
    var els = document.querySelectorAll('.tts-playing');
    for (var i = 0; i < els.length; i++) els[i].classList.remove('tts-playing');
    updateUI();
  }

  function handleStop() {
    speechSynthesis.cancel();
    clearHighlight();
    _state = 'idle';
    _progress = 0;
    _chunkIndex = 0;
    updateUI();
  }

  function startFromElement(targetElement) {
    var chunks = extractChunks();
    if (chunks.length === 0) return;

    var targetIndex = -1;
    for (var i = 0; i < chunks.length; i++) {
      if (chunks[i].element === targetElement) { targetIndex = i; break; }
    }
    if (targetIndex === -1) return;

    _chunks = chunks;
    _cancelling = true;
    speechSynthesis.cancel();
    _state = 'playing';
    speakChunk(targetIndex);
  }

  function destroy() {
    speechSynthesis.cancel();
    clearHighlight();
    for (var i = 0; i < _hoverCleanups.length; i++) _hoverCleanups[i]();
    _hoverCleanups = [];
    if (_controlsEl) { _controlsEl.remove(); _controlsEl = null; }
    _state = 'idle';
    _progress = 0;
    _chunks = [];
    _chunkIndex = 0;
  }

  window.PwebTTS = {
    init: init,
    play: handlePlay,
    pause: handlePause,
    stop: handleStop,
    setRate: function (r) {
      _rate = r;
      if (_state === 'playing') {
        _cancelling = true;
        speechSynthesis.cancel();
        speakChunk(_chunkIndex);
      }
      updateUI();
    },
    destroy: destroy
  };
})();
