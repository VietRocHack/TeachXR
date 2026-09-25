// The open textbook: a hardcover lying open on the desk. Each spread is two
// canvas-rendered pages; turning to the next/previous spread animates a single
// leaf curling over the spine.
//
// Geometry: each half is a page stack extruded from a profile whose top
// follows `pageTop(x)`, rising out of the gutter and easing flat toward the
// fore-edge, so the printed page (laid on that same curve) always sits exactly
// on its stack. Cover boards and a curved spine sit underneath.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { TOPICS } from '../content/topics';
import { PAGE_H, PAGE_W, drawPage } from '../content/drawPage';
import { DESK_TOP } from './Desk';
import { useSurface } from './pbr';

const PAGE_WIDTH = 0.2;
const PAGE_DEPTH = PAGE_WIDTH * (PAGE_H / PAGE_W);
const BOARD = 0.0028; // cover board thickness
const FLIP_SECONDS = 1.0;
// Paper tint: a little below white so lit pages keep their ink contrast.
const PAPER = '#d8d0c2';
const COVER = '#3b2a7a';
export const BOOK_POSITION = [-0.08, DESK_TOP, 0.03];
export const BOOK_ROTATION = 0.04;

// Height of the page surface above the desk at distance x from the gutter:
// dips into the spine, rises quickly, then sags a touch toward the fore-edge.
function pageTop(x) {
  const u = Math.min(1, Math.max(0, x / PAGE_WIDTH));
  return BOARD + 0.005 + 0.011 * (1 - Math.exp(-x / 0.016)) - 0.0025 * u * u;
}

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

// Fine lines for the page edges (the fore-edge and top/bottom of the stacks).
function useEdgeTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 16;
    c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#efe8da';
    ctx.fillRect(0, 0, 16, 128);
    for (let y = 0; y < 128; y += 2) {
      ctx.fillStyle = `rgba(120,105,80,${0.08 + ((y * 37) % 11) / 90})`;
      ctx.fillRect(0, y, 16, 1);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }, []);
}

// The printed page: a strip on the pageTop curve, x from 0 (gutter) outward.
// `side` -1 mirrors it to the left of the spine, keeping the texture readable
// and the faces pointing up.
function pageGeometry(side) {
  const g = new THREE.PlaneGeometry(PAGE_WIDTH, PAGE_DEPTH, 48, 1);
  g.rotateX(-Math.PI / 2);
  g.translate(PAGE_WIDTH / 2, 0, 0);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    pos.setY(i, pageTop(x) + 0.0003);
    if (side < 0) {
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

// The page block under one half: the pageTop profile extruded through the
// book's depth, sitting on the cover board.
function stackGeometry(side) {
  const shape = new THREE.Shape();
  const w = PAGE_WIDTH - 0.002;
  shape.moveTo(0, BOARD);
  shape.lineTo(w, BOARD);
  for (let i = 40; i >= 0; i--) {
    const x = (i / 40) * w;
    shape.lineTo(x, pageTop(x));
  }
  shape.closePath();
  const depth = PAGE_DEPTH - 0.003;
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 1 });
  g.translate(0, 0, -depth / 2);
  // Mirroring flips the winding; the stack material is double-sided for that.
  if (side < 0) g.scale(-1, 1, 1);
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
// mid-turn, so the page lifts from the gutter and the edge follows. Near the
// start and end it blends onto the page curve, so it lands exactly on a stack.
function bendLeaf(geometry, theta, dir) {
  const ds = PAGE_WIDTH / LEAF_SEGMENTS;
  const lag = CURL * Math.sin(theta);
  const rest = 1 - Math.sin(theta);
  const base = pageTop(0);
  let x = 0;
  let y = 0;
  column[0] = 0;
  column[1] = base;
  for (let j = 1; j <= LEAF_SEGMENTS; j++) {
    const s = (j - 0.5) / LEAF_SEGMENTS;
    // Clamped so the edge never dips below the flat pages.
    const a = Math.min(Math.PI, Math.max(0, theta - dir * lag * s));
    x += Math.cos(a) * ds;
    y += Math.sin(a) * ds;
    column[j * 2] = x;
    column[j * 2 + 1] = base + y + (pageTop(Math.abs(x)) - base) * rest;
  }
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const j = i % (LEAF_SEGMENTS + 1);
    pos.setX(i, column[j * 2]);
    pos.setY(i, column[j * 2 + 1] + 0.0008);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
}

// Cloth-covered boards with a rounded spine curling under the gutter.
function Cover() {
  const cloth = useSurface('knitted_fleece', { repeat: [4, 5], normalScale: 0.35 });
  const spine = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.012, 0.012, PAGE_DEPTH + 0.008, 24, 1, true, Math.PI / 2, Math.PI);
    g.rotateX(Math.PI / 2);
    g.scale(1, 0.35, 1);
    g.translate(0, 0.0042, 0);
    return g;
  }, []);
  return (
    <group>
      {[-1, 1].map((s) => (
        <RoundedBox
          key={s}
          args={[PAGE_WIDTH + 0.005, BOARD, PAGE_DEPTH + 0.008]}
          radius={0.0012}
          smoothness={2}
          position={[s * ((PAGE_WIDTH + 0.005) / 2 + 0.003), BOARD / 2, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial normalMap={cloth.normalMap} normalScale={cloth.normalScale} color={COVER} roughness={0.8} />
        </RoundedBox>
      ))}
      <mesh geometry={spine} castShadow receiveShadow>
        <meshStandardMaterial color={COVER} roughness={0.8} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// `onTurn(dir)`: tapping the right page asks for the next spread (+1), the
// left page for the previous one (-1). `interactive` enables clicks in the
// desk view; with the glasses on, the HUD forwards taps (App.jsx).
export default function Book({ spread, textures, onTurn, interactive, position = BOOK_POSITION, rotationY = BOOK_ROTATION }) {
  const rightGeo = useMemo(() => pageGeometry(1), []);
  const leftGeo = useMemo(() => pageGeometry(-1), []);
  const stacks = useMemo(() => [stackGeometry(-1), stackGeometry(1)], []);
  const edge = useEdgeTexture();
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
      <Cover />
      {stacks.map((g, i) => (
        <mesh key={i} geometry={g} castShadow receiveShadow>
          <meshStandardMaterial map={edge} color="#f3ede0" roughness={0.95} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <mesh geometry={leftGeo} receiveShadow>
        <meshStandardMaterial map={textures[leftIndex].left} color={PAPER} roughness={0.9} />
      </mesh>
      <mesh geometry={rightGeo} receiveShadow>
        <meshStandardMaterial map={textures[rightIndex].right} color={PAPER} roughness={0.9} />
      </mesh>
      {flip && (
        <group>
          <mesh geometry={leafGeo} castShadow receiveShadow>
            <meshStandardMaterial map={leafFront} color={PAPER} roughness={0.9} side={THREE.FrontSide} />
          </mesh>
          <mesh geometry={leafGeo} receiveShadow>
            <meshStandardMaterial map={leafBack} color={PAPER} roughness={0.9} side={THREE.BackSide} />
          </mesh>
        </group>
      )}
    </group>
  );
}
