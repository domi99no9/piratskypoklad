// Sdílený herní engine: používá ho simulátor v Node i prohlížečové demo.
(function (root) {
  function makeRng(seed) { // generátor ve stylu xorshift128+ (32bitový sfc32)
    let a = seed >>> 0, b = 0x9e3779b9, c = 0x243f6a88, d = 0xb7e15162 ^ seed;
    function r() { a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0; let t = (a + b) | 0; a = b ^ (b >>> 9); b = (c + (c << 3)) | 0; c = (c << 21) | (c >>> 11); d = (d + 1) | 0; t = (t + d) | 0; c = (c + t) | 0; return (t >>> 0) / 4294967296; }
    for (let i = 0; i < 20; i++) r(); return r;
  }
  function Engine(cfg) {
    this.cfg = cfg; this.ids = cfg.symbols.map(s => s.id);
    this.idx = {}; this.ids.forEach((s, i) => this.idx[s] = i);
    this.WILD = this.idx[cfg.wild.id]; this.SCAT = this.idx[cfg.scatter.id]; this.CHEST = this.idx[cfg.pickBonus.triggerSymbol];
    this.strips = cfg.reels.map(r => r.map(s => this.idx[s]));
    this.pay = cfg.symbols.map(s => s.pays || null); // pays[počet] v násobcích sázky na linii
    this.lines = cfg.paylines;
  }
  Engine.prototype.spin = function (rng) {
    const g = [];
    for (let r = 0; r < 5; r++) { const s = this.strips[r], st = Math.floor(rng() * s.length); g.push([s[st], s[(st + 1) % s.length], s[(st + 2) % s.length]]); }
    return g; // g[válec][řádek]
  };
  // vrací výhru v násobcích celkové sázky
  Engine.prototype.evaluate = function (orig, krakenPos) {
    const W = this.WILD, S = this.SCAT, nl = this.lines.length;
    const g = orig.map(c => c.slice()); const wildReels = [];
    for (let r = 0; r < 5; r++) if (g[r].includes(W)) { wildReels.push(r); if (this.cfg.wild.expanding) g[r] = [W, W, W]; }
    if (krakenPos) for (const [r, y] of krakenPos) g[r][y] = W;
    const lineWins = []; let lineSum = 0;
    for (let l = 0; l < nl; l++) {
      const L = this.lines[l]; const sym = g[0][L[0]]; if (sym === S || sym === W) continue;
      let n = 1; while (n < 5) { const c = g[n][L[n]]; if (c === sym || c === W) n++; else break; }
      const p = this.pay[sym] && this.pay[sym][n];
      if (p) { lineSum += p; lineWins.push({ line: l, sym, count: n, pay: p / nl }); }
    }
    let sc = 0; const scPos = [];
    for (let r = 0; r < 5; r++) for (let y = 0; y < 3; y++) if (g[r][y] === S) { sc++; scPos.push([r, y]); }
    const scPay = (this.cfg.scatter.pays[sc] || 0);
    const bonus = [0, 2, 4].every(r => orig[r].includes(this.CHEST));
    return { grid: g, wildReels, lineWins, scatterCount: sc, scatterPos: scPos, scatterPay: scPay,
      freeSpins: sc >= 3 ? this.cfg.scatter.freeSpins : 0, bonus, total: lineSum / nl + scPay };
  };
  // Útok krakena: náhodné pozice (kromě scatterů) se stanou nerozšiřujícími se WILDy
  Engine.prototype.krakenPositions = function (grid, rng) {
    const k = this.cfg.krakenAttack, n = k.wildCounts[Math.floor(rng() * k.wildCounts.length)], cells = [];
    for (const R of k.reels) for (let y = 0; y < 3; y++) if (grid[R - 1][y] !== this.SCAT && grid[R - 1][y] !== this.WILD) cells.push([R - 1, y]);
    for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }
    return cells.slice(0, n);
  };
  // Volba úrovně spuštěného jackpotu (podle vah)
  Engine.prototype.jackpotTier = function (rng) {
    const t = this.cfg.jackpot.tiers, tot = t.reduce((a, b) => a + b.weight, 0); let x = rng() * tot;
    for (let i = 0; i < t.length; i++) { x -= t[i].weight; if (x < 0) return i; } return t.length - 1;
  };
  // bonus Vykopej poklad: vrací {board, picks, total} v násobcích celkové sázky
  Engine.prototype.pickBoard = function (rng) {
    const b = this.cfg.pickBonus.prizes.concat(Array(this.cfg.pickBonus.skulls).fill(0));
    for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
    return b;
  };
  Engine.prototype.playPick = function (rng) { // automatický výběr v náhodném pořadí (stejná střední hodnota)
    const b = this.pickBoard(rng); let t = 0; for (const v of b) { if (v === 0) break; t += v; } return t;
  };
  const api = { Engine, makeRng };
  if (typeof module !== 'undefined') module.exports = api; else root.PirateEngine = api;
})(this);
