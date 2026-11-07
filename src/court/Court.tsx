import { Circle, G, Line, Path, Rect } from 'react-native-svg';

import { BASKET, COURT, CourtMode, courtLength, THREE_CORNER_Y } from './geometry';

const INK = '#2b2f36';
const LINE_W = 0.2;

// Lane hash marks (feet from the baseline).
const HASHES = [7, 8, 11, 14];

// One basket end: paint, free-throw circle, three-point line, rim.
function Basket() {
  return (
    <G>
      <Rect x={17} y={0} width={16} height={19} fill="#f3f4f6" />
      <Path d="M19 19 A6 6 0 0 0 31 19" />
      <Path d="M19 19 A6 6 0 0 1 31 19" strokeDasharray="0.8 0.8" />
      {HASHES.map((y) => (
        <G key={y}>
          <Line x1={16.4} y1={y} x2={17} y2={y} />
          <Line x1={33} y1={y} x2={33.6} y2={y} />
        </G>
      ))}
      <Path d={`M3 0 L3 ${THREE_CORNER_Y} A23.75 23.75 0 0 0 47 ${THREE_CORNER_Y} L47 0`} />
      <Path d={`M21 4 L21 ${BASKET.y} A4 4 0 0 0 29 ${BASKET.y} L29 4`} />
      <Line x1={22} y1={4} x2={28} y2={4} strokeWidth={0.4} />
      <Line x1={25} y1={4} x2={25} y2={4.5} />
      <Circle cx={BASKET.x} cy={BASKET.y} r={0.75} stroke="#e8590c" strokeWidth={0.25} />
    </G>
  );
}

// Drawn baseline-at-top, the usual orientation for play diagrams. A full court
// repeats the basket end upside down at the bottom.
export function Court({ mode = 'half' }: { mode?: CourtMode }) {
  const W = COURT.width;
  const L = courtLength(mode);
  const mid = COURT.length;

  return (
    <G stroke={INK} strokeWidth={LINE_W} fill="none" strokeLinecap="round">
      <Rect x={0} y={0} width={W} height={L} fill="#ffffff" />
      <Basket />
      {mode === 'full' ? (
        <>
          <G transform={`rotate(180 ${W / 2} ${mid})`}>
            <Basket />
          </G>
          <Line x1={0} y1={mid} x2={W} y2={mid} />
          <Circle cx={W / 2} cy={mid} r={6} />
        </>
      ) : (
        <Path d={`M19 ${L} A6 6 0 0 1 31 ${L}`} />
      )}
      {/* Outer boundary on top so it stays crisp */}
      <Rect x={0} y={0} width={W} height={L} strokeWidth={0.35} />
    </G>
  );
}
