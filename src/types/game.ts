/** 캐릭터가 바라보는 방향 */
export type Direction = 'up' | 'down' | 'left' | 'right';

/** 네트워크로 주고받는 플레이어 상태 스냅샷 (작게 유지) */
export interface PlayerSnapshot {
  id: string;
  name: string;
  x: number;
  y: number;
  /** 층 (1 / 3 / 5). 같은 층 사람만 화면에 그린다 */
  floor: number;
  dir: Direction;
  moving: boolean;
}

/** 로컬 캐릭터가 매 프레임 만들어내는 부분 스냅샷 (id·name 은 Room 이 채운다) */
export type LocalSnapshot = Omit<PlayerSnapshot, 'id' | 'name'>;

/** 로비/HUD 에 표시할 접속자 한 명 */
export interface RosterEntry {
  id: string;
  name: string;
}

/** 근접 반응 — 씬이 계산해 React 로 보낸다 */
export interface Proximity {
  /** 0 안전 · 1 주의 · 2 위험 */
  level: 0 | 1 | 2;
  /** reaction = 술래 시점(내가 누군가에게 가까움) · danger = 도망자 시점(술래가 가까움) */
  kind: 'reaction' | 'danger' | 'none';
}

/** 방 접속 방식
 *  - 'local'    : BroadcastChannel. 같은 브라우저의 창/탭끼리만. 설정 불필요.
 *  - 'supabase' : Supabase Realtime. 다른 브라우저·다른 기기끼리 가능.
 */
export type RoomMode = 'local' | 'supabase';

export interface RoomOptions {
  code: string;
  name: string;
  mode: RoomMode;
  /** 방 만들기로 들어왔는가 (= 이 브라우저가 심판/방장) */
  isHost: boolean;
}
