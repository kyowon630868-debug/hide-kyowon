import type Phaser from 'phaser';
import type { Direction } from '../../types/game';

/**
 * 방향 + 이동 여부 → 캐릭터 프레임 적용.
 * chars 시트: 6열(0아래정지 1아래걷기 2위정지 3위걷기 4옆정지 5옆걷기) × 6행(캐릭터 종류).
 * 프레임 번호 = row*6 + (base 또는 base+1).
 */
const WALK_MS = 170;

export function applyCharAnim(
  sprite: Phaser.GameObjects.Sprite,
  dir: Direction,
  moving: boolean,
  row = 0,
  fast = false,
): void {
  const base = dir === 'up' ? 2 : dir === 'down' ? 0 : 4;
  // 옆면 기본 프레임이 '왼쪽'을 보므로 오른쪽일 때 뒤집는다
  sprite.setFlipX(dir === 'right');
  const idle = row * 6 + base;
  if (moving) {
    const step = Math.floor(sprite.scene.time.now / (fast ? WALK_MS / 1.7 : WALK_MS)) % 2;
    sprite.setFrame(idle + step);
  } else {
    sprite.setFrame(idle);
  }
}
