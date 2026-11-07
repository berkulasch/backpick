import { Circle } from 'react-native-svg';

import { ActionShape } from './ActionShape';
import { BallToken, BoardSurface, Box } from './BoardSurface';
import { PlayerToken } from './PlayerToken';
import { Snapshot } from './timeline';
import { Play } from './types';

type Props = { play: Play; snapshot: Snapshot; box?: Box };

export function PlaybackBoard({ play, snapshot, box }: Props) {
  const tokens = play.players.map((p) => ({ ...p, pos: snapshot.positions[p.id] }));

  return (
    <BoardSurface court={play.court} box={box}>
      {snapshot.trails.map((tr, i) => (
        <ActionShape key={i} type={tr.type} points={tr.points} toPlayer={tr.toPlayer} opacity={0.6} />
      ))}
      {tokens.map((p) => (
        <PlayerToken key={p.id} player={p} active={snapshot.moving.includes(p.id)} />
      ))}
      {snapshot.make !== null && (
        <Circle
          cx={snapshot.ball.pos.x}
          cy={snapshot.ball.pos.y}
          r={0.9 + 3 * snapshot.make}
          fill="none"
          stroke="#7c3aed"
          strokeWidth={0.35 * (1 - snapshot.make) + 0.05}
          opacity={1 - snapshot.make}
        />
      )}
      <BallToken pos={snapshot.ball.pos} scale={snapshot.ball.scale} opacity={snapshot.ball.opacity} />
    </BoardSurface>
  );
}
