// Procedural sound for "Pirátský poklad" – Web Audio synthesis only, no audio files, no third-party assets.
(function (root) {
  function Synth(ctx, out) {
    const S = this; S.ctx = ctx;
    const sfx = ctx.createGain(); sfx.gain.value = 0.8; sfx.connect(out);
    const mus = ctx.createGain(); mus.gain.value = 0.35; mus.connect(out);
    S.sfxBus = sfx; S.musBus = mus;
    const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    function noise(t, dur, type, f0, f1, q, vol, dest, attack = 0.002) {
      const s = ctx.createBufferSource(); s.buffer = nb; s.loop = true;
      const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(dest || sfx); s.start(t, Math.random()); s.stop(t + dur + .05);
    }
    function tone(t, dur, type, f0, f1, vol, dest, attack = 0.005, lp) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      let n = o; if (lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; o.connect(f); n = f; }
      n.connect(g); g.connect(dest || sfx); o.start(t); o.stop(t + dur + .05);
    }
    const now = () => ctx.currentTime + 0.01;
    const N = m => 440 * Math.pow(2, (m - 69) / 12);
    S.click = (t = now()) => { tone(t, .05, 'square', 1800, 700, .08, null, .001, 3000); noise(t, .03, 'highpass', 3000, 0, 1, .05); };
    S.tick = (t = now()) => { noise(t, .035, 'bandpass', 1400 + Math.random() * 400, 0, 6, .07); };
    S.thunk = (t = now()) => { tone(t, .18, 'sine', 140, 55, .45, null, .002); noise(t, .09, 'lowpass', 900, 200, 1, .35); noise(t, .03, 'bandpass', 2500, 0, 3, .08); };
    S.smallWin = (t = now()) => { [72, 76, 79, 84].forEach((m, i) => tone(t + i * .08, .35, 'triangle', N(m), 0, .16, null, .005)); };
    S.coin = (t = now()) => { const f = 2400 + Math.random() * 1600; tone(t, .25, 'sine', f, 0, .07); tone(t, .18, 'sine', f * 1.5, 0, .04); tone(t + .04, .2, 'sine', f * 1.12, 0, .04); };
    S.bigWin = (t = now()) => { const seq = [[67, 0, .18], [72, .18, .18], [76, .36, .18], [79, .54, .5], [76, .9, .15], [79, 1.05, .9]];
      seq.forEach(([m, o, d]) => { [0, 7, 12].forEach((iv, k) => tone(t + o, d + .2, 'sawtooth', N(m + iv - 12 * (k === 2 ? 0 : 0)), 0, .07 / (k + 1), null, .02, 2200)); tone(t + o, d + .1, 'sine', N(m - 24), 0, .14); });
      noise(t, .6, 'highpass', 6000, 0, .7, .05, null, .01); for (let i = 0; i < 14; i++) S.coin(t + .3 + i * .12 + Math.random() * .05); };
    S.wild = (t = now()) => { noise(t, .9, 'bandpass', 180, 1800, 2, .35, null, .25); noise(t + .55, .7, 'lowpass', 1800, 150, .7, .4, null, .01); tone(t + .5, .6, 'sine', 90, 40, .35); tone(t, 1.2, 'sawtooth', 55, 45, .05, null, .3, 300); };
    S.scatter = (t = now()) => { [84, 88, 91].forEach((m, i) => { const f = N(m); tone(t + i * .09, 1.2, 'sine', f, 0, .1); tone(t + i * .09, .8, 'sine', f * 2.76, 0, .03); tone(t + i * .09, .5, 'sine', f * 5.4, 0, .015); }); };
    S.fsStart = (t = now()) => { const mel = [62, 65, 69, 74, 72, 74, 77, 81]; mel.forEach((m, i) => { tone(t + i * .14, .3, 'sawtooth', N(m), 0, .06, null, .01, 2500); tone(t + i * .14, .3, 'triangle', N(m - 12), 0, .08); });
      [62, 69, 74, 77].forEach(m => tone(t + 1.15, 1.4, 'sawtooth', N(m), 0, .045, null, .05, 1800)); tone(t + 1.15, 1.4, 'sine', N(38), 0, .2); noise(t + 1.15, 1.2, 'highpass', 5000, 0, .7, .05, null, .02); S.scatter(t); };
    S.dig = (t = now()) => { noise(t, .22, 'lowpass', 700, 250, 1, .35, null, .01); noise(t + .05, .15, 'bandpass', 1800, 900, 1.5, .08, null, .02); };
    S.treasure = (t = now()) => { S.dig(t); S.coin(t + .15); S.coin(t + .22); tone(t + .15, .4, 'triangle', N(84), 0, .08); };
    S.skull = (t = now()) => { S.dig(t); tone(t + .12, .7, 'sawtooth', 110, 70, .12, null, .01, 600); tone(t + .12, .7, 'sawtooth', 116, 74, .1, null, .01, 600); noise(t + .12, .25, 'lowpass', 400, 100, 1, .3); };
    S.wave = (t = now()) => { noise(t, 2.6, 'lowpass', 200, 1400, .8, .4, null, 1.0); noise(t + .8, 1.8, 'bandpass', 800, 3000, .6, .18, null, .6); tone(t, 2.4, 'sine', 60, 40, .2, null, .8); noise(t + 1.6, 1.0, 'highpass', 2500, 0, .5, .12, null, .05); };
    S.splash = (t = now()) => { noise(t, .5, 'lowpass', 2500, 300, .8, .35, null, .01); noise(t, .25, 'highpass', 3000, 0, .7, .12, null, .005); tone(t, .3, 'sine', 120, 50, .2); };
    S.antic = (t = now()) => { tone(t, 1.2, 'sawtooth', 220, 880, .06, null, .1, 1800); tone(t, 1.2, 'sine', 440, 1760, .05, null, .1); };
    S.tick2 = 0;
    S.duck = on => { const t = ctx.currentTime; mus.gain.cancelScheduledValues(t); mus.gain.setValueAtTime(mus.gain.value, t); mus.gain.linearRampToValueAtTime(on ? .06 : .35, t + (on ? .25 : 1.2)); };
    S.thunder = (t = now()) => { noise(t, .12, 'highpass', 2000, 800, .7, .5); noise(t + .05, 2.2, 'lowpass', 400, 60, .9, .7, null, .02); tone(t + .05, 1.6, 'sine', 55, 30, .35, null, .02); };
    S.cannon = (t = now()) => { noise(t, .9, 'lowpass', 900, 80, .8, .7, null, .003); tone(t, .5, 'sine', 90, 35, .5, null, .003); };
    // smyčka točení (živě) – tiká, dokud se válce točí
    let spinTimer = null;
    S.spinStart = () => { S.spinStop(); spinTimer = setInterval(() => S.tick(), 70); };
    S.spinStop = () => { if (spinTimer) clearInterval(spinTimer); spinTimer = null; };
    S.spinLoopAt = (t, dur) => { for (let x = 0; x < dur; x += .07) S.tick(t + x); };
    // ---- hudba na pozadí: vlny + vrzání + tichá námořnická píseň (d moll, 6/8) ----
    const melody = [62, 0, 65, 64, 62, 60, 62, 0, 57, 57, 60, 62, 65, 0, 64, 62, 60, 62, 64, 0, 0, 62, 0, 0];
    const bass = [38, 38, 41, 36, 38, 38, 33, 38];
    S.musicBar = (t) => { // jedna šestisekundová fráze
      const st = .25; melody.forEach((m, i) => { if (m) { tone(t + i * st, st * 1.6, 'triangle', N(m), 0, .05, mus, .02); tone(t + i * st, st * 1.2, 'square', N(m), 0, .008, mus, .02, 1200); } });
      bass.forEach((m, i) => { tone(t + i * .75, .7, 'sine', N(m), 0, .09, mus, .03); tone(t + i * .75 + .375, .3, 'triangle', N(m + 19), 0, .02, mus, .02); });
      noise(t, 3.2, 'lowpass', 500, 900, .5, .07, mus, 1.4); noise(t + 3, 3.2, 'lowpass', 600, 800, .5, .06, mus, 1.6);
      if (Math.random() < .7) { const c = t + 1 + Math.random() * 4; tone(c, .5, 'sawtooth', 180 + Math.random() * 60, 140, .015, mus, .1, 900); }
    };
    let musTimer = null, nextBar = 0;
    S.musicStart = () => { if (musTimer) return; nextBar = ctx.currentTime + .1; const loop = () => { while (nextBar < ctx.currentTime + 1.5) { S.musicBar(nextBar); nextBar += 6; } }; loop(); musTimer = setInterval(loop, 500); };
    S.musicStop = () => { if (musTimer) clearInterval(musTimer); musTimer = null; mus.gain.cancelScheduledValues(ctx.currentTime); const v = mus.gain.value; mus.gain.setValueAtTime(v, ctx.currentTime); mus.gain.linearRampToValueAtTime(0, ctx.currentTime + .3); setTimeout(() => { mus.gain.value = .35; }, 6500); };
  }
  // živý ovladač s nastavením + pravidla automatického přehrávání
  const Sound = { ready: false, sfxOn: localStorage.getItem('pp_sfx') !== '0', musOn: localStorage.getItem('pp_music') !== '0', s: null,
    unlock() { if (this.ready) return; try { const C = window.AudioContext || window.webkitAudioContext; if (!C) return; const ctx = new C(); const m = ctx.createGain(); m.gain.value = .9; m.connect(ctx.destination);
      this.s = new Synth(ctx, m); this.ready = true; ctx.resume(); this.apply(); } catch (e) { console.warn('Zvuk nedostupný', e); } },
    apply() { if (!this.ready) return; this.s.sfxBus.gain.value = this.sfxOn ? .8 : 0; if (this.musOn) this.s.musicStart(); else this.s.musicStop(); },
    play(n, ...a) { if (this.ready && this.sfxOn && this.s[n]) this.s[n](...a); },
    toggleSfx() { this.sfxOn = !this.sfxOn; localStorage.setItem('pp_sfx', this.sfxOn ? '1' : '0'); if (!this.sfxOn) this.s && this.s.spinStop(); this.apply(); },
    toggleMusic() { this.musOn = !this.musOn; localStorage.setItem('pp_music', this.musOn ? '1' : '0'); this.apply(); } };
  root.PirateSynth = Synth; root.Sound = Sound;
  ['pointerdown', 'keydown'].forEach(ev => addEventListener(ev, () => Sound.unlock(), { once: false, capture: true }));
})(this);
