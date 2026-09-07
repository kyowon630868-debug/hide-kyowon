/** 아틀라스에서 투명하지 않은 덩어리(스프라이트)들의 bounding box 를 찾아
 *  번호를 매긴 contact sheet + JSON(rects) 로 출력. */
import { PNG } from 'pngjs';
import { readFileSync, writeFileSync } from 'node:fs';

const [, , src, outImg, outJson, y0S, y1S] = process.argv;
const png = PNG.sync.read(readFileSync(src));
const { width: W, height: H } = png;
const Y0 = Number(y0S || 0);
const Y1 = Number(y1S || H);
const A = (x, y) => png.data[(y * W + x) * 4 + 3];

// flood fill (8-conn) with a gap tolerance
const seen = new Uint8Array(W * H);
const GAP = 2;
const rects = [];
for (let y = Y0; y < Y1; y++) {
  for (let x = 0; x < W; x++) {
    if (seen[y * W + x] || A(x, y) < 12) continue;
    let minx = x;
    let maxx = x;
    let miny = y;
    let maxy = y;
    const stack = [[x, y]];
    seen[y * W + x] = 1;
    while (stack.length) {
      const [cx, cy] = stack.pop();
      if (cx < minx) minx = cx;
      if (cx > maxx) maxx = cx;
      if (cy < miny) miny = cy;
      if (cy > maxy) maxy = cy;
      for (let dy = -GAP; dy <= GAP; dy++)
        for (let dx = -GAP; dx <= GAP; dx++) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          if (seen[ny * W + nx] || A(nx, ny) < 12) continue;
          seen[ny * W + nx] = 1;
          stack.push([nx, ny]);
        }
    }
    const w = maxx - minx + 1;
    const h = maxy - miny + 1;
    if (w < 6 || h < 6 || w > 220 || h > 220) continue;
    rects.push({ x: minx, y: miny, w, h });
  }
}
rects.sort((a, b) => a.y - b.y || a.x - b.x);
writeFileSync(outJson, JSON.stringify(rects, null, 0));

// contact sheet
const S = 3;
const PAD = 4;
const LABEL = 10;
const perRow = 10;
const cellW = 96 + PAD;
const cellH = 96 + PAD + LABEL;
const OW = perRow * cellW;
const OH = Math.ceil(rects.length / perRow) * cellH;
const o = new PNG({ width: OW, height: OH });
o.data.fill(0);
const oset = (x, y, r, g, b, a) => {
  if (x < 0 || y < 0 || x >= OW || y >= OH) return;
  const i = (y * OW + x) * 4;
  o.data[i] = r;
  o.data[i + 1] = g;
  o.data[i + 2] = b;
  o.data[i + 3] = a;
};
const FONT = {
  0: ['111', '101', '101', '101', '111'], 1: ['010', '110', '010', '010', '111'],
  2: ['111', '001', '111', '100', '111'], 3: ['111', '001', '111', '001', '111'],
  4: ['101', '101', '111', '001', '001'], 5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'], 7: ['111', '001', '010', '010', '010'],
  8: ['111', '101', '111', '101', '111'], 9: ['111', '101', '111', '001', '111'],
};
const num = (n, x, y) => {
  const s = String(n);
  for (let k = 0; k < s.length; k++) {
    const g = FONT[+s[k]];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g[r][c] === '1') oset(x + k * 4 + c, y + r, 255, 255, 0, 255);
  }
};
rects.forEach((rc, idx) => {
  const ox = (idx % perRow) * cellW;
  const oy = Math.floor(idx / perRow) * cellH;
  const sc = Math.min(S, Math.floor(92 / Math.max(rc.w, rc.h)) || 1);
  for (let y = 0; y < rc.h; y++)
    for (let x = 0; x < rc.w; x++) {
      const i = ((rc.y + y) * W + (rc.x + x)) * 4;
      if (png.data[i + 3] < 12) continue;
      for (let sy = 0; sy < sc; sy++)
        for (let sx = 0; sx < sc; sx++) oset(ox + x * sc + sx, oy + LABEL + y * sc + sy, png.data[i], png.data[i + 1], png.data[i + 2], 255);
    }
  num(idx, ox + 1, oy + 1);
});
writeFileSync(outImg, PNG.sync.write(o));
console.log(`${rects.length} blobs  ->  ${outImg}  /  ${outJson}`);
