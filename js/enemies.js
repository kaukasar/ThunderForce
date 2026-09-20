'use strict';
// Fiendebas, fiendeprojektiler, svärmfiender, formationer, bärare och missiler.
(function () {
  const TF = window.TF;
  const W = TF.W, H = TF.H;

  // ---------------------------------------------------------------------------
  class EBullet {
    constructor(x, y, vx, vy, o) {
      this.x = x; this.y = y; this.vx = vx; this.vy = vy;
      this.r = 5; this.color = '#ff4f8b'; this.kind = 'orb'; this.dead = false; this.t = 0;
      this.terrain = true;
      if (o) Object.assign(this, o);
    }
    update(dt, g) {
      this.t += dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (this.x < -30 || this.x > W + 30 || this.y < TF.TOP - 30 || this.y > H + 30) this.dead = true;
      else if (this.terrain && g.terrain) {
        const wx = g.scrollX + this.x;
        if (this.y < g.terrain.ceilY(wx) - 4 || this.y > g.terrain.floorY(wx) + 4) this.dead = true;
      }
    }
    hitsPlayer(p) { return TF.circleCircle(this.x, this.y, this.r * 0.7, p.x, p.y, 4); }
    draw(ctx) {
      if (this.kind === 'needle') {
        const a = Math.atan2(this.vy, this.vx);
        ctx.save();
        ctx.translate(this.x, this.y); ctx.rotate(a);
        ctx.fillStyle = this.color;
        ctx.fillRect(-9, -2.5, 18, 5);
        ctx.fillStyle = '#fff';
        ctx.fillRect(-6, -1, 12, 2);
        ctx.restore();
        return;
      }
      const pulse = 1 + 0.15 * Math.sin(this.t * 20);
      ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.r * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(this.x, this.y, this.r * 0.45, 0, Math.PI * 2); ctx.fill();
    }
  }
  TF.EBullet = EBullet;

  // Skjut en fiendeprojektil (hastighet skalas med svårighetsgrad).
  TF.shoot = function (g, x, y, angle, speed, o) {
    const s = speed * g.diff.bullet;
    g.enemyBullets.push(new EBullet(x, y, Math.cos(angle) * s, Math.sin(angle) * s, o));
    TF.Audio.play('enemyShot');
  };
  TF.shootAimed = function (g, x, y, speed, count = 1, spread = 0.2, o) {
    const p = g.player;
    const base = TF.angleTo(x, y, p.alive ? p.x : 100, p.alive ? p.y : H / 2);
    for (let i = 0; i < count; i++) {
      const a = base + (count > 1 ? (i - (count - 1) / 2) * spread : 0);
      TF.shoot(g, x, y, a, speed, o);
    }
  };
  TF.shootRing = function (g, x, y, n, speed, offset = 0, o) {
    for (let i = 0; i < n; i++) TF.shoot(g, x, y, offset + (i / n) * Math.PI * 2, speed, o);
  };

  // Laserstråle med förvarning. anchor() returnerar startpunkt.
  class ELaser {
    constructor(g, anchor, angle, warn = 0.7, dur = 0.6, width = 16, owner = null) {
      this.g = g; this.anchor = anchor; this.angle = angle;
      this.warn = warn; this.dur = dur; this.width = width; this.owner = owner;
      this.t = 0; this.dead = false; this.len = 1400; this.fired = false;
      TF.Audio.play('laserCharge');
    }
    get active() { return this.t >= this.warn; }
    update(dt, g) {
      this.t += dt;
      if (this.owner && (this.owner.dead || this.owner.alive === false)) { this.dead = true; return; }
      if (this.active && !this.fired) { this.fired = true; TF.Audio.play('laserFire'); }
      if (this.t > this.warn + this.dur) this.dead = true;
    }
    endPoints() {
      const a = this.anchor();
      return [a.x, a.y, a.x + Math.cos(this.angle) * this.len, a.y + Math.sin(this.angle) * this.len];
    }
    hitsPlayer(p) {
      if (!this.active) return false;
      const [x1, y1, x2, y2] = this.endPoints();
      const r = this.width * 0.4 + 3;
      return TF.pointSegDist2(p.x, p.y, x1, y1, x2, y2) < r * r;
    }
    draw(ctx) {
      const [x1, y1, x2, y2] = this.endPoints();
      ctx.save();
      ctx.lineCap = 'round';
      if (!this.active) {
        ctx.globalAlpha = 0.35 + 0.35 * Math.sin(this.t * 40);
        ctx.strokeStyle = '#ff6ad0';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 8]);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffb0f0';
        const k = this.t / this.warn;
        ctx.beginPath(); ctx.arc(x1, y1, 4 + k * 10, 0, Math.PI * 2); ctx.fill();
      } else {
        const fade = Math.min(1, (this.warn + this.dur - this.t) * 8);
        const w = this.width * fade * (1 + 0.1 * Math.sin(this.t * 60));
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = '#ff3aa8';
        ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.strokeStyle = '#ffe0f6';
        ctx.lineWidth = w * 0.4;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      }
      ctx.restore();
    }
  }
  TF.ELaser = ELaser;

  // ---------------------------------------------------------------------------
  class Enemy {
    constructor(g, x, y) {
      this.g = g; this.x = x; this.y = y; this.vx = 0; this.vy = 0;
      this.r = 14; this.hp = 1; this.maxHp = 1; this.score = 100;
      this.small = true; this.t = 0; this.flash = 0; this.dead = false;
      this.ground = false; this.formation = null; this.drop = null;
      this.targetable = true; this.indestructible = false; this.solid = true;
      this.fireTimer = 0;
      this.hpScale = 1.5; // +50 % tålighet för vanliga fiender (bossar sätter 1)
    }
    // Halva steg avrundas uppåt, så en fiende som annars dött på en enda träff
    // kräver två skott.
    setHp(base) { this.hp = this.maxHp = Math.max(1, Math.round(base * this.hpScale * this.g.diff.hp)); }
    aimPoint() { return this; }
    update(dt) {
      this.t += dt;
      this.flash -= dt;
      if (this.ground) this.x -= this.g.scrollSpeed * dt;
      this.behave(dt);
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (this.x < -120 || this.x > W + 400 || this.y < -250 || this.y > H + 250) this.escape();
    }
    behave() {}
    escape() {
      this.dead = true;
      if (this.formation) this.formation.broken = true;
    }
    collide(b) { return b.overlapsCircle(this.x, this.y, this.r) ? this : null; }
    hitsPlayer(p) { return this.solid && TF.circleCircle(this.x, this.y, this.r * 0.8, p.x, p.y, 7); }
    // returnerar 'armor' | 'hit' | 'kill'
    takeHit(target, dmg) {
      if (this.indestructible) return 'armor';
      this.hp -= dmg;
      this.flash = 0.06;
      if (this.hp <= 0) { this.destroy(); return 'kill'; }
      return 'hit';
    }
    destroy() {
      if (this.dead) return;
      const g = this.g;
      this.dead = true;
      g.addScore(this.score, this.x, this.y);
      this.explode();
      if (this.drop) g.spawnItem(this.x, this.y, this.drop);
      if (this.formation) this.formation.onKill(this);
    }
    explode() {
      TF.FX.explosion(this.g, this.x, this.y, this.small ? 0.9 : 1.8);
      TF.Audio.play(this.small ? 'explode' : 'bigExplode');
      if (!this.small) this.g.shake(5, 0.25);
    }
    canFire() { return this.x > 120 && this.x < W - 30 && this.g.player.alive; }
    draw() {}
  }
  TF.Enemy = Enemy;

  class Formation {
    constructor(g, count, drop) {
      this.g = g; this.count = count; this.killed = 0; this.broken = false; this.drop = drop;
    }
    onKill(e) {
      this.killed++;
      if (this.killed === this.count && !this.broken) {
        const bonus = 200 * this.count;
        this.g.addScore(bonus, e.x, e.y - 20, 'FORMATION ' + bonus);
        TF.Audio.play('bonus');
        if (this.drop) this.g.spawnItem(e.x, e.y, this.drop);
      }
    }
  }
  TF.Formation = Formation;

  // ---------------------------------------------------------------------------
  // Svärmfiende: följer en fördefinierad bana.
  class Grunt extends Enemy {
    constructor(g, x, y, path, o = {}) {
      super(g, x, y);
      this.path = path; this.y0 = y; this.phase = o.phase || 0;
      this.amp = o.amp || 70; this.dirY = o.dirY || 0; this.stopX = o.stopX || 640;
      this.setHp(o.hp || 1);
      this.r = 13; this.score = 100;
      this.state = 0; this.stateT = 0;
      this.color = { sine: '#e04a6a', line: '#d06a2a', dive: '#b04ad0', swoop: '#e0a02a', rear: '#40b0a0', zig: '#e04a6a' }[path] || '#e04a6a';
      this.fireChance = o.fireChance != null ? o.fireChance : 0.12;
      this.angle = Math.PI;
    }
    behave(dt) {
      const g = this.g, sp = g.diff.speed;
      switch (this.path) {
        case 'sine':
          this.vx = -210 * sp;
          this.y = this.y0 + Math.sin(this.t * 2.6 + this.phase) * this.amp;
          break;
        case 'line':
          this.vx = -250 * sp; this.vy = this.dirY * sp;
          break;
        case 'zig':
          this.vx = -230 * sp;
          this.vy = (Math.sin(this.t * 4 + this.phase) > 0 ? 1 : -1) * 150 * sp;
          break;
        case 'swoop':
          this.vx = -250 * sp;
          this.vy = this.dirY * Math.cos(this.t * 1.7) * 220 * sp;
          break;
        case 'rear':
          this.vx = 240 * sp;
          this.y = this.y0 + Math.sin(this.t * 3 + this.phase) * 30;
          this.angle = 0;
          break;
        case 'dive':
          this.stateT += dt;
          if (this.state === 0) {
            this.vx = -320 * sp;
            if (this.x < this.stopX) { this.state = 1; this.stateT = 0; }
          } else if (this.state === 1) {
            this.vx *= Math.pow(0.02, dt);
            if (this.stateT > 0.45) {
              this.state = 2;
              const p = g.player;
              const a = TF.angleTo(this.x, this.y, p.x - 60, p.y);
              this.vx = Math.cos(a) * 400 * sp; this.vy = Math.sin(a) * 400 * sp;
              this.angle = a;
            }
          }
          break;
      }
      if (this.path !== 'dive' || this.state !== 2) this.angle = this.path === 'rear' ? 0 : Math.PI - Math.atan2(this.vy, -this.vx || 1) * 0.4;
      if (this.canFire() && Math.random() < this.fireChance * g.diff.fire * dt) {
        TF.shootAimed(g, this.x, this.y, 210);
      }
    }
    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle - Math.PI);
      const fl = this.flash > 0;
      ctx.fillStyle = fl ? '#fff' : this.color;
      ctx.beginPath();
      ctx.moveTo(-15, 0); ctx.lineTo(4, -12); ctx.lineTo(14, -10); ctx.lineTo(8, 0); ctx.lineTo(14, 10); ctx.lineTo(4, 12);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = fl ? '#fff' : '#2a1a2a';
      ctx.beginPath(); ctx.ellipse(0, 0, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd040';
      ctx.beginPath(); ctx.arc(-3, 0, 3 + Math.sin(this.t * 10), 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
  TF.Grunt = Grunt;

  // Bärare som släpper en power-up.
  class Carrier extends Enemy {
    constructor(g, x, y, drop) {
      super(g, x, y);
      this.drop = drop; this.setHp(6); this.r = 18; this.score = 500; this.y0 = y;
    }
    behave() {
      this.vx = -95 * this.g.diff.speed;
      this.y = this.y0 + Math.sin(this.t * 2) * 20;
    }
    draw(ctx) {
      const fl = this.flash > 0, c = TF.ITEM_INFO[this.drop].color;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.fillStyle = fl ? '#fff' : '#8a6a3a';
      ctx.beginPath(); ctx.ellipse(0, 0, 22, 14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = fl ? '#fff' : '#5a4020';
      ctx.fillRect(-22, -3, 44, 6);
      ctx.fillStyle = Math.floor(this.t * 6) % 2 ? c : '#fff';
      ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c09050';
      ctx.fillRect(14, -16, 4, 32);
      ctx.restore();
    }
  }
  TF.Carrier = Carrier;

  // Målsökande, förstörbar missil.
  class Missile extends Enemy {
    constructor(g, x, y, angle) {
      super(g, x, y);
      this.setHp(1); this.r = 8; this.score = 50; this.angle = angle; this.speed = 120;
      this.life = 6;
    }
    behave(dt) {
      const g = this.g, p = g.player;
      this.life -= dt;
      if (this.life <= 0) {
        this.dead = true;
        TF.FX.explosion(g, this.x, this.y, 0.5);
        return;
      }
      this.speed = Math.min(260 * g.diff.speed, this.speed + 160 * dt);
      if (p.alive && this.t > 0.3) {
        const d = TF.wrapAngle(TF.angleTo(this.x, this.y, p.x, p.y) - this.angle);
        this.angle += TF.clamp(d, -1.6 * dt, 1.6 * dt);
      }
      this.vx = Math.cos(this.angle) * this.speed;
      this.vy = Math.sin(this.angle) * this.speed;
      if (Math.random() < 0.5) g.particles.spawn(this.x - Math.cos(this.angle) * 10, this.y - Math.sin(this.angle) * 10, 0, 0, 0.3, 4, '#aaa', 3, 1, 10);
    }
    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.fillStyle = this.flash > 0 ? '#fff' : '#d0d0d8';
      ctx.fillRect(-9, -3, 16, 6);
      ctx.fillStyle = '#ff3030';
      ctx.beginPath(); ctx.moveTo(7, -3); ctx.lineTo(12, 0); ctx.lineTo(7, 3); ctx.fill();
      ctx.fillStyle = '#ffa030';
      ctx.fillRect(-13, -2, 4, 4);
      ctx.restore();
    }
  }
  TF.Missile = Missile;
})();
