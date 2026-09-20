'use strict';
// HUD: poäng, high score, liv, vapenslottar, sköld/satelliter och boss-hälsomätare.
(function () {
  const TF = window.TF;
  const W = TF.W;
  const FONT = 'Consolas, "Courier New", monospace';

  function shipIcon(ctx, x, y, s = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = '#c8d4e8';
    ctx.beginPath();
    ctx.moveTo(10, 0); ctx.lineTo(-2, -4); ctx.lineTo(-8, -7); ctx.lineTo(-6, 0); ctx.lineTo(-8, 7); ctx.lineTo(-2, 4);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#39d0ff';
    ctx.fillRect(0, -1.5, 4, 3);
    ctx.restore();
  }

  function weaponIcon(ctx, id, x, y, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    switch (id) {
      case 'twin':
        ctx.fillRect(-7, -4, 14, 2.5); ctx.fillRect(-7, 2, 14, 2.5);
        break;
      case 'back':
        ctx.fillRect(1, -1, 8, 2.5); ctx.fillRect(-9, -1, 8, 2.5);
        ctx.beginPath(); ctx.moveTo(9, -4); ctx.lineTo(12, 0); ctx.lineTo(9, 4); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-9, -4); ctx.lineTo(-12, 0); ctx.lineTo(-9, 4); ctx.fill();
        break;
      case 'hunter':
        ctx.beginPath(); ctx.moveTo(-8, 5); ctx.quadraticCurveTo(0, 6, 6, -4); ctx.stroke();
        ctx.beginPath(); ctx.arc(7, -5, 2.5, 0, Math.PI * 2); ctx.fill();
        break;
      case 'wave':
        ctx.beginPath(); ctx.ellipse(-2, 0, 4, 7, 0, -Math.PI / 2, Math.PI / 2); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(4, 0, 4, 7, 0, -Math.PI / 2, Math.PI / 2); ctx.stroke();
        break;
      case 'sideblaster':
        ctx.fillRect(-9, -1.2, 18, 2.5);
        ctx.fillRect(-1.2, -9, 2.5, 18);
        ctx.beginPath(); ctx.moveTo(9, -3.5); ctx.lineTo(12, 0); ctx.lineTo(9, 3.5); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-3.5, -9); ctx.lineTo(0, -12); ctx.lineTo(3.5, -9); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-3.5, 9); ctx.lineTo(0, 12); ctx.lineTo(3.5, 9); ctx.fill();
        break;
    }
    ctx.restore();
  }

  TF.HUD = {
    draw(ctx, g) {
      const grad = ctx.createLinearGradient(0, 0, 0, TF.HUD_H);
      grad.addColorStop(0, '#141a2e');
      grad.addColorStop(1, '#0a0d18');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, TF.HUD_H);
      ctx.fillStyle = '#3a4a78';
      ctx.fillRect(0, TF.HUD_H - 2, W, 2);

      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      // Score / High score
      ctx.font = `bold 10px ${FONT}`;
      ctx.fillStyle = '#7f90c0';
      ctx.fillText('SCORE', 10, 14);
      ctx.fillText('HI-SCORE', 110, 14);
      ctx.font = `bold 16px ${FONT}`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(String(g.score).padStart(8, '0'), 10, 32);
      ctx.fillStyle = '#ffd24a';
      ctx.fillText(String(g.hiScore).padStart(8, '0'), 110, 32);

      // Vapenslottar
      const p = g.player;
      const slotW = 78, x0 = 208;
      for (let i = 0; i < 5; i++) {
        const wd = TF.WEAPONS[i];
        const x = x0 + i * (slotW + 4), y = 4;
        const owned = p && p.owned[i];
        const active = p && p.weapon === i;
        ctx.fillStyle = active ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.35)';
        ctx.fillRect(x, y, slotW, 30);
        if (active) {
          const pulse = 0.6 + 0.4 * Math.sin(performance.now() / 150);
          ctx.strokeStyle = wd.color;
          ctx.globalAlpha = pulse;
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, slotW - 2, 28);
          ctx.globalAlpha = 1;
          ctx.fillStyle = wd.color;
          ctx.beginPath(); ctx.moveTo(x + slotW / 2 - 5, y + 30); ctx.lineTo(x + slotW / 2 + 5, y + 30); ctx.lineTo(x + slotW / 2, y + 25); ctx.fill();
        } else {
          ctx.strokeStyle = owned ? '#3a4a70' : '#232838';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, y + 0.5, slotW - 1, 29);
        }
        ctx.font = `bold 10px ${FONT}`;
        ctx.fillStyle = '#56607a';
        ctx.fillText(String(i + 1), x + 4, y + 11);
        if (owned) {
          weaponIcon(ctx, wd.id, x + 18, y + 18, active ? wd.color : '#8a94b0');
          ctx.font = `bold 12px ${FONT}`;
          ctx.fillStyle = active ? '#ffffff' : '#9aa4c0';
          ctx.fillText(wd.short, x + 32, y + 22);
        } else {
          ctx.font = `bold 12px ${FONT}`;
          ctx.fillStyle = '#343a4c';
          ctx.fillText('- - -', x + 26, y + 22);
        }
      }

      // Liv, sköld, satelliter, bana
      const rx = 628;
      ctx.font = `bold 10px ${FONT}`;
      ctx.fillStyle = '#7f90c0';
      ctx.fillText('SHIPS', rx, 14);
      const lives = Math.max(0, g.lives);
      if (lives <= 5) {
        for (let i = 0; i < lives; i++) shipIcon(ctx, rx + 10 + i * 20, 27);
      } else {
        shipIcon(ctx, rx + 10, 27);
        ctx.font = `bold 14px ${FONT}`;
        ctx.fillStyle = '#fff';
        ctx.fillText('x' + lives, rx + 24, 32);
      }
      if (lives === 1 && Math.floor(performance.now() / 300) % 2 === 0) {
        ctx.fillStyle = '#ff4040';
        ctx.font = `bold 10px ${FONT}`;
        ctx.fillText('LAST', rx + 36, 14);
      }

      const sx = 740;
      ctx.font = `bold 10px ${FONT}`;
      ctx.fillStyle = '#7f90c0';
      ctx.fillText('SHIELD', sx, 14);
      ctx.fillText('CRAW', sx + 56, 14);
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = p && p.shield > i ? '#7fe3ff' : '#232838';
        ctx.fillRect(sx + i * 15, 21, 11, 11);
      }
      for (let i = 0; i < 2; i++) {
        ctx.fillStyle = p && p.craws > i ? '#6fd8ff' : '#232838';
        ctx.beginPath(); ctx.arc(sx + 62 + i * 18, 27, 6, 0, Math.PI * 2); ctx.fill();
      }

      ctx.textAlign = 'right';
      ctx.fillStyle = '#7f90c0';
      ctx.fillText(g.loop > 0 ? `LOOP ${g.loop + 1}` : 'STAGE', W - 10, 14);
      ctx.font = `bold 16px ${FONT}`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${g.stageIndex + 1} / 3`, W - 10, 32);
      ctx.textAlign = 'left';

      if (g.boss) this.drawBossBar(ctx, g.boss);
    },

    drawBossBar(ctx, boss) {
      const w = 420, x = (W - w) / 2, y = TF.HUD_H + 8;
      const frac = Math.max(0, boss.hp / boss.maxHp);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(x - 4, y - 2, w + 8, 24);
      ctx.fillStyle = '#301018';
      ctx.fillRect(x, y + 10, w, 9);
      const col = frac > 0.66 ? '#ff5a3a' : frac > 0.33 ? '#ffae2a' : '#ff2a6a';
      ctx.fillStyle = col;
      ctx.fillRect(x, y + 10, w * frac, 9);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      for (const th of boss.thresholds) ctx.fillRect(x + w * th - 1, y + 10, 2, 9);
      ctx.font = `bold 10px ${FONT}`;
      ctx.fillStyle = '#ffd0d0';
      ctx.textAlign = 'left';
      ctx.fillText((boss.mini ? 'MINIBOSS: ' : 'BOSS: ') + boss.name, x, y + 7);
      ctx.textAlign = 'right';
      const parts = boss.parts.filter((q) => q.alive).length;
      ctx.fillText(`PARTS ${parts}/${boss.parts.length}`, x + w, y + 7);
      ctx.textAlign = 'left';
    },

    shipIcon,
  };
})();
