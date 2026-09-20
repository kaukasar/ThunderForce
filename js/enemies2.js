'use strict';
// Turrets, medeltunga fiender och miljöhinder (rörliga väggar, fallande stenar, laserportar).
(function () {
  const TF = window.TF;
  const W = TF.W, H = TF.H;

  // Mark-/takmonterad kanon som vrider sig mot spelaren.
  class Turret extends TF.Enemy {
    constructor(g, x, mount, o = {}) {
      super(g, x, 0);
      this.ground = true; this.mount = mount;
      this.setHp(5); this.r = 15; this.score = 300;
      this.barrel = mount === 'floor' ? -Math.PI / 2 : Math.PI / 2;
      this.burst = !!o.burst;
      this.fireTimer = TF.rand(0.6, 1.6);
      this.shotsLeft = 0; this.burstT = 0;
      this.snap();
    }
    snap() {
      const T = this.g.terrain, wx = this.g.scrollX + this.x;
      this.y = this.mount === 'floor' ? T.floorY(wx) - 8 : T.ceilY(wx) + 8;
    }
    behave(dt) {
      const g = this.g, p = g.player;
      this.snap();
      let want = TF.angleTo(this.x, this.y, p.x, p.y);
      if (this.mount === 'floor') want = want > Math.PI / 2 ? -Math.PI + 0.1 : TF.clamp(want, -Math.PI + 0.1, -0.1);
      else want = want < -Math.PI / 2 ? Math.PI - 0.1 : TF.clamp(want, 0.1, Math.PI - 0.1);
      const d = TF.wrapAngle(want - this.barrel);
      this.barrel += TF.clamp(d, -2.4 * dt, 2.4 * dt);

      this.fireTimer -= dt * g.diff.fire;
      if (this.fireTimer <= 0) {
        this.fireTimer = this.burst ? 2.6 : 1.9;
        if (this.canFire()) {
          if (this.burst) { this.shotsLeft = 3; this.burstT = 0; } else this.fire();
        }
      }
      if (this.shotsLeft > 0) {
        this.burstT -= dt;
        if (this.burstT <= 0) { this.fire(); this.shotsLeft--; this.burstT = 0.13; }
      }
    }
    fire() {
      const bx = this.x + Math.cos(this.barrel) * 20, by = this.y + Math.sin(this.barrel) * 20;
      TF.shoot(this.g, bx, by, this.barrel, 240);
      TF.FX.muzzle(this.g, bx, by, '#ffb040', 8);
    }
    draw(ctx) {
      const fl = this.flash > 0;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.save();
      ctx.rotate(this.barrel);
      ctx.fillStyle = fl ? '#fff' : '#9098a8';
      ctx.fillRect(0, -4, 22, 8);
      ctx.fillStyle = '#50586a';
      ctx.fillRect(16, -5, 6, 10);
      ctx.restore();
      const up = this.mount === 'floor' ? 1 : -1;
      ctx.fillStyle = fl ? '#fff' : (this.burst ? '#a05040' : '#607090');
      ctx.beginPath();
      ctx.arc(0, 0, 13, up > 0 ? Math.PI : 0, up > 0 ? Math.PI * 2 : Math.PI);
      ctx.fill();
      ctx.fillStyle = fl ? '#fff' : '#303848';
      ctx.fillRect(-17, 0 + (up > 0 ? 0 : -8), 34, 8);
      ctx.fillStyle = '#ff5050';
      ctx.fillRect(-3, up > 0 ? -7 : 3, 6, 4);
      ctx.restore();
    }
  }
  TF.Turret = Turret;

  // Medeltung fiende: åker in, stannar, anfaller och drar sig tillbaka.
  class Heavy extends TF.Enemy {
    constructor(g, from, ty, o = {}) {
      const tx = o.tx || 720;
      const sx = from === 'right' ? W + 60 : tx;
      const sy = from === 'top' ? TF.TOP - 60 : from === 'bottom' ? H + 60 : ty;
      super(g, sx, sy);
      this.from = from; this.tx = tx; this.ty = ty;
      this.attack = o.attack || 'spread';
      this.setHp(o.hp || 26); this.r = 26; this.small = false; this.score = 1500;
      this.state = 'enter'; this.stay = o.stay || 5; this.drop = o.drop || null;
      this.fireTimer = 0.6;
    }
    behave(dt) {
      const g = this.g, sp = g.diff.speed;
      if (this.state === 'enter') {
        this.vx = TF.clamp((this.tx - this.x) * 3, -320, 320) * sp;
        this.vy = TF.clamp((this.ty - this.y) * 3, -320, 320) * sp;
        if (TF.dist2(this.x, this.y, this.tx, this.ty) < 64) { this.state = 'attack'; this.stateT = 0; }
      } else if (this.state === 'attack') {
        this.stateT += dt;
        this.vx = 0;
        this.vy = Math.cos(this.t * 1.5) * 20;
        this.fireTimer -= dt * g.diff.fire;
        if (this.fireTimer <= 0 && g.player.alive) {
          if (this.attack === 'spread') {
            this.fireTimer = 1.25;
            TF.shootAimed(g, this.x - 28, this.y, 230, 5, 0.22);
          } else {
            this.fireTimer = 2.5;
            const p = g.player;
            const a = TF.angleTo(this.x - 28, this.y, p.x, p.y);
            g.lasers.push(new TF.ELaser(g, () => ({ x: this.x - 28, y: this.y }), a, 0.8 / g.diff.fire, 0.5, 14, this));
          }
        }
        if (this.stateT > this.stay) this.state = 'retreat';
      } else {
        if (this.from === 'right') this.vx += 500 * dt;
        else if (this.from === 'top') this.vy -= 500 * dt;
        else this.vy += 500 * dt;
      }
    }
    draw(ctx) {
      const fl = this.flash > 0;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.fillStyle = fl ? '#fff' : '#3d5a4a';
      ctx.beginPath();
      ctx.moveTo(-34, 0); ctx.lineTo(-18, -20); ctx.lineTo(24, -26); ctx.lineTo(34, -8);
      ctx.lineTo(34, 8); ctx.lineTo(24, 26); ctx.lineTo(-18, 20);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = fl ? '#fff' : '#27382f';
      ctx.fillRect(-6, -30, 26, 8);
      ctx.fillRect(-6, 22, 26, 8);
      ctx.fillStyle = fl ? '#fff' : '#80908a';
      ctx.fillRect(-40, -5, 16, 10);
      const glow = this.attack === 'laser' ? '#ff4ac0' : '#ffb030';
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(-4, 0, 7 + Math.sin(this.t * 8) * 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff9020';
      ctx.fillRect(34, -6, 6 + Math.random() * 6, 4);
      ctx.fillRect(34, 2, 6 + Math.random() * 6, 4);
      // liten hälsomätare
      if (this.hp < this.maxHp) {
        ctx.fillStyle = '#300';
        ctx.fillRect(-24, -38, 48, 4);
        ctx.fillStyle = '#f44';
        ctx.fillRect(-24, -38, 48 * (this.hp / this.maxHp), 4);
      }
      ctx.restore();
    }
  }
  TF.Heavy = Heavy;

  // Oförstörbar vägg som glider upp och ner.
  class MovingWall extends TF.Enemy {
    constructor(g, x, o = {}) {
      super(g, x, 0);
      this.ground = true; this.indestructible = true; this.targetable = false; this.small = false;
      this.w = o.w || 40; this.h = o.h || 130;
      this.yMin = o.yMin != null ? o.yMin : TF.TOP + 60;
      this.yMax = o.yMax != null ? o.yMax : H - 60;
      this.speed = o.speed || 1.6; this.phase = o.phase || 0;
      this.update(0);
    }
    behave() {
      const k = (Math.sin(this.t * this.speed * this.g.diff.speed + this.phase) + 1) / 2;
      this.y = TF.lerp(this.yMin, this.yMax, k);
    }
    collide(b) { return b.overlapsRect(this.x - this.w / 2, this.y - this.h / 2, this.w, this.h) ? this : null; }
    hitsPlayer(p) { return TF.circleRect(p.x, p.y, 8, this.x - this.w / 2, this.y - this.h / 2, this.w, this.h); }
    draw(ctx) {
      const x = this.x - this.w / 2, y = this.y - this.h / 2;
      ctx.fillStyle = '#4a5468';
      ctx.fillRect(x, y, this.w, this.h);
      ctx.fillStyle = '#6a7690';
      ctx.fillRect(x + 4, y + 4, this.w - 8, this.h - 8);
      ctx.save();
      ctx.beginPath(); ctx.rect(x + 4, y + 4, this.w - 8, this.h - 8); ctx.clip();
      ctx.fillStyle = '#e0b020';
      for (let i = -this.w; i < this.h + this.w; i += 20) {
        ctx.beginPath();
        ctx.moveTo(x, y + i); ctx.lineTo(x + this.w, y + i - this.w);
        ctx.lineTo(x + this.w, y + i - this.w + 9); ctx.lineTo(x, y + i + 9);
        ctx.fill();
      }
      ctx.restore();
      ctx.strokeStyle = '#b8d4ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, this.w, this.h);
    }
  }
  TF.MovingWall = MovingWall;

  // Fallande sten från taket (förstörbar).
  class Rock extends TF.Enemy {
    constructor(g, x, o = {}) {
      super(g, x, 0);
      const T = g.terrain;
      this.r = o.size || TF.rand(13, 20);
      this.y = T ? Math.max(TF.TOP - this.r, T.ceilY(g.scrollX + x) - this.r) : TF.TOP - this.r;
      this.ground = true; this.setHp(this.r > 17 ? 4 : 2); this.score = 150;
      this.vy = o.vy || 20; this.rot = 0; this.spin = TF.rand(-3, 3);
      this.verts = [];
      for (let i = 0; i < 8; i++) this.verts.push(this.r * TF.rand(0.75, 1.1));
    }
    behave(dt) {
      const g = this.g;
      this.vy = Math.min(300 * g.diff.speed, this.vy + 420 * g.diff.speed * dt);
      this.rot += this.spin * dt;
      if (g.terrain && this.y > g.terrain.floorY(g.scrollX + this.x) - this.r * 0.4) {
        this.dead = true;
        TF.FX.debris(g, this.x, this.y, 8, '#8a5a40');
        TF.FX.explosion(g, this.x, this.y, 0.4);
      }
    }
    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot);
      ctx.fillStyle = this.flash > 0 ? '#fff' : '#6a4030';
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const rr = this.verts[i];
        if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#ff8a3a';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#40241a';
      ctx.beginPath(); ctx.arc(-3, -2, this.r * 0.35, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
  TF.Rock = Rock;

  // Laserbarriär: pulserar av/på, kan stängas av genom att förstöra generatornoden.
  class LaserGate extends TF.Enemy {
    constructor(g, x, o = {}) {
      super(g, x, 0);
      this.ground = true; this.small = false;
      this.node = o.node || 'floor';
      this.setHp(o.hp || 14); this.r = 16; this.score = 1000;
      this.on = o.on || 1.6; this.off = o.off || 1.3; this.phase = o.phase || 0;
      this.top = TF.TOP; this.bottom = H; this.beamOn = false; this.warnOn = false;
      this.behave(0);
    }
    behave() {
      const g = this.g, wx = g.scrollX + this.x;
      this.top = g.terrain ? g.terrain.ceilY(wx) : TF.TOP;
      this.bottom = g.terrain ? g.terrain.floorY(wx) : H;
      this.y = this.node === 'floor' ? this.bottom - 14 : this.top + 14;
      const cycle = this.on + this.off;
      const ph = (this.t + this.phase) % cycle;
      const wasOn = this.beamOn;
      this.beamOn = ph < this.on;
      this.warnOn = !this.beamOn && ph > cycle - 0.45;
      if (this.beamOn && !wasOn && this.x > 0 && this.x < W) TF.Audio.play('laserFire');
    }
    hitsPlayer(p) {
      if (TF.circleCircle(this.x, this.y, this.r, p.x, p.y, 7)) return true;
      return this.beamOn && Math.abs(p.x - this.x) < 12 && p.y > this.top && p.y < this.bottom;
    }
    draw(ctx) {
      const fl = this.flash > 0;
      const x = this.x;
      if (this.beamOn) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const w = 12 + Math.sin(this.t * 50) * 2;
        ctx.fillStyle = 'rgba(80,220,255,0.55)';
        ctx.fillRect(x - w / 2, this.top, w, this.bottom - this.top);
        ctx.fillStyle = '#e8fbff';
        ctx.fillRect(x - 2, this.top, 4, this.bottom - this.top);
        ctx.restore();
      } else if (this.warnOn && Math.floor(this.t * 20) % 2 === 0) {
        ctx.fillStyle = 'rgba(80,220,255,0.35)';
        ctx.fillRect(x - 1, this.top, 2, this.bottom - this.top);
      }
      // emittrar i båda ändar
      ctx.fillStyle = '#505a70';
      ctx.fillRect(x - 12, this.top, 24, 10);
      ctx.fillRect(x - 12, this.bottom - 10, 24, 10);
      // generatornod
      ctx.fillStyle = fl ? '#fff' : '#303848';
      ctx.beginPath(); ctx.arc(x, this.y, this.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = fl ? '#fff' : (this.beamOn ? '#50e0ff' : '#2a7090');
      ctx.beginPath(); ctx.arc(x, this.y, this.r * 0.55 + Math.sin(this.t * 6) * 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffd040';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, this.y, this.r + 3, this.t * 3, this.t * 3 + 2); ctx.stroke();
    }
  }
  TF.LaserGate = LaserGate;
})();
