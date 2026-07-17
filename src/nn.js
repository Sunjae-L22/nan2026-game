// nn.js — minimal CNN inference engine. Zero dependencies, runs in browser and node.
// Layout conventions match Keras channels-last exports (see training/train.py).

function b64ToF32(b64) {
  if (typeof Buffer !== 'undefined') {
    const buf = Buffer.from(b64, 'base64');
    return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
  }
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Float32Array(bytes.buffer);
}

// Decode model JSON (as produced by training/train.py) into runnable form.
export function loadModel(json) {
  return {
    classes: json.classes,
    prep: json.prep,
    version: json.version,
    layers: json.layers.map((L) => {
      if (L.type === 'conv2d') return { ...L, w: b64ToF32(L.w), b: b64ToF32(L.b) };
      if (L.type === 'dense') return { ...L, w: b64ToF32(L.w), b: b64ToF32(L.b) };
      return { ...L };
    })
  };
}

// x: Float32Array(784) in [0,1]  →  Float32Array(numClasses) softmax probs
export function predict(model, x) {
  let t = { data: x, w: 28, h: 28, c: 1 };
  let flat = null;
  for (const L of model.layers) {
    if (L.type === 'conv2d') { t = conv2d(t, L); t.data = relu(t.data); }
    else if (L.type === 'maxpool2') t = maxpool2(t);
    else if (L.type === 'dense') {
      if (flat === null) flat = t.data; // channels-last flatten == our storage order
      flat = dense(flat, L);
      if (L.act === 'relu') flat = relu(flat);
      else if (L.act === 'softmax') flat = softmax(flat);
    }
  }
  return flat;
}

function conv2d(t, L) {
  const { w: iw, h: ih, c: ic, data: inp } = t;
  const { kw, kh, oc, w: ker, b: bias } = L;
  const ow = iw - kw + 1, oh = ih - kh + 1;
  const out = new Float32Array(ow * oh * oc);
  for (let oy = 0; oy < oh; oy++) {
    for (let ox = 0; ox < ow; ox++) {
      const ob = (oy * ow + ox) * oc;
      for (let ky = 0; ky < kh; ky++) {
        for (let kx = 0; kx < kw; kx++) {
          const ib = ((oy + ky) * iw + (ox + kx)) * ic;
          const kb = (ky * kw + kx) * ic * oc;
          for (let ci = 0; ci < ic; ci++) {
            const v = inp[ib + ci];
            if (v === 0) continue;
            const kbb = kb + ci * oc;
            for (let co = 0; co < oc; co++) out[ob + co] += v * ker[kbb + co];
          }
        }
      }
      for (let co = 0; co < oc; co++) out[ob + co] += bias[co];
    }
  }
  return { data: out, w: ow, h: oh, c: oc };
}

function relu(a) { for (let i = 0; i < a.length; i++) if (a[i] < 0) a[i] = 0; return a; }

function maxpool2(t) {
  const { w: iw, h: ih, c, data: inp } = t;
  const ow = Math.floor(iw / 2), oh = Math.floor(ih / 2);
  const out = new Float32Array(ow * oh * c);
  for (let oy = 0; oy < oh; oy++) {
    for (let ox = 0; ox < ow; ox++) {
      for (let ci = 0; ci < c; ci++) {
        const a = inp[((oy * 2) * iw + ox * 2) * c + ci];
        const b = inp[((oy * 2) * iw + ox * 2 + 1) * c + ci];
        const d = inp[((oy * 2 + 1) * iw + ox * 2) * c + ci];
        const e = inp[((oy * 2 + 1) * iw + ox * 2 + 1) * c + ci];
        out[(oy * ow + ox) * c + ci] = Math.max(a, b, d, e);
      }
    }
  }
  return { data: out, w: ow, h: oh, c };
}

function dense(x, L) {
  const { in: ni, out: no, w, b } = L;
  const out = new Float32Array(no);
  for (let i = 0; i < ni; i++) {
    const v = x[i];
    if (v === 0) continue;
    const base = i * no;
    for (let o = 0; o < no; o++) out[o] += v * w[base + o];
  }
  for (let o = 0; o < no; o++) out[o] += b[o];
  return out;
}

function softmax(x) {
  let m = -Infinity;
  for (const v of x) if (v > m) m = v;
  let s = 0;
  const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) { out[i] = Math.exp(x[i] - m); s += out[i]; }
  for (let i = 0; i < x.length; i++) out[i] /= s;
  return out;
}
