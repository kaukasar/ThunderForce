'use strict';
// Bossbas med destruerbara delar, faser och dödssekvens. Bossar för bana 1.
(function () {
  const TF = window.TF;
  const W = TF.W, H = TF.H;
  const HULL = { hull: true };
  const MID = (TF.TOP + H) / 2;

  class Boss extends TF.Enemy {
    constructor(g, o) {
      super(g, W + (o.enterOffset || 160), MID);
      this.name = o.name; this.mini = !!o.mini; this.isBoss = true;
      this.hpScale = 1; // bossar och minibossar behåller sin hälsa oförändrad
      this.small = false; this.setHp(o.hp); this.score = o.score || (this.mini ? 10000 : 30000);
      this.homeX = o.homeX || 760; this.homeY = MID;
      this.parts = []; this.hulls = [];
      this.core = { ox: -40, oy: 0, r: 18, isCore: true, x: 0, y: 0 };
      this.state = 'enter'; this.phase = 0;
      this.thresholds = o.thresholds || (this.mini ? [0.5] : [0.66, 0.33]);
      this.timers = {}; this.dieT = 0; this.coreClosed = false; this.phaseFlash = 0;
    }

    addPart(id, ox, oy, r, hp, o = {}) {
      const p = Object.assign({ id, ox, oy, r, hp: Math.round(hp * this.g.diff.hp), alive: true, flash: 0, x: 0, y: 0, score: 1000 }, o);
      p.maxHp = p.hp;
      this.parts.push(p);
      return p;
    }
    part(id) { const p = this.parts.find((q) => q.id === id); return p && p.alive ? p : null; }

    tick(key, interval, dt, first) {
      if (this.timers[key] == null) this.timers[key] = first != null ? first : interval * 0.5;
      this.timers[key] -= dt * this.g.diff.fire;
      if (this.timers[key] <= 0) { this.timers[key] += interval; return true; }
      return false;
    }

    aimPoint() { return { x: this.x + this.core.ox, y: this.y + this.core.oy }; }

    update(dt) {
      const g = this.g;
      this.t += dt;
      this.flash -= dt;
      this.phaseFlash -= dt;
      for (const p of this.parts) p.flash -= dt;
      if (this.state === 'enter') {
        this.x = Math.max(this.homeX, this.x - 150 * dt);
        this.y = TF.lerp(this.y, this.homeY, dt * 2);
        if (this.x <= this.homeX) { this.state = 'fight'; this.fightT = 0; }
      } else if (this.state === 'fight') {
        this.fightT += dt;
        this.pattern(dt);
      } else if (this.state === 'dying') {
        this.dieT += dt;
        if (Math.random() < dt * 14) {
          const hr = this.hulls[Math.floor(Math.random() * this.hulls.length)] || { x: -30, y: -30, w: 60, h: 60 };
          TF.FX.explosion(g, this.x + hr.x + Math.random() * hr.w, this.y + hr.y + Math.random() * hr.h, TF.rand(0.8, 1.6));
          TF.Audio.play('explode');
        }
        g.shake(3, 0.1);
        this.y += 30 * dt;
        if (this.dieT > (this.mini ? 1.6 : 2.6)) this.finish();
      }
      for (const p of this.parts) { p.x = this.x + p.ox; p.y = this.y + p.oy; }
      this.core.x = this.x + this.core.ox; this.core.y = this.y + this.core.oy;
    }

    pattern() {}
    onPhase() {}

    collide(b) {
      if (this.state === 'dying') return null;
      for (const p of this.parts) if (p.alive && b.overlapsCircle(p.x, p.y, p.r)) return p;
      if (b.overlapsCircle(this.core.x, this.core.y, this.core.r)) return this.coreClosed ? HULL : this.core;
      for (const h of this.hulls) if (b.overlapsRect(this.x + h.x, this.y + h.y, h.w, h.h)) return HULL;
      return null;
    }

    hitsPlayer(p) {
      if (this.state === 'dying') return false;
      for (const h of this.hulls) if (TF.circleRect(p.x, p.y, 7, this.x + h.x, this.y + h.y, h.w, h.h)) return true;
      for (const q of this.parts) if (q.alive && TF.circleCircle(q.x, q.y, q.r * 0.8, p.x, p.y, 7)) return true;
      return false;
    }

    takeHit(target, dmg, b) {
      if (target === HULL || this.state !== 'fight') return 'armor';
      const g = this.g;
      if (target.isCore) {
        this.hp -= dmg;
        this.flash = 0.05;
        const frac = this.hp / this.maxHp;
        let ph = 0;
        for (const th of this.thresholds) if (frac <= th) ph++;
        if (ph > this.phase) {
          this.phase = ph;
          this.phaseFlash = 0.25;
          TF.Audio.play('phase');
          g.shake(6, 0.3);
          TF.FX.explosion(g, this.core.x, this.core.y, 1.5, 'purple');
          this.onPhase(ph);
        }
        if (this.hp <= 0) this.startDying();
        return 'hit';
      }
      target.hp -= dmg;
      target.flash = 0.05;
      if (target.hp <= 0) {
        target.alive = false;
        g.addScore(target.score, target.x, target.y);
        TF.FX.explosion(g, target.x, target.y, 1.8);
        TF.FX.debris(g, target.x, target.y, 8);
        TF.Audio.play('bigExplode');
        g.shake(6, 0.3);
      }
      return 'hit';
    }

    startDying() {
      const g = this.g;
      this.hp = 0;
      this.state = 'dying';
      this.alive = false;
      g.enemyBullets.length = 0;
      g.lasers.length = 0;
      TF.Audio.play('bigExplode');
      g.shake(8, 0.6);
    }

    finish() {
      const g = this.g;
      this.dead = true;
      g.addScore(this.score, this.x, this.y, (this.mini ? 'MINIBOSS ' : 'BOSS ') + this.score);
      for (let i = 0; i < 6; i++) {
        TF.FX.explosion(g, this.x + TF.rand(-60, 60), this.y + TF.rand(-60, 60), TF.rand(1.5, 3));
      }
      TF.FX.explosion(g, this.x, this.y, 4, 'purple');
      TF.Audio.play('bigExplode');
      g.shake(this.mini ? 14 : 22, this.mini ? 0.7 : 1.2);
      for (const e of g.enemies) if (!e.isBoss && !e.indestructible && e.x < W + 20) e.destroy();
      g.onBossDefeated(this);
    }

    // hjälpare för ritning
    drawPartGun(ctx, p, color = '#8890a0') {
      if (!p.alive) {
        ctx.fillStyle = '#2a2a2a';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.7, 0, Math.PI * 2); ctx.fill();
        if (Math.random() < 0.1) this.g.particles.spawn(p.x, p.y, TF.rand(-20, 20), -40, 0.8, 6, '#555', 3, 0.97, 12);
        return;
      }
      const fl = p.flash > 0;
      ctx.fillStyle = fl ? '#fff' : color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = fl ? '#fff' : '#303640';
      ctx.fillRect(p.x - p.r - 10, p.y - 4, p.r + 6, 8);
      ctx.fillStyle = '#ff5050';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.4, 0, Math.PI * 2); ctx.fill();
    }

    drawCore(ctx, col = '#ff3a6a') {
      const c = this.core, fl = this.flash > 0;
      ctx.fillStyle = '#20202a';
      ctx.beginPath(); ctx.arc(c.x, c.y, c.r + 5, 0, Math.PI * 2); ctx.fill();
      if (this.coreClosed) {
        ctx.fillStyle = '#6a7080';
        ctx.fillRect(c.x - c.r, c.y - c.r, c.r * 2, c.r * 2);
        ctx.strokeStyle = '#303040';
        ctx.beginPath(); ctx.moveTo(c.x, c.y - c.r); ctx.lineTo(c.x, c.y + c.r); ctx.stroke();
        return;
      }
      const pulse = 1 + 0.12 * Math.sin(this.t * 8);
      ctx.fillStyle = fl ? '#fff' : col;
      ctx.beginPath(); ctx.arc(c.x, c.y, c.r * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffe0ea';
      ctx.beginPath(); ctx.arc(c.x - c.r * 0.25, c.y - c.r * 0.25, c.r * 0.35, 0, Math.PI * 2); ctx.fill();
    }

    hullPath(ctx, pts) {
      ctx.beginPath();
      pts.forEach(([px, py], i) => (i ? ctx.lineTo(this.x + px, this.y + py) : ctx.moveTo(this.x + px, this.y + py)));
      ctx.closePath();
    }

    draw(ctx) {
      ctx.save();
      if (this.state === 'dying') ctx.translate(TF.rand(-3, 3), TF.rand(-3, 3));
      this.drawBody(ctx);
      ctx.restore();
    }
  }
  TF.Boss = Boss;
  TF.BOSSES = {};

  // ---------------------------------------------------------------------------
  // Bana 1 miniboss
  class Gargoyle extends Boss {
    constructor(g) {
      super(g, { name: 'GARGOYLE', mini: true, hp: 110, homeX: 760 });
      this.hulls = [{ x: -45, y: -30, w: 100, h: 60 }];
      this.addPart('gunTop', -24, -40, 14, 18);
      this.addPart('gunBot', -24, 40, 14, 18);
      this.core = Object.assign(this.core, { ox: -48, oy: 0, r: 16 });
    }
    pattern(dt) {
      const g = this.g;
      this.y = TF.lerp(this.y, MID + Math.sin(this.fightT * 0.9) * 120, dt * 3);
      this.x = TF.lerp(this.x, this.homeX + Math.sin(this.fightT * 0.5) * 40, dt * 3);
      const top = this.part('gunTop'), bot = this.part('gunBot');
      if (this.phase === 0) {
        if (this.tick('guns', 0.75, dt)) {
          this.alt = !this.alt;
          const gun = this.alt ? top || bot : bot || top;
          if (gun) TF.shootAimed(g, gun.x - 18, gun.y, 240);
        }
        if (this.tick('core', 2.2, dt)) TF.shootAimed(g, this.core.x - 10, this.core.y, 220, 3, 0.25);
      } else {
        if (this.tick('burst', 1.4, dt)) this.burst = 3;
        if (this.burst > 0 && this.tick('burstGap', 0.12, dt, 0)) {
          this.burst--;
          for (const gun of [top, bot]) if (gun) TF.shootAimed(g, gun.x - 18, gun.y, 300, 1, 0, { kind: 'needle', color: '#ffb040' });
        }
        if (this.tick('fan', 1.9, dt)) TF.shootAimed(g, this.core.x - 10, this.core.y, 200, 9, 0.2);
        if (this.tick('swarm', 6, dt, 2)) g.spawnFormation('sine', 4, { y: TF.rand(120, 420), amp: 50 });
      }
    }
    drawBody(ctx) {
      const fl = this.phaseFlash > 0;
      ctx.fillStyle = fl ? '#ffd0d0' : '#5a3a6a';
      this.hullPath(ctx, [[-55, 0], [-30, -32], [40, -34], [62, -10], [62, 10], [40, 34], [-30, 32]]);
      ctx.fill();
      ctx.fillStyle = '#3a2448';
      this.hullPath(ctx, [[0, -34], [30, -60], [55, -58], [40, -34]]); ctx.fill();
      this.hullPath(ctx, [[0, 34], [30, 60], [55, 58], [40, 34]]); ctx.fill();
      ctx.fillStyle = '#ff9030';
      ctx.fillRect(this.x + 62, this.y - 8, 8 + Math.random() * 8, 16);
      this.drawPartGun(ctx, this.parts[0], '#8a70a0');
      this.drawPartGun(ctx, this.parts[1], '#8a70a0');
      this.drawCore(ctx);
    }
  }
  TF.BOSSES.gargoyle = Gargoyle;

  // Bana 1 slutboss
  class IronHydra extends Boss {
    constructor(g) {
      super(g, { name: 'IRON HYDRA', hp: 300, homeX: 740 });
      this.hulls = [{ x: -70, y: -48, w: 160, h: 96 }, { x: 80, y: -22, w: 50, h: 44 }];
      this.addPart('headTop', -80, -80, 18, 40, { score: 2000 });
      this.addPart('headBot', -80, 80, 18, 40, { score: 2000 });
      this.addPart('pod', 30, -62, 16, 34, { score: 2000 });
      this.core = Object.assign(this.core, { ox: -78, oy: 0, r: 20 });
      this.lunge = 0;
    }
    pattern(dt) {
      const g = this.g;
      const ht = this.part('headTop'), hb = this.part('headBot'), pod = this.part('pod');
      const sway = Math.sin(this.fightT * 2) * 10;
      this.parts[0].oy = -80 + sway; this.parts[1].oy = 80 - sway;
      this.parts[0].ox = this.parts[1].ox = -80 + Math.cos(this.fightT * 1.5) * 12;
      let tx = this.homeX;
      if (this.phase >= 2) {
        this.lunge += dt;
        if (this.lunge > 6) this.lunge = 0;
        if (this.lunge > 4.5) tx = this.homeX - 260;
      }
      this.x = TF.lerp(this.x, tx, dt * (this.phase >= 2 ? 2.2 : 1.5));
      this.y = TF.lerp(this.y, MID + Math.sin(this.fightT * (0.6 + this.phase * 0.25)) * 100, dt * 2);

      if (this.tick('heads', this.phase >= 2 ? 1.8 : 1.6, dt)) {
        this.alt = !this.alt;
        const head = this.alt ? ht || hb : hb || ht;
        if (head) {
          if (this.phase >= 2) TF.shootAimed(g, head.x - 16, head.y, 240, 5, 0.18);
          else this.headBurst = { head, n: 3 };
        }
      }
      if (this.headBurst && this.headBurst.n > 0 && this.tick('hb', 0.13, dt, 0)) {
        const h = this.headBurst.head;
        if (h.alive) TF.shootAimed(g, h.x - 16, h.y, 280, 1, 0, { kind: 'needle', color: '#ffb040' });
        this.headBurst.n--;
      }
      if (this.phase >= 1) {
        if (pod && this.tick('missile', 3.6, dt)) {
          g.enemies.push(new TF.Missile(g, pod.x, pod.y - 10, -Math.PI / 2 - 0.4));
          g.enemies.push(new TF.Missile(g, pod.x, pod.y - 10, -Math.PI / 2 + 0.4));
        }
        if (this.tick('ring', 3, dt)) TF.shootRing(g, this.core.x, this.core.y, 12, 170, this.fightT);
      }
      if (this.phase >= 2) {
        if (this.tick('laser', 3.2, dt)) {
          const p = g.player;
          g.lasers.push(new TF.ELaser(g, () => this.aimPoint(), TF.angleTo(this.core.x, this.core.y, p.x, p.y), 0.8, 0.5, 18, this));
        }
        if (this.tick('swarm', 7, dt, 3)) g.spawnFormation('swoop', 5, { y: TF.rand(160, 380), dirY: TF.choose([-1, 1]) });
      }
    }
    drawBody(ctx) {
      const fl = this.phaseFlash > 0;
      // halsar
      ctx.strokeStyle = '#4a4238';
      ctx.lineWidth = 12;
      for (const p of this.parts.slice(0, 2)) {
        ctx.beginPath();
        ctx.moveTo(this.x - 40, this.y + Math.sign(p.oy) * 30);
        ctx.quadraticCurveTo(this.x - 50, p.y, p.x, p.y);
        ctx.stroke();
      }
      ctx.fillStyle = fl ? '#ffe0d0' : '#6a5a48';
      this.hullPath(ctx, [[-90, 0], [-60, -50], [60, -50], [95, -24], [135, -20], [135, 20], [95, 24], [60, 50], [-60, 50]]);
      ctx.fill();
      ctx.strokeStyle = '#a89070';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#4a3e30';
      for (let i = 0; i < 4; i++) ctx.fillRect(this.x - 30 + i * 26, this.y - 40, 16, 80);
      ctx.fillStyle = '#ff9030';
      ctx.fillRect(this.x + 135, this.y - 10, 10 + Math.random() * 12, 20);
      for (const p of this.parts) this.drawPartGun(ctx, p, p.id === 'pod' ? '#708060' : '#a08060');
      this.drawCore(ctx);
    }
  }
  TF.BOSSES.hydra = IronHydra;
})();
