// ---------------------------------------------------------------- island
const WATER = 0, SAND = 1, GRASS = 2;
// ore rows in Ores.png: 1 copper, 2 gold, 3 emerald, 4 sapphire, 5 amber, 6 ruby, 7 amethyst
const ORES = [null, 'copper', 'gold', 'emerald', 'sapphire', 'amber', 'ruby', 'amethyst'];
function oreType(r) { return r < 0.42 ? 1 : r < 0.62 ? 2 : r < 0.72 ? 5 : r < 0.81 ? 3 : r < 0.89 ? 4 : r < 0.95 ? 7 : 6; }
const MAP_W = 96, MAP_H = 72;

class World {
  constructor(seed) {
    this.seed = seed; this.W = MAP_W; this.H = MAP_H;
    const n = this.W * this.H;
    this.ter = new Uint8Array(n);        // WATER / SAND / GRASS
    this.pond = new Uint8Array(n);
    this.dug = new Uint8Array(n);        // ponds the player dug
    this.soil = new Uint8Array(n);       // tilled farmland
    this.wet = new Uint8Array(n);        // watered today       // fresh water (no beach, grass banks)
    this.path = new Uint8Array(n);       // player-made dirt paths (sand inside grass)
    this.block = new Uint8Array(n);      // walking blocked (trees, buildings, decor)
    this.objs = [];                      // trees, rocks, flowers... (static scenery)
    this.objAt = new Map();              // tile index -> scenery object
    this.gen();
  }
  idx(x, y) { return y * this.W + x; }
  inb(x, y) { return x >= 0 && y >= 0 && x < this.W && y < this.H; }
  get(x, y) { return this.inb(x, y) ? this.ter[this.idx(x, y)] : WATER; }
  isPond(x, y) { return this.inb(x, y) && this.pond[this.idx(x, y)] === 1; }
  isWater(x, y) { return this.get(x, y) === WATER; }
  isOcean(x, y) { return this.get(x, y) === WATER && !this.isPond(x, y); }
  walkable(x, y) { return this.inb(x, y) && this.ter[this.idx(x, y)] !== WATER && !this.block[this.idx(x, y)]; }
  // the player can also pass through gates (block = 2)
  walkP(x, y) { if (!this.inb(x, y)) return false; const i = this.idx(x, y); return this.ter[i] !== WATER && this.block[i] !== 1; }

  gen() {
    const r = mulberry32(this.seed), N = makeNoise(this.seed), N2 = makeNoise(this.seed + 7);
    const W = this.W, H = this.H, cx = W / 2, cy = H / 2;
    // island shape: an ellipse roughened by noise
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const dx = (x - cx) / (W * 0.46), dy = (y - cy) / (H * 0.44), d = Math.sqrt(dx * dx + dy * dy);
      const e = 1 - d * d + N(x / 14, y / 14, 3) * 0.55;
      this.ter[this.idx(x, y)] = e > 0.32 ? GRASS : WATER;
    }
    // keep only the main landmass, fill lakes in it
    this.keepMainland();
    // beaches: grass close to the sea becomes sand
    const beachW = (x, y) => 1.4 + (N2(x / 9, y / 9, 2) + 0.5) * 2.2;
    const dsea = this.distTo((x, y) => this.isOcean(x, y));
    for (let i = 0; i < W * H; i++) if (this.ter[i] === GRASS && dsea[i] <= beachW(i % W, (i / W) | 0)) this.ter[i] = SAND;
    // a pond with lily pads, east of the farm
    this.farm = { x: Math.round(cx - 6), y: Math.round(cy - 2) };
    this.makePond(this.farm.x + 22 + Math.round(r() * 4), this.farm.y + 4 + Math.round(r() * 6), 5 + r() * 2, r);
    this.makePond(this.farm.x - 24 - Math.round(r() * 4), this.farm.y + 12 + Math.round(r() * 4), 3.5 + r(), r);
    this.cleanup();
    // scenery: forests where the noise says so, clear around the farm
    const F = makeNoise(this.seed + 99);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = this.idx(x, y); if (this.ter[i] !== GRASS) continue;
      const fd = dist(x, y, this.farm.x, this.farm.y);
      const forest = F(x / 11, y / 11, 3) + 0.08 - (fd < 16 ? 1 : fd < 22 ? (22 - fd) / 10 : 0);
      if (!this.nearType(x, y, 1, (q) => q !== GRASS)) {
        if (forest > 0.0 && r() < 0.6) this.addTree(x, y, r);
        else if (forest > -0.12 && r() < 0.08) this.addTree(x, y, r);
      }
    }
    for (let k = 0; k < 1500; k++) {
      const x = 1 + Math.floor(r() * (W - 2)), y = 1 + Math.floor(r() * (H - 2)), i = this.idx(x, y);
      if (this.objAt.has(i) || this.ter[i] === WATER) continue;
      const fd = dist(x, y, this.farm.x, this.farm.y);
      if (this.ter[i] === SAND) continue;
      if (fd < 7) { if (r() < 0.3) this.addObj({ kind: 'grass', x, y, v: 1 + Math.floor(r() * 3), ph: r() * 8 }); continue; }
      const t = r();
      if (t < 0.40) this.addObj({ kind: 'flower', x, y, sheet: 1 + Math.floor(r() * 5), row: Math.floor(r() * 10), ph: r() * 6 });
      else if (t < 0.62) this.addObj({ kind: 'grass', x, y, v: 1 + Math.floor(r() * 3), ph: r() * 8 });
      else if (t < 0.70) this.addObj({ kind: 'mushroom', x, y, v: 1 + Math.floor(r() * 6), ph: r() * 6 });
      else if (t < 0.78) { this.addObj({ kind: 'rock', x, y, v: 1 + Math.floor(r() * 9) }); this.block[i] = 1; }
      else if (t < 0.81) { this.addObj({ kind: 'ore', x, y, v: oreType(r()) }); this.block[i] = 1; }
      else if (t < 0.86) { this.addObj({ kind: 'bush', x, y, v: Math.floor(r() * 3) }); this.block[i] = 1; }
      else if (t < 0.90) { this.addObj({ kind: 'berry', x, y, v: r() < 0.5 ? 0 : 1, ripe: true }); this.block[i] = 1; }
    }
    // how much wild stuff the island starts with: respawning never goes past this
    this.targets = {}; for (const o of this.objs) this.targets[o.kind] = (this.targets[o.kind] || 0) + 1;
    // pond plants
    for (let i = 0; i < W * H; i++) {
      if (!this.pond[i]) continue; const x = i % W, y = (i / W) | 0;
      const edge = this.nearType(x, y, 1, (q) => q !== WATER);
      if (edge && r() < 0.35) this.addObj({ kind: 'cattail', x, y, v: 1 + Math.floor(r() * 5), ph: r() * 8 });
      else if (!edge && r() < 0.16) this.addObj({ kind: 'lily', x, y, col: pick(['Green', 'Green', 'Purple', 'Red', 'Brown'], r()), v: 1 + Math.floor(r() * 6), ph: r() * 8 });
    }
  }
  keepMainland() {
    const W = this.W, H = this.H, seen = new Int32Array(W * H).fill(-1); let best = -1, bestN = 0, id = 0;
    for (let s = 0; s < W * H; s++) {
      if (this.ter[s] === WATER || seen[s] >= 0) continue;
      const q = [s]; seen[s] = id; let n = 0;
      while (q.length) { const c = q.pop(); n++; const x = c % W, y = (c / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (!this.inb(nx, ny)) continue; const j = this.idx(nx, ny); if (this.ter[j] !== WATER && seen[j] < 0) { seen[j] = id; q.push(j); } } }
      if (n > bestN) { bestN = n; best = id; } id++;
    }
    for (let i = 0; i < W * H; i++) if (this.ter[i] !== WATER && seen[i] !== best) this.ter[i] = WATER;
    // inland water not connected to the edge becomes land
    const sea = new Uint8Array(W * H), q = [];
    for (let x = 0; x < W; x++) { q.push(x, x + (H - 1) * W); } for (let y = 0; y < H; y++) { q.push(y * W, y * W + W - 1); }
    for (const s of q) sea[s] = 1;
    while (q.length) { const c = q.pop(); const x = c % W, y = (c / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (!this.inb(nx, ny)) continue; const j = this.idx(nx, ny); if (this.ter[j] === WATER && !sea[j]) { sea[j] = 1; q.push(j); } } }
    for (let i = 0; i < W * H; i++) if (this.ter[i] === WATER && !sea[i]) this.ter[i] = GRASS;
  }
  distTo(pred) {
    const W = this.W, H = this.H, d = new Float32Array(W * H).fill(1e9), q = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (pred(x, y)) { d[this.idx(x, y)] = 0; q.push(this.idx(x, y)); }
    for (let h = 0; h < q.length; h++) { const c = q[h], x = c % W, y = (c / W) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (!this.inb(nx, ny)) continue; const j = this.idx(nx, ny); if (d[j] > d[c] + 1) { d[j] = d[c] + 1; q.push(j); } } }
    return d;
  }
  makePond(px, py, rad, r) {
    const N = makeNoise(this.seed + px * 13 + py), cells = [];
    for (let y = py - 10; y <= py + 10; y++) for (let x = px - 12; x <= px + 12; x++) {
      if (!this.inb(x, y)) continue; const i = this.idx(x, y);
      const d = dist(x, y, px, py * 1) / rad + N(x / 4, y / 4, 2) * 0.45;
      if (d < 1 && this.ter[i] === GRASS && !this.nearType(x, y, 3, (q) => q !== GRASS)) cells.push(i);
    }
    for (const i of cells) { this.ter[i] = WATER; this.pond[i] = 1; }
  }
  nearType(x, y, R, pred) {
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const t = this.get(x + dx, y + dy); if (pred(t, x + dx, y + dy)) return true; }
    return false;
  }
  // remove the configurations the tilesets can't draw (diagonal-only corners,
  // three terrains in one 2x2, sand touching ponds, grass touching the sea)
  cleanup() {
    const W = this.W, H = this.H;
    for (let pass = 0; pass < 8; pass++) {
      let changed = 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = this.idx(x, y);
        if (this.ter[i] === GRASS && this.nearType(x, y, 1, (q, xx, yy) => q === WATER && !this.isPond(xx, yy))) { this.ter[i] = SAND; changed++; }
        if (this.ter[i] === SAND && !this.path[i] && this.nearType(x, y, 1, (q, xx, yy) => this.isPond(xx, yy))) { this.ter[i] = GRASS; changed++; }
      }
      for (let y = 0; y < H - 1; y++) for (let x = 0; x < W - 1; x++) {
        const a = this.idx(x, y), b = a + 1, c = a + W, d = c + 1;
        for (const lv of [SAND, GRASS]) {
          const A = this.ter[a] >= lv, B = this.ter[b] >= lv, C = this.ter[c] >= lv, D = this.ter[d] >= lv;
          if (A === D && B === C && A !== B) {            // diagonal pair: fill the gap
            for (const j of [a, b, c, d]) if (this.ter[j] < lv) { this.ter[j] = lv; this.pond[j] = 0; }
            changed++;
          }
        }
      }
      if (!changed) break;
    }
  }
  addObj(o) { this.objs.push(o); this.objAt.set(this.idx(o.x, o.y), o); return o; }
  removeObj(o) { this.objs = this.objs.filter((q) => q !== o); const i = this.idx(o.x, o.y); if (this.objAt.get(i) === o) this.objAt.delete(i); if (o.blocks !== false) this.block[i] = 0; }
  addTree(x, y, r) {
    const kind = pick(['Oak', 'Oak', 'Oak', 'Birch', 'Birch', 'Spruce'], r());
    const size = pick(['Big', 'Medium', 'Medium', 'Small'], r());
    const o = this.addObj({ kind: 'tree', x, y, tree: kind, size, ph: r() * 6 });
    this.block[this.idx(x, y)] = 1;
    return o;
  }
  clearArea(x0, y0, x1, y1, onlyBlocking) {
    for (const o of [...this.objs]) if (o.x >= x0 && o.x <= x1 && o.y >= y0 && o.y <= y1 && (!onlyBlocking || this.block[this.idx(o.x, o.y)])) this.removeObj(o);
  }
}
