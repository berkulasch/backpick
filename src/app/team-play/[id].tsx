import { useLocalSearchParams } from 'expo-router';

import { useLibrary } from '../../library/LibraryProvider';
import { MissingPlay, PlayPreview } from '../../library/PlayPreview';

// Watch-only view of a team play, for members who can't edit it.
export default function TeamPlayRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const library = useLibrary();
  const saved = library.plays.find((p) => p.id === id);
  if (!saved || !library.canSee(saved)) return <MissingPlay what="play" />;
  const playbook = library.playbooks.find((b) => b.id === saved.playbookId)?.name ?? '';
  return <PlayPreview title={saved.name} kicker={`${library.team.name} · ${playbook}`} description={saved.notes} play={saved.play} tags={saved.tags} addable={false} />;
}
