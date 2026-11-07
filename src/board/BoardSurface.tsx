import { ReactNode } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { GestureDetector, GestureType } from 'react-native-gesture-handler';
import Svg, { Circle, G, Line } from 'react-native-svg';

import { Court } from '../court/Court';
import { BALL_R, COURT, CourtMode, courtLength } from '../court/geometry';
import { Vec } from './types';

// Margin around the court, in feet, so tokens on the boundary aren't clipped.
export const PAD = 1.5;
const VIEW_W = COURT.width + PAD * 2;

export function boardView(mode: CourtMode | undefined) {
  const h = courtLength(mode) + PAD * 2;
  return { aspect: VIEW_W / h, viewBox: `${-PAD} ${-PAD} ${VIEW_W} ${h}` };
}

type Props = {
  children: ReactNode;
  court?: CourtMode;
  // Space to fill; the court is scaled up to the largest size that fits.
  box?: Box;
  gesture?: GestureType;
  // Pixels per foot, reported whenever the board is laid out.
  onScale?: (pxPerFoot: number) => void;
};

// The whiteboard frame with the court drawn on it; content is in court feet.
export type Box = { w: number; h: number };

export function BoardSurface({ children, court, box, gesture, onScale }: Props) {
  const view = boardView(court);
  const surface = (
    <View
      style={StyleSheet.absoluteFill}
      collapsable={false}
      onLayout={(e: LayoutChangeEvent) => onScale?.(e.nativeEvent.layout.width / VIEW_W)}
    >
      <Svg width="100%" height="100%" viewBox={view.viewBox}>
        <Court mode={court} />
        {children}
      </Svg>
    </View>
  );

  return (
    <View style={[boardFrame.frame, { aspectRatio: view.aspect }, box && { width: Math.min(box.w, box.h * view.aspect), alignSelf: 'center' }]}>
      {gesture ? <GestureDetector gesture={gesture}>{surface}</GestureDetector> : surface}
    </View>
  );
}

export function BallToken({ pos, scale = 1, opacity = 1 }: { pos: Vec; scale?: number; opacity?: number }) {
  const r = BALL_R * scale;
  return (
    <G opacity={opacity}>
      <Circle cx={pos.x} cy={pos.y} r={r} fill="#f97316" stroke="#7c2d12" strokeWidth={0.12} />
      <Line x1={pos.x - r} y1={pos.y} x2={pos.x + r} y2={pos.y} stroke="#7c2d12" strokeWidth={0.08} />
      <Line x1={pos.x} y1={pos.y - r} x2={pos.x} y2={pos.y + r} stroke="#7c2d12" strokeWidth={0.08} />
    </G>
  );
}

// Shared with the 3D view so both boards look like the same object.
export const boardFrame = StyleSheet.create({
  frame: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 6,
    borderColor: '#c9ced6',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});

