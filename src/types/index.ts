export interface Player {
  id: string;
  name: string;
  isAI: boolean;
  modelId?: string;
}

export interface DrawCommand {
  command: string;
  data: string;
  color: string;
  strokeWidth: number;
  duration: number;
}

export interface Message {
  type: 'guess' | 'correct' | 'system';
  playerId: string;
  playerName: string;
  text: string;
  timestamp: number;
}

export interface ScoreboardEntry {
  playerId: string;
  name: string;
  currentPoints: number;
  rank: number;
}

export interface FinalRanking {
  rank: number;
  playerId: string;
  name: string;
  totalPoints: number;
}

export interface Guess {
  playerId: string;
  playerName: string;
  guess: string;
  isCorrect: boolean;
  points: number;
}

export interface GameState {
  gameStarted: boolean;
  currentRound: number;
  currentDrawer: Player | null;
  players: Player[];
  scoreboard: ScoreboardEntry[];
  messages: Message[];
  drawCommands: DrawCommand[];
  timeLeft: number;
  wordHint: string;
  finalRankings: FinalRanking[];
  isRoundActive: boolean;
}