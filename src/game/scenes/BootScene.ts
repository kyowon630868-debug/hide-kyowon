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
    this.makeWindowTexture();
    this.scene.start('world');
  }

  /** 사무실 창문 + 남산타워 야경 (임시 그래픽) — 256 x 72 */
  private makeWindowTexture() {
    const W = 256;
    const H = 72;
    const g = this.add.graphics();

    // 노을~야경 하늘
    g.fillGradientStyle(0x1a1330, 0x1a1330, 0x3a2350, 0x6b3a4a, 1);
    g.fillRect(0, 0, W, H);

    // 도시 실루엣
    g.fillStyle(0x0e0b1c, 0.95);
    const bh = [22, 34, 18, 40, 28, 46, 24, 38, 30, 20, 42, 26];
    for (let i = 0; i < bh.length; i++) {
      g.fillRect(i * 22, H - bh[i], 20, bh[i]);
    }
    // 창문 불빛
    g.fillStyle(0xffd98a, 0.8);
    for (let i = 0; i < 40; i++) {
      g.fillRect(6 + ((i * 37) % (W - 12)), 20 + ((i * 53) % (H - 30)), 2, 2);
    }

    // 남산타워 (오른쪽)
    const tx = W - 74;
    g.fillStyle(0x2a2740);
    g.fillTriangle(tx - 10, H, tx + 10, H, tx, H - 30); // 산
    g.fillStyle(0x4a4560);
    g.fillRect(tx - 2, H - 54, 4, 26); // 기둥
    g.fillStyle(0xb9b4d0);
    g.fillRect(tx - 7, H - 60, 14, 8); // 전망대
    g.fillRect(tx - 1, H - 70, 2, 12); // 첨탑
    g.fillStyle(0xff5555);
    g.fillCircle(tx, H - 71, 1.6); // 항공등

    // 창틀
    g.lineStyle(4, 0x20233a);
    g.strokeRect(2, 2, W - 4, H - 4);
    g.lineStyle(3, 0x20233a);
    g.lineBetween(W / 2, 2, W / 2, H - 2);
    g.lineBetween(2, H / 2, W - 2, H / 2);

    g.generateTexture('window-namsan', W, H);
    g.destroy();
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
