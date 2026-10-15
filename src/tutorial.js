// ---------------------------------------------------------------- tutorial
// A guided first day. Each step points at something on the map (or a button)
// and finishes itself when the player has done it.
const nearestObj = (g, kinds, pred) => { let b = null, bd = 1e9; for (const o of g.world.objs) if (kinds.includes(o.kind) && (!pred || pred(o))) { const d = dist(o.x, o.y, g.player.x, g.player.y); if (d < bd) { bd = d; b = o; } } return b; };
const thingOf = (g, id) => g.things.find((o) => o.id === id);
const TUTORIAL = [
  { text: 'Welcome to your farm! Walk around with <b>WASD</b> or the <b>arrow keys</b>, or just <b>click</b> where you want to go.',
    start: (g) => ({ x: g.player.x, y: g.player.y }), done: (g, s) => dist(g.player.x, g.player.y, s.x, s.y) > 3 },
  { text: 'These are your hens. <b>Click a hen</b> to give her a pat. Animals love a pat every day!',
    target: (g) => { const a = g.animals.find((q) => q.sk === 'chicken' && !q.petted) || g.animals.find((q) => q.sk === 'chicken'); return a && { x: a.x, y: a.y - 1.2 }; },
    done: (g) => g.animals.some((a) => a.sk === 'chicken' && a.petted) },
  { text: 'Hungry animals eat hay. <b>Click the hay feeder</b> to fill it up (2 coins).',
    target: (g) => { const o = thingOf(g, 'feeder'); return o && { x: o.x + 1, y: o.y - 0.3 }; }, done: (g) => g.things.some((o) => o.id === 'feeder' && o.amount > 0) },
  { text: 'Now <b>click the water trough</b> to fill it with fresh water. Water is free!',
    target: (g) => { const o = thingOf(g, 'trough'); return o && { x: o.x + 1, y: o.y - 0.3 }; }, done: (g) => g.things.some((o) => o.id === 'trough' && o.amount > 0) },
  { text: 'Happy hens lay eggs in the <b>nest</b>. Here are a couple to start you off: <b>click the nest</b> to collect them.',
    enter: (g) => { const o = thingOf(g, 'nest'); if (o && !o.eggs.length) o.eggs.push({ item: 'egg' }, { item: 'egg' }); },
    target: (g) => { const o = thingOf(g, 'nest'); return o && { x: o.x + 0.5, y: o.y - 0.2 }; }, done: (g) => g.stats.eggs >= 1 },
  { text: 'There are lots of ways to earn coins. <b>Pick some wildflowers</b> in the meadow: click on 3 flowers.',
    start: (g) => ({ n: g.stats.picked }), target: (g) => { const o = nearestObj(g, ['flower']); return o && { x: o.x + 0.5, y: o.y - 0.2 }; }, done: (g, s) => g.stats.picked >= s.n + 3 },
  { text: 'This brown patch is your <b>field</b>. <b>Click the soil</b> to plant seeds. You\'ve got some wheat and carrots to start.',
    start: (g) => ({ n: g.stats.planted || 0 }), target: (g) => { const W = g.world; for (let i = 0; i < W.soil.length; i++) if (W.soil[i] && !g.crops.has(i)) return { x: i % W.W + 0.5, y: ((i / W.W) | 0) - 0.2 }; return null; }, done: (g, s) => (g.stats.planted || 0) > s.n },
  { text: 'Seeds need water to grow. <b>Click a planted seed</b> to water it (the can splashes the tiles around it too). Crops grow a little every night after a watering.',
    start: (g) => ({ n: g.stats.watered || 0 }), target: (g) => { const W = g.world; for (const [i] of g.crops) if (!W.wet[i]) return { x: i % W.W + 0.5, y: ((i / W.W) | 0) - 0.2 }; return null; }, done: (g, s) => (g.stats.watered || 0) > s.n },
  { text: '<b>Chop a tree</b> for logs: click on a tree and your farmer will grab an axe. Trees grow back after a couple of days.',
    target: (g) => { const o = nearestObj(g, ['tree'], (q) => !q.stump); return o && { x: o.x + 0.5, y: o.y - 2.6 }; }, done: (g) => g.stats.logs >= 1 },
  { text: '<b>Mine a rock</b> for stone. Sparkly coloured rocks hide gems that are worth a lot!',
    target: (g) => { const o = nearestObj(g, ['rock', 'ore']); return o && { x: o.x + 0.5, y: o.y - 0.4 }; }, done: (g) => g.stats.stone >= 1 },
  { text: 'Let\'s go fishing! <b>Click on the water</b> near the shore to cast your line. Look for fish shadows.<br>When you see <b>!</b> click again, quick!',
    target: (g) => { let b = null, bd = 1e9; for (const s of g.fishSpots) { const d = dist(s.x, s.y, g.player.x, g.player.y) + (s.pond ? 0 : 10); if (d < bd) { bd = d; b = s; } } return b && { x: b.x + 0.5, y: b.y - 0.2 }; }, done: (g) => g.stats.fish >= 1 },
  { text: 'Your basket is filling up! Walk to the <b>market stall</b> and click it, then open <b>Sell</b> to turn everything into coins.',
    target: (g) => { const o = g.things.find((q) => q.shop); return o && { x: o.x + 1.5, y: o.y - 1.6 }; }, done: (g) => g.stats.sold >= 1 },
  { text: 'Time to make it pretty! Press <b>B</b> (or the <b>Build</b> button) for build mode. Your bag of things to place is along the bottom: pick the <b>flowers</b> and click on the grass to plant them.',
    ui: '#bBuild', start: (g) => ({ n: g.stats.built || 0 }), done: (g, s) => (g.stats.built || 0) > s.n },
  { text: 'The bar on the left lets you <b>Move</b> things, <b>Pick up</b> things back into your bag, or <b>Destroy</b> them. Made a mistake? Press <b>Undo</b> (or <b>Ctrl+Z</b>).',
    ui: '#bdUndo', start: (g) => ({ n: g.stats.undos || 0 }), done: (g, s) => (g.stats.undos || 0) > s.n, skip: 'Got it' },
  { text: 'Buy more decorations, fences and buildings at the <b>Shop</b>. They wait in your bag until you place them. Press <b>B</b> again (or <b>Done</b>) to leave build mode.',
    ui: '#bShop', done: (g) => false, skip: 'Got it' },
  { text: 'That\'s the basics! Feed, water and pat your animals every day. Happy animals that love you have <b>babies</b>, sometimes in brand new colours for your <b>Critterdex</b>. Pat wild critters and you can <b>adopt</b> them too. Click your house to go inside: decorate it with furniture from the shop, and sleep in your bed each evening. Have fun!',
    finish: true },
];
function makeTutorial(game) {
  const T = { state: null };
  T.step = () => TUTORIAL[game.tut];
  T.active = () => game.tut < TUTORIAL.length;
  T.enter = () => { const S = T.step(); if (!S) return; T.state = S.start ? S.start(game) : {}; if (S.enter) S.enter(game); game.emit('tut'); };
  T.next = () => {
    const S = T.step(); game.tut++;
    if (S && !S.finish) { game.coins += 5; game.float(game.player.x, game.player.y - 1.8, '+5 coins', '#ffd23a'); game.sfx('coin'); }
    T.enter(); game.emit('changed');
  };
  T.skipAll = () => { game.tut = 99; game.emit('tut'); };
  T.update = () => { const S = T.step(); if (!S || S.finish) return; if (!T.state) T.enter(); if (S.done(game, T.state)) T.next(); };
  T.target = () => { const S = T.step(); return S && S.target ? S.target(game) : null; };
  return T;
}
