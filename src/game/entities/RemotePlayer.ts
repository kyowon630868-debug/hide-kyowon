import Phaser from 'phaser';
import type { Direction, PlayerSnapshot } from '../../types/game';
import { NET } from '../constants';
import { CHAR_COUNT, CHAR_SHEET } from '../assets';
import { applyCharAnim } from './playerAnim';

interface Sample {
  t: number; // 로컬 도착 시각 (performance.now)
  x: number;
  y: number;
  dir: Direction;
  moving: boolean;
}

/**
 * 다른 플레이어의 캐릭터.
 * 네트워크 패킷을 그대로 순간이동시키지 않고, 약간 과거 시점(INTERP_DELAY_MS)을
 * 렌더하면서 두 샘플 사이를 보간해 부드럽게 움직인다.
 */
export class RemotePlayer extends Phaser.GameObjects.Sprite {
  private buffer: Sample[] = [];
  private lastDir: Direction = 'down';
  private readonly charRow: number;
  /** 이 플레이어가 있는 층 (씬의 층 필터에 사용) */
  floor: number;
  readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, snap: PlayerSnapshot) {
    const charRow = ((snap.char ?? 0) % CHAR_COUNT + CHAR_COUNT) % CHAR_COUNT;
    super(scene, snap.x, snap.y, CHAR_SHEET, charRow * 6);
    this.charRow = charRow;
    scene.add.existing(this);
    this.setDepth(9);
    this.floor = snap.floor;

    this.label = scene.add
      .text(snap.x, snap.y - 42, snap.name, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#cfe0ff',
        backgroundColor: '#000000aa',
        padding: { x: 3, y: 1 },
      })
      .setOrigin(0.5, 1)
      .setDepth(11);

    this.push(snap);
  }

  /** 새 스냅샷 수신 */
  push(snap: PlayerSnapshot): void {
    this.floor = snap.floor;
    this.buffer.push({
      t: performance.now(),
      x: snap.x,
      y: snap.y,
      dir: snap.dir,
      moving: snap.moving,
    });
    this.label.setText(snap.name);
    // 버퍼가 너무 커지지 않게 (0.5초 이상 지난 건 정리는 preUpdate 에서)
    if (this.buffer.length > 20) this.buffer.splice(0, this.buffer.length - 20);
  }

  preUpdate(): void {
    const renderT = performance.now() - NET.INTERP_DELAY_MS;

    // renderT 이전의 오래된 샘플은 하나만 남기고 버림
    while (this.buffer.length >= 2 && this.buffer[1].t <= renderT) {
      this.buffer.shift();
    }

    let dir: Direction = this.lastDir;
    let moving = false;

    if (this.buffer.length >= 2) {
      const a = this.buffer[0];
      const b = this.buffer[1];
      const span = b.t - a.t || 1;
      const f = Phaser.Math.Clamp((renderT - a.t) / span, 0, 1);
      this.x = Phaser.Math.Linear(a.x, b.x, f);
      this.y = Phaser.Math.Linear(a.y, b.y, f);
      dir = b.dir;
      moving = b.moving;
    } else if (this.buffer.length === 1) {
      this.x = this.buffer[0].x;
      this.y = this.buffer[0].y;
      dir = this.buffer[0].dir;
    }

    this.applyFacing(dir, moving);
    this.label.setPosition(this.x, this.y - 40);
  }

  private applyFacing(dir: Direction, moving: boolean) {
    this.lastDir = dir;
    applyCharAnim(this, dir, moving, this.charRow);
  }

  destroy(fromScene?: boolean): void {
    this.label.destroy();
    super.destroy(fromScene);
  }
}
