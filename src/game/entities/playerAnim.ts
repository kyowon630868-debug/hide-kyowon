import type Phaser from 'phaser';
import type { Direction } from '../../types/game';
import { CHAR_ANIMS } from '../assets';

/** 방향 + 이동 여부 → 캐릭터 스프라이트에 애니메이션/정지 프레임 적용 */
export function applyCharAnim(
  sprite: Phaser.GameObjects.Sprite,
  dir: Direction,
  moving: boolean,
): void {
  const conf = dir === 'up' ? CHAR_ANIMS.up : dir === 'down' ? CHAR_ANIMS.down : CHAR_ANIMS.side;
  sprite.setFlipX(dir === 'left');
  if (moving) {
    if (sprite.anims.currentAnim?.key !== conf.anim || !sprite.anims.isPlaying) {
      sprite.anims.play(conf.anim, true);
    }
  } else {
    sprite.anims.stop();
    sprite.setFrame(conf.idle);
  }
}
