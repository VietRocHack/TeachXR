// Shown after circling something: a preview of the capture plus quick ways to
// ask about it. Stands in for the original app's Accept/Reject confirmation.

import { useState } from 'react';

const QUICK = [
  ['Explain this', 'Can you explain this to me simply?'],
  ['Give an example', 'Can you give me an everyday example of this?'],
  ['Help me solve it', 'Can you help me solve this step by step, without just telling me the answer?'],
  ['Summarize', 'Can you summarize this in two sentences?'],
];

const SOURCE_LABEL = { book: '📖 Book', monitor: '🖥️ Monitor', desk: '🗂️ Desk' };

// Positioned in the room next to what was circled (scene/WorldUI.jsx).
export default function SelectionPopup({ capture, onAsk, onCancel, canSend }) {
  const [text, setText] = useState('');
  const ask = (question) => onAsk(question.trim());

  return (
    <div className="holo-panel holo-window w-[340px] p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-violet-200/80">
        <span className="rounded-full bg-violet-500/20 px-2 py-0.5">{SOURCE_LABEL[capture.source] || 'Capture'}</span>
        <button type="button" onClick={onCancel} className="rounded-full px-2 py-0.5 hover:bg-white/10" aria-label="Cancel">
          ✕
        </button>
      </div>
      <img src={capture.dataUrl} alt="What you circled" className="max-h-32 w-full rounded-lg object-contain bg-black/30" />
      {!canSend && (
        <p className="mt-2 rounded-lg bg-blue-500/20 px-3 py-2 text-xs text-blue-100">
          Press the blue <b>＋</b> on the TeachXR window to start the tutor, then ask away.
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {QUICK.map(([label, q]) => (
          <button
            key={label}
            type="button"
            disabled={!canSend}
            onClick={() => ask(q)}
            className="rounded-full border border-violet-300/30 bg-violet-500/15 px-3 py-1 text-xs text-violet-100 hover:bg-violet-500/35 disabled:opacity-40"
          >
            {label}
          </button>
        ))}
      </div>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          ask(text);
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="…or ask your own question (or just speak)"
          maxLength={500}
          className="min-w-0 flex-1 rounded-lg border border-violet-300/20 bg-black/30 px-3 py-2 text-sm text-violet-50 placeholder:text-violet-200/40 focus:border-violet-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!canSend}
          className="rounded-lg bg-violet-500 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-40"
        >
          Ask
        </button>
      </form>
    </div>
  );
}
