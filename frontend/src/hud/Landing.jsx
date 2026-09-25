// Overlay for the desk view, before the glasses go on.

import { useState } from 'react';
import { TOPICS } from '../content/topics';
import { LuChevronLeft, LuChevronRight, LuPlus } from 'react-icons/lu';

const DEVPOST = 'https://devpost.com/software/teachxr';

export default function Landing({ onStart, spread, setSpread }) {
  const [about, setAbout] = useState(false);
  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-4 sm:p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="pointer-events-auto max-w-md">
          <h1 className="font-display text-3xl font-bold text-white drop-shadow sm:text-4xl">
            Teach<span className="text-violet-400">XR</span>
          </h1>
          <p className="mt-1 text-sm text-violet-100/90 sm:text-base">World's First AI Study Assistant in Extended Reality</p>
          <footer className="mt-1 text-[11px] text-violet-100/60">
            © 2026{' '}
            <a href="https://vietrochack.com" target="_blank" rel="noreferrer" className="underline hover:text-white">
              VietRocHack
            </a>{' '}
            ·{' '}
            <a href={DEVPOST} target="_blank" rel="noreferrer" className="underline hover:text-white">
              Devpost
            </a>{' '}
            ·{' '}
            <a href="https://github.com/VietRocHack/TeachXR" target="_blank" rel="noreferrer" className="underline hover:text-white">
              GitHub
            </a>
          </footer>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-violet-100/80">
            <button
              type="button"
              onClick={() => setAbout((a) => !a)}
              className="rounded-full border border-violet-300/30 bg-violet-950/50 px-2 py-0.5 hover:bg-violet-800/60"
            >
              {about ? 'Hide' : 'How it works'}
            </button>
          </div>
          {about && (
            <div className="holo-panel mt-3 p-3 text-xs leading-relaxed text-violet-100/90 fade-in">
              <p>
                The original TeachXR ran on a Meta Quest 3: students pointed and circled textbook passages with their
                hands, and an AI voice tutor explained them. This web demo recreates that experience in 3D.
              </p>
              <ol className="mt-2 list-decimal space-y-1 pl-4">
                <li>Tap the glasses on the desk to put them on.</li>
                <li>Press the blue <LuPlus className="inline h-3 w-3 align-[-1px]" /> on the TeachXR window to start the tutor (allow the microphone to talk out loud).</li>
                <li>Drag to look around. Flip the book with the arrows on the dock.</li>
                <li>Switch to Circle (or hold Shift) and draw around a paragraph, diagram or problem.</li>
                <li>TeachXR sees what you circled and helps, by voice or chat.</li>
              </ol>
              <p className="mt-2 text-violet-200/70">Powered by Gemini Live. Sessions last up to 8 minutes.</p>
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={onStart}
          className="pointer-events-auto tap-hint rounded-full border border-violet-300/50 bg-violet-600/80 px-6 py-3 font-display text-base font-semibold text-white shadow-[0_0_40px_rgba(139,92,246,0.55)] backdrop-blur hover:bg-violet-500"
        >
          Put on the glasses
        </button>
        <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-black/40 px-3 py-1 text-xs text-violet-100/80 backdrop-blur">
          <button type="button" onClick={() => setSpread(Math.max(0, spread - 1))} className="grid place-items-center px-1 hover:text-white" aria-label="Previous page">
            <LuChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span>
            Open to: <b>{TOPICS[spread].left.title}</b>
          </span>
          <button
            type="button"
            onClick={() => setSpread(Math.min(TOPICS.length - 1, spread + 1))}
            className="grid place-items-center px-1 hover:text-white"
            aria-label="Next page"
          >
            <LuChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
