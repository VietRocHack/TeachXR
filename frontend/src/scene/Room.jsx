// The dorm room around the desk: a modern, Scandinavian-leaning student room
// at night. Clean matte walls, an oak slat feature wall behind the desk, light
// parquet, a black-framed window with sheer curtains, an upholstered platform
// bed, a white cube bookcase, a mid-century lounge chair and warm, motivated
// lighting. Units are meters; the desk sits against the front wall (z = -0.5),
// facing +z toward the viewer.

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import Model, { ceramicPot } from './Model';
import { useSurface } from './pbr';
import { artTexture, cityTexture, posterTexture } from './textures';

export const ROOM = { minX: -1.7, maxX: 1.7, minZ: -0.5, maxZ: 3.2, height: 2.6 };
export const WIN = { x: -0.3, y: 1.62, w: 1.0, h: 0.8 };
const SLATS = { x0: 0.32, x1: 1.6 };

const WALL = '#ebe6df';
const WHITE = '#f4f2ee';
const BLACK = '#1d1c21';
const OAK = '#e2c7a4';

function Wall({ position, rotation = [0, 0, 0], width, height }) {
  return (
    <mesh position={position} rotation={rotation} receiveShadow>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial color={WALL} roughness={0.92} />
    </mesh>
  );
}

function Shell() {
  const { minX, maxX, minZ, maxZ, height } = ROOM;
  const w = maxX - minX;
  const d = maxZ - minZ;
  const cz = (minZ + maxZ) / 2;
  const floor = useSurface('herringbone_parquet', { repeat: [w / 1.2, d / 1.2] });
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, cz]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial {...floor} color="#f0dfca" />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position={[0, height, cz]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#f5f3ef" roughness={1} />
      </mesh>
      <FrontWall />
      <Wall position={[0, height / 2, maxZ]} rotation={[0, Math.PI, 0]} width={w} height={height} />
      <Wall position={[minX, height / 2, cz]} rotation={[0, Math.PI / 2, 0]} width={d} height={height} />
      <Wall position={[maxX, height / 2, cz]} rotation={[0, -Math.PI / 2, 0]} width={d} height={height} />
      {/* slim modern skirting */}
      {[
        [[0, minZ + 0.006], w, 0],
        [[0, maxZ - 0.006], w, 0],
        [[minX + 0.006, cz], d, Math.PI / 2],
        [[maxX - 0.006, cz], d, Math.PI / 2],
      ].map(([[x, z], len, ry], i) => (
        <mesh key={i} position={[x, 0.04, z]} rotation-y={ry} receiveShadow>
          <boxGeometry args={[len, 0.08, 0.012]} />
          <meshStandardMaterial color={WHITE} roughness={0.6} />
        </mesh>
      ))}
      <Door />
    </group>
  );
}

function Door() {
  return (
    <group position={[-0.55, 0, ROOM.maxZ - 0.01]} rotation-y={Math.PI}>
      <mesh position={[0, 1.03, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.84, 2.06, 0.04]} />
        <meshStandardMaterial color={WHITE} roughness={0.5} />
      </mesh>
      {/* black lever handle */}
      <mesh position={[0.32, 1.0, 0.035]}>
        <boxGeometry args={[0.12, 0.014, 0.014]} />
        <meshStandardMaterial color={BLACK} metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, 1.04, -0.012]}>
        <boxGeometry args={[0.9, 2.1, 0.02]} />
        <meshStandardMaterial color="#e9e6e1" roughness={0.6} />
      </mesh>
    </group>
  );
}

function FrontWall() {
  const city = useMemo(() => cityTexture(), []);
  const { minX, maxX, minZ, height } = ROOM;
  const left = WIN.x - WIN.w / 2;
  const right = WIN.x + WIN.w / 2;
  const bottom = WIN.y - WIN.h / 2;
  const top = WIN.y + WIN.h / 2;
  const panels = [
    [minX, left, 0, height],
    [right, maxX, 0, height],
    [left, right, 0, bottom],
    [left, right, top, height],
  ];
  return (
    <group>
      {panels.map(([x0, x1, y0, y1], i) => (
        <Wall key={i} position={[(x0 + x1) / 2, (y0 + y1) / 2, minZ]} width={x1 - x0} height={y1 - y0} />
      ))}
      {/* window reveal */}
      {[
        [WIN.x, top, WIN.w, 0.02],
        [WIN.x, bottom, WIN.w, 0.02],
        [left, WIN.y, 0.02, WIN.h],
        [right, WIN.y, 0.02, WIN.h],
      ].map(([x, y, w, h], i) => (
        <mesh key={i} position={[x, y, minZ - 0.06]}>
          <boxGeometry args={[w, h, 0.12]} />
          <meshStandardMaterial color={WALL} roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[WIN.x, WIN.y, minZ - 0.8]}>
        <planeGeometry args={[WIN.w * 2.6, WIN.h * 2.6]} />
        <meshBasicMaterial map={city} toneMapped={false} />
      </mesh>
      <mesh position={[WIN.x, WIN.y, minZ - 0.07]}>
        <planeGeometry args={[WIN.w, WIN.h]} />
        <meshPhysicalMaterial color="#9fb0ff" transparent opacity={0.07} roughness={0.05} clearcoat={1} />
      </mesh>
      {/* slim black aluminium frame */}
      {[
        [WIN.x, top - 0.012, WIN.w, 0.024],
        [WIN.x, bottom + 0.012, WIN.w, 0.024],
        [left + 0.012, WIN.y, 0.024, WIN.h],
        [right - 0.012, WIN.y, 0.024, WIN.h],
        [WIN.x + 0.12, WIN.y, 0.02, WIN.h],
      ].map(([x, y, w, h], i) => (
        <mesh key={i} position={[x, y, minZ - 0.07]} castShadow>
          <boxGeometry args={[w, h, 0.03]} />
          <meshStandardMaterial color={BLACK} metalness={0.4} roughness={0.45} />
        </mesh>
      ))}
      <mesh position={[WIN.x, bottom - 0.01, minZ + 0.035]} castShadow receiveShadow>
        <boxGeometry args={[WIN.w + 0.06, 0.02, 0.07]} />
        <meshStandardMaterial color={WHITE} roughness={0.5} />
      </mesh>
      <Curtains />
      <FairyLights
        from={[WIN.x - WIN.w / 2 - 0.3, 2.12, ROOM.minZ + 0.1]}
        to={[WIN.x + WIN.w / 2 + 0.06, 2.12, ROOM.minZ + 0.1]}
        count={20}
        swags={3}
      />
      <SlatWall />
    </group>
  );
}

// Oak acoustic slats on dark felt behind the desk: the room's feature wall.
function SlatWall() {
  const oak = useSurface('oak_veneer_01', { repeat: [0.05, 2] });
  const slats = useMemo(() => {
    const out = [];
    for (let x = SLATS.x0 + 0.014; x < SLATS.x1; x += 0.046) out.push(x);
    return out;
  }, []);
  const h = ROOM.height - 0.12;
  return (
    <group>
      <mesh position={[(SLATS.x0 + SLATS.x1) / 2, h / 2 + 0.06, ROOM.minZ + 0.003]}>
        <planeGeometry args={[SLATS.x1 - SLATS.x0, h]} />
        <meshStandardMaterial color="#26252b" roughness={1} />
      </mesh>
      {slats.map((x) => (
        <mesh key={x} position={[x, h / 2 + 0.06, ROOM.minZ + 0.016]} castShadow receiveShadow>
          <boxGeometry args={[0.028, h, 0.022]} />
          <meshStandardMaterial {...oak} color={OAK} />
        </mesh>
      ))}
      <FloatingShelf y={1.44} x={0.93} />
      <FloatingShelf y={1.8} x={1.02} items="upper" />
    </group>
  );
}

// Solid-color books; a row of them fills a shelf from its left end.
const BOOK_COLORS = ['#2f3e46', '#c96f53', '#e9c46a', '#6d597a', '#84a59d', '#f4f1de', '#264653', '#b5838d', '#3d405b', '#e07a5f'];

function BookRow({ position, rotationY = 0, width, count, seed = 1, lean = false }) {
  const books = useMemo(() => {
    let s = seed;
    const rand = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    const out = [];
    let x = 0;
    for (let i = 0; i < count; i++) {
      const t = 0.022 + rand() * 0.022;
      if (x + t > width) break;
      const h = 0.17 + rand() * 0.1;
      const d = 0.13 + rand() * 0.05;
      out.push({ x: x + t / 2, t, h, d, color: BOOK_COLORS[Math.floor(rand() * BOOK_COLORS.length)] });
      x += t + 0.002;
    }
    return out;
  }, [width, count, seed]);
  return (
    <group position={position} rotation-y={rotationY}>
      {books.map((b, i) => {
        // The last book leans on its neighbour, pivoting on its bottom corner.
        const leaning = lean && i === books.length - 1;
        return (
          <mesh
            key={i}
            position={[leaning ? b.x + Math.sin(0.25) * b.h * 0.5 : b.x, leaning ? Math.cos(0.25) * b.h * 0.5 : b.h / 2, 0]}
            rotation-z={leaning ? -0.25 : 0}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[b.t, b.h, b.d]} />
            <meshStandardMaterial color={b.color} roughness={0.7} />
          </mesh>
        );
      })}
    </group>
  );
}

function FloatingShelf({ x, y, items }) {
  const oak = useSurface('oak_veneer_01', { repeat: [1, 0.3] });
  const z = ROOM.minZ + 0.14;
  return (
    <group position={[x, y, z]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.68, 0.028, 0.22]} />
        <meshStandardMaterial {...oak} color={OAK} />
      </mesh>
      {/* warm LED strip under the shelf */}
      <mesh position={[0, -0.016, 0.07]}>
        <boxGeometry args={[0.62, 0.004, 0.01]} />
        <meshStandardMaterial color="#fff1d6" emissive="#ffc27a" emissiveIntensity={3} toneMapped={false} />
      </mesh>
      {items === 'upper' ? (
        <>
          <BookRow position={[-0.3, 0.014, 0]} width={0.3} count={12} seed={7} lean />
          <Model url="/models/ceramic_vase_01.glb" snap position={[0.18, 0.014, 0]} scale={0.42} />
        </>
      ) : (
        <>
          <BookRow position={[0.02, 0.014, 0]} width={0.28} count={11} seed={3} />
          <Model url="/models/potted_plant_04.glb" snap position={[-0.18, 0.014, 0]} scale={0.95} />
        </>
      )}
    </group>
  );
}

// Sheer linen curtains, gathered at the sides of the window.
function Curtain({ x, width, height, phase }) {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(width, height, 64, 12);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i);
      const py = pos.getY(i);
      pos.setZ(i, Math.sin((px / width) * Math.PI * 8 + phase) * (0.018 + (0.5 - py / height) * 0.01));
    }
    g.computeVertexNormals();
    return g;
  }, [width, height, phase]);
  return (
    <mesh geometry={geometry} position={[x, 2.14 - height / 2, ROOM.minZ + 0.06]}>
      <meshStandardMaterial color="#f8f5ef" roughness={1} transparent opacity={0.82} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Curtains() {
  const rodLeft = WIN.x - WIN.w / 2 - 0.32;
  const rodRight = WIN.x + WIN.w / 2 + 0.08;
  return (
    <group>
      <mesh position={[(rodLeft + rodRight) / 2, 2.16, ROOM.minZ + 0.06]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.008, 0.008, rodRight - rodLeft, 12]} />
        <meshStandardMaterial color={BLACK} metalness={0.6} roughness={0.35} />
      </mesh>
      <Curtain x={rodLeft + 0.19} width={0.36} height={1.08} phase={0.3} />
      <Curtain x={rodRight - 0.13} width={0.24} height={1.08} phase={1.9} />
    </group>
  );
}

// A string of warm bulbs sagging between `from` and `to`, with optional point
// lights so they actually light what's under them.
function FairyLights({ from, to, count = 22, sag = 0.08, swags = 3, lights = [] }) {
  const bulbs = useMemo(() => {
    const out = [];
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      out.push([
        from[0] + t * (to[0] - from[0]),
        from[1] + t * (to[1] - from[1]) - Math.sin(t * Math.PI * swags) ** 2 * sag,
        from[2] + t * (to[2] - from[2]),
      ]);
    }
    return out;
  }, [from, to, count, sag, swags]);
  const group = useRef();
  useFrame(({ clock }) => {
    group.current?.children.forEach((m, i) => {
      if (m.isMesh) m.material.emissiveIntensity = 2.5 + Math.sin(clock.elapsedTime * 1.3 + i * 1.7) * 1;
    });
  });
  return (
    <group ref={group}>
      {bulbs.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.008, 10, 10]} />
          <meshStandardMaterial color="#fff1c9" emissive="#ffb35c" emissiveIntensity={2.5} toneMapped={false} />
        </mesh>
      ))}
      {lights.map((p, i) => (
        <pointLight key={`l${i}`} position={p} color="#ffb35c" intensity={0.5} distance={2.4} decay={2} />
      ))}
    </group>
  );
}

// Low oak platform bed with a channel-tufted upholstered headboard, against
// the back wall in the right-hand corner.
function Bed() {
  const oak = useSurface('oak_veneer_01', { repeat: [2, 0.3] });
  const knit = useSurface('knitted_fleece', { repeat: [3, 4], normalScale: 0.7 });
  // The fleece scan's color map is dark grey; keep only its knit normal/roughness.
  const fabric = { normalMap: knit.normalMap, normalScale: knit.normalScale, roughnessMap: knit.roughnessMap, roughness: 1 };
  const W = 1.04;
  const L = 2.04;
  const x = ROOM.maxX - W / 2 - 0.02;
  const zHead = ROOM.maxZ - 0.06;
  const zc = zHead - L / 2;
  return (
    <group position={[x, 0, 0]}>
      {/* recessed black plinth + oak platform */}
      <mesh position={[0, 0.04, zc]} castShadow receiveShadow>
        <boxGeometry args={[W - 0.12, 0.08, L - 0.12]} />
        <meshStandardMaterial color={BLACK} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.17, zc]} castShadow receiveShadow>
        <boxGeometry args={[W, 0.18, L]} />
        <meshStandardMaterial {...oak} color={OAK} />
      </mesh>
      {/* mattress, duvet with folded top, throw, pillows */}
      <RoundedBox args={[W - 0.06, 0.2, L - 0.08]} radius={0.04} smoothness={4} position={[0, 0.36, zc]} castShadow receiveShadow>
        <meshStandardMaterial color="#f7f6f3" roughness={0.95} />
      </RoundedBox>
      <RoundedBox args={[W + 0.02, 0.07, L - 0.5]} radius={0.03} smoothness={4} position={[0, 0.48, zc - 0.24]} castShadow receiveShadow>
        <meshStandardMaterial {...fabric} color="#e6e2dc" />
      </RoundedBox>
      <RoundedBox args={[W + 0.02, 0.09, 0.3]} radius={0.04} smoothness={4} position={[0, 0.5, zc + 0.52]} castShadow receiveShadow>
        <meshStandardMaterial {...fabric} color="#efebe5" />
      </RoundedBox>
      <RoundedBox args={[W + 0.06, 0.035, 0.5]} radius={0.015} smoothness={3} position={[0, 0.53, zc - 0.62]} castShadow receiveShadow>
        <meshStandardMaterial {...fabric} color="#9d8fe0" />
      </RoundedBox>
      {/* pillows lean on the headboard, resting on the mattress */}
      {[-0.24, 0.24].map((px) => (
        <RoundedBox
          key={px}
          args={[0.46, 0.13, 0.3]}
          radius={0.06}
          smoothness={5}
          position={[px, 0.55, zHead - 0.17]}
          rotation-x={-0.55}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color="#fbfaf8" roughness={0.9} />
        </RoundedBox>
      ))}
      <RoundedBox args={[0.34, 0.11, 0.34]} radius={0.05} smoothness={5} position={[0.1, 0.56, zHead - 0.44]} rotation={[-0.35, 0.3, 0]} castShadow>
        <meshStandardMaterial {...fabric} color="#8fa38f" />
      </RoundedBox>
      {/* channel-tufted headboard */}
      {[-0.39, -0.13, 0.13, 0.39].map((px) => (
        <RoundedBox key={px} args={[0.25, 0.72, 0.08]} radius={0.035} smoothness={4} position={[px, 0.72, zHead + 0.01]} castShadow receiveShadow>
          <meshStandardMaterial {...fabric} color="#d6cfc4" />
        </RoundedBox>
      ))}
    </group>
  );
}

function Nightstand({ position }) {
  const oak = useSurface('oak_veneer_01', { repeat: [0.6, 0.4] });
  return (
    <group position={position}>
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.42, 0.44, 0.36]} />
        <meshStandardMaterial color={WHITE} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.485, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.44, 0.03, 0.38]} />
        <meshStandardMaterial {...oak} color={OAK} />
      </mesh>
      <mesh position={[0, 0.3, -0.182]}>
        <boxGeometry args={[0.16, 0.012, 0.01]} />
        <meshStandardMaterial color={BLACK} metalness={0.6} roughness={0.35} />
      </mesh>
      {[-0.17, 0.17].map((x) => (
        <mesh key={x} position={[x, 0.015, 0]}>
          <boxGeometry args={[0.02, 0.03, 0.3]} />
          <meshStandardMaterial color={BLACK} />
        </mesh>
      ))}
      {/* opal glass globe lamp */}
      <group position={[0.08, 0.5, 0.04]}>
        <mesh position={[0, 0.012, 0]}>
          <cylinderGeometry args={[0.055, 0.06, 0.024, 32]} />
          <meshStandardMaterial color="#c9a86a" metalness={1} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.12, 0]}>
          <sphereGeometry args={[0.1, 32, 24]} />
          <meshStandardMaterial color="#fff6e8" emissive="#ffc27a" emissiveIntensity={1.4} roughness={0.3} toneMapped={false} />
        </mesh>
        <pointLight position={[0, 0.12, 0]} color="#ffb866" intensity={0.8} distance={3} decay={2} />
      </group>
      <BookRow position={[-0.18, 0.5, 0.02]} rotationY={Math.PI / 2} width={0.12} count={4} seed={11} />
    </group>
  );
}

// White 3x3 cube bookcase with books and fabric bins.
function CubeBookcase({ position, rotationY }) {
  const cell = 0.34;
  const board = 0.018;
  const size = cell * 3 + board * 4;
  const depth = 0.39;
  const cells = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) cells.push([r, c]);
  const binColors = ['#cfc6b8', '#8fa38f', '#2f3e46'];
  return (
    <group position={position} rotation-y={rotationY}>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={`h${i}`} position={[0, board / 2 + i * (cell + board), 0]} castShadow receiveShadow>
          <boxGeometry args={[size, board, depth]} />
          <meshStandardMaterial color={WHITE} roughness={0.45} />
        </mesh>
      ))}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={`v${i}`} position={[-size / 2 + board / 2 + i * (cell + board), size / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[board, size, depth]} />
          <meshStandardMaterial color={WHITE} roughness={0.45} />
        </mesh>
      ))}
      <mesh position={[0, size / 2, -depth / 2 + 0.003]}>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial color="#e9e6e1" roughness={0.6} />
      </mesh>
      {cells.map(([r, c], i) => {
        const x0 = -size / 2 + board + c * (cell + board);
        const y0 = board + r * (cell + board);
        if ((r + c) % 4 === 1) {
          return (
            <RoundedBox
              key={i}
              args={[cell - 0.02, cell - 0.04, depth - 0.04]}
              radius={0.015}
              position={[x0 + cell / 2, y0 + (cell - 0.04) / 2, 0.01]}
              castShadow
            >
              <meshStandardMaterial color={binColors[i % 3]} roughness={0.95} />
            </RoundedBox>
          );
        }
        return (
          <BookRow
            key={i}
            position={[x0 + 0.02, y0, 0.03]}
            width={cell - (i % 2 ? 0.12 : 0.04)}
            count={14}
            seed={i * 13 + 5}
            lean={i % 2 === 1}
          />
        );
      })}
      <Model url="/models/potted_plant_02.glb" snap position={[size / 2 - 0.2, size, 0]} scale={0.34} overrides={ceramicPot('potted_plant_02_pot')} />
      <Model url="/models/ceramic_vase_01.glb" snap position={[-size / 2 + 0.16, size, 0]} scale={0.5} />
    </group>
  );
}

function FramedPrint({ position, rotationY, w, h, art }) {
  return (
    <group position={position} rotation-y={rotationY}>
      <mesh position={[0, 0, 0.012]} castShadow>
        <boxGeometry args={[w + 0.04, h + 0.04, 0.024]} />
        <meshStandardMaterial color={BLACK} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0, 0.0245]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color="#f7f5f0" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0, 0.025]}>
        <planeGeometry args={[w * 0.72, h * 0.72]} />
        <meshStandardMaterial map={art} roughness={0.6} />
      </mesh>
    </group>
  );
}

// Minimal wall clock that shows the viewer's real time.
function WallClock({ position }) {
  const hour = useRef();
  const minute = useRef();
  useFrame(() => {
    const now = new Date();
    if (minute.current) minute.current.rotation.z = -(now.getMinutes() / 60) * Math.PI * 2;
    if (hour.current) hour.current.rotation.z = -(((now.getHours() % 12) + now.getMinutes() / 60) / 12) * Math.PI * 2;
  });
  return (
    <group position={position}>
      <mesh position={[0, 0, 0.012]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.15, 0.15, 0.024, 48]} />
        <meshStandardMaterial color={WHITE} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0, 0.012]}>
        <torusGeometry args={[0.15, 0.008, 12, 64]} />
        <meshStandardMaterial color={BLACK} roughness={0.4} />
      </mesh>
      {/* each hand pivots at the center: the mesh is offset inside its group */}
      <group ref={hour} position={[0, 0, 0.026]}>
        <mesh position={[0, 0.035, 0]}>
          <boxGeometry args={[0.008, 0.08, 0.003]} />
          <meshStandardMaterial color={BLACK} />
        </mesh>
      </group>
      <group ref={minute} position={[0, 0, 0.028]}>
        <mesh position={[0, 0.055, 0]}>
          <boxGeometry args={[0.005, 0.12, 0.003]} />
          <meshStandardMaterial color={BLACK} />
        </mesh>
      </group>
    </group>
  );
}

function WallArt() {
  const moon = useMemo(() => artTexture('moon'), []);
  const abstract = useMemo(() => artTexture('abstract'), []);
  const poster = useMemo(() => posterTexture(), []);
  const { minX, maxX } = ROOM;
  return (
    <group>
      <FramedPrint position={[maxX, 1.5, 2.05]} rotationY={-Math.PI / 2} w={0.42} h={0.56} art={moon} />
      <FramedPrint position={[maxX, 1.5, 2.62]} rotationY={-Math.PI / 2} w={0.42} h={0.56} art={abstract} />
      <FramedPrint position={[minX, 1.72, 0.95]} rotationY={Math.PI / 2} w={0.46} h={0.64} art={poster} />
      <WallClock position={[minX + 0.4, 1.78, ROOM.minZ]} />
    </group>
  );
}

function FloorLamp({ position }) {
  return (
    <group position={position}>
      {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((a) => (
        <mesh
          key={a}
          position={[Math.sin(a) * 0.1, 0.33, Math.cos(a) * 0.1]}
          rotation={[Math.cos(a) * 0.15, 0, -Math.sin(a) * 0.15]}
          castShadow
        >
          <cylinderGeometry args={[0.008, 0.01, 0.68, 8]} />
          <meshStandardMaterial color={OAK} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 1.0, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.7, 8]} />
        <meshStandardMaterial color={BLACK} metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.4, 0]}>
        <cylinderGeometry args={[0.19, 0.19, 0.24, 40, 1, true]} />
        <meshStandardMaterial color="#f3ede3" emissive="#ffc27a" emissiveIntensity={1.1} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 1.35, 0]} color="#ffb866" intensity={1.2} distance={4} decay={2} />
    </group>
  );
}

function Rug() {
  const wool = useSurface('poly_wool_herringbone', { repeat: [3, 3] });
  return (
    <mesh position={[-0.75, 0.005, 2.1]} rotation-x={-Math.PI / 2} receiveShadow>
      <circleGeometry args={[0.85, 64]} />
      <meshStandardMaterial normalMap={wool.normalMap} roughnessMap={wool.roughnessMap} color="#d9d3ca" roughness={1} />
    </mesh>
  );
}

export default function Room() {
  const { minX, maxX, maxZ, height } = ROOM;
  return (
    <group>
      <Shell />
      <Bed />
      <Nightstand position={[maxX - 1.3, 0, maxZ - 0.24]} />
      <FairyLights
        from={[maxX - 1.08, 1.95, maxZ - 0.02]}
        to={[maxX - 0.04, 1.95, maxZ - 0.02]}
        count={18}
        sag={0.14}
        swags={3}
        lights={[[maxX - 0.55, 1.75, maxZ - 0.35]]}
      />
      <WallArt />
      <CubeBookcase position={[minX + 0.2, 0, 0.95]} rotationY={Math.PI / 2} />
      <Model url="/models/potted_plant_01.glb" snap position={[minX + 0.32, 0, -0.2]} overrides={ceramicPot('potted_plant_01_pot')} />
      <Model url="/models/mid_century_lounge_chair.glb" snap position={[-0.95, 0, 2.3]} rotation-y={Math.PI * 0.8} scale={0.92} />
      <FloorLamp position={[-1.45, 0, 2.85]} />
      <Rug />
      <Model url="/models/modern_ceiling_lamp_01.glb" position={[0, height - 1.173, 1.3]} />
    </group>
  );
}
