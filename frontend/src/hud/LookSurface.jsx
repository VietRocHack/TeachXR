// Full-screen input layer while the glasses are on. Dragging turns your head;
// in circle mode (✍ button, or holding Shift) dragging draws a glowing lasso
// instead, and releasing it captures that region for the tutor. This is the
// browser stand-in for the original MediaPipe "point and circle" gesture.

import { useEffect, useRef } from 'react';
import { LOOK_LIMITS, baseFov } from '../scene/CameraRig';

const MIN_LASSO_PX = 36;

export default function LookSurface({ look, circleMode, shiftHeld, onLasso, lassoPath }) {
  const surface = useRef();
  const canvas = useRef();
  const pointers = useRef(new Map());
  const drag = useRef(null);
  const pinch = useRef(null);
  const path = useRef([]);
  const drawing = circleMode || shiftHeld;

  // Draw the lasso (live while drawing, or the frozen one being asked about).
  useEffect(() => {
    let raf;
    const render = (time) => {
      const c = canvas.current;
      if (c) {
        const dpr = window.devicePixelRatio || 1;
        if (c.width !== c.clientWidth * dpr || c.height !== c.clientHeight * dpr) {
          c.width = c.clientWidth * dpr;
          c.height = c.clientHeight * dpr;
        }
        const ctx = c.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, c.width, c.height);
        const pts = path.current.length ? path.current : lassoPath || [];
        if (pts.length > 1) {
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          ctx.shadowColor = '#a78bfa';
          ctx.shadowBlur = 18;
          ctx.strokeStyle = 'rgba(196,181,253,0.95)';
          ctx.lineWidth = 4;
          ctx.setLineDash(path.current.length ? [] : [10, 8]);
          ctx.lineDashOffset = -time / 30;
          ctx.beginPath();
          ctx.moveTo(pts[0][0], pts[0][1]);
          for (const [x, y] of pts.slice(1)) ctx.lineTo(x, y);
          if (!path.current.length) ctx.closePath();
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(139,92,246,0.10)';
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [lassoPath]);

  // Until the viewer zooms, the field of view follows the window shape.
  const currentFov = () => look.fov ?? baseFov(surface.current.clientWidth / surface.current.clientHeight);

  const localPoint = (e) => {
    const r = surface.current.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };

  const onPointerDown = (e) => {
    try {
      surface.current.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic or already-released pointers can't be captured; harmless.
    }
    pointers.current.set(e.pointerId, [e.clientX, e.clientY]);
    if (pointers.current.size === 2) {
      // Second finger: pinch-zoom, cancel any drag or lasso in progress.
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a[0] - b[0], a[1] - b[1]), fov: currentFov() };
      drag.current = null;
      path.current = [];
      return;
    }
    if (drawing) {
      path.current = [localPoint(e)];
    } else {
      drag.current = { x: e.clientX, y: e.clientY };
    }
  };

  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, [e.clientX, e.clientY]);
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a[0] - b[0], a[1] - b[1]);
      look.fov = clamp(pinch.current.fov * (pinch.current.dist / dist), LOOK_LIMITS.fovMin, LOOK_LIMITS.fovMax);
      return;
    }
    if (path.current.length) {
      path.current.push(localPoint(e));
      return;
    }
    if (drag.current) {
      const h = surface.current.clientHeight;
      const fov = (currentFov() * Math.PI) / 180;
      const perPx = fov / h; // one screen-height of drag turns one field of view
      look.yaw = clamp(look.yaw + (e.clientX - drag.current.x) * perPx, -LOOK_LIMITS.yaw, LOOK_LIMITS.yaw);
      look.pitch = clamp(look.pitch + (e.clientY - drag.current.y) * perPx, LOOK_LIMITS.pitchMin, LOOK_LIMITS.pitchMax);
      drag.current = { x: e.clientX, y: e.clientY };
    }
  };

  const onPointerUp = (e) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    drag.current = null;
    const pts = path.current;
    path.current = [];
    if (pts.length >= 2) {
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      if (Math.max(...xs) - Math.min(...xs) > MIN_LASSO_PX && Math.max(...ys) - Math.min(...ys) > MIN_LASSO_PX) {
        onLasso(pts, { width: surface.current.clientWidth, height: surface.current.clientHeight });
      }
    }
  };

  const onWheel = (e) => {
    look.fov = clamp(currentFov() + e.deltaY * 0.02, LOOK_LIMITS.fovMin, LOOK_LIMITS.fovMax);
  };

  return (
    <div
      ref={surface}
      className={`absolute inset-0 touch-none select-none ${drawing ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
    >
      <canvas ref={canvas} className="pointer-events-none absolute inset-0 h-full w-full" />
    </div>
  );
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}
