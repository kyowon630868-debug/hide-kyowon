import { useEffect, useState } from 'react';
import { GameSync } from '../net/GameSync';
import { GameRules } from '../game-logic/rules';
import type { GameState } from '../game-logic/types';
import type { Room } from '../net/Room';

/**
 * GameSync 를 React 수명주기에 연결한다.
 * room 이 준비되면 GameSync 를 만들고, 상태 변화를 컴포넌트 state 로 흘려보낸다.
 */
export function useGame(room: Room | null, isHost: boolean) {
  const [sync, setSync] = useState<GameSync | null>(null);
  const [state, setState] = useState<GameState>(() => GameRules.initial());

  useEffect(() => {
    if (!room) return;
    const gs = new GameSync(room, isHost);
    setSync(gs);
    setState(gs.getState());
    const off = gs.onChange(setState);

    return () => {
      off();
      gs.dispose();
      setSync(null);
    };
  }, [room, isHost]);

  return { sync, state };
}
