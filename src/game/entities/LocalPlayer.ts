import Phaser from 'phaser';
import { PLAYER_SPEED } from '../constants';
import type { Direction, LocalSnapshot } from '../../types/game';
import { CHAR_SHEET } from '../assets';
import { applyCharAnim } from './playerAnim';

/**
 * 내가 조종하는 캐릭터.
 * WorldScene 이 매 프레임 snapshot() 을 읽어 Room 으로 브로드캐스트한다.
 */
export class LocalPlayer extends Phaser.Physics.Arcade.Sprite {
  private wasd: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private facing: Direction = 'down';
  private movingNow = false;
  private controlEnabled = true;
  readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, nickname: string) {
    super(scene, x, y, CHAR_SHEET, 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // 충돌 박스는 발밑만 (24x32 프레임 기준)
    this.setSize(12, 9);
    this.setOffset(6, 21);
    this.setCollideWorldBounds(true);
    this.setDepth(10);

    const kb = scene.input.keyboard!;
    this.wasd = kb.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D' }) as typeof this.wasd;
    this.cursors = kb.createCursorKeys();

    this.label = scene.add
      .text(x, y - 22, nickname, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 3, y: 1 },
      })
      .setOrigin(0.5, 1)
      .setDepth(11);
  }

  /** 숨는 시간의 술래처럼 조작을 잠근다 */
  setControlEnabled(on: boolean) {
    this.controlEnabled = on;
  }

  /** 연출용 — 방향을 강제로 지정 (스냅샷에도 반영되어 다른 화면에서도 같은 방향으로 보임) */
  forceFacing(dir: Direction) {
    this.facing = dir;
    this.movingNow = false;
    applyCharAnim(this, dir, false);
  }

  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);

    if (!this.controlEnabled) {
      this.setVelocity(0, 0);
      this.movingNow = false;
      applyCharAnim(this, this.facing, false);
      this.label.setPosition(this.x, this.y - 20);
      return;
    }

    const left = this.wasd.left.isDown || this.cursors.left.isDown;
    const right = this.wasd.right.isDown || this.cursors.right.isDown;
    const up = this.wasd.up.isDown || this.cursors.up.isDown;
    const down = this.wasd.down.isDown || this.cursors.down.isDown;

    let vx = (right ? 1 : 0) - (left ? 1 : 0);
    let vy = (down ? 1 : 0) - (up ? 1 : 0);
    const len = Math.hypot(vx, vy) || 1;
    vx = (vx / len) * PLAYER_SPEED;
    vy = (vy / len) * PLAYER_SPEED;
    this.setVelocity(vx, vy);

    const moving = vx !== 0 || vy !== 0;
    this.movingNow = moving;
    if (moving) {
      // 좌우 우선, 그다음 상하로 방향 결정
      if (Math.abs(vx) > Math.abs(vy)) this.facing = vx > 0 ? 'right' : 'left';
      else this.facing = vy > 0 ? 'down' : 'up';
    }
    applyCharAnim(this, this.facing, moving);

    this.label.setPosition(this.x, this.y - 20);
  }

  /** WorldScene 이 읽어서 네트워크로 보낼 현재 상태 (floor 는 씬이 채운다) */
  snapshot(): Omit<LocalSnapshot, 'floor'> {
    return {
      x: Math.round(this.x),
      y: Math.round(this.y),
      dir: this.facing,
      moving: this.movingNow,
    };
  }

  destroy(fromScene?: boolean) {
    this.label.destroy();
    super.destroy(fromScene);
  }
}
