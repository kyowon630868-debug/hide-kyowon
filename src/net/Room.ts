import type { LocalSnapshot, PlayerSnapshot, RosterEntry, RoomOptions } from '../types/game';
import { getPlayerId } from '../lib/id';
import { hasSupabase } from '../lib/supabase';
import type { ConnStatus, Transport } from './transport';
import { BroadcastTransport } from './BroadcastTransport';
import { SupabaseTransport } from './SupabaseTransport';

const SEND_INTERVAL_MS = 100; // 위치 브로드캐스트 주기 (10Hz)

/** 방 안에서 오가는 메시지 봉투. Room 은 종류만 구분하고 내용(body)은 해석하지 않는다. */
interface Envelope {
  k: 'move' | 'game' | 'action' | 'chat';
  body: unknown;
}

export interface ChatMessage {
  id: string;
  name: string;
  text: string;
  ts: number;
}

type RoomEvents = {
  roster: (list: RosterEntry[]) => void;
  status: (s: ConnStatus) => void;
  /** 다른 플레이어의 이동 스냅샷 */
  snapshot: (s: PlayerSnapshot) => void;
  /** 게임 상태 브로드캐스트 (내용 해석은 GameSync 담당) */
  game: (fromId: string, body: unknown) => void;
  /** 클라이언트 → 심판 의도 전달 (힌트 사용 등). 심판만 처리 */
  action: (fromId: string, body: unknown) => void;
  /** 실시간 채팅 */
  chat: (msg: ChatMessage) => void;
  peerLeave: (id: string) => void;
};

/**
 * Room — 한 게임 방. 접속 방식(local/supabase)을 감추고
 * "접속자 명단 / 메시지 송수신 / 퇴장 알림"만 노출한다.
 * 게임 규칙은 전혀 모른다.
 */
export class Room {
  readonly code: string;
  readonly selfId: string;
  readonly selfName: string;

  private transport: Transport;
  private roster = new Map<string, RosterEntry>();
  private listeners: { [K in keyof RoomEvents]: Set<RoomEvents[K]> } = {
    roster: new Set(),
    status: new Set(),
    snapshot: new Set(),
    game: new Set(),
    action: new Set(),
    chat: new Set(),
    peerLeave: new Set(),
  };

  private lastSentAt = 0;
  private lastKey = '';

  constructor(opts: RoomOptions) {
    this.code = opts.code.toUpperCase();
    this.selfName = opts.name;
    this.selfId = getPlayerId();

    const useSupabase = opts.mode === 'supabase' && hasSupabase;
    this.transport = useSupabase
      ? new SupabaseTransport(this.code, this.selfId, this.selfName)
      : new BroadcastTransport(this.code, this.selfId, this.selfName);

    this.roster.set(this.selfId, { id: this.selfId, name: this.selfName });
  }

  on<K extends keyof RoomEvents>(event: K, fn: RoomEvents[K]): () => void {
    this.listeners[event].add(fn);
    return () => {
      this.listeners[event].delete(fn);
    };
  }

  private emit<K extends keyof RoomEvents>(event: K, ...args: Parameters<RoomEvents[K]>) {
    for (const fn of this.listeners[event]) {
      (fn as (...a: unknown[]) => void)(...args);
    }
  }

  async join(): Promise<void> {
    await this.transport.join({
      onStatus: (s) => this.emit('status', s),
      onMessage: (fromId, data) => this.handleMessage(fromId, data),
      onPeerJoin: (id, name) => {
        this.roster.set(id, { id, name });
        this.emitRoster();
      },
      onPeerLeave: (id) => {
        this.roster.delete(id);
        this.emitRoster();
        this.emit('peerLeave', id);
      },
    });
    this.emitRoster();
  }

  /** 매 프레임 호출해도 됨 — 10Hz 로 제한, 방향/정지/층 변화는 즉시 전송 */
  pushLocal(snap: LocalSnapshot): void {
    const key = `${snap.dir}|${snap.moving}|${snap.floor}`;
    const now = performance.now();
    if (key === this.lastKey && now - this.lastSentAt < SEND_INTERVAL_MS) return;

    this.lastSentAt = now;
    this.lastKey = key;
    this.transport.send({ k: 'move', body: snap } satisfies Envelope);
  }

  /** 게임 상태 브로드캐스트 (호스트만 호출) */
  sendGame(body: unknown): void {
    this.transport.send({ k: 'game', body } satisfies Envelope);
  }

  /** 심판에게 의도 전달 (누구나 호출) */
  sendAction(body: unknown): void {
    this.transport.send({ k: 'action', body } satisfies Envelope);
  }

  /** 채팅 전송 — 보낸 사람 화면에도 바로 반영 */
  sendChat(text: string): void {
    const clean = text.trim().slice(0, 200);
    if (!clean) return;
    const msg: ChatMessage = { id: this.selfId, name: this.selfName, text: clean, ts: Date.now() };
    this.transport.send({ k: 'chat', body: msg } satisfies Envelope);
    this.emit('chat', msg);
  }

  async leave(): Promise<void> {
    await this.transport.leave();
    this.roster.clear();
  }

  getRoster(): RosterEntry[] {
    return [...this.roster.values()];
  }

  private handleMessage(fromId: string, data: unknown) {
    const env = data as Partial<Envelope> | null;
    if (!env) return;

    if (env.k === 'game') {
      this.emit('game', fromId, env.body);
      return;
    }
    if (env.k === 'action') {
      this.emit('action', fromId, env.body);
      return;
    }
    if (env.k === 'chat') {
      const m = env.body as ChatMessage;
      if (m && typeof m.text === 'string') {
        this.emit('chat', { ...m, id: fromId, name: this.roster.get(fromId)?.name ?? m.name ?? '손님' });
      }
      return;
    }
    if (env.k !== 'move') return;

    const snap = env.body as LocalSnapshot;
    if (!snap || typeof snap.x !== 'number') return;

    // 이동 메시지가 명단보다 먼저 도착할 수 있음 → 명단 보강
    if (!this.roster.has(fromId)) {
      this.roster.set(fromId, { id: fromId, name: '손님' });
      this.emitRoster();
    }

    this.emit('snapshot', {
      ...snap,
      id: fromId,
      name: this.roster.get(fromId)?.name ?? '손님',
    });
  }

  private emitRoster() {
    this.emit('roster', this.getRoster());
  }
}
