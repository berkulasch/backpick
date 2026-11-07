import { createContext, ReactNode, useContext, useState } from 'react';

import { Play } from '../board/types';
import { initialPlay, newId } from '../board/usePlay';
import { communitySeed } from './communitySeed';
import { CommunityPost, Playbook, Role, SavedPlay, Situation, Team, TeamMember } from './types';

// The coach's teams (each with its own playbooks and members) and the public
// Community feed for this session. Kept in memory only for now; the shape
// mirrors the future Supabase tables so syncing can be added later.

type State = {
  teams: Team[];
  activeTeamId: string;
  playbooks: Playbook[];
  plays: SavedPlay[];
  openPlayId: string;
  community: CommunityPost[];
  // Until there are accounts, the head coach can preview the active team as one
  // of its members. null = the head coach themself.
  viewerId: string | null;
};

type NewPlay = { playbookId: string; name?: string; play?: Play; tags?: Situation[]; notes?: string };

function startingState(): State {
  const team: Team = { id: newId('t'), name: 'My team', members: [] };
  const playbook: Playbook = { id: newId('pb'), name: 'Plays', teamId: team.id };
  const play = makePlay({ playbookId: playbook.id, name: 'New play' }, null);
  return { teams: [team], activeTeamId: team.id, playbooks: [playbook], plays: [play], openPlayId: play.id, community: communitySeed(), viewerId: null };
}

function makePlay({ playbookId, name = 'New play', play = initialPlay(), tags = [], notes = '' }: NewPlay, authorId: string | null): SavedPlay {
  // The head coach's plays go straight in; anyone else's wait for approval.
  const status = authorId === null ? 'approved' : 'pending';
  return { id: newId('p'), name, playbookId, tags, notes, sharedWithTeam: false, status, authorId, updatedAt: Date.now(), play };
}

function useLibraryState() {
  const [state, setState] = useState<State>(startingState);

  const edit = (id: string, fn: (p: SavedPlay) => SavedPlay) =>
    setState((s) => ({ ...s, plays: s.plays.map((p) => (p.id === id ? { ...fn(p), updatedAt: Date.now() } : p)) }));
  const editTeam = (id: string, fn: (t: Team) => Team) => setState((s) => ({ ...s, teams: s.teams.map((t) => (t.id === id ? fn(t) : t)) }));

  const team = state.teams.find((t) => t.id === state.activeTeamId) ?? state.teams[0];
  const viewer: TeamMember | null = team.members.find((m) => m.id === state.viewerId) ?? null;
  const teamOf = (p: SavedPlay) => state.playbooks.find((b) => b.id === p.playbookId)?.teamId;

  // What the current viewer may do. The head coach can do everything.
  const canSee = (p: SavedPlay) => {
    if (!viewer) return true;
    if (teamOf(p) !== team.id) return false;
    if (p.status === 'pending') return p.authorId === viewer.id;
    return viewer.role === 'assistant' || p.sharedWithTeam;
  };
  const canEdit = (p: SavedPlay) => !viewer || (p.status === 'pending' && p.authorId === viewer.id);
  const canCreate = !viewer || viewer.canCreate;

  return {
    ...state,
    team,
    viewer,
    isHeadCoach: viewer === null,
    canCreate,
    canSee,
    canEdit,
    openPlay: state.plays.find((p) => p.id === state.openPlayId) ?? state.plays[0],
    teamPlaybooks: state.playbooks.filter((b) => b.teamId === team.id),
    // Where "Add to my playbook" can put a play: any team's playbook for the
    // head coach, only the active team's for a member.
    writablePlaybooks: canCreate ? state.playbooks.filter((b) => !viewer || b.teamId === team.id) : [],
    teamName: (teamId: string) => state.teams.find((t) => t.id === teamId)?.name ?? '',
    memberName: (id: string | null) => (id === null ? 'Head coach' : (state.teams.flatMap((t) => t.members).find((m) => m.id === id)?.name ?? 'Former member')),

    createPlay(input: NewPlay) {
      const play = makePlay(input, viewer?.id ?? null);
      setState((s) => ({ ...s, plays: [...s.plays, play] }));
      return play.id;
    },
    updatePlay: (id: string, play: Play) => edit(id, (p) => ({ ...p, play })),
    renamePlay: (id: string, name: string) => edit(id, (p) => ({ ...p, name })),
    setTags: (id: string, tags: Situation[]) => edit(id, (p) => ({ ...p, tags })),
    movePlay: (id: string, playbookId: string) => edit(id, (p) => ({ ...p, playbookId })),
    setSharedWithTeam: (id: string, shared: boolean) => edit(id, (p) => ({ ...p, sharedWithTeam: shared })),
    // The head coach accepts a member's play into the team's plays.
    approvePlay: (id: string) => edit(id, (p) => ({ ...p, status: 'approved' })),
    duplicatePlay(id: string) {
      const copyId = newId('p');
      setState((s) => {
        const original = s.plays.find((p) => p.id === id);
        if (!original) return s;
        // A copy starts private, whatever the original's sharing was.
        const copy = { ...original, id: copyId, name: `${original.name} copy`, sharedWithTeam: false, updatedAt: Date.now() };
        return { ...s, plays: [...s.plays, copy] };
      });
      return copyId;
    },
    // Also used to decline a pending play.
    deletePlay(id: string) {
      setState((s) => {
        const plays = s.plays.filter((p) => p.id !== id);
        if (s.openPlayId !== id) return { ...s, plays };
        // The board always needs a play open; fall back to another one or a fresh play.
        if (plays.length) return { ...s, plays, openPlayId: plays[0].id };
        const deleted = s.plays.find((p) => p.id === id)!;
        const fresh = makePlay({ playbookId: deleted.playbookId }, null);
        return { ...s, plays: [fresh], openPlayId: fresh.id };
      });
    },
    createPlaybook(name: string) {
      const playbook: Playbook = { id: newId('pb'), name, teamId: team.id };
      setState((s) => ({ ...s, playbooks: [...s.playbooks, playbook] }));
      return playbook.id;
    },
    renamePlaybook: (id: string, name: string) =>
      setState((s) => ({ ...s, playbooks: s.playbooks.map((b) => (b.id === id ? { ...b, name } : b)) })),
    openPlayById: (id: string) => setState((s) => ({ ...s, openPlayId: id })),

    // A coach can run several teams (e.g. U14 and U16 in a youth academy).
    createTeam(name: string) {
      const newTeam: Team = { id: newId('t'), name, members: [] };
      const playbook: Playbook = { id: newId('pb'), name: 'Plays', teamId: newTeam.id };
      setState((s) => ({ ...s, teams: [...s.teams, newTeam], playbooks: [...s.playbooks, playbook], activeTeamId: newTeam.id, viewerId: null }));
    },
    selectTeam: (id: string) => setState((s) => ({ ...s, activeTeamId: id, viewerId: null })),
    renameTeam: (name: string) => editTeam(team.id, (t) => ({ ...t, name })),
    addMember: (name: string, number: string, role: Role) =>
      editTeam(team.id, (t) => ({ ...t, members: [...t.members, { id: newId('m'), name, number, role, canCreate: false }] })),
    updateMember: (id: string, patch: Partial<Pick<TeamMember, 'role' | 'canCreate'>>) =>
      editTeam(team.id, (t) => ({ ...t, members: t.members.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
    removeMember: (id: string) => editTeam(team.id, (t) => ({ ...t, members: t.members.filter((m) => m.id !== id) })),
    previewAs: (memberId: string | null) => setState((s) => ({ ...s, viewerId: memberId })),

    // Posts a snapshot of one of the coach's plays to the public Community feed.
    postToCommunity(id: string, description: string) {
      const postId = newId('c');
      setState((s) => {
        const saved = s.plays.find((p) => p.id === id);
        if (!saved) return s;
        const post: CommunityPost = { id: postId, name: saved.name, author: 'You', description, tags: saved.tags, postedAt: Date.now(), play: saved.play };
        return { ...s, community: [post, ...s.community] };
      });
      return postId;
    },
    deletePost: (id: string) => setState((s) => ({ ...s, community: s.community.filter((c) => c.id !== id) })),
  };
}

type Library = ReturnType<typeof useLibraryState>;

const LibraryContext = createContext<Library | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const library = useLibraryState();
  return <LibraryContext.Provider value={library}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const library = useContext(LibraryContext);
  if (!library) throw new Error('useLibrary must be used inside <LibraryProvider>');
  return library;
}
