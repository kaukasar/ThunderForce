'use strict';
// Bossar för bana 2 och 3.
(function () {
  const TF = window.TF;
  const H = TF.H;
  const MID = (TF.TOP + H) / 2;
  const Boss = TF.Boss;

  // Bana 2 miniboss: ring med kretsande kapslar
  class Sentinel extends Boss {
    constructor(g) {
      super(g, { name: 'SENTINEL', mini: true, hp: 110, homeX: 740 });
      this.hulls = [{ x: -26, y: -26, w: 52, h: 52 }];
      for (let i = 0; i < 4; i++) this.addPart('pod' + i, 0, 0, 13, 16, { a: (i / 4) * Math.PI * 2 });
      this.core = Object.assign(this.core, { ox: 0, oy: 0, r: 22 });
      this.spin = 0;
    }
    pattern(dt) {
      const g = this.g;
      this.spin += dt * (this.phase ? 2.2 : 1.1);
      this.parts.forEach((p, i) => {
        const a = this.spin + (i / 4) * Math.PI * 2;
        p.ox = Math.cos(a) * 64; p.oy = Math.sin(a) * 64;
      });
      this.x = TF.lerp(this.x, this.homeX + Math.sin(this.fightT * 0.7) * 80, dt * 2);
      this.y = TF.lerp(this.y, MID + Math.sin(this.fightT * 1.4) * 110, dt * 2);
      if (this.tick('pods', this.phase ? 0.35 : 0.5, dt)) {
        this.podIdx = ((this.podIdx || 0) + 1) % 4;
        const p = this.parts[this.podIdx];
        if (p.alive) TF.shootAimed(g, p.x, p.y, 230, 1, 0, { kind: 'needle', color: '#60e0ff' });
      }
      if (this.phase >= 1) {
        if (this.tick('ring', 2.1, dt)) TF.shootRing(g, this.core.x, this.core.y, 10, 160, this.spin);
        if (this.tick('laser', 2.8, dt)) {
          const p = g.player;
          g.lasers.push(new TF.ELaser(g, () => this.aimPoint(), TF.angleTo(this.x, this.y, p.x, p.y), 0.8, 0.45, 16, this));
        }
      }
    }
    drawBody(ctx) {
      const fl = this.phaseFlash > 0;
      ctx.strokeStyle = '#5a7098';
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(this.x, this.y, 64, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#9ab8e8';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(this.x, this.y, 64, this.spin, this.spin + 1.5); ctx.stroke();
      ctx.fillStyle = fl ? '#fff' : '#3a4a68';
      ctx.beginPath(); ctx.arc(this.x, this.y, 34, 0, Math.PI * 2); ctx.fill();
      for (const p of this.parts) this.drawPartGun(ctx, p, '#70a0d0');
      this.drawCore(ctx, '#40c8ff');
    }
  }
  TF.BOSSES.sentinel = Sentinel;

  // Bana 2 slutboss: fästningskärna med lasrar, luckor och stängbar kärna
  class FortressCore extends Boss {
    constructor(g) {
      super(g, { name: 'FORTRESS CORE', hp: 300, homeX: 820, enterOffset: 120 });
      this.hulls = [{ x: -50, y: -150, w: 170, h: 300 }];
      this.addPart('laserTop', -64, -118, 16, 48, { score: 2500 });
      this.addPart('laserBot', -64, 118, 16, 48, { score: 2500 });
      this.addPart('hatchTop', -58, -62, 14, 34, { score: 2000 });
      this.addPart('hatchBot', -58, 62, 14, 34, { score: 2000 });
      this.core = Object.assign(this.core, { ox: -62, oy: 0, r: 22 });
      this.spiral = 0;
    }
    pattern(dt) {
      const g = this.g, p = g.player;
      this.y = TF.lerp(this.y, MID + Math.sin(this.fightT * 0.5) * 35, dt * 2);
      // kärnan öppnar och stänger sig (i sista fasen alltid öppen)
      const cyc = this.fightT % 6;
      this.coreClosed = this.phase < 2 && cyc < (this.phase === 0 ? 3 : 2);
      const lt = this.part('laserTop'), lb = this.part('laserBot');
      if (this.tick('lasers', this.phase === 0 ? 2.6 : 3.0, dt)) {
        this.alt = !this.alt;
        const em = this.alt ? lt || lb : lb || lt;
        if (em) {
          const ang = this.phase === 0 ? Math.PI : TF.angleTo(em.x, em.y, p.x, p.y);
          g.lasers.push(new TF.ELaser(g, () => ({ x: em.x - 12, y: em.y }), ang, 0.9, 0.6, 20, em));
        }
      }
      if (this.tick('hatch', 5, dt, 2)) {
        for (const id of ['hatchTop', 'hatchBot']) {
          const h = this.part(id);
          if (h) {
            const f = new TF.Formation(g, 2, null);
            for (let i = 0; i < 2; i++) {
              const e = new TF.Grunt(g, h.x - 20 - i * 36, h.y, 'dive', { stopX: 560 - i * 40, fireChance: 0 });
              e.formation = f;
              g.enemies.push(e);
            }
          }
        }
      }
      if (this.phase >= 1 && this.tick('fan', 1.7, dt)) TF.shootAimed(g, this.core.x - 20, this.core.y, 220, 5, 0.2);
      if (this.phase >= 2 && this.tick('spiral', 0.14, dt)) {
        this.spiral += 0.33;
        TF.shoot(g, this.core.x - 20, this.core.y, Math.PI + Math.sin(this.spiral) * 1.2, 190);
        TF.shoot(g, this.core.x - 20, this.core.y, Math.PI - Math.sin(this.spiral) * 1.2, 190, { color: '#ffb040' });
      }
    }
    // Rent kosmetisk ritning: slagskepp med skrov, brygga, kanontorn och motorer.
    // Träffytor, faser och attacker styrs av hulls/parts/core och berörs inte här.
    drawBody(ctx) {
      const fl = this.phaseFlash > 0;
      const x = this.x, y = this.y, T = this.t;

      // --- motorsektion bakom skrovet
      for (const oy of [-104, 104]) {
        ctx.fillStyle = '#212a3c';
        ctx.fillRect(x + 50, y + oy - 26, 52, 52);
        ctx.fillStyle = '#39455f';
        ctx.fillRect(x + 50, y + oy - 26, 52, 8);
        ctx.fillStyle = '#4b5a78';
        ctx.fillRect(x + 50, y + oy - 26, 8, 52);
        // munstycke och låga
        ctx.fillStyle = '#12161f';
        ctx.fillRect(x + 100, y + oy - 18, 10, 36);
        const len = 30 + Math.random() * 22;
        const flame = ctx.createLinearGradient(x + 110, y + oy, x + 110 + len, y + oy);
        flame.addColorStop(0, 'rgba(180,240,255,0.95)');
        flame.addColorStop(0.35, 'rgba(70,170,255,0.6)');
        flame.addColorStop(1, 'rgba(40,80,255,0)');
        ctx.fillStyle = flame;
        ctx.beginPath();
        ctx.moveTo(x + 110, y + oy - 16);
        ctx.lineTo(x + 110 + len, y + oy);
        ctx.lineTo(x + 110, y + oy + 16);
        ctx.closePath();
        ctx.fill();
      }

      // --- sensormast på ryggen
      ctx.strokeStyle = '#8fa4c4';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + 34, y - 146); ctx.lineTo(x + 26, y - 172);
      ctx.moveTo(x + 34, y + 146); ctx.lineTo(x + 26, y + 172);
      ctx.stroke();
      ctx.fillStyle = '#5d719a';
      ctx.beginPath(); ctx.ellipse(x + 26, y - 174, 9, 5, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + 26, y + 174, 9, 5, 0.3, 0, Math.PI * 2); ctx.fill();

      // --- huvudskrov med cylindrisk skuggning
      const hull = [
        [-46, -150], [34, -150], [66, -122], [74, -60], [110, -46], [110, 46], [74, 60],
        [66, 122], [34, 150], [-46, 150], [-58, 110], [-44, 70], [-38, 26], [-66, 0],
        [-38, -26], [-44, -70], [-58, -110],
      ];
      const shade = ctx.createLinearGradient(0, y - 150, 0, y + 150);
      if (fl) {
        shade.addColorStop(0, '#dfe7ff'); shade.addColorStop(0.5, '#ffffff'); shade.addColorStop(1, '#dfe7ff');
      } else {
        shade.addColorStop(0, '#222b40');
        shade.addColorStop(0.28, '#5d6f8d');
        shade.addColorStop(0.5, '#8698b6');
        shade.addColorStop(0.72, '#5d6f8d');
        shade.addColorStop(1, '#222b40');
      }
      this.hullPath(ctx, hull);
      ctx.fillStyle = shade;
      ctx.fill();
      ctx.strokeStyle = '#b8d4ff';
      ctx.lineWidth = 3;
      ctx.stroke();

      // --- panelfogar och plåtskarvar
      ctx.save();
      this.hullPath(ctx, hull);
      ctx.clip();
      ctx.strokeStyle = 'rgba(20,26,40,0.55)';
      ctx.lineWidth = 2;
      for (let i = -2; i <= 2; i++) {
        const py = y + i * 58;
        ctx.beginPath(); ctx.moveTo(x - 60, py); ctx.lineTo(x + 112, py); ctx.stroke();
      }
      // cyan accentlinjer längs över- och undersida
      for (const sign of [-1, 1]) {
        ctx.fillStyle = 'rgba(12,16,26,0.5)';
        ctx.fillRect(x - 60, y + sign * 140 - 3, 176, 6);
        ctx.fillStyle = `rgba(74,216,255,${0.22 + 0.12 * Math.sin(T * 3)})`;
        ctx.fillRect(x - 46, y + sign * 140 - 1, 150, 3);
      }
      for (const px of [-14, 26, 66]) {
        ctx.beginPath(); ctx.moveTo(x + px, y - 152); ctx.lineTo(x + px, y + 152); ctx.stroke();
      }
      // varningsränder på fören
      ctx.fillStyle = '#c99a2a';
      for (const sign of [-1, 1]) {
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.moveTo(x - 50, y + sign * (96 + i * 14));
          ctx.lineTo(x - 30, y + sign * (86 + i * 14));
          ctx.lineTo(x - 30, y + sign * (92 + i * 14));
          ctx.lineTo(x - 50, y + sign * (102 + i * 14));
          ctx.fill();
        }
      }
      // mörkare underrede för djup
      ctx.fillStyle = 'rgba(12,16,26,0.35)';
      ctx.fillRect(x - 60, y + 96, 176, 60);
      ctx.fillRect(x - 60, y - 156, 176, 60);
      ctx.restore();

      // --- överbyggnad / brygga
      ctx.fillStyle = fl ? '#eef2ff' : '#3c4a66';
      this.hullPath(ctx, [[-8, -104], [58, -86], [58, 86], [-8, 104]]);
      ctx.fill();
      ctx.strokeStyle = '#6c82a8';
      ctx.lineWidth = 2;
      ctx.stroke();
      // lysande fönsterrader (behåller den pulserande blå accenten)
      const lit = `rgba(74,216,255,${0.45 + 0.35 * Math.sin(T * 4)})`;
      ctx.fillStyle = lit;
      for (let r = 0; r < 5; r++) {
        const py = y - 72 + r * 36;
        for (let c = 0; c < 3; c++) ctx.fillRect(x + 4 + c * 17, py, 11, 5);
      }
      // kommandobrygga
      ctx.fillStyle = '#28324a';
      ctx.beginPath(); ctx.ellipse(x + 24, y, 30, 22, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = lit;
      ctx.beginPath(); ctx.ellipse(x + 24, y, 23, 15, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.ellipse(x + 17, y - 5, 8, 4, -0.3, 0, Math.PI * 2); ctx.fill();

      // --- förskepp: pansarkäft runt kärnan
      ctx.fillStyle = fl ? '#e8eeff' : '#46536e';
      this.hullPath(ctx, [[-40, -34], [-20, -58], [-20, 58], [-40, 34], [-64, 0]]);
      ctx.fill();
      ctx.strokeStyle = '#94aacd';
      ctx.lineWidth = 2;
      ctx.stroke();

      // --- torn-/lucksockar så att delarna ser monterade ut
      for (const p of this.parts) {
        const sx = x + Math.max(p.ox, -60) + 4;
        ctx.fillStyle = '#323d55';
        ctx.fillRect(sx, p.y - 17, 26, 34);
        ctx.fillStyle = '#4b5a78';
        ctx.fillRect(sx, p.y - 17, 26, 6);
      }

      // --- navigationsljus
      ctx.fillStyle = Math.floor(T * 2) % 2 ? '#ff4040' : '#5a1c1c';
      ctx.beginPath(); ctx.arc(x + 70, y - 132, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = Math.floor(T * 2) % 2 ? '#40ff70' : '#1c5a2c';
      ctx.beginPath(); ctx.arc(x + 70, y + 132, 4, 0, Math.PI * 2); ctx.fill();

      for (const p of this.parts) this.drawPartGun(ctx, p, p.id.startsWith('laser') ? '#d060c0' : '#80a0c0');
      this.drawCore(ctx, '#40c8ff');
    }
  }
  TF.BOSSES.fortress = FortressCore;

  // Bana 3 miniboss: magmakrabba
  class MagmaCrab extends Boss {
    constructor(g) {
      super(g, { name: 'MAGMA CRAB', mini: true, hp: 150, homeX: 760 });
      this.hulls = [{ x: -40, y: -28, w: 95, h: 56 }];
      this.addPart('clawTop', -56, -46, 16, 26);
      this.addPart('clawBot', -56, 46, 16, 26);
      this.core = Object.assign(this.core, { ox: -38, oy: 0, r: 16 });
      this.dash = 0;
    }
    pattern(dt) {
      const g = this.g, p = g.player;
      let tx = this.homeX + Math.sin(this.fightT * 0.8) * 30;
      if (this.phase >= 1) {
        this.dash += dt;
        if (this.dash > 5) this.dash = 0;
        if (this.dash > 3.8) tx = Math.max(260, p.x + 160);
      }
      this.x = TF.lerp(this.x, tx, dt * (this.dash > 3.8 ? 3.5 : 2));
      this.y = TF.lerp(this.y, this.dash > 3.8 ? p.y : MID + Math.sin(this.fightT * 1.1) * 100, dt * 2);
      const pinch = Math.abs(Math.sin(this.fightT * 3)) * 8;
      this.parts[0].oy = -46 + pinch; this.parts[1].oy = 46 - pinch;
      if (this.tick('claws', 1.5, dt)) {
        for (const c of [this.part('clawTop'), this.part('clawBot')]) if (c) TF.shootAimed(g, c.x - 12, c.y, 210, 3, 0.3);
      }
      if (this.tick('core', 1.1, dt)) TF.shootAimed(g, this.core.x, this.core.y, 260, 1, 0, { r: 7, color: '#ffa040' });
      if (this.phase >= 1) {
        if (this.tick('ring', 2.6, dt)) TF.shootRing(g, this.core.x, this.core.y, 14, 150, this.fightT);
        if (this.tick('rocks', 1.4, dt)) g.enemies.push(new TF.Rock(g, TF.rand(150, 700)));
      }
    }
    drawBody(ctx) {
      const fl = this.phaseFlash > 0;
      ctx.strokeStyle = '#6a2a18';
      ctx.lineWidth = 5;
      for (let i = 0; i < 3; i++) {
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(this.x + i * 20, this.y + s * 20);
          ctx.lineTo(this.x + i * 20 + 14, this.y + s * (44 + Math.sin(this.t * 8 + i) * 6));
          ctx.stroke();
        }
      }
      ctx.fillStyle = fl ? '#ffe0c0' : '#9a3a1a';
      ctx.beginPath(); ctx.ellipse(this.x + 8, this.y, 52, 32, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff8a2a';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath(); ctx.arc(this.x + i * 14 - 6, this.y - 14 + (i % 2) * 28, 4 + Math.sin(this.t * 5 + i), 0, Math.PI * 2); ctx.fill();
      }
      for (const c of this.parts) this.drawPartGun(ctx, c, '#c05030');
      this.drawCore(ctx, '#ffcc40');
    }
  }
  TF.BOSSES.crab = MagmaCrab;

  // Bana 3 slutboss
  const WING_FIRE_RATE = 0.75; // vingkanonernas skottfrekvens relativt originalet
  class Overlord extends Boss {
    constructor(g) {
      super(g, { name: 'OVERLORD', hp: 460, homeX: 760, enterOffset: 200 });
      this.hulls = [{ x: -85, y: -55, w: 200, h: 110 }, { x: -20, y: -130, w: 90, h: 75 }, { x: -20, y: 55, w: 90, h: 75 }];
      this.addPart('wingTop', -30, -108, 16, 50, { score: 2500 });
      this.addPart('wingBot', -30, 108, 16, 50, { score: 2500 });
      this.addPart('eye', -92, -32, 14, 55, { score: 3000 });
      this.addPart('bay', 60, -70, 14, 40, { score: 2500 });
      this.core = Object.assign(this.core, { ox: -92, oy: 22, r: 20 });
      this.spiral = 0;
    }
    pattern(dt) {
      const g = this.g, p = g.player;
      const spd = 0.5 + this.phase * 0.3;
      this.x = TF.lerp(this.x, this.homeX + Math.sin(this.fightT * spd * 0.7) * (30 + this.phase * 40), dt * 2);
      this.y = TF.lerp(this.y, MID + Math.sin(this.fightT * spd) * (60 + this.phase * 15), dt * 2);
      const wt = this.part('wingTop'), wb = this.part('wingBot'), eye = this.part('eye'), bay = this.part('bay');
      // Vingkanonerna (övre/nedre) skjuter 25 % glesare: frekvens × 0,75
      if (this.tick('wings', (this.phase >= 2 ? 2.2 : 1.4) / WING_FIRE_RATE, dt)) {
        for (const w of [wt, wb]) {
          if (!w) continue;
          if (this.phase >= 2) TF.shootRing(g, w.x, w.y, 12, 150, this.fightT);
          else TF.shootAimed(g, w.x - 14, w.y, 220, 5, 0.17);
        }
      }
      if (this.phase === 0 && this.tick('core', 2, dt)) TF.shootAimed(g, this.core.x - 10, this.core.y, 260, 3, 0.12, { kind: 'needle', color: '#ffe040' });
      if (this.phase >= 1) {
        if (eye && this.tick('laser', 2.8, dt)) {
          g.lasers.push(new TF.ELaser(g, () => ({ x: eye.x - 10, y: eye.y }), TF.angleTo(eye.x, eye.y, p.x, p.y), 0.75, 0.55, 20, eye));
        }
        if (bay && this.tick('missiles', 4, dt)) {
          for (const a of [-2.0, -1.2]) g.enemies.push(new TF.Missile(g, bay.x, bay.y, a));
        }
      }
      if (this.phase >= 2) {
        if (this.tick('spiral', 0.1, dt)) {
          this.spiral += 0.27;
          for (let k = 0; k < 2; k++) TF.shoot(g, this.core.x, this.core.y, this.spiral + k * Math.PI, 170, { color: k ? '#ffb040' : '#ff4f8b' });
        }
        if (this.tick('swarm', 8, dt, 4)) g.spawnFormation('rear', 4, { y: TF.rand(120, 420) });
      }
    }
    drawBody(ctx) {
      const fl = this.phaseFlash > 0;
      ctx.fillStyle = fl ? '#ffe0e0' : '#4a1e2a';
      this.hullPath(ctx, [[-20, -55], [30, -140], [80, -140], [70, -55]]); ctx.fill();
      this.hullPath(ctx, [[-20, 55], [30, 140], [80, 140], [70, 55]]); ctx.fill();
      ctx.fillStyle = fl ? '#ffe0e0' : '#7a2a3a';
      this.hullPath(ctx, [[-110, -10], [-80, -58], [100, -58], [130, -20], [130, 20], [100, 58], [-80, 58], [-110, 30]]);
      ctx.fill();
      ctx.strokeStyle = '#ffb040';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#3a1018';
      ctx.fillRect(this.x - 40, this.y - 8, 150, 16);
      ctx.fillStyle = `rgba(255,140,40,${0.5 + 0.4 * Math.sin(this.t * 6)})`;
      for (let i = 0; i < 5; i++) ctx.fillRect(this.x - 30 + i * 30, this.y - 3, 18, 6);
      ctx.fillStyle = '#ff9030';
      ctx.fillRect(this.x + 130, this.y - 14, 12 + Math.random() * 14, 28);
      for (const p of this.parts) this.drawPartGun(ctx, p, p.id === 'eye' ? '#e04060' : '#b07050');
      this.drawCore(ctx, '#ff3a6a');
    }
  }
  TF.BOSSES.overlord = Overlord;
})();
