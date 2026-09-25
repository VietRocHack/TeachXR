// Seated first-person camera. On the desk it drifts gently with the pointer;
// with the glasses on, dragging turns your head (look state lives in `look`,
// written by the HUD's pointer handlers).

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export const EYE = new THREE.Vector3(0, 1.26, 0.72);
const TARGET = new THREE.Vector3(0, 0.84, -0.14);
const dir = TARGET.clone().sub(EYE).normalize();
export const BASE_YAW = Math.atan2(-dir.x, -dir.z);
export const BASE_PITCH = Math.asin(dir.y);

// Width of the HUD chat column on desktop (see hud/Hud.jsx), plus margin.
const CHAT_PANEL_PX = 400;

export const LOOK_LIMITS = { yaw: 2.0, pitchMin: -1.2, pitchMax: 0.7, fovMin: 28, fovMax: 70 };

export function createLook() {
  return { yaw: BASE_YAW, pitch: BASE_PITCH, fov: null };
}

export function baseFov(aspect) {
  // Portrait phones need a much wider view to fit the desk in.
  if (aspect < 0.6) return 78;
  if (aspect < 1) return 66;
  return 55;
}

export default function CameraRig({ phase, look }) {
  const { camera, size } = useThree();
  const shiftRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    camera.position.copy(EYE);
    camera.rotation.order = 'YXZ';
  }, [camera]);

  useFrame(({ pointer }, delta) => {
    // Dev-only: window.__cam = { pos: [x,y,z], target: [x,y,z], fov } to
    // inspect the scene from anywhere; delete it to hand control back.
    if (import.meta.env.DEV && window.__cam) {
      const { pos, target, fov = 40 } = window.__cam;
      camera.position.set(...pos);
      camera.lookAt(...target);
      camera.fov = fov;
      camera.updateProjectionMatrix();
      return;
    }
    if (import.meta.env.DEV && !camera.position.equals(EYE)) camera.position.copy(EYE);
    const fov0 = baseFov(size.width / size.height);
    let yaw;
    let pitch;
    let fov = fov0;
    if (phase === 'xr') {
      yaw = look.yaw;
      pitch = look.pitch;
      fov = look.fov ?? fov0;
    } else if (phase === 'desk') {
      // Portrait screens can't fit the whole desk; favor the left side so the
      // glasses (the thing to tap) stay in view.
      const portraitYaw = size.width / size.height < 0.8 ? 0.3 : 0;
      yaw = BASE_YAW + portraitYaw - pointer.x * 0.05;
      pitch = BASE_PITCH + pointer.y * 0.03;
    } else {
      yaw = BASE_YAW;
      pitch = BASE_PITCH;
    }
    camera.rotation.y = THREE.MathUtils.damp(camera.rotation.y, yaw, 8, delta);
    camera.rotation.x = THREE.MathUtils.damp(camera.rotation.x, pitch, 8, delta);
    camera.rotation.z = 0;
    // The HUD chat covers part of the view: a column on the right on wide
    // screens, a bottom sheet on phones. Render a larger frame and show the
    // part of it that puts the desk in the space the chat leaves free.
    const wide = size.width >= 640;
    const tx = phase === 'xr' && wide ? CHAT_PANEL_PX / 2 : 0;
    const ty = phase === 'xr' && !wide ? (size.height * 0.42 + 80) / 2 : 0;
    const sx = THREE.MathUtils.damp(shiftRef.current.x, tx, 6, delta);
    const sy = THREE.MathUtils.damp(shiftRef.current.y, ty, 6, delta);
    const key = `${size.width}x${size.height}`;
    const moved = Math.abs(sx - shiftRef.current.x) > 0.05 || Math.abs(sy - shiftRef.current.y) > 0.05;
    if (moved || camera.userData.shiftFor !== key) {
      shiftRef.current = { x: sx, y: sy };
      camera.userData.shiftFor = key;
      const fullW = size.width + 2 * sx;
      const fullH = size.height + 2 * sy;
      camera.aspect = fullW / fullH;
      if (sx < 0.5 && sy < 0.5) {
        camera.aspect = size.width / size.height;
        camera.clearViewOffset();
      } else {
        camera.setViewOffset(fullW, fullH, 2 * sx, 2 * sy, size.width, size.height);
      }
    }
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = THREE.MathUtils.damp(camera.fov, fov, 8, delta);
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
