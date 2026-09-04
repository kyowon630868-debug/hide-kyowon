/**
 * Transport — "방 안의 다른 사람에게 JSON 을 보내고, 누가 들어오고 나가는지 알려주는" 최소 계층.
 * 게임 로직은 이 인터페이스만 알면 되고, 실제 통신 수단(BroadcastChannel / Supabase)은 갈아끼운다.
 */

export type ConnStatus = 'connecting' | 'joined' | 'error';

export interface TransportHandlers {
  /** 다른 사람이 보낸 메시지 */
  onMessage: (fromId: string, data: unknown) => void;
  /** 다른 사람이 방에 들어옴 (혹은 뒤늦게 발견됨) */
  onPeerJoin: (id: string, name: string) => void;
  /** 다른 사람이 방에서 나감 */
  onPeerLeave: (id: string) => void;
  /** 연결 상태 변화 */
  onStatus: (status: ConnStatus) => void;
}

export interface Transport {
  readonly selfId: string;
  /** 방에 접속. meta(name 등)를 다른 사람에게 알린다 */
  join(handlers: TransportHandlers): Promise<void>;
  /** 방의 다른 사람들에게 전송 (자기 자신 제외) */
  send(data: unknown): void;
  /** 접속 종료 */
  leave(): Promise<void>;
}
