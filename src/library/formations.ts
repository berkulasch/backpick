import { Player, Vec } from '../board/types';

// Offense spots for 1–5, in court feet. 1 always starts with the ball.
export type Spots = [Vec, Vec, Vec, Vec, Vec];

export type FormationId = '5-out' | '4-out-1-in' | 'horns' | '1-4-high' | 'box' | 'stack';

// Corner spots sit just outside x = 3 / 47 so a corner shot counts as a three.
export const FORMATIONS: { id: FormationId; label: string; spots: Spots }[] = [
  {
    id: '4-out-1-in',
    label: '4-out 1-in',
    spots: [
      { x: 25, y: 31 },
      { x: 41, y: 23 },
      { x: 9, y: 23 },
      { x: 46, y: 5 },
      { x: 32, y: 10 },
    ],
  },
  {
    id: '5-out',
    label: '5-out',
    spots: [
      { x: 25, y: 31 },
      { x: 42, y: 21 },
      { x: 8, y: 21 },
      { x: 47.5, y: 4 },
      { x: 2.5, y: 4 },
    ],
  },
  {
    id: 'horns',
    label: 'Horns',
    spots: [
      { x: 25, y: 32 },
      { x: 47.5, y: 4 },
      { x: 2.5, y: 4 },
      { x: 32, y: 19 },
      { x: 18, y: 19 },
    ],
  },
  {
    id: '1-4-high',
    label: '1-4 high',
    spots: [
      { x: 25, y: 32 },
      { x: 43, y: 20 },
      { x: 7, y: 20 },
      { x: 32, y: 19 },
      { x: 18, y: 19 },
    ],
  },
  {
    id: 'box',
    label: 'Box',
    spots: [
      { x: 25, y: 33 },
      { x: 33, y: 8 },
      { x: 17, y: 8 },
      { x: 31, y: 19 },
      { x: 19, y: 19 },
    ],
  },
  {
    id: 'stack',
    label: 'Stack',
    spots: [
      { x: 25, y: 32 },
      { x: 34, y: 13 },
      { x: 16, y: 13 },
      { x: 34, y: 8 },
      { x: 16, y: 8 },
    ],
  },
];

export const formationSpots = (id: FormationId) => FORMATIONS.find((f) => f.id === id)!.spots;

// Offense 1–5 on the given spots. Plays have no defenders.
export function playersFor(spots: Spots): Player[] {
  return spots.map((pos, i) => ({ id: `o${i + 1}`, label: `${i + 1}`, pos }));
}
