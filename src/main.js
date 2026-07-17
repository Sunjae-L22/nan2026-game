// main.js — bootstrap: model load, UI wiring, game loop, draft overlay.
import { createGame, startGame, update, TUNE, pickDraft, FIELD } from './game.js';
import { SPELLS, castByIndex } from './spells.js';
import { render, drawGlyph, fieldTransform } from './render.js';
import { createFx, fxUpdate, handleEvents, floatText } from './fx.js';
import { loadModel } from './nn.js';
import { createPad } from './drawpad.js';

const DEBUG = new URLSearchParams(location.search).has('debug');
const CAST_MIN = 0.25;

const model = loadModel(await (await fetch('assets/model/model.json')).json());
const g = createGame({ seed: Date.now() >>> 0 });
const fx = createFx();

const gameCanvas = document.getElementById('game');
const gctx = gameCanvas.getContext('2d');
const padCanvas = document.getElementById('pad');
const overlay = document.getElementById('overlay');
const barsEl = document.getElementById('bars');
const castBtn = document.getElementById('cast');

// ---------- legend ----------
const legendCells = [];
const legend = document.getElementById('legend');
SPELLS.forEach((s, i) => {
  const cell = document.createElement('div');
  cell.className = 'cell';
  const cv = document.createElement('canvas');
  cv.width = cv.height = 34;
  drawGlyph(cv.getContext('2d'), s.key, 34);
  const label = document.createElement('div');
  label.innerHTML = `<b>${s.name}</b><span>${s.key}</span>`;
  const lock = document.createElement('div');
  lock.className = 'lock';
  lock.textContent = '🔒';
  cell.append(cv, label, lock);
  legend.append(cell);
  legendCells.push(cell);
});
function renderLegend() {
  legendCells.forEach((cell, i) => cell.classList.toggle('locked', !g.unlocked.has(i)));
}

// ---------- recognition bars (top-3 among unlocked) ----------
const barRows = [];
for (let i = 0; i < 3; i++) {
  const bar = document.createElement('div'); bar.className = 'bar';
  const fill = document.createElement('div'); fill.className = 'fill';
  const label = document.createElement('div'); label.className = 'label';
  bar.append(fill, label);
  barsEl.append(bar);
  barRows.push({ fill, label });
}
function updateBars(pad) {
  for (const r of barRows) { r.fill.style.width = '0%'; r.label.textContent = ''; }
  castBtn.disabled = !pad.probs;
  if (!pad.probs) return;
  const order = [...g.unlocked].sort((a, b) => pad.probs[b] - pad.probs[a]).slice(0, 3);
  order.forEach((ci, i) => {
    const r = barRows[i];
    r.fill.style.width = (pad.probs[ci] * 100).toFixed(0) + '%';
    r.fill.style.background = i === 0 ? SPELLS[ci].color : '#3a4166';
    r.label.textContent = `${SPELLS[ci].name} ${(pad.probs[ci] * 100).toFixed(0)}%`;
  });
}

const pad = createPad(padCanvas, model, updateBars);
document.getElementById('clear').onclick = () => pad.clear();

// ---------- aiming (mouse hover / tap on the battlefield) ----------
let aimScreen = null;
gameCanvas.addEventListener('pointermove', (e) => { aimScreen = [e.offsetX, e.offsetY]; });
gameCanvas.addEventListener('pointerdown', (e) => { aimScreen = [e.offsetX, e.offsetY]; });
function aimField() {
  if (!aimScreen) return null;
  const { scale, offX, offY } = fieldTransform(gameCanvas.width, gameCanvas.height);
  const x = (aimScreen[0] - offX) / scale, y = (aimScreen[1] - offY) / scale;
  if (x < -40 || x > FIELD.W + 40 || y < -40 || y > FIELD.H + 40) return null;
  return { x: Math.max(0, Math.min(FIELD.W, x)), y: Math.max(0, Math.min(FIELD.H, y)) };
}
function bestUnlocked() {
  if (!pad.probs) return { idx: -1, p: 0 };
  let idx = -1, p = 0;
  for (const i of g.unlocked) if (pad.probs[i] > p) { p = pad.probs[i]; idx = i; }
  return { idx, p };
}

// ---------- explicit cast ----------
function doCast() {
  if (g.state !== 'playing' || g.pendingDraft || !pad.probs) return;
  const { idx: best, p: bp } = bestUnlocked();
  const ok = best >= 0 && bp >= CAST_MIN && castByIndex(g, best, bp, aimField());
  if (ok) {
    padCanvas.classList.remove('castflash'); void padCanvas.offsetWidth;
    padCanvas.style.setProperty('--castcolor', SPELLS[best].color);
    padCanvas.classList.add('castflash');
  } else {
    padCanvas.classList.remove('fizzle'); void padCanvas.offsetWidth;
    padCanvas.classList.add('fizzle');
  }
  pad.clear();
}
castBtn.onclick = doCast;

// ---------- overlays ----------
function showOverlay(html) { overlay.innerHTML = html; overlay.style.display = 'flex'; }
function hideOverlay() { overlay.style.display = 'none'; }

function showTitle() {
  showOverlay(`<h1>Scribble Summoner</h1>
    <p>몰려오는 낙서 몬스터에게서 <b>성문을 지켜라!</b><br>
    패드에 도형을 그리고 <b>Shift</b>로 발동 — AI가 낙서를 알아본다.<br>
    발동 전에 <b>전장에 마우스를 올려두면 그 위치에 시전!</b><br>
    또렷하게 그릴수록 강력하다. 웨이브를 클리어하면 <b>새 마법 카드</b>를 얻는다.<br>
    <b>10웨이브를 버티면 승리.</b></p>
    <button id="startBtn">START — 그릴 준비 됐어?</button>
    <p class="small">참격·체인 라이트닝으로 시작 / 좌·우 Shift 모두 OK (Enter도 가능) / Backspace: 한 획 취소 / R: 재시작</p>`);
  document.getElementById('startBtn').onclick = begin;
}
function begin() {
  startGame(g);
  renderLegend();
  hideOverlay();
  pad.clear();
  draftShown = false;
}
function showEnd(win) {
  showOverlay(`<h1>${win ? 'VICTORY!' : 'GAME OVER'}</h1>
    <p>SCORE <b>${g.score}</b> · 처치 ${g.kills} · 시전 ${g.casts}회 · 마법 ${g.unlocked.size}/8 해금</p>
    <button id="startBtn">${win ? '한 번 더' : 'RESTART'} (R)</button>`);
  document.getElementById('startBtn').onclick = begin;
}

// ---------- draft ----------
let draftShown = false;
function showDraft() {
  const opts = g.pendingDraft;
  const cards = opts.map((ci, k) => `
    <div class="card" data-ci="${ci}">
      <canvas id="cardGlyph${k}" width="72" height="72"></canvas>
      <b>${SPELLS[ci].name}</b>
      <span>${SPELLS[ci].desc}</span>
      <em>[${k + 1}]</em>
    </div>`).join('');
  showOverlay(`<h2>WAVE ${g.wave} CLEAR!</h2><p>새 마법을 선택하라</p><div id="cards">${cards}</div>`);
  opts.forEach((ci, k) => drawGlyph(document.getElementById(`cardGlyph${k}`).getContext('2d'), SPELLS[ci].key, 72));
  overlay.querySelectorAll('.card').forEach((el) => {
    el.onclick = () => pickCard(parseInt(el.dataset.ci, 10));
  });
}
function pickCard(ci) {
  if (!pickDraft(g, ci)) return;
  renderLegend();
  hideOverlay();
  draftShown = false;
  floatText(fx, 400, 120, `NEW: ${SPELLS[ci].name}!`, SPELLS[ci].color, 26);
  const cell = legendCells[ci];
  cell.classList.remove('justUnlocked'); void cell.offsetWidth;
  cell.classList.add('justUnlocked');
}

// ---------- keys ----------
addEventListener('keydown', (e) => {
  if (e.key === 'Shift' && !e.repeat) { e.preventDefault(); doCast(); }   // L/R Shift both — either hand
  if (e.key === 'Enter') { e.preventDefault(); doCast(); }
  if (e.key === 'Backspace') { e.preventDefault(); pad.undo(); }
  if ((e.key === 'r' || e.key === 'R') && g.state !== 'playing') begin();
  if (g.pendingDraft && ['1', '2', '3'].includes(e.key)) {
    const ci = g.pendingDraft[parseInt(e.key, 10) - 1];
    if (ci !== undefined) pickCard(ci);
  }
  if (!DEBUG) return;
  if (e.key === 'k') for (const m of [...g.monsters]) m.hp = -1;
  if (e.key === 'l') g.gateHP = 1;
  if (e.key === 'w') { g.wave = TUNE.waves; g.monsters = []; g.toSpawn = 0; g.waveState = 'clearing'; }
});

// ---------- resize + loop ----------
function fit() {
  const r = gameCanvas.parentElement.getBoundingClientRect();
  gameCanvas.width = Math.floor(r.width);
  gameCanvas.height = Math.floor(r.height);
}
addEventListener('resize', fit);
fit();
renderLegend();

let last = performance.now(), ended = false;
function tick(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  update(g, dt);
  handleEvents(fx, g, g.events);
  g.events.length = 0;
  fxUpdate(fx, dt);
  const b = bestUnlocked();
  const aim = b.idx >= 0 ? aimField() : null;
  render(gctx, g, fx, gameCanvas.width, gameCanvas.height, now / 1000,
    aim ? { x: aim.x, y: aim.y, spellIdx: b.idx } : null);
  if (g.pendingDraft && !draftShown) { draftShown = true; setTimeout(showDraft, 450); }
  if (g.state === 'win' && !ended) { ended = true; setTimeout(() => showEnd(true), 600); }
  else if (g.state === 'lose' && !ended) { ended = true; setTimeout(() => showEnd(false), 600); }
  if (g.state === 'playing') ended = false;
  requestAnimationFrame(tick);
}
showTitle();
requestAnimationFrame(tick);
console.log('[game] Scribble Summoner M3.2 boot OK');
