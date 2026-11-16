export type Tab =
  | "home"
  | "analysis"
  | "play"
  | "puzzles"
  | "learn"
  | "library"
  | "stats"
  | "community"
  | "research"
  | "profile"
  | "controls"
  | "rankings";
export type Opening = {
  id: string;
  eco: string;
  name: string;
  moves: string[];
  key?: string;
};
export type PuzzleData = {
  id: string;
  fen: string;
  moves: string[];
  sourceRating: number;
  themes: string[];
  gameURL: string;
};
export type Endgame = {
  id: string;
  title: string;
  category: string;
  fen: string;
  side: "w" | "b";
  goal: "mate" | "promote" | "draw";
  tip: string;
};
export type Appearance = {
  controls?: Record<string, string>;
  markColors?: { green: string; blue: string; red: string; gold: string };
  flag?: string;
  theme: string;
  background: string;
  backgroundColor: string;
  accent: string;
  buttonColor: string;
  textColor: string;
  mutedColor: string;
  panelColor: string;
  board: string;
  light: string;
  dark: string;
  pieceStyle: string;
  customBackground: string;
  backgroundBlur: number;
  backgroundDim: number;
  panelOpacity: number;
  radius: number;
  font: string;
  fontSize: number;
  density: string;
  coordinates: boolean;
  legalMoves: boolean;
  lastMove: boolean;
  animation: boolean;
  sound: boolean;
  music: boolean;
  volume: number;
  autoQueen: boolean;
  confirmResign: boolean;
  premoves: boolean;
  multiPV: number;
  searchTime: number;
  boardSize: number;
};
export type SavedGame = {
  special?: import("./specialRules").SpecialState;
  id: string;
  title: string;
  created: number;
  initial: string;
  variant: string;
  moves: string[];
  notation: string[];
  positions: string[];
  result: string;
  human: "w" | "b";
  folder: string;
  partner?: {
    initial: string;
    positions: string[];
    moves: string[];
    notation: string[];
    result: string;
  };
  rated?: boolean;
  opponentChoice?: string;
  requestedOpening?: string;
  botRating?: number;
  opponent?: string;
  country?: string;
  branches?: {
    name: string;
    initial: string;
    moves: string[];
    notation: string[];
    positions: string[];
  }[];
  review?: ReviewRow[];
};
export type ReviewRow = {
  ply: number;
  move: string;
  best: string;
  score: number;
  loss: number;
  label: string;
  concept: string;
  expected?: string;
};
export type Repertoire = {
  id: string;
  name: string;
  side: "w" | "b";
  initial: string;
  moves: string[];
  due: number;
  trained: number;
  successes: number;
};
export type Profile = {
  federations?: Partial<
    Record<
      import("./federations").Federation,
      import("./federations").FederationProfile
    >
  >;
  bio?: string;
  name: string;
  country: string;
  avatar: string;
  friends: { id: string; name: string; country: string; notes: string }[];
};
export type Progress = {
  rating: number;
  attempts: number;
  solved: number;
  streak: number;
  completed: string[];
  daily: Record<string, { id: string; correct: boolean; completed: boolean }>;
  learned: string[];
  endgames: string[];
  triviaCorrect?: number;
  triviaBest?: number;
  evalPerfect?: number;
  evalBest?: number;
  mastered?: string[];
  famous?: string[];
};
export type Library = {
  games: SavedGame[];
  folders: string[];
  repertoire: Repertoire[];
  progress: Progress;
  profile: Profile;
  activeGame: SavedGame | null;
  localRating: number;
  analysis: SavedGame | null;
};
export type Navigate = (tab: Tab, detail?: string) => void;
