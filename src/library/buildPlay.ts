import { simulate } from '../board/rules';
import { Action, MoveType, Play, Vec } from '../board/types';
import { emptyScene, newId } from '../board/usePlay';
import { playersFor, Spots } from './formations';

// A tiny authoring language for the built-in plays, so each one reads like a
// coach's notes: who moves where, who passes to whom, who shoots.

type PlayerId = 'o1' | 'o2' | 'o3' | 'o4' | 'o5';

type Step =
  | { kind: 'move'; type: MoveType; player: PlayerId; via: Vec[] }
  | { kind: 'pass'; from: PlayerId; to: PlayerId }
  | { kind: 'shot'; player: PlayerId };

const xy = (x: number, y: number): Vec => ({ x, y });

// Each takes the points the player runs through (the start is where they stand).
export const cut = (player: PlayerId, ...via: [number, number][]): Step => ({ kind: 'move', type: 'cut', player, via: via.map(([x, y]) => xy(x, y)) });
export const dribble = (player: PlayerId, ...via: [number, number][]): Step => ({ kind: 'move', type: 'dribble', player, via: via.map(([x, y]) => xy(x, y)) });
export const pick = (player: PlayerId, ...via: [number, number][]): Step => ({ kind: 'move', type: 'pick', player, via: via.map(([x, y]) => xy(x, y)) });
export const pass = (from: PlayerId, to: PlayerId): Step => ({ kind: 'pass', from, to });
export const shoot = (player: PlayerId): Step => ({ kind: 'shot', player });

// Smooth curve through the control points (Catmull-Rom), sampled about every 0.7 ft
// so authored paths look like hand-drawn ones.
function curve(points: Vec[]): Vec[] {
  if (points.length < 2) return points;
  const p = [points[0], ...points, points[points.length - 1]];
  const out: Vec[] = [points[0]];
  for (let i = 1; i < p.length - 2; i++) {
    const [p0, p1, p2, p3] = [p[i - 1], p[i], p[i + 1], p[i + 2]];
    const steps = Math.max(2, Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / 0.7));
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  return out;
}

// Builds a Play from starting spots and a list of scenes. Paths start wherever
// the player stands when that scene begins, so later scenes chain naturally.
// `cast` keeps only some of the players (drills often use two or three).
export function buildPlay(spots: Spots, scenes: Step[][], cast?: string[]): Play {
  const players = playersFor(spots).filter((p) => !cast || cast.includes(p.id));
  let play: Play = { players, ballHolderId: 'o1', scenes: [] };
  for (const steps of scenes) {
    const scene = emptyScene();
    const withScene: Play = { ...play, scenes: [...play.scenes, scene] };
    const start = simulate(withScene)[withScene.scenes.length - 1].start;
    const actions: Action[] = steps.map((s) => {
      if (s.kind === 'move') return { id: newId('a'), type: s.type, playerId: s.player, points: curve([start[s.player], ...s.via]) };
      if (s.kind === 'pass') return { id: newId('a'), type: 'pass', playerId: s.from, toId: s.to };
      return { id: newId('a'), type: 'shot', playerId: s.player };
    });
    play = { ...withScene, scenes: [...play.scenes, { ...scene, actions }] };
  }
  return play;
}
