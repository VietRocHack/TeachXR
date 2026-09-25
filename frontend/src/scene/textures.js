// Procedural canvas textures for the dorm room, so the scene needs no image
// downloads beyond the handful of CC0 models in public/models/.

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

export function woodTexture({ base = '#b98a5a', dark = '#8a5e36', seed = 3, w = 1024, h = 512 } = {}) {
  const [c, ctx] = canvas(w, h);
  const rand = rng(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 140; i++) {
    const y = rand() * h;
    ctx.strokeStyle = dark;
    ctx.globalAlpha = 0.05 + rand() * 0.12;
    ctx.lineWidth = 1 + rand() * 3;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= w; x += 32) {
      ctx.lineTo(x, y + Math.sin(x * 0.01 + i) * 4 + (rand() - 0.5) * 2);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  return toTexture(c);
}

export function floorTexture() {
  const [c, ctx] = canvas(1024, 1024);
  const rand = rng(11);
  const plankH = 128;
  for (let row = 0; row < 1024 / plankH; row++) {
    let x = -rand() * 400;
    while (x < 1024) {
      const len = 300 + rand() * 400;
      const shade = 0.85 + rand() * 0.25;
      ctx.fillStyle = `rgb(${Math.round(120 * shade)},${Math.round(84 * shade)},${Math.round(58 * shade)})`;
      ctx.fillRect(x, row * plankH, len, plankH);
      for (let g = 0; g < 10; g++) {
        ctx.strokeStyle = `rgba(60,36,20,${0.08 + rand() * 0.1})`;
        ctx.lineWidth = 1 + rand() * 2;
        const gy = row * plankH + rand() * plankH;
        ctx.beginPath();
        ctx.moveTo(x, gy);
        ctx.lineTo(x + len, gy + (rand() - 0.5) * 8);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(30,18,10,0.6)';
      ctx.fillRect(x, row * plankH, 3, plankH);
      x += len;
    }
    ctx.fillStyle = 'rgba(30,18,10,0.5)';
    ctx.fillRect(0, row * plankH, 1024, 3);
  }
  return toTexture(c, [3, 4]);
}

export function wallTexture() {
  const [c, ctx] = canvas(512, 512);
  const rand = rng(5);
  ctx.fillStyle = '#d9d4e4';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 5000; i++) {
    ctx.fillStyle = `rgba(${rand() > 0.5 ? '255,255,255' : '90,80,110'},${rand() * 0.05})`;
    ctx.fillRect(rand() * 512, rand() * 512, 2, 2);
  }
  return toTexture(c, [4, 3]);
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

export function pennantTexture() {
  const [c, ctx] = canvas(512, 256);
  ctx.fillStyle = '#4023a4';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(512, 128);
  ctx.lineTo(0, 256);
  ctx.fill();
  ctx.fillStyle = '#ffd36e';
  ctx.font = '700 64px "Fredoka", sans-serif';
  ctx.fillText('GO TEAM!', 30, 150);
  return toTexture(c);
}

export function blanketTexture() {
  const [c, ctx] = canvas(512, 512);
  ctx.fillStyle = '#3b2a7a';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = 'rgba(160,140,255,0.18)';
    ctx.fillRect(i * 64, 0, 22, 512);
    ctx.fillRect(0, i * 64, 512, 22);
  }
  return toTexture(c, [2, 2]);
}

export function rugTexture() {
  const [c, ctx] = canvas(512, 512);
  ctx.fillStyle = '#e8e2f5';
  ctx.fillRect(0, 0, 512, 512);
  ['#b9a8f0', '#e8e2f5', '#8b74e6', '#e8e2f5', '#6d53d6'].forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(256, 256, 240 - i * 45, 0, Math.PI * 2);
    ctx.fill();
  });
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

export function keyboardTexture() {
  const [c, ctx] = canvas(1024, 360);
  ctx.fillStyle = '#1b1a22';
  ctx.fillRect(0, 0, 1024, 360);
  const rows = [14, 14, 13, 12];
  rows.forEach((n, r) => {
    const kw = 1000 / 15;
    for (let k = 0; k < n; k++) {
      ctx.fillStyle = '#2d2b38';
      ctx.fillRect(14 + k * kw + r * 18, 14 + r * 70, kw - 8, 60);
    }
  });
  ctx.fillStyle = '#2d2b38';
  ctx.fillRect(250, 300, 460, 50);
  // RGB underglow on the edge row
  const g = ctx.createLinearGradient(0, 0, 1024, 0);
  g.addColorStop(0, '#8b5cf6');
  g.addColorStop(0.5, '#22d3ee');
  g.addColorStop(1, '#f472b6');
  ctx.fillStyle = g;
  ctx.globalAlpha = 0.35;
  ctx.fillRect(0, 350, 1024, 10);
  ctx.globalAlpha = 1;
  return toTexture(c);
}
