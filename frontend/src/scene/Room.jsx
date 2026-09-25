// The dorm room around the desk: walls, window onto a night skyline, bed,
// bookshelf, reading chair, rug and some wall decor. Units are meters; the
// desk sits against the front wall (z = -0.5), facing +z toward the viewer.

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import Model from './Model';
import * as THREE from 'three';
import {
  blanketTexture,
  cityTexture,
  floorTexture,
  pennantTexture,
  posterTexture,
  rugTexture,
  wallTexture,
  woodTexture,
} from './textures';

export const ROOM = { minX: -1.7, maxX: 1.7, minZ: -0.5, maxZ: 3.2, height: 2.6 };


function Walls() {
  const wall = useMemo(() => wallTexture(), []);
  const floor = useMemo(() => floorTexture(), []);
  const { minX, maxX, minZ, maxZ, height } = ROOM;
  const w = maxX - minX;
  const d = maxZ - minZ;
  const cz = (minZ + maxZ) / 2;
  const wallMat = <meshStandardMaterial map={wall} color="#cfc6e0" roughness={0.95} />;
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, cz]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={floor} roughness={0.7} />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position={[0, height, cz]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#d8d2e6" roughness={1} />
      </mesh>
      {/* front wall has a window cut-out, built from 4 panels around it */}
      <FrontWall />
      <mesh position={[0, height / 2, maxZ]} rotation-y={Math.PI} receiveShadow>
        <planeGeometry args={[w, height]} />
        {wallMat}
      </mesh>
      <mesh position={[minX, height / 2, cz]} rotation-y={Math.PI / 2} receiveShadow>
        <planeGeometry args={[d, height]} />
        {wallMat}
      </mesh>
      <mesh position={[maxX, height / 2, cz]} rotation-y={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[d, height]} />
        {wallMat}
      </mesh>
      {/* door on the back wall */}
      <group position={[0.9, 0, maxZ - 0.01]} rotation-y={Math.PI}>
        <mesh position={[0, 1.02, 0]}>
          <boxGeometry args={[0.86, 2.04, 0.03]} />
          <meshStandardMaterial color="#8a6b52" roughness={0.6} />
        </mesh>
        <mesh position={[0.34, 1.0, 0.03]}>
          <sphereGeometry args={[0.03, 16, 16]} />
          <meshStandardMaterial color="#d4d4d8" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>
      {/* baseboards */}
      {[
        [[0, 0.04, minZ + 0.01], [w, 0.08, 0.02], 0],
        [[minX + 0.01, 0.04, cz], [d, 0.08, 0.02], Math.PI / 2],
        [[maxX - 0.01, 0.04, cz], [d, 0.08, 0.02], Math.PI / 2],
      ].map(([pos, size, ry], i) => (
        <mesh key={i} position={pos} rotation-y={ry}>
          <boxGeometry args={size} />
          <meshStandardMaterial color="#f1edf7" />
        </mesh>
      ))}
    </group>
  );
}

const WIN = { x: -0.3, y: 1.62, w: 1.0, h: 0.8 };

function FrontWall() {
  const wall = useMemo(() => wallTexture(), []);
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
        <mesh key={i} position={[(x0 + x1) / 2, (y0 + y1) / 2, minZ]} receiveShadow>
          <planeGeometry args={[x1 - x0, y1 - y0]} />
          <meshStandardMaterial map={wall} color="#cfc6e0" roughness={0.95} />
        </mesh>
      ))}
      {/* the view outside, set back a little for parallax */}
      <mesh position={[WIN.x, WIN.y, minZ - 0.6]}>
        <planeGeometry args={[WIN.w * 2.2, WIN.h * 2.2]} />
        <meshBasicMaterial map={city} toneMapped={false} />
      </mesh>
      {/* frame + mullions */}
      {[
        [WIN.x, top, WIN.w + 0.08, 0.05],
        [WIN.x, bottom, WIN.w + 0.08, 0.05],
        [left, WIN.y, 0.05, WIN.h],
        [right, WIN.y, 0.05, WIN.h],
        [WIN.x, WIN.y, 0.025, WIN.h],
        [WIN.x, WIN.y, WIN.w, 0.025],
      ].map(([x, y, w, h], i) => (
        <mesh key={i} position={[x, y, minZ + 0.02]}>
          <boxGeometry args={[w, h, 0.05]} />
          <meshStandardMaterial color="#f5f3fa" roughness={0.5} />
        </mesh>
      ))}
      {/* sill */}
      <mesh position={[WIN.x, bottom - 0.03, minZ + 0.06]}>
        <boxGeometry args={[WIN.w + 0.14, 0.03, 0.12]} />
        <meshStandardMaterial color="#f5f3fa" />
      </mesh>
    </group>
  );
}

function Bed() {
  const blanket = useMemo(() => blanketTexture(), []);
  const wood = useMemo(() => woodTexture({ base: '#6b4a34', dark: '#3e2a1c', seed: 9 }), []);
  const x = ROOM.maxX - 0.5;
  return (
    <group position={[x, 0, 1.45]}>
      <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.0, 0.28, 2.0]} />
        <meshStandardMaterial map={wood} />
      </mesh>
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.95, 0.18, 1.95]} />
        <meshStandardMaterial color="#f4f2f8" roughness={0.9} />
      </mesh>
      <mesh position={[-0.01, 0.5, 0.25]} castShadow receiveShadow>
        <boxGeometry args={[0.99, 0.05, 1.5]} />
        <meshStandardMaterial map={blanket} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.55, -0.75]} scale={[1, 0.35, 0.55]} castShadow>
        <sphereGeometry args={[0.36, 24, 16]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.55, -1.0]}>
        <boxGeometry args={[1.02, 0.8, 0.05]} />
        <meshStandardMaterial map={wood} />
      </mesh>
      {/* plushie */}
      <group position={[-0.2, 0.62, -0.45]}>
        <mesh castShadow>
          <sphereGeometry args={[0.09, 20, 16]} />
          <meshStandardMaterial color="#f5b041" roughness={1} />
        </mesh>
        <mesh position={[0, 0.11, 0]} castShadow>
          <sphereGeometry args={[0.065, 20, 16]} />
          <meshStandardMaterial color="#f5b041" roughness={1} />
        </mesh>
        {[-0.04, 0.04].map((ex) => (
          <mesh key={ex} position={[ex, 0.17, 0]}>
            <sphereGeometry args={[0.022, 12, 12]} />
            <meshStandardMaterial color="#e59a2e" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function WallDecor() {
  const poster = useMemo(() => posterTexture(), []);
  const pennant = useMemo(() => pennantTexture(), []);
  const z = ROOM.minZ + 0.005;
  return (
    <group>
      <mesh position={[0.85, 1.65, z]}>
        <planeGeometry args={[0.42, 0.59]} />
        <meshStandardMaterial map={poster} roughness={0.6} />
      </mesh>
      <mesh position={[ROOM.maxX - 0.005, 1.6, 0.9]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[0.6, 0.3]} />
        <meshStandardMaterial map={pennant} transparent side={THREE.DoubleSide} />
      </mesh>
      <Model url="/models/wall_clock.glb" position={[-1.2, 1.85, ROOM.minZ]} />
      {/* string lights over the window */}
      <FairyLights />
    </group>
  );
}

function FairyLights() {
  const bulbs = useMemo(() => {
    const out = [];
    for (let i = 0; i <= 18; i++) {
      const t = i / 18;
      out.push([-0.95 + t * 1.3, 2.15 - Math.sin(t * Math.PI) * 0.12, ROOM.minZ + 0.03]);
    }
    return out;
  }, []);
  const group = useRef();
  useFrame(({ clock }) => {
    group.current?.children.forEach((m, i) => {
      m.material.emissiveIntensity = 2.2 + Math.sin(clock.elapsedTime * 1.5 + i) * 0.8;
    });
  });
  return (
    <group ref={group}>
      {bulbs.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.012, 10, 10]} />
          <meshStandardMaterial
            color="#fff3c4"
            emissive={i % 3 === 0 ? '#ffb86b' : i % 3 === 1 ? '#c4a3ff' : '#ffe08a'}
            emissiveIntensity={2.5}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function Rug() {
  const rug = useMemo(() => rugTexture(), []);
  return (
    <mesh rotation-x={-Math.PI / 2} position={[-0.6, 0.004, 1.9]} receiveShadow>
      <circleGeometry args={[0.8, 48]} />
      <meshStandardMaterial map={rug} roughness={1} />
    </mesh>
  );
}

export default function Room() {
  return (
    <group>
      <Walls />
      <Bed />
      <WallDecor />
      <Rug />
      <Model
        url="/models/wooden_bookshelf_worn.glb"
        position={[ROOM.minX + 0.3, 0, 1.1]}
        rotation-y={Math.PI / 2}
        scale={0.9}
      />
      <Model
        url="/models/book_encyclopedia_set_01.glb"
        position={[ROOM.minX + 0.25, 1.09, 1.35]}
        rotation-y={Math.PI / 2}
        scale={0.9}
      />
      <Model url="/models/modern_arm_chair_01.glb" position={[-0.8, 0, 2.35]} rotation-y={Math.PI * 0.8} />
    </group>
  );
}
