import { useState, useEffect, useRef, useCallback } from 'react';

export interface TextToSpeechProps {
  /** CSS selector for the article content container */
  contentSelector: string;
  /** Label shown in idle state */
  idleLabel?: string;
  /** Label shown when playback finishes */
  finishedLabel?: string;
  /** Label shown during playback */
  playingLabel?: string;
  /** Label shown when paused */
  pausedLabel?: string;
}

type PlaybackState = 'idle' | 'playing' | 'paused';

interface Chunk {
  text: string;
  element: Element;
}

const HIGHLIGHT_CLASS = 'tts-highlight';
const HOVER_BTN_CLASS = 'tts-hover-btn';
const HOVER_PLAY_CLASS = 'tts-hover-play';
const HOVER_PAUSE_CLASS = 'tts-hover-pause';
const READABLE_TAGS = ['P', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'TD', 'TH'];

const PLAY_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14l11-7-11-7z"/></svg>';
const PAUSE_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>';

/**
 * CSS custom property: --tts-accent
 *
 * Set this on :root or any ancestor to customise the accent color for
 * buttons, progress bar, highlights, and active speed pills.
 *
 * Example:
 *   :root { --tts-accent: #0f1736; }
 */
const CSS_VAR = '--tts-accent';
const FALLBACK = '#0f1736';

const HIGHLIGHT_STYLES = `
  :root { ${CSS_VAR}: ${FALLBACK}; }

  .${HIGHLIGHT_CLASS} {
    background-color: color-mix(in srgb, var(${CSS_VAR}) 12%, transparent);
    border-radius: 4px;
    box-shadow: -4px 0 0 color-mix(in srgb, var(${CSS_VAR}) 12%, transparent),
                 4px 0 0 color-mix(in srgb, var(${CSS_VAR}) 12%, transparent);
    transition: background-color 0.2s ease;
  }
  .dark .${HIGHLIGHT_CLASS} {
    background-color: color-mix(in srgb, var(${CSS_VAR}) 20%, transparent);
    box-shadow: -4px 0 0 color-mix(in srgb, var(${CSS_VAR}) 20%, transparent),
                 4px 0 0 color-mix(in srgb, var(${CSS_VAR}) 20%, transparent);
  }
  .${HOVER_BTN_CLASS} {
    position: absolute;
    left: -36px;
    top: 50%;
    transform: translateY(-50%);
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(${CSS_VAR});
    color: white;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.15s ease, filter 0.15s ease;
    pointer-events: none;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    z-index: 10;
  }
  .${HOVER_BTN_CLASS}:hover {
    filter: brightness(1.3);
  }
  .${HOVER_BTN_CLASS} svg {
    width: 14px;
    height: 14px;
  }
  .${HOVER_PLAY_CLASS} svg {
    margin-left: 1px;
  }
  .tts-hoverable {
    position: relative;
  }
  .tts-hoverable::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: -40px;
    width: 40px;
  }
  .tts-hoverable:hover > .${HOVER_BTN_CLASS} {
    opacity: 1;
    pointer-events: auto;
  }
  /* When this paragraph is actively playing, show pause instead of play */
  .tts-hoverable.tts-playing > .${HOVER_PLAY_CLASS} { display: none; }
  .${HOVER_PAUSE_CLASS} { display: none; }
  .tts-hoverable.tts-playing > .${HOVER_PAUSE_CLASS} { display: flex; }
`;

export default function TextToSpeech({
  contentSelector,
  idleLabel = 'Listen to this article',
  finishedLabel = 'Finished',
  playingLabel = 'Playing...',
  pausedLabel = 'Paused',
}: TextToSpeechProps) {
  const [state, setState] = useState<PlaybackState>('idle');
  const [rate, setRate] = useState(1);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState('');
  const [progress, setProgress] = useState(0);
  const [supported, setSupported] = useState(true);
  const [showControls, setShowControls] = useState(false);

  const chunksRef = useRef<Chunk[]>([]);
  const chunkIndexRef = useRef(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const rateRef = useRef(rate);
  const voiceURIRef = useRef(selectedVoiceURI);
  const styleRef = useRef<HTMLStyleElement | null>(null);
  const cancellingRef = useRef(false);

  rateRef.current = rate;
  voiceURIRef.current = selectedVoiceURI;

  // Inject highlight styles once
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = HIGHLIGHT_STYLES;
    document.head.appendChild(style);
    styleRef.current = style;
    return () => {
      style.remove();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setSupported(false);
      return;
    }

    const loadVoices = () => {
      const available = speechSynthesis.getVoices();
      const english = available.filter((v) => v.lang.startsWith('en'));
      const sorted = english.sort((a, b) => {
        if (a.localService !== b.localService) return a.localService ? 1 : -1;
        return a.name.localeCompare(b.name);
      });
      setVoices(sorted);
      if (sorted.length > 0 && !selectedVoiceURI) {
        setSelectedVoiceURI(sorted[0].uri);
      }
    };

    loadVoices();
    speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

  const clearHighlight = useCallback(() => {
    document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach((el) => {
      el.classList.remove(HIGHLIGHT_CLASS);
    });
    document.querySelectorAll('.tts-playing').forEach((el) => {
      el.classList.remove('tts-playing');
    });
  }, []);

  const highlightChunk = useCallback(
    (index: number, playing = true) => {
      clearHighlight();
      const chunks = chunksRef.current;
      if (index >= 0 && index < chunks.length) {
        const el = chunks[index].element;
        el.classList.add(HIGHLIGHT_CLASS);
        if (playing) el.classList.add('tts-playing');
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },
    [clearHighlight],
  );

  const getReadableElements = useCallback((): Element[] => {
    const el = document.querySelector(contentSelector);
    if (!el) return [];

    const elements: Element[] = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT, {
      acceptNode(node) {
        const tag = (node as Element).tagName;
        if (READABLE_TAGS.includes(tag)) {
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_SKIP;
      },
    });

    let node: Node | null;
    while ((node = walker.nextNode())) {
      const text = (node as Element).textContent?.trim();
      if (text && text.length > 0) {
        elements.push(node as Element);
      }
    }
    return elements;
  }, [contentSelector]);

  const extractChunks = useCallback((): Chunk[] => {
    return getReadableElements().map((element) => ({
      text: element.textContent?.trim() || '',
      element,
    }));
  }, [getReadableElements]);

  const speakChunk = useCallback(
    (index: number) => {
      const chunks = chunksRef.current;
      if (index >= chunks.length) {
        clearHighlight();
        setState('idle');
        setProgress(100);
        chunkIndexRef.current = 0;
        return;
      }

      chunkIndexRef.current = index;
      setProgress(Math.round((index / chunks.length) * 100));
      highlightChunk(index);

      const utterance = new SpeechSynthesisUtterance(chunks[index].text);
      utterance.rate = rateRef.current;

      const voice = speechSynthesis.getVoices().find((v) => v.voiceURI === voiceURIRef.current);
      if (voice) utterance.voice = voice;

      utterance.onend = () => {
        if (!cancellingRef.current) {
          speakChunk(index + 1);
        }
      };

      utterance.onerror = (e) => {
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          console.error('Speech error:', e.error);
          clearHighlight();
          setState('idle');
        }
      };

      utteranceRef.current = utterance;
      cancellingRef.current = false;
      speechSynthesis.speak(utterance);
    },
    [clearHighlight, highlightChunk],
  );

  const handlePlay = useCallback(() => {
    if (state === 'paused') {
      speechSynthesis.resume();
      setState('playing');
      const chunks = chunksRef.current;
      const idx = chunkIndexRef.current;
      if (idx >= 0 && idx < chunks.length) {
        chunks[idx].element.classList.add('tts-playing');
      }
      return;
    }

    const chunks = extractChunks();
    if (chunks.length === 0) return;

    chunksRef.current = chunks;
    cancellingRef.current = true;
    speechSynthesis.cancel();
    setState('playing');
    setShowControls(true);
    speakChunk(0);
  }, [state, extractChunks, speakChunk]);

  const handlePause = useCallback(() => {
    speechSynthesis.pause();
    setState('paused');
    document.querySelectorAll('.tts-playing').forEach((el) => {
      el.classList.remove('tts-playing');
    });
  }, []);

  const handleStop = useCallback(() => {
    speechSynthesis.cancel();
    clearHighlight();
    setState('idle');
    setProgress(0);
    chunkIndexRef.current = 0;
  }, [clearHighlight]);

  const handleRateChange = useCallback(
    (newRate: number) => {
      setRate(newRate);
      if (state === 'playing') {
        cancellingRef.current = true;
        speechSynthesis.cancel();
        speakChunk(chunkIndexRef.current);
      }
    },
    [state, speakChunk],
  );

  const handleVoiceChange = useCallback(
    (uri: string) => {
      setSelectedVoiceURI(uri);
      if (state === 'playing') {
        cancellingRef.current = true;
        speechSynthesis.cancel();
        speakChunk(chunkIndexRef.current);
      }
    },
    [state, speakChunk],
  );

  const startFromElement = useCallback(
    (targetElement: Element) => {
      const chunks = extractChunks();
      if (chunks.length === 0) return;

      const targetIndex = chunks.findIndex((c) => c.element === targetElement);
      if (targetIndex === -1) return;

      chunksRef.current = chunks;
      cancellingRef.current = true;
      speechSynthesis.cancel();
      setState('playing');
      setShowControls(true);
      speakChunk(targetIndex);
    },
    [extractChunks, speakChunk],
  );

  // Set up hover play/pause buttons on readable elements
  const startFromElementRef = useRef(startFromElement);
  startFromElementRef.current = startFromElement;
  const handlePauseRef = useRef(handlePause);
  handlePauseRef.current = handlePause;
  const handlePlayRef = useRef(handlePlay);
  handlePlayRef.current = handlePlay;
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (!supported) return;

    const elements = getReadableElements();
    const cleanups: (() => void)[] = [];

    for (const el of elements) {
      const htmlEl = el as HTMLElement;
      htmlEl.classList.add('tts-hoverable');

      const playBtn = document.createElement('button');
      playBtn.className = `${HOVER_BTN_CLASS} ${HOVER_PLAY_CLASS}`;
      playBtn.setAttribute('aria-label', 'Play from here');
      playBtn.innerHTML = PLAY_ICON;

      playBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (stateRef.current === 'paused') {
          handlePlayRef.current();
        } else {
          startFromElementRef.current(el);
        }
      });

      const pauseBtn = document.createElement('button');
      pauseBtn.className = `${HOVER_BTN_CLASS} ${HOVER_PAUSE_CLASS}`;
      pauseBtn.setAttribute('aria-label', 'Pause');
      pauseBtn.innerHTML = PAUSE_ICON;

      pauseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handlePauseRef.current();
      });

      htmlEl.appendChild(playBtn);
      htmlEl.appendChild(pauseBtn);

      cleanups.push(() => {
        htmlEl.classList.remove('tts-hoverable');
        playBtn.remove();
        pauseBtn.remove();
      });
    }

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [supported, getReadableElements]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      speechSynthesis.cancel();
      document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach((el) => {
        el.classList.remove(HIGHLIGHT_CLASS);
      });
    };
  }, []);

  if (!supported) return null;

  const speeds = [0.75, 1, 1.25, 1.5, 2];

  // Inline style referencing the CSS variable for the main controls
  const accentStyle = { background: `var(${CSS_VAR}, ${FALLBACK})` } as React.CSSProperties;
  const accentHoverStyle = { background: `var(${CSS_VAR}, ${FALLBACK})`, filter: 'brightness(1.3)' } as React.CSSProperties;

  return (
    <div className="mt-8 mb-8 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-4">
      {/* Header row */}
      <div className="flex items-center gap-3">
        {/* Play / Pause button */}
        {state === 'playing' ? (
          <button
            onClick={handlePause}
            style={accentStyle}
            className="tts-main-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
            aria-label="Pause"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          </button>
        ) : (
          <button
            onClick={handlePlay}
            style={accentStyle}
            className="tts-main-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
            aria-label={state === 'paused' ? 'Resume' : 'Listen to article'}
          >
            <svg className="h-5 w-5 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5.14v14l11-7-11-7z" />
            </svg>
          </button>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {state === 'idle' && progress === 0 && idleLabel}
              {state === 'idle' && progress === 100 && finishedLabel}
              {state === 'playing' && playingLabel}
              {state === 'paused' && pausedLabel}
            </span>
            <div className="flex items-center gap-1.5">
              {state !== 'idle' && (
                <button
                  onClick={handleStop}
                  className="rounded-md p-1.5 text-gray-500 transition hover:bg-gray-200 dark:hover:bg-slate-700 hover:text-gray-700 dark:hover:text-gray-300"
                  aria-label="Stop"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => setShowControls(!showControls)}
                className="rounded-md p-1.5 text-gray-500 transition hover:bg-gray-200 dark:hover:bg-slate-700 hover:text-gray-700 dark:hover:text-gray-300"
                aria-label="Settings"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
          </div>

          {/* Seekable progress bar */}
          {(state !== 'idle' || progress === 100) && (
            <button
              type="button"
              className="mt-2 h-3 w-full rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden cursor-pointer relative group"
              aria-label="Seek through article"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                const chunks = chunksRef.current;
                if (chunks.length === 0) return;
                const targetIndex = Math.min(Math.floor(pct * chunks.length), chunks.length - 1);
                cancellingRef.current = true;
                speechSynthesis.cancel();
                chunkIndexRef.current = targetIndex;
                setProgress(Math.round((targetIndex / chunks.length) * 100));
                highlightChunk(targetIndex);
                if (state === 'playing' || state === 'paused') {
                  setState('playing');
                  speakChunk(targetIndex);
                }
              }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%`, background: `var(${CSS_VAR}, ${FALLBACK})` }}
              />
            </button>
          )}
        </div>
      </div>

      {/* Expanded controls */}
      {showControls && (
        <div className="mt-4 space-y-3 border-t border-gray-200 dark:border-slate-700 pt-4">
          {/* Speed */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-12">Speed</span>
            <div className="flex gap-1">
              {speeds.map((s) => (
                <button
                  key={s}
                  onClick={() => handleRateChange(s)}
                  style={rate === s ? accentStyle : undefined}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                    rate === s
                      ? 'text-white'
                      : 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-slate-600'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Voice selection */}
          {voices.length > 1 && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-12">Voice</span>
              <select
                value={selectedVoiceURI}
                onChange={(e) => handleVoiceChange(e.target.value)}
                className="flex-1 rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2.5 py-1.5 text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} {v.localService ? '' : '(HD)'}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
