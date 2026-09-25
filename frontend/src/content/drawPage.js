// Renders book pages and the monitor screen into 2D canvases, which the scene
// wraps as CanvasTextures. Drawn at high resolution so the text stays crisp in
// the circled crops the tutor reads.

export const PAGE_W = 1000;
export const PAGE_H = 1350;
export const MONITOR_W = 1600;
export const MONITOR_H = 900;

const INK = '#2b2233';
const SOFT_INK = '#5b5266';
const BODY_FONT = '"Nunito", system-ui, sans-serif';
const TITLE_FONT = '"Fredoka", "Nunito", system-ui, sans-serif';
const UI_FONT = '"Space Grotesk", system-ui, sans-serif';

export async function loadCanvasFonts() {
  if (!document.fonts) return;
  await Promise.allSettled([
    document.fonts.load(`400 30px "Nunito"`),
    document.fonts.load(`700 30px "Nunito"`),
    document.fonts.load(`600 30px "Fredoka"`),
    document.fonts.load(`500 30px "Space Grotesk"`),
    document.fonts.load(`700 30px "Space Grotesk"`),
  ]);
}

function wrapLines(ctx, text, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawWrapped(ctx, text, x, y, maxWidth, lineHeight) {
  const lines = wrapLines(ctx, text, maxWidth);
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
  return y + lines.length * lineHeight;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function arrow(ctx, x1, y1, x2, y2, color, width = 6, curve = 0) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  const mx = (x1 + x2) / 2 - (y2 - y1) * curve;
  const my = (y1 + y2) / 2 + (x2 - x1) * curve;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(mx, my, x2, y2);
  ctx.stroke();
  const angle = Math.atan2(y2 - my, x2 - mx);
  const head = width * 3.2;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head * Math.cos(angle - 0.45), y2 - head * Math.sin(angle - 0.45));
  ctx.lineTo(x2 - head * Math.cos(angle + 0.45), y2 - head * Math.sin(angle + 0.45));
  ctx.closePath();
  ctx.fill();
}

function label(ctx, text, x, y, size = 30, color = INK, align = 'center') {
  ctx.font = `700 ${size}px ${BODY_FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
  ctx.textAlign = 'left';
}

// ---------------------------------------------------------------- diagrams

const DIAGRAMS = {
  solar(ctx, x, y, w, h) {
    ctx.fillStyle = '#12102a';
    roundRect(ctx, x, y, w, h, 24);
    ctx.fill();
    // stars
    for (let i = 0; i < 70; i++) {
      const sx = x + ((i * 137.5) % w);
      const sy = y + ((i * 89.3) % h);
      ctx.fillStyle = `rgba(255,255,255,${0.3 + (i % 5) * 0.12})`;
      ctx.fillRect(sx, sy, 2.5, 2.5);
    }
    const cx = x + 40;
    const cy = y + h / 2;
    const sun = ctx.createRadialGradient(cx, cy, 10, cx, cy, 120);
    sun.addColorStop(0, '#fff6b0');
    sun.addColorStop(0.5, '#ffb300');
    sun.addColorStop(1, 'rgba(255,120,0,0)');
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(cx, cy, 120, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, 'Sun', cx + 30, cy + 110, 26, '#ffe08a');
    const planets = [
      ['Mercury', 9, '#b0a9a0'], ['Venus', 13, '#e8c77a'], ['Earth', 14, '#4aa3ff'], ['Mars', 11, '#e0603a'],
      ['Jupiter', 30, '#d9a066'], ['Saturn', 25, '#e8d39a'], ['Uranus', 18, '#8fe3e8'], ['Neptune', 18, '#4466ff'],
    ];
    planets.forEach(([name, r, color], i) => {
      const orbit = 130 + i * ((w - 180) / 8);
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, orbit, orbit * 0.9, 0, -0.55, 0.55);
      ctx.stroke();
      const a = (i % 2 ? 1 : -1) * (0.12 + (i % 3) * 0.1);
      const px = cx + orbit * Math.cos(a);
      const py = cy + orbit * 0.9 * Math.sin(a);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
      if (name === 'Saturn') {
        ctx.strokeStyle = '#f3e3b5';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(px, py, r * 1.8, r * 0.5, -0.3, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.save();
      ctx.translate(px, py + (i % 2 ? -r - 16 : r + 34));
      label(ctx, name, 0, 0, 22, '#e9e6ff');
      ctx.restore();
    });
    label(ctx, 'gravity pulls planets toward the Sun', x + w / 2 + 40, y + h - 24, 22, '#b9b3ff');
  },

  leaf(ctx, x, y, w, h) {
    ctx.fillStyle = '#eef8ea';
    roundRect(ctx, x, y, w, h, 24);
    ctx.fill();
    // sun
    ctx.fillStyle = '#ffc93c';
    ctx.beginPath();
    ctx.arc(x + 90, y + 90, 50, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      ctx.strokeStyle = '#ffc93c';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x + 90 + Math.cos(a) * 62, y + 90 + Math.sin(a) * 62);
      ctx.lineTo(x + 90 + Math.cos(a) * 80, y + 90 + Math.sin(a) * 80);
      ctx.stroke();
    }
    label(ctx, 'sunlight', x + 90, y + 190, 26, '#b7791f');
    // leaf
    const lx = x + w / 2 + 40;
    const ly = y + h / 2;
    ctx.fillStyle = '#3fae5a';
    ctx.beginPath();
    ctx.moveTo(lx - 190, ly + 40);
    ctx.bezierCurveTo(lx - 120, ly - 170, lx + 140, ly - 160, lx + 200, ly - 20);
    ctx.bezierCurveTo(lx + 120, ly + 130, lx - 100, ly + 150, lx - 190, ly + 40);
    ctx.fill();
    ctx.strokeStyle = '#1f7a38';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(lx - 190, ly + 40);
    ctx.quadraticCurveTo(lx, ly - 20, lx + 200, ly - 20);
    ctx.stroke();
    for (let i = -2; i <= 2; i++) {
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(lx + i * 60, ly - 10 - i * 4);
      ctx.lineTo(lx + i * 60 + 40, ly - 80);
      ctx.moveTo(lx + i * 60, ly - 10 - i * 4);
      ctx.lineTo(lx + i * 60 + 30, ly + 60);
      ctx.stroke();
    }
    label(ctx, 'chlorophyll', lx + 10, ly + 30, 26, '#ffffff');
    arrow(ctx, x + 160, y + 150, lx - 80, ly - 70, '#e0a21a', 6, 0.1);
    arrow(ctx, x + 60, y + h - 60, lx - 120, ly + 60, '#4b5563', 6, -0.15);
    label(ctx, 'CO₂ in', x + 90, y + h - 24, 28, '#374151');
    arrow(ctx, lx + 150, ly + 70, x + w - 60, y + h - 70, '#2563eb', 6, -0.2);
    label(ctx, 'O₂ out', x + w - 90, y + h - 24, 28, '#1d4ed8');
    arrow(ctx, lx + 60, y + h - 10, lx + 40, ly + 90, '#0ea5e9', 6);
    label(ctx, 'water from roots', lx + 150, y + h - 60, 24, '#0369a1');
    label(ctx, 'glucose (sugar) made here', lx + 10, ly - 140, 24, '#166534');
  },

  fractions(ctx, x, y, w, h) {
    ctx.fillStyle = '#fff4ea';
    roundRect(ctx, x, y, w, h, 24);
    ctx.fill();
    const pies = [
      [1, 2, '1/2'],
      [1, 4, '1/4'],
      [3, 4, '3/4'],
    ];
    pies.forEach(([n, d, text], i) => {
      const cx = x + w / 6 + (i * w) / 3;
      const cy = y + 140;
      const r = 90;
      for (let k = 0; k < d; k++) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, -Math.PI / 2 + (k / d) * Math.PI * 2, -Math.PI / 2 + ((k + 1) / d) * Math.PI * 2);
        ctx.closePath();
        ctx.fillStyle = k < n ? '#f97316' : '#fde7d4';
        ctx.fill();
        ctx.strokeStyle = '#7c2d12';
        ctx.lineWidth = 4;
        ctx.stroke();
      }
      label(ctx, text, cx, cy + r + 50, 40, '#7c2d12');
    });
    label(ctx, '1/2  +  1/4  =  3/4', x + w / 2, y + h - 30, 34, INK);
  },

  water(ctx, x, y, w, h) {
    const sky = ctx.createLinearGradient(0, y, 0, y + h);
    sky.addColorStop(0, '#bfe6ff');
    sky.addColorStop(1, '#e8f7ff');
    ctx.fillStyle = sky;
    roundRect(ctx, x, y, w, h, 24);
    ctx.fill();
    // sun
    ctx.fillStyle = '#ffcf33';
    ctx.beginPath();
    ctx.arc(x + 80, y + 80, 45, 0, Math.PI * 2);
    ctx.fill();
    // mountain
    ctx.fillStyle = '#6b8f71';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.45, y + h - 90);
    ctx.lineTo(x + w * 0.78, y + h * 0.35);
    ctx.lineTo(x + w, y + h * 0.55);
    ctx.lineTo(x + w, y + h - 90);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.72, y + h * 0.42);
    ctx.lineTo(x + w * 0.78, y + h * 0.35);
    ctx.lineTo(x + w * 0.84, y + h * 0.42);
    ctx.fill();
    // ocean
    ctx.fillStyle = '#2b7bd6';
    ctx.fillRect(x, y + h - 90, w, 90);
    label(ctx, 'collection', x + 170, y + h - 35, 28, '#ffffff');
    // cloud
    ctx.fillStyle = '#ffffff';
    [[0.42, 0.2, 55], [0.5, 0.16, 70], [0.6, 0.2, 55], [0.52, 0.24, 50]].forEach(([fx, fy, r]) => {
      ctx.beginPath();
      ctx.arc(x + w * fx, y + h * fy, r, 0, Math.PI * 2);
      ctx.fill();
    });
    label(ctx, 'condensation', x + w * 0.51, y + h * 0.2 + 95, 26, '#334155');
    // rain
    ctx.strokeStyle = '#2b7bd6';
    ctx.lineWidth = 4;
    for (let i = 0; i < 9; i++) {
      const rx = x + w * 0.62 + i * 18;
      const ry = y + h * 0.32 + (i % 3) * 22;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 8, ry + 30);
      ctx.stroke();
    }
    arrow(ctx, x + w * 0.2, y + h - 110, x + w * 0.36, y + h * 0.26, '#f59e0b', 7, 0.2);
    label(ctx, 'evaporation', x + w * 0.16, y + h * 0.5, 28, '#b45309');
    arrow(ctx, x + w * 0.68, y + h * 0.3, x + w * 0.8, y + h * 0.55, '#1d4ed8', 7, -0.2);
    label(ctx, 'precipitation', x + w * 0.83, y + h * 0.28, 26, '#1d4ed8');
    arrow(ctx, x + w * 0.62, y + h - 110, x + w * 0.4, y + h - 105, '#0f766e', 6, 0.15);
  },

  lighthouse(ctx, x, y, w, h) {
    const sky = ctx.createLinearGradient(0, y, 0, y + h);
    sky.addColorStop(0, '#1b1845');
    sky.addColorStop(1, '#3b3a7a');
    ctx.fillStyle = sky;
    roundRect(ctx, x, y, w, h, 24);
    ctx.fill();
    for (let i = 0; i < 50; i++) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(x + ((i * 173) % w), y + ((i * 61) % (h * 0.6)), 2.5, 2.5);
    }
    // beam
    ctx.fillStyle = 'rgba(255,236,150,0.35)';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.3, y + h * 0.3);
    ctx.lineTo(x + w, y + h * 0.1);
    ctx.lineTo(x + w, y + h * 0.42);
    ctx.fill();
    // sea
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(x, y + h * 0.72, w, h * 0.28);
    // rock + tower
    ctx.fillStyle = '#374151';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.3, y + h * 0.78, 140, 50, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f3f4f6';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.25, y + h * 0.76);
    ctx.lineTo(x + w * 0.27, y + h * 0.34);
    ctx.lineTo(x + w * 0.33, y + h * 0.34);
    ctx.lineTo(x + w * 0.35, y + h * 0.76);
    ctx.fill();
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(x + w * 0.262, y + h * 0.48, w * 0.077, 26);
    ctx.fillRect(x + w * 0.257, y + h * 0.62, w * 0.087, 26);
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(x + w * 0.27, y + h * 0.26, w * 0.06, h * 0.08);
    ctx.fillStyle = '#111827';
    ctx.fillRect(x + w * 0.26, y + h * 0.24, w * 0.08, 12);
    // boat
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.72, y + h * 0.74);
    ctx.lineTo(x + w * 0.88, y + h * 0.74);
    ctx.lineTo(x + w * 0.85, y + h * 0.8);
    ctx.lineTo(x + w * 0.75, y + h * 0.8);
    ctx.fill();
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(x + w * 0.79, y + h * 0.7, 10, 10);
    label(ctx, 'Gull Island', x + w * 0.3, y + h - 20, 26, '#c7d2fe');
  },
};

// ---------------------------------------------------------------- pages

export function drawPage(canvas, topic, side, pageNumber) {
  const ctx = canvas.getContext('2d');
  const page = topic[side];
  const W = PAGE_W;
  const H = PAGE_H;

  const paper = ctx.createLinearGradient(side === 'left' ? W : 0, 0, side === 'left' ? 0 : W, 0);
  paper.addColorStop(0, '#e9e1cf');
  paper.addColorStop(0.08, '#fbf7ee');
  paper.addColorStop(1, '#fffdf7');
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, W, H);

  const margin = 80;
  const width = W - margin * 2;
  let y = 90;

  if (side === 'left') {
    ctx.font = `700 26px ${BODY_FONT}`;
    ctx.fillStyle = topic.color;
    roundRect(ctx, margin, y - 40, ctx.measureText(topic.subject.toUpperCase()).width + 40, 48, 24);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(topic.subject.toUpperCase(), margin + 20, y - 7);
    y += 50;
  } else {
    y += 10;
  }

  ctx.font = `600 ${side === 'left' ? 68 : 54}px ${TITLE_FONT}`;
  ctx.fillStyle = topic.color;
  y = drawWrapped(ctx, page.title, margin, y + 40, width, 74) + 10;

  for (const block of page.blocks) {
    if (block.type === 'p') {
      ctx.font = `400 33px ${BODY_FONT}`;
      ctx.fillStyle = INK;
      y = drawWrapped(ctx, block.text, margin, y + 30, width, 46) + 8;
    } else if (block.type === 'h') {
      ctx.font = `700 38px ${BODY_FONT}`;
      ctx.fillStyle = topic.color;
      ctx.fillText(block.text, margin, y + 60);
      y += 76;
    } else if (block.type === 'note') {
      ctx.font = `700 30px ${BODY_FONT}`;
      const lines = wrapLines(ctx, block.text, width - 60);
      const boxH = lines.length * 42 + 40;
      ctx.fillStyle = '#fff3b0';
      roundRect(ctx, margin, y + 20, width, boxH, 18);
      ctx.fill();
      ctx.fillStyle = '#6b4f00';
      lines.forEach((l, i) => ctx.fillText(l, margin + 30, y + 70 + i * 42));
      y += boxH + 28;
    } else if (block.type === 'equation') {
      ctx.font = `700 36px ${BODY_FONT}`;
      ctx.fillStyle = '#f3f0ff';
      roundRect(ctx, margin, y + 20, width, 76, 16);
      ctx.fill();
      ctx.fillStyle = INK;
      ctx.textAlign = 'center';
      ctx.fillText(block.text, W / 2, y + 71);
      ctx.textAlign = 'left';
      y += 110;
    } else if (block.type === 'list') {
      ctx.font = `400 33px ${BODY_FONT}`;
      block.items.forEach((item, i) => {
        ctx.fillStyle = topic.color;
        ctx.font = `700 33px ${BODY_FONT}`;
        ctx.fillText(`${i + 1}.`, margin, y + 44);
        ctx.fillStyle = INK;
        ctx.font = `400 33px ${BODY_FONT}`;
        y = drawWrapped(ctx, item, margin + 50, y + 44, width - 50, 44) + 4;
      });
    } else if (block.type === 'vocab') {
      block.items.forEach(([word, meaning]) => {
        ctx.font = `700 33px ${BODY_FONT}`;
        ctx.fillStyle = topic.color;
        ctx.fillText(word, margin, y + 50);
        const wordW = ctx.measureText(word + '  ').width;
        ctx.font = `400 31px ${BODY_FONT}`;
        ctx.fillStyle = SOFT_INK;
        y = drawWrapped(ctx, `— ${meaning}`, margin + wordW, y + 50, width - wordW, 42) + 2;
      });
    } else if (block.type === 'diagram') {
      DIAGRAMS[block.kind](ctx, margin, y + 20, width, block.height);
      y += block.height + 30;
    }
  }

  ctx.font = `400 26px ${BODY_FONT}`;
  ctx.fillStyle = SOFT_INK;
  ctx.textAlign = side === 'left' ? 'left' : 'right';
  ctx.fillText(String(pageNumber), side === 'left' ? margin : W - margin, H - 50);
  ctx.textAlign = 'left';
}

// ---------------------------------------------------------------- monitor

function drawTable(ctx, x, y, w, columns, rows, accent) {
  const colW = w / columns.length;
  const rowH = 62;
  ctx.fillStyle = accent;
  roundRect(ctx, x, y, w, rowH, 10);
  ctx.fill();
  ctx.font = `700 28px ${UI_FONT}`;
  ctx.fillStyle = '#fff';
  columns.forEach((c, i) => ctx.fillText(c, x + i * colW + 20, y + 41));
  rows.forEach((row, r) => {
    const ry = y + rowH * (r + 1);
    ctx.fillStyle = r % 2 ? '#f4f4fb' : '#ffffff';
    ctx.fillRect(x, ry, w, rowH);
    ctx.font = `500 28px ${UI_FONT}`;
    ctx.fillStyle = '#1f1d2b';
    row.forEach((cell, i) => ctx.fillText(cell, x + i * colW + 20, ry + 41));
  });
  return y + rowH * (rows.length + 1);
}

export function drawMonitor(canvas, topic, now = new Date()) {
  const ctx = canvas.getContext('2d');
  const W = MONITOR_W;
  const H = MONITOR_H;
  const m = topic.monitor;

  // wallpaper
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#180d3e');
  bg.addColorStop(1, '#4023a4');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // taskbar
  ctx.fillStyle = 'rgba(10,8,25,0.85)';
  ctx.fillRect(0, H - 56, W, 56);
  ctx.font = `500 24px ${UI_FONT}`;
  ctx.fillStyle = '#e5e7eb';
  ctx.textAlign = 'right';
  ctx.fillText(now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), W - 30, H - 20);
  ctx.textAlign = 'left';
  ['#8b5cf6', '#22c55e', '#f97316', '#0ea5e9'].forEach((c, i) => {
    ctx.fillStyle = c;
    roundRect(ctx, 24 + i * 56, H - 46, 36, 36, 8);
    ctx.fill();
  });

  // window
  const wx = 70;
  const wy = 40;
  const ww = W - 140;
  const wh = H - 140;
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, wx, wy, ww, wh, 18);
  ctx.fill();
  ctx.fillStyle = '#ecebf5';
  roundRect(ctx, wx, wy, ww, 58, [18, 18, 0, 0]);
  ctx.fill();
  ['#ef4444', '#f59e0b', '#22c55e'].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(wx + 32 + i * 30, wy + 29, 9, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.font = `700 26px ${UI_FONT}`;
  ctx.fillStyle = '#3b3752';
  ctx.fillText(m.app, wx + 140, wy + 38);

  const px = wx + 50;
  const pw = ww - 100;
  let y = wy + 130;
  ctx.font = `700 46px ${UI_FONT}`;
  ctx.fillStyle = topic.color;
  ctx.fillText(m.heading, px, y);
  y += 40;

  ctx.fillStyle = '#1f1d2b';
  if (m.kind === 'table') {
    y = drawTable(ctx, px, y, pw, m.columns, m.rows, topic.color) + 30;
  } else if (m.kind === 'lab') {
    ctx.font = `500 30px ${UI_FONT}`;
    m.steps.forEach((s, i) => {
      ctx.fillText(`${i + 1}. ${s}`, px, y + 30 + i * 44);
    });
    y = drawTable(ctx, px, y + 30 + m.steps.length * 44, pw * 0.6, m.columns, m.rows, topic.color) + 30;
  } else if (m.kind === 'problem') {
    ctx.font = `500 38px ${UI_FONT}`;
    y = drawWrapped(ctx, m.body, px, y + 40, pw, 54) + 20;
    ctx.fillStyle = '#fff7ed';
    roundRect(ctx, px, y, pw, 70, 12);
    ctx.fill();
    ctx.fillStyle = '#9a3412';
    ctx.font = `500 30px ${UI_FONT}`;
    ctx.fillText(m.hint, px + 24, y + 45);
    y += 120;
    ctx.fillStyle = '#1f1d2b';
    ctx.font = `700 40px ${UI_FONT}`;
    ctx.fillText(m.answer, px, y);
    y += 40;
  } else if (m.kind === 'weather') {
    m.forecast.forEach(([when, sky, temp], i) => {
      const cx = px + i * (pw / 3);
      ctx.fillStyle = '#eff6ff';
      roundRect(ctx, cx, y + 10, pw / 3 - 24, 170, 16);
      ctx.fill();
      ctx.fillStyle = '#1e3a8a';
      ctx.font = `500 28px ${UI_FONT}`;
      ctx.fillText(when, cx + 24, y + 56);
      ctx.font = `700 44px ${UI_FONT}`;
      ctx.fillText(temp, cx + 24, y + 116);
      ctx.font = `500 28px ${UI_FONT}`;
      ctx.fillText(sky, cx + 24, y + 160);
    });
    y += 230;
    ctx.fillStyle = '#334155';
    ctx.font = `500 30px ${UI_FONT}`;
    ctx.fillText(m.stats.join('   ·   '), px, y);
    y += 30;
  } else if (m.kind === 'doc') {
    ctx.font = `500 32px ${UI_FONT}`;
    y = drawWrapped(ctx, m.body, px, y + 40, pw, 46) + 20;
    ctx.font = `700 30px ${UI_FONT}`;
    ctx.fillText('Rubric', px, y + 20);
    ctx.font = `500 28px ${UI_FONT}`;
    m.rubric.forEach((r, i) => ctx.fillText(`☐  ${r}`, px, y + 64 + i * 40));
    y += 64 + m.rubric.length * 40;
  }

  ctx.fillStyle = '#f3f0ff';
  roundRect(ctx, px, wy + wh - 110, pw, 76, 14);
  ctx.fill();
  ctx.fillStyle = '#3b2a8a';
  ctx.font = `600 30px ${UI_FONT}`;
  drawWrapped(ctx, m.question, px + 24, wy + wh - 62, pw - 48, 38);
}
