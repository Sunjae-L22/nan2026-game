// simulate.mjs — headless balance bot. Plays like a human at a given casting cadence:
// draws (interval), casts a sensible unlocked spell at the densest cluster, drafts greedily.
// Usage: node training/simulate.mjs
import { createGame, update, TUNE, pickDraft, setDraftProvider, densestPoint } from '../src/game.js';
import { SPELLS, castByIndex } from '../src/spells.js';
import { cardProvider } from '../src/cards.js';

setDraftProvider(cardProvider);

const IDX = Object.fromEntries(SPELLS.map((s, i) => [s.key, i]));
const DRAFT_PRIORITY = ['star', 'circle', 'cloud', 'campfire', 'square', 'triangle'];

function botCast(g, conf) {
  const u = g.unlocked;
  const n = g.monsters.length;
  const t = n ? densestPoint(g) : null;
  if (g.gateHP < 55 && g.shield <= 0 && u.has(IDX.circle)) return castByIndex(g, IDX.circle, conf);
  if (n >= 3 && u.has(IDX.star)) return castByIndex(g, IDX.star, conf, t);
  if (n >= 4 && u.has(IDX.cloud) && !g.zones.some(z => z.kind === 'poison')) return castByIndex(g, IDX.cloud, conf, t);
  if (n >= 2 && u.has(IDX.lightning)) return castByIndex(g, IDX.lightning, conf, t);
  if (n >= 1 && u.has(IDX.sword)) return castByIndex(g, IDX.sword, conf, t);
  if (u.has(IDX.campfire) && n >= 2 && !g.zones.some(z => z.kind === 'fire')) return castByIndex(g, IDX.campfire, conf);
  return false;
}

function playOne(seed, interval, conf) {
  const g = createGame({ seed });
  g.state = 'playing';
  let castTimer = 1.5, maxWave = 0;
  for (let step = 0; step < 60 * 600; step++) {
    update(g, 1 / 60);
    maxWave = Math.max(maxWave, g.wave);
    if (g.pendingDraft) {
      const unlockPick = DRAFT_PRIORITY.map(k => `unlock:${IDX[k]}`).find(id => g.pendingDraft.includes(id));
      const modPick = ['power', 'repair', 'gatemax'].find(id => g.pendingDraft.includes(id));
      pickDraft(g, unlockPick ?? modPick ?? g.pendingDraft[0]);
    }
    castTimer -= 1 / 60;
    if (castTimer <= 0 && g.state === 'playing') {
      botCast(g, conf);
      castTimer = interval * (0.85 + Math.random() * 0.3);
    }
    if (g.state !== 'playing') break;
  }
  return { win: g.state === 'win', maxWave, gate: g.gateHP, score: g.score };
}

const N = 30;
console.log('profile      interval conf | win%  avgMaxWave  avgGate(win)');
for (const [name, interval, conf] of [['casual', 3.2, 0.75], ['mid', 2.4, 0.85], ['skilled', 1.8, 0.92]]) {
  let wins = 0, waveSum = 0, gateSum = 0;
  for (let s = 0; s < N; s++) {
    const r = playOne(1000 + s * 17, interval, conf);
    wins += r.win; waveSum += r.maxWave; gateSum += r.win ? r.gate : 0;
  }
  console.log(`${name.padEnd(12)} ${String(interval).padStart(8)} ${conf}  | ${String(Math.round(wins / N * 100)).padStart(3)}%  ${(waveSum / N).toFixed(1).padStart(9)}  ${wins ? (gateSum / wins).toFixed(0).padStart(8) : '     n/a'}`);
}
