import { useEffect, useRef, useState, type ReactNode } from 'react';
import type Phaser from 'phaser';
import { createGame } from './createGame';
import type { Room } from '../net/Room';
import type { GameSync } from '../net/GameSync';
import type { Proximity } from '../types/game';

interface HudState {
  floorName: string;
}

/**
 * Phaser 캔버스 + 그 위에 겹치는 React 오버레이(children).
 * React 는 UI 를, Phaser 는 게임 화면을 담당하고 둘은 game.events / registry 로만 만난다.
 */
export function GameCanvas({
  room,
  sync,
  onProximity,
  children,
}: {
  room: Room | null;
  sync: GameSync | null;
  onProximity?: (p: Proximity) => void;
  children?: ReactNode;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [hud, setHud] = useState<HudState>({ floorName: '' });
  const proxRef = useRef(onProximity);
  proxRef.current = onProximity;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !room || !sync) return;

    const game = createGame(host, room, sync);
    game.events.on('hud', (next: Partial<HudState>) =>
      setHud((prev) => ({ ...prev, ...next })),
    );
    game.events.on('proximity', (p: Proximity) => proxRef.current?.(p));

    if (import.meta.env.DEV) {
      (window as unknown as { game: Phaser.Game }).game = game;
    }

    return () => {
      game.destroy(true);
    };
  }, [room, sync]);

  return (
    <div className="game-canvas">
      <div ref={hostRef} className="game-canvas__host" />
      <div className="hud">
        <span className="hud__chip">{hud.floorName || '…'}</span>
        <span className="hud__chip hud__chip--muted">방향키 / WASD</span>
      </div>
      {children}
    </div>
  );
}
