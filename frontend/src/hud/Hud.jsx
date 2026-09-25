// Everything drawn "on the lenses" while the glasses are on.

import { useEffect, useState } from 'react';
import { TOPICS } from '../content/topics';
import { SESSION_SECONDS } from '../lib/useTutor';
import ChatPanel from './ChatPanel';
import LookSurface from './LookSurface';
import SelectionPopup from './SelectionPopup';

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
  spread,
  setSpread,
  circleMode,
  setCircleMode,
  shiftHeld,
  onLasso,
  pending,
  onAsk,
  onCancelPending,
  onTakeOff,
}) {
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const live = tutor.status === 'live';
  const [hint, setHint] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setHint(false), 9000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="hud fixed inset-0 z-20">
      <LookSurface
        look={look}
        circleMode={circleMode}
        shiftHeld={shiftHeld}
        onLasso={onLasso}
        lassoPath={pending?.path}
      />
      {/* lens frame */}
      <div className="lens-frame pointer-events-none absolute inset-0" />
      <div className="scanlines pointer-events-none absolute inset-0 opacity-40" />

      {/* status bar */}
      <div className="pointer-events-none absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-3 rounded-full border border-violet-300/20 bg-violet-950/50 px-4 py-1.5 font-mono text-xs text-violet-100 backdrop-blur-md">
        <span className="font-display font-bold tracking-wide">
          Teach<span className="text-violet-400">XR</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${live ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          {live ? 'LIVE' : tutor.status.toUpperCase()}
        </span>
        <Countdown startedAt={tutor.startedAt} live={live} />
      </div>

      {hint && (
        <div className="pointer-events-none absolute left-1/2 top-14 w-[min(92vw,460px)] -translate-x-1/2 rounded-xl border border-cyan-300/20 bg-slate-950/60 px-4 py-2 text-center text-xs text-cyan-100 backdrop-blur-md fade-in">
          Drag to look around · <b>✍ Circle</b> (or hold <kbd>Shift</kbd>) and draw around anything to ask about it
        </div>
      )}

      {/* chat: right column on desktop, bottom sheet on phones */}
      <div className="pointer-events-none absolute inset-x-2 bottom-20 sm:inset-x-auto sm:bottom-24 sm:right-4 sm:top-16 sm:w-[380px]">
        <ChatPanel tutor={tutor} collapsed={chatCollapsed} onToggleCollapsed={() => setChatCollapsed((c) => !c)} />
      </div>

      {/* dock */}
      <div
        className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-violet-300/20 bg-violet-950/60 p-1 backdrop-blur-md sm:gap-2"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <DockButton active={!circleMode} onClick={() => setCircleMode(false)} title="Drag to look around">
          👁<span className="hidden sm:inline">Look</span>
        </DockButton>
        <DockButton active={circleMode} onClick={() => setCircleMode(true)} title="Draw around something to ask about it">
          ✍<span className="hidden sm:inline">Circle</span>
        </DockButton>
        <div className="mx-1 flex items-center gap-1 text-xs text-violet-200/80">
          <DockButton onClick={() => setSpread(spread - 1)} disabled={spread === 0} title="Previous page">
            ◀
          </DockButton>
          <span className="w-10 text-center font-mono">
            {spread + 1}/{TOPICS.length}
          </span>
          <DockButton onClick={() => setSpread(spread + 1)} disabled={spread === TOPICS.length - 1} title="Next page">
            ▶
          </DockButton>
        </div>
        <DockButton onClick={onTakeOff} title="Take the glasses off">
          ⏏<span className="hidden sm:inline">Take off</span>
        </DockButton>
      </div>

      {pending && (
        <SelectionPopup capture={pending} anchor={pending.rect} onAsk={onAsk} onCancel={onCancelPending} canSend={live} />
      )}
    </div>
  );
}
