// The study desk and everything on it except the book, monitor and glasses:
// an oak top on a black steel frame, a slim LED task lamp (the scene's key
// light, see Experience.jsx), keyboard, mouse, mug, pen cup and notebooks.
// Items are laid out so nothing overlaps. The desktop surface is at y = DESK_TOP.

import { useMemo } from 'react';
import { keyboardTexture, stickyTexture } from './textures';
import { useSurface } from './pbr';

export const DESK_TOP = 0.75;
const DESK = { w: 1.5, d: 0.72, t: 0.028, z: -0.13 };
// Where the task lamp's head sits; Experience.jsx aims the key spotlight from here.
export const LAMP_HEAD = [-0.34, 1.13, -0.3];

const BLACK = '#1d1c21';
const OAK = '#e2c7a4';

function Table() {
  const top = useSurface('oak_veneer_01', { repeat: [1.5, 0.7] });
  const legH = DESK_TOP - DESK.t;
  const steel = <meshStandardMaterial color={BLACK} metalness={0.5} roughness={0.45} />;
  return (
    <group>
      <mesh position={[0, DESK_TOP - DESK.t / 2, DESK.z]} castShadow receiveShadow>
        <boxGeometry args={[DESK.w, DESK.t, DESK.d]} />
        <meshStandardMaterial {...top} color={OAK} />
      </mesh>
      {/* two closed rectangular steel side frames */}
      {[-DESK.w / 2 + 0.07, DESK.w / 2 - 0.07].map((x) => (
        <group key={x} position={[x, 0, DESK.z]}>
          {[-DESK.d / 2 + 0.05, DESK.d / 2 - 0.05].map((z) => (
            <mesh key={z} position={[0, legH / 2, z]} castShadow>
              <boxGeometry args={[0.03, legH, 0.03]} />
              {steel}
            </mesh>
          ))}
          <mesh position={[0, 0.015, 0]} castShadow>
            <boxGeometry args={[0.03, 0.03, DESK.d - 0.07]} />
            {steel}
          </mesh>
          <mesh position={[0, legH - 0.015, 0]}>
            <boxGeometry args={[0.03, 0.03, DESK.d - 0.07]} />
            {steel}
          </mesh>
        </group>
      ))}
      <mesh position={[0, DESK_TOP - DESK.t - 0.03, DESK.z - DESK.d / 2 + 0.05]}>
        <boxGeometry args={[DESK.w - 0.14, 0.04, 0.02]} />
        {steel}
      </mesh>
      {/* LED strip glowing along the back edge */}
      <mesh position={[0, DESK_TOP + 0.004, DESK.z - DESK.d / 2 + 0.01]}>
        <boxGeometry args={[DESK.w - 0.02, 0.008, 0.01]} />
        <meshStandardMaterial color="#a78bfa" emissive="#8b5cf6" emissiveIntensity={3} toneMapped={false} />
      </mesh>
    </group>
  );
}

// Slim LED task lamp: weighted base, upright, a horizontal arm and a flat head.
function TaskLamp() {
  const [hx, hy, hz] = LAMP_HEAD;
  const baseX = -0.64;
  const armLen = hx - baseX;
  const steel = <meshStandardMaterial color={BLACK} metalness={0.5} roughness={0.4} />;
  return (
    <group position={[baseX, DESK_TOP, hz]}>
      <mesh position={[0, 0.01, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.075, 0.08, 0.02, 40]} />
        {steel}
      </mesh>
      <mesh position={[0, (hy - DESK_TOP) / 2, 0]} castShadow>
        <cylinderGeometry args={[0.007, 0.007, hy - DESK_TOP, 12]} />
        {steel}
      </mesh>
      <mesh position={[armLen / 2, hy - DESK_TOP, 0]} rotation-z={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.006, 0.006, armLen, 12]} />
        {steel}
      </mesh>
      <group position={[armLen, hy - DESK_TOP, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.2, 0.016, 0.055]} />
          {steel}
        </mesh>
        <mesh position={[0, -0.009, 0]} rotation-x={Math.PI / 2}>
          <planeGeometry args={[0.18, 0.04]} />
          <meshStandardMaterial color="#fff6e8" emissive="#ffe2b8" emissiveIntensity={2} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

function Keyboard() {
  const tex = useMemo(() => keyboardTexture(), []);
  return (
    <group position={[0.36, DESK_TOP, 0.02]} rotation-y={-0.18}>
      <mesh position={[0, 0.009, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.36, 0.018, 0.125]} />
        <meshStandardMaterial color="#2a2930" metalness={0.3} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.0185, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.35, 0.12]} />
        <meshStandardMaterial map={tex} roughness={0.6} />
      </mesh>
      {/* felt mouse pad + mouse */}
      <mesh position={[0.3, 0.002, 0.02]} receiveShadow>
        <boxGeometry args={[0.2, 0.004, 0.18]} />
        <meshStandardMaterial color="#45434b" roughness={1} />
      </mesh>
      <mesh position={[0.3, 0.017, 0.02]} scale={[0.6, 0.35, 1]} castShadow>
        <sphereGeometry args={[0.05, 24, 16]} />
        <meshStandardMaterial color="#efeeeb" roughness={0.35} />
      </mesh>
    </group>
  );
}

function Mug({ position }) {
  const ceramic = <meshStandardMaterial color="#9fb2a2" roughness={0.55} />;
  return (
    <group position={position}>
      <mesh position={[0, 0.048, 0]} castShadow>
        <cylinderGeometry args={[0.038, 0.038, 0.096, 32, 1, true]} />
        <meshStandardMaterial color="#9fb2a2" roughness={0.55} side={2} />
      </mesh>
      <mesh position={[0, 0.002, 0]}>
        <cylinderGeometry args={[0.038, 0.038, 0.004, 32]} />
        {ceramic}
      </mesh>
      <mesh position={[0, 0.082, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.036, 32]} />
        <meshStandardMaterial color="#3b2416" roughness={0.1} />
      </mesh>
      <mesh position={[0.043, 0.05, 0]} rotation-y={Math.PI / 2}>
        <torusGeometry args={[0.022, 0.006, 12, 24, Math.PI]} />
        {ceramic}
      </mesh>
    </group>
  );
}

function PenCup({ position }) {
  const pens = ['#1d1c21', '#e07a5f', '#1d1c21', '#84a59d', '#f4f1de'];
  return (
    <group position={position}>
      <mesh position={[0, 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 0.1, 32, 1, true]} />
        <meshStandardMaterial color="#f2efea" roughness={0.5} side={2} />
      </mesh>
      <mesh position={[0, 0.002, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.004, 32]} />
        <meshStandardMaterial color="#f2efea" roughness={0.5} />
      </mesh>
      {pens.map((c, i) => {
        const a = (i / pens.length) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.014, 0.1, Math.sin(a) * 0.014]}
            rotation={[Math.sin(a) * 0.18, 0, Math.cos(a) * 0.18]}
            castShadow
          >
            <cylinderGeometry args={[0.0045, 0.0045, 0.15, 8]} />
            <meshStandardMaterial color={c} roughness={0.4} />
          </mesh>
        );
      })}
    </group>
  );
}

function Notebooks({ position }) {
  return (
    <group position={position} rotation-y={0.12}>
      <mesh position={[0, 0.006, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.17, 0.012, 0.23]} />
        <meshStandardMaterial color="#2f3e46" roughness={0.8} />
      </mesh>
      <mesh position={[0.01, 0.017, 0.005]} rotation-y={-0.1} castShadow receiveShadow>
        <boxGeometry args={[0.15, 0.01, 0.21]} />
        <meshStandardMaterial color="#84a59d" roughness={0.8} />
      </mesh>
      <mesh position={[0.02, 0.026, 0]} rotation={[Math.PI / 2, 0, 0.6]} castShadow>
        <cylinderGeometry args={[0.004, 0.004, 0.14, 8]} />
        <meshStandardMaterial color={BLACK} roughness={0.3} />
      </mesh>
    </group>
  );
}

function StickyNotes() {
  const notes = useMemo(
    () => [stickyTexture('quiz fri!\nch. 3-4', '#fde68a'), stickyTexture('ask about\nfractions', '#fbcfe8')],
    [],
  );
  return (
    <group>
      <mesh position={[0.25, 1.05, -0.494]} rotation-z={0.06}>
        <planeGeometry args={[0.07, 0.07]} />
        <meshStandardMaterial map={notes[0]} roughness={0.9} />
      </mesh>
      <mesh position={[0.26, 0.95, -0.494]} rotation-z={-0.08}>
        <planeGeometry args={[0.07, 0.07]} />
        <meshStandardMaterial map={notes[1]} roughness={0.9} />
      </mesh>
    </group>
  );
}

export default function Desk() {
  return (
    <group>
      <Table />
      <TaskLamp />
      <Keyboard />
      <Mug position={[-0.64, DESK_TOP, 0.06]} />
      <PenCup position={[0.72, DESK_TOP, -0.16]} />
      <Notebooks position={[-0.2, DESK_TOP, -0.36]} />
      <StickyNotes />
    </group>
  );
}
