
export enum GameStatus {
  START = 'START',
  PLAYING = 'PLAYING',
  EVENT = 'EVENT',
  MILESTONE = 'MILESTONE',
  GAMEOVER = 'GAMEOVER',
  WIN = 'WIN'
}

export type MarkerType = 'waypoint' | 'shelter' | 'fishing' | 'hazard' | 'interest';

export interface MapMarker {
  id: string;
  distance: number;
  label: string;
  type: MarkerType;
  dayDiscovered?: number;
  description?: string;
}

export interface Choice {
  text: string;
  outcome: string; // The short summary
  detailedOutcome: string; // The rich narrative description
  statChanges: {
    health?: number;
    hunger?: number;
    warmth?: number;
    morale?: number;
    fish?: number;
  };
}

export interface NarrativeEvent {
  title: string;
  description: string;
  eventType?: string;
  options: Choice[];
}

export interface JourneyBeat {
  distance: number;
  event: NarrativeEvent;
}

export interface JourneyData {
  id: number;
  title: string;
  flavor: string;
  voice: string; // The personality of the narration
  narrativePool: {
    travel: string[];
    rest: string[];
    forage: string[];
  };
  environmentalSnippets: {
    lowlands: string[];
    highPasses: string[];
    summit: string[];
  };
  situationalSnippets: {
    lowHealth: string[];
    starving: string[];
    freezing: string[];
    lowMorale: string[];
    blizzard: string[];
    thriving: string[];
  };
  fixedEvents: JourneyBeat[];
}

export interface GameState {
  distance: number;
  day: number;
  health: number;
  hunger: number;
  warmth: number;
  morale: number;
  inventory: {
    fish: number;
    stones: number;
    wood: number;
  };
  status: GameStatus;
  lastMessage: string;
  markers: MapMarker[];
  discoveredLandmarks: MapMarker[];
  isBlizzard: boolean;
  nextMilestone: number;
  activeJourneyId: number;
  // Track used fragment indices to ensure zero repetition per journey
  narrativeHistory: {
    leads: number[];
    travel: number[];
    rest: number[];
    forage: number[];
    env: number[];
    status: number[];
  };
}

export const TARGET_DISTANCE = 500;
