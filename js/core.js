'use strict';
// Kärna: konstanter, matematik-hjälpare och tangentbordshantering.
(function () {
  const TF = (window.TF = window.TF || {});

  TF.W = 960;          // logisk bredd (16:9)
  TF.H = 540;          // logisk höjd
  TF.HUD_H = 40;       // HUD-listen överst
  TF.TOP = 40;         // spelytans överkant
  TF.DT = 1 / 60;      // fast tidssteg

  TF.rand = (a, b) => a + Math.random() * (b - a);
  TF.randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  TF.choose = (arr) => arr[Math.floor(Math.random() * arr.length)];
  TF.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  TF.lerp = (a, b, t) => a + (b - a) * t;
  TF.dist2 = (ax, ay, bx, by) => {
    const dx = ax - bx, dy = ay - by;
    return dx * dx + dy * dy;
  };
  TF.angleTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
  TF.wrapAngle = (a) => {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  };
  TF.circleCircle = (ax, ay, ar, bx, by, br) =>
    TF.dist2(ax, ay, bx, by) < (ar + br) * (ar + br);
  TF.circleRect = (cx, cy, r, x, y, w, h) => {
    const nx = TF.clamp(cx, x, x + w), ny = TF.clamp(cy, y, y + h);
    return TF.dist2(cx, cy, nx, ny) < r * r;
  };
  TF.rectRect = (ax, ay, aw, ah, bx, by, bw, bh) =>
    ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  TF.pointSegDist2 = (px, py, ax, ay, bx, by) => {
    const abx = bx - ax, aby = by - ay;
    const len2 = abx * abx + aby * aby || 1;
    const t = TF.clamp(((px - ax) * abx + (py - ay) * aby) / len2, 0, 1);
    return TF.dist2(px, py, ax + abx * t, ay + aby * t);
  };

  // ---------------------------------------------------------------------------
  // Input: tangenter läses av kontinuerligt i spel-loopen (inte via OS-repetition).
  const KEYMAP = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    Space: 'fire',
    KeyZ: 'switch', KeyX: 'switch',
    KeyP: 'pause', Escape: 'pause',
    KeyT: 'title', // tillbaka till titelskärmen från pausläget
    Enter: 'confirm', NumpadEnter: 'confirm',
    KeyM: 'mute',
  };

  // Reserv om e.code saknas (vissa syntetiska/äldre tangenthändelser): mappa via e.key.
  const KEY_FALLBACK = {
    arrowup: 'ArrowUp', up: 'ArrowUp', arrowdown: 'ArrowDown', down: 'ArrowDown',
    arrowleft: 'ArrowLeft', left: 'ArrowLeft', arrowright: 'ArrowRight', right: 'ArrowRight',
    w: 'KeyW', a: 'KeyA', s: 'KeyS', d: 'KeyD', ' ': 'Space', spacebar: 'Space',
    z: 'KeyZ', x: 'KeyX', p: 'KeyP', escape: 'Escape', esc: 'Escape',
    enter: 'Enter', m: 'KeyM', t: 'KeyT',
  };
  const codeOf = (e) => e.code || KEY_FALLBACK[(e.key || '').toLowerCase()] || '';

  TF.Input = {
    held: new Set(),     // fysiska tangentkoder som hålls nere
    pressed: new Set(),  // actions som tryckts sedan senaste uppdateringen
    listeners: [],

    init() {
      window.addEventListener('keydown', (e) => {
        const code = codeOf(e);
        const action = KEYMAP[code];
        if (!action) return;
        e.preventDefault(); // stoppar scroll med piltangenter/mellanslag
        if (!e.repeat && !this.held.has(code)) {
          this.pressed.add(action);
          for (const fn of this.listeners) fn(action);
        }
        this.held.add(code);
      }, { passive: false });
      window.addEventListener('keyup', (e) => {
        const code = codeOf(e);
        if (KEYMAP[code]) e.preventDefault();
        this.held.delete(code);
      });
      window.addEventListener('blur', () => this.held.clear());
    },

    onPress(fn) { this.listeners.push(fn); },

    isDown(action) {
      for (const code of this.held) if (KEYMAP[code] === action) return true;
      return false;
    },

    wasPressed(action) { return this.pressed.has(action); },

    // anropas efter varje fast uppdatering som konsumerat input
    consume() { this.pressed.clear(); },

    // används av tester/debug för att simulera tangenter
    simulate(code, down) {
      const action = KEYMAP[code];
      if (!action) return;
      if (down) {
        if (!this.held.has(code)) {
          this.pressed.add(action);
          for (const fn of this.listeners) fn(action);
        }
        this.held.add(code);
      } else {
        this.held.delete(code);
      }
    },
  };
})();
