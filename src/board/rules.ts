import { basketFor, BASKET, THREE_CORNER_X, THREE_CORNER_Y, THREE_RADIUS, toNearHalf } from '../court/geometry';
import { dist } from './paths';
import { Action, ActionType, MoveAction, PassAction, Play, ShotAction, Vec } from './types';

export type Positions = Record<string, Vec>;

export type ResolvedAction = { action: Action; points: Vec[] };

// Where everyone is at the start and end of a scene, and the drawn geometry.
export type SceneFrame = {
  start: Positions;
  end: Positions;
  holderStart: string;
  holderEnd: string;
  actions: ResolvedAction[];
};

export type ActionDraft = { type: ActionType; playerId: string; toId?: string };

const isMove = (a: Action): a is MoveAction => a.type === 'dribble' || a.type === 'cut' || a.type === 'pick';

export const movementOf = (actions: Action[], playerId: string) =>
  actions.find((a): a is MoveAction => isMove(a) && a.playerId === playerId);

export const passOf = (actions: Action[]) => actions.find((a): a is PassAction => a.type === 'pass');

export const shotOf = (actions: Action[]) => actions.find((a): a is ShotAction => a.type === 'shot');

export function shotValue(spot: Vec): 2 | 3 {
  const from = toNearHalf(spot);
  if (from.y <= THREE_CORNER_Y) return Math.abs(from.x - BASKET.x) >= THREE_CORNER_X ? 3 : 2;
  return dist(from, BASKET) >= THREE_RADIUS ? 3 : 2;
}

// Shift a drawn path so it starts where the player actually stands.
const anchor = (points: Vec[], at: Vec): Vec[] => {
  const dx = at.x - points[0].x;
  const dy = at.y - points[0].y;
  return points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
};

export function simulate(play: Play): SceneFrame[] {
  const frames: SceneFrame[] = [];
  let positions: Positions = Object.fromEntries(play.players.map((p) => [p.id, p.pos]));
  let holder = play.ballHolderId;

  for (const scene of play.scenes) {
    const start = { ...positions };
    const end = { ...start };
    const actions: ResolvedAction[] = [];

    for (const a of scene.actions) {
      if (!isMove(a)) continue;
      const points = anchor(a.points, start[a.playerId]);
      end[a.playerId] = points[points.length - 1];
      actions.push({ action: a, points });
    }

    // A dribbler passes from where the dribble ends; a cutter catches where the cut ends.
    let holderEnd = holder;
    const pass = passOf(scene.actions);
    if (pass) {
      const passerMove = movementOf(scene.actions, pass.playerId);
      const origin = passerMove?.type === 'dribble' ? end[pass.playerId] : start[pass.playerId];
      actions.push({ action: pass, points: [origin, end[pass.toId]] });
      holderEnd = pass.toId;
    }

    const shot = shotOf(scene.actions);
    if (shot) actions.push({ action: shot, points: [end[shot.playerId], basketFor(end[shot.playerId])] });

    frames.push({ start, end, holderStart: holder, holderEnd, actions });
    positions = end;
    holder = holderEnd;
  }
  return frames;
}

const MOVE_PHRASE = { dribble: 'dribble', cut: 'cut', pick: 'set a pick' };

// Returns why the action isn't allowed, or null if it is.
// `existing` are the actions already in the scene, in order.
export function checkAction(
  play: Play,
  holder: string,
  existing: Action[],
  draft: ActionDraft,
  isLastScene: boolean,
): string | null {
  const label = (id: string) => play.players.find((p) => p.id === id)?.label ?? '?';
  const player = play.players.find((p) => p.id === draft.playerId);
  if (!player) return 'Start the line on a player.';

  const name = player.label;
  const hasBall = holder === draft.playerId;
  const pass = passOf(existing);
  const passed = pass?.playerId === draft.playerId;

  const shot = shotOf(existing);
  if (shot) return `${label(shot.playerId)} already shot — the play is over.`;

  if (draft.type === 'shot') {
    if (!isLastScene) return 'A shot ends the play. Shoot in the last scene, or delete the scenes after this one.';
    const withBall = pass?.toId ?? holder;
    if (draft.playerId !== withBall) return `Only the player with the ball (${label(withBall)}) can shoot.`;
    return null;
  }

  if (draft.type === 'pass') {
    if (!hasBall) return `Only the ball handler (${label(holder)}) can pass.`;
    if (pass) return 'The ball was already passed in this scene. Add a new scene for the next pass.';
    if (draft.toId !== undefined) {
      const to = play.players.find((p) => p.id === draft.toId);
      if (!to || to.id === draft.playerId) return 'Release the pass on a teammate.';
    }
    return null;
  }

  const move = movementOf(existing, draft.playerId);
  if (move) return `${name} already has a ${move.type} in this scene. One move per player — add a new scene.`;

  if (draft.type === 'dribble') {
    if (pass?.toId === draft.playerId) return `${name} catches the ball in this scene — dribble in the next scene.`;
    if (passed) return `${name} already passed — no ball to dribble.`;
    if (!hasBall) return `Only the ball handler (${label(holder)}) can dribble.`;
    return null;
  }

  if (hasBall && !passed) return `${name} has the ball — pass first, then ${MOVE_PHRASE[draft.type]}.`;
  return null;
}

// Drop actions that no longer make sense after an edit (e.g. a pass was
// erased, so the next scene's dribbler no longer has the ball).
export function prune(play: Play): { play: Play; removed: number } {
  let removed = 0;
  let holder = play.ballHolderId;
  const scenes = play.scenes.map((scene, i) => {
    const kept: Action[] = [];
    for (const a of scene.actions) {
      if (checkAction(play, holder, kept, a, i === play.scenes.length - 1) === null) kept.push(a);
      else removed++;
    }
    holder = passOf(kept)?.toId ?? holder;
    return kept.length === scene.actions.length ? scene : { ...scene, actions: kept };
  });
  return { play: removed ? { ...play, scenes } : play, removed };
}

export function describeScene(play: Play, actions: Action[], frame: SceneFrame): string {
  const label = (id: string) => play.players.find((p) => p.id === id)?.label ?? '?';
  return actions
    .map((a) => {
      switch (a.type) {
        case 'pass':
          return `${label(a.playerId)} passes to ${label(a.toId)}`;
        case 'dribble':
          return `${label(a.playerId)} dribbles`;
        case 'cut':
          return `${label(a.playerId)} cuts`;
        case 'pick':
          return `${label(a.playerId)} sets a pick`;
        case 'shot':
          return `${label(a.playerId)} shoots a ${shotValue(frame.end[a.playerId])}`;
      }
    })
    .join(' · ');
}

// "1 shoots a 3", or null while the play doesn't end in a shot yet.
export function playResult(play: Play, frames: SceneFrame[]): string | null {
  const last = play.scenes.length - 1;
  const shot = shotOf(play.scenes[last].actions);
  if (!shot) return null;
  const label = play.players.find((p) => p.id === shot.playerId)?.label ?? '?';
  return `${label} shoots a ${shotValue(frames[last].end[shot.playerId])}`;
}
