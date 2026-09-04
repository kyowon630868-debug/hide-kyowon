/**
 * 게임 전역 상수.
 * 나중에 밸런스 조정할 때 이 파일만 고치면 되도록 모아둔다.
 */

/** 타일 한 칸의 픽셀 크기 */
export const TILE_SIZE = 32;

/** 플레이어 이동 속도 (픽셀 / 초) */
export const PLAYER_SPEED = 170;

/** 게임 진행 시간 (초). 나중에 밸런스 조정 시 여기만 수정 */
export const GAME_TIMING = {
  HIDING_SECONDS: 30,
  CHASING_SECONDS: 180,
} as const;

/** 잡기 판정 거리 (타일 단위) — Phase 6에서 사용 */
export const CATCH_DISTANCE_TILES = 1;

/** 네트워크 설정 — Phase 3에서 사용 */
export const NET = {
  /** 내 위치를 브로드캐스트하는 빈도 (초당 횟수) */
  BROADCAST_HZ: 10,
  /** 상대 캐릭터를 얼마나 과거 시점으로 그릴지 (보간 지연, ms) */
  INTERP_DELAY_MS: 100,
} as const;

/** 캔버스 논리 해상도 (Scale.FIT 으로 화면에 맞춰 늘어난다) */
export const VIEW = {
  WIDTH: 800,
  HEIGHT: 600,
} as const;
