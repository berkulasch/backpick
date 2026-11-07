import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlayThumbnail } from '../board/PlayThumbnail';
import { Play } from '../board/types';
import { useLibrary } from './LibraryProvider';
import { situationLabel } from './types';

// The public side of the app: everything here is open to every coach.
export function PublicPlaybookScreen() {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Playbook</Text>
        <Text style={styles.subtitle}>Plays shared by coaches. Post your own from My Team.</Text>
      </View>
      <CommunityList />
    </SafeAreaView>
  );
}

function CommunityList() {
  const { community } = useLibrary();

  return (
    <ScrollView contentContainerStyle={styles.list}>
      <Pressable onPress={() => router.navigate('/team')} style={styles.shareHint} accessibilityRole="button">
        <Ionicons name="share-outline" size={18} color="#1d4ed8" />
        <Text style={styles.shareHintText}>Share one of your plays: open it in My Team and choose &ldquo;Post to Community&rdquo;.</Text>
      </Pressable>
      {community.map((c) => (
        <Card
          key={c.id}
          play={c.play}
          kicker={`${c.author} · ${ago(c.postedAt)}`}
          name={c.name}
          description={c.description}
          meta={[scenes(c.play), ...c.tags.map(situationLabel)].join(' · ')}
          onPress={() => router.push({ pathname: '/playbook/community/[id]', params: { id: c.id } })}
        />
      ))}
    </ScrollView>
  );
}

function Card({ play, kicker, name, description, meta, onPress }: { play: Play; kicker: string; name: string; description: string; meta: ReactNode; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]} accessibilityRole="button">
      <PlayThumbnail play={play} width={112} />
      <View style={styles.cardText}>
        <Text style={styles.category} numberOfLines={1}>
          {kicker.toUpperCase()}
        </Text>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.description} numberOfLines={3}>
          {description}
        </Text>
        <Text style={styles.tags} numberOfLines={1}>
          {meta}
        </Text>
      </View>
    </Pressable>
  );
}

const scenes = (play: Play) => `${play.scenes.length} scene${play.scenes.length === 1 ? '' : 's'}`;

function ago(t: number) {
  const days = Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000));
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#e9ecf1' },
  header: { paddingHorizontal: 16, paddingTop: 8, gap: 2 },
  title: { fontSize: 28, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#4b5563' },
  segment: { marginTop: 12 },
  chipsBar: { flexGrow: 0, flexShrink: 0, marginTop: 12 },
  chips: { gap: 6, paddingHorizontal: 16 },
  list: { padding: 16, gap: 10 },
  card: { flexDirection: 'row', gap: 12, padding: 10, borderRadius: 12, backgroundColor: '#ffffff', alignItems: 'center' },
  cardText: { flex: 1, gap: 2 },
  category: { fontSize: 10, fontWeight: '800', color: '#6b7280', letterSpacing: 0.8 },
  name: { fontSize: 16, fontWeight: '800', color: '#111827' },
  description: { fontSize: 13, color: '#4b5563' },
  tags: { fontSize: 12, fontWeight: '600', color: '#6d28d9', marginTop: 2 },
  soon: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#ddd6fe', borderStyle: 'dashed', alignItems: 'center' },
  soonText: { flex: 1, fontSize: 13, color: '#5b21b6' },
  shareHint: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 12, backgroundColor: '#dbeafe', alignItems: 'center' },
  shareHintText: { flex: 1, fontSize: 13, color: '#1e3a8a' },
});
