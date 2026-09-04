import type { FloorId, FloorMap } from './types';
import { FLOOR_1 } from './floor1';
import { FLOOR_3 } from './floor3';
import { FLOOR_5 } from './floor5';

export const FLOORS: Record<FloorId, FloorMap> = {
  1: FLOOR_1,
  3: FLOOR_3,
  5: FLOOR_5,
};

/** 엘리베이터가 이동할 수 있는 층 목록 (표시 순서) */
export const FLOOR_ORDER: FloorId[] = [1, 3, 5];

export function getFloor(id: number): FloorMap {
  return FLOORS[id as FloorId] ?? FLOOR_3;
}
