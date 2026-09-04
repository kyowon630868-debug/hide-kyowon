import { GameRules } from '../game-logic/rules';
import type { GameState, HintKind, PlayerPos } from '../game-logic/types';
import {
  EVADE_DANGER_TILES,
  EVADE_SAFE_TILES,
  HINT_COOLDOWN_MS,
  HINT_COST,
  TILE_SIZE,
} from '../game/constants';
import type { Room } from './Room';

const HEARTBEAT_MS = 1000;
const EVADE_WINDOW_MS = 4000; // 위험 → 안전 전환이 이 시간 안에 일어나야 회피 인정
const EVADE_REARM_MS = 10000; // 같은 도망자가 다시 회피 점수를 얻기까지 대기

interface EvadeTrack {
  dangerAt: number;
  awardedAt: number;
}

/**
 * GameSync — 게임 규칙(GameRules)과 네트워크(Room)를 잇는 유일한 접착제.
 *
 *  - 호스트  : 권위 있는 GameState 를 소유. 매 프레임 tick + 잡기 판정 → 변화 시 브로드캐스트.
 *  - 비호스트: 호스트가 보낸 GameState 를 그대로 따른다.
 *
 * "호스트 심판"을 나중에 "서버 심판"으로 바꿀 때, 교체 대상은 이 파일 하나다.
 */
export class GameSync {
  readonly isHost: boolean;
  private room: Room;
  private state: GameState = GameRules.initial();
  private listeners = new Set<(s: GameState) => void>();
  private offFns: Array<() => void> = [];
  private lastBeatAt = 0;
  /** 호스트 전용 작업 메모리 (브로드캐스트 안 함) */
  private evadeTrack = new Map<string, EvadeTrack>();
  private lastHintAt = new Map<string, number>();

  constructor(room: Room, isHost: boolean) {
    this.room = room;
    this.isHost = isHost;

    this.offFns.push(
      room.on('game', (_fromId, body) => {
        if (this.isHost) return; // 호스트는 남의 상태를 받지 않는다
        const incoming = body as GameState;
        if (!incoming || incoming.rev < this.state.rev) return;
        this.setState(incoming);
      }),
    );

    if (isHost) {
      this.offFns.push(
        room.on('peerLeave', (id) => this.onPeerLeave(id)),
        room.on('action', (fromId, body) => this.onAction(fromId, body)),
      );
    }
  }

  getState(): GameState {
    return this.state;
  }

  onChange(cb: (s: GameState) => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  dispose(): void {
    this.offFns.forEach((off) => off());
    this.offFns = [];
    this.listeners.clear();
  }

  // ── 호스트 전용 액션 ────────────────────────────────────────

  startGame(playerIds: string[]): void {
    if (!this.isHost || this.state.phase !== 'WAITING' || playerIds.length < 2) return;
    this.evadeTrack.clear();
    this.lastHintAt.clear();
    this.setState(GameRules.start(this.state, playerIds, Date.now()));
    this.broadcast();
  }

  restart(): void {
    if (!this.isHost) return;
    this.evadeTrack.clear();
    this.lastHintAt.clear();
    this.setState(GameRules.restart(this.state));
    this.broadcast();
  }

  /** 술래(로컬)가 힌트를 사용했음을 심판에게 알린다. 호스트면 직접 처리, 아니면 전송 */
  reportHintUsed(kind: HintKind): void {
    if (this.isHost) {
      this.applyHint(this.room.selfId, kind);
    } else {
      this.room.sendAction({ type: 'hint', kind });
    }
  }

  /**
   * 씬이 매 프레임 호출. positions 는 { playerId: {x,y,floor} }.
   * 비호스트에서는 아무 일도 하지 않는다.
   */
  frame(positions: Record<string, PlayerPos>, now: number): void {
    if (!this.isHost) return;

    const ticked = GameRules.tick(this.state, now);
    if (ticked !== this.state) {
      this.setState(ticked);
      this.broadcast();
    }

    if (this.state.phase === 'PLAYING') {
      const caught = GameRules.detectCatches(this.state, positions);
      if (caught.length > 0) {
        this.setState(GameRules.applyCatches(this.state, caught, now));
        this.broadcast();
      }
      this.checkEvasions(positions, now);
    }

    if (
      this.state.phase !== 'WAITING' &&
      this.state.phase !== 'FINISHED' &&
      now - this.lastBeatAt > HEARTBEAT_MS
    ) {
      this.broadcast(); // 늦게 들어온 사람·유실 패킷 대비 심장박동
    }
  }

  // ── 내부 (호스트) ─────────────────────────────────────────

  private onAction(fromId: string, body: unknown) {
    const msg = body as { type?: string; kind?: HintKind };
    if (msg?.type !== 'hint') return;
    this.applyHint(fromId, msg.kind ?? 'floor');
  }

  private applyHint(seekerId: string, _kind: HintKind) {
    if (this.state.phase !== 'PLAYING' || seekerId !== this.state.seekerId) return;
    const now = Date.now();
    const last = this.lastHintAt.get(seekerId) ?? 0;
    if (now - last < HINT_COOLDOWN_MS) return; // 쿨다운 중이면 점수 차감 안 함
    this.lastHintAt.set(seekerId, now);
    this.setState(GameRules.chargeHint(this.state, seekerId, HINT_COST));
    this.broadcast();
  }

  /** 도망자가 위험 거리에 들어왔다가 안전 거리로 벗어나면 회피 성공 점수 */
  private checkEvasions(positions: Record<string, PlayerPos>, now: number) {
    const s = this.state;
    if (!s.seekerId) return;
    const seeker = positions[s.seekerId];
    if (!seeker) return;

    const dangerR = EVADE_DANGER_TILES * TILE_SIZE;
    const safeR = EVADE_SAFE_TILES * TILE_SIZE;

    for (const hiderId of Object.keys(s.alive)) {
      if (!s.alive[hiderId]) continue;
      const hp = positions[hiderId];
      const t = this.evadeTrack.get(hiderId) ?? { dangerAt: 0, awardedAt: 0 };

      const sameFloor = hp && hp.floor === seeker.floor;
      const d = sameFloor ? Math.hypot(hp.x - seeker.x, hp.y - seeker.y) : Infinity;

      if (sameFloor && d <= dangerR) {
        t.dangerAt = now;
      } else if (
        (d > safeR || !sameFloor) &&
        t.dangerAt &&
        now - t.dangerAt < EVADE_WINDOW_MS &&
        now - t.awardedAt > EVADE_REARM_MS
      ) {
        t.awardedAt = now;
        t.dangerAt = 0;
        this.setState(GameRules.addEvade(this.state, hiderId));
        this.broadcast();
      }
      this.evadeTrack.set(hiderId, t);
    }
  }

  private onPeerLeave(id: string) {
    if (this.state.phase === 'WAITING' || this.state.phase === 'FINISHED') return;
    const now = Date.now();
    if (id === this.state.seekerId) {
      this.setState(GameRules.seekerGone(this.state, now));
    } else if (id in this.state.alive) {
      this.setState(GameRules.hiderGone(this.state, id, now));
    } else {
      return;
    }
    this.broadcast();
  }

  private broadcast() {
    this.lastBeatAt = Date.now();
    this.room.sendGame(this.state);
  }

  private setState(s: GameState) {
    this.state = s;
    for (const cb of this.listeners) cb(s);
  }
}
