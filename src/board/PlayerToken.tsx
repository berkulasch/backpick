import { Circle, G, Text } from 'react-native-svg';

import { PLAYER_R } from '../court/geometry';
import { Player } from './types';

const colors = { fill: '#1e3a8a', text: '#ffffff' };
const fontSize = 1.7;

export function PlayerToken({ player, active }: { player: Player; active?: boolean }) {
  const { x, y } = player.pos;

  return (
    <G>
      {active && <Circle cx={x} cy={y} r={PLAYER_R + 0.8} fill={colors.fill} opacity={0.18} />}
      <Circle cx={x} cy={y + 0.15} r={PLAYER_R} fill="#000" opacity={0.15} />
      <Circle cx={x} cy={y} r={PLAYER_R} fill={colors.fill} stroke="#ffffff" strokeWidth={0.22} />
      <Text x={x} y={y + fontSize * 0.36} fontSize={fontSize} fontWeight="700" fontFamily="Helvetica, Arial, sans-serif" textAnchor="middle" fill={colors.text}>
        {player.label}
      </Text>
    </G>
  );
}
