// ----------------------------------------------------------------- crops
// Lay farm soil in build mode, plant seeds from the market, water them with
// the can and harvest when ripe. Crops only grow on nights after a watering
// (rain counts), and some keep fruiting after the first harvest.
// Crops.png: one crop per 32px row: sign, seed bag, 4 growth stages, produce.
const CROPS = [
  // id, name, sheet row, seed price, days to grow, sell price, regrow days, unlock day
  ['wheat', 'Wheat', 0, 5, 2, 10, 0, 1], ['radish', 'Radish', 18, 6, 2, 12, 0, 1], ['carrot', 'Carrot', 2, 8, 3, 18, 0, 1],
  ['potato', 'Potato', 16, 10, 3, 22, 0, 2], ['turnip', 'Turnip', 3, 10, 3, 21, 0, 2], ['parsnip', 'Parsnip', 6, 12, 3, 25, 0, 2],
  ['strawberry', 'Strawberry', 17, 25, 4, 14, 2, 3], ['onion', 'Onion', 15, 14, 4, 30, 0, 3], ['garlic', 'Garlic', 19, 14, 4, 30, 0, 3], ['leek', 'Leek', 20, 16, 4, 34, 0, 3],
  ['tomato', 'Tomato', 1, 20, 4, 12, 2, 4], ['cucumber', 'Cucumber', 8, 18, 4, 11, 2, 4], ['cabbage', 'Cabbage', 7, 20, 4, 42, 0, 4], ['sunflower', 'Sunflower', 14, 20, 4, 40, 0, 4],
  ['chili', 'Chili pepper', 9, 22, 5, 14, 2, 5], ['bellpepper', 'Red pepper', 10, 20, 5, 13, 2, 5], ['yellowpepper', 'Yellow pepper', 11, 20, 5, 13, 2, 5], ['greenpepper', 'Green pepper', 12, 20, 5, 12, 2, 5],
  ['corn', 'Corn', 4, 24, 5, 50, 0, 5], ['pumpkin', 'Pumpkin', 5, 40, 6, 100, 0, 7], ['watermelon', 'Watermelon', 13, 45, 6, 110, 0, 7], ['grapes', 'Grapes', 21, 50, 6, 24, 2, 7],
].map(([id, name, row, seed, days, sell, regrow, day]) => ({ id, name, row, seed, days, sell, regrow, day }));
const CROP = Object.fromEntries(CROPS.map((c) => [c.id, c]));
ITEMS.fertilizer = { name: 'Fertilizer', price: 0, icon: ['Icons/Outline/Other_Icons_2_Outline', 1, 0] };
const FERT_PRICE = 15;
for (const c of CROPS) ITEMS[c.id] = { name: c.name, price: c.sell, icon: ['Crops/Crops', 6, c.row * 2 + 1], crop: true };
// farmland: a 4-neighbour autotile (up, right, down, left bits) on the 16px grid
const SOIL_TILE = { 0: [0, 0], 4: [0, 1], 5: [0, 2], 1: [0, 3], 2: [1, 3], 10: [2, 3], 8: [3, 3], 6: [1, 0], 14: [2, 0], 12: [3, 0], 7: [1, 1], 15: [2, 1], 13: [3, 1], 3: [1, 2], 11: [2, 2], 9: [3, 2] };

def('soil', { name: 'Farm soil', cat: 'farm', price: 2, block: 0, beauty: 0, ground: true, soil: true, desc: 'Tilled soil for crops. Drag to lay a whole field.' });

Object.assign(Game.prototype, {
  setSoil(x, y, on) {
    const W = this.world, i = W.idx(x, y); if (!W.inb(x, y)) return;
    if (on) { W.soil[i] = 1; const ob = W.objAt.get(i); if (ob && ob.kind !== 'tree') W.removeObj(ob); }
    else { W.soil[i] = 0; W.wet[i] = 0; this.crops.delete(i); }
  },
  cropAt(x, y) { return this.world.inb(x, y) ? this.crops.get(this.world.idx(x, y)) : null; },
  cropStage(c) { const C = CROP[c.c]; return c.g >= C.days ? 3 : Math.min(2, Math.floor(c.g / C.days * 3)); },
  seedCount() { return Object.values(this.seeds).reduce((s, n) => s + n, 0); },
  buyFert(n) { const cost = FERT_PRICE * n; if (this.coins < cost) return 'Not enough coins'; this.coins -= cost; this.fert = (this.fert || 0) + n; this.fertOn = true; this.sfx('coin'); this.emit('seeds'); this.emit('changed'); return null; },
  buySeeds(id, n) {
    const C = CROP[id], cost = C.seed * n;
    if (this.day < C.day) return `${C.name} seeds arrive on day ${C.day}`;
    if (this.coins < cost) return 'Not enough coins';
    this.coins -= cost; this.seeds[id] = (this.seeds[id] || 0) + n; this.seedSel = id; this.sfx('coin'); this.emit('changed'); return null;
  },
  soilLabel(x, y) {
    const c = this.cropAt(x, y), W = this.world, wet = W.wet[W.idx(x, y)];
    if (!c) return this.seedCount() ? `Plant ${CROP[this.seedSel] && this.seeds[this.seedSel] ? CROP[this.seedSel].name.toLowerCase() : 'seeds'}` : 'Farm soil · buy seeds at the market';
    const C = CROP[c.c];
    if (c.g >= C.days) return `Harvest ${C.name.toLowerCase()} (${C.sell} coins)`;
    const left = C.days - c.g;
    const fz = c.f ? ' · fertilized ✨' : '';
    return wet ? `${C.name} · watered · ripe in ${left} day${left > 1 ? 's' : ''}${fz}` : `Water the ${C.name.toLowerCase()} · ${left} day${left > 1 ? 's' : ''} to go${fz}`;
  },
  // what clicking a soil tile does: plant, water or harvest
  useSoil(x, y) {
    const W = this.world, i = W.idx(x, y), c = this.crops.get(i), P0 = this.player;
    P0.face(x + 0.5 - P0.x, y + 0.6 - P0.y);
    if (!c) {
      if (!this.seedCount()) return this.toast('No seeds! Buy some at the market stall (Seeds tab).', 'bad');
      if (!(this.seeds[this.seedSel] > 0)) { this.seedSel = Object.keys(this.seeds).find((k) => this.seeds[k] > 0); this.emit('seeds'); }
      const id = this.seedSel;
      P0.act = { kind: 'hoe', t: 0, dur: 6 / 14, done: () => {
        if (this.crops.has(i) || !(this.seeds[id] > 0)) return;
        this.seeds[id]--; if (!this.seeds[id]) delete this.seeds[id];
        this.crops.set(i, { c: id, g: 0 }); this.stats.planted = (this.stats.planted || 0) + 1;
        this.puff(x + 0.5, y + 0.8, '#8a5a3c', 5); this.sfx('place'); this.emit('seeds');
      } };
      return;
    }
    const C = CROP[c.c];
    if (c.g >= C.days) {
      P0.act = { kind: 'pick', t: 0, dur: 0.35, done: () => {
        if (this.crops.get(i) !== c) return;
        this.dropItem(c.c, x + 0.5, y + 0.9);
        if (C.regrow) c.g = C.days - C.regrow; else this.crops.delete(i);
        this.stats.harvested = (this.stats.harvested || 0) + 1; this.stats['h_' + c.c] = (this.stats['h_' + c.c] || 0) + 1;
        this.puff(x + 0.5, y + 0.6, '#bfe6a8', 6); this.sfx('pickup');
      } };
      return;
    }
    if (W.wet[i]) return this.toast(`Already watered. ${C.name} will be ripe in ${C.days - c.g} day${C.days - c.g > 1 ? 's' : ''}.`);
    // the can splashes a 3x3 patch, so a field goes quickly
    P0.act = { kind: 'water', t: 0, dur: 0.6, done: () => {
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const j = W.idx(x + dx, y + dy); if (W.inb(x + dx, y + dy) && W.soil[j] && !W.wet[j]) { W.wet[j] = 1; n++; } }
      for (let k = 0; k < 8; k++) this.fx.push({ x: x + 0.5 + (Math.random() - 0.5) * 2.4, y: y + 0.5 + (Math.random() - 0.5) * 2.4, vx: 0, vy: -0.3, t: 0, life: 0.5, col: '#9fd8ff', s: 1.5 });
      this.sfx('splash'); this.stats.watered = (this.stats.watered || 0) + n;
      // fertilizer goes on with the water: one bag covers the whole splash
      if (this.fertOn && this.fert > 0) {
        let any = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const c2 = this.crops.get(W.idx(x + dx, y + dy)); if (c2 && !c2.f && c2.g < CROP[c2.c].days) { c2.f = true; any++; } }
        if (any) { this.fert--; this.stats.fertilized = (this.stats.fertilized || 0) + any; for (let k = 0; k < 10; k++) this.fx.push({ x: x + 0.5 + (Math.random() - 0.5) * 2.4, y: y + 0.5 + (Math.random() - 0.5) * 2.4, vx: 0, vy: -0.4, t: 0, life: 0.7, col: '#b8f07a', s: 1.5 }); this.emit('seeds'); }
      }
    } };
  },
  // overnight: watered crops grow a day; then the soil dries out
  growCrops() {
    const W = this.world;
    for (const [i, c] of this.crops) if (W.wet[i] && c.g < CROP[c.c].days) c.g = Math.min(CROP[c.c].days, c.g + (c.f ? 2 : 1));   // fertilized crops grow twice as fast
    W.wet.fill(0);
  },
  rainOnSoil() { const W = this.world; for (let i = 0; i < W.soil.length; i++) if (W.soil[i]) W.wet[i] = 1; },
  drawSoil(R, x0, y0, x1, y1) {
    const W = this.world, S = (x, y) => W.inb(x, y) && W.soil[W.idx(x, y)];
    for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(W.H - 1, Math.ceil(y1)); y++) for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(W.W - 1, Math.ceil(x1)); x++) {
      if (!S(x, y)) continue;
      const m = (S(x, y - 1) ? 1 : 0) | (S(x + 1, y) ? 2 : 0) | (S(x, y + 1) ? 4 : 0) | (S(x - 1, y) ? 8 : 0), t = SOIL_TILE[m];
      R.tile(W.wet[W.idx(x, y)] ? 'Tiles/FarmLand/FarmLand_Wet_Tile' : 'Tiles/FarmLand/FarmLand_Tile', t[0] * 16, t[1] * 16, x, y);
      const c = this.crops.get(W.idx(x, y));
      if (c && c.f) { const g = R.g; g.fillStyle = '#c6f08a'; for (let k = 0; k < 5; k++) { const px = R.sx(x + 0.15 + hash2(x, y, k) * 0.7), py = R.sy(y + 0.2 + hash2(y, x, k + 9) * 0.65); g.fillRect(px, py, Math.ceil(R.Z), Math.ceil(R.Z)); } }
    }
  },
  drawCrop(R, i, c, t) {
    const W = this.world, x = i % W.W, y = (i / W.W) | 0, C = CROP[c.c], s = this.cropStage(c);
    const sway = s >= 2 ? Math.sin(t * 1.6 + x * 0.7 + y) * 0.4 : 0;
    R.spr('Crops/Crops', (2 + s) * 16, C.row * 32, 16, 32, x + 0.5 + sway / 16, y + 1, { oy: 2 });
    if (s === 3 && Math.sin(t * 3 + i) > 0.92) this.fx.push({ x: x + 0.3 + Math.random() * 0.4, y: y + 0.2, vx: 0, vy: -0.3, t: 0, life: 0.6, col: '#fff6b0', s: 1 });
  },
});
