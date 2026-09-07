import Phaser from 'phaser';
import { PreloadScene } from './scenes/PreloadScene';
import { WorldScene } from './scenes/WorldScene';
import type { Room } from '../net/Room';
import type { GameSync } from '../net/GameSync';

/** Phaser 게임 인스턴스를 만든다. React 컴포넌트가 마운트될 때 1회 호출. */
export function createGame(
  parent: HTMLElement,
  room: Room,
  sync: GameSync,
): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    pixelArt: true,
    backgroundColor: '#0b0c16',
    physics: {
      default: 'arcade',
      arcade: { debug: false },
    },
    scale: {
      // 고정 16:9 해상도(드로잉 버퍼 항상 1280x720 → WebGL 안전) + FIT.
      // 16:9 모니터에선 꽉 차고, 아니면 위아래(또는 좌우) 약간 레터박스.
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 1280,
      height: 720,
    },
    scene: [PreloadScene, WorldScene],
  });

  // 씬에서 this.registry.get(...) 으로 접근
  game.registry.set('room', room);
  game.registry.set('gameSync', sync);

  return game;
}
