import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { ReactNode, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlayThumbnail } from '../board/PlayThumbnail';
import { playResult, simulate } from '../board/rules';
import { Chip } from '../ui/Chip';
import { Segmented } from '../ui/Segmented';
import { NameDialog, Sheet, SheetButton } from '../ui/Sheet';
import { useLibrary } from './LibraryProvider';
import { Role, roleLabel, SavedPlay, Situation, situationLabel, SITUATIONS, TeamMember } from './types';

type Dialog =
  | { kind: 'new-playbook' }
  | { kind: 'new-team' }
  | { kind: 'rename-playbook'; id: string; name: string }
  | { kind: 'rename-play'; id: string; name: string }
  | { kind: 'rename-team'; name: string }
  | { kind: 'post'; id: string; notes: string }
  | null;

// Filter chips: every situation, plus "shared with the team".
type Filter = Situation | 'shared';

type Section = 'plays' | 'members';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'plays', label: 'Plays' },
  { id: 'members', label: 'Members' },
];

const DIALOG_TITLES: Record<NonNullable<Dialog>['kind'], string> = {
  'new-playbook': 'New playbook',
  'new-team': 'New team',
  'rename-playbook': 'Rename playbook',
  'rename-play': 'Rename play',
  'rename-team': 'Team name',
  post: 'Post to Community',
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

// The private side of the app. The head coach runs each team: they decide who
// may create plays, approve those plays, and choose what players get to see.
export function TeamScreen() {
  const library = useLibrary();
  const params = useLocalSearchParams<{ section?: string }>();
  const section: Section = params.section === 'members' ? 'members' : 'plays';
  const [dialog, setDialog] = useState<Dialog>(null);
  const [switching, setSwitching] = useState(false);
  const { team, viewer, isHeadCoach } = library;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {viewer && (
        <View style={styles.previewBar}>
          <Ionicons name="eye-outline" size={16} color="#ffffff" />
          <Text style={styles.previewText} numberOfLines={2}>
            Previewing as {viewer.name} · {roleLabel(viewer.role)}
            {viewer.canCreate ? ' · can create plays' : ''}
          </Text>
          <Pressable onPress={() => library.previewAs(null)} style={styles.previewExit} accessibilityRole="button">
            <Text style={styles.previewExitText}>Exit</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.header}>
        <Pressable onPress={() => setSwitching(true)} style={{ flexShrink: 1 }} accessibilityRole="button" accessibilityLabel="Switch team">
          <View style={styles.kickerRow}>
            <Text style={styles.kicker}>{library.teams.length > 1 ? `MY TEAMS · ${library.teams.length}` : 'MY TEAM'}</Text>
            <Ionicons name="chevron-down" size={12} color="#6b7280" />
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {team.name}
          </Text>
        </Pressable>
        {section === 'plays' && isHeadCoach && (
          <Pressable onPress={() => setDialog({ kind: 'new-playbook' })} style={styles.headerButton} accessibilityRole="button">
            <Ionicons name="add" size={18} color="#ffffff" />
            <Text style={styles.headerButtonText}>Playbook</Text>
          </Pressable>
        )}
      </View>
      <View style={styles.privacy}>
        <Ionicons name="lock-closed" size={13} color="#4b5563" />
        <Text style={styles.privacyText}>
          Private · {isHeadCoach ? 'you’re the head coach' : 'head coach decides what you see'} · {plural(team.members.length, 'member')}
        </Text>
      </View>
      <View style={styles.segment}>
        <Segmented options={SECTIONS} value={section} onChange={(id) => router.setParams({ section: id })} />
      </View>

      {section === 'plays' ? <PlaysSection setDialog={setDialog} /> : <MembersSection />}

      <Sheet visible={switching} title="Teams" onClose={() => setSwitching(false)}>
        {library.teams.map((t) => (
          <SheetButton
            key={t.id}
            label={`${t.name} · ${plural(t.members.length, 'member')}`}
            tone={t.id === team.id ? 'selected' : 'default'}
            onPress={() => {
              library.selectTeam(t.id);
              setSwitching(false);
            }}
          />
        ))}
        {isHeadCoach && (
          <>
            <SheetButton
              label="Rename this team…"
              onPress={() => {
                setSwitching(false);
                setDialog({ kind: 'rename-team', name: team.name });
              }}
            />
            <SheetButton
              label="New team…"
              onPress={() => {
                setSwitching(false);
                setDialog({ kind: 'new-team' });
              }}
            />
          </>
        )}
      </Sheet>

      <NameDialog
        visible={dialog !== null}
        title={DIALOG_TITLES[dialog?.kind ?? 'new-playbook']}
        initial={dialog?.kind === 'post' ? dialog.notes : dialog && 'name' in dialog ? dialog.name : ''}
        placeholder={dialog?.kind === 'post' ? 'Describe the play for other coaches' : dialog?.kind === 'new-team' ? 'e.g. U14 Boys' : 'Name'}
        confirmLabel={dialog?.kind === 'new-playbook' || dialog?.kind === 'new-team' ? 'Create' : dialog?.kind === 'post' ? 'Post' : 'Save'}
        onCancel={() => setDialog(null)}
        onSubmit={(text) => {
          if (dialog?.kind === 'new-playbook') library.createPlaybook(text);
          if (dialog?.kind === 'new-team') library.createTeam(text);
          if (dialog?.kind === 'rename-playbook') library.renamePlaybook(dialog.id, text);
          if (dialog?.kind === 'rename-play') library.renamePlay(dialog.id, text);
          if (dialog?.kind === 'rename-team') library.renameTeam(text);
          setDialog(null);
          if (dialog?.kind === 'post') {
            const postId = library.postToCommunity(dialog.id, text);
            router.push({ pathname: '/playbook/community/[id]', params: { id: postId } });
          }
        }}
      />
    </SafeAreaView>
  );
}

function PlaysSection({ setDialog }: { setDialog: (d: Dialog) => void }) {
  const library = useLibrary();
  const { isHeadCoach } = library;
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter | null>(null);
  const [menuFor, setMenuFor] = useState<SavedPlay | null>(null);
  const [moving, setMoving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const bookIds = new Set(library.teamPlaybooks.map((b) => b.id));
  const teamPlays = library.plays.filter((p) => bookIds.has(p.playbookId) && library.canSee(p));
  const pending = teamPlays.filter((p) => p.status === 'pending');

  const q = query.trim().toLowerCase();
  const matches = (p: SavedPlay) => !filter || (filter === 'shared' ? p.sharedWithTeam : p.tags.includes(filter));
  const visible = teamPlays.filter((p) => p.status === 'approved' && (!q || p.name.toLowerCase().includes(q)) && matches(p));

  // Plays the viewer can edit open on the board; the rest open watch-only.
  const open = (p: SavedPlay) => {
    if (library.canEdit(p)) {
      library.openPlayById(p.id);
      router.navigate('/');
    } else {
      router.push({ pathname: '/team-play/[id]', params: { id: p.id } });
    }
  };
  const create = (playbookId: string) => {
    const id = library.createPlay({ playbookId });
    library.openPlayById(id);
    router.navigate('/');
  };

  const closeMenu = () => {
    setMenuFor(null);
    setMoving(false);
    setConfirmDelete(false);
  };

  // The sheet shows the latest version of the play it was opened for.
  const menuPlay = menuFor ? (library.plays.find((p) => p.id === menuFor.id) ?? null) : null;
  const deleteLabel = menuPlay?.status === 'pending' ? (isHeadCoach ? 'Decline' : 'Withdraw') : 'Delete';

  return (
    <>
      <View style={styles.search}>
        <Ionicons name="search" size={16} color="#6b7280" />
        <TextInput value={query} onChangeText={setQuery} placeholder="Search plays" style={styles.searchInput} returnKeyType="search" />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipsBar}>
        <Chip label="All" selected={filter === null} onPress={() => setFilter(null)} />
        <Chip label="Shared with players" selected={filter === 'shared'} onPress={() => setFilter(filter === 'shared' ? null : 'shared')} />
        {SITUATIONS.map((s) => (
          <Chip key={s.id} label={s.label} selected={filter === s.id} onPress={() => setFilter(filter === s.id ? null : s.id)} />
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.list}>
        {pending.length > 0 && (
          <View style={[styles.section, styles.pendingBox]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="hourglass-outline" size={16} color="#92400e" />
              <Text style={[styles.sectionTitle, { color: '#92400e' }]}>{isHeadCoach ? 'Waiting for your approval' : 'Your suggestions'}</Text>
              <Text style={styles.sectionCount}>{pending.length}</Text>
            </View>
            {!isHeadCoach && <Text style={styles.empty}>The head coach adds these to the team&rsquo;s plays once they approve them.</Text>}
            {pending.map((p) => (
              <PlayRow key={p.id} saved={p} isOpen={p.id === library.openPlayId} onOpen={() => open(p)} onMenu={() => setMenuFor(p)}>
                <Text style={styles.rowAuthor} numberOfLines={1}>
                  by {library.memberName(p.authorId)} · for {library.teamPlaybooks.find((b) => b.id === p.playbookId)?.name}
                </Text>
                {isHeadCoach && (
                  <View style={styles.approveRow}>
                    <Pressable onPress={() => library.approvePlay(p.id)} style={[styles.approve, styles.approveYes]} accessibilityRole="button">
                      <Text style={styles.approveYesText}>Approve</Text>
                    </Pressable>
                    <Pressable onPress={() => library.deletePlay(p.id)} style={styles.approve} accessibilityRole="button">
                      <Text style={styles.approveNoText}>Decline</Text>
                    </Pressable>
                  </View>
                )}
              </PlayRow>
            ))}
          </View>
        )}

        {library.teamPlaybooks.map((book) => {
          const plays = visible.filter((p) => p.playbookId === book.id);
          return (
            <View key={book.id} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Pressable
                  onPress={() => isHeadCoach && setDialog({ kind: 'rename-playbook', id: book.id, name: book.name })}
                  style={{ flexShrink: 1 }}
                  disabled={!isHeadCoach}
                >
                  <Text style={styles.sectionTitle} numberOfLines={1}>
                    {book.name}
                  </Text>
                </Pressable>
                <Text style={styles.sectionCount}>{plays.length}</Text>
                <View style={{ flexGrow: 1 }} />
                {library.canCreate && (
                  <Pressable onPress={() => create(book.id)} style={styles.smallButton} accessibilityRole="button" accessibilityLabel={`New play in ${book.name}`}>
                    <Ionicons name="add" size={16} color="#111827" />
                    <Text style={styles.smallButtonText}>{isHeadCoach ? 'Play' : 'Suggest play'}</Text>
                  </Pressable>
                )}
              </View>

              {plays.length === 0 ? (
                <Text style={styles.empty}>
                  {query || filter
                    ? 'No matching plays.'
                    : isHeadCoach
                      ? 'No plays yet. Add one, or grab a set from Playbook.'
                      : 'Nothing shared with you here yet.'}
                </Text>
              ) : (
                plays.map((p) => (
                  <PlayRow
                    key={p.id}
                    saved={p}
                    isOpen={p.id === library.openPlayId}
                    onOpen={() => open(p)}
                    onMenu={isHeadCoach ? () => setMenuFor(p) : undefined}
                  />
                ))
              )}
            </View>
          );
        })}
      </ScrollView>

      <Sheet visible={menuPlay !== null} title={menuPlay?.name} onClose={closeMenu}>
        {menuPlay && !moving && (
          <>
            <SheetButton
              label="Open on board"
              onPress={() => {
                closeMenu();
                open(menuPlay);
              }}
            />
            <SheetButton
              label="Rename"
              onPress={() => {
                closeMenu();
                setDialog({ kind: 'rename-play', id: menuPlay.id, name: menuPlay.name });
              }}
            />
            {isHeadCoach && menuPlay.status === 'pending' && (
              <SheetButton
                label="Approve"
                tone="selected"
                onPress={() => {
                  library.approvePlay(menuPlay.id);
                  closeMenu();
                }}
              />
            )}
            {isHeadCoach && menuPlay.status === 'approved' && (
              <>
                <SheetButton
                  label={menuPlay.sharedWithTeam ? 'Stop sharing with players' : 'Share with players'}
                  tone={menuPlay.sharedWithTeam ? 'selected' : 'default'}
                  onPress={() => library.setSharedWithTeam(menuPlay.id, !menuPlay.sharedWithTeam)}
                />
                <SheetButton
                  label="Post to Community…"
                  onPress={() => {
                    closeMenu();
                    setDialog({ kind: 'post', id: menuPlay.id, notes: menuPlay.notes });
                  }}
                />
                <SheetButton
                  label="Duplicate"
                  onPress={() => {
                    library.duplicatePlay(menuPlay.id);
                    closeMenu();
                  }}
                />
              </>
            )}
            {library.teamPlaybooks.length > 1 && <SheetButton label="Move to playbook…" onPress={() => setMoving(true)} />}
            <Text style={styles.sheetLabel}>Situations</Text>
            <View style={styles.tagRow}>
              {SITUATIONS.map((s) => {
                const on = menuPlay.tags.includes(s.id);
                return (
                  <Chip
                    key={s.id}
                    label={s.label}
                    selected={on}
                    onPress={() => library.setTags(menuPlay.id, on ? menuPlay.tags.filter((t) => t !== s.id) : [...menuPlay.tags, s.id])}
                  />
                );
              })}
            </View>
            <SheetButton
              label={confirmDelete ? `Tap again to ${deleteLabel.toLowerCase()}` : deleteLabel}
              tone="danger"
              onPress={() => {
                if (!confirmDelete) {
                  setConfirmDelete(true);
                  return;
                }
                library.deletePlay(menuPlay.id);
                closeMenu();
              }}
            />
          </>
        )}
        {menuPlay &&
          moving &&
          library.teamPlaybooks.map((b) => (
            <SheetButton
              key={b.id}
              label={b.name}
              tone={b.id === menuPlay.playbookId ? 'selected' : 'default'}
              onPress={() => {
                library.movePlay(menuPlay.id, b.id);
                closeMenu();
              }}
            />
          ))}
      </Sheet>
    </>
  );
}

function MembersSection() {
  const library = useLibrary();
  const { team, isHeadCoach } = library;
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [role, setRole] = useState<Role>('player');
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const add = () => {
    if (!name.trim()) return;
    library.addMember(name.trim(), number.trim(), role);
    setName('');
    setNumber('');
  };

  const member = team.members.find((m) => m.id === menuFor) ?? null;
  const closeMenu = () => {
    setMenuFor(null);
    setConfirmRemove(false);
  };

  const staff = team.members.filter((m) => m.role === 'assistant');
  const players = team.members.filter((m) => m.role === 'player');

  return (
    <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
      {isHeadCoach && (
        <View style={styles.addBox}>
          <View style={styles.addRow}>
            <TextInput value={number} onChangeText={setNumber} placeholder="#" style={[styles.field, styles.numberField]} keyboardType="number-pad" maxLength={2} />
            <TextInput value={name} onChangeText={setName} placeholder="Name" style={[styles.field, { flex: 1 }]} onSubmitEditing={add} returnKeyType="done" />
            <Pressable onPress={add} style={[styles.headerButton, !name.trim() && { opacity: 0.4 }]} accessibilityRole="button" accessibilityLabel="Add member">
              <Ionicons name="add" size={18} color="#ffffff" />
            </Pressable>
          </View>
          <View style={styles.roleRow}>
            <Chip label="Player" selected={role === 'player'} onPress={() => setRole('player')} />
            <Chip label="Assistant coach" selected={role === 'assistant'} onPress={() => setRole('assistant')} />
          </View>
        </View>
      )}

      <Text style={styles.groupLabel}>STAFF</Text>
      <View style={styles.memberRow}>
        <View style={[styles.jersey, styles.headBadge]}>
          <Ionicons name="star" size={15} color="#ffffff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.memberName}>{isHeadCoach ? 'You' : 'Head coach'}</Text>
          <Text style={styles.memberMeta}>Head coach · approves plays and decides who sees them</Text>
        </View>
      </View>
      {staff.map((m) => (
        <MemberRow key={m.id} member={m} onPress={isHeadCoach ? () => setMenuFor(m.id) : undefined} />
      ))}

      <Text style={styles.groupLabel}>PLAYERS</Text>
      {players.length === 0 ? (
        <Text style={styles.empty}>No players yet. They&rsquo;ll only see the plays you share with them.</Text>
      ) : (
        players.map((m) => <MemberRow key={m.id} member={m} onPress={isHeadCoach ? () => setMenuFor(m.id) : undefined} />)
      )}

      {isHeadCoach && (
        <View style={styles.note}>
          <Ionicons name="key-outline" size={18} color="#1d4ed8" />
          <Text style={styles.noteText}>
            Tap a member to change their role or let them create plays. Their plays wait for your approval. Invites arrive with accounts; until then use
            &ldquo;Preview as&rdquo; to see the team through their eyes.
          </Text>
        </View>
      )}

      <Sheet visible={member !== null} title={member?.name} onClose={closeMenu}>
        {member && (
          <>
            <Text style={styles.sheetLabel}>Role</Text>
            <View style={styles.tagRow}>
              <Chip label="Player" selected={member.role === 'player'} onPress={() => library.updateMember(member.id, { role: 'player' })} />
              <Chip label="Assistant coach" selected={member.role === 'assistant'} onPress={() => library.updateMember(member.id, { role: 'assistant' })} />
            </View>
            <SheetButton
              label={member.canCreate ? '✓ Can create plays (needs your approval)' : 'Allow to create plays'}
              tone={member.canCreate ? 'selected' : 'default'}
              onPress={() => library.updateMember(member.id, { canCreate: !member.canCreate })}
            />
            <SheetButton
              label={`Preview as ${member.name}`}
              onPress={() => {
                library.previewAs(member.id);
                closeMenu();
              }}
            />
            <SheetButton
              label={confirmRemove ? 'Tap again to remove' : 'Remove from team'}
              tone="danger"
              onPress={() => {
                if (!confirmRemove) return setConfirmRemove(true);
                library.removeMember(member.id);
                closeMenu();
              }}
            />
          </>
        )}
      </Sheet>
    </ScrollView>
  );
}

function MemberRow({ member, onPress }: { member: TeamMember; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.memberRow, pressed && { opacity: 0.7 }]} accessibilityRole="button">
      <View style={[styles.jersey, member.role === 'assistant' && styles.assistantBadge]}>
        {member.role === 'assistant' ? <Ionicons name="clipboard-outline" size={15} color="#ffffff" /> : <Text style={styles.jerseyText}>{member.number || '–'}</Text>}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.memberName} numberOfLines={1}>
          {member.name}
        </Text>
        <Text style={styles.memberMeta} numberOfLines={1}>
          {roleLabel(member.role)}
          {member.canCreate ? ' · can create plays' : ''}
        </Text>
      </View>
      {member.canCreate && <Ionicons name="create-outline" size={18} color="#059669" accessibilityLabel="Can create plays" />}
      {onPress && <Ionicons name="chevron-forward" size={16} color="#9ca3af" />}
    </Pressable>
  );
}

function PlayRow({
  saved,
  isOpen,
  onOpen,
  onMenu,
  children,
}: {
  saved: SavedPlay;
  isOpen: boolean;
  onOpen: () => void;
  onMenu?: () => void;
  children?: ReactNode;
}) {
  const result = useMemo(() => playResult(saved.play, simulate(saved.play)), [saved.play]);
  const scenes = saved.play.scenes.length;
  return (
    <View style={styles.row}>
      <Pressable onPress={onOpen} style={({ pressed }) => [styles.rowMain, pressed && { opacity: 0.7 }]} accessibilityRole="button">
        <PlayThumbnail play={saved.play} width={92} />
        <View style={styles.rowText}>
          <View style={styles.rowTitleLine}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {saved.name || 'Untitled play'}
            </Text>
            {isOpen && <Text style={styles.openBadge}>ON BOARD</Text>}
            {saved.sharedWithTeam && <Ionicons name="people" size={14} color="#059669" accessibilityLabel="Shared with players" />}
          </View>
          <Text style={styles.rowMeta} numberOfLines={1}>
            {scenes} scene{scenes === 1 ? '' : 's'} · {result ? `Ends: ${result}` : 'No shot yet'}
          </Text>
          {saved.tags.length > 0 && (
            <Text style={styles.rowTags} numberOfLines={1}>
              {saved.tags.map(situationLabel).join(' · ')}
            </Text>
          )}
        </View>
      </Pressable>
      {onMenu && (
        <Pressable onPress={onMenu} hitSlop={10} style={styles.more} accessibilityRole="button" accessibilityLabel={`More for ${saved.name}`}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#6b7280" />
        </Pressable>
      )}
      {/* Kept outside the row's own button so extra actions aren't nested in it. */}
      {children && <View style={styles.rowExtra}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#e9ecf1' },
  previewBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#1d4ed8' },
  previewText: { flex: 1, color: '#ffffff', fontSize: 13, fontWeight: '600' },
  previewExit: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: '#ffffff' },
  previewExitText: { color: '#1d4ed8', fontWeight: '800', fontSize: 12 },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, paddingTop: 8 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  kicker: { fontSize: 11, fontWeight: '800', color: '#6b7280', letterSpacing: 0.8 },
  title: { fontSize: 28, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  privacy: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 16, marginTop: 2 },
  privacyText: { fontSize: 13, color: '#4b5563', flexShrink: 1 },
  segment: { paddingHorizontal: 16, marginTop: 12 },
  headerButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#111827', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999 },
  headerButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 12, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#ffffff' },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 15, color: '#111827' },
  chipsBar: { flexGrow: 0, flexShrink: 0, marginTop: 10 },
  chips: { gap: 6, paddingHorizontal: 16 },
  list: { padding: 16, gap: 18 },
  section: { gap: 8 },
  pendingBox: { padding: 10, borderRadius: 14, backgroundColor: '#fef3c7' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111827', flexShrink: 1 },
  sectionCount: { fontSize: 13, fontWeight: '700', color: '#6b7280' },
  smallButton: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#ffffff' },
  smallButtonText: { fontSize: 13, fontWeight: '700', color: '#111827' },
  empty: { fontSize: 13, color: '#6b7280', paddingVertical: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingRight: 10, borderRadius: 12, backgroundColor: '#ffffff' },
  rowExtra: { width: '100%', gap: 4, paddingLeft: 10, paddingBottom: 10 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 },
  rowText: { flex: 1, gap: 3 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowTitle: { fontSize: 16, fontWeight: '700', color: '#111827', flexShrink: 1 },
  openBadge: { fontSize: 10, fontWeight: '800', color: '#1d4ed8', letterSpacing: 0.5 },
  rowMeta: { fontSize: 12, color: '#4b5563' },
  rowTags: { fontSize: 12, fontWeight: '600', color: '#6d28d9' },
  rowAuthor: { fontSize: 12, fontWeight: '600', color: '#92400e' },
  approveRow: { flexDirection: 'row', gap: 6 },
  approve: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#f3f4f6' },
  approveYes: { backgroundColor: '#059669' },
  approveYesText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  approveNoText: { color: '#b91c1c', fontWeight: '700', fontSize: 13 },
  more: { padding: 4 },
  sheetLabel: { fontSize: 13, fontWeight: '700', color: '#6b7280', marginTop: 6, paddingHorizontal: 12 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 12, paddingBottom: 6 },
  addBox: { gap: 8 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roleRow: { flexDirection: 'row', gap: 6 },
  field: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: '#ffffff', fontSize: 15, color: '#111827' },
  numberField: { width: 52, textAlign: 'center' },
  groupLabel: { fontSize: 11, fontWeight: '800', color: '#6b7280', letterSpacing: 0.8, marginBottom: -10 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 12, backgroundColor: '#ffffff' },
  jersey: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' },
  headBadge: { backgroundColor: '#b45309' },
  assistantBadge: { backgroundColor: '#1d4ed8' },
  jerseyText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
  memberName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  memberMeta: { fontSize: 12, color: '#4b5563' },
  note: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 12, backgroundColor: '#dbeafe', alignItems: 'center' },
  noteText: { flex: 1, fontSize: 13, color: '#1e3a8a' },
});
