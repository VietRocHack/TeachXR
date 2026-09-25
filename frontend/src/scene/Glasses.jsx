// The TeachXR mixed-reality glasses. They hover over a charging pad on the
// desk; tapping them plays the "put on" animation up to the viewer's face.

import { useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { DESK_TOP } from './Desk';
import { LuSparkles } from 'react-icons/lu';

const PAD = new THREE.Vector3(-0.4, DESK_TOP, 0.06);
const REST_POS = new THREE.Vector3(PAD.x, DESK_TOP + 0.07, PAD.z);
const REST_ROT = new THREE.Euler(0.25, Math.PI + 0.3, 0);
const WEAR_SECONDS = 1.9;
const REMOVE_SECONDS = 1.3;

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Glasses model built from primitives. Local -z is "forward" (like a camera),
// so when worn the model's orientation matches the camera's.
function GlassesModel({ glow }) {
  const visor = useMemo(() => new THREE.CylinderGeometry(0.095, 0.095, 0.036, 64, 1, true, Math.PI - 0.9, 1.8), []);
  const brow = useMemo(() => new THREE.CylinderGeometry(0.098, 0.098, 0.011, 64, 1, true, Math.PI - 0.92, 1.84), []);
  const rim = useMemo(() => new THREE.CylinderGeometry(0.096, 0.096, 0.003, 64, 1, true, Math.PI - 0.9, 1.8), []);
  const strip = useMemo(() => new THREE.CylinderGeometry(0.0995, 0.0995, 0.0025, 64, 1, true, Math.PI - 0.75, 1.5), []);
  const frameMat = (
    <meshStandardMaterial color="#1a1726" metalness={0.8} roughness={0.25} side={THREE.DoubleSide} />
  );
  return (
    <group position={[0, 0, 0.07]}>
      <mesh geometry={visor}>
        <meshPhysicalMaterial
          color="#231a5a"
          transparent
          opacity={0.88}
          roughness={0.05}
          metalness={0.85}
          iridescence={1}
          iridescenceIOR={1.7}
          iridescenceThicknessRange={[250, 800]}
          clearcoat={1}
          envMapIntensity={3}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={brow} position={[0, 0.022, 0]}>
        {frameMat}
      </mesh>
      <mesh geometry={rim} position={[0, -0.0185, 0]}>
        {frameMat}
      </mesh>
      <mesh geometry={strip} position={[0, 0.0225, 0]}>
        <meshStandardMaterial
          color="#c4b5fd"
          emissive="#8b5cf6"
          emissiveIntensity={glow}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* nose bridge */}
      <mesh position={[0, -0.016, -0.09]}>
        <boxGeometry args={[0.022, 0.012, 0.012]} />
        {frameMat}
      </mesh>
      {/* sensors at the front corners */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.06, 0.021, -0.078]} rotation-y={-s * 0.7}>
          <mesh rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.006, 0.006, 0.008, 16]} />
            <meshStandardMaterial color="#0b0a10" metalness={0.5} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0, -0.0045]}>
            <circleGeometry args={[0.0028, 16]} />
            <meshBasicMaterial color="#67e8f9" toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
      {/* temples */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.077, 0.02, 0.066]}>
          <mesh>
            <boxGeometry args={[0.007, 0.014, 0.13]} />
            {frameMat}
          </mesh>
          <mesh position={[s * 0.0036, 0.002, -0.02]}>
            <boxGeometry args={[0.001, 0.003, 0.07]} />
            <meshStandardMaterial emissive="#22d3ee" emissiveIntensity={glow * 0.8} color="#67e8f9" toneMapped={false} />
          </mesh>
          <mesh position={[0, -0.008, 0.062]} rotation-x={0.5}>
            <boxGeometry args={[0.007, 0.02, 0.012]} />
            {frameMat}
          </mesh>
        </group>
      ))}
    </group>
  );
}

function ChargingPad({ active }) {
  const ring = useRef();
  useFrame(({ clock }) => {
    if (ring.current) ring.current.material.emissiveIntensity = active ? 1.5 + Math.sin(clock.elapsedTime * 2.5) * 1 : 0.2;
  });
  return (
    <group position={PAD}>
      <mesh position={[0, 0.004, 0]} receiveShadow>
        <cylinderGeometry args={[0.085, 0.09, 0.008, 48]} />
        <meshStandardMaterial color="#1b1928" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh ref={ring} position={[0, 0.0085, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.07, 0.078, 64]} />
        <meshStandardMaterial color="#c4b5fd" emissive="#8b5cf6" emissiveIntensity={2} toneMapped={false} />
      </mesh>
    </group>
  );
}

export default function Glasses({ phase, onSelect, onWorn, onRemoved }) {
  const group = useRef();
  const { camera } = useThree();
  const [hovered, setHovered] = useState(false);
  const anim = useRef({ t: 0, phase: null, done: false, fromPos: new THREE.Vector3(), fromQuat: new THREE.Quaternion() });
  const restQuat = useMemo(() => new THREE.Quaternion().setFromEuler(REST_ROT), []);
  const tmp = useMemo(() => ({ pos: new THREE.Vector3(), quat: new THREE.Quaternion(), fwd: new THREE.Vector3() }), []);

  useFrame(({ clock }, rawDelta) => {
    const g = group.current;
    if (!g) return;
    const a = anim.current;
    // Cap the step so a stalled frame (tab switch, slow load) doesn't skip
    // the whole animation.
    const delta = Math.min(rawDelta, 0.25);
    if (a.phase !== phase) {
      a.phase = phase;
      a.t = 0;
      a.done = false;
      a.fromPos.copy(g.position);
      a.fromQuat.copy(g.quaternion);
    }

    // Where the glasses sit when worn: just in front of the eye.
    camera.getWorldDirection(tmp.fwd);
    const facePos = tmp.pos.copy(camera.position).addScaledVector(tmp.fwd, 0.035);
    facePos.y -= 0.005;

    if (phase === 'desk') {
      const bob = Math.sin(clock.elapsedTime * 1.6) * 0.006;
      g.position.set(REST_POS.x, REST_POS.y + bob, REST_POS.z);
      g.quaternion.copy(restQuat);
      g.rotateY(Math.sin(clock.elapsedTime * 0.7) * 0.25);
      const target = hovered ? 1.12 : 1;
      g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, target, 10, delta));
      g.visible = true;
    } else if (phase === 'wearing') {
      a.t = Math.min(1, a.t + delta / WEAR_SECONDS);
      const t = easeInOut(a.t);
      g.position.lerpVectors(a.fromPos, facePos, t);
      g.position.y += Math.sin(t * Math.PI) * 0.12;
      g.quaternion.slerpQuaternions(a.fromQuat, camera.quaternion, t);
      g.scale.setScalar(1);
      g.visible = true;
      if (a.t >= 1 && !a.done) {
        a.done = true;
        onWorn?.();
      }
    } else if (phase === 'removing') {
      if (a.t === 0) {
        // Start from the face, not wherever the hidden model was left.
        a.fromPos.copy(facePos);
        a.fromQuat.copy(camera.quaternion);
      }
      a.t = Math.min(1, a.t + delta / REMOVE_SECONDS);
      const t = easeInOut(a.t);
      g.position.lerpVectors(a.fromPos, REST_POS, t);
      g.position.y += Math.sin(t * Math.PI) * 0.1;
      g.quaternion.slerpQuaternions(a.fromQuat, restQuat, t);
      g.visible = true;
      if (a.t >= 1 && !a.done) {
        a.done = true;
        onRemoved?.();
      }
    } else {
      // booting / xr: they're on the viewer's face, out of view.
      g.visible = false;
      g.position.copy(facePos);
      g.quaternion.copy(camera.quaternion);
    }
  });

  const interactive = phase === 'desk';
  return (
    <>
      <ChargingPad active={phase === 'desk'} />
      <group
        ref={group}
        position={REST_POS}
        onClick={(e) => {
          if (!interactive) return;
          e.stopPropagation();
          setHovered(false);
          document.body.style.cursor = '';
          onSelect?.();
        }}
        onPointerOver={(e) => {
          if (!interactive) return;
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = '';
        }}
      >
        <GlassesModel glow={hovered ? 6 : 3} />
        {/* generous invisible hit area so the glasses are easy to tap on mobile */}
        <mesh visible={false} position={[0, 0, 0.05]}>
          <boxGeometry args={[0.3, 0.14, 0.3]} />
        </mesh>
        {interactive && (
          <Html position={[0, 0.09, 0]} center distanceFactor={0.6} zIndexRange={[10, 0]}>
            <button
              type="button"
              onClick={onSelect}
              className="tap-hint whitespace-nowrap rounded-full border border-violet-300/60 bg-violet-950/70 px-4 py-2 text-sm font-semibold text-violet-100 shadow-[0_0_24px_rgba(139,92,246,0.6)] backdrop-blur"
            >
              <LuSparkles className="mr-1.5 inline h-4 w-4 align-[-3px]" />
              Tap to put on TeachXR
            </button>
          </Html>
        )}
      </group>
    </>
  );
}
