/** 건물 층 번호. 지금은 3층만 구현, 1·5층은 Phase 7에서 추가 */
export type FloorId = 1 | 3 | 5;

/** 타일 문자 의미
 *  '#' 벽 · 'h' 낮은 칸막이(둘 다 충돌)
 *  '.' 사무실 · ',' 복도 · '=' 회의실 · '~' 화장실 · '%' 탕비실 (이동 가능)
 *  'D' 문 · 'E' 엘리베이터 (이동 가능)
 */
export type TileChar = '#' | 'h' | '.' | ',' | '=' | '~' | '%' | 'D' | 'E';

/** 맵에 배치하는 가구/소품 */
export interface Prop {
  /** 에셋 키 (FURNITURE_KEYS 중 하나) */
  kind: string;
  col: number;
  row: number;
  /** 충돌체로도 쓸지 */
  solid?: boolean;
}

export interface FloorMap {
  id: FloorId;
  /** HUD에 표시할 이름 */
  name: string;
  /** 각 문자열이 한 줄. 모든 줄의 길이가 같아야 한다. */
  rows: string[];
  /** 이 층에 처음 들어올 때 서는 타일 좌표 (열, 행) */
  spawn: { col: number; row: number };
  /** 엘리베이터에서 내렸을 때 서는 타일 (열, 행) */
  elevator: { col: number; row: number };
  /** 게임 시작 시 플레이어를 흩어놓을 후보 타일들 (없으면 spawn 사용) */
  spawnPoints?: Array<{ col: number; row: number }>;
  /** 바닥 색조 (예전 방식, 단색 층 1·5에서만 사용) */
  floorTint?: number;
  /** 창문 (남산 야경). 벽 위에 장식으로 얹는다 — 충돌 없음 */
  windows?: Array<{ col: number; row: number; tilesWide: number }>;
  /** 가구/소품 */
  props?: Prop[];
}

export const isWall = (ch: string) => ch === '#';

/** 개발 중 맵 오타 검증: 모든 줄 길이가 같은지, 스폰 지점이 바닥인지 */
export function assertFloorMap(floor: FloorMap): void {
  const width = floor.rows[0]?.length ?? 0;
  floor.rows.forEach((row, i) => {
    if (row.length !== width) {
      throw new Error(
        `[${floor.name}] ${i}번째 줄 길이가 ${row.length} (기대값 ${width})`,
      );
    }
  });
  const spawnCh = floor.rows[floor.spawn.row]?.[floor.spawn.col];
  if (spawnCh === undefined || spawnCh === '#') {
    throw new Error(`[${floor.name}] 스폰 지점(${floor.spawn.col},${floor.spawn.row})이 벽이거나 범위 밖`);
  }
  const elevCh = floor.rows[floor.elevator.row]?.[floor.elevator.col];
  if (elevCh === undefined || elevCh === '#') {
    throw new Error(`[${floor.name}] 엘리베이터 도착 지점(${floor.elevator.col},${floor.elevator.row})이 벽이거나 범위 밖`);
  }
  if (!floor.rows.some((r) => r.includes('E'))) {
    throw new Error(`[${floor.name}] 엘리베이터 타일(E) 이 없음`);
  }
}
