// The "glasses powering on" sequence played right after they reach your face.
// It doesn't connect the tutor; that waits until the student presses the ＋
// call button on the TeachXR window, like the original site.

import { useEffect, useState } from 'react';

const LINES = [
  'TEACHXR OS 2.0 · mixed reality learning',
  '▸ optics calibrated',
  '▸ hand tracking online',
  '▸ spatial map: desk · book · monitor',
  '▸ TeachXR tutor standing by',
];
const BOOT_MS = 4200;
const WORDS = ['Touch', 'Sound', 'Vision', 'Senses'];

function Typewriter() {
  const [i, setI] = useState(0);
  const [text, setText] = useState('');
  useEffect(() => {
    const word = WORDS[i % WORDS.length];
    if (text.length < word.length) {
      const t = setTimeout(() => setText(word.slice(0, text.length + 1)), 90);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setText('');
      setI(i + 1);
    }, 700);
    return () => clearTimeout(t);
  }, [text, i]);
  return <span className="text-violet-300">{text}<span className="caret">▍</span></span>;
}

export default function BootSequence({ onDone }) {
  const [elapsed, setElapsed] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const start = performance.now();
    const timer = setInterval(() => setElapsed(performance.now() - start), 100);
    return () => clearInterval(timer);
  }, []);

  const ready = elapsed > BOOT_MS;

  useEffect(() => {
    if (ready) setLeaving(true);
  }, [ready]);

  // Let the iris-open animation play, then hand over to the HUD.
  useEffect(() => {
    if (!leaving) return undefined;
    const t = setTimeout(onDone, 900);
    return () => clearTimeout(t);
  }, [leaving, onDone]);

  const linesShown = Math.min(LINES.length, Math.floor(elapsed / 550));
  const progress = Math.min(1, elapsed / BOOT_MS);

  return (
    <div className={`boot fixed inset-0 z-40 flex items-center justify-center ${leaving ? 'boot-leave' : ''}`}>
      <div className="boot-grid absolute inset-0" />
      <div className="scanlines absolute inset-0" />
      <div className="relative z-10 w-[min(560px,88vw)] font-display text-violet-100">
        <div className="mb-8 text-center">
          <div className="boot-logo text-5xl font-bold tracking-tight sm:text-6xl">
            Teach<span className="text-violet-400">XR</span>
          </div>
          <div className="mt-3 text-lg font-light text-violet-200/80">
            Power learning by <Typewriter />
          </div>
        </div>
        <div className="space-y-1 font-mono text-xs text-cyan-200/80 sm:text-sm">
          {LINES.slice(0, linesShown).map((l) => (
            <div key={l} className="boot-line">{l}</div>
          ))}
        </div>
        <div className="mt-6 h-1 overflow-hidden rounded-full bg-violet-900/60">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 via-indigo-400 to-cyan-300 transition-[width] duration-300"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
      <button
        type="button"
        onClick={onDone}
        className="absolute bottom-6 right-6 z-10 rounded-full border border-violet-300/30 px-4 py-1.5 text-xs text-violet-200/80 hover:bg-violet-500/20"
      >
        Skip
      </button>
    </div>
  );
}
