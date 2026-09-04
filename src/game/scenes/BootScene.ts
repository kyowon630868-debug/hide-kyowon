import Phaser from 'phaser';
import { TILE_SIZE } from '../constants';

/**
 * BootScene — 외부 이미지 파일 없이, 코드로 필요한 텍스처를 그려서 등록한다.
 * Phase 10에서 진짜 스프라이트/사진 캐릭터로 교체 예정.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create() {
    this.makeTileTextures();
    this.makePlayerTextures();
    this.scene.start('world');
  }

  private makeTileTextures() {
    const t = TILE_SIZE;
    const g = this.add.graphics();

    // 바닥
    g.clear();
    g.fillStyle(0x2b2f45).fillRect(0, 0, t, t);
    g.fillStyle(0x323752).fillRect(1, 1, t - 2, t - 2);
    g.lineStyle(1, 0x3a4062).strokeRect(0.5, 0.5, t - 1, t - 1);
    g.generateTexture('tile-floor', t, t);

    // 벽
    g.clear();
    g.fillStyle(0x14162a).fillRect(0, 0, t, t);
    g.fillStyle(0x1f2238).fillRect(0, 0, t, t - 6);
    g.fillStyle(0x2a2e4a).fillRect(0, 0, t, 4);
    g.generateTexture('tile-wall', t, t);

    // 문
    g.clear();
    g.fillStyle(0x323752).fillRect(0, 0, t, t);
    g.fillStyle(0x7a5a3a).fillRect(4, 2, t - 8, t - 4);
    g.fillStyle(0x9a744a).fillRect(6, 4, t - 12, t - 8);
    g.generateTexture('tile-door', t, t);

    // 엘리베이터
    g.clear();
    g.fillStyle(0x3a3f5e).fillRect(0, 0, t, t);
    g.fillStyle(0x565c86).fillRect(3, 3, t - 6, t - 6);
    g.fillStyle(0x8b93c9).fillRect(t / 2 - 1, 4, 2, t - 8);
    g.fillStyle(0xd7defb)
      .fillTriangle(t / 2, 8, t / 2 - 4, 14, t / 2 + 4, 14)
      .fillTriangle(t / 2, t - 8, t / 2 - 4, t - 14, t / 2 + 4, t - 14);
    g.generateTexture('tile-elevator', t, t);

    g.destroy();
  }

  private makePlayerTextures() {
    // 24 x 28 치비 캐릭터. 방향별 텍스처 3종 (좌우는 flipX 로 공유).
    const w = 24;
    const h = 28;
    const skin = 0xf1c9a5;
    const hair = 0x3b2a1e;
    const shirt = 0x4f8cff;
    const pants = 0x2b2f45;

    const draw = (key: string, facing: 'down' | 'up' | 'side') => {
      const g = this.add.graphics();
      // 다리
      g.fillStyle(pants).fillRect(7, 22, 4, 5).fillRect(13, 22, 4, 5);
      // 몸통
      g.fillStyle(shirt).fillRoundedRect(5, 14, 14, 9, 3);
      // 머리
      g.fillStyle(skin).fillCircle(12, 9, 7);
      // 머리카락
      g.fillStyle(hair).fillRect(5, 2, 14, 5);
      if (facing === 'down') {
        g.fillStyle(0x2a2233).fillCircle(9, 9, 1.3).fillCircle(15, 9, 1.3);
      } else if (facing === 'side') {
        g.fillStyle(hair).fillRect(5, 2, 8, 9); // 옆머리
        g.fillStyle(0x2a2233).fillCircle(14, 9, 1.3);
      } else {
        g.fillStyle(hair).fillRect(5, 2, 14, 8); // 뒤통수
      }
      g.generateTexture(key, w, h);
      g.destroy();
    };

    draw('player-down', 'down');
    draw('player-up', 'up');
    draw('player-side', 'side');
  }
}
