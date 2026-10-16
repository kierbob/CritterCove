// ---------------------------------------------------------------- people
// Characters use 64x64 frames: rows 0-2 idle (down, side, up), rows 3-5 walk.
// Side views face right. The player is stacked from several layer sheets.
const LOOKS = (() => {
  const keys = Object.keys(SPRITES);
  const list = (re) => keys.filter((k) => re.test(k)).sort();
  return {
    hair: list(/^Player\/Head\/Hair_\d\//),
    shirt: list(/^Player\/Chest\/[A-Za-z]+_Shirt\//),
    pants: list(/^Player\/Legs\/[A-Za-z]+_Pants\//),
    shoes: list(/^Player\/Feet\//),
    hat: [null, ...list(/^Player\/Accessories\//)],
  };
})();
const lookName = (k) => k ? k.split('/').pop().replace(/_\d_/, ' ').replace(/_/g, ' ').replace(/Hair \d? ?/, '').replace(/Shirt|Pants/, '').trim() : 'None';

class Person {
  constructor(x, y, layers) {
    this.x = x; this.y = y; this.layers = layers; this.dir = 'down'; this.flip = false;
    this.moving = false; this.t = 0; this.speed = 4.2; this.path = null;
  }
  get di() { return this.dir === 'down' ? 0 : this.dir === 'up' ? 2 : 1; }
  frameRow() { return (this.moving ? 3 : 0) + this.di; }
  draw(R, t) {
    let row = this.frameRow(), f = Math.floor((this.moving ? this.t * 10 : t * 5)) % 6, tool = null;
    const A = this.act;
    if (A) {
      const T = ACTS[A.kind], n = T.frames, fr = Math.floor(A.t * T.fps);
      f = T.loop ? fr % n : Math.min(n - 1, fr % (A.hold ? 1e9 : n));
      if (A.hold) f = Math.min(n - 1, fr);
      if (A.frame !== undefined) f = A.frame;
      row = T.row + this.di;
      if (T.tool) tool = [T.tool, T.toolRow + this.di];
    }
    if (tool && this.dir === 'up') R.spr(tool[0], f * 64, tool[1] * 64, 64, 64, this.x, this.y, { oy: 23, flip: this.flip });
    for (const k of this.layers) if (k) R.spr(k, f * 64, row * 64, 64, 64, this.x, this.y, { oy: 23, flip: this.flip });
    if (tool && this.dir !== 'up') R.spr(tool[0], f * 64, tool[1] * 64, 64, 64, this.x, this.y, { oy: 23, flip: this.flip });
  }
  face(dx, dy) {
    if (Math.abs(dx) > Math.abs(dy) * 0.8) { this.dir = 'side'; this.flip = dx < 0; }
    else this.dir = dy < 0 ? 'up' : 'down';
  }
}

// actions: rows in the packed player sheets + the tool overlay drawn on top
const ACTS = {
  chop: { row: 6, frames: 6, fps: 12, tool: 'Player/Tools/Iron/Iron_Tools', toolRow: 0 },
  mine: { row: 9, frames: 6, fps: 12, tool: 'Player/Tools/Iron/Iron_Tools', toolRow: 3 },
  cast: { row: 12, frames: 9, fps: 14, tool: 'Player/Tools/Fishing_Rod/Wooden_Fishing_Rod', toolRow: 0 },
  reel: { row: 15, frames: 8, fps: 12, tool: 'Player/Tools/Fishing_Rod/Wooden_Fishing_Rod', toolRow: 3 },
  pick: { row: 3, frames: 6, fps: 10 },
  hoe: { row: 9, frames: 6, fps: 14, tool: 'Player/Tools/Iron/Iron_Tools', toolRow: 3 },   // the pack has no hoe: dig with the pickaxe
  water: { row: 18, frames: 6, fps: 10, tool: 'Player/Tools/Iron/Iron_Tools', toolRow: 9 },
};
// keyboard + click-to-walk movement with collision against the world grid
class Player extends Person {
  constructor(x, y, look) { super(x, y, []); this.setLook(look); }
  setLook(look) {
    this.look = look;
    this.layers = ['Player/Player_Base/Player_Base_animations', look.shoes, look.pants, look.shirt, look.hair, look.hat];
  }
  update(dt, game, input) {
    if (this.act) {
      const A = this.act; A.t += dt; this.moving = false;
      if (A.update) A.update(dt, A);
      if (A.dur && A.t >= A.dur) { this.act = null; if (A.done) A.done(); }
      // walking cancels whatever you were doing
      if ((input.left || input.right || input.up || input.down || input.ax || input.ay) && A.cancelable !== false) { this.act = null; if (A.cancel) A.cancel(); }
      else return;
    }
    let dx = 0, dy = 0;
    if (input.left) dx -= 1; if (input.right) dx += 1; if (input.up) dy -= 1; if (input.down) dy += 1;
    if (input.ax || input.ay) { dx = input.ax; dy = input.ay; }   // the touch stick is analogue
    if (dx || dy) this.path = null;
    if (!dx && !dy && this.path && this.path.length) {
      const [tx, ty] = this.path[0]; const ex = tx + 0.5 - this.x, ey = ty + 0.6 - this.y, d = Math.hypot(ex, ey);
      if (d < 0.15) { this.path.shift(); if (!this.path.length) { this.path = null; if (this.onArrive) { const f = this.onArrive; this.onArrive = null; f(); } } }
      else { dx = ex / d; dy = ey / d; }
    }
    this.moving = !!(dx || dy);
    if (this.moving) {
      const l = Math.hypot(dx, dy); dx /= l; dy /= l;
      const sp = this.speed * dt;
      this.face(dx, dy);
      const W = game.world, rad = 0.28;
      const free = (x, y) => W.walkP(Math.floor(x - rad), Math.floor(y)) && W.walkP(Math.floor(x + rad), Math.floor(y)) && W.walkP(Math.floor(x - rad), Math.floor(y - 0.25)) && W.walkP(Math.floor(x + rad), Math.floor(y - 0.25));
      const nx = this.x + dx * sp, ny = this.y + dy * sp;
      if (free(nx, this.y)) this.x = nx; else if (this.path) { this.path = null; }
      if (free(this.x, ny)) this.y = ny; else if (this.path) { this.path = null; }
      this.t += dt;
      if (Math.random() < dt * 3 && game.world.get(Math.floor(this.x), Math.floor(this.y)) === SAND) game.puff(this.x, this.y, '#e4c79a');
    }
  }
}

// A* on the tile grid (8-way, no corner cutting)
function findPath(world, sx, sy, tx, ty, maxN = 6000, near = 0, canWalk = null) {
  const ok = canWalk || ((x, y) => world.walkable(x, y));
  const W = world.W, H = world.H, key = (x, y) => y * W + x;
  if (!world.inb(tx, ty)) return null;
  const goalOk = (x, y) => near ? Math.max(Math.abs(x - tx), Math.abs(y - ty)) <= near : x === tx && y === ty;
  const g = new Map(), from = new Map(), open = new Heap();
  const s = key(sx, sy); g.set(s, 0); open.push(0, s);
  let n = 0, best = null;
  while (open.size && n++ < maxN) {
    const c = open.pop(), cx = c % W, cy = (c / W) | 0;
    if (goalOk(cx, cy) && (ok(cx, cy) || c === s)) { best = c; break; }
    for (let k = 0; k < 8; k++) {
      const dx = [1, -1, 0, 0, 1, 1, -1, -1][k], dy = [0, 0, 1, -1, 1, -1, 1, -1][k];
      const nx = cx + dx, ny = cy + dy;
      if (!ok(nx, ny)) continue;
      if (dx && dy && (!ok(cx + dx, cy) || !ok(cx, cy + dy))) continue;
      const nk = key(nx, ny), ng = g.get(c) + (dx && dy ? 1.414 : 1);
      if (g.has(nk) && g.get(nk) <= ng) continue;
      g.set(nk, ng); from.set(nk, c);
      open.push(ng + Math.hypot(nx - tx, ny - ty), nk);
    }
  }
  if (best === null) return null;
  const out = []; for (let c = best; c !== s; c = from.get(c)) out.push([c % W, (c / W) | 0]);
  return out.reverse();
}
