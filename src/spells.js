// spells.js — the 8 drawable spells. Order MUST match model classes:
// ["lightning","circle","triangle","star","cloud","sword","square","campfire"]
// power = 0.5 + confidence (so a clean drawing hits ~1.5x a sloppy one).
import { FIELD, damageMonster, frontmost, densestPoint, nearest, emit } from './game.js';

let zoneId = 1;

export const SPELLS = [
  {
    key: 'lightning', name: '체인 라이트닝', color: '#ffe45e',
    desc: 'Chains between up to 4 monsters',
    cast(g, p) {
      const first = frontmost(g, 1)[0];
      if (!first) return false;
      const hit = new Set();
      let cur = first, dmg = 26 * p;
      const chain = [];
      for (let i = 0; i < 4 && cur; i++) {
        damageMonster(g, cur, dmg);
        hit.add(cur.id);
        chain.push({ x: cur.x, y: cur.y });
        dmg *= 0.72;
        cur = nearest(g, cur.x, cur.y, hit);
        if (cur && chain.length) {
          const last = chain[chain.length - 1];
          const d = (cur.x - last.x) ** 2 + (cur.y - last.y) ** 2;
          if (d > 220 * 220) cur = null;
        }
      }
      emit(g, 'fx_lightning', { chain });
      return true;
    },
  },
  {
    key: 'circle', name: '보호막', color: '#4cc9f0',
    desc: 'Shield absorbs gate damage',
    cast(g, p) {
      g.shield = Math.max(g.shield, 55 * p);
      g.shieldTTL = 8;
      emit(g, 'fx_shield', {});
      return true;
    },
  },
  {
    key: 'triangle', name: '가시 함정', color: '#9bf6a3',
    desc: 'Spike trap, hits first 3 monsters',
    cast(g, p) {
      const front = frontmost(g, 1)[0];
      const x = front ? Math.max(90, front.x - 70) : FIELD.W * 0.35;
      const y = front ? front.y : FIELD.H * 0.5;
      g.zones.push({ id: zoneId++, kind: 'spike', x, y, r: 46, ttl: 12, hit: 30 * p, hits: 3 });
      emit(g, 'fx_spike', { x, y });
      return true;
    },
  },
  {
    key: 'star', name: '대폭발', color: '#ff9e5e',
    desc: 'Blast at the densest cluster',
    cast(g, p) {
      const c = densestPoint(g);
      const r = 120;
      for (const m of [...g.monsters]) {
        const dx = m.x - c.x, dy = m.y - c.y;
        const d2 = dx * dx + dy * dy;
        if (d2 <= r * r) damageMonster(g, m, 34 * p * (1 - Math.sqrt(d2) / (r * 1.6)));
      }
      emit(g, 'fx_blast', { x: c.x, y: c.y, r });
      return true;
    },
  },
  {
    key: 'cloud', name: '독구름', color: '#b47cff',
    desc: 'Poison cloud: DoT + slow',
    cast(g, p) {
      const c = densestPoint(g);
      g.zones.push({ id: zoneId++, kind: 'poison', x: c.x, y: c.y, r: 95, ttl: 5, dps: 9 * p, slow: 0.55 });
      emit(g, 'fx_cloud', { x: c.x, y: c.y });
      return true;
    },
  },
  {
    key: 'sword', name: '참격', color: '#e8ecf1',
    desc: 'Heavy strike on the frontmost',
    cast(g, p) {
      const t = frontmost(g, 1)[0];
      if (!t) return false;
      damageMonster(g, t, 55 * p);
      emit(g, 'fx_slash', { x: t.x, y: t.y });
      return true;
    },
  },
  {
    key: 'square', name: '돌벽', color: '#c9a97c',
    desc: 'Wall blocks the path',
    cast(g, p) {
      const front = frontmost(g, 1)[0];
      const x = front ? Math.max(60, front.x - 90) : FIELD.W * 0.3;
      g.walls.push({ x, y: 40, w: 26, h: FIELD.H - 80, hp: 80 * p, maxHp: 80 * p, ttl: 10 });
      emit(g, 'fx_wall', { x });
      return true;
    },
  },
  {
    key: 'campfire', name: '화염 장판', color: '#ff6b6b',
    desc: 'Burning zone in front of the gate',
    cast(g, p) {
      g.zones.push({ id: zoneId++, kind: 'fire', x: 110, y: FIELD.H / 2, r: 110, ttl: 6, dps: 14 * p });
      emit(g, 'fx_fire', {});
      return true;
    },
  },
];

// classIdx must match model.classes order. Returns false if the cast fizzled (no target).
export function castByIndex(g, classIdx, confidence) {
  const spell = SPELLS[classIdx];
  if (!spell || g.state !== 'playing' || !g.unlocked.has(classIdx)) return false;
  const p = 0.5 + confidence;
  const ok = spell.cast(g, p);
  if (ok) { g.casts += 1; emit(g, 'cast', { key: spell.key, confidence }); }
  return ok;
}
