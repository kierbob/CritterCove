// --------------------------------------------------- gathering & fishing
// ways to earn: chop trees for logs, mine rocks and ore, pick flowers,
// mushrooms and berries, and go fishing in the pond or the sea
const FISH = { pond: [['minnow', 30], ['bluegill', 28], ['perch', 20], ['bass', 15], ['goldfish', 4]], sea: [['sardine', 45], ['snapper', 33], ['grouper', 10]] };
const LOGS = { Small: 1, Medium: 2, Big: 3 };

Object.assign(Game.prototype, {
  initActivities() {
    this.stats.logs = this.stats.logs || 0; this.stats.stone = this.stats.stone || 0; this.stats.fish = this.stats.fish || 0;
    this.stats.picked = this.stats.picked || 0; this.fishDex = this.fishDex || [];
    this.undoStack = []; this.fishing = null;
    this.makeFishSpots();
  },
  makeFishSpots() {
    const W = this.world, r = Math.random, spots = [];
    const water = (pond) => { for (let k = 0; k < 400; k++) { const x = Math.floor(r() * W.W), y = Math.floor(r() * W.H); if (!W.isWater(x, y) || W.isPond(x, y) !== pond) continue; if (W.nearType(x, y, 1, (q) => q !== WATER)) continue; if (!W.nearType(x, y, 2, (q) => q !== WATER)) continue; return [x, y]; } return null; };
    for (let i = 0; i < 4; i++) { const s = water(true); if (s) spots.push({ x: s[0], y: s[1], pond: true, ph: r() * 16 }); }
    for (let i = 0; i < 8; i++) { const s = water(false); if (s) spots.push({ x: s[0], y: s[1], pond: false, ph: r() * 16 }); }
    this.fishSpots = spots;
  },

  // ------------------------------------------------------------ gathering
  // what happens when you click a bit of scenery
  gatherLabel(o) {
    if (o.kind === 'tree' && o.stump) return `Stump · sprouts again in ${this.untilText(o.regrowAt)} · click to dig out (1 log)`;
    if (o.kind === 'tree' && o.size !== 'Big' && o.nextGrow) return `Young ${o.tree === 'Fruit' ? 'fruit tree' : 'tree'} · grows in ${this.untilText(o.nextGrow)} · chop (${LOGS[o.size] || 1} log${(LOGS[o.size] || 1) > 1 ? 's' : ''})`;
    if (o.kind === 'tree') return o.stump ? 'Clear the stump (1 log)' : `Chop ${o.tree === 'Fruit' ? 'fruit tree' : 'tree'} (${LOGS[o.size] || 1} log${(LOGS[o.size] || 1) > 1 ? 's' : ''})`;
    if (o.kind === 'rock') return 'Mine rock (stone)';
    if (o.kind === 'ore') return `Mine ${ITEMS[ORES[o.v]].name.toLowerCase()} (${ITEMS[ORES[o.v]].price} coins each)`;
    if (o.kind === 'flower') return 'Pick wildflowers';
    if (o.kind === 'mushroom') return 'Pick mushroom';
    if (o.kind === 'berry') return o.ripe ? `Pick ${o.v ? 'blackberries' : 'strawberries'}` : 'Berries are growing back';
    return null;
  },
  gather(o) {
    const P0 = this.player, W = this.world;
    P0.face(o.x + 0.5 - P0.x, o.y + 0.6 - P0.y);
    if (o.kind === 'flower' || o.kind === 'mushroom' || (o.kind === 'berry' && o.ripe)) {
      P0.act = { kind: 'pick', t: 0, dur: 0.35, done: () => {
        if (o.kind === 'berry') { o.ripe = false; o.regrow = this.day + 2; const it = o.v ? 'berryBlue' : 'berryRed'; this.dropItem(it, o.x + 0.3, o.y + 1.1); this.dropItem(it, o.x + 0.7, o.y + 1.2); }
        else { W.removeObj(o); this.dropItem(o.kind === 'flower' ? 'flower' : 'mushroom', o.x + 0.5, o.y + 0.9); }
        this.stats.picked++; this.puff(o.x + 0.5, o.y + 0.8, '#bfe6a8', 5); this.sfx('pickup');
      } };
      return;
    }
    if (o.kind === 'berry') return this.toast('These berries are growing back. Try again in a day or two.');
    const tree = o.kind === 'tree', swings = tree ? (o.stump ? 1 : 3) : o.kind === 'ore' ? 4 : 3;
    let n = 0;
    P0.act = {
      kind: tree ? 'chop' : 'mine', t: 0, dur: swings * 0.5, cancelable: true,
      update: (dt, A) => {
        const k = Math.floor((A.t + 0.25) / 0.5);
        if (k > n && k <= swings) {
          n = k; o.shake = 0.25; this.sfx(tree ? 'chop' : 'mine');
          if (tree && !o.stump) for (let i = 0; i < 3; i++) this.fx.push({ x: o.x + 0.5 + (Math.random() - 0.5), y: o.y - 1.2 - Math.random(), vx: (Math.random() - 0.5) * 1.5, vy: 0.4 + Math.random() * 0.6, g: 0.3, t: 0, life: 1.4, leaf: o.tree === 'Birch' ? 'Trees/Birch_Leaf_Particle' : o.tree === 'Spruce' ? 'Trees/Spruce_Needle_Particle' : 'Trees/Oak_Leaf_Particle', rot: Math.random() * 6 });
          else this.puff(o.x + 0.5, o.y + 0.7, tree ? '#a0703c' : '#b8b8b0', 6);
          A.t = Math.max(A.t, (k - 0.5) * 0.5);
        }
      },
      done: () => tree ? this.fell(o) : this.breakRock(o),
    };
  },
  fell(o) {
    const W = this.world;
    if (o.stump) {   // pull the stump out completely
      W.removeObj(o); this.dropItem('log', o.x + 0.5, o.y + 1); this.stats.logs++; this.sfx('pop');
      this.recordUndo(null); return;
    }
    const n = LOGS[o.size] || 1;
    for (let i = 0; i < n; i++) this.dropItem('log', o.x + 0.2 + i * 0.3, o.y + 1 + (i % 2) * 0.2);
    if (o.tree === 'Fruit') { this.dropItem('apple', o.x - 0.2, o.y + 1.1); this.dropItem('apple', o.x + 1.1, o.y + 1.1); }
    this.stats.logs += n;
    o.stump = true; o.regrowAt = this.now() + 1440 * 0.6; o.fallT = 1; o.wasSize = o.size; o.fallDir = this.player.x < o.x + 0.5 ? 1 : -1;
    this.sfx('fall'); this.puff(o.x + 0.5, o.y + 0.9, '#d9c49a', 12);
  },
  breakRock(o) {
    const W = this.world;
    W.removeObj(o); W.block[W.idx(o.x, o.y)] = 0;
    this.dropItem('stone', o.x + 0.4, o.y + 1);
    if (o.kind === 'ore') this.dropItem(ORES[o.v], o.x + 0.7, o.y + 1.1);
    else if (Math.random() < 0.3) this.dropItem('stone', o.x + 0.7, o.y + 1.1);
    if (o.kind === 'rock' && Math.random() < 0.08) this.dropItem(ORES[oreType(Math.random())], o.x + 0.5, o.y + 1.2);
    this.stats.stone++; this.puff(o.x + 0.5, o.y + 0.7, '#9a9a94', 12); this.sfx('break');
  },

  // -------------------------------------------------------------- fishing
  startFishing(tx, ty) {
    const P0 = this.player, W = this.world;
    const sea = !W.isPond(tx, ty);
    const spot = this.fishSpots.find((s) => dist(s.x, s.y, tx, ty) < 2.2);
    P0.face(tx + 0.5 - P0.x, ty + 0.5 - P0.y);
    this.fishing = { x: tx + 0.5, y: ty + 0.6, sea, spot, state: 'cast', t: 0 };
    this.sfx('cast');
    P0.act = { kind: 'cast', t: 0, dur: 9 / 14, cancel: () => { this.fishing = null; }, done: () => {
      if (!this.fishing) return;
      this.fishing.state = 'wait'; this.fishing.t = 0; this.fishing.biteAt = spot ? 1.2 + Math.random() * 2 : 2.5 + Math.random() * 5;
      this.puff(this.fishing.x, this.fishing.y, '#bfe8ff', 6); this.sfx('splash');
      P0.act = { kind: 'reel', t: 0, frame: 0, cancel: () => { this.fishing = null; } };
    } };
  },
  updateFishing(dt) {
    const F = this.fishing; if (!F) return;
    // if anything interrupted the cast or the line (another action, sleep, a door...), put the rod away
    const A0 = this.player.act; if (!A0 || (A0.kind !== 'cast' && A0.kind !== 'reel')) { this.fishing = null; return; }
    F.t += dt;
    const A = this.player.act;
    if (A && A.kind === 'reel' && A.frame !== undefined) A.frame = F.state === 'bite' ? Math.floor(F.t * 12) % 2 : 0;
    if (F.state === 'wait' && F.t >= F.biteAt) { F.state = 'bite'; F.t = 0; this.sfx('bite'); this.emit('bite'); }
    else if (F.state === 'bite' && F.t > (F.spot ? 1.1 : 0.9)) { F.state = 'wait'; F.t = 0; F.biteAt = 1.5 + Math.random() * 4; this.float(F.x, F.y - 0.8, 'It got away...', '#cfe7ff'); }
  },
  // click / space while the line is out
  reel() {
    const F = this.fishing, P0 = this.player; if (!F || F.state === 'cast' || F.state === 'reel') return;
    if (F.state === 'wait') { this.fishing = null; P0.act = null; this.float(F.x, F.y - 0.8, 'Too early!', '#cfe7ff'); return; }
    F.state = 'reel';
    const table = FISH[F.sea ? 'sea' : 'pond'].map(([k, w]) => [k, ITEMS[k].rare ? w * (F.spot ? 2.5 : 1) : w]);
    let s = Math.random() * table.reduce((a, b) => a + b[1], 0), fish = table[0][0];
    for (const [k, w] of table) { s -= w; if (s <= 0) { fish = k; break; } }
    P0.act = { kind: 'reel', t: 0, dur: 8 / 12, done: () => {
      this.fishing = null; this.give(fish, 1); this.stats.fish++; this.sfx('catch');
      this.float(P0.x, P0.y - 1.6, `Caught a ${ITEMS[fish].name.toLowerCase()}!`, ITEMS[fish].rare ? '#ffd23a' : '#fff7d6');
      if (!this.fishDex.includes(fish)) { this.fishDex.push(fish); this.toast(`New fish: ${ITEMS[fish].name}! It sells for ${ITEMS[fish].price} coins.`, 'good'); }
      if (F.spot && Math.random() < 0.5) this.makeFishSpots();
    } };
    this.puff(F.x, F.y, '#bfe8ff', 10); this.sfx('splash');
  },

  // ---------------------------------------------------------- the island renews
  regrowIsland() {
    const W = this.world, r = Math.random;
    for (const o of W.objs) {
      if (o.kind === 'berry' && !o.ripe && this.day >= o.regrow) o.ripe = true;
    }
    // gentle respawn: each morning a few of what was picked or mined comes back,
    // never more than the island started with, and never on the farm itself
    const count = (k) => W.objs.filter((o) => o.kind === k).length;
    const T = W.targets || {};
    const spawn = (kind, n, make) => {
      for (let k = 0, made = 0; k < n * 25 && made < n; k++) {
        const x = 1 + Math.floor(r() * (W.W - 2)), y = 1 + Math.floor(r() * (W.H - 2)), i = W.idx(x, y);
        if (W.ter[i] !== GRASS || W.path[i] || W.soil[i] || W.dug[i] || W.block[i] || W.objAt.has(i) || this.thingAt(x, y) || dist(x, y, this.player.x, this.player.y) < 5) continue;
        if (dist(x, y, W.farm.x, W.farm.y) < 15 * W.s || this.things.some((o) => dist(o.x, o.y, x, y) < 5)) continue;
        W.addObj(Object.assign({ kind, x, y }, make())); if (kind === 'rock' || kind === 'ore') W.block[i] = 1; made++;
      }
    };
    const want = (kind, perDay) => Math.min(perDay, Math.ceil(Math.max(0, (T[kind] || 0) - count(kind)) * 0.3));
    spawn('flower', want('flower', 10), () => ({ sheet: 1 + Math.floor(r() * 5), row: Math.floor(r() * 10), ph: r() * 6 }));
    spawn('mushroom', want('mushroom', 4), () => ({ v: 1 + Math.floor(r() * 6), ph: r() * 6 }));
    spawn('rock', want('rock', 4), () => ({ v: 1 + Math.floor(r() * 9) }));
    spawn('ore', want('ore', 2), () => ({ v: oreType(r()) }));
    // a few new saplings appear in the woods when trees have been dug out
    for (let k = 0, made = 0, n = want('tree', 3); k < 200 && made < n; k++) {
      const x = 1 + Math.floor(r() * (W.W - 2)), y = 1 + Math.floor(r() * (W.H - 2)), i = W.idx(x, y);
      if (W.ter[i] !== GRASS || W.path[i] || W.soil[i] || W.dug[i] || W.block[i] || W.objAt.has(i) || this.thingAt(x, y) || dist(x, y, W.farm.x, W.farm.y) < 15 * W.s) continue;
      if (!W.nearType(x, y, 2, () => false) && !W.objs.some((o) => o.kind === 'tree' && Math.abs(o.x - x) <= 3 && Math.abs(o.y - y) <= 3)) continue;   // next to other trees
      const t = W.addTree(x, y, r); t.size = 'Small'; t.nextGrow = this.now() + 1440 * 0.7; made++;
    }
    this.makeFishSpots();
  },

  // ---------------------------------------------------------- tree timers
  now() { return this.day * 1440 + this.time; },
  untilText(t) { const m = Math.max(0, t - this.now()); return m >= 1440 ? `${Math.round(m / 1440)} day${m >= 2160 ? 's' : ''}` : m >= 60 ? `${Math.round(m / 60)}h` : 'a moment'; },
  // stumps sprout, saplings grow up: checked every couple of seconds
  growTrees(dt) {
    this.growT = (this.growT || 0) + dt; if (this.growT < 2) return; this.growT = 0;
    const now = this.now();
    for (const o of this.world.objs) {
      if (o.kind !== 'tree') continue;
      if (o.stump && !o.regrowAt) o.regrowAt = now + 1440 * 0.6;
      if (o.stump && o.regrowAt && now >= o.regrowAt) {
        o.stump = false; o.size = 'Small'; o.nextGrow = now + 1440 * 0.7; o.regrowAt = null;
        this.puff(o.x + 0.5, o.y + 0.8, '#8fd16a', 8);
      } else if (!o.stump && o.nextGrow && now >= o.nextGrow) {
        if (o.size === 'Small') { o.size = 'Medium'; o.nextGrow = (o.tree !== 'Fruit' && (o.wasSize === 'Big' || Math.random() < 0.4)) ? now + 1440 : null; }
        else if (o.size === 'Medium') { o.size = 'Big'; o.nextGrow = null; }
        else o.nextGrow = null;
        this.puff(o.x + 0.5, o.y - 0.5, '#8fd16a', 6);
      }
    }
  },

  // ------------------------------------------------------------------ undo
  recordUndo(entry) { if (entry) { this.undoStack.push(entry); if (this.undoStack.length > 60) this.undoStack.shift(); } this.emit('undo'); },
  undo() {
    const e = this.undoStack.pop(); if (!e) { this.toast('Nothing to undo.'); return false; }
    if (e.scene) return e.scene.undo(e);
    const W = this.world;
    if (e.type === 'place') {
      const o = e.o;
      if (DEF[o.id].home && this.animals.some((a) => a.home === o.uid)) { this.toast('Animals live there now, so it can\'t be undone.', 'bad'); return false; }
      this.stampThing(o, false); this.things = this.things.filter((q) => q !== o); this.put(o.id);
      this.puff(o.x + o.w / 2, o.y + o.h, '#ffffff', 8);
    } else if (e.type === 'pond') { if (this.thingAt(e.x, e.y, true)) return false; this.setPond(e.x, e.y, false); this.put('pond'); this.emit('changed'); }
    else if (e.type === 'unpond') { if (!(this.bag.pond > 0) || this.canPlace('pond', e.x, e.y)) return false; this.take('pond'); this.setPond(e.x, e.y, true); this.emit('changed'); }
    else if (e.type === 'soil') { const c = this.crops.get(W.idx(e.x, e.y)); if (c && c.g > 0) return false; if (c) this.seeds[c.c] = (this.seeds[c.c] || 0) + 1; this.setSoil(e.x, e.y, false); this.put('soil'); }
    else if (e.type === 'unsoil') { if (!(this.bag.soil > 0)) return false; this.take('soil'); this.setSoil(e.x, e.y, true); if (e.crop) this.crops.set(W.idx(e.x, e.y), e.crop); }
    else if (e.type === 'path') { this.setPath(e.x, e.y, false); this.put('path'); }
    else if (e.type === 'tree') { W.removeObj(e.o); this.put('sapling'); }
    else if (e.type === 'move') {
      const o = e.o, [fx, fy] = e.from; this.stampThing(o, false); this.things = this.things.filter((q) => q !== o);
      if (this.canDrop(o, fx, fy)) { this.things.push(o); this.stampThing(o, true); this.toast('Something is in the way of its old spot.', 'bad'); return false; }
      this.drop(o, fx, fy, null);
    } else if (e.type === 'store') {
      const o = e.o;
      for (let yy = o.y; yy < o.y + o.h; yy++) for (let xx = o.x; xx < o.x + o.w; xx++) if (this.thingAt(xx, yy) || W.block[W.idx(xx, yy)]) { this.toast('Something is in the way now, so it can\'t go back.', 'bad'); return false; }
      if (!(this.bag[o.id] > 0)) { this.toast('It\'s not in your bag any more.', 'bad'); return false; }
      this.take(o.id); W.clearArea(o.x, o.y, o.x + o.w - 1, o.y + o.h - 1); this.things.push(o); this.stampThing(o, true);
    }
    else if (e.type === 'remove') {
      const o = e.o;
      for (let yy = o.y; yy < o.y + o.h; yy++) for (let xx = o.x; xx < o.x + o.w; xx++) if (this.thingAt(xx, yy) || W.block[W.idx(xx, yy)]) { this.toast('Something is in the way now, so it can\'t come back.', 'bad'); return false; }
      W.clearArea(o.x, o.y, o.x + o.w - 1, o.y + o.h - 1); this.things.push(o); this.stampThing(o, true); this.coins -= Math.floor(DEF[o.id].price / 2);
      this.puff(o.x + o.w / 2, o.y + o.h, '#ffffff', 8);
    } else if (e.type === 'unpath') { if (!(this.bag.path > 0)) return false; this.take('path'); this.setPath(e.x, e.y, true); }
    else if (e.type === 'unobj') {
      const o = e.o, i = W.idx(o.x, o.y);
      if (W.objAt.has(i) || W.block[i] || this.thingAt(o.x, o.y)) { this.toast('Something is in the way now.', 'bad'); return false; }
      if (e.into) { if (!(this.bag[e.into] > 0)) return false; this.take(e.into); }
      W.addObj(o); if (['tree', 'rock', 'ore', 'bush', 'berry'].includes(o.kind)) W.block[i] = 1;
    }
    else if (e.type === 'untree') { if (!(this.bag.sapling > 0)) return false; this.take('sapling'); const o = W.addTree(e.o.x, e.o.y, Math.random); Object.assign(o, e.o); }
    this.sfx('pop'); this.stats.undos = (this.stats.undos || 0) + 1; this.emit('changed'); this.emit('undo');
    return true;
  },
});
