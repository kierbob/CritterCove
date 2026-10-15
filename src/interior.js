// ------------------------------------------------------------- interiors
// Click a cottage door: fade to black, and you're inside a room floating in a
// black void. Furniture comes from the pack's House_Decor sheets and is placed
// with the same build mode as outside. Sleep in a bed to end the day.
const ROOM_SIZES = [[9, 6], [10, 6], [12, 7], [12, 7], [14, 8]];     // by cottage style
const WALL_ROWS = 3;
// wall styles: columns of Interior_Walls rows 3-5 that repeat along the wall
const WALL_STYLES = [{ n: 'Wooden', cols: [3] }, { n: 'Stone', cols: [4] }, { n: 'Brick', cols: [5] }, { n: 'Plaster', cols: [1] },
  { n: 'Framed plaster', cols: [6, 7] }, { n: 'Framed wood', cols: [8, 9] }, { n: 'Framed stone', cols: [10, 11] }, { n: 'Framed brick', cols: [12, 13] }];
const FLOOR_STYLES = 16;
const ROOM_MAX = 6;   // times a room can be expanded   // 2x2 patterns in Wood_Floor_Tiles (4 across, 4 down)

// every furniture type becomes a buildable item in the "Home" category
for (const F of FURN) {
  def(F.id, {
    name: F.name, cat: 'home', price: F.price, w: F.w, h: F.d, variants: F.rects.length, beauty: 1,
    dims: F.fit ? (v) => [Math.max(1, Math.round(F.rects[v % F.rects.length][2] / 16)), 1] : null,
    block: F.rug || F.wall || F.small ? 0 : 1, rug: !!F.rug, wallItem: !!F.wall, bed: !!F.bed, light: !!F.light, furn: F,
    vname: (v) => `Style ${v + 1} of ${F.rects.length}`,
    draw: (R, o) => { const r = F.rects[o.v % F.rects.length]; R.spr(F.sheet, r[0], r[1], r[2], r[3], o.x + o.w / 2, o.y + o.h, { oy: F.wall ? -4 : 0 }); },
  });
}

class Room {
  constructor(game, house) {
    this.game = game; this.house = house;
    if (!house.room) {
      const [w, h] = ROOM_SIZES[Math.floor(house.v / 9)] || ROOM_SIZES[0];
      house.room = { w, h, floor: 1, wall: 0, items: [] };
      this.data = house.room; this.restamp();
      // a cosy start: a bed, a rug, a window, a lamp and a plant
      const put = (id, x, y, v) => { if (!this.canPlace(id, x, y, v, true)) this.place(id, x, y, v, true); };
      put('sbed', 1, WALL_ROWS, 2); put('rug', Math.floor(w / 2) - 1, WALL_ROWS + Math.floor(h / 2) - 1, 3);
      put('window', Math.floor(w / 2), 1, 0); put('floorlamp', w - 2, WALL_ROWS, 0); put('plant', w - 1, WALL_ROWS, 0);
    }
    this.data = house.room;
    this.data.items = this.data.items.filter((o) => DEF[o.id]);   // pieces that no longer exist
    this.restamp();
  }
  get W() { return this.data.w; }
  get H() { return this.data.h + WALL_ROWS; }
  get things() { return this.data.items; }
  get door() { return [Math.floor(this.data.w / 2), this.H - 1]; }
  inb(x, y) { return x >= 0 && y >= 0 && x < this.W && y < this.H; }
  idx(x, y) { return y * this.W + x; }
  restamp() {
    this.block = new Uint8Array(this.W * this.H);
    for (let x = 0; x < this.W; x++) for (let y = 0; y < WALL_ROWS; y++) this.block[this.idx(x, y)] = 1;
    for (const o of this.data.items) this.stamp(o, true);
  }
  stamp(o, on) { const D = DEF[o.id]; if (!D.block) return; for (let y = o.y; y < o.y + o.h; y++) for (let x = o.x; x < o.x + o.w; x++) if (this.inb(x, y) && y >= WALL_ROWS) this.block[this.idx(x, y)] = on ? 1 : 0; }
  // the world-ish API the player and pathfinding use
  walkable(x, y) { return this.inb(x, y) && !this.block[this.idx(x, y)]; }
  walkP(x, y) { return this.walkable(x, y); }
  get(x, y) { return GRASS; }
  isPond() { return false; }
  nearType() { return false; }

  // ---------------------------------------------------- the build API
  dims(id, v) { return this.game.dims(id, v); }
  canPlace(id, x, y, v = 0, free = false) {
    const D = DEF[id], [w, h] = this.dims(id, v);
    if (D.cat !== 'home') return 'That goes outside!';
    if (!free && !this.game.ignoreBag && !(this.game.bag[id] > 0)) return `No ${D.name.toLowerCase()} in your bag: buy more at the shop`;
    if (x < 0 || x + w > this.W || y + h > this.H || y < 0) return 'Doesn\'t fit there';
    if (D.wallItem) { if (y + h > WALL_ROWS || y < 1) return 'Windows and clocks go on the wall'; }
    else if (y < WALL_ROWS) return 'That goes on the floor';
    const [dx, dy] = this.door;
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
      for (const o of this.data.items) {
        if (xx < o.x || xx >= o.x + o.w || yy < o.y || yy >= o.y + o.h) continue;
        const O = DEF[o.id], small = (X) => X.furn && X.furn.small;
        // layers: rugs under everything, furniture on the floor, little things can sit on furniture, wall things on walls
        const clash = D.rug ? O.rug : D.wallItem ? O.wallItem : small(D) ? small(O) : (O.block || small(O));
        if (clash) return 'Something is in the way';
      }
      if (D.block && xx === dx && yy === dy) return 'Keep the doorway clear';
      if (D.block && Math.floor(this.game.player.x) === xx && Math.floor(this.game.player.y) === yy) return 'You are standing there';
    }
    return null;
  }
  place(id, x, y, v = 0, free = false) {
    const [w, h] = this.dims(id, v);
    const o = { uid: (this.game.nextUid = (this.game.nextUid || 1) + 1), id, x, y, v, w, h };
    this.data.items.push(o); this.stamp(o, true);
    if (!free) { this.game.take(id); this.game.puff(x + w / 2, y + h, '#ffffff', 6); this.game.sfx('place'); this.game.recordUndo({ type: 'place', o, scene: this }); this.game.stats.built = (this.game.stats.built || 0) + 1; }
    return o;
  }
  thingAt(x, y) {
    // furniture first, rugs underneath last
    let rug = null;
    for (let i = this.data.items.length - 1; i >= 0; i--) { const o = this.data.items[i]; if (x >= o.x && x < o.x + o.w && y >= o.y && y < o.y + o.h) { if (DEF[o.id].rug) rug = rug || o; else return o; } }
    return rug;
  }
  thingVisualAt(fx, fy) {
    let best = null;
    for (const o of this.data.items) {
      if (DEF[o.id].rug) continue;
      const r = DEF[o.id].furn.rects[o.v % DEF[o.id].furn.rects.length], tall = Math.max(0, Math.ceil(r[3] / 16) - o.h);
      if (fx >= o.x && fx < o.x + o.w && fy >= o.y - tall && fy < o.y + o.h) if (!best || o.y > best.y) best = o;
    }
    return best || this.thingAt(Math.floor(fx), Math.floor(fy));
  }
  lift(o) { this.stamp(o, false); this.data.items = this.data.items.filter((q) => q !== o); return true; }
  canDrop(o, x, y) { this.game.ignoreBag = true; const why = this.canPlace(o.id, x, y, o.v); this.game.ignoreBag = false; return why; }
  drop(o, x, y, from) { o.x = x; o.y = y; this.data.items.push(o); this.stamp(o, true); if (from) this.game.recordUndo({ type: 'move', o, from, scene: this }); this.game.puff(x + o.w / 2, y + o.h, '#ffffff', 6); this.game.sfx('place'); }
  store(o) { this.lift(o); this.game.put(o.id); this.game.recordUndo({ type: 'store', o, scene: this }); this.game.sfx('pop'); }
  remove(o) { this.lift(o); this.game.coins += Math.floor(DEF[o.id].price / 2); this.game.recordUndo({ type: 'remove', o, scene: this }); this.game.sfx('pop'); this.game.emit('changed'); }
  drawThing(R, o, t) { DEF[o.id].draw(R, o, t, this.game); }
  undo(e) {
    const o = e.o, g = this.game;
    if (e.type === 'place') { this.lift(o); g.put(o.id); }
    else if (e.type === 'store') { if (!(g.bag[o.id] > 0) || this.canDrop(o, o.x, o.y)) { g.toast('Something is in the way now.', 'bad'); return false; } g.take(o.id); this.data.items.push(o); this.stamp(o, true); }
    else if (e.type === 'remove') { if (this.canDrop(o, o.x, o.y)) { g.toast('Something is in the way now.', 'bad'); return false; } g.coins -= Math.floor(DEF[o.id].price / 2); this.data.items.push(o); this.stamp(o, true); }
    else if (e.type === 'move') { this.lift(o); if (this.canDrop(o, e.from[0], e.from[1])) { this.data.items.push(o); this.stamp(o, true); return false; } o.x = e.from[0]; o.y = e.from[1]; this.data.items.push(o); this.stamp(o, true); }
    g.sfx('pop'); g.stats.undos = (g.stats.undos || 0) + 1; g.emit('changed'); g.emit('undo');
    return true;
  }
  // knock out the walls: one tile wider on each side and one deeper, up to a big family home
  expandCost() { const n = this.data.grown || 0; return n >= ROOM_MAX ? 0 : [250, 500, 900, 1400, 2000, 2800][n] || 2800; }
  expand() {
    const cost = this.expandCost(), g = this.game;
    if (!cost) return 'Your house is as big as it gets!';
    if (g.coins < cost) return `You need ${cost} coins to expand`;
    g.coins -= cost; this.data.grown = (this.data.grown || 0) + 1;
    this.data.w += 2; this.data.h += 1;
    for (const o of this.data.items) o.x += 1;
    g.player.x += 1; if (g.player.path) g.player.path = null;
    this.restamp(); g.sfx('coin'); g.toast(`Your house got bigger! It's now ${this.data.w} × ${this.data.h}.`);
    g.emit('changed'); return null;
  }
  style(kind, d) {
    if (kind === 'floor') this.data.floor = (this.data.floor + d + FLOOR_STYLES) % FLOOR_STYLES;
    else this.data.wall = (this.data.wall + d + WALL_STYLES.length) % WALL_STYLES.length;
    this.game.sfx('place');
  }

  // ------------------------------------------------------------ drawing
  draw(R, t) {
    const g = R.g, W = this.W, H = this.H, F = this.data.floor, ws = WALL_STYLES[this.data.wall];
    g.fillStyle = '#000'; g.fillRect(0, 0, R.W, R.H);
    // floor
    const fx = (F % 4) * 32, fy = Math.floor(F / 4) * 32;
    for (let y = WALL_ROWS; y < H; y++) for (let x = 0; x < W; x++) R.tile('Buildings/Houses_Interiors/Wood_Floor_Tiles', fx + (x % 2) * 16, fy + (y % 2) * 16, x, y);
    // back wall
    for (let x = 0; x < W; x++) { const c = ws.cols[x % ws.cols.length]; for (let y = 0; y < WALL_ROWS; y++) R.tile('Buildings/Houses_Interiors/Interior_Walls', c * 16, (3 + y) * 16, x, y); }
    // shadow where the wall meets the floor
    g.fillStyle = 'rgba(40,20,10,0.28)'; g.fillRect(R.sx(0), R.sy(WALL_ROWS), R.sx(W) - R.sx(0), Math.round(3 * R.Z));
    // a wooden frame around the whole room, with a gap for the door
    const Z = R.Z, th = Math.round(4 * Z), x0 = R.sx(0), y0 = R.sy(0), x1 = R.sx(W), y1 = R.sy(H), [dx] = this.door;
    const frame = (x, y, w, h) => { g.fillStyle = '#3b2418'; g.fillRect(x, y, w, h); g.fillStyle = '#8a5a3c'; g.fillRect(x + Z, y + Z, Math.max(0, w - 2 * Z), Math.max(0, h - 2 * Z)); };
    frame(x0 - th, y0 - th, x1 - x0 + 2 * th, th); frame(x0 - th, y0, th, y1 - y0 + th); frame(x1, y0, th, y1 - y0 + th);
    frame(x0 - th, y1, R.sx(dx) - x0 + th, th); frame(R.sx(dx + 1), y1, x1 + th - R.sx(dx + 1), th);
    // doormat
    R.spr('Buildings/House_Decor/Carpets', FURN.find((f) => f.id === 'runner').rects[2][0], FURN.find((f) => f.id === 'runner').rects[2][1], 30, 18, dx + 0.5, H, { scale: 0.6 });
  }
}

Object.assign(Game.prototype, {
  roomOf(house) { if (!house._room) house._room = new Room(this, house); return house._room; },
  scene() { return this.inside || this; },
  enterHouse(house) {
    this.fishing = null; this.player.act = null;
    const room = this.roomOf(house); this.inside = room; this.outsidePos = [this.player.x, this.player.y];
    this.player.x = room.door[0] + 0.5; this.player.y = room.door[1] + 0.6; this.player.dir = 'up'; this.player.path = null;
    this.sfx('door'); this.emit('scene', room);
  },
  exitHouse() {
    const h = this.inside.house; this.inside = null;
    this.player.x = h.door[0] + 0.5; this.player.y = h.door[1] + 0.8; this.player.dir = 'down'; this.player.path = null;
    this.sfx('door'); this.emit('scene', null);
  },
});
