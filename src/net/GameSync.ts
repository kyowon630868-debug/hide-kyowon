import { GameRules } from '../game-logic/rules';
import type { GameState, PlayerPos } from '../game-logic/types';
import type { Room } from './Room';

const HEARTBEAT_MS = 1000;

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
    this.setState(GameRules.start(this.state, playerIds, Date.now()));
    this.broadcast();
  }

  restart(): void {
    if (!this.isHost) return;
    this.setState(GameRules.restart(this.state));
    this.broadcast();
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
    }

    if (
      this.state.phase !== 'WAITING' &&
      this.state.phase !== 'FINISHED' &&
      now - this.lastBeatAt > HEARTBEAT_MS
    ) {
      this.broadcast(); // 늦게 들어온 사람·유실 패킷 대비 심장박동
    }
  }

  // ── 내부 ──────────────────────────────────────────────────

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
