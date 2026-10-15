// ------------------------------------------------------------------ main
(async function main() {
  await loadAssets();
  const canvas = $('#game'), R = new Renderer(canvas);
  window.addEventListener('resize', () => R.resize());
  const audio = makeAudio();
  let build = null, tut = null, game = null, ui = null, last = performance.now(), time = 0, sel = null, hover = null, mouse = null;
  const input = { left: false, right: false, up: false, down: false };
  const app = {
    select(a) { sel = a; ui.card(a); },
    use(o) { const D = DEF[o.id], tx = o.door ? o.door[0] : o.x + Math.floor(o.w / 2), ty = o.door ? o.door[1] : o.y + o.h; walkTo(tx + 0.5, ty + 0.5, D.door ? 0.5 : 1.6, () => game.useThing(o), o); },
    walk(x, y) { walkTo(x, y, 1.2, null); },
  };
  window.__rr = { get game() { return game; }, R, app, get sel() { return sel; }, get tut() { return tut; } };

  // a peaceful island behind the title screen
  const demo = new Game({ seed: 12345, look: { hair: LOOKS.hair[0], shirt: LOOKS.shirt[0], pants: LOOKS.pants[0], shoes: LOOKS.shoes[0], hat: null } });
  game = demo; R.cam.x = demo.world.farm.x; R.cam.y = demo.world.farm.y + 2; R.cam.z = 3;

  installTitle((opts) => {
    $('#title').classList.add('hidden');
    game = new Game(opts); game.started = true;
    ui = installUI(game, app);
    game.on('sfx', (n) => audio.play(n));
    game.on('shop', () => ui.openShop('animals'));
    // the pokemon-style door: fade to black, then you're inside
    game.on('enter', (house) => { if (fading) return; app.select(null); fade(() => { outZoom = R.cam.z; game.enterHouse(house); roomCam(true); }); });
    game.on('scene', () => { if (tut) tut.update(); });
    game.on('changed', () => { ui.hud(); ui.seedBar(); });
    game.on('seeds', () => ui.seedBar()); game.on('scene', () => ui.seedBar());
    ui.seedBar();
    build = installBuild(game, app, ui);
    tut = makeTutorial(game); ui.tutorial(tut);
    game.on('undo', () => ui.undoState());
    $('#bUndo').onclick = () => { game.undo(); ui.hud(); };
    // pause menu: resume, settings, back to the main menu
    const openPause = () => { $('#pMain').classList.remove('hidden'); $('#pSet').classList.add('hidden'); $('#pTag').textContent = `${game.farmName} · Day ${game.day}`; $('#pause').classList.remove('hidden'); };
    $('#bMenu').onclick = openPause; app.pause = openPause;
    $('#pResume').onclick = () => $('#pause').classList.add('hidden');
    $('#pQuit').onclick = () => { game.save(); location.reload(); };
    $('#pSettings').onclick = () => { $('#pMain').classList.add('hidden'); $('#pSet').classList.remove('hidden'); showSettings(); };
    $('#pBack').onclick = () => { $('#pSet').classList.add('hidden'); $('#pMain').classList.remove('hidden'); };
    addEventListener('pagehide', () => game && game.started && game.save());
    for (const id of ['#hud', '#tools', '#hint']) $(id).classList.remove('hidden');
    ui.undoState();
    R.cam.x = game.player.x; R.cam.y = game.player.y; R.cam.z = settings.zoom || (innerWidth < 700 ? 2.5 : 3); outZoom = R.cam.z; if (game.inside) roomCam(true);
    ui.hud(); hint();
    setInterval(() => game && game.save(), 20000);
    audio.unlock();
  });
  let fading = 0, fadeCb = null, outZoom = 3;
  // player settings, kept between visits
  const settings = Object.assign({ vol: 0.7, music: 0.5, birds: true, tips: true, zoom: 0 }, store.get('critter-cove-settings') || {});
  const saveSettings = () => { store.set('critter-cove-settings', settings); audio.setVolume(settings.vol); audio.setMusic(settings.music); };
  audio.setVolume(settings.vol); audio.setMusic(settings.music);
  // browsers only allow sound after the first click or key press
  for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, () => audio.unlock(), { capture: true });
  function showSettings() {
    const vol = $('#sVol'), z = $('#sZoom');
    const mu = $('#sMusic'); mu.value = Math.round(settings.music * 100); $('#sMusicV').textContent = mu.value + '%';
    mu.oninput = () => { settings.music = mu.value / 100; $('#sMusicV').textContent = mu.value + '%'; saveSettings(); };
    vol.value = Math.round(settings.vol * 100); $('#sVolV').textContent = vol.value + '%';
    vol.oninput = () => { settings.vol = vol.value / 100; $('#sVolV').textContent = vol.value + '%'; saveSettings(); audio.play('pop'); };
    $('#sBirds').checked = settings.birds; $('#sBirds').onchange = () => { settings.birds = $('#sBirds').checked; saveSettings(); };
    $('#sTips').checked = settings.tips; $('#sTips').onchange = () => { settings.tips = $('#sTips').checked; saveSettings(); hint(); };
    z.value = settings.zoom || R.cam.z; $('#sZoomV').textContent = (+z.value).toFixed(1) + '×';
    z.oninput = () => { settings.zoom = +z.value; $('#sZoomV').textContent = (+z.value).toFixed(1) + '×'; if (!game.inside) R.cam.z = settings.zoom; outZoom = settings.zoom; saveSettings(); };
  }
  function leaveHouse() { if (fading || !game.inside) return; fade(() => { game.exitHouse(); R.cam.z = outZoom; R.cam.x = game.player.x; R.cam.y = game.player.y; }); }
  // inside, the camera frames the whole room
  function roomCam(snap) {
    const r = game.inside; if (!r) return;
    const z = clamp(Math.min(innerWidth / ((r.W + 3) * 16), (innerHeight - (build && build.on ? 230 : 150)) / ((r.H + 2) * 16)), 1.5, 6);
    const tx = r.W / 2, ty = r.H / 2 + (build && build.on ? 1.2 : 0.2);
    if (snap) { R.cam.z = z; R.cam.x = tx; R.cam.y = ty; }
    else { R.cam.z += (z - R.cam.z) * 0.15; R.cam.x += (tx - R.cam.x) * 0.15; R.cam.y += (ty - R.cam.y) * 0.15; }
  }
  function sleep() {
    if (game.time < 18 * 60) return game.toast('It\'s too early for bed. Come back in the evening!');
    fade(() => game.endDay());
  }
  function fade(cb) { fading = 0.0001; fadeCb = cb; }
  function hint() {
    if (!ui) return;
    const msgs = ['WASD or click to walk · click animals to pat them', 'Click trees, rocks and flowers to gather · click water to fish', 'Visit the market stall to shop and sell · Ctrl+Z undoes a build · scroll to zoom', 'Click your field to plant · click seedlings to water them', 'Pat wild critters, then adopt them with a critter snack', 'Click your house to go inside and decorate · press B to build'];
    $('#hint').classList.toggle('hidden', !settings.tips);
    $('#hint').textContent = msgs[Math.floor(performance.now() / 9000) % msgs.length];
  }

  // ---------------------------------------------------------------- input
  const keymap = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right' };
  addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (keymap[e.code]) { input[keymap[e.code]] = true; e.preventDefault(); }
    if (!ui) return;
    if (e.code === 'Space' && game.fishing) { game.reel(); e.preventDefault(); return; }
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') { if (build.carry) build.cancelCarry(); game.undo(); ui.hud(); build.refresh(); e.preventDefault(); return; }
    const modalOpen = document.querySelector('.modal:not(.hidden)');
    if (e.code === 'KeyB' && !modalOpen) { build.toggle(); e.preventDefault(); return; }
    if (e.code === 'KeyM' && !build.on) { const open = !$('#map').classList.contains('hidden'); if (open) $('#map').classList.add('hidden'); else if (!modalOpen) ui.openMap(); e.preventDefault(); return; }
    if (build.on && !modalOpen && build.key(e)) { e.preventDefault(); return; }
    if (e.code === 'Escape') { if (modalOpen) { for (const m of document.querySelectorAll('.modal')) m.classList.add('hidden'); } else if (sel) app.select(null); else if (app.pause) app.pause(); }
  });
  addEventListener('keyup', (e) => { if (keymap[e.code]) input[keymap[e.code]] = false; });
  addEventListener('blur', () => { for (const k in input) input[k] = false; });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); R.cam.z = clamp(R.cam.z * (e.deltaY > 0 ? 0.9 : 1.1), 1.5, 6); }, { passive: false });
  canvas.addEventListener('pointermove', (e) => { mouse = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerleave', () => { mouse = null; });
  canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); if (build && build.on) { if (build.carry) build.cancelCarry(); else build.id = null; build.refresh(); } });
  let drag = null; const touches = new Map(); let pinch = null;
  canvas.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') touches.set(e.pointerId, [e.clientX, e.clientY]); if (touches.size === 2) { const [a, b2] = [...touches.values()]; pinch = { d: Math.hypot(a[0] - b2[0], a[1] - b2[1]), z: R.cam.z }; drag = null; } });
  canvas.addEventListener('pointermove', (e) => { if (!touches.has(e.pointerId)) return; touches.set(e.pointerId, [e.clientX, e.clientY]); if (pinch && touches.size === 2) { const [a, b2] = [...touches.values()]; R.cam.z = clamp(pinch.z * Math.hypot(a[0] - b2[0], a[1] - b2[1]) / pinch.d, 1.5, 6); } });
  const endTouch = (e) => { touches.delete(e.pointerId); if (touches.size < 2) pinch = null; };
  canvas.addEventListener('pointerup', endTouch); canvas.addEventListener('pointercancel', endTouch);
  canvas.addEventListener('pointerdown', (e) => {
    if (!ui || e.button === 2 || pinch) return;
    audio.unlock();
    mouse = [e.clientX, e.clientY];
    drag = { x: e.clientX, y: e.clientY, placed: new Set() };
    click(e.clientX, e.clientY, drag);
  });
  canvas.addEventListener('pointermove', (e) => {
    // drag to paint fences, paths and flowers
    if (!drag || !build || !build.on || !build.dragPaints() || !(e.buttons & 1)) return;
    click(e.clientX, e.clientY, drag);
  });
  addEventListener('pointerup', () => { drag = null; });

  function click(px, py, dg) {
    const [wx, wy] = R.toWorld(px, py), tx = Math.floor(wx), ty = Math.floor(wy);
    if (build.on) { build.click(wx, wy, dg); ui.hud(); return; }
    if (game.inside) return clickInside(wx, wy);
    // a line in the water: clicking reels in
    if (game.fishing && game.fishing.state !== 'cast') { game.reel(); return; }
    // what did we click? animals first, then items, then things
    const hp = game.helperAt(wx, wy); if (hp) { game.toast(`${hp.name} the ${hp.R.name.toLowerCase()}: ${hp.status}.`); return; }
    const bug = game.bugAt(wx, wy); if (bug) { walkTo(bug.x, bug.y, 2.2, () => { if (game.bugs.includes(bug)) game.admireBug(bug); else game.toast('It fluttered away!'); }); return; }
    let best = null, bd = 0.9;
    for (const a of game.animals) { if (a.capy === 'Under') continue; const d = dist(wx, wy, a.x, a.y - 0.45 * (a.sp.size || 1)); if (d < bd) { bd = d; best = a; } }
    // nests, feeders and troughs win over an animal standing on them
    const small = game.thingAt(tx, ty); if (small && DEF[small.id].cat === 'farm' && small.id !== 'fence' && small.id !== 'gate' && bd > 0.35) best = null;
    if (best) { const wet = game.world.isWater(Math.floor(best.x), Math.floor(best.y)); walkTo(best.x, best.y, wet ? 2.4 : 1.3, () => { game.pet(best); app.select(best); }); app.select(best); return; }
    const it = game.items.find((q) => dist(wx, wy, q.x, q.y - 0.3) < 0.6);
    if (it) { walkTo(it.x, it.y, 0, null); return; }
    const o = game.thingVisualAt(wx, wy);
    if (o) {
      const D = DEF[o.id], tx2 = o.door ? o.door[0] : o.x + Math.floor(o.w / 2), ty2 = o.door ? o.door[1] : o.y + o.h;
      walkTo(tx2 + 0.5, ty2 + 0.5, D.door ? 0.5 : 1.6, () => game.useThing(o), o);
      return;
    }
    // farm soil: plant, water or harvest
    const so = soilAt(wx, wy);
    if (so) { walkTo(so[0] + 0.5, so[1] + 0.5, 1.2, () => game.useSoil(so[0], so[1]), true); return; }
    // scenery you can gather from
    const ob = sceneryAt(wx, wy);
    if (ob) { walkTo(ob.x + 0.5, ob.y + 0.5, 1.4, () => game.gather(ob), true); return; }
    // water: walk to the shore and cast a line
    if (game.world.isWater(tx, ty)) { goFish(tx, ty); return; }
    app.select(null);
    walkTo(wx, wy, 0, null);
  }
  function clickInside(wx, wy) {
    const r = game.inside, [dx, dy] = r.door, tx = Math.floor(wx), ty = Math.floor(wy);
    // the doormat (or the doorway) takes you back out
    if (tx === dx && (ty === dy || ty === dy + 1)) { walkTo(dx + 0.5, dy + 0.5, 0, leaveHouse); return; }
    const o = r.thingVisualAt(wx, wy);
    if (o && DEF[o.id].bed) {
      // walk to the free tile nearest the bed, then hop in
      let best = null, bd = 1e9; const P0 = game.player;
      for (let y = o.y - 1; y <= o.y + o.h; y++) for (let x = o.x - 1; x <= o.x + o.w; x++) if (r.walkP(x, y)) { const d = dist(x, y, P0.x, P0.y); if (d < bd) { bd = d; best = [x, y]; } }
      if (best) walkTo(best[0] + 0.5, best[1] + 0.5, 0, sleep); else sleep();
      return;
    }
    if (r.inb(tx, ty)) walkTo(wx, wy, 0, null);
  }
  // is the farmer standing at (or hovering over) the field? then show the seed picker
  function nearSoil() {
    if (!game.started || game.inside || (build && build.on)) return false;
    if (hover && hover.soil) return true;
    const W = game.world, px = Math.floor(game.player.x), py = Math.floor(game.player.y);
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (W.inb(px + dx, py + dy) && W.soil[W.idx(px + dx, py + dy)]) return true;
    return false;
  }
  // a soil tile under the cursor (tall crops can be clicked on their leaves too)
  function soilAt(wx, wy) {
    const W = game.world, tx = Math.floor(wx), ty = Math.floor(wy), S = (x, y) => W.inb(x, y) && W.soil[W.idx(x, y)];
    if (S(tx, ty)) return [tx, ty];
    const c = game.cropAt(tx, ty + 1); if (c && game.cropStage(c) >= 2) return [tx, ty + 1];
    return null;
  }
  // trees are tall: click anywhere on the leaves
  function sceneryAt(wx, wy) {
    const W = game.world, tx = Math.floor(wx), ty = Math.floor(wy);
    for (let dy = 0; dy <= 3; dy++) {
      const o = W.objAt.get(W.idx(tx, ty + dy)); if (!o) continue;
      if (o.kind === 'tree' && dy <= (o.stump ? 0 : o.size === 'Big' ? 3 : 2) && Math.abs(wx - (o.x + 0.5)) < (o.size === 'Big' && !o.stump ? 1.6 : 1)) return o;
      if (dy === 0 && game.gatherLabel(o)) return o;
    }
    return null;
  }
  function goFish(tx, ty) {
    const W = game.world, P0 = game.player;
    // nearest dry tile within reach of the water
    let best = null, bd = 1e9;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const x = tx + dx, y = ty + dy; if (!W.walkP(x, y)) continue;
      const d = dist(x, y, P0.x, P0.y) + Math.hypot(dx, dy) * 0.5; if (d < bd) { bd = d; best = [x, y]; }
    }
    if (!best) return game.toast('Too far from the shore to fish here. Try closer to land.', 'bad');
    const cast = () => game.startFishing(tx, ty);
    if (Math.floor(P0.x) === best[0] && Math.floor(P0.y) === best[1]) return cast();
    const p = findPath(W, Math.floor(P0.x), Math.floor(P0.y), best[0], best[1], 6000, 0, (a, b) => W.walkP(a, b));
    if (p) { P0.path = p; P0.onArrive = cast; } else game.toast('You can\'t get there from here.', 'bad');
  }
  function walkTo(x, y, reach, cb, thing) {
    const P0 = game.player, W = game.inside || game.world;
    if (dist(P0.x, P0.y, x, y) <= Math.max(reach, 0.6) + 0.4 && cb) { P0.path = null; P0.face(x - P0.x, y - P0.y); cb(); return; }
    let tx = Math.floor(x), ty = Math.floor(y);
    let p = findPath(W, Math.floor(P0.x), Math.floor(P0.y), tx, ty, 6000, reach > 2 ? 2 : reach > 0.7 ? 1 : thing ? 1 : 0, (a, b) => W.walkP(a, b));
    if (!p && reach > 2) p = findPath(W, Math.floor(P0.x), Math.floor(P0.y), tx, ty, 6000, 3, (a, b) => W.walkP(a, b));
    if (p) { P0.path = p; P0.onArrive = cb ? () => { P0.face(x - P0.x, y - P0.y); cb(); } : null; if (!p.length && cb) { P0.onArrive = null; cb(); } }
    else game.toast('You can\'t get there from here.', 'bad');
  }

  // ----------------------------------------------------------------- loop
  function frame(now) {
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now; time += dt;
    if (fading) {
      fading += dt * 1.4;
      if (fading >= 1 && fadeCb) { const f = fadeCb; fadeCb = null; f(); }
      if (fading >= 2) fading = 0;
    }
    const paused = !!document.querySelector('.modal:not(.hidden)');
    if (game.started && !fadeCb && !paused) {
      if (game.inside) {
        const r = game.inside, P0 = game.player;
        P0.update(dt, { world: r, puff: () => {} }, build.on ? {} : input);
        // step out through the door at the bottom of the room
        if (!build.on && input.down && Math.floor(P0.x) === r.door[0] && P0.y > r.H - 0.45) leaveHouse();
      } else game.player.update(dt, game, build.on ? {} : input);
      if (build.on && !game.inside) { const sp = dt * 14 / R.cam.z * 3; R.cam.x += ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * sp; R.cam.y += ((input.down ? 1 : 0) - (input.up ? 1 : 0)) * sp; }
      game.update(dt);
      if (tut) tut.update();
      if (settings.birds && !game.isNight() && game.weather.rain < 0.3 && Math.random() < dt * 0.12) audio.play('chirp');
      if (game.time >= 24 * 60 - 1 && !fading) fade(() => {});
    }
    // camera follows the player (on the menu it drifts along the beach)
    const tgt = game.player;
    if (!game.started) { R.cam.x = 30 + time * 0.5; R.cam.y = BEACH.shoreY - 1.5; R.cam.z = innerWidth < 700 ? 2.5 : 3.2; }
    else if (game.inside) roomCam(false);
    else if (!(build && build.on)) { R.cam.x += (tgt.x - R.cam.x) * Math.min(1, dt * 5); R.cam.y += (tgt.y - 0.5 - R.cam.y) * Math.min(1, dt * 5); }
    draw(dt);
    if (Math.floor(time * 4) !== Math.floor((time - dt) * 4)) audio.setMood(!game.started ? 'menu' : game.isNight() ? 'night' : 'day');
    if (ui) { if (Math.floor(time * 4) !== Math.floor((time - dt) * 4)) { const ns = nearSoil(); if (ns !== ui.nearSoil) { ui.nearSoil = ns; ui.seedBar(); } ui.hud(); if (Math.floor(time) !== Math.floor(time - dt)) ui.needs(); if (sel && game.inside) app.select(null); else if (sel) { if (dist(sel.x, sel.y, game.player.x, game.player.y) > 8) app.select(null); else ui.card(sel); } hint(); } }
    requestAnimationFrame(frame);
  }

  // the main menu: a sunny beach, half sand and half sea, with waves rolling in
  const BEACH = (() => {
    const W = 4000, H = 40, shoreY = 19;
    const shore = (x) => shoreY + Math.sin(x * 0.21) * 1.2 + Math.sin(x * 0.07 + 1) * 2;
    const grass = (x) => shoreY - 5 + Math.sin(x * 0.17 + 2) * 1.1 + Math.sin(x * 0.05) * 1.5;
    return { W, H, shoreY, grass, inb: (x, y) => x >= 0 && y >= 0 && x < W && y < H, get: (x, y) => (y < grass(x) ? GRASS : y < shore(x) ? SAND : WATER), isPond: () => false };
  })();
  // the menu's weather goes round a little cycle: sunny, breezy, cloudy, a shower
  const menuWx = { c: 0.15, w: 0.2, r: 0 };
  function drawBeach(dt) {
    R.drawGround(BEACH, time);
    const [x0, y0, x1] = R.view(), g = R.g;
    // a meadow above the beach: trees, bushes and flowers
    const list = [];
    for (let x = Math.floor(x0) - 2; x <= Math.ceil(x1) + 2; x++) {
      const top = Math.floor(BEACH.grass(x)) - 1;
      for (let y = Math.floor(y0) - 3; y <= top; y++) {
        const h = hash2(x, y, 11);
        const edge = y >= top - 4;
        if (h < (edge ? 0.34 : 0.1) && (x + y) % 2 === 0) { const kind = ['Oak', 'Birch', 'Spruce', 'Oak'][Math.floor(hash2(x, y, 12) * 4)]; list.push([y, { kind: 'tree', x, y, tree: kind, size: hash2(x, y, 13) < 0.6 ? 'Big' : 'Medium' }]); }
        else if (h < 0.3) list.push([y - 0.5, { kind: 'flower', x, y, sheet: 1 + Math.floor(hash2(x, y, 14) * 5), row: Math.floor(hash2(x, y, 15) * 10), ph: h * 9 }]);
      }
      if (hash2(x, 0, 16) < 0.35) list.push([top - 0.5, { kind: 'flower', x, y: top, sheet: 1 + Math.floor(hash2(x, 1, 14) * 5), row: Math.floor(hash2(x, 1, 15) * 10), ph: x }]);
    }
    list.sort((a, b) => a[0] - b[0]);
    for (const [, o] of list) drawObj(R, o, time);
    drawBeachLife();
    const ph = (((Math.floor(time / 20) % 4) + 4) % 4) || 0, T = [[0.12, 0.15, 0], [0.35, 1, 0], [0.8, 0.3, 0], [1, 0.45, 0.8]][ph], k = Math.min(1, dt * 0.25);
    menuWx.c += (T[0] - menuWx.c) * k; menuWx.w += (T[1] - menuWx.w) * k; menuWx.r += (T[2] - menuWx.r) * k;
    drawSky(dt, menuWx.c, menuWx.w); drawRain(dt, menuWx.r);
  }
  function drawBeachLife() {
    const [x0, , x1] = R.view();
    // things that drift past: repeat every 24 tiles along the beach
    for (let n = Math.floor(x0 / 24) - 1; n <= Math.ceil(x1 / 24) + 1; n++) {
      const bx = n * 24, h = (k) => hash2(n, k, 7);
      const bob = (ph) => Math.sin(time * 1.6 + ph) * 0.08;
      // a little rowing boat
      if (h(1) < 0.7) R.spr('Outdoor decoration/Boat', 0, 0, 48, 48, bx + 6 + h(2) * 8, BEACH.shoreY + 6 + h(3) * 3 + bob(n), {});
      // swans and ducks paddling
      for (let k = 0; k < 3; k++) {
        const sk = ['swan', 'duck', 'swan'][k], c = Math.floor(h(10 + k) * SPECIES[sk].colors.length), key = SPECIES[sk].colors[c].key;
        const sx = bx + 2 + k * 7 + Math.sin(time * 0.25 + k + n) * 1.5, sy = BEACH.shoreY + 4 + h(20 + k) * 8;
        const f = Math.floor(time * 6 + k) % 4;
        const nf = Math.max(1, rowFrames(key, 32, 32)[WBIRD.swim] || 1);
        R.spr(key, (f % nf) * 32, WBIRD.swim * 32, 32, 32, sx, sy + bob(k), { oy: 10, flip: Math.cos(time * 0.25 + k + n) > 0 });
      }
      // a capybara having a soak
      if (h(30) < 0.5) { const im = IMG['Animals/Kapybara/Static/Kapybara_Idle']; if (im) { const nf = im.width / 32; R.spr('Animals/Kapybara/Static/Kapybara_Idle', (Math.floor(time * 5) % nf) * 32, 0, 32, 32, bx + 18, BEACH.shoreY + 3.2, { oy: 6 }); } }
      // chickens and frogs on the sand
      if (h(40) < 0.6) { const ck = SPECIES.chicken.colors[Math.floor(h(41) * 10)].key, f = Math.floor(time * 3 + n) % Math.max(1, rowFrames(ck, 32, 32)[0] || 1); R.spr(ck, f * 32, 0, 32, 32, bx + 10 + h(42) * 6, BEACH.shoreY - 4 - h(43) * 6, { oy: 8, flip: h(44) < 0.5 }); }
    }
  }
  function draw(dt) {
    const g = R.g; g.imageSmoothingEnabled = false;
    if (!game.started) return drawBeach(dt);
    if (game.inside) return drawInside(dt);
    R.drawGround(game.world, time);
    { const [a0, b0, a1, b1] = R.view(); game.drawSoil(R, a0, b0, a1, b1); }
    const [x0, y0, x1, y1] = R.view();
    // fish shadows swimming at the fishing spots
    if (game.fishSpots) for (const sp of game.fishSpots) if (sp.x > x0 - 1 && sp.x < x1 + 1 && sp.y > y0 - 1 && sp.y < y1 + 1) {
      const f = Math.floor(time * 6 + sp.ph) % 16; g.globalAlpha = 0.85; R.tile('Tiles/Water/Fish_Animated_Tile', f * 16, 0, sp.x, sp.y); g.globalAlpha = 1;
    }
    const list = [];
    for (const o of game.world.objs) if (o.x > x0 - 3 && o.x < x1 + 3 && o.y > y0 - 1 && o.y < y1 + 5) list.push([o.y + 1 - (o.kind === 'lily' || o.kind === 'grass' || o.kind === 'flower' ? 0.6 : o.kind === 'tree' ? 0.08 : 0), () => drawObj(R, o, time)]);
    for (const o of game.things) if (o.x + o.w > x0 - 2 && o.x < x1 + 2 && o.y > y0 - 2 && o.y < y1 + 8) list.push([o.y + o.h - (DEF[o.id].block ? 0 : 0.6), () => game.drawThing(R, o, time)]);
    for (const a of game.animals) if (a.x > x0 - 1 && a.x < x1 + 1 && a.y > y0 - 1 && a.y < y1 + 2) list.push([a.y, () => a.draw(R, time, game)]);
    for (const it of game.items) list.push([it.y, () => drawItem(it)]);
    for (const [i, c] of game.crops) { const cx = i % game.world.W, cy = (i / game.world.W) | 0; if (cx > x0 - 1 && cx < x1 + 1 && cy > y0 - 1 && cy < y1 + 3) list.push([cy + 0.45, () => game.drawCrop(R, i, c, time)]); }
    if (game.started) list.push([game.player.y, () => game.player.draw(R, time)]);
    for (const h of game.helpers || []) if (!h.away && h.x > x0 - 2 && h.x < x1 + 2 && h.y > y0 - 2 && h.y < y1 + 3) list.push([h.y, () => h.draw(R, time)]);
    list.sort((p, q) => p[0] - q[0]);
    for (const [, f] of list) f();
    drawBees(R, game, time);
    if (game.fishing && game.fishing.state !== 'cast') drawBobber(game.fishing);
    // hover outline / placement ghost
    if (build) build.draw(R, mouse, time);
    hover = null;
    if (mouse && game.started && !(build && build.on)) hover = hoverAt(mouse[0], mouse[1]);
    if (hover && hover.soil) { const [hx, hy] = hover.soil; g.strokeStyle = 'rgba(255,250,230,0.85)'; g.lineWidth = 2 * R.dpr; g.strokeRect(R.sx(hx) + R.dpr, R.sy(hy) + R.dpr, R.sx(hx + 1) - R.sx(hx) - 2 * R.dpr, R.sy(hy + 1) - R.sy(hy) - 2 * R.dpr); }
    canvas.style.cursor = build && build.on ? (build.tool === 'place' || build.carry ? 'var(--cur-arrow)' : 'var(--cur-hand)') : hover ? 'var(--cur-hand)' : 'var(--cur-arrow)';
    // particles
    for (const p of game.fx) {
      const a = 1 - p.t / p.life;
      if (p.heart) { g.globalAlpha = Math.min(1, a * 2); drawHeart(R.sx(p.x), R.sy(p.y), R.Z); g.globalAlpha = 1; continue; }
      if (p.leaf) { const im = IMG[p.leaf]; if (im) { g.globalAlpha = Math.min(1, a * 2); g.save(); g.translate(R.sx(p.x), R.sy(p.y)); g.rotate(p.rot + p.t * 3); g.drawImage(im, 0, 0, 16, 16, -8 * R.Z, -8 * R.Z, 16 * R.Z, 16 * R.Z); g.restore(); g.globalAlpha = 1; } p.x += Math.sin(p.t * 4 + p.rot) * 0.01; continue; }
      g.globalAlpha = a; g.fillStyle = p.col; const s = Math.round(p.s * R.Z); g.fillRect(R.sx(p.x), R.sy(p.y), s, s); g.globalAlpha = 1;
    }
    // bubbles over animals that want something
    for (const a of game.animals) if (!a.wild && !a.adopted && a.x > x0 && a.x < x1 && a.y > y0 && a.y < y1) drawNeed(a);
    drawSky(dt, game.weather.clouds ?? 0.12, game.weather.wind ?? 0.15);
    drawRain(dt);
    // day / night
    const amb = ambient(game.time).map((v) => v * (1 - (game.weather.clouds || 0) * 0.07)), lights = [];
    if (amb[2] < 245) {
      for (const o of game.things) if (DEF[o.id].light && o.x > x0 - 6 && o.x < x1 + 6 && o.y > y0 - 6 && o.y < y1 + 6) {
        if (o.id === 'house') lights.push({ x: o.x + o.w / 2, y: o.y + o.h - 0.8, r: 5, c: [255, 190, 110], a: 0.55 });
        else lights.push({ x: o.x + 0.5, y: o.y - (o.id === 'lamp' ? 1.6 : 0), r: o.id === 'campfire' ? 5 : 4.5, c: [255, 200, 120], a: 0.8 });
      }
      if (game.started) lights.push({ x: game.player.x, y: game.player.y - 0.6, r: 3, c: [120, 110, 90], a: 0.35 });
    }
    R.drawLight(amb, lights);
    for (const f of game.floats) {
      const a = clamp(1.6 - f.t, 0, 1), px = R.sx(f.x), py = R.sy(f.y) - f.t * 30 * R.dpr;
      g.globalAlpha = a; g.font = `700 ${Math.round(13 * R.dpr)}px 'Pixelify Sans', sans-serif`; g.textAlign = 'center';
      g.lineWidth = 4 * R.dpr; g.strokeStyle = '#4a2e1c'; g.strokeText(f.text, px, py); g.fillStyle = f.col; g.fillText(f.text, px, py); g.globalAlpha = 1;
    }
    if (hover && hover.label) {
      const px = mouse[0] * R.dpr + 14 * R.dpr, py = mouse[1] * R.dpr - 10 * R.dpr;
      g.font = `700 ${Math.round(13 * R.dpr)}px 'Nunito', sans-serif`; g.textAlign = 'left';
      const w = g.measureText(hover.label).width + 16 * R.dpr, h = 24 * R.dpr;
      g.fillStyle = 'rgba(255,244,220,0.95)'; g.strokeStyle = '#6b4528'; g.lineWidth = 2 * R.dpr;
      g.beginPath(); g.roundRect(px, py - h / 2, w, h, 6 * R.dpr); g.fill(); g.stroke();
      g.fillStyle = '#4a2e1c'; g.fillText(hover.label, px + 8 * R.dpr, py + 5 * R.dpr);
    }
    if (sel) { const sx = R.sx(sel.x), sy = R.sy(sel.y); g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 2 * R.dpr; g.beginPath(); g.ellipse(sx, sy, 7 * R.Z, 3 * R.Z, 0, 0, Math.PI * 2); g.stroke(); }
    if (tut && tut.active() && game.started) { const T = tut.target(); if (T) drawArrow(T.x, T.y); }
    else if (ui && ui.questArrow && GOALS[game.goal] && GOALS[game.goal].target) { const T = GOALS[game.goal].target(game); if (T) drawArrow(T.x, T.y); }
    if (fading) { g.fillStyle = `rgba(0,0,0,${fading < 1 ? fading : 2 - fading})`; g.fillRect(0, 0, R.W, R.H); }
  }
  function drawInside(dt) {
    const g = R.g, r = game.inside;
    r.draw(R, time);
    const list = [];
    for (const o of r.things) { const D = DEF[o.id]; list.push([D.rug ? -100 + o.y : D.wallItem ? -50 + o.y : o.y + o.h - (D.furn.small ? 0.05 : 0.1), () => r.drawThing(R, o, time)]); }
    list.push([game.player.y, () => game.player.draw(R, time)]);
    list.sort((p, q) => p[0] - q[0]);
    for (const [, f] of list) f();
    if (build) build.draw(R, mouse, time);
    hover = null;
    if (mouse && !(build && build.on)) {
      const [wx, wy] = R.toWorld(mouse[0], mouse[1]), tx = Math.floor(wx), ty = Math.floor(wy), [dx, dy] = r.door;
      if (tx === dx && (ty === dy || ty === dy + 1)) hover = { label: 'Leave house' };
      else { const o = r.thingVisualAt(wx, wy); if (o && DEF[o.id].bed) hover = { o, label: game.time >= 18 * 60 ? 'Go to bed' : 'Bed (sleep after 6pm)' }; }
    }
    canvas.style.cursor = build && build.on ? (build.tool === 'place' || build.carry ? 'var(--cur-arrow)' : 'var(--cur-hand)') : hover ? 'var(--cur-hand)' : 'var(--cur-arrow)';
    // cosy lighting: daylight through the windows, lamps at night
    const out = ambient(game.time), amb = out.map((v, i) => clamp(v * 0.8 + [40, 28, 10][i], 0, 255));
    const lights = [];
    if (amb[2] < 245) for (const o of r.things) {
      const D = DEF[o.id];
      if (D.light) lights.push({ x: o.x + o.w / 2, y: o.y + o.h - (o.id === 'floorlamp' ? 2 : 1), r: o.id === 'fireplace' ? 6 : 4.5, c: [255, 196, 120], a: 0.85 });
      else if (D.wallItem && /window/.test(o.id) && !game.isNight()) lights.push({ x: o.x + o.w / 2, y: o.y + 2.5, r: 4, c: [255, 240, 200], a: 0.5 });
    }
    lights.push({ x: game.player.x, y: game.player.y - 0.6, r: 2.5, c: [110, 100, 80], a: 0.3 });
    R.drawLight(amb, lights);
    if (hover && hover.label) drawLabel(hover.label);
    if (fading) { g.fillStyle = `rgba(0,0,0,${fading < 1 ? fading : 2 - fading})`; g.fillRect(0, 0, R.W, R.H); }
  }
  function drawLabel(label) {
    const g = R.g, px = mouse[0] * R.dpr + 14 * R.dpr, py = mouse[1] * R.dpr - 10 * R.dpr;
    g.font = `700 ${Math.round(13 * R.dpr)}px 'Nunito', sans-serif`; g.textAlign = 'left';
    const w = g.measureText(label).width + 16 * R.dpr, h = 24 * R.dpr;
    g.fillStyle = 'rgba(255,244,220,0.95)'; g.strokeStyle = '#6b4528'; g.lineWidth = 2 * R.dpr;
    g.beginPath(); g.roundRect(px, py - h / 2, w, h, 6 * R.dpr); g.fill(); g.stroke();
    g.fillStyle = '#4a2e1c'; g.fillText(label, px + 8 * R.dpr, py + 5 * R.dpr);
  }
  function hoverAt(px, py) {
    const [wx, wy] = R.toWorld(px, py);
    const hp = game.helperAt(wx, wy); if (hp) return { label: `${hp.name} the ${hp.R.name.toLowerCase()} · ${hp.status}` };
    const bug = game.bugAt(wx, wy); if (bug) { const c = SPECIES.butterfly.colors[bug.col], seen = (game.dex.butterfly || []).includes(bug.col); return { label: seen ? `${c.name} butterfly` : 'A butterfly! Click to take a look' }; }
    let best = null, bd = 0.9;
    for (const a of game.animals) { if (a.capy === 'Under') continue; const d = dist(wx, wy, a.x, a.y - 0.45 * (a.sp.size || 1)); if (d < bd) { bd = d; best = a; } }
    if (best) {
      const a = best;
      const what = a.wild ? `${a.col.name} ${a.sp.name.toLowerCase()}` : a.name;
      const act = a.ready && a.sp.produce === 'milk' ? 'Milk' : a.ready && a.sp.produce === 'wool' ? 'Collect wool from' : a.muddy ? 'Wash' : 'Pat';
      return { a, label: `${act} ${what}` };
    }
    const it = game.items.find((q) => dist(wx, wy, q.x, q.y - 0.3) < 0.6);
    if (it) return { it, label: `Pick up ${itemName(it.item).toLowerCase()}` };
    if (game.fishing && game.fishing.state !== 'cast') return { label: game.fishing.state === 'bite' ? 'Click now!' : 'Click to reel in' };
    const o = game.thingVisualAt(wx, wy);
    if (!o) {
      const so = soilAt(wx, wy); if (so) return { soil: so, label: game.soilLabel(so[0], so[1]) };
      const ob = sceneryAt(wx, wy); if (ob) return { ob, label: game.gatherLabel(ob) };
      const tx = Math.floor(wx), ty = Math.floor(wy);
      if (game.world.isWater(tx, ty)) { const spot = game.fishSpots.find((q) => dist(q.x, q.y, tx, ty) < 2.2); return { label: spot ? 'Fishing spot! Cast here' : `Go fishing (${game.world.isPond(tx, ty) ? 'pond' : 'sea'})` }; }
      return null;
    }
    const D = DEF[o.id];
    let label = D.name;
    if (o.shop) label = 'Shop & sell';
    else if (o.id === 'house') label = 'Go inside';
    else if (D.hive) label = game.hiveLabel(o);
    else if (D.feeder === 'feeder') label = o.amount >= D.cap ? 'Hay feeder (full)' : `Refill hay (2 coins) · ${o.amount}/${D.cap}`;
    else if (D.feeder === 'trough') label = o.amount >= D.cap ? 'Water trough (full)' : `Refill water · ${o.amount}/${D.cap}`;
    else if (o.id === 'nest') label = o.eggs.length ? `Collect ${o.eggs.length} egg${o.eggs.length > 1 ? 's' : ''}` : 'Nest box (empty)';
    else if (D.home) label = `${D.name} · ${game.animals.filter((a) => a.home === o.uid).length}/${D.cap}`;
    else if (!D.feeder) return null;
    return { o, label };
  }
  // the rod sprite already draws the line and float: just add the bite alert
  function drawBobber(F) {
    if (F.state !== 'bite') return;
    const g = R.g, Z = R.Z, P0 = game.player;
    const px = R.sx(P0.x), py = R.sy(P0.y) - 34 * Z, s = 1 + Math.sin(time * 20) * 0.08;
    g.fillStyle = '#fffaf0'; g.strokeStyle = '#6b4528'; g.lineWidth = Z;
    g.beginPath(); g.roundRect(px - 7 * Z * s, py - 9 * Z * s, 14 * Z * s, 16 * Z * s, 4 * Z); g.fill(); g.stroke();
    g.fillStyle = '#e23b3b'; g.font = `900 ${Math.round(14 * Z * s)}px 'Pixelify Sans', sans-serif`; g.textAlign = 'center'; g.fillText('!', px, py + 5 * Z * s);
  }
  function drawArrow(x, y) {
    const g = R.g, Z = R.Z, px = R.sx(x), py = R.sy(y) - (6 + Math.abs(Math.sin(time * 4)) * 5) * Z;
    g.fillStyle = '#4a2e1c'; g.beginPath(); g.moveTo(px - 7 * Z, py - 9 * Z); g.lineTo(px + 7 * Z, py - 9 * Z); g.lineTo(px + 7 * Z, py - 3 * Z); g.lineTo(px + 11 * Z, py - 3 * Z); g.lineTo(px, py + 7 * Z); g.lineTo(px - 11 * Z, py - 3 * Z); g.lineTo(px - 7 * Z, py - 3 * Z); g.closePath(); g.fill();
    g.fillStyle = '#ffd23a'; g.beginPath(); g.moveTo(px - 5 * Z, py - 7.5 * Z); g.lineTo(px + 5 * Z, py - 7.5 * Z); g.lineTo(px + 5 * Z, py - 1.5 * Z); g.lineTo(px + 8 * Z, py - 1.5 * Z); g.lineTo(px, py + 5 * Z); g.lineTo(px - 8 * Z, py - 1.5 * Z); g.lineTo(px - 5 * Z, py - 1.5 * Z); g.closePath(); g.fill();
    // off-screen: point from the edge of the screen
    if (px < 0 || px > R.W || py < 0 || py > R.H) { const ex = clamp(px, 40, R.W - 40), ey = clamp(py, 120, R.H - 60); g.fillStyle = 'rgba(255,210,58,0.9)'; g.beginPath(); g.arc(ex, ey, 14 * R.dpr, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#4a2e1c'; g.lineWidth = 3 * R.dpr; g.stroke(); const an = Math.atan2(py - ey, px - ex); g.beginPath(); g.moveTo(ex + Math.cos(an) * 8 * R.dpr, ey + Math.sin(an) * 8 * R.dpr); g.lineTo(ex + Math.cos(an + 2.5) * 7 * R.dpr, ey + Math.sin(an + 2.5) * 7 * R.dpr); g.lineTo(ex + Math.cos(an - 2.5) * 7 * R.dpr, ey + Math.sin(an - 2.5) * 7 * R.dpr); g.fill(); }
  }
  function drawItem(it) {
    const ic = iconFor(it.item), bob = Math.sin(time * 3 + it.x) * 1.2 + it.z * 10;
    const g = R.g; g.fillStyle = 'rgba(40,30,10,0.25)'; g.beginPath(); g.ellipse(R.sx(it.x), R.sy(it.y), 4 * R.Z, 1.5 * R.Z, 0, 0, Math.PI * 2); g.fill();
    R.spr(ic.key, ic.sx, ic.sy, 16, 16, it.x, it.y, { oy: -2 + bob, scale: 0.75 });
    if (ic.tint) { /* tinted icons look right in the basket; on the ground a sparkle marks them */ }
    if (Math.floor(time * 3 + it.x * 5) % 6 === 0) { g.fillStyle = '#fff'; g.fillRect(R.sx(it.x + 0.25), R.sy(it.y - 0.8), R.Z, R.Z); }
  }
  function drawHeart(x, y, z) {
    const g = R.g, s = Math.max(1, Math.round(z * 0.9));
    const pts = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
    g.fillStyle = '#4a2e1c'; for (let r = 0; r < pts.length; r++) for (let c = 0; c < 7; c++) if (pts[r][c] === 'X') g.fillRect(x + (c - 3.5) * s - s, y + r * s - s, s * 3, s * 3);
    g.fillStyle = '#f17ea5'; for (let r = 0; r < pts.length; r++) for (let c = 0; c < 7; c++) if (pts[r][c] === 'X') g.fillRect(x + (c - 3.5) * s, y + r * s, s, s);
  }
  function drawNeed(a) {
    let item = null;
    if (a.ready && a.sp.produce === 'milk') item = 'milk';
    else if (a.ready && a.sp.produce === 'wool') item = 'wool:' + a.col.name;
    else if (a.bubble && a.bubble.icon === 'truffle') item = 'truffle';
    else if (a.hunger > 0.8 && Math.floor(time + a.id) % 6 < 2) item = 'wheat';
    else if (a.thirst > 0.8 && Math.floor(time + a.id) % 6 < 2) item = 'drop';
    else if (!a.petted && game.near(a, 4) && Math.floor(time + a.id) % 5 === 0) item = 'heart';
    if (!item || a.state === 'sleep' || a.state === 'lieDown' || (game.isNight() && !a.ready)) return;
    const g = R.g, Z = R.Z, px = R.sx(a.x), py = R.sy(a.y) - (a.sp.layout === QUAD ? 30 : 22) * Z * (a.baby ? 0.75 : 1) + Math.sin(time * 3 + a.id) * Z;
    g.fillStyle = '#fffaf0'; g.strokeStyle = '#6b4528'; g.lineWidth = Z;
    g.beginPath(); g.roundRect(px - 7 * Z, py - 7 * Z, 14 * Z, 13 * Z, 4 * Z); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(px - 2 * Z, py + 6 * Z); g.lineTo(px, py + 9 * Z); g.lineTo(px + 2 * Z, py + 6 * Z); g.fill();
    if (item === 'heart') { drawHeart(px + 0.5 * Z, py - 3 * Z, Z * 0.8); return; }
    if (item === 'drop') { g.fillStyle = '#4aa3df'; g.beginPath(); g.moveTo(px, py - 5 * Z); g.quadraticCurveTo(px + 4 * Z, py + 1 * Z, px, py + 3 * Z); g.quadraticCurveTo(px - 4 * Z, py + 1 * Z, px, py - 5 * Z); g.fill(); return; }
    const ic = iconFor(item), im = IMG[ic.key];
    g.drawImage(im, ic.sx, ic.sy, 16, 16, px - 5 * Z, py - 6 * Z, 10 * Z, 10 * Z);
  }
  // light through the day: warm dawn, bright noon, golden evening, blue night
  function ambient(t) {
    const h = t / 60;
    const keys = [[0, [70, 80, 140]], [5, [70, 80, 140]], [6.5, [255, 205, 170]], [8, [255, 255, 255]], [17, [255, 255, 255]], [19, [255, 200, 150]], [20.5, [150, 120, 170]], [22, [80, 90, 150]], [24, [70, 80, 140]]];
    let a = keys[0], b = keys[1];
    for (let i = 0; i < keys.length - 1; i++) if (h >= keys[i][0] && h <= keys[i + 1][0]) { a = keys[i]; b = keys[i + 1]; break; }
    const k = (h - a[0]) / Math.max(0.001, b[0] - a[0]);
    const c = a[1].map((v, i) => lerp(v, b[1][i], k));
    const rain = game.weather.rain; return c.map((v, i) => v * (1 - rain * 0.22) + (i === 2 ? rain * 12 : 0));
  }
  const drops = [];
  // drifting cloud shadows and little gusts of wind (world space, so they move with the map)
  const sky = { clouds: [], gusts: [] }; window.__sky = sky;
  function drawSky(dt, cloudAmt, windAmt) {
    const [x0, y0, x1, y1] = R.view(), g = R.g, vw = x1 - x0, vh = y1 - y0, drift = 0.35 + windAmt * 1.4;
    const want = Math.round(cloudAmt * Math.max(2, vw * vh / 70));
    while (sky.clouds.filter((c) => !c.out).length < want) sky.clouds.push({ x: x0 - 8 + Math.random() * (vw + 8), y: y0 - 4 + Math.random() * (vh + 4), v: Math.floor(Math.random() * 4), a: 0, out: false, s: 1.6 + Math.random() * 0.8 });
    let extra = sky.clouds.filter((c) => !c.out).length - want; for (const c of sky.clouds) if (extra > 0 && !c.out) { c.out = true; extra--; }
    for (const c of sky.clouds) {
      c.x += drift * dt; c.a = Math.max(0, Math.min(1, c.a + (c.out ? -dt * 0.4 : dt * 0.3)));
      if (c.x > x1 + 6 || c.x < x0 - 14 || c.y < y0 - 8 || c.y > y1 + 8) { c.x = x0 - 6 - Math.random() * 4; c.y = y0 + Math.random() * vh; c.a = 0; }
      g.globalAlpha = 0.36 * c.a; R.spr('Weather effects/Clouds', (c.v % 2) * 64, (c.v >> 1) * 64, 64, 64, c.x, c.y, { scale: c.s }); g.globalAlpha = 1;
    }
    sky.clouds = sky.clouds.filter((c) => !(c.out && c.a <= 0));
    // gusts: a few at a time, never a blizzard
    if (sky.gusts.length < 1 + Math.round(windAmt * 3) && Math.random() < dt * windAmt * 1.6) sky.gusts.push({ x: x0 + Math.random() * vw, y: y0 + 1 + Math.random() * (vh - 2), t: 0 });
    for (const w of sky.gusts) {
      w.t += dt; w.x += (1 + windAmt * 1.5) * dt;
      const f = Math.floor(w.t * 12); if (f >= 14) continue;
      g.globalAlpha = 1; R.spr('Weather effects/Wind_Anim', f * 16, 0, 16, 16, w.x, w.y, { scale: 2.2 }); g.globalAlpha = 1;
    }
    sky.gusts = sky.gusts.filter((w) => w.t * 12 < 14);
  }
  function drawRain(dt, amt) {
    const rain = amt ?? game.weather.rain; if (rain < 0.02) { drops.length = 0; return; }
    const g = R.g, want = Math.floor(rain * 220 * (R.W * R.H) / 1.5e6);
    while (drops.length < want) drops.push({ x: Math.random() * R.W, y: Math.random() * R.H, v: 0.8 + Math.random() * 0.4, life: 0.3 + Math.random() * 0.7 });
    drops.length = Math.min(drops.length, want);
    const s = R.Z;
    for (const d of drops) {
      d.y += d.v * 520 * dt * R.dpr; d.x -= 60 * dt * R.dpr; d.life -= dt;
      if (d.life <= 0 || d.y > R.H) { // splash where it lands
        g.drawImage(IMG['Weather effects/Rain_Drop_Impact'], (Math.floor(Math.random() * 3) + 2) * 16, 0, 16, 16, d.x - 8 * s, d.y - 8 * s, 16 * s, 16 * s);
        d.x = Math.random() * R.W; d.y = Math.random() * R.H * 0.6 - 50; d.life = 0.3 + Math.random() * 0.7;
      }
      g.drawImage(IMG['Weather effects/Rain_Drop'], 0, 0, 16, 16, d.x - 8 * s, d.y - 8 * s, 16 * s, 16 * s);
    }
    g.fillStyle = `rgba(60,80,110,${rain * 0.12})`; g.fillRect(0, 0, R.W, R.H);
  }
  requestAnimationFrame(frame);
})();

// ----------------------------------------------------------------- sound
// small synthesised blips (no audio files needed)
function makeAudio() {
  let ac = null, master = null, avVol = 0.7, music = null, muVol = 0.5, lastCroak = -99;
  const tone = (f, t0, dur, type = 'sine', vol = 0.15, slide = 0) => {
    const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.02);
  };
  const S = {
    pickup: (t) => { tone(880, t, 0.08, 'triangle'); tone(1320, t + 0.06, 0.12, 'triangle'); },
    coin: (t) => { [988, 1319, 1568, 1976].forEach((f, i) => tone(f, t + i * 0.06, 0.14, 'square', 0.05)); },
    pet: (t) => { tone(520, t, 0.1, 'sine', 0.12, 260); tone(780, t + 0.08, 0.14, 'sine', 0.1, 200); },
    croak: (t) => { tone(420, t, 0.07, 'sine', 0.04, -160); tone(380, t + 0.11, 0.08, 'sine', 0.035, -160); },   // a tiny 'ribbit'
    place: (t) => { tone(300, t, 0.08, 'triangle', 0.12, -120); tone(450, t + 0.05, 0.08, 'triangle', 0.08); },
    pop: (t) => tone(600, t, 0.08, 'sine', 0.12, -400),
    chop: (t) => { tone(180, t, 0.07, 'square', 0.08, -60); tone(120, t + 0.02, 0.1, 'triangle', 0.1, -40); },
    mine: (t) => { tone(1400, t, 0.05, 'square', 0.04, -300); tone(700, t + 0.01, 0.08, 'triangle', 0.06, -200); },
    break: (t) => { for (let i = 0; i < 5; i++) tone(300 - i * 40, t + i * 0.03, 0.08, 'square', 0.05, -80); },
    fall: (t) => { tone(220, t, 0.5, 'triangle', 0.1, -170); tone(90, t + 0.35, 0.25, 'square', 0.08, -40); },
    cast: (t) => tone(900, t, 0.25, 'sine', 0.05, -700),
    bite: (t) => { tone(1100, t, 0.08, 'square', 0.06); tone(1500, t + 0.09, 0.1, 'square', 0.06); },
    catch: (t) => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, t + i * 0.07, 0.15, 'triangle', 0.08)); },
    chirp: (t) => { const f = 2200 + Math.random() * 1200; for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) tone(f + i * 120, t + i * 0.09, 0.06, 'sine', 0.025, 500); },
    fill: (t) => { for (let i = 0; i < 5; i++) tone(400 + i * 60, t + i * 0.03, 0.05, 'triangle', 0.06); },
    door: (t) => { tone(220, t, 0.12, 'triangle', 0.1, -60); tone(165, t + 0.1, 0.16, 'triangle', 0.08, -40); },
    splash: (t) => { for (let i = 0; i < 6; i++) tone(900 - i * 90, t + i * 0.025, 0.05, 'sine', 0.05); },
  };
  return {
    unlock() { if (ac) { if (ac.state === 'suspended') ac.resume(); return; } try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0.85 * avVol; master.connect(ac.destination); music = makeMusic(ac, muVol); } catch (e) { ac = null; } },
    setMusic(v) { muVol = v; if (music) music.setVolume(v); },
    setMood(m) { if (music) music.mood = m; },
    setVolume(v) { avVol = v; if (master) master.gain.value = 0.85 * v; },
    muted: false,
    play(n) {
      if (!ac || !S[n] || this.muted) return;
      if (n === 'croak') { if (ac.currentTime - lastCroak < 14) return; lastCroak = ac.currentTime; }   // frogs, but not too often
      S[n](ac.currentTime + 0.01);
    },
  };
}

// Gentle background music, made on the fly: a soft pad, a music-box melody
// and a little bass, wandering through cosy chord progressions.
function makeMusic(ac, vol) {
  const out = ac.createGain(); out.gain.value = vol * 0.55; out.connect(ac.destination);
  // a soft echo makes the music box sparkle
  const echo = ac.createDelay(1); echo.delayTime.value = 0.42; const fb = ac.createGain(); fb.gain.value = 0.32; const wet = ac.createGain(); wet.gain.value = 0.35;
  echo.connect(fb); fb.connect(echo); echo.connect(wet); wet.connect(out);
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600; lp.connect(out); lp.connect(echo);
  const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const note = (n, t, dur, type, v, att = 0.01) => {
    const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = hz(n);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(lp); o.start(t); o.stop(t + dur + 0.05);
  };
  // chords as MIDI notes (C major / A minor family)
  const C = [48, 52, 55], G = [43, 47, 50], Am = [45, 48, 52], F = [41, 45, 48], Em = [40, 43, 47], Dm = [38, 41, 45];
  const SONGS = [[C, G, Am, F], [F, G, Em, Am], [C, Am, F, G], [Am, F, C, G], [F, C, Dm, G]];
  const SCALE = [0, 2, 4, 7, 9];   // pentatonic, always sweet
  const M = { mood: 'day', song: 0, bar: 0, beat: 0, next: ac.currentTime + 0.5, setVolume(v) { out.gain.setTargetAtTime(v * 0.55, ac.currentTime, 0.3); } };
  let last = 72;
  const tick = () => {
    const night = M.mood === 'night', menu = M.mood === 'menu';
    const bpm = night ? 58 : 72, beat = 60 / bpm;
    while (M.next < ac.currentTime + 0.4) {
      const t = M.next, chord = SONGS[M.song][M.bar % 4];
      if (M.beat === 0) {
        // pad: the whole chord, softly, for the bar
        for (const n of chord) note(n + 12, t, beat * 4.2, 'triangle', night ? 0.022 : 0.028, 0.6);
        note(chord[0] - 12, t, beat * 1.8, 'sine', 0.07, 0.03);                     // bass
      }
      if (M.beat === 2 && !night) note(chord[0] - 5, t, beat * 1.6, 'sine', 0.05, 0.03);
      // music box: wander up and down the pentatonic scale, resting now and then
      for (let half = 0; half < 2; half++) {
        if (Math.random() < (night ? 0.28 : menu ? 0.5 : 0.45)) {
          const opts = []; for (let o = 60; o <= 84; o += 12) for (const s of SCALE) opts.push(o + s + (chord === Am || chord === Em || chord === Dm ? -3 : 0));
          const near = opts.filter((n) => Math.abs(n - last) <= 5 && n >= 64 && n <= 84);
          last = near.length ? near[Math.floor(Math.random() * near.length)] : 72;
          if (M.beat === 0 && half === 0) last = chord[Math.floor(Math.random() * 3)] + 24;   // land on the chord
          note(last, t + half * beat / 2, night ? 1.6 : 1.1, 'sine', night ? 0.05 : 0.06, 0.005);
        }
      }
      M.beat++; M.next += beat;
      if (M.beat >= 4) { M.beat = 0; M.bar++; if (M.bar % 16 === 0) M.song = Math.floor(Math.random() * SONGS.length); }
    }
  };
  setInterval(() => { if (ac.state === 'running') tick(); }, 120);
  return M;
}
