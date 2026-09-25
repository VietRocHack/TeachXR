// The study desk and everything on it except the book, monitor and glasses:
// an oak top on a black steel frame, a slim LED task lamp (the scene's key
// light, see Experience.jsx), a keycap keyboard, mouse, cup, pen cup, water
// bottle and notebooks. Small props are modeled with bevels and lathed
// profiles so they hold up next to the scanned models. The desktop surface is
// at y = DESK_TOP.

import { useLayoutEffect, useMemo, useRef } from 'react';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import Model from './Model';
import { stickyTexture } from './textures';
import { useSurface } from './pbr';

export const DESK_TOP = 0.75;
const DESK = { w: 1.5, d: 0.72, t: 0.028, z: -0.13 };
// Where the task lamp's head sits; Experience.jsx aims the key spotlight from here.
export const LAMP_HEAD = [-0.34, 1.13, -0.3];

const BLACK = '#1d1c21';
const OAK = '#e2c7a4';

function Steel(props) {
  return <meshStandardMaterial color={BLACK} metalness={0.55} roughness={0.38} {...props} />;
}

function Table() {
  const top = useSurface('oak_veneer_01', { repeat: [1.5, 0.7] });
  const legH = DESK_TOP - DESK.t;
  return (
    <group>
      <RoundedBox args={[DESK.w, DESK.t, DESK.d]} radius={0.006} smoothness={3} position={[0, DESK_TOP - DESK.t / 2, DESK.z]} castShadow receiveShadow>
        <meshStandardMaterial {...top} color={OAK} />
      </RoundedBox>
      {/* two closed rectangular steel side frames */}
      {[-DESK.w / 2 + 0.07, DESK.w / 2 - 0.07].map((x) => (
        <group key={x} position={[x, 0, DESK.z]}>
          {[-DESK.d / 2 + 0.05, DESK.d / 2 - 0.05].map((z) => (
            <RoundedBox key={z} args={[0.03, legH, 0.03]} radius={0.004} smoothness={2} position={[0, legH / 2, z]} castShadow>
              <Steel />
            </RoundedBox>
          ))}
          <RoundedBox args={[0.03, 0.03, DESK.d - 0.07]} radius={0.004} smoothness={2} position={[0, 0.015, 0]} castShadow>
            <Steel />
          </RoundedBox>
          <RoundedBox args={[0.03, 0.03, DESK.d - 0.07]} radius={0.004} smoothness={2} position={[0, legH - 0.015, 0]}>
            <Steel />
          </RoundedBox>
        </group>
      ))}
      <RoundedBox args={[DESK.w - 0.14, 0.04, 0.02]} radius={0.004} smoothness={2} position={[0, DESK_TOP - DESK.t - 0.03, DESK.z - DESK.d / 2 + 0.05]}>
        <Steel />
      </RoundedBox>
      {/* LED strip glowing along the back edge */}
      <mesh position={[0, DESK_TOP + 0.004, DESK.z - DESK.d / 2 + 0.01]}>
        <boxGeometry args={[DESK.w - 0.02, 0.008, 0.01]} />
        <meshStandardMaterial color="#a78bfa" emissive="#8b5cf6" emissiveIntensity={3} toneMapped={false} />
      </mesh>
    </group>
  );
}

// A lathe from a list of [radius, height] points (meters), for turned shapes.
function lathe(points, segments = 48) {
  return new THREE.LatheGeometry(
    points.map(([r, y]) => new THREE.Vector2(r, y)),
    segments,
  );
}

// Slim LED task lamp: weighted base, upright, a horizontal arm and a flat head.
function TaskLamp() {
  const [hx, hy, hz] = LAMP_HEAD;
  const baseX = -0.64;
  const armLen = hx - baseX;
  const rise = hy - DESK_TOP;
  const base = useMemo(
    () => lathe([[0, 0], [0.078, 0], [0.08, 0.004], [0.079, 0.014], [0.072, 0.02], [0.012, 0.022], [0, 0.022]]),
    [],
  );
  return (
    <group position={[baseX, DESK_TOP, hz]}>
      <mesh geometry={base} castShadow receiveShadow>
        <Steel />
      </mesh>
      <mesh position={[0, rise / 2, 0]} castShadow>
        <cylinderGeometry args={[0.0065, 0.0075, rise, 16]} />
        <Steel />
      </mesh>
      {/* joint cap where the arm meets the upright */}
      <mesh position={[0, rise, 0]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.013, 0.013, 0.022, 24]} />
        <Steel />
      </mesh>
      <mesh position={[armLen / 2, rise, 0]} rotation-z={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.0055, 0.0055, armLen, 16]} />
        <Steel />
      </mesh>
      <group position={[armLen, rise - 0.004, 0]}>
        <RoundedBox args={[0.22, 0.016, 0.058]} radius={0.007} smoothness={4} castShadow>
          <Steel />
        </RoundedBox>
        <mesh position={[0, -0.0085, 0]} rotation-x={Math.PI / 2}>
          <planeGeometry args={[0.19, 0.04]} />
          <meshStandardMaterial color="#fff6e8" emissive="#ffe2b8" emissiveIntensity={1.6} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

// Low-profile keyboard: beveled aluminium case and individual rounded keycaps
// (one instanced mesh), plus a felt mouse pad and a glossy mouse.
function Keyboard() {
  const keys = useRef();
  const layout = useMemo(() => {
    const pitch = 0.019;
    const rows = [
      { y: -0.042, n: 17, offset: 0 },
      { y: -0.021, n: 16, offset: 0.004 },
      { y: 0, n: 15, offset: 0.008 },
      { y: 0.021, n: 14, offset: 0.012 },
    ];
    const out = [];
    rows.forEach(({ y, n, offset }) => {
      const width = n * pitch;
      for (let i = 0; i < n; i++) out.push({ x: -width / 2 + pitch / 2 + i * pitch + offset - 0.006, z: y, w: 0.016 });
    });
    out.push({ x: -0.01, z: 0.043, w: 0.11, space: true });
    return out;
  }, []);
  const keyGeo = useMemo(() => new RoundedBoxGeometry(1, 1, 1, 3, 0.25), []);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const color = new THREE.Color();
    layout.forEach((k, i) => {
      m.compose(
        new THREE.Vector3(k.x, 0.021, k.z),
        new THREE.Quaternion(),
        new THREE.Vector3(k.w, 0.007, 0.016),
      );
      keys.current.setMatrixAt(i, m);
      keys.current.setColorAt(i, color.set(i === 0 ? '#a78bfa' : k.space ? '#dcd9d3' : '#e9e7e2'));
    });
    keys.current.instanceMatrix.needsUpdate = true;
    keys.current.instanceColor.needsUpdate = true;
  }, [layout]);
  const mouse = useMemo(() => {
    const g = new THREE.SphereGeometry(0.05, 48, 32);
    g.scale(0.6, 0.34, 1);
    g.translate(0, 0.004, 0);
    return g;
  }, []);
  return (
    <group position={[0.36, DESK_TOP, 0.02]} rotation-y={-0.18}>
      <RoundedBox args={[0.36, 0.016, 0.125]} radius={0.006} smoothness={4} position={[0, 0.008, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#b9bbc0" metalness={0.8} roughness={0.32} />
      </RoundedBox>
      <instancedMesh ref={keys} args={[keyGeo, undefined, layout.length]} castShadow>
        <meshStandardMaterial roughness={0.55} />
      </instancedMesh>
      {/* felt pad + mouse */}
      <RoundedBox args={[0.21, 0.004, 0.19]} radius={0.002} smoothness={2} position={[0.3, 0.002, 0.02]} receiveShadow>
        <meshStandardMaterial color="#56545c" roughness={1} />
      </RoundedBox>
      <mesh geometry={mouse} position={[0.3, 0.004, 0.02]} castShadow>
        <meshPhysicalMaterial color="#f1f0ed" roughness={0.25} clearcoat={0.6} clearcoatRoughness={0.3} />
      </mesh>
    </group>
  );
}

// Turned ceramic pen cup with a few capped pens.
function PenCup({ position }) {
  const cup = useMemo(
    () => lathe([[0, 0.002], [0.03, 0.002], [0.034, 0.006], [0.035, 0.1], [0.032, 0.102], [0.029, 0.098], [0.029, 0.008], [0, 0.008]]),
    [],
  );
  const pens = [
    ['#1d1c21', 0.4],
    ['#e07a5f', 1.7],
    ['#2f3e46', 3.0],
    ['#84a59d', 4.3],
    ['#1d1c21', 5.5],
  ];
  return (
    <group position={position}>
      <mesh geometry={cup} castShadow receiveShadow>
        <meshStandardMaterial color="#efebe4" roughness={0.45} side={THREE.DoubleSide} />
      </mesh>
      {pens.map(([color, a], i) => (
        <group key={i} position={[Math.cos(a) * 0.012, 0.012, Math.sin(a) * 0.012]} rotation={[Math.sin(a) * 0.16, 0, -Math.cos(a) * 0.16]}>
          <mesh position={[0, 0.075, 0]} castShadow>
            <cylinderGeometry args={[0.0045, 0.0045, 0.15, 16]} />
            <meshStandardMaterial color={color} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.155, 0]}>
            <sphereGeometry args={[0.0046, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={color} roughness={0.35} />
          </mesh>
          <mesh position={[0.0047, 0.13, 0]}>
            <boxGeometry args={[0.0012, 0.03, 0.002]} />
            <meshStandardMaterial color="#c9c9cc" metalness={1} roughness={0.25} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// Two hardcover notebooks (cover boards around a cream page block) and a pen.
function Notebook({ position, rotationY, color }) {
  const W = 0.16;
  const D = 0.22;
  return (
    <group position={position} rotation-y={rotationY}>
      {[0.0012, 0.0128].map((y) => (
        <RoundedBox key={y} args={[W, 0.0024, D]} radius={0.001} smoothness={2} position={[0, y, 0]} castShadow receiveShadow>
          <meshStandardMaterial color={color} roughness={0.75} />
        </RoundedBox>
      ))}
      <mesh position={[0.002, 0.007, 0]}>
        <boxGeometry args={[W - 0.008, 0.0092, D - 0.006]} />
        <meshStandardMaterial color="#efe8da" roughness={0.95} />
      </mesh>
      <mesh position={[-W / 2 + 0.002, 0.007, 0]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.0068, 0.0068, D, 16, 1, false, Math.PI, Math.PI]} />
        <meshStandardMaterial color={color} roughness={0.75} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Notebooks({ position }) {
  return (
    <group position={position}>
      <Notebook position={[0, 0, 0]} rotationY={0.12} color="#2f3e46" />
      <Notebook position={[0.008, 0.014, 0.004]} rotationY={0.02} color="#84a59d" />
      <group position={[0.02, 0.0305, 0]} rotation={[0, 0.6, 0]}>
        <mesh rotation-z={Math.PI / 2} castShadow>
          <cylinderGeometry args={[0.0042, 0.0042, 0.14, 16]} />
          <meshStandardMaterial color={BLACK} roughness={0.3} />
        </mesh>
      </group>
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
      {/* CC0 models from the Khronos glTF sample library */}
      <Model url="/models/DiffuseTransmissionTeacup.glb" snap position={[-0.63, DESK_TOP, 0.07]} rotation-y={0.6} />
      <Model url="/models/WaterBottle.glb" snap position={[0.66, DESK_TOP, -0.38]} rotation-y={-0.9} scale={0.85} />
      <PenCup position={[0.72, DESK_TOP, -0.16]} />
      <Notebooks position={[-0.2, DESK_TOP, -0.36]} />
      <StickyNotes />
    </group>
  );
}
