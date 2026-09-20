'use strict';
// Speltillstånd, banflöde, spawn-hjälpare och kollisionshantering.
(function () {
  const TF = window.TF;
  const W = TF.W, H = TF.H;
  const MID = (TF.TOP + H) / 2;
  // Sekunder kvar på "STAGE CLEAR"-nedräkningen (från 5) då skeppet lyfter
  const STAGE_EXIT_AT = 3.6;

  class Game {
    constructor() {
      this.state = 'title';
      this.hiScore = 0;
      this.score = 0;
      this.lives = 3;
      this.loop = 0;
      this.stageIndex = 0;
      this.particles = new TF.Particles();
      this.background = new TF.Background('gorgon');
      this.terrain = null;
      this.scrollX = 0;
      this.scrollSpeed = 0;
      this.diff = { speed: 1, fire: 1, hp: 1, bullet: 1 };
      this.player = null;
      this.enemies = []; this.playerBullets = []; this.enemyBullets = []; this.lasers = []; this.items = [];
      this.boss = null;
      this.shakeAmt = 0; this.shakeT = 0;
      this.bannerData = null;
      this.stateT = 0;
      this.debugGod = false;
      this.autopilot = null;
    }

    // ---------------------------------------------------------------- flöde
    newGame(stage = 0, loop = 0) {
      this.score = 0;
      this.lives = 3;
      this.loop = loop;
      this.nextExtend = 50000;
      this.player = new TF.Player(this);
      this.startStage(stage);
      TF.Audio.play('start');
    }

    computeDiff(i, loop) {
      return {
        speed: 1 + 0.06 * i + 0.2 * loop,
        fire: 1 + 0.15 * i + 0.45 * loop,
        hp: 1 + 0.12 * i + 0.45 * loop,
        bullet: 1 + 0.05 * i + 0.15 * loop,
      };
    }

    startStage(i, flyIn = false) {
      const def = TF.STAGES[i];
      this.stageIndex = i;
      this.stageDef = def;
      this.background = new TF.Background(def.theme);
      this.terrain = new TF.Terrain(def.terrain, def.theme);
      this.scrollX = 0;
      this.stageSpeed = def.speed;
      // Vid banövergång fortsätter farten från utflygningen och bromsar in
      this.scrollSpeed = flyIn ? 500 : def.speed;
      this.scrollLocked = false;
      this.eventIdx = 0;
      this.enemies = []; this.playerBullets = []; this.enemyBullets = []; this.lasers = []; this.items = [];
      this.particles.clear();
      this.boss = null;
      this.stageClearTimer = 0;
      this.exitHold = 0;
      this.gameOverTimer = 0;
      this.shieldDropped = false;
      this.diff = this.computeDiff(i, this.loop);
      const p = this.player;
      p.place(120, MID);
      p.invuln = 2;
      if (flyIn) p.startEntry(); // skeppet flyger in från vänster kant
      this.state = 'playing';
      this.stateT = 0;
      this.banner(`STAGE ${i + 1}`, '#ffffff', 3, def.name + (this.loop ? `  ·  LOOP ${this.loop + 1}` : ''));
    }

    // hoppa till en position i banan (debug/test)
    skipTo(x) {
      this.scrollX = x;
      const ev = this.stageDef.events;
      this.eventIdx = 0;
      while (this.eventIdx < ev.length && ev[this.eventIdx][0] < x) this.eventIdx++;
    }

    banner(text, color = '#fff', dur = 2, sub = '') {
      this.bannerData = { text, color, dur, sub, t: 0 };
    }

    shake(amount, dur) {
      this.shakeAmt = Math.max(this.shakeAmt, amount);
      this.shakeT = Math.max(this.shakeT, dur);
    }

    addScore(n, x, y, label) {
      this.score += n;
      if (this.score > this.hiScore) this.hiScore = this.score;
      if (x != null) this.particles.text(x, y, label || String(n), label ? '#ffd24a' : '#ffffff', label ? 16 : 11);
      if (this.score >= this.nextExtend) {
        this.nextExtend += 100000;
        this.lives++;
        TF.Audio.play('bonus');
        this.banner('EXTRA SHIP!', '#8fff8f', 1.5);
      }
    }

    // ---------------------------------------------------------------- spawn
    spawnFormation(path, n, o = {}) {
      const f = new TF.Formation(this, n, o.drop || null);
      for (let i = 0; i < n; i++) {
        let x = W + 30 + i * 46, y = o.y || MID;
        const opt = { amp: o.amp, dirY: o.dirY, fireChance: o.fireChance };
        switch (path) {
          case 'sine': opt.phase = -i * 0.57; break;
          case 'zig': opt.phase = -i * 0.8; break;
          case 'v': x = W + 30 + Math.abs(i - (n - 1) / 2) * 40; y += (i - (n - 1) / 2) * 34; break;
          case 'dive': x = W + 30 + i * 50; y += (i - (n - 1) / 2) * 50; opt.stopX = 640 - i * 30; break;
          case 'rear': x = -30 - i * 46; opt.phase = -i * 0.5; break;
        }
        const e = new TF.Grunt(this, x, y, path === 'v' ? 'line' : path, opt);
        e.formation = f;
        this.enemies.push(e);
      }
    }
    spawnCarrier(y, drop) { this.enemies.push(new TF.Carrier(this, W + 30, y, drop)); }
    spawnTurret(mount, burst) { this.enemies.push(new TF.Turret(this, W + 30, mount, { burst })); }
    spawnHeavy(from, y, o) { this.enemies.push(new TF.Heavy(this, from, y, o)); }
    spawnWall(o = {}) {
      const wx = this.scrollX + W + 40, h = o.h || 130;
      const opts = Object.assign({
        yMin: this.terrain.ceilY(wx) + h / 2 - 10,
        yMax: this.terrain.floorY(wx) - h / 2 + 10,
      }, o);
      this.enemies.push(new TF.MovingWall(this, W + 40, opts));
    }
    spawnRocks(n) {
      for (let i = 0; i < n; i++) {
        const r = new TF.Rock(this, TF.rand(380, 980));
        r.y -= i * 70;
        this.enemies.push(r);
      }
    }
    spawnGate(o) { this.enemies.push(new TF.LaserGate(this, W + 30, o)); }
    spawnItem(x, y, type) {
      // Sköldkapseln får bara dyka upp en gång per bana; en eventuell extra
      // sköld blir en CRAW-kapsel i stället så att belöningen inte försvinner.
      if (type === 'shield') {
        if (this.shieldDropped) type = 'craw';
        else this.shieldDropped = true;
      }
      this.items.push(new TF.Item(this, x, y, type));
    }

    startBoss(id) {
      const b = new TF.BOSSES[id](this);
      this.boss = b;
      this.enemies.push(b);
      this.scrollLocked = true;
      TF.Audio.play('warning');
      this.banner('WARNING!', '#ff3030', 2.5, (b.mini ? 'MINIBOSS APPROACHING: ' : 'HUGE BATTLESHIP APPROACHING: ') + b.name);
    }

    onBossDefeated(boss) {
      if (this.boss === boss) this.boss = null;
      if (boss.mini) {
        this.scrollLocked = false;
        this.banner('MINIBOSS DESTROYED', '#ffd24a', 2);
        TF.Audio.play('bonus');
      } else {
        const bonus = 10000 * (this.stageIndex + 1) * (this.loop + 1);
        this.addScore(bonus);
        this.stageClearTimer = 5;
        this.banner('STAGE CLEAR!', '#8fff8f', 4.5, `CLEAR BONUS ${bonus}`);
        TF.Audio.play('clear');
      }
    }

    // Tillbaka till titelskärmen (T i pausläget). Poängen nollställs vid nytt
    // spel; high score behålls under sessionen.
    toTitle() {
      this.state = 'title';
      this.stateT = 0;
      this.titleScroll = 0;
      this.boss = null;
      this.bannerData = null;
      this.shakeAmt = 0; this.shakeT = 0;
      this.enemies = []; this.playerBullets = []; this.enemyBullets = []; this.lasers = []; this.items = [];
      this.particles.clear();
      this.background = new TF.Background('gorgon');
      TF.Audio.play('pause');
    }

    // skyddar spelaren under "STAGE CLEAR" (och i debug-läge)
    playerProtected() {
      return this.debugGod || this.stageClearTimer > 0;
    }

    nextStage() {
      if (this.lives <= 0) return;
      let i = this.stageIndex + 1;
      if (i >= TF.STAGES.length) {
        i = 0;
        this.loop++;
        this.startStage(0, true);
        this.banner('ALL STAGES CLEAR!', '#ffd24a', 4, `LOOP ${this.loop + 1} — DIFFICULTY UP`);
        TF.Audio.play('clear');
        return;
      }
      this.startStage(i, true);
    }

    nearestTarget(x, y) {
      let best = null, bd = Infinity;
      for (const e of this.enemies) {
        if (e.dead || !e.targetable || e.x < -10 || e.x > W + 10 || (e.isBoss && e.state === 'dying')) continue;
        const tp = e.aimPoint();
        const d = TF.dist2(x, y, tp.x, tp.y);
        if (d < bd) { bd = d; best = e; }
      }
      return best;
    }

    collectItem(it) {
      const p = this.player;
      const idx = TF.WEAPONS.findIndex((w) => w.id === it.type);
      let label;
      if (idx >= 0) {
        if (p.owned[idx]) {
          this.addScore(5000);
          label = TF.WEAPONS[idx].name + ' +5000';
        } else {
          p.owned[idx] = true;
          p.weapon = idx;
          label = TF.WEAPONS[idx].name + '!';
        }
      } else if (it.type === 'craw') {
        if (p.craws < 2) { p.craws++; label = 'CRAW!'; } else { this.addScore(3000); label = 'CRAW +3000'; }
      } else if (it.type === 'shield') {
        label = p.shield > 0 ? 'SHIELD RECHARGED' : 'SHIELD!';
        if (p.shield > 0) this.addScore(1000);
        p.shield = 3;
      }
      this.particles.text(it.x, it.y - 20, label, it.info.color, 14);
      TF.FX.sparks(this, it.x, it.y, 12, it.info.color, 0, Math.PI);
      TF.Audio.play('powerup');
    }

    // ---------------------------------------------------------------- uppdatering
    update(dt) {
      const I = TF.Input;
      this.stateT += dt;
      if (I.wasPressed('mute')) TF.Audio.toggleMute();
      switch (this.state) {
        case 'title':
          this.background.update(dt);
          this.titleScroll = (this.titleScroll || 0) + 60 * dt;
          if (I.wasPressed('confirm') || I.wasPressed('fire')) this.newGame();
          break;
        case 'paused':
          if (I.wasPressed('pause')) { this.state = 'playing'; TF.Audio.play('pause'); break; }
          // avbryt pågående spel och gå tillbaka till titelskärmen utan omladdning
          if (I.wasPressed('title')) this.toTitle();
          break;
        case 'gameover':
          this.updateWorld(dt, false);
          if (this.stateT > 1.2 && (I.wasPressed('confirm') || I.wasPressed('fire'))) this.newGame();
          break;
        case 'playing':
          if (I.wasPressed('pause')) { this.state = 'paused'; TF.Audio.play('pause'); break; }
          this.updateWorld(dt, true);
          break;
      }
      if (this.bannerData) {
        this.bannerData.t += dt;
        if (this.bannerData.t > this.bannerData.dur) this.bannerData = null;
      }
    }

    updateWorld(dt, active) {
      // Under ut- och inflygningen mellan banor följer scrollen skeppets fart
      const p = this.player;
      const exiting = p && p.exiting;
      const target = exiting ? Math.min(700, p.exitSpeed * 0.55)
        : this.scrollLocked ? 0 : this.stageSpeed;
      const diff = target - this.scrollSpeed;
      // snabb inbromsning tills farten från banövergången är nere på banans hastighet
      const rate = exiting || this.scrollSpeed > this.stageSpeed + 1 ? 500 : 70;
      this.scrollSpeed += TF.clamp(diff, -rate * dt, rate * dt);
      this.scrollX += this.scrollSpeed * dt;

      const ev = this.stageDef.events;
      while (active && this.eventIdx < ev.length && ev[this.eventIdx][0] <= this.scrollX) {
        ev[this.eventIdx][1](this);
        this.eventIdx++;
      }

      this.background.update(dt);
      if (active) this.player.update(dt);
      const upd = (arr) => {
        for (let i = 0; i < arr.length; i++) arr[i].update(dt, this);
        let j = 0;
        for (let i = 0; i < arr.length; i++) if (!arr[i].dead) arr[j++] = arr[i];
        arr.length = j;
      };
      upd(this.enemies);
      upd(this.playerBullets);
      upd(this.enemyBullets);
      upd(this.lasers);
      upd(this.items);
      this.particles.update(dt, this.scrollSpeed);
      if (active) this.collisions();

      if (this.shakeT > 0) {
        this.shakeT -= dt;
        if (this.shakeT <= 0) this.shakeAmt = 0;
      }
      if (this.stageClearTimer > 0 && active) {
        this.stageClearTimer -= dt;
        const p = this.player;
        // efter en kort paus tar skeppet fart och flyger iväg ut ur bild
        if (this.stageClearTimer <= STAGE_EXIT_AT && p.alive && !p.exiting) p.startExit();
        if (p.exitDone) this.exitHold += dt;
        // nästa bana laddas när skeppet lämnat skärmen (timern är reservlösning)
        if (this.stageClearTimer <= 0 || this.exitHold > 0.4) this.nextStage();
      }
      if (this.gameOverTimer > 0) {
        this.gameOverTimer -= dt;
        if (this.gameOverTimer <= 0) {
          this.state = 'gameover';
          this.stateT = 0;
          TF.Audio.play('gameover');
        }
      }
    }

    collisions() {
      const p = this.player;
      for (const b of this.playerBullets) {
        if (b.dead) continue;
        for (const e of this.enemies) {
          if (e.dead || (b.hitSet && b.hitSet.has(e))) continue;
          const target = e.collide(b);
          if (!target) continue;
          const res = e.takeHit(target, b.dmg, b);
          if (res === 'armor') {
            if (b.terrainPass) { b.hitSet.add(e); continue; }
            b.dead = true;
            TF.FX.sparks(this, b.x, b.y, 3, '#c0c8d8', Math.atan2(-b.vy, -b.vx), 0.9);
            TF.Audio.play('armor');
            break;
          }
          TF.Audio.play('hit');
          TF.FX.sparks(this, b.x, b.y, 3, b.color, Math.atan2(-b.vy, -b.vx), 1.0);
          if (b.pierce && e.small && !e.isBoss) { b.hitSet.add(e); continue; }
          b.dead = true;
          break;
        }
      }

      if (p.alive) {
        for (const eb of this.enemyBullets) {
          if (!eb.dead && eb.hitsPlayer(p)) { eb.dead = true; if (p.hit('bullet') || !p.alive) break; }
        }
      }
      if (p.alive) {
        for (const l of this.lasers) if (l.hitsPlayer(p)) { p.hit('laser'); break; }
      }
      if (p.alive) {
        for (const e of this.enemies) {
          if (e.dead || !e.hitsPlayer(p)) continue;
          const wasVulnerable = p.invuln <= 0 && !this.debugGod;
          p.hit('enemy');
          if (wasVulnerable && e.small && !e.isBoss && !e.indestructible) e.destroy();
          if (!p.alive) break;
        }
      }
      if (p.alive) {
        for (const it of this.items) {
          if (!it.dead && TF.circleCircle(it.x, it.y, 18, p.x, p.y, 16)) { it.dead = true; this.collectItem(it); }
        }
      }
    }
  }
  TF.Game = Game;
})();
