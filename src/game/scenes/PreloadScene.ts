import Phaser from 'phaser';
import { CHAR_FRAME, CHAR_SHEET, FURNITURE_KEYS, TILE_KEYS, WINDOW_KEY, assetUrl } from '../assets';

/**
 * PreloadScene — 모든 PNG 에셋을 로드한 뒤 world 로 넘긴다.
 * 캐릭터 애니메이션은 프레임 토글(playerAnim.ts)로 직접 처리하므로 anims 등록 없음.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('preload');
  }

  preload() {
    for (const k of TILE_KEYS) this.load.image(k, assetUrl(`tiles/${k}.png`));
    for (const k of FURNITURE_KEYS) this.load.image(k, assetUrl(`furniture/${k}.png`));
    this.load.image(WINDOW_KEY, assetUrl('bg/window-namsan.png'));
    this.load.spritesheet(CHAR_SHEET, assetUrl('characters/chars.png'), {
      frameWidth: CHAR_FRAME.width,
      frameHeight: CHAR_FRAME.height,
    });
  }

  create() {
    this.scene.start('world');
  }
}
