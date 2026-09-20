'use strict';
// Partiklar, explosioner, flytande poängtext.
(function () {
  const TF = window.TF;
  const MAX = 1200;

  // typ: 0 = glödande prick, 1 = gnista (streck), 2 = ring, 3 = rök, 4 = skräp
  class Particles {
    constructor() {
      this.pool = [];
      for (let i = 0; i < MAX; i++) this.pool.push({ alive: false });
      this.count = 0;
      this.texts = [];
    }

    clear() {
      for (const p of this.pool) p.alive = false;
      this.texts.length = 0;
    }

    spawn(x, y, vx, vy, life, size, color, type = 0, drag = 0.9, grow = 0) {
      let p = null;
      for (let i = 0; i < MAX; i++) {
        const idx = (this.count + i) % MAX;
        if (!this.pool[idx].alive) { p = this.pool[idx]; this.count = idx + 1; break; }
      }
      if (!p) { p = this.pool[this.count % MAX]; this.count++; }
      p.alive = true; p.x = x; p.y = y; p.vx = vx; p.vy = vy;
      p.life = life; p.maxLife = life; p.size = size; p.color = color;
      p.type = type; p.drag = drag; p.grow = grow;
      return p;
    }

    text(x, y, str, color = '#fff', size = 14) {
      this.texts.push({ x, y, str, color, size, life: 1.0 });
    }

    update(dt, scrollSpeed) {
      for (const p of this.pool) {
        if (!p.alive) continue;
        p.life -= dt;
        if (p.life <= 0) { p.alive = false; continue; }
        const d = Math.pow(p.drag, dt * 60);
        p.vx *= d; p.vy *= d;
        p.x += (p.vx - scrollSpeed * 0.5) * dt;
        p.y += p.vy * dt;
        p.size += p.grow * dt;
      }
      for (let i = this.texts.length - 1; i >= 0; i--) {
        const t = this.texts[i];
        t.life -= dt;
        t.y -= 30 * dt;
        if (t.life <= 0) this.texts.splice(i, 1);
      }
    }

    draw(ctx) {
      ctx.save();
      // rök ritas först med normal blandning
      for (const p of this.pool) {
        if (!p.alive || (p.type !== 3 && p.type !== 4)) continue;
        const a = p.life / p.maxLife;
        ctx.globalAlpha = p.type === 3 ? a * 0.45 : Math.min(1, a * 2);
        ctx.fillStyle = p.color;
        if (p.type === 3) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
      }
      ctx.globalCompositeOperation = 'lighter';
      for (const p of this.pool) {
        if (!p.alive || p.type === 3 || p.type === 4) continue;
        const a = p.life / p.maxLife;
        ctx.globalAlpha = a;
        if (p.type === 0) {
          ctx.fillStyle = p.color;
          const s = p.size * (0.4 + a * 0.6);
          ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
        } else if (p.type === 1) {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
          ctx.stroke();
        } else if (p.type === 2) {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 3 * a + 0.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.textAlign = 'center';
      for (const t of this.texts) {
        ctx.globalAlpha = Math.min(1, t.life * 2);
        ctx.font = `bold ${t.size}px Consolas, monospace`;
        ctx.fillStyle = '#000';
        ctx.fillText(t.str, t.x + 1, t.y + 1);
        ctx.fillStyle = t.color;
        ctx.fillText(t.str, t.x, t.y);
      }
      ctx.restore();
    }
  }
  TF.Particles = Particles;

  const PALETTES = {
    fire: ['#fff6c0', '#ffd24a', '#ff8a1f', '#ff4a1a'],
    blue: ['#e8fbff', '#7fe3ff', '#3aa0ff', '#6060ff'],
    green: ['#f0ffe0', '#a8ff6a', '#40d060', '#20a080'],
    purple: ['#fff0ff', '#e6a0ff', '#b060ff', '#7040ff'],
  };

  TF.FX = {
    explosion(g, x, y, scale = 1, palette = 'fire') {
      const P = g.particles, pal = PALETTES[palette] || PALETTES.fire;
      const n = Math.floor(14 * scale + 6);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = TF.rand(40, 260) * Math.sqrt(scale);
        P.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s, TF.rand(0.3, 0.8), TF.rand(3, 7) * Math.sqrt(scale), TF.choose(pal), 0, 0.9);
      }
      for (let i = 0; i < n / 2; i++) {
        const a = Math.random() * Math.PI * 2, s = TF.rand(150, 500) * Math.sqrt(scale);
        P.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s, TF.rand(0.15, 0.4), 2, pal[0], 1, 0.88);
      }
      for (let i = 0; i < 3 + scale * 2; i++) {
        P.spawn(x + TF.rand(-8, 8) * scale, y + TF.rand(-8, 8) * scale, TF.rand(-30, 30), TF.rand(-30, 30),
          TF.rand(0.5, 1.1), TF.rand(6, 12) * scale, '#554c48', 3, 0.95, 20 * scale);
      }
      P.spawn(x, y, 0, 0, 0.35, 6 * scale, pal[1], 2, 1, 160 * scale);
      P.spawn(x, y, 0, 0, 0.12, 14 * scale, '#ffffff', 0, 1, 0);
    },

    debris(g, x, y, n = 6, color = '#8a8f99') {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = TF.rand(60, 220);
        g.particles.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s, TF.rand(0.4, 0.9), TF.rand(3, 6), color, 4, 0.93);
      }
    },

    sparks(g, x, y, n = 4, color = '#ffe080', angle = Math.PI, spread = 1.2) {
      for (let i = 0; i < n; i++) {
        const a = angle + TF.rand(-spread, spread), s = TF.rand(120, 380);
        g.particles.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s, TF.rand(0.08, 0.22), 1.5, color, 1, 0.85);
      }
    },

    muzzle(g, x, y, color, size = 6) {
      g.particles.spawn(x, y, 0, 0, 0.06, size, color, 0, 1);
    },
  };
})();
