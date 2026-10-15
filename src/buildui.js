// ------------------------------------------------------------ build mode
// B toggles build mode: a tool bar on the left (place, move, pick up, destroy,
// undo) and your bag of buildable things along the bottom. The camera pans
// freely with WASD while you build.
// wild scenery build mode can clear: what it turns into when picked up (null = nothing)
const CLEARABLE = { flower: 'flower', mushroom: 'mushroom', bush: 'bush', grass: null, rock: null, ore: null, berry: 'bush', cattail: null, lily: null, tree: null };
const BUILD_CATS = [['all', 'All'], ['farm', 'Farm'], ['deco', 'Decor'], ['build', 'Buildings']];
function installBuild(game, app, ui) {
  const S = () => game.scene();
  const B = { on: false, tool: 'place', id: null, v: 0, carry: null, cat: 'all' };
  app.build = B;
  const tipFor = () => {
    if (B.carry) return `Moving ${DEF[B.carry.o.id].name.toLowerCase()} · click to put it down · Esc to cancel`;
    if (B.tool === 'place') return B.id ? `Click to place ${DEF[B.id].name.toLowerCase()}${DEF[B.id].variants > 1 ? ' · Q/E change style' : ''}${DEF[B.id].conn || DEF[B.id].ground || B.id === 'flower' ? ' · drag to paint' : ''}` : 'Pick something from your bag below';
    if (B.tool === 'move') return 'Click something to pick it up and move it';
    if (B.tool === 'store') return 'Click or drag over things to put them in your bag (wild flowers too)';
    return 'Click or drag to clear things away (you get half the price back for things you bought)';
  };
  B.refresh = () => {
    document.body.classList.toggle('building', B.on);
    for (const id of ['#buildLeft', '#buildBar', '#buildTip']) $(id).classList.toggle('hidden', !B.on);
    $('#bBuild').classList.toggle('pulse-on', B.on);
    if (!B.on) return;
    for (const b of document.querySelectorAll('#buildLeft [data-t]')) b.classList.toggle('on', b.dataset.t === B.tool);
    $('#bdUndo').disabled = !game.undoStack.length;
    $('#buildTip').textContent = tipFor();
    // tabs
    const tabs = $('#bbTabs'); tabs.innerHTML = '';
    for (const [k, n] of (game.inside ? [['all', 'Home']] : BUILD_CATS)) { const b = el('button', k === B.cat ? 'on' : '', n); b.onclick = () => { B.cat = k; B.refresh(); }; tabs.appendChild(b); }
    // items in the bag
    const box = $('#bbItems'); box.innerHTML = '';
    const inside = !!game.inside, ids = Object.keys(game.bag).filter((id) => game.bag[id] > 0 && DEF[id] && (DEF[id].cat === 'home') === inside && (B.cat === 'all' || DEF[id].cat === B.cat));
    if (!ids.length) box.appendChild(el('div', 'bbempty', game.inside ? 'No furniture in your bag. Press <b>Buy more</b> and look in the <b>Home</b> tab.' : B.cat === 'all' ? 'Your bag is empty. Press <b>Buy more</b> to visit the shop.' : 'Nothing of this kind in your bag yet.'));
    for (const id of ids) {
      const s = el('button', 'slot' + (B.id === id && B.tool === 'place' ? ' on' : '')), cv = el('canvas'); cv.width = 48; cv.height = 48;
      thumbThing(cv, id, B.id === id ? B.v : defaultStyle(id), game);
      s.appendChild(el('div', 'nm', DEF[id].name)); s.appendChild(cv); s.appendChild(el('div', 'n', '×' + game.bag[id])); s.title = DEF[id].name;
      s.onclick = () => B.select(id);
      box.appendChild(s);
    }
    // the chosen item's style picker
    const sel = $('#bbSel'); sel.innerHTML = '';
    if (game.inside && !(B.tool === 'place' && B.id)) {
      const R0 = game.inside;
      for (const [kind, lab, name] of [['floor', 'Floor', `Style ${R0.data.floor + 1}`], ['wall', 'Walls', WALL_STYLES[R0.data.wall].n]]) {
        const a = el('button', 'btn', '‹'), b = el('button', 'btn', '›');
        a.onclick = () => { R0.style(kind, -1); B.refresh(); }; b.onclick = () => { R0.style(kind, 1); B.refresh(); };
        sel.appendChild(el('b', '', lab)); sel.appendChild(a); sel.appendChild(el('span', '', name)); sel.appendChild(b);
      }
      const cost = R0.expandCost(), ex = el('button', 'btn' + (cost && game.coins >= cost ? ' go' : ''), cost ? `Expand room · ${coinHtml(cost)}` : 'Room is max size');
      ex.disabled = !cost; ex.title = 'Make your house bigger: +1 tile each side, +1 deeper';
      ex.onclick = () => {
        if (game.coins < cost) return game.toast(`You need ${cost} coins to expand your house.`, 'bad');
        ask(`Expand your house for ${cost} coins?`, { yes: 'Expand!', no: 'Not yet' }).then((ok) => { if (!ok) return; const why = R0.expand(); if (why) game.toast(why, 'bad'); ui.hud(); B.refresh(); });
      };
      sel.appendChild(ex);
    }
    if (B.tool === 'place' && B.id && DEF[B.id].variants > 1) {
      const D = DEF[B.id], a = el('button', 'btn', '‹'), b = el('button', 'btn', '›');
      a.onclick = () => B.style(-1); b.onclick = () => B.style(1);
      sel.appendChild(a); sel.appendChild(el('span', '', D.vname ? D.vname(B.v) : `Style ${B.v + 1}`)); sel.appendChild(b);
    }
  };
  const defaultStyle = (id) => DEF[id].variants > 1 ? Math.floor(DEF[id].variants / 3) % DEF[id].variants : 0;
  B.select = (id) => { B.tool = 'place'; if (B.id !== id) B.v = defaultStyle(id); B.id = id; B.cancelCarry(); B.refresh(); };
  B.style = (d) => { const D = DEF[B.id]; if (!D || D.variants < 2) return; B.v = (B.v + d + D.variants) % D.variants; B.refresh(); };
  B.setTool = (t) => { B.cancelCarry(); B.tool = t; B.refresh(); };
  B.toggle = (on = !B.on) => {
    B.on = on; B.cancelCarry();
    if (on) { for (const m of document.querySelectorAll('.modal')) m.classList.add('hidden'); app.select(null); game.player.path = null; if (B.id && !(game.bag[B.id] > 0)) B.id = null; }
    B.refresh(); game.emit('build', on);
  };
  B.cancelCarry = () => { if (B.carry) { const { o, from } = B.carry; B.carry = null; S().drop(o, from[0], from[1], null); } };
  // the left bar
  for (const b of document.querySelectorAll('#buildLeft [data-t]')) b.onclick = () => B.setTool(b.dataset.t);
  $('#bdUndo').onclick = () => { B.cancelCarry(); game.undo(); B.refresh(); ui.hud(); };
  $('#bdExit').onclick = () => B.toggle(false);
  $('#bbBuy').onclick = () => ui.openShop(game.inside ? 'home' : B.cat === 'all' ? 'deco' : B.cat);
  $('#bBuild').onclick = () => B.toggle();
  game.on('bag', () => { if (B.on) { if (B.id && !(game.bag[B.id] > 0)) B.id = null; B.refresh(); } });
  game.on('undo', () => { if (B.on) B.refresh(); });
  game.on('scene', () => { B.cancelCarry(); B.id = null; B.cat = 'all'; B.refresh(); });

  // ---------------------------------------------------------- clicking
  // where an item would go when the mouse is at world (wx, wy)
  // the cursor sits in the middle of what you're placing
  B.spot = (id, v, wx, wy) => { const [w, h] = S().dims(id, v); return [Math.round(wx - w / 2), Math.round(wy - h / 2)]; };
  B.click = (wx, wy, dg) => {
    const tx = Math.floor(wx), ty = Math.floor(wy), W = game.world;
    if (B.carry) {
      const o = B.carry.o, [x, y] = B.spot(o.id, o.v, wx, wy), why = S().canDrop(o, x, y);
      if (why) return game.toast(why, 'bad');
      const from = B.carry.from; B.carry = null; S().drop(o, x, y, from); B.refresh(); return;
    }
    if (B.tool === 'place') {
      if (!B.id) return game.toast('Pick something from your bag first.');
      const [x, y] = B.spot(B.id, B.v, wx, wy), k = x + ',' + y;
      if (dg && dg.placed.has(k)) return; if (dg) dg.placed.add(k);
      const why = S().canPlace(B.id, x, y, B.v);
      if (why) { if (!dg || dg.placed.size <= 1) game.toast(why, 'bad'); return; }
      S().place(B.id, x, y, B.v); ui.hud(); B.refresh();
      return;
    }
    const o = S().thingVisualAt(wx, wy) || S().thingAt(tx, ty);
    if (B.tool === 'move') {
      if (o && S().lift(o)) { B.carry = { o, from: [o.x, o.y] }; game.sfx('pop'); B.refresh(); }
      return;
    }
    if (B.tool === 'store' || B.tool === 'destroy') {
      const k = tx + ',' + ty; if (dg) { if (dg.placed.has(k)) return; dg.placed.add(k); }
      if (o) { if (dg && dg.placed.size > 1 && !DEF[o.id].block && false) return; if (B.tool === 'store') S().store(o); else S().remove(o); ui.hud(); B.refresh(); return; }
      // planted trees and paths go back into the bag either way
      const ob = game.inside ? null : W.objAt.get(W.idx(tx, ty));
      if (ob && ob.planted) { W.removeObj(ob); game.put('sapling'); game.sfx('pop'); game.recordUndo({ type: 'untree', o: Object.assign({}, ob) }); }
      else if (ob && CLEARABLE[ob.kind]) {
        // wild plants and rocks: cleared away; flowers, mushrooms and bushes go into your bag
        const into = B.tool === 'store' ? CLEARABLE[ob.kind] : null;
        W.removeObj(ob); W.block[W.idx(ob.x, ob.y)] = 0; if (into) game.put(into);
        game.puff(ob.x + 0.5, ob.y + 0.8, '#bfe6a8', 5); game.sfx('pop'); game.recordUndo({ type: 'unobj', o: Object.assign({}, ob), into });
      }
      else if (W.soil[W.idx(tx, ty)]) { const c = game.crops.get(W.idx(tx, ty)); if (c && c.g === 0) game.seeds[c.c] = (game.seeds[c.c] || 0) + 1; game.setSoil(tx, ty, false); game.put('soil'); game.sfx('pop'); game.recordUndo({ type: 'unsoil', x: tx, y: ty, crop: c && c.g > 0 ? c : null }); }
      else if (W.dug && W.dug[W.idx(tx, ty)]) { game.setPond(tx, ty, false); game.put('pond'); game.sfx('pop'); game.recordUndo({ type: 'unpond', x: tx, y: ty }); game.emit('changed'); }
      else if (W.path[W.idx(tx, ty)]) { game.setPath(tx, ty, false); game.put('path'); game.sfx('pop'); game.recordUndo({ type: 'unpath', x: tx, y: ty }); }
      B.refresh();
    }
  };
  B.dragPaints = () => (B.tool === 'place' && B.id && (DEF[B.id].conn || DEF[B.id].ground || B.id === 'flower')) || B.tool === 'store' || B.tool === 'destroy';
  B.key = (e) => {
    if (e.code === 'Digit1') B.setTool('place'); else if (e.code === 'Digit2') B.setTool('move');
    else if (e.code === 'Digit3') B.setTool('store'); else if (e.code === 'Digit4') B.setTool('destroy');
    else if (e.code === 'KeyQ') B.style(-1); else if (e.code === 'KeyE') B.style(1);
    else if (e.code === 'Escape') { if (B.carry) { B.cancelCarry(); B.refresh(); } else if (B.id) { B.id = null; B.refresh(); } else B.toggle(false); }
    else return false;
    return true;
  };

  // ------------------------------------------------------------- drawing
  B.draw = (R, mouse, t) => {
    if (!B.on || !mouse) return;
    const g = R.g, [wx, wy] = R.toWorld(mouse[0], mouse[1]);
    // a soft grid around the cursor
    const cx = Math.floor(wx), cy = Math.floor(wy);
    for (let y = cy - 6; y <= cy + 6; y++) for (let x = cx - 8; x <= cx + 8; x++) {
      if (game.inside && !game.inside.inb(x, y)) continue;
      const a = 0.16 * (1 - Math.min(1, dist(x, y, wx, wy) / 8)); if (a <= 0.01) continue;
      g.strokeStyle = `rgba(255,255,255,${a})`; g.lineWidth = 1; g.strokeRect(R.sx(x) + 0.5, R.sy(y) + 0.5, R.sx(x + 1) - R.sx(x), R.sy(y + 1) - R.sy(y));
    }
    const ghost = (id, v, x, y, why, o) => {
      const [w, h] = S().dims(id, v), D = DEF[id];
      g.fillStyle = why ? 'rgba(217,92,75,0.35)' : 'rgba(255,255,255,0.28)';
      g.fillRect(R.sx(x), R.sy(y), R.sx(x + w) - R.sx(x), R.sy(y + h) - R.sy(y));
      g.globalAlpha = 0.75;
      if (D.conn) { if (!D.table) D.table = connTable(D.conn, D.connGrid[0], D.connGrid[1]); const c = connCell(D.table, 0); R.spr(D.conn, c[0] * 16, c[1] * 16, 16, 16, x + 0.5, y + 1); }
      else if (D.pond) { g.fillStyle = 'rgba(0,149,233,0.7)'; g.fillRect(R.sx(x), R.sy(y), R.sx(x + 1) - R.sx(x), R.sy(y + 1) - R.sy(y)); }
      else if (D.soil) R.tile('Tiles/FarmLand/FarmLand_Tile', 0, 0, x, y);
      else if (D.ground) R.tile('Tiles/Grass/Path_Middle', 0, 0, x, y);
      else if (D.tree) drawObj(R, { kind: 'tree', x, y, tree: ['Oak', 'Birch', 'Spruce', 'Fruit'][v], size: v === 3 ? 'Medium' : 'Small' }, t);
      else D.draw(R, Object.assign({ amount: D.cap || 0, eggs: [] }, o || {}, { id, x, y, v, w, h }), t, game);
      g.globalAlpha = 1;
    };
    if (B.carry) { const o = B.carry.o, [x, y] = B.spot(o.id, o.v, wx, wy); ghost(o.id, o.v, x, y, S().canDrop(o, x, y), o); return; }
    if (B.tool === 'place' && B.id) { const [x, y] = B.spot(B.id, B.v, wx, wy); ghost(B.id, B.v, x, y, S().canPlace(B.id, x, y, B.v)); return; }
    // highlight what the move / pick up / destroy tools would grab
    const o = S().thingVisualAt(wx, wy) || S().thingAt(cx, cy);
    if (!o && !game.inside && (B.tool === 'store' || B.tool === 'destroy')) {
      const ob = game.world.objAt.get(game.world.idx(cx, cy));
      if (ob && (CLEARABLE[ob.kind] !== undefined || ob.planted)) { g.strokeStyle = B.tool === 'destroy' ? '#ff6a55' : '#9fe07a'; g.lineWidth = 3 * R.dpr; g.setLineDash([6 * R.dpr, 4 * R.dpr]); g.strokeRect(R.sx(cx), R.sy(cy - (ob.kind === 'tree' ? 2 : 0)), R.sx(cx + 1) - R.sx(cx), R.sy(cy + 1) - R.sy(cy - (ob.kind === 'tree' ? 2 : 0))); g.setLineDash([]); }
    }
    if (o) {
      const tall = (TALL[o.id] || 0) + (o.id === 'lamp' ? 2 : 0);
      g.strokeStyle = B.tool === 'destroy' ? '#ff6a55' : B.tool === 'move' ? '#ffd23a' : '#9fe07a'; g.lineWidth = 3 * R.dpr;
      g.setLineDash([6 * R.dpr, 4 * R.dpr]); g.strokeRect(R.sx(o.x), R.sy(o.y - tall), R.sx(o.x + o.w) - R.sx(o.x), R.sy(o.y + o.h) - R.sy(o.y - tall)); g.setLineDash([]);
    }
  };
  B.refresh();
  return B;
}
