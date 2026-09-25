// The dorm room around the desk, at night. Units are meters; the desk sits
// against the front wall (z = -0.5), facing +z toward the viewer. Surfaces are
// PBR texture sets (pbr.js) and most furniture is CC0 Poly Haven models
// (Model.jsx); the rest is modeled here.

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import Model from './Model';
import { useSurface } from './pbr';
import { artTexture, cityTexture, pennantTexture, posterTexture } from './textures';

export const ROOM = { minX: -1.7, maxX: 1.7, minZ: -0.5, maxZ: 3.2, height: 2.6 };
export const WIN = { x: -0.3, y: 1.62, w: 1.0, h: 0.8 };

const WALL_TINT = '#f1eaf7';
const TRIM = '#f4f1f7';

function useWallSurface(width, height) {
  return useSurface('painted_plaster_wall', { repeat: [width / 1.6, height / 1.6], normalScale: 0.6 });
}

function WallPanel({ position, rotation = [0, 0, 0], width, height }) {
  const surface = useWallSurface(width, height);
  return (
    <mesh position={position} rotation={rotation} receiveShadow>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial {...surface} color={WALL_TINT} roughness={1} />
    </mesh>
  );
}

function Shell() {
  const { minX, maxX, minZ, maxZ, height } = ROOM;
  const w = maxX - minX;
  const d = maxZ - minZ;
  const cz = (minZ + maxZ) / 2;
  const floor = useSurface('herringbone_parquet', { repeat: [w / 1.2, d / 1.2] });
  const ceiling = useWallSurface(w, d);
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, cz]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial {...floor} color="#d9c2a8" />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position={[0, height, cz]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial {...ceiling} color="#f2eef6" roughness={1} />
      </mesh>
      <FrontWall />
      <WallPanel position={[0, height / 2, maxZ]} rotation={[0, Math.PI, 0]} width={w} height={height} />
      <WallPanel position={[minX, height / 2, cz]} rotation={[0, Math.PI / 2, 0]} width={d} height={height} />
      <WallPanel position={[maxX, height / 2, cz]} rotation={[0, -Math.PI / 2, 0]} width={d} height={height} />
      {/* baseboards + crown molding */}
      {[
        [[0, minZ + 0.008], w, 0],
        [[0, maxZ - 0.008], w, 0],
        [[minX + 0.008, cz], d, Math.PI / 2],
        [[maxX - 0.008, cz], d, Math.PI / 2],
      ].map(([[x, z], len, ry], i) => (
        <group key={i} position={[x, 0, z]} rotation-y={ry}>
          <mesh position={[0, 0.05, 0]} receiveShadow>
            <boxGeometry args={[len, 0.1, 0.016]} />
            <meshStandardMaterial color={TRIM} roughness={0.5} />
          </mesh>
          <mesh position={[0, height - 0.03, 0]}>
            <boxGeometry args={[len, 0.06, 0.03]} />
            <meshStandardMaterial color={TRIM} roughness={0.5} />
          </mesh>
        </group>
      ))}
      <Door />
    </group>
  );
}

function Door() {
  const wood = useSurface('oak_veneer_01', { repeat: [1, 2] });
  return (
    <group position={[0.95, 0, ROOM.maxZ - 0.012]} rotation-y={Math.PI}>
      <mesh position={[0, 1.02, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.86, 2.04, 0.035]} />
        <meshStandardMaterial {...wood} color="#c9b39c" />
      </mesh>
      {[0.55, 1.5].map((y) => (
        <mesh key={y} position={[0, y, 0.019]}>
          <boxGeometry args={[0.66, 0.62, 0.004]} />
          <meshStandardMaterial {...wood} color="#bfa78e" />
        </mesh>
      ))}
      <mesh position={[0.34, 1.0, 0.04]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.012, 0.012, 0.12, 16]} />
        <meshStandardMaterial color="#c8c8cc" metalness={1} roughness={0.25} />
      </mesh>
      <mesh position={[0, 1.02, -0.005]}>
        <boxGeometry args={[0.96, 2.12, 0.02]} />
        <meshStandardMaterial color={TRIM} />
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
        <WallPanel key={i} position={[(x0 + x1) / 2, (y0 + y1) / 2, minZ]} width={x1 - x0} height={y1 - y0} />
      ))}
      {/* window reveal (wall thickness) */}
      {[
        [WIN.x, top, WIN.w, 0.02, 0.12, 'h'],
        [WIN.x, bottom, WIN.w, 0.02, 0.12, 'h'],
        [left, WIN.y, 0.02, WIN.h, 0.12, 'v'],
        [right, WIN.y, 0.02, WIN.h, 0.12, 'v'],
      ].map(([x, y, w, h, dd], i) => (
        <mesh key={i} position={[x, y, minZ - dd / 2]}>
          <boxGeometry args={[w, h, dd]} />
          <meshStandardMaterial color={WALL_TINT} roughness={0.9} />
        </mesh>
      ))}
      {/* the view outside, set back for parallax */}
      <mesh position={[WIN.x, WIN.y, minZ - 0.8]}>
        <planeGeometry args={[WIN.w * 2.6, WIN.h * 2.6]} />
        <meshBasicMaterial map={city} toneMapped={false} />
      </mesh>
      {/* glass: a faint reflective pane */}
      <mesh position={[WIN.x, WIN.y, minZ - 0.06]}>
        <planeGeometry args={[WIN.w, WIN.h]} />
        <meshPhysicalMaterial color="#9fb0ff" transparent opacity={0.08} roughness={0.05} metalness={0} clearcoat={1} />
      </mesh>
      {/* frame + mullions */}
      {[
        [WIN.x, top - 0.02, WIN.w, 0.04],
        [WIN.x, bottom + 0.02, WIN.w, 0.04],
        [left + 0.02, WIN.y, 0.04, WIN.h],
        [right - 0.02, WIN.y, 0.04, WIN.h],
        [WIN.x, WIN.y, 0.03, WIN.h],
      ].map(([x, y, w, h], i) => (
        <mesh key={i} position={[x, y, minZ - 0.05]} castShadow>
          <boxGeometry args={[w, h, 0.04]} />
          <meshStandardMaterial color={TRIM} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[WIN.x, bottom - 0.015, minZ + 0.04]} castShadow receiveShadow>
        <boxGeometry args={[WIN.w + 0.12, 0.03, 0.1]} />
        <meshStandardMaterial color={TRIM} roughness={0.4} />
      </mesh>
      <Curtains />
      <FairyLights
        from={[WIN.x - WIN.w / 2 - 0.25, 2.1, ROOM.minZ + 0.1]}
        to={[WIN.x + WIN.w / 2 + 0.25, 2.1, ROOM.minZ + 0.1]}
      />
    </group>
  );
}

// Café curtains on a rod: planes with fold displacement.
function Curtain({ x, width, height, phase }) {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(width, height, 64, 12);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i);
      const py = pos.getY(i);
      // Deeper folds toward the bottom, gathered at the rod.
      const fold = Math.sin((px / width) * Math.PI * 9 + phase) * (0.022 + (0.5 - py / height) * 0.012);
      pos.setZ(i, fold);
    }
    g.computeVertexNormals();
    return g;
  }, [width, height, phase]);
  const fabric = useSurface('knitted_fleece', { repeat: [width * 3, height * 3], normalScale: 0.35 });
  return (
    <mesh geometry={geometry} position={[x, 2.12 - height / 2, ROOM.minZ + 0.07]} castShadow receiveShadow>
      <meshStandardMaterial {...fabric} color="#efe6f7" roughness={1} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Curtains() {
  const rodLeft = WIN.x - WIN.w / 2 - 0.28;
  const rodRight = WIN.x + WIN.w / 2 + 0.28;
  return (
    <group>
      <mesh position={[(rodLeft + rodRight) / 2, 2.14, ROOM.minZ + 0.07]} rotation-z={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.012, 0.012, rodRight - rodLeft, 16]} />
        <meshStandardMaterial color="#2c2833" metalness={0.8} roughness={0.35} />
      </mesh>
      <Curtain x={rodLeft + 0.2} width={0.42} height={1.02} phase={0.3} />
      <Curtain x={rodRight - 0.2} width={0.42} height={1.02} phase={1.9} />
    </group>
  );
}

// A string of warm bulbs sagging between `from` and `to`, with a couple of
// point lights so they actually light what's under them.
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
      if (m.isMesh) m.material.emissiveIntensity = 3 + Math.sin(clock.elapsedTime * 1.3 + i * 1.7) * 1.2;
    });
  });
  return (
    <group ref={group}>
      {bulbs.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.009, 10, 10]} />
          <meshStandardMaterial color="#fff1c9" emissive="#ffb35c" emissiveIntensity={3} toneMapped={false} />
        </mesh>
      ))}
      {lights.map((p, i) => (
        <pointLight key={`l${i}`} position={p} color="#ffb35c" intensity={0.55} distance={2.4} decay={2} />
      ))}
    </group>
  );
}

function Bed() {
  const duvet = useSurface('knitted_fleece', { repeat: [2.5, 4], normalScale: 0.8 });
  // The fleece scan's color map is dark grey; keep only its knit normal/roughness.
  // The fleece scan's color map is dark grey; keep only its knit normal/roughness.
  const fabric = { normalMap: duvet.normalMap, normalScale: duvet.normalScale, roughnessMap: duvet.roughnessMap };
  const x = ROOM.maxX - 0.48;
  const z = 1.45;
  return (
    <group position={[x, 0, z]}>
      <Model url="/models/old_bed_frame.glb" rotation-y={Math.PI} />
      {/* mattress, duvet folded back at the head, plushie */}
      <RoundedBox args={[0.86, 0.2, 1.92]} radius={0.05} smoothness={4} position={[0, 0.5, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#f5f3f8" roughness={0.95} />
      </RoundedBox>
      <RoundedBox args={[0.94, 0.07, 1.45]} radius={0.03} smoothness={4} position={[0, 0.63, 0.23]} castShadow receiveShadow>
        <meshStandardMaterial {...fabric} color="#b3a6f5" roughness={1} />
      </RoundedBox>
      <RoundedBox args={[0.94, 0.09, 0.28]} radius={0.04} smoothness={4} position={[0, 0.66, -0.4]} castShadow receiveShadow>
        <meshStandardMaterial {...fabric} color="#c3b8f7" roughness={1} />
      </RoundedBox>
      <Model url="/models/throw_pillows_01.glb" position={[0, 0.6, -0.78]} rotation-y={Math.PI / 2} scale={0.85} />
    </group>
  );
}

function BedsideLamp({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.06, 0.04, 24]} />
        <meshStandardMaterial color="#2a2733" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.14, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.22, 12]} />
        <meshStandardMaterial color="#c9a86a" metalness={1} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.27, 0]}>
        <cylinderGeometry args={[0.07, 0.1, 0.13, 32, 1, true]} />
        <meshStandardMaterial color="#fff0d6" emissive="#ffb866" emissiveIntensity={1.6} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 0.24, 0]} color="#ffb866" intensity={0.9} distance={3} decay={2} />
    </group>
  );
}

function WallShelf() {
  // Floating oak shelf above the desk, right of the window.
  const oak = useSurface('oak_veneer_01', { repeat: [1, 0.3] });
  return (
    <group position={[0.66, 1.46, ROOM.minZ + 0.1]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.7, 0.03, 0.2]} />
        <meshStandardMaterial {...oak} color="#d8b894" />
      </mesh>
      <Model url="/models/book_encyclopedia_set_01.glb" position={[-0.32, 0.015, -0.03]} scale={0.62} />
      <Model url="/models/standing_picture_frame_01.glb" position={[0.12, 0.015, 0]} rotation-y={-0.3 - Math.PI / 2} scale={0.9} />
      <Model url="/models/ceramic_vase_01.glb" position={[0.26, 0.015, 0]} scale={0.45} />
    </group>
  );
}

function WallDecor() {
  const poster = useMemo(() => posterTexture(), []);
  const pennant = useMemo(() => pennantTexture(), []);
  const moonArt = useMemo(() => artTexture('moon'), []);
  const abstractArt = useMemo(() => {
    const t = artTexture('abstract');
    t.rotation = Math.PI / 2; // landscape frame
    t.center.set(0.5, 0.5);
    return t;
  }, []);
  const z = ROOM.minZ + 0.005;
  return (
    <group>
      <Model url="/models/hanging_picture_frame_02.glb" position={[-1.22, 1.55, z]} scale={0.8} />
      <mesh position={[-1.22, 1.55 - 0.023, z + 0.03]}>
        <planeGeometry args={[0.5, 0.33]} />
        <meshStandardMaterial map={abstractArt} roughness={0.6} />
      </mesh>
      <Model url="/models/hanging_picture_frame_01.glb" position={[1.3, 1.78, z]} scale={0.62} />
      <mesh position={[1.3, 1.78, z + 0.011]}>
        <planeGeometry args={[0.3, 0.43]} />
        <meshStandardMaterial map={moonArt} roughness={0.6} />
      </mesh>
      <Model url="/models/wall_clock.glb" position={[ROOM.minX, 1.95, 0.35]} rotation-y={Math.PI / 2} />
      {/* poster + pennant over the bed */}
      <group position={[ROOM.maxX - 0.006, 1.62, 1.35]} rotation-y={-Math.PI / 2}>
        <mesh position={[0, 0, -0.004]}>
          <boxGeometry args={[0.47, 0.64, 0.01]} />
          <meshStandardMaterial color="#1d1a24" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0, 0.002]}>
          <planeGeometry args={[0.42, 0.59]} />
          <meshStandardMaterial map={poster} roughness={0.35} />
        </mesh>
      </group>
      <mesh position={[ROOM.maxX - 0.006, 1.72, 2.25]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[0.6, 0.3]} />
        <meshStandardMaterial map={pennant} transparent side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function FloorLamp({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.015, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.15, 0.03, 32]} />
        <meshStandardMaterial color="#26232e" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.72, 0]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 1.42, 12]} />
        <meshStandardMaterial color="#c9a86a" metalness={1} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.15, 0.22, 0.26, 40, 1, true]} />
        <meshStandardMaterial color="#fff0d6" emissive="#ffb866" emissiveIntensity={1.3} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 1.45, 0]} color="#ffb866" intensity={1.4} distance={4} decay={2} />
    </group>
  );
}

function Rug() {
  const wool = useSurface('poly_wool_herringbone', { repeat: [3, 2] });
  return (
    <RoundedBox args={[1.8, 0.012, 1.25]} radius={0.005} smoothness={2} position={[-0.55, 0.006, 1.95]} receiveShadow>
      <meshStandardMaterial normalMap={wool.normalMap} roughnessMap={wool.roughnessMap} color="#c9bdea" roughness={1} />
    </RoundedBox>
  );
}

export default function Room() {
  const { minX, maxX, maxZ, height } = ROOM;
  return (
    <group>
      <Shell />
      <Bed />
      {/* fairy lights draped over the bed */}
      <FairyLights
        from={[maxX - 0.02, 2.0, 0.55]}
        to={[maxX - 0.02, 2.0, 2.4]}
        count={26}
        sag={0.18}
        swags={4}
        lights={[
          [maxX - 0.35, 1.8, 1.0],
          [maxX - 0.35, 1.8, 1.9],
        ]}
      />
      <Model url="/models/painted_wooden_nightstand.glb" position={[maxX - 0.3, 0, 0.18]} rotation-y={-Math.PI / 2} scale={0.9} />
      <BedsideLamp position={[maxX - 0.3, 0.554, 0.18]} />
      <Model url="/models/painted_wooden_shelves.glb" position={[1.2, 0, ROOM.minZ + 0.01]} />
      <Model url="/models/potted_plant_02.glb" position={[1.2, 1.124, -0.33]} scale={0.32} />
      <WallShelf />
      <WallDecor />
      <Rug />
      <Model url="/models/wooden_bookshelf_worn.glb" position={[minX + 0.3, 0, 1.1]} rotation-y={Math.PI / 2} scale={0.9} />
      {/* book sets on the bookshelf's shelves (tops measured at y = 0.35, 0.60,
          0.86, 1.15, 1.50); each set runs toward -z from its origin */}
      {[
        [0.353, 1.62, 0.9],
        [0.604, 1.3, 0.8],
        [1.149, 1.66, 0.9],
        [1.497, 1.25, 0.75],
      ].map(([y, z, s], i) => (
        <Model key={i} url="/models/book_encyclopedia_set_01.glb" position={[minX + 0.3, y, z]} rotation-y={Math.PI / 2} scale={s} />
      ))}
      <Model url="/models/potted_plant_04.glb" position={[minX + 0.3, 0.864, 1.5]} scale={0.9} />
      <Model url="/models/potted_plant_01.glb" position={[minX + 0.3, 0, -0.18]} />
      <Model url="/models/GreenChair_01.glb" position={[-0.75, 0, 2.2]} rotation-y={Math.PI * 0.85} />
      <FloorLamp position={[-1.4, 0, 1.75]} />
      <Model url="/models/side_table_01.glb" position={[-1.3, 0, 2.55]} scale={0.8} />
      <Model url="/models/ceramic_vase_01.glb" position={[-1.3, 0.44, 2.55]} scale={0.6} />
      <Model url="/models/drawer_cabinet.glb" position={[-0.25, 0, maxZ - 0.26]} rotation-y={Math.PI} scale={0.75} />
      <Model url="/models/modern_ceiling_lamp_01.glb" position={[0, height - 1.173, 1.3]} />
    </group>
  );
}
