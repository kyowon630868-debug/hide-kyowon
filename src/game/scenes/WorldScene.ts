import Phaser from 'phaser';
import {
  ELEVATOR_REACH,
  ELEVATOR_TRAVEL_MS,
  HINT_COOLDOWN_MS,
  TILE_SIZE,
} from '../constants';
import { FLOOR_3 } from '../maps/floor3';
import { getFloor } from '../maps';
import { assertFloorMap, type FloorMap } from '../maps/types';
import { LocalPlayer } from '../entities/LocalPlayer';
import { RemotePlayer } from '../entities/RemotePlayer';
import type { Room } from '../../net/Room';
import type { GameSync } from '../../net/GameSync';
import { GameRules } from '../../game-logic/rules';
import type { GameState, HintKind, PlayerPos } from '../../game-logic/types';
import type { PlayerSnapshot } from '../../types/game';

const SEEKER_TINT = 0xff6b6b;
const CAUGHT_TINT = 0x8a8a8a;
const NEUTRAL_TINT = 0xffffff;

/**
 * WorldScene — 층 하나를 그리고, 내 캐릭터를 움직이고, 다른 플레이어를 보여주고,
 * 게임 규칙(GameSync)에 위치를 넘기고, 엘리베이터·힌트 요청을 처리한다.
 * 층 전환은 씬을 새로 만들지 않고 타일맵만 교체한다.
 */
export class WorldScene extends Phaser.Scene {
  private player!: LocalPlayer;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private tileLayer!: Phaser.GameObjects.Group;
  private floor: FloorMap = FLOOR_3;
  private elevatorTiles: Array<{ x: number; y: number }> = [];

  private room: Room | null = null;
  private sync: GameSync | null = null;

  private remotes = new Map<string, RemotePlayer>();
  private netPositions = new Map<string, PlayerPos>();
  private unsubscribes: Array<() => void> = [];

  private lastProximity = -1;
  private lastShakeAt = 0;
  private lastPhase = '';
  private nearElevator = false;
  private traveling = false;
  private lastHintAt = 0;

  constructor() {
    super('world');
  }

  create() {
    if (import.meta.env.DEV) assertFloorMap(this.floor);

    this.room = (this.registry.get('room') as Room | null) ?? null;
    this.sync = (this.registry.get('gameSync') as GameSync | null) ?? null;
    const myName = this.room?.selfName ?? '나';

    this.tileLayer = this.add.group();
    this.walls = this.physics.add.staticGroup();
    this.buildFloor(this.floor);

    const spawn = this.pickSpawn();
    this.player = new LocalPlayer(this, spawn.x, spawn.y, myName);
    this.physics.add.collider(this.player, this.walls);

    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
    this.cameras.main.setZoom(1.7);
    this.applyBounds();

    this.connectRoom();
    this.emitHud();
    if (this.sync) this.applyGameState(this.sync.getState());

    // React → 씬 명령 통로
    this.game.events.emit('api', {
      travelTo: (floorId: number) => this.travelTo(floorId),
      requestHint: (kind: HintKind) => this.requestHint(kind),
    });
  }

  update() {
    if (this.game.loop.frame < 12) this.emitHud();
    if (!this.room || !this.sync) return;

    const mySnap = { ...this.player.snapshot(), floor: this.floor.id };
    this.room.pushLocal(mySnap);
    this.netPositions.set(this.room.selfId, {
      x: this.player.x,
      y: this.player.y,
      floor: this.floor.id,
    });

    this.sync.frame(Object.fromEntries(this.netPositions), Date.now());
    this.updateProximity(this.sync.getState());
    this.updateElevatorProximity();
  }

  // ── 엘리베이터 ─────────────────────────────────────────────

  private updateElevatorProximity() {
    if (this.traveling) return;
    const near = this.elevatorTiles.some(
      (t) => Phaser.Math.Distance.Between(t.x, t.y, this.player.x, this.player.y) <= ELEVATOR_REACH,
    );
    if (near !== this.nearElevator) {
      this.nearElevator = near;
      this.game.events.emit('elevator', { near, floorId: this.floor.id });
    }
  }

  private travelTo(floorId: number) {
    if (this.traveling || floorId === this.floor.id || !this.nearElevator) return;
    if (!getFloor(floorId)) return;

    this.traveling = true;
    this.player.setControlEnabled(false);
    (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.game.events.emit('elevator-travel', { to: floorId });

    this.cameras.main.fadeOut(200);
    this.time.delayedCall(ELEVATOR_TRAVEL_MS, () => {
      this.changeFloor(floorId, true);
      this.player.setControlEnabled(true);
      this.traveling = false;
      this.nearElevator = false;
      this.cameras.main.fadeIn(200);
      this.game.events.emit('elevator-travel', null);
      this.game.events.emit('elevator', { near: true, floorId });
    });
  }

  private changeFloor(floorId: number, arriveAtElevator: boolean) {
    this.floor = getFloor(floorId);
    if (import.meta.env.DEV) assertFloorMap(this.floor);

    this.buildFloor(this.floor);
    this.applyBounds();

    const target = arriveAtElevator ? this.floor.elevator : this.floor.spawn;
    const w = this.tileToWorld(target.col, target.row);
    (this.player.body as Phaser.Physics.Arcade.Body).reset(w.x, w.y);
    this.cameras.main.centerOn(w.x, w.y);

    // 다른 층에 있던 상대 캐릭터는 모두 제거 (같은 층이면 스냅샷으로 다시 나타남)
    this.remotes.forEach((r) => r.destroy());
    this.remotes.clear();

    this.lastProximity = -1;
    this.emitHud();
  }

  // ── 힌트 ───────────────────────────────────────────────────

  private requestHint(kind: HintKind) {
    if (!this.room || !this.sync) return;
    const s = this.sync.getState();
    if (s.phase !== 'PLAYING' || s.seekerId !== this.room.selfId) return;

    const now = Date.now();
    if (now - this.lastHintAt < HINT_COOLDOWN_MS) return;
    this.lastHintAt = now;

    const result = GameRules.computeHint(kind, s, Object.fromEntries(this.netPositions));
    this.game.events.emit('hintResult', { result, cooldownUntil: now + HINT_COOLDOWN_MS });
    this.sync.reportHintUsed(kind);
  }

  // ── 게임 상태 반영 ─────────────────────────────────────────

  private applyGameState(s: GameState) {
    const myId = this.room?.selfId ?? '';
    const myRole = GameRules.roleOf(s, myId);

    if (s.phase === 'HIDING' && this.lastPhase !== 'HIDING' && myId in s.spawns) {
      const pts = this.floor.spawnPoints ?? [this.floor.spawn];
      const pt = pts[s.spawns[myId] % pts.length];
      const w = this.tileToWorld(pt.col, pt.row);
      (this.player.body as Phaser.Physics.Arcade.Body).reset(w.x, w.y);
    }
    this.lastPhase = s.phase;

    const frozen = s.phase === 'HIDING' && myRole === 'SEEKER';
    if (!this.traveling) this.player.setControlEnabled(!frozen);

    this.paint(this.player, myId, s, true);
    this.remotes.forEach((rp, id) => this.paint(rp, id, s, false));
    this.emitHud();
  }

  private paint(sprite: LocalPlayer | RemotePlayer, id: string, s: GameState, isLocal: boolean) {
    const caught = id in s.alive && !s.alive[id];
    if (caught) {
      sprite.setTint(CAUGHT_TINT);
      sprite.setAlpha(0.5);
      return;
    }
    sprite.setAlpha(1);
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
    this.tileLayer.clear(true, true);
    this.walls.clear(true, true);
    this.elevatorTiles = [];

    const tint = floor.floorTint ?? 0xffffff;

    floor.rows.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) {
        const ch = row[c];
        const { x, y } = this.tileToWorld(c, r);

        if (ch === '#') {
          this.walls.create(x, y, 'tile-wall').setDepth(1);
          continue;
        }

        this.tileLayer.add(this.add.image(x, y, 'tile-floor').setDepth(0).setTint(tint));
        if (ch === 'D') this.tileLayer.add(this.add.image(x, y, 'tile-door').setDepth(1));
        if (ch === 'E') {
          this.tileLayer.add(this.add.image(x, y, 'tile-elevator').setDepth(1));
          this.elevatorTiles.push({ x, y });
        }
      }
    });
  }

  private applyBounds() {
    const w = this.floor.rows[0].length * TILE_SIZE;
    const h = this.floor.rows.length * TILE_SIZE;
    this.physics.world.setBounds(0, 0, w, h);
    this.cameras.main.setBounds(0, 0, w, h);
  }

  private tileToWorld(col: number, row: number) {
    return {
      x: col * TILE_SIZE + TILE_SIZE / 2,
      y: row * TILE_SIZE + TILE_SIZE / 2,
    };
  }

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

  private emitHud() {
    this.game.events.emit('hud', {
      floorName: this.floor.name,
      floorId: this.floor.id,
    });
  }
}
