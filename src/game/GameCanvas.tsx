import { useEffect, useRef, type ReactNode } from 'react';
import type Phaser from 'phaser';
import { createGame } from './createGame';
import type { Room } from '../net/Room';
import type { GameSync } from '../net/GameSync';

/** 씬이 game.events 로 올려보내는 이벤트 이름들 */
const FORWARD = [
  'hud',
  'proximity',
  'elevator',
  'elevator-travel',
  'hintResult',
  'api',
  'endgame',
  'stamina',
] as const;
export type CanvasEvent = (typeof FORWARD)[number];

/**
 * Phaser 캔버스. 씬에서 올라오는 이벤트를 전부 onEvent 로 부모에게 넘기고,
 * 오버레이 UI(children)는 부모가 그린다.
 */
export function GameCanvas({
  room,
  sync,
  onEvent,
  children,
}: {
  room: Room | null;
  sync: GameSync | null;
  onEvent?: (name: CanvasEvent, payload: unknown) => void;
  children?: ReactNode;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !room || !sync) return;

    let game: Phaser.Game | null = null;
    let raf = 0;

    // 컨테이너가 0 크기인 동안 Phaser 를 만들면 WebGL 프레임버퍼가 깨진다 → 크기가 잡힐 때까지 대기
    const startWhenSized = () => {
      if (host.clientWidth > 0 && host.clientHeight > 0) {
        game = createGame(host, room, sync);
        for (const name of FORWARD) {
          game.events.on(name, (p: unknown) => onEventRef.current?.(name, p));
        }
        if (import.meta.env.DEV) {
          (window as unknown as { game: Phaser.Game }).game = game;
        }
      } else {
        raf = requestAnimationFrame(startWhenSized);
      }
    };
    startWhenSized();

    return () => {
      cancelAnimationFrame(raf);
      game?.destroy(true);
    };
  }, [room, sync]);

  return (
    <div className="game-canvas">
      <div ref={hostRef} className="game-canvas__host" />
      {children}
    </div>
  );
}
