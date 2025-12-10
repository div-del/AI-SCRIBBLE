import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Player, DrawCommand, Message, ScoreboardEntry, FinalRanking } from '@/types';

interface GameStore {
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

  startGame: (playerName: string) => void;
  submitGuess: (guess: string) => void;
  addDrawCommand: (command: DrawCommand) => void;
  addMessage: (message: Message) => void;
  updateScoreboard: (scoreboard: ScoreboardEntry[]) => void;
  setTimeLeft: (time: number) => void;
  setWordHint: (hint: string) => void;
  setCurrentRound: (round: number) => void;
  setCurrentDrawer: (drawer: Player | null) => void;
  setIsRoundActive: (active: boolean) => void;
  endGame: (rankings: FinalRanking[]) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameStore>()(
  immer((set) => ({
    gameStarted: false,
    currentRound: 0,
    currentDrawer: null,
    players: [],
    scoreboard: [],
    messages: [],
    drawCommands: [],
    timeLeft: 120,
    wordHint: '',
    finalRankings: [],
    isRoundActive: false,

    startGame: (playerName: string) =>
      set((state) => {
        state.gameStarted = true;
        state.players = [
          { id: 'human', name: playerName, isAI: false },
          { id: 'gpt4o', name: 'GPT-4o', isAI: true, modelId: 'openai/gpt-4o' },
          { id: 'claude', name: 'Claude 3.5', isAI: true, modelId: 'anthropic/claude-3-5-sonnet' },
          { id: 'gemini', name: 'Gemini 2.0', isAI: true, modelId: 'google/gemini-2.0-flash' },
          { id: 'mistral', name: 'Mistral Large', isAI: true, modelId: 'mistral/large-2' },
          { id: 'deepseek', name: 'DeepSeek', isAI: true, modelId: 'deepseek/deepseek-chat' },
        ];
        state.scoreboard = state.players.map((p, i) => ({
          playerId: p.id,
          name: p.name,
          currentPoints: 0,
          rank: i + 1,
        }));
      }),

    submitGuess: (guess: string) =>
      set((state) => {
        // This will be handled by socket
      }),

    addDrawCommand: (command: DrawCommand) =>
      set((state) => {
        state.drawCommands.push(command);
      }),

    addMessage: (message: Message) =>
      set((state) => {
        state.messages.push(message);
      }),

    updateScoreboard: (scoreboard: ScoreboardEntry[]) =>
      set((state) => {
        state.scoreboard = scoreboard;
      }),

    setTimeLeft: (time: number) =>
      set((state) => {
        state.timeLeft = time;
      }),

    setWordHint: (hint: string) =>
      set((state) => {
        state.wordHint = hint;
      }),

    setCurrentRound: (round: number) =>
      set((state) => {
        state.currentRound = round;
      }),

    setCurrentDrawer: (drawer: Player | null) =>
      set((state) => {
        state.currentDrawer = drawer;
      }),

    setIsRoundActive: (active: boolean) =>
      set((state) => {
        state.isRoundActive = active;
      }),

    endGame: (rankings: FinalRanking[]) =>
      set((state) => {
        state.finalRankings = rankings;
        state.gameStarted = false;
      }),

    resetGame: () =>
      set((state) => {
        state.gameStarted = false;
        state.currentRound = 0;
        state.currentDrawer = null;
        state.players = [];
        state.scoreboard = [];
        state.messages = [];
        state.drawCommands = [];
        state.timeLeft = 120;
        state.wordHint = '';
        state.finalRankings = [];
        state.isRoundActive = false;
      }),
  }))
);