/**
 * LimeZu "Modern Interiors — Free version" 를 이 프로젝트 에셋 구조로 가져온다.
 *
 *   node scripts/import-limezu.mjs "<압축 푼 폴더>"
 *   (기본: ./Modern_Interiors_Free_v2.2)
 *
 * 무료판 라이선스: 비상업 프로젝트만. (개인 프로젝트 OK)
 * 결과물은 public/assets/ 아래에 덮어써진다. gen-assets.mjs 플레이스홀더 대체.
 */
import { PNG } from 'pngjs';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACK = resolve(ROOT, process.argv[2] || 'Modern_Interiors_Free_v2.2');
const BASE = resolve(PACK, 'Modern tiles_Free');
const OUT = resolve(ROOT, 'public/assets');

if (!existsSync(BASE)) {
  console.error('못 찾음:', BASE);
  process.exit(1);
}

const load = (rel) => PNG.sync.read(readFileSync(resolve(BASE, rel)));
const save = (rel, png) => {
  const p = resolve(OUT, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, PNG.sync.write(png));
  console.log('  ', rel, `${png.width}x${png.height}`);
};

/** src 의 (sx,sy,w,h) 영역을 잘라 새 PNG 로 */
function crop(src, sx, sy, w, h) {
  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const si = ((sy + y) * src.width + (sx + x)) * 4;
      const di = (y * w + x) * 4;
      out.data[di] = src.data[si];
      out.data[di + 1] = src.data[si + 1];
      out.data[di + 2] = src.data[si + 2];
      out.data[di + 3] = src.data[si + 3];
    }
  return out;
}

/** dst 에 src(투명 무시) 를 (dx,dy) 로 blit */
function blit(dst, src, dx, dy, sx = 0, sy = 0, w = src.width, h = src.height) {
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const si = ((sy + y) * src.width + (sx + x)) * 4;
      if (src.data[si + 3] < 8) continue;
      const tx = dx + x;
      const ty = dy + y;
      if (tx < 0 || ty < 0 || tx >= dst.width || ty >= dst.height) continue;
      const di = (ty * dst.width + tx) * 4;
      dst.data[di] = src.data[si];
      dst.data[di + 1] = src.data[si + 1];
      dst.data[di + 2] = src.data[si + 2];
      dst.data[di + 3] = src.data[si + 3];
    }
}

console.log('LimeZu 가져오기 →', OUT);

// ── 바닥 (Room_Builder_free_32x32) ────────────────────────
// 라벨 = 픽셀좌표. 각 재질 블록의 깨끗한 중앙 32칸.
const rb = load('Interiors_free/32x32/Room_Builder_free_32x32.png');
const FLOOR_SRC = {
  'floor-pantry': [384, 160], // 붉은 벽돌
  'floor-corridor': [384, 224], // 크림 체커
  'floor-restroom': [384, 288], // 민트 원형
  'floor-office': [448, 256], // 회색 카펫(플레이드)
  'floor-meeting': [384, 416], // 헤링본 우드
};
for (const [key, [x, y]] of Object.entries(FLOOR_SRC)) {
  save(`tiles/${key}.png`, crop(rb, x, y, 32, 32));
}

// 벽 · 낮은 칸막이 · 문 · 엘리베이터문: LimeZu 벽은 32칸 반복 타일이 아니라
// 여기선 팔레트에 맞춰 코드로 생성 (단순 사각형이 아니라 상단 하이라이트/걸레받이 포함).
function wallTex(top, face, foot) {
  const w = new PNG({ width: 32, height: 32 });
  const put = (x, y, c) => {
    const i = (y * 32 + x) * 4;
    w.data[i] = c[0];
    w.data[i + 1] = c[1];
    w.data[i + 2] = c[2];
    w.data[i + 3] = 255;
  };
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      let c = face;
      if (y < 5) c = top;
      else if (y > 26) c = foot;
      if ((x + y) % 9 === 0) c = c.map((v) => Math.max(0, v - 10));
      put(x, y, c);
    }
  return w;
}
save('tiles/wall.png', wallTex([132, 126, 168], [96, 90, 128], [64, 60, 92]));
save('tiles/wall-low.png', wallTex([220, 236, 233], [200, 224, 220], [150, 190, 186]));

// ── 캐릭터 (Adam) ────────────────────────────────────────
// LimeZu 방향 순서: 좌(0) 위(1) 우(2) 아래(3)
// idle_16x16 (64x32, 4프레임): L U R D
// run_16x16 (384x32, 24프레임 = 4방향 x 6): L 0-5 · U 6-11 · R 12-17 · D 18-23
const FW = 16;
const FH = 32;
const frameFrom = (img, i) => crop(img, i * FW, 0, FW, FH);

function buildChar(name) {
  const idle = load(`Characters_free/${name}_idle_16x16.png`);
  const run = load(`Characters_free/${name}_run_16x16.png`);
  const sheet = new PNG({ width: FW * 6, height: FH });
  sheet.data.fill(0);
  // [0]하-정지 [1]하-걷기 [2]상-정지 [3]상-걷기 [4]옆(우)-정지 [5]옆(우)-걷기
  blit(sheet, frameFrom(idle, 3), 0 * FW, 0);
  blit(sheet, frameFrom(run, 20), 1 * FW, 0);
  blit(sheet, frameFrom(idle, 1), 2 * FW, 0);
  blit(sheet, frameFrom(run, 8), 3 * FW, 0);
  blit(sheet, frameFrom(idle, 2), 4 * FW, 0);
  blit(sheet, frameFrom(run, 14), 5 * FW, 0);
  return sheet;
}

// 4캐릭터를 세로로 쌓은 시트 (row = characterId). 지금은 chibi = Adam 만 써도 됨.
const CHARS = ['Adam', 'Alex', 'Amelia', 'Bob'];
const chars = new PNG({ width: FW * 6, height: FH * CHARS.length });
chars.data.fill(0);
CHARS.forEach((n, r) => blit(chars, buildChar(n), 0, r * FH));
save('characters/chars.png', chars);
save('characters/chibi.png', buildChar('Adam'));

console.log('done. (프레임 16x32 → src/game/assets.ts 의 CHAR_FRAME 확인)');
