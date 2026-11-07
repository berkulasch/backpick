import { useLocalSearchParams } from 'expo-router';

import { useLibrary } from '../../../library/LibraryProvider';
import { MissingPlay, PlayPreview } from '../../../library/PlayPreview';

export default function CommunityPostRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const post = useLibrary().community.find((c) => c.id === id);
  if (!post) return <MissingPlay what="post" />;
  return <PlayPreview title={post.name} kicker={`Shared by ${post.author}`} description={post.description} play={post.play} tags={post.tags} />;
}
