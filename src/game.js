// ------------------------------------------------------------------ game
// connection autotiles (fences, hedges): read which cell edges have pixels
function connTable(key, cols, rows) {
  const im = IMG[key]; const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
  const g = c.getContext('2d'); g.drawImage(im, 0, 0); const d = g.getImageData(0, 0, im.width, im.height).data;
  const A = (x, y) => d[(y * im.width + x) * 4 + 3] > 160;
  const t = {};
  for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
    const x0 = q * 16, y0 = r * 16; let n = 0, e = 0, s = 0, w = 0, any = 0;
    for (let i = 0; i < 16; i++) { if (A(x0 + i, y0)) n++; if (A(x0 + 15, y0 + i)) e++; if (A(x0 + i, y0 + 15)) s++; if (A(x0, y0 + i)) w++; }
    for (let i = 0; i < 256; i++) if (A(x0 + (i & 15), y0 + (i >> 4))) { any = 1; break; }
    if (!any) continue;
    const m = (n > 1 ? 1 : 0) | (e > 1 ? 2 : 0) | (s > 1 ? 4 : 0) | (w > 1 ? 8 : 0);
    if (!(m in t)) t[m] = [q, r];
  }
  return t;
}
function connCell(t, m) {
  if (t[m]) return t[m];
  let best = null, bs = -1;
  for (const k in t) { const kk = +k; const sc = 4 - [1, 2, 4, 8].filter((b) => ((kk & b) !== 0) !== ((m & b) !== 0)).length; if (sc > bs) { bs = sc; best = t[k]; } }
  return best;
}

// --------------------------------------------------------- catalogue
const WALLS = ['Base', 'Green', 'Red'], ROOFS = ['Red', 'Blue', 'Black'];
const COLOR_NAMES = { Base: 'Oak', Green: 'Sage', Red: 'Berry', Black: 'Slate', Blue: 'Sky' };
const HOUSES = [{ n: 1, w: 5, fw: 96, fh: 128 }, { n: 4, w: 6, fw: 112, fh: 96 }, { n: 2, w: 8, fw: 144, fh: 128 }, { n: 3, w: 8, fw: 144, fh: 128 }, { n: 5, w: 11, fw: 192, fh: 128 }];
const UB = 'Buildings/Buildings/Unique_Buildings/';
const DEF = {};
function def(id, o) { DEF[id] = Object.assign({ id, w: 1, h: 1, block: 1, variants: 1, beauty: 1 }, o); }
// --- buildings
def('house', { name: 'Cottage', cat: 'build', price: 220, h: 3, variants: HOUSES.length * 9, beauty: 6, door: true, light: true,
  dims: (v) => { const H = HOUSES[Math.floor(v / 9)]; return [H.w, 3]; },
  key: (v) => { const H = HOUSES[Math.floor(v / 9)], c = v % 9; return `Buildings/Buildings/Houses/Wood/House_${H.n}_Wood_${WALLS[Math.floor(c / 3)]}_${ROOFS[c % 3]}`; },
  vname: (v) => { const c = v % 9; return `Style ${Math.floor(v / 9) + 1} · ${COLOR_NAMES[WALLS[Math.floor(c / 3)]]} walls, ${COLOR_NAMES[ROOFS[c % 3]]} roof`; },
  draw: (R, o) => { const H = HOUSES[Math.floor(o.v / 9)]; R.spr(DEF.house.key(o.v), 0, 0, H.fw, H.fh, o.x + o.w / 2, o.y + o.h, { oy: H.n === 4 ? 11 : 13 }); } });
def('coop', { name: 'Chicken coop', cat: 'build', price: 160, w: 4, h: 3, variants: 9, beauty: 3, home: 'coop', cap: 6, door: true,
  key: (v) => `${UB}Coop/Coop_${WALLS[Math.floor(v / 3)]}_${ROOFS[v % 3]}`,
  vname: (v) => `${COLOR_NAMES[WALLS[Math.floor(v / 3)]]} walls, ${COLOR_NAMES[ROOFS[v % 3]]} roof`,
  draw: (R, o) => R.spr(DEF.coop.key(o.v), 0, 0, 80, 128, o.x + o.w / 2, o.y + o.h, { oy: 4 }) });
def('barn', { name: 'Big barn', cat: 'build', price: 320, w: 7, h: 4, variants: 9, beauty: 4, home: 'barn', cap: 6, door: true,
  key: (v) => `${UB}Barn/Barn_${WALLS[Math.floor(v / 3)]}_${ROOFS[v % 3]}`,
  vname: (v) => `${COLOR_NAMES[WALLS[Math.floor(v / 3)]]} walls, ${COLOR_NAMES[ROOFS[v % 3]]} roof`,
  draw: (R, o) => R.spr(DEF.barn.key(o.v), 0, 0, 128, 144, o.x + o.w / 2, o.y + o.h, { oy: 13 }) });
def('shed', { name: 'Garden shed', cat: 'build', price: 90, w: 5, h: 3, variants: 9, beauty: 3,
  key: (v) => `${UB}Shed/Shed_${WALLS[Math.floor(v / 3)]}_${ROOFS[v % 3]}`,
  vname: (v) => `${COLOR_NAMES[WALLS[Math.floor(v / 3)]]} walls, ${COLOR_NAMES[ROOFS[v % 3]]} roof`,
  draw: (R, o) => R.spr(DEF.shed.key(o.v), 0, 0, 96, 112, o.x + o.w / 2, o.y + o.h, { oy: 13 }) });
def('windmill', { name: 'Windmill', cat: 'build', price: 260, w: 3, h: 2, beauty: 6,
  draw: (R, o, t) => { R.spr(`${UB}Windmill/Windmill`, 0, 0, 64, 112, o.x + 1.5, o.y + 2, { oy: 1 }); const f = Math.floor(t * 4) % 4; R.spr(`${UB}Windmill/Windmill_Sail_Anim`, f * 64, 0, 64, 80, o.x + 1.5, o.y + 2, { oy: -46 }); } });
def('silo', { name: 'Silo', cat: 'build', price: 120, w: 2, h: 2, beauty: 2, draw: (R, o) => R.spr(`${UB}Silo/Silo`, 0, 0, 48, 80, o.x + 1, o.y + 2, { oy: 3 }) });
def('stall', { name: 'Market stall', cat: 'build', price: 70, w: 3, h: 1, variants: 4, beauty: 3, vname: (v) => ['Strawberry', 'Mint', 'Sky', 'Orange'][v] + ' awning',
  draw: (R, o) => R.spr(`${UB}Stalls/Market_Stalls`, o.v * 48, 0, 48, 48, o.x + 1.5, o.y + 1, { oy: 0 }) });
// --- farm things
def('feeder', { name: 'Hay feeder', cat: 'farm', price: 15, w: 2, beauty: 0, feeder: 'feeder', cap: 12, desc: 'Animals eat here. Click to refill (2 coins).',
  draw: (R, o) => { R.spr(`${P.od}Water_Troughs`, 64, 0, 32, 16, o.x + 1, o.y + 1); if (o.amount > 0) R.spr(`${P.od}Hay_Bales`, 16, 0, 32, 16, o.x + 1, o.y + 1, { oy: -2 - (12 - o.amount) / 3, scale: 0.8 }); } });
def('trough', { name: 'Water trough', cat: 'farm', price: 15, w: 2, beauty: 0, feeder: 'trough', cap: 16, desc: 'Fresh water. Click to refill for free.',
  draw: (R, o) => R.spr(`${P.od}Water_Troughs`, o.amount > 0 ? 16 : 64, 0, 32, 16, o.x + 1, o.y + 1) });
def('nest', { name: 'Nest box', cat: 'farm', price: 10, block: 0, beauty: 0, variants: 3, vname: (v) => ['Twig', 'Straw', 'Golden straw'][v], desc: 'Hens lay their eggs here.',
  draw: (R, o) => R.spr(`${P.od}Nests`, o.v * 16, Math.min(3, o.eggs ? o.eggs.length : 0) * 16, 16, 16, o.x + 0.5, o.y + 1) });
def('fence', { name: 'Wooden fence', cat: 'farm', price: 2, beauty: 0, conn: 'Outdoor decoration/Fence_Big', connGrid: [4, 4], desc: 'Fences keep animals in. Add a gate so you can walk through.' });
def('whitefence', { name: 'Picket fence', cat: 'farm', price: 3, beauty: 1, conn: 'Outdoor decoration/White_Fence', connGrid: [5, 5] });
def('gate', { name: 'Gate', cat: 'farm', price: 8, beauty: 0, block: 2, w: 3, desc: 'You can walk through; animals can\'t.',
  draw: (R, o, t, G) => { const near = G && G.player && (dist(G.player.x, G.player.y, o.x + 1.5, o.y + 0.5) < 2 || G.animals.some((a) => !a.wild && dist(a.x, a.y, o.x + 1.5, o.y + 0.5) < 2)); o.open = clamp((o.open || 0) + (near ? 0.12 : -0.12), 0, 1); const f = Math.round(o.open * 4); R.spr(`${P.anim}Other_Animations/Fence_Big_Gate`, f * 48, 0, 48, 32, o.x + 1.5, o.y + 1); } });
def('hedge', { name: 'Hedge', cat: 'deco', price: 4, beauty: 1, conn: 'Tiles/Hedge_Tiles', connGrid: [4, 4] });
def('pond', { name: 'Pond water', cat: 'deco', price: 6, block: 0, beauty: 2, ground: true, pond: true, desc: 'Dig a pond, one tile at a time. Ducks, swans, frogs and capybaras love it.' });
def('path', { name: 'Dirt path', cat: 'deco', price: 1, block: 0, beauty: 0, ground: true, desc: 'Lay paths to connect your farm.' });
// --- decorations
def('flower', { name: 'Flowers', cat: 'deco', price: 3, block: 0, variants: 50, beauty: 1, vname: (v) => `Bunch ${v + 1}`,
  draw: (R, o, t) => R.spr(`${P.anim}Flower_Animations/Not_Potted/Flowers_${1 + Math.floor(o.v / 10)}_Anim`, (Math.floor(t * 3 + o.x) % 6) * 16, (o.v % 10) * 16, 16, 16, o.x + 0.5, o.y + 1) });
def('pot', { name: 'Potted flowers', cat: 'deco', price: 6, variants: 50, beauty: 2, vname: (v) => `Pot ${v + 1}`,
  draw: (R, o, t) => R.spr(`${P.anim}Flower_Animations/Potted/Flowers_${1 + Math.floor(o.v / 10)}_Potted_Anim`, (Math.floor(t * 3 + o.x) % 6) * 16, (o.v % 10) * 16, 16, 16, o.x + 0.5, o.y + 1) });
def('bush', { name: 'Bush', cat: 'deco', price: 4, variants: 3, beauty: 1, draw: (R, o) => { const c = [[3, 9], [5, 9], [6, 9]][o.v]; R.spr(P.od + 'Outdoor_Decor', c[0] * 16, c[1] * 16, 16, 16, o.x + 0.5, o.y + 1); } });
def('sapling', { name: 'Tree', cat: 'deco', price: 12, variants: 4, beauty: 2, vname: (v) => ['Oak', 'Birch', 'Spruce', 'Fruit tree'][v], tree: true });
def('bench', { name: 'Bench', cat: 'deco', price: 18, w: 2, variants: 2, beauty: 2, vname: (v) => ['Stone', 'Wood'][v], draw: (R, o) => R.spr(`${P.od}Benches`, o.v * 32, 0, 32, 32, o.x + 1, o.y + 1, { oy: 4 }) });
def('lamp', { name: 'Lamp post', cat: 'deco', price: 24, variants: 6, beauty: 2, light: true, vname: (v) => `Lamp ${v + 1}`,
  draw: (R, o, t) => R.spr(`${P.od}Lanter_Posts`, (Math.floor(t * 6) % 6) * 16, o.v * 48, 16, 48, o.x + 0.5, o.y + 1) });
def('fountain', { name: 'Fountain', cat: 'deco', price: 140, w: 2, h: 2, beauty: 8, draw: (R, o, t) => R.spr(`${P.anim}Other_Animations/Fountain_Anim`, (Math.floor(t * 8) % 8) * 32, 0, 32, 48, o.x + 1, o.y + 2) });
def('bunting', { name: 'Bunting', cat: 'deco', price: 28, w: 2, block: 0, beauty: 3, draw: (R, o, t) => R.spr(`${P.anim}Other_Animations/Pole_and_Bunting_1_Anim`, (Math.floor(t * 5) % 8) * 32, 0, 32, 32, o.x + 1, o.y + 1) });
def('scarecrow', { name: 'Scarecrow', cat: 'deco', price: 25, variants: 5, beauty: 2, draw: (R, o) => R.spr(`${P.od}Scarecrows`, o.v * 32, 0, 32, 32, o.x + 0.5, o.y + 1, { oy: 1 }) });
def('barrel', { name: 'Barrel', cat: 'deco', price: 8, variants: 11, beauty: 1, vname: (v) => v < 5 ? `Barrel ${v + 1}` : `Flower barrel ${v - 4}`,
  draw: (R, o) => { const v = o.v; R.spr(`${P.od}barrels`, (v < 5 ? v : v - 5) * 16, v < 5 ? 0 : 32, 16, 32, o.x + 0.5, o.y + 1); } });
def('haybale', { name: 'Hay bale', cat: 'deco', price: 6, beauty: 1, draw: (R, o) => R.spr(`${P.od}Hay_Bales`, 0, 0, 16, 16, o.x + 0.5, o.y + 1) });
def('well', { name: 'Well', cat: 'deco', price: 60, w: 2, beauty: 3, draw: (R, o) => R.spr(`${P.od}Well`, 0, 0, 32, 48, o.x + 1, o.y + 1, { oy: 1 }) });
def('mushroom', { name: 'Mushrooms', cat: 'deco', price: 2, block: 0, variants: 8, beauty: 1, draw: (R, o, t) => { const k = `${P.anim}Muschroom_Animations/muschroom_${o.v + 1}_Anim`, n = IMG[k] ? IMG[k].width / 16 : 6; R.spr(k, (Math.floor(t * 3 + o.x) % n) * 16, 0, 16, 16, o.x + 0.5, o.y + 1); } });
def('campfire', { name: 'Campfire', cat: 'deco', price: 20, beauty: 2, light: true, draw: (R, o, t) => R.spr(`${P.anim}Other_Animations/Campfire_Anim`, (Math.floor(t * 8) % 4) * 32, 0, 32, 32, o.x + 0.5, o.y + 1, { oy: 4 }) });
const TALL = { house: 4, coop: 4, barn: 5, shed: 3, windmill: 5, silo: 3, stall: 1, fountain: 1, well: 1 };
// little goals that guide a new farmer, each with a coin reward
const roomItems = (g) => { const h = g.things.find((o) => o.id === 'house'); return h && h.room ? h.room.items.length : 0; };
// helpers for quest arrows: where to look
const qThing = (id) => (g) => { const o = g.things.find((q) => id === 'stall' ? q.shop : q.id === id); return o && { x: o.x + o.w / 2, y: o.y - (TALL[o.id] || 1) + 0.6 }; };
const qWild = (sk) => (g) => { let b = null, bd = 1e9; for (const a of g.animals) if (a.wild && a.sk === sk) { const d = dist(a.x, a.y, g.player.x, g.player.y); if (d < bd) { bd = d; b = a; } } return b && { x: b.x, y: b.y - 1.2 }; };
const qSoil = (pred) => (g) => { const W = g.world; let b = null, bd = 1e9; for (let i = 0; i < W.soil.length; i++) if (W.soil[i] && pred(g, i)) { const x = i % W.W, y = (i / W.W) | 0, d = dist(x, y, g.player.x, g.player.y); if (d < bd) { bd = d; b = { x: x + 0.5, y: y - 0.3 }; } } return b; };
const dexN = (g) => Object.values(g.dex).reduce((s, a) => s + a.length, 0);
const ADOPTABLE = ['frog', 'mouse', 'swan', 'capybara'];
// the quest line: each quest says how to do it, tracks progress, and can point the way
const GOALS = [
  { text: 'Earn 200 coins from selling', reward: 25, prog: (g) => [g.stats.earned || 0, 200], target: qThing('stall'),
    how: 'Gather flowers, eggs, fish or wood, then sell them at the market stall.' },
  { text: 'Plant 6 seeds in your field', reward: 15, prog: (g) => [g.stats.planted || 0, 6], target: qSoil((g, i) => !g.crops.has(i)),
    how: 'Click the brown soil to plant, then click the seeds to water them. Wheat and radishes grow in 2 days.' },
  { text: 'Catch 5 fish', reward: 20, prog: (g) => [g.stats.fish, 5], target: (g) => { let b = null, bd = 1e9; for (const s of g.fishSpots) { const d = dist(s.x, s.y, g.player.x, g.player.y); if (d < bd) { bd = d; b = s; } } return b && { x: b.x + 0.5, y: b.y - 0.2 }; },
    how: 'Click the water to cast your line, then click again as soon as you see "!".' },
  { text: 'Make friends with a wild frog', reward: 20, prog: (g) => [(g.dex.frog || []).length, 1], target: qWild('frog'),
    how: 'Frogs sit beside ponds. Walk up and click one to give it a pat.' },
  { text: 'Buy a duck', reward: 20, prog: (g) => [g.animals.some((a) => a.sk === 'duck') ? 1 : 0, 1], target: qThing('stall'),
    how: 'Ducks are in the Animals tab at the market stall. They live in your coop.' },
  { text: 'Harvest 5 crops', reward: 25, prog: (g) => [g.stats.harvested || 0, 5], target: qSoil((g, i) => g.crops.has(i)),
    how: 'Water your seedlings every day. When a crop sparkles, click it to harvest.' },
  { text: 'Dig a pond of 6 tiles', reward: 30, prog: (g) => [g.stats.ponds || 0, 6],
    how: 'Press B, open "Buy more", get Pond water from the Decor tab, then drag across the grass.' },
  { text: 'Adopt a wild critter', reward: 40, prog: (g) => [g.stats.adopted || 0, 1], target: qWild('frog'),
    how: 'Buy a critter snack (Animals tab), pat a wild frog, then press Adopt on its card.' },
  { text: 'Plant 5 flowers around your farm', reward: 15, prog: (g) => [Math.max(0, g.things.filter((o) => o.id === 'flower' || o.id === 'pot').length - 8), 5],
    how: 'Press B and place Flowers from your bag. More flowers are in the Decor tab.' },
  { text: 'Set up a beehive', reward: 30, prog: (g) => [g.things.some((o) => o.id === 'beehive') ? 1 : 0, 1], target: qThing('stall'),
    how: 'Buy a Beehive in the Farm tab and place it near at least 4 flowers.' },
  { text: 'Collect 3 jars of honey', reward: 40, prog: (g) => [g.stats.honey || 0, 3], target: qThing('beehive'),
    how: 'A hive with 4+ flowers nearby makes a jar each morning. Click the hive to collect it.' },
  { text: 'Decorate your house with 4 new things', reward: 30, prog: (g) => [Math.max(0, roomItems(g) - 5), 4], target: qThing('house'),
    how: 'Buy furniture in the Home tab, click your house to go inside, then press B.' },
  { text: 'Build a big barn', reward: 60, prog: (g) => [g.things.some((o) => o.id === 'barn') ? 1 : 0, 1], target: qThing('stall'),
    how: 'Barns are in the Buildings tab. Place it with B, with space in front of the door.' },
  { text: 'Build a helper\'s cottage', reward: 40, prog: (g) => [g.things.some((o) => o.id === 'hut') ? 1 : 0, 1], target: qThing('stall'),
    how: 'Helpers need somewhere to live. Cottages are in the Buildings tab at the market.' },
  { text: 'Hire a helper', reward: 50, prog: (g) => [g.helpers.length, 1], target: qThing('stall'),
    how: 'Open the Helpers tab at the market. A farmhand keeps the feeders and troughs full for you.' },
  { text: 'Welcome a sheep or a cow', reward: 40, prog: (g) => [g.animals.some((a) => a.sk === 'sheep' || a.sk === 'cow') ? 1 : 0, 1], target: qThing('stall'),
    how: 'Buy one from the Animals tab. Give the barn its own hay feeder and water trough.' },
  { text: 'Spot 3 colours of butterfly', reward: 30, prog: (g) => [(g.dex.butterfly || []).length, 3], target: (g) => { const b = (g.bugs || [])[0]; return b && { x: b.x, y: b.y - 1.6 }; },
    how: 'Butterflies visit pretty farms on dry days. Click one to take a closer look.' },
  { text: 'Have a baby animal born', reward: 50, prog: (g) => [g.stats.born || 0, 1],
    how: 'Feed, water and pat two animals of the same kind every day. Happy pairs have babies if there\'s room at home.' },
  { text: 'Harvest 40 crops', reward: 60, prog: (g) => [g.stats.harvested || 0, 40], target: qSoil((g, i) => g.crops.has(i) && g.crops.get(i).g >= CROP[g.crops.get(i).c].days),
    how: 'Bigger fields mean bigger harvests. Farm soil is in the Farm tab.' },
  { text: 'Fertilize 10 crops', reward: 40, prog: (g) => [g.stats.fertilized || 0, 10],
    how: 'Buy fertilizer in the Seeds tab, switch it on in the planting bar, then water your crops.' },
  { text: 'Grow a pumpkin or a watermelon', reward: 80, prog: (g) => [(g.stats.h_pumpkin || 0) + (g.stats.h_watermelon || 0), 1],
    how: 'Their seeds arrive at the market on day 7. They need 6 watered days to grow.' },
  { text: 'Adopt a capybara', reward: 80, prog: (g) => [g.animals.some((a) => a.adopted && a.sk === 'capybara') ? 1 : 0, 1], target: qWild('capybara'),
    how: 'Capybaras need a deep pond: dig one at least 3×3. Pat one in the wild, then adopt it.' },
  { text: 'Reach 3 stars of farm beauty', reward: 80, prog: (g) => [g.beauty(), 60],
    how: 'Flowers, ponds, lamps, benches and buildings all make your farm prettier.' },
  { text: 'Expand your house', reward: 60, prog: (g) => [g.things.some((o) => o.id === 'house' && o.room && o.room.grown) ? 1 : 0, 1], target: qThing('house'),
    how: 'Go inside, press B, and click "Expand room".' },
  { text: 'Find 20 colours for your Critterdex', reward: 100, prog: (g) => [dexN(g), 20],
    how: 'New animals, babies, wild critters and butterflies all add colours.' },
  { text: 'Find a rare colour ✨', reward: 150, prog: (g) => [Object.entries(g.dex).some(([sk, cs]) => cs.some((c) => SPECIES[sk].colors[c].rare >= 2)) ? 1 : 0, 1],
    how: 'Rare colours come from babies, lucky butterflies and special wild critters.' },
  { text: 'Earn 3,000 coins in total', reward: 150, prog: (g) => [g.stats.earned || 0, 3000],
    how: 'Honey, milk, wool and big crops sell for the most.' },
  { text: 'Adopt a frog, a mouse, a swan and a capybara', reward: 200, prog: (g) => [ADOPTABLE.filter((sk) => g.animals.some((a) => a.adopted && a.sk === sk)).length, 4],
    how: 'Mice need a hay bale, swans a pond of 6+ tiles, capybaras a deep pond.' },
  { text: 'Reach 4 stars of farm beauty', reward: 200, prog: (g) => [g.beauty(), 120],
    how: 'Keep decorating! Fountains and windmills are extra pretty.' },
  { text: 'Find 5 colours of one farm animal', reward: 250, prog: (g) => [Math.max(0, ...FARM_SPECIES.map((sk) => (g.dex[sk] || []).length)), 5],
    how: 'Buy a few of one kind and let them have babies. The market sells the common colours.' },
  { text: 'Run a little town: hire 4 helpers', reward: 200, prog: (g) => [g.helpers.length, 4],
    how: 'Every helper needs their own cottage and a daily wage.' },
  { text: 'Earn 10,000 coins in total', reward: 400, prog: (g) => [g.stats.earned || 0, 10000],
    how: 'You\'re a farming pro now. Keep it up!' },
  { text: 'Complete a whole Critterdex page', reward: 500, prog: (g) => [Math.max(0, ...FARM_SPECIES.map((sk) => (g.dex[sk] || []).length / SPECIES[sk].colors.length)) * 100 | 0, 100],
    how: 'Collect every colour of one animal. Horses (5) and ducks (5) have the smallest pages.' },
];
for (const G of GOALS) G.done = (g) => { const [a, b] = G.prog(g); return a >= b; };
const CATS = [['animals', 'Animals'], ['helpers', 'Helpers'], ['seeds', 'Seeds'], ['farm', 'Farm'], ['deco', 'Decor'], ['build', 'Buildings'], ['home', 'Home'], ['sell', 'Sell']];

// ---------------------------------------------------------------- game
class Game {
  constructor(opts) {
    this.DAY_SEC = 300;                      // a day (6:00 to midnight) lasts 5 real minutes
    this.seed = opts.seed || (Math.random() * 1e9) | 0;
    this.world = new World(this.seed);
    this.things = [];                        // placed buildings + decor
    this.animals = []; this.items = []; this.fx = []; this.floats = [];
    this.coins = 80; this.bag = { flower: 6, fence: 12, gate: 1, path: 10, lamp: 1 }; this.inv = {}; this.helpers = []; this.fert = 0; this.crops = new Map(); this.seeds = { wheat: 4, carrot: 2 }; this.seedSel = 'wheat'; this.dex = {}; this.day = 1; this.time = 7 * 60;
    this.weather = { rain: 0, raining: false, kind: 'sunny', clouds: 0.15, wind: 0.2 }; this.dayTruffles = 0; this.stats = { sold: 0, born: 0, eggs: 0 }; this.goal = 0; this.goalT = 0;
    this.listeners = {}; this.farmName = opts.farmName || 'Sunny Acres'; this.slot = opts.slot || 1;
    this.player = new Player(this.world.farm.x + 0.5, this.world.farm.y + 4.6, opts.look);
    this.initActivities();
    if (opts.save) this.load(opts.save); else this.newFarm();
    this.spawnWild();
    this.tut = opts.save ? (opts.save.tut ?? 99) : (opts.tutorial === false ? 99 : 0);
  }
  on(ev, f) { (this.listeners[ev] = this.listeners[ev] || []).push(f); }
  emit(ev, a) { for (const f of this.listeners[ev] || []) f(a); }
  toast(msg, kind) { this.emit('toast', { msg, kind }); }

  // ------------------------------------------------------- the starting farm
  newFarm() {
    const W = this.world, fx = W.farm.x, fy = W.farm.y;
    W.clearArea(fx - 14, fy - 10, fx + 14, fy + 12, true);
    const home = this.place('house', fx - 2, fy - 3, 2, true);
    const coop = this.place('coop', fx - 11, fy - 2, 0, true);
    this.place('stall', fx + 6, fy + 1, 0, true).shop = true;
    this.place('feeder', fx - 12, fy + 3, 0, true).amount = 0;
    this.place('trough', fx - 9, fy + 3, 0, true).amount = 0;
    this.place('nest', fx - 13, fy + 1, 1, true).eggs = [];
    // paths between the house, the coop and the stall
    const lay = (x0, y0, x1, y1) => { for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.setPath(x, y0, true); for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) this.setPath(x1, y, true); };
    lay(home.door[0], home.door[1], home.door[0], home.door[1] + 2);
    lay(coop.door[0], coop.door[1] + 1, home.door[0], home.door[1] + 2);
    lay(home.door[0], home.door[1] + 2, fx + 7, fy + 2);
    for (let k = 0; k < 8; k++) this.place('flower', fx - 4 + (k % 4) * (k < 4 ? 1 : 1) + (k < 4 ? 0 : 5), fy, (k * 7) % 50, true);
    this.place('lamp', home.door[0] + 2, home.door[1] + 1, 0, true);
    // a little starter field below the path
    this.ignoreBag = true; for (let y = fy + 5; y < fy + 8; y++) for (let x = fx + 1; x < fx + 6; x++) if (!this.canPlace('soil', x, y)) this.setSoil(x, y, true); this.ignoreBag = false;
    for (let i = 0; i < 2; i++) { const a = this.addAnimal('chicken', i === 0 ? 2 : 4, coop.door[0] + i * 2, coop.door[1] + 1, { home: coop.uid, age: 5, friend: 1 }); a.layToday = true; a.layAt = 8 * 60 + i * 50; }
    this.toast(`Welcome to ${this.farmName}! Your two hens need food, water and love.`, 'good');
  }
  spawnWild() {
    const W = this.world, r = mulberry32(this.seed + 5);
    const ponds = []; for (let i = 0; i < W.W * W.H; i++) if (W.pond[i]) ponds.push(i);
    const edge = ponds.filter((i) => W.nearType(i % W.W, (i / W.W) | 0, 1, (q) => q !== WATER));
    const inner = ponds.filter((i) => !W.nearType(i % W.W, (i / W.W) | 0, 1, (q) => q !== WATER));
    const pickTile = (arr) => { const i = arr[Math.floor(r() * arr.length)]; return [i % W.W, (i / W.W) | 0]; };
    const color = (sk) => { const cs = SPECIES[sk].colors; const w = cs.map((c) => [1, 0.45, 0.18, 0.06][c.rare]); let s = r() * w.reduce((a, b) => a + b); for (let i = 0; i < cs.length; i++) { s -= w[i]; if (s <= 0) return i; } return 0; };
    // frogs sit on the grassy banks
    for (let k = 0; k < 7 && edge.length; k++) {
      const [x, y] = pickTile(edge);
      for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1]]) if (W.walkable(x + dx, y + dy)) { this.animals.push(new Animal('frog', color('frog'), x + dx + 0.5, y + dy + 0.6)); break; }
    }
    for (let k = 0; k < 3 && inner.length; k++) { const [x, y] = pickTile(inner); this.animals.push(new Animal('swan', color('swan'), x + 0.5, y + 0.6)); }
    for (let k = 0; k < 3 && inner.length; k++) { const [x, y] = pickTile(inner); if (this.animals.some((a) => a.sk === 'capybara' && dist(a.x, a.y, x, y) < 2)) continue; this.animals.push(new Animal('capybara', r() < 0.15 ? 1 : 0, x + 0.5, y + 0.6)); }
    for (let k = 0; k < 6; k++) {
      for (let tries = 0; tries < 30; tries++) {
        const x = Math.floor(r() * W.W), y = Math.floor(r() * W.H);
        if (W.walkable(x, y) && W.get(x, y) === GRASS && dist(x, y, W.farm.x, W.farm.y) > 14) { this.animals.push(new Animal('mouse', color('mouse'), x + 0.5, y + 0.6)); break; }
      }
    }
  }

  // ------------------------------------------------------------ placing
  dims(id, v) { const D = DEF[id]; return D.dims ? D.dims(v) : [D.w, D.h]; }
  canPlace(id, x, y, v = 0) {
    const D = DEF[id], [w, h] = this.dims(id, v), W = this.world;
    if (D.cat === 'home') return 'Furniture goes inside your house';
    if (!this.ignoreBag && !(this.bag[id] > 0)) return `No ${D.name.toLowerCase()} in your bag: buy more at the shop`;
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
      if (!W.inb(xx, yy) || W.get(xx, yy) === WATER) return 'Needs dry land';
      if (D.soil) {
        const i = W.idx(xx, yy);
        if (W.soil[i]) return 'Already farm soil';
        if (W.get(xx, yy) !== GRASS || W.path[i]) return 'Lay soil on grass';
        if (this.thingAt(xx, yy, true)) return 'Something is in the way';
        const ob = W.objAt.get(i); if (ob && (ob.kind === 'tree' || ob.kind === 'rock' || ob.kind === 'ore')) return 'Clear the tree or rock first';
        continue;
      }
      if (D.pond) {
        const i = W.idx(xx, yy);
        if (W.get(xx, yy) !== GRASS || W.path[i]) return 'Dig ponds on grass';
        if (W.nearType(xx, yy, 1, (q, a, b) => (q === WATER && !W.isPond(a, b)) || q === SAND || W.path[W.idx(a, b)])) return 'Too close to a path or the beach';
        if (this.thingAt(xx, yy, true)) return 'Something is in the way';
        const ob = W.objAt.get(i); if (ob && (ob.kind === 'tree' || ob.kind === 'rock' || ob.kind === 'ore')) return 'Clear the tree or rock first';
        if (Math.floor(this.player.x) === xx && Math.floor(this.player.y) === yy) return 'You are standing there';
        if (this.animals.some((a) => !a.wild && Math.floor(a.x) === xx && Math.floor(a.y) === yy)) return 'An animal is standing there';
        continue;
      }
      if (D.ground) { if (W.nearType(xx, yy, 1, (q, a, b) => W.isPond(a, b))) return 'Too close to the pond'; if (W.path[W.idx(xx, yy)] || W.get(xx, yy) === SAND) return 'Already a path'; }
      if (!D.ground && W.soil[W.idx(xx, yy)]) return 'That\'s farm soil: pick it up first';
      if (this.thingAt(xx, yy, true) && !D.ground) return 'Something is in the way';
      if (W.block[W.idx(xx, yy)] && !D.ground) return 'Something is in the way';
      if (!D.ground && D.block && this.animals.some((a) => !a.wild && Math.floor(a.x) === xx && Math.floor(a.y) === yy)) return 'An animal is standing there';
      if (D.block && Math.floor(this.player.x) === xx && Math.floor(this.player.y) === yy) return 'You are standing there';
    }
    if (D.door) { const dx = x + Math.floor(w / 2), dy = y + h; if (!W.walkable(dx, dy) && !W.path[W.idx(dx, dy)]) return 'The door needs space in front'; }
    // tall buildings can't hide behind each other
    const tall = TALL[id] || 0;
    if (tall) for (const o of this.things) {
      const t2 = TALL[o.id] || 0; if (!t2) continue;
      if (x < o.x + o.w && x + w > o.x && y - tall < o.y + o.h && y + h > o.y - t2) return 'Too close to another building';
    }
    return null;
  }
  place(id, x, y, v = 0, free = false) {
    const D = DEF[id];
    if (D.soil) { this.setSoil(x, y, true); if (!free) { this.take(id); this.recordUndo({ type: 'soil', x, y }); this.stats.built = (this.stats.built || 0) + 1; } this.emit('changed'); return null; }
    if (D.pond) { this.setPond(x, y, true); if (!free) { this.take(id); this.recordUndo({ type: 'pond', x, y }); this.stats.built = (this.stats.built || 0) + 1; this.stats.ponds = (this.stats.ponds || 0) + 1; } this.emit('changed'); return null; }
    if (D.ground) { this.setPath(x, y, true); if (!free) { this.take(id); this.recordUndo({ type: 'path', x, y }); this.stats.built = (this.stats.built || 0) + 1; } return null; }
    if (D.tree) {
      const o = this.world.addTree(x, y, Math.random); o.tree = ['Oak', 'Birch', 'Spruce', 'Fruit'][v]; o.size = v === 3 ? 'Medium' : 'Small'; o.planted = true; o.nextGrow = this.now() + 1440 * 0.7;
      if (!free) { this.take(id); this.recordUndo({ type: 'tree', o }); this.stats.built = (this.stats.built || 0) + 1; } this.emit('changed'); return o;
    }
    const [w, h] = this.dims(id, v);
    const o = { uid: (this.nextUid = (this.nextUid || 1) + 1), id, x, y, v, w, h };
    if (D.feeder) o.amount = 0;
    if (id === 'nest') o.eggs = [];
    if (D.door) o.door = [x + Math.floor(w / 2), y + h];
    this.world.clearArea(x, y, x + w - 1, y + h - 1);
    this.things.push(o); this.stampThing(o, true);
    if (!free) { this.take(id); this.puff(x + w / 2, y + h, '#ffffff', 8); this.sfx('place'); this.recordUndo({ type: 'place', o }); this.stats.built = (this.stats.built || 0) + 1; if (D.home && this.things.filter((q) => q.id === id).length > 1) this.toast(`Tip: put a hay feeder and a water trough near your new ${D.name.toLowerCase()}.`); }
    this.emit('changed');
    return o;
  }
  stampThing(o, on) {
    const D = DEF[o.id], W = this.world;
    for (let yy = o.y; yy < o.y + o.h; yy++) for (let xx = o.x; xx < o.x + o.w; xx++) if (W.inb(xx, yy)) W.block[W.idx(xx, yy)] = on ? D.block : 0;
  }
  thingAt(x, y, footprint) {
    for (let i = this.things.length - 1; i >= 0; i--) { const o = this.things[i]; if (x >= o.x && x < o.x + o.w && y >= o.y && y < o.y + o.h) return o; }
    return null;
  }
  // what's under the mouse, including the tall parts of buildings drawn above their footprint
  thingVisualAt(fx, fy) {
    let best = null;
    for (const o of this.things) {
      const tall = (TALL[o.id] || 0) + (o.id === 'lamp' ? 2 : o.id === 'stall' ? 1 : 0);
      if (fx >= o.x && fx < o.x + o.w && fy >= o.y - tall && fy < o.y + o.h) if (!best || o.y > best.y) best = o;
    }
    return best;
  }
  take(id, n = 1) { this.bag[id] = (this.bag[id] || 0) - n; if (this.bag[id] <= 0) delete this.bag[id]; this.emit('bag'); }
  put(id, n = 1) { this.bag[id] = (this.bag[id] || 0) + n; this.emit('bag'); }
  buyItem(id, n = 1) {
    const D = DEF[id]; if (this.coins < D.price * n) return 'Not enough coins';
    this.coins -= D.price * n; this.put(id, n); this.sfx('coin'); this.emit('changed'); return null;
  }
  canLift(o) {
    return null;
  }
  // put something back in your bag (it keeps its full value)
  store(o) {
    const why = this.canLift(o); if (why) return this.toast(why, 'bad');
    if (o.shop) return this.toast('The market stall can\'t go in your bag, but you can Move it anywhere you like.', 'bad');
    if (o.id === 'house' && this.things.filter((q) => q.id === 'house').length <= 1) return this.toast('You need somewhere to sleep! Move it instead.', 'bad');
    if (DEF[o.id].home && this.animals.some((a) => a.home === o.uid)) return this.toast('Animals live here. Use Move to put their home somewhere else.', 'bad');
    if (DEF[o.id].hut && this.helpers.some((h) => h.home === o.uid)) return this.toast('A helper lives here. Use Move instead.', 'bad');
    this.stampThing(o, false); this.things = this.things.filter((q) => q !== o); this.put(o.id);
    if (o.eggs) for (const e of o.eggs) this.give(e.item, 1);
    this.recordUndo({ type: 'store', o }); this.puff(o.x + o.w / 2, o.y + o.h, '#ffffff', 8); this.sfx('pop'); this.emit('changed');
  }
  // pick up for moving: it leaves the map until it's put down again
  lift(o) { const why = this.canLift(o); if (why) { this.toast(why, 'bad'); return false; } this.stampThing(o, false); this.things = this.things.filter((q) => q !== o); return true; }
  drop(o, x, y, from) {
    const dx = x - o.x, dy = y - o.y; o.x = x; o.y = y; if (o.door) o.door = [x + Math.floor(o.w / 2), y + o.h];
    this.world.clearArea(x, y, x + o.w - 1, y + o.h - 1); this.things.push(o); this.stampThing(o, true);
    // animals that live there follow their home
    if (DEF[o.id].home) for (const a of this.animals) if (a.home === o.uid) { a.path = null; a.state = 'idle'; }
    if (from) this.recordUndo({ type: 'move', o, from });
    this.puff(o.x + o.w / 2, o.y + o.h, '#ffffff', 8); this.sfx('place'); this.emit('changed');
  }
  canDrop(o, x, y) { this.ignoreBag = true; const why = this.canPlace(o.id, x, y, o.v); this.ignoreBag = false; return why; }
  remove(o) {
    if (o.shop) return this.toast('The market stall is where you shop, so it can\'t be destroyed. Use Move to put it somewhere else.', 'bad');
    if (o.id === 'house' && this.things.filter((q) => q.id === 'house').length <= 1) return this.toast('You need somewhere to sleep!', 'bad');
    if (DEF[o.id].home && this.animals.some((a) => a.home === o.uid)) return this.toast('Some animals live here. Move them first by building another home.', 'bad');
    if (DEF[o.id].hut && this.helpers.some((h) => h.home === o.uid)) return this.toast('A helper lives here. Dismiss them first (Helpers tab).', 'bad');
    this.stampThing(o, false); this.things = this.things.filter((q) => q !== o);
    this.coins += Math.floor(DEF[o.id].price / 2); this.recordUndo({ type: 'remove', o }); this.puff(o.x + o.w / 2, o.y + o.h, '#ffffff', 8); this.sfx('pop');
    if (o.eggs) for (const e of o.eggs) this.dropItem(e.item, o.x + 0.5, o.y + 1);
    this.emit('changed');
  }
  setPath(x, y, on) {
    const W = this.world, i = W.idx(x, y); if (!W.inb(x, y)) return;
    if (on) { W.path[i] = 1; W.ter[i] = SAND; const ob = W.objAt.get(i); if (ob && ob.kind !== 'tree') W.removeObj(ob); }
    else if (W.path[i]) { W.path[i] = 0; W.ter[i] = GRASS; }
  }
  // dug ponds: fresh water with grassy banks
  setPond(x, y, on) {
    const W = this.world, i = W.idx(x, y); if (!W.inb(x, y)) return;
    if (on) { const ob = W.objAt.get(i); if (ob) W.removeObj(ob); W.ter[i] = WATER; W.pond[i] = 1; W.dug[i] = 1; W.block[i] = 0; }
    else if (W.dug[i]) { W.ter[i] = GRASS; W.pond[i] = 0; W.dug[i] = 0; const ob = W.objAt.get(i); if (ob) W.removeObj(ob); }
  }
  // fences/hedges connect to neighbours of the same kind
  connMask(o) {
    const same = (x, y) => { const q = this.thingAt(x, y); return q && (q.id === o.id || (o.id === 'fence' && q.id === 'gate') || (o.id === 'gate' && q.id === 'fence')); };
    return (same(o.x, o.y - 1) ? 1 : 0) | (same(o.x + 1, o.y) ? 2 : 0) | (same(o.x, o.y + 1) ? 4 : 0) | (same(o.x - 1, o.y) ? 8 : 0);
  }
  drawThing(R, o, t) {
    const D = DEF[o.id];
    if (D.conn) {
      if (!D.table) D.table = connTable(D.conn, D.connGrid[0], D.connGrid[1]);
      const c = connCell(D.table, this.connMask(o)); if (c) R.spr(D.conn, c[0] * 16, c[1] * 16, 16, 16, o.x + 0.5, o.y + 1);
      return;
    }
    if (D.draw) D.draw(R, o, t, this);
  }

  // ------------------------------------------------------------- animals
  addAnimal(sk, color, x, y, opts = {}) {
    const a = new Animal(sk, color, x + 0.5, y + 0.6, opts); this.animals.push(a);
    this.discover(sk, color); return a;
  }
  discover(sk, color) {
    const d = this.dex[sk] = this.dex[sk] || [];
    if (!d.includes(color)) { d.push(color); this.emit('dex', { sk, color }); return true; }
    return false;
  }
  homeOf(a) { return a.home ? this.things.find((o) => o.uid === a.home) : null; }
  homesFor(sk) { return this.things.filter((o) => DEF[o.id].home === SPECIES[sk].home); }
  freeHome(sk) { for (const h of this.homesFor(sk)) if (this.animals.filter((a) => a.home === h.uid).length < DEF[h.id].cap) return h; return null; }
  homeSpot(h, a) { const i = this.animals.filter((q) => q.home === h.uid).indexOf(a); return [h.door[0] - 1 + (i % 3), h.door[1] + Math.floor(i / 3)]; }
  nearestFeeder(a, kind) {
    let best = null, bd = 30;
    for (const o of this.things) if (DEF[o.id].feeder === kind && o.amount > 0) { const d = dist(a.x, a.y, o.x + 1, o.y + 0.5); if (d < bd) { bd = d; best = o; } }
    return best;
  }
  // little reminders: who's hungry or thirsty, crops that need water, things to collect
  needs() {
    const out = [], owned = this.animals.filter((a) => !a.wild && !a.adopted), W = this.world;
    const names = (list) => { const n = list.map((a) => a.name); return n.length <= 2 ? n.join(' and ') : `${n.slice(0, 2).join(', ')} and ${n.length - 2} more`; };
    for (const [kind, key, icon, need, fill, fixWord] of [['feeder', 'hunger', '🌾', 'hungry', 'Refill the hay feeder', 'a hay feeder'], ['trough', 'thirst', '💧', 'thirsty', 'Fill the water trough', 'a water trough']]) {
      if (kind === 'trough' && this.weather.rain > 0.3) continue;
      const list = owned.filter((a) => a[key] > 0.55); if (!list.length) continue;
      // the feeder nearest the hungry animals' home
      const ref = this.homeOf(list[0]) || list[0], rx = ref.door ? ref.door[0] : ref.x, ry = ref.door ? ref.door[1] : ref.y;
      let f = null, bd = 1e9; for (const o of this.things) if (DEF[o.id].feeder === kind) { const d = dist(o.x, o.y, rx, ry); if (d < bd) { bd = d; f = o; } }
      const verb = list.length > 1 ? 'are' : 'is';
      if (!f || bd > 16) out.push({ key: kind + 'none', icon, text: `${names(list)} ${verb} ${need}. Put ${fixWord} near their home (Farm tab).` });
      else if (f.amount < DEF[f.id].cap * 0.5) out.push({ key: kind, icon, text: `${names(list)} ${verb} ${need}. ${fill}!`, thing: f });
    }
    if (this.weather.rain < 0.3 && this.time > 10 * 60) { let n = 0, first = null; for (const [i, c] of this.crops) if (!W.wet[i] && c.g < CROP[c.c].days) { n++; first = first ?? i; } if (n) out.push({ key: 'water', icon: '🌱', text: `${n} crop${n > 1 ? 's need' : ' needs'} watering today.`, soil: [first % W.W, (first / W.W) | 0] }); }
    const nest = this.things.find((o) => o.id === 'nest' && o.eggs && o.eggs.length >= 2); if (nest) out.push({ key: 'eggs', icon: '🥚', text: `${nest.eggs.length} eggs waiting in the nest.`, thing: nest });
    const hive = this.things.find((o) => o.id === 'beehive' && o.honey); if (hive) out.push({ key: 'honey', icon: '🍯', text: 'Honey is ready in your beehive!', thing: hive });
    return out.slice(0, 3);
  }
  standBy(o, a) {
    const W = this.world, spots = [];
    for (let x = o.x - 1; x <= o.x + o.w; x++) for (const y of [o.y - 1, o.y + o.h]) spots.push([x, y]);
    for (const y of [o.y]) { spots.push([o.x - 1, y]); spots.push([o.x + o.w, y]); }
    const ok = spots.filter(([x, y]) => a.canWalk(W, x, y, true) && W.block[W.idx(x, y)] !== 2);
    ok.sort((p, q) => dist(p[0], p[1], a.x, a.y) - dist(q[0], q[1], a.x, a.y));
    return ok[Math.floor(Math.random() * Math.min(3, ok.length))] || null;
  }
  isNight() { return this.time >= 21 * 60 || this.time < 6 * 60; }
  near(a, r) { return dist(a.x, a.y, this.player.x, this.player.y) < r; }

  // ---------------------------------------------------------- interacting
  pet(a) {
    a.state = 'pet'; a.anim = 0; a.st = 1.2; a.faceTo(this.player.x - a.x, this.player.y - a.y);
    this.heart(a.x, a.y - 1);
    this.sfx(a.sk === 'frog' ? 'croak' : 'pet');
    if (a.wild) {
      if (!a.befriended) { a.befriended = true; if (this.discover(a.sk, a.color)) this.toast(`You made friends with a ${a.col.name.toLowerCase()} ${a.sp.name.toLowerCase()}!`, 'good'); }
      return;
    }
    if (!a.petted) { a.petted = true; a.friend = Math.min(5, a.friend + 0.35); }
    // cows give milk and sheep give wool when they're ready
    if (a.ready && a.sp.produce === 'milk') { a.ready = false; this.give('milk', 1); this.float(a.x, a.y - 1.4, '+1 milk'); }
    if (a.ready && a.sp.produce === 'wool') { a.ready = false; this.give('wool:' + a.col.name, 1); this.float(a.x, a.y - 1.4, `+1 ${a.col.name.toLowerCase()} wool`); }
    if (a.gift) { const k = a.gift; a.gift = null; this.give(k, 1); this.float(a.x, a.y - 1.4, `A gift: ${itemName(k).toLowerCase()}!`); this.sfx('pickup'); }
    if (a.muddy && a.sp.muddy) { a.muddy = false; this.puff(a.x, a.y - 0.3, '#9fd8ff', 10); this.float(a.x, a.y - 1.6, 'Squeaky clean!'); }
  }
  give(item, n) { this.inv[item] = (this.inv[item] || 0) + n; this.emit('inv'); }
  dropItem(item, x, y) { this.items.push({ item, x, y, t: 0, vy: -2.2, z: 0 }); }
  pickup(it) {
    this.items = this.items.filter((q) => q !== it);
    this.give(it.item, 1); this.sfx('pickup'); if (/egg/i.test(it.item)) this.stats.eggs++; this.float(it.x, it.y - 0.8, `+1 ${itemName(it.item).toLowerCase()}`);
  }
  useThing(o) {
    const D = DEF[o.id];
    if (o.shop) return this.emit('shop');
    if (D.hut) { const h = this.helpers.find((q) => q.home === o.uid); return this.toast(h ? `${h.name} the ${h.R.name.toLowerCase()} lives here. ${h.status}.` : 'An empty helper\'s cottage. Hire a helper in the Helpers tab at the market.'); }
    if (o.id === 'house') return this.emit('enter', o);
    if (D.hive) return this.useHive(o);
    if (D.feeder === 'feeder') { if (o.amount >= D.cap) return this.toast('It\'s already full.'); if (this.coins < 2) return this.toast('Refilling costs 2 coins.', 'bad'); this.coins -= 2; o.amount = D.cap; this.puff(o.x + 1, o.y + 0.6, '#f2cf5b', 8); this.sfx('fill'); return; }
    if (D.feeder === 'trough') { o.amount = D.cap; this.puff(o.x + 1, o.y + 0.6, '#7fd3ff', 8); this.sfx('splash'); return; }
    if (o.id === 'nest' && o.eggs.length) { for (const e of o.eggs) this.give(e.item, 1); this.stats.eggs += o.eggs.length; this.float(o.x + 0.5, o.y - 0.3, `+${o.eggs.length} egg${o.eggs.length > 1 ? 's' : ''}`); o.eggs = []; this.sfx('pickup'); return; }
    if (D.home) { const n = this.animals.filter((a) => a.home === o.uid).length; return this.toast(`${D.name}: ${n} of ${D.cap} spaces used.`); }
  }
  sell() {
    let total = 0, n = 0;
    for (const [k, c] of Object.entries(this.inv)) { if (!c) continue; total += itemPrice(k) * c; n += c; }
    if (!n) return 0;
    this.inv = {}; this.coins += total; this.stats.sold += n; this.stats.earned = (this.stats.earned || 0) + total; this.sfx('coin'); this.emit('inv');
    return total;
  }
  // ------------------------------------------- adopting wild critters
  // a home the player made for a wild species: ponds they dug, or hay bales for mice
  habitat(sk) {
    const W = this.world, need = SPECIES[sk].adopt, have = this.animals.filter((a) => a.adopted && a.sk === sk);
    const dug = []; for (let i = 0; i < W.W * W.H; i++) if (W.dug[i]) dug.push(i);
    const xy = (i) => [i % W.W, (i / W.W) | 0];
    const deep = dug.filter((i) => { const [x, y] = xy(i); return !W.nearType(x, y, 1, (q, a, b) => !W.isPond(a, b)); });
    const taken = (x, y) => this.animals.some((a) => !a.wild && Math.floor(a.x) === x && Math.floor(a.y) === y);
    let cap = 0, spots = [], why = '';
    if (need === 'pond') {
      cap = Math.ceil(dug.length / 2); why = 'Dig a pond first (build mode, Decor tab: Pond water)';
      for (const i of dug) { const [x, y] = xy(i); for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) if (W.walkable(x + dx, y + dy) && !taken(x + dx, y + dy)) spots.push([x + dx, y + dy]); }
    } else if (need === 'bigpond') {
      cap = Math.floor(dug.length / 6); why = 'Swans need a dug pond of at least 6 tiles';
      spots = (deep.length ? deep : dug).map(xy).filter(([x, y]) => !taken(x, y));
    } else if (need === 'deeppond') {
      cap = deep.length; why = 'Capybaras need a deep dug pond: at least 3×3 tiles, so the middle is all water';
      spots = deep.map(xy).filter(([x, y]) => !taken(x, y));
    } else if (need === 'hay') {
      const hay = this.things.filter((o) => o.id === 'haybale'); cap = hay.length * 2; why = 'Mice love hay: place a hay bale on your farm';
      for (const o of hay) for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1]]) if (W.walkable(o.x + dx, o.y + dy) && !taken(o.x + dx, o.y + dy)) spots.push([o.x + dx, o.y + dy]);
    }
    if (cap > 0 && have.length >= cap) { why = need === 'hay' ? 'Your hay bales are full: place another one' : 'Your pond is full: dig it bigger'; cap = 0; }
    return cap > 0 && spots.length ? { spot: spots[Math.floor(Math.random() * spots.length)] } : { why: why || 'No room for it yet' };
  }
  adopt(a) {
    if (!a.wild || !SPECIES[a.sk].adopt) return 'This one can\'t be adopted';
    if (!a.befriended) return 'Give it a pat first';
    if (!(this.snacks > 0)) return 'You need a critter snack: buy one in the shop (Animals tab)';
    const h = this.habitat(a.sk); if (h.why) return h.why;
    this.snacks--; this.puff(a.x, a.y - 0.3, '#ffd6ec', 10);
    a.adopted = true; a.wild = false; a.name = pick(ANIMAL_NAMES); a.friend = 1; a.happy = 0.75; a.petted = true; a.path = null; a.state = 'idle'; a.capy = null;
    a.x = h.spot[0] + 0.5; a.y = h.spot[1] + 0.6; a.hx = h.spot[0]; a.hy = h.spot[1];
    this.puff(a.x, a.y - 0.3, '#ffd6ec', 10); this.heart(a.x, a.y - 1);
    this.stats.adopted = (this.stats.adopted || 0) + 1; this.sfx('catch');
    this.toast(`${a.name} the ${a.sp.name.toLowerCase()} moved onto your farm! 💕`, 'good'); this.emit('changed');
    return null;
  }
  // find a farm animal a new home (frees space for babies), or let a critter go back to the wild
  rehome(a) {
    if (a.wild) return;
    if (a.adopted) { a.adopted = false; a.wild = true; a.befriended = false; this.toast(`${a.name} hopped back to the wild. Bye bye!`); }
    else { const c = Math.floor(a.sp.price / 2); this.animals = this.animals.filter((q) => q !== a); this.coins += c; this.toast(`${a.name} went to a lovely new home down the road. +${c} coins`); }
    this.puff(a.x, a.y - 0.3, '#ffd6ec', 10); this.emit('changed');
  }
  buyAnimal(sk) {
    const S = SPECIES[sk]; if (this.coins < S.price) return 'Not enough coins';
    const home = this.freeHome(sk); if (!home) return `Build a ${S.home === 'coop' ? 'chicken coop' : 'big barn'} with room for it first`;
    this.coins -= S.price;
    // shops sell the common colours; rare ones come from breeding
    const cs = S.colors.map((c, i) => [c, i]).filter(([c]) => c.rare <= 1);
    const ws = cs.map(([c]) => c.rare ? 0.4 : 1); let s = Math.random() * ws.reduce((a, b) => a + b), ci = cs[0][1];
    for (let i = 0; i < cs.length; i++) { s -= ws[i]; if (s <= 0) { ci = cs[i][1]; break; } }
    const a = this.addAnimal(sk, ci, home.door[0], home.door[1] + 1, { home: home.uid, age: 3 });
    this.puff(a.x, a.y, '#ffffff', 10); this.sfx('coin');
    this.toast(`Say hello to ${a.name}, your new ${a.col.name.toLowerCase()} ${S.name.toLowerCase()}!`, 'good');
    this.emit('changed');
    return null;
  }

  // ---------------------------------------------------------------- time
  update(dt) {
    this.goalT += dt;
    if (this.goalT > 0.5 && this.started && this.tut >= TUTORIAL.length) {
      this.goalT = 0; const G = GOALS[this.goal];
      if (G && G.done(this)) { this.coins += G.reward; this.goal++; this.emit('quest', { G, next: GOALS[this.goal] }); this.sfx('catch'); this.heart(this.player.x, this.player.y - 1.6); this.emit('changed'); }
    }
    this.time += dt / this.DAY_SEC * 18 * 60;
    if (this.time >= 24 * 60) this.endDay();
    // weather drifts towards today's plan
    const want = this.weather.raining && this.time > this.weather.from && this.time < this.weather.to ? 1 : 0;
    this.weather.rain += (want - this.weather.rain) * Math.min(1, dt * 0.4);
    // clouds and wind drift towards what today's weather wants
    const K = this.weather.kind || 'sunny', Wt = this.weather;
    const cT = K === 'rain' ? (want ? 1 : 0.55) : K === 'cloudy' ? 0.75 : K === 'windy' ? 0.35 : 0.12;
    const wT = K === 'windy' ? 1 : K === 'rain' ? 0.45 : K === 'cloudy' ? 0.3 : 0.15;
    Wt.clouds = (Wt.clouds ?? cT) + (cT - (Wt.clouds ?? cT)) * Math.min(1, dt * 0.15);
    Wt.wind = (Wt.wind ?? wT) + (wT - (Wt.wind ?? wT)) * Math.min(1, dt * 0.15);
    if (this.weather.rain > 0.5) { for (const o of this.things) if (DEF[o.id].feeder === 'trough') o.amount = DEF[o.id].cap; if (!this.rained) { this.rained = true; this.rainOnSoil(); } } else this.rained = false;
    for (const a of this.animals) a.update(dt, this);
    this.updateBugs(dt);
    if (this.started) this.updateHelpers(dt);
    this.updateFishing(dt);
    this.growTrees(dt);
    for (const o of this.world.objs) { if (o.shake > 0) o.shake -= dt; if (o.fallT > 0) o.fallT -= dt * 1.4; }
    // birds lay through the morning: an egg goes into a nest if there's room
    for (const a of this.animals) {
      if (a.wild || a.baby || !a.layToday) continue;
      if (this.time > a.layAt) { a.layToday = false; this.lay(a); }
    }
    // trees planted by the player grow up
    for (const it of this.items) { it.t += dt; if (it.z < 0 || it.vy < 0) { it.vy += dt * 9; it.z = Math.min(0, it.z + it.vy * dt); if (it.z >= 0) { it.z = 0; it.vy = 0; } } }
    // walk over items to collect them
    // dropped goodies hop over to you when you're close
    for (const it of [...this.items]) {
      const d = dist(it.x, it.y, this.player.x, this.player.y);
      if (it.t > 0.5 && d < 2.6) { const k = Math.min(1, dt * (4 + it.t * 3)); it.x += (this.player.x - it.x) * k; it.y += (this.player.y - it.y) * k; }
      if (it.t > 0.4 && d < 0.6) this.pickup(it);
    }
    for (const p of this.fx) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g || 0) * dt; }
    this.fx = this.fx.filter((p) => p.t < p.life);
    for (const f of this.floats) f.t += dt;
    this.floats = this.floats.filter((f) => f.t < 1.6);
  }
  lay(a) {
    const item = a.goldenToday ? 'goldenEgg' : a.sp.produce;
    const nests = this.things.filter((o) => o.id === 'nest' && o.eggs.length < 3);
    nests.sort((p, q) => dist(p.x, p.y, a.x, a.y) - dist(q.x, q.y, a.x, a.y));
    if (nests.length && dist(nests[0].x, nests[0].y, a.x, a.y) < 25) nests[0].eggs.push({ item });
    else this.dropItem(item, a.x, a.y + 0.1);
    if (item === 'goldenEgg') this.toast(`${a.name} laid a golden egg! ✨`, 'good');
  }
  endDay() {
    this.fishing = null; if (this.player.act) this.player.act = null;
    // overnight: animals settle up, babies arrive, a new day begins at 6:00
    const report = { babies: [], produce: 0, unhappy: [] };
    const owned = this.animals.filter((a) => !a.wild);
    for (const a of owned) {
      if (a.adopted) {
        // adopted critters just want a daily pat; happy ones leave a little gift by morning
        a.happy = clamp(a.petted ? a.happy * 0.4 + 0.6 : a.happy * 0.75, 0, 1);
        if (a.petted && a.happy > 0.6) a.friend = Math.min(5, a.friend + 0.35);
        if (a.petted && a.happy > 0.55 && Math.random() < 0.5 + a.friend * 0.1) {
          const G = a.sp.gifts, tot = G.reduce((s, g) => s + g[1], 0); let r = Math.random() * tot, item = G[0][0];
          for (const [k, w] of G) { r -= w; if (r <= 0) { item = k; break; } }
          a.gift = item; report.produce++;
        }
        a.petted = false; a.age += 1; continue;
      }
      const home = this.homeOf(a);
      const beauty = home ? this.beautyNear(home.door[0], home.door[1], 7) : 0;
      const care = (a.ate ? 0.3 : a.hunger < 0.5 ? 0.15 : 0) + (a.drank ? 0.25 : this.weather.raining ? 0.25 : 0) + (a.petted ? 0.3 : 0) + (home ? 0.1 : 0) + Math.min(0.15, beauty / 120);
      a.happy = clamp(a.happy * 0.35 + care * 0.65 + (a.muddy ? -0.05 : 0), 0, 1);
      if (a.petted && a.happy > 0.6) a.friend = Math.min(5, a.friend + 0.25);
      if (!a.petted && !a.ate && !a.drank) a.friend = Math.max(0, a.friend - 0.25);
      if (a.happy < 0.4) report.unhappy.push(a);
      a.age += 1; a.petted = false; a.ate = 0; a.drank = 0;
      a.hunger = Math.min(a.hunger, 0.5); a.thirst = Math.min(a.thirst, 0.5);
      // produce for tomorrow
      const S = a.sp;
      if (!a.baby && S.produce && a.happy >= 0.45 && (this.day % S.every === 0 || a.happy > 0.85)) {
        if (S.produce === 'milk' || S.produce === 'wool') a.ready = true;
        else if (S.produce !== 'truffle') { a.layToday = true; a.layAt = 6.5 * 60 + Math.random() * 4 * 60; a.goldenToday = a.sk === 'chicken' && a.friend >= 4 && a.happy > 0.85 && Math.random() < 0.12; }
        report.produce++;
      }
    }
    // romance: two happy grown-ups of a kind, with room at home, may have a baby
    for (const sk of FARM_SPECIES) {
      const adults = owned.filter((a) => a.sk === sk && !a.baby && a.happy > 0.65 && a.friend >= 1.5);
      for (let i = 0; i + 1 < adults.length; i += 2) {
        if (Math.random() > 0.45) continue;
        const home = this.freeHome(sk); if (!home) { (report.full = report.full || []).push(sk); break; }
        const A = adults[i], B = adults[i + 1];
        const col = this.babyColor(sk, A.color, B.color);
        const b = this.addAnimal(sk, col, home.door[0], home.door[1] + 1, { home: home.uid, age: 0, friend: 1, happy: 0.8 });
        report.babies.push({ b, A, B, rare: SPECIES[sk].colors[col].rare >= 2 });
        this.stats.born++;
      }
    }
    for (const o of this.things) if (DEF[o.id].feeder === 'trough' && this.weather.raining) o.amount = DEF[o.id].cap;
    this.day++;
    this.growCrops(); this.hiveMorning(); this.payHelpers(report); this.regrowIsland(); this.time = 6 * 60; this.dayTruffles = 0;
    // weather: about one day in four has a shower
    const rnd = mulberry32(this.seed + this.day * 31)();
    this.weather.raining = rnd < 0.25 && this.day > 2; this.weather.from = 8 * 60 + rnd * 600; this.weather.to = this.weather.from + 120 + rnd * 300;
    // and the rest of the cycle: sunny, cloudy or windy days
    const r2 = mulberry32(this.seed + this.day * 57)();
    this.weather.kind = this.weather.raining ? 'rain' : this.day <= 2 ? 'sunny' : r2 < 0.45 ? 'sunny' : r2 < 0.72 ? 'cloudy' : 'windy';
    // sleepers wake up at home
    const house = this.things.find((o) => o.id === 'house');
    if (this.inside) { const bed = this.inside.things.find((o) => DEF[o.id].bed), r = this.inside; this.player.x = bed ? Math.min(r.W - 0.5, bed.x + bed.w + 0.5) : r.door[0] + 0.5; this.player.y = bed ? bed.y + 1.6 : r.door[1] + 0.6; this.player.dir = 'down'; this.player.path = null; }
    else if (house) { this.player.x = house.door[0] + 0.5; this.player.y = house.door[1] + 0.7; this.player.dir = 'down'; this.player.path = null; }
    for (const a of owned) { a.state = 'idle'; a.path = null; const h = this.homeOf(a); if (h && dist(a.x, a.y, h.door[0], h.door[1]) > 6) { const s = this.homeSpot(h, a); a.x = s[0] + 0.5; a.y = s[1] + 0.6; } }
    for (const a of this.animals) if (a.wild) a.befriended = false;
    this.emit('morning', report);
    this.save();
  }
  babyColor(sk, ca, cb) {
    const cs = SPECIES[sk].colors, r = Math.random();
    if (r < 0.38) return ca; if (r < 0.76) return cb;
    // a surprise colour: rarer ones are less likely, ones you haven't found yet more likely
    const seen = this.dex[sk] || [], w = cs.map((c, i) => [1, 0.6, 0.3, 0.1][c.rare] * (seen.includes(i) ? 1 : 3)); let s = Math.random() * w.reduce((a, b) => a + b);
    for (let i = 0; i < cs.length; i++) { s -= w[i]; if (s <= 0) return i; }
    return ca;
  }
  beautyNear(x, y, R) {
    let b = 0;
    for (const o of this.things) if (dist(o.x + o.w / 2, o.y + o.h / 2, x, y) < R) b += DEF[o.id].beauty;
    for (const o of this.world.objs) if (o.kind === 'flower' && dist(o.x, o.y, x, y) < R) b += 0.3;
    return b;
  }
  beauty() { let b = 0; for (const o of this.things) b += DEF[o.id].beauty; const d = this.world.dug; for (let i = 0; i < d.length; i++) if (d[i]) b++; return b; }   // dug ponds count too

  // ------------------------------------------------------------ effects
  puff(x, y, col, n = 4) { for (let i = 0; i < n; i++) this.fx.push({ x: x + (Math.random() - 0.5) * 0.4, y: y - Math.random() * 0.2, vx: (Math.random() - 0.5) * 1.6, vy: -Math.random() * 1.2, g: 2, t: 0, life: 0.5 + Math.random() * 0.3, col, s: 1 + Math.random() }); }
  heart(x, y) { this.fx.push({ x, y, vx: 0, vy: -0.9, t: 0, life: 1.1, heart: true }); }
  float(x, y, text, col) { this.floats.push({ x, y, text, col: col || '#fff7d6', t: 0 }); }
  sfx(name) { if (!this.muteSfx) this.emit('sfx', name); }

  // --------------------------------------------------------------- saving
  serialize() {
    const W = this.world;
    return {
      v: 1, seed: this.seed, farmName: this.farmName, goal: this.goal, bag: this.bag, coins: this.coins, inv: this.inv, snacks: this.snacks || 0, fert: this.fert || 0, helpers: this.helpers.map((h) => ({ role: h.role, home: h.home, paid: h.paid })), dex: this.dex, day: this.day, time: this.time, stats: this.stats,
      look: this.player.look, px: this.player.x, py: this.player.y, inside: this.inside ? this.inside.house.uid : null, nextUid: this.nextUid,
      things: this.things.map((o) => ({ uid: o.uid, id: o.id, x: o.x, y: o.y, v: o.v, amount: o.amount, eggs: o.eggs, shop: o.shop, room: o.room, honey: o.honey })),
      paths: [...W.path.keys()].filter((i) => W.path[i]),
      dug: [...W.dug.keys()].filter((i) => W.dug[i]),
      soil: [...W.soil.keys()].filter((i) => W.soil[i]), wet: [...W.wet.keys()].filter((i) => W.wet[i]),
      crops: [...this.crops].map(([i, c]) => [i, c.c, c.g, c.f ? 1 : 0]), fertOn: this.fertOn !== false, seeds: this.seeds, seedSel: this.seedSel,
      objs: this.world.objs.map((o) => { const c = Object.assign({}, o); delete c.shake; return c; }),
      fishDex: this.fishDex, tut: this.tut,
      animals: this.animals.filter((a) => !a.wild).map((a) => ({ id: a.id, sk: a.sk, color: a.color, name: a.name, x: a.x, y: a.y, age: a.age, friend: a.friend, happy: a.happy, home: a.home, ready: a.ready, muddy: a.muddy, hunger: a.hunger, thirst: a.thirst, adopted: a.adopted, hx: a.hx, hy: a.hy, gift: a.gift })),
      weather: { raining: this.weather.raining, from: this.weather.from, to: this.weather.to, kind: this.weather.kind },
    };
  }
  save() { store.set(SLOT_KEY(this.slot || 1), this.serialize()); }
  load(s) {
    const W = this.world;
    this.farmName = s.farmName; this.goal = s.goal || 0; this.bag = s.bag || {}; this.coins = s.coins; this.inv = s.inv || {}; this.snacks = s.snacks || 0; this.fert = s.fert || 0;
    for (const k of Object.keys(this.bag)) if (!DEF[k]) { this.coins += (k === 'kitchenset' ? 140 : k === 'kitchen' ? 90 : 0) * this.bag[k]; delete this.bag[k]; }   // retired items: refund
    this.dex = s.dex || {}; this.day = s.day; this.time = s.time; this.stats = Object.assign(this.stats, s.stats || {});
    this.nextUid = s.nextUid || 1; Object.assign(this.weather, s.weather || {});
    this.fishDex = s.fishDex || [];
    if (s.objs) {          // the island exactly as it was left
      W.objs = []; W.objAt.clear(); W.block.fill(0);
      for (const o of s.objs) { if (o.kind === 'shell') continue; W.addObj(o); if (['tree', 'rock', 'ore', 'bush', 'berry'].includes(o.kind)) W.block[W.idx(o.x, o.y)] = 1; }
    } else { const fx = W.farm.x, fy = W.farm.y; W.clearArea(fx - 14, fy - 10, fx + 14, fy + 12, true); }
    for (const i of s.paths || []) this.setPath(i % W.W, (i / W.W) | 0, true);
    for (const i of s.dug || []) this.setPond(i % W.W, (i / W.W) | 0, true);
    for (const i of s.soil || []) W.soil[i] = 1;
    for (const i of s.wet || []) W.wet[i] = 1;
    for (const [i, c, g, f] of s.crops || []) if (CROP[c]) this.crops.set(i, { c, g, f: !!f });
    this.fertOn = s.fertOn !== false;
    this.seeds = s.seeds || {}; this.seedSel = s.seedSel || 'wheat';
    for (const t of s.things) {
      const [w, h] = this.dims(t.id, t.v);
      const o = Object.assign({ w, h }, t); if (DEF[t.id].door) o.door = [o.x + Math.floor(w / 2), o.y + h];
      W.clearArea(o.x, o.y, o.x + w - 1, o.y + h - 1); this.things.push(o); this.stampThing(o, true);
    }
    for (const a of s.animals) { const an = new Animal(a.sk, a.color, a.x, a.y, a); Object.assign(an, { ready: a.ready, muddy: a.muddy, gift: a.gift }); this.animals.push(an); }
    for (const h of s.helpers || []) { const hut = this.things.find((o) => o.uid === h.home); if (!hut || !ROLES[h.role]) continue; const H = new Helper(h.role, h.home, hut.door[0] + 0.5, hut.door[1] + 0.6); H.paid = h.paid !== false; this.helpers.push(H); }
    this.player.x = s.px; this.player.y = s.py;
    // saved while indoors: wake up back inside the house
    const home = s.inside != null && this.things.find((o) => o.uid === s.inside);
    if (home) { this.inside = this.roomOf(home); if (!this.inside.walkP(Math.floor(s.px), Math.floor(s.py))) { this.player.x = this.inside.door[0] + 0.5; this.player.y = this.inside.door[1] + 0.6; } }
    else if (!W.walkP(Math.floor(s.px), Math.floor(s.py))) {
      // somewhere you can't stand (e.g. an older save made indoors): go to the front door
      const h = this.things.find((o) => o.id === 'house');
      if (h) { this.player.x = h.door[0] + 0.5; this.player.y = h.door[1] + 0.7; } else { this.player.x = W.farm.x + 0.5; this.player.y = W.farm.y + 4.6; }
    }
  }
}
function itemName(k) { const [base, sub] = k.split(':'); return (sub ? sub + ' ' : '') + ITEMS[base].name.toLowerCase().replace(/^./, (c) => sub ? c : c.toUpperCase()); }
function itemPrice(k) { const [base, sub] = k.split(':'); const S = SPECIES.sheep.colors.find((c) => c.name === sub); return ITEMS[base].price + (S ? S.rare * 10 : 0); }
