import { router, Stack } from 'expo-router';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PlaybackBoard } from '../board/PlaybackBoard';
import { PlaybackControls } from '../board/PlaybackControls';
import { describeScene, playResult, simulate } from '../board/rules';
import { buildTimeline, sample } from '../board/timeline';
import { Play } from '../board/types';
import { usePlayback } from '../board/usePlayback';
import { NameDialog, Sheet, SheetButton } from '../ui/Sheet';
import { useLibrary } from './LibraryProvider';
import { Situation } from './types';

type Props = {
  title: string;
  // Small caps line above the description (category, focus, author…).
  kicker: string;
  description: string;
  play: Play;
  tags?: Situation[];
  // Extra content under the controls, e.g. a drill's coaching points.
  children?: ReactNode;
  // Team plays are watch-only here; public plays can be copied.
  addable?: boolean;
};

// Watch a play. Public ones (quick plays, drills, community posts) can be
// copied into one of the coach's playbooks.
export function PlayPreview({ title, kicker, description, play, tags = [], children, addable = true }: Props) {
  const library = useLibrary();
  const frames = useMemo(() => simulate(play), [play]);
  const timeline = useMemo(() => buildTimeline(play, frames), [play, frames]);
  const clock = usePlayback(timeline.duration);
  const snapshot = sample(play, timeline, clock.time);
  const [choosing, setChoosing] = useState(false);
  const [naming, setNaming] = useState(false);

  // Start playing as soon as the screen opens.
  useEffect(() => clock.restart(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const scene = snapshot.sceneIndex;
  const result = playResult(play, frames);

  const addTo = (playbookId: string) => {
    const id = library.createPlay({ playbookId, name: title, play, tags, notes: description });
    library.openPlayById(id);
    setChoosing(false);
    setNaming(false);
    router.navigate('/');
  };

  return (
    <>
      <Stack.Screen options={{ title }} />
      <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
        <Text style={styles.category}>{kicker.toUpperCase()}</Text>
        <Text style={styles.description}>{description}</Text>
        {result && <Text style={styles.result}>Ends: {result}</Text>}

        <PlaybackBoard play={play} snapshot={snapshot} />

        <View style={styles.status}>
          <Text style={styles.statusTitle}>
            Scene {scene + 1} of {play.scenes.length}
          </Text>
          <Text style={styles.statusText} numberOfLines={2}>
            {describeScene(play, play.scenes[scene].actions, frames[scene])}
          </Text>
        </View>

        <PlaybackControls clock={clock} sceneStarts={timeline.scenes.map((s) => s.start)} />

        {children}

        {addable && library.canCreate && (
          <Pressable onPress={() => setChoosing(true)} style={styles.add} accessibilityRole="button">
            <Text style={styles.addText}>{library.isHeadCoach ? 'Add to my playbook' : 'Suggest to head coach'}</Text>
          </Pressable>
        )}
      </ScrollView>

      <Sheet visible={choosing} title="Add to playbook" onClose={() => setChoosing(false)}>
        {library.writablePlaybooks.map((b) => (
          <SheetButton key={b.id} label={library.teams.length > 1 ? `${library.teamName(b.teamId)} · ${b.name}` : b.name} onPress={() => addTo(b.id)} />
        ))}
        {library.isHeadCoach && (
          <SheetButton
            label={`New playbook in ${library.team.name}…`}
            onPress={() => {
              setChoosing(false);
              setNaming(true);
            }}
          />
        )}
      </Sheet>

      <NameDialog
        visible={naming}
        title="New playbook"
        confirmLabel="Create & add"
        onCancel={() => setNaming(false)}
        onSubmit={(name) => addTo(library.createPlaybook(name))}
      />
    </>
  );
}

export function MissingPlay({ what }: { what: string }) {
  return (
    <View style={styles.missing}>
      <Text style={styles.description}>This {what} doesn&rsquo;t exist.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#e9ecf1' },
  content: { padding: 16, gap: 10, maxWidth: 720, width: '100%', alignSelf: 'center' },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  category: { fontSize: 11, fontWeight: '800', color: '#6b7280', letterSpacing: 0.8 },
  description: { fontSize: 15, color: '#374151' },
  result: { fontSize: 13, fontWeight: '700', color: '#6d28d9' },
  status: { height: 64, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#ffffff', gap: 2, justifyContent: 'center' },
  statusTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  statusText: { fontSize: 13, color: '#4b5563' },
  add: { marginTop: 4, alignItems: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: '#111827' },
  addText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
});
