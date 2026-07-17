// test_engine.mjs — golden test: JS engine must reproduce Keras outputs.
// Usage: node training/test_engine.mjs <model.json> <golden.json>
import { readFileSync } from 'fs';
import { loadModel, predict } from '../src/nn.js';

const model = loadModel(JSON.parse(readFileSync(process.argv[2], 'utf8')));
const golden = JSON.parse(readFileSync(process.argv[3], 'utf8'));

let maxDiff = 0, argmaxMismatch = 0;
for (let i = 0; i < golden.inputs.length; i++) {
  const p = predict(model, Float32Array.from(golden.inputs[i]));
  const ref = golden.probs[i];
  for (let j = 0; j < ref.length; j++) maxDiff = Math.max(maxDiff, Math.abs(p[j] - ref[j]));
  const am = p.indexOf(Math.max(...p));
  const ram = ref.indexOf(Math.max(...ref));
  if (am !== ram) argmaxMismatch++;
}
console.log(`golden n=${golden.inputs.length} maxProbDiff=${maxDiff.toExponential(2)} argmaxMismatch=${argmaxMismatch}`);
if (maxDiff > 2e-3 || argmaxMismatch > 0) { console.error('GOLDEN TEST FAILED'); process.exit(1); }
console.log('GOLDEN TEST PASSED');
