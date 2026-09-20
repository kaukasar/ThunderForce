'use strict';
// Rendering, skärmar (titel/paus/game over), skalning med letterboxing och huvudloop.
(function () {
  const TF = window.TF;
  const W = TF.W, H = TF.H;
  const FONT = 'Consolas, "Courier New", monospace';

  const Game = TF.Game;

  Game.prototype.render = function (ctx) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    if (this.state === 'title') return this.drawTitle(ctx);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, TF.TOP, W, H - TF.TOP);
    ctx.clip();
    if (this.shakeT > 0) {
      const a = this.shakeAmt * Math.min(1, this.shakeT * 4);
      ctx.translate(TF.rand(-a, a), TF.rand(-a, a));
    }
    this.background.draw(ctx, this.scrollX);
    for (const e of this.enemies) if (e.ground) e.draw(ctx);
    this.terrain.draw(ctx, this.scrollX, this.stateT);
    for (const it of this.items) it.draw(ctx);
    for (const e of this.enemies) if (!e.ground) e.draw(ctx);
    for (const b of this.playerBullets) b.draw(ctx);
    this.player.draw(ctx);
    for (const l of this.lasers) l.draw(ctx);
    for (const b of this.enemyBullets) b.draw(ctx);
    this.particles.draw(ctx);
    ctx.restore();

    TF.HUD.draw(ctx, this);
    if (this.state !== 'paused') this.drawBanner(ctx); // pausrutan ska stå ensam

    if (this.state === 'paused') this.drawPause(ctx);
    if (this.state === 'gameover') this.drawGameOver(ctx);
    if (this.debugGod) {
      ctx.font = `bold 10px ${FONT}`;
      ctx.fillStyle = '#ff0';
      ctx.textAlign = 'left';
      ctx.fillText('GOD MODE', 8, H - 8);
    }
  };

  function outlinedText(ctx, str, x, y, fill, stroke = '#000', lw = 4) {
    ctx.lineJoin = 'round';
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.strokeText(str, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(str, x, y);
  }

  Game.prototype.drawBanner = function (ctx) {
    const b = this.bannerData;
    if (!b) return;
    const inT = Math.min(1, b.t * 4), outT = Math.min(1, (b.dur - b.t) * 3);
    const a = Math.min(inT, outT);
    if (b.color === '#ff3030' && Math.floor(b.t * 6) % 2 === 1) return; // blinkande varning
    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const y = 200;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, y - 40, W, b.sub ? 90 : 70);
    ctx.font = `italic bold 44px ${FONT}`;
    ctx.save();
    ctx.translate(W / 2, y);
    ctx.scale(1 + (1 - inT) * 0.6, 1);
    outlinedText(ctx, b.text, 0, 0, b.color, '#000', 6);
    ctx.restore();
    if (b.sub) {
      ctx.font = `bold 16px ${FONT}`;
      outlinedText(ctx, b.sub, W / 2, y + 36, '#dde6ff');
    }
    ctx.restore();
  };

  Game.prototype.drawTitle = function (ctx) {
    this.background.draw(ctx, this.titleScroll || 0);
    const t = this.stateT;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,10,0.35)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // logotyp
    ctx.save();
    ctx.translate(W / 2, 140);
    ctx.transform(1, 0, -0.2, 1, 0, 0);
    ctx.font = `bold 84px ${FONT}`;
    const grad = ctx.createLinearGradient(0, -40, 0, 40);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.45, '#7fd8ff');
    grad.addColorStop(0.55, '#2a6aff');
    grad.addColorStop(1, '#a040ff');
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 10;
    ctx.strokeText('THUNDER', 0, -30);
    ctx.fillStyle = grad;
    ctx.fillText('THUNDER', 0, -30);
    const grad2 = ctx.createLinearGradient(0, 20, 0, 90);
    grad2.addColorStop(0, '#fff6c0');
    grad2.addColorStop(0.5, '#ffb02a');
    grad2.addColorStop(1, '#ff3a1a');
    ctx.strokeText('FORCE', 0, 50);
    ctx.fillStyle = grad2;
    ctx.fillText('FORCE', 0, 50);
    ctx.restore();
    // blixt-streck
    ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * Math.sin(t * 3)})`;
    ctx.fillRect(W / 2 - 260, 236, 520, 2);

    ctx.font = `bold 16px ${FONT}`;
    outlinedText(ctx, 'BROWSER SHOOT \'EM UP  ·  3 STAGES', W / 2, 262, '#c0d0ff');

    const rows = [
      ['MOVE', 'ARROW KEYS / WASD'],
      ['FIRE (HOLD = AUTO)', 'SPACE'],
      ['SWITCH WEAPON', 'Z / X'],
      ['PAUSE', 'P / ESC'],
      ['QUIT TO TITLE', 'T (WHILE PAUSED)'],
      ['MUTE SOUND', 'M'],
    ];
    ctx.font = `bold 15px ${FONT}`;
    rows.forEach(([a, b], i) => {
      const y = 302 + i * 26;
      ctx.textAlign = 'right';
      outlinedText(ctx, a, W / 2 - 16, y, '#8fa0d0');
      ctx.textAlign = 'left';
      outlinedText(ctx, b, W / 2 + 16, y, '#ffffff');
    });
    ctx.textAlign = 'center';
    if (Math.floor(t * 2) % 2 === 0) {
      ctx.font = `bold 24px ${FONT}`;
      outlinedText(ctx, 'PRESS ENTER OR SPACE TO START', W / 2, 478, '#ffd24a', '#000', 5);
    }
    ctx.font = `bold 13px ${FONT}`;
    outlinedText(ctx, `HI-SCORE ${String(this.hiScore).padStart(8, '0')}`, W / 2, 515, '#ffffff');
    ctx.restore();
  };

  Game.prototype.drawPause = function (ctx) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,20,0.6)';
    ctx.fillRect(0, TF.TOP, W, H - TF.TOP);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `italic bold 56px ${FONT}`;
    outlinedText(ctx, 'PAUSED', W / 2, 240, '#ffffff', '#000', 6);
    ctx.font = `bold 16px ${FONT}`;
    outlinedText(ctx, 'PRESS P OR ESC TO RESUME', W / 2, 300, '#c0d0ff');
    outlinedText(ctx, 'PRESS T TO QUIT TO TITLE SCREEN', W / 2, 328, '#ffd24a');
    ctx.restore();
  };

  Game.prototype.drawGameOver = function (ctx) {
    ctx.save();
    ctx.fillStyle = `rgba(20,0,0,${Math.min(0.65, this.stateT)})`;
    ctx.fillRect(0, TF.TOP, W, H - TF.TOP);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `italic bold 72px ${FONT}`;
    outlinedText(ctx, 'GAME OVER', W / 2, 220, '#ff4040', '#000', 8);
    ctx.font = `bold 20px ${FONT}`;
    outlinedText(ctx, `SCORE  ${this.score}`, W / 2, 290, '#ffffff');
    const best = this.score >= this.hiScore && this.score > 0;
    outlinedText(ctx, best ? 'NEW HIGH SCORE!' : `HI-SCORE  ${this.hiScore}`, W / 2, 320, '#ffd24a');
    if (this.stateT > 1.2 && Math.floor(this.stateT * 2) % 2 === 0) {
      ctx.font = `bold 22px ${FONT}`;
      outlinedText(ctx, 'PRESS ENTER OR SPACE TO RESTART', W / 2, 390, '#ffffff', '#000', 5);
    }
    ctx.restore();
  };

  // ---------------------------------------------------------------------------
  function boot() {
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d', { alpha: false });
    const game = new Game();
    TF.game = game;
    TF.Input.init();
    TF.Input.onPress(() => TF.Audio.init());

    // fast bildförhållande 16:9, skalar upp med letterboxing
    let scale = 1;
    function resize() {
      const vw = window.innerWidth, vh = window.innerHeight;
      const s = Math.min(vw / W, vh / H);
      const cssW = Math.floor(W * s), cssH = Math.floor(H * s);
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      scale = canvas.width / W;
    }
    window.addEventListener('resize', resize);
    resize();

    window.addEventListener('blur', () => {
      if (game.state === 'playing') game.state = 'paused';
    });

    // debug-parametrar: ?stage=2&loop=1&god=1&weapons=1&pos=3500
    const q = new URLSearchParams(location.search);
    if (q.has('stage') || q.has('pos') || q.has('loop')) {
      game.newGame(TF.clamp(parseInt(q.get('stage') || '1', 10) - 1, 0, 2), parseInt(q.get('loop') || '0', 10));
      if (q.has('pos')) game.skipTo(parseFloat(q.get('pos')));
    }
    if (q.get('god') === '1') game.debugGod = true;
    if (q.get('weapons') === '1') TF.debug.giveAll();

    let last = performance.now(), acc = 0;
    TF.fps = 60;
    let fpsFrames = 0, fpsT = 0;
    function frame(now) {
      const delta = Math.min(0.25, (now - last) / 1000);
      last = now;
      acc += delta;
      fpsFrames++; fpsT += delta;
      if (fpsT >= 1) { TF.fps = fpsFrames / fpsT; fpsFrames = 0; fpsT = 0; }
      let steps = 0;
      while (acc >= TF.DT && steps < 5) {
        game.update(TF.DT);
        TF.Input.consume();
        acc -= TF.DT;
        steps++;
      }
      if (steps === 5) acc = 0;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      game.render(ctx);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // Debug-/test-API (används för automatiserad testning i webbläsaren)
  TF.debug = {
    giveAll() {
      const g = TF.game;
      if (!g.player) g.newGame();
      g.player.owned = [true, true, true, true, true];
      g.player.craws = 2;
      g.player.shield = 3;
    },
    god(on = true) { TF.game.debugGod = on; },
    stage(n, pos) {
      const g = TF.game;
      if (!g.player) g.newGame(n - 1); else g.startStage(n - 1);
      if (pos != null) g.skipTo(pos);
    },
    // kör n fasta uppdateringar direkt (oberoende av requestAnimationFrame)
    step(n = 60) {
      for (let i = 0; i < n; i++) { TF.game.update(TF.DT); TF.Input.consume(); }
    },
    key(code, down) { TF.Input.simulate(code, down); },
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
