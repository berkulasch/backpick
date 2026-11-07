import { useMemo, useState } from 'react';

import { CourtMode } from '../court/geometry';
import { FormationId, formationSpots, playersFor } from '../library/formations';
import { prune, simulate } from './rules';
import { Play, Scene } from './types';

const MAX_HISTORY = 100;

let nextId = 0;
export const newId = (prefix: string) => `${prefix}${Date.now().toString(36)}${nextId++}`;

export const emptyScene = (): Scene => ({ id: newId('s'), actions: [] });

export function initialPlay(formation: FormationId = '4-out-1-in'): Play {
  return { players: playersFor(formationSpots(formation)), ballHolderId: 'o1', scenes: [emptyScene()] };
}

type History = { past: Play[]; present: Play };

export function usePlay(initial: Play) {
  const [hist, setHist] = useState<History>(() => ({ past: [], present: initial }));
  const [selected, setSelected] = useState(0);

  const play = hist.present;
  const sceneIndex = Math.min(selected, play.scenes.length - 1);
  const frames = useMemo(() => simulate(play), [play]);

  // Record an edit as one undo step. Returns how many later actions were
  // dropped because the edit made them illogical.
  const commit = (next: Play, before: Play = play) => {
    const result = prune(next);
    setHist((h) => ({ past: [...h.past, before].slice(-MAX_HISTORY), present: result.play }));
    return result.removed;
  };

  const updateScene = (p: Play, index: number, fn: (s: Scene) => Scene): Play => ({
    ...p,
    scenes: p.scenes.map((s, i) => (i === index ? fn(s) : s)),
  });

  return {
    play,
    frames,
    frame: frames[sceneIndex],
    scene: play.scenes[sceneIndex],
    sceneIndex,
    canUndo: hist.past.length > 0,
    commit,
    updateScene,
    // Live update while dragging; no undo entry.
    preview: (next: Play) => setHist((h) => ({ ...h, present: next })),
    // Record `before` as an undo step once a drag finishes.
    checkpoint: (before: Play) => setHist((h) => ({ past: [...h.past, before].slice(-MAX_HISTORY), present: h.present })),
    undo: () => setHist((h) => (h.past.length ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1] } : h)),
    selectScene: setSelected,
    setCourt: (court: CourtMode) => commit({ ...play, court }),
    // Move everyone to a formation's starting spots (one undo step).
    applyFormation: (id: FormationId) =>
      commit({ ...play, players: playersFor(formationSpots(id)) }),
    addScene: () => {
      const scenes = [...play.scenes];
      scenes.splice(sceneIndex + 1, 0, emptyScene());
      commit({ ...play, scenes });
      setSelected(sceneIndex + 1);
    },
    deleteScene: () => {
      if (play.scenes.length < 2) return 0;
      setSelected(Math.max(0, sceneIndex - 1));
      return commit({ ...play, scenes: play.scenes.filter((_, i) => i !== sceneIndex) });
    },
  };
}

export type PlayController = ReturnType<typeof usePlay>;
