'use strict';
// Spelarens skepp, satelliter (CRAW), sköld och power-up-kapslar.
(function () {
  const TF = window.TF;
  const W = TF.W, H = TF.H;
  const SPEED = 290;

  class Player {
    constructor(g) {
      this.g = g;
      this.owned = [true, false, false, false, false];
      this.weapon = 0;
      this.craws = 0;
      this.shield = 0;
      this.place(120, (TF.TOP + H) / 2);
    }

    place(x, y) {
      this.x = x; this.y = y;
      this.alive = true;
      this.invuln = 0;
      this.fireCd = 0;
      this.crawAngle = 0;
      this.respawnTimer = 0;
      this.tilt = 0;
      this.t = 0;
      this.exiting = false;   // banövergång: skeppet flyger ut ur bild
      this.exitDone = false;
      this.exitSpeed = 0;
      this.entering = false;  // banövergång: skeppet flyger in från vänster
    }

    // Startar inflygning från vänster kant till startpositionen.
    startEntry() {
      this.entering = true;
      this.enterX = this.x;
      this.x = -70;
      this.invuln = 2;
    }

    updateEnter(dt) {
      const g = this.g;
      this.invuln = 2; // oskadbar under inflygningen (ingen blinkning)
      const vx = Math.max(90, (this.enterX - this.x) * 4.5);
      this.x = Math.min(this.enterX, this.x + vx * dt);
      this.tilt = TF.lerp(this.tilt, 0, Math.min(1, dt * 8));
      this.crawAngle += dt * 3.2;
      if (Math.random() < 0.9) {
        g.particles.spawn(this.x - 22, this.y + TF.rand(-4, 4), -vx * 0.3 - TF.rand(0, 80), TF.rand(-20, 20),
          TF.rand(0.12, 0.3), 3 + vx / 250, TF.choose(['#fff4b0', '#ff9a2a', '#7fe3ff']), 0, 0.92);
      }
      if (this.x >= this.enterX - 0.5) {
        this.x = this.enterX;
        this.entering = false;
        this.invuln = 1.5; // kort skydd (blinkar) efter landning
      }
    }

    startExit() {
      this.exiting = true;
      this.exitDone = false;
      this.exitSpeed = 60;
      TF.Audio.play('boost');
    }

    // Efter slutbossen tar skeppet fart framåt och lämnar skärmen.
    updateExit(dt) {
      const g = this.g;
      this.exitSpeed = Math.min(1500, this.exitSpeed + 650 * dt);
      this.x += this.exitSpeed * dt;
      this.tilt = TF.lerp(this.tilt, 0, Math.min(1, dt * 8));
      this.crawAngle += dt * 3.2;
      const k = this.exitSpeed / 1500;
      for (let i = 0; i < 2; i++) {
        g.particles.spawn(this.x - 22, this.y + TF.rand(-5, 5), -this.exitSpeed * 0.25 - TF.rand(0, 120), TF.rand(-25, 25),
          TF.rand(0.15, 0.35), 3 + k * 4, TF.choose(['#fff4b0', '#ff9a2a', '#7fe3ff']), 0, 0.92);
      }
      // hastighetsstreck som ger en känsla av fart
      if (Math.random() < 0.6 + k) {
        g.particles.spawn(TF.rand(0, TF.W), TF.rand(TF.TOP, TF.H), -400 - this.exitSpeed, 0, 0.25, 1.5, '#cfe0ff', 1, 0.97);
      }
      if (this.x > TF.W + 90) this.exitDone = true;
    }

    nextOwned(from) {
      for (let i = 1; i <= 5; i++) {
        const idx = (from + i) % 5;
        if (this.owned[idx]) return idx;
      }
      return 0;
    }

    crawPos(i) {
      const a = this.crawAngle + i * Math.PI;
      return { x: this.x - 4 + Math.cos(a) * 40, y: this.y + Math.sin(a) * 34 };
    }

    update(dt) {
      const g = this.g, I = TF.Input;
      this.t += dt;
      if (!this.alive) {
        if (this.respawnTimer > 0) {
          this.respawnTimer -= dt;
          if (this.respawnTimer <= 0 && g.lives > 0) this.respawn();
        }
        return;
      }
      this.invuln = Math.max(0, this.invuln - dt);

      if (this.exiting) { this.updateExit(dt); return; }
      if (this.entering) { this.updateEnter(dt); return; }

      // 8-riktad förflyttning, läses varje frame
      let dx = (I.isDown('right') ? 1 : 0) - (I.isDown('left') ? 1 : 0);
      let dy = (I.isDown('down') ? 1 : 0) - (I.isDown('up') ? 1 : 0);
      if (g.autopilot) { dx = g.autopilot.dx || 0; dy = g.autopilot.dy || 0; }
      if (dx && dy) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }
      this.x = TF.clamp(this.x + dx * SPEED * dt, 22, W - 26);
      this.y = TF.clamp(this.y + dy * SPEED * dt, TF.TOP + 12, H - 10);
      this.tilt = TF.lerp(this.tilt, dy, Math.min(1, dt * 10));

      this.checkTerrain();
      if (!this.alive) return;

      // vapenväxling
      if (I.wasPressed('switch')) {
        const n = this.nextOwned(this.weapon);
        if (n !== this.weapon) {
          this.weapon = n;
          TF.Audio.play('switch');
          g.particles.text(this.x, this.y - 24, TF.WEAPONS[n].name, TF.WEAPONS[n].color, 12);
        }
      }

      // auto-fire när knappen hålls nere
      this.fireCd -= dt;
      if ((I.isDown('fire') || (g.autopilot && g.autopilot.fire)) && this.fireCd <= 0) {
        const wd = TF.WEAPONS[this.weapon];
        TF.fireWeapon(g, this.weapon, this.x, this.y, false);
        for (let i = 0; i < this.craws; i++) {
          const p = this.crawPos(i);
          TF.fireWeapon(g, this.weapon, p.x, p.y, true);
        }
        if (this.craws) TF.Audio.play('craw');
        TF.Audio.play(wd.id);
        this.fireCd += wd.rate;
        if (this.fireCd < 0) this.fireCd = 0;
      }
      this.crawAngle += dt * 3.2;
    }

    checkTerrain() {
      const g = this.g, T = g.terrain;
      if (!T) return;
      const pts = [[18, 0], [-6, -9], [-6, 9], [-16, 0]];
      for (const [ox, oy] of pts) {
        const wx = g.scrollX + this.x + ox, py = this.y + oy;
        const cy = T.ceilY(wx), fy = T.floorY(wx);
        if (py < cy || py > fy) {
          if (this.invuln > 0 || g.playerProtected()) {
            if (py < cy) this.y += cy - py + 1; else this.y -= py - fy + 1;
          } else {
            this.hit('terrain');
            if (this.alive) {
              if (py < cy) this.y += cy - py + 6; else this.y -= py - fy + 6;
            }
          }
          return;
        }
      }
    }

    // returnerar true om skeppet förstördes
    hit(source) {
      const g = this.g;
      if (!this.alive || this.invuln > 0 || g.playerProtected()) return false;
      if (this.shield > 0) {
        this.shield--;
        this.invuln = 0.6;
        TF.FX.sparks(g, this.x, this.y, 14, '#7fe3ff', 0, Math.PI);
        if (this.shield === 0) {
          TF.Audio.play('shieldBreak');
          TF.Audio.play('lowLife');
          g.particles.text(this.x, this.y - 30, 'SHIELD DOWN!', '#ff6060', 13);
        } else {
          TF.Audio.play('shieldHit');
        }
        return false;
      }
      this.die();
      return true;
    }

    die() {
      const g = this.g;
      this.alive = false;
      TF.FX.explosion(g, this.x, this.y, 2.4, 'blue');
      TF.FX.explosion(g, this.x + 10, this.y - 6, 1.2, 'fire');
      TF.FX.debris(g, this.x, this.y, 10, '#9fb6d8');
      TF.Audio.play('death');
      g.shake(10, 0.5);
      g.lives--;
      // Enbart det aktiva vapnet förloras (startvapnet kan aldrig förloras).
      // Dog man med Twin Shot aktivt behålls Twin Shot valt efter respawn,
      // annars utrustas nästa tillgängliga vapen i inventariet.
      if (this.weapon !== 0) {
        const lost = TF.WEAPONS[this.weapon];
        this.owned[this.weapon] = false;
        g.particles.text(this.x, this.y - 30, lost.name + ' LOST', '#ff7070', 14);
        this.weapon = this.nextOwned(this.weapon);
      }
      this.craws = 0;
      this.shield = 0;
      this.respawnTimer = 1.0;
      if (g.lives <= 0) g.gameOverTimer = 2.2;
    }

    respawn() {
      const g = this.g;
      let y = (TF.TOP + H) / 2;
      if (g.terrain) {
        const wx = g.scrollX + 90;
        y = (g.terrain.ceilY(wx) + g.terrain.floorY(wx)) / 2;
      }
      this.place(90, y);
      this.invuln = 3;
      g.enemyBullets.length = 0;
      if (g.lives === 1) {
        TF.Audio.play('lowLife');
        g.banner('LAST SHIP!', '#ff5050', 1.6);
      }
    }

    draw(ctx) {
      if (!this.alive) return;
      if (this.invuln > 0 && !this.entering && Math.floor(this.invuln * 16) % 2 === 0) return;
      const { x, y } = this;
      const wcol = TF.WEAPONS[this.weapon].color;

      // satelliter
      for (let i = 0; i < this.craws; i++) {
        const p = this.crawPos(i);
        ctx.fillStyle = '#304060';
        ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = wcol;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(p.x, p.y, 8, this.t * 6, this.t * 6 + 4); ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
      }

      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, 1 - Math.abs(this.tilt) * 0.25);
      // motorlåga
      const boost = this.exiting ? this.exitSpeed * 0.05 : this.entering ? (this.enterX - this.x) * 0.1 : 0;
      const fl = 10 + Math.random() * 8 + boost;
      ctx.fillStyle = '#ff9a2a';
      ctx.beginPath(); ctx.moveTo(-18, -4); ctx.lineTo(-18 - fl, 0); ctx.lineTo(-18, 4); ctx.fill();
      ctx.fillStyle = '#fff4b0';
      ctx.beginPath(); ctx.moveTo(-18, -2); ctx.lineTo(-18 - fl * 0.5, 0); ctx.lineTo(-18, 2); ctx.fill();
      // vingar
      ctx.fillStyle = '#3a5a9a';
      ctx.beginPath();
      ctx.moveTo(-4, -4); ctx.lineTo(-16, -16); ctx.lineTo(-8, -16); ctx.lineTo(8, -4);
      ctx.moveTo(-4, 4); ctx.lineTo(-16, 16); ctx.lineTo(-8, 16); ctx.lineTo(8, 4);
      ctx.fill();
      // skrov
      ctx.fillStyle = '#c8d4e8';
      ctx.beginPath();
      ctx.moveTo(24, 0); ctx.lineTo(6, -7); ctx.lineTo(-18, -6); ctx.lineTo(-20, 0); ctx.lineTo(-18, 6); ctx.lineTo(6, 7);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#7d8ca8';
      ctx.fillRect(-18, 1, 22, 5);
      // cockpit
      ctx.fillStyle = '#39d0ff';
      ctx.beginPath(); ctx.ellipse(4, -2, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
      // vapenfärgad stripe
      ctx.fillStyle = wcol;
      ctx.fillRect(-12, -2, 10, 3);
      ctx.restore();

      if (this.shield > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.25 + 0.15 * this.shield + 0.1 * Math.sin(this.t * 10);
        ctx.strokeStyle = '#7fe3ff';
        ctx.lineWidth = 2 + this.shield;
        ctx.beginPath(); ctx.ellipse(x, y, 32, 24, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha *= 0.3;
        ctx.fillStyle = '#3aa0ff';
        ctx.fill();
        ctx.restore();
      }
    }
  }
  TF.Player = Player;

  // ---------------------------------------------------------------------------
  TF.ITEM_INFO = {
    back:   { letter: 'B', color: '#ffcf5a' },
    hunter: { letter: 'H', color: '#9dff6a' },
    wave:   { letter: 'W', color: '#b0803c' },
    sideblaster: { letter: '+', color: '#37ffd2' },
    craw:   { letter: 'O', color: '#6fd8ff' },
    shield: { letter: 'S', color: '#7fe3ff' },
  };

  class Item {
    constructor(g, x, y, type) {
      this.g = g; this.x = x; this.y = y; this.type = type;
      this.baseY = y; this.t = 0; this.dead = false;
      this.info = TF.ITEM_INFO[type];
    }

    update(dt) {
      const g = this.g;
      this.t += dt;
      this.x -= (40 + g.scrollSpeed * 0.3) * dt;
      this.y = this.baseY + Math.sin(this.t * 3) * 10;
      if (g.terrain) {
        const wx = g.scrollX + this.x;
        this.y = TF.clamp(this.y, g.terrain.ceilY(wx) + 16, g.terrain.floorY(wx) - 16);
      }
      this.y = TF.clamp(this.y, TF.TOP + 14, H - 14);
      if (this.x < -30) this.dead = true;
    }

    draw(ctx) {
      const { x, y } = this, c = this.info.color;
      if (this.t > 10 && Math.floor(this.t * 10) % 2 === 0) return;
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = '#1a2238';
      ctx.strokeStyle = c;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-16, -11, 32, 22, 11);
      ctx.fill(); ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.3 + 0.2 * Math.sin(this.t * 8);
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = c;
      ctx.font = 'bold 15px Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.info.letter, 0, 1);
      ctx.restore();
    }
  }
  TF.Item = Item;
})();
