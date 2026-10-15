// --------------------------------------------------------------- animals
// bottom row of the opaque pixels in a sheet's first frame, so feet sit on the ground
const footCache = new Map();
function footRow(key, fw, fh) {
  if (footCache.has(key)) return footCache.get(key);
  const im = IMG[key]; if (!im) return fh;
  const c = document.createElement('canvas'); c.width = fw; c.height = fh; const g = c.getContext('2d');
  g.drawImage(im, 0, 0, fw, fh, 0, 0, fw, fh); const d = g.getImageData(0, 0, fw, fh).data;
  let b = 0; for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) if (d[(y * fw + x) * 4 + 3]) b = y + 1;
  footCache.set(key, b); return b;
}
const ANIMAL_NAMES = ['Biscuit', 'Clover', 'Daisy', 'Pebble', 'Maple', 'Nugget', 'Waffles', 'Pip', 'Bramble', 'Hazel', 'Mochi', 'Peanut', 'Juniper', 'Toffee',
  'Button', 'Sprout', 'Poppy', 'Fudge', 'Bean', 'Marigold', 'Noodle', 'Pumpkin', 'Snowdrop', 'Tumble', 'Willow', 'Cocoa', 'Puddle', 'Honey', 'Acorn', 'Bluebell',
  'Dumpling', 'Ziggy', 'Lulu', 'Pancake', 'Sunny', 'Truffle', 'Basil', 'Olive', 'Ginger', 'Marshmallow', 'Pickles', 'Rosie', 'Buttons', 'Fern', 'Cookie'];
let animalId = 1;

class Animal {
  constructor(sk, color, x, y, opts = {}) {
    this.id = opts.id || animalId++; animalId = Math.max(animalId, this.id + 1);
    this.sk = sk; this.sp = SPECIES[sk]; this.color = color;
    this.x = x; this.y = y; this.flip = Math.random() < 0.5; this.dir = 'side';
    this.name = opts.name || pick(ANIMAL_NAMES);
    this.age = opts.age ?? 4; this.friend = opts.friend ?? 0;        // days old, hearts 0..5
    this.hunger = opts.hunger ?? 0.2; this.thirst = opts.thirst ?? 0.2;
    this.happy = opts.happy ?? 0.6; this.petted = false; this.ate = 0; this.drank = 0;
    this.home = opts.home ?? null; this.adopted = !!opts.adopted; this.wild = !!this.sp.wild && !this.adopted; this.hx = opts.hx; this.hy = opts.hy; this.ready = opts.ready || false; this.muddy = opts.muddy || false;
    this.state = 'idle'; this.st = 0; this.t = Math.random() * 10; this.anim = 0; this.path = null; this.target = null;
    this.think = Math.random() * 2; this.bubble = null;
  }
  get baby() { return !this.wild && !this.adopted && this.age < 3; }
  get col() { return this.sp.colors[this.color]; }
  get key() { return this.sp.muddy && this.muddy ? this.col.mud : this.col.key; }
  canWalk(world, x, y, gates) {
    if (this.sp.waterOnly) return world.isPond(x, y) && !world.block[world.idx(x, y)];
    if (gates && world.inb(x, y) && world.block[world.idx(x, y)] === 2 && world.get(x, y) !== WATER) return true;   // through a gate
    return world.walkable(x, y) || (this.sp.swims && world.isPond(x, y) && !world.block[world.idx(x, y)]);
  }
  inWater(world) { return world.isPond(Math.floor(this.x), Math.floor(this.y)); }

  // purposeful trips (food, water, home) may use gates; idle wandering doesn't
  goTo(game, tx, ty, near = 0, gates = false) {
    const W = game.world, p = findPath(W, Math.floor(this.x), Math.floor(this.y), tx, ty, 2500, near, (x, y) => this.canWalk(W, x, y, gates));
    if (p) { this.path = p; this.state = 'walk'; return true; }
    return false;
  }
  step(dt) {
    if (!this.path || !this.path.length) return true;
    const [tx, ty] = this.path[0], ex = tx + 0.5 - this.x, ey = ty + 0.55 - this.y, d = Math.hypot(ex, ey);
    const sp = this.sp.speed * (this.baby ? 0.8 : 1) * (this.running ? 2 : 1) * dt;
    if (d <= sp) { this.x = tx + 0.5; this.y = ty + 0.55; this.path.shift(); }
    else { this.x += ex / d * sp; this.y += ey / d * sp; this.faceTo(ex, ey); }
    return !this.path.length;
  }
  faceTo(dx, dy) {
    if (Math.abs(dx) > 0.05) this.flip = this.sp.facesRight ? dx < 0 : dx > 0;   // most sheets face left, the mouse faces right
    if (this.sp.layout === QUAD) this.dir = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'side' : dy < 0 ? 'up' : 'down';
  }
  say(icon, dur = 3) { this.bubble = { icon, t: dur }; }

  // ------------------------------------------------------------ brain
  update(dt, game) {
    this.t += dt; this.anim += dt; this.think -= dt;
    if (this.bubble) { this.bubble.t -= dt; if (this.bubble.t <= 0) this.bubble = null; }
    if (this.sp.special === 'capy') return this.updateCapy(dt, game);
    const night = game.isNight(), rain = game.weather.rain > 0.3;
    if (!this.wild && !this.adopted) {
      const rate = dt / game.DAY_SEC;                       // fraction of a day
      this.hunger = clamp(this.hunger + rate * 1.8, 0, 1);
      this.thirst = clamp(this.thirst + rate * (rain ? 0.3 : 2.2), 0, 1);
    }
    switch (this.state) {
      case 'walk': if (this.step(dt)) this.arrive(game); return;
      case 'eat': case 'drink': case 'graze': case 'pet': case 'croak': case 'snack':
        this.st -= dt;
        if (this.state === 'graze') this.hunger = Math.max(0, this.hunger - dt * 0.012);
        if (this.st <= 0) this.state = 'idle';
        return;
      case 'lieDown': this.st -= dt; if (this.st <= 0) { this.state = 'sleep'; this.anim = 0; } return;
      case 'sleep': if (!night && !(rain && this.near(game, 'home'))) { this.state = 'getUp'; this.anim = 0; this.st = 0.6; } return;
      case 'getUp': this.st -= dt; if (this.st <= 0) this.state = 'idle'; return;
    }
    // idle: decide every few seconds
    if (this.think > 0) return;
    this.think = 1.5 + Math.random() * 3;
    if (this.wild || this.adopted) return this.wildThink(game);
    const home = game.homeOf(this);
    if (night || rain) {
      if (home && dist(this.x, this.y, home.door[0] + 0.5, home.door[1] + 0.5) > 2.5) { const s = game.homeSpot(home, this); if (this.goTo(game, s[0], s[1], 1, true)) { this.after = 'sleep'; return; } }
      if (night || rain) { this.state = 'lieDown'; this.anim = 0; this.st = 0.5; return; }
    }
    if (this.thirst > 0.45) { const tr = game.nearestFeeder(this, 'trough'); if (tr) { const s = game.standBy(tr, this); if (s && this.goTo(game, s[0], s[1], 0, true)) { this.after = 'drink'; this.target = tr; return; } } }
    if (this.hunger > 0.45) { const fd = game.nearestFeeder(this, 'feeder'); if (fd) { const s = game.standBy(fd, this); if (s && this.goTo(game, s[0], s[1], 0, true)) { this.after = 'eat'; this.target = fd; return; } } }
    if (this.hunger > 0.3 && Math.random() < 0.5) { this.state = 'graze'; this.anim = 0; this.st = 3 + Math.random() * 3; this.say(null); return; }
    // pigs love a good mud roll near water
    if (this.sp.muddy && !this.muddy && Math.random() < 0.06 && game.world.nearType(Math.floor(this.x), Math.floor(this.y), 3, (q, x, y) => game.world.isPond(x, y))) { this.muddy = true; game.puff(this.x, this.y, '#7a4a30', 6); }
    // pigs root around for truffles
    if (this.sk === 'pig' && !this.baby && this.happy > 0.5 && Math.random() < 0.02 && game.dayTruffles < 3) { game.dropItem('truffle', this.x, this.y + 0.2); game.dayTruffles++; this.say('truffle', 2); }
    // wander near home (or anywhere on the farm)
    const r = Math.random();
    if (r < 0.55) {
      const cx = home ? home.door[0] : this.x, cy = home ? home.door[1] + 3 : this.y, R = this.sp.swims && Math.random() < 0.5 ? 12 : 7;
      for (let k = 0; k < 8; k++) {
        const tx = Math.floor(cx + (Math.random() * 2 - 1) * R), ty = Math.floor(cy + (Math.random() * 2 - 1) * R);
        if (this.canWalk(game.world, tx, ty) && this.goTo(game, tx, ty)) { this.after = null; return; }
      }
    } else if (r < 0.75) { this.state = 'graze'; this.anim = 0; this.st = 2 + Math.random() * 3; }
  }
  near(game, what) { const h = game.homeOf(this); return h && dist(this.x, this.y, h.door[0] + 0.5, h.door[1] + 0.5) < 3; }
  arrive(game) {
    const a = this.after; this.after = null; this.state = 'idle'; this.anim = 0;
    if (a === 'sleep') { this.state = 'lieDown'; this.st = 0.5; }
    else if (a === 'eat' || a === 'drink') {
      const f = this.target; this.target = null;
      if (f && f.amount > 0 && dist(this.x, this.y, f.x + 0.5, f.y + 0.5) < 2.2) {
        f.amount--; this.state = a; this.st = 3; this.anim = 0;
        this.faceTo(f.x + 0.5 - this.x, f.y + 0.5 - this.y);
        if (a === 'eat') { this.hunger = 0; this.ate++; } else { this.thirst = 0; this.drank++; }
      } else this.say(a === 'eat' ? 'hungry' : 'thirsty', 2.5);
    }
  }
  wildThink(game) {
    const W = game.world;
    if (this.sk === 'frog') {
      const r = Math.random();
      if (r < 0.3) { this.state = 'croak'; this.anim = 0; this.st = 1.6; if (game.near(this, 6)) game.sfx('croak'); }
      else if (r < 0.45) { this.state = 'snack'; this.anim = 0; this.st = 2.1; }
      return;
    }
    if (this.sk === 'mouse' && this.wild && game.near(this, 2.2) && !this.befriended) { this.running = true; }
    // adopted critters stay close to the home you made them
    const R = this.adopted ? (this.sk === 'swan' ? 4 : 3) : this.sk === 'swan' ? 6 : 8;
    const cx = this.adopted && this.hx != null ? this.hx : this.x, cy = this.adopted && this.hy != null ? this.hy : this.y;
    for (let k = 0; k < 6; k++) {
      const tx = Math.floor(cx + (Math.random() * 2 - 1) * R), ty = Math.floor(cy + (Math.random() * 2 - 1) * R);
      if (this.canWalk(W, tx, ty) && this.goTo(game, tx, ty)) { this.after = null; break; }
    }
    if (this.state !== 'walk') { this.running = false; if (this.sk === 'mouse' && Math.random() < 0.4) { this.state = 'snack'; this.anim = 0; this.st = 2.5; } }
  }
  updateCapy(dt, game) {
    // capybaras bob in the pond: mostly resting and looking around, now and then
    // a dive, a little swim underwater (just bubbles) and a pop up nearby
    this.st -= dt;
    if (this.capy === 'Under') {
      const ex = this.tx - this.x, ey = this.ty - this.y, d = Math.hypot(ex, ey);
      if (d > 0.05) { const sp = Math.min(d, dt * 1.2); this.x += ex / d * sp; this.y += ey / d * sp; }
      if (Math.random() < dt * 4) game.fx.push({ x: this.x + (Math.random() - 0.5) * 0.4, y: this.y - 0.2, vx: 0, vy: -0.4, t: 0, life: 0.6, col: '#bfe8ff', s: 1 });
    }
    if (this.st > 0) return;
    const next = { Idle: ['Idle', 'Idle', 'LookAround', 'LookAround', 'Bubbles', 'Dive'], LookAround: ['Idle'], Bubbles: ['Idle'], Dive: ['Under'], Under: ['Emerge'], Emerge: ['Idle'] };
    const cur = this.capy || 'Idle', nxt = pick(next[cur]);
    if (nxt === 'Under') {
      // pick a spot in the pond a few tiles away to come up again
      const W = game.world; this.tx = this.x; this.ty = this.y;
      for (let k = 0; k < 20; k++) { const tx = Math.floor(this.x + (Math.random() * 2 - 1) * 3), ty = Math.floor(this.y + (Math.random() * 2 - 1) * 2); if (W.isPond(tx, ty) && !W.nearType(tx, ty, 1, (q) => q !== WATER)) { this.tx = tx + 0.5; this.ty = ty + 0.6; break; } }
      this.capy = 'Under'; this.anim = 0; this.st = 1.5 + Math.random() * 1.5; return;
    }
    this.capy = nxt; this.anim = 0;
    const im = IMG[this.col.key + nxt], n = im ? im.width / 32 : 8;
    this.st = nxt === 'Idle' ? 2 + Math.random() * 3 : n / 8;
  }

  // ------------------------------------------------------------- draw
  draw(R, t, game) {
    if (this.sp.special === 'capy') {
      if (this.capy === 'Under') return;
      const k = this.col.key + (this.capy || 'Idle'), im = IMG[k]; if (!im) return;
      const n = im.width / 32, cap = this.capy || 'Idle', f = cap === 'Idle' ? Math.floor(this.anim * 6) % n : Math.min(n - 1, Math.floor(this.anim * 8));
      R.spr(k, f * 32, 0, 32, 32, this.x, this.y, { oy: 6 });
      return;
    }
    const L = this.sp.layout, key = this.key, im = IMG[key]; if (!im) return;
    const frames = rowFrames(key, L.fw, L.fh);
    const di = L === QUAD ? (this.dir === 'down' ? 1 : this.dir === 'up' ? 2 : 0) : 0;
    const water = this.sp.swims && this.inWater(game.world);
    let row, fps = 7, loop = true;
    const moving = this.state === 'walk';
    if (water && L.swim !== undefined) row = this.state === 'sleep' ? L.swimSleep : moving ? L.swim : L.swimIdle;
    else if (moving) { row = L.walk[di] ?? L.walk[0]; fps = 9 * (this.running ? 1.6 : 1); }
    else if (this.state === 'eat' || this.state === 'graze' || this.state === 'drink' || this.state === 'snack') row = L.eat;
    else if (this.state === 'croak' || (this.state === 'pet' && L.extra !== undefined)) row = L.extra ?? L.idle[0];
    else if (this.state === 'lieDown') { row = L.lieDown ?? L.idle[0]; loop = false; }
    else if (this.state === 'getUp') { row = L.getUp ?? L.idle[0]; loop = false; }
    else if (this.state === 'sleep') { row = L.sleep ?? L.idle[0]; fps = 4; }
    else { row = L.idle[di] ?? L.idle[0]; fps = 3; }
    const n = Math.max(1, frames[row] || 1);
    let f = Math.floor(this.anim * fps); f = loop ? f % n : Math.min(f, n - 1);
    const scale = this.baby ? 0.7 : 1, foot = footRow(key, L.fw, L.fh);
    // little hop when happy after a pat
    const hop = this.state === 'pet' ? Math.abs(Math.sin(this.anim * 9)) * 3 : 0;
    R.spr(key, f * L.fw, row * L.fh, L.fw, L.fh, this.x, this.y, { oy: (L.fh - foot) * scale - hop, flip: this.flip, scale });
  }
}
