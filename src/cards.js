// cards.js — the draft card pool: spell unlocks + stackable upgrade cards.
// game.js knows nothing about card content; this module is registered as the draft provider.
import { TUNE, emit } from './game.js';

// classes order: lightning,circle,triangle,star,cloud,sword,square,campfire
const L = { lightning: 0, circle: 1, triangle: 2, star: 3, cloud: 4, sword: 5, square: 6, campfire: 7 };

export const MOD_CARDS = {
  power:   { name: '마력 증폭',   desc: '모든 마법 위력 +10%',            emoji: '✨', max: 5,
             apply: (g) => { g.mods.power += 0.10; } },
  repair:  { name: '성문 수리',   desc: '성문 HP 30 즉시 회복',           emoji: '🔨', max: 99,
             elig: (g) => g.gateHP < g.gateMaxHP - 10,
             apply: (g) => { g.gateHP = Math.min(g.gateMaxHP, g.gateHP + 30); } },
  gatemax: { name: '성문 보강',   desc: '성문 최대 HP +25% (즉시 +25)',   emoji: '🏰', max: 2,
             apply: (g) => { g.gateMaxHP += TUNE.gateHP * 0.25; g.gateHP += TUNE.gateHP * 0.25; } },
  perfect: { name: '완벽주의',    desc: 'PERFECT 판정 3%p 완화',          emoji: '🎯', max: 2,
             apply: (g) => { g.mods.perfect += 1; } },
  chain:   { name: '전도체',      desc: '체인 라이트닝 점프 +1',          emoji: '⚡', max: 2, needs: L.lightning,
             apply: (g) => { g.mods.chain += 1; } },
  starR:   { name: '초신성',      desc: '대폭발 반경 +30%',               emoji: '💥', max: 2, needs: L.star,
             apply: (g) => { g.mods.star += 1; } },
  shield:  { name: '수호 문양',   desc: '보호막 흡수량 +40%',             emoji: '🛡️', max: 2, needs: L.circle,
             apply: (g) => { g.mods.shield += 1; } },
  wall:    { name: '철벽',        desc: '돌벽 내구도 +60%',               emoji: '🧱', max: 2, needs: L.square,
             apply: (g) => { g.mods.wall += 1; } },
  cloudS:  { name: '맹독',        desc: '독구름 감속 강화 + 지속 +1.5초', emoji: '☠️', max: 1, needs: L.cloud,
             apply: (g) => { g.mods.cloud += 1; } },
  fireD:   { name: '겁화',        desc: '화염 장판 피해 +40%',            emoji: '🔥', max: 2, needs: L.campfire,
             apply: (g) => { g.mods.fire += 1; } },
  spikes:  { name: '가시 증식',   desc: '가시 함정 타격 횟수 +2',         emoji: '🌵', max: 2, needs: L.triangle,
             apply: (g) => { g.mods.spike += 1; } },
  swordD:  { name: '예리함',      desc: '참격 피해 +35%',                 emoji: '🗡️', max: 2, needs: L.sword,
             apply: (g) => { g.mods.sword += 1; } },
};

export function cardInfo(id, spells) {
  if (id.startsWith('unlock:')) {
    const ci = parseInt(id.slice(7), 10);
    return { unlock: ci, name: spells[ci].name, desc: spells[ci].desc, isNew: true };
  }
  const c = MOD_CARDS[id];
  return { name: c.name, desc: c.desc, emoji: c.emoji };
}

export const cardProvider = {
  build(g) {
    const pool = [];
    for (let i = 0; i < TUNE.numSpells; i++) if (!g.unlocked.has(i)) pool.push(`unlock:${i}`);
    for (const [id, c] of Object.entries(MOD_CARDS)) {
      if ((g.cardCounts[id] || 0) >= c.max) continue;
      if (c.needs !== undefined && !g.unlocked.has(c.needs)) continue;
      if (c.elig && !c.elig(g)) continue;
      pool.push(id);
    }
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(g.rng() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, TUNE.draftSize);
  },
  apply(g, id) {
    if (id.startsWith('unlock:')) {
      const ci = parseInt(id.slice(7), 10);
      if (g.unlocked.has(ci)) return false;
      g.unlocked.add(ci);
      emit(g, 'unlock', { classIdx: ci });
      return true;
    }
    const c = MOD_CARDS[id];
    if (!c) return false;
    c.apply(g);
    g.cardCounts[id] = (g.cardCounts[id] || 0) + 1;
    emit(g, 'cardPicked', { id });
    return true;
  },
};
