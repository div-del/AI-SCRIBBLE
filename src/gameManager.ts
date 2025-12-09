import { Server, Socket } from 'socket.io';

// --- Game State Types ---

export type Player = {
  id: string;
  name: string;
  score: number;
};

export type Round = {
  roundNumber: number;
  word: string;
  drawerId: string; // The ID of the player or 'AI' if AI is drawing
  modelId: string; // Model used for AI drawing/guessing
  startTime: number;
  guesses: { playerId: string; guess: string; correct: boolean }[];
  state: 'drawing' | 'guessing' | 'ended';
  svg?: string;
  pngBase64?: string; // Image for players to guess from
};

export type Room = {
  id: string;
  players: Map<string, Player>; // playerId -> Player
  currentRound: Round | null;
  history: Round[];
  status: 'waiting' | 'in-game';
  // TODO: Add maxPlayers, roundTimeLimit, etc.
};

// --- In-Memory Store ---

/**
 * Simple in-memory storage for rooms.
 * NOTE: For production, this should be replaced with a persistent store (Redis, PostgreSQL, etc.).
 */
const rooms: Map<string, Room> = new Map();

// --- Core Logic ---

/**
 * Creates a new game room.
 * @param roomId A unique identifier for the room.
 * @returns The newly created Room object.
 */
export function createRoom(roomId: string): Room {
  if (rooms.has(roomId)) {
    throw new Error(`Room ID ${roomId} already exists.`);
  }

  const newRoom: Room = {
    id: roomId,
    players: new Map(),
    currentRound: null,
    history: [],
    status: 'waiting',
  };
  rooms.set(roomId, newRoom);
  return newRoom;
}

/**
 * Retrieves a room by its ID.
 * @param roomId The room ID.
 * @returns The Room object or undefined.
 */
export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
}

/**
 * Adds a player to a room.
 * @param roomId The room ID.
 * @param playerId The unique socket ID of the player.
 * @param playerName The player's display name.
 * @returns The updated list of players.
 */
export function addPlayerToRoom(roomId: string, playerId: string, playerName: string): Player[] {
  const room = getRoom(roomId);
  if (!room) throw new Error(`Room ${roomId} not found.`);

  if (!room.players.has(playerId)) {
    const newPlayer: Player = {
      id: playerId,
      name: playerName,
      score: 0,
    };
    room.players.set(playerId, newPlayer);
  }

  // Convert Map to array for broadcasting
  return Array.from(room.players.values());
}

/**
 * Removes a player from a room.
 * @param roomId The room ID.
 * @param playerId The player's ID.
 * @returns The updated list of players.
 */
export function removePlayerFromRoom(roomId: string, playerId: string): Player[] {
  const room = getRoom(roomId);
  if (!room) return [];

  room.players.delete(playerId);
  return Array.from(room.players.values());
}

/**
 * Initiates a new round in the room.
 * @param roomId The room ID.
 * @param drawerId The ID of the drawer (player ID or 'ai').
 * @param word The word to be drawn.
 * @param modelId The model used for AI drawing/guessing.
 * @returns The new Round object.
 */
export function startNewRound(roomId: string, drawerId: string, word: string, modelId: string): Round {
  const room = getRoom(roomId);
  if (!room) throw new Error(`Room ${roomId} not found.`);

  room.status = 'in-game';
  const newRound: Round = {
    roundNumber: room.history.length + 1,
    word: word.toLowerCase(), // Normalize word
    drawerId: drawerId,
    modelId: modelId,
    startTime: Date.now(),
    guesses: [],
    state: 'drawing', // Will transition to 'guessing' once image is ready
  };
  room.currentRound = newRound;
  return newRound;
}

/**
 * Updates the current round state with the generated drawing.
 * @param roomId The room ID.
 * @param svg The generated SVG.
 * @param pngBase64 The generated PNG image data URL.
 */
export function setDrawing(roomId: string, svg: string, pngBase64: string) {
  const room = getRoom(roomId);
  if (!room || !room.currentRound) throw new Error(`Room or current round not found.`);

  room.currentRound.svg = svg;
  room.currentRound.pngBase64 = pngBase64;
  room.currentRound.state = 'guessing';
}

/**
 * Records a player's guess and updates scores if correct.
 * @param roomId The room ID.
 * @param playerId The ID of the player making the guess.
 * @param guess The player's guess.
 * @returns The updated round state and a boolean indicating if the guess was correct.
 */
export function recordGuess(roomId: string, playerId: string, guess: string): { round: Round, correct: boolean } {
  const room = getRoom(roomId);
  if (!room || !room.currentRound) throw new Error(`Room or current round not found.`);
  const currentRound = room.currentRound;

  // Normalize the guess
  const normalizedGuess = guess.toLowerCase().trim();
  const correct = normalizedGuess === currentRound.word;

  const playerGuessedBefore = currentRound.guesses.some(g => g.playerId === playerId);

  if (playerGuessedBefore) {
    console.log(`Player ${playerId} already guessed this round.`);
    return { round: currentRound, correct: false };
  }

  currentRound.guesses.push({
    playerId: playerId,
    guess: guess,
    correct: correct,
  });

  if (correct) {
    computeScores(room, playerId);
  }

  return { round: currentRound, correct: correct };
}

/**
 * Ends the current round and updates history.
 * @param roomId The room ID.
 * @returns The final round object.
 */
export function endCurrentRound(roomId: string): Round | null {
  const room = getRoom(roomId);
  if (!room || !room.currentRound) return null;

  room.currentRound.state = 'ended';
  room.history.push(room.currentRound);
  const endedRound = room.currentRound;
  room.currentRound = null; // Clear current round

  // TODO: Add logic to check for end of game/next drawer
  room.status = 'waiting';

  return endedRound;
}

/**
 * Simple scoring logic.
 * @param room The Room object.
 * @param correctGuesserId The ID of the player who guessed correctly.
 */
function computeScores(room: Room, correctGuesserId: string): void {
  if (!room.currentRound) return;

  const drawerId = room.currentRound.drawerId;
  const guessTime = Date.now();
  const timeElapsed = guessTime - room.currentRound.startTime;

  // Constants (can be tuned/moved to config)
  const DRAWER_BASE_SCORE = 10;
  const GUESSER_BASE_SCORE = 10;
  const MAX_TIME_BONUS_MS = 60000; // 60 seconds

  // Guesser Score
  const guesser = room.players.get(correctGuesserId);
  if (guesser) {
    // Faster guesses get more points (simple inverse linear decay)
    const timeFactor = Math.max(0, 1 - (timeElapsed / MAX_TIME_BONUS_MS));
    const score = GUESSER_BASE_SCORE + Math.floor(timeFactor * 5); // 10 to 15 points
    guesser.score += score;
    console.log(`Player ${guesser.name} scored ${score} for guessing correctly.`);
  }

  // Drawer Score (if not AI)
  if (drawerId !== 'ai') {
    const drawer = room.players.get(drawerId);
    if (drawer) {
      // Drawer gets points for every correct guess
      const correctGuesses = room.currentRound.guesses.filter(g => g.correct).length;
      const score = DRAWER_BASE_SCORE + (correctGuesses * 2);
      drawer.score += 2; // Fixed small score for now, more advanced needed
      console.log(`Drawer ${drawer.name} scored ${score} points.`);
    }
  }

  // AI Drawer Scoring TODO: If AI is drawing, how to score the players who guessed correctly?
  // The logic above already scores the guesser. The AI doesn't need score.
}

/**
 * Gets the current scoreboard for a room.
 * @param roomId The room ID.
 * @returns An array of players sorted by score descending.
 */
export function getScoreboard(roomId: string): Player[] {
  const room = getRoom(roomId);
  if (!room) return [];

  return Array.from(room.players.values())
    .sort((a, b) => b.score - a.score);
}
