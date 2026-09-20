'use strict';
// Syntetiserade ljudeffekter via Web Audio API (inga externa filer).
(function () {
  const TF = window.TF;

  const THROTTLE = {
    twin: 0.06, back: 0.06, hunter: 0.08, wave: 0.1, sideblaster: 0.06,
    hit: 0.035, armor: 0.05, explode: 0.05, enemyShot: 0.07, craw: 0.1,
  };

  TF.Audio = {
    ctx: null,
    master: null,
    noiseBuf: null,
    muted: false,
    last: {},

    init() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
      } catch (e) {
        return;
      }
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.32;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    },

    toggleMute() {
      this.muted = !this.muted;
      if (this.master) this.master.gain.value = this.muted ? 0 : 0.32;
      return this.muted;
    },

    tone(type, f0, f1, dur, vol, delay = 0) {
      const c = this.ctx, t = c.currentTime + delay;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0, t);
      if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(this.master);
      o.start(t);
      o.stop(t + dur + 0.02);
    },

    noise(dur, vol, f0, f1, delay = 0, filterType = 'lowpass') {
      const c = this.ctx, t = c.currentTime + delay;
      const s = c.createBufferSource();
      s.buffer = this.noiseBuf;
      const f = c.createBiquadFilter();
      f.type = filterType;
      f.frequency.setValueAtTime(f0, t);
      f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
      const g = c.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f).connect(g).connect(this.master);
      s.start(t, Math.random() * 0.5);
      s.stop(t + dur + 0.02);
    },

    play(name) {
      if (!this.ctx || this.muted || this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime;
      const th = THROTTLE[name];
      if (th && this.last[name] && now - this.last[name] < th) return;
      this.last[name] = now;
      switch (name) {
        case 'twin':
          this.tone('square', 1100, 520, 0.06, 0.05);
          break;
        case 'back':
          this.tone('square', 900, 450, 0.06, 0.045);
          this.tone('square', 600, 300, 0.06, 0.035, 0.015);
          break;
        case 'hunter':
          this.tone('triangle', 1300, 2100, 0.08, 0.07);
          break;
        case 'wave':
          this.tone('sine', 260, 980, 0.14, 0.1);
          this.tone('triangle', 520, 1400, 0.1, 0.03);
          break;
        case 'sideblaster':
          this.tone('square', 950, 480, 0.06, 0.045);
          this.tone('triangle', 1700, 700, 0.07, 0.03, 0.01);
          break;
        case 'craw':
          this.tone('sine', 1800, 1200, 0.04, 0.02);
          break;
        case 'hit':
          this.tone('square', 1600, 800, 0.03, 0.03);
          break;
        case 'armor':
          this.tone('triangle', 2600, 2200, 0.03, 0.025);
          break;
        case 'enemyShot':
          this.tone('square', 520, 300, 0.05, 0.025);
          break;
        case 'explode':
          this.noise(0.35, 0.35, 1600, 150);
          this.tone('sine', 160, 40, 0.25, 0.12);
          break;
        case 'bigExplode':
          this.noise(1.1, 0.55, 900, 50);
          this.tone('sine', 110, 25, 0.9, 0.3);
          this.noise(0.6, 0.3, 3000, 200, 0.15);
          break;
        case 'death':
          this.tone('sawtooth', 700, 40, 0.7, 0.14);
          this.noise(0.8, 0.45, 2000, 60);
          break;
        case 'powerup':
          [523, 659, 784, 1046].forEach((f, i) => this.tone('triangle', f, f, 0.08, 0.12, i * 0.06));
          break;
        case 'bonus':
          [784, 988, 1175, 1568].forEach((f, i) => this.tone('square', f, f, 0.06, 0.05, i * 0.05));
          break;
        case 'switch':
          this.tone('square', 600, 600, 0.04, 0.05);
          this.tone('square', 900, 900, 0.05, 0.05, 0.04);
          break;
        case 'shieldHit':
          this.tone('sine', 400, 120, 0.25, 0.2);
          this.tone('triangle', 2400, 1800, 0.08, 0.05);
          break;
        case 'shieldBreak':
          this.tone('sawtooth', 500, 80, 0.4, 0.12);
          this.noise(0.3, 0.2, 5000, 500, 0, 'highpass');
          break;
        case 'warning':
          for (let i = 0; i < 6; i++) this.tone('square', i % 2 ? 330 : 440, i % 2 ? 330 : 440, 0.2, 0.07, i * 0.25);
          break;
        case 'lowLife':
          this.tone('sine', 880, 880, 0.12, 0.1);
          this.tone('sine', 660, 660, 0.18, 0.1, 0.15);
          break;
        case 'laserCharge':
          this.tone('sine', 200, 1400, 0.5, 0.06);
          break;
        case 'laserFire':
          this.tone('sawtooth', 120, 90, 0.45, 0.08);
          this.noise(0.45, 0.12, 4000, 1500, 0, 'bandpass');
          break;
        case 'phase':
          this.tone('sawtooth', 200, 800, 0.4, 0.1);
          break;
        case 'boost':
          this.tone('sawtooth', 120, 900, 1.4, 0.07);
          this.noise(1.6, 0.25, 500, 5000, 0, 'bandpass');
          break;
        case 'pause':
          this.tone('sine', 700, 700, 0.08, 0.1);
          break;
        case 'start':
          [392, 523, 659, 784, 1046].forEach((f, i) => this.tone('square', f, f, 0.1, 0.07, i * 0.08));
          break;
        case 'clear':
          [523, 659, 784, 659, 784, 1046].forEach((f, i) => this.tone('triangle', f, f, 0.16, 0.12, i * 0.14));
          break;
        case 'gameover':
          [392, 349, 311, 262].forEach((f, i) => this.tone('triangle', f, f * 0.98, 0.35, 0.12, i * 0.3));
          break;
      }
    },
  };
})();
