import { G, Line, Path, Polygon } from 'react-native-svg';

import { PLAYER_R } from '../court/geometry';
import { arrowHead, endDirection, smoothPath, trim, zigzag } from './paths';
import { ActionType, Vec } from './types';

export const ACTION_COLORS: Record<ActionType, string> = {
  pass: '#1d4ed8',
  dribble: '#ea580c',
  cut: '#111827',
  pick: '#047857',
  shot: '#7c3aed',
};

const DASHES: Partial<Record<ActionType, number[]>> = {
  pass: [0.9, 0.6],
  shot: [0.05, 0.7],
};

type Props = {
  type: ActionType;
  points: Vec[];
  // Whether the line starts/ends on a player token (it then stops at the token's edge).
  fromPlayer?: boolean;
  toPlayer?: boolean;
  // Multiplier for stroke and decoration sizes (used by the small toolbar icons).
  scale?: number;
  opacity?: number;
};

export function ActionShape({ type, points, fromPlayer, toPlayer, scale = 1, opacity = 1 }: Props) {
  // Shots stop at the rim's edge.
  const endTrim = type === 'shot' ? 1 : toPlayer ? PLAYER_R + 0.4 : 0;
  const pts = trim(points, fromPlayer ? PLAYER_R + 0.3 : 0, endTrim);
  if (pts.length < 2) return null;

  const color = ACTION_COLORS[type];
  const strokeWidth = (type === 'shot' ? 0.42 : 0.3) * scale;

  if (type === 'pick') {
    const tip = pts[pts.length - 1];
    const dir = endDirection(pts);
    const half = 1.7 * scale;
    return (
      <G opacity={opacity}>
        <Path d={smoothPath(pts)} stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Line
          x1={tip.x - dir.y * half}
          y1={tip.y + dir.x * half}
          x2={tip.x + dir.y * half}
          y2={tip.y - dir.x * half}
          stroke={color}
          strokeWidth={strokeWidth * 2}
          strokeLinecap="round"
        />
      </G>
    );
  }

  const head = 1.3 * scale;
  const body = trim(pts, 0, head * 0.8);
  const d =
    body.length < 2 ? '' : type === 'dribble' ? smoothPath(zigzag(body, 0.5 * scale, 1.5 * scale)) : smoothPath(body);

  return (
    <G opacity={opacity}>
      {d !== '' && (
        <Path
          d={d}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={DASHES[type]?.map((n) => n * scale).join(' ')}
        />
      )}
      <Polygon points={arrowHead(pts, head)} fill={color} />
    </G>
  );
}
