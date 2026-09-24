// Confetti and star bursts drawn on a full-screen canvas.

const canvas = document.getElementById('fx');
const g = canvas.getContext('2d');
const COLORS = ['#ff6b6b', '#ffc93c', '#34c77b', '#4dabf7', '#8e7dff', '#ff8a5b', '#f783ac'];
let parts = [];
let running = false;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener('resize', resize);
resize();

function star(x, y, r) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? r * 0.45 : r;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    g.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  g.closePath();
  g.fill();
}

function loop() {
  g.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter((p) => p.life > 0 && p.y < innerHeight + 40);
  for (const p of parts) {
    p.vy += p.grav;
    p.vx *= 0.99;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.spin;
    p.life -= 1;
    g.globalAlpha = Math.min(1, p.life / 30);
    g.fillStyle = p.color;
    g.save();
    g.translate(p.x, p.y);
    g.rotate(p.rot);
    if (p.shape === 'star') star(0, 0, p.size);
    else if (p.shape === 'circle') { g.beginPath(); g.arc(0, 0, p.size / 2, 0, Math.PI * 2); g.fill(); }
    else g.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    g.restore();
  }
  g.globalAlpha = 1;
  if (parts.length) requestAnimationFrame(loop);
  else running = false;
}

function start() {
  if (!running) { running = true; requestAnimationFrame(loop); }
}

// Burst of confetti and stars from a point (e.g. the centre of the right card).
export function burst(x, y, count = 70) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 9;
    parts.push({
      x, y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed - 5,
      grav: 0.28,
      size: 8 + Math.random() * 12,
      rot: Math.random() * 6,
      spin: (Math.random() - 0.5) * 0.3,
      color: COLORS[(Math.random() * COLORS.length) | 0],
      shape: ['rect', 'circle', 'star', 'star'][(Math.random() * 4) | 0],
      life: 90 + Math.random() * 40,
    });
  }
  start();
}

// Confetti raining from the top edge (end-of-game celebration).
export function rain(count = 160) {
  for (let i = 0; i < count; i++) {
    parts.push({
      x: Math.random() * innerWidth,
      y: -20 - Math.random() * innerHeight * 0.6,
      vx: (Math.random() - 0.5) * 2,
      vy: 2 + Math.random() * 3,
      grav: 0.05,
      size: 10 + Math.random() * 10,
      rot: Math.random() * 6,
      spin: (Math.random() - 0.5) * 0.2,
      color: COLORS[(Math.random() * COLORS.length) | 0],
      shape: ['rect', 'star', 'circle'][(Math.random() * 3) | 0],
      life: 400,
    });
  }
  start();
}

export function clearFx() {
  parts = [];
}
