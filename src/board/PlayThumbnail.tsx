import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg from 'react-native-svg';

import { Court } from '../court/Court';
import { BALL_OFFSET } from '../court/geometry';
import { ActionShape } from './ActionShape';
import { BallToken, boardView } from './BoardSurface';
import { PlayerToken } from './PlayerToken';
import { simulate } from './rules';
import { Play } from './types';

// The whole play as one small diagram: offense at their starting spots and every
// scene's lines, the way coaches sketch a set on a card.
export function PlayThumbnail({ play, width }: { play: Play; width: number }) {
  const frames = useMemo(() => simulate(play), [play]);
  const start = frames[0].start;
  const holder = start[play.ballHolderId];
  const view = boardView(play.court);

  return (
    <View style={[styles.card, { width, aspectRatio: view.aspect }]}>
      <Svg width="100%" height="100%" viewBox={view.viewBox}>
        <Court mode={play.court} />
        {frames.flatMap((f) =>
          f.actions.map((r) => (
            <ActionShape key={r.action.id} type={r.action.type} points={r.points} fromPlayer toPlayer={r.action.type === 'pass'} />
          )),
        )}
        {play.players.map((p) => (
          <PlayerToken key={p.id} player={{ ...p, pos: start[p.id] }} />
        ))}
        <BallToken pos={{ x: holder.x + BALL_OFFSET.x, y: holder.y + BALL_OFFSET.y }} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 8, overflow: 'hidden', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#d1d5db' },
});
