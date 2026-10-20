(function () {
  const C = window.GAME_CONFIG, E = new PirateEngine.Engine(C);
  const $ = id => document.getElementById(id);
  const cctx = $('coins').getContext('2d'), cv = $('reels'), ctx = cv.getContext('2d'), fx = $('fx'), fctx = fx.getContext('2d');
  const CW = 200, CH = 200, LINE_COLORS = ['#ff5252','#ffeb3b','#69f0ae','#40c4ff','#e040fb','#ffab40','#b2ff59','#18ffff','#ff80ab','#ea80fc','#ffd740','#64ffda','#ff6e40','#8c9eff','#eeff41','#f48fb1','#80d8ff','#ccff90','#ffe57f','#b388ff'];
  const imgs = {}; let woodBg = null;
  function makeWood() { const c = document.createElement('canvas'); c.width = 200; c.height = 600; const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 200, 0); g.addColorStop(0, '#2a1407'); g.addColorStop(.15, '#5a3016'); g.addColorStop(.5, '#7a4520'); g.addColorStop(.85, '#5a3016'); g.addColorStop(1, '#1e0e04');
    x.fillStyle = g; x.fillRect(0, 0, 200, 600); let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 260; i++) { x.strokeStyle = `rgba(${rnd() < .5 ? '20,8,2' : '150,90,40'},${.08 + rnd() * .12})`; x.lineWidth = .5 + rnd() * 2; const px = rnd() * 200; x.beginPath(); x.moveTo(px, 0); x.bezierCurveTo(px + rnd() * 10 - 5, 200, px + rnd() * 10 - 5, 400, px + rnd() * 6 - 3, 600); x.stroke(); }
    for (const y of [0, 300]) { x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, y, 200, 3); }
    const v = x.createRadialGradient(100, 300, 40, 100, 300, 340); v.addColorStop(0, 'rgba(60,30,10,.25)'); v.addColorStop(1, 'rgba(0,0,0,.78)'); x.fillStyle = v; x.fillRect(0, 0, 200, 600);
    return c; }
  function loadArt() { return Promise.all(Object.entries(SYMBOL_ART).map(([k, svg]) => new Promise(res => { const i = new Image(); i.onload = res; i.onerror = res; i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); imgs[k] = i; })).concat(PNG_IDS.map(k => new Promise(res => { const i = new Image(); i.onload = res; i.onerror = () => { console.warn('chybí obrázek ' + k); res(); }; i.src = 'img/' + k + '.png'; imgs[k] = i; })))); }
  const LETTERS = new Set(['10', 'J', 'Q', 'K', 'A']);
  const PNG_IDS = ['crest', 'ship', 'ship2', 'kraken', '10', 'J', 'Q', 'K', 'A', 'kotva', 'papousek', 'kompas', 'truhla', 'kapitan', 'wild', 'mapa'];
  const S = { balance: C.startBalance, betIdx: 0, spinning: false, auto: false, fsLeft: 0, fsMult: 1, fsTotal: 0, inFs: false };
  const bet = () => C.bets[S.betIdx];
  const fmt = v => (Math.round(v * 100) / 100).toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\u00a0/g, ' ') + ' Kč';
  const JP = C.jackpot; let pools = JSON.parse(localStorage.getItem('pp_pools') || 'null') || JP.tiers.map(t => t.seed * JP.minBet);
  let kraken = null, krakenHide = new Set(); let krakenCells = new Set(), shipFx = null, wave = null; const WD = 3000;
  const waveFront = t => { const u = Math.max(0, Math.min(1, t / 2500)); return -20 + 1400 * (u < .5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2); }; const WD2 = 3600;
  let pos = [0, 0, 0, 0, 0].map(() => 0), grid = null, wildOverlay = [], pulse = null, blur = [0,0,0,0,0];
  for (let r = 0; r < 5; r++) pos[r] = Math.floor(Math.random() * E.strips[r].length);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const easeOutQuad = u => 1 - (1 - u) * (1 - u), easeInQuad = u => u * u, easeOutCubic = u => 1 - (1 - u) ** 3, easeInOutQuad = u => u < .5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
  const easeOutBack = (u, s = 1.70158) => 1 + (s + 1) * (u - 1) ** 3 + s * (u - 1) ** 2;
  let jpScene = null, jpSkip = null, storm = null, jpMarks = null;
  let turbo = localStorage.getItem('pp_turbo') === '1', spinState = null, squash = [0, 0, 0, 0, 0], anticip = -1, shakeT = 0, shakeA = 0, shakeD = 0, winT0 = 0, lineT0 = 0, floats = [], parts = [], skipLines = false;
  window.__ev = []; const ev = n => window.__ev.push([n, performance.now()]);
  const shake = (a, d) => { shakeT = performance.now(); shakeA = a; shakeD = d; };

  function drawSym(id, x, y, scale = 1, alpha = 1, sy = 1) {
    const im = imgs[id]; if (!im) return; const w = CW * scale, h = CH * scale * sy;
    ctx.globalAlpha = alpha; ctx.shadowColor = 'rgba(0,0,0,.75)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 7;
    ctx.drawImage(im, x + (CW - w) / 2 + 4, y + (CH - h) / 2 + 4, w - 8, h - 8); ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.globalAlpha = 1;
  }
  const shineC = document.createElement('canvas'); shineC.width = shineC.height = 200; const shx = shineC.getContext('2d');
  function drawWinSym(id, x, y, base, t, t0) {
    const lt = t - t0, ph = (lt % 1200) / 1200, im = imgs[id]; if (!im) return; const S0 = base, cx = x + 100, cy = y + 100, sz = 192 * S0;
    const dr = (img, sx, sy2, sw, sh, dx, dy, dw, dh) => ctx.drawImage(img, sx, sy2, sw, sh, dx, dy, dw, dh);
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 7;
    const W = im.width, H = im.height;
    if (LETTERS.has(id)) { const u = Math.min(1, lt / 300), pop = u < 1 ? 1 + .15 * Math.sin(u * Math.PI) : 1 + .03 * Math.sin(lt / 160); const s = sz * pop;
      shx.clearRect(0, 0, 200, 200); shx.globalCompositeOperation = 'source-over'; shx.drawImage(im, 4, 4, 192, 192); shx.globalCompositeOperation = 'source-atop';
      const sp = ((lt % 1400) / 450) * 2 - .5; const gr = shx.createLinearGradient(sp * 200 - 60, 0, sp * 200 + 60, 200); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(255,255,255,.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      shx.fillStyle = gr; shx.fillRect(0, 0, 200, 200); ctx.drawImage(shineC, cx - s / 2, cy - s / 2, s, s); }
    else if (id === 'papousek') { const f = Math.sin(ph * Math.PI * 4), tilt = .12 * Math.sin(ph * Math.PI * 2), s = sz * .94, k = s / W;
      ctx.translate(cx, cy + s / 2); ctx.rotate(tilt * .4); ctx.translate(0, -s / 2);
      const wl = .34; // křídla = krajní pruhy otáčené kolem vnitřní hrany
      ctx.save(); ctx.translate(-s / 2 + s * wl, 0); ctx.rotate(-.35 * f); dr(im, 0, H * .3, W * wl, H * .7, -s * wl, -s / 2 + s * .3, s * wl, s * .7); ctx.restore();
      ctx.save(); ctx.translate(s / 2 - s * wl, 0); ctx.rotate(.35 * f); dr(im, W * (1 - wl), H * .3, W * wl, H * .7, 0, -s / 2 + s * .3, s * wl, s * .7); ctx.restore();
      dr(im, W * wl, H * .3, W * (1 - 2 * wl), H * .7, -s / 2 + s * wl, -s / 2 + s * .3, s * (1 - 2 * wl), s * .7);
      ctx.save(); ctx.translate(0, -s / 2 + s * .32); ctx.rotate(tilt); dr(im, 0, 0, W, H * .32, -s / 2, -s * .32, s, s * .32); ctx.restore(); }
    else if (id === 'truhla') { const open = Math.min(1, (ph < .5 ? ph : 1 - ph) * 3), s = sz, top = .46;
      const gl = ctx.createRadialGradient(cx, cy - 10, 5, cx, cy - 10, 110); gl.addColorStop(0, `rgba(255,230,120,${.7 * open})`); gl.addColorStop(1, 'rgba(255,200,60,0)'); ctx.fillStyle = gl; ctx.fillRect(x, y, 200, 200);
      dr(im, 0, H * top, W, H * (1 - top), cx - s / 2, cy - s / 2 + s * top, s, s * (1 - top));
      ctx.save(); ctx.translate(cx, cy - s / 2 + s * top); ctx.rotate(-.5 * open); ctx.translate(-s * .02 * open, -s * .08 * open); dr(im, 0, 0, W, H * top, -s / 2, -s * top, s, s * top); ctx.restore();
      if (open > .6 && Math.random() < .5) parts.push({ x: x + 60 + Math.random() * 80, y: y + 90, vx: (Math.random() - .5) * 3, vy: -4 - Math.random() * 4, g: .25, l: 1, d: .02, coin: 1 }); }
    else if (id === 'kapitan') { const laugh = Math.abs(Math.sin(ph * Math.PI * 6)) * (ph < .6 ? 1 : 0), tilt = .14 * Math.sin(ph * Math.PI * 2), s = sz;
      ctx.translate(cx, cy + s / 2); ctx.rotate(tilt); ctx.scale(1 + laugh * .03, 1 - laugh * .05 + .05); dr(im, 0, 0, W, H, -s / 2, -s, s, s); }
    else if (id === 'kompas') { const s = sz; dr(im, 0, 0, W, H, cx - s / 2, cy - s / 2, s, s); ctx.shadowColor = 'transparent';
      const a = lt / 1200 * Math.PI * 2 * 3 * (1 - Math.min(1, ph) * .2); ctx.translate(cx, cy + 4); ctx.rotate(a);
      ctx.beginPath(); ctx.moveTo(0, -s * .3); ctx.lineTo(9, 0); ctx.lineTo(0, s * .3); ctx.lineTo(-9, 0); ctx.closePath(); ctx.fillStyle = '#c62828'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, s * .3); ctx.lineTo(9, 0); ctx.lineTo(-9, 0); ctx.closePath(); ctx.fillStyle = '#eceff1'; ctx.fill(); ctx.beginPath(); ctx.arc(0, 0, 6, 0, 7); ctx.fillStyle = '#e8b23a'; ctx.fill(); }
    else if (id === 'kotva') { const s = sz, a = .35 * Math.sin(ph * Math.PI * 2) * Math.exp(-ph * 1.2); ctx.translate(cx, y + 12); ctx.rotate(a); dr(im, 0, 0, W, H, -s / 2, -4, s, s); }
    else if (id === 'mapa') { const s = sz, u = Math.min(1, lt / 500), sx = .55 + .45 * easeOutBack(u); dr(im, 0, 0, W, H, cx - s * sx / 2, cy - s / 2, s * sx, s); ctx.shadowColor = 'transparent';
      ctx.strokeStyle = `rgba(255,60,40,${.5 + .5 * Math.sin(lt / 120)})`; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx + s * .12, cy - s * .08, 22 + 6 * Math.sin(lt / 120), 0, 7); ctx.stroke(); }
    else { const s = sz * (1 + .06 * Math.sin(lt / 140)); const gl = ctx.createRadialGradient(cx, cy, 30, cx, cy, 110); gl.addColorStop(0, 'rgba(255,215,90,.5)'); gl.addColorStop(1, 'rgba(255,180,0,0)'); ctx.fillStyle = gl; ctx.fillRect(x, y, 200, 200); dr(im, 0, 0, W, H, cx - s / 2, cy - s / 2, s, s); }
    ctx.restore();
  }
  // pěna: měkký předrenderovaný sprite (nepravidelný chuchvalec)
  const FOAM = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); for (let i = 0; i < 7; i++) { const px = 32 + (Math.random() - .5) * 26, py = 32 + (Math.random() - .5) * 26, r = 10 + Math.random() * 12, g2 = x.createRadialGradient(px, py, 1, px, py, r); g2.addColorStop(0, 'rgba(255,255,255,.95)'); g2.addColorStop(.6, 'rgba(225,245,255,.5)'); g2.addColorStop(1, 'rgba(200,235,255,0)'); x.fillStyle = g2; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); } return c; })();
  const blurC = document.createElement('canvas'); blurC.width = 250; blurC.height = 150;
  function render(t) {
    $('fx').classList.toggle('dimmed', bigOn); const rw = $('reelsWrap'); if (rw) { const sk = t - shakeT; rw.style.transform = sk < shakeD ? `translate(${(Math.random() - .5) * 2 * shakeA}px,${(Math.random() - .5) * 2 * shakeA}px)` : ''; }
    ctx.clearRect(0, 0, 1000, 600);
    if (wave) { const wt = t - wave.t0, F = waveFront(wt);
      for (let r = 0; r < 5; r++) { if (woodBg) ctx.drawImage(woodBg, r * CW, 0, CW, 600);
        const s = Math.max(0, Math.min(1, (F - r * CW - 30) / 230)), d = (F - r * CW - 330) / 300;
        if (s > .02 && !wave.hit[r]) { wave.hit[r] = 1; Sound.play('splash'); shake(3, 140); for (let i = 0; i < 6; i++) wave.drops.push({ x: r * CW + 20 + Math.random() * 160, y: 40 + Math.random() * 300, l: 1, v: .6 + Math.random() * 1.2, r: 5 + Math.random() * 6 }); for (let i = 0; i < 26; i++) wave.p.push({ x: r * CW + 100, y: 100 + Math.random() * 400, vx: 3 + Math.random() * 9, vy: -4 - Math.random() * 9, l: 1, r: 3 + Math.random() * 6 }); }
        for (let y = 0; y < 3; y++) {
          const sy = Math.max(0, Math.min(1, s * 1.15 - y * .07));
          if (sy < 1) { ctx.save(); ctx.translate(r * CW + 100 + sy * 300, y * CH + 100 - sy * 220 + sy * sy * 60); ctx.rotate(sy * (2 + y * .6)); ctx.globalAlpha = 1 - sy; const sc = 1 - sy * .3; ctx.drawImage(imgs[wave.og[r][y]], -95 * sc, -95 * sc, 190 * sc, 190 * sc); ctx.restore(); ctx.globalAlpha = 1; }
          if (!wave.pass) wave.pass = []; if (wave.pass[r] == null && F > r * CW + CW + 60) wave.pass[r] = wt; const dy = wave.pass[r] == null ? 0 : Math.max(0, Math.min(1, (wt - wave.pass[r] - 60) / 420 - (2 - y) * .12)); if (dy > 0 && !wave.evd) { wave.evd = 1; ev('drop'); } if (dy >= 1 && !wave.land[r * 3 + y]) { wave.land[r * 3 + y] = 1; if (y === 2) Sound.play('thunk'); for (let i = 0; i < 8; i++) wave.p.push({ x: r * CW + 100 + (Math.random() - .5) * 140, y: y * CH + 180, vx: (Math.random() - .5) * 6, vy: -2 - Math.random() * 5, l: 1, r: 2 + Math.random() * 4 }); }
          if (dy > 0) { const b = easeOutBack(dy, 1.6); drawSym(wave.ng[r][y], r * CW, -CH * 1.2 + (y * CH + CH * 1.2) * b, LETTERS.has(wave.ng[r][y]) ? .84 : 1.1); }
        } }
      { const cr = imgs.crest, ch = 640 + 20 * Math.sin(wt / 200), cw = ch * cr.width / cr.height, E2 = F - 120, drain = Math.max(0, (wt - 1500) / 900);
        if (E2 > 0) { const bx = blurC.getContext('2d'); bx.imageSmoothingEnabled = true; bx.clearRect(0, 0, 250, 150); bx.drawImage(cv, 0, 0, 250, 150); ctx.save(); ctx.beginPath(); ctx.moveTo(-10, 610);
          for (let x = -10; x <= E2; x += 20) { const lvl = 120 + (E2 - x) * .3 + drain * 620 + 18 * Math.sin(x / 55 + wt / 140); ctx.lineTo(x, Math.min(610, lvl)); }
          ctx.lineTo(E2, 610); ctx.closePath(); ctx.clip(); ctx.beginPath(); ctx.rect(Math.max(0, F - 380), 0, 400, 600); ctx.clip(); ctx.globalAlpha = .85; ctx.drawImage(blurC, 0, 0, 250, 150, 0, 0, 1000, 600); ctx.globalAlpha = 1; ctx.restore(); } }
    } else
    for (let r = 0; r < 5; r++) {
      if (woodBg) ctx.drawImage(woodBg, r * CW, 0, CW, 600);
      const strip = E.strips[r], L = strip.length, p = pos[r], top = Math.floor(p), frac = p - top;
      ctx.save(); ctx.beginPath(); ctx.rect(r * CW, 0, CW, 600); ctx.clip();
      if (wildOverlay.includes(r) && bigOn) { } else if (wildOverlay.includes(r)) {
        const gu = Math.min(1, (t - wildOverlay.t0) / 450), k = Math.min(1, (t - wildOverlay.t0) / 150), gs = .33 + .67 * easeOutBack(gu, 2.2);
        ctx.save(); ctx.translate(0, 300); ctx.scale(1, gs); ctx.translate(0, -300); ctx.globalAlpha = k; const cg = ctx.createRadialGradient(r * CW + 100, 300, 20, r * CW + 100, 300, 320); cg.addColorStop(0, 'rgba(120,200,160,.35)'); cg.addColorStop(1, 'rgba(10,30,30,.2)'); ctx.fillStyle = cg; ctx.fillRect(r * CW, 0, CW, 600);
        const kr = imgs.kraken, kh = 600 * (1 + (bigOn ? 0 : 0.015 * Math.sin(t / 200))), kw = kh * kr.width / kr.height; ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 8;
        ctx.drawImage(kr, r * CW + 100 - kw / 2, 300 - kh / 2, kw, kh); ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        const py = 470, pg = ctx.createLinearGradient(0, py, 0, py + 62); pg.addColorStop(0, '#fff2b8'); pg.addColorStop(.45, '#e3b04a'); pg.addColorStop(.55, '#9a6a18'); pg.addColorStop(1, '#f0cf73');
        ctx.fillStyle = pg; ctx.strokeStyle = '#2a1405'; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(r * CW + 20, py, 160, 62, 12); ctx.fill(); ctx.stroke();
        ctx.font = '400 50px "Pirata One"'; ctx.textAlign = 'center'; ctx.fillStyle = '#3a1a02'; ctx.fillText('WILD', r * CW + 100, py + 49); ctx.globalAlpha = 1; ctx.restore();
        ctx.strokeStyle = '#ffd54f'; ctx.lineWidth = 6; ctx.shadowColor = '#ffb300'; ctx.shadowBlur = bigOn ? 0 : 25 * k; ctx.strokeRect(r * CW + 5, 5, CW - 10, 590); ctx.shadowBlur = 0;
        
      } else for (let y = -1; y < 4; y++) {
        if (krakenHide.has(r * 3 + y) && !krakenCells.has(r * 3 + y) && frac === 0) continue;
        if (jpMarks && frac === 0 && jpMarks.some(m => m.r === r && m.y === y && pos[r] === m.stop)) continue;
        const id = krakenCells.has(r * 3 + y) && frac === 0 ? 'wild' : E.ids[strip[(((top + y) % L) + L) % L]], cy = Math.round((y - frac) * CH);
        let sc = id === 'papousek' ? .94 : 1; const hot = !bigOn && pulse && pulse.cells.has(r * 3 + y) && frac === 0 && t - winT0 > r * 70;
        const bs = sc * (LETTERS.has(id) ? .84 : 1.1);
        if (hot) { const hg = ctx.createRadialGradient(r * CW + 100, cy + 100, 10, r * CW + 100, cy + 100, 110); hg.addColorStop(0, 'rgba(255,200,60,.4)'); hg.addColorStop(1, 'rgba(255,160,0,0)'); ctx.fillStyle = hg; ctx.fillRect(r * CW, cy, CW, CH); drawWinSym(id, r * CW, cy, bs, t, winT0 + r * 70); continue; }
        if (blur[r]) { for (let k2 = 0; k2 < 4; k2++) drawSym(id, r * CW, cy - k2 * 14, 1, .26, 1.15); continue; }
        const sq = t - squash[r], sqy = sq < 120 ? .94 + .06 * (sq / 120) : 1;
        const isSc = id === 'mapa' && anticip >= 0 && frac === 0, scp = isSc ? 1 + .12 * (.5 - .5 * Math.cos(t / 400 * Math.PI)) : 1;
        drawSym(id, r * CW, cy, bs * scp, 1, sqy);
      }
      ctx.restore();
      if (jpMarks) for (const m of jpMarks) if (m.r === r && pos[r] === m.stop) { const mx = r * CW + 100, my = m.y * CH + 100, pl = .5 + .5 * Math.sin(t / 150);
        const gg = ctx.createRadialGradient(mx, my, 20, mx, my, 120); gg.addColorStop(0, `rgba(255,220,90,${.35 + .25 * pl})`); gg.addColorStop(1, 'rgba(255,180,0,0)'); ctx.fillStyle = gg; ctx.fillRect(r * CW, m.y * CH, CW, CH);
        ctx.save(); ctx.shadowColor = '#ffcc33'; ctx.shadowBlur = 25 + 15 * pl; ctx.drawImage(imgs.truhla, mx - 70, my - 62, 140, 140); ctx.restore();
        ctx.font = '500 26px Oswald'; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = '#2a1405'; ctx.strokeText('JACKPOT', mx, my + 88); ctx.fillStyle = '#ffe27a'; ctx.fillText('JACKPOT', mx, my + 88); }
      if (anticip >= 0) { if (r === anticip) { ctx.save(); ctx.strokeStyle = '#18ffff'; ctx.shadowColor = '#18ffff'; ctx.shadowBlur = 30 + 10 * Math.sin(t / 300 * Math.PI * 2); ctx.lineWidth = 8; ctx.strokeRect(r * CW + 6, 6, CW - 12, 588); ctx.restore(); } else { ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(r * CW, 0, CW, 600); } }
      if (r < 4 && false) { const bx = r * CW + CW - 6, mg = ctx.createLinearGradient(bx, 0, bx + 12, 0); mg.addColorStop(0, '#3a2205'); mg.addColorStop(.3, '#f2d488'); mg.addColorStop(.6, '#8a5a12'); mg.addColorStop(1, '#2a1405');
        ctx.fillStyle = mg; ctx.fillRect(bx, 0, 12, 600); for (const sy of [20, 300, 580]) { ctx.fillStyle = '#2a1405'; ctx.beginPath(); ctx.arc(bx + 6, sy, 7, 0, 7); ctx.fill(); ctx.fillStyle = '#e8b23a'; ctx.beginPath(); ctx.arc(bx + 6, sy, 5, 0, 7); ctx.fill(); } }
    }
    for (let r = 1; r < 5; r++) { const bx = r * CW, mg = ctx.createLinearGradient(bx - 5, 0, bx + 5, 0); mg.addColorStop(0, 'rgba(0,0,0,0)'); mg.addColorStop(.5, 'rgba(0,0,0,.65)'); mg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = mg; ctx.fillRect(bx - 5, 0, 10, 600);
      ctx.fillStyle = 'rgba(201,154,58,.35)'; ctx.fillRect(bx - .5, 0, 1, 600); }
    const sh = ctx.createLinearGradient(0, 0, 0, 600); sh.addColorStop(0, 'rgba(0,0,0,.7)'); sh.addColorStop(.14, 'rgba(0,0,0,0)'); sh.addColorStop(.86, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.7)');
    ctx.fillStyle = sh; ctx.fillRect(0, 0, 1000, 600);
    drawFx(t); requestAnimationFrame(render);
  }
  // ---- Útok krakena: procedurální chapadla ----
  function bez(p0, p1, p2, p3, u) { const v = 1 - u; return [v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0], v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1]]; }
  function tentacle(pts, wob) {
    const n = pts.length; // tělo: zužující se kruhy, tmavý okraj + tělo + odlesk + přísavky
    for (let pass = 0; pass < 3; pass++) for (let i = 0; i < n; i++) { const [x, y] = pts[i], k = i / (n - 1), rad = 46 * (1 - k) + 6;
      fctx.beginPath(); fctx.arc(x, y, pass === 0 ? rad + 3 : pass === 1 ? rad : rad * .45, 0, 7);
      fctx.fillStyle = pass === 0 ? '#2a0814' : pass === 1 ? `rgb(${120 + 40 * k | 0},${34 + 10 * k | 0},${62 + 20 * k | 0})` : 'rgba(230,140,170,.35)';
      if (pass === 2) { fctx.save(); fctx.translate(-rad * .3, -rad * .3); fctx.fill(); fctx.restore(); } else fctx.fill(); }
    for (let i = 2; i < n - 2; i += 3) { const [x, y] = pts[i], [x2, y2] = pts[i + 1], k = i / (n - 1), rad = 46 * (1 - k) + 6, a = Math.atan2(y2 - y, x2 - x) + Math.PI / 2;
      const sx = x + Math.cos(a) * rad * .62, sy = y + Math.sin(a) * rad * .62, sr = rad * .32;
      fctx.beginPath(); fctx.arc(sx, sy, sr, 0, 7); fctx.fillStyle = '#f0c4c8'; fctx.fill(); fctx.lineWidth = 2; fctx.strokeStyle = '#5a1a2a'; fctx.stroke();
      fctx.beginPath(); fctx.arc(sx, sy, sr * .45, 0, 7); fctx.fillStyle = '#8a3048'; fctx.fill(); }
  }
  function drawKraken(t) {
    const K = kraken, kt = t - K.t0; let alive = false;
    for (const T of K.T) { const lt = kt - T.s; if (lt < 0) { alive = true; continue; } if (lt > 1900) continue; alive = true;
      const cx = T.r * CW + 100, cy = T.y * CH + 100, wig = Math.sin(t / 110 + T.ph), base = [T.bx, 680];
      let tip, curl = 0, ext = 1;
      if (lt < 550) { const u = lt / 550, e = 1 - (1 - u) ** 3; tip = [base[0] + (cx - base[0]) * e + 30 * wig * (1 - e), 680 + (cy + 40 - 680) * e]; if (!T.st) { T.st = 1; Sound.play('splash'); } }
      else if (lt < 850) { const u = (lt - 550) / 300; curl = u; const a = Math.PI / 2 - u * Math.PI * 1.8; tip = [cx + Math.cos(a) * 75, cy + Math.sin(a) * 75]; }
      else if (lt < 1350) { const u = (lt - 850) / 500; curl = 1; if (T.st === 1) { T.st = 2; krakenHide.add(T.r * 3 + T.y); Sound.play('wild'); }
        const sy = cy - u * u * 520, sx = cx + Math.sin(u * 9) * 40 * (1 - u * .5); tip = [sx + Math.cos(u * 14) * 50, sy + Math.sin(u * 14) * 30];
        fctx.save(); fctx.translate(sx, sy); fctx.rotate(u * 9); const sc = 1 - u * .7; fctx.globalAlpha = 1 - u * .6; fctx.drawImage(imgs[T.id], -95 * sc, -95 * sc, 190 * sc, 190 * sc); fctx.restore(); fctx.globalAlpha = 1;
        if (u > .55 && T.st === 2) { T.st = 3; krakenCells.add(T.r * 3 + T.y); Sound.play('thunk'); T.land = t; for (let i = 0; i < 30; i++) K.p.push({ x: cx, y: cy, vx: (Math.random() - .5) * 14, vy: -Math.random() * 12, l: 1, c: Math.random() < .5 ? '170,230,200' : '200,120,170' }); } }
      else { const u = (lt - 1350) / 550; ext = 1 - u; tip = [cx + 30 * wig, cy + 40 + (700 - cy) * u * u]; }
      if (T.land) { const f = (t - T.land) / 450; if (f < 1) { fctx.strokeStyle = `rgba(255,230,120,${1 - f})`; fctx.lineWidth = 10 * (1 - f) + 2; fctx.beginPath(); fctx.arc(cx, cy, 60 + 90 * f, 0, 7); fctx.stroke(); } }
      const c1 = [base[0] + 60 * wig, 560], c2 = [tip[0] - 90 * Math.sin(t / 150 + T.ph) - curl * 60, tip[1] + 120 + curl * 30], pts = [];
      for (let i = 0; i <= 26; i++) pts.push(bez(base, c1, c2, tip, i / 26));
      tentacle(pts);
      if (Math.random() < .4) K.p.push({ x: tip[0], y: tip[1], vx: (Math.random() - .5) * 4, vy: Math.random() * 2, l: 1, c: '170,230,200' }); }
    K.p = K.p.filter(q => (q.l -= .025) > 0); for (const q of K.p) { q.x += q.vx; q.y += q.vy; q.vy += .45; fctx.fillStyle = `rgba(${q.c},${q.l * .9})`; fctx.beginPath(); fctx.arc(q.x, q.y, 3 + 4 * q.l, 0, 7); fctx.fill(); }
    if (!alive) { const d = K.done; kraken = null; d && d(); }
  }
  // ---- efekty výhry ----
  let bigOn = false, fxLines = [], fxActive = -1, coins = [], krakenFx = null, skipNow = null;
  function drawFx(t) {
    fctx.clearRect(0, 0, 1000, 600);
    const list = (bigOn || jpScene) ? [] : fxActive >= 0 ? [fxLines[fxActive]] : fxLines;
    for (const w of list) {
      if (!w) continue; const L = C.paylines[w.line], col = LINE_COLORS[w.line];
      const path = () => { fctx.beginPath(); L.forEach((row, r) => { const x = r * CW + CW / 2, y = row * CH + CH / 2; r ? fctx.lineTo(x, y) : fctx.moveTo(x - CW / 2, y); }); fctx.lineTo(1000, L[4] * CH + CH / 2); };
      const pts0 = L.map((row, r) => [r * CW + CW / 2, row * CH + CH / 2]); pts0.unshift([0, pts0[0][1]]); pts0.push([1000, pts0[5][1]]);
      let len = 0; for (let i = 1; i < pts0.length; i++) len += Math.hypot(pts0[i][0] - pts0[i - 1][0], pts0[i][1] - pts0[i - 1][1]);
      const lu = easeInOutQuad(Math.min(1, (t - (fxActive >= 0 ? lineT0 : winT0)) / 350)); fctx.setLineDash([len * lu, len + 10]);
      fctx.lineJoin = 'round'; fctx.lineCap = 'round'; path(); fctx.strokeStyle = 'rgba(255,200,60,.75)'; fctx.lineWidth = 12; fctx.shadowColor = '#ffb300'; fctx.shadowBlur = 34 + 10 * Math.sin(t / 120); fctx.stroke(); fctx.shadowBlur = 0;
      const lg = fctx.createLinearGradient(0, 0, 0, 600); lg.addColorStop(0, '#fff3b0'); lg.addColorStop(.5, '#f2b733'); lg.addColorStop(1, '#ffe27a');
      fctx.shadowBlur = 0; path(); fctx.strokeStyle = '#3a1a02'; fctx.lineWidth = 8; fctx.stroke(); path(); fctx.strokeStyle = lg; fctx.lineWidth = 5.5; fctx.stroke();
      fctx.setLineDash([]);
      if (lu < 1) { let d = len * lu, i = 1; while (i < pts0.length) { const sl = Math.hypot(pts0[i][0] - pts0[i - 1][0], pts0[i][1] - pts0[i - 1][1]); if (d <= sl) { const q = d / sl, sx = pts0[i - 1][0] + (pts0[i][0] - pts0[i - 1][0]) * q, sy = pts0[i - 1][1] + (pts0[i][1] - pts0[i - 1][1]) * q;
          const sg = fctx.createRadialGradient(sx, sy, 0, sx, sy, 28); sg.addColorStop(0, '#fff'); sg.addColorStop(.3, 'rgba(255,230,120,.9)'); sg.addColorStop(1, 'rgba(255,200,60,0)'); fctx.fillStyle = sg; fctx.beginPath(); fctx.arc(sx, sy, 28, 0, 7); fctx.fill(); break; } d -= sl; i++; } }
      const by = L[0] * CH + CH / 2; fctx.beginPath(); fctx.arc(36, by, 20, 0, 7); fctx.fillStyle = lg; fctx.fill(); fctx.lineWidth = 3; fctx.strokeStyle = '#2a1405'; fctx.stroke(); fctx.beginPath(); fctx.arc(36, by, 14, 0, 7); fctx.fillStyle = col; fctx.fill();
      fctx.font = '500 20px Oswald'; fctx.textAlign = 'center'; fctx.textBaseline = 'middle'; fctx.fillStyle = '#1a0c02'; fctx.fillText(w.line + 1, 36, by + 1); fctx.textBaseline = 'alphabetic';
      if (fxActive >= 0) for (let r = 0; r < w.count; r++) { fctx.strokeStyle = '#ffd54f'; fctx.shadowColor = '#ffb300'; fctx.shadowBlur = 18; fctx.lineWidth = 5; fctx.beginPath(); fctx.roundRect(r * CW + 10, L[r] * CH + 10, CW - 20, CH - 20, 18); fctx.stroke(); fctx.shadowBlur = 0; }
      fctx.shadowBlur = 0;
    }
    floats = floats.filter(f => t - f.t0 < 900); if (!bigOn) for (const f of floats) { const u = (t - f.t0) / 900; fctx.save(); fctx.globalAlpha = 1 - u * u; const fy = f.y - 30 * easeOutCubic(u); fctx.font = '500 40px Oswald'; const tw = fctx.measureText(f.s).width + 30; fctx.fillStyle = 'rgba(20,10,2,.78)'; fctx.strokeStyle = 'rgba(255,210,90,.9)'; fctx.lineWidth = 2; fctx.beginPath(); fctx.roundRect(f.x - tw / 2, fy - 38, tw, 50, 14); fctx.fill(); fctx.stroke(); fctx.textAlign = 'center'; fctx.lineWidth = 7; fctx.strokeStyle = '#2a1405'; fctx.strokeText(f.s, f.x, f.y - 30 * easeOutCubic(u)); fctx.fillStyle = '#ffe600'; fctx.fillText(f.s, f.x, f.y - 30 * easeOutCubic(u)); fctx.restore(); }
    { const dt = Math.min(50, t - (drawFx.lt || t)) / 16.67; drawFx.lt = t; parts = parts.filter(q => (q.l -= q.d * dt) > 0);
      for (const q of parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += q.g * dt; fctx.globalAlpha = Math.min(1, q.l * 1.5);
        if (q.coin) { fctx.fillStyle = '#ffd54a'; fctx.strokeStyle = '#7a4a06'; fctx.lineWidth = 2; fctx.beginPath(); fctx.ellipse(q.x, q.y, 9 * Math.abs(Math.cos(q.y / 20)) + 2, 9, 0, 0, 7); fctx.fill(); fctx.stroke(); }
        else { fctx.fillStyle = q.c || 'rgba(230,250,255,.9)'; fctx.beginPath(); fctx.arc(q.x, q.y, q.r || 5, 0, 7); fctx.fill(); } } fctx.globalAlpha = 1; }
    if (wave) { const wt = t - wave.t0, F = waveFront(wt);
      if (wt > WD2) { const dn = wave.done; wave = null; dn && dn(); } else {
        // vodní masa za hřebenem, odtéká doleva
        const cr = imgs.crest, ch = 640 + 20 * Math.sin(wt / 200), cw = ch * cr.width / cr.height, bob = 10 * Math.sin(wt / 160), E2 = F - cw * .55;
        fctx.save(); const drain = Math.max(0, (wt - 1500) / 900);
        fctx.beginPath(); fctx.moveTo(-10, 610);
        for (let x = -10; x <= E2; x += 20) { const behind = E2 - x, lvl = 230 + behind * .45 + drain * 520 + 18 * Math.sin(x / 55 + wt / 140); fctx.lineTo(x, Math.min(610, lvl)); }
        fctx.lineTo(E2, 610); fctx.closePath();
        const wg = fctx.createLinearGradient(0, 0, 0, 600); wg.addColorStop(0, 'rgba(40,130,175,.42)'); wg.addColorStop(1, 'rgba(10,45,90,.55)'); fctx.fillStyle = wg; fctx.fill();
        fctx.strokeStyle = 'rgba(235,250,255,.85)'; fctx.lineWidth = 5; fctx.stroke(); fctx.restore();
        // sprite hřebene vlny, pravý okraj = čelo
        { const n2 = 40, sW = cr.width / n2, dW = cw / n2, x0 = F - cw + 40, y0 = 600 - ch + 70 + bob;
          for (let i = 0; i < n2; i++) { const k2 = i / n2, dy2 = Math.sin(i * .45 - wt / 110) * 32 * (.3 + k2) + Math.sin(i * .17 + wt / 240) * 18, sxk = 1 + .09 * Math.sin(wt / 140 + i * .3);
            fctx.globalAlpha = Math.min(1, .45 + k2 * .9); fctx.drawImage(cr, i * sW, 0, sW + 1, cr.height, x0 + i * dW, y0 + dy2 - ch * (sxk - 1), dW + .8, ch * sxk); } fctx.globalAlpha = 1;
          for (let i = 0; i < 6; i++) wave.p.push({ x: F - 40 - Math.random() * cw * .5, y: 600 - ch + 120 + bob + Math.random() * 120, vx: 2 + Math.random() * 6, vy: -3 - Math.random() * 5, l: 1, r: 4 + Math.random() * 7, foam: 1 }); }
        // loď na hřebeni: houpání, náklon, pružení, deformace pruhů pro vlání plachet
        const sh = imgs.ship2, H = 400, Wd = H * sh.width / sh.height, sx = F - cw * .5, syy = 40 + 16 * Math.sin(wt / 170) + bob, rot = .09 * Math.sin(wt / 230) - .05, sq = 1 + .03 * Math.sin(wt / 120);
        fctx.save(); fctx.translate(sx, syy + H * .75); fctx.rotate(rot); fctx.scale(-1 / sq, sq);
        const n = 24, swS = sh.width / n, swD = Wd / n;
        for (let i = 0; i < n; i++) { const off = Math.sin(i * .55 + wt / 90) * 4; fctx.drawImage(sh, i * swS, 0, swS + 1, sh.height * .62, -Wd / 2 + i * swD, -H * .75 + off, swD + .6, H * .62);
          fctx.drawImage(sh, i * swS, sh.height * .62, swS + 1, sh.height * .38, -Wd / 2 + i * swD, -H * .75 + H * .62, swD + .6, H * .38); }
        fctx.restore();
        if (!wave.salvo) wave.salvo = []; if ((wt > 700 && !wave.cannon) || (wt > 1500 && wave.cannon === 1)) { wave.cannon = (wave.cannon || 0) + 1; Sound.play('cannon'); shake(4, 200); fireCannon(wave.salvo, sx + Wd * .42, syy + H * .55, 1, null, true); }
        drawSalvo(fctx, wave.salvo, performance.now(), 1);
        if (false) { const cx = sx + 120, cy = syy + H * .45, ft = wt - 900; if (ft < 160) { const g = fctx.createRadialGradient(cx, cy, 2, cx, cy, 70); g.addColorStop(0, '#fff6c0'); g.addColorStop(.4, 'rgba(255,140,20,.9)'); g.addColorStop(1, 'rgba(255,60,0,0)'); fctx.fillStyle = g; fctx.fillRect(cx - 80, cy - 80, 160, 160); }
          if (ft < 300) for (let i = 0; i < 3; i++) wave.smoke = (wave.smoke || []).concat({ x: cx, y: cy, vx: 3 + Math.random() * 5, vy: -1 - Math.random() * 2, l: 1, s: 15 + Math.random() * 20 }); }
        for (const q of (wave.smoke || [])) { q.x += q.vx; q.y += q.vy; q.vx *= .97; q.l -= .012; if (q.l > 0) { fctx.fillStyle = `rgba(170,165,160,${q.l * .45})`; fctx.beginPath(); fctx.arc(q.x, q.y, q.s * (2 - q.l), 0, 7); fctx.fill(); } }
        // sprška a cákance
        for (let i = 0; i < 5; i++) wave.p.push({ x: F - 60 - Math.random() * 120, y: 120 + Math.random() * 260, vx: 5 + Math.random() * 8, vy: -5 - Math.random() * 8, l: 1, r: 2 + Math.random() * 5 });
        wave.drops = wave.drops.filter(q => (q.l -= .006) > 0); for (const q of wave.drops) { q.y += q.v; q.v = Math.min(3, q.v + .02); fctx.strokeStyle = `rgba(220,245,255,${q.l * .35})`; fctx.lineWidth = q.r * .6; fctx.beginPath(); fctx.moveTo(q.x, q.y - 40 * q.l); fctx.lineTo(q.x, q.y); fctx.stroke();
          const dg = fctx.createRadialGradient(q.x - q.r * .3, q.y - q.r * .3, 1, q.x, q.y, q.r); dg.addColorStop(0, `rgba(255,255,255,${q.l})`); dg.addColorStop(1, `rgba(150,210,240,${q.l * .3})`); fctx.fillStyle = dg; fctx.beginPath(); fctx.arc(q.x, q.y, q.r, 0, 7); fctx.fill(); }
        wave.p = wave.p.filter(q => (q.l -= .022) > 0); for (const q of wave.p) { q.x += q.vx; q.y += q.vy; q.vy += .4; const rr = q.r * (1.6 - q.l * .6) * 1.6; fctx.globalAlpha = q.l * .85; fctx.drawImage(FOAM, q.x - rr, q.y - rr, rr * 2, rr * 2); } fctx.globalAlpha = 1;
      } }
    if (shipFx) { const k = (t - shipFx.t0) / shipFx.dur; if (k >= 1) { shipFx.done && shipFx.done(); shipFx = null; } else {
        const im = imgs.ship, h = 520, w = h * im.width / im.height, x = shipFx.noShip ? 300 : -w + (1000 + w) * k, y = 600 - h + 40 + 18 * Math.sin(t / 170);
        if (!shipFx.noShip) { fctx.fillStyle = `rgba(10,40,60,${Math.min(.55, Math.sin(k * Math.PI) * .7)})`; fctx.fillRect(0, 0, 1000, 600);
        fctx.save(); fctx.translate(x + w / 2, y + h * .7); fctx.rotate(.07 * Math.sin(t / 260)); fctx.scale(-1, 1); fctx.drawImage(im, -w / 2, -h * .7, w, h); fctx.restore(); }
        for (let i = 0; i < (shipFx.noShip ? 4 : 9); i++) shipFx.p.push({ x: shipFx.noShip ? Math.random() * 1000 : x + w * (.1 + Math.random() * .5), y: 600 - Math.random() * 200, vx: 4 + Math.random() * 6, vy: -6 - Math.random() * 8, l: 1 });
        shipFx.p = shipFx.p.filter(q => (q.l -= .025) > 0); for (const q of shipFx.p) { q.x += q.vx; q.y += q.vy; q.vy += .35; fctx.fillStyle = `rgba(230,250,255,${q.l * .8})`; fctx.beginPath(); fctx.arc(q.x, q.y, 3 + 5 * q.l, 0, 7); fctx.fill(); } } }
    if (kraken) { if (bigOn) fctx.save(), fctx.globalAlpha = 0; drawKraken(t); if (bigOn) fctx.restore(); }
    if (krakenFx) { const k = (t - krakenFx.t0) / 1100; if (k >= 1) krakenFx = null; else { const im = imgs.kraken, h = 260, w = h * im.width / im.height;
        fctx.save(); fctx.translate(-150 + 1300 * k, 300 + 120 * Math.sin(k * Math.PI * 3)); fctx.rotate(Math.PI / 2 + .4 * Math.sin(t / 120)); fctx.drawImage(im, -w / 2, -h / 2 * 2.2, w * 1.2, h * 2.2); fctx.restore(); } }
    if (!bigOn && pulse && pulse.scat) for (const [r, y] of pulse.scat) { fctx.strokeStyle = '#18ffff'; fctx.shadowColor = '#18ffff'; fctx.shadowBlur = 20 + 10 * Math.sin(t / 100); fctx.lineWidth = 7; fctx.strokeRect(r * CW + 8, y * CH + 8, CW - 16, CH - 16); fctx.shadowBlur = 0; }
    cctx.clearRect(0, 0, 1335, 246); coins = coins.filter(c => c.y < 280); for (const c of coins) { c.vy += .45; c.x += c.vx; c.y += c.vy; c.a += c.va;
      cctx.save(); cctx.translate(c.x, c.y); cctx.scale(Math.abs(Math.cos(c.a)) + .1, 1); const g = cctx.createRadialGradient(-5, -5, 2, 0, 0, 18); g.addColorStop(0, '#fff6b0'); g.addColorStop(.6, '#f5c542'); g.addColorStop(1, '#8a5a0b');
      cctx.fillStyle = g; cctx.beginPath(); cctx.arc(0, 0, 18, 0, 7); cctx.fill(); cctx.strokeStyle = '#6b4006'; cctx.lineWidth = 3; cctx.stroke(); cctx.restore(); }
  }
  function burstCoins(n) { const xs = (pulse && pulse.cells.size ? [...pulse.cells].map(c => Math.floor(c / 3)) : [0, 1, 2, 3, 4]); for (let i = 0; i < n; i++) coins.push({ x: 218 + (xs[i % xs.length] * 200 + 100 + (Math.random() - .5) * 120) * 0.899, y: -10, vx: (Math.random() - .5) * 6, vy: Math.random() * 3, a: Math.random() * 6, va: .2 + Math.random() * .3 }); }
  // ---- točení ----
  function animateReels(stops) {
    return new Promise(done => {
      const T0 = performance.now(), baseT = turbo ? 400 : 750, stag = turbo ? 80 : 200, V = turbo ? .05 : .034, DEC = turbo ? 180 : 260;
      const R = [0, 1, 2, 3, 4].map(r => ({ r, s0: pos[r], p: pos[r], v: 0, stopAt: baseT + stag * r, dec: null, spring: null, done: false, slow: false, decDur: DEC }));
      spinState = { R, T0, slam: false }; let last = T0; anticip = -1; Sound.ready && Sound.sfxOn && Sound.s.spinStart();
      const scat = () => { let n = 0; R.forEach(q => { if (q.spring || q.done) for (let y = 0; y < 3; y++) if (E.strips[q.r][(stops[q.r] + y) % E.strips[q.r].length] === E.SCAT) n++; }); return n; };
      function step(now) {
        const t = now - T0, dt = Math.min(50, now - last); last = now; let fin = 0;
        if (spinState.slam && !spinState.slamDone) { spinState.slamDone = true; anticip = -1; let k = 0; R.forEach(q => { if (!q.dec && !q.spring && !q.done) { q.stopAt = t + 40 * k + 120; q.decDur = 120; q.slow = false; k++; } }); }
        for (const q of R) { const r = q.r, L = E.strips[r].length;
          if (q.done) { fin++; continue; }
          const ts = t - r * 50;
          if (ts < 0) continue;
          if (q.spring) { const u = Math.min(1, (t - q.spring.t0) / 180); pos[r] = q.spring.T - .11 + .11 * easeOutBack(u, 1.8); if (u >= 1) { pos[r] = stops[r]; q.done = true; } continue; }
          if (q.dec) { const u = Math.min(1, (t - q.dec.t0) / q.dec.dur); pos[r] = q.dec.from + (q.dec.to - q.dec.from) * easeOutQuad(u); blur[r] = (1 - u) * q.dec.dur > 120 ? 1 : 0;
            if (u >= 1) { blur[r] = 0; q.spring = { t0: t, T: q.dec.T }; squash[r] = now; shake(2, 80); Sound.play('thunk');
              if ([0, 1, 2].some(y => E.strips[r][(stops[r] + y) % L] === E.SCAT)) Sound.play('scatter');
              const n = scat(), nxt = R.filter(z => !z.dec && !z.spring && !z.done);
              if (!spinState.slam && n >= 2 && nxt.length) { nxt.forEach((z, i) => { z.stopAt = Math.max(z.stopAt, t + 1200 * (i + 1)); z.slow = true; }); anticip = nxt[0].r; Sound.play('antic'); }
              else if (anticip >= 0) { anticip = nxt.length && n >= 2 ? nxt[0].r : -1; if (anticip >= 0) Sound.play('antic'); }
            } continue; }
          let v;
          if (ts < 120) { pos[r] = q.s0 + .09 * easeOutQuad(ts / 120); q.p = pos[r]; blur[r] = 0; continue; }
          if (ts < 270) v = V * easeInQuad((ts - 120) / 150); else v = q.slow ? V * .4 : V;
          q.p -= v * dt; pos[r] = q.p; blur[r] = v > V * .3 ? 1 : 0;
          if (t >= q.stopAt - q.decDur) { const need = Math.max(.5, v * q.decDur / 2); const m = Math.ceil((stops[r] - (q.p - need)) / L); const T = stops[r] - m * L; q.dec = { from: q.p, to: T - .11, T, t0: t, dur: q.decDur }; }
        }
        if (fin === 5) { anticip = -1; spinState = null; Sound.s && Sound.s.spinStop(); done(); } else requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }
  function jpUi() { JP.tiers.forEach((t, i) => { const el = $('jp' + i); if (el) el.textContent = fmt(pools[i]); }); localStorage.setItem('pp_pools', JSON.stringify(pools)); }
  function ui() { jpUi();
    $('balance').textContent = fmt(S.balance); $('bet').textContent = fmt(bet());
    $('fsBar').classList.toggle('hidden', !S.inFs); $('fsLeft').textContent = S.fsLeft; $('fsMult').textContent = 'x' + S.fsMult;
    const lock = S.spinning; $('spin').disabled = lock && !S.auto; $('betMinus').disabled = $('betPlus').disabled = lock || S.inFs; $('info').disabled = lock; $('auto').disabled = lock && !S.auto;
  }
  function msg(t, hot) { $('msg').innerHTML = t; $('msg').classList.toggle('hot', !!hot); }
  async function countUp(el, to, ms) { const t0 = performance.now(); let lastTxt = ''; return new Promise(res => { (function f(n) { const k = Math.min(1, (n - t0) / ms), s = fmt(to * easeOutCubic(k)); if (s !== lastTxt) { lastTxt = s; if (Math.random() < .35) Sound.play('tick'); } el.textContent = s;
      if (k < 1) requestAnimationFrame(f); else { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); res(); } })(t0); }); }
  let bannerSkip = null;
  async function banner(html, ms = 2200) { const b = $('banner'); b.innerHTML = html; b.classList.remove('hidden', 'fade'); await new Promise(r => { const to = setTimeout(r, ms); bannerSkip = () => { clearTimeout(to); r(); }; });
    bannerSkip = null; b.classList.add('fade'); await sleep(300); b.classList.add('hidden'); b.classList.remove('fade'); }
  // ---- stupňovaná velká výhra: VELKÁ 10× / MEGA 25× / EPICKÁ 50× ----
  let bwSkip = null, showerRate = 0; const shower = []; const shC = $('shower'), shX = shC.getContext('2d');
  (function shLoop(n) { const dt = Math.min(50, n - (shLoop.l || n)) / 1000; shLoop.l = n; shX.clearRect(0, 0, 1335, 1030);
    let k = showerRate * dt; while (k > 0) { if (Math.random() < k) shower.push({ x: Math.random() * 1335, y: -40, vx: (Math.random() - .5) * 120, vy: 100 + Math.random() * 200, a: Math.random() * 6, va: 5 + Math.random() * 9, s: [8, 12, 16, 22, 32][Math.random() * 5 | 0] + Math.random() * 4 }); k -= 1; }
    for (let i = shower.length - 1; i >= 0; i--) { const c = shower[i]; c.vy += 900 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.a += c.va * dt; if (c.y > 1080) { shower.splice(i, 1); continue; }
      drawCoin(shX, c.x, c.y, c.s, c.a, c.s > 26); }
    if (jpScene) drawJp(n, dt); if (storm) drawStorm(n);
    requestAnimationFrame(shLoop); })(performance.now());
  // ---- Scéna jackpotu (souřadnice automatu 1335x1030; střed okna válců 667,515) ----
  var JPT_ = 0; const JPT = ['MINI', 'MINOR', 'MAJOR', 'GRAND'], LANT = [[212, 100], [416, 92], [669, 60], [913, 92], [1125, 100]], JX = 667, JY = 575;
  const jpTxt = document.createElement('canvas'); jpTxt.width = 1100; jpTxt.height = 200; const jtx = jpTxt.getContext('2d');
  function gold3D(c, text, x, y, size, shineT) { c.save(); c.font = `400 ${size}px "Pirata One"`; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let i = 10; i > 0; i--) { c.fillStyle = i > 7 ? '#1a0a02' : `rgb(${90 + i * 6},${50 + i * 3},8)`; c.fillText(text, x, y + i); }
    c.lineWidth = 6; c.strokeStyle = '#3a1a02'; c.strokeText(text, x, y); const gr = c.createLinearGradient(0, y - size / 2, 0, y + size / 2); gr.addColorStop(0, '#fffbe0'); gr.addColorStop(.35, '#ffd54a'); gr.addColorStop(.55, '#a8680c'); gr.addColorStop(.75, '#f7c948'); gr.addColorStop(1, '#fff1a8');
    c.fillStyle = gr; c.fillText(text, x, y); c.restore();
    // lesklý odlesk přes pomocné plátno
    jtx.clearRect(0, 0, 1100, 200); jtx.font = `400 ${size}px "Pirata One"`; jtx.textAlign = 'center'; jtx.textBaseline = 'middle'; jtx.fillStyle = '#000'; jtx.fillText(text, 550, 100); jtx.globalCompositeOperation = 'source-in';
    const sx = ((shineT % 1600) / 1600) * 1500 - 200, sg = jtx.createLinearGradient(sx - 80, 0, sx + 80, 200); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(.5, 'rgba(255,255,255,.9)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    jtx.fillStyle = sg; jtx.fillRect(0, 0, 1100, 200); jtx.globalCompositeOperation = 'source-over'; c.drawImage(jpTxt, x - 550, y - 100); }
  function drawJp(n, dt) { const J = jpScene, t = n - J.t0, c = shX, im = imgs.truhla, W = im.width, H = im.height;
    // 1) lucerny zhasnou zleva doprava, pak 3× zablikají
    for (let i = 0; i < 5; i++) { const [lx, ly] = LANT[i], off = t > 150 * i && t < 900 + 150 * 5, strobe = t >= 1650 && t < 2250 && Math.floor((t - 1650) / 100) % 2 === 0, lit = J.phase >= 2;
      if (off && !strobe) { const g = c.createRadialGradient(lx, ly, 5, lx, ly, 70); g.addColorStop(0, 'rgba(0,0,0,.9)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(lx - 70, ly - 70, 140, 140); }
      if (strobe || lit) { const g = c.createRadialGradient(lx, ly, 5, lx, ly, strobe ? 120 : 80); g.addColorStop(0, strobe ? 'rgba(255,255,230,.95)' : 'rgba(255,220,120,.6)'); g.addColorStop(1, 'rgba(255,200,80,0)'); c.fillStyle = g; c.fillRect(lx - 120, ly - 120, 240, 240); } }
    if (J.merge && t < 1000) { if (!J.evm) { J.evm = 1; ev('merge'); } const u = Math.max(0, Math.min(1, t / 650)), e = u < .5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2;
      for (const [mx, my] of J.merge) { const x = mx + (JX - mx) * e, y = my + (JY - my) * e; for (let k3 = 1; k3 <= 4; k3++) { const e2 = Math.max(0, e - k3 * .06), x2 = mx + (JX - mx) * e2, y2 = my + (JY - my) * e2; c.globalAlpha = .18; c.drawImage(im, x2 - 80, y2 - 80, 160, 160); } c.globalAlpha = 1; c.save(); c.shadowColor = '#ffcc33'; c.shadowBlur = 40; c.drawImage(im, x - 85, y - 85, 170, 170); c.restore(); if (Math.random() < .8) J.p.push({ x, y, vx: (Math.random() - .5) * 4, vy: (Math.random() - .5) * 4, g: 0, s: 6, l: 1, d: .04, conf: '#ffe680', a: 0 }); }
      if (t > 650) { const f = Math.max(0, 1 - (t - 650) / 350), fg = c.createRadialGradient(JX, JY, 5, JX, JY, 420); fg.addColorStop(0, `rgba(255,255,230,${f})`); fg.addColorStop(1, 'rgba(255,220,120,0)'); c.fillStyle = fg; c.fillRect(0, 0, 1335, 1030); if (!J.mflash) { J.mflash = 1; Sound.play('treasure'); } } }
    const cs = J.phase >= 2 ? 1 : Math.min(1, Math.max(0, (t - 750) / 500)); if (t < 750) return; const sc = .2 + .8 * easeOutBack(cs, 2.4), shk = t > 1300 && t < 1900 ? Math.sin((t - 1300) / 100 * Math.PI) * .09 : 0, S0 = 290 * sc, top = .46;
    // paprsky světla + gejzír pokladu (fáze 2)
    const ot = J.phase >= 2 ? n - J.t2 : -1;
    if (ot >= 0) { c.save(); c.translate(JX, JY - 40); c.rotate(n / 10000 * Math.PI * 2); for (let i = 0; i < 12; i++) { c.rotate(Math.PI / 6); const rg = c.createLinearGradient(0, 0, 0, -620); rg.addColorStop(0, `rgba(255,220,120,${Math.min(.45, ot / 800)})`); rg.addColorStop(1, 'rgba(255,200,60,0)'); c.fillStyle = rg; c.beginPath(); c.moveTo(0, 0); c.lineTo(-70, -620); c.lineTo(70, -620); c.closePath(); c.fill(); } c.restore();
      if (J.grand) { const si = imgs.ship, sh = 240, sw = sh * si.width / si.height, sx = -sw + (1335 + sw) * Math.min(1, ot / 7000); c.save(); c.globalAlpha = .4; c.translate(sx + sw / 2, 520 + 10 * Math.sin(n / 300)); c.rotate(.04 * Math.sin(n / 400)); c.scale(-1, 1); c.drawImage(si, -sw / 2, -sh / 2, sw, sh); c.restore();
        if (ot - J.lastCannon > 800) { J.lastCannon = ot; Sound.play('cannon'); shakeStage(2, 120); const yy = 520 + Math.random() * 220; fireCannon(J.salvo, 150, yy, 1, [330, 1005]); fireCannon(J.salvo, 1185, yy - 40, -1, [330, 1005]); }
        for (let i = 0; i < 4; i++) J.p.push({ x: Math.random() * 1335, y: -20, vx: (Math.random() - .5) * 2, vy: 2 + Math.random() * 3, g: .05, s: 6 + Math.random() * 6, l: 1, d: .004, conf: `hsl(${Math.random() * 360},90%,60%)`, a: Math.random() * 6 }); } }
    c.save(); c.translate(JX, JY + S0 / 2); c.rotate(shk); c.translate(0, -S0 / 2);
    c.shadowColor = 'rgba(0,0,0,.8)'; c.shadowBlur = 30; c.shadowOffsetY = 14;
    if (ot >= 0) { const g = c.createRadialGradient(0, -20, 10, 0, -20, 260); g.addColorStop(0, 'rgba(255,240,170,.9)'); g.addColorStop(1, 'rgba(255,200,60,0)'); c.fillStyle = g; c.fillRect(-260, -280, 520, 520); }
    c.drawImage(im, 0, H * top, W, H * (1 - top), -S0 / 2, -S0 / 2 + S0 * top, S0, S0 * (1 - top));
    if (ot < 0) c.drawImage(im, 0, 0, W, H * top, -S0 / 2, -S0 / 2, S0, S0 * top);
    else { const u = Math.min(1, ot / 700); c.save(); c.translate(0, -S0 / 2 + S0 * top - 900 * easeOutQuad(u)); c.rotate(-2.5 * u); c.globalAlpha = 1 - u; c.drawImage(im, 0, 0, W, H * top, -S0 / 2, -S0 * top, S0, S0 * top); c.restore(); }
    c.restore();
    if (ot >= 0) { // záblesky + gejzír
      if (ot < 400 && Math.floor(ot / 80) % 2 === 0) { c.fillStyle = 'rgba(255,240,180,.35)'; c.fillRect(0, 0, 1335, 1030); }
      if (!J.burst) { J.burst = 1; for (let i = 0; i < 170; i++) J.p.push(geyserP()); } if (ot < 3000) for (let i = 0; i < 3; i++) J.p.push(geyserP()); }
    // částice
    const k = dt * 60; drawSalvo(c, J.salvo, n, k); for (let i = J.p.length - 1; i >= 0; i--) { const q = J.p[i]; q.vy += q.g * k; q.x += q.vx * k; q.y += q.vy * k; q.l -= q.d * k; if (q.a !== undefined) q.a += (q.va || .15) * k;
      if (q.coin && q.vy > 0 && q.y > 800 && !q.b) { q.b = 1; q.vy *= -.45; q.vx *= .7; }
      if (q.l <= 0 || q.y > 1100) { J.p.splice(i, 1); continue; } c.save(); c.globalAlpha = Math.min(1, q.l * 1.4);
      if (q.smoke) { c.fillStyle = 'rgba(160,150,140,.35)'; c.beginPath(); c.arc(q.x, q.y, q.s * (2 - q.l), 0, 7); c.fill(); }
      else if (q.fire) { const g = c.createRadialGradient(q.x, q.y, 2, q.x, q.y, q.s * 1.5); g.addColorStop(0, '#fff6c0'); g.addColorStop(.4, 'rgba(255,140,20,.9)'); g.addColorStop(1, 'rgba(255,60,0,0)'); c.fillStyle = g; c.fillRect(q.x - 100, q.y - 100, 200, 200); }
      else if (q.conf) { c.translate(q.x, q.y); c.rotate(q.a); c.fillStyle = q.conf; c.fillRect(-q.s / 2, -q.s / 4, q.s, q.s / 2); }
      else { c.translate(q.x, q.y); if (q.s > 20) { c.globalAlpha *= .9; c.fillStyle = 'rgba(255,210,90,.25)'; c.beginPath(); c.arc(0, 0, q.s * 1.25, 0, 7); c.fill(); } if (q.gem) { c.rotate(q.a || 0); c.fillStyle = q.gem; c.beginPath(); c.moveTo(0, -q.s); c.lineTo(q.s * .7, 0); c.lineTo(0, q.s); c.lineTo(-q.s * .7, 0); c.closePath(); c.fill(); c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(-q.s * .2, -q.s * .5, q.s * .25, q.s * .3); }
        else { c.setTransform(1, 0, 0, 1, 0, 0); drawCoin(c, q.x, q.y, q.s, q.a, q.s > 24); } }
      c.restore(); }
    // titulek + částka
    if (J.phase >= 3) { const tt = Math.max(0, n - J.t3), u = Math.min(1, tt / 2600), v = J.skip ? 1 : u; const amt = Math.max(0, (J.amt || 0) * easeOutCubic(Math.max(0, v))); if (v >= 1 && !J.punch) { J.punch = n; shakeStage(4, 250); Sound.play('bigWin'); }
      const ps = J.punch ? 1 + .2 * Math.max(0, 1 - (n - J.punch) / 250) : 1, ts = Math.min(1, tt / 350);
      c.save(); c.translate(JX, 315); c.scale(easeOutBack(ts, 2), easeOutBack(ts, 2)); gold3D(c, 'JACKPOT ' + JPT[J.tier], 0, 0, 120, tt); c.restore();
      c.save(); c.translate(JX, 805); c.scale(ps, ps); c.font = '500 135px Oswald'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 12; c.strokeStyle = '#2a1405'; c.strokeText(fmt(amt), 0, 0);
      const ag = c.createLinearGradient(0, -75, 0, 75); ag.addColorStop(0, '#fffbe0'); ag.addColorStop(.5, '#ffd54a'); ag.addColorStop(1, '#d18a10'); c.fillStyle = ag; c.shadowColor = '#ffb300'; c.shadowBlur = 30; c.fillText(fmt(amt), 0, 0); c.restore(); }
    if (J.fly) { const u = Math.min(1, (n - J.fly) / 600); for (let i = 0; i < 30; i++) { const d = Math.min(1, Math.max(0, u * 1.4 - i / 70)), e = easeInOutQuad(d), x = JX + (840 - JX) * e + Math.sin(i * 2.3) * 160 * (1 - e) * e * 4, y = 805 + (838 - 805) * e - 260 * Math.sin(e * Math.PI);
        if (d < 1) { c.fillStyle = '#ffd54a'; c.strokeStyle = '#7a4a06'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 14, 0, 7); c.fill(); c.stroke(); } } }
  }
  // ---- dělová salva: záblesk z hlavně (5 procedurálních snímků), jiskry, živý kouř ----
  function fireCannon(L, x, y, dir, lim, light) { const n = performance.now(); L.push({ k: 'fl', x, y, dir, t0: n });
    ev('cannon'); for (let i = 0; i < 36; i++) { const a = (dir > 0 ? 0 : Math.PI) + (Math.random() - .5) * 1.3, v = 8 + Math.random() * 14; L.push({ k: 'sp', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, t0: n, life: 500 + Math.random() * 600 }); }
    if (light) { for (let i = 0; i < 28; i++) L.push({ k: 'sm', lt: 1, x: x + dir * Math.random() * 60, y: y + (Math.random() - .5) * 24, vx: dir * (2 + Math.random() * 4), vy: -1.5 - Math.random() * 2.5, r0: 6 + Math.random() * 9, rot: Math.random() * 6, vr: (Math.random() - .5) * .12, t0: n + i * 12, life: 450 + Math.random() * 350 }); return; }
    for (let i = 0; i < 16; i++) L.push({ k: 'sm', x: x + dir * (10 + Math.random() * 50), y: y + (Math.random() - .5) * 30, vx: dir * (1 + Math.random() * 3), vy: -1 - Math.random() * 1.6, r0: 18 + Math.random() * 16, rot: Math.random() * 6, vr: (Math.random() - .5) * .08, t0: n + i * 25, life: 1500 + Math.random() * 500, lim }); }
  function drawSalvo(c, L, n, k) {
    for (let i = L.length - 1; i >= 0; i--) { const q = L[i], a = n - q.t0; if (a < 0) continue;
      if (q.k === 'fl') { if (a > 350) { L.splice(i, 1); continue; } const f = Math.min(4, a / 70 | 0), R = [110, 170, 140, 95, 55][f], sp = [10, 12, 9, 8, 7][f];
        c.save(); c.translate(q.x, q.y); c.scale(q.dir, 1); const gr = c.createRadialGradient(0, 0, 2, 0, 0, R * 1.3); gr.addColorStop(0, '#fffbe6'); gr.addColorStop(.35, 'rgba(255,190,60,.95)'); gr.addColorStop(.7, 'rgba(255,90,10,.6)'); gr.addColorStop(1, 'rgba(255,40,0,0)');
        c.fillStyle = gr; c.beginPath(); for (let j = 0; j <= sp * 2; j++) { const an = -Math.PI / 2.4 + (j / (sp * 2)) * Math.PI / 1.2, rr = (j % 2 ? .35 : 1) * R * (1 + .3 * Math.sin(j * 7.1 + f)); c.lineTo(Math.cos(an) * rr * 1.6, Math.sin(an) * rr * .8); } c.closePath(); c.fill(); c.restore(); continue; }
      if (q.k === 'sp') { if (a > q.life) { L.splice(i, 1); continue; } q.x += q.vx * k; q.y += q.vy * k; q.vy += .25 * k; const l = 1 - a / q.life; c.strokeStyle = `rgba(255,${200 + 55 * l | 0},120,${l})`; c.lineWidth = 4; c.beginPath(); c.moveTo(q.x, q.y); c.lineTo(q.x - q.vx * 3, q.y - q.vy * 3); c.stroke(); continue; }
      if (q.k === 'sm') { if (a > q.life) { L.splice(i, 1); continue; } const u = a / q.life; q.x += q.vx * k; q.y += q.vy * k; q.vx *= Math.pow(.985, k); q.rot += q.vr * k;
        if (q.lim) q.x = q.x < 667 ? Math.min(q.x, q.lim[0]) : Math.max(q.x, q.lim[1]); const r = q.r0 * (1 + 3 * u), al = (u < .08 ? u / .08 : 1 - u) * (q.lt ? .7 : .8); if (q.lt) { q.vy -= .03 * k; q.vx *= Math.pow(.97, k); }
        c.save(); c.translate(q.x, q.y); c.rotate(q.rot); for (const [ox, oy, s] of [[0, 0, 1], [r * .45, -r * .2, .7], [-r * .4, r * .15, .75]]) { const sg = c.createRadialGradient(ox, oy, 1, ox, oy, r * s); sg.addColorStop(0, q.lt ? `rgba(235,232,225,${al})` : `rgba(150,145,138,${al * .8})`); sg.addColorStop(.6, q.lt ? `rgba(200,198,192,${al * .35})` : `rgba(110,104,98,${al * .5})`); sg.addColorStop(1, 'rgba(120,115,110,0)'); c.fillStyle = sg; c.beginPath(); c.arc(ox, oy, r * s, 0, 7); c.fill(); }
        c.restore(); } } }
  // ---- předrenderované sprity mincí: 16 fází rotace, ostré + předem rozmazané (hloubka) ----
  const COIN = (() => { const S = 64, N = 16, mk = blur => { const c = document.createElement('canvas'); c.width = S * N; c.height = S; const x = c.getContext('2d'); if (blur) x.filter = 'blur(3px)';
      for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2, cs = Math.cos(a), sx = Math.abs(cs) * .9 + .1, r = S * .4; x.save(); x.translate(i * S + S / 2, S / 2);
        x.fillStyle = '#6a3f05'; x.beginPath(); x.ellipse(r * .14 * Math.sign(cs || 1), 0, r * sx + 1, r, 0, 0, 7); x.fill();
        const gr = x.createLinearGradient(-r, -r, r, r); gr.addColorStop(0, '#fffbd0'); gr.addColorStop(.4, '#f7c948'); gr.addColorStop(1, '#9a5c08'); x.fillStyle = gr; x.beginPath(); x.ellipse(0, 0, r * sx, r, 0, 0, 7); x.fill();
        x.strokeStyle = '#8a5408'; x.lineWidth = 3; x.beginPath(); x.ellipse(0, 0, r * sx * .7, r * .7, 0, 0, 7); x.stroke();
        x.fillStyle = `rgba(255,255,240,${.3 + .6 * Math.max(0, Math.sin(a + 1))})`; x.beginPath(); x.ellipse(-r * sx * .3, -r * .38, r * sx * .3, r * .2, -.5, 0, 7); x.fill(); x.restore(); } return c; };
    return { S, N, sharp: mk(false), soft: mk(true) }; })();
  function drawCoin(c, x, y, size, ang, near) { const f = ((Math.floor(((ang % 6.2832) + 6.2832) / 6.2832 * COIN.N)) % COIN.N), d = size * 2.5; c.drawImage(near ? COIN.soft : COIN.sharp, f * COIN.S, 0, COIN.S, COIN.S, x - d / 2, y - d / 2, d, d); }
  function geyserP() { const r = Math.random(), s = r < .18 ? 28 + Math.random() * 14 : r < .5 ? 14 + Math.random() * 8 : 5 + Math.random() * 6, gem = Math.random() < .25 ? ['#e53935', '#43a047', '#1e88e5', '#8e24aa', '#00e5ff'][Math.random() * 5 | 0] : null;
    return { x: JX + (Math.random() - .5) * 120, y: JY - 40, vx: (Math.random() - .5) * 16, vy: -14 - Math.random() * 16, g: .45, s, l: 1, d: .004, coin: !gem, gem, a: Math.random() * 6, va: .08 + Math.random() * .25 }; }
  function shakeStage(a, d) { const st = $('stage'), t0 = performance.now(); (function f(n) { const k = n - t0; st.style.transform = k < d ? `translate(${(Math.random() - .5) * 2 * a}px,${(Math.random() - .5) * 2 * a}px)` : ''; if (k < d) requestAnimationFrame(f); })(t0); }
  const jpWait = ms => new Promise(r => { if (jpScene && jpScene.skip) return r(); const to = setTimeout(r, ms); jpSkip = () => { clearTimeout(to); if (jpScene) jpScene.skip = true; r(); }; });
  async function jackpotScene(tier, amt, part) {
    if (part === 'intro') { Sound.s && Sound.s.duck && Sound.ready && Sound.s.duck(true); $('reels').classList.add('dim3'); jpScene = { t0: performance.now(), p: [], salvo: [], merge: jpMarks ? jpMarks.map(m => [218 + (m.r * 200 + 100) * .899, 246 + (m.y * 200 + 100) * .899]) : null, phase: 1, tier, grand: tier === 3, lastCannon: -9999 }; jpMarks = null; Sound.play('thunk'); await jpWait(2300); jpScene.skip = false; return; }
    const J = jpScene; J.amt = amt; J.tier = tier; J.grand = tier === 3; J.phase = 2; J.t2 = performance.now(); Sound.play('treasure'); Sound.play('bigWin'); window.__jpCelebT0 = J.t2;
    await jpWait(900); J.phase = 3; J.t3 = performance.now(); await jpWait(J.grand ? 4200 : 3000); J.skip = true; if (!J.punch) { J.punch = performance.now(); shakeStage(4, 250); }
    await sleep(500); J.fly = performance.now(); Sound.play('coin'); await sleep(650); const w = $('win'); w.classList.remove('blink'); void w.offsetWidth; w.classList.add('blink');
    jpSkip = null; await sleep(400); jpScene = null; $('reels').classList.remove('dim3'); Sound.s && Sound.ready && Sound.s.duck && Sound.s.duck(false); }
  // ---- bouřkový úvod přílivové vlny ----
  function drawStorm(n) { const t = n - storm.t0; if (t > 3600) { storm = null; return; } const a = t < 400 ? t / 400 : t > 3000 ? 1 - (t - 3000) / 600 : 1;
    shX.fillStyle = `rgba(5,10,25,${.5 * a})`; shX.fillRect(0, 0, 1335, 1030); if (t > 250 && t < 370) { shX.fillStyle = 'rgba(255,255,255,.85)'; shX.fillRect(0, 0, 1335, 1030); } }
  async function bigWinSeq(win) {
    const b = bet(), tiers = [[10, 'VELKÁ VÝHRA!'], [25, 'MEGA VÝHRA!'], [50, 'EPICKÁ VÝHRA!']].filter(([m]) => win >= m * b);
    const segs = tiers.map(([m, n], i) => ({ to: i + 1 < tiers.length ? tiers[i + 1][0] * b : win, name: n, rate: 40 + 20 * i }));
    const ov = $('bigwin'), ttl = $('bwTitle'), amt = $('bwAmt'), fl = $('flash'); ov.classList.remove('hidden'); bigOn = true; ev('bigwin'); $('reels').classList.add('dimmed'); Sound.play('bigWin'); let skip = false; bwSkip = () => skip = true;
    let from = 0; window.__bigwinT0 = performance.now();
    for (const sg of segs) { ttl.textContent = sg.name; ttl.classList.remove('tpop'); void ttl.offsetWidth; ttl.classList.add('tpop'); fl.classList.remove('fl'); void fl.offsetWidth; fl.classList.add('fl'); showerRate = sg.rate; if (sg !== segs[0]) Sound.play('bigWin');
      const t0 = performance.now(); await new Promise(res => { (function f(n) { const u = skip ? 1 : Math.max(0, Math.min(1, (n - t0) / 1500)); amt.textContent = fmt(from + (sg.to - from) * easeOutQuad(u)); if (Math.random() < .3) Sound.play('coin'); u < 1 ? requestAnimationFrame(f) : res(); })(t0); });
      from = sg.to; if (skip) { ttl.textContent = segs[segs.length - 1].name; amt.textContent = fmt(win); break; } }
    showerRate = 80; await new Promise(r => { const to = setTimeout(r, skip ? 500 : 1100); bwSkip = () => { clearTimeout(to); r(); }; }); showerRate = 0; bwSkip = null; ov.classList.add('hidden'); bigOn = false; $('reels').classList.remove('dimmed');
  }

  async function doSpin(respin, preStops) {
    if (S.spinning) return; if (!respin && !S.inFs && S.balance < bet()) { msg('Málo kreditů!'); S.auto = false; setAuto(); return; }
    S.spinning = true; fxLines = []; fxActive = -1; pulse = null; wildOverlay = []; $('bigwin').classList.add('hidden');
    krakenCells = new Set(); krakenHide = new Set(); const base = !S.inFs && !respin;
    if (respin) { } else if (!S.inFs) { S.balance -= bet(); $('win').textContent = fmt(0); JP.tiers.forEach((t, i) => pools[i] += t.contribution * bet()); } else { S.fsLeft--; }
    ui(); msg(S.inFs ? `Volná otáčka x${S.fsMult}` : 'Hodně štěstí!');
    const rs = () => E.strips.map(s => Math.floor(Math.random() * s.length)), gridOf = st => st.map((v, r) => { const s = E.strips[r]; return [s[v], s[(v + 1) % s.length], s[(v + 2) % s.length]]; });
    const find = pred => { for (let i = 0; i < 200000; i++) { const st = rs(), ev = E.evaluate(gridOf(st)); if (pred(ev, gridOf(st))) return st; } return rs(); };
    let stops = window.__forceStops ? window.__forceStops.shift() : rs();
    if (!respin && !window.__forceStops) {
      if (window.__forceWave && !S.inFs) stops = find(ev => ev.total === 0 && !ev.freeSpins && !ev.bonus && !ev.wildReels.length);
      else if (window.__forceFS) { window.__forceFS = false; stops = find(ev => ev.freeSpins > 0); }
      else if (window.__forceBonus && !S.inFs) { window.__forceBonus = false; stops = find(ev => ev.bonus && !ev.freeSpins); }
    }
    if (preStops) stops = preStops; else if (respin && !window.__forceStops) { while (E.evaluate(gridOf(stops)).total <= 0) stops = rs(); } if (window.__forceStops && !window.__forceStops.length) window.__forceStops = null;
    // jackpot rozhoduje výsledek otáčky: zlaté truhly přistanou na válcích 1, 3 a 5
    const jpHit = base && (window.__forceJackpot || Math.random() < JP.triggerProbPerMinBet * bet() / JP.minBet); window.__forceJackpot = false;
    jpMarks = jpHit ? [0, 2, 4].map(r => ({ r, y: Math.floor(Math.random() * 3), stop: stops[r] })) : null;
    if (preStops) { stops.forEach((v, r) => pos[r] = v); } else await animateReels(stops);
    const g = stops.map((st, r) => { const s = E.strips[r]; return [s[st], s[(st + 1) % s.length], s[(st + 2) % s.length]]; });
    let kp = null;
    if (base && (window.__forceKraken || Math.random() < C.krakenAttack.probability)) { window.__forceKraken = false; kp = E.krakenPositions(g, Math.random);
      msg('ÚTOK KRAKENA!', true); Sound.play('wild'); await banner('ÚTOK KRAKENA!<small>Chapadla mění symboly na WILD</small>', 900);
      window.__krakenT0 = performance.now();
      await new Promise(res2 => { kraken = { t0: performance.now(), p: [], done: res2, T: kp.map(([r, y], i) => ({ r, y, id: E.ids[g[r][y]], s: i * 250, bx: r * CW + 100 + (Math.random() - .5) * 140, ph: Math.random() * 6, st: 0 })) }; });
      await sleep(200); }
    const res = E.evaluate(g, kp), mult = S.inFs ? S.fsMult : 1;
    if (res.wildReels.length) { wildOverlay = res.wildReels.slice(); wildOverlay.t0 = performance.now(); Sound.play('wild'); msg('KRAKEN WILD!'); shake(3, 100);
      for (const r of res.wildReels) for (let i = 0; i < 20; i++) parts.push({ x: r * CW + (i % 2 ? 8 : 192), y: 100 + Math.random() * 400, vx: (i % 2 ? -1 : 1) * (2 + Math.random() * 5), vy: -3 - Math.random() * 6, g: .35, l: 1, d: .025, r: 3 + Math.random() * 4, c: 'rgba(200,240,255,.9)' });
      await sleep(turbo ? 350 : 550); }
    let win = res.total * bet() * mult;
    fxLines = res.lineWins.map(w => ({ ...w, credits: w.pay * bet() * mult }));
    const cells = new Set(); res.lineWins.forEach(w => { for (let r = 0; r < w.count; r++) cells.add(r * 3 + C.paylines[w.line][r]); });
    pulse = { cells, scat: res.scatterCount >= 3 ? res.scatterPos : null };
    if (win > 0) {
      S.balance += win; if (S.inFs) S.fsTotal += win;
      const x = win / bet(); msg(`VÝHRA!${mult > 1 ? ` x${mult}` : ''}<br>${fmt(win)}`, true); winT0 = performance.now(); window.__winT0 = winT0;
      if (x >= 10) { await sleep(500); await bigWinSeq(win); }
      else if (win > 0) Sound.play('smallWin'), burstCoins(Math.min(30, 4 + x * 3));
      await countUp($('win'), win, Math.min(1500, 300 + 120 * Math.log2(1 + x))); ui();
      skipLines = false; for (let i = 0; i < fxLines.length && i < 6 && !skipLines; i++) { fxActive = i; lineT0 = performance.now(); const w = fxLines[i], Lp = C.paylines[w.line];
        floats.push({ s: fmt(w.credits), x: Math.min(860, (w.count - 1) * CW + 100), y: Math.max(52, Lp[w.count - 1] * CH + 2), t0: lineT0 }); msg(`Linie ${w.line + 1}<br>${fmt(w.credits)}`, true);
        await new Promise(r => { const to = setTimeout(r, S.auto || S.inFs ? 550 : 650); skipNow = () => { clearTimeout(to); skipLines = true; r(); }; }); }
      skipNow = null; fxActive = -1;
    } else if (!S.inFs) msg('Zkus to znovu!');
    if (S.inFs && res.total > 0) { S.fsMult += C.scatter.multiplierStep; ui(); msg(`Násobič<br>x${S.fsMult}`, true); await sleep(500); }
    if (res.bonus && !S.inFs) { Sound.play('fsStart'); await banner('VYKOPEJ POKLAD!<small>3 truhly – bonusová hra</small>', 1800); await pickBonus(); }
    if (res.freeSpins) {
      if (S.inFs) { S.fsLeft += C.scatter.retrigger; await banner(`+${C.scatter.retrigger} VOLNÝCH OTÁČEK!`); }
      else { Sound.play('fsStart'); S.inFs = true; S.fsLeft = res.freeSpins; S.fsMult = C.scatter.multiplierStart; S.fsTotal = 0; await banner(`${res.freeSpins} VOLNÝCH OTÁČEK!<small>Násobič roste s každou výhrou</small>`, 2400); }
    }
    if (jpHit) await jackpotGame();
    if (base && res.total === 0 && !res.freeSpins && !res.bonus && (window.__forceWave || Math.random() < C.tidalWave.probability)) { window.__forceWave = false;
      msg('PŘÍLIVOVÁ VLNA!', true); window.__waveT0 = performance.now();
      let ws; do { ws = E.strips.map(s => Math.floor(Math.random() * s.length)); } while (E.evaluate(ws.map((v, r) => { const s = E.strips[r]; return [s[v], s[(v + 1) % s.length], s[(v + 2) % s.length]]; })).total <= 0);
      const og = stops.map((v, r) => { const s = E.strips[r]; return [0, 1, 2].map(y => E.ids[s[(v + y) % s.length]]); }), ng = ws.map((v, r) => { const s = E.strips[r]; return [0, 1, 2].map(y => E.ids[s[(v + y) % s.length]]); });
      fxLines = []; pulse = null; wildOverlay = []; krakenCells = new Set();
      storm = { t0: performance.now() }; setTimeout(() => Sound.play('thunder'), 250); const rw = $('reelsWrap'), sw0 = performance.now(); await new Promise(r2 => (function f(n) { const k = (n - sw0) / 1000; rw.style.rotate = k < 1 ? (1.5 * Math.sin(k * Math.PI * 4) * (1 - k)) + 'deg' : ''; k < 1 ? requestAnimationFrame(f) : r2(); })(sw0));
      Sound.play('wave'); shake(5, 500); window.__waveT0 = performance.now();
      await new Promise(res2 => { ev('wave'); wave = { t0: performance.now(), og, ng, hit: [0, 0, 0, 0, 0], p: [], drops: [], land: {}, done: res2 }; });
      ws.forEach((v, r) => pos[r] = v); S.spinning = false; return doSpin(true, ws); }
    S.spinning = false; ui();
    if (S.inFs) { if (S.fsLeft > 0) { await sleep(500); return doSpin(); }
      S.inFs = false; ui(); burstCoins(40); await banner(`VOLNÉ OTÁČKY SKONČILY<small>Celkem vyhráno: ${fmt(S.fsTotal)}</small>`, 2600); $('win').textContent = fmt(S.fsTotal); }
    if (S.auto) { await sleep(400); if (S.auto && !S.spinning) doSpin(); }
  }
  // Jackpot: spouští se výhradně výsledkem válců (3 zlaté truhly na válcích 1, 3, 5), bez jakékoli volby hráče
  async function jackpotGame() {
    const tier = window.__forceJackpotTier != null ? window.__forceJackpotTier : E.jackpotTier(Math.random); window.__forceJackpotTier = null;
    const amt = pools[tier]; pools[tier] = JP.tiers[tier].seed * JP.minBet; S.balance += amt; ui(); $('win').textContent = fmt(0); msg(`JACKPOT ${JPT[tier]}<br>${fmt(amt)}`, true);
    await jackpotScene(tier, 0, 'intro'); await jackpotScene(tier, amt, 'celebrate'); $('win').textContent = fmt(amt); jpMarks = null;
  }
  function pickBonus() {
    return new Promise(done => {
      const board = E.pickBoard(Math.random), grid = $('pickGrid'); let total = 0, over = false;
      grid.innerHTML = ''; $('pickTotal').textContent = '0'; $('pickDone').classList.add('hidden'); $('pickModal').classList.remove('hidden');
      const reveal = (el, v, dim) => { el.classList.add('open'); if (dim) el.classList.add('dim'); el.innerHTML = v === 0 ? '<img src="' + imgs.lebka.src + '"><span>LEBKA</span>' : '<img src="' + imgs.poklad.src + '"><span>' + fmt(v * bet()) + '</span>'; };
      board.forEach((v, i) => { const d = document.createElement('div'); d.className = 'spot'; d.textContent = '✕';
        d.onclick = () => { if (over || d.classList.contains('open')) return; reveal(d, v); Sound.play(v === 0 ? 'skull' : 'treasure');
          if (v === 0) { over = true; [...grid.children].forEach((c, j) => { if (!c.classList.contains('open')) reveal(c, board[j], true); });
            S.balance += total; ui(); $('win').textContent = fmt(total); msg(`BONUS<br>${fmt(total)}`, true); $('pickDone').classList.remove('hidden'); burstCoins(30);
          } else { total += v * bet(); $('pickTotal').textContent = fmt(total); } };
        grid.appendChild(d); });
      $('pickDone').onclick = () => { $('pickModal').classList.add('hidden'); done(); };
    });
  }
  function setAuto() { $('auto').classList.toggle('on', S.auto); $('autoState').textContent = S.auto ? 'ZAP' : 'VYP'; ui(); }
  function buildInfo() {
    const pg = $('payGrid'); pg.innerHTML = '';
    for (const s of C.symbols) { const d = document.createElement('div'); d.className = 'pay';
      let rows = s.pays ? [5, 4, 3].map(n => `${n}× = ${fmt(s.pays[n] * bet() / C.paylines.length)}`).join('<br>') : s.id === 'wild' ? 'Nahrazuje vše kromě scatteru<br>Rozšiřuje se na celý válec<br>Jen válce 2–4' : [5, 4, 3].map(n => `${n}× = ${fmt(C.scatter.pays[n] * bet())}`).join('<br>') + '<br>3+ = 10 volných otáček';
      d.innerHTML = `<img src="${imgs[s.id].src}"><div class="nm">${s.name}</div>${rows}`; pg.appendChild(d); }
    const lc = $('linesCanvas'), l = lc.getContext('2d'); l.clearRect(0, 0, 900, 220);
    C.paylines.forEach((L, i) => { const ox = (i % 10) * 90 + 8, oy = Math.floor(i / 10) * 110 + 8; l.fillStyle = '#123a57'; l.fillRect(ox, oy, 75, 45);
      l.fillStyle = LINE_COLORS[i]; L.forEach((row, r) => l.fillRect(ox + r * 15 + 2, oy + row * 15 + 2, 11, 11));
      l.fillStyle = '#ffe9a8'; l.font = 'bold 14px sans-serif'; l.textAlign = 'center'; l.fillText('Linie ' + (i + 1), ox + 37, oy + 66); });
  }
  ['spin', 'auto', 'betMinus', 'betPlus', 'info', 'infoClose', 'pickDone', 'sndBtn', 'musBtn'].forEach(id => $(id).addEventListener('pointerdown', () => { Sound.unlock(); Sound.play('click'); }));
  const sndUi = () => { $('sndBtn').classList.toggle('off', !Sound.sfxOn); $('musBtn').classList.toggle('off', !Sound.musOn); }; sndUi();
  $('sndBtn').onclick = () => { Sound.unlock(); Sound.toggleSfx(); sndUi(); }; $('musBtn').onclick = () => { Sound.unlock(); Sound.toggleMusic(); sndUi(); };
  function setTurbo() { $('turboBtn').classList.toggle('on', turbo); localStorage.setItem('pp_turbo', turbo ? '1' : '0'); }
  $('turboBtn').onclick = () => { turbo = !turbo; setTurbo(); }; setTurbo();
  function slamOrSkip() { if (jpSkip) { jpSkip(); return true; } if (spinState) { spinState.slam = true; return true; } if (bwSkip) { bwSkip(); return true; } if (bannerSkip) { bannerSkip(); return true; } if (skipNow) { skipNow(); return true; } return false; }
  window.__slam = slamOrSkip;
  $('machine').addEventListener('pointerdown', e => { if (e.target.closest('button')) return; if (bwSkip || bannerSkip) slamOrSkip(); });
  document.addEventListener('keydown', e => { if (e.code === 'KeyT' && !e.ctrlKey && !e.metaKey) { turbo = !turbo; setTurbo(); } });
  $('spin').onclick = () => { if (S.spinning && !S.auto) { slamOrSkip(); return; } if (S.auto) { S.auto = false; setAuto(); } else doSpin(); };
  $('auto').onclick = () => { S.auto = !S.auto; setAuto(); if (S.auto && !S.spinning) doSpin(); };
  $('betMinus').onclick = () => { S.betIdx = Math.max(0, S.betIdx - 1); ui(); };
  $('betPlus').onclick = () => { S.betIdx = Math.min(C.bets.length - 1, S.betIdx + 1); ui(); };
  $('info').onclick = () => { buildInfo(); $('infoModal').classList.remove('hidden'); };
  $('infoClose').onclick = () => $('infoModal').classList.add('hidden');
  document.addEventListener('keydown', e => { if (e.code === 'Space' && [...document.querySelectorAll('.modal')].every(x => x.classList.contains('hidden'))) { e.preventDefault(); if (S.spinning) slamOrSkip(); else doSpin(); } });
  const DEMO = { vlna: '__forceWave', kraken: '__forceKraken', jackpot: '__forceJackpot', fs: '__forceFS', bonus: '__forceBonus' };
  const DEMO_LABEL = { vlna: 'Přílivová vlna', kraken: 'Útok krakena', jackpot: 'Jackpot', fs: 'Volné otáčky', bonus: 'Vykopej poklad' };
  let jpCycle = 0;
  function demo(name) { const jm = /^jackpot_(mini|minor|major|grand)$/.exec(name); if (jm) { window.__forceJackpotTier = ['mini', 'minor', 'major', 'grand'].indexOf(jm[1]); name = 'jackpot'; }
    if (!DEMO[name]) return; if (S.inFs && name !== 'fs') { msg('Až po volných otáčkách'); return; } window[DEMO[name]] = true; msg('DEMO:<br>' + DEMO_LABEL[name], true); $('demoMenu').classList.add('hidden');
    if (!S.spinning) { if (S.balance < bet()) S.balance += 1000; doSpin(); } }
  document.addEventListener('keydown', e => { if (e.ctrlKey || e.metaKey || e.altKey || /input|textarea/i.test(e.target.tagName)) return;
    let m = { KeyV: 'vlna', KeyK: 'kraken', KeyJ: 'jackpot', KeyF: 'fs', KeyB: 'bonus' }[e.code]; if (m === 'jackpot') { m = ['jackpot_mini', 'jackpot_major', 'jackpot_grand'][jpCycle++ % 3]; } if (m && [...document.querySelectorAll('.modal')].every(x => x.classList.contains('hidden'))) { Sound.unlock(); demo(m); } });
  $('demoBtn').onclick = () => { $('demoMenu').classList.toggle('hidden'); };
  document.querySelectorAll('#demoMenu button').forEach(b => b.onclick = () => { Sound.unlock(); Sound.play('click'); demo(b.dataset.f); });
  window.__game = { E, demo, S, doSpin, pickBonus, jackpotGame, setStops: st => { st.forEach((v, r) => pos[r] = v); } };
  function fit() { const m = $('machine'), s = Math.min(innerWidth / 1335, innerHeight / 1030); m.style.transform = `scale(${s})`; }
  addEventListener('resize', fit); fit();
  Promise.all([loadArt(), document.fonts ? document.fonts.load('400 50px "Pirata One"').then(() => document.fonts.load('500 20px Oswald')).catch(() => {}) : 0]).then(() => { woodBg = makeWood(); ui(); requestAnimationFrame(render); window.__ready = true; const qd = new URLSearchParams(location.search).get('demo'); if (qd) setTimeout(() => demo(qd), 600); });
})();
