// --------------------------------------------------------------- helpers
// Hire townsfolk to take on chores. Each one needs a helper's cottage to live
// in and a daily wage. You can watch them walk about and get on with their work.
const ROLES = {
  farmhand: { who: 'Bob', name: 'Farmhand', npc: 'Farmer_Bob', wage: 20, work: 6, desc: 'Refills hay feeders (pays the hay) and water troughs, and collects eggs from the nests.' },
  gardener: { who: 'Buba', name: 'Gardener', npc: 'Farmer_Buba', wage: 25, work: 10, desc: 'Waters your crops every day and picks the ripe ones into your basket.' },
  fisher: { who: 'Fin', name: 'Fisher', npc: 'Fisherman_Fin', wage: 15, work: 7, desc: 'Spends the day fishing and puts 3 to 5 fish in your basket.' },
  lumberjack: { who: 'Jack', name: 'Lumberjack', npc: 'Lumberjack_Jack', wage: 15, work: 7, desc: 'Chops a few big trees out in the woods (never on your farm) for logs.' },
  miner: { who: 'Mike', name: 'Miner', npc: 'Miner_Mike', wage: 15, work: 7, desc: 'Mines rocks and sparkly ores in the wild for stone and gems.' },
  shopkeeper: { who: 'Katy', name: 'Shopkeeper', npc: 'Bartender_Katy', wage: 10, work: 7, desc: 'Minds the market stall and sells everything in your basket at 5pm.' },
};
const ROLE_LIST = Object.keys(ROLES);
// a helper's cottage: the small wooden house, one helper each
def('hut', { name: 'Helper\'s cottage', cat: 'build', price: 150, h: 3, variants: 9, beauty: 4, door: true, light: true, hut: true,
  dims: () => [5, 3], vname: (v) => DEF.house.vname(v), desc: 'A home for one helper. Hire helpers in the Helpers tab.',
  draw: (R, o, t, G) => DEF.house.draw(R, o, t, G) });
TALL.hut = 4;

class Helper extends Person {
  constructor(role, home, x, y) {
    super(x, y, [`NPCs (Premade)/${ROLES[role].npc}`]);
    this.role = role; this.home = home; this.speed = 2.8; this.R = ROLES[role];
    this.task = null; this.doneToday = 0; this.paid = true; this.away = true; this.wait = Math.random() * 2; this.sold = false; this.status = 'Sleeping in';
  }
  get name() { return this.R.who; }
  // NPC sheets: 0-2 idle, 3-5 walk (down, side, up); a work row after that
  draw(R, t) {
    if (this.away) return;
    const key = this.layers[0], A = this.task && this.task.acting ? this.task : null;
    let row = (this.moving ? 3 : 0) + this.di, fps = this.moving ? 10 : 4;
    if (A) { row = A.row; fps = A.fps || 8; }
    const n = Math.max(1, rowFrames(key, 64, 64)[row] || 1);
    const f = Math.floor((A ? A.t : this.moving ? this.t : t) * fps) % n;
    R.spr(key, f * 64, row * 64, 64, 64, this.x, this.y, { oy: 23, flip: this.flip });
  }
}

Object.assign(Game.prototype, {
  hutOf(h) { return this.things.find((o) => o.uid === h.home); },
  freeHut() { return this.things.find((o) => o.id === 'hut' && !this.helpers.some((h) => h.home === o.uid)); },
  hire(role) {
    const R = ROLES[role];
    if (this.helpers.some((h) => h.role === role)) return `${R.who} already works for you`;
    const hut = this.freeHut(); if (!hut) return 'Build a helper\'s cottage first (Buildings tab): each helper needs a home';
    if (this.coins < R.wage) return `You need ${R.wage} coins to pay today's wage`;
    this.coins -= R.wage;
    const h = new Helper(role, hut.uid, hut.door[0] + 0.5, hut.door[1] + 0.6); h.away = false; h.status = 'Moving in';
    this.helpers.push(h); this.stats.hired = (this.stats.hired || 0) + 1;
    this.puff(h.x, h.y - 0.4, '#ffd6ec', 10); this.sfx('catch');
    this.toast(`${R.who} the ${R.name.toLowerCase()} moved into the cottage! Wage: ${R.wage} coins a day.`, 'good'); this.emit('changed');
    return null;
  },
  dismiss(role) {
    const h = this.helpers.find((q) => q.role === role); if (!h) return;
    this.helpers = this.helpers.filter((q) => q !== h); this.toast(`${h.name} packed up and waved goodbye.`); this.emit('changed');
  },
  // morning: pay everyone (or they stay home)
  payHelpers(report) {
    let paid = 0;
    for (const h of this.helpers) {
      h.doneToday = 0; h.sold = false; h.task = null; h.path = null; h.away = true; h.wait = 1 + Math.random() * 3;
      if (this.coins >= h.R.wage) { this.coins -= h.R.wage; paid += h.R.wage; h.paid = true; }
      else { h.paid = false; (report.unpaid = report.unpaid || []).push(h.name); }
      const hut = this.hutOf(h); if (hut) { h.x = hut.door[0] + 0.5; h.y = hut.door[1] + 0.6; }
    }
    report.wages = paid;
  },
  // run a helper's chore, quietly if it's far away from you
  helperDo(h, f) {
    const far = dist(h.x, h.y, this.player.x, this.player.y) > 12, n0 = this.items.length;
    if (far) this.muteSfx = true;
    try { f(); } finally { this.muteSfx = false; }
    // anything dropped goes straight into the basket
    const got = this.items.splice(n0); for (const it of got) this.give(it.item, 1);
    return got;
  },
  // what should this helper do next? a spot to stand, an animation and an effect
  planHelper(h) {
    const W = this.world, near = (list) => list.sort((a, b) => dist(a.x, a.y, h.x, h.y) - dist(b.x, b.y, h.x, h.y))[0];
    const awayFromFarm = (o) => dist(o.x, o.y, W.farm.x, W.farm.y) > 15 && !this.things.some((q) => dist(q.x, q.y, o.x, o.y) < 6);
    switch (h.role) {
      case 'farmhand': {
        const f = near(this.things.filter((o) => DEF[o.id].feeder && o.amount < DEF[o.id].cap * 0.6 && (DEF[o.id].feeder === 'trough' || this.coins >= 2)));
        if (f) return { tx: f.x, ty: f.y, row: 6, dur: 1.2, status: DEF[f.id].feeder === 'trough' ? 'Filling the water trough' : 'Refilling the hay', done: () => { if (DEF[f.id].feeder === 'feeder') { if (this.coins < 2) return; this.coins -= 2; } f.amount = DEF[f.id].cap; this.puff(f.x + 1, f.y + 0.6, DEF[f.id].feeder === 'trough' ? '#7fd3ff' : '#f2cf5b', 6); } };
        const n = near(this.things.filter((o) => o.id === 'nest' && o.eggs && o.eggs.length));
        if (n) return { tx: n.x, ty: n.y, row: 6, dur: 1, status: 'Collecting eggs', done: () => { for (const e of n.eggs) this.give(e.item, 1); this.stats.eggs += n.eggs.length; n.eggs = []; } };
        return null;
      }
      case 'gardener': {
        const crops = [...this.crops].map(([i, c]) => ({ i, c, x: i % W.W, y: (i / W.W) | 0 }));
        const ripe = near(crops.filter((q) => q.c.g >= CROP[q.c.c].days));
        if (ripe) return { tx: ripe.x, ty: ripe.y, row: 6, dur: 0.8, status: 'Picking crops', done: () => { const c = this.crops.get(ripe.i); if (!c || c.g < CROP[c.c].days) return; const C = CROP[c.c]; this.give(c.c, 1); if (C.regrow) c.g = C.days - C.regrow; else this.crops.delete(ripe.i); this.stats.harvested = (this.stats.harvested || 0) + 1; this.stats['h_' + c.c] = (this.stats['h_' + c.c] || 0) + 1; } };
        const dry = this.weather.rain < 0.3 && near(crops.filter((q) => !W.wet[q.i] && q.c.g < CROP[q.c.c].days));
        if (dry) return { tx: dry.x, ty: dry.y, row: 10, dur: 1.2, status: 'Watering the crops', done: () => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const j = W.idx(dry.x + dx, dry.y + dy); if (W.inb(dry.x + dx, dry.y + dy) && W.soil[j]) W.wet[j] = 1; } } };
        return null;
      }
      case 'fisher': {
        if (h.doneToday >= 4 + (h.home % 2)) return null;
        const s = near(this.fishSpots.slice()); if (!s) return null;
        return { tx: s.x, ty: s.y, near: 3, row: 8, fps: 6, dur: 6 + Math.random() * 6, status: 'Fishing', done: () => { const T = FISH[W.isPond(s.x, s.y) ? 'pond' : 'sea']; let r = Math.random() * T.reduce((a, b) => a + b[1], 0), fish = T[0][0]; for (const [k, w] of T) { r -= w; if (r <= 0) { fish = k; break; } } this.give(fish, 1); this.stats.fish++; h.doneToday++; } };
      }
      case 'lumberjack': {
        if (h.doneToday >= 3) return null;
        const t = near(W.objs.filter((o) => o.kind === 'tree' && !o.stump && !o.planted && o.size === 'Big' && awayFromFarm(o)));
        if (!t) return null;
        return { tx: t.x, ty: t.y, row: 7, dur: 2.4, status: 'Chopping wood', done: () => { if (t.stump) return; this.helperDo(h, () => this.fell(t)); h.doneToday++; } };
      }
      case 'miner': {
        if (h.doneToday >= 4) return null;
        const r = near(W.objs.filter((o) => (o.kind === 'rock' || o.kind === 'ore') && awayFromFarm(o)));
        if (!r) return null;
        return { tx: r.x, ty: r.y, row: 7, dur: 2, status: 'Mining', done: () => { if (!W.objs.includes(r)) return; this.helperDo(h, () => this.breakRock(r)); h.doneToday++; } };
      }
      case 'shopkeeper': {
        const st = this.things.find((o) => o.shop); if (!st) return null;
        if (this.time >= 17 * 60 && !h.sold) return { tx: st.x + 1, ty: st.y, row: 6, dur: 1, status: 'Selling your basket', done: () => { h.sold = true; const got = this.sell(); if (got) this.toast(`${h.name} sold your basket for ${got} coins!`, 'good'); } };
        if (dist(h.x, h.y, st.x + 1.5, st.y + 1.5) > 2.5) return { tx: st.x + 1, ty: st.y, row: 0, dur: 0.1, status: 'Minding the stall', done: () => {} };
        return null;
      }
    }
    return null;
  },
  updateHelpers(dt) {
    const W = this.world, hour = this.time / 60;
    for (const h of this.helpers) {
      const hut = this.hutOf(h); if (!hut) continue;
      const working = h.paid && hour >= 7 && hour < h.R.work + 12;
      if (!working) {
        if (h.away) { h.status = h.paid ? 'At home' : 'Not paid today, staying home'; continue; }
        // walk home, then go inside
        if (!h.path && dist(h.x, h.y, hut.door[0] + 0.5, hut.door[1] + 0.6) > 0.8) { h.task = null; h.path = findPath(W, Math.floor(h.x), Math.floor(h.y), hut.door[0], hut.door[1], 6000, 0, (a, b) => W.walkP(a, b)) || null; if (!h.path) { h.away = true; continue; } h.status = 'Heading home'; }
        if (!h.path) { h.away = true; continue; }
      } else if (h.away) { h.away = false; h.x = hut.door[0] + 0.5; h.y = hut.door[1] + 0.6; h.wait = 0.5 + Math.random(); }
      // follow the path
      h.moving = false;
      if (h.path && h.path.length) {
        const [tx, ty] = h.path[0], ex = tx + 0.5 - h.x, ey = ty + 0.6 - h.y, d = Math.hypot(ex, ey), sp = h.speed * dt;
        if (d <= sp) { h.x = tx + 0.5; h.y = ty + 0.6; h.path.shift(); }
        else { h.x += ex / d * sp; h.y += ey / d * sp; h.face(ex, ey); h.moving = true; h.t += dt; }
        if (!h.path.length) h.path = null;
        continue;
      }
      h.path = null;
      if (!working) { h.away = true; continue; }
      const T = h.task;
      if (T && T.acting) {
        T.t += dt;
        if (T.t >= T.dur) { h.task = null; h.wait = 0.4 + Math.random() * 0.8; T.done(); this.emit('changed'); }
        continue;
      }
      if (T && !T.acting) {
        // arrived next to the job
        h.dir = 'side'; h.flip = T.tx + 0.5 < h.x;
        T.acting = true; T.t = 0; h.status = T.status; continue;
      }
      h.wait -= dt; if (h.wait > 0) continue;
      const job = this.planHelper(h);
      if (job) {
        const p = findPath(W, Math.floor(h.x), Math.floor(h.y), job.tx, job.ty, 9000, job.near || 1, (a, b) => W.walkP(a, b));
        if (p) { h.path = p.length ? p : null; h.task = job; h.status = job.status; continue; }
      }
      // nothing to do: potter about near home
      h.status = 'Taking a little break'; h.wait = 3 + Math.random() * 4;
      for (let k = 0; k < 8; k++) { const x = hut.door[0] + Math.floor(Math.random() * 9) - 4, y = hut.door[1] + 1 + Math.floor(Math.random() * 4); if (W.walkP(x, y)) { h.path = findPath(W, Math.floor(h.x), Math.floor(h.y), x, y, 2000, 0, (a, b) => W.walkP(a, b)); break; } }
    }
  },
  helperAt(wx, wy) { return this.helpers.find((h) => !h.away && dist(wx, wy, h.x, h.y - 0.6) < 0.7); },
});
