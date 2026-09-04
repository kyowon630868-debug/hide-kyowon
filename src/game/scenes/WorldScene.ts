import Phaser from 'phaser';
import { TILE_SIZE } from '../constants';
import { FLOOR_3 } from '../maps/floor3';
import { assertFloorMap, type FloorMap } from '../maps/types';
import { LocalPlayer } from '../entities/LocalPlayer';
import { RemotePlayer } from '../entities/RemotePlayer';
import type { Room } from '../../net/Room';
import type { GameSync } from '../../net/GameSync';
import { GameRules } from '../../game-logic/rules';
import type { GameState, PlayerPos } from '../../game-logic/types';
import type { PlayerSnapshot } from '../../types/game';

const SEEKER_TINT = 0xff6b6b;
const CAUGHT_TINT = 0x8a8a8a;
const NEUTRAL_TINT = 0xffffff;

/**
 * WorldScene — 한 층을 그리고, 내 캐릭터를 움직이고, 다른 플레이어를 보여주고,
 * 게임 규칙(GameSync)에 필요한 위치를 매 프레임 넘긴다.
 */
export class WorldScene extends Phaser.Scene {
  private player!: LocalPlayer;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private floor: FloorMap = FLOOR_3;

  private room: Room | null = null;
  private sync: GameSync | null = null;

  private remotes = new Map<string, RemotePlayer>();
  /** 게임 규칙에 넘길 "모든" 플레이어의 최신 위치 (렌더링과 분리) */
  private netPositions = new Map<string, PlayerPos>();
  private unsubscribes: Array<() => void> = [];

  private lastProximity = -1;
  private lastShakeAt = 0;
  private lastPhase = '';

  constructor() {
    super('world');
  }

  create() {
    if (import.meta.env.DEV) assertFloorMap(this.floor);

    this.room = (this.registry.get('room') as Room | null) ?? null;
    this.sync = (this.registry.get('gameSync') as GameSync | null) ?? null;
    const myName = this.room?.selfName ?? '나';

    this.buildFloor(this.floor);

    const spawn = this.pickSpawn();
    this.player = new LocalPlayer(this, spawn.x, spawn.y, myName);
    this.physics.add.collider(this.player, this.walls);

    const worldW = this.floor.rows[0].length * TILE_SIZE;
    const worldH = this.floor.rows.length * TILE_SIZE;
    this.physics.world.setBounds(0, 0, worldW, worldH);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, worldW, worldH);
    cam.startFollow(this.player, true, 0.15, 0.15);
    cam.setZoom(1.7);

    this.game.events.emit('hud', { floorName: this.floor.name });

    this.connectRoom();
    if (this.sync) this.applyGameState(this.sync.getState());
  }

  update() {
    // React HUD 가 첫 emit 을 놓쳤을 경우 대비해 초반 몇 프레임 재전송
    if (this.game.loop.frame < 12) {
      this.game.events.emit('hud', { floorName: this.floor.name });
    }

    if (!this.room || !this.sync) return;

    // 1) 내 위치 브로드캐스트 + 규칙용 위치 갱신
    const mySnap = { ...this.player.snapshot(), floor: this.floor.id };
    this.room.pushLocal(mySnap);
    this.netPositions.set(this.room.selfId, {
      x: this.player.x,
      y: this.player.y,
      floor: this.floor.id,
    });

    // 2) 호스트라면 규칙 진행 (비호스트는 no-op)
    this.sync.frame(Object.fromEntries(this.netPositions), Date.now());

    // 3) 근접 반응 계산 (각자 자기 화면에서만)
    this.updateProximity(this.sync.getState());
  }

  // ── 게임 상태 반영 ─────────────────────────────────────────

  private applyGameState(s: GameState) {
    const myId = this.room?.selfId ?? '';
    const myRole = GameRules.roleOf(s, myId);

    // HIDING 진입 순간: 배정된 스폰 자리로 순간이동 (시작 시 겹침 방지)
    if (s.phase === 'HIDING' && this.lastPhase !== 'HIDING' && myId in s.spawns) {
      const pts = this.floor.spawnPoints ?? [this.floor.spawn];
      const pt = pts[s.spawns[myId] % pts.length];
      const w = this.tileToWorld(pt.col, pt.row);
      (this.player.body as Phaser.Physics.Arcade.Body).reset(w.x, w.y);
    }
    this.lastPhase = s.phase;

    // 숨는 시간에는 술래 조작 잠금
    const frozen = s.phase === 'HIDING' && myRole === 'SEEKER';
    this.player.setControlEnabled(!frozen);

    this.paint(this.player, myId, s, true);
    this.remotes.forEach((rp, id) => this.paint(rp, id, s, false));

    this.game.events.emit('hud', { floorName: this.floor.name });
  }

  /** 색: 잡힘=회색+반투명 / 내가 술래=빨강 / 그 외=기본(상대 캐릭터는 정체를 숨김) */
  private paint(
    sprite: LocalPlayer | RemotePlayer,
    id: string,
    s: GameState,
    isLocal: boolean,
  ) {
    const caught = id in s.alive && !s.alive[id];
    if (caught) {
      sprite.setTint(CAUGHT_TINT);
      sprite.setAlpha(0.5);
      return;
    }
    sprite.setAlpha(1);
    // 술래 표시는 "자기 자신에게만". 남에게는 빨갛게 보이지 않는다 → 근접 반응으로만 눈치챈다
    if (isLocal && s.seekerId === id) sprite.setTint(SEEKER_TINT);
    else sprite.setTint(NEUTRAL_TINT);
  }

  private updateProximity(s: GameState) {
    let level = 0;
    let kind: 'reaction' | 'danger' | 'none' = 'none';

    if (s.phase === 'PLAYING' && s.seekerId && this.room) {
      const myId = this.room.selfId;
      const me = this.netPositions.get(myId);

      if (me && myId === s.seekerId) {
        // 술래: 가장 가까운 살아있는 도망자까지 거리 → "반응"
        let min = Infinity;
        for (const hiderId of Object.keys(s.alive)) {
          if (!s.alive[hiderId]) continue;
          const p = this.netPositions.get(hiderId);
          if (!p || p.floor !== me.floor) continue;
          min = Math.min(min, Math.hypot(p.x - me.x, p.y - me.y));
        }
        level = GameRules.proximityLevel(min);
        kind = 'reaction';
      } else if (me && s.alive[myId]) {
        // 도망자: 술래까지 거리 → "위험"
        const sp = this.netPositions.get(s.seekerId);
        if (sp && sp.floor === me.floor) {
          level = GameRules.proximityLevel(Math.hypot(sp.x - me.x, sp.y - me.y));
          kind = 'danger';
        }
      }
    }

    if (level !== this.lastProximity) {
      this.lastProximity = level;
      this.game.events.emit('proximity', { level, kind });
    }

    // 위험(빨강) + 도망자면 화면을 살짝 흔든다
    if (kind === 'danger' && level === 2) {
      const now = this.time.now;
      if (now - this.lastShakeAt > 900) {
        this.lastShakeAt = now;
        this.cameras.main.shake(180, 0.006);
      }
    }
  }

  // ── 네트워크 배선 ─────────────────────────────────────────

  private connectRoom() {
    const room = this.room;
    if (!room) return;

    this.unsubscribes.push(
      room.on('snapshot', (s) => {
        this.netPositions.set(s.id, { x: s.x, y: s.y, floor: s.floor });
        this.applyRemote(s);
      }),
      room.on('peerLeave', (id) => {
        this.netPositions.delete(id);
        this.removeRemote(id);
      }),
    );

    if (this.sync) {
      this.unsubscribes.push(this.sync.onChange((s) => this.applyGameState(s)));
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribes.forEach((off) => off());
      this.unsubscribes = [];
      this.remotes.forEach((r) => r.destroy());
      this.remotes.clear();
      this.netPositions.clear();
    });
  }

  private applyRemote(s: PlayerSnapshot) {
    if (s.id === this.room?.selfId) return;

    if (s.floor !== this.floor.id) {
      this.removeRemote(s.id);
      return;
    }

    let rp = this.remotes.get(s.id);
    if (!rp) {
      rp = new RemotePlayer(this, s);
      this.remotes.set(s.id, rp);
      if (this.sync) this.paint(rp, s.id, this.sync.getState(), false);
    } else {
      rp.push(s);
    }
  }

  private removeRemote(id: string) {
    const rp = this.remotes.get(id);
    if (rp) {
      rp.destroy();
      this.remotes.delete(id);
    }
  }

  // ── 맵 ─────────────────────────────────────────────────────

  private buildFloor(floor: FloorMap) {
    this.walls = this.physics.add.staticGroup();

    floor.rows.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) {
        const ch = row[c];
        const { x, y } = this.tileToWorld(c, r);

        if (ch === '#') {
          this.walls.create(x, y, 'tile-wall').setDepth(1);
          continue;
        }

        this.add.image(x, y, 'tile-floor').setDepth(0);
        if (ch === 'D') this.add.image(x, y, 'tile-door').setDepth(1);
        if (ch === 'E') this.add.image(x, y, 'tile-elevator').setDepth(1);
      }
    });
  }

  private tileToWorld(col: number, row: number) {
    return {
      x: col * TILE_SIZE + TILE_SIZE / 2,
      y: row * TILE_SIZE + TILE_SIZE / 2,
    };
  }

  /** 내 스폰 위치 — 정렬된 접속자 명단에서 내 순번으로 후보 타일을 고르고 약간의 흔들림을 준다 */
  private pickSpawn() {
    const points = this.floor.spawnPoints ?? [this.floor.spawn];
    const ids = (this.room?.getRoster() ?? []).map((r) => r.id).sort();
    const idx = Math.max(0, ids.indexOf(this.room?.selfId ?? ''));
    const pt = points[idx % points.length];
    const base = this.tileToWorld(pt.col, pt.row);
    return {
      x: base.x + Phaser.Math.Between(-8, 8),
      y: base.y + Phaser.Math.Between(-8, 8),
    };
  }
}
