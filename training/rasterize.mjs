// rasterize.mjs — build training arrays from Quick Draw simplified ndjson using the
// EXACT preprocessing the game uses (src/preprocess.js). Chunked & idempotent:
// one class per invocation (sandbox has a 45s execution cap per call).
// Usage: node training/rasterize.mjs <data_dir> <out_dir> <class> <classIndex>
import { createReadStream, writeFileSync, existsSync } from 'fs';
import { createInterface } from 'readline';
import { strokesToInput, INPUT } from '../src/preprocess.js';

const TRAIN_N = 8000, VAL_N = 800, E2E_N = 600;
const [dataDir, outDir, c, ciStr] = process.argv.slice(2);
const ci = parseInt(ciStr, 10);
const px = INPUT * INPUT;

if (existsSync(`${outDir}/${c}.done`)) { console.log(`${c}: already done`); process.exit(0); }

const trX = Buffer.alloc(TRAIN_N * px), trY = Buffer.alloc(TRAIN_N);
const vaX = Buffer.alloc(VAL_N * px), vaY = Buffer.alloc(VAL_N);
let nTr = 0, nVa = 0; const e2e = [];

const rl = createInterface({ input: createReadStream(`${dataDir}/${c}.ndjson`) });
rl.on('line', (line) => {
  if (e2e.length >= E2E_N) { rl.close(); return; }
  let d; try { d = JSON.parse(line); } catch { return; }
  if (!d.recognized || !d.drawing || d.drawing.length === 0) return;
  if (nTr < TRAIN_N || nVa < VAL_N) {
    const x = strokesToInput(d.drawing);
    if (!x) return;
    if (nTr < TRAIN_N) {
      for (let i = 0; i < px; i++) trX[nTr * px + i] = Math.round(x[i] * 255);
      trY[nTr] = ci; nTr++;
    } else {
      for (let i = 0; i < px; i++) vaX[nVa * px + i] = Math.round(x[i] * 255);
      vaY[nVa] = ci; nVa++;
    }
  } else {
    e2e.push(JSON.stringify({ y: ci, drawing: d.drawing }));
  }
});
rl.on('close', () => {
  writeFileSync(`${outDir}/${c}.trx`, trX.subarray(0, nTr * px));
  writeFileSync(`${outDir}/${c}.try`, trY.subarray(0, nTr));
  writeFileSync(`${outDir}/${c}.vax`, vaX.subarray(0, nVa * px));
  writeFileSync(`${outDir}/${c}.vay`, vaY.subarray(0, nVa));
  writeFileSync(`${outDir}/${c}.e2e`, e2e.join('\n') + '\n');
  writeFileSync(`${outDir}/${c}.done`, '1');
  console.log(`${c}: train=${nTr} val=${nVa} e2e=${e2e.length}`);
});
