'use strict';
// Spelarens vapen och projektiler.
(function () {
  const TF = window.TF;
  const W = TF.W, H = TF.H;

  // Ordningen här är också ordningen i vapenslottarna (1-5) och den ordning
  // vapnen delas ut i banorna: Twin, Back Fire, Sideblaster, Hunter, Wave.
  TF.WEAPONS = [
    { id: 'twin',   name: 'TWIN SHOT', short: 'TWIN',  color: '#6fd8ff', rate: 0.09 },
    { id: 'back',   name: 'BACK FIRE', short: 'BACK',  color: '#ffcf5a', rate: 0.1 },
    { id: 'sideblaster', name: 'SIDEBLASTER', short: 'SIDE', color: '#37ffd2', rate: 0.1 },
    { id: 'hunter', name: 'HUNTER',    short: 'HUNT',  color: '#9dff6a', rate: 0.15 },
    { id: 'wave',   name: 'WAVE',      short: 'WAVE',  color: '#b0803c', rate: 0.17 },
  ];

  class PBullet {
    constructor(o) {
      this.x = 0; this.y = 0; this.vx = 0; this.vy = 0;
      this.dmg = 1; this.r = 5; this.life = 1.2;
      this.kind = 'twin'; this.color = '#6fd8ff';
      this.homing = false; this.pierce = false; this.terrainPass = false;
      this.len = 18; this.h = 0; this.maxH = 0; this.age = 0;
      this.dead = false; this.hitSet = null; this.target = null;
      Object.assign(this, o);
      if (this.pierce) this.hitSet = new Set();
    }

    overlapsCircle(cx, cy, cr) {
      if (this.kind === 'wave') {
        return TF.circleRect(cx, cy, cr, this.x - 8, this.y - this.h / 2, 16, this.h);
      }
      return TF.circleCircle(this.x, this.y, this.r, cx, cy, cr);
    }

    overlapsRect(x, y, w, h) {
      if (this.kind === 'wave') return TF.rectRect(this.x - 8, this.y - this.h / 2, 16, this.h, x, y, w, h);
      return TF.circleRect(this.x, this.y, this.r, x, y, w, h);
    }

    update(dt, g) {
      this.age += dt;
      this.life -= dt;
      if (this.life <= 0) { this.dead = true; return; }
      if (this.homing) {
        if (!this.target || this.target.dead || !this.target.targetable) this.target = g.nearestTarget(this.x, this.y);
        const sp = Math.hypot(this.vx, this.vy);
        if (this.target) {
          const tp = this.target.aimPoint ? this.target.aimPoint() : this.target;
          const want = TF.angleTo(this.x, this.y, tp.x, tp.y);
          const cur = Math.atan2(this.vy, this.vx);
          const d = TF.wrapAngle(want - cur);
          const turn = 9 * dt;
          const na = cur + TF.clamp(d, -turn, turn);
          const ns = Math.min(sp + 900 * dt, 720);
          this.vx = Math.cos(na) * ns;
          this.vy = Math.sin(na) * ns;
        }
        if (this.age % 0.05 < dt) g.particles.spawn(this.x, this.y, 0, 0, 0.2, 3, '#5fbf40', 0, 1);
      }
      if (this.kind === 'wave') this.h = Math.min(this.maxH, this.h + 260 * dt);
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (this.x < -40 || this.x > W + 40 || this.y < TF.TOP - 40 || this.y > H + 40) { this.dead = true; return; }
      if (!this.terrainPass && g.terrain) {
        const wx = g.scrollX + this.x;
        if (this.y < g.terrain.ceilY(wx) || this.y > g.terrain.floorY(wx)) {
          this.dead = true;
          TF.FX.sparks(g, this.x, this.y, 3, this.color, Math.atan2(-this.vy, -this.vx), 0.8);
        }
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      switch (this.kind) {
        case 'twin':
        case 'back': {
          const dir = Math.sign(this.vx) || 1;
          ctx.fillStyle = this.color;
          ctx.fillRect(dir > 0 ? this.x - this.len : this.x, this.y - 1.25, this.len, 2.5);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(dir > 0 ? this.x - this.len + 4 : this.x + 2, this.y - 0.5, this.len - 6, 1);
          break;
        }
        case 'hunter': {
          const a = Math.atan2(this.vy, this.vx);
          ctx.translate(this.x, this.y);
          ctx.rotate(a);
          ctx.fillStyle = this.color;
          ctx.beginPath();
          ctx.moveTo(8, 0); ctx.lineTo(-6, -4); ctx.lineTo(-3, 0); ctx.lineTo(-6, 4);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.fillRect(-1, -1, 5, 2);
          break;
        }
        case 'wave': {
          // tunna, guldbruna vågor: dämpad kontrast som är skonsammare för ögonen
          const h = this.h;
          ctx.strokeStyle = this.color;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.ellipse(this.x - 6, this.y, 10, h / 2, 0, -Math.PI / 2, Math.PI / 2);
          ctx.stroke();
          ctx.strokeStyle = '#d8ab63';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(this.x - 6, this.y, 10, h / 2, 0, -Math.PI / 2, Math.PI / 2);
          ctx.stroke();
          ctx.globalAlpha = 0.35;
          ctx.strokeStyle = this.color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(this.x - 20, this.y, 8, h / 2.4, 0, -Math.PI / 2, Math.PI / 2);
          ctx.stroke();
          break;
        }
        case 'sideblaster': {
          // samma stråle oavsett riktning (framåt, uppåt eller nedåt)
          ctx.translate(this.x, this.y);
          ctx.rotate(Math.atan2(this.vy, this.vx));
          ctx.fillStyle = this.color;
          ctx.fillRect(-this.len, -1.5, this.len, 3);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-this.len + 4, -0.6, this.len - 6, 1.2);
          break;
        }
      }
      ctx.restore();
    }
  }
  TF.PBullet = PBullet;

  // Avfyrar vapnet. isCraw = satellit (svagare extraskott).
  TF.fireWeapon = function (g, index, x, y, isCraw) {
    const wdef = TF.WEAPONS[index];
    const c = wdef.color;
    const add = (o) => g.playerBullets.push(new PBullet(Object.assign({ color: c, kind: wdef.id }, o)));
    const k = isCraw ? 0.5 : 1;
    switch (wdef.id) {
      case 'twin':
        if (isCraw) add({ x: x + 6, y, vx: 1000, dmg: 0.5, r: 4, len: 12 });
        else {
          add({ x: x + 14, y: y - 6, vx: 1050, dmg: 1 });
          add({ x: x + 14, y: y + 6, vx: 1050, dmg: 1 });
        }
        break;
      case 'back':
        if (isCraw) {
          add({ x: x + 6, y, vx: 1000, dmg: 0.5, r: 4, len: 12 });
          add({ x: x - 6, y, vx: -1000, dmg: 0.5, r: 4, len: 12 });
        } else {
          add({ x: x + 14, y: y - 5, vx: 1050, dmg: 1 });
          add({ x: x + 14, y: y + 5, vx: 1050, dmg: 1 });
          add({ x: x - 16, y: y - 4, vx: -1050, dmg: 1 });
          add({ x: x - 16, y: y + 4, vx: -1050, dmg: 1 });
        }
        break;
      case 'hunter': {
        const n = isCraw ? 1 : 2;
        for (let i = 0; i < n; i++) {
          const side = n === 1 ? (Math.random() < 0.5 ? -1 : 1) : i === 0 ? -1 : 1;
          add({ x: x + 6, y: y + side * 6, vx: 380, vy: side * 260, dmg: 0.35 * k * (isCraw ? 1.2 : 1), r: 6, homing: true, life: 2.4 });
        }
        break;
      }
      case 'wave':
        add({ x: x + 16, y, vx: 760, dmg: isCraw ? 0.6 : 1.4, h: isCraw ? 14 : 22, maxH: isCraw ? 44 : 96, pierce: true, terrainPass: true, life: 1.6 });
        break;
      case 'sideblaster':
        // rakt fram som Twin Shot + en skottlinje rakt upp och en rakt ner.
        // Sidoprojektilerna gör dubbel skada mot de framåtriktade.
        if (isCraw) {
          add({ x: x + 6, y, vx: 1000, dmg: 0.5, r: 4, len: 12 });
          add({ x, y: y - 6, vy: -1000, dmg: 1, r: 4, len: 12 });
          add({ x, y: y + 6, vy: 1000, dmg: 1, r: 4, len: 12 });
        } else {
          add({ x: x + 14, y: y - 6, vx: 1050, dmg: 1 });
          add({ x: x + 14, y: y + 6, vx: 1050, dmg: 1 });
          add({ x: x - 2, y: y - 12, vy: -1000, dmg: 2 });
          add({ x: x - 2, y: y + 12, vy: 1000, dmg: 2 });
          TF.FX.muzzle(g, x - 2, y - 14, c, 8);
          TF.FX.muzzle(g, x - 2, y + 14, c, 8);
        }
        break;
    }
  };
})();
