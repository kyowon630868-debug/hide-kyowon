/**
 * 지피티개발/*.png (사용자가 GPT/제미나이로 만든 큰 원본 아트) → 게임용 에셋으로 정리.
 *   node scripts/import-art.mjs
 *
 * - 투명 여백 자동 크롭 → 박스필터로 고품질 축소
 * - 타일은 32x32(엘리베이터 64x64) 로 꽉 채워 리사이즈
 * - 가구/소품은 현재 크기 박스 안에 비율 유지해 맞춤(레이아웃 안 깨지게)
 * - window-namsan: 와이드 파노라마, lobby-bg: 메인화면 배경
 *
 * chars.png / chibi.png 는 scripts/import-chars.mjs 담당 — 여기서 건드리지 않음.
 */
import { PNG } from 'pngjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const SRC_DIR = '지피티개발';
const OUT_DIR = 'public/assets';

/** 알파가 이 값 이하이면 '빈 픽셀' 로 본다 */
const ALPHA_CUTOFF = 10;

/** 불투명 영역의 바운딩 박스 (없으면 전체) */
function contentBox(png) {
  let x0 = png.width,
    y0 = png.height,
    x1 = -1,
    y1 = -1;
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      if (png.data[(y * png.width + x) * 4 + 3] > ALPHA_CUTOFF) {
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return { x: 0, y: 0, w: png.width, h: png.height };
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** src 의 (bx,by,bw,bh) 영역을 dw x dh 로 알파가중 박스필터 축소 */
function resizeRegion(src, bx, by, bw, bh, dw, dh) {
  const out = new PNG({ width: dw, height: dh });
  for (let ty = 0; ty < dh; ty++) {
    const sy0 = by + (ty / dh) * bh;
    const sy1 = by + ((ty + 1) / dh) * bh;
    for (let tx = 0; tx < dw; tx++) {
      const sx0 = bx + (tx / dw) * bw;
      const sx1 = bx + ((tx + 1) / dw) * bw;
      let r = 0,
        g = 0,
        b = 0,
        a = 0,
        wsum = 0,
        asum = 0;
      const iy0 = Math.floor(sy0);
      const iy1 = Math.min(src.height - 1, Math.ceil(sy1) - 1);
      const ix0 = Math.floor(sx0);
      const ix1 = Math.min(src.width - 1, Math.ceil(sx1) - 1);
      for (let sy = iy0; sy <= iy1; sy++) {
        const cover_y = Math.min(sy + 1, sy1) - Math.max(sy, sy0);
        if (cover_y <= 0) continue;
        for (let sx = ix0; sx <= ix1; sx++) {
          const cover_x = Math.min(sx + 1, sx1) - Math.max(sx, sx0);
          if (cover_x <= 0) continue;
          const w = cover_x * cover_y;
          const i = (sy * src.width + sx) * 4;
          const pa = src.data[i + 3] / 255;
          r += src.data[i] * pa * w;
          g += src.data[i + 1] * pa * w;
          b += src.data[i + 2] * pa * w;
          asum += pa * w;
          a += src.data[i + 3] * w;
          wsum += w;
        }
      }
      const o = (ty * dw + tx) * 4;
      if (asum > 0) {
        out.data[o] = Math.round(r / asum);
        out.data[o + 1] = Math.round(g / asum);
        out.data[o + 2] = Math.round(b / asum);
      }
      out.data[o + 3] = wsum > 0 ? Math.round(a / wsum) : 0;
    }
  }
  return out;
}

/**
 * 바닥 타일을 깔끔하게: 원본 중앙부의 평균색으로 채우고 아주 옅은 노이즈만 얹는다.
 * (원본 카페트 텍스처는 반복 시 격자가 생겨서, 색만 가져오고 이어붙임에 최적화)
 */
function flatFloorTile(src, box, w = 32, h = 32) {
  // 중앙 60% 평균색
  const x0 = box.x + box.w * 0.2;
  const x1 = box.x + box.w * 0.8;
  const y0 = box.y + box.h * 0.2;
  const y1 = box.y + box.h * 0.8;
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = Math.floor(y0); y < y1; y++)
    for (let x = Math.floor(x0); x < x1; x++) {
      const i = (y * src.width + x) * 4;
      r += src.data[i];
      g += src.data[i + 1];
      b += src.data[i + 2];
      n++;
    }
  r /= n; g /= n; b /= n;
  const out = new PNG({ width: w, height: h });
  // 결정적 의사난수 (타일마다 같은 무늬)
  let seed = Math.round(r * 7 + g * 13 + b * 17);
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const nz = (rnd() - 0.5) * 12;
      const dot = (x % 8 === 3 && y % 8 === 5) || (x % 8 === 7 && y % 8 === 1) ? -8 : 0;
      out.data[o] = Math.max(0, Math.min(255, Math.round(r + nz + dot)));
      out.data[o + 1] = Math.max(0, Math.min(255, Math.round(g + nz + dot)));
      out.data[o + 2] = Math.max(0, Math.min(255, Math.round(b + nz + dot)));
      out.data[o + 3] = 255;
    }
  return out;
}

function load(name) {
  return PNG.sync.read(readFileSync(`${SRC_DIR}/${name}.png`));
}
function save(rel, png) {
  const path = `${OUT_DIR}/${rel}`;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, PNG.sync.write(png));
  console.log(`  ${rel.padEnd(30)} ${png.width}x${png.height}`);
}

/**
 * 타일: 불투명 박스를 잘라 정확히 w x h 로 늘려 채운다.
 * inset(0~0.4)을 주면 원본 테두리를 그만큼 잘라내고 안쪽만 사용 → 이어붙일 때 격자선이 안 생김.
 */
function tile(name, { out = name, w = 32, h = 32, inset = 0, flatFloor = false } = {}) {
  const src = load(name);
  const b = contentBox(src);
  if (flatFloor) {
    save(`tiles/${out}.png`, flatFloorTile(src, b, w, h));
    return;
  }
  const mx = Math.round(b.w * inset);
  const my = Math.round(b.h * inset);
  save(
    `tiles/${out}.png`,
    resizeRegion(src, b.x + mx, b.y + my, b.w - 2 * mx, b.h - 2 * my, w, h),
  );
}

/** 가구: 불투명 박스를 잘라, boxW x boxH 안에 비율 유지해 얹는다 (여백 투명) */
function prop(name, boxW, boxH, out = name) {
  const src = load(name);
  const b = contentBox(src);
  const scale = Math.min(boxW / b.w, boxH / b.h);
  const dw = Math.max(1, Math.round(b.w * scale));
  const dh = Math.max(1, Math.round(b.h * scale));
  const fit = resizeRegion(src, b.x, b.y, b.w, b.h, dw, dh);
  const canvas = new PNG({ width: boxW, height: boxH, fill: true });
  for (let i = 0; i < canvas.data.length; i++) canvas.data[i] = 0;
  const ox = (boxW - dw) >> 1;
  const oy = boxH - dh; // 바닥 정렬 (발밑 기준)
  PNG.bitblt(fit, canvas, 0, 0, dw, dh, ox, oy);
  save(`furniture/${out}.png`, canvas);
}

/** 배경류: 비율 그대로 지정 크기로 축소 */
function bg(name, w, h, out = name) {
  const src = load(name);
  const b = contentBox(src);
  save(`bg/${out}.png`, resizeRegion(src, b.x, b.y, b.w, b.h, w, h));
}

console.log('타일');
// 바닥: 테두리를 잘라 이어붙여도 격자선이 안 보이게
for (const f of ['floor-office', 'floor-corridor', 'floor-meeting', 'floor-restroom', 'floor-pantry'])
  tile(f, { flatFloor: true });
tile('wall', { inset: 0.06 });
tile('wall-low', { inset: 0.06 });
tile('door');
tile('elevator-door', { w: 64, h: 64 });

console.log('가구/소품');
prop('desk', 56, 50);
prop('chair', 26, 42);
prop('cabinet', 64, 56);
prop('bookshelf', 52, 74);
prop('monitor', 44, 44);
prop('printer', 34, 30);
prop('water-cooler', 26, 46);
prop('whiteboard', 60, 22);
prop('toilet', 26, 34);

console.log('배경');
bg('window-namsan', 512, 176);
bg('lobby-bg', 1400, 788);
bg('game_logo', 960, 320, 'game-logo');

console.log('완료. (plant/plant-bush/bulletin/rug/sink/meeting-table/chars 는 기존 유지)');
