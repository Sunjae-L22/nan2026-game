// NAN 2026 — deploy smoke test.
// Purpose: prove GitHub Pages serves index.html + /src correctly, input works,
// and rendering hits 60 FPS. Replaced by real game code after concept lock.
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const fpsEl = document.getElementById('fps');

  let W, H;
  const resize = () => { W = canvas.width = innerWidth; H = canvas.height = innerHeight; };
  addEventListener('resize', resize);
  resize();

  const dots = Array.from({ length: 80 }, () => ({
    x: Math.random() * W, y: Math.random() * H,
    vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 160,
    r: 2 + Math.random() * 3, hue: 190 + Math.random() * 80
  }));

  // Click/tap burst — verifies pointer input on desktop and mobile.
  addEventListener('pointerdown', (e) => {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2, s = 120 + Math.random() * 120;
      dots.push({
        x: e.clientX, y: e.clientY,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        r: 2 + Math.random() * 2, hue: 20 + Math.random() * 40, ttl: 1.2
      });
    }
  });

  let last = performance.now(), acc = 0, frames = 0;
  const tick = (now) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    acc += dt; frames++;
    if (acc >= 0.5) { fpsEl.textContent = `FPS: ${Math.round(frames / acc)}`; acc = 0; frames = 0; }

    ctx.fillStyle = 'rgba(15, 18, 32, 0.35)';
    ctx.fillRect(0, 0, W, H);

    for (let i = dots.length - 1; i >= 0; i--) {
      const d = dots[i];
      d.x += d.vx * dt; d.y += d.vy * dt;
      if (d.x < 0 || d.x > W) { d.vx *= -1; d.x = Math.max(0, Math.min(W, d.x)); }
      if (d.y < 0 || d.y > H) { d.vy *= -1; d.y = Math.max(0, Math.min(H, d.y)); }
      if (d.ttl !== undefined && (d.ttl -= dt) <= 0) { dots.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsl(${d.hue} 90% 65%)`;
      ctx.fill();
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  console.log('[smoke] NAN 2026 scaffold v0.1 — no errors expected');
})();
