// TeachXR's presence indicator: the layered gradient orb from the original
// Learn page, now pulsing with the live mic and speech levels.

import { useEffect, useRef } from 'react';

export default function Orb({ getLevels, size = 56, active = true }) {
  const outer = useRef();
  const inner = useRef();

  useEffect(() => {
    let raf;
    let smooth = 0;
    const tick = () => {
      const { mic, out } = active ? getLevels() : { mic: 0, out: 0 };
      const level = Math.min(1, Math.max(out * 6, mic * 4));
      smooth += (level - smooth) * 0.25;
      if (outer.current) {
        outer.current.style.transform = `scale(${1 + smooth * 0.35})`;
        outer.current.style.opacity = String(0.55 + smooth * 0.45);
      }
      if (inner.current) inner.current.style.transform = `scale(${1 + smooth * 0.15})`;
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [getLevels, active]);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        ref={outer}
        className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 shadow-[0_0_30px_8px_rgba(139,92,246,0.45)] transition-transform duration-75"
      />
      <div className="absolute inset-[8%] rounded-full bg-gradient-to-r from-blue-400 to-indigo-600 animate-pulse" />
      <div className="absolute inset-[18%] rounded-full bg-gradient-to-r from-indigo-700 to-purple-700" />
      <div
        ref={inner}
        className="absolute inset-[28%] rounded-full shadow-lg"
        style={{ background: 'radial-gradient(circle, #2dd4bf, #10b981 55%, #0891b2)' }}
      />
      <div className="orb-spin absolute inset-[-6%] rounded-full border border-dashed border-cyan-300/40" />
    </div>
  );
}
