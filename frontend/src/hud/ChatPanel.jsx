// The holographic conversation panel: live transcripts of both sides, circled
// captures, and a text box for typing instead of talking.

import { useEffect, useRef, useState } from 'react';
import Orb from './Orb';

const SOURCE_LABEL = { book: 'from your book', monitor: 'from your monitor', desk: 'from your desk' };

function Bubble({ m }) {
  if (m.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-gradient-to-br from-violet-600 to-indigo-600 px-3 py-2 text-sm text-white shadow-lg">
          {m.image && (
            <figure className="mb-1">
              <img src={m.image} alt="Circled region" className="max-h-40 rounded-lg" />
              <figcaption className="mt-1 text-[11px] text-violet-200/80">✍ circled {SOURCE_LABEL[m.source] || ''}</figcaption>
            </figure>
          )}
          {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-end gap-2">
      <div className="mb-1 h-5 w-5 shrink-0 rounded-full bg-gradient-to-br from-teal-300 via-emerald-400 to-cyan-500 shadow-[0_0_10px_rgba(45,212,191,0.7)]" />
      <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-cyan-300/15 bg-slate-900/60 px-3 py-2 text-sm text-slate-100">
        {m.text}
      </div>
    </div>
  );
}

function statusLabel(tutor, speaking) {
  if (tutor.status === 'connecting') return 'Connecting…';
  if (tutor.status === 'error') return 'Offline';
  if (tutor.status === 'ended') return 'Session ended';
  if (tutor.status !== 'live') return 'Idle';
  if (speaking) return 'Speaking…';
  if (tutor.thinking) return 'Thinking…';
  return tutor.micOn ? 'Listening…' : 'Mic off · type below';
}

export default function ChatPanel({ tutor, collapsed, onToggleCollapsed }) {
  const [text, setText] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const list = useRef();

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' });
  }, [tutor.messages, tutor.thinking]);

  useEffect(() => {
    const timer = setInterval(() => setSpeaking(tutor.getLevels().out > 0.01), 200);
    return () => clearInterval(timer);
  }, [tutor]);

  const live = tutor.status === 'live';

  return (
    <section
      className={`holo-panel pointer-events-auto flex flex-col overflow-hidden transition-[height] duration-300 ${
        collapsed ? 'h-[64px]' : 'h-[42vh] sm:h-full'
      }`}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <header className="flex items-center gap-3 border-b border-violet-300/10 px-3 py-2.5">
        <Orb getLevels={tutor.getLevels} size={38} active={live} />
        <div className="min-w-0 flex-1">
          <div className="font-display text-sm font-semibold tracking-wide text-violet-50">TeachXR Tutor</div>
          <div className="text-xs text-cyan-200/80">{statusLabel(tutor, speaking)}</div>
        </div>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="rounded-full px-2 py-1 text-violet-200/70 hover:bg-white/10 sm:hidden"
          aria-label={collapsed ? 'Expand chat' : 'Collapse chat'}
        >
          {collapsed ? '▴' : '▾'}
        </button>
      </header>

      <div ref={list} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {tutor.messages.length === 0 && (
          <div className="rounded-xl border border-dashed border-violet-300/20 p-3 text-center text-xs text-violet-200/70">
            Circle anything on your book or monitor with <b>✍ Circle</b> (or hold <kbd>Shift</kbd> and drag), or just ask out loud.
          </div>
        )}
        {tutor.messages.map((m) => (
          <Bubble key={m.id} m={m} />
        ))}
        {tutor.thinking && (
          <div className="flex items-center gap-1 pl-7 text-cyan-200/80">
            <span className="dot" />
            <span className="dot" style={{ animationDelay: '0.15s' }} />
            <span className="dot" style={{ animationDelay: '0.3s' }} />
          </div>
        )}
        {tutor.notice && (
          <div className="rounded-xl bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
            {tutor.notice}
            {(tutor.status === 'ended' || tutor.status === 'error') && (
              <button
                type="button"
                onClick={tutor.connect}
                className="ml-2 rounded-full bg-amber-300/20 px-2 py-0.5 font-semibold hover:bg-amber-300/30"
              >
                Reconnect
              </button>
            )}
          </div>
        )}
      </div>

      <form
        className="flex items-center gap-2 border-t border-violet-300/10 p-2"
        onSubmit={(e) => {
          e.preventDefault();
          tutor.sendText(text);
          setText('');
        }}
      >
        <button
          type="button"
          onClick={tutor.toggleMic}
          disabled={!live}
          title={tutor.micOn ? 'Mute microphone' : 'Unmute microphone'}
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border text-base transition ${
            tutor.micOn
              ? 'border-emerald-300/50 bg-emerald-400/20 text-emerald-100'
              : 'border-violet-300/20 bg-white/5 text-violet-200/70'
          } disabled:opacity-40`}
        >
          {tutor.micOn ? '🎙' : '🔇'}
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!live}
          maxLength={1000}
          placeholder={live ? 'Type a question…' : 'Tutor offline'}
          className="min-w-0 flex-1 rounded-full border border-violet-300/20 bg-black/30 px-3 py-2 text-sm text-violet-50 placeholder:text-violet-200/40 focus:border-violet-400 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!live || !text.trim()}
          className="h-9 shrink-0 rounded-full bg-violet-500 px-4 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </section>
  );
}
