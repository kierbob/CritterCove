// ------------------------------------------------- bees and butterflies
// Beehives turn nearby flowers into honey overnight. Butterflies visit pretty
// farms in the daytime; click one to admire it and log its colour.
ITEMS.honey = { name: 'Honey', price: 45, icon: [P.food, 7, 8] };
const HIVE_RECTS = [[0, 24, 32, 24], [0, 0, 32, 17]];
def('beehive', { name: 'Beehive', cat: 'farm', price: 120, w: 2, h: 1, block: 1, beauty: 2, variants: 2, hive: true,
  vname: (v) => ['Tall hive', 'Box hive'][v],
  desc: 'Makes a jar of honey every morning when there are 4+ flowers nearby. Holds 3.',
  draw: (R, o) => { const r = HIVE_RECTS[o.v % 2]; R.spr('Animals/Bee/Bee_Nest', r[0], r[1], r[2], r[3], o.x + 1, o.y + 1, { oy: 1 }); } });

SPECIES.butterfly = { name: 'Butterfly', plural: 'Butterflies', wild: true, special: 'bfly', size: 0.5,
  colors: ['Sky', 'Mint', 'Sunny', 'Rose', 'Lilac', 'Ember', 'Tangerine', 'Lagoon'].map((name, i) => ({ name, row: i, rare: i === 4 || i === 7 ? 2 : i >= 5 ? 1 : 0 })) };
const BUG_SPECIES = ['butterfly'];

Object.assign(Game.prototype, {
  // flowers near a spot: placed flowers and pots, wild flowers, sunflowers in the field
  flowersNear(x, y, r) {
    let n = 0; const W = this.world;
    for (const o of this.things) if ((o.id === 'flower' || o.id === 'pot') && dist(o.x, o.y, x, y) <= r) n++;
    for (const o of W.objs) if (o.kind === 'flower' && dist(o.x, o.y, x, y) <= r) n++;
    for (const [i, c] of this.crops) if (c.c === 'sunflower' && this.cropStage(c) >= 2 && dist(i % W.W, (i / W.W) | 0, x, y) <= r) n++;
    return n;
  },
  hiveMorning() {
    for (const o of this.things) if (o.id === 'beehive') { if ((o.honey || 0) < 3 && this.flowersNear(o.x + 1, o.y, 6) >= 4) o.honey = (o.honey || 0) + 1; }
  },
  hiveLabel(o) {
    if (o.honey) return `Collect ${o.honey} jar${o.honey > 1 ? 's' : ''} of honey`;
    const n = this.flowersNear(o.x + 1, o.y, 6);
    return n >= 4 ? 'Beehive · honey tomorrow morning' : `Beehive · needs flowers nearby (${n}/4)`;
  },
  useHive(o) {
    if (!o.honey) return this.toast(this.hiveLabel(o));
    this.give('honey', o.honey); this.float(o.x + 1, o.y - 0.8, `+${o.honey} honey`); this.stats.honey = (this.stats.honey || 0) + o.honey; o.honey = 0; this.sfx('pickup');
  },
  // butterflies drift between flowers while it's sunny
  updateBugs(dt) {
    this.bugs = this.bugs || [];
    const day = !this.isNight() && this.weather.rain < 0.3 && this.time > 7 * 60 && this.time < 19 * 60;
    const want = day ? Math.min(14, 2 + Math.floor(this.beauty() / 18)) : 0;
    if (this.bugs.length < want && Math.random() < dt * 0.5) {
      // appear near a flower somewhere around the player
      const P0 = this.player, cands = [];
      for (const o of this.things) if ((o.id === 'flower' || o.id === 'pot') && dist(o.x, o.y, P0.x, P0.y) < 16) cands.push(o);
      for (const o of this.world.objs) if (o.kind === 'flower' && dist(o.x, o.y, P0.x, P0.y) < 16) cands.push(o);
      const f = cands.length && cands[Math.floor(Math.random() * cands.length)];
      if (f) {
        const cs = SPECIES.butterfly.colors, w = cs.map((c) => [1, 0.4, 0.12][c.rare]); let r = Math.random() * w.reduce((a, b) => a + b), col = 0;
        for (let i = 0; i < cs.length; i++) { r -= w[i]; if (r <= 0) { col = i; break; } }
        this.bugs.push({ x: f.x + 0.5, y: f.y, tx: f.x + 0.5, ty: f.y, col, t: Math.random() * 9, rest: 0, life: 40 + Math.random() * 60 });
      }
    }
    for (const b of this.bugs) {
      b.t += dt; b.life -= dt;
      if (b.rest > 0) { b.rest -= dt; continue; }
      const ex = b.tx - b.x, ey = b.ty - b.y, d = Math.hypot(ex, ey);
      if (d < 0.1) {
        if (Math.random() < 0.5) b.rest = 1 + Math.random() * 3;
        b.tx = b.x + (Math.random() - 0.5) * 6; b.ty = b.y + (Math.random() - 0.5) * 4;
      } else { const sp = Math.min(d, dt * 1.6); b.x += ex / d * sp + Math.sin(b.t * 7) * dt * 0.6; b.y += ey / d * sp + Math.cos(b.t * 5) * dt * 0.4; }
    }
    this.bugs = this.bugs.filter((b) => b.life > 0 || (!day && false));
    if (!day) this.bugs = this.bugs.filter((b) => (b.life -= dt * 10) > 0);
  },
  bugAt(wx, wy) { return (this.bugs || []).find((b) => dist(wx, wy, b.x, b.y - 0.9) < 0.5); },
  admireBug(b) {
    this.bugs = this.bugs.filter((q) => q !== b);
    const c = SPECIES.butterfly.colors[b.col];
    if (this.discover('butterfly', b.col)) this.toast(`You spotted a ${c.name.toLowerCase()} butterfly!`, 'good');
    else this.float(b.x, b.y - 1, `${c.name} butterfly`);
    this.stats.bugs = (this.stats.bugs || 0) + 1;
    for (let k = 0; k < 6; k++) this.fx.push({ x: b.x, y: b.y - 0.9, vx: 0, vy: -0.5, t: 0, life: 0.6, col: '#fff6b0', s: 1 });
    this.sfx('chirp');
  },
});

// bees buzzing round each hive, butterflies everywhere: drawn above the scene
function drawBees(R, game, t) {
  const [x0, y0, x1, y1] = R.view();
  for (const o of game.things) {
    if (o.id !== 'beehive' || o.x < x0 - 4 || o.x > x1 + 4 || o.y < y0 - 4 || o.y > y1 + 4) continue;
    if (game.isNight() || game.weather.rain > 0.3) continue;
    for (let k = 0; k < 3; k++) {
      const a = t * (0.9 + k * 0.25) + k * 2.1 + o.uid, r = 1.2 + k * 0.7 + Math.sin(t * 0.7 + k) * 0.6;
      const bx = o.x + 1 + Math.cos(a) * r, by = o.y - 0.3 + Math.sin(a * 1.3) * r * 0.55, f = Math.floor(t * 14 + k) % 4;
      R.spr('Animals/Bee/Bee_Flying_Animation', f * 16, (o.honey ? 16 : 0), 16, 16, bx, by, { flip: Math.cos(a + 0.1) - Math.cos(a) > 0, scale: 0.6 });
    }
  }
  for (const b of game.bugs || []) {
    if (b.x < x0 || b.x > x1 || b.y < y0 || b.y > y1 + 1) continue;
    const f = b.rest > 0 ? (Math.sin(b.t * 2) > 0.6 ? 1 : 0) : Math.floor(b.t * 10) % 2;
    const g = R.g; g.fillStyle = 'rgba(30,40,20,0.18)'; g.beginPath(); g.ellipse(R.sx(b.x), R.sy(b.y), 2.5 * R.Z, 1 * R.Z, 0, 0, Math.PI * 2); g.fill();
    R.spr('Animals/Butterfly/Butterfly', f * 8, b.col * 8, 8, 8, b.x, b.y - 0.6 - (b.rest > 0 ? 0 : 0.3 + Math.sin(b.t * 4) * 0.1), {});
  }
}
