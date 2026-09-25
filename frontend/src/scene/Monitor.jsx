// The desk monitor, showing a screen that matches the open book spread.

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { TOPICS } from '../content/topics';
import { MONITOR_H, MONITOR_W, drawMonitor } from '../content/drawPage';
import { DESK_TOP } from './Desk';

const SCREEN_W = 0.6;
const SCREEN_H = SCREEN_W * (MONITOR_H / MONITOR_W);

export default function Monitor({ spread, position = [0.36, DESK_TOP, -0.3], rotationY = -0.32 }) {
  const { canvas, texture } = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = MONITOR_W;
    c.height = MONITOR_H;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 16;
    return { canvas: c, texture: t };
  }, []);

  useEffect(() => {
    const redraw = () => {
      drawMonitor(canvas, TOPICS[spread]);
      texture.needsUpdate = true;
    };
    redraw();
    const timer = setInterval(redraw, 30000); // keep the taskbar clock current
    return () => clearInterval(timer);
  }, [spread, canvas, texture]);

  const screenY = 0.28;
  return (
    <group position={position} rotation-y={rotationY} userData={{ source: 'monitor' }}>
      {/* base + neck */}
      <mesh position={[0, 0.006, 0.02]} castShadow receiveShadow>
        <boxGeometry args={[0.24, 0.012, 0.17]} />
        <meshStandardMaterial color="#26242e" metalness={0.5} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.13, -0.02]} castShadow>
        <boxGeometry args={[0.05, 0.25, 0.02]} />
        <meshStandardMaterial color="#26242e" metalness={0.5} roughness={0.35} />
      </mesh>
      {/* body + bezel */}
      <mesh position={[0, screenY, -0.008]} castShadow>
        <boxGeometry args={[SCREEN_W + 0.02, SCREEN_H + 0.02, 0.022]} />
        <meshStandardMaterial color="#15141b" roughness={0.4} />
      </mesh>
      <mesh position={[0, screenY, 0.0035]}>
        <planeGeometry args={[SCREEN_W, SCREEN_H]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      {/* power LED */}
      <mesh position={[SCREEN_W / 2 - 0.01, screenY - SCREEN_H / 2 - 0.004, 0.004]}>
        <circleGeometry args={[0.002, 12]} />
        <meshBasicMaterial color="#60a5fa" />
      </mesh>
      {/* the screen's glow on the desk and keyboard (area lights face -z, so turn it around) */}
      <rectAreaLight position={[0, screenY, 0.006]} rotation-y={Math.PI} width={SCREEN_W} height={SCREEN_H} color="#aeb8ff" intensity={2} />
    </group>
  );
}
