import { CATCH_DISTANCE_TILES, GAME_TIMING, TILE_SIZE } from '../game/constants';
import type { GamePhase, GameState, PlayerPos, Role } from './types';

/**
 * GameRules — 순수 함수 모음. 시간·좌표를 받아 다음 상태를 계산할 뿐,
 * 네트워크·렌더링·타이머를 직접 건드리지 않는다. (테스트하기 쉽고, 심판 주체를 바꿔도 재사용)
 */

const SURVIVE_POINT_PER_10S = 5;
const FINAL_SURVIVE_BONUS = 200;
const FOUND_POINT = 100;

function pickRandom<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

export const GameRules = {
  initial(): GameState {
    return {
      phase: 'WAITING',
      seekerId: null,
      alive: {},
      hidingEndsAt: null,
      chasingEndsAt: null,
      playingStartedAt: null,
      endedAt: null,
      caughtAt: {},
      spawns: {},
      winner: null,
      rev: 0,
    };
  },

  /** WAITING → HIDING. 술래를 뽑고, 스폰 자리를 나눠주고, 타이머를 건다 */
  start(prev: GameState, playerIds: string[], now: number, seekerId?: string): GameState {
    const seeker = seekerId ?? pickRandom(playerIds);
    const alive: Record<string, boolean> = {};
    const spawns: Record<string, number> = {};
    playerIds.forEach((id, i) => {
      spawns[id] = i;
      if (id !== seeker) alive[id] = true;
    });

    return {
      ...this.initial(),
      phase: 'HIDING',
      seekerId: seeker,
      alive,
      spawns,
      hidingEndsAt: now + GAME_TIMING.HIDING_SECONDS * 1000,
      chasingEndsAt:
        now + (GAME_TIMING.HIDING_SECONDS + GAME_TIMING.CHASING_SECONDS) * 1000,
      rev: prev.rev + 1,
    };
  },

  /** 시간 경과에 따른 페이즈 전이 + 종료 판정. 변화가 없으면 같은 객체를 그대로 돌려준다 */
  tick(state: GameState, now: number): GameState {
    if (state.phase === 'HIDING' && state.hidingEndsAt && now >= state.hidingEndsAt) {
      return {
        ...state,
        phase: 'PLAYING',
        playingStartedAt: state.hidingEndsAt,
        rev: state.rev + 1,
      };
    }

    if (state.phase === 'PLAYING') {
      if (this.aliveCount(state) === 0) {
        return { ...state, phase: 'FINISHED', winner: 'SEEKER', endedAt: now, rev: state.rev + 1 };
      }
      if (state.chasingEndsAt && now >= state.chasingEndsAt) {
        return { ...state, phase: 'FINISHED', winner: 'HIDER', endedAt: now, rev: state.rev + 1 };
      }
    }

    return state;
  },

  /** 잡기 판정 — 순수 기하. 이번에 새로 잡힌 도망자 id 목록 */
  detectCatches(state: GameState, positions: Record<string, PlayerPos>): string[] {
    if (state.phase !== 'PLAYING' || !state.seekerId) return [];
    const seeker = positions[state.seekerId];
    if (!seeker) return [];

    const reach = CATCH_DISTANCE_TILES * TILE_SIZE;
    const caught: string[] = [];
    for (const id of Object.keys(state.alive)) {
      if (!state.alive[id]) continue;
      const p = positions[id];
      if (!p || p.floor !== seeker.floor) continue;
      if (Math.hypot(p.x - seeker.x, p.y - seeker.y) <= reach) caught.push(id);
    }
    return caught;
  },

  applyCatches(state: GameState, caughtIds: string[], now: number): GameState {
    const fresh = caughtIds.filter((id) => state.alive[id]);
    if (fresh.length === 0) return state;

    const alive = { ...state.alive };
    const caughtAt = { ...state.caughtAt };
    for (const id of fresh) {
      alive[id] = false;
      caughtAt[id] = now;
    }

    let next: GameState = { ...state, alive, caughtAt, rev: state.rev + 1 };
    if (Object.values(alive).every((v) => !v)) {
      next = { ...next, phase: 'FINISHED', winner: 'SEEKER', endedAt: now };
    }
    return next;
  },

  /** 술래가 게임 도중 이탈 → 비정상 종료 */
  seekerGone(state: GameState, now: number): GameState {
    return { ...state, phase: 'FINISHED', winner: null, endedAt: now, note: '술래가 나갔습니다', rev: state.rev + 1 };
  },

  /** 도망자가 이탈 → 목록에서 제거하고 종료 조건 재검사 */
  hiderGone(state: GameState, id: string, now: number): GameState {
    if (!(id in state.alive)) return state;
    const alive = { ...state.alive };
    delete alive[id];
    const caughtAt = { ...state.caughtAt };
    delete caughtAt[id];
    let next: GameState = { ...state, alive, caughtAt, rev: state.rev + 1 };
    if (next.phase === 'PLAYING' && this.aliveCount(next) === 0) {
      next = { ...next, phase: 'FINISHED', winner: 'SEEKER', endedAt: now };
    }
    return next;
  },

  restart(state: GameState): GameState {
    return { ...this.initial(), rev: state.rev + 1 };
  },

  // ── 조회 헬퍼 ──────────────────────────────────────────────

  roleOf(state: GameState, id: string): Role | null {
    if (id === state.seekerId) return 'SEEKER';
    if (id in state.alive) return 'HIDER';
    return null;
  },

  aliveCount(state: GameState): number {
    return Object.values(state.alive).filter(Boolean).length;
  },

  hiderCount(state: GameState): number {
    return Object.keys(state.alive).length;
  },

  /** 근접 반응 단계: 0 안전 · 1 주의(≤6칸) · 2 위험(≤3칸). PLAYING 에서만 의미 있다 */
  proximityLevel(distancePx: number): 0 | 1 | 2 {
    if (distancePx <= 3 * TILE_SIZE) return 2;
    if (distancePx <= 6 * TILE_SIZE) return 1;
    return 0;
  },

  /** 현재(혹은 종료) 기준 점수표 */
  scoreboard(
    state: GameState,
    now: number,
  ): Array<{ id: string; role: Role; score: number; survivedSec: number }> {
    const startedAt = state.playingStartedAt ?? state.hidingEndsAt ?? now;
    const endRef = state.endedAt ?? now;

    const rows = Object.keys(state.alive).map((id) => {
      const caughtAt = state.caughtAt[id];
      const end = caughtAt ?? endRef;
      const survivedSec = Math.max(0, (end - startedAt) / 1000);
      let score = Math.floor(survivedSec / 10) * SURVIVE_POINT_PER_10S;
      if (state.phase === 'FINISHED' && !caughtAt) score += FINAL_SURVIVE_BONUS;
      return { id, role: 'HIDER' as Role, score, survivedSec };
    });

    if (state.seekerId) {
      const found = Object.keys(state.caughtAt).length;
      rows.push({ id: state.seekerId, role: 'SEEKER', score: found * FOUND_POINT, survivedSec: 0 });
    }

    return rows.sort((a, b) => b.score - a.score);
  },

  label(phase: GamePhase): string {
    switch (phase) {
      case 'WAITING':
        return '대기 중';
      case 'HIDING':
        return '숨는 시간';
      case 'PLAYING':
        return '추격 시간';
      case 'FINISHED':
        return '게임 종료';
    }
  },
};
