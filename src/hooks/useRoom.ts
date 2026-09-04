import { useEffect, useState } from 'react';
import { Room } from '../net/Room';
import type { RoomOptions, RosterEntry } from '../types/game';
import type { ConnStatus } from '../net/transport';

/**
 * Room 의 생명주기(생성 → join → leave)를 React 에 맞춰 관리한다.
 * StrictMode 이중 마운트에서도 매번 새 Room 을 만들고 정리한다.
 */
export function useRoom(options: RoomOptions) {
  const [room, setRoom] = useState<Room | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [status, setStatus] = useState<ConnStatus>('connecting');

  useEffect(() => {
    const r = new Room(options);
    setRoom(r);
    setRoster(r.getRoster());
    setStatus('connecting');

    const offRoster = r.on('roster', setRoster);
    const offStatus = r.on('status', setStatus);
    void r.join();

    return () => {
      offRoster();
      offStatus();
      void r.leave();
      setRoom(null);
    };
    // 원시값만 의존 — options 객체 정체성 변화는 무시
  }, [options.code, options.name, options.mode]);

  return { room, roster, status };
}
