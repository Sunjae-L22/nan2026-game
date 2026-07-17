// render.js — draws the battlefield in a hand-drawn doodle style. No game logic here.
import { FIELD, TUNE } from './game.js';
import { SPELLS } from './spells.js';

const ZCOLOR = { spike: '#9bf6a3', poison: '#b47cff', fire: '#ff6b6b' };

export function render(ctx, g, fx, w, h, time) {
  ctx.clearRect(0, 0, w, h);
  const scale = Math.min(w / FIELD.W, h / FIELD.H);
  const offX = (w - FIELD.W * scale) / 2, offY = (h - FIELD.H * scale) / 2;
  ctx.save();
  const sx = (Math.random() - 0.5) * fx.shake, sy = (Math.random() - 0.5) * fx.shake;
  ctx.translate(offX + sx, offY + sy);
  ctx.scale(scale, scale);

  // paper background
  ctx.fillStyle = '#171b2e';
  ctx.fillRect(0, 0, FIELD.W, FIELD.H);
  ctx.strokeStyle = 'rgba(255,255,255,0.045)';
  ctx.lineWidth = 1;
  for (let x = 40; x < FIELD.W; x += 40) line(ctx, x, 0, x, FIELD.H);
  for (let y = 40; y < FIELD.H; y += 40) line(ctx, 0, y, FIELD.W, y);

  // gate (left edge)
  ctx.strokeStyle = g.shield > 0 ? '#4cc9f0' : '#e8ecf1';
  ctx.lineWidth = 3;
  wobblyRect(ctx, 2, 20, 26, FIELD.H - 40, time);
  ctx.strokeStyle = 'rgba(232,236,241,0.4)';
  ctx.lineWidth = 2;
  for (let y = 40; y < FIELD.H - 30; y += 34) line(ctx, 4, y, 26, y + 12);
  if (g.shield > 0) {
    ctx.strokeStyle = 'rgba(76,201,240,0.5)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(16, FIELD.H / 2, 70 + Math.sin(time * 5) * 4, -1.2, 1.2);
    ctx.stroke();
  }

  // zones
  for (const z of g.zones) {
    const c = ZCOLOR[z.kind] || '#fff';
    ctx.strokeStyle = c;
    ctx.fillStyle = c + '22';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([9, 7]);
    ctx.beginPath();
    ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    if (z.kind === 'spike') {
      ctx.strokeStyle = c;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + time * 0.7;
        tri(ctx, z.x + Math.cos(a) * z.r * 0.55, z.y + Math.sin(a) * z.r * 0.55, 9);
      }
    }
    if (z.kind === 'fire' || z.kind === 'poison') {
      for (let i = 0; i < 4; i++) {
        const a = time * (z.kind === 'fire' ? 3 : 1.2) + i * 1.7;
        const rr = z.r * (0.25 + 0.35 * ((Math.sin(a * 1.3 + i) + 1) / 2));
        ctx.beginPath();
        ctx.arc(z.x + Math.cos(a) * rr, z.y + Math.sin(a * 0.8) * rr * 0.7, 6 + 3 * Math.sin(a * 2), 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  // walls
  for (const wl of g.walls) {
    ctx.strokeStyle = '#c9a97c';
    ctx.fillStyle = 'rgba(201,169,124,0.15)';
    ctx.lineWidth = 3;
    wobblyRect(ctx, wl.x, wl.y, wl.w, wl.h, time);
    ctx.fillRect(wl.x, wl.y, wl.w, wl.h);
    ctx.lineWidth = 1.5;
    for (let y = wl.y + 12; y < wl.y + wl.h; y += 26) line(ctx, wl.x, y, wl.x + wl.w, y + 8);
    hpBar(ctx, wl.x + wl.w / 2, wl.y - 10, 40, wl.hp / wl.maxHp, '#c9a97c');
  }

  // monsters — wobbly doodle blobs
  for (const m of g.monsters) {
    const t = time * 3 + m.wobble;
    ctx.strokeStyle = m.hitFlash > 0 ? '#ffffff' : '#ff8fa3';
    ctx.fillStyle = m.hitFlash > 0 ? 'rgba(255,255,255,0.35)' : 'rgba(255,143,163,0.13)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const N = 10;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      const r = m.radius * (1 + 0.13 * Math.sin(a * 3 + t) + 0.07 * Math.sin(a * 5 - t * 1.4));
      const px = m.x + Math.cos(a) * r, py = m.y + Math.sin(a) * r;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // eyes + angry brows
    ctx.fillStyle = '#1b1e2e';
    const ex = m.x - m.radius * 0.3, ey = m.y - m.radius * 0.15;
    ctx.beginPath(); ctx.arc(ex, ey, 2.6, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(ex + m.radius * 0.55, ey, 2.6, 0, 7); ctx.fill();
    ctx.strokeStyle = '#1b1e2e'; ctx.lineWidth = 2;
    line(ctx, ex - 4, ey - 7, ex + 4, ey - 4);
    line(ctx, ex + m.radius * 0.55 + 4, ey - 7, ex + m.radius * 0.55 - 4, ey - 4);
    if (m.hp < m.maxHp) hpBar(ctx, m.x, m.y - m.radius - 10, 34, m.hp / m.maxHp, '#ff8fa3');
  }

  // fx: bolts, rings, particles, texts
  for (const b of fx.bolts) {
    ctx.strokeStyle = '#ffe45e';
    ctx.lineWidth = 3.5;
    ctx.globalAlpha = Math.min(1, b.ttl / 0.12);
    for (let i = 0; i < b.chain.length - 1; i++) zigline(ctx, b.chain[i], b.chain[i + 1]);
    if (b.chain.length === 1) zigline(ctx, { x: b.chain[0].x, y: b.chain[0].y - 140 }, b.chain[0]);
    ctx.globalAlpha = 1;
  }
  for (const r of fx.rings) {
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 3;
    ctx.globalAlpha = Math.max(0, r.ttl / 0.35);
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  for (const p of fx.parts) {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.min(1, p.ttl * 2);
    ctx.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r);
    ctx.globalAlpha = 1;
  }
  ctx.font = 'bold 15px system-ui';
  for (const t of fx.texts) {
    ctx.fillStyle = t.color;
    ctx.globalAlpha = Math.min(1, t.ttl * 2);
    ctx.font = `bold ${t.size}px system-ui`;
    ctx.fillText(t.str, t.x, t.y);
    ctx.globalAlpha = 1;
  }

  // HUD (inside field coords)
  ctx.fillStyle = '#e8ecf1';
  ctx.font = 'bold 17px system-ui';
  ctx.fillText(g.wave > 0 ? `WAVE ${Math.min(g.wave, TUNE.waves)}/${TUNE.waves}` : 'READY', 44, 30);
  ctx.fillText(`SCORE ${g.score}`, 160, 30);
  // gate HP bar
  ctx.font = '13px system-ui';
  ctx.fillText('GATE', 44, 53);
  hpBar(ctx, 90 + 125, 48, 250, g.gateHP / TUNE.gateHP, g.gateHP < 30 ? '#ff6b6b' : '#9bf6a3');
  if (g.shield > 0) {
    ctx.fillStyle = '#4cc9f0';
    ctx.fillText(`SHIELD ${Math.ceil(g.shield)}`, 352, 53);
  }

  if (fx.flash) {
    ctx.fillStyle = fx.flash.color;
    ctx.fillRect(0, 0, FIELD.W, FIELD.H);
  }
  ctx.restore();
}

function line(ctx, x0, y0, x1, y1) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
function tri(ctx, x, y, s) {
  ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.87, y + s * 0.5); ctx.lineTo(x - s * 0.87, y + s * 0.5); ctx.closePath(); ctx.stroke();
}
function wobblyRect(ctx, x, y, w, h, time) {
  const j = (i) => Math.sin(time * 2 + i * 13.7) * 1.6;
  ctx.beginPath();
  ctx.moveTo(x + j(1), y + j(2));
  ctx.lineTo(x + w + j(3), y + j(4));
  ctx.lineTo(x + w + j(5), y + h + j(6));
  ctx.lineTo(x + j(7), y + h + j(8));
  ctx.closePath();
  ctx.stroke();
}
function zigline(ctx, a, b) {
  const segs = 6;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  for (let i = 1; i < segs; i++) {
    const t = i / segs;
    const nx = -(b.y - a.y), ny = b.x - a.x;
    const nl = Math.hypot(nx, ny) || 1;
    const off = (Math.random() - 0.5) * 22;
    ctx.lineTo(a.x + (b.x - a.x) * t + (nx / nl) * off, a.y + (b.y - a.y) * t + (ny / nl) * off);
  }
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}
function hpBar(ctx, cx, cy, w, ratio, color) {
  const r = Math.max(0, Math.min(1, ratio));
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(cx - w / 2, cy - 4, w, 7);
  ctx.fillStyle = color;
  ctx.fillRect(cx - w / 2, cy - 4, w * r, 7);
}

// Tiny glyphs for the spell legend (drawn once per legend canvas)
export function drawGlyph(ctx, key, s) {
  ctx.clearRect(0, 0, s, s);
  ctx.strokeStyle = SPELLS.find((sp) => sp.key === key).color;
  ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const u = s / 28;
  const P = (pts) => { ctx.beginPath(); ctx.moveTo(pts[0][0] * u, pts[0][1] * u); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] * u, pts[i][1] * u); ctx.stroke(); };
  switch (key) {
    case 'lightning': P([[17, 3], [9, 14], [16, 15], [10, 25]]); break;
    case 'circle': ctx.beginPath(); ctx.arc(14 * u, 14 * u, 9 * u, 0, Math.PI * 2); ctx.stroke(); break;
    case 'triangle': P([[14, 5], [23, 23], [5, 23], [14, 5]]); break;
    case 'star': P([[14, 4], [17, 11], [25, 11], [19, 16], [21, 24], [14, 19], [7, 24], [9, 16], [3, 11], [11, 11], [14, 4]]); break;
    case 'cloud': ctx.beginPath(); ctx.arc(9 * u, 17 * u, 5 * u, Math.PI * 0.4, Math.PI * 1.6); ctx.arc(14 * u, 11 * u, 6 * u, Math.PI * 0.9, Math.PI * 2.05); ctx.arc(20 * u, 16 * u, 5 * u, Math.PI * 1.3, Math.PI * 0.6); ctx.closePath(); ctx.stroke(); break;
    case 'sword': P([[6, 22], [18, 6]]); P([[15, 3], [21, 9]]); P([[10, 15], [15, 20]]); P([[7, 25], [5, 23]]); break;
    case 'square': P([[6, 6], [22, 6], [22, 22], [6, 22], [6, 6]]); break;
    case 'campfire': P([[8, 25], [20, 19]]); P([[8, 19], [20, 25]]); P([[14, 4], [10, 12], [14, 10], [12, 17]]); break;
  }
}
