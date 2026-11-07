import { CourtMode } from '../court/geometry';

// All positions are in feet on a half court: x 0–50 (sideline to sideline),
// y 0–47 (baseline to half-court line).
export type Vec = { x: number; y: number };

// Plays show the offense only; there are no defenders.
export type Player = {
  id: string;
  label: string;
  // Position at the start of the play (scene 1).
  pos: Vec;
};

export type ActionType = 'pass' | 'dribble' | 'cut' | 'pick' | 'shot';
export type MoveType = 'dribble' | 'cut' | 'pick';

export type PassAction = { id: string; type: 'pass'; playerId: string; toId: string };
// Movement paths are stored as drawn; they're re-anchored to wherever the
// player stands when the scene starts.
export type MoveAction = { id: string; type: MoveType; playerId: string; points: Vec[] };
// The shot ends the play; it's taken from wherever the shooter is after their move.
export type ShotAction = { id: string; type: 'shot'; playerId: string };
export type Action = PassAction | MoveAction | ShotAction;

export type Scene = {
  id: string;
  // Actions in the order they happen within the scene.
  actions: Action[];
};

export type Play = {
  players: Player[];
  ballHolderId: string;
  scenes: Scene[];
  // Half court unless set; a full court adds the second basket at y 94.
  court?: CourtMode;
};

export type Tool = 'move' | ActionType | 'erase';
