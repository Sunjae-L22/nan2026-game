// drawpad.js — spell drawing pad: capture strokes, recognize, decide when to cast.
import { strokesToInput } from './preprocess.js';
import { predict } from './nn.js';

const CAST_NOW = 0.62;   // stroke-end confidence for instant cast
const CAST_IDLE = 0.35;  // after idle delay, cast if at least this
const IDLE_MS = 450;
const COOLDOWN_MS = 250;

export function createPad(canvas, model, onCast, onUpdate) {
  const ctx = canvas.getContext('2d');
  const pad = {
    strokes: [], cur: null, probs: null, top: -1,
    idleTimer: null, lastCast: 0, flash: 0, fizzle: 0,
  };

  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) * canvas.width / r.width, (e.clientY - r.top) * canvas.height / r.height];
  };

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    clearTimeout(pad.idleTimer);
    const [x, y] = pos(e);
    pad.cur = [[x], [y]];
    pad.strokes.push(pad.cur);
    draw();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!pad.cur) return;
    const [x, y] = pos(e);
    const xs = pad.cur[0], ys = pad.cur[1];
    const lx = xs[xs.length - 1], ly = ys[ys.length - 1];
    if ((x - lx) ** 2 + (y - ly) ** 2 < 4) return;
    xs.push(x); ys.push(y);
    draw();
  });
  const up = () => {
    if (!pad.cur) return;
    pad.cur = null;
    recognize();
    maybeCast(false);
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);

  function recognize() {
    if (pad.strokes.length === 0) { pad.probs = null; pad.top = -1; onUpdate(pad); return; }
    const x = strokesToInput(pad.strokes);
    if (!x) { pad.probs = null; pad.top = -1; onUpdate(pad); return; }
    const p = predict(model, x);
    pad.probs = p;
    pad.top = p.indexOf(Math.max(...p));
    onUpdate(pad);
  }

  function maybeCast(fromIdle) {
    if (!pad.probs) return;
    const conf = pad.probs[pad.top];
    const now = performance.now();
    if (now - pad.lastCast < COOLDOWN_MS) return;
    if (conf >= CAST_NOW || (fromIdle && conf >= CAST_IDLE)) {
      const ok = onCast(pad.top, conf);
      pad.lastCast = now;
      pad.flash = ok ? 1 : 0;
      pad.fizzle = ok ? 0 : 1;
      pad.strokes = [];
      pad.probs = null; pad.top = -1;
      onUpdate(pad);
      draw();
    } else if (!fromIdle) {
      clearTimeout(pad.idleTimer);
      pad.idleTimer = setTimeout(() => {
        if (pad.strokes.length === 0) return;
        recognize();
        if (pad.probs && pad.probs[pad.top] >= CAST_IDLE) maybeCast(true);
        else { pad.fizzle = 1; pad.strokes = []; pad.probs = null; pad.top = -1; onUpdate(pad); draw(); }
      }, IDLE_MS);
    }
  }

  function draw() {
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#e8ecf1';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const [xs, ys] of pad.strokes) {
      ctx.beginPath();
      ctx.moveTo(xs[0], ys[0]);
      for (let i = 1; i < xs.length; i++) ctx.lineTo(xs[i], ys[i]);
      if (xs.length === 1) ctx.lineTo(xs[0] + 0.1, ys[0]);
      ctx.stroke();
    }
  }

  pad.clear = () => { pad.strokes = []; pad.probs = null; pad.top = -1; draw(); onUpdate(pad); };
  pad.redraw = draw;
  return pad;
}
