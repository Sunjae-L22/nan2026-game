// fx.js — particles, floating text, transient effects. Renderer-side only.
export function createFx() {
  return { parts: [], texts: [], bolts: [], rings: [], shake: 0, flash: null };
}

export function fxUpdate(fx, dt) {
  for (const p of fx.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g || 0) * dt; p.ttl -= dt; }
  fx.parts = fx.parts.filter((p) => p.ttl > 0);
  for (const t of fx.texts) { t.y -= 26 * dt; t.ttl -= dt; }
  fx.texts = fx.texts.filter((t) => t.ttl > 0);
  for (const b of fx.bolts) b.ttl -= dt;
  fx.bolts = fx.bolts.filter((b) => b.ttl > 0);
  for (const r of fx.rings) { r.r += r.vr * dt; r.ttl -= dt; }
  fx.rings = fx.rings.filter((r) => r.ttl > 0);
  fx.shake = Math.max(0, fx.shake - dt * 30);
  if (fx.flash) { fx.flash.ttl -= dt; if (fx.flash.ttl <= 0) fx.flash = null; }
}

export function burst(fx, x, y, color, n = 12, speed = 140) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random() * 0.8);
    fx.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 160, r: 2 + Math.random() * 3, color, ttl: 0.5 + Math.random() * 0.4 });
  }
}

export function floatText(fx, x, y, str, color = '#fff', size = 16) {
  fx.texts.push({ x, y, str, color, size, ttl: 0.8 });
}

// Consume game events → effects
export function handleEvents(fx, g, events) {
  for (const e of events) {
    switch (e.type) {
      case 'damage': floatText(fx, e.x, e.y - 18, `${e.amount}`, '#ffd166', 15); break;
      case 'kill': burst(fx, e.x, e.y, '#ff9e5e', 16); fx.shake = Math.max(fx.shake, 4); break;
      case 'spikeHit': burst(fx, e.x, e.y, '#9bf6a3', 8, 100); break;
      case 'fx_lightning':
        fx.bolts.push({ chain: e.chain, ttl: 0.22 });
        fx.shake = Math.max(fx.shake, 5);
        break;
      case 'fx_blast':
        fx.rings.push({ x: e.x, y: e.y, r: 20, vr: 340, color: '#ff9e5e', ttl: 0.35 });
        burst(fx, e.x, e.y, '#ff9e5e', 26, 220);
        fx.shake = Math.max(fx.shake, 8);
        break;
      case 'fx_slash': burst(fx, e.x, e.y, '#e8ecf1', 14, 190); fx.shake = Math.max(fx.shake, 5); break;
      case 'fx_shield': fx.rings.push({ x: 30, y: 260, r: 30, vr: 160, color: '#4cc9f0', ttl: 0.4 }); break;
      case 'fx_cloud': fx.rings.push({ x: e.x, y: e.y, r: 40, vr: 120, color: '#b47cff', ttl: 0.4 }); break;
      case 'fx_fire': fx.rings.push({ x: 110, y: 260, r: 40, vr: 150, color: '#ff6b6b', ttl: 0.4 }); break;
      case 'fx_wall': burst(fx, e.x + 13, 260, '#c9a97c', 20, 160); break;
      case 'fx_spike': burst(fx, e.x, e.y, '#9bf6a3', 10, 120); break;
      case 'wave': fx.flash = { color: 'rgba(255,255,255,0.08)', ttl: 0.3 }; break;
      case 'lose': fx.shake = 12; fx.flash = { color: 'rgba(255,60,60,0.25)', ttl: 0.6 }; break;
      case 'win': fx.flash = { color: 'rgba(120,255,160,0.2)', ttl: 0.8 }; break;
    }
  }
}
