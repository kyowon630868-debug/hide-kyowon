/**
 * 에셋 매니페스트 — 텍스처 키 ↔ 파일 경로의 유일한 출처.
 * 실제 아트로 교체 시: public/assets/ 아래 "같은 파일명·같은 크기"로 덮어쓰면 끝.
 * (플레이스홀더는 `npm run gen:assets` 로 재생성)
 */

/** 32x32 타일 (elevator-door 만 64x64) */
export const TILE_KEYS = [
  'floor-office',
  'floor-corridor',
  'floor-meeting',
  'floor-restroom',
  'floor-pantry',
  'wall',
  'wall-low',
  'door',
  'elevator-door',
] as const;

/** 가구/소품 (크기 제각각, anchor 는 중앙) */
export const FURNITURE_KEYS = [
  'desk',
  'chair',
  'plant',
  'cabinet',
  'printer',
  'water-cooler',
  'meeting-table',
  'whiteboard',
  'sink',
  'toilet',
  'rug',
] as const;

export const WINDOW_KEY = 'window-namsan';

/** 캐릭터 스프라이트시트: 24x32 프레임 × 6
 *  0 아래-정지 · 1 아래-걷기 · 2 위-정지 · 3 위-걷기 · 4 옆-정지 · 5 옆-걷기 */
export const CHAR_SHEET = 'chibi';
export const CHAR_FRAME = { width: 24, height: 32 };
export const CHAR_ANIMS = {
  down: { anim: 'walk-down', frames: [0, 1], idle: 0 },
  up: { anim: 'walk-up', frames: [2, 3], idle: 2 },
  side: { anim: 'walk-side', frames: [4, 5], idle: 4 },
} as const;

const base = import.meta.env.BASE_URL;
export const assetUrl = (rel: string) => `${base}assets/${rel}`;
