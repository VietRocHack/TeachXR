// The TeachXR mixed-reality glasses. They hover over a charging pad on the
// desk; tapping them plays the "put on" animation up to the viewer's face.

import { useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { DESK_TOP } from './Desk';
import Model from './Model';
import { LuSparkles } from 'react-icons/lu';

const PAD = new THREE.Vector3(-0.4, DESK_TOP, 0.06);
const REST_POS = new THREE.Vector3(PAD.x, DESK_TOP + 0.07, PAD.z);
const REST_ROT = new THREE.Euler(0.25, Math.PI + 0.3, 0);
const WEAR_SECONDS = 1.9;
const REMOVE_SECONDS = 1.3;

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// The TeachXR glasses: Khronos's "SunglassesKhronos" model (Eric Chadwick,
// CC BY 4.0) restyled as mixed-reality glasses: matte black frame, smoky
// iridescent purple lenses and two glowing sensor lights at the hinges. Its logo-printed
// earhook texture is dropped. Local -z is "forward" (like a camera), so when
// worn the model's orientation matches the camera's.
const FRAME = new THREE.MeshStandardMaterial({ color: '#16141c', metalness: 0.35, roughness: 0.32 });
const LENS = new THREE.MeshPhysicalMaterial({
  color: '#4a3a9a',
  metalness: 0.45,
  roughness: 0.04,
  clearcoat: 1,
  iridescence: 1,
  iridescenceIOR: 1.7,
  iridescenceThicknessRange: [250, 800],
  envMapIntensity: 2.5,
});
const GLASSES_OVERRIDES = {
  earhooks: { material: FRAME },
  temples: { material: FRAME },
  nose_pads: { color: '#3a3542', map: null, roughness: 0.6 },
  lens_exterior: { material: LENS },
  lens_interior: { material: LENS },
};

function GlassesModel({ glow }) {
  return (
    <group>
      <Model url="/models/SunglassesKhronos.glb" rotation-y={Math.PI} position={[0, -0.029, 0.03]} overrides={GLASSES_OVERRIDES} />
      {/* sensor lights at the hinges */}
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * 0.071, 0.022, 0.022]}>
          <sphereGeometry args={[0.0024, 16, 12]} />
          <meshStandardMaterial color="#c4b5fd" emissive="#8b5cf6" emissiveIntensity={glow} toneMapped={false} />
        </mesh>
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
