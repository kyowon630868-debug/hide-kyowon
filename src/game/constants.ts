/**
 * 게임 전역 상수.
 * 나중에 밸런스 조정할 때 이 파일만 고치면 되도록 모아둔다.
 */

/** 타일 한 칸의 픽셀 크기 */
export const TILE_SIZE = 32;

/** 걷기 속도 (픽셀 / 초) */
export const PLAYER_SPEED = 158; // 도망자
export const SEEKER_SPEED = 170; // 술래는 살짝 빠름

/** 마지막 30초 "막판" — 술래 추가 가속 */
export const ENDGAME_SECONDS = 30;
export const ENDGAME_SEEKER_BOOST = 1.12;

/** 부스터(달리기): Shift 를 누르면 빨라지지만 스태미나를 쓴다 */
export const SPRINT_MULT = 1.55;
export const STAMINA_MAX = 100;
export const STAMINA_DRAIN = 34; // 초당 소모
export const STAMINA_REGEN = 16; // 초당 회복
/** 스태미나가 0 이 되면 25% 이상 찰 때까지 다시 못 달린다 (LocalPlayer 내부 처리) */

/** 게임 진행 시간 (초). 나중에 밸런스 조정 시 여기만 수정 */
export const GAME_TIMING = {
  HIDING_SECONDS: 30,
  /** 추격 시간 = BASE + PER_HIDER × 도망자 수 (1v1 은 짧고 박진감 있게) */
  CHASING_BASE: 55,
  CHASING_PER_HIDER: 35,
} as const;

/** 잡기 판정 거리 (타일 단위) */
export const CATCH_DISTANCE_TILES = 1;

/** 술래 힌트 1회 사용 시 점수 차감 */
export const HINT_COST = 20;
/** 힌트 재사용 대기 (ms) */
export const HINT_COOLDOWN_MS = 4000;

/** 도망자 회피 성공 보너스 */
export const EVADE_BONUS = 50;
/** 회피 판정: 위험 거리(칸) 안에 들어왔다가 안전 거리(칸) 밖으로 벗어나면 성공 */
export const EVADE_DANGER_TILES = 3;
export const EVADE_SAFE_TILES = 8;

/** 거리 힌트 구간 (칸) */
export const HINT_NEAR_TILES = 5;
export const HINT_FAR_TILES = 12;

/** 엘리베이터 상호작용 가능 거리 (px) */
export const ELEVATOR_REACH = 60;
/** 엘리베이터 이동 연출 시간 (ms) */
export const ELEVATOR_TRAVEL_MS = 900;

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
