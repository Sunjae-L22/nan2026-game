// Lightweight test runner for game logic. Usage: node tests/run.mjs
import { createGame, startGame, update, TUNE, FIELD, damageMonster } from '../src/game.js';
import { SPELLS, castByIndex } from '../src/spells.js';

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log(`  ok  ${name}`); }
  catch (e) { fail++; console.log(`FAIL  ${name}: ${e.message}`); }
}
function eq(a, b, msg = '') { if (a !== b) throw new Error(`${msg} expected ${b}, got ${a}`); }
function ok(v, msg = '') { if (!v) throw new Error(`${msg} (falsy)`); }
function run(g, seconds, step = 1 / 60) { for (let i = 0; i < seconds / step; i++) update(g, step); }
function fresh() { const g = createGame({ seed: 7 }); g.state = 'playing'; return g; }
function calm(g) { g.waveTimer = 1e9; return g; } // freeze wave spawning for isolated tests
const IDX = Object.fromEntries(SPELLS.map((s, i) => [s.key, i]));

t('title state does not simulate', () => {
  const g = createGame(); run(g, 5); eq(g.wave, 0); eq(g.monsters.length, 0);
});

t('wave 1 spawns correct count', () => {
  const g = fresh(); run(g, 1.3 + TUNE.waveCount(1) * TUNE.spawnInterval + 0.1);
  eq(g.wave, 1);
  eq(g.monsters.length, TUNE.waveCount(1), 'monsters');
});

t('monsters march toward gate and damage it', () => {
  const g = fresh(); run(g, 30);
  ok(g.gateHP < TUNE.gateHP, 'gate should have taken damage by 30s with no player action');
});

t('gate reaching 0 → lose', () => {
  const g = fresh(); run(g, 120);
  eq(g.state, 'lose');
  eq(g.gateHP, 0);
});

t('sword kills a weak monster and scores', () => {
  const g = fresh(); run(g, 2.5); // one monster out
  ok(g.monsters.length >= 1);
  const before = g.monsters.length;
  const okCast = castByIndex(g, IDX.sword, 1.0); // power 1.5 → 82.5 dmg vs 27hp
  ok(okCast, 'cast should succeed');
  update(g, 1 / 60);
  eq(g.monsters.length, before - 1, 'one monster dead');
  eq(g.kills, 1);
  ok(g.score >= TUNE.scoreKill, 'score');
});

t('sword fizzles with no target (no cast counted)', () => {
  const g = fresh();
  const before = g.casts;
  eq(castByIndex(g, IDX.sword, 0.9), false);
  eq(g.casts, before);
});

t('lightning chains up to 4', () => {
  const g = calm(fresh());
  for (let i = 0; i < 5; i++) g.monsters.push({ id: 100 + i, x: 300 + i * 30, y: 200, hp: 10, maxHp: 10, speed: 0, dps: 0, radius: 16 });
  castByIndex(g, IDX.lightning, 1.0);
  update(g, 1 / 60);
  eq(g.monsters.length, 1, '4 of 5 should die (10hp each, chain dmg 39/28/20/14.6)');
});

t('shield absorbs gate damage', () => {
  const g = fresh();
  g.monsters.push({ id: 900, x: 10, y: 200, hp: 1000, maxHp: 1000, speed: 50, dps: 10, radius: 16 });
  castByIndex(g, IDX.circle, 1.0); // shield 82.5
  run(g, 3);
  eq(Math.round(g.gateHP), TUNE.gateHP, 'gate untouched while shield holds');
  ok(g.shield < 82.5, 'shield consumed');
});

t('shield expires after TTL', () => {
  const g = fresh();
  castByIndex(g, IDX.circle, 1.0);
  run(g, 8.5);
  eq(g.shield, 0);
});

t('wall blocks monster movement', () => {
  const g = calm(fresh());
  g.monsters.push({ id: 901, x: 400, y: 260, hp: 100, maxHp: 100, speed: 60, dps: 5, radius: 16 });
  castByIndex(g, IDX.square, 1.0); // wall at x=310
  run(g, 3);
  const m = g.monsters.find((m) => m.id === 901);
  ok(m.x > 310, `monster stopped at wall (x=${m.x.toFixed(0)})`);
  ok(g.walls.length === 1 && g.walls[0].hp < 120, 'wall being chewed');
});

t('fire zone burns monsters passing the gate area', () => {
  const g = calm(fresh());
  g.monsters.push({ id: 902, x: 150, y: FIELD.H / 2, hp: 60, maxHp: 60, speed: 0, dps: 0, radius: 16 });
  castByIndex(g, IDX.campfire, 1.0); // 21 dps
  run(g, 2);
  const m = g.monsters.find((m) => m.id === 902);
  ok(m.hp < 60 - 30, `burned (hp=${m.hp.toFixed(0)})`);
});

t('poison cloud slows', () => {
  const g = calm(fresh());
  g.monsters.push({ id: 903, x: 500, y: 250, hp: 1000, maxHp: 1000, speed: 100, dps: 0, radius: 16 });
  castByIndex(g, IDX.cloud, 1.0); // slow 0.55 at monster position
  const x0 = 500;
  run(g, 1);
  const m = g.monsters.find((m) => m.id === 903);
  const moved = x0 - m.x;
  ok(moved < 70, `slowed movement (moved ${moved.toFixed(0)} < 70)`);
});

t('spike trap hits limited number', () => {
  const g = calm(fresh());
  for (let i = 0; i < 4; i++) g.monsters.push({ id: 910 + i, x: 400, y: 250, hp: 100, maxHp: 100, speed: 50, dps: 0, radius: 16 });
  castByIndex(g, IDX.triangle, 1.0); // trap ahead of frontmost, 3 hits of 45
  run(g, 4);
  const hurt = g.monsters.filter((m) => m.id >= 910 && m.hp < 100).length;
  eq(hurt, 3, 'exactly 3 monsters spiked');
});

t('star blast damages cluster only', () => {
  const g = calm(fresh());
  for (let i = 0; i < 3; i++) g.monsters.push({ id: 920 + i, x: 400 + i * 20, y: 250, hp: 100, maxHp: 100, speed: 0, dps: 0, radius: 16 });
  g.monsters.push({ id: 930, x: 700, y: 60, hp: 100, maxHp: 100, speed: 0, dps: 0, radius: 16 });
  castByIndex(g, IDX.star, 1.0);
  const far = g.monsters.find((m) => m.id === 930);
  const near = g.monsters.find((m) => m.id === 920);
  eq(far.hp, 100, 'far monster untouched');
  ok(near.hp < 100, 'cluster damaged');
});

t('surviving all waves → win', () => {
  const g = fresh();
  // cheat: massive repeated blasts
  for (let i = 0; i < 60 * 60 * 8; i++) {
    update(g, 1 / 60);
    if (g.monsters.length) for (const m of [...g.monsters]) damageMonster(g, m, 1000);
    if (g.state === 'win') break;
  }
  eq(g.state, 'win');
  eq(g.wave, TUNE.waves + 1);
});

t('confidence scales damage', () => {
  const g1 = fresh(), g2 = fresh();
  for (const [g, conf] of [[g1, 1.0], [g2, 0.0]]) {
    g.monsters.push({ id: 940, x: 300, y: 200, hp: 1000, maxHp: 1000, speed: 0, dps: 0, radius: 16 });
    castByIndex(g, IDX.sword, conf);
  }
  const d1 = 1000 - g1.monsters[0].hp, d2 = 1000 - g2.monsters[0].hp;
  ok(Math.abs(d1 / d2 - 3) < 0.01, `1.0-conf does 3x of 0.0-conf (${d1}/${d2})`);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
