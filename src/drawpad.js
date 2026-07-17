// drawpad.js — spell drawing pad. Strokes accumulate freely (multi-stroke shapes OK);
// casting is EXPLICIT: Enter / CAST button (user feedback: auto-cast broke campfire etc).
import { strokesToInput } from './preprocess.js';
import { predict } from './nn.js';

export function createPad(canvas, model, onUpdate) {
  const ctx = canvas.getContext('2d');
  const pad = { strokes: [], cur: null, probs: null, top: -1 };

  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) * canvas.width / r.width, (e.clientY - r.top) * canvas.height / r.height];
  };

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
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
    xs.push(x);
    ys.push(y);
    draw();
  });
  const up = () => {
    if (!pad.cur) return;
    pad.cur = null;
    recognize();
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);

  function recognize() {
    if (pad.strokes.length === 0) {
      pad.probs = null; pad.top = -1;
      onUpdate(pad);
      return;
    }
    const x = strokesToInput(pad.strokes);
    if (!x) { pad.probs = null; pad.top = -1; onUpdate(pad); return; }
    pad.probs = predict(model, x);
    pad.top = pad.probs.indexOf(Math.max(...pad.probs));
    onUpdate(pad);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
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

  pad.clear = () => { pad.strokes = []; pad.cur = null; pad.probs = null; pad.top = -1; draw(); onUpdate(pad); };
  pad.undo = () => { pad.strokes.pop(); pad.cur = null; draw(); recognize(); };
  pad.redraw = draw;
  return pad;
}
