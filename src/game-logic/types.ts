/**
 * 게임 규칙 계층의 데이터 타입.
 * 이 폴더(game-logic)는 네트워크(net/)·화면(game/)에 의존하지 않는다.
 * → 나중에 "호스트 심판" 방식을 "서버 권위" 방식으로 바꿔도 규칙은 그대로 쓴다.
 */

export type GamePhase = 'WAITING' | 'HIDING' | 'PLAYING' | 'FINISHED';
export type Role = 'SEEKER' | 'HIDER';
export type Winner = 'SEEKER' | 'HIDER' | null;

export interface GameState {
  phase: GamePhase;
  /** 술래 playerId. WAITING 이면 null */
  seekerId: string | null;
  /** 도망자별 생존 여부. 시작 시 전원 true, 잡히면 false. 술래는 여기 없음 */
  alive: Record<string, boolean>;
  /** 숨기 종료 시각 (epoch ms, 호스트 시계 기준) */
  hidingEndsAt: number | null;
  /** 추격 종료 시각 (epoch ms) */
  chasingEndsAt: number | null;
  /** 추격(PLAYING) 시작 시각 — 생존 점수 계산 기준 */
  playingStartedAt: number | null;
  /** 게임 종료 시각 */
  endedAt: number | null;
  /** 도망자별로 잡힌 시각 (epoch ms) */
  caughtAt: Record<string, number>;
  /** 시작 시 배정된 스폰 자리 번호 (맵의 spawnPoints 인덱스로 사용) */
  spawns: Record<string, number>;
  /** 술래가 힌트로 쓴 누적 점수 (seekerId → 차감액) */
  hintSpent: Record<string, number>;
  /** 도망자별 회피 성공 횟수 */
  evadeCount: Record<string, number>;
  /** 도망자별 숨기 종료 시각 (epoch ms). 없거나 과거면 안 숨은 상태 */
  hidden: Record<string, number>;
  /** 도망자별 남은 숨기 횟수 */
  hideCharges: Record<string, number>;
  winner: Winner;
  /** 상태 리비전 — 오래 도착한 브로드캐스트를 무시하는 용도 */
  rev: number;
  /** 비정상 종료 사유(예: 술래 이탈) 표시용 */
  note?: string;
}

/** 잡기 판정에 필요한 최소 위치 정보 */
export interface PlayerPos {
  x: number;
  y: number;
  floor: number;
}

export type HintKind = 'floor' | 'direction' | 'distance';

/** 술래가 힌트를 눌렀을 때 계산되는 결과 (정확한 위치는 절대 포함 안 함) */
export type HintResult =
  | { kind: 'floor'; floors: number[] }
  | { kind: 'direction'; dir: string; sameFloor: boolean }
  | { kind: 'distance'; band: '멀다' | '보통' | '가깝다'; sameFloor: boolean }
  | { kind: 'none' };
