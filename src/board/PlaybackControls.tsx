/* eslint-disable react-hooks/refs -- the refs here are only read inside gesture callbacks, which run on touch events, never during render. */
import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Path, Rect } from 'react-native-svg';

import { PlaybackClock } from './usePlayback';

const SPEEDS = [0.5, 1, 2];

type Props = {
  clock: PlaybackClock;
  // Start time (seconds) of each scene, for the markers on the progress bar.
  sceneStarts: number[];
};

export function PlayIcon({ playing, size = 22 }: { playing: boolean; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {playing ? (
        <>
          <Rect x={5} y={4} width={5} height={16} rx={1.5} fill="#fff" />
          <Rect x={14} y={4} width={5} height={16} rx={1.5} fill="#fff" />
        </>
      ) : (
        <Path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z" fill="#fff" />
      )}
    </Svg>
  );
}

function RestartIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path d="M4 12a8 8 0 1 0 2.4-5.7" stroke="#374151" strokeWidth={2.4} fill="none" strokeLinecap="round" />
      <Path d="M3.5 3.5v5h5" stroke="#374151" strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function PlaybackControls({ clock, sceneStarts }: Props) {
  const [barWidth, setBarWidth] = useState(0);
  const { time, duration, playing } = clock;
  const pct = duration > 0 ? (time / duration) * 100 : 0;

  // Tap or drag along the bar to scrub; the gesture reads the latest values through a ref.
  const latest = useRef({ barWidth, duration, clock });
  latest.current = { barWidth, duration, clock };
  const scrub = useMemo(() => {
    const seekAt = (x: number) => {
      const { barWidth: w, duration: d, clock: c } = latest.current;
      if (w > 0) c.seek((Math.min(w, Math.max(0, x)) / w) * d);
    };
    return Gesture.Pan()
      .minDistance(0)
      .runOnJS(true)
      .onBegin((e) => {
        latest.current.clock.pause();
        seekAt(e.x);
      })
      .onUpdate((e) => seekAt(e.x));
  }, []);

  return (
    <View style={styles.wrap}>
      <GestureDetector gesture={scrub}>
        <View
          onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
          style={styles.barHit}
          accessibilityRole="adjustable"
          accessibilityLabel="Playback position"
        >
          <View style={[styles.bar, { pointerEvents: 'none' }]}>
            <View style={[styles.fill, { width: `${pct}%` }]} />
            {sceneStarts.slice(1).map((s) => (
              <View key={s} style={[styles.tick, { left: `${(s / duration) * 100}%` }]} />
            ))}
          </View>
        </View>
      </GestureDetector>

      <View style={styles.row}>
        <Pressable onPress={clock.restart} style={styles.round} accessibilityRole="button" accessibilityLabel="Restart">
          <RestartIcon />
        </Pressable>
        <Pressable
          onPress={playing ? clock.pause : clock.play}
          style={styles.play}
          accessibilityRole="button"
          accessibilityLabel={playing ? 'Pause' : 'Play'}
        >
          <PlayIcon playing={playing} />
        </Pressable>
        <View style={styles.speeds}>
          {SPEEDS.map((s) => (
            <Pressable
              key={s}
              onPress={() => clock.setSpeed(s)}
              style={[styles.speed, clock.speed === s && styles.speedOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: clock.speed === s }}
            >
              <Text style={[styles.speedText, clock.speed === s && styles.speedTextOn]}>{s}×</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  barHit: { paddingVertical: 10 },
  bar: { height: 6, borderRadius: 3, backgroundColor: '#d1d5db' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 3, backgroundColor: '#111827' },
  tick: { position: 'absolute', top: -3, width: 2, height: 12, marginLeft: -1, borderRadius: 1, backgroundColor: '#6b7280' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
  play: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  speeds: { flexDirection: 'row', marginLeft: 'auto', backgroundColor: '#ffffff', borderRadius: 999, padding: 3 },
  speed: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  speedOn: { backgroundColor: '#111827' },
  speedText: { fontSize: 13, fontWeight: '700', color: '#374151' },
  speedTextOn: { color: '#ffffff' },
});
