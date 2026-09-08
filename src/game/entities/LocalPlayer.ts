import Phaser from 'phaser';
import {
  PLAYER_SPEED,
  SPRINT_MULT,
  STAMINA_DRAIN,
  STAMINA_MAX,
  STAMINA_REGEN,
} from '../constants';
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
  private sprintKeys: Phaser.Input.Keyboard.Key[];
  private facing: Direction = 'down';
  private movingNow = false;
  private controlEnabled = true;
  private speed = PLAYER_SPEED;
  private readonly charRow: number;
  /** 부스터 자원 0~100 */
  stamina = STAMINA_MAX;
  sprinting = false;
  private tired = false; // 스태미나 바닥 → 조금 찰 때까지 못 달림
  readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, nickname: string, charRow = 0) {
    super(scene, x, y, CHAR_SHEET, charRow * 6);
    this.charRow = charRow;
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // 충돌 박스는 발밑만 (47x64 프레임 기준)
    this.setSize(16, 9);
    this.setOffset(16, 53);
    this.setCollideWorldBounds(true);
    this.setDepth(10);

    const kb = scene.input.keyboard!;
    this.wasd = kb.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D' }) as typeof this.wasd;
    this.cursors = kb.createCursorKeys();
    this.sprintKeys = [
      kb.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
    ];

    this.label = scene.add
      .text(x, y - 42, nickname, {
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

  /** 역할·막판에 따라 씬이 걷기 속도를 조정 (부스터 배수는 내부에서 곱함) */
  setSpeed(px: number) {
    this.speed = px;
  }

  private regenStamina(delta: number) {
    this.stamina = Math.min(STAMINA_MAX, this.stamina + (STAMINA_REGEN * delta) / 1000);
  }

  /** 연출용 — 방향을 강제로 지정 (스냅샷에도 반영되어 다른 화면에서도 같은 방향으로 보임) */
  forceFacing(dir: Direction) {
    this.facing = dir;
    this.movingNow = false;
    applyCharAnim(this, dir, false, this.charRow);
  }

  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);

    if (!this.controlEnabled) {
      this.setVelocity(0, 0);
      this.movingNow = false;
      this.sprinting = false;
      this.regenStamina(delta);
      applyCharAnim(this, this.facing, false, this.charRow);
      this.label.setPosition(this.x, this.y - 40);
      return;
    }

    const left = this.wasd.left.isDown || this.cursors.left.isDown;
    const right = this.wasd.right.isDown || this.cursors.right.isDown;
    const up = this.wasd.up.isDown || this.cursors.up.isDown;
    const down = this.wasd.down.isDown || this.cursors.down.isDown;

    const vx = (right ? 1 : 0) - (left ? 1 : 0);
    const vy = (down ? 1 : 0) - (up ? 1 : 0);
    const moving = vx !== 0 || vy !== 0;

    // 부스터 판정 — 0 이 되면 60% 이상 찰 때까지 "지침" 상태
    const wantSprint = this.sprintKeys.some((k) => k.isDown);
    if (this.tired && this.stamina > STAMINA_MAX * 0.6) this.tired = false;
    this.sprinting = moving && wantSprint && !this.tired && this.stamina > 0;
    if (this.sprinting) {
      this.stamina = Math.max(0, this.stamina - (STAMINA_DRAIN * delta) / 1000);
      if (this.stamina <= 0) this.tired = true;
    } else {
      this.regenStamina(delta);
    }

    const spd = this.speed * (this.sprinting ? SPRINT_MULT : 1);
    const len = Math.hypot(vx, vy) || 1;
    this.setVelocity((vx / len) * spd, (vy / len) * spd);

    this.movingNow = moving;
    if (moving) {
      // 좌우 우선, 그다음 상하로 방향 결정
      if (Math.abs(vx) > Math.abs(vy)) this.facing = vx > 0 ? 'right' : 'left';
      else this.facing = vy > 0 ? 'down' : 'up';
    }
    applyCharAnim(this, this.facing, moving, this.charRow, this.sprinting);

    this.label.setPosition(this.x, this.y - 40);
  }

  /** WorldScene 이 읽어서 네트워크로 보낼 현재 상태 (floor 는 씬이 채운다) */
  snapshot(): Omit<LocalSnapshot, 'floor'> {
    return {
      x: Math.round(this.x),
      y: Math.round(this.y),
      dir: this.facing,
      moving: this.movingNow,
      char: this.charRow,
    };
  }

  destroy(fromScene?: boolean) {
    this.label.destroy();
    super.destroy(fromScene);
  }
}
