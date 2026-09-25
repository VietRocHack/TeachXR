// The study desk and everything on it except the book, monitor and glasses.
// The desktop surface is at y = DESK_TOP.

import { useMemo } from 'react';
import Model from './Model';
import { keyboardTexture, stickyTexture, woodTexture } from './textures';

export const DESK_TOP = 0.75;
const DESK = { w: 1.5, d: 0.72, t: 0.035, z: -0.13 };


function Table() {
  const wood = useMemo(() => woodTexture({ base: '#c9a177', dark: '#94683f', seed: 4 }), []);
  const legs = [
    [-DESK.w / 2 + 0.05, DESK.z - DESK.d / 2 + 0.05],
    [DESK.w / 2 - 0.05, DESK.z - DESK.d / 2 + 0.05],
    [-DESK.w / 2 + 0.05, DESK.z + DESK.d / 2 - 0.05],
  ];
  return (
    <group>
      <mesh position={[0, DESK_TOP - DESK.t / 2, DESK.z]} castShadow receiveShadow>
        <boxGeometry args={[DESK.w, DESK.t, DESK.d]} />
        <meshStandardMaterial map={wood} roughness={0.55} />
      </mesh>
      {legs.map(([x, z], i) => (
        <mesh key={i} position={[x, (DESK_TOP - DESK.t) / 2, z]} castShadow>
          <boxGeometry args={[0.04, DESK_TOP - DESK.t, 0.04]} />
          <meshStandardMaterial color="#2a2833" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      {/* drawer unit on the right */}
      <mesh position={[DESK.w / 2 - 0.22, (DESK_TOP - DESK.t) / 2, DESK.z]} castShadow receiveShadow>
        <boxGeometry args={[0.4, DESK_TOP - DESK.t, DESK.d - 0.04]} />
        <meshStandardMaterial map={wood} roughness={0.6} />
      </mesh>
      {[0.18, 0.42, 0.62].map((y) => (
        <mesh key={y} position={[DESK.w / 2 - 0.22, y, DESK.z + DESK.d / 2 - 0.015]}>
          <boxGeometry args={[0.12, 0.015, 0.012]} />
          <meshStandardMaterial color="#d4d4d8" metalness={0.9} roughness={0.25} />
        </mesh>
      ))}
      {/* LED strip glowing along the back edge */}
      <mesh position={[0, DESK_TOP + 0.004, DESK.z - DESK.d / 2 + 0.01]}>
        <boxGeometry args={[DESK.w - 0.02, 0.008, 0.01]} />
        <meshStandardMaterial color="#a78bfa" emissive="#8b5cf6" emissiveIntensity={4} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Keyboard() {
  const tex = useMemo(() => keyboardTexture(), []);
  return (
    <group position={[0.36, DESK_TOP, 0.02]} rotation-y={-0.18}>
      <mesh position={[0, 0.009, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.36, 0.018, 0.125]} />
        <meshStandardMaterial color="#16151c" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.0185, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.35, 0.12]} />
        <meshStandardMaterial map={tex} roughness={0.6} />
      </mesh>
      {/* mouse + pad */}
      <mesh position={[0.3, 0.002, 0.02]} receiveShadow>
        <boxGeometry args={[0.2, 0.004, 0.18]} />
        <meshStandardMaterial color="#231a3f" roughness={1} />
      </mesh>
      <mesh position={[0.3, 0.017, 0.02]} scale={[0.6, 0.35, 1]} castShadow>
        <sphereGeometry args={[0.05, 24, 16]} />
        <meshStandardMaterial color="#1c1b22" roughness={0.3} />
      </mesh>
    </group>
  );
}

function Mug() {
  return (
    <group position={[0.66, DESK_TOP, 0.16]}>
      <mesh position={[0, 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.036, 0.1, 32, 1, true]} />
        <meshStandardMaterial color="#f5f3ff" roughness={0.3} side={2} />
      </mesh>
      <mesh position={[0, 0.002, 0]}>
        <cylinderGeometry args={[0.036, 0.036, 0.004, 32]} />
        <meshStandardMaterial color="#f5f3ff" />
      </mesh>
      <mesh position={[0, 0.085, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.038, 32]} />
        <meshStandardMaterial color="#3b2416" roughness={0.1} />
      </mesh>
      <mesh position={[0.045, 0.05, 0]} rotation-y={Math.PI / 2}>
        <torusGeometry args={[0.025, 0.007, 12, 24, Math.PI]} />
        <meshStandardMaterial color="#f5f3ff" roughness={0.3} />
      </mesh>
    </group>
  );
}

function PencilCup() {
  const colors = ['#facc15', '#f87171', '#60a5fa', '#34d399', '#c084fc'];
  return (
    <group position={[0.7, DESK_TOP, -0.08]}>
      <mesh position={[0, 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 0.1, 6, 1, true]} />
        <meshStandardMaterial color="#4023a4" roughness={0.4} side={2} />
      </mesh>
      {colors.map((c, i) => {
        const a = (i / colors.length) * Math.PI * 2;
        return (
          <group key={c} position={[Math.cos(a) * 0.015, 0.1, Math.sin(a) * 0.015]} rotation={[Math.sin(a) * 0.2, 0, Math.cos(a) * 0.2]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.004, 0.004, 0.15, 6]} />
              <meshStandardMaterial color={c} />
            </mesh>
            <mesh position={[0, 0.08, 0]}>
              <coneGeometry args={[0.004, 0.012, 6]} />
              <meshStandardMaterial color="#e8c9a0" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function Notebook() {
  return (
    <group position={[-0.56, DESK_TOP, -0.2]} rotation-y={0.3}>
      <mesh position={[0, 0.006, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.16, 0.012, 0.22]} />
        <meshStandardMaterial color="#0f766e" roughness={0.7} />
      </mesh>
      <mesh position={[0.01, 0.017, 0.02]} rotation={[0, -0.5, 0]} castShadow>
        <boxGeometry args={[0.012, 0.01, 0.16]} />
        <meshStandardMaterial color="#facc15" />
      </mesh>
    </group>
  );
}

function StickyNotes() {
  const notes = useMemo(
    () => [
      stickyTexture('quiz fri!\nch. 3-4', '#fde68a'),
      stickyTexture('ask about\nfractions', '#fbcfe8'),
      stickyTexture('drink\nwater :)', '#bbf7d0'),
    ],
    [],
  );
  return (
    <group>
      <mesh position={[0.28, 1.22, -0.495]} rotation-z={0.06}>
        <planeGeometry args={[0.07, 0.07]} />
        <meshStandardMaterial map={notes[0]} />
      </mesh>
      <mesh position={[0.18, 1.3, -0.495]} rotation-z={-0.08}>
        <planeGeometry args={[0.07, 0.07]} />
        <meshStandardMaterial map={notes[1]} />
      </mesh>
      <mesh position={[-0.52, DESK_TOP + 0.013, -0.18]} rotation={[-Math.PI / 2, 0, 0.35]}>
        <planeGeometry args={[0.07, 0.07]} />
        <meshStandardMaterial map={notes[2]} />
      </mesh>
    </group>
  );
}

export default function Desk() {
  return (
    <group>
      <Table />
      <Keyboard />
      <Mug />
      <PencilCup />
      <Notebook />
      <StickyNotes />
      <Model url="/models/desk_lamp_arm_01.glb" position={[-0.64, DESK_TOP, -0.34]} rotation-y={2.3} scale={0.85} />
      <Model url="/models/alarm_clock_01.glb" position={[-0.25, DESK_TOP, -0.4]} rotation-y={0.25} />
      <Model url="/models/potted_plant_04.glb" position={[0.66, DESK_TOP, -0.38]} />
    </group>
  );
}
