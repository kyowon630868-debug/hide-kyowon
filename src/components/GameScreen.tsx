import { useState } from 'react';
import { useRoom } from '../hooks/useRoom';
import { useGame } from '../hooks/useGame';
import { useChat } from '../hooks/useChat';
import { GameCanvas, type CanvasEvent } from '../game/GameCanvas';
import { GameHud, type HudApi } from './GameHud';
import { ChatDock } from './ChatDock';
import { bgm } from '../game/audio';
import type { HintResult } from '../game-logic/types';
import type { Proximity, RoomOptions } from '../types/game';

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
  const [rosterOpen, setRosterOpen] = useState(false);

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
      <GameCanvas room={room} sync={sync} onEvent={handleEvent}>
        <button className="leave-btn" onClick={onLeave}>
          ← 나가기
        </button>

        <div className={`roomtag ${rosterOpen ? 'is-open' : ''}`}>
          <button className="roomtag__head" onClick={() => setRosterOpen((v) => !v)}>
            <span className="roomtag__code">{options.code}</span>
            <span className={`roomtag__dot roomtag__dot--${status}`} />
            <span className="roomtag__count">{roster.length}/5</span>
          </button>
          {rosterOpen && (
            <ul className="roomtag__list">
              {roster.map((p) => {
                const caught = p.id in state.alive && !state.alive[p.id];
                return (
                  <li key={p.id} className={p.id === selfId ? 'is-me' : ''}>
                    {p.name}
                    {p.id === state.seekerId && ' 👁'}
                    {caught && ' ✖'}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

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

        <ChatDock messages={chat.messages} selfId={selfId} onSend={chat.send} />
      </GameCanvas>
    </div>
  );
}
