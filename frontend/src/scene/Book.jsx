// The open textbook. Each spread is two canvas-rendered pages; flipping to the
// next/previous spread animates a single leaf turning over the spine.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TOPICS } from '../content/topics';
import { PAGE_H, PAGE_W, drawPage } from '../content/drawPage';
import { DESK_TOP } from './Desk';

const PAGE_WIDTH = 0.2;
const PAGE_DEPTH = PAGE_WIDTH * (PAGE_H / PAGE_W);
const PAGE_Y = 0.024; // top of the page block above the desk
const FLIP_SECONDS = 0.9;

function makeTexture(canvas, mirrored = false) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 16;
  if (mirrored) {
    t.wrapS = THREE.RepeatWrapping;
    t.repeat.x = -1;
  }
  return t;
}

export function useBookTextures() {
  return useMemo(
    () =>
      TOPICS.map((topic, i) =>
        ['left', 'right'].reduce((acc, side) => {
          const canvas = document.createElement('canvas');
          canvas.width = PAGE_W;
          canvas.height = PAGE_H;
          drawPage(canvas, topic, side, i * 2 + (side === 'left' ? 1 : 2));
          acc[side] = makeTexture(canvas);
          acc[`${side}Mirrored`] = makeTexture(canvas, true);
          return acc;
        }, {}),
      ),
    [],
  );
}

// A page lying flat, x from 0 (spine) to PAGE_WIDTH, dipping toward the spine
// like a real open book. `side` -1 mirrors it to the left of the spine.
function pageGeometry(side) {
  const g = new THREE.PlaneGeometry(PAGE_WIDTH, PAGE_DEPTH, 24, 1);
  g.rotateX(-Math.PI / 2);
  g.translate(PAGE_WIDTH / 2, 0, 0);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    pos.setY(i, -0.01 * Math.exp(-x / 0.025) + 0.004 * Math.sin((x / PAGE_WIDTH) * Math.PI));
    if (side < 0) {
      // Mirror across the spine, keeping the texture readable (u runs outer
      // edge -> spine) and the faces pointing up (reverse the winding).
      pos.setX(i, -x);
      uv.setX(i, 1 - uv.getX(i));
    }
  }
  if (side < 0) {
    const index = g.index.array;
    for (let i = 0; i < index.length; i += 3) {
      [index[i + 1], index[i + 2]] = [index[i + 2], index[i + 1]];
    }
  }
  g.computeVertexNormals();
  return g;
}

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export default function Book({ spread, textures, position = [-0.08, DESK_TOP, 0.03], rotationY = 0.04 }) {
  const rightGeo = useMemo(() => pageGeometry(1), []);
  const leftGeo = useMemo(() => pageGeometry(-1), []);
  const leafGeo = useMemo(() => pageGeometry(1), []);

  // Which spread each static page shows, and the in-flight flip (if any).
  const [shown, setShown] = useState(spread);
  const [flip, setFlip] = useState(null); // { from, to, dir }
  const progress = useRef(0);
  const leaf = useRef();
  const leafMat = useRef();

  useEffect(() => {
    // A flip already in flight snaps to its end before the next one starts.
    const from = flip ? flip.to : shown;
    if (flip) setShown(flip.to);
    progress.current = 0;
    setFlip(spread === from ? null : { from, to: spread, dir: spread > from ? 1 : -1 });
    // Only a change of `spread` starts a flip.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spread]);

  useFrame((_, delta) => {
    if (!flip || !leaf.current) return;
    progress.current = Math.min(1, progress.current + delta / FLIP_SECONDS);
    const t = easeInOut(progress.current);
    // dir 1: right leaf turns over to the left (angle 0 -> PI); dir -1: reverse.
    const angle = flip.dir > 0 ? t * Math.PI : (1 - t) * Math.PI;
    leaf.current.rotation.z = angle;
    leaf.current.position.y = PAGE_Y + 0.002 + Math.sin(angle) * 0.01;
    const showingFront = angle < Math.PI / 2;
    const frontTex = textures[flip.dir > 0 ? flip.from : flip.to].right;
    const backTex = textures[flip.dir > 0 ? flip.to : flip.from].leftMirrored;
    const map = showingFront ? frontTex : backTex;
    if (leafMat.current.map !== map) {
      leafMat.current.map = map;
      leafMat.current.needsUpdate = true;
    }
    if (progress.current >= 1) {
      setShown(flip.to);
      setFlip(null);
    }
  });

  // While flipping forward, the left page still shows the old spread and the
  // right page already shows the new one (and the reverse for going back).
  const leftIndex = flip ? (flip.dir > 0 ? flip.from : flip.to) : shown;
  const rightIndex = flip ? (flip.dir > 0 ? flip.to : flip.from) : shown;

  return (
    <group position={position} rotation-y={rotationY} userData={{ source: 'book' }}>
      {/* hard cover */}
      <mesh position={[0, 0.004, 0]} castShadow receiveShadow>
        <boxGeometry args={[PAGE_WIDTH * 2 + 0.02, 0.008, PAGE_DEPTH + 0.02]} />
        <meshStandardMaterial color="#2e1a6e" roughness={0.6} />
      </mesh>
      {/* page blocks */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * PAGE_WIDTH) / 2, 0.008 + (PAGE_Y - 0.012) / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[PAGE_WIDTH - 0.004, PAGE_Y - 0.012, PAGE_DEPTH - 0.004]} />
          <meshStandardMaterial color="#efe7d6" roughness={0.9} />
        </mesh>
      ))}
      <mesh geometry={leftGeo} position={[0, PAGE_Y, 0]} receiveShadow>
        <meshStandardMaterial map={textures[leftIndex].left} roughness={0.85} />
      </mesh>
      <mesh geometry={rightGeo} position={[0, PAGE_Y, 0]} receiveShadow>
        <meshStandardMaterial map={textures[rightIndex].right} roughness={0.85} />
      </mesh>
      {flip && (
        <mesh
          ref={leaf}
          geometry={leafGeo}
          position={[0, PAGE_Y + 0.002, 0]}
          rotation-z={flip.dir > 0 ? 0 : Math.PI}
          castShadow
        >
          <meshStandardMaterial
            ref={leafMat}
            map={flip.dir > 0 ? textures[flip.from].right : textures[flip.from].leftMirrored}
            roughness={0.85}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      {/* ribbon bookmark */}
      <mesh position={[0.004, PAGE_Y + 0.0015, PAGE_DEPTH / 2 + 0.02]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.008, 0.06]} />
        <meshStandardMaterial color="#dc2626" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export const BOOK_PAGE = { width: PAGE_WIDTH, depth: PAGE_DEPTH, y: PAGE_Y };
