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
import ChatPanel from '../hud/ChatPanel';
import SelectionPopup from '../hud/SelectionPopup';
import { EYE, LOOK_LIMITS } from './CameraRig';

// CSS px -> meters is distanceFactor / 400 (drei Html transform).
const WINDOW_PX = { w: 400, h: 520 };
const WINDOW_DF = 0.4;
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
    yaw: look.yaw + (portrait ? 0 : -0.5),
    pitch: look.pitch + (portrait ? 0.32 : 0.14),
    dist: 1.0,
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

export function TutorWindow({ tutor, pose, portal }) {
  const group = useRef();
  const { camera, size } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);
  const drag = useRef(null);
  const w = (WINDOW_PX.w * WINDOW_DF) / 400;
  const h = (WINDOW_PX.h * WINDOW_DF) / 400;

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

  // Dragging the header swings the window around the viewer, at the same
  // angular rate the view turns, so it tracks the pointer.
  const dragHandle = {
    onPointerDown: (e) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture?.(e.pointerId);
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
      <Html transform distanceFactor={WINDOW_DF} portal={portal} zIndexRange={[100, 0]}>
        <div onWheel={(e) => e.stopPropagation()} style={{ width: WINDOW_PX.w, height: WINDOW_PX.h }}>
          <ChatPanel tutor={tutor} dragHandle={dragHandle} className="h-full w-full" />
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
