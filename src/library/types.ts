import { Play } from '../board/types';

export type Situation = 'man' | 'zone' | 'blob' | 'slob' | 'end-of-game' | 'press-break';

export const SITUATIONS: { id: Situation; label: string }[] = [
  { id: 'man', label: 'Man' },
  { id: 'zone', label: 'Zone' },
  { id: 'blob', label: 'BLOB' },
  { id: 'slob', label: 'SLOB' },
  { id: 'end-of-game', label: 'End of game' },
  { id: 'press-break', label: 'Press break' },
];

export const situationLabel = (id: Situation) => SITUATIONS.find((s) => s.id === id)?.label ?? id;

// Shaped like the future Supabase tables (`teams`, `team_members`, `playbooks`,
// `plays`, `community_posts`).

// The coach using the app is the head coach of every team they create.
// Members are assistants or players; any of them can be allowed to create plays.
export type Role = 'assistant' | 'player';

export const roleLabel = (role: Role) => (role === 'assistant' ? 'Assistant coach' : 'Player');

export type TeamMember = { id: string; name: string; number: string; role: Role; canCreate: boolean };

export type Team = { id: string; name: string; members: TeamMember[] };

export type Playbook = { id: string; name: string; teamId: string };

// Plays from members with permission start as `pending`; they join the team's
// plays only when the head coach approves them.
export type PlayStatus = 'approved' | 'pending';

export type SavedPlay = {
  id: string;
  name: string;
  playbookId: string;
  tags: Situation[];
  notes: string;
  // Approved plays are visible to assistants; players see them only once shared.
  sharedWithTeam: boolean;
  status: PlayStatus;
  // null = the head coach; otherwise the member who created it.
  authorId: string | null;
  updatedAt: number;
  play: Play;
};

// A play posted to the public Community section. It's a snapshot: later edits
// to the coach's own copy don't change what's been posted.
export type CommunityPost = {
  id: string;
  name: string;
  author: string;
  description: string;
  tags: Situation[];
  postedAt: number;
  play: Play;
};
