/** 스프라이트시트를 프레임별로 잘라 6배 확대 + 인덱스 라벨 contact sheet 로 만든다 */
import { PNG } from 'pngjs';
import { readFileSync, writeFileSync } from 'node:fs';

const [, , src, out, fwS, fhS, scaleS] = process.argv;
const fw = Number(fwS);
const fh = Number(fhS);
const scale = Number(scaleS || 6);
const png = PNG.sync.read(readFileSync(src));
const cols = Math.floor(png.width / fw);
const rows = Math.floor(png.height / fh);
const pad = 4;
const cw = fw * scale + pad;
const ch = fh * scale + pad + 10;
const OUT_W = cols * cw;
const OUT_H = rows * ch;
const o = new PNG({ width: OUT_W, height: OUT_H });
o.data.fill(0);
const oset = (x, y, r, g, b, a) => {
  if (x < 0 || y < 0 || x >= OUT_W || y >= OUT_H) return;
  const i = (y * OUT_W + x) * 4;
  o.data[i] = r;
  o.data[i + 1] = g;
  o.data[i + 2] = b;
  o.data[i + 3] = a;
};
const get = (x, y) => {
  const i = (y * png.width + x) * 4;
  return [png.data[i], png.data[i + 1], png.data[i + 2], png.data[i + 3]];
};
// tiny 3x5 digit font
const FONT = {
  0: ['111', '101', '101', '101', '111'],
  1: ['010', '110', '010', '010', '111'],
  2: ['111', '001', '111', '100', '111'],
  3: ['111', '001', '111', '001', '111'],
  4: ['101', '101', '111', '001', '001'],
  5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'],
  7: ['111', '001', '010', '010', '010'],
  8: ['111', '101', '111', '101', '111'],
  9: ['111', '101', '111', '001', '111'],
};
const digit = (d, x, y) => {
  const g = FONT[d];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g[r][c] === '1') oset(x + c, y + r, 255, 255, 0, 255);
};
const num = (n, x, y) => {
  const s = String(n);
  for (let k = 0; k < s.length; k++) digit(+s[k], x + k * 4, y);
};

let idx = 0;
for (let ry = 0; ry < rows; ry++) {
  for (let rx = 0; rx < cols; rx++) {
    const ox = rx * cw;
    const oy = ry * ch;
    // checker bg
    for (let y = 0; y < fh * scale; y++)
      for (let x = 0; x < fw * scale; x++) {
        const c = ((x >> 3) + (y >> 3)) & 1 ? 40 : 60;
        oset(ox + x, oy + 10 + y, c, c, c, 255);
      }
    for (let y = 0; y < fh; y++)
      for (let x = 0; x < fw; x++) {
        const [r, g, b, a] = get(rx * fw + x, ry * fh + y);
        if (a < 20) continue;
        for (let sy = 0; sy < scale; sy++)
          for (let sx = 0; sx < scale; sx++) oset(ox + x * scale + sx, oy + 10 + y * scale + sy, r, g, b, 255);
      }
    num(idx, ox + 2, oy + 2);
    idx++;
  }
}
writeFileSync(out, PNG.sync.write(o));
console.log(`${out}  ${cols}x${rows} frames  (frame ${fw}x${fh})`);
