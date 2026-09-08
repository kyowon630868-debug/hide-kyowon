/**
 * 지피티개발/chars.png (라벨 붙은 6x6 프리뷰) → 게임용 스프라이트시트로 정리.
 *   node scripts/import-chars.mjs
 * 각 캐릭터를 잘라 균일 프레임에 발끝-중앙 정렬 후 축소.
 * 출력: public/assets/characters/chars.png (6열 x 5행), chibi.png (1행만)
 * (0행 '기본' 은 머리가 잘려서 제외 — 사원/대리/과장/부장/인턴 5종)
 */
import { PNG } from 'pngjs';
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = '지피티개발/chars.png';
const COLS = [
  [397, 497],
  [556, 654],
  [718, 809],
  [878, 971],
  [1036, 1136],
  [1198, 1304],
];
const ROWS = [
  [60, 189],
  [190, 334],
  [335, 486],
  [488, 633],
  [635, 771],
  [772, 913],
];
const TARGET_H = 60; // 캐릭터 키(px) 목표 → 이 값으로 축소

const src = PNG.sync.read(readFileSync(SRC));
const W = src.width;
const A = (x, y) => src.data[(y * W + x) * 4 + 3];

// 1) 각 셀에서 캐릭터 tight bbox
const cells = [];
let maxW = 0;
let maxH = 0;
for (let r = 0; r < 6; r++) {
  for (let c = 0; c < 6; c++) {
    const [x0, x1] = COLS[c];
    const [y0, y1] = ROWS[r];
    let minx = 1e9;
    let maxx = -1;
    let miny = 1e9;
    let maxy = -1;
    for (let y = y0; y <= y1; y++)
      for (let x = x0 - 6; x <= x1 + 6; x++) {
        if (x < 0 || x >= W) continue;
        if (A(x, y) > 60) {
          if (x < minx) minx = x;
          if (x > maxx) maxx = x;
          if (y < miny) miny = y;
          if (y > maxy) maxy = y;
        }
      }
    const b = { x: minx, y: miny, w: maxx - minx + 1, h: maxy - miny + 1 };
    cells.push(b);
    maxW = Math.max(maxW, b.w);
    maxH = Math.max(maxH, b.h);
  }
}

const scale = TARGET_H / maxH;
const FW = Math.ceil(maxW * scale) + 4;
const FH = Math.ceil(maxH * scale) + 4;
console.log(`source char max ${maxW}x${maxH} → frame ${FW}x${FH} (scale ${scale.toFixed(3)})`);

// 2) 균일 시트로 재조립 (발끝 중앙 정렬, nearest-neighbor 축소)
function buildSheet(rowFilter) {
  const rows = rowFilter ?? [1, 2, 3, 4, 5];
  const out = new PNG({ width: FW * 6, height: FH * rows.length });
  out.data.fill(0);
  rows.forEach((r, ri) => {
    for (let c = 0; c < 6; c++) {
      const b = cells[r * 6 + c];
      const dw = Math.round(b.w * scale);
      const dh = Math.round(b.h * scale);
      const ox = c * FW + Math.floor((FW - dw) / 2);
      const oy = ri * FH + (FH - 2 - dh); // 바닥에서 2px 띄우고 정렬
      for (let y = 0; y < dh; y++)
        for (let x = 0; x < dw; x++) {
          const sx = b.x + Math.floor(x / scale);
          const sy = b.y + Math.floor(y / scale);
          const si = (sy * W + sx) * 4;
          if (src.data[si + 3] < 30) continue;
          const di = ((oy + y) * out.width + (ox + x)) * 4;
          out.data[di] = src.data[si];
          out.data[di + 1] = src.data[si + 1];
          out.data[di + 2] = src.data[si + 2];
          out.data[di + 3] = src.data[si + 3];
        }
    }
  });
  return out;
}

writeFileSync('public/assets/characters/chars.png', PNG.sync.write(buildSheet()));
writeFileSync('public/assets/characters/chibi.png', PNG.sync.write(buildSheet([1])));
console.log(`done. FRAME = { width: ${FW}, height: ${FH} }  → src/game/assets.ts 반영`);
