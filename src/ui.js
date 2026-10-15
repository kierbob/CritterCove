// -------------------------------------------------------------------- UI
const $ = (s) => document.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };

// draw anything that uses the Renderer.spr() API into a small canvas, fitted
class Thumb {
  constructor() { this.calls = []; }
  spr(key, sx, sy, sw, sh, x, y, opt = {}) {
    const s = opt.scale || 1, w = sw * s, h = sh * s;
    this.calls.push({ key, sx, sy, sw, sh, x: x * TS - w / 2 + (opt.ox || 0), y: y * TS - h + (opt.oy || 0), w, h, flip: opt.flip });
  }
  paint(canvas, pad = 2, maxScale = 4) {
    const g = canvas.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, canvas.width, canvas.height);
    if (!this.calls.length) return;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const c of this.calls) { x0 = Math.min(x0, c.x); y0 = Math.min(y0, c.y); x1 = Math.max(x1, c.x + c.w); y1 = Math.max(y1, c.y + c.h); }
    // trim empty space around the sprites so small critters fill the box
    { const W = Math.ceil(x1 - x0), H = Math.ceil(y1 - y0), tc = document.createElement('canvas'); tc.width = W; tc.height = H; const tg = tc.getContext('2d');
      for (const c of this.calls) { const im = IMG[c.key]; if (im) tg.drawImage(im, c.sx, c.sy, c.sw, c.sh, Math.round(c.x - x0), Math.round(c.y - y0), c.w, c.h); }
      const d = tg.getImageData(0, 0, W, H).data; let a = W, b = H, e = 0, f = 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 20) { if (x < a) a = x; if (y < b) b = y; if (x + 1 > e) e = x + 1; if (y + 1 > f) f = y + 1; }
      if (e > a) { const nx0 = x0 + a, ny0 = y0 + b; x1 = x0 + e; y1 = y0 + f; x0 = nx0; y0 = ny0; } }
    const sc = Math.min(maxScale, (canvas.width - pad * 2) / (x1 - x0), (canvas.height - pad * 2) / (y1 - y0));
    const s = sc >= 1 ? Math.floor(sc) : sc;
    const ox = (canvas.width - (x1 - x0) * s) / 2, oy = (canvas.height - (y1 - y0) * s) / 2;
    for (const c of this.calls) {
      const im = IMG[c.key]; if (!im) continue;
      const dx = Math.round(ox + (c.x - x0) * s), dy = Math.round(oy + (c.y - y0) * s), dw = Math.round(c.w * s), dh = Math.round(c.h * s);
      if (c.flip) { g.save(); g.translate(dx + dw, dy); g.scale(-1, 1); g.drawImage(im, c.sx, c.sy, c.sw, c.sh, 0, 0, dw, dh); g.restore(); }
      else g.drawImage(im, c.sx, c.sy, c.sw, c.sh, dx, dy, dw, dh);
    }
  }
}
function thumbThing(canvas, id, v, game) {
  const T = new Thumb(), D = DEF[id], [w, h] = game.dims(id, v), o = { id, x: 0, y: 0, v, w, h, amount: D.cap || 0, eggs: [] };
  if (D.conn) { if (!D.table) D.table = connTable(D.conn, D.connGrid[0], D.connGrid[1]); const c = connCell(D.table, 10); T.spr(D.conn, c[0] * 16, c[1] * 16, 16, 16, 0.5, 1); T.spr(D.conn, (connCell(D.table, 8))[0] * 16, connCell(D.table, 8)[1] * 16, 16, 16, 1.5, 1); }
  else if (id === 'path') T.spr('Tiles/Grass/Path_Middle', 0, 0, 16, 16, 0.5, 1);
  else if (D.pond) { const s0 = AUTO.grassWater[0] || [16, 16]; T.spr(P.waterAnim, 16, 16, 16, 16, 0.5, 1); }
  else if (D.soil) T.spr('Tiles/FarmLand/FarmLand_Tile', 0, 0, 16, 16, 0.5, 1);
  else if (D.tree) { const k = `Trees/${v === 3 ? 'Medium' : 'Small'}_${['Oak', 'Birch', 'Spruce', 'Fruit'][v]}_Tree`, im = IMG[k]; if (im) T.spr(k, im.width / 3, 0, im.width / 3, im.height, 0.5, 1); }
  else D.draw(T, o, 0, null);
  T.paint(canvas);
}
function thumbAnimal(canvas, sk, color, opts = {}) {
  const T = new Thumb(), S = SPECIES[sk], c = S.colors[color];
  if (S.special === 'capy') T.spr(c.key + 'Idle', 0, 0, 32, 32, 0.5, 1);
  else if (S.special === 'bfly') T.spr('Animals/Butterfly/Butterfly', 0, c.row * 8, 8, 8, 0.5, 1);
  else { const L = S.layout; T.spr(opts.muddy && c.mud ? c.mud : c.key, 0, (L.idle[0]) * L.fh, L.fw, L.fh, 0.5, 1); }
  T.paint(canvas, 0, opts.max || 4);
  if (opts.silhouette) { const g = canvas.getContext('2d'); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#7d6a55'; g.fillRect(0, 0, canvas.width, canvas.height); g.globalCompositeOperation = 'source-over'; }
}
function iconFor(item) {
  const [base, sub] = item.split(':'); const I = ITEMS[base];
  return { key: I.icon[0], sx: I.icon[1] * 16, sy: I.icon[2] * 16, tint: I.tint || (sub && WOOL_TINT[sub]) || null };
}
function paintIcon(canvas, item) {
  const g = canvas.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, canvas.width, canvas.height);
  const ic = iconFor(item); const im = IMG[ic.key]; if (!im) return;
  g.drawImage(im, ic.sx, ic.sy, 16, 16, 0, 0, canvas.width, canvas.height);
  if (ic.tint) { g.globalCompositeOperation = 'multiply'; g.fillStyle = ic.tint; g.fillRect(0, 0, canvas.width, canvas.height); g.globalCompositeOperation = 'destination-in'; g.drawImage(im, ic.sx, ic.sy, 16, 16, 0, 0, canvas.width, canvas.height); g.globalCompositeOperation = 'source-over'; }
}
// in-game ask/confirm box (browser popups are blocked inside embedded pages)
function ask(msg, opts = {}) {
  return new Promise((res) => {
    const m = el('div', 'modal ask'), box = el('div', 'sheet panel');
    box.style.cssText = 'width:min(380px,100%);grid-template-rows:auto auto auto;text-align:center';
    box.appendChild(el('div', 'px', `<b style="font-size:18px">${msg}</b>`));
    let inp = null;
    if (opts.input !== undefined) { inp = el('input', 'txt'); inp.value = opts.input; inp.maxLength = 16; box.appendChild(inp); }
    const row = el('div', ''); row.style.cssText = 'display:flex;gap:8px;justify-content:center';
    const no = el('button', 'btn', opts.no || 'Cancel'), yes = el('button', 'btn go', opts.yes || 'OK');
    const close = (v) => { m.remove(); res(v); };
    no.onclick = () => close(inp ? null : false); yes.onclick = () => close(inp ? inp.value : true);
    row.appendChild(no); row.appendChild(yes); box.appendChild(row); m.appendChild(box);
    m.style.zIndex = 50; document.body.appendChild(m);
    if (inp) { inp.focus(); inp.select(); inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') yes.click(); }); } else yes.focus();
  });
}
const coinHtml = (n) => `<span class="price"><span class="coin"></span>${n}</span>`;

function installUI(game, app) {
  const ui = {};
  // ---- toasts
  game.on('toast', ({ msg, kind }) => {
    const t = el('div', 'toast panel ' + (kind || ''), msg); $('#toasts').appendChild(t);
    while ($('#toasts').children.length > 3) $('#toasts').firstChild.remove();
    setTimeout(() => t.remove(), 4200);
  });
  // ---- tool buttons
  const toolIcon = (sel, key, cx, cy) => { const c = $(sel + ' canvas'), g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(IMG[key], cx * 16, cy * 16, 16, 16, 0, 0, 16, 16); };
  toolIcon('#bShop', P.food, 3, 4); toolIcon('#bDex', P.food, 6, 1); toolIcon('#bQuest', 'Crops/Crops', 0, 9); toolIcon('#bBag', P.food, 7, 9); toolIcon('#bBuild', P.tools, 3, 0); toolIcon('#bUndo', P.res, 1, 4); toolIcon('#bMenu', 'Crops/Crops', 0, 3);
  $('#bShop').onclick = () => ui.openShop('animals');
  $('#bDex').onclick = () => ui.openDex();
  $('#bQuest').onclick = () => ui.openQuests();
  $('#bBag').onclick = () => ui.openShop('sell');
  for (const b of document.querySelectorAll('[data-close]')) b.onclick = () => b.closest('.modal').classList.add('hidden');
  for (const m of document.querySelectorAll('.modal')) m.addEventListener('pointerdown', (e) => { if (e.target === m) m.classList.add('hidden'); });

  // ---- HUD
  ui.hud = () => {
    $('#hFarm').textContent = game.farmName;
    $('#hDay').textContent = `Day ${game.day}`;
    const h = Math.floor(game.time / 60) % 24, m = Math.floor(game.time % 60 / 10) * 10;
    $('#hTime').textContent = `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
    const K = game.weather.kind; $('#hWx').textContent = game.weather.rain > 0.3 ? '☂ Rain' : game.isNight() ? '☾ Night' : K === 'windy' ? '༄ Windy' : K === 'cloudy' || K === 'rain' ? '☁ Cloudy' : '☀ Sunny';
    const b = game.beauty(), stars = b < 20 ? 1 : b < 60 ? 2 : b < 120 ? 3 : b < 220 ? 4 : 5;
    $('#hBeauty').innerHTML = `Farm beauty <span style="color:var(--gold);letter-spacing:1px">${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}</span>`;
    $('#hCoins').textContent = game.coins;
    ui.quest();
  };
  // ---- the current quest: what to do, how far along, how to do it
  ui.questArrow = false;
  ui.quest = () => {
    const box = $('#hGoal'), G = GOALS[game.goal];
    box.classList.toggle('hidden', game.tut < TUTORIAL.length);
    if (!G) { if (box.dataset.k !== 'done') { box.dataset.k = 'done'; box.innerHTML = '<div class="qhead"><b>All quests done! 🎉</b></div><div class="qhow">Keep collecting colours and making your farm pretty.</div><div class="qbtns"><button class="btn mini" data-q="all">Quest book</button></div>'; } return; }
    if (box.dataset.k !== String(game.goal)) {
      box.dataset.k = String(game.goal); ui.questArrow = false;
      box.innerHTML = `<div class="qhead"><b>Quest ${game.goal + 1} of ${GOALS.length}</b><span class="price"><span class="coin"></span>${G.reward}</span></div>
        <div class="qtext px">${G.text}</div><div class="qbar"><i></i><span></span></div><div class="qhow">${G.how}</div>
        <div class="qbtns">${G.target ? '<button class="btn mini" data-q="show">📍 Show me</button>' : ''}<button class="btn mini" data-q="all">Quest book</button></div>`;
    }
    const [a, b] = G.prog(game), f = clamp(a / b, 0, 1);
    box.querySelector('.qbar i').style.width = `${Math.round(f * 100)}%`;
    box.querySelector('.qbar span').textContent = b >= 100 && game.goal === GOALS.length - 1 ? `${Math.floor(a)}%` : `${Math.min(Math.floor(a), b).toLocaleString()} / ${b.toLocaleString()}`;
    const sb = box.querySelector('[data-q=show]'); if (sb) sb.textContent = ui.questArrow ? '📍 Hide arrow' : '📍 Show me';
  };
  $('#hGoal').addEventListener('click', (e) => {
    const q = e.target.closest('[data-q]'); if (!q) return;
    if (q.dataset.q === 'show') { ui.questArrow = !ui.questArrow; ui.quest(); }
    else ui.openQuests();
  });
  // reminders in the bottom-left corner (they sit above an open animal card)
  ui.needs = () => {
    const box = $('#needs'), list = game.started && !game.inside ? game.needs() : [], card = $('#card');
    box.style.bottom = card.classList.contains('hidden') ? '' : `${card.offsetHeight + 24}px`;
    const key = list.map((n) => n.key + n.text).join('|'); if (box.dataset.k === key) return; box.dataset.k = key;
    const old = new Set([...box.children].map((c) => c.dataset.key));
    box.innerHTML = '';
    for (const n of list) {
      const d = el('div', 'need panel', `<span class="ic">${n.icon}</span><span>${n.text}</span>`); d.dataset.key = n.key;
      if (old.has(n.key)) d.style.animation = 'none'; else if (n.key !== 'water') game.sfx('pop');
      d.onclick = () => { if (n.thing) app.use(n.thing); else if (n.soil) app.walk(n.soil[0] + 0.5, n.soil[1] + 0.5); };
      box.appendChild(d);
    }
  };
  ui.openQuests = () => {
    const body = $('#qBody'); body.innerHTML = '';
    GOALS.forEach((G, i) => {
      const st = i < game.goal ? 'done' : i === game.goal ? 'now' : 'later', row = el('div', 'qrow ' + st);
      const [a, b] = G.prog(game);
      row.appendChild(el('div', 'qn px', st === 'done' ? '✔' : String(i + 1)));
      row.appendChild(el('div', '', `<b>${G.text}</b><div class="qhow">${st === 'later' ? 'Unlocks after the quest before it.' : st === 'done' ? 'Done!' : G.how + ` <b>(${Math.min(Math.floor(a), b)} / ${b})</b>`}</div>`));
      row.appendChild(el('div', 'price', `<span class="coin"></span>${G.reward}`));
      body.appendChild(row);
    });
    $('#qTag').textContent = `${game.goal} of ${GOALS.length} quests done`;
    $('#quests').classList.remove('hidden');
    const cur = body.querySelector('.now'); if (cur) cur.scrollIntoView({ block: 'center' });
  };
  game.on('quest', ({ G, next }) => {
    const d = $('#qDone'); d.innerHTML = `<div class="px big">✨ Quest complete! ✨</div><div>${G.text} · <span class="price"><span class="coin"></span>+${G.reward}</span></div>${next ? `<div class="nx">Next: <b>${next.text}</b></div>` : '<div class="nx"><b>That was the last one. You did it!</b></div>'}`;
    d.classList.remove('hidden'); d.classList.remove('pop'); void d.offsetWidth; d.classList.add('pop');
    clearTimeout(ui._qd); ui._qd = setTimeout(() => d.classList.add('hidden'), 4200);
  });

  // ---- animal card
  ui.card = (a) => {
    const c = $('#card'); ui.cardFor = a;
    if (!a) { c.classList.add('hidden'); return; }
    c.classList.remove('hidden');
    if (c.dataset.id !== String(a.id)) {
      c.dataset.id = a.id;
      c.innerHTML = `<button class="x">×</button><div class="top"><canvas width="64" height="64"></canvas><div><div class="name px" title="Click to rename"></div><div class="sub"></div><div class="hearts"></div></div></div><div class="stats"></div><div class="sub tip"></div><div class="act"></div>`;
      c.querySelector('.x').onclick = () => { app.select(null); };
      c.querySelector('.name').onclick = () => { if (a.wild) return; ask(`Rename ${a.name}?`, { input: a.name, yes: 'Rename' }).then((n) => { if (n && n.trim()) { a.name = n.trim().slice(0, 16); c.dataset.id = ''; ui.card(a); } }); };
    }
    thumbAnimal(c.querySelector('canvas'), a.sk, a.color, { muddy: a.muddy });
    c.querySelector('.name').textContent = a.wild ? `Wild ${a.sp.name.toLowerCase()}` : a.name;
    c.querySelector('.sub').textContent = `${a.col.name} ${a.sp.name.toLowerCase()}${a.wild ? '' : a.baby ? ' · baby' : ''}${a.col.rare >= 2 ? ' · rare!' : ''}`;
    const hearts = a.wild ? (a.befriended ? 1 : 0) : a.friend;
    c.querySelector('.hearts').textContent = a.wild ? (a.befriended ? '♥ friends today' : '♡ give it a pat') : '♥'.repeat(Math.floor(hearts)) + (hearts % 1 >= 0.5 ? '♥' : '') + '♡'.repeat(Math.max(0, 5 - Math.floor(hearts) - (hearts % 1 >= 0.5 ? 1 : 0)));
    const bar = (lab, v, col) => `<div class="stat"><span>${lab}</span><span class="bar"><i style="width:${Math.round(clamp(v, 0, 1) * 100)}%;background:${col}"></i></span></div>`;
    c.querySelector('.stats').innerHTML = a.wild || a.adopted ? '' : bar('Full', 1 - a.hunger, '#f5b82e') + bar('Water', 1 - a.thirst, '#4aa3df') + bar('Happy', a.happy, '#f17ea5');
    let tip = '';
    if (a.adopted) tip = a.gift ? 'It found something for you! Give it a pat.' : a.petted ? 'Pat it every day and it brings you little gifts.' : 'Click it to give it a pat!';
    else if (!a.wild) {
      if (!a.petted) tip = 'Click it to give it a pat!';
      else if (a.ready && a.sp.produce === 'milk') tip = 'Ready to milk: give it a pat.';
      else if (a.ready && a.sp.produce === 'wool') tip = 'Fluffy! Give it a pat to collect the wool.';
      else if (a.muddy) tip = 'Muddy! A pat will clean it up.';
      else if (a.hunger > 0.6) tip = 'Hungry: fill a hay feeder.';
      else if (a.thirst > 0.6) tip = 'Thirsty: fill a water trough.';
      else tip = a.happy > 0.7 ? 'Very happy. Happy animals that love you can have babies.' : 'Feed, water and pat it every day.';
    } else if (a.sp.adopt) {
      const H = game.habitat(a.sk);
      tip = !a.befriended ? 'Give it a pat to make friends. Friends can be adopted!' : H.why ? H.why + ', then you can adopt it.' : 'It likes you! Adopt it with a critter snack.';
    } else tip = 'Wild visitors count in your Critterdex once you make friends.';
    c.querySelector('.tip').textContent = tip;
    const act = c.querySelector('.act'), want = a.wild && a.sp.adopt && a.befriended ? `adopt:${game.snacks || 0}` : !a.wild ? 'rehome' : '';
    if (act.dataset.k !== want) {
      act.dataset.k = want; act.innerHTML = '';
      if (want.startsWith('adopt')) {
        const b = el('button', 'btn go', game.snacks > 0 ? `Adopt · give a snack (${game.snacks} left)` : 'Adopt · needs a critter snack');
        b.style.cssText = 'width:100%;margin-top:6px';
        b.onclick = () => { const r = game.adopt(a); if (r) game.toast(r, 'bad'); c.dataset.id = ''; ui.card(a); ui.hud(); };
        act.appendChild(b);
      }
      if (want === 'rehome') {
        const b = el('button', 'btn', a.adopted ? 'Let it go back to the wild' : `Find it a new home (+${Math.floor(a.sp.price / 2)} coins)`);
        b.style.cssText = 'width:100%;margin-top:6px;font-size:12px;padding:4px 8px';
        b.onclick = () => ask(a.adopted ? `Let ${a.name} go back to the wild?` : `Send ${a.name} to a new home? This frees up space for babies.`, { yes: a.adopted ? 'Bye bye' : 'Rehome', no: 'Keep' }).then((ok) => { if (ok) { game.rehome(a); app.select(null); ui.hud(); } });
        act.appendChild(b);
      }
    }
  };

  // ---- shop
  let shopTab = 'animals';
  ui.openShop = (tab) => { shopTab = tab || shopTab; $('#shop').classList.remove('hidden'); ui.renderShop(); };
  ui.renderShop = () => {
    const tabs = $('#shopTabs'); tabs.innerHTML = '';
    for (const [k, n] of CATS) { const b = el('button', k === shopTab ? 'on' : '', n); b.onclick = () => { shopTab = k; ui.renderShop(); }; tabs.appendChild(b); }
    const body = $('#shopBody'); body.innerHTML = '';
    if (shopTab === 'sell') return ui.renderSell(body);
    if (shopTab === 'seeds') return ui.renderSeeds(body);
    const grid = el('div', 'grid'); body.appendChild(grid);
    if (shopTab === 'animals') {
      for (const sk of FARM_SPECIES) {
        const S = SPECIES[sk], home = game.freeHome(sk), item = el('div', 'shopitem' + (game.coins < S.price ? ' poor' : ''));
        const cv = el('canvas'); cv.width = 48; cv.height = 48; item.appendChild(cv); thumbAnimal(cv, sk, 0, { max: 3 });
        item.appendChild(el('div', 'nm', S.name));
        const what = S.produce ? `Gives ${ITEMS[S.produce].name.toLowerCase()}${S.every > 1 ? ' every other day' : ' daily'}` : 'Gives lucky gifts, and looks magnificent';
        item.appendChild(el('div', 'ds', `${what}. Lives in a ${S.home === 'coop' ? 'coop' : 'barn'}${home ? '' : ' (build one first)'}.`));
        const b = el('button', 'btn go', coinHtml(S.price)); b.disabled = game.coins < S.price || !home;
        b.onclick = () => { const r = game.buyAnimal(sk); if (r) game.toast(r, 'bad'); ui.renderShop(); ui.hud(); };
        item.appendChild(b); grid.appendChild(item);
      }
      // wild friends: adopt them with a snack once they trust you
      const sn = el('div', 'shopitem' + (game.coins < 15 ? ' poor' : ''));
      const scv = el('canvas'); scv.width = 48; scv.height = 48; sn.appendChild(scv); paintIcon(scv, 'berryRed');
      sn.appendChild(el('div', 'nm', 'Critter snack'));
      sn.appendChild(el('div', 'ds', 'Pat a wild frog, mouse, swan or capybara, then give it a snack to adopt it.'));
      sn.appendChild(el('div', 'own', game.snacks ? `${game.snacks} in your pocket` : '&nbsp;'));
      const sb = el('div', 'buys'), s1 = el('button', 'btn go', coinHtml(15)); s1.disabled = game.coins < 15;
      s1.onclick = () => { if (game.coins < 15) return; game.coins -= 15; game.snacks = (game.snacks || 0) + 1; game.sfx('coin'); ui.renderShop(); ui.hud(); };
      sb.appendChild(s1); sn.appendChild(sb); grid.appendChild(sn);
      for (const sk of WILD_SPECIES) {
        const S = SPECIES[sk], item = el('div', 'shopitem');
        const cv = el('canvas'); cv.width = 48; cv.height = 48; item.appendChild(cv); thumbAnimal(cv, sk, 0, { max: 3 });
        item.appendChild(el('div', 'nm', `Wild ${S.name.toLowerCase()}`));
        const needs = { pond: 'a pond you dug', bigpond: 'a dug pond of 6+ tiles', deeppond: 'a deep dug pond (3×3 or bigger)', hay: 'a hay bale to nest in' }[S.adopt];
        const H = game.habitat(sk);
        item.appendChild(el('div', 'ds', `Find one on the island and adopt it. Needs ${needs}. ${H.why ? '' : '✔ Ready!'}`));
        item.appendChild(el('div', 'own', `${game.animals.filter((q) => q.adopted && q.sk === sk).length} adopted`));
        grid.appendChild(item);
      }
    } else {
      for (const id of Object.keys(DEF).filter((k) => DEF[k].cat === shopTab)) {
        const D = DEF[id], item = el('div', 'shopitem' + (game.coins < D.price ? ' poor' : ''));
        const cv = el('canvas'); cv.width = 48; cv.height = 48; item.appendChild(cv); thumbThing(cv, id, D.variants > 1 ? Math.floor(D.variants / 3) % D.variants : 0, game);
        item.appendChild(el('div', 'nm', D.name));
        item.appendChild(el('div', 'ds', D.desc || (D.variants > 1 ? `${D.variants} styles to pick from` : D.home ? `Home for ${D.cap} ${D.home === 'coop' ? 'birds' : 'big animals'}` : '')));
        item.appendChild(el('div', 'own', game.bag[id] ? `${game.bag[id]} in your bag` : '&nbsp;'));
        const buys = el('div', 'buys'), many = D.price <= 8 ? 10 : 0;
        const b = el('button', 'btn go', coinHtml(D.price)); b.disabled = game.coins < D.price; b.title = 'Buy one';
        b.onclick = () => { const r = game.buyItem(id, 1); if (r) game.toast(r, 'bad'); else game.toast(`${D.name} added to your bag. Press B to build.`, 'good'); ui.renderShop(); ui.hud(); };
        buys.appendChild(b);
        if (many) { const b2 = el('button', 'btn go', `×${many}`); b2.disabled = game.coins < D.price * many; b2.title = `Buy ${many} for ${D.price * many}`; b2.onclick = () => { const r = game.buyItem(id, many); if (r) game.toast(r, 'bad'); else game.toast(`${many} × ${D.name.toLowerCase()} added to your bag.`, 'good'); ui.renderShop(); ui.hud(); }; buys.appendChild(b2); }
        item.appendChild(buys); grid.appendChild(item);
      }
    }
    $('#shopFoot').innerHTML = `<span>${shopTab === 'animals' ? 'New animals arrive at their home.' : 'Things you buy go into your bag. Press <b>B</b> (or Build) to place them whenever you like.'}</span><span>${coinHtml(game.coins)}</span>`;
  };
  ui.renderSeeds = (body) => {
    const grid = el('div', 'grid'); body.appendChild(grid);
    for (const C of CROPS) {
      const locked = game.day < C.day, item = el('div', 'shopitem' + (game.coins < C.seed || locked ? ' poor' : ''));
      const cv = el('canvas'); cv.width = 48; cv.height = 48; item.appendChild(cv); paintIcon(cv, C.id);
      item.appendChild(el('div', 'nm', C.name));
      item.appendChild(el('div', 'ds', locked ? `Seeds arrive on day ${C.day}` : `Ripe in ${C.days} watered days · sells for ${C.sell}${C.regrow ? ` · keeps fruiting every ${C.regrow} days` : ''}`));
      item.appendChild(el('div', 'own', game.seeds[C.id] ? `${game.seeds[C.id]} seed${game.seeds[C.id] > 1 ? "s" : ""} in your pocket` : '&nbsp;'));
      const buys = el('div', 'buys');
      for (const n of [1, 5]) {
        const b = el('button', 'btn go', n === 1 ? coinHtml(C.seed) : `×5`); b.disabled = locked || game.coins < C.seed * n; b.title = `Buy ${n} for ${C.seed * n}`;
        b.onclick = () => { const r = game.buySeeds(C.id, n); if (r) game.toast(r, 'bad'); ui.renderShop(); ui.hud(); ui.seedBar(); };
        buys.appendChild(b);
      }
      item.appendChild(buys); grid.appendChild(item);
    }
    $('#shopFoot').innerHTML = `<span>Lay <b>farm soil</b> in build mode (Farm tab), then click it to plant. Water with a click; crops grow overnight.</span><span>${coinHtml(game.coins)}</span>`;
  };
  // the seed you'll plant next, with a picker
  ui.seedBar = () => {
    const bar = $('#seedBar'), pick = $('#seedPick'), have = Object.keys(game.seeds).filter((k) => game.seeds[k] > 0);
    const show = game.started !== false && have.length && !game.inside && ui.nearSoil;
    bar.classList.toggle('hidden', !show); if (!show) { pick.classList.add('hidden'); return; }
    if (!(game.seeds[game.seedSel] > 0)) game.seedSel = have[0];
    const key = game.seedSel + ':' + game.seeds[game.seedSel] + ':' + have.length;
    if (bar.dataset.k === key) return; bar.dataset.k = key;
    bar.innerHTML = '';
    const cv = el('canvas'); cv.width = 32; cv.height = 32; paintIcon(cv, game.seedSel);
    bar.appendChild(el('span', '', 'Planting')); bar.appendChild(cv); bar.appendChild(el('b', '', `${CROP[game.seedSel].name} ×${game.seeds[game.seedSel]}`));
    if (have.length > 1) { const b = el('button', 'btn', 'Change'); b.onclick = () => { pick.classList.toggle('hidden'); ui.seedPicker(); }; bar.appendChild(b); }
    if (!pick.classList.contains('hidden')) ui.seedPicker();
  };
  ui.seedPicker = () => {
    const pick = $('#seedPick'); pick.innerHTML = '';
    for (const k of Object.keys(game.seeds).filter((q) => game.seeds[q] > 0)) {
      const b = el('button', k === game.seedSel ? 'on' : ''), cv = el('canvas'); cv.width = 32; cv.height = 32; paintIcon(cv, k);
      b.appendChild(cv); b.appendChild(el('span', '', `${CROP[k].name} ×${game.seeds[k]}`));
      b.onclick = () => { game.seedSel = k; pick.classList.add('hidden'); $('#seedBar').dataset.k = ''; ui.seedBar(); };
      pick.appendChild(b);
    }
  };
  ui.renderSell = (body) => {
    const list = el('div', 'selllist'); body.appendChild(list);
    let total = 0;
    const entries = Object.entries(game.inv).filter(([, n]) => n > 0);
    if (!entries.length) list.appendChild(el('div', 'ds', 'Your basket is empty. Here are some ideas:'));
    for (const [k, n] of entries) {
      const row = el('div', 'sellrow'), cv = el('canvas'); cv.width = 32; cv.height = 32; paintIcon(cv, k);
      row.appendChild(cv); row.appendChild(el('div', 'nm', itemName(k))); row.appendChild(el('div', '', `× ${n}`)); row.appendChild(el('div', '', coinHtml(itemPrice(k) * n)));
      total += itemPrice(k) * n; list.appendChild(row);
    }
    const earn = el('div', 'earn', `
      <div><b>🥚 Animal goodies</b>Eggs ${ITEMS.egg.price}, milk ${ITEMS.milk.price}, wool ${ITEMS.wool.price}+, truffles ${ITEMS.truffle.price}</div>
      <div><b>🎣 Fishing</b>Click the water, then click when you see !. Fish ${ITEMS.minnow.price}–${ITEMS.goldfish.price}</div>
      <div><b>🪓 Chop trees</b>Logs ${ITEMS.log.price} each. Trees grow back in a few days</div>
      <div><b>⛏ Mine rocks</b>Stone ${ITEMS.stone.price}, gems ${ITEMS.amber.price}–${ITEMS.ruby.price} from sparkly rocks</div>
      <div><b>🥕 Farm crops</b>Seeds from the Seeds tab. Wheat ${ITEMS.wheat.price}, carrots ${ITEMS.carrot.price}, pumpkins ${ITEMS.pumpkin.price}</div>
      <div><b>🌸 Forage</b>Wildflowers ${ITEMS.flower.price}, mushrooms ${ITEMS.mushroom.price}, berries ${ITEMS.berryRed.price}</div>`);
    body.appendChild(el('h3', 'px', 'Ways to earn coins')); body.appendChild(earn);
    $('#shopFoot').innerHTML = '';
    const b = el('button', 'btn go px', `Sell everything for ${coinHtml(total)}`); b.disabled = !total;
    b.onclick = () => { const got = game.sell(); if (got) game.toast(`Sold for ${got} coins!`, 'good'); ui.renderShop(); ui.hud(); };
    $('#shopFoot').appendChild(el('span', '', `Sold so far: ${game.stats.sold} goodies`)); $('#shopFoot').appendChild(b);
  };

  // ---- critterdex
  ui.openDex = () => {
    $('#dex').classList.remove('hidden');
    const body = $('#dexBody'); body.innerHTML = '';
    let found = 0, all = 0;
    for (const sk of [...FARM_SPECIES, ...WILD_SPECIES, ...BUG_SPECIES]) {
      const S = SPECIES[sk], got = game.dex[sk] || [];
      found += got.length; all += S.colors.length;
      const box = el('div', 'dexsp'); box.appendChild(el('h3', 'px', `<span>${S.plural}${S.wild ? ' <small style="color:var(--ink2);font:600 12px Nunito">wild</small>' : ''}</span><span>${got.length}/${S.colors.length}</span>`));
      const row = el('div', 'dexrow');
      S.colors.forEach((c, i) => {
        const has = got.includes(i), d = el('div', 'dexc' + (c.rare >= 2 ? ' rare' : '') + (has ? '' : ' unknown')), cv = el('canvas'); cv.width = 48; cv.height = 48;
        thumbAnimal(cv, sk, i, { silhouette: !has, max: 2 }); d.appendChild(cv); d.appendChild(el('div', '', has ? c.name : '???')); row.appendChild(d);
      });
      box.appendChild(row); body.appendChild(box);
    }
    $('#dexTag').textContent = `${found} of ${all} found`;
  };

  // ---- morning report
  game.on('morning', (r) => {
    $('#mTitle').textContent = `Good morning! Day ${game.day}`;
    const body = $('#mBody'); body.innerHTML = '';
    if (r.babies.length) for (const { b, A, B, rare } of r.babies) {
      const row = el('div', 'baby'), cv = el('canvas'); cv.width = 56; cv.height = 56; thumbAnimal(cv, b.sk, b.color, { max: 3 });
      row.appendChild(cv); row.appendChild(el('div', '', `<b>${A.name}</b> and <b>${B.name}</b> had a baby!<br>Meet <b>${b.name}</b>, a ${b.col.name.toLowerCase()} ${b.sp.name.toLowerCase()}${rare ? ' ✨ <b>rare!</b>' : ''}`));
      body.appendChild(row);
    }
    body.appendChild(el('p', '', r.produce ? `${r.produce} of your animals ${r.produce > 1 ? 'are' : 'is'} ready to give you something today.` : 'Feed, water and pat your animals so they have something for you tomorrow.'));
    if (r.unhappy.length) body.appendChild(el('p', '', `${r.unhappy.slice(0, 3).map((a) => a.name).join(', ')} ${r.unhappy.length > 1 ? 'were' : 'was'} a bit sad yesterday.`));
    if (r.full) body.appendChild(el('p', '', `Some of your ${[...new Set(r.full)].map((sk) => SPECIES[sk].plural.toLowerCase()).join(' and ')} wanted a baby, but there's no room at home. Build another ${r.full.some((sk) => SPECIES[sk].home === 'barn') ? 'barn' : 'coop'}!`));
    if (game.weather.raining) body.appendChild(el('p', '', 'It looks like rain later. The troughs will fill themselves, and the rain waters your crops!'));
    else if (game.weather.kind === 'windy') body.appendChild(el('p', '', 'A breezy day today. Hold on to your hat!'));
    else if (game.weather.kind === 'cloudy') body.appendChild(el('p', '', 'A soft, cloudy day.'));
    else body.appendChild(el('p', '', 'Sunny skies all day. Perfect butterfly weather!'));
    $('#morning').classList.remove('hidden');
  });
  game.on('dex', ({ sk, color }) => { const S = SPECIES[sk]; if (game.started) game.toast(`New in your Critterdex: ${S.colors[color].name} ${S.name}!`, 'good'); });

  // ---- undo
  ui.undoState = () => { $('#bUndo').disabled = !game.undoStack.length; };
  // ---- tutorial panel
  ui.tutorial = (T) => {
    const show = () => {
      for (const e of document.querySelectorAll('.pulse')) e.classList.remove('pulse');
      if (!T.active()) { $('#tut').classList.add('hidden'); return; }
      const S = T.step(), i = game.tut;
      $('#tut').classList.remove('hidden');
      $('#tutStep').textContent = S.finish ? 'All done!' : `Tutorial · step ${i + 1} of ${TUTORIAL.length - 1}`;
      $('#tutText').innerHTML = S.text;
      $('#tutNext').classList.toggle('hidden', !(S.finish || S.skip));
      $('#tutNext').textContent = S.finish ? 'Start farming!' : S.skip || 'Next';
      $('#tutSkip').classList.toggle('hidden', !!S.finish);
      if (S.ui) $(S.ui).classList.add('pulse');
    };
    $('#tutNext').onclick = () => { if (T.step().finish) T.skipAll(); else T.next(); };
    $('#tutSkip').onclick = () => ask('Skip the tutorial?', { yes: 'Skip it', no: 'Keep going' }).then((ok) => { if (ok) T.skipAll(); });
    game.on('tut', show); T.enter(); show();
  };
  return ui;
}

// ---------------------------------------------------------- main menu
// Three save plots. Pick one to keep playing, or start a new farm in an empty one.
function drawPerson(canvas, look, t = 0, dir = 'down', moving = false, flip = false) {
  const P0 = new Person(0.5, 1, ['Player/Player_Base/Player_Base_animations', look.shoes, look.pants, look.shirt, look.hair, look.hat]);
  P0.dir = dir; P0.flip = flip; P0.moving = moving; P0.t = t;
  // the character fills the middle of its 64px frame: draw that 32px window, zoomed
  const T = new Thumb(); P0.draw(T, t); const g = canvas.getContext('2d'); g.clearRect(0, 0, canvas.width, canvas.height); g.imageSmoothingEnabled = false;
  const W = canvas.width;
  for (const c of T.calls) { const im = IMG[c.key]; if (!im) continue; g.save(); if (c.flip) { g.translate(W, 0); g.scale(-1, 1); } g.drawImage(im, c.sx + 13, c.sy + 9, 38, 38, 0, 0, W, W); g.restore(); }
}
function installTitle(onStart) {
  // an older single save moves into plot 1
  const old = store.get('rainbow-ranch-save');
  if (old && !store.get(SLOT_KEY(1))) { store.set(SLOT_KEY(1), old); store.del('rainbow-ranch-save'); }
  const defLook = () => ({ hair: LOOKS.hair.find((k) => /Hair_2_Brown/.test(k)) || LOOKS.hair[0], shirt: LOOKS.shirt.find((k) => /Farmer_Shirt_1_Pink/.test(k)) || LOOKS.shirt[0], pants: LOOKS.pants.find((k) => /Farmer_Pants_1_Blue/.test(k)) || LOOKS.pants[0], shoes: LOOKS.shoes[0], hat: null });
  let look = defLook(), slot = 1;
  // hopping critters over the logo
  const cr = $('#mCritters'); cr.innerHTML = '';
  [['chicken', 2], ['duck', 0], ['capybara', 0], ['sheep', 7], ['frog', 3], ['pig', 0], ['cow', 1], ['mouse', 1]].forEach(([sk, c], i) => {
    const cv = el('canvas'); cv.width = 96; cv.height = 96; thumbAnimal(cv, sk, c, { max: 3 }); cv.style.animationDelay = `${i * 0.18}s`; cr.appendChild(cv);
  });
  const stars = (b) => { const n = b < 20 ? 1 : b < 60 ? 2 : b < 120 ? 3 : b < 220 ? 4 : 5; return '★'.repeat(n) + '☆'.repeat(5 - n); };
  const beautyOf = (s) => s.things.reduce((t, o) => t + (DEF[o.id] ? DEF[o.id].beauty : 0), 0) + (s.dug || []).length;
  const renderSlots = () => {
    const box = $('#mSlots'); box.innerHTML = '';
    for (let n = 1; n <= 3; n++) {
      const s = store.get(SLOT_KEY(n)), card = el('div', 'slot3 panel' + (s ? '' : ' empty'));
      card.appendChild(el('div', 'tab px', `Plot ${n}`));
      if (s) {
        const who = el('canvas', 'who'); who.width = 64; who.height = 64; card.appendChild(who); drawPerson(who, s.look || defLook());
        card.appendChild(el('div', 'nm px', s.farmName));
        card.appendChild(el('div', 'info', `Day ${s.day} · <span class="price"><span class="coin"></span>${s.coins}</span>`));
        card.appendChild(el('div', 'stars', stars(beautyOf(s))));
        const pets = el('div', 'pets'), seen = new Set();
        for (const a of s.animals || []) { if (seen.has(a.sk) || seen.size >= 7 || !SPECIES[a.sk]) continue; seen.add(a.sk); const cv = el('canvas'); cv.width = 48; cv.height = 48; thumbAnimal(cv, a.sk, a.color, { max: 2 }); pets.appendChild(cv); }
        card.appendChild(pets);
        const row = el('div', 'row'), play = el('button', 'btn go px', 'Play'), del = el('button', 'btn del', 'Delete');
        play.onclick = () => { $('#title').classList.add('hidden'); onStart({ look: s.look || defLook(), farmName: s.farmName, save: s, seed: s.seed, slot: n }); };
        del.onclick = () => ask(`Delete ${s.farmName} forever?`, { yes: 'Delete it', no: 'Keep it' }).then((ok) => { if (ok) { store.del(SLOT_KEY(n)); renderSlots(); } });
        row.appendChild(play); row.appendChild(del); card.appendChild(row);
      } else {
        const sp = el('canvas', 'sprout'); sp.width = 16; sp.height = 32; const g = sp.getContext('2d'); g.imageSmoothingEnabled = false; if (IMG['Crops/Crops']) g.drawImage(IMG['Crops/Crops'], 5 * 16, 14 * 32, 16, 32, 0, 0, 16, 32);
        card.appendChild(sp); card.appendChild(el('div', 'nm px', 'Empty plot')); card.appendChild(el('div', 'info', 'Plant a brand new farm here'));
        const row = el('div', 'row'), b = el('button', 'btn go px', 'New farm');
        b.onclick = () => openCreator(n); row.appendChild(b); card.appendChild(row);
      }
      box.appendChild(card);
    }
  };
  // character + farm name
  const pc = $('#cPrev'), rows = [['Hair', 'hair'], ['Top', 'shirt'], ['Bottoms', 'pants'], ['Shoes', 'shoes'], ['Hat', 'hat']], opts = $('#cOpts');
  const render = () => {
    opts.innerHTML = '';
    for (const [lab, k] of rows) {
      const list = LOOKS[k], i = Math.max(0, list.indexOf(look[k]));
      const row = el('div', 'opt'); row.appendChild(el('span', '', lab));
      const a = el('button', 'btn', '‹'), b = el('button', 'btn', '›'), v = el('div', 'v', lookName(list[i]));
      a.onclick = () => { look[k] = list[(i + list.length - 1) % list.length]; render(); };
      b.onclick = () => { look[k] = list[(i + 1) % list.length]; render(); };
      row.appendChild(a); row.appendChild(v); row.appendChild(b); opts.appendChild(row);
    }
  };
  let t = 0;
  const spin = () => {
    if ($('#title').classList.contains('hidden')) return;
    t += 1 / 60;
    if (!$('#creatorView').classList.contains('hidden')) { const dirs = ['down', 'side', 'up', 'side'], d = Math.floor(t / 1.6) % 4; drawPerson(pc, look, t, dirs[d], true, d === 3); }
    requestAnimationFrame(spin);
  };
  const openCreator = (n) => {
    slot = n; look = defLook(); render();
    $('#cTitle').textContent = `New farm · Plot ${n}`; $('#cFarm').value = ['Sunny Acres', 'Petal Bay', 'Clover Hollow'][n - 1];
    $('#menuView').classList.add('hidden'); $('#creatorView').classList.remove('hidden');
  };
  $('#cBack').onclick = () => { $('#creatorView').classList.add('hidden'); $('#menuView').classList.remove('hidden'); };
  $('#cNew').onclick = () => { $('#title').classList.add('hidden'); onStart({ look: { ...look }, farmName: ($('#cFarm').value || 'Sunny Acres').trim().slice(0, 24), slot }); };
  renderSlots(); spin();
}
