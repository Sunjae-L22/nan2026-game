// main.js — bootstrap: model load, UI wiring, game loop.
import { createGame, startGame, update, TUNE } from './game.js';
import { SPELLS, castByIndex } from './spells.js';
import { render, drawGlyph } from './render.js';
import { createFx, fxUpdate, handleEvents, floatText } from './fx.js';
import { loadModel } from './nn.js';
import { createPad } from './drawpad.js';

const DEBUG = new URLSearchParams(location.search).has('debug');

const model = loadModel(await (await fetch('assets/model/model.json')).json());
const g = createGame({ seed: Date.now() >>> 0 });
const fx = createFx();

// --- DOM ---
const gameCanvas = document.getElementById('game');
const gctx = gameCanvas.getContext('2d');
const padCanvas = document.getElementById('pad');
const overlay = document.getElementById('overlay');
const barsEl = document.getElementById('bars');

// legend
const legend = document.getElementById('legend');
for (const s of SPELLS) {
  const cell = document.createElement('div');
  cell.className = 'cell';
  const cv = document.createElement('canvas');
  cv.width = cv.height = 34;
  drawGlyph(cv.getContext('2d'), s.key, 34);
  const label = document.createElement('div');
  label.innerHTML = `<b>${s.name}</b><span>${s.key}</span>`;
  cell.append(cv, label);
  legend.append(cell);
}

// top-3 bars
const barRows = [];
for (let i = 0; i < 3; i++) {
  const bar = document.createElement('div'); bar.className = 'bar';
  const fill = document.createElement('div'); fill.className = 'fill';
  const label = document.createElement('div'); label.className = 'label';
  bar.append(fill, label);
  barsEl.append(bar);
  barRows.push({ bar, fill, label });
}
function updateBars(pad) {
  if (!pad.probs) { for (const r of barRows) { r.fill.style.width = '0%'; r.label.textContent = ''; } return; }
  const order = [...pad.probs.keys()].sort((a, b) => pad.probs[b] - pad.probs[a]).slice(0, 3);
  order.forEach((ci, i) => {
    const r = barRows[i];
    r.fill.style.width = (pad.probs[ci] * 100).toFixed(0) + '%';
    r.fill.style.background = i === 0 ? SPELLS[ci].color : '#3a4166';
    r.label.textContent = `${SPELLS[ci].name} ${(pad.probs[ci] * 100).toFixed(0)}%`;
  });
}

const pad = createPad(padCanvas, model, (classIdx, conf) => {
  const ok = castByIndex(g, classIdx, conf);
  if (ok) {
    padCanvas.classList.remove('castflash'); void padCanvas.offsetWidth;
    padCanvas.style.setProperty('--castcolor', SPELLS[classIdx].color);
    padCanvas.classList.add('castflash');
  } else {
    padCanvas.classList.remove('fizzle'); void padCanvas.offsetWidth;
    padCanvas.classList.add('fizzle');
  }
  return ok;
}, updateBars);
document.getElementById('clear').onclick = () => pad.clear();

// overlay / states
function showOverlay(html) { overlay.innerHTML = html; overlay.style.display = 'flex'; }
function hideOverlay() { overlay.style.display = 'none'; }

function showTitle() {
  showOverlay(`<h1>Scribble Summoner</h1>
    <p>몰려오는 낙서 몬스터에게서 <b>성문을 지켜라!</b><br>
    오른쪽 패드에 도형을 그리면 AI가 알아보고 마법이 발동된다.<br>
    또렷하게 그릴수록 강력하다. <b>10웨이브를 버티면 승리.</b></p>
    <button id="startBtn">START — 그릴 준비 됐어?</button>
    <p class="small">데스크톱: 마우스 드로잉 / 모바일: 터치 드로잉</p>`);
  document.getElementById('startBtn').onclick = begin;
}
function begin() {
  startGame(g);
  hideOverlay();
  pad.clear();
}
function showEnd(win) {
  const acc = g.casts > 0 ? Math.round(g.kills / g.casts * 100) : 0;
  showOverlay(`<h1>${win ? 'VICTORY!' : 'GAME OVER'}</h1>
    <p>SCORE <b>${g.score}</b> · 처치 ${g.kills} · 시전 ${g.casts}회</p>
    <button id="startBtn">${win ? '한 번 더' : 'RESTART'} (R)</button>`);
  document.getElementById('startBtn').onclick = begin;
}

addEventListener('keydown', (e) => {
  if (e.key === 'r' || e.key === 'R') { if (g.state !== 'playing') begin(); }
  if (!DEBUG) return;
  if (e.key === 'k') for (const m of [...g.monsters]) m.hp = -1;
  if (e.key === 'l') g.gateHP = 1;
  if (e.key === 'w') { g.wave = TUNE.waves; g.monsters = []; g.toSpawn = 0; g.waveState = 'clearing'; }
});

// resize
function fit() {
  const r = gameCanvas.parentElement.getBoundingClientRect();
  gameCanvas.width = Math.floor(r.width);
  gameCanvas.height = Math.floor(r.height);
}
addEventListener('resize', fit);
fit();

// loop
let last = performance.now(), ended = false;
function tick(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  update(g, dt);
  handleEvents(fx, g, g.events);
  g.events.length = 0;
  fxUpdate(fx, dt);
  render(gctx, g, fx, gameCanvas.width, gameCanvas.height, now / 1000);
  if (g.state === 'win' && !ended) { ended = true; setTimeout(() => showEnd(true), 600); }
  else if (g.state === 'lose' && !ended) { ended = true; setTimeout(() => showEnd(false), 600); }
  if (g.state === 'playing') ended = false;
  requestAnimationFrame(tick);
}
showTitle();
requestAnimationFrame(tick);
console.log('[game] Scribble Summoner M2 boot OK');
