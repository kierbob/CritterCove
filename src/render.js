// ---------------------------------------------------------------- render
class Renderer {
  constructor(canvas) {
    this.c = canvas; this.g = canvas.getContext('2d');
    this.cam = { x: 0, y: 0, z: 3 };            // centre in tiles, zoom = screen px per sprite px
    this.light = document.createElement('canvas'); this.lg = this.light.getContext('2d');
    this.resize();
  }
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = dpr;
    this.W = Math.floor(this.c.clientWidth * dpr); this.H = Math.floor(this.c.clientHeight * dpr);
    this.c.width = this.W; this.c.height = this.H; this.light.width = this.W; this.light.height = this.H;
    this.g.imageSmoothingEnabled = false;
  }
  get Z() { return this.cam.z * this.dpr; }
  // world tile coords -> screen px
  sx(x) { return Math.round((x - this.cam.x) * TS * this.Z + this.W / 2); }
  sy(y) { return Math.round((y - this.cam.y) * TS * this.Z + this.H / 2); }
  toWorld(px, py) { return [(px * this.dpr - this.W / 2) / (TS * this.Z) + this.cam.x, (py * this.dpr - this.H / 2) / (TS * this.Z) + this.cam.y]; }
  view() { const hw = this.W / 2 / (TS * this.Z), hh = this.H / 2 / (TS * this.Z); return [this.cam.x - hw - 1, this.cam.y - hh - 1, this.cam.x + hw + 1, this.cam.y + hh + 2]; }

  // draw part of a sheet so that its bottom-centre lands on world point (x, y)
  spr(key, sx, sy, sw, sh, x, y, opt = {}) {
    const im = IMG[key]; if (!im) return;
    const Z = this.Z * (opt.scale || 1), w = sw * Z, h = sh * Z;
    const px = this.sx(x) - w / 2 + (opt.ox || 0) * this.Z, py = this.sy(y) - h + (opt.oy || 0) * this.Z;
    const g = this.g;
    if (opt.alpha !== undefined) g.globalAlpha = opt.alpha;
    if (opt.flip) { g.save(); g.translate(Math.round(px + w), Math.round(py)); g.scale(-1, 1); g.drawImage(im, sx, sy, sw, sh, 0, 0, Math.round(w), Math.round(h)); g.restore(); }
    else g.drawImage(im, sx, sy, sw, sh, Math.round(px), Math.round(py), Math.round(w), Math.round(h));
    if (opt.alpha !== undefined) g.globalAlpha = 1;
  }
  // a 16px tile with its top-left at world tile (x, y)
  tile(key, sx, sy, x, y) {
    const im = IMG[key]; if (!im) return;
    const px = this.sx(x), py = this.sy(y), s = this.sx(x + 1) - px, t = this.sy(y + 1) - py;
    this.g.drawImage(im, sx, sy, TS, TS, px, py, s, t);
  }

  // --------------------------------------------------------------- ground
  drawGround(world, t) {
    const [x0, y0, x1, y1] = this.view();
    const wf = Math.floor(t * 5) % 8, bf = Math.floor(t * 4) % 6, mf = Math.floor(t * 4) % 8;
    const g = this.g;
    g.fillStyle = '#0095e9'; g.fillRect(0, 0, this.W, this.H);
    const T = (x, y) => world.get(x, y), PD = (x, y) => world.isPond(x, y);
    for (let vy = Math.max(0, Math.floor(y0)); vy <= Math.min(world.H, Math.ceil(y1)); vy++) {
      for (let vx = Math.max(0, Math.floor(x0)); vx <= Math.min(world.W, Math.ceil(x1)); vx++) {
        const a = T(vx - 1, vy - 1), b = T(vx, vy - 1), c = T(vx - 1, vy), d = T(vx, vy);
        const dx = vx - 0.5, dy = vy - 0.5;
        if (a === WATER && b === WATER && c === WATER && d === WATER) {
          // open water: gentle animated ripples
          if (hash2(vx, vy, 3) < 0.25) this.tile(P.waterMid, ((mf + (vx * 3 + vy) % 8) % 8) * TS, 0, dx, dy);
          continue;
        }
        const pond = PD(vx - 1, vy - 1) || PD(vx, vy - 1) || PD(vx - 1, vy) || PD(vx, vy);
        const anyWater = a === WATER || b === WATER || c === WATER || d === WATER;
        if (anyWater && pond) {
          const m = (a === GRASS ? 8 : 0) | (b === GRASS ? 4 : 0) | (c === GRASS ? 2 : 0) | (d === GRASS ? 1 : 0);
          const s = AUTO.grassWater[m]; if (s) this.tile(P.waterAnim, wf * 48 + s[0], s[1], dx, dy);
          continue;
        }
        if (anyWater) {
          const m = (a !== WATER ? 8 : 0) | (b !== WATER ? 4 : 0) | (c !== WATER ? 2 : 0) | (d !== WATER ? 1 : 0);
          const s = AUTO.sandWater[m]; if (s) this.tile(P.beach, bf * 80 + s[0], s[1], dx, dy);
          continue;
        }
        const m = (a === GRASS ? 8 : 0) | (b === GRASS ? 4 : 0) | (c === GRASS ? 2 : 0) | (d === GRASS ? 1 : 0);
        if (m === 15) {
          this.tile(P.grassMid, 0, 0, dx, dy);
        } else if (m === 0) this.tile('Tiles/Grass/Path_Middle', 0, 0, dx, dy);
        else { const s = AUTO.grassSand[m]; if (s) this.tile(P.grassTiles, s[0], s[1], dx, dy); }
      }
    }
  }

  // ------------------------------------------------------------- lighting
  // darkness is a multiply layer; lamps punch warm light back into it
  drawLight(amb, lights) {
    if (amb[0] > 250 && amb[1] > 250 && amb[2] > 250) return;
    const L = this.lg, W = this.W, H = this.H;
    L.globalCompositeOperation = 'source-over';
    L.fillStyle = `rgb(${amb[0] | 0},${amb[1] | 0},${amb[2] | 0})`; L.fillRect(0, 0, W, H);
    L.globalCompositeOperation = 'lighter';
    for (const l of lights) {
      const px = this.sx(l.x), py = this.sy(l.y), r = l.r * TS * this.Z;
      if (px < -r || py < -r || px > W + r || py > H + r) continue;
      const gr = L.createRadialGradient(px, py, 0, px, py, r);
      gr.addColorStop(0, `rgba(${l.c[0]},${l.c[1]},${l.c[2]},${l.a})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      L.fillStyle = gr; L.fillRect(px - r, py - r, r * 2, r * 2);
    }
    this.g.globalCompositeOperation = 'multiply'; this.g.drawImage(this.light, 0, 0);
    this.g.globalCompositeOperation = 'source-over';
  }
}

// ---------------------------------------------------- scenery sprites
function drawObj(R, o, t) {
  const x = o.x + 0.5, y = o.y + 1;
  switch (o.kind) {
    case 'tree': {
      const key = `Trees/${o.size}_${o.tree}_${o.tree === 'Spruce' && o.size === 'Big' ? 'tree' : 'Tree'}`;
      const im = IMG[key] || IMG[`Trees/${o.size}_${o.tree}_Tree`]; if (!im) return;
      const k = im === IMG[key] ? key : `Trees/${o.size}_${o.tree}_Tree`;
      const fw = im.width / 3, fh = im.height, f = o.stump ? 0 : 1;
      R.spr(k, f * fw, 0, fw, fh, x, y + 0.05, { ox: o.shake > 0 ? Math.sin(t * 40) * 0.6 : 0 });
      if (o.fallT > 0) { const k2 = 1 - o.fallT; R.spr(k, fw, 0, fw, fh, x, y + 0.05, { ox: (o.fallDir || 1) * k2 * k2 * 18, oy: k2 * 4, alpha: Math.max(0, o.fallT) }); }
      return;
    }
    case 'flower': { const f = Math.floor(t * 3 + o.ph) % 6; R.spr(`${P.anim}Flower_Animations/Not_Potted/Flowers_${o.sheet}_Anim`, f * 16, o.row * 16, 16, 16, x, y); return; }
    case 'grass': { const f = Math.floor(t * 4 + o.ph) % 8; R.spr(`${P.anim}Grass_Animations/Grass_${o.v}_Anim`, f * 16, 0, 16, 16, x, y); return; }
    case 'mushroom': { const k = `${P.anim}Muschroom_Animations/muschroom_${o.v}_Anim`, im = IMG[k]; if (!im) return; const n = im.width / 16, f = Math.floor(t * 3 + o.ph) % n; R.spr(k, f * 16, 0, 16, 16, x, y); return; }
    case 'rock': R.spr(`${P.anim}Rock_Animations/Rock_${o.v}_Anim`, 0, 0, 16, 16, x, y, { ox: o.shake > 0 ? Math.sin(t * 60) * 0.7 : 0 }); return;
    case 'ore': R.spr('Outdoor decoration/Ores', 0, o.v * 16, 16, 16, x, y, { ox: o.shake > 0 ? Math.sin(t * 60) * 0.7 : 0 }); return;
    case 'berry': if (o.ripe) R.spr('Crops/Berries', o.v * 32, 0, 16, 16, x, y); else R.spr(P.od + 'Outdoor_Decor', 3 * 16, 9 * 16, 16, 16, x, y); return;
    case 'bush': { const c = [[3, 9], [5, 9], [6, 9]][o.v]; R.spr(P.od + 'Outdoor_Decor', c[0] * 16, c[1] * 16, 16, 16, x, y); return; }
    case 'cattail': { const f = Math.floor(t * 3 + o.ph) % 8; R.spr(`${P.anim}Water_Decor_Animations/Water_Plants/Cattail_${o.v}_Anim`, f * 16, 0, 16, 16, x, y); return; }
    case 'lily': { const f = Math.floor(t * 2 + o.ph) % 8; R.spr(`${P.anim}Water_Decor_Animations/Water_Plants/Lillypad_${o.col}_${o.v}_Anim`, f * 16, 0, 16, 16, x, y); return; }
    case 'shell': R.spr('Tiles/Beach/Beach_Decor_Tiles', (o.v % 2) * 16, Math.floor(o.v / 2) * 16, 16, 16, x, y); return;
  }
}
