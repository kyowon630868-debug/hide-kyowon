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
      // 부모 div 크기에 맞춰 캔버스가 꽉 차게 (레터박스 없음)
      mode: Phaser.Scale.RESIZE,
      width: '100%',
      height: '100%',
    },
    scene: [PreloadScene, WorldScene],
  });

  // 씬에서 this.registry.get(...) 으로 접근
  game.registry.set('room', room);
  game.registry.set('gameSync', sync);

  return game;
}
