import { useState } from 'react';
import { useRoom } from '../hooks/useRoom';
import { useGame } from '../hooks/useGame';
import { GameCanvas } from '../game/GameCanvas';
import { GameOverlay } from './GameOverlay';
import { GameRules } from '../game-logic/rules';
import type { Proximity, RoomOptions } from '../types/game';
import type { ConnStatus } from '../net/transport';

const STATUS_LABEL: Record<ConnStatus, string> = {
  connecting: '연결 중…',
  joined: '접속됨',
  error: '연결 실패',
};

export function GameScreen({
  options,
  onLeave,
}: {
  options: RoomOptions;
  onLeave: () => void;
}) {
  const { room, roster, status } = useRoom(options);
  const { sync, state } = useGame(room, options.isHost);
  const [proximity, setProximity] = useState<Proximity>({ level: 0, kind: 'none' });

  const selfId = room?.selfId ?? '';
  const phaseLabel = GameRules.label(state.phase);

  return (
    <div className="screen">
      <aside className="screen__side">
        <button className="btn btn--ghost" onClick={onLeave}>
          ← 나가기
        </button>

        <div className="panel">
          <div className="panel__row">
            <span>방 코드</span>
            <b className="code">{options.code}</b>
          </div>
          <div className="panel__row">
            <span>접속 방식</span>
            <span>{options.mode === 'supabase' ? '온라인' : '로컬'}</span>
          </div>
          <div className="panel__row">
            <span>상태</span>
            <span className={`dot dot--${status}`}>{STATUS_LABEL[status]}</span>
          </div>
          <div className="panel__row">
            <span>게임</span>
            <span>{phaseLabel}{options.isHost ? ' · 방장' : ''}</span>
          </div>
        </div>

        <div className="panel">
          <div className="panel__head">참여 인원 {roster.length} / 5</div>
          <ul className="roster">
            {roster.map((p) => {
              const caught = p.id in state.alive && !state.alive[p.id];
              return (
                <li key={p.id} className={p.id === selfId ? 'is-me' : ''}>
                  {p.name}
                  {p.id === selfId && ' (나)'}
                  {caught && <span className="roster__x"> 잡힘</span>}
                </li>
              );
            })}
          </ul>
        </div>

        <p className="hint">
          같은 방 코드로 두 번째 창을 열고 방장이 <b>게임 시작</b>을 누르면
          술래잡기가 시작됩니다.
        </p>
      </aside>

      <GameCanvas room={room} sync={sync} onProximity={setProximity}>
        <GameOverlay
          state={state}
          proximity={proximity}
          roster={roster}
          selfId={selfId}
          isHost={options.isHost}
          onStart={() => sync?.startGame(roster.map((r) => r.id))}
          onRestart={() => sync?.restart()}
        />
      </GameCanvas>
    </div>
  );
}
