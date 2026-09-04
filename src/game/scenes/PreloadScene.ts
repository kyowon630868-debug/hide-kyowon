import Phaser from 'phaser';
import {
  CHAR_ANIMS,
  CHAR_FRAME,
  CHAR_SHEET,
  FURNITURE_KEYS,
  TILE_KEYS,
  WINDOW_KEY,
  assetUrl,
} from '../assets';

/**
 * PreloadScene — 모든 PNG 에셋을 로드하고 캐릭터 애니메이션을 등록한 뒤 world 로 넘긴다.
 * (코드로 도형을 그리지 않는다. 아트는 전부 public/assets/ 의 파일)
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('preload');
  }

  preload() {
    for (const k of TILE_KEYS) this.load.image(k, assetUrl(`tiles/${k}.png`));
    for (const k of FURNITURE_KEYS) this.load.image(k, assetUrl(`furniture/${k}.png`));
    this.load.image(WINDOW_KEY, assetUrl('bg/window-namsan.png'));
    this.load.spritesheet(CHAR_SHEET, assetUrl('characters/chibi.png'), {
      frameWidth: CHAR_FRAME.width,
      frameHeight: CHAR_FRAME.height,
    });
  }

  create() {
    for (const { anim, frames } of Object.values(CHAR_ANIMS)) {
      this.anims.create({
        key: anim,
        frames: this.anims.generateFrameNumbers(CHAR_SHEET, { frames: [...frames] }),
        frameRate: 7,
        repeat: -1,
      });
    }
    this.scene.start('world');
  }
}
