/**
 * 플레이스홀더 픽셀 아트 에셋 생성기.
 *
 *   node scripts/gen-assets.mjs
 *
 * public/assets/ 아래에 PNG 를 만든다. 나중에 실제 아티스트의 PNG 로
 * "같은 파일명·같은 크기"로 덮어쓰면 코드 수정 없이 교체된다.
 * (규격은 README 및 이 파일 하단 MANIFEST 참고)
 */
import { PNG } from 'pngjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'public/assets');

const rgb = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255, 255];
const rgba = (h, a) => [(h >> 16) & 255, (h >> 8) & 255, h & 255, Math.round(a * 255)];

class C {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.p = new Float64Array(w * h * 4);
  }
  set(x, y, c) {
    x |= 0;
    y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || !c) return;
    const i = (y * this.w + x) * 4;
    const a = c[3] / 255;
    const ia = 1 - a;
    this.p[i] = this.p[i] * ia + c[0] * a;
    this.p[i + 1] = this.p[i + 1] * ia + c[1] * a;
    this.p[i + 2] = this.p[i + 2] * ia + c[2] * a;
    this.p[i + 3] = Math.min(255, this.p[i + 3] + c[3]);
  }
  rect(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }
  hline(x, y, w, c) {
    for (let i = 0; i < w; i++) this.set(x + i, y, c);
  }
  vline(x, y, h, c) {
    for (let j = 0; j < h; j++) this.set(x, y + j, c);
  }
  border(x, y, w, h, c) {
    this.hline(x, y, w, c);
    this.hline(x, y + h - 1, w, c);
    this.vline(x, y, h, c);
    this.vline(x + w - 1, y, h, c);
  }
  circle(cx, cy, r, c) {
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) this.set(cx + x, cy + y, c);
  }
  /** 아래로 갈수록 어두워지는 상자 (간단한 셰이딩 + 어두운 외곽선) */
  box(x, y, w, h, top, bottom, outline) {
    for (let j = 0; j < h; j++) {
      const t = j / Math.max(1, h - 1);
      const col = [
        top[0] + (bottom[0] - top[0]) * t,
        top[1] + (bottom[1] - top[1]) * t,
        top[2] + (bottom[2] - top[2]) * t,
        255,
      ];
      this.hline(x, y + j, w, col);
    }
    if (outline) this.border(x, y, w, h, outline);
  }
  save(rel) {
    const path = resolve(OUT, rel);
    mkdirSync(dirname(path), { recursive: true });
    const png = new PNG({ width: this.w, height: this.h });
    for (let i = 0; i < this.p.length; i++) png.data[i] = Math.round(this.p[i]);
    writeFileSync(path, PNG.sync.write(png));
    console.log('  ', rel, `${this.w}x${this.h}`);
  }
}

// 팔레트
const P = {
  line: 0x2b2540,
  officeA: 0x9aa6cf,
  officeB: 0x8b97c2,
  corridorA: 0xe2dac6,
  corridorB: 0xd3c9b2,
  meetA: 0xc79a68,
  meetB: 0xb1834f,
  restA: 0xd2efe9,
  restB: 0xbfe4dd,
  pantryA: 0xd6cfc2,
  pantryB: 0xc7bfaf,
  wallFace: 0x726c96,
  wallTop: 0x8f89b4,
  wallFoot: 0x453f63,
  wood: 0xcf9c6a,
  woodDark: 0x9c6f45,
  metal: 0xb7bdd8,
  metalDark: 0x8b93b8,
  leaf: 0x54b978,
  leafDark: 0x2f7d4c,
  pot: 0xd9793e,
  white: 0xf6faf9,
  screen: 0x76e0ee,
};

console.log('generating assets → public/assets/');

/* ── 타일 ─────────────────────────────────────────── */
function tileFloor(name, a, b, extra) {
  const c = new C(32, 32);
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) c.set(x, y, rgb((x + y) % 8 < 4 ? a : b));
  if (extra) extra(c);
  c.border(0, 0, 32, 32, rgba(0x000000, 0.12));
  c.save(`tiles/${name}.png`);
}
tileFloor('floor-office', P.officeA, P.officeA, (c) => {
  for (let i = 0; i < 16; i++) c.set((i * 13) % 32, (i * 7) % 32, rgba(P.officeB, 0.7));
});
tileFloor('floor-corridor', P.corridorA, P.corridorA, (c) => {
  c.hline(0, 15, 32, rgba(P.corridorB, 0.9));
  c.hline(0, 16, 32, rgba(0xffffff, 0.25));
});
tileFloor('floor-meeting', P.meetA, P.meetA, (c) => {
  for (let y = 3; y < 32; y += 8) c.hline(0, y, 32, rgba(P.meetB, 0.85));
});
tileFloor('floor-restroom', P.restA, P.restA, (c) => {
  c.vline(16, 0, 32, rgba(P.restB, 0.9));
  c.hline(0, 16, 32, rgba(P.restB, 0.9));
});
tileFloor('floor-pantry', P.pantryA, P.pantryA, (c) => {
  for (let i = 0; i < 10; i++) c.set((i * 17) % 32, (i * 11) % 32, rgba(P.pantryB, 0.7));
});

{
  const c = new C(32, 32);
  c.rect(0, 0, 32, 32, rgb(P.wallFoot));
  c.rect(0, 0, 32, 24, rgb(P.wallFace));
  c.rect(0, 0, 32, 5, rgb(P.wallTop));
  // 벽돌 줄눈
  c.hline(0, 12, 32, rgba(0x000000, 0.12));
  c.vline(10, 5, 7, rgba(0x000000, 0.12));
  c.vline(22, 12, 12, rgba(0x000000, 0.12));
  c.save('tiles/wall.png');
}
{
  const c = new C(32, 32);
  c.box(2, 5, 28, 27, rgb(0xeef8f6), rgb(0xcfe8e4), rgba(0x000000, 0.15));
  c.hline(2, 8, 28, rgba(0xffffff, 0.5));
  c.save('tiles/wall-low.png');
}
{
  const c = new C(32, 32);
  c.rect(0, 0, 32, 32, rgb(P.corridorA));
  c.box(3, 0, 26, 32, rgb(P.woodDark), rgb(0x7c5738), P.line);
  c.box(6, 2, 20, 28, rgb(P.wood), rgb(0xa9784c), rgba(0x000000, 0.2));
  c.circle(22, 16, 2, rgb(0xf0d59a));
  c.save('tiles/door.png');
}
{
  const c = new C(64, 64);
  c.rect(0, 0, 64, 64, rgb(0x4a4f70));
  c.box(4, 4, 56, 56, rgb(P.metal), rgb(P.metalDark), P.line);
  c.vline(32, 4, 56, rgb(0x8f96bd));
  c.rect(20, 8, 24, 10, rgb(0x2a2e48));
  c.rect(29, 10, 6, 6, rgb(0xffd25a));
  c.circle(54, 32, 4, rgb(0x2a2e48));
  c.circle(54, 32, 2, rgb(0x6ee7a0));
  c.save('tiles/elevator-door.png');
}

/* ── 가구 ─────────────────────────────────────────── */
{
  const c = new C(64, 40);
  c.box(2, 16, 60, 18, rgb(P.wood), rgb(P.woodDark), P.line); // 상판
  c.rect(6, 34, 5, 6, rgb(P.woodDark));
  c.rect(53, 34, 5, 6, rgb(P.woodDark));
  // 모니터
  c.box(23, 1, 18, 13, rgb(0x3a3f4d), rgb(0x24272f), P.line);
  c.rect(26, 3, 12, 8, rgb(P.screen));
  c.rect(31, 14, 4, 3, rgb(0x2b2f3d));
  // 키보드 + 서류
  c.box(17, 22, 24, 6, rgb(0x40465a), rgb(0x2f3342));
  c.rect(45, 20, 9, 7, rgb(0xece6d4));
  c.save('furniture/desk.png');
}
{
  const c = new C(24, 28);
  c.box(3, 2, 18, 11, rgb(0x4b83c6), rgb(0x3765a0), P.line); // 등받이
  c.box(1, 12, 22, 9, rgb(0x5892d8), rgb(0x3f74b6), P.line); // 좌석
  c.rect(10, 21, 4, 4, rgb(0x2b2f3d));
  c.rect(4, 25, 16, 2, rgb(0x1f2330));
  c.save('furniture/chair.png');
}
{
  const c = new C(30, 42);
  c.circle(15, 15, 13, rgb(P.leafDark));
  c.circle(10, 12, 8, rgb(P.leaf));
  c.circle(21, 13, 7, rgb(P.leaf));
  c.circle(15, 7, 7, rgb(P.leaf));
  c.circle(15, 16, 4, rgb(0x2a6b42));
  c.box(8, 26, 14, 14, rgb(P.pot), rgb(0xb45f2b), P.line);
  c.hline(8, 26, 14, rgb(0xef8f52));
  c.save('furniture/plant.png');
}
{
  const c = new C(32, 46);
  c.box(1, 2, 30, 43, rgb(P.metal), rgb(P.metalDark), P.line);
  for (let i = 0; i < 3; i++) {
    c.box(4, 7 + i * 13, 24, 10, rgb(0x9aa1c6), rgb(0x848bb2), rgba(0x000000, 0.15));
    c.rect(13, 11 + i * 13, 6, 2, rgb(0xd7dcef));
  }
  c.save('furniture/cabinet.png');
}
{
  const c = new C(32, 28);
  c.box(1, 7, 30, 19, rgb(0xd0d5e6), rgb(0xa9b0cd), P.line);
  c.rect(6, 1, 18, 7, rgb(0xece6d4));
  c.rect(24, 11, 3, 3, rgb(0x6ee7a0));
  c.box(4, 20, 24, 5, rgb(0x9aa1c6), rgb(0x848bb2));
  c.save('furniture/printer.png');
}
{
  const c = new C(24, 42);
  c.box(4, 0, 15, 15, rgb(0x8fd6f2), rgb(0x63bce6), P.line);
  c.box(2, 15, 20, 25, rgb(0xf1f5fa), rgb(0xd7deea), P.line);
  c.rect(9, 21, 6, 4, rgb(0x3b4152));
  c.save('furniture/water-cooler.png');
}
{
  const c = new C(128, 64);
  c.box(4, 10, 120, 44, rgb(P.wood), rgb(P.woodDark), P.line);
  c.rect(14, 15, 64, 8, rgba(0xffffff, 0.18));
  c.save('furniture/meeting-table.png');
}
{
  const c = new C(96, 32);
  c.box(0, 0, 96, 27, rgb(0xe6eaf3), rgb(0xc9cee0), P.line);
  c.rect(3, 3, 90, 19, rgb(0xffffff));
  c.rect(8, 8, 20, 3, rgb(0x4f8cff));
  c.rect(36, 12, 22, 3, rgb(0xff6b6b));
  c.border(64, 7, 18, 10, rgb(0x3fb96e));
  c.rect(32, 23, 32, 4, rgb(0xc6cbdc));
  c.save('furniture/whiteboard.png');
}
{
  const c = new C(32, 24);
  c.box(0, 6, 32, 16, rgb(0xf3f8f7), rgb(0xdce9e7), P.line);
  c.circle(16, 14, 7, rgb(0xd7e8e6));
  c.circle(16, 13, 5, rgb(0xfbfefe));
  c.rect(14, 1, 4, 6, rgb(0xa7b1ba));
  c.rect(12, 1, 8, 2, rgb(0xa7b1ba));
  c.save('furniture/sink.png');
}
{
  const c = new C(24, 32);
  c.box(4, 0, 16, 9, rgb(0xf7fbfa), rgb(0xdcebe9), P.line);
  c.circle(12, 19, 9, rgb(0xfdffff));
  c.circle(12, 19, 5, rgb(0xd7e6e4));
  c.border(3, 9, 18, 20, rgba(0x000000, 0.12));
  c.save('furniture/toilet.png');
}
{
  const c = new C(96, 64);
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 96; x++) {
      const edge = x < 4 || y < 4 || x > 91 || y > 59;
      c.set(x, y, rgba(edge ? 0x8b9be0 : 0x6a7bbf, 0.4));
    }
  c.save('furniture/rug.png');
}

/* ── 배경: 창문 (남산 야경) ───────────────────────── */
{
  const W = 256;
  const H = 88;
  const c = new C(W, H);
  for (let y = 0; y < H; y++) {
    const t = y / H;
    c.hline(0, y, W, [
      0x2a + (0xb0 - 0x2a) * t,
      0x2a + (0x62 - 0x2a) * t,
      0x63 + (0x70 - 0x63) * t,
      255,
    ]);
  }
  const bh = [28, 44, 24, 52, 34, 58, 30, 48, 40, 26, 54, 34];
  for (let i = 0; i < bh.length; i++) c.rect(i * 22, H - bh[i], 20, bh[i], rgba(0x171433, 0.95));
  for (let i = 0; i < 60; i++)
    c.rect(6 + ((i * 37) % (W - 12)), 24 + ((i * 53) % (H - 40)), 2, 2, rgba(0xffe39a, 0.9));
  const tx = W - 68;
  for (let i = -16; i <= 16; i++) c.vline(tx + i, H - Math.floor(28 - Math.abs(i) * 1.6), 60, rgba(0x2c2748, 1));
  c.rect(tx - 2, H - 64, 4, 34, rgb(0x5a5478));
  c.rect(tx - 9, H - 70, 18, 8, rgb(0xd7d2ec));
  c.rect(tx - 1, H - 82, 2, 12, rgb(0xd7d2ec));
  c.circle(tx, H - 83, 2, rgb(0xff5555));
  // 창틀
  for (let i = 0; i < 6; i++) c.border(i, i, W - i * 2, H - i * 2, i < 3 ? rgb(0x8f8ab0) : rgba(0x8f8ab0, 0.5));
  c.vline(W / 2, 0, H, rgb(0x8f8ab0));
  c.vline(W / 2 + 1, 0, H, rgb(0x8f8ab0));
  c.hline(0, H / 2, W, rgb(0x8f8ab0));
  c.save('bg/window-namsan.png');
}

/* ── 캐릭터 스프라이트시트 ──────────────────────────
   24x32 프레임 × 6 = 144x32
   0 down-idle · 1 down-walk · 2 up-idle · 3 up-walk · 4 side-idle · 5 side-walk
*/
{
  const FW = 24;
  const FH = 32;
  const sheet = new C(FW * 6, FH);
  const skin = rgb(0xf6cfa8);
  const skinSh = rgb(0xe0b189);
  const hair = rgb(0x3d2b1e);
  const shirt = rgb(0x5b9bff);
  const shirtSh = rgb(0x3f74c6);
  const pants = rgb(0x394264);
  const shoe = rgb(0x22252f);
  const line = rgb(0x241a2e);

  const frame = (idx, facing, step) => {
    const ox = idx * FW;
    const put = (x, y, c) => sheet.set(ox + x, y, c);
    const rect = (x, y, w, h, c) => {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, c);
    };
    const circ = (cx, cy, r, c) => {
      for (let y = -r; y <= r; y++)
        for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) put(cx + x, cy + y, c);
    };
    const legY = 24;
    const swing = step ? 2 : 0;
    // 다리 + 신발
    rect(7, legY, 4, 6 - swing, pants);
    rect(13, legY, 4, 6 + swing, pants);
    rect(7, legY + 6 - swing, 4, 3, shoe);
    rect(13, legY + 6 + swing, 4, 3, shoe);
    // 몸통
    rect(4, 13, 16, 12, shirt);
    rect(4, 21, 16, 4, shirtSh);
    // 외곽선(몸통)
    for (let x = 4; x < 20; x++) {
      put(x, 12, line);
      put(x, 25, line);
    }
    for (let y = 12; y < 26; y++) {
      put(3, y, line);
      put(20, y, line);
    }
    rect(9, 13, 5, 3, rgb(0xffffff)); // 카라
    // 머리
    circ(11, 8, 7, skin);
    circ(13, 9, 5, skinSh);
    for (let a = 0; a < 360; a += 20) {
      const x = Math.round(11 + Math.cos((a * Math.PI) / 180) * 7);
      const y = Math.round(8 + Math.sin((a * Math.PI) / 180) * 7);
      put(x, y, line);
    }
    // 머리카락 + 얼굴
    rect(4, 1, 14, 5, hair);
    if (facing === 'down') {
      put(8, 8, rgb(0x2a2233));
      put(14, 8, rgb(0x2a2233));
      put(11, 11, rgb(0xeaa0a6));
    } else if (facing === 'side') {
      rect(4, 1, 9, 9, hair);
      put(15, 8, rgb(0x2a2233));
    } else {
      rect(4, 1, 14, 9, hair);
    }
  };

  frame(0, 'down', 0);
  frame(1, 'down', 1);
  frame(2, 'up', 0);
  frame(3, 'up', 1);
  frame(4, 'side', 0);
  frame(5, 'side', 1);
  sheet.save('characters/chibi.png');
}

console.log('done.');
