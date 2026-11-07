import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';

import { ACTION_COLORS, ActionShape } from './ActionShape';
import { CourtMode } from '../court/geometry';
import { ActionType, Tool, Vec } from './types';

const ACTION_TOOLS: { tool: ActionType; label: string; sample: Vec[] }[] = [
  { tool: 'pass', label: 'Pass', sample: [{ x: 1, y: 3 }, { x: 13, y: 3 }] },
  { tool: 'dribble', label: 'Dribble', sample: [{ x: 1, y: 3 }, { x: 13, y: 3 }] },
  { tool: 'cut', label: 'Cut', sample: [{ x: 1, y: 4.5 }, { x: 5, y: 2 }, { x: 9, y: 1.6 }, { x: 13, y: 2.5 }] },
  { tool: 'pick', label: 'Pick', sample: [{ x: 2, y: 3 }, { x: 12, y: 3 }] },
  { tool: 'shot', label: 'Shot', sample: [{ x: 1, y: 5 }, { x: 13, y: 1.5 }] },
];

function ToolIcon({ tool }: { tool: Tool }) {
  const action = ACTION_TOOLS.find((t) => t.tool === tool);
  return (
    <Svg width={48} height={20} viewBox="0 0 14 6">
      {action && <ActionShape type={action.tool} points={action.sample} scale={0.75} />}
      {tool === 'move' && (
        <>
          <Circle cx={7} cy={3} r={2.4} fill="#1e3a8a" />
          <SvgText x={7} y={3.95} fontSize={2.6} fontWeight="700" fontFamily="Helvetica, Arial, sans-serif" textAnchor="middle" fill="#fff">
            1
          </SvgText>
        </>
      )}
      {tool === 'erase' && (
        <>
          <Line x1={5} y1={1} x2={9} y2={5} stroke="#6b7280" strokeWidth={0.7} strokeLinecap="round" />
          <Line x1={9} y1={1} x2={5} y2={5} stroke="#6b7280" strokeWidth={0.7} strokeLinecap="round" />
        </>
      )}
    </Svg>
  );
}

const TOOLS: { tool: Tool; label: string }[] = [
  { tool: 'move', label: 'Move' },
  ...ACTION_TOOLS,
  { tool: 'erase', label: 'Erase' },
];

type Props = {
  tool: Tool;
  onTool: (t: Tool) => void;
  canUndo: boolean;
  onUndo: () => void;
  onClear: () => void;
  // Formations only apply to Scene 1 (the starting spots).
  canFormation: boolean;
  onFormation: () => void;
  court: CourtMode;
  onCourt: (c: CourtMode) => void;
};

export function ToolPalette({ tool, onTool, rail = false }: { tool: Tool; onTool: (t: Tool) => void; rail?: boolean }) {
  return (
    <View style={rail ? styles.rail : styles.tools}>
      {TOOLS.map(({ tool: t, label }) => {
        const selected = t === tool;
        const accent = t === 'move' || t === 'erase' ? '#111827' : ACTION_COLORS[t];
        return (
          <Pressable
            key={t}
            onPress={() => onTool(t)}
            style={[styles.tool, rail && styles.railTool, selected && { borderColor: accent }]}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <ToolIcon tool={t} />
            <Text style={[styles.toolLabel, selected && { color: accent }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ActionRow({ canUndo, onUndo, onClear, canFormation, onFormation, court, onCourt }: Omit<Props, 'tool' | 'onTool'>) {
  return (
    <View style={styles.row}>
      <View style={styles.court} accessibilityRole="tablist">
        {(['half', 'full'] as const).map((c) => (
          <Pressable key={c} onPress={() => onCourt(c)} style={[styles.courtItem, court === c && styles.courtItemOn]} accessibilityRole="tab" accessibilityState={{ selected: court === c }}>
            <Text style={[styles.courtText, court === c && styles.courtTextOn]}>{c === 'half' ? 'Half' : 'Full'}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable onPress={onFormation} style={[styles.chip, !canFormation && { opacity: 0.4 }]} accessibilityRole="button">
        <Text style={styles.chipText}>Formation</Text>
      </Pressable>
      <Pressable onPress={onUndo} disabled={!canUndo} style={[styles.chip, !canUndo && { opacity: 0.4 }]}>
        <Text style={styles.chipText}>Undo</Text>
      </Pressable>
      <Pressable onPress={onClear} style={styles.chip}>
        <Text style={styles.chipText}>Clear</Text>
      </Pressable>
    </View>
  );
}

export function Toolbar(props: Props) {
  return (
    <View style={styles.wrap}>
      <ToolPalette tool={props.tool} onTool={props.onTool} />
      <ActionRow {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  tools: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tool: {
    // Four columns.
    width: '23.5%',
    paddingVertical: 6,
    alignItems: 'center',
    gap: 4,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#ffffff',
  },
  rail: { gap: 6, alignItems: 'center' },
  railTool: { width: 58 },
  toolLabel: { fontSize: 11, fontWeight: '600', color: '#4b5563' },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  chip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, backgroundColor: '#ffffff' },
  court: { flexDirection: 'row', padding: 3, borderRadius: 999, backgroundColor: '#d9dde4' },
  courtItem: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  courtItemOn: { backgroundColor: '#ffffff' },
  courtText: { fontSize: 12, fontWeight: '600', color: '#4b5563' },
  courtTextOn: { color: '#111827', fontWeight: '800' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#374151' },
});
