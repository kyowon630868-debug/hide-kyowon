import { useState } from 'react';
import { useRoom } from '../hooks/useRoom';
import { useGame } from '../hooks/useGame';
import { useChat } from '../hooks/useChat';
import { GameCanvas, type CanvasEvent } from '../game/GameCanvas';
import { GameHud, type HudApi } from './GameHud';
import { ChatPanel } from './ChatPanel';
import { GameRules } from '../game-logic/rules';
import { bgm } from '../game/audio';
import type { HintResult } from '../game-logic/types';
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
  const chat = useChat(room);

  const [floorName, setFloorName] = useState('');
  const [floorId, setFloorId] = useState(3);
  const [proximity, setProximity] = useState<Proximity>({ level: 0, kind: 'none' });
  const [elevatorNear, setElevatorNear] = useState(false);
  const [traveling, setTraveling] = useState<{ to: number } | null>(null);
  const [hint, setHint] = useState<{ result: HintResult; cooldownUntil: number } | null>(null);
  const [api, setApi] = useState<HudApi | null>(null);

  const selfId = room?.selfId ?? '';

  function handleEvent(name: CanvasEvent, payload: unknown) {
    switch (name) {
      case 'hud': {
        const p = payload as { floorName?: string; floorId?: number };
        setFloorName(p.floorName ?? '');
        if (p.floorId) setFloorId(p.floorId);
        break;
      }
      case 'proximity':
        setProximity(payload as Proximity);
        break;
      case 'elevator':
        setElevatorNear((payload as { near: boolean }).near);
        break;
      case 'elevator-travel':
        setTraveling(payload as { to: number } | null);
        break;
      case 'hintResult':
        setHint(payload as { result: HintResult; cooldownUntil: number });
        break;
      case 'api':
        setApi(payload as HudApi);
        break;
    }
  }

  return (
    <div className="screen" onPointerDown={() => bgm.unlock()}>
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
            <span>
              {GameRules.label(state.phase)}
              {options.isHost ? ' · 방장' : ''}
            </span>
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

        <ChatPanel messages={chat.messages} selfId={selfId} onSend={chat.send} />
      </aside>

      <GameCanvas room={room} sync={sync} onEvent={handleEvent}>
        <GameHud
          state={state}
          roster={roster}
          selfId={selfId}
          isHost={options.isHost}
          floorName={floorName}
          floorId={floorId}
          proximity={proximity}
          elevatorNear={elevatorNear}
          traveling={traveling}
          hint={hint}
          api={api}
          onStart={() => sync?.startGame(roster.map((r) => r.id))}
          onRestart={() => sync?.restart()}
        />
      </GameCanvas>
    </div>
  );
}
