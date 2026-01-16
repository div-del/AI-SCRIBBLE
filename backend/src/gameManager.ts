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
/**
 * Simple in-memory storage for rooms.
 * NOTE: For production, this should be replaced with a persistent store (Redis, PostgreSQL, etc.).
 */
const rooms: Map<string, Room> = new Map();
const roomIntervals: Map<string, NodeJS.Timeout> = new Map(); // Store active timers

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

  // Initialize AI Players
  const AI_AGENTS = [
    { id: 'ai-gemini', name: 'Gemini', modelId: 'google/gemini-1.5-pro' },
    { id: 'ai-chatgpt', name: 'ChatGPT', modelId: 'openai/gpt-4o' },
    { id: 'ai-claude', name: 'Claude', modelId: 'anthropic/claude-3-5-sonnet' },
    { id: 'ai-llama', name: 'Llama', modelId: 'meta/llama-3-70b' },
    { id: 'ai-mistral', name: 'Mistral', modelId: 'mistralai/mistral-large' },
  ];

  AI_AGENTS.forEach(agent => {
    newRoom.players.set(agent.id, {
      id: agent.id,
      name: agent.name,
      score: 0,
      isAI: true, // Add validation flag
      modelId: agent.modelId
    } as Player & { isAI: boolean, modelId: string });
  });

  rooms.set(roomId, newRoom);
  return newRoom;
}

/**
 * Resets the game state for a room.
 */
export function resetGame(roomId: string): Room {
  const room = getRoom(roomId);
  if (!room) throw new Error(`Room ${roomId} not found.`);

  room.currentRound = null;
  room.history = [];
  room.status = 'waiting';
  // Reset scores
  room.players.forEach(p => p.score = 0);

  return room;
}

/**
 * Determines the next drawer and starts the round automatically.
 */
export function nextTurn(roomId: string): { drawerId: string, modelId: string } | null {
  const room = getRoom(roomId);
  if (!room) return null;

  // Simple rotation logic (AI agents first then players, or interleaved)
  // For this battle mode, let's rotate through AI agents first
  const players = Array.from(room.players.values());
  const aiPlayers = players.filter(p => (p as any).isAI);

  // Determine next index based on history length
  const nextIndex = room.history.length % aiPlayers.length;
  const nextDrawer = aiPlayers[nextIndex];

  return {
    drawerId: nextDrawer.id,
    modelId: (nextDrawer as any).modelId
  };
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
 * Stops the timer for a room.
 */
export function stopRoundTimer(roomId: string) {
  if (roomIntervals.has(roomId)) {
    clearInterval(roomIntervals.get(roomId));
    roomIntervals.delete(roomId);
  }
}

/**
 * Starts a game loop for the round: handles timer and AI guesses.
 */
/**
 * Starts a game loop for the round: handles timer and AI guesses.
 */
export function startRoundTimer(
  roomId: string,
  callbacks: {
    onTick: (timeLeft: number) => void;
    onTimeUp: () => void;
    onAIGuess: (playerId: string, guess: string) => void;
  }
) {
  stopRoundTimer(roomId); // Clear existing

  let timeLeft = 60; // 60 seconds

  const interval = setInterval(() => {
    const room = getRoom(roomId);
    if (!room || !room.currentRound || room.currentRound.state === 'ended') {
      stopRoundTimer(roomId);
      return;
    }

    timeLeft--;
    callbacks.onTick(timeLeft);

    if (timeLeft <= 0) {
      stopRoundTimer(roomId);
      callbacks.onTimeUp();
      return;
    }

    // --- AI Simulation Logic ---
    // 10% chance per tick for an AI to guess
    if (Math.random() < 0.2) {
      const aiPlayers = Array.from(room.players.values()).filter(p => (p as any).isAI);
      const nonDrawerAIs = aiPlayers.filter(p => p.id !== room.currentRound!.drawerId);

      if (nonDrawerAIs.length > 0) {
        const randomAI = nonDrawerAIs[Math.floor(Math.random() * nonDrawerAIs.length)];

        // 30% chance to guess correctly if enough time passed
        const isCorrect = Math.random() < 0.3 && timeLeft < 50;
        let guessText = "something...";

        if (isCorrect) {
          guessText = room.currentRound!.word;
        } else {
          // Diverse wrong guesses
          const wrongGuesses = [
            "cat", "dog", "sun", "tree", "house", "car", "robot", "alien", "pizza", "dragon",
            "ball", "star", "flower", "book", "pencil", "phone", "chair", "table", "shoe", "hat",
            "apple", "banana", "cookie", "cake", "fish", "bird", "plane", "boat", "train", "bus",
            "mountain", "river", "ocean", "cloud", "rain", "snow", "fire", "ice", "key", "door",
            "window", "computer", "mouse", "keyboard", "screen", "watch", "glasses", "shirt", "pants"
          ];
          guessText = wrongGuesses[Math.floor(Math.random() * wrongGuesses.length)];
        }

        callbacks.onAIGuess(randomAI.id, guessText);
      }
    }

  }, 1000);

  roomIntervals.set(roomId, interval);
}

/**
 * Simple scoring logic.
 * @param room The Room object.
 * @param correctGuesserId The ID of the player who guessed correctly.
 */
function computeScores(room: Room, correctGuesserId: string): void {
  if (!room.currentRound) return;

  const drawerId = room.currentRound.drawerId;
  // STRICT SCORING: 10 pts for correct guess, 10 pts for drawer. No time bonus.
  const SCORE_AMOUNT = 10;

  // Guesser Score
  const guesser = room.players.get(correctGuesserId);
  if (guesser) {
    guesser.score += SCORE_AMOUNT;
    console.log(`Player ${guesser.name} scored ${SCORE_AMOUNT} for guessing correctly.`);
  }

  // Drawer Score (if not AI) - Award 10 points once if at least one person guessed?
  // Or 10 points *per* guess? User said "10 MARKS FOR DRAWING". Usually means flat.
  // But to encourage drawing well, usually it's per player or flat if any. 
  // Let's do 10 points flat if this is the FIRST correct guess.
  const correctGuesses = room.currentRound.guesses.filter(g => g.correct).length;
  if (correctGuesses === 1 && drawerId !== 'ai') {
    const drawer = room.players.get(drawerId);
    if (drawer) {
      drawer.score += SCORE_AMOUNT;
      console.log(`Drawer ${drawer.name} scored ${SCORE_AMOUNT} because someone guessed.`);
    }
  }
}


/**
 * Gets the current scoreboard for a room.
 * @param roomId The room ID.
 * @returns An array of players sorted by score descending.
 */
export function getScoreboard(roomId: string): any[] {
  const room = getRoom(roomId);
  if (!room) return [];

  return Array.from(room.players.values())
    .sort((a, b) => b.score - a.score)
    .map((p, index) => ({
      playerId: p.id,
      name: p.name,
      currentPoints: p.score,
      rank: index + 1
    }));
}
