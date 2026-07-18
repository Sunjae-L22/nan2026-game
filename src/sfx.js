// sfx.js — 100% procedural WebAudio sound. No audio files, no licenses, ~3KB.
// Every sound is synthesized: oscillators + filtered noise + envelopes.
export function createSfx() {
  let ctx = null, master = null, muted = false;
  const last = {};   // throttle map

  function ensure() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.32;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  function throttled(key, ms) {
    const now = performance.now();
    if (last[key] && now - last[key] < ms) return true;
    last[key] = now;
    return false;
  }

  // osc beep: freq (optionally glide to f2), duration, wave type
  function beep(f1, f2, dur, type = 'square', vol = 0.5, delay = 0) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator(), gn = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1, t0);
    if (f2 && f2 !== f1) o.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t0 + dur);
    gn.gain.setValueAtTime(0, t0);
    gn.gain.linearRampToValueAtTime(vol, t0 + 0.006);
    gn.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    o.connect(gn); gn.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  // filtered noise burst: for slashes, booms, crackles
  function noise(dur, vol = 0.5, freq = 1000, q = 1, type = 'lowpass', delay = 0) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + delay;
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const gn = ctx.createGain(); gn.gain.value = vol;
    src.connect(f); f.connect(gn); gn.connect(master);
    src.start(t0);
  }

  const CAST = {
    lightning: () => { beep(900, 120, 0.18, 'sawtooth', 0.5); noise(0.12, 0.35, 3200, 2, 'highpass'); },
    circle:    () => { beep(420, 840, 0.25, 'sine', 0.45); beep(630, 1260, 0.22, 'sine', 0.25, 0.06); },
    triangle:  () => { beep(500, 500, 0.05, 'square', 0.4); beep(500, 500, 0.05, 'square', 0.4, 0.07); beep(700, 700, 0.06, 'square', 0.4, 0.14); },
    star:      () => { noise(0.4, 0.6, 500, 1); beep(220, 45, 0.4, 'sine', 0.7); },
    cloud:     () => { noise(0.45, 0.4, 420, 3); beep(300, 180, 0.35, 'triangle', 0.25); },
    sword:     () => { noise(0.14, 0.5, 2500, 1.5, 'highpass'); beep(180, 90, 0.08, 'square', 0.3, 0.02); },
    square:    () => { beep(130, 55, 0.22, 'sine', 0.7); noise(0.15, 0.3, 300, 1); },
    campfire:  () => { noise(0.1, 0.4, 1800, 2, 'bandpass'); noise(0.12, 0.35, 1200, 2, 'bandpass', 0.08); noise(0.14, 0.3, 900, 2, 'bandpass', 0.18); },
  };

  let combo = 0, comboAt = 0;

  return {
    get muted() { return muted; },
    toggleMute() { muted = !muted; return muted; },
    resume() { ensure(); },
    cast(key) { ensure(); (CAST[key] || (() => {}))(); },
    whoosh() { ensure(); noise(0.22, 0.3, 1400, 1.2, 'bandpass'); beep(300, 900, 0.22, 'sine', 0.12); },
    perfect() { ensure(); [880, 1175, 1760].forEach((f, i) => beep(f, f, 0.14, 'sine', 0.35, i * 0.06)); },
    fizzle() { ensure(); beep(220, 90, 0.18, 'sawtooth', 0.3); },
    pick() { ensure(); beep(520, 780, 0.12, 'triangle', 0.45); },
    handle(events) {
      if (!ctx || muted) { if (events.some(e => e.type === 'cast')) ensure(); }
      for (const e of events) {
        switch (e.type) {
          case 'cast': break; // spell sound triggered by main at resolve
          case 'perfect': break; // triggered by main (sfx.perfect)
          case 'kill': {
            const now = performance.now();
            combo = now - comboAt < 900 ? combo + 1 : 1;
            comboAt = now;
            if (!throttled('kill', 45)) beep(300 + Math.min(combo, 8) * 55, 620 + Math.min(combo, 8) * 55, 0.09, 'square', 0.32);
            if (combo === 3) [523, 659].forEach((f, i) => beep(f, f, 0.09, 'triangle', 0.4, i * 0.08));
            if (combo >= 5 && !throttled('rampage', 900)) [523, 659, 784, 1046].forEach((f, i) => beep(f, f, 0.09, 'triangle', 0.42, i * 0.07));
            break;
          }
          case 'bossKill': beep(200, 800, 0.5, 'square', 0.5); noise(0.6, 0.6, 400, 1); break;
          case 'bossSpawn': beep(90, 60, 0.7, 'sawtooth', 0.6); noise(0.5, 0.4, 200, 1); break;
          case 'damage': if (!throttled('dmg', 70)) beep(240, 190, 0.035, 'triangle', 0.13); break;
          case 'spikeHit': if (!throttled('spike', 60)) noise(0.06, 0.3, 2000, 2, 'highpass'); break;
          case 'wave': beep(392, 392, 0.12, 'triangle', 0.4); beep(523, 523, 0.16, 'triangle', 0.4, 0.13); break;
          case 'waveClear': beep(523, 523, 0.1, 'triangle', 0.35); beep(659, 659, 0.1, 'triangle', 0.35, 0.1); beep(784, 784, 0.14, 'triangle', 0.35, 0.2); break;
          case 'draft': beep(660, 660, 0.1, 'sine', 0.3); beep(880, 880, 0.12, 'sine', 0.3, 0.1); break;
          case 'win': [523, 659, 784, 1046].forEach((f, i) => beep(f, f, 0.22, 'triangle', 0.4, i * 0.14)); break;
          case 'lose': [330, 262, 208, 156].forEach((f, i) => beep(f, f * 0.97, 0.3, 'sawtooth', 0.3, i * 0.17)); break;
          case 'gateHit': if (!throttled('gate', 400)) { beep(80, 55, 0.2, 'sine', 0.55); } break;
        }
      }
    },
  };
}
