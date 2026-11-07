import { BALL_OFFSET, basketFor } from '../court/geometry';
import { pathLength, pointAt, trim } from './paths';
import { passOf, Positions, SceneFrame, shotOf } from './rules';
import { ActionType, MoveAction, MoveType, Play, Vec } from './types';

// Feet per second.
const SPEED: Record<MoveType, number> = { cut: 11, dribble: 9, pick: 7 };
const PASS_SPEED = 30;
const MIN_MOVE_TIME = 0.6;
const MIN_PASS_TIME = 0.35;
const SHOT_TIME = 1.1;
const SHOT_GATHER = 0.25;
const MAKE_TIME = 0.6;
// Pause at the start and end of each scene so the steps read clearly.
const LEAD_IN = 0.4;
const HOLD = 0.8;
const BOUNCES_PER_SECOND = 3;

export type MoveTrack = { playerId: string; type: MoveType; points: Vec[]; length: number; t0: number; t1: number };
export type PassTrack = { fromId: string; toId: string; from: Vec; to: Vec; t0: number; t1: number };
export type ShotTrack = { playerId: string; from: Vec; t0: number; t1: number };

// Times are seconds from the start of the scene.
export type SceneTrack = {
  start: number;
  duration: number;
  frame: SceneFrame;
  moves: MoveTrack[];
  pass?: PassTrack;
  shot?: ShotTrack;
};

export type Timeline = { scenes: SceneTrack[]; duration: number };

const isMove = (type: ActionType): type is MoveType => type === 'cut' || type === 'dribble' || type === 'pick';

export function buildTimeline(play: Play, frames: SceneFrame[]): Timeline {
  let clock = 0;
  const scenes = frames.map((frame, i): SceneTrack => {
    const actions = play.scenes[i].actions;

    const moves: MoveTrack[] = frame.actions
      .filter((r) => isMove(r.action.type))
      .map((r) => {
        const a = r.action as MoveAction;
        const length = pathLength(r.points);
        const time = Math.max(MIN_MOVE_TIME, length / SPEED[a.type]);
        return { playerId: a.playerId, type: a.type, points: r.points, length, t0: LEAD_IN, t1: LEAD_IN + time };
      });
    const moveOf = (id: string) => moves.find((m) => m.playerId === id);

    let pass: PassTrack | undefined;
    const passAction = passOf(actions);
    if (passAction) {
      const [from, to] = frame.actions.find((r) => r.action === passAction)!.points;
      const passer = moveOf(passAction.playerId);
      const receiver = moveOf(passAction.toId);
      const time = Math.max(MIN_PASS_TIME, pathLength([from, to]) / PASS_SPEED);
      // Dribble first, then pass; a lead pass lands as the cutter arrives.
      const ready = passer?.type === 'dribble' ? passer.t1 : LEAD_IN;
      const t0 = Math.max(ready, receiver ? receiver.t1 - time : 0);
      pass = { fromId: passAction.playerId, toId: passAction.toId, from, to, t0, t1: t0 + time };
      // Pass-and-cut / pass-and-screen: the passer moves once the ball is out.
      if (passer && passer.type !== 'dribble') {
        const moveTime = passer.t1 - passer.t0;
        passer.t0 = t0;
        passer.t1 = t0 + moveTime;
      }
    }

    let shot: ShotTrack | undefined;
    const shotAction = shotOf(actions);
    if (shotAction) {
      const id = shotAction.playerId;
      const ready = Math.max(LEAD_IN, moveOf(id)?.t1 ?? 0, pass?.toId === id ? pass.t1 : 0);
      const t0 = ready + SHOT_GATHER;
      shot = { playerId: id, from: frame.end[id], t0, t1: t0 + SHOT_TIME };
    }

    const busyUntil = Math.max(LEAD_IN, ...moves.map((m) => m.t1), pass?.t1 ?? 0, shot ? shot.t1 + MAKE_TIME : 0);
    const track: SceneTrack = {
      start: clock,
      duration: busyUntil + HOLD,
      frame,
      moves,
      pass,
      shot,
    };
    clock += track.duration;
    return track;
  });
  return { scenes, duration: clock };
}

export type Trail = { type: ActionType; points: Vec[]; toPlayer?: boolean };

export type Snapshot = {
  sceneIndex: number;
  positions: Positions;
  // Players currently running, dribbling or screening.
  moving: string[];
  // `scale` fakes the ball's height when seen from above.
  ball: { pos: Vec; scale: number; opacity: number };
  trails: Trail[];
  // 0–1 progress of the "make" ring at the rim, or null.
  make: number | null;
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const progress = (t: number, t0: number, t1: number) => (t1 <= t0 ? (t >= t1 ? 1 : 0) : clamp01((t - t0) / (t1 - t0)));
const easeInOut = (p: number) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);
const lerp = (a: Vec, b: Vec, p: number): Vec => ({ x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p });
const withOffset = (p: Vec): Vec => ({ x: p.x + BALL_OFFSET.x, y: p.y + BALL_OFFSET.y });

export function sceneIndexAt(timeline: Timeline, time: number) {
  const i = timeline.scenes.findIndex((s) => time < s.start + s.duration);
  return i === -1 ? timeline.scenes.length - 1 : i;
}

export function sample(play: Play, timeline: Timeline, time: number): Snapshot {
  const sceneIndex = sceneIndexAt(timeline, time);
  const s = timeline.scenes[sceneIndex];
  const t = time - s.start;

  const positions: Positions = { ...s.frame.start };
  const moving: string[] = [];
  const trails: Trail[] = [];

  for (const m of s.moves) {
    const q = easeInOut(progress(t, m.t0, m.t1));
    positions[m.playerId] = pointAt(m.points, q * m.length);
    if (q > 0 && q < 1) moving.push(m.playerId);
    if (q > 0) {
      const drawn = trim(m.points, 0, m.length * (1 - q));
      if (drawn.length > 1) trails.push({ type: m.type, points: drawn });
    }
  }

  let holder = s.frame.holderStart;
  let ball = { pos: withOffset(positions[holder]), scale: 1, opacity: 1 };
  let make: number | null = null;

  if (s.pass) {
    const { from, to, t0, t1, toId } = s.pass;
    if (t >= t1) {
      holder = toId;
      ball = { pos: withOffset(positions[holder]), scale: 1, opacity: 1 };
      trails.push({ type: 'pass', points: [from, to], toPlayer: true });
    } else if (t >= t0) {
      const q = progress(t, t0, t1);
      ball = { pos: lerp(withOffset(from), withOffset(to), q), scale: 1, opacity: 1 };
      trails.push({ type: 'pass', points: [from, lerp(from, to, q)] });
    }
  }

  // Bounce the ball while its holder dribbles.
  const dribbling = s.moves.some((m) => m.type === 'dribble' && m.playerId === holder && moving.includes(holder));
  if (dribbling) ball.scale = 1 - 0.3 * Math.abs(Math.sin(t * Math.PI * BOUNCES_PER_SECOND));

  if (s.shot && t >= s.shot.t0) {
    const { from, t0, t1 } = s.shot;
    const basket = basketFor(from);
    const q = progress(t, t0, t1);
    // Seen from above, the arc shows up as the ball growing toward its apex.
    ball = { pos: lerp(withOffset(from), basket, q), scale: 1 + 0.9 * Math.sin(Math.PI * q), opacity: 1 };
    trails.push({ type: 'shot', points: [from, lerp(from, basket, q)] });
    if (t >= t1) {
      make = progress(t, t1, t1 + MAKE_TIME);
      ball = { pos: basket, scale: 0.8, opacity: 1 - make };
    }
  }

  return { sceneIndex, positions, moving, ball, trails, make };
}
