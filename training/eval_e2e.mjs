// eval_e2e.mjs — END-TO-END gate: held-out raw strokes → game preprocessing → JS engine.
// This is exactly what happens when a player draws. Gate: overall accuracy >= threshold.
// Usage: node training/eval_e2e.mjs <model.json> <e2e.jsonl> [threshold]
import { readFileSync } from 'fs';
import { strokesToInput } from '../src/preprocess.js';
import { loadModel, predict } from '../src/nn.js';

const model = loadModel(JSON.parse(readFileSync(process.argv[2], 'utf8')));
const lines = readFileSync(process.argv[3], 'utf8').trim().split('\n');
const thr = parseFloat(process.argv[4] || '0.90');
const NC = model.classes.length;
const cm = Array.from({ length: NC }, () => new Array(NC).fill(0));

for (const line of lines) {
  const { y, drawing } = JSON.parse(line);
  const x = strokesToInput(drawing);
  if (!x) continue;
  const p = predict(model, x);
  let am = 0;
  for (let i = 1; i < NC; i++) if (p[i] > p[am]) am = i;
  cm[y][am]++;
}

let correct = 0, total = 0;
console.log('\nPer-class accuracy:');
for (let i = 0; i < NC; i++) {
  const row = cm[i].reduce((a, b) => a + b, 0);
  correct += cm[i][i]; total += row;
  const worst = cm[i].map((v, j) => [v, j]).filter(([, j]) => j !== i).sort((a, b) => b[0] - a[0])[0];
  console.log(`  ${model.classes[i].padEnd(10)} ${(cm[i][i] / Math.max(1, row) * 100).toFixed(1)}%  (top confusion: ${model.classes[worst[1]]} ${worst[0]})`);
}
const acc = correct / total;
console.log(`\nE2E OVERALL ${(acc * 100).toFixed(2)}% (n=${total}, gate ${(thr * 100).toFixed(0)}%)`);
console.log(acc >= thr ? 'GATE PASSED' : 'GATE FAILED');
process.exit(acc >= thr ? 0 : 1);
