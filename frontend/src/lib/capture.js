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

function isShown(obj) {
  for (let o = obj; o; o = o.parent) if (!o.visible) return false;
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
