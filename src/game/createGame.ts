import Phaser from 'phaser';
import { VIEW } from './constants';
import { BootScene } from './scenes/BootScene';
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
    width: VIEW.WIDTH,
    height: VIEW.HEIGHT,
    pixelArt: true,
    backgroundColor: '#0e0f1c',
    physics: {
      default: 'arcade',
      arcade: { debug: false },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, WorldScene],
  });

  // 씬에서 this.registry.get(...) 으로 접근
  game.registry.set('room', room);
  game.registry.set('gameSync', sync);

  return game;
}
