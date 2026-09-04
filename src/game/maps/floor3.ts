import type { FloorMap } from './types';

/**
 * 3층 (34 x 22).
 *   사무실(.) · 회의실(=) · 복도(,) · 화장실(~) · 탕비실(%) · 엘리베이터(E) · 문(D) · 칸막이(h)
 * 각 줄은 정확히 34글자.
 */
export const FLOOR_3: FloorMap = {
  id: 3,
  name: '3층',
  spawn: { col: 6, row: 4 },
  elevator: { col: 31, row: 18 },
  spawnPoints: [
    { col: 3, row: 2 },
    { col: 10, row: 2 },
    { col: 16, row: 6 },
    { col: 6, row: 7 },
    { col: 13, row: 4 },
  ],
  windows: [{ col: 1, row: 0, tilesWide: 19 }],
  rows: [
    '##################################', // 0
    '#...................#============#', // 1
    '#...................#============#', // 2
    '#...................#============#', // 3
    '#...................D============#', // 4
    '#...................#============#', // 5
    '#...................#============#', // 6
    '#...................#============#', // 7
    '#...................#============#', // 8
    '#####DD#######DD##########DD######', // 9
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#', // 10
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#', // 11
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#', // 12
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#', // 13
    '#####DD#########DD#########DD#####', // 14
    '#~~~~~~~~~~~#%%%%%%%%%#,,,,,,,,,,#', // 15
    '#~~~~~~~~~~~D%%%%%%%%%D,,,,,,,,EE#', // 16
    '#~~~~~~~~~~~D%%%%%%%%%D,,,,,,,,EE#', // 17
    '#h~~h~~h~~h~#%%%%%%%%%#,,,,,,,,,,#', // 18
    '#h~~h~~h~~h~#%%%%%%%%%#,,,,,,,,,,#', // 19
    '#h~~h~~h~~h~#%%%%%%%%%#,,,,,,,,,,#', // 20
    '##################################', // 21
  ],
  props: [
    // 사무실 책상 (2줄)
    { kind: 'desk', col: 4, row: 3, solid: true },
    { kind: 'desk', col: 10, row: 3, solid: true },
    { kind: 'desk', col: 16, row: 3, solid: true },
    { kind: 'desk', col: 4, row: 7, solid: true },
    { kind: 'desk', col: 10, row: 7, solid: true },
    { kind: 'desk', col: 16, row: 7, solid: true },
    { kind: 'chair', col: 4, row: 4 },
    { kind: 'chair', col: 10, row: 4 },
    { kind: 'chair', col: 16, row: 4 },
    { kind: 'chair', col: 4, row: 8 },
    { kind: 'chair', col: 10, row: 8 },
    { kind: 'chair', col: 16, row: 8 },
    { kind: 'plant', col: 1, row: 1, solid: true },
    { kind: 'cabinet', col: 18, row: 1, solid: true },
    { kind: 'printer', col: 13, row: 1, solid: true },
    { kind: 'plant', col: 18, row: 8, solid: true },
    // 회의실
    { kind: 'rug', col: 26, row: 4 },
    { kind: 'meeting-table', col: 26, row: 4, solid: true },
    { kind: 'chair', col: 23, row: 3 },
    { kind: 'chair', col: 26, row: 2 },
    { kind: 'chair', col: 29, row: 3 },
    { kind: 'chair', col: 23, row: 6 },
    { kind: 'chair', col: 26, row: 7 },
    { kind: 'chair', col: 29, row: 6 },
    { kind: 'whiteboard', col: 26, row: 1 },
    { kind: 'plant', col: 31, row: 8, solid: true },
    // 복도
    { kind: 'plant', col: 2, row: 10, solid: true },
    { kind: 'plant', col: 17, row: 10, solid: true },
    { kind: 'plant', col: 31, row: 13, solid: true },
    { kind: 'plant', col: 9, row: 13, solid: true },
    // 화장실
    { kind: 'sink', col: 3, row: 15 },
    { kind: 'sink', col: 6, row: 15 },
    { kind: 'sink', col: 9, row: 15 },
    { kind: 'toilet', col: 2, row: 19 },
    { kind: 'toilet', col: 5, row: 19 },
    { kind: 'toilet', col: 8, row: 19 },
    // 탕비실
    { kind: 'water-cooler', col: 14, row: 16, solid: true },
    { kind: 'cabinet', col: 20, row: 15, solid: true },
    { kind: 'chair', col: 17, row: 18 },
    { kind: 'plant', col: 13, row: 20, solid: true },
    // 엘리베이터 홀
    { kind: 'plant', col: 23, row: 15, solid: true },
    { kind: 'plant', col: 23, row: 20, solid: true },
  ],
};
