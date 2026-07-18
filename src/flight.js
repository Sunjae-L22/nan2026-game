// flight.js — the player's actual sketch lifts off the pad, flies across the SCREEN
// (fixed overlay canvas above both the pad and the battlefield) and dives into its
// target. This is the concept made visible: your doodle literally becomes the spell.
export function createFlight() {
  const canvas = document.createElement('canvas');
  canvas.id = 'flight';
  Object.assign(canvas.style, {
    position: 'fixed', left: 0, top: 0, width: '100%', height: '100%',
    pointerEvents: 'none', zIndex: 50,
  });
  document.body.append(canvas);
  const ctx = canvas.getContext('2d');
  const flights = [];

  function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
  addEventListener('resize', resize);
  resize();

  // strokes: [[xs,ys],...] in pad coords; from: pad DOMRect; to: {x,y} screen px
  function launch(strokes, from, to, color, dur = 0.3, gold = false) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [xs, ys] of strokes) for (let i = 0; i < xs.length; i++) {
      minX = Math.min(minX, xs[i]); maxX = Math.max(maxX, xs[i]);
      minY = Math.min(minY, ys[i]); maxY = Math.max(maxY, ys[i]);
    }
    if (!isFinite(minX)) return;
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    const dim = Math.max(maxX - minX, maxY - minY, 1);
    flights.push({
      strokes, cx, cy, dim, dur, gold, t: 0,
      x0: from.left + from.width / 2, y0: from.top + from.height / 2,
      x1: to.x, y1: to.y,
      size0: Math.min(from.width, from.height) * 0.7,
      color,
      spin: (Math.random() - 0.5) * 1.2,
    });
  }

  function update(dt) {
    for (const f of flights) f.t += dt / f.dur;
    for (let i = flights.length - 1; i >= 0; i--) if (flights[i].t >= 1) flights.splice(i, 1);
    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const f of flights) {
      const t = Math.min(1, f.t);
      const e = t * t * (3 - 2 * t);                       // smoothstep
      const mx = (f.x0 + f.x1) / 2, my = Math.min(f.y0, f.y1) - 120;  // arc peak
      const x = (1 - e) * (1 - e) * f.x0 + 2 * (1 - e) * e * mx + e * e * f.x1;
      const y = (1 - e) * (1 - e) * f.y0 + 2 * (1 - e) * e * my + e * e * f.y1;
      const size = f.size0 * (1 - 0.45 * e);
      const s = size / f.dim;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(f.spin * e);
      ctx.globalAlpha = t > 0.85 ? (1 - t) / 0.15 : 1;
      ctx.strokeStyle = f.gold ? '#ffd166' : f.color;
      ctx.shadowColor = f.gold ? '#ffd166' : f.color;
      ctx.shadowBlur = f.gold ? 22 : 12;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const [xs, ys] of f.strokes) {
        ctx.beginPath();
        ctx.moveTo((xs[0] - f.cx) * s, (ys[0] - f.cy) * s);
        for (let i = 1; i < xs.length; i++) ctx.lineTo((xs[i] - f.cx) * s, (ys[i] - f.cy) * s);
        if (xs.length === 1) ctx.lineTo((xs[0] - f.cx) * s + 0.1, (ys[0] - f.cy) * s);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  return { launch, update, active: () => flights.length > 0 };
}
