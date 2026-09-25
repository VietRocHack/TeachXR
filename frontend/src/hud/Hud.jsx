// Everything drawn "on the lenses" while the glasses are on.

import { useEffect, useState } from 'react';
import { SESSION_SECONDS } from '../lib/useTutor';
import LookSurface from './LookSurface';
import { LuCrosshair, LuEye, LuGlasses, LuLasso, LuPlus } from 'react-icons/lu';

const STATUS_LABEL = { idle: 'STANDBY', connecting: 'CONNECTING', live: 'LIVE', ended: 'ENDED', error: 'OFFLINE' };

function Countdown({ startedAt, live }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!live || !startedAt) return null;
  const left = Math.max(0, SESSION_SECONDS - Math.floor((now - startedAt) / 1000));
  const mm = String(Math.floor(left / 60)).padStart(1, '0');
  const ss = String(left % 60).padStart(2, '0');
  return <span className={left < 60 ? 'text-amber-300' : ''}>{mm}:{ss}</span>;
}

function DockButton({ active, onClick, children, title, disabled }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition disabled:opacity-40 ${
        active
          ? 'bg-violet-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.7)]'
          : 'bg-white/5 text-violet-100 hover:bg-white/15'
      }`}
    >
      {children}
    </button>
  );
}

export default function Hud({
  tutor,
  look,
  circleMode,
  setCircleMode,
  shiftHeld,
  onLasso,
  onTap,
  onRecenter,
  onTakeOff,
  setWorldLayer,
}) {
  const live = tutor.status === 'live';
  const [hint, setHint] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setHint(false), 14000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="hud fixed inset-0 z-20">
      <LookSurface
        look={look}
        circleMode={circleMode}
        shiftHeld={shiftHeld}
        onLasso={onLasso}
        onTap={onTap}
      />
      {/* in-room windows (scene/WorldUI.jsx) render here, above the look surface */}
      <div ref={setWorldLayer} className="pointer-events-none absolute inset-0 z-[5] overflow-hidden" />
      {/* lens frame */}
      <div className="lens-frame pointer-events-none absolute inset-0" />
      <div className="scanlines pointer-events-none absolute inset-0 opacity-40" />

      {/* status bar */}
      <div className="pointer-events-none absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-3 rounded-full border border-violet-300/20 bg-violet-950/50 px-4 py-1.5 font-mono text-xs text-violet-100 backdrop-blur-md">
        <span className="font-display font-bold tracking-wide">
          Teach<span className="text-violet-400">XR</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${live ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          {STATUS_LABEL[tutor.status] || tutor.status.toUpperCase()}
        </span>
        <Countdown startedAt={tutor.startedAt} live={live} />
      </div>

      {hint && (
        <div className="pointer-events-none absolute left-1/2 top-14 z-10 w-[min(92vw,460px)] -translate-x-1/2 rounded-xl border border-cyan-300/20 bg-slate-950/60 px-4 py-2 text-center text-xs text-cyan-100 backdrop-blur-md fade-in">
          Press the blue <LuPlus className="inline h-3.5 w-3.5 align-[-2px]" /> on the TeachXR window to start the tutor · drag to look around · tap the book to turn the page · <b>Circle</b> (or hold <kbd>Shift</kbd>) anything to ask about it · grab the bar under the window to move it
        </div>
      )}

      {/* dock */}
      <div
        className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-violet-300/20 bg-violet-950/60 p-1 backdrop-blur-md sm:gap-2"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <DockButton active={!circleMode} onClick={() => setCircleMode(false)} title="Drag to look around">
          <LuEye className="h-4 w-4" />
          <span className="hidden sm:inline">Look</span>
        </DockButton>
        <DockButton active={circleMode} onClick={() => setCircleMode(true)} title="Draw around something to ask about it">
          <LuLasso className="h-4 w-4" />
          <span className="hidden sm:inline">Circle</span>
        </DockButton>
        <DockButton onClick={onRecenter} title="Bring the TeachXR window in front of you">
          <LuCrosshair className="h-4 w-4" />
          <span className="hidden sm:inline">Recenter</span>
        </DockButton>
        <DockButton onClick={onTakeOff} title="Take the glasses off">
          <LuGlasses className="h-4 w-4" />
          <span className="hidden sm:inline">Take off</span>
        </DockButton>
      </div>

    </div>
  );
}
