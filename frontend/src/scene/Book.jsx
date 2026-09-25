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
const FLIP_SECONDS = 1.0;
// Paper tint: a little below white so lit pages keep their ink contrast.
const PAPER = '#d8d0c2';
export const BOOK_POSITION = [-0.08, DESK_TOP, 0.03];
export const BOOK_ROTATION = 0.04;

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

const LEAF_SEGMENTS = 48;
// How much the free edge lags behind the spine while turning (radians at the
// middle of the turn): this is what makes the page curl instead of swinging
// like a rigid board.
const CURL = 1.15;

// The turning page: a strip of columns along its width, bent each frame. The
// front and back faces are separate meshes sharing this geometry, so both
// sides of the paper show correctly mid-turn.
function useLeafGeometry() {
  return useMemo(() => {
    const g = new THREE.PlaneGeometry(PAGE_WIDTH, PAGE_DEPTH, LEAF_SEGMENTS, 1);
    g.rotateX(-Math.PI / 2);
    g.translate(PAGE_WIDTH / 2, 0, 0);
    return g;
  }, []);
}

const column = new Float32Array((LEAF_SEGMENTS + 1) * 2);

// Bend the leaf for a turn angle `theta` (0 = lying on the right, PI = lying
// on the left). Each column's angle trails the spine's by up to CURL, most at
// mid-turn, so the page lifts from the spine and the edge follows.
function bendLeaf(geometry, theta, dir) {
  const ds = PAGE_WIDTH / LEAF_SEGMENTS;
  const lag = CURL * Math.sin(theta);
  let x = 0;
  let y = 0;
  column[0] = 0;
  column[1] = 0;
  for (let j = 1; j <= LEAF_SEGMENTS; j++) {
    const s = (j - 0.5) / LEAF_SEGMENTS;
    // Clamped so the edge never dips below the flat pages.
    const a = Math.min(Math.PI, Math.max(0, theta - dir * lag * s));
    x += Math.cos(a) * ds;
    y += Math.sin(a) * ds;
    column[j * 2] = x;
    column[j * 2 + 1] = y;
  }
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const j = i % (LEAF_SEGMENTS + 1);
    pos.setX(i, column[j * 2]);
    pos.setY(i, column[j * 2 + 1] + 0.003);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
}

// `onTurn(dir)`: tapping the right page asks for the next spread (+1), the
// left page for the previous one (-1). `interactive` enables clicks in the
// desk view; with the glasses on, the HUD forwards taps (App.jsx).
export default function Book({ spread, textures, onTurn, interactive, position = BOOK_POSITION, rotationY = BOOK_ROTATION }) {
  const rightGeo = useMemo(() => pageGeometry(1), []);
  const leftGeo = useMemo(() => pageGeometry(-1), []);
  const leafGeo = useLeafGeometry();
  const group = useRef();

  // Which spread each static page shows, and the in-flight turn (if any).
  const [shown, setShown] = useState(spread);
  const [flip, setFlip] = useState(null); // { from, to, dir }
  const progress = useRef(0);

  useEffect(() => {
    // A turn already in flight snaps to its end before the next one starts.
    const from = flip ? flip.to : shown;
    if (flip) setShown(flip.to);
    progress.current = 0;
    const next = spread === from ? null : { from, to: spread, dir: spread > from ? 1 : -1 };
    if (next) bendLeaf(leafGeo, next.dir > 0 ? 0 : Math.PI, next.dir);
    setFlip(next);
    // Only a change of `spread` starts a turn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spread]);

  useFrame((_, delta) => {
    if (!flip) return;
    progress.current = Math.min(1, progress.current + Math.min(delta, 0.1) / FLIP_SECONDS);
    const t = easeInOut(progress.current);
    // dir 1: the right page turns over to the left (theta 0 -> PI); dir -1: back.
    bendLeaf(leafGeo, flip.dir > 0 ? t * Math.PI : (1 - t) * Math.PI, flip.dir);
    if (progress.current >= 1) {
      setShown(flip.to);
      setFlip(null);
    }
  });

  // While turning forward, the left page still shows the old spread and the
  // right page already shows the new one (and the reverse for going back).
  const leftIndex = flip ? (flip.dir > 0 ? flip.from : flip.to) : shown;
  const rightIndex = flip ? (flip.dir > 0 ? flip.to : flip.from) : shown;
  // The leaf's front is the right-hand page it started as; its back is the
  // left-hand page it becomes.
  const leafFront = flip && textures[flip.dir > 0 ? flip.from : flip.to].right;
  const leafBack = flip && textures[flip.dir > 0 ? flip.to : flip.from].leftMirrored;

  const handlers = interactive
    ? {
        onClick: (e) => {
          e.stopPropagation();
          const local = group.current.worldToLocal(e.point.clone());
          onTurn?.(local.x >= 0 ? 1 : -1);
        },
        onPointerOver: (e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        },
        onPointerOut: () => {
          document.body.style.cursor = '';
        },
      }
    : {};

  return (
    <group ref={group} position={position} rotation-y={rotationY} userData={{ source: 'book' }} {...handlers}>
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
        <meshStandardMaterial map={textures[leftIndex].left} color={PAPER} roughness={0.9} />
      </mesh>
      <mesh geometry={rightGeo} position={[0, PAGE_Y, 0]} receiveShadow>
        <meshStandardMaterial map={textures[rightIndex].right} color={PAPER} roughness={0.9} />
      </mesh>
      {flip && (
        <group position={[0, PAGE_Y, 0]}>
          <mesh geometry={leafGeo} castShadow receiveShadow>
            <meshStandardMaterial map={leafFront} color={PAPER} roughness={0.9} side={THREE.FrontSide} />
          </mesh>
          <mesh geometry={leafGeo} receiveShadow>
            <meshStandardMaterial map={leafBack} color={PAPER} roughness={0.9} side={THREE.BackSide} />
          </mesh>
        </group>
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
