'use strict';
// Parallax-bakgrund (flera lager) och terräng (tak/golv) per bana.
(function () {
  const TF = window.TF;
  const W = TF.W, H = TF.H;

  const hash = (i, seed) => {
    const s = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };

  TF.THEMES = {
    gorgon: {
      sky: [[0, '#05051a'], [0.55, '#1d1045'], [1, '#4a1f55']],
      far: '#2a1a48', mid: '#170f2c',
      fill: ['#3c5e2c', '#15230f'], edge: '#9be05f', detail: '#26401a',
      star: '#cfe0ff', accent: '#ff8ac0',
    },
    fortress: {
      sky: [[0, '#000006'], [0.5, '#060b1e'], [1, '#0c1430']],
      far: '#141c36', mid: '#0d1428',
      fill: ['#5a6a82', '#1c2433'], edge: '#b8d4ff', detail: '#34405a',
      star: '#ffffff', accent: '#4ad8ff',
    },
    magma: {
      sky: [[0, '#1a0404'], [0.6, '#4a0f08'], [1, '#8a2a0a']],
      far: '#3a0d08', mid: '#240805',
      fill: ['#4a2418', '#140804'], edge: '#ff8a2a', detail: '#2a1008',
      star: '#ffb080', accent: '#ffcc40',
    },
  };

  class Background {
    constructor(themeId) {
      this.id = themeId;
      this.theme = TF.THEMES[themeId];
      this.drift = 0;
      this.t = 0;
      this.stars = [];
      for (let i = 0; i < 110; i++) {
        this.stars.push({ x: Math.random() * W, y: TF.TOP + Math.random() * (H - TF.TOP), l: Math.random() });
      }
      this.skyGrad = null;
    }

    update(dt) {
      this.t += dt;
      this.drift += dt * 14;
    }

    draw(ctx, scrollX) {
      const th = this.theme;
      if (!this.skyGrad) {
        this.skyGrad = ctx.createLinearGradient(0, TF.TOP, 0, H);
        for (const [o, c] of th.sky) this.skyGrad.addColorStop(o, c);
      }
      ctx.fillStyle = this.skyGrad;
      ctx.fillRect(0, 0, W, H);

      // Lager 1: stjärnfält (tre djup)
      ctx.fillStyle = th.star;
      for (const s of this.stars) {
        const f = 0.03 + s.l * 0.12;
        const x = (((s.x - (scrollX * f + this.drift * (0.3 + s.l))) % W) + W) % W;
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(this.t * (1 + s.l * 3) + s.x));
        ctx.globalAlpha = (0.25 + s.l * 0.6) * tw;
        const sz = s.l > 0.85 ? 2 : 1;
        ctx.fillRect(x, s.y, sz, sz);
      }
      ctx.globalAlpha = 1;

      if (this.id === 'gorgon') this.drawGorgon(ctx, scrollX);
      else if (this.id === 'fortress') this.drawFortress(ctx, scrollX);
      else this.drawMagma(ctx, scrollX);
    }

    ridge(ctx, scrollX, factor, base, amp, color, seed) {
      const off = scrollX * factor;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W + 16; x += 16) {
        const wx = x + off;
        const y = base - amp * (0.5 * Math.sin(wx * 0.004 + seed) + 0.3 * Math.sin(wx * 0.011 + seed * 2) + 0.2 * Math.sin(wx * 0.027 + seed * 3));
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();
    }

    drawGorgon(ctx, scrollX) {
      const th = this.theme;
      // planet i fjärran
      const px = 720 - scrollX * 0.01;
      ctx.fillStyle = '#3a2266';
      ctx.beginPath(); ctx.arc(px, 150, 70, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4e3080';
      ctx.beginPath(); ctx.arc(px - 14, 138, 56, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,160,220,0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(px, 150, 120, 20, -0.25, 0, Math.PI * 2); ctx.stroke();
      // Lager 2 & 3: berg på olika avstånd
      this.ridge(ctx, scrollX, 0.15, 380, 90, th.far, 1);
      this.ridge(ctx, scrollX, 0.4, 450, 70, th.mid, 5);
    }

    drawFortress(ctx, scrollX) {
      const th = this.theme;
      // nebulosa
      const nx = 500 - (scrollX * 0.02) % 1400;
      const grad = ctx.createRadialGradient(nx, 260, 10, nx, 260, 260);
      grad.addColorStop(0, 'rgba(80,60,160,0.35)');
      grad.addColorStop(1, 'rgba(20,10,60,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(nx - 260, 0, 520, H);
      // Lager 2: avlägsna stationstorn
      const segW = 70;
      let off = scrollX * 0.2;
      ctx.fillStyle = th.far;
      for (let i = Math.floor(off / segW); i * segW - off < W; i++) {
        const h = 60 + hash(i, 3) * 180;
        const x = i * segW - off;
        ctx.fillRect(x + 8, H - h, segW - 22, h);
        ctx.fillRect(x + 8, TF.TOP, segW - 40, 30 + hash(i, 9) * 60);
        if (hash(i, 7) > 0.5) {
          ctx.fillStyle = 'rgba(74,216,255,0.35)';
          ctx.fillRect(x + 14, H - h + 12, 4, 4);
          ctx.fillStyle = th.far;
        }
      }
      // Lager 3: balkverk närmare
      off = scrollX * 0.5;
      const seg2 = 180;
      ctx.strokeStyle = th.mid;
      ctx.lineWidth = 10;
      for (let i = Math.floor(off / seg2); i * seg2 - off < W + seg2; i++) {
        if (hash(i, 11) < 0.35) continue;
        const x = i * seg2 - off;
        ctx.beginPath();
        ctx.moveTo(x, TF.TOP); ctx.lineTo(x + 60, H);
        ctx.moveTo(x + 60, TF.TOP); ctx.lineTo(x, H);
        ctx.stroke();
        ctx.fillStyle = th.mid;
        ctx.fillRect(x - 10, TF.TOP, 12, H);
      }
    }

    drawMagma(ctx, scrollX) {
      const th = this.theme;
      // pulserande glöd
      const glow = ctx.createLinearGradient(0, H - 200, 0, H);
      glow.addColorStop(0, 'rgba(255,90,20,0)');
      glow.addColorStop(1, `rgba(255,120,30,${0.25 + 0.1 * Math.sin(this.t * 2)})`);
      ctx.fillStyle = glow;
      ctx.fillRect(0, H - 200, W, 200);
      this.ridge(ctx, scrollX, 0.15, 400, 110, th.far, 2);
      // Lager 3: klippstoder
      const off = scrollX * 0.42, segW = 150;
      ctx.fillStyle = th.mid;
      for (let i = Math.floor(off / segW); i * segW - off < W; i++) {
        if (hash(i, 4) < 0.4) continue;
        const x = i * segW - off + hash(i, 5) * 60;
        const w = 30 + hash(i, 6) * 40;
        ctx.beginPath();
        ctx.moveTo(x, H);
        ctx.lineTo(x + w * 0.3, 200 + hash(i, 8) * 120);
        ctx.lineTo(x + w * 0.7, 180 + hash(i, 8) * 120);
        ctx.lineTo(x + w, H);
        ctx.fill();
      }
    }
  }
  TF.Background = Background;

  // ---------------------------------------------------------------------------
  // Terräng: punkter [världsX, takhöjd, golvhöjd] med linjär interpolation.
  class Terrain {
    constructor(points, themeId) {
      this.pts = points.map(([x, c, f]) => ({ x, c, f }));
      this.theme = TF.THEMES[themeId];
      this.themeId = themeId;
    }

    raw(wx) {
      const p = this.pts;
      if (wx <= p[0].x) return p[0];
      if (wx >= p[p.length - 1].x) return p[p.length - 1];
      let lo = 0, hi = p.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (p[mid].x <= wx) lo = mid; else hi = mid;
      }
      const a = p[lo], b = p[hi], t = (wx - a.x) / (b.x - a.x);
      return { c: a.c + (b.c - a.c) * t, f: a.f + (b.f - a.f) * t };
    }

    rough(wx, h, seed) {
      if (h <= 0) return 0;
      const k = Math.min(1, h / 30);
      return (Math.sin(wx * 0.031 + seed) * 4 + Math.sin(wx * 0.0117 + seed * 2) * 7 + Math.sin(wx * 0.083) * 2) * k;
    }

    ceilY(wx) {
      const c = this.raw(wx).c;
      return TF.TOP + Math.max(0, c + this.rough(wx, c, 0));
    }

    floorY(wx) {
      const f = this.raw(wx).f;
      return H - Math.max(0, f + this.rough(wx, f, 3));
    }

    draw(ctx, scrollX, t) {
      const th = this.theme;
      const STEP = 8;
      let hasC = false, hasF = false;
      for (let x = 0; x <= W; x += 120) {
        const r = this.raw(scrollX + x);
        if (r.c > 0) hasC = true;
        if (r.f > 0) hasF = true;
      }
      const r1 = this.raw(scrollX + W);
      if (r1.c > 0) hasC = true;
      if (r1.f > 0) hasF = true;
      const edge = this.themeId === 'magma'
        ? `rgb(255,${120 + Math.floor(60 * Math.sin(t * 3))},40)` : th.edge;

      const drawPart = (isCeil) => {
        const grad = ctx.createLinearGradient(0, isCeil ? TF.TOP + 160 : H - 160, 0, isCeil ? TF.TOP : H);
        grad.addColorStop(0, th.fill[0]);
        grad.addColorStop(1, th.fill[1]);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, isCeil ? 0 : H);
        const ys = [];
        for (let x = 0; x <= W + STEP; x += STEP) {
          const y = isCeil ? this.ceilY(scrollX + x) : this.floorY(scrollX + x);
          ys.push(y);
          ctx.lineTo(x, y);
        }
        ctx.lineTo(W + STEP, isCeil ? 0 : H);
        ctx.closePath();
        ctx.fill();
        // inre detaljlinje
        ctx.strokeStyle = th.detail;
        ctx.lineWidth = 4;
        ctx.beginPath();
        for (let i = 0; i < ys.length; i++) {
          const y = ys[i] + (isCeil ? -12 : 12);
          if (i === 0) ctx.moveTo(0, y); else ctx.lineTo(i * STEP, y);
        }
        ctx.stroke();
        // kantlinje
        ctx.strokeStyle = edge;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        let started = false;
        for (let i = 0; i < ys.length; i++) {
          const onEdge = isCeil ? ys[i] > TF.TOP + 1 : ys[i] < H - 1;
          if (!onEdge) { started = false; continue; }
          if (!started) { ctx.moveTo(i * STEP, ys[i]); started = true; } else ctx.lineTo(i * STEP, ys[i]);
        }
        ctx.stroke();
        // panelfogar på fästningsbanan
        if (this.themeId === 'fortress') {
          ctx.strokeStyle = th.detail;
          ctx.lineWidth = 2;
          const seg = 64, off = scrollX % seg;
          for (let x = -off; x < W; x += seg) {
            const y = isCeil ? this.ceilY(scrollX + x) : this.floorY(scrollX + x);
            if (isCeil ? y <= TF.TOP + 2 : y >= H - 2) continue;
            ctx.beginPath();
            ctx.moveTo(x, y + (isCeil ? -4 : 4));
            ctx.lineTo(x, isCeil ? TF.TOP : H);
            ctx.stroke();
          }
        }
      };
      if (hasC) drawPart(true);
      if (hasF) drawPart(false);
    }
  }
  TF.Terrain = Terrain;
})();
