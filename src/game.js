// game.js — core simulation. NO DOM: pure logic, testable in node.
// Coordinates: battlefield is W×H, gate at x=0 (monsters walk right → left).

export const FIELD = { W: 800, H: 520 };

export const TUNE = {
  gateHP: 100,
  waves: 10,
  wavePause: 2.5,
  spawnInterval: 0.75,
  monster: (wave) => ({
    hp: 18 + 9 * wave,
    speed: 42 + 3.5 * wave,
    dps: 6 + wave,
    radius: 16 + Math.min(8, wave),
  }),
  waveCount: (wave) => 3 + 2 * wave,
  scoreKill: 10,
};

let nextId = 1;

export function createGame(opts = {}) {
  return {
    state: 'title',           // title | playing | win | lose
    time: 0,
    wave: 0,                  // 1-based once started
    waveState: 'pause',       // pause | spawning | clearing
    waveTimer: opts.firstPause ?? 1.2,
    spawnTimer: 0,
    toSpawn: 0,
    monsters: [],
    zones: [],                // {kind, x, y, r, ttl, dps, slow, hits?}
    walls: [],                // {x, y, w, h, hp, ttl}
    shield: 0,                // absorbs gate damage
    shieldTTL: 0,
    gateHP: TUNE.gateHP,
    score: 0,
    kills: 0,
    casts: 0,
    events: [],               // drained by renderer for fx/sound
    rng: mulberry32(opts.seed ?? 12345),
  };
}

export function startGame(g) {
  const seed = g.rng;
  Object.assign(g, createGame({ seed: 0 }), { state: 'playing', rng: seed });
}

function mulberry32(a) {
  return function () {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function emit(g, type, data = {}) { g.events.push({ type, ...data }); }

export function update(g, dt) {
  if (g.state !== 'playing') return;
  g.time += dt;

  // Wave sequencing
  if (g.waveState === 'pause') {
    g.waveTimer -= dt;
    if (g.waveTimer <= 0) {
      g.wave += 1;
      if (g.wave > TUNE.waves) { g.state = 'win'; emit(g, 'win'); return; }
      g.waveState = 'spawning';
      g.toSpawn = TUNE.waveCount(g.wave);
      g.spawnTimer = 0;
      emit(g, 'wave', { wave: g.wave });
    }
  } else if (g.waveState === 'spawning') {
    g.spawnTimer -= dt;
    if (g.toSpawn > 0 && g.spawnTimer <= 0) {
      spawnMonster(g);
      g.toSpawn -= 1;
      g.spawnTimer = TUNE.spawnInterval;
    }
    if (g.toSpawn === 0) g.waveState = 'clearing';
  } else if (g.waveState === 'clearing') {
    if (g.monsters.length === 0) {
      g.waveState = 'pause';
      g.waveTimer = TUNE.wavePause;
      g.score += 25;                        // wave clear bonus
      emit(g, 'waveClear', { wave: g.wave });
    }
  }

  // Zones tick
  for (const z of g.zones) z.ttl -= dt;
  g.zones = g.zones.filter((z) => z.ttl > 0);

  // Walls tick
  for (const w of g.walls) w.ttl -= dt;
  g.walls = g.walls.filter((w) => w.ttl > 0 && w.hp > 0);

  // Shield tick
  if (g.shieldTTL > 0) { g.shieldTTL -= dt; if (g.shieldTTL <= 0) g.shield = 0; }

  // Monsters
  for (const m of g.monsters) {
    let speed = m.speed;
    let zoneDps = 0;
    for (const z of g.zones) {
      const dx = m.x - z.x, dy = m.y - z.y;
      if (dx * dx + dy * dy <= (z.r + m.radius) * (z.r + m.radius)) {
        zoneDps += z.dps || 0;
        if (z.slow) speed *= z.slow;
        if (z.kind === 'spike' && z.hits > 0 && !m.spiked?.has(z.id)) {
          (m.spiked ??= new Set()).add(z.id);
          damageMonster(g, m, z.hit);
          z.hits -= 1;
          if (z.hits <= 0) z.ttl = 0;
          emit(g, 'spikeHit', { x: m.x, y: m.y });
        }
      }
    }
    if (zoneDps) damageMonster(g, m, zoneDps * dt, true);

    // Wall blocking: stop at wall's right edge and chew it
    let blocked = null;
    for (const w of g.walls) {
      if (m.y > w.y - 10 && m.y < w.y + w.h + 10 &&
          m.x - m.radius <= w.x + w.w && m.x > w.x) blocked = w;
    }
    if (blocked) {
      blocked.hp -= m.dps * dt;
    } else if (m.x - m.radius > 0) {
      m.x -= speed * dt;
    }

    // At gate
    if (m.x - m.radius <= 0) {
      const dmg = m.dps * dt;
      if (g.shield > 0) {
        g.shield -= dmg;
        if (g.shield < 0) { g.gateHP += g.shield; g.shield = 0; }
      } else {
        g.gateHP -= dmg;
      }
    }
    m.hitFlash = Math.max(0, (m.hitFlash || 0) - dt);
  }
  g.monsters = g.monsters.filter((m) => m.hp > 0);

  if (g.gateHP <= 0) { g.gateHP = 0; g.state = 'lose'; emit(g, 'lose'); }
}

function spawnMonster(g) {
  const t = TUNE.monster(g.wave);
  const m = {
    id: nextId++,
    x: FIELD.W + 20,
    y: 60 + g.rng() * (FIELD.H - 120),
    wobble: g.rng() * Math.PI * 2,
    ...t,
    maxHp: t.hp,
  };
  g.monsters.push(m);
  emit(g, 'spawn', { id: m.id });
  return m;
}

export function damageMonster(g, m, dmg, quiet = false) {
  m.hp -= dmg;
  m.hitFlash = 0.15;
  if (!quiet) emit(g, 'damage', { x: m.x, y: m.y, amount: Math.round(dmg) });
  if (m.hp <= 0 && !m.dead) {
    m.dead = true;
    g.kills += 1;
    g.score += TUNE.scoreKill * g.wave;
    emit(g, 'kill', { x: m.x, y: m.y, id: m.id });
  }
}

// Helpers for spell targeting
export function frontmost(g, n = 1) {
  return [...g.monsters].filter((m) => m.hp > 0).sort((a, b) => a.x - b.x).slice(0, n);
}

export function densestPoint(g) {
  if (g.monsters.length === 0) return { x: FIELD.W * 0.5, y: FIELD.H * 0.5 };
  let best = g.monsters[0], bestScore = -1;
  for (const m of g.monsters) {
    let s = 0;
    for (const o of g.monsters) {
      const dx = m.x - o.x, dy = m.y - o.y;
      if (dx * dx + dy * dy < 120 * 120) s += 1;
    }
    if (s > bestScore) { bestScore = s; best = m; }
  }
  return { x: best.x, y: best.y };
}

export function nearest(g, x, y, exclude) {
  let best = null, bd = Infinity;
  for (const m of g.monsters) {
    if (m.hp <= 0 || exclude.has(m.id)) continue;
    const d = (m.x - x) ** 2 + (m.y - y) ** 2;
    if (d < bd) { bd = d; best = m; }
  }
  return best;
}
