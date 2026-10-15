// ---------------------------------------------------------------- sprites
const IMG = {};
function loadAssets() {
  return Promise.all(Object.entries(SPRITES).map(([k, src]) => new Promise((res) => {
    const im = new Image(); im.onload = () => { IMG[k] = /Kapybara/.test(k) ? keyOut(im, [0, 149, 233]) : im; res(); }; im.onerror = () => res(); im.src = src;
  })));
}
// the capybara frames come with a square of water painted behind them: cut it out
function keyOut(im, rgb) {
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
  const g = c.getContext('2d'); g.drawImage(im, 0, 0); const d = g.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < d.data.length; i += 4) if (d.data[i] === rgb[0] && d.data[i + 1] === rgb[1] && d.data[i + 2] === rgb[2]) d.data[i + 3] = 0;
  g.putImageData(d, 0, 0); return c;
}
const P = {
  water: 'Tiles/Water/Water_Tile_1', waterAnim: 'Tiles/Water/Water_Tile_1_Anim', waterMid: 'Tiles/Water/Water_Middle_Anim_1',
  beach: 'Tiles/Beach/Beach_Tiles', grassTiles: 'Tiles/Grass/Grass_Tiles_1', grassMid: 'Tiles/Grass/Grass_1_Middle',
  cobble: 'Tiles/Cobble_Road/Cobble_Road_1', farm: 'Tiles/FarmLand/FarmLand_Tile', farmWet: 'Tiles/FarmLand/FarmLand_Wet_Tile',
  food: 'Icons/Outline/Food_Icons_Outline', res: 'Icons/Outline/Resources_Icons_Outline', other: 'Icons/Outline/Other_Icons_Outline',
  tools: 'Icons/Outline/Tool_Icons_Outline', od: 'Outdoor decoration/', anim: 'Outdoor decoration/Outdoor_Decor_Animations/',
};

// count the animation frames in every row of a sheet (frames are left-aligned)
const frameCache = new Map();
function rowFrames(key, fw, fh) {
  const ck = key + ':' + fw + 'x' + fh; if (frameCache.has(ck)) return frameCache.get(ck);
  const im = IMG[key]; const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
  const g = c.getContext('2d'); g.drawImage(im, 0, 0); const d = g.getImageData(0, 0, im.width, im.height).data;
  const rows = [];
  for (let r = 0; r < Math.floor(im.height / fh); r++) {
    let n = 0;
    for (let col = 0; col < Math.floor(im.width / fw); col++) {
      let any = false;
      for (let y = r * fh; y < r * fh + fh && !any; y += 1) for (let x = col * fw; x < col * fw + fw; x += 1) if (d[(y * im.width + x) * 4 + 3]) { any = true; break; }
      if (any) n = col + 1;
    }
    rows.push(n);
  }
  frameCache.set(ck, rows); return rows;
}

// ---------------------------------------------------------- autotiles
// Ground is drawn on a dual grid: each drawn tile sits on a grid vertex and
// looks at the 4 terrain cells around it. Corner bits: TL=8 TR=4 BL=2 BR=1.
// The pack's sheets come in two shapes: a 3x3 "island" (centre filled) or
// "ring" (centre empty), and a 2x2 "blob"/"hole" with the inner corners.
const LAYOUT = {
  island3: [[1, 3, 2], [5, 15, 10], [4, 12, 8]],
  ring3: [[14, 12, 13], [10, 0, 5], [11, 3, 7]],
  hole2: [[14, 13], [11, 7]],
  blob2: [[1, 2], [4, 8]],
};
function autoTable(parts) {        // parts: [[layout, col0, row0], ...] -> mask -> [sx, sy]
  const t = {};
  for (const [lay, c0, r0] of parts) {
    const L = LAYOUT[lay];
    for (let r = 0; r < L.length; r++) for (let c = 0; c < L[r].length; c++) { const m = L[r][c]; if (!(m in t)) t[m] = [(c0 + c) * TS, (r0 + r) * TS]; }
  }
  return t;
}
const AUTO = {
  // grass bank around water: ring of grass with water centre, blob = grass island
  grassWater: autoTable([['ring3', 0, 0], ['blob2', 0, 3]]),
  // sand beach in water (foam animated in 6 frames of 80px)
  sandWater: autoTable([['island3', 0, 0], ['hole2', 3, 0]]),
  // grass over sand / paths
  grassSand: autoTable([['ring3', 0, 5], ['blob2', 0, 8]]),
  // cobbles over sand
  cobbleSand: autoTable([['island3', 0, 0], ['hole2', 0, 3]]),
};

// ------------------------------------------------------------ animals
// Layouts of the pack's animal sheets (row numbers). Quadrupeds have side /
// down / up views; birds are side-on only. All of them face left.
const QUAD = { fw: 32, fh: 32, idle: [0, 1, 2], walk: [3, 4, 5], eat: 6, extra: 7, lieDown: 8, getUp: 9, lie: 10, sleep: 11, hit: [12, 13, 14] };
const BIRD = { fw: 32, fh: 32, idle: [0], walk: [1], eat: 2, lieDown: 3, getUp: 4, lie: 5, sleep: 6, hit: [7] };
const WBIRD = { fw: 32, fh: 32, idle: [0], walk: [1], eat: 0, lieDown: 2, getUp: 3, lie: 4, sleep: 5, hit: [6], swimIdle: 7, swim: 8, swimSleep: 9 };
const FROG = { fw: 32, fh: 32, idle: [0], walk: [0], eat: 2, extra: 1, hit: [3] };
const MOUSE = { fw: 32, fh: 32, idle: [0], walk: [1], eat: 2, hit: [3] };

const n2 = (i) => String(i).padStart(2, '0');
const SPECIES = {
  chicken: {
    name: 'Chicken', plural: 'Chickens', layout: BIRD, home: 'coop', price: 25, speed: 1.6, size: 1,
    produce: 'egg', every: 1, sound: 'cluck',
    colors: [['Snow', 1], ['Snow Crest', 2], ['Cream', 3], ['Cream Crest', 4], ['Honey', 5], ['Honey Crest', 6], ['Ginger', 7], ['Ginger Crest', 8],
      ['Chestnut', 9], ['Chestnut Crest', 10], ['Cocoa', 11], ['Cocoa Crest', 12], ['Silver', 13], ['Silver Crest', 14], ['Bluebell', 15], ['Bluebell Crest', 16],
      ['Midnight', 17], ['Midnight Crest', 18]].map(([n, i]) => ({ name: n, key: 'Animals/Chicken/Chicken_' + n2(i), rare: i >= 15 ? 2 : i >= 11 ? 1 : 0 }))
      .concat([{ name: 'Rooster', key: 'Animals/Chicken/Rooster', rare: 3 }]),
  },
  duck: {
    name: 'Duck', plural: 'Ducks', layout: WBIRD, home: 'coop', price: 40, speed: 1.4, size: 1, swims: true,
    produce: 'duckEgg', every: 1,
    colors: [{ name: 'Mallard', key: 'Animals/Duck/Duck_01', rare: 0 }, { name: 'Sunny', key: 'Animals/Duck/Duck_02', rare: 1 },
      { name: 'Hen Mallard', key: 'Animals/Duck/Duck_03', rare: 0 }, { name: 'Pearl', key: 'Animals/Duck/Duck_04', rare: 1 },
      { name: 'Duck in a Hat', key: 'Animals/Duck/Duck_in_a_hat', rare: 3 }],
  },
  goose: {
    name: 'Goose', plural: 'Geese', layout: BIRD, home: 'coop', price: 60, speed: 1.5, size: 1,
    produce: 'gooseEgg', every: 2,
    colors: [['Cream', 1], ['Silver', 2], ['Charcoal', 3], ['Cream Ruff', 4], ['Silver Ruff', 5], ['Charcoal Ruff', 6]].map(([n, i]) => ({ name: n, key: 'Animals/Goose/Goose_' + n2(i), rare: i > 3 ? 2 : 0 })),
  },
  sheep: {
    name: 'Sheep', plural: 'Sheep', layout: QUAD, home: 'barn', price: 90, speed: 1.3, size: 2,
    produce: 'wool', every: 2,
    colors: [['Cloud', 1], ['Strawberry', 2], ['Tangerine', 3], ['Lemon', 4], ['Mint', 5], ['Blueberry', 6], ['Grape', 7], ['Bubblegum', 8], ['Stormy', 9]]
      .map(([n, i]) => ({ name: n, key: 'Animals/Sheep/Sheep_' + n2(i), rare: i === 1 || i === 9 ? 0 : i === 7 || i === 8 ? 2 : 1 })),
  },
  pig: {
    name: 'Pig', plural: 'Pigs', layout: QUAD, home: 'barn', price: 100, speed: 1.3, size: 2,
    produce: 'truffle', every: 2, muddy: true,
    colors: [['Rosy', 1], ['Peach', 3], ['Caramel', 5], ['Silver', 7], ['Bluebell', 9], ['Denim', 11], ['Slate', 13], ['Midnight', 15]]
      .map(([n, i]) => ({ name: n, key: 'Animals/Pig/Pig_' + n2(i), mud: 'Animals/Pig/Pig_' + n2(i + 1), rare: i <= 3 ? 0 : i <= 7 ? 1 : 2 })),
  },
  cow: {
    name: 'Cow', plural: 'Cows', layout: QUAD, home: 'barn', price: 140, speed: 1.2, size: 2,
    produce: 'milk', every: 1,
    colors: [['Vanilla', 1], ['Peach', 2], ['Caramel', 3], ['Chestnut', 4], ['Cocoa', 5], ['Chocolate', 6], ['Silver', 7], ['Bluebell', 8], ['Charcoal', 9]]
      .map(([n, i]) => ({ name: n, key: 'Animals/Cow/Cow_' + n2(i), rare: i <= 3 ? 0 : i === 8 || i === 9 ? 2 : 1 })),
  },
  horse: {
    name: 'Horse', plural: 'Horses', layout: QUAD, home: 'barn', price: 220, speed: 2.4, size: 2,
    produce: null, every: 0, gift: 'horseshoe',
    colors: [['Bay', 1], ['Palomino', 2], ['Chestnut', 3], ['Dapple', 4], ['Midnight', 5]].map(([n, i]) => ({ name: n, key: 'Animals/Horse/Horse_' + n2(i), rare: i >= 4 ? 2 : 0 })),
  },
  // wild visitors: befriend them with a pat; they're counted in the Critterdex
  frog: { name: 'Frog', plural: 'Frogs', layout: FROG, wild: true, speed: 0, size: 0.8, adopt: 'pond', gifts: [['emerald', 1], ['mushroom', 3], ['flower', 4]],
    colors: [['Leaf', 1], ['Sky', 2], ['Cherry', 3], ['Orchid', 4], ['Sunshine', 5], ['Peach', 6]].map(([n, i]) => ({ name: n, key: 'Animals/Frog/Frog_' + n2(i), rare: i === 1 ? 0 : i >= 4 ? 2 : 1 })) },
  mouse: { name: 'Mouse', plural: 'Mice', layout: MOUSE, wild: true, speed: 2.2, size: 0.8, facesRight: true, adopt: 'hay', gifts: [['wheat', 4], ['berryRed', 3], ['amber', 1]],
    colors: [['Pebble', 1], ['Cream', 2], ['Shadow', 3], ['Hazel', 4]].map(([n, i]) => ({ name: n, key: 'Animals/Mouse/Mouse_' + n2(i), rare: i === 1 ? 0 : 1 })) },
  swan: { name: 'Swan', plural: 'Swans', layout: WBIRD, wild: true, speed: 0.9, size: 1, swims: true, waterOnly: true, adopt: 'bigpond', gifts: [['swanFeather', 1]],
    colors: [['Snow', 1], ['Ebony', 2], ['Blush', 3]].map(([n, i]) => ({ name: n, key: 'Animals/Swan/Swan_' + n2(i), rare: i - 1 })) },
  capybara: { name: 'Capybara', plural: 'Capybaras', wild: true, special: 'capy', speed: 0, size: 1, adopt: 'deeppond', gifts: [['amber', 3], ['sapphire', 2], ['ruby', 1], ['amethyst', 1]],
    colors: [{ name: 'Cocoa', key: 'Animals/Kapybara/Static/Kapybara_', rare: 0 }, { name: 'Albino', key: 'Animals/Kapybara/Static/Albino_Kapybara_', rare: 3 }] },
};
const FARM_SPECIES = ['chicken', 'duck', 'goose', 'sheep', 'pig', 'cow', 'horse'];
const WILD_SPECIES = ['frog', 'mouse', 'swan', 'capybara'];

// --------------------------------------------------------------- items
// icon: [sheet, col, row] on a 16px grid
const ITEMS = {
  egg: { name: 'Egg', price: 6, icon: [P.food, 6, 1] },
  duckEgg: { name: 'Duck egg', price: 10, icon: [P.food, 6, 1], tint: '#cfe8ff' },
  gooseEgg: { name: 'Goose egg', price: 18, icon: [P.food, 6, 1], tint: '#fff2c4', big: true },
  goldenEgg: { name: 'Golden egg', price: 120, icon: [P.food, 6, 1], tint: '#ffd23a' },
  milk: { name: 'Milk', price: 16, icon: [P.food, 7, 9] },
  wool: { name: 'Wool', price: 22, icon: [P.res, 5, 4], tinted: true },
  truffle: { name: 'Truffle', price: 30, icon: [P.food, 4, 1] },
  horseshoe: { name: 'Lucky horseshoe', price: 40, icon: [P.res, 1, 3] },
  feather: { name: 'Feather', price: 3, icon: [P.res, 3, 4] },
  swanFeather: { name: 'Swan feather', price: 35, icon: [P.res, 3, 4] },
  flower: { name: 'Wildflowers', price: 4, icon: [P.other, 0, 0] },
  mushroom: { name: 'Mushroom', price: 8, icon: [P.food, 4, 0] },
  wheat: { name: 'Wheat', price: 4, icon: [P.food, 0, 3] },
  // gathered around the island
  log: { name: 'Log', price: 5, icon: [P.res, 0, 4] },
  stone: { name: 'Stone', price: 3, icon: [P.res, 0, 0] },
  copper: { name: 'Copper ore', price: 10, icon: ['Outdoor decoration/Ores', 5, 1] },
  gold: { name: 'Gold nugget', price: 25, icon: ['Outdoor decoration/Ores', 5, 2] },
  emerald: { name: 'Emerald', price: 40, icon: ['Outdoor decoration/Ores', 6, 3] },
  sapphire: { name: 'Sapphire', price: 40, icon: ['Outdoor decoration/Ores', 6, 4] },
  amber: { name: 'Amber', price: 30, icon: ['Outdoor decoration/Ores', 6, 5] },
  ruby: { name: 'Ruby', price: 50, icon: ['Outdoor decoration/Ores', 6, 6] },
  amethyst: { name: 'Amethyst', price: 45, icon: ['Outdoor decoration/Ores', 6, 7] },
  berryRed: { name: 'Strawberries', price: 6, icon: ['Crops/Berries', 1, 0] },
  berryBlue: { name: 'Blackberries', price: 7, icon: ['Crops/Berries', 3, 0] },
  apple: { name: 'Apple', price: 6, icon: ['Crops/Fruit_Trees_Fruit_Objects', 0, 0] },
  minnow: { name: 'Minnow', price: 8, icon: [P.food, 1, 2], fish: 'pond' },
  bluegill: { name: 'Bluegill', price: 11, icon: [P.food, 0, 2], fish: 'pond' },
  perch: { name: 'Perch', price: 14, icon: [P.food, 4, 2], fish: 'pond' },
  bass: { name: 'Bass', price: 18, icon: [P.food, 3, 2], fish: 'pond' },
  goldfish: { name: 'Golden carp', price: 60, icon: [P.food, 6, 2], fish: 'pond', rare: true },
  sardine: { name: 'Sardine', price: 9, icon: [P.food, 2, 2], fish: 'sea' },
  snapper: { name: 'Red snapper', price: 24, icon: [P.food, 5, 2], fish: 'sea' },
  grouper: { name: 'Grouper', price: 32, icon: [P.food, 7, 2], fish: 'sea', rare: true },
};
const FLOWER_ICONS = [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1]];
// wool icon tints per sheep colour
const WOOL_TINT = { Cloud: '#f2f2f2', Strawberry: '#f5555d', Tangerine: '#e07438', Lemon: '#ffc825', Mint: '#3fb07a', Blueberry: '#2a83d6', Grape: '#93388f', Bubblegum: '#f389f5', Stormy: '#858585' };
