// UI that lives in the room rather than on the screen, like the floating
// panels of the original Quest build:
//  - TutorWindow: the chat window, anchored in space; drag its header to move it.
//  - CapturePopup: the "ask about this" card, floating beside what you circled.
//  - LassoTrace: the circle you drew, projected onto the book or monitor.
// The windows are real DOM (drei <Html transform>) so text is crisp and inputs
// work; they render into a HUD layer above the look/lasso surface.

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import LegacyLearnPanel from '../hud/LegacyLearnPanel';
import SelectionPopup from '../hud/SelectionPopup';
import { EYE, LOOK_LIMITS } from './CameraRig';

// CSS px -> meters is distanceFactor / 400 (drei Html transform). The window
// is the original /learn page: a wide layout, or stacked on portrait screens.
const WINDOW = {
  wide: { w: 1100, h: 780, df: 0.24 },
  compact: { w: 560, h: 1040, df: 0.29 },
};
const POPUP_DF = 0.19;

// Direction for a yaw/pitch pair, matching the camera's YXZ rotation.
function direction(yaw, pitch, out = new THREE.Vector3()) {
  return out.set(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
}

// Where the window sits relative to the viewer: yaw/pitch around the eye and
// a distance. Mutated in place by dragging and recentering.
export function createPanelPose(look, aspect) {
  const portrait = aspect < 0.8;
  return {
    yaw: look.yaw + (portrait ? 0 : 0.3),
    pitch: look.pitch + (portrait ? 0.24 : 0.19),
    dist: portrait ? 1.0 : 1.05,
  };
}

function GlowFrame({ w, h, color = '#a78bfa' }) {
  const points = useMemo(() => {
    const x = w / 2 + 0.006;
    const y = h / 2 + 0.006;
    const r = 0.018;
    const pts = [];
    const corners = [
      [x - r, y - r, 0],
      [-x + r, y - r, Math.PI / 2],
      [-x + r, -y + r, Math.PI],
      [x - r, -y + r, (3 * Math.PI) / 2],
    ];
    corners.forEach(([cx, cy, a0]) => {
      for (let i = 0; i <= 6; i++) {
        const a = a0 + (i / 6) * (Math.PI / 2);
        pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, -0.004]);
      }
    });
    pts.push(pts[0]);
    return pts;
  }, [w, h]);
  return <Line points={points} color={color} lineWidth={2} transparent opacity={0.9} toneMapped={false} />;
}

export function TutorWindow({ tutor, pose, portal, onHome }) {
  const group = useRef();
  const { camera, size } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);
  const drag = useRef(null);
  const compact = size.width / size.height < 0.8;
  const win = compact ? WINDOW.compact : WINDOW.wide;
  const w = (win.w * win.df) / 400;
  const h = (win.h * win.df) / 400;

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    direction(pose.yaw, pose.pitch, target).multiplyScalar(pose.dist).add(EYE);
    if (!g.userData.placed) {
      g.position.copy(target);
      g.userData.placed = true;
    } else {
      g.position.x = THREE.MathUtils.damp(g.position.x, target.x, 12, delta);
      g.position.y = THREE.MathUtils.damp(g.position.y, target.y, 12, delta);
      g.position.z = THREE.MathUtils.damp(g.position.z, target.z, 12, delta);
    }
    g.lookAt(EYE);
  });

  // Dragging the grab bar under the window swings it around the viewer, at
  // the same angular rate the view turns, so it tracks the pointer.
  const dragHandle = {
    onPointerDown: (e) => {
      e.stopPropagation();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Synthetic or already-released pointers can't be captured; harmless.
      }
      drag.current = { x: e.clientX, y: e.clientY };
    },
    onPointerMove: (e) => {
      if (!drag.current) return;
      const perPx = ((camera.fov * Math.PI) / 180) / size.height;
      pose.yaw -= (e.clientX - drag.current.x) * perPx;
      pose.pitch = THREE.MathUtils.clamp(
        pose.pitch - (e.clientY - drag.current.y) * perPx,
        LOOK_LIMITS.pitchMin,
        LOOK_LIMITS.pitchMax,
      );
      drag.current = { x: e.clientX, y: e.clientY };
    },
    onPointerUp: () => {
      drag.current = null;
    },
    onPointerCancel: () => {
      drag.current = null;
    },
  };

  return (
    <group ref={group} userData={{ noRaycast: true }}>
      <GlowFrame w={w} h={h} />
      <pointLight position={[0, 0, 0.15]} color="#8b5cf6" intensity={0.35} distance={1.2} decay={2} />
      <Html transform distanceFactor={win.df} portal={portal} zIndexRange={[100, 0]}>
        {/* Height includes the grab bar hanging below the window, so the
            window itself stays centered on the anchor. */}
        <div onWheel={(e) => e.stopPropagation()} style={{ width: win.w, paddingTop: 44 }}>
          <div className="holo-window rounded-2xl shadow-[0_0_60px_rgba(139,92,246,0.45)]" style={{ height: win.h }}>
            <LegacyLearnPanel tutor={tutor} onHome={onHome} compact={compact} />
          </div>
          {/* visionOS-style window bar: grab to move */}
          <div
            {...dragHandle}
            title="Drag to move"
            className="mx-auto mt-4 h-7 w-56 cursor-grab touch-none select-none rounded-full py-2.5 active:cursor-grabbing"
          >
            <div className="h-full w-full rounded-full bg-white/60 shadow-[0_0_12px_rgba(255,255,255,0.5)]" />
          </div>
        </div>
      </Html>
    </group>
  );
}

export function CapturePopup({ pending, portal, onAsk, onCancel, canSend }) {
  const group = useRef();
  useFrame(() => group.current?.lookAt(EYE));
  return (
    <group ref={group} position={pending.anchor} userData={{ noRaycast: true }}>
      <Html transform distanceFactor={POPUP_DF} portal={portal} zIndexRange={[200, 101]}>
        <SelectionPopup capture={pending} onAsk={onAsk} onCancel={onCancel} canSend={canSend} />
      </Html>
    </group>
  );
}

export function LassoTrace({ points }) {
  const line = useRef();
  useFrame((_, delta) => {
    if (line.current) line.current.material.dashOffset -= delta * 0.05;
  });
  if (!points || points.length < 3) return null;
  return (
    <Line
      ref={line}
      userData={{ noRaycast: true }}
      points={points}
      color="#c4b5fd"
      lineWidth={3.5}
      dashed
      dashSize={0.012}
      gapSize={0.006}
      toneMapped={false}
    />
  );
}
