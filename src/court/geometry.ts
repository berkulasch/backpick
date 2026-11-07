import { Vec } from '../board/types';

export const COURT = { width: 50, length: 47 };
export const FULL_LENGTH = COURT.length * 2;
export const BASKET: Vec = { x: 25, y: 5.25 };
export const FAR_BASKET: Vec = { x: 25, y: FULL_LENGTH - BASKET.y };

export type CourtMode = 'half' | 'full';
export const courtLength = (mode: CourtMode | undefined) => (mode === 'full' ? FULL_LENGTH : COURT.length);

// The basket a shooter at `from` attacks: the near one on a full court.
export const basketFor = (from: Vec): Vec => (from.y > COURT.length ? FAR_BASKET : BASKET);

// Reflect a spot in the far half onto the near half, so one set of three-point
// maths covers both ends.
export const toNearHalf = (p: Vec): Vec => (p.y > COURT.length ? { x: COURT.width - p.x, y: FULL_LENGTH - p.y } : p);
export const THREE_RADIUS = 23.75;
export const THREE_CORNER_X = 22;
// Where the straight corner three-point lines meet the arc.
export const THREE_CORNER_Y = BASKET.y + Math.sqrt(THREE_RADIUS ** 2 - THREE_CORNER_X ** 2);

export const PLAYER_R = 1.6;
export const PLAYER_HIT_R = 2.8;
export const BALL_R = 0.7;
export const BALL_OFFSET: Vec = { x: 1.25, y: -1.25 };

export const clampToCourt = (p: Vec, length: number = COURT.length): Vec => ({
  x: Math.min(COURT.width, Math.max(0, p.x)),
  y: Math.min(length, Math.max(0, p.y)),
});
