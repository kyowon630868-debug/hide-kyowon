/** 분석용: PNG 위에 격자 + 좌표 라벨을 얹어 저장 (에셋 슬라이스 좌표 찾기용) */
import { PNG } from 'pngjs';
import { readFileSync, writeFileSync } from 'node:fs';

const [, , src, out, cellStr] = process.argv;
const cell = Number(cellStr || 32);
const png = PNG.sync.read(readFileSync(src));
const { width: W, height: H } = png;
const set = (x, y, r, g, b, a = 255) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4;
  png.data[i] = r;
  png.data[i + 1] = g;
  png.data[i + 2] = b;
  png.data[i + 3] = Math.max(png.data[i + 3], a);
};
// 격자선
for (let x = 0; x <= W; x += cell) for (let y = 0; y < H; y++) set(x, y, 255, 0, 128, 140);
for (let y = 0; y <= H; y += cell) for (let x = 0; x < W; x++) set(x, y, 255, 0, 128, 140);
// 굵은 선 (4칸마다)
for (let x = 0; x <= W; x += cell * 4) for (let y = 0; y < H; y++) set(x, y, 0, 220, 255, 200);
for (let y = 0; y <= H; y += cell * 4) for (let x = 0; x < W; x++) set(x, y, 0, 220, 255, 200);

writeFileSync(out, PNG.sync.write(png));
console.log(`${out}  ${W}x${H}  cell=${cell}  cols=${Math.ceil(W / cell)} rows=${Math.ceil(H / cell)}`);
