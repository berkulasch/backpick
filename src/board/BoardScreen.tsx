import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COURT, CourtMode } from '../court/geometry';
import { FORMATIONS } from '../library/formations';
import { useLibrary } from '../library/LibraryProvider';
import { SavedPlay } from '../library/types';
import { Sheet, SheetButton } from '../ui/Sheet';
import { PlaybackBoard } from './PlaybackBoard';
import { PlaybackControls, PlayIcon } from './PlaybackControls';
import { describeScene, playResult, shotOf } from './rules';
import { SceneBar } from './SceneBar';
import { buildTimeline, sample } from './timeline';
import { ActionRow, ToolPalette, Toolbar } from './Toolbar';
import { Box } from './BoardSurface';
import { Tool } from './types';
import { usePlay } from './usePlay';
import { usePlayback } from './usePlayback';
import { Whiteboard } from './Whiteboard';

// The Board tab: edits and animates whichever play is open in the library.
export function BoardScreen() {
  const { openPlay, canEdit, viewer } = useLibrary();
  if (!canEdit(openPlay)) {
    // A member previewing the team can only edit their own pending plays.
    return (
      <SafeAreaView style={[styles.screen, styles.locked]} edges={['top']}>
        <Ionicons name="lock-closed-outline" size={28} color="#6b7280" />
        <Text style={styles.lockedTitle}>Only the head coach can edit this play</Text>
        <Text style={styles.lockedText}>
          {viewer?.canCreate ? 'Start a new play from My Team and the head coach can approve it.' : 'Watch the team\u2019s plays from My Team.'}
        </Text>
        <Pressable onPress={() => router.navigate('/team')} style={styles.lockedButton} accessibilityRole="button">
          <Text style={styles.lockedButtonText}>Go to My Team</Text>
        </Pressable>
      </SafeAreaView>
    );
  }
  // A fresh editor (and undo history) per play.
  return <BoardEditor key={openPlay.id} saved={openPlay} />;
}

function BoardEditor({ saved }: { saved: SavedPlay }) {
  const library = useLibrary();
  const controller = usePlay(saved.play);
  const { play, frames, sceneIndex } = controller;
  const [mode, setMode] = useState<'edit' | 'play'>('edit');
  const [tool, setTool] = useState<Tool>('move');
  const [notice, setNotice] = useState<string | null>(null);
  const [pickingFormation, setPickingFormation] = useState(false);
  const [box, setBox] = useState<Box | null>(null);

  // Keep the library's copy in step with the editor.
  const { updatePlay } = library;
  useEffect(() => {
    if (play !== saved.play) updatePlay(saved.id, play);
  }, [play]); // eslint-disable-line react-hooks/exhaustive-deps

  const timeline = useMemo(() => buildTimeline(play, frames), [play, frames]);
  const clock = usePlayback(timeline.duration);
  const snapshot = mode === 'play' ? sample(play, timeline, clock.time) : null;

  const label = (id: string) => play.players.find((p) => p.id === id)?.label;
  const playbookName = library.playbooks.find((b) => b.id === saved.playbookId)?.name ?? '';
  const kicker = saved.status === 'pending' ? `${playbookName} · waiting for head coach` : playbookName;

  // The play is finished once the last scene ends in a shot.
  const lastIndex = play.scenes.length - 1;
  const finalShot = shotOf(play.scenes[lastIndex].actions);
  const result = playResult(play, frames);

  // In playback the status box follows the scene being animated.
  const shownIndex = snapshot?.sceneIndex ?? sceneIndex;
  const summary = describeScene(play, play.scenes[shownIndex].actions, frames[shownIndex]);

  const run = (fn: () => number | void) => {
    const removed = fn();
    setNotice(removed ? `Removed ${removed} later action${removed === 1 ? '' : 's'} that no longer made sense.` : null);
  };

  const toggleMode = () => {
    if (mode === 'play') {
      clock.pause();
      controller.selectScene(shownIndex);
      setMode('edit');
      return;
    }
    if (!finalShot) {
      setNotice('Finish the play with a shot to play it back.');
      return;
    }
    setNotice(null);
    setMode('play');
    clock.restart();
  };

  const toolbarProps = {
    tool,
    onTool: (t: Tool) => {
      setTool(t);
      setNotice(null);
    },
    canUndo: controller.canUndo,
    onUndo: () => {
      controller.undo();
      setNotice(null);
    },
    onClear: () => run(() => controller.commit(controller.updateScene(play, sceneIndex, (s) => ({ ...s, actions: [] })))),
    court: (play.court ?? 'half') as CourtMode,
    onCourt: (c: CourtMode) => {
      if ((play.court ?? 'half') === c) return;
      if (c === 'half' && frames.some((f) => [...Object.values(f.start), ...Object.values(f.end), ...f.actions.flatMap((a) => a.points)].some((v) => v.y > COURT.length))) {
        setNotice('Move every player and line into the half court before switching back.');
        return;
      }
      setNotice(null);
      controller.setCourt(c);
    },
    canFormation: sceneIndex === 0,
    onFormation: () => {
      if (sceneIndex !== 0) {
        setNotice('Formations set the starting spots. Switch to Scene 1 to pick one.');
        return;
      }
      setPickingFormation(true);
    },
  };

  const full = play.court === 'full';
  const fitBox = full ? (box ?? undefined) : undefined;
  const board = snapshot ? <PlaybackBoard play={play} snapshot={snapshot} box={fitBox} /> : <Whiteboard controller={controller} tool={tool} onNotice={setNotice} box={fitBox} />;
  const Body = full ? View : ScrollView;
  const bodyProps = full ? { style: styles.contentFull } : { contentContainerStyle: styles.content, showsVerticalScrollIndicator: false };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Body {...bodyProps}>
        <View style={styles.header}>
          <View style={{ flexShrink: 1, flexGrow: 1 }}>
            <Text style={styles.playbook} numberOfLines={1}>
              {kicker.toUpperCase()}
            </Text>
            <TextInput
              value={saved.name}
              onChangeText={(name) => library.renamePlay(saved.id, name)}
              style={styles.title}
              placeholder="Play name"
              returnKeyType="done"
              accessibilityLabel="Play name"
            />
            <Text style={[styles.subtitle, result !== null && styles.subtitleDone]} numberOfLines={1}>
              {result !== null ? `Ends: ${result}` : 'No shot yet'}
            </Text>
          </View>
          <Pressable onPress={toggleMode} style={[styles.modeButton, mode === 'edit' && !finalShot && { opacity: 0.45 }]} accessibilityRole="button">
            {mode === 'edit' && <PlayIcon playing={false} size={14} />}
            <Text style={styles.modeText}>{mode === 'edit' ? 'Play' : 'Edit'}</Text>
          </Pressable>
        </View>

        {mode === 'edit' ? (
          <SceneBar
            count={play.scenes.length}
            index={sceneIndex}
            onSelect={(i) => {
              controller.selectScene(i);
              setNotice(null);
            }}
            onAdd={() => {
              if (sceneIndex === lastIndex && finalShot) {
                setNotice(`The play ends with ${label(finalShot.playerId)}'s shot. Erase the shot to add another scene.`);
                return;
              }
              run(controller.addScene);
            }}
            canAdd={!(sceneIndex === lastIndex && finalShot)}
            onDelete={() => run(controller.deleteScene)}
          />
        ) : (
          <View style={styles.sceneRow}>
            <Text style={styles.sceneLabel}>
              Scene {shownIndex + 1} of {play.scenes.length}
            </Text>
          </View>
        )}

        {full ? (
          <View style={styles.fullArea}>
            <View style={styles.fullBoard} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
              {box && board}
              {notice !== null && (
                <View style={[styles.status, styles.statusWarn, styles.overlay]}>
                  <Text style={styles.warnText} numberOfLines={3}>
                    {notice}
                  </Text>
                </View>
              )}
            </View>
            {mode === 'edit' && (
              <ToolPalette
                rail
                tool={tool}
                onTool={(t) => {
                  setTool(t);
                  setNotice(null);
                }}
              />
            )}
          </View>
        ) : (
          board
        )}

        {!full && (
        <View style={[styles.status, notice !== null && styles.statusWarn]}>
          {notice !== null ? (
            <Text style={styles.warnText} numberOfLines={3}>
              {notice}
            </Text>
          ) : (
            <>
              <Text style={styles.statusTitle}>
                Scene {shownIndex + 1} · {label(frames[shownIndex].holderStart)} has the ball
              </Text>
              <Text style={styles.statusText} numberOfLines={2}>
                {summary || 'Each player gets one move (cut, dribble or pick). The ball handler can pass once; end the play with a shot.'}
              </Text>
            </>
          )}
        </View>
        )}

        {mode === 'play' ? (
          <PlaybackControls clock={clock} sceneStarts={timeline.scenes.map((s) => s.start)} />
        ) : (
          full ? <ActionRow {...toolbarProps} /> : <Toolbar {...toolbarProps} />
        )}
      </Body>

      <Sheet visible={pickingFormation} title="Starting formation" onClose={() => setPickingFormation(false)}>
        {FORMATIONS.map((f) => (
          <SheetButton
            key={f.id}
            label={f.label}
            onPress={() => {
              setPickingFormation(false);
              run(() => controller.applyFormation(f.id));
            }}
          />
        ))}
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  locked: { alignItems: 'center', justifyContent: 'center', gap: 8, padding: 32 },
  lockedTitle: { fontSize: 17, fontWeight: '800', color: '#111827', textAlign: 'center' },
  lockedText: { fontSize: 14, color: '#4b5563', textAlign: 'center' },
  lockedButton: { marginTop: 8, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 999, backgroundColor: '#111827' },
  lockedButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  screen: { flex: 1, backgroundColor: '#e9ecf1' },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, gap: 10, maxWidth: 720, width: '100%', alignSelf: 'center' },
  contentFull: { flex: 1, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, gap: 8, width: '100%' },
  fullArea: { flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center' },
  fullBoard: { flex: 1, alignSelf: 'stretch', justifyContent: 'center' },
  overlay: { position: 'absolute', left: 0, right: 0, top: 0, height: undefined, paddingVertical: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  playbook: { fontSize: 11, fontWeight: '700', color: '#6b7280', letterSpacing: 0.8 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', letterSpacing: -0.5, padding: 0 },
  subtitle: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  subtitleDone: { color: '#6d28d9' },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#111827',
  },
  modeText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  sceneRow: { height: 36, justifyContent: 'center' },
  sceneLabel: { fontSize: 15, fontWeight: '700', color: '#111827' },
  status: { height: 64, paddingHorizontal: 12, overflow: 'hidden', borderRadius: 10, backgroundColor: '#ffffff', gap: 2, justifyContent: 'center' },
  statusWarn: { backgroundColor: '#fef2f2' },
  statusTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  statusText: { fontSize: 13, color: '#4b5563' },
  warnText: { fontSize: 13, fontWeight: '600', color: '#b91c1c' },
});
