/* eslint-disable react-hooks/refs -- the refs here are only read inside gesture callbacks, which run on touch events, never during render. */
import { useMemo, useRef, useState } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { Circle, G, Rect, Text } from 'react-native-svg';

import { BALL_OFFSET, BALL_R, clampToCourt, courtLength, PLAYER_HIT_R, PLAYER_R } from '../court/geometry';
import { ActionShape } from './ActionShape';
import { BallToken, BoardSurface, Box, PAD } from './BoardSurface';
import { dist, distanceToPolyline, pathLength } from './paths';
import { PlayerToken } from './PlayerToken';
import { checkAction, movementOf, shotValue } from './rules';
import { ActionType, Play, Player, Tool, Vec } from './types';
import { newId, PlayController } from './usePlay';

const MIN_POINT_GAP = 0.5;
const MIN_ACTION_LENGTH = 1.5;
const ERASE_RADIUS = 1.8;
const SNAP_RADIUS = 3.5;
// Closer than this and two tokens would hide each other.
const MIN_SPACING = PLAYER_R * 1.2;

type Drag =
  | { kind: 'player'; id: string; grab: Vec; before: Play; moved: boolean }
  | { kind: 'ball'; pos: Vec | null }
  | { kind: 'draw'; type: ActionType; playerId: string; points: Vec[] };

type Props = {
  controller: PlayController;
  tool: Tool;
  // Explains why something can't be done; null clears the message.
  onNotice: (text: string | null) => void;
  box?: Box;
};

type Spot = { id: string; pos: Vec };

function nearest<T extends Spot>(spots: T[], p: Vec, radius: number): T | undefined {
  let best: T | undefined;
  let bestD = radius;
  for (const s of spots) {
    const d = dist(s.pos, p);
    if (d < bestD) {
      best = s;
      bestD = d;
    }
  }
  return best;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function Whiteboard({ controller, tool, onNotice, box }: Props) {
  const { play, frame, scene, sceneIndex, commit, preview, checkpoint, updateScene } = controller;
  const [draft, setDraft] = useState<{ type: ActionType; points: Vec[] } | null>(null);
  const [ballDrag, setBallDrag] = useState<Vec | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const drag = useRef<Drag | null>(null);
  const length = courtLength(play.court);

  const tokens: Player[] = play.players.map((p) => ({ ...p, pos: frame.start[p.id] }));
  const offense = tokens;
  const label = (id: string) => play.players.find((p) => p.id === id)?.label ?? '?';

  const holder = frame.holderStart;
  const isLastScene = sceneIndex === play.scenes.length - 1;
  const holderMove = movementOf(scene.actions, holder);
  // A dribbler passes from where their dribble ends.
  const passOrigin = holderMove?.type === 'dribble' ? frame.end[holder] : frame.start[holder];
  const ballAt: Vec = { x: frame.start[holder].x + BALL_OFFSET.x, y: frame.start[holder].y + BALL_OFFSET.y };

  const addAction = (next: Play) => {
    const removed = commit(next);
    onNotice(removed ? `Removed ${plural(removed, 'later action')} that no longer made sense.` : null);
  };

  // Gesture callbacks read the latest render's values through this ref,
  // so the gesture object itself can be created once.
  const handlers = useRef({ begin: (_p: Vec) => {}, move: (_p: Vec) => {}, end: () => {} });
  handlers.current = {
    begin(p) {
      if (tool === 'erase') {
        let hit: string | undefined;
        let hitD = ERASE_RADIUS;
        for (const r of frame.actions) {
          const d = distanceToPolyline(p, r.points);
          if (d < hitD) {
            hit = r.action.id;
            hitD = d;
          }
        }
        if (hit) addAction(updateScene(play, sceneIndex, (s) => ({ ...s, actions: s.actions.filter((a) => a.id !== hit) })));
        return;
      }

      if (tool === 'move') {
        if (dist(p, ballAt) < BALL_R + 0.9) {
          if (sceneIndex > 0) {
            onNotice(`${label(holder)} has the ball when this scene starts. Pick the starting ball handler in Scene 1.`);
            return;
          }
          drag.current = { kind: 'ball', pos: null };
          return;
        }
        const pl = nearest(tokens, p, PLAYER_HIT_R);
        if (!pl) return;
        if (sceneIndex > 0) {
          onNotice(`${pl.label} starts where the last scene ended. Draw a cut to move them, or reposition in Scene 1.`);
          return;
        }
        drag.current = { kind: 'player', id: pl.id, grab: { x: p.x - pl.pos.x, y: p.y - pl.pos.y }, before: play, moved: false };
        setActiveId(pl.id);
        onNotice(null);
        return;
      }

      if (tool === 'shot') {
        // The shooter can be tapped where they stand or where their move ends.
        const spots = offense.flatMap((pl) => [
          { id: pl.id, pos: frame.start[pl.id] },
          { id: pl.id, pos: frame.end[pl.id] },
        ]);
        const shooter = nearest(spots, p, PLAYER_HIT_R);
        if (!shooter) {
          onNotice('Tap the player who takes the shot.');
          return;
        }
        const reason = checkAction(play, holder, scene.actions, { type: 'shot', playerId: shooter.id }, isLastScene);
        if (reason) {
          onNotice(reason);
          return;
        }
        addAction(
          updateScene(play, sceneIndex, (s) => ({
            ...s,
            actions: [...s.actions, { id: newId('a'), type: 'shot', playerId: shooter.id }],
          })),
        );
        return;
      }

      // Drawing. A pass can start from the ball handler or the end of their dribble.
      const type = tool;
      const nearHolder = type === 'pass' && (dist(p, frame.start[holder]) < PLAYER_HIT_R || dist(p, passOrigin) < PLAYER_HIT_R);
      const playerId = nearHolder ? holder : nearest(offense, p, PLAYER_HIT_R)?.id;
      if (!playerId) {
        onNotice('Start the line on a player.');
        return;
      }
      const reason = checkAction(play, holder, scene.actions, { type, playerId }, isLastScene);
      if (reason) {
        onNotice(reason);
        return;
      }
      const origin = type === 'pass' ? passOrigin : frame.start[playerId];
      drag.current = { kind: 'draw', type, playerId, points: [origin] };
      setDraft({ type, points: [origin] });
    },

    move(p) {
      const d = drag.current;
      if (!d) return;
      const pos = clampToCourt(p, length);

      if (d.kind === 'player') {
        d.moved = true;
        const target = clampToCourt({ x: p.x - d.grab.x, y: p.y - d.grab.y }, length);
        preview({ ...play, players: play.players.map((pl) => (pl.id === d.id ? { ...pl, pos: target } : pl)) });
      } else if (d.kind === 'ball') {
        d.pos = pos;
        setBallDrag(pos);
      } else {
        const last = d.points[d.points.length - 1];
        if (d.type === 'pass') d.points = [d.points[0], pos];
        else if (dist(last, pos) >= MIN_POINT_GAP) d.points = [...d.points, pos];
        else return;
        setDraft({ type: d.type, points: d.points });
      }
    },

    end() {
      const d = drag.current;
      drag.current = null;
      setActiveId(null);
      setDraft(null);
      setBallDrag(null);
      if (!d) return;

      if (d.kind === 'player') {
        if (!d.moved) return;
        const placed = frame.start[d.id];
        const crowded = tokens.some((pl) => pl.id !== d.id && dist(pl.pos, placed) < MIN_SPACING);
        if (crowded) {
          preview(d.before);
          onNotice('Players can’t stand on top of each other.');
          return;
        }
        checkpoint(d.before);
        return;
      }

      if (d.kind === 'ball') {
        if (!d.pos) return;
        const to = nearest(offense, d.pos, SNAP_RADIUS);
        if (to && to.id !== play.ballHolderId) addAction({ ...play, ballHolderId: to.id });
        return;
      }

      if (d.type === 'pass') {
        // Snap to a teammate where they stand now or where their move ends (a lead pass).
        const end = d.points[d.points.length - 1];
        const spots = offense
          .filter((pl) => pl.id !== d.playerId)
          .flatMap((pl) => [
            { id: pl.id, pos: frame.start[pl.id] },
            { id: pl.id, pos: frame.end[pl.id] },
          ]);
        const to = nearest(spots, end, SNAP_RADIUS);
        if (!to) {
          if (pathLength(d.points) >= MIN_ACTION_LENGTH) onNotice('Release the pass on a teammate.');
          return;
        }
        const reason = checkAction(
          play,
          holder,
          scene.actions,
          { type: 'pass', playerId: d.playerId, toId: to.id },
          isLastScene,
        );
        if (reason) {
          onNotice(reason);
          return;
        }
        addAction(
          updateScene(play, sceneIndex, (s) => ({
            ...s,
            actions: [...s.actions, { id: newId('a'), type: 'pass', playerId: d.playerId, toId: to.id }],
          })),
        );
        return;
      }

      if (pathLength(d.points) < MIN_ACTION_LENGTH) return;
      const type = d.type;
      addAction(
        updateScene(play, sceneIndex, (s) => ({
          ...s,
          actions: [...s.actions, { id: newId('a'), type, playerId: d.playerId, points: d.points }],
        })),
      );
    },
  };

  const scaleRef = useRef(1);

  const gesture = useMemo(() => {
    const toCourt = (x: number, y: number): Vec => ({ x: x / scaleRef.current - PAD, y: y / scaleRef.current - PAD });
    return Gesture.Pan()
      .minDistance(0)
      .maxPointers(1)
      .runOnJS(true)
      .onBegin((e) => handlers.current.begin(toCourt(e.x, e.y)))
      .onUpdate((e) => handlers.current.move(toCourt(e.x, e.y)))
      .onFinalize(() => handlers.current.end());
  }, []);

  // Faint markers where moving players finish the scene.
  const ghosts = frame.actions.filter((r) => r.action.type !== 'pass' && r.action.type !== 'shot');
  const shot = frame.actions.find((r) => r.action.type === 'shot');

  return (
    <BoardSurface court={play.court} box={box} gesture={gesture} onScale={(pxPerFoot) => (scaleRef.current = pxPerFoot)}>
      {ghosts.map((r) => {
        const end = r.points[r.points.length - 1];
        return (
          <G key={`ghost-${r.action.id}`} opacity={0.45}>
            <Circle cx={end.x} cy={end.y} r={PLAYER_R} fill="#ffffff" stroke="#1e3a8a" strokeWidth={0.18} strokeDasharray="0.5 0.4" />
            <Text
              x={end.x}
              y={end.y + 0.55}
              fontSize={1.5}
              fontWeight="700"
              fontFamily="Helvetica, Arial, sans-serif"
              textAnchor="middle"
              fill="#1e3a8a"
            >
              {label(r.action.playerId)}
            </Text>
          </G>
        );
      })}
      {frame.actions.map((r) => (
        <ActionShape key={r.action.id} type={r.action.type} points={r.points} fromPlayer toPlayer={r.action.type === 'pass'} />
      ))}
      {shot && <ShotTag from={shot.points[0]} length={length} />}
      {draft && <ActionShape type={draft.type} points={draft.points} fromPlayer opacity={0.6} />}
      {tokens.map((p) => (
        <PlayerToken key={p.id} player={p} active={p.id === activeId} />
      ))}
      <BallToken pos={ballDrag ?? ballAt} />
    </BoardSurface>
  );
}

// "2PT" / "3PT" badge just behind the shooter.
function ShotTag({ from, length }: { from: Vec; length: number }) {
  const value = shotValue(from);
  const x = from.x;
  const y = Math.min(length - 1, from.y + PLAYER_R + 1.4);
  return (
    <G>
      <Rect x={x - 2} y={y - 0.85} width={4} height={1.7} rx={0.85} fill="#7c3aed" />
      <Text x={x} y={y + 0.45} fontSize={1.2} fontWeight="700" fontFamily="Helvetica, Arial, sans-serif" textAnchor="middle" fill="#ffffff">
        {value}PT
      </Text>
    </G>
  );
}
