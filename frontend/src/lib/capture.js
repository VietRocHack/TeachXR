// Turns a circled region of the 3D view into a JPEG for the tutor, and figures
// out what was circled (book, monitor or desk) by raycasting into the scene.
// This replaces the old gesture backend's window-capture + crop step.

import { Raycaster, Vector2 } from 'three';

const MAX_SIDE = 1024;
const MIN_SIDE = 480;
const PADDING = 16; // CSS px around the lasso's bounding box

export function lassoBounds(points, width, height) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  minX = Math.max(0, minX - PADDING);
  minY = Math.max(0, minY - PADDING);
  maxX = Math.min(width, maxX + PADDING);
  maxY = Math.min(height, maxY + PADDING);
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

// Renders one clean frame (no post-processing, so text isn't bloomed) and
// copies the region out synchronously, before the drawing buffer is cleared.
export function captureRegion({ gl, scene, camera }, rect) {
  gl.render(scene, camera);
  const canvas = gl.domElement;
  const scaleX = canvas.width / canvas.clientWidth;
  const scaleY = canvas.height / canvas.clientHeight;
  const sx = rect.x * scaleX;
  const sy = rect.y * scaleY;
  const sw = rect.w * scaleX;
  const sh = rect.h * scaleY;

  const longest = Math.max(sw, sh);
  let scale = 1;
  if (longest > MAX_SIDE) scale = MAX_SIDE / longest;
  else if (longest < MIN_SIDE) scale = MIN_SIDE / longest;
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(sw * scale));
  out.height = Math.max(1, Math.round(sh * scale));
  const ctx = out.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, out.width, out.height);
  return out.toDataURL('image/jpeg', 0.88);
}

// Hidden objects, and in-room UI (userData.noRaycast), don't count as what
// was circled.
function isShown(obj) {
  for (let o = obj; o; o = o.parent) if (!o.visible || o.userData.noRaycast) return false;
  return true;
}

// Samples a grid inside the lasso and returns whichever tagged object
// (userData.source) most of it lands on.
export function detectSource({ scene, camera, size }, rect) {
  const raycaster = new Raycaster();
  const ndc = new Vector2();
  const votes = {};
  for (let i = 1; i <= 3; i++) {
    for (let j = 1; j <= 3; j++) {
      const px = rect.x + (rect.w * i) / 4;
      const py = rect.y + (rect.h * j) / 4;
      ndc.set((px / size.width) * 2 - 1, -(py / size.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      // Raycaster doesn't skip hidden objects (like the worn glasses sitting
      // right at the camera), so filter those out.
      const hit = raycaster.intersectObjects(scene.children, true).find((h) => isShown(h.object));
      let obj = hit?.object;
      while (obj && !obj.userData.source) obj = obj.parent;
      const source = obj?.userData.source || 'desk';
      votes[source] = (votes[source] || 0) + 1;
    }
  }
  // A lasso around a page always catches some desk around it, so any hit on
  // the book or monitor wins over the desk.
  const ranked = Object.entries(votes).sort((a, b) => b[1] - a[1]);
  return (ranked.find(([source]) => source !== 'desk') || ranked[0])[0];
}

function screenRay(raycaster, { camera, size }, x, y) {
  raycaster.setFromCamera(new Vector2((x / size.width) * 2 - 1, -(y / size.height) * 2 + 1), camera);
  return raycaster.ray;
}

// Projects the screen-space lasso onto the surfaces under it, so the trace can
// be drawn on the book or monitor itself and stays put as you look around.
// Points are nudged a few millimeters toward the camera to avoid z-fighting.
export function projectLasso(three, path) {
  const raycaster = new Raycaster();
  const points = [];
  const step = Math.max(1, Math.floor(path.length / 64));
  for (let i = 0; i < path.length; i += step) {
    const ray = screenRay(raycaster, three, path[i][0], path[i][1]);
    const hit = raycaster.intersectObjects(three.scene.children, true).find((h) => isShown(h.object));
    if (hit) points.push(hit.point.clone().addScaledVector(ray.direction, -0.004));
  }
  if (points.length > 2) points.push(points[0].clone());
  return points;
}

// Where the "ask about this" card floats: beside the lasso (below it on narrow
// screens), a fixed distance in front of the viewer, so it's always readable.
export function popupAnchor(three, rect, distance = 0.42) {
  const { size } = three;
  const narrow = size.width < 640;
  let x = rect.x + rect.w + 175;
  let y = rect.y + rect.h / 2;
  if (narrow) {
    x = size.width / 2;
    y = Math.min(size.height - 220, rect.y + rect.h + 200);
  } else if (x > size.width - 180) {
    x = Math.max(180, rect.x - 175);
  }
  const ray = screenRay(new Raycaster(), three, x, y);
  return ray.origin.clone().addScaledVector(ray.direction, distance);
}
