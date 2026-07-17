// preprocess.js — stroke → 28×28 model input. SHARED by game, training and tests.
// PIPELINE VERSION v1: any change here changes the input distribution → retrain the model.
export const INPUT = 28;
export const PREP_VERSION = 'v1';
const SS = 2;          // supersample factor (render at 56, box-filter to 28)
const MARGIN = 4;      // margin in supersampled grid px
const RADIUS = 2.0;    // stroke radius in supersampled grid px

// strokes: array of [xs, ys] pairs (equal-length number arrays), any coordinate space.
// Returns Float32Array(784) in [0,1], or null if empty.
export function strokesToInput(strokes) {
  const S = INPUT * SS;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [xs, ys] of strokes) {
    for (let i = 0; i < xs.length; i++) {
      if (xs[i] < minX) minX = xs[i];
      if (xs[i] > maxX) maxX = xs[i];
      if (ys[i] < minY) minY = ys[i];
      if (ys[i] > maxY) maxY = ys[i];
    }
  }
  if (!isFinite(minX)) return null;

  const w = maxX - minX, h = maxY - minY;
  const dim = Math.max(w, h, 1e-6);
  const box = S - 2 * MARGIN;
  const scale = box / dim;
  const ox = MARGIN + (box - w * scale) / 2;
  const oy = MARGIN + (box - h * scale) / 2;

  const img = new Float32Array(S * S);
  for (const [xs, ys] of strokes) {
    const n = xs.length;
    if (n === 0) continue;
    for (let i = 0; i < Math.max(1, n - 1); i++) {
      const j = Math.min(i + 1, n - 1);
      stampSegment(img, S,
        ox + (xs[i] - minX) * scale, oy + (ys[i] - minY) * scale,
        ox + (xs[j] - minX) * scale, oy + (ys[j] - minY) * scale, RADIUS);
    }
  }

  const out = new Float32Array(INPUT * INPUT);
  for (let y = 0; y < INPUT; y++) {
    for (let x = 0; x < INPUT; x++) {
      let s = 0;
      for (let dy = 0; dy < SS; dy++)
        for (let dx = 0; dx < SS; dx++) s += img[(y * SS + dy) * S + x * SS + dx];
      out[y * INPUT + x] = s / (SS * SS);
    }
  }
  return out;
}

// Round-capped segment, analytic coverage (1 inside, linear falloff over 1px at edge).
function stampSegment(img, S, x0, y0, x1, y1, r) {
  const pad = r + 1;
  const xa = Math.max(0, Math.floor(Math.min(x0, x1) - pad));
  const xb = Math.min(S - 1, Math.ceil(Math.max(x0, x1) + pad));
  const ya = Math.max(0, Math.floor(Math.min(y0, y1) - pad));
  const yb = Math.min(S - 1, Math.ceil(Math.max(y0, y1) + pad));
  const dx = x1 - x0, dy = y1 - y0;
  const len2 = dx * dx + dy * dy;
  for (let py = ya; py <= yb; py++) {
    for (let px = xa; px <= xb; px++) {
      const cx = px + 0.5, cy = py + 0.5;
      let t = len2 > 0 ? ((cx - x0) * dx + (cy - y0) * dy) / len2 : 0;
      t = t < 0 ? 0 : (t > 1 ? 1 : t);
      const qx = x0 + t * dx - cx, qy = y0 + t * dy - cy;
      const d = Math.sqrt(qx * qx + qy * qy);
      let cov = r + 0.5 - d;
      cov = cov < 0 ? 0 : (cov > 1 ? 1 : cov);
      const idx = py * S + px;
      if (cov > img[idx]) img[idx] = cov;
    }
  }
}
