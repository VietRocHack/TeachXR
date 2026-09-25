// Canvas textures for things that are drawn rather than photographed: the
// night skyline, poster, sticky notes and framed art. Real surfaces
// (wood, plaster, fabric) are PBR sets; see pbr.js.

import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(c, repeat) {
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) {
    t.wrapS = RepeatWrapping;
    t.wrapT = RepeatWrapping;
    t.repeat.set(...repeat);
  }
  return t;
}

// Deterministic pseudo-random so the room looks the same on every load.
function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function cityTexture() {
  const [c, ctx] = canvas(1024, 800);
  const rand = rng(21);
  const sky = ctx.createLinearGradient(0, 0, 0, 800);
  sky.addColorStop(0, '#0b0a24');
  sky.addColorStop(0.55, '#2a1c5c');
  sky.addColorStop(1, '#6b3a7a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 1024, 800);
  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.3 + rand() * 0.7})`;
    const s = rand() * 2.2;
    ctx.fillRect(rand() * 1024, rand() * 420, s, s);
  }
  // moon
  const moon = ctx.createRadialGradient(800, 140, 5, 800, 140, 90);
  moon.addColorStop(0, 'rgba(255,250,230,1)');
  moon.addColorStop(0.45, 'rgba(255,245,215,1)');
  moon.addColorStop(0.5, 'rgba(255,240,200,0.25)');
  moon.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = moon;
  ctx.beginPath();
  ctx.arc(800, 140, 90, 0, Math.PI * 2);
  ctx.fill();
  // skyline layers
  [
    ['#1b1440', 420, 0.35],
    ['#120d2e', 500, 0.55],
    ['#0a0820', 580, 0.8],
  ].forEach(([color, baseY, lit]) => {
    let x = 0;
    while (x < 1024) {
      const bw = 40 + rand() * 90;
      const bh = 80 + rand() * 260;
      const top = baseY - bh + 200;
      ctx.fillStyle = color;
      ctx.fillRect(x, top, bw, 800 - top);
      for (let wy = top + 12; wy < 800; wy += 18) {
        for (let wx = x + 8; wx < x + bw - 8; wx += 14) {
          if (rand() < lit * 0.45) {
            ctx.fillStyle = rand() > 0.8 ? 'rgba(170,200,255,0.9)' : 'rgba(255,214,140,0.9)';
            ctx.fillRect(wx, wy, 6, 8);
          }
        }
      }
      x += bw + rand() * 6;
    }
  });
  return toTexture(c);
}

export function posterTexture() {
  const [c, ctx] = canvas(600, 840);
  const g = ctx.createLinearGradient(0, 0, 0, 840);
  g.addColorStop(0, '#ff7a59');
  g.addColorStop(0.5, '#c2338f');
  g.addColorStop(1, '#2b1a6b');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 600, 840);
  ctx.fillStyle = '#ffd36e';
  ctx.beginPath();
  ctx.arc(300, 360, 150, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff1c1';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.ellipse(300, 360, 240, 60, -0.3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#1a1036';
  for (let i = 0; i < 6; i++) ctx.fillRect(0, 640 + i * 4, 600, 2);
  ctx.fillStyle = '#fff';
  ctx.font = '700 84px "Space Grotesk", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXPLORE', 300, 150);
  ctx.font = '500 34px "Space Grotesk", sans-serif';
  ctx.fillText('stay curious · keep asking', 300, 760);
  return toTexture(c);
}


export function stickyTexture(text, color) {
  const [c, ctx] = canvas(256, 256);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  ctx.fillRect(0, 0, 256, 30);
  ctx.fillStyle = '#2b2233';
  ctx.font = '700 38px "Nunito", sans-serif';
  text.split('\n').forEach((line, i) => ctx.fillText(line, 22, 90 + i * 48));
  return toTexture(c);
}


// Framed art for the picture frames: a moonlit landscape and an abstract print.
export function artTexture(kind) {
  const [c, ctx] = canvas(600, 800);
  if (kind === 'moon') {
    const sky = ctx.createLinearGradient(0, 0, 0, 800);
    sky.addColorStop(0, '#1d1b4a');
    sky.addColorStop(0.6, '#6a4c9c');
    sky.addColorStop(1, '#f2a37a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 600, 800);
    ctx.fillStyle = '#fff4d6';
    ctx.beginPath();
    ctx.arc(420, 220, 70, 0, Math.PI * 2);
    ctx.fill();
    [['#3b2a63', 520], ['#2a1d4a', 600], ['#1a1233', 690]].forEach(([color, base], i) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, 800);
      for (let x = 0; x <= 600; x += 20) ctx.lineTo(x, base - Math.sin(x / (90 + i * 40) + i) * (60 - i * 12));
      ctx.lineTo(600, 800);
      ctx.fill();
    });
  } else {
    ctx.fillStyle = '#f3ece2';
    ctx.fillRect(0, 0, 600, 800);
    [['#e07a5f', 180, 260, 150], ['#3d405b', 400, 420, 190], ['#f2cc8f', 220, 560, 120], ['#81b29a', 430, 180, 90]].forEach(([color, x, y, r]) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.strokeStyle = '#3d405b';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(60, 700);
    ctx.bezierCurveTo(200, 600, 380, 760, 540, 640);
    ctx.stroke();
  }
  return toTexture(c);
}
